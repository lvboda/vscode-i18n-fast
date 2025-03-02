import { workspace } from 'vscode';

import { getConfig } from './config';
import { I18N_MAP_KEY } from './constant';

import type { FileSystemWatcher, GlobPattern, Uri, ExtensionContext } from "vscode";
import type Hook from './hook';
import type { I18nMap } from './types';

enum WATCH_STATE {
    CHANGE = 'change',
    CREATE = 'create',
    DELETE = 'delete',
}

class Watcher {
    private watcher: FileSystemWatcher;

    constructor(globPattern: GlobPattern) {
        this.watcher = workspace.createFileSystemWatcher(globPattern);
    }

    public on(callback: (state: WATCH_STATE, uri: Uri) => void) {
        this.watcher.onDidChange((uri) => callback(WATCH_STATE.CHANGE, uri));
        this.watcher.onDidCreate((uri) => callback(WATCH_STATE.CREATE, uri));
        this.watcher.onDidDelete((uri) => callback(WATCH_STATE.DELETE, uri));
    }

    public dispose() {
        this.watcher.dispose();
    }
}

export const watchHook = async (hook: Hook) => {
    const { hookFilePattern } = getConfig();
    // init
    await hook.load();

    const watcher = new Watcher(hookFilePattern);
    watcher.on(() => hook.load());

    return watcher;
}

export const watchI18n = async (hook: Hook, { globalState }: ExtensionContext) => {
    const { i18nFilePattern } = getConfig();
    // init
    const i18nFileUris = await workspace.findFiles(i18nFilePattern);
    let i18nMap = {} as I18nMap;
    for (const i18nFileUri of i18nFileUris) {
        i18nMap[i18nFileUri.fsPath] = await hook.i18nGroups({ i18nFileUri });
    }
    globalState.update(I18N_MAP_KEY, i18nMap);

    const watcher = new Watcher(i18nFilePattern);
    watcher.on(async (state, uri) => {
        const i18nMap = globalState.get<I18nMap>(I18N_MAP_KEY) || {};
        switch (state) {
            case WATCH_STATE.CHANGE:
                globalState.update(I18N_MAP_KEY, { ...i18nMap, [uri.fsPath]: await hook.i18nGroups({ i18nFileUri: uri }) });
                break;
            case WATCH_STATE.CREATE:
                globalState.update(I18N_MAP_KEY, { ...i18nMap, [uri.fsPath]: [] });
                break;
            case WATCH_STATE.DELETE:
                delete i18nMap[uri.fsPath];
                globalState.update(I18N_MAP_KEY, i18nMap);
                break; 
        }
    });

    return watcher;
}
