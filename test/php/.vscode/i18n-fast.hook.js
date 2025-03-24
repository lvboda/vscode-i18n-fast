const genI18nKey = require('./gen-i18n-key');

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
 * @property {import('qs')} qs - see {@link https://www.npmjs.com/package/qs}
 * @property {import('crypto-js')} crypto - see {@link https://www.npmjs.com/package/crypto-js}
 * @property {import('uuid')} uuid - see {@link https://www.npmjs.com/package/uuid}
 * @property {import('lodash')} _ - see {@link https://www.npmjs.com/package/lodash}
 * @property {import('@babel/parser') & { traverse: import('@babel/traverse') }} babel - see {@link https://www.npmjs.com/package/@babel/parser}, {@link https://www.npmjs.com/package/@babel/traverse}
 * @property {typeof module.exports} hook
 * @property {I18n} i18n
 * @property {(str: string, opt: { separator?: string, lowerCase?: boolean, limit?: number, forceSplit?: boolean }) => string} convert2pinyin - see {@link https://github.com/lvboda/vscode-i18n-fast/blob/main/src/utils.ts}
 * @property {(documentText: string, start: number, end: number) => boolean} isInJsxElement - see {@link https://github.com/lvboda/vscode-i18n-fast/blob/main/src/utils.ts}
 * @property {(documentText: string, start: number, end: number) => boolean} isInJsxAttribute - see {@link https://github.com/lvboda/vscode-i18n-fast/blob/main/src/utils.ts}
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
     * @param {Context & { convertGroups: ConvertGroup[], document: Vscode.TextDocument }} context
     * @returns {ConvertGroup[] | Promise<ConvertGroup[]>}
     */
    convert({ convertGroups, document, vscode, _, safeCall, isInJsxElement, isInJsxAttribute, qs, uuid }) {
        const documentText = document.getText();
        return convertGroups.map((group) => {
            const [i18nValue = group.i18nValue, paramsStr = ''] = group.i18nValue.split('?i');
            const params = { ...qs.parse(paramsStr) };

            const i18nKey = group.type === 'new' ? `i18n-fast-loading-${uuid.v4()}` : group.i18nKey;

            const startIndex = document.offsetAt(group.range.start);
            const endIndex = document.offsetAt(group.range.end);
            let inJsxOrJsxAttribute = false;
            if (_.startsWith(vscode.workspace.asRelativePath(document.uri, false), 'webapp/')) {
                inJsxOrJsxAttribute = safeCall(isInJsxElement, [documentText, startIndex, endIndex]) || safeCall(isInJsxAttribute, [documentText, startIndex, endIndex]);
            }

            const overwriteText = `${inJsxOrJsxAttribute ? '{' : '' }i18n['${i18nKey}']${inJsxOrJsxAttribute ? '}' : ''}`;

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
     * @param {Context & { convertGroups: ConvertGroup[], document: Vscode.TextDocument }} context
     * @returns {boolean | Promise<boolean>}
     */
    async write({ convertGroups, _, vscode, writeFileByEditor, document, setLoading, getConfig, showMessage }) {
        await writeFileByEditor(document.uri, convertGroups.filter(({ range, overwriteText }) => !_.isNil(range) && !_.isNil(overwriteText)).map(({ range, overwriteText }) => ({ range, content: overwriteText })));

        let needCreateGroups = convertGroups.filter(({ type }) => type === 'new');
        if (needCreateGroups.length === 0) return;

        setLoading(true);
        const i18nFilePaths = (await vscode.workspace.findFiles(getConfig().i18nFilePattern)).map(({ fsPath }) => fsPath);
        const toBeWrittenI18nFilePath = _.sample(i18nFilePaths.filter((path) => /erp_lang\.php/.test(path)));
        const commonFilePath = i18nFilePaths.find((path) => _.endsWith(path, 'common_lang.php'));
        genI18nKey(needCreateGroups.map(({ i18nValue }) => ({ text: i18nValue, path: document.uri.fsPath }))).then(async (generated) => {
            needCreateGroups = needCreateGroups
                .map((group) => {
                    const { i18nKey, isCommon } = generated.find(({ originalText }) => originalText === group.i18nValue) || {};
                    if (i18nKey) {
                        group.overwriteI18nKeyRanges = [];
                        [...document.getText().matchAll(new RegExp(group.i18nKey, 'g'))].forEach((matched) => {
                            if (!_.isNil(matched.index)) {
                                const start = document.positionAt(matched.index);
                                const end = document.positionAt(matched.index + group.i18nKey.length);
                                group.overwriteI18nKeyRanges.push(new vscode.Range(start, end));
                            }
                        });
                        group.i18nKey = i18nKey;
                        group.isCommon = isCommon;
                    }
                    return group;
                })
                .filter(({ i18nKey, overwriteI18nKeyRanges }) => !_.isNil(i18nKey) && overwriteI18nKeyRanges.length > 0);

            if (!needCreateGroups.length) return;
            await writeFileByEditor(document.uri, needCreateGroups.map(({ i18nKey, overwriteI18nKeyRanges }) => overwriteI18nKeyRanges.map((range) => ({ range, content: i18nKey }))).flat());

            for (const groups of _.partition(needCreateGroups, 'isCommon')) {
                if (!groups.length) continue;
                const path = groups[0].isCommon ? commonFilePath : toBeWrittenI18nFilePath;
                let i18nFileContent = (await vscode.workspace.fs.readFile(vscode.Uri.file(path))).toString();

                groups.forEach(({ i18nKey, i18nValue }) => {
                    if (i18nKey && i18nValue) {
                        i18nFileContent += `\n$lang['${i18nKey}'] = '${i18nValue}'; //pgjs`;
                    }
                });

                await writeFileByEditor(path, i18nFileContent, true);
            }
        })
        .catch((error) => showMessage('error', `<genI18nKey error> ${error?.stack || error}`))
        .finally(() => setLoading(false));
    },

    /**
     * Collect i18n
     * @param {Context & { i18nFileUri: Vscode.Uri }} context
     * @returns {I18nGroup[] | Promise<I18nGroup[]>}
     */
    async collectI18n({ i18nFileUri, vscode }) {
        const i18nFileContent = (await vscode.workspace.fs.readFile(i18nFileUri)).toString();
        const i18nFileContentLines = i18nFileContent.split('\n');
        const i18nMap = new Function(`
            const $lang = {};
            ${i18nFileContent.replace('<?php', '')}
            return $lang;
        `)();
        const matchedIndexSet = new Set();
        return Object.entries(i18nMap)
            .sort(([aKey], [bKey]) => bKey.length - aKey.length)
            .map(([key, value]) => ({
                key,
                value,
                line: i18nFileContentLines.findIndex((line, index) => {
                    if (matchedIndexSet.has(index)) return false;
                    const hasKey = new RegExp(key).test(line);
                    if (hasKey) matchedIndexSet.add(index);
                    return hasKey;
                }) + 1,
            }));
    },

    /**
     * Match i18n
     * @param {Context & { type: MatchType, i18nGroups: I18nGroup[], document: Vscode.TextDocument }} context
     * @returns {I18nGroup[] | Promise<I18nGroup[]>}
     */
    matchI18n({ i18nGroups, document, _ }) {
        if (_.endsWith(document.uri.fsPath, 'php')) return [];
        return i18nGroups.filter(({ key }) => _.includes(key, '_'));
    },
};