
// i18n-fast.hook.js
// app/share/locales/zh-CN/**/*.js
module.exports = {
    match: async ({ documentText }) => {
        const matchedArr = documentText.match(/(?:(['"`])#\((.+?)\)\1|#\((.+?)\))/gs) || [];
        return matchedArr
          .map((matchedText) => {
            const i18nValue = [...matchedText.matchAll(/#\((.*?)\)/gs)]?.[0]?.[1];
            if (!i18nValue) return;
            return { matchedText, i18nValue };
          }).filter(Boolean);
    },
    convert: async ({ convertGroups, document, safeCall, isInJsxElement, isInJsxAttribute, qs, convert2pinyin, crypto }) => {
        const documentText = document.getText();
        return convertGroups.map((group) => {
            // 解析自定义参数
            const [i18nValue = group.i18nValue, customParamStr = ''] = group.i18nValue.split('?i');
            const customParam = qs.parse(customParamStr) || {};

            // 生成 i18nKey
            const i18nKey = group.i18nKey || `${convert2pinyin(i18nValue, { separator: '-', limit: 50 })}.${crypto.MD5(i18nValue).toString(crypto.enc.Hex)}`;

            // 生成 overwriteText
            const startIndex = document.offsetAt(group.range.start);
            const endIndex = document.offsetAt(group.range.end);
            const inJsxOrJsxAttribute = safeCall(isInJsxElement, [documentText, startIndex, endIndex]) || safeCall(isInJsxAttribute, [documentText, startIndex, endIndex]);
            const overwriteText = `${inJsxOrJsxAttribute ? '{' : '' }formatMessage({ id: '${i18nKey}' }${customParam.v ? `, { ${customParam.v} }` : ''})${inJsxOrJsxAttribute ? '}' : ''}`;

            return {
                ...group,
                i18nKey,
                i18nValue,
                overwriteText,
                customParam,
            };
        });
    },
    write: async ({ convertGroups, workspace, writeFileByEditor }) => {
        const [i18nFileUri] = await workspace.findFiles('**/locales/zh-CN/index.js');
        if (!i18nFileUri) return false;

        const i18nFileContent = Buffer.from(await workspace.fs.readFile(i18nFileUri)).toString('utf8');
  
        const regex = /module\.exports\s*=\s*(\{[\s\S]*\})/;
        if (!!i18nFileContent && !regex.test(i18nFileContent)) throw new Error('i18n file content is invalid');
  
        const obj = new Function(`return ${i18nFileContent.match(regex)?.[1] || '{}'}`)();
        convertGroups.forEach(({ i18nKey, i18nValue, isNew }) => {
            if (i18nKey && i18nValue && isNew) obj[i18nKey] = i18nValue;
        });

        if (Object.keys(obj).length) {
            await writeFileByEditor(i18nFileUri, `module.exports = ${JSON.stringify(obj, null, 2)};`);
        }

        return true;
    },
    i18nGroups: async ({ i18nFileUri, workspace, getICUMessageFormatAST, safeCall }) => {
        const lines = Buffer.from(await workspace.fs.readFile(i18nFileUri)).toString('utf8').split('\n');
        const matchedIndexSet = new Set();
        delete require.cache[require.resolve(i18nFileUri.fsPath)];
        return Object.entries(require(i18nFileUri.fsPath))
            .sort(([aKey], [bKey]) => bKey.length - aKey.length)
            .map(([key, value]) => ({
                key,
                value,
                valueAST: safeCall(getICUMessageFormatAST, [value]),
                line: lines.findIndex((line, index) => {
                    if (matchedIndexSet.has(index)) return false;
                    const hasKey = new RegExp(key).test(line);
                    if (hasKey) matchedIndexSet.add(index);
                    return hasKey;
                }) + 1,
            }));
    }
};
  