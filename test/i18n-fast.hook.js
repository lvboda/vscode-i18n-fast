const genI18nKeys = require('./gen-i18n-keys');
// i18n-fast.hook.js
// app/share/locales/zh-CN/**/*.js
module.exports = {
    hookFilePattern: 'i18n-fast.hook.js',
    i18nFilePattern: 'locales/zh-CN/**/*.js',
    autoMatchChinese: true,
    conflictPolicy: 'smart',

    match: async ({ documentText }) => {
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

            const i18nKey = group.type === 'new' ? `loading-${uuid.v4()}` : group.i18nKey;

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
    write: async ({ convertGroups, hook, _, prettier, vscode, writeFileByEditor, editor, showStatusBar, hideStatusBar }) => {
        console.log(await hook.i18nFilePattern(), 'lbd await hook.i18nFilePattern();');
        await writeFileByEditor(editor.document.uri, convertGroups.filter(({ range, overwriteText }) => !_.isNil(range) && !_.isNil(overwriteText)).map(({ range, overwriteText }) => ({ range, content: overwriteText })));

        let needNewGroups = convertGroups.filter(({ type }) => type === 'new');
        showStatusBar('$(loading~spin) generating...');
        genI18nKeys(
            needNewGroups.map(({ i18nValue }) => ({ text: i18nValue, path: editor.document.uri.fsPath })),
            (await vscode.workspace.findFiles(await hook.i18nFilePattern())).map(({ fsPath }) => fsPath)
        ).then(async (generated) => {
            needNewGroups = needNewGroups
                .map((group) => {
                    const { i18nKey, path } = generated.find(({ originalText }) => originalText === group.i18nValue) || {};
                    if (i18nKey) {
                        const { line } = group.range.start;
                        const keyIndex = editor.document.getText(new vscode.Range(group.range.start, new vscode.Position(line, group.range.start.character + group.overwriteText.length))).match(new RegExp(group.i18nKey))?.index;
                        if (!_.isNil(keyIndex)) {
                            group.overwriteI18nKeyRange = new vscode.Range(new vscode.Position(line, group.range.start.character + keyIndex), new vscode.Position(line, group.range.start.character + keyIndex + group.i18nKey.length));
                        }
                        group.i18nKey = i18nKey;
                        group.i18nFilePath = path;
                    }
                    return group;
                })
                .filter(({ i18nKey, overwriteI18nKeyRange }) => !_.isNil(i18nKey) && !_.isNil(overwriteI18nKeyRange));

            await writeFileByEditor(editor.document.uri, needNewGroups.map(({ i18nKey, overwriteI18nKeyRange }) => ({ range: overwriteI18nKeyRange, content: i18nKey })));

            for (const [path, groups] of Object.entries(_.groupBy(needNewGroups, 'i18nFilePath'))) {
                const i18nFileContent = Buffer.from(await vscode.workspace.fs.readFile(vscode.Uri.file(path))).toString('utf8');
                const regex = /module\.exports\s*=\s*(\{[\s\S]*\})/;
                if (!!i18nFileContent && !regex.test(i18nFileContent)) {
                    console.error(`${path} i18n file content is invalid`);
                    continue;
                }

                const content = groups.reduce((pre, { i18nKey, i18nValue }) => {
                    if (i18nKey && i18nValue) {
                        pre += `"${i18nKey}": "${i18nValue}",`;
                    }
                    return pre;
                }, '');

                const updatedContent = i18nFileContent.replace(/(\s*)([,\s]*)(\}\s*;\s*)$/, `,${content}};`);
                
                await writeFileByEditor(path, await prettier.format(updatedContent, { parser: 'babel', trailingComma: 'none' }));
            }
        })
        .finally(() => {
            hideStatusBar();
        });
    },
    i18nGroups: async ({ i18nFileUri, vscode, getICUMessageFormatAST, safeCall }) => {
        const lines = Buffer.from(await vscode.workspace.fs.readFile(i18nFileUri)).toString('utf8').split('\n');
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
  