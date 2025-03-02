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
    convert: async ({ convertGroup, isInJsx, isInJsxAttribute, qs, convert2pinyin, crypto }) => {
        // 解析自定义参数
        const [i18nValue = convertGroup.i18nValue, customParamStr = ''] = convertGroup.i18nValue.split('?i');
        const customParam = qs.parse(customParamStr) || {};
  
        // 生成 i18nKey
        const i18nKey = `${convert2pinyin(i18nValue, { separator: '-', limit: 50 })}.${crypto.MD5(i18nValue).toString(crypto.enc.Hex)}`;
  
        // 生成 overwriteText
        const inJsxOrJsxAttribute = isInJsx(convertGroup.editingDocumentText, convertGroup.matchedText) || isInJsxAttribute(convertGroup.editingDocumentText, convertGroup.matchedText);
        const overwriteText = `${inJsxOrJsxAttribute ? '{' : '' }formatMessage({ id: '${i18nKey}' }${customParam.v ? `, { ${customParam.v} }` : ''})${inJsxOrJsxAttribute ? '}' : ''}`;
  
        return {
            ...convertGroup,
            i18nKey,
            i18nValue,
            overwriteText,
            customParam,
        };
    },
    write: async ({ convertGroups, editedDocumentText, documentUri, workspace, writeFileByEditor }) => {
        const [i18nFileUri] = await workspace.findFiles('**/locales/zh-CN/index.js');
        if (!i18nFileUri) return false;
  
        const i18nFileContent = Buffer.from(await workspace.fs.readFile(i18nFileUri)).toString('utf8');
  
        const regex = /module\.exports\s*=\s*(\{[\s\S]*\})/;
        if (!!i18nFileContent && !regex.test(i18nFileContent)) throw new Error('i18n file content is invalid');
  
        const obj = new Function(`return ${i18nFileContent.match(regex)?.[1] || '{}'}`)();
        convertGroups.forEach(({ i18nKey, i18nValue }) => {
            if (i18nKey && i18nValue) obj[i18nKey] = i18nValue;
        });
  
        await Promise.all([
            writeFileByEditor(i18nFileUri, `module.exports = ${JSON.stringify(obj, null, 2)};`),
            writeFileByEditor(documentUri, editedDocumentText),
        ]);
  
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
  