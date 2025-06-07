import { workspace } from "vscode";

import Hook from './hook';
import { getConfig } from "./config";
import { FILE_IGNORE } from './constant';
import { getWorkspaceKey } from './utils';
import Watcher, { WATCH_STATE } from './watcher';

import type { Uri } from 'vscode';
import type { I18nGroup } from "./types";

type PathMap = Map<string, I18nGroup[]>;
type WorkspaceMap = Map<string, PathMap>;

export default class I18n {
    private i18nMap: WorkspaceMap = new Map();
    private watcherMap: Map<string, Watcher> = new Map();
    private _onChange?: () => void;
    private static instance: I18n;

    static getInstance(): I18n {
        if (!I18n.instance) I18n.instance = new I18n();
        return I18n.instance;
    }

    private disposeMap(workspaceKey: string) {
        this.i18nMap.delete(workspaceKey);
    }

    private async disposeWatcher(workspaceKey: string) {
        const watcher = this.watcherMap.get(workspaceKey);
        if (!watcher) return;
        await watcher.dispose();
        this.watcherMap.delete(workspaceKey);
    }

    async dispose(workspaceKey: string) {
        this.disposeMap(workspaceKey);
        await this.disposeWatcher(workspaceKey);
    }

    async init() {
        return await this.reload();
    }

    async reload(i18nFilePattern?: string) {
        i18nFilePattern = i18nFilePattern || getConfig().i18nFilePattern;
        const workspaceKey = getWorkspaceKey();
        if (!workspaceKey) return;
        await this.dispose(workspaceKey);
        if (!i18nFilePattern) return;

        const watchCallback = async (state: WATCH_STATE, uri: Uri) => {
            const pathMap = this.i18nMap.get(workspaceKey) || new Map();

            switch (state) {
                case WATCH_STATE.CREATE:
                case WATCH_STATE.CHANGE:
                    pathMap.set(uri.fsPath, await Hook.getInstance().collectI18n({ i18nFileUri: uri }));
                    this.i18nMap.set(workspaceKey, pathMap);
                    break;
                case WATCH_STATE.DELETE:
                    pathMap.delete(uri.fsPath);
                    this.i18nMap.set(workspaceKey, pathMap);
                    break; 
            }

            this._onChange?.();
        };

        // init
        const i18nFileUris = await workspace.findFiles(i18nFilePattern, FILE_IGNORE);
        for (const uri of i18nFileUris) {
            await watchCallback(WATCH_STATE.CHANGE, uri);
        }

        const watcher = await new Watcher().watch(i18nFilePattern, watchCallback);
        this.watcherMap.set(workspaceKey, watcher);
    }

    get(): WorkspaceMap;
    get(workspaceKey: string): PathMap;
    get(workspaceKey = getWorkspaceKey()) {
        return workspaceKey ? this.i18nMap.get(workspaceKey) : this.i18nMap;
    }

    getI18nGroups(workspaceKey = getWorkspaceKey()): I18nGroup[] {
        if (!workspaceKey) return [];
        return Array.from(this.get(workspaceKey)?.entries() || [])
            .map(([filePath, groups]) => groups?.map((item) => ({ filePath, ...item })) || [])
            .flat();
    }

    onChange(callback: I18n['_onChange']) {
        this._onChange = callback;
    }
}
