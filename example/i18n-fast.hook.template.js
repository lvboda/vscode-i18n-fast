/**
 * i18n-fast hook
 * - Node.js runtime
 * - Use CommonJS
 * - Can require other modules
 * - Can return a Promise
*/

/**
 * @typedef {import('vscode')} Vscode - see {@link https://code.visualstudio.com/api/references/vscode-api}
*/

/**
 * @typedef {'document'} MatchType - see {@link https://github.com/lvboda/vscode-i18n-fast/blob/main/src/types/enums.ts}
*/

/**
 * @typedef {0 | 1 | 2 | 4 | 7} SupportType - see {@link https://github.com/lvboda/vscode-i18n-fast/blob/main/src/types/enums.ts}
*/

/**
 * @typedef {Object} ConvertGroup - see {@link https://github.com/lvboda/vscode-i18n-fast/blob/main/src/types/index.ts}
 * @property {string} i18nValue - i18n value
 * @property {string} [matchedText] - original matched text
 * @property {Vscode.Range} [range] - matched range see {@link https://code.visualstudio.com/api/references/vscode-api#Range}
 * @property {string} [i18nKey] - i18n key
 * @property {Record<string, any>} [params] - custom params
 * @property {string} [overwriteText] - overwrite text
 * @property {'exist' | 'new'} [type] - i18n type
 */

/**
 * @typedef {Object} I18nGroup - see {@link https://github.com/lvboda/vscode-i18n-fast/blob/main/src/types/index.ts}
 * @property {string} key - i18n key
 * @property {string} value - i18n value
 * @property {import('@formatjs/icu-messageformat-parser').MessageFormatElement[]} [valueAST] - value AST see {@link https://www.npmjs.com/package/@formatjs/icu-messageformat-parser}
 * @property {string} [filePath] - The file path where the key-value pair is defined.
 * @property {number} [line] - The line number in the file where the key-value pair is defined.
 * @property {Vscode.Range} [range] - The range that appears in the document see {@link https://code.visualstudio.com/api/references/vscode-api#Range}
 * @property {SupportType} [supportType] - Support behavior type
 * @property {Vscode.DecorationOptions['renderOptions']} [renderOption] - see {@link https://code.visualstudio.com/api/references/vscode-api#DecorationRenderOptions}
 * @property {Vscode.DecorationOptions['hoverMessage']} [hoverMessage] - see {@link https://code.visualstudio.com/api/references/vscode-api#DecorationRenderOptions}
 * @property {Vscode.Definition | Vscode.DefinitionLink[]} [locationLink] - see {@link https://code.visualstudio.com/api/references/vscode-api#Definition}
 */

/**
 * @typedef {Object} I18n - see {@link https://github.com/lvboda/vscode-i18n-fast/blob/main/src/i18n.ts}
 * @property {(workspaceKey?: string) => Map<string, I18nGroup[]> | Map<string, Map<string, I18nGroup[]>>} get
 * @property {(workspaceKey?: string) => I18nGroup[]} getI18nGroups
*/

/**
 * some tools
 * @typedef {Object} Context
 * @property {Vscode} vscode
 * @property {Vscode.ExtensionContext} extensionContext
 * @property {import('qs')} qs - see {@link https://www.npmjs.com/package/qs}
 * @property {import('crypto-js')} crypto - see {@link https://www.npmjs.com/package/crypto-js}
 * @property {import('uuid')} uuid - see {@link https://www.npmjs.com/package/uuid}
 * @property {import('lodash')} _ - see {@link https://www.npmjs.com/package/lodash}
 * @property {import('@babel/parser') & { traverse: import('@babel/traverse') }} babel - see {@link https://www.npmjs.com/package/@babel/parser}, {@link https://www.npmjs.com/package/@babel/traverse}
 * @property {typeof module.exports} hook
 * @property {I18n} i18n
 * @property {(str: string, opt: { separator?: string, lowerCase?: boolean, limit?: number, forceSplit?: boolean }) => string} convert2pinyin - see {@link https://github.com/lvboda/vscode-i18n-fast/blob/main/src/utils.ts}
 * @property {(input: string | import('@babel/types').Node, start: number, end: number) => boolean} isInJsxElement - see {@link https://github.com/lvboda/vscode-i18n-fast/blob/main/src/utils.ts}
 * @property {(input: string | import('@babel/types').Node, start: number, end: number) => boolean} isInJsxAttribute - see {@link https://github.com/lvboda/vscode-i18n-fast/blob/main/src/utils.ts}
 * @property {(fileUri: Vscode.Uri | string, contentOrList: string | ({ range: Range, content: string }[]), isSave = false) => Promise<boolean>} writeFileByEditor - see {@link https://github.com/lvboda/vscode-i18n-fast/blob/main/src/utils.ts}
 * @property {(codeText: string) => babelParser.ParseResult<File>} getAST - see {@link https://github.com/lvboda/vscode-i18n-fast/blob/main/src/utils.ts}
 * @property {(message: string) => I18nGroup['valueAST'][]} getICUMessageFormatAST - see {@link https://github.com/lvboda/vscode-i18n-fast/blob/main/src/utils.ts}
 * @property {(fn: T, args: Parameters<T>, errorCb?: (error: any) => ReturnType<T>) => ReturnType<T>} safeCall - see {@link https://github.com/lvboda/vscode-i18n-fast/blob/main/src/utils.ts}
 * @property {(fn: T, args: Parameters<T>, errorCb?: (error: any) => ReturnType<T>) => Promise<ReturnType<T>>} asyncSafeCall - see {@link https://github.com/lvboda/vscode-i18n-fast/blob/main/src/utils.ts}
 * @property {() => Record<string, string>} getConfig - see {@link https://github.com/lvboda/vscode-i18n-fast/blob/main/src/config.ts}
 * @property {(loading: boolean, text?: string) => void} setLoading - see {@link https://github.com/lvboda/vscode-i18n-fast/blob/main/src/utils.ts#}
 * @property {(type: "info" | "warn" | "error", message: string, maxLength = 300, ...args: string[]) => void} showMessage - see {@link https://github.com/lvboda/vscode-i18n-fast/blob/main/src/tips.ts}
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
     * Collect i18n
     * @param {Context & { i18nFileUri: Vscode.Uri }} context
     * @returns {I18nGroup[] | Promise<I18nGroup[]>}
     */
    collectI18n(context) {
        return [];
    },

    /**
     * Match i18n
     * @param {Context & { type: MatchType, i18nGroups: I18nGroup[], document: Vscode.TextDocument }} context
     * @returns {I18nGroup[] | Promise<I18nGroup[]>}
     */
    matchI18n(context) {
        return [];
    },
};