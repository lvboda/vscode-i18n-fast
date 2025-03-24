import { workspace, RelativePattern } from 'vscode';
import { debounce } from 'lodash';

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
        // 这里保存文件会触发两次 change 加个防抖
        this.watcher.onDidChange(debounce((uri) => callback(WATCH_STATE.CHANGE, uri), 300, { leading: false, trailing: true }));
        this.watcher.onDidCreate((uri) => callback(WATCH_STATE.CREATE, uri));
        this.watcher.onDidDelete((uri) => callback(WATCH_STATE.DELETE, uri));

        return this;
    }

    public dispose() {
        this.watcher.dispose();
    }
}
