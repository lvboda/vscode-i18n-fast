import { workspace } from 'vscode';
import * as lodash from 'lodash';
import * as qs from 'qs';
import * as safeEval from 'safe-eval';
import * as crypto from 'crypto-js';
import * as fg from 'fast-glob';

import { showMessage } from './tips';
import { convert2pinyin } from './utils';
import { getConfig } from './config';

import type { TextEditor } from 'vscode';

class Hook {
    private hook = {} as Record<string, (context: Record<string, any>) => any>;
    private loading = false;
    private static instance: Hook;

    static getInstance(): Hook {
        if (!Hook.instance) Hook.instance = new Hook;
        return Hook.instance;
    }

    constructor() {
        this.init();
    }

    private async init() {
        await this.loadHook();
        await this.watchHook();
    }

    private async loadHook() {
        this.loading = true;
        try {
            const { hookFilePath } = getConfig();
            const [file] = await workspace.findFiles(`**${hookFilePath}`, `{**/node_modules/**, **/.git/**, **/@types/**, **/.vscode/**, **.d.ts, **/.history/**}`);
            if (!file) return;
    
            // 删除 require 缓存
            delete require.cache[require.resolve(file.path)];
            this.hook = require(file.path);
        } catch(error) {
            showMessage('warn', `<loadHook error> ${error}`);
        } finally {
            this.loading = false;
        }
    }

    private async watchHook() {
        const { hookFilePath } = getConfig();
        const watcher = workspace.createFileSystemWatcher(`**${hookFilePath}`);
        // TODO watcher.onDidChange(this.loadHook); 这样写的 this 问题记录一下
        watcher.onDidCreate(() => this.loadHook());
        watcher.onDidChange(() => this.loadHook());
        watcher.onDidDelete(() => this.loadHook());
    }

    private genContext(context: Record<string, any>) {
        return {
            ...context,
            workspace,
            qs,
            fg,
            crypto,
            convert2pinyin,
            _: lodash,
        }
    }

    private callExpr<T = any,>(exprName: string, context: Record<string, any>, defaultResult: T): T {
        try {
            const config = getConfig();
            return safeEval<T>(config[`${exprName}Expr` as keyof typeof config] as string, this.genContext(context));
        } catch (error) {
            showMessage('warn', `<call ${exprName} expr error, please check expr> ${error}`);
            return defaultResult;
        }
    }

    private async callHook<T = any>(hookName: string, context: Record<string, any>, defaultResult: T): Promise<T> {
        try {
            return await this.hook[hookName](this.genContext(context));
        } catch (error) {
            showMessage('warn', `<call ${hookName} hook error, please check hook> ${error}`);
            return defaultResult;
        }
    }

    private async call<T = any>(name: string, context: Record<string, any>, defaultResult: T): Promise<T> {
        while (this.loading) {
            await new Promise((resolve) => setTimeout(resolve, 100));
        }

        if (this.hook[name]) {
            return await this.callHook(name, context, defaultResult);
        }

        return this.callExpr(name, context, defaultResult);
    }

    async match(context: { documentText: string }) {
        return await this.call<MatchedGroup[]>('match', context, []);
    }

    async customParam(context: { matchedGroup: MatchedGroup }) {
        return await this.call<CustomParamGroup>('customParam', context, [context.matchedGroup[1], null]);
    }

    async i18nKey(context: { originalText: string, realText: string, customParam: CustomParam }) {
        return await this.call<string>('i18nKey', context, '');
    }

    async codeOverwrite(context: { i18nKey: string, originalText: string, realText: string, customParam: CustomParam }) {
        return await this.call<string>('codeOverwrite', context, '');
    }

    async i18nFilePath(context: { editor: TextEditor }) {
        return await this.call<string[]>('i18nFilePath', context, []);
    }

    async i18nFileOverwrite(context: { fileContent: string, matchedGroups: MatchedGroup[] }) {
        return await this.call<string>('i18nFileOverwrite', context, '');
    }
}

export default Hook;