import * as vscode from 'vscode';
import * as uuid from 'uuid';
import * as babelParser from '@babel/parser';
import traverse from '@babel/traverse';
import lodash from 'lodash';
import qs from 'qs';
import crypto from 'crypto-js';

import I18n from './i18n';
import { getConfig } from './config';
import { showMessage } from './tips';
import { FILE_IGNORE, WatchState } from './constant';
import Watcher from './watcher';
import {
    convert2pinyin,
    isInJsxElement,
    isInJsxAttribute,
    writeFileByEditor,
    getICUMessageFormatAST,
    safeCall,
    asyncSafeCall,
    getWorkspaceKey,
    getLoading,
    setLoading,
    dynamicRequire,
    matchChinese,
} from './utils';

import type { TextDocument, Uri, ExtensionContext } from 'vscode'
import type { MatchType } from './constant';
import type { ConvertGroup, I18nGroup } from './types';

type WorkspaceHook = Map<string, Record<string, (context: Record<string, any>) => any>>;

class Hook {
    private extensionContext?: ExtensionContext;
    private hookMap: WorkspaceHook = new Map();
    private watcherMap: Map<string, Watcher> = new Map();
    private loading = false;
    private _onChange?: () => void;
    private static instance: Hook;

    static getInstance(): Hook {
        if (!Hook.instance) Hook.instance = new Hook();
        return Hook.instance;
    }

    private disposeMap(workspaceKey: string) {
        this.hookMap.delete(workspaceKey);
    }

    private async disposeWatcher(workspaceKey: string) {
        const watcher = this.watcherMap.get(workspaceKey);
        if (!watcher) {
            return;
        }

        await watcher.dispose();
        this.watcherMap.delete(workspaceKey);
    }

    async dispose(workspaceKey: string) {
        this.disposeMap(workspaceKey);
        await this.disposeWatcher(workspaceKey);
    }

    onChange(callback: Hook['_onChange']) {
        this._onChange = callback;
    }

    setHook(workspaceKey: string, path: string) {
        this.hookMap.set(workspaceKey, dynamicRequire(path));
    }

    async init(extensionContext: ExtensionContext) {
        this.extensionContext = extensionContext;
        return await this.reload();
    }

    async reload(hookFilePattern?: string) {
        hookFilePattern = hookFilePattern || getConfig().hookFilePattern;

        const workspaceKey = getWorkspaceKey();
        if (!workspaceKey) {
            return;
        }

        await this.dispose(workspaceKey);

        if (!hookFilePattern) {
            return;
        }

        this.loading = true;
        try {
            const watchCallback = (state: WatchState, uri: Uri) => {
                switch (state) {
                    case WatchState.Change:
                        this.setHook(workspaceKey, uri.fsPath);
                        break;
                    case WatchState.Delete:
                        this.hookMap.delete(workspaceKey);
                        break;
                }

                this._onChange?.();
            };

            // init
            const [file] = await vscode.workspace.findFiles(hookFilePattern, FILE_IGNORE);
            if (file) watchCallback(WatchState.Change, file);

            const watcher = await new Watcher().watch(hookFilePattern, watchCallback);
            this.watcherMap.set(workspaceKey, watcher);
        } catch(error: any) {
            showMessage('warn', `<loadHook error> ${error?.stack}`);
        } finally {
            this.loading = false;
        }
    }

    private genContext(context: Record<string, any>) {
        return {
            ...lodash.cloneDeep(context),
            qs,
            crypto,
            uuid,
            _: lodash,
            vscode,
            extensionContext: this.extensionContext,
            babel: { ...babelParser, traverse },
            hook: Hook.getInstance(),
            i18n: I18n.getInstance(),
            convert2pinyin,
            isInJsxElement,
            isInJsxAttribute,
            writeFileByEditor,
            getICUMessageFormatAST,
            safeCall,
            asyncSafeCall,
            getConfig,
            getLoading,
            setLoading,
            showMessage,
            matchChinese
        }
    }

    private async callHook<T = any>(hookName: string, context: Record<string, any>, defaultResult: T): Promise<T> {
        try {
            const workspaceKey = getWorkspaceKey();
            if (!workspaceKey) {
                return defaultResult;
            }

            const hook = this.hookMap.get(workspaceKey);
            if (!hook || !lodash.isFunction(hook[hookName])) {
                return defaultResult;
            }
            
            return await hook[hookName](this.genContext(context));
        } catch (error: any) {
            showMessage('warn', `<call ${hookName} hook error, please check hook> ${error?.stack}`);
            return defaultResult;
        }
    }

    private async call<T = any>(name: string, context: Record<string, any>, defaultResult: T): Promise<T> {
        while (this.loading) {
            await new Promise((resolve) => setTimeout(resolve, 100));
        }

        return await this.callHook(name, context, defaultResult);
    }

    async match(context: { document: TextDocument }) {
        return await this.call<ConvertGroup[]>('match', context, []);
    }

    async convert(context: { convertGroups: ConvertGroup[], document: TextDocument }) {
        return await this.call<ConvertGroup[]>('convert', context, context.convertGroups);
    }

    async write(context: { convertGroups: ConvertGroup[], document: TextDocument }) {
        return await this.call<boolean>('write', context, false);
    }

    async collectI18n(context: { i18nFileUri: Uri }) {
        return await this.call<I18nGroup[]>('collectI18n', context, []);
    }

    async matchI18n(context: { type: MatchType, i18nGroups: I18nGroup[], document: TextDocument }) {
        return await this.call<I18nGroup[]>('matchI18n', context, context.i18nGroups);
    }
}

export default Hook;