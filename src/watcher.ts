import * as path from 'node:path';
import { workspace, Uri, RelativePattern } from 'vscode';
// 这里为了支持 glob 用 chokidar@3.6.0 版本
import { watch } from 'chokidar';
import { isString } from 'lodash';

import type { GlobPattern, Disposable } from "vscode";
import type { FSWatcher } from 'chokidar';

export enum WATCH_STATE {
    CHANGE = 'change',
    CREATE = 'create',
    DELETE = 'delete',
}

export default class Watcher implements Disposable {
    private cwd: string;
    private watcher?: FSWatcher;

    constructor() {
        const cwd = workspace.workspaceFolders?.[0]?.uri.fsPath;

        if (!cwd) {
            throw new Error('No workspace folder found');
        }

        this.cwd = cwd;
    }

    private toRelativePattern(pattern: GlobPattern) {
        if (isString(pattern)) {
            return new RelativePattern(this.cwd, pattern);
        }

        return pattern;
    }

    async watch(pattern: GlobPattern, callback: (state: WATCH_STATE, uri: Uri) => void): Promise<Watcher> {
        const rp = this.toRelativePattern(pattern);
        const cwd = rp.baseUri?.fsPath || this.cwd;

        return new Promise((resolve) => {
            this.watcher = watch(rp.pattern, {
                cwd,
                persistent: true,
                ignoreInitial: true,
            });

            this.watcher
                .on('add', (relativePath) => callback(WATCH_STATE.CREATE, Uri.file(path.join(cwd, relativePath))))
                .on('change', (relativePath) => callback(WATCH_STATE.CHANGE, Uri.file(path.join(cwd, relativePath))))
                .on('unlink', (relativePath) => callback(WATCH_STATE.DELETE, Uri.file(path.join(cwd, relativePath))))
                .on('error', (error) => console.error(`Watcher(cwd: ${cwd}, pattern: ${rp.pattern}) error:`, error))
                .on('ready', () => resolve(this));
        });
    }

    async dispose() {
        return await this.watcher?.close();
    }
}
