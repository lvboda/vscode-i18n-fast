/**
 * i18n-fast hook
 * - Use CommonJS
 * - Can require other modules
 * - Can return a Promise
*/

/**
 * @typedef {import('vscode')} Vscode - see {@link https://code.visualstudio.com/api/references/vscode-api}
*/

/**
 * @typedef {Object} ConvertGroup
 * @property {string} i18nValue - i18n value
 * @property {string} [matchedText] - original matched text
 * @property {Vscode.Range} [range] - matched range see {@link https://code.visualstudio.com/api/references/vscode-api#Range}
 * @property {string} [i18nKey] - i18n key
 * @property {Record<string, any>} [params] - custom params
 * @property {string} [overwriteText] - overwrite text
 * @property {'exist' | 'new'} [type] - i18n type
 */

/**
 * enum SupportType {
 *   None = 0,
 *   Decoration = 1,
 *   HoverMessage = 2,
 *   Jump = 4,
 *   All = SupportType.Decoration|SupportType.HoverMessage|SupportType.Jump,
 * }; 
 * @typedef {0 | 1 | 2 | 4 | 7} SupportType
*/

/**
 * @typedef {Object} I18nGroup
 * @property {string} key - i18n key
 * @property {string} value - i18n value
 * @property {import('@formatjs/icu-messageformat-parser').MessageFormatElement[]} [valueAST] - value AST see {@link https://formatjs.io/docs/icu-syntax/}
 * @property {string} [filePath] - The file path where the key-value pair is defined.
 * @property {number} [line] - The line number in the file where the key-value pair is defined.
 * @property {Vscode.Range} [range] - The range that appears in the document see {@link https://code.visualstudio.com/api/references/vscode-api#Range}
 * @property {SupportType} [supportType] - Support behavior type
 * @property {Vscode.DecorationOptions['renderOptions']} [renderOption] - see {@link https://code.visualstudio.com/api/references/vscode-api#DecorationRenderOptions}
 * @property {Vscode.DecorationOptions['hoverMessage']} [hoverMessage] - see {@link https://code.visualstudio.com/api/references/vscode-api#DecorationRenderOptions}
 * @property {Vscode.Definition | Vscode.DefinitionLink[]} [locationLink] - see {@link https://code.visualstudio.com/api/references/vscode-api#Definition}
 */

/**
 * some tools
 * @typedef {Object} Context
 * @property {Vscode} vscode
 * @property {import('qs')} qs - see {@link https://www.npmjs.com/package/qs}
 * @property {import('fast-glob')} fg - see {@link https://www.npmjs.com/package/fast-glob}
 * @property {import('crypto-js')} crypto - see {@link https://www.npmjs.com/package/crypto-js}
 * @property {import('uuid')} uuid - see {@link https://www.npmjs.com/package/uuid}
 * @property {import('lodash')} _ - see {@link https://www.npmjs.com/package/lodash}
 * @property {import('@babel/parser') & { traverse: import('@babel/traverse') }} babel - see {@link https://www.npmjs.com/package/@babel/parser}
 * @property {typeof module.exports} hook
 * @property {(str: string, opt: { separator?: string, lowerCase?: boolean, limit?: number, forceSplit?: boolean }) => string} convert2pinyin - see {@link https://github.com/lvboda/vscode-i18n-fast/blob/main/src/utils.ts#L177}
 * @property {(documentText: string, start: number, end: number) => boolean} isInJsxElement - see {@link https://github.com/lvboda/vscode-i18n-fast/blob/main/src/utils.ts#L215}
 * @property {(documentText: string, start: number, end: number) => boolean} isInJsxAttribute - see {@link https://github.com/lvboda/vscode-i18n-fast/blob/main/src/utils.ts#L262}
 * @property {(fileUri: Vscode.Uri | string, contentOrList: string | ({ range: Range, content: string }[]), isSave = false) => Promise<boolean>} writeFileByEditor - see {@link https://github.com/lvboda/vscode-i18n-fast/blob/main/src/utils.ts#L303}
 * @property {(codeText: string) => babelParser.ParseResult<File>} getAST - see {@link https://github.com/lvboda/vscode-i18n-fast/blob/main/src/utils.ts#L48}
 * @property {(message: string) => I18nGroup['valueAST'][]} getICUMessageFormatAST - see {@link https://github.com/lvboda/vscode-i18n-fast/blob/main/src/utils.ts#L61}
 * @property {(fn: T, args: Parameters<T>, errorCb?: (error: any) => ReturnType<T>) => ReturnType<T>} safeCall - see {@link https://github.com/lvboda/vscode-i18n-fast/blob/main/src/utils.ts#L32}
 * @property {(fn: T, args: Parameters<T>, errorCb?: (error: any) => ReturnType<T>) => Promise<ReturnType<T>>} asyncSafeCall - see {@link https://github.com/lvboda/vscode-i18n-fast/blob/main/src/utils.ts#L40}
 * @property {() => Record<string, string>} getConfig - see {@link https://github.com/lvboda/vscode-i18n-fast/blob/main/src/config.ts#L27}
 * @property {(loading: boolean, text?: string) => void} setLoading - see {@link https://github.com/lvboda/vscode-i18n-fast/blob/main/src/utils.ts#L395}
 * @property {(type: "info" | "warn" | "error", message: string, maxLength = 300, ...args: string[]) => void} showMessage - see {@link https://github.com/lvboda/vscode-i18n-fast/blob/main/src/tips.ts#L21}
*/

module.exports = {
    /**
     * Custom matching logic
     * @param {Context & { document: Vscode.TextDocument }} context
     * @returns {ConvertGroup[] | Promise<ConvertGroup[]>}
     */
    match(context) {
        return [];
    },

    /**
     * Convert data
     * @param {Context & { convertGroups: ConvertGroup[], document: Vscode.TextDocument }} context
     * @returns {ConvertGroup[] | Promise<ConvertGroup[]>}
     */
    convert(context) {
        return context.convertGroups;
    },

    /**
     * Write to ...
     * @param {Context & { convertGroups: ConvertGroup[], document: Vscode.TextDocument }} context
     * @returns {boolean | Promise<boolean>}
     */
    write(context) {
        return false;
    },
    
    /**
     * Match i18n
     * @param {Context & { i18nFileUri: Vscode.Uri }} context
     * @returns {I18nGroup[] | Promise<I18nGroup[]>}
     */
    matchI18n(context) {
        return [];
    },

    /**
     * check i18n support feature
     * @param {Context & { i18nGroups: I18nGroup[], document: Vscode.TextDocument }} context
     * @returns {I18nGroup[] | Promise<I18nGroup[]>}
     */
    checkI18n(context) {
        return [];
    },
};