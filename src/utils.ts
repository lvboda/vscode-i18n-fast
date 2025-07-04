import { workspace, WorkspaceEdit, Range, Uri } from 'vscode';
import { concat, replace, isNil, max } from 'lodash';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import { parse as parseMessageFormat, TYPE, isArgumentElement, isSelectElement, isPluralElement, isPoundElement, isDateElement, isNumberElement, isTimeElement } from '@formatjs/icu-messageformat-parser';
import { isSupported, convertToPinyin } from 'tiny-pinyin';
import stringWidth from 'string-width';

import { SupportType } from './types/enums';
import { showStatusBar, hideStatusBar } from './tips';

import type { TextDocument, Disposable } from 'vscode';
import type { MessageFormatElement } from '@formatjs/icu-messageformat-parser';
import type { JSXElement, JSXText, Node } from '@babel/types';
import type { ConvertGroup } from './types';

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

const getDefaultAST = (codeText: string) => {
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
export const matchChinese = (document: TextDocument) => {
  const documentText = document.getText();
  const result: ConvertGroup[] = [];
  const excludes = ['v-track:'];
  const endChars = ["'", '"', '`', '\n', '>', '<', '}', '{', '(', ')'];
  const replaceKeys = [[/&nbsp;/g, ""]] as const;
  
  if (documentText && chineseRegex.test(documentText)) {
    const noteList0 = getNotePositionList(documentText, '<i18n>', '</i18n>');
    const noteList1 = getNotePositionList(documentText, '<!--', '-->');
    const noteList2 = getNotePositionList(documentText, '/*', '*/');
    const noteList3 = getNotePositionList(documentText, '//', '\n');
    const notePositionList = concat(noteList0, noteList1, noteList2, noteList3);

    let res = null, nextIndex = -1;
    while (res = chineseRegex2.exec(documentText)) {
      const c = res[0], i = res.index;
      let begin = i - 1, end = i + 1;
      let key = c;
      if (i < nextIndex) {
        continue;
      }
      // 是否在注释位置
      if (notePositionList.length) {
        if (notePositionList.find(item => item[0] < i && i < item[1])) {
          continue;
        }
      }
      // 向前找
      while (!endChars.includes(documentText[begin])) {
        begin--;
      }
      // 向后找
      while (!endChars.includes(documentText[end])) {
        end++;
      }
      // 多行符需要特别处理
      if (documentText[begin] === '`') {
        while (documentText[end] !== '`') {
          end++;
        }
      }
      if (documentText[end] === '`') {
        while (documentText[begin] !== '`') {
          begin--;
        }
      }

      let start = begin + 1;
      nextIndex = end;
      key = documentText.substring(start, end);

      if (documentText[begin] !== '`') {
        const trimmedKey = key.trim();

        // 兼容匹配到的文本前后有空字符的情况
        if (trimmedKey !== key) {
          const leadingSpaces = key.length - key.trimStart().length;
          const trailingSpaces = key.length - key.trimEnd().length;
          start += leadingSpaces;
          end -= trailingSpaces;
          key = trimmedKey;
        }
      }

      // 判断是否不含特殊字符
      if (excludes.some(k => key.includes(k))) {
        continue;
      }

      const current = {
        matchedText: key,
        i18nValue: key,
        range: new Range(document.positionAt(start), document.positionAt(end)),
      };
      
      if (['"', "'", '`'].includes(documentText[begin]) && documentText[begin] === documentText[end]) {
        current.matchedText = `${documentText[begin]}${key}${documentText[end]}`;
        current.range = current.range.with(current.range.start.translate(0, -1), current.range.end.translate(0, 1));
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
  if (!isSupported()) {
    throw new Error('current environment does not support converting to pinyin.');
  }

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

export const isInJsxElement = (input: string | Node, start: number, end: number) => {
  let AST: Node;
  if (typeof input === 'string') {
    AST = getDefaultAST(input);
  } else {
    AST = input;
  }

  let inJsx = false;
  const checkJSXText = (node: JSXText) => {
    return !isNil(node.start) && !isNil(node.end) && start >= node.start && end <= node.end;
  }
  const checkJSXChildren = (node: any) => {
    const nodeStart = node?.openingElement?.end || node?.openingFragment?.end;
    const nodeEnd = node?.closingElement?.start || node?.closingFragment?.start;
    if (isNil(nodeStart) || isNil(nodeEnd)) {
      return false;
    }

    if (start >= nodeStart && end <= nodeEnd) {
      // 兼容 <div></div> 这种空标签
      if (node.children.length === 0) {
        return true;
      }

      for (const child of node.children) {
        if (child.type === 'JSXText') {
          return checkJSXText(child);
        }
      }
    }

    return false;
  };

  traverse(AST, {
    JSXFragment({ node }) {
      if (checkJSXChildren(node)) {
        inJsx = true;
        return;
      }
    },
    JSXElement({ node }) {
      if (checkJSXChildren(node)) {
        inJsx = true;
        return;
      }
    },
    JSXText({ node }) {
      if (checkJSXText(node)) {
        inJsx = true;
        return;
      }
    }
  });

  return inJsx;
};

export const isInJsxAttribute = (input: string | Node, start: number, end: number) => {
  let AST: Node;
  if (typeof input === 'string') {
    AST = getDefaultAST(input);
  } else {
    AST = input;
  }

  let inJsxAttribute = false;
  const checkJSXAttribute = (node: JSXElement) => {
    if (isNil(node.start) || isNil(node.end)) {
      return false;
    }

    if (start >= node.start && end <= node.end) {
      const { attributes } = node.openingElement;
      if (!attributes) {
        return false;
      }

      for (const attr of attributes) {
        if (attr.type !== 'JSXAttribute' || !attr.value || attr.value.type !== 'StringLiteral') {
          continue;
        }
        if (isNil(attr.value.start) || isNil(attr.value.end)) {
          continue;
        }

        if (start >= attr.value.start && end <= attr.value.end) {
          return true;
        }
      }
    }

    return false;
  };

  traverse(AST, {
    JSXElement({ node }) {
      if (checkJSXAttribute(node)) {
        inJsxAttribute = true;
        return;
      }
    }
  });

  return inJsxAttribute;
};

export class FileSnapshotStack implements Disposable {
  private items: Map<Uri, string>[] = [];
  private index = 0;
  private static instance: FileSnapshotStack;
  static readonly MAX_SIZE = 10;

  static getInstance() {
    if (!FileSnapshotStack.instance) {
      FileSnapshotStack.instance = new FileSnapshotStack();
    }
    
    return FileSnapshotStack.instance;
  }

  private shift() {
    if (this.isEmpty()) {
      return;
    }

    this.index--;
    return this.items.shift();
  }

  pop() {
    if (this.isEmpty()) {
      return;
    }

    this.index--;
    return this.items.pop();
  }

  push(uri: Uri, snapshot: string) {
    const index = max([this.index - 1, 0])!;
    const map = this.items[index] || new Map();

    if (!map.has(uri)) {
      map.set(uri, snapshot);
      this.items[index] = map;
    }
  }

  next() {
    this.index++;

    if (this.index === FileSnapshotStack.MAX_SIZE) {
      this.shift();
    }
  }

  dispose() {
    this.items.length = 0;
    this.index = 0;
  }

  isEmpty() {
    return this.index === 0;
  }
}

export const writeFileByEditor = async (fileUri: Uri | string, contentOrList: string | ({ range: Range, content: string }[]), isSave = false, needSnapshot = true) => {
  fileUri = typeof fileUri === 'string' ? Uri.file(fileUri) : fileUri;

  const document = await workspace.openTextDocument(fileUri);
  const snapshot = document.getText();
  const workspaceEdit = new WorkspaceEdit();

  if (Array.isArray(contentOrList)) {
    contentOrList.forEach(({ range, content }) => workspaceEdit.replace(fileUri, range, content));
  } else {
    workspaceEdit.replace(fileUri, new Range(document.positionAt(0), document.positionAt(document.getText().length)), contentOrList);
  }

  await workspace.applyEdit(workspaceEdit);

  if (isSave) {
    await document.save();
  }

  if (needSnapshot) {
    FileSnapshotStack.getInstance().push(fileUri, snapshot);
  }

  return true;
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

    if (width + charWidth > maxWidth) {
      return result + ellipsis;
    }

    width += charWidth;
    result += char;
  }

  return result;
}

export const getWorkspaceKey = () => {
  return workspace.workspaceFolders?.[0]?.uri.fsPath || workspace.name;
}

let loadingCount = 0;
export const getLoading = () => loadingCount > 0;
export const setLoading = (loading: boolean, text = ' $(loading~spin) generating...') => {
  loadingCount += loading ? 1 : -1;
  if (loadingCount > 0) {
    showStatusBar(text);
  } else {
    hideStatusBar();
  }
}

export const checkSupportType = (checkType: SupportType, type?: SupportType) => {
  if (!type) {
    return false;
  }

  return (type & checkType) !== 0;
}

export const dynamicRequire = (path: string) => {
  // delete cache
  delete __non_webpack_require__.cache[__non_webpack_require__.resolve(path)];
  return __non_webpack_require__(path);
}