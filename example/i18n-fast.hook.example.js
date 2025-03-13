/**
 * i18n-fast hook
 * - CommonJS 规范
 * - 可以 require 其他模块
 * - 可以返回 Promise
*/

/**
 * @typedef {Object} ConvertGroup
 * @property {string} matchedText
 * @property {string} i18nValue
 * @property {string} i18nKey
 * @property {Record<string, any>} customParam
 * @property {string} overwriteText
 * @property {string} documentText
*/

/**
 * @typedef {Object} Context
 * @property {import('vscode').Workspace} workspace
 * @property {import('qs')} qs
 * @property {import('fast-glob')} fg
 * @property {import('crypto-js')} crypto
 * @property {import('lodash')} _
 * @property {(str: string, opt: { separator?: string, lowerCase?: boolean, limit?: number, forceSplit?: boolean }) => string} convert2pinyin
 * @property {(codeText: string, text: string) => boolean} isInJsx
 * @property {(codeText: string, text: string) => boolean} isInJsxAttribute
 * @property {(filePath: string, content: string) => Promise<void>} writeFileByEditor
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
    convert(context) {
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
    write(context) {
        return '';
    },
};