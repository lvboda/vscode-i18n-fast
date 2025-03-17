const genI18nKey = require('./gen-i18n-key');

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
    match({ document }) {
        const documentText = document.getText();
        const matchedArr = documentText.match(/(?:(['"`])#\((.+?)\)\1|#\((.+?)\))/gs) || [];
        return matchedArr
          .map((matchedText) => {
            const i18nValue = [...matchedText.matchAll(/#\((.*?)\)/gs)]?.[0]?.[1];
            if (!i18nValue) return;
            return { matchedText, i18nValue };
          }).filter(Boolean);
    },
    /**
     * Convert data
     * @param {Context & { convertGroups: ConvertGroup[], document: vscode.TextDocument }} context
     * @returns {ConvertGroup[] | Promise<ConvertGroup[]>}
     */
    convert({ convertGroups, document, safeCall, isInJsxElement, isInJsxAttribute, qs, uuid }) {
        const documentText = document.getText();
        return convertGroups.map((group) => {
            const [i18nValue = group.i18nValue, paramsStr = ''] = group.i18nValue.split('?i');
            const params = { ...qs.parse(paramsStr) };

            const i18nKey = group.type === 'new' ? `i18n-fast-loading-${uuid.v4()}` : group.i18nKey;

            const startIndex = document.offsetAt(group.range.start);
            const endIndex = document.offsetAt(group.range.end);
            const inJsxOrJsxAttribute = safeCall(isInJsxElement, [documentText, startIndex, endIndex]) || safeCall(isInJsxAttribute, [documentText, startIndex, endIndex]);
            const overwriteText = `${inJsxOrJsxAttribute ? '{' : '' }formatMessage({ id: '${i18nKey}' }${params.v ? `, { ${params.v} }` : ''})${inJsxOrJsxAttribute ? '}' : ''}`;

            return {
                ...group,
                i18nKey,
                i18nValue,
                overwriteText,
                params,
            };
        });
    },
    /**
     * Write to ...
     * @param {Context & { convertGroups: ConvertGroup[], document: vscode.TextDocument }} context
     * @returns {boolean | Promise<boolean>}
     */
    async write({ convertGroups, _, vscode, writeFileByEditor, document, setLoading, getConfig, showMessage }) {
        await writeFileByEditor(document.uri, convertGroups.filter(({ range, overwriteText }) => !_.isNil(range) && !_.isNil(overwriteText)).map(({ range, overwriteText }) => ({ range, content: overwriteText })));

        let needCreateGroups = convertGroups.filter(({ type }) => type === 'new');
        if (needCreateGroups.length === 0) return;
        const documentText = document.getText();

        setLoading(true);
        genI18nKey(
            needCreateGroups.map(({ i18nValue }) => ({ text: i18nValue, path: document.uri.fsPath })),
            (await vscode.workspace.findFiles(getConfig().i18nFilePattern)).map(({ fsPath }) => fsPath)
        ).then(async (generated) => {
            needCreateGroups = needCreateGroups
                .map((group) => {
                    const { i18nKey, path } = generated.find(({ originalText }) => originalText === group.i18nValue) || {};
                    if (i18nKey) {
                        group.overwriteI18nKeyRanges = [];
                        [...documentText.matchAll(new RegExp(group.i18nKey, 'g'))].forEach((matched) => {
                            if (!_.isNil(matched.index)) {
                                const start = document.positionAt(matched.index);
                                const end = document.positionAt(matched.index + group.i18nKey.length);
                                group.overwriteI18nKeyRanges.push(new vscode.Range(start, end));
                            }
                        });
                        group.i18nKey = i18nKey;
                        group.i18nFilePath = path;
                    }
                    return group;
                })
                .filter(({ i18nKey, overwriteI18nKeyRanges }) => !_.isNil(i18nKey) && overwriteI18nKeyRanges.length > 0);

            await writeFileByEditor(document.uri, needCreateGroups.map(({ i18nKey, overwriteI18nKeyRanges }) => overwriteI18nKeyRanges.map((range) => ({ range, content: i18nKey }))).flat());

            for (const [path, groups] of Object.entries(_.groupBy(needCreateGroups, 'i18nFilePath'))) {
                let i18nFileContent = (await vscode.workspace.fs.readFile(path ? vscode.Uri.file(path) : await vscode.workspace.findFiles('app/share/locales/zh-CN/common.js')?.[0])).toString();
                const regex = /module\.exports\s*=\s*(\{[\s\S]*\})/;

                if (!!i18nFileContent && !regex.test(i18nFileContent)) {
                    console.error(`${path} i18n file content is invalid`);
                    continue;
                }

                if (!i18nFileContent.trim()) {
                    i18nFileContent = 'module.exports = {\n};';
                }

                const content = groups.reduce((pre, { i18nKey, i18nValue }) => {
                    if (i18nKey && i18nValue) {
                        pre += `'${i18nKey}': '${i18nValue}',`;
                    }
                    return pre;
                }, '');

                if (!content) continue;
                await writeFileByEditor(path, i18nFileContent.replace(/(\s*)([,\s]*)(\}\s*;\s*)$/, `${/module\.exports\s*=\s*{\s*}\s*;/.test(i18nFileContent) ? '' : ','}\n  ${content}\n};`), true);
            }
        })
        .catch((error) => showMessage('error', `<genI18nKey error> ${error?.stack || error}`))
        .finally(() => setLoading(false));
    },
    /**
     * Match i18n
     * @param {Context & { i18nFileUri: Uri }} context
     * @returns {I18nGroup[] | Promise<I18nGroup[]>}
     */
    async matchI18n({ i18nFileUri, vscode, getICUMessageFormatAST, safeCall }) {
        const i18nFileContentLines = (await vscode.workspace.fs.readFile(i18nFileUri)).toString().split('\n');
        const matchedIndexSet = new Set();
        delete require.cache[require.resolve(i18nFileUri.fsPath)];
        return Object.entries(require(i18nFileUri.fsPath))
            .sort(([aKey], [bKey]) => bKey.length - aKey.length)
            .map(([key, value]) => ({
                key,
                value,
                valueAST: safeCall(getICUMessageFormatAST, [value]),
                line: i18nFileContentLines.findIndex((line, index) => {
                    if (matchedIndexSet.has(index)) return false;
                    const hasKey = new RegExp(key).test(line);
                    if (hasKey) matchedIndexSet.add(index);
                    return hasKey;
                }) + 1,
            }));
    },
};