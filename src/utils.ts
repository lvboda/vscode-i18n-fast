import { workspace, WorkspaceEdit, Uri, Range } from 'vscode';
import * as path from 'node:path';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import { concat, replace, isNil } from 'lodash';
import { isSupported, convertToPinyin } from 'tiny-pinyin';

import type { TextEditor } from 'vscode';

// 获取注释位置
function getNotePositionList(text: string, startNote: string, endNote: string) {
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
  const result: [string, string][] = [];
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

      let current: [string, string] = [key, key];
      if (['"', "'", '`'].includes(data[begin]) && data[begin] === data[end]) {
        current = [`${data[begin]}${key}${data[end]}`, key];
      }

      // 检查是否在JSX表达式中
      try {
        const ast = parse(data, {
          sourceType: "module",
          plugins: ["jsx"],
          errorRecovery: true
        });

        traverse(ast, {
          JSXText(path) {
            const node = path.node;
            if (node.value.includes(key)) {
              // 获取完整的JSX文本内容
              const fullText = node.value.trim();
              if (fullText !== key) { 
                current = [fullText, fullText];
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
    replaceKeys.forEach((replaceParams) => item[1].replace(...replaceParams));
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

export const isJsxTextOrAttribute = (allText: string, text: string) => {
  const ast = parse(allText, {
    sourceType: "module", 
    plugins: ["jsx"],
    errorRecovery: true,
    allowImportExportEverywhere: true,
    allowReturnOutsideFunction: true,
    allowSuperOutsideMethod: true,
    allowUndeclaredExports: true,
    allowAwaitOutsideFunction: true,
  });

  let isInJsx = false;
  const textStart = allText.indexOf(text);

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

  traverse(ast, {
    JSXFragment(path) {
      if (checkJSXChildren(path.node)) {
        isInJsx = true;
      }
    },
    JSXElement(path) {
      if (checkJSXChildren(path.node)) {
        isInJsx = true;
        return;
      }

      // Check JSX attributes
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
};

export const writeFileByEditor = async (filePath: string, content: string) => {
  // FIXME 这里获取 folder 是写死的
  const workspaceFolder = workspace.workspaceFolders?.[0]?.uri.fsPath || '';
  const absolutePath = path.join(workspaceFolder, filePath);
  const fileUri = Uri.file(absolutePath);

  try {
    const document = await workspace.openTextDocument(fileUri);
    const workspaceEdit = new WorkspaceEdit();
    const fullRange = new Range(document.positionAt(0), document.positionAt(document.getText().length));

    workspaceEdit.replace(fileUri, fullRange, content);
    await workspace.applyEdit(workspaceEdit);
  } catch (error) {
    console.error(`Failed to write file: ${absolutePath}`, error);
  }
};