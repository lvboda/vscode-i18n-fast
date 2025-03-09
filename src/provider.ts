import { EventEmitter, Range, workspace, Position, Uri } from 'vscode';
import { max, isString } from 'lodash';
import { match } from 'minimatch';
import { AhoCorasick } from '@monyone/aho-corasick';

import { getI18nGroups } from './utils';


import type { TextDocumentContentProvider, DefinitionProvider, TextDocument, ExtensionContext } from 'vscode';
import type Hook from './hook';

export class I18nJumpProvider implements DefinitionProvider {
    static instance: I18nJumpProvider;

    static getInstance(context: ExtensionContext, hook: Hook) {
        if (!I18nJumpProvider.instance) {
            I18nJumpProvider.instance = new I18nJumpProvider(context, hook);
        }
        return I18nJumpProvider.instance;
    }

    constructor(private context: ExtensionContext, private hook: Hook) {}

    async provideDefinition(document: TextDocument, position: Position) {
        // 排除掉 i18n 文件
        const i18nFilePattern = await this.hook.i18nFilePattern();
        if (!workspace.getWorkspaceFolder(document.uri) || !!match([workspace.asRelativePath(document.uri, false)], isString(i18nFilePattern) ? i18nFilePattern : i18nFilePattern.pattern).length) return;

        const i18nGroups = getI18nGroups(this.context);
        const [matched] = (new AhoCorasick(i18nGroups.map(({ key }) => key)))
            .matchInText(document.lineAt(position.line).text)
            .sort((a, b) => b.keyword.length - a.keyword.length)
            .map(({ keyword, begin, end }) => ({ keyword, range: new Range(new Position(position.line, begin), new Position(position.line, end)) }))
            .filter(({ range }) => range.contains(new Range(position, position)));

        if (!matched) return;
        const { filePath, line = 0 } = i18nGroups.find(({ key }) => key === matched.keyword) || {};
        if (!filePath) return;
        const lineEndPos = new Position(max([line - 1, 0]) || 0, Number.MAX_SAFE_INTEGER);
        return [{
            targetUri: Uri.file(filePath),
            targetRange: new Range(lineEndPos, lineEndPos),
            originSelectionRange: matched.range,
        }];
    }
}

export class MemoryDocumentProvider implements TextDocumentContentProvider {
    private static instance: MemoryDocumentProvider;

    static getInstance() {
        if (!MemoryDocumentProvider.instance) {
            MemoryDocumentProvider.instance = new MemoryDocumentProvider();
        }
        return MemoryDocumentProvider.instance;
    }

    static async getDocument(documentText: string, uri?: Uri) {
        const memoryDocumentProvider = MemoryDocumentProvider.getInstance();
        const documentUri = uri || Uri.parse('memory://temp-document');
        memoryDocumentProvider.updateDocument(documentUri, documentText);
        const document = await workspace.openTextDocument(documentUri);
        return document;
    }

    private _onDidChange = new EventEmitter<Uri>();
    private documents: Map<string, string> = new Map();

    get onDidChange() {
        return this._onDidChange.event;
    }

    provideTextDocumentContent(uri: Uri) {
        return this.documents.get(uri.toString()) || '';
    }

    updateDocument(uri: Uri, newContent: string) {
        this.documents.set(uri.toString(), newContent);
        this._onDidChange.fire(uri);
    }

    deleteDocument(uri: Uri) {
        this.documents.delete(uri.toString());
        this._onDidChange.fire(uri);
    }
}