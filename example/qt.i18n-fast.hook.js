module.exports = {
    match: async ({ documentText }) => {
        return [/(?:'|\"|`)#\\((.+?)\\)(?:'|\"|`)/gs, /#\\((.+?)\\)/gs].map((regex) => _.flatMap([...documentText.matchAll(regex)]));
    },
    customParam: async ({ matchedGroup }) => {
        return [matchedGroup[1].split('?i')[0], qs.parse(matchedGroup[1].split('?i')?.[1] || '')];
    },
    i18nKey: async ({ convert2pinyin, crypto, realText }) => {
        return `${convert2pinyin(realText, { separator: '-', limit: 50 })}.${crypto.MD5(realText).toString(crypto.enc.Hex)}`;
    },
    codeOverwrite: async ({ _, customParam, i18nKey }) => {
        if (!_.isNil(customParam?.c)) return `<FormattedMessage id='${i18nKey}'${customParam?.v ? ` values={{ ${customParam.v} }}` : ''}/>`;
        return `${customParam?.isInJsx ? '{' : '' }formatMessage({ id: '${i18nKey}' }${customParam?.v ? `, { ${customParam.v} }` : ''})${customParam?.isInJsx ? '}' : ''}`;
    },
    i18nFilePath: async ({ fg, workspace, editor }) => {
        return fg.sync('share/locales/zh-CN/ads.js', { cwd: workspace.getWorkspaceFolder(editor.document.uri)?.uri.fsPath });
    },
    i18nFileOverwrite: async ({ fileContent, matchedGroups }) => {
        fileContent = fileContent.trim();

        const regex = /module\.exports\s*=\s*(\{[\s\S]*\})/;
        if (!!fileContent && !regex.test(fileContent)) {
            throw new Error('i18n file content is invalid');
        }

        const obj = new Function(`return ${fileContent.match(regex)?.[1] || '{}'}`)();
        matchedGroups.forEach(([_, value, key]) => {
            if (key) obj[key] = value;
        });

        return `module.exports = ${JSON.stringify(obj, null, 2)};`;
    }
};