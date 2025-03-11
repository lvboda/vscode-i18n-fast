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
    convert: async ({ convertGroups, document, vscode, _, safeCall, isInJsxElement, isInJsxAttribute, qs, uuid }) => {
        const documentText = document.getText();
        return convertGroups.map((group) => {
            // 解析自定义参数
            const [i18nValue = group.i18nValue, paramsStr = ''] = group.i18nValue.split('?i');
            const params = { ...qs.parse(paramsStr) };

            const i18nKey = group.type === 'new' ? `i18n-fast-loading-${uuid.v4()}` : group.i18nKey;

            // 生成 overwriteText
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
    write: async ({ convertGroups, _, vscode, writeFileByEditor, editor, setLoading, getConfig }) => {
        await writeFileByEditor(editor.document.uri, convertGroups.filter(({ range, overwriteText }) => !_.isNil(range) && !_.isNil(overwriteText)).map(({ range, overwriteText }) => ({ range, content: overwriteText })));

        let needCreateGroups = convertGroups.filter(({ type }) => type === 'new');
        if (needCreateGroups.length === 0) return;

        setLoading(true);
        const i18nFilePaths = (await vscode.workspace.findFiles(getConfig().i18nFilePattern)).map(({ fsPath }) => fsPath);
        const toBeWrittenI18nFilePath = _.sample(i18nFilePaths.filter((path) => /(pg_lang|erp_lang)\.php/.test(path)));
        const commonFilePath = i18nFilePaths.find((path) => _.endsWith(path, 'common_lang.php'));
        genI18nKeys(needCreateGroups.map(({ i18nValue }) => ({ text: i18nValue, path: editor.document.uri.fsPath }))).then(async (generated) => {
            needCreateGroups = needCreateGroups
                .map((group) => {
                    const { i18nKey, isCommon } = generated.find(({ originalText }) => originalText === group.i18nValue) || {};
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
                        group.isCommon = isCommon;
                    }
                    return group;
                })
                .filter(({ i18nKey, overwriteI18nKeyRanges }) => !_.isNil(i18nKey) && overwriteI18nKeyRanges.length > 0);

            await writeFileByEditor(editor.document.uri, needCreateGroups.map(({ i18nKey, overwriteI18nKeyRanges }) => overwriteI18nKeyRanges.map((range) => ({ range, content: i18nKey }))).flat());

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
        .finally(() => {
            setLoading(false);
        });
    },
    i18nGroup: async ({ i18nFileUri, vscode }) => {
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
    }
};
