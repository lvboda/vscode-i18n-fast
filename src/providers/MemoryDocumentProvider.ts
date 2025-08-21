import { EventEmitter, workspace, Uri } from 'vscode';

import type { TextDocumentContentProvider } from 'vscode';

/**
 * 暂时没用到
*/
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