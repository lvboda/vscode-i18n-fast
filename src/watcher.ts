import { workspace, RelativePattern } from 'vscode';

import type { FileSystemWatcher, GlobPattern, Uri, Disposable } from "vscode";

export enum WATCH_STATE {
    CHANGE = 'change',
    CREATE = 'create',
    DELETE = 'delete',
}

export default class Watcher implements Disposable {
    private watcher: FileSystemWatcher;

    constructor(globPattern: string | GlobPattern) {
        const pattern = typeof globPattern === 'string' ? new RelativePattern(workspace.workspaceFolders?.[0] || '', globPattern) : globPattern;
        this.watcher = workspace.createFileSystemWatcher(pattern);
    }

    public on(callback: (state: WATCH_STATE, uri: Uri) => void) {
        this.watcher.onDidChange((uri) => callback(WATCH_STATE.CHANGE, uri));
        this.watcher.onDidCreate((uri) => callback(WATCH_STATE.CREATE, uri));
        this.watcher.onDidDelete((uri) => callback(WATCH_STATE.DELETE, uri));

        return this;
    }

    public dispose() {
        this.watcher.dispose();
    }
}
