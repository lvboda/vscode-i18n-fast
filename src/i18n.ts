import { workspace } from "vscode";

import Watcher, { WATCH_STATE } from './watcher';
import { getWorkspaceKey } from './utils';
import { getConfig } from "./config";
import { FILE_IGNORE } from './constant';

import type Hook from './hook';
import type { I18nGroup } from "./types";

type PathMap = Map<string, I18nGroup[]>;
type WorkspaceMap = Map<string, PathMap>;

export default class I18n {
    private i18nMap: WorkspaceMap = new Map();
    private watcherMap: Map<string, Watcher> = new Map();
    private static instance: I18n;

    static getInstance(): I18n {
        if (!I18n.instance) I18n.instance = new I18n;
        return I18n.instance;
    }

    private disposeMap(workspaceKey: string) {
        this.i18nMap.delete(workspaceKey);
    }

    private disposeWatcher(workspaceKey: string) {
        const watcher = this.watcherMap.get(workspaceKey);
        if (!watcher) return;
        watcher.dispose();
        this.watcherMap.delete(workspaceKey);
    }

    dispose(workspaceKey: string) {
        this.disposeMap(workspaceKey);
        this.disposeWatcher(workspaceKey);
    }

    async init(hook: Hook) {
        return await this.reload(hook, getConfig().i18nFilePattern);
    }

    async reload(hook: Hook, i18nFilePattern?: string) {
        const workspaceKey = getWorkspaceKey();
        if (!workspaceKey) return;
        this.dispose(workspaceKey);
        if (!i18nFilePattern) return;
        const i18nFileUris = await workspace.findFiles(i18nFilePattern, FILE_IGNORE);
        if (!i18nFileUris.length) return;
    
        const i18nMap = await i18nFileUris.reduce<Promise<PathMap>>(async (map, i18nFileUri) => (await map).set(i18nFileUri.fsPath, await hook.matchI18n({ i18nFileUri })), Promise.resolve(new Map()));
        this.i18nMap.set(workspaceKey, i18nMap);

        this.watcherMap.set(workspaceKey, new Watcher(i18nFilePattern).on(async (state, uri) => {
            const pathMap = this.i18nMap.get(workspaceKey) || new Map();

            switch (state) {
                case WATCH_STATE.CHANGE:
                    pathMap.set(uri.fsPath, await hook.matchI18n({ i18nFileUri: uri }));
                    this.i18nMap.set(workspaceKey, pathMap);
                    break;
                case WATCH_STATE.CREATE:
                    pathMap.set(uri.fsPath, []);
                    this.i18nMap.set(workspaceKey, pathMap);
                    break;
                case WATCH_STATE.DELETE:
                    pathMap.delete(uri.fsPath);
                    this.i18nMap.set(workspaceKey, pathMap);
                    break; 
            }
        }));
    }

    getI18nGroups(workspaceKey = getWorkspaceKey()): I18nGroup[] {
        if (!workspaceKey) return [];
        return Array.from(this.i18nMap.get(workspaceKey)?.entries() || [])
            .map(([filePath, groups]) => groups?.map((item) => ({ filePath, ...item })) || [])
            .flat();
    }
}
