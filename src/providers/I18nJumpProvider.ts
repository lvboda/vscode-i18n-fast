import { Range, workspace, Position, Uri } from 'vscode';
import { isNil, max } from 'lodash';
import { match } from 'minimatch';
import { AhoCorasick } from '@monyone/aho-corasick';

import Hook from '@/utils/hook';
import I18n from '@/utils/i18n';
import { getConfig } from '@/utils/config';
import { MatchType, SupportType } from '@/utils/constant';
import { checkSupportType } from '@/utils';

import type { DefinitionProvider, TextDocument } from 'vscode';
import type { I18nGroup } from '@/types';

const genLocationLink = ({ supportType = SupportType.All, range, locationLink, filePath, line = 0 }: I18nGroup) => {
    if (!checkSupportType(SupportType.Jump, supportType) || isNil(range)) {
        return;
    }

    if (locationLink) {
        return locationLink;
    }
    
    if (!filePath) {
        return;
    }

    const lineEndPos = new Position(max([line - 1, 0]) || 0, Number.MAX_SAFE_INTEGER);
    return [{
        targetUri: Uri.file(filePath),
        targetRange: new Range(lineEndPos, lineEndPos),
        originSelectionRange: range,
    }];
};

export class I18nJumpProvider implements DefinitionProvider {
    static instance: I18nJumpProvider;

    static getInstance() {
        if (!I18nJumpProvider.instance) {
            I18nJumpProvider.instance = new I18nJumpProvider();
        }

        return I18nJumpProvider.instance;
    }

    async provideDefinition(document: TextDocument, position: Position) {
        // 排除掉 i18n 文件
        const { i18nFilePattern } = getConfig();
        if (
            !workspace.getWorkspaceFolder(document.uri) || 
            !!match([workspace.asRelativePath(document.uri, false)], i18nFilePattern).length
        ) {
            return;
        }

        const i18nGroups = I18n.getInstance().getI18nGroups();
        const [matched] = (new AhoCorasick(i18nGroups.map(({ key }) => key)))
            .matchInText(document.lineAt(position.line).text)
            .sort((a, b) => b.keyword.length - a.keyword.length)
            .map(({ keyword, begin, end }) => ({ keyword, range: new Range(new Position(position.line, begin), new Position(position.line, end)) }))
            .filter(({ range }) => range.contains(new Range(position, position)));

        if (!matched) {
            return;
        }

        const group = i18nGroups.find(({ key }) => key === matched.keyword);
        if (!group) {
            return;
        }

        return genLocationLink((await Hook.getInstance().matchI18n({ type: MatchType.Document, i18nGroups: [{ ...group, range: matched.range }], document }))[0]);
    }
}