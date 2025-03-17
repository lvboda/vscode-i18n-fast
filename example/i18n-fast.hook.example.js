/**
 * i18n-fast hook
 * - Use CommonJS
 * - Can require other modules
 * - Can return a Promise
*/

/**
 * @typedef {import('vscode')} vscode
*/

/**
 * @typedef {Object} ConvertGroup
 * @property {string} i18nValue - i18n value
 * @property {string} [matchedText] - original matched text
 * @property {vscode.Range} [range] - matched range
 * @property {string} [i18nKey] - i18n key
 * @property {Record<string, any>} [params] - custom params
 * @property {string} [overwriteText] - overwrite text
 * @property {'exist' | 'new'} [type] - i18n type
 */

/**
 * @typedef {Object} I18nGroup
 * @property {string} key - i18n key
 * @property {string} value - i18n value
 * @property {import('@formatjs/icu-messageformat-parser').MessageFormatElement[]} [valueAST] - value AST
 * @property {string} [filePath] - The file path where the key-value pair is defined.
 * @property {number} [line] - The line number in the file where the key-value pair is defined.
 */

/**
 * some tools
 * @typedef {Object} Context
 * @property {vscode} vscode
 * @property {import('qs')} qs
 * @property {import('fast-glob')} fg
 * @property {import('crypto-js')} crypto
 * @property {import('uuid')} uuid
 * @property {import('lodash')} _
 * @property {import('@babel/parser') & { traverse: import('@babel/traverse') }} babel
 * @property {typeof module.exports} hook
 * @property {(str: string, opt: { separator?: string, lowerCase?: boolean, limit?: number, forceSplit?: boolean }) => string} convert2pinyin
 * @property {(documentText: string, start: number, end: number) => boolean} isInJsxElement
 * @property {(documentText: string, start: number, end: number) => boolean} isInJsxAttribute
 * @property {(fileUri: vscode.Uri | string, contentOrList: string | ({ range: Range, content: string }[]), isSave = false) => Promise<boolean>} writeFileByEditor
 * @property {(codeText: string) => babelParser.ParseResult<File>} getAST
 * @property {(message: string) => I18nGroup['valueAST'][]} getICUMessageFormatAST
 * @property {(fn: T, args: Parameters<T>, errorCb?: (error: any) => ReturnType<T>) => ReturnType<T>} safeCall
 * @property {(fn: T, args: Parameters<T>, errorCb?: (error: any) => ReturnType<T>) => Promise<ReturnType<T>>} asyncSafeCall
 * @property {() => Record<string, string>} getConfig
 * @property {(loading: boolean, text?: string) => void} setLoading
 * @property {(type: "info" | "warn" | "error", message: string, maxLength = 300, ...args: string[]) => void} showMessage
*/

module.exports = {
    /**
     * Custom matching logic
     * @param {Context & { document: vscode.TextDocument }} context
     * @returns {ConvertGroup[] | Promise<ConvertGroup[]>}
     */
    match(context) {
        return [];
    },
    /**
     * Convert data
     * @param {Context & { convertGroups: ConvertGroup[], document: vscode.TextDocument }} context
     * @returns {ConvertGroup[] | Promise<ConvertGroup[]>}
     */
    convert(context) {
        return context.convertGroups;
    },
    /**
     * Write to ...
     * @param {Context & { convertGroups: ConvertGroup[], document: vscode.TextDocument }} context
     * @returns {boolean | Promise<boolean>}
     */
    write(context) {
        return false;
    },
    /**
     * Match i18n
     * @param {Context & { i18nFileUri: Uri }} context
     * @returns {I18nGroup[] | Promise<I18nGroup[]>}
     */
    matchI18n(context) {
        return [];
    },
};