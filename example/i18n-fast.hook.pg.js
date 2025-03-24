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
        path: 'application/third_party/language/chinese/erp_lang.php',
        map: {
            'com_pau_warehouse_inventory_new_stock': '新库存总数',
            'com_pau_warehouse_inventory_sold_new_stock': '新可售',
            'com_pau_warehouse_inventory_order_deliver': '订单标发',
            'com_pau_warehouse_inventory_stock_change': '可售库存变动记录',
            'com_package_can_print': '全部到齐, 可以打包',
            'com_package_pick_item': '已到货, 补货拣货',
            'com_package_print_paper': '打印面单',
            'com_package_print_package_tag': '打印包裹标签',
            'com_package_reprint_paper': '已打印，重新打印面单',
            'com_package_scan_error1': '货品({0})不属于当前包裹, 请扫描正确的货品',
            'com_crm_customer_message': '买家消息',
            'com_crm_platform_message': '平台消息',
            'com_crm_customer_platform_message': '买家、平台消息',
            'com_crm_customer_platform_message_chose': '选择消息平台',
            'com_crm_reply_message': '回复消息',
            'com_wfs_ple_select_category': '请先选择转换类目',
            'com_wfs_async_listing_attr_tip': '系统将自动为您从Listing页面获取品牌、产品属性、长宽高重(仅限酋长刊登的Listing)等信息，未能成功获取的，可自行填写',
            'com_wfs_sync_stock': '同步WFS库存',
            'com_wfs_sync_finish': '同步完成',
            'com_walmart_lag_time': '履约时间',
            'com_product_safety_information_pictograms': '象形图',
            'com_product_safety_information_statements': '安全声明',
            'com_product_safety_information_additional_information': '附加信息',
            'com_product_safety_information_pictograms_placeholder': '请输入象形图',
            'com_product_safety_information_statements_placeholder': '请输入安全声明',
        },
    },
    {
        path: 'application/third_party/language/chinese/common_lang.php',
        map: {
            'com_yes': '是',
            'com_no': '否',
            'com_back': '返回',
            'com_sure': '确定',
            'com_cancel': '取消',
            'com_create': '创建',
            'com_if': '如果',
            'com_delete': '删除',
            'com_save': '保存',
            'com_disable': '禁用',
            'com_enable': '启用',
            'com_edit': '编辑',
            'com_perfect': '完善',
            'com_preview': '预览',
            'com_title': '标题',
            'com_close': '关闭',
        },
    },
];

/**
 * @param {{ text: string, path: string }[]} inputs
 * @param {string[]} i18nFiles
 * @returns {{ originalText: string, i18nKey: string, isCommon: boolean }[]}
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
   - isCommon: Whether the text is a generic text.
    -- Set to true only if the text is generic.
    -- Usually, this should be false.
    -- Refer to \`common_lang.php\` for examples.

3. **i18n Key Rules**:
   - Structure: \`com_[main module (optional)]_[sub module (optional)]_[semantic content]\`.
   - Extract module names from file paths when relevant, but do not force matches.
   - Prefer nouns for semantic content.
   - Separate multiple words with underscores (_).
   - Keep it concise.

5. **Response Requirements**:
   - Maintain the same input order in the output.
   - Ensure each input has a corresponding output.
   - You must return a **valid JSON string**, without extra text, explanations, or code blocks.`;

    const userPrompt = `### Input:
${JSON.stringify(inputs, null, 2)}

### Reference Examples:
${examples.map(e => `[File] ${e.path}\n[Keys]\n${Object.entries(e.map).map(([k, v]) => `${k} = ${v}`).join('\n')}`).join('\n\n')}
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