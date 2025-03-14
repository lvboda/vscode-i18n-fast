const genI18nKeys = require('./gen-i18n-keys');

module.exports = {
    match: async ({ document }) => {
        const documentText = document.getText();
        const matchedArr = documentText.match(/(?:(['"`])#\((.+?)\)\1|#\((.+?)\))/gs) || [];
        return matchedArr
          .map((matchedText) => {
            const i18nValue = [...matchedText.matchAll(/#\((.*?)\)/gs)]?.[0]?.[1];
            if (!i18nValue) return;
            return { matchedText, i18nValue };
          }).filter(Boolean);
    },
    convert: async ({ convertGroups, document, safeCall, isInJsxElement, isInJsxAttribute, qs, uuid }) => {
        const documentText = document.getText();
        return convertGroups.map((group) => {
            // 解析自定义参数
            const [i18nValue = group.i18nValue, paramsStr = ''] = group.i18nValue.split('?i');
            const params = { ...qs.parse(paramsStr) };

            const i18nKey = group.type === 'new' ? `i18n-fast-loading-${uuid.v4()}` : group.i18nKey;

            // 生成 overwriteText
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
    write: async ({ convertGroups, _, showMessage, vscode, writeFileByEditor, editor, setLoading, getConfig }) => {
        await writeFileByEditor(editor.document.uri, convertGroups.filter(({ range, overwriteText }) => !_.isNil(range) && !_.isNil(overwriteText)).map(({ range, overwriteText }) => ({ range, content: overwriteText })));

        let needCreateGroups = convertGroups.filter(({ type }) => type === 'new');
        if (needCreateGroups.length === 0) return;

        setLoading(true);
        genI18nKeys(
            needCreateGroups.map(({ i18nValue }) => ({ text: i18nValue, path: editor.document.uri.fsPath })),
            (await vscode.workspace.findFiles(getConfig().i18nFilePattern)).map(({ fsPath }) => fsPath)
        ).then(async (generated) => {
            needCreateGroups = needCreateGroups
                .map((group) => {
                    const { i18nKey, path } = generated.find(({ originalText }) => originalText === group.i18nValue) || {};
                    if (i18nKey) {
                        group.overwriteI18nKeyRanges = [];
                        [...editor.document.getText().matchAll(new RegExp(group.i18nKey, 'g'))].forEach((matched) => {
                            if (!_.isNil(matched.index)) {
                                const start = editor.document.positionAt(matched.index);
                                const end = editor.document.positionAt(matched.index + group.i18nKey.length);
                                group.overwriteI18nKeyRanges.push(new vscode.Range(start, end));
                            }
                        });
                        group.i18nKey = i18nKey;
                        group.i18nFilePath = path;
                    }
                    return group;
                })
                .filter(({ i18nKey, overwriteI18nKeyRanges }) => !_.isNil(i18nKey) && overwriteI18nKeyRanges.length > 0);

            await writeFileByEditor(editor.document.uri, needCreateGroups.map(({ i18nKey, overwriteI18nKeyRanges }) => overwriteI18nKeyRanges.map((range) => ({ range, content: i18nKey }))).flat());

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
    i18nGroup: async ({ i18nFileUri, vscode, getICUMessageFormatAST, safeCall }) => {
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
    }
};
