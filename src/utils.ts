import { workspace, WorkspaceEdit, Range } from 'vscode';
import { concat, replace, isNil, range, uniq } from 'lodash';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import { parse as parseMessageFormat, TYPE, isArgumentElement, isSelectElement, isPluralElement, isPoundElement, isDateElement, isNumberElement, isTimeElement } from '@formatjs/icu-messageformat-parser';
import { isSupported, convertToPinyin } from 'tiny-pinyin';
import stringWidth from 'string-width';

import { invokeWithErrorHandler } from './error';
import { I18N_MAP_KEY } from './constant';

import type { ExtensionContext, Position, Uri } from 'vscode';
import type { MessageFormatElement } from '@formatjs/icu-messageformat-parser';
import type { ConvertGroup, I18nGroup, I18nMap } from './types';

const DISPLAY_ICU_TYPE_MAP = {
  [TYPE.date]: 'date',
  [TYPE.time]: 'time',
  [TYPE.select]: 'select',
  [TYPE.plural]: 'plural',
  [TYPE.pound]: 'pound',
  [TYPE.tag]: 'tag',
  [TYPE.literal]: 'literal',
  [TYPE.argument]: 'argument',
  [TYPE.number]: 'number',
}

const getDisplayIcuType = (type: TYPE) => {
  return DISPLAY_ICU_TYPE_MAP[type] || type;
}

export const safeCall = <T extends (...args: any[]) => any>(fn: T, args: Parameters<T>, errorCb?: (error: any) => ReturnType<T>) => {
  try {
    return fn(...(args || []));
  } catch (error) {
    return errorCb?.(error) || null;
  }
}

export const asyncSafeCall = async <T extends (...args: any[]) => Promise<any>>(fn: T, args: Parameters<T>, errorCb?: (error: any) => ReturnType<T>) => {
  try {
    return await fn(...(args || []));
  } catch (error) {
    return errorCb?.(error);
  }
}

const getAST = (codeText: string) => {
  return parse(codeText, {
    sourceType: "module",
    plugins: ["jsx"],
    errorRecovery: true,
    allowImportExportEverywhere: true,
    allowReturnOutsideFunction: true,
    allowSuperOutsideMethod: true,
    allowUndeclaredExports: true,
    allowAwaitOutsideFunction: true,
  });
}

export const getICUMessageFormatAST = (message: string) => {
  return parseMessageFormat(message, { ignoreTag: true, requiresOtherClause: false });
}

// 获取注释位置
const getNotePositionList = (text: string, startNote: string, endNote: string) => {
  // 注释位置
  const list = [];
  if (text) {
    let startIndex = -1;
    let endIndex = 0;
    while ((startIndex = text.indexOf(startNote, endIndex)) > -1) {
      endIndex = text.indexOf(endNote, startIndex + 1);
      list.push([startIndex, endIndex]);
    }
  }
  return list;
}

const chineseRegex = /[\u4e00-\u9fa5]/;
const chineseRegex2 = /[\u4e00-\u9fa5]+|[\u4e00-\u9fa5]/g;

// 提取所有中文字符串
export function getChineseCharList(data: string) {
  const result: ConvertGroup[] = [];
  const excludes = ['v-track:'];
  const endChars = ["'", '"', '`', '\n', '>', '<', '}', '{', '(', ')'];
  const replaceKeys = [[/&nbsp;/g, ""]] as const;
  if (data && chineseRegex.test(data)) {
    const noteList0 = getNotePositionList(data, '<i18n>', '</i18n>');
    const noteList1 = getNotePositionList(data, '<!--', '-->');
    const noteList2 = getNotePositionList(data, '/*', '*/');
    const noteList3 = getNotePositionList(data, '//', '\n');
    const notePositionList = concat(noteList0, noteList1, noteList2, noteList3);
    let res = null, nextIndex = -1;
    while (res = chineseRegex2.exec(data)) {
      const c = res[0], i = res.index;
      let begin = i - 1, end = i + 1;
      let key = c;
      if (i < nextIndex) continue;
      // 是否在注释位置
      if (notePositionList.length) {
        if (notePositionList.find(item => item[0] < i && i < item[1])) continue;
      }
      // 向前找
      while (!endChars.includes(data[begin])) {
        begin--;
      }
      // 向后找
      while (!endChars.includes(data[end])) {
        end++;
      }
      // 多行符需要特别处理
      if (data[begin] === '`') {
        while (data[end] !== '`') {
          end++;
        }
      }
      if (data[end] === '`') {
        while (data[begin] !== '`') {
          begin--;
        }
      }

      nextIndex = end;
      key = data.substring(begin + 1, end);
      key = data[begin] === '`' ? key : key.trim();
      // 判断是否不含特殊字符
      if (excludes.some(k => key.includes(k))) continue;

      let current = { matchedText: key, i18nValue: key };
      if (['"', "'", '`'].includes(data[begin]) && data[begin] === data[end]) {
        current = { matchedText: `${data[begin]}${key}${data[end]}`, i18nValue: key };
      }

      // 检查是否在JSX表达式中
      try {
        const AST = getAST(data);

        traverse(AST, {
          JSXText(path) {
            const node = path.node;
            if (node.value.includes(key)) {
              // 获取完整的JSX文本内容
              const fullText = node.value.trim();
              if (fullText !== key) {
                current = { matchedText: fullText, i18nValue: fullText };
              }
            }
          },
        });
      } catch (error) {
        // 解析失败时继续使用原始匹配结果
      }

      result.push(current);
    }
  }
  return result.map((item) => {
    replaceKeys.forEach((replaceParams) => item.i18nValue.replace(...replaceParams));
    return item;
  });
}

type Convert2pinyinOpt = {
  separator?: string;
  lowerCase?: boolean;
  limit?: number;
  forceSplit?: boolean;
}
export const convert2pinyin = (str: string, opt: Convert2pinyinOpt) => {
  if (!isSupported()) throw new Error('current environment does not support converting to pinyin.');

  opt = opt || {};
  opt.lowerCase = opt.lowerCase ?? true;
  opt.forceSplit = opt.forceSplit ?? false;

  str = replace(str, /([^\p{L}\p{N}\s]|\n)/gu, '');

  if (!!opt.separator) {
    str = replace(str, /([\u4e00-\u9fa5])|([a-zA-Z]+)/g, '$& ').trim().replace(/\s+/g, ' ');
  }

  str = replace(str, /[\u4e00-\u9fa5]/g, (matchedStr) => convertToPinyin(matchedStr, void 0, opt.lowerCase));

  if (!!opt.separator) {
    str = str.split(' ').join(opt.separator);
  }

  if (opt.limit) {
    str = str.slice(0, opt.limit);

    if (!opt.forceSplit && !!opt.separator) {
      const sepLength = opt.separator.length;
      const endPart = str.slice(-sepLength);
      const lastSeparatorIndex = str.lastIndexOf(opt.separator);

      if (endPart === opt.separator || endPart.startsWith(opt.separator)) {
        str = str.slice(0, -endPart.length);
      } else if (lastSeparatorIndex !== -1) {
        str = str.slice(0, lastSeparatorIndex);
      }
    }
  }

  return str;
}

export const isInJsx = invokeWithErrorHandler((codeText: string, text: string) => {
  const AST = getAST(codeText);

  let isInJsx = false;
  const textStart = codeText.indexOf(text);

  const checkJSXChildren = (node: any) => {
    const { start, end } = node;
    if (!isNil(start) && !isNil(end) && textStart >= start && textStart + text.length <= end) {
      const jsxChildren = node.children || [];
      for (const child of jsxChildren) {
        if (child.type === 'JSXText') {
          const childStart = child.start;
          const childEnd = child.end;
          if (!isNil(childStart) && !isNil(childEnd) &&
            textStart >= childStart && textStart + text.length <= childEnd) {
            return true;
          }
        }
      }
    }
    return false;
  };

  traverse(AST, {
    JSXFragment(path) {
      if (checkJSXChildren(path.node)) {
        isInJsx = true;
        return;
      }
    },
    JSXElement(path) {
      if (checkJSXChildren(path.node)) {
        isInJsx = true;
        return;
      }
    }
  });

  return isInJsx;
}, console.error);

export const isInJsxAttribute = invokeWithErrorHandler((codeText: string, text: string) => {
  const AST = getAST(codeText);

  let isInJsx = false;
  const textStart = codeText.indexOf(text);

  traverse(AST, {
    JSXElement(path) {
      const { start, end } = path.node;
      if (!isNil(start) && !isNil(end) && textStart >= start && textStart + text.length <= end) {
        const openingElement = path.node.openingElement;
        if (openingElement && openingElement.attributes) {
          for (const attr of openingElement.attributes) {
            if (attr.type === 'JSXAttribute' && attr.value && attr.value.type === 'StringLiteral') {
              const attrStart = attr.value.start;
              const attrEnd = attr.value.end;
              if (!isNil(attrStart) && !isNil(attrEnd) && textStart >= attrStart && textStart + text.length <= attrEnd) {
                isInJsx = true;
                break;
              }
            }
          }
        }
      }
    }
  });

  return isInJsx;
}, console.error);

export const writeFileByEditor = async (fileUri: Uri, content: string) => {
  const document = await workspace.openTextDocument(fileUri);
  const workspaceEdit = new WorkspaceEdit();
  const fullRange = new Range(document.positionAt(0), document.positionAt(document.getText().length));

  workspaceEdit.replace(fileUri, fullRange, content);
  await workspace.applyEdit(workspaceEdit);
  return true;
};

// 相等 || 包含 || 交叉
export const isRangeIntersect = (range1: Range, range2: Range): boolean => {
  return (
    range1.end.isAfterOrEqual(range2.start) &&
    range1.start.isBeforeOrEqual(range2.end)
  );
};

const commonProcess = (node: MessageFormatElement): string => {
  if (isArgumentElement(node)) {
    return `{${node.value}}`;
  }

  if (isDateElement(node) || isTimeElement(node) || isNumberElement(node)) {
    return `{${node.value}, ${getDisplayIcuType(node.type)}${node.style ? `, ${node.style}` : ''}}`;
  }

  if (isPoundElement(node)) {
    return '#';
  }

  return node.value;
}

export const AST2readableStr = (ast: MessageFormatElement[]) => {
  const processNode = (node: MessageFormatElement | MessageFormatElement[]): string => {
    if (Array.isArray(node)) {
      return node.map(processNode).join('');
    }

    if (isSelectElement(node) || isPluralElement(node)) {
      const firstOption = Object.values(node.options)[0];
      return firstOption ? processNode(firstOption.value) : '';
    }

    return commonProcess(node);
  }
  return processNode(ast);
}

export const AST2formattedStr = (ast: MessageFormatElement[]) => {
  const processNode = (node: MessageFormatElement | MessageFormatElement[], indent = 0): string => {
    if (Array.isArray(node)) {
      return node.map((item) => processNode(item, indent + 1)).join('');
    }

    if (isSelectElement(node) || isPluralElement(node)) {
      return (
        `{${node.value}, ${getDisplayIcuType(node.type)},\n` +
        Object.entries(node.options)
          .map(([key, value]) => ' '.repeat(indent + 1) + `${key} {${processNode(value.value, indent + 1)}}`)
          .join('\n') +
        '\n' + ' '.repeat(indent - 1 < 0 ? 0 : indent - 1) + `}`
      );
    }
    
    return commonProcess(node);
  }

  return processNode(ast);
};

export const truncateByDisplayWidth = (text: string, maxWidth = 60, ellipsis = '...') => {
  let width = 0;
  let result = '';

  for (const char of text) {
    const charWidth = stringWidth(char);
    if (width + charWidth > maxWidth) return result + ellipsis;

    width += charWidth;
    result += char;
  }

  return result;
}

export const getI18nGroups = (context: ExtensionContext): I18nGroup[] => {
  return Object.entries(context.globalState.get<I18nMap>(I18N_MAP_KEY) || {})
    .map(([filePath, groups]) => groups.map((item) => ({ filePath, ...item })))
    .flat();
}

const position2Offset = (text: string, position: Position) => {
  return text.slice(0, position.character).length;
}

export const replaceByRanges = (text: string, ranges: { range: Range, replaceText: string }[]) => {
  let result = text;
  let totalOffset = 0; // 累计偏移量

  for (const { range, replaceText } of ranges) {
    // 调整位置：原位置 + 当前总偏移量
    const adjustedStart = position2Offset(text, range.start) + totalOffset;
    const adjustedEnd = position2Offset(text, range.end) + totalOffset;

    // 计算本次替换导致的偏移变化
    const originalLength = range.end.character - range.start.character;
    const newLength = replaceText.length;
    const delta = newLength - originalLength;

    // 执行替换
    result = result.slice(0, adjustedStart) + replaceText + result.slice(adjustedEnd);

    // 更新总偏移量
    totalOffset += delta;
  }

  return result;
}