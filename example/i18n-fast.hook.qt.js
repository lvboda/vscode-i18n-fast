const AIGC_API = ''; // your aigc api

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
 * @typedef {Object} I18nGroup
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
 * some tools
 * @typedef {Object} Context
 * @property {Vscode} vscode
 * @property {import('qs')} qs - see {@link https://www.npmjs.com/package/qs}
 * @property {import('crypto-js')} crypto - see {@link https://www.npmjs.com/package/crypto-js}
 * @property {import('uuid')} uuid - see {@link https://www.npmjs.com/package/uuid}
 * @property {import('lodash')} _ - see {@link https://www.npmjs.com/package/lodash}
 * @property {import('@babel/parser') & { traverse: import('@babel/traverse') }} babel - see {@link https://www.npmjs.com/package/@babel/parser}, {@link https://www.npmjs.com/package/@babel/traverse}
 * @property {typeof module.exports} hook
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

const examples = [
    {
        path: 'app/share/locales/zh-CN/accountAuth.js',
        map: {
            'app.account.auth.current-account': '当前账号',
            'app.account.auth.pf-auth-fmt': '{platform}账号授权',
            'app.account.auth.step.next': '下一步',
            'app.account.auth.operator-step': '操作步骤',
            'app.account.auth.click-me-to-auth': '点此授权',
            'app.account': '账号',
        },
    },
    {
        path: 'app/share/locales/zh-CN/report/buybox.js',
        map: {
            'app.report.buybox.winner': 'Buy Box拥有者',
            'app.report.buybox.seller.id': '卖家ID',
            'app.report.buybox.followers.watch': '跟卖调价',
            'app.report.buybox.no.followers': '无跟卖',
            'app.report.buybox.competitor.quantity': '竞争对手数',
            'app.report.buybox.competitor.detail': '竞争对手明细',
            'app.report.buybox.competitor.quantity.7day': '7日内竞争对手数',
            'app.report.buybox.be.followed.shop': '被跟卖店铺',
            'app.report.buybox.filter.self.account': '过滤自己跟卖自己的账号',
        },
    },
    {
        path: 'app/share/locales/zh-CN/report/listing.js',
        map: {
            'app.report.listing.com.applied': '已应用',
            'app.report.listing.dynamic.rate': '动态费率',
            'app.report.listing.predict.ads.fee': '预计广告费用',
            'app.report.listing.wait.ebay.handle': '等待eBay处理',
        },
    },
    {
        path: 'app/share/locales/zh-CN/report/common.js',
        map: {
            'app.confirm': '确定',
            'app.accept': '接受',
            'app.refresh': '刷新',
            'app.success': '完成',
            'app.return': '返回',
        },
    },
];

/**
 * @param {{ text: string, path: string }[]} inputs
 * @param {string[]} i18nFiles
 * @returns {{ originalText: string, i18nKey: string, path?: string }[]}
*/
const genI18nKey = async (inputs, i18nFiles) => {
    const systemPrompt = `You are an expert in generating i18n keys. Follow these instructions strictly:

1. **Input Format**:
   An array of objects, each containing:
   - text: The original text requiring an i18n key.
   - path: The file path where the text appears.

2. **Output Format**:
   Return a JSON object with a single key: \`result\`, each containing:
   - originalText: The original input text.
   - i18nKey: The generated i18n key.
   - path: The picked i18n file path.
    -- The \`path\` must be exactly one from the provided \`available i18n files\`. Do not add or remove directory levels.
    -- If no exact match exists, return \`undefined\`.
    -- Do not assume the existence of paths based on similar names. Only use paths explicitly listed.

3. **i18n Key Rules**:
   - Structure: \`app.[main module (optional)].[sub module (optional)].[semantic content]\`.
   - Extract module names from file paths when relevant, but do not force matches.
   - Prefer nouns for semantic content.
   - Use lowercase and hyphens for multi-word keys.
   - Keep it concise.

4. **File Matching Rules**:
   - Match the most relevant functional module.
   - Prioritize files in the same directory hierarchy.
   - Only use provided file names—do not create new ones.
   - Ensure that the matching process favors more specific modules over general ones.

5. **Response Requirements**:
   - Maintain the same input order in the output.
   - Ensure each input has a corresponding output.
   - You must return a **valid JSON string**, without extra text, explanations, or code blocks.`;

    const userPrompt = `### Input:
${JSON.stringify(inputs, null, 2)}

### Reference Examples:
${examples.map(e => `[File] ${e.path}\n[Keys]\n${Object.entries(e.map).map(([k, v]) => `${k} = ${v}`).join('\n')}`).join('\n\n')}

### Available i18n Files:
${i18nFiles.join('\n')}
`;
    const res = await (await fetch(AIGC_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            system: systemPrompt,
            prompt: userPrompt,
            timeout: 30,
            max_retries: 3,
            model: "gpt-4o-mini",
            stream: false,
            messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }]
        })
    })).json();

    const { result } = JSON.parse(res.choices[0].message.content);

    if (inputs.some(({ text }, index) => !result[index].originalText === text)) throw new Error('generate structure error');
    
    return result;
}

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
     * @param {Context & { convertGroups: ConvertGroup[], document: Vscode.TextDocument }} context
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
     * Collect i18n
     * @param {Context & { i18nFileUri: Vscode.Uri }} context
     * @returns {I18nGroup[] | Promise<I18nGroup[]>}
     */
    async collectI18n({ i18nFileUri, vscode, getICUMessageFormatAST, safeCall }) {
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

    /**
     * Match i18n
     * @param {Context & { type: MatchType, i18nGroups: I18nGroup[], document: Vscode.TextDocument }} context
     * @returns {I18nGroup[] | Promise<I18nGroup[]>}
     */
    matchI18n({ i18nGroups, _ }) {
        return i18nGroups.filter(({ key }) => _.includes(key, '.'));
    },
};