import * as vscode from 'vscode';
import * as lodash from 'lodash';
import * as qs from 'qs';
import * as crypto from 'crypto-js';
import * as uuid from 'uuid';
import * as babelParser from '@babel/parser';
import traverse from '@babel/traverse';

import { getConfig } from './config';
import { showMessage } from './tips';
import { FILE_IGNORE } from './constant';
import Watcher, { WATCH_STATE } from './watcher';
import { convert2pinyin, isInJsxElement, isInJsxAttribute, writeFileByEditor, getAST, getICUMessageFormatAST, safeCall, asyncSafeCall, getWorkspaceKey, setLoading } from './utils';

import type { TextDocument, Uri } from 'vscode'
import type { ConvertGroup, I18nGroup } from './types';
import type I18n from './i18n';

type WorkspaceHook = Map<string, Record<string, (context: Record<string, any>) => any>>;

class Hook {
    private hookMap: WorkspaceHook = new Map();
    private watcherMap: Map<string, Watcher> = new Map();
    private loading = false;
    private static instance: Hook;

    static getInstance(): Hook {
        if (!Hook.instance) Hook.instance = new Hook;
        return Hook.instance;
    }

    private disposeMap(workspaceKey: string) {
        this.hookMap.delete(workspaceKey);
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

    setHook(workspaceKey: string, path: string) {
        // 删除 require 缓存
        delete require.cache[require.resolve(path)];
        this.hookMap.set(workspaceKey, require(path));
    }

    async init(i18n: I18n) {
        return await this.reload(i18n, getConfig().hookFilePattern);
    }

    async reload(i18n: I18n, i18nFilePattern?: string) {
        const workspaceKey = getWorkspaceKey();
        if (!workspaceKey) return;
        this.dispose(workspaceKey);
        if (!i18nFilePattern) return;

        this.loading = true;
        try {
            const [file] = await vscode.workspace.findFiles(i18nFilePattern, FILE_IGNORE);
            if (!file) {
                this.hookMap.delete(workspaceKey);
                return;
            }
    
            this.setHook(workspaceKey, file.fsPath);

            this.watcherMap.set(workspaceKey, new Watcher(i18nFilePattern).on(async (state, uri) => {
                switch (state) {
                    case WATCH_STATE.CHANGE:
                        this.setHook(workspaceKey, uri.fsPath);
                        break;
                    case WATCH_STATE.DELETE:
                        this.hookMap.delete(workspaceKey);
                        break;
                }

                await i18n.reload(this, i18nFilePattern);
            }));
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
            hook: this,
            babel: { ...babelParser, traverse },
            convert2pinyin,
            isInJsxElement,
            isInJsxAttribute,
            writeFileByEditor,
            getAST,
            getICUMessageFormatAST,
            safeCall,
            asyncSafeCall,
            getConfig,
            setLoading,
            showMessage,
        }
    }

    private async callHook<T = any>(hookName: string, context: Record<string, any>, defaultResult: T): Promise<T> {
        try {
            const workspaceKey = getWorkspaceKey();
            if (!workspaceKey) return defaultResult;
            const hook = this.hookMap.get(workspaceKey);
            if (!hook || !lodash.isFunction(hook[hookName])) return defaultResult;
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

    async matchI18n(context: { i18nFileUri: Uri }) {
        return await this.call<I18nGroup[]>('matchI18n', context, []);
    }
}

export default Hook;