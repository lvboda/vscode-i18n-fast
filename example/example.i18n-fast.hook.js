/**
 * i18n-fast hook
 * - CommonJS 规范
 * - 可以 require 其他模块或项目里的三方库
 * - 可以返回 Promise
*/

/**
 * @typedef {[string, string, string | null | undefined]} MatchedGroup
*/

/**
 * @typedef {[string, Record<string, any> | null | undefined]} CustomParam
*/

/**
 * @typedef {Object} Context
 * @property {import('vscode').Workspace} workspace
 * @property {import('qs')} qs
 * @property {import('fast-glob')} fg
 * @property {import('crypto-js')} crypto
 * @property {import('lodash')} _
 * @property {(str: string, opt: { separator?: string, lowerCase?: boolean, limit?: number, forceSplit?: boolean }) => string} convert2pinyin
*/

module.exports = {
    /**
     * @description
     * 获取需要被转换的文本 非必须
     * 
     * returns [originalText, realText][]
     * @example
     * // 使用正则匹配 #() 里的文本
     * match(context) {
     *   return [/(?:'|\"|`)#\\((.+?)\\)(?:'|\"|`)/gs, /#\\((.+?)\\)/gs].map((regex) => _.flatMap([...documentText.matchAll(regex)]));
     * }
     * @param {Context & { documentText: string }} context
     * @returns {[string, string][] | Promise<[string, string][]>}
     */
    match(context) {
        return [];
    },
    /**
     * @description
     * 获取匹配到的文本中的参数 非必须
     * 
     * returns [realText, CustomParam]
     * @example
     * // 使用 qs 解析参数
     * customParam(context) {
     *   return [context.matchedGroup[1].split('?i')[0], qs.parse(context.matchedGroup[1].split('?i')?.[1] || '')];
     * }
     * @param {Context & { matchedGroup: MatchedGroup }} context
     * @returns {CustomParam[] | Promise<CustomParam[]>}
     */
    customParam(context) {
        return [context.matchedGroup[1], null];
    },
    /**
     * @description
     * 获取生成的 i18nKey 必须
     * 
     * returns i18nKey
     * @example
     * // 使用 MD5 生成 i18nKey
     * i18nKey(context) {
     *   return context.crypto.MD5(realText).toString(context.crypto.enc.Hex);
     * }
     * @param {Context & { originalText: string, realText: string, customParam: CustomParam }} context
     * @returns {string | Promise<string>}
     */
    i18nKey(context) {
        return '';
    },
    /**
     * @description
     * 获取要覆盖的代码文本 必须
     * 
     * returns code
     * @example
     * // 使用 formatMessage 包裹 key 覆盖文本
     * codeOverwrite(context) {
     *   return `formatMessage({ id: '${context.i18nKey}' })`;
     * }
     * @param {Context & { i18nKey: string, originalText: string, realText: string, customParam: CustomParam }} context
     * @returns {string | Promise<string>}
     */
    codeOverwrite(context) {
        return '';
    },
    /**
     * @description
     * 获取 i18n 文件路径 必须
     * 
     * returns i18nFilePath
     * @example
     * // 操作 share/locales/zh-CN/common.js 文件
     * i18nFilePath(context) {
     *   return ['share/locales/zh-CN/common.js'];
     * }
     * @param {Context & { editor: import('vscode').TextEditor }} context
     * @returns {string[] | Promise<string[]>}
     */
    i18nFilePath(context) {
        return [];
    },
    /**
     * @description
     * 重写 i18n 文件内容 必须
     * 
     * returns i18nFileContent
     * @example
     * // 重写 i18n 文件内容
     * i18nFileOverwrite(context) {
     *   return `module.exports = {
     *     ${context.matchedGroups.map(([_, value, key]) => `'${key}': '${value}'`).join(',\n')}
     *   };`;
     * }
     * @param {Context & { fileContent: string, matchedGroups: MatchedGroup[] }} context
     * @returns {string | Promise<string>}
     */
    i18nFileOverwrite(context) {
        return '';
    }
};