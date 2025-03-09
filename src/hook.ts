import * as vscode from 'vscode';
import * as lodash from 'lodash';
import * as qs from 'qs';
import * as safeEval from 'safe-eval';
import * as crypto from 'crypto-js';
import * as uuid from 'uuid';
import * as prettier from 'prettier';

import { showMessage, showStatusBar, hideStatusBar } from './tips';
import { PLUGIN_NAME } from './constant';
import { convert2pinyin, isInJsxElement, isInJsxAttribute, writeFileByEditor, getICUMessageFormatAST, safeCall, asyncSafeCall } from './utils';

import type { TextDocument, Uri, TextEditor, GlobPattern, WorkspaceConfiguration } from 'vscode'
import type { ConvertGroup, I18nGroup } from './types';

type Config = {
    hookFilePattern: string;
    i18nFilePattern: string;
    autoMatchChinese: boolean;
    conflictPolicy: 'reuse' | 'ignore' | 'picker' | 'smart';
    match: string;
    convert: string;
    write: string;
    i18nGroups: string;
}

const defaultConfig: Config = {
    hookFilePattern: 'i18n-fast.hook.js',
    i18nFilePattern: 'locales/zh-CN/**/*.js',
    autoMatchChinese: true,
    conflictPolicy: 'smart',
    match: '',
    convert: '',
    write: '',
    i18nGroups: '',
};

const genConfig = (config: WorkspaceConfiguration) => {
    return Object.entries(defaultConfig).reduce((pre, [key]) => {
        return { ...pre, [key]: config.get(key) };
    }, defaultConfig);
}

const getConfig = () => {
    return genConfig(vscode.workspace.getConfiguration(PLUGIN_NAME));
}

class Hook {
    private hook = {} as Record<string, (context: Record<string, any>) => any>;
    private loading = false;
    private static instance: Hook;

    static getInstance(): Hook {
        if (!Hook.instance) Hook.instance = new Hook;
        return Hook.instance;
    }

    async load() {
        this.loading = true;
        try {
            const [file] = await vscode.workspace.findFiles(await this.hookFilePattern(), '{**/node_modules/**, **/.git/**, **/@types/**, **/.vscode/**, **.d.ts, **/.history/**}');
            if (!file) return;
    
            // 删除 require 缓存
            delete require.cache[require.resolve(file.fsPath)];
            this.hook = require(file.fsPath);
        } catch(error) {
            showMessage('warn', `<loadHook error> ${error}`);
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
            prettier,
            hook: this,
            convert2pinyin,
            isInJsxElement,
            isInJsxAttribute,
            writeFileByEditor,
            getICUMessageFormatAST,
            safeCall,
            asyncSafeCall,
            showStatusBar,
            hideStatusBar,
        }
    }

    private callConfig<T = any,>(configName: string, context: Record<string, any>, defaultResult: T): T {
        try {
            const config = getConfig();
            return safeEval<T>(config[configName as keyof typeof config] as string, this.genContext(context));
        } catch (error) {
            showMessage('warn', `<callConfig ${configName} error, please check config> ${error}`);
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
            if (!lodash.isFunction(this.hook[name])) return this.hook[name];

            return await this.callHook(name, context, defaultResult);
        }

        return this.callConfig(name, context, defaultResult);
    }

    async hookFilePattern() {
        return await this.call<string | GlobPattern>('hookFilePattern', {}, getConfig().hookFilePattern);
    }

    async i18nFilePattern() {
        return await this.call<string | GlobPattern>('i18nFilePattern', {}, getConfig().i18nFilePattern);
    }

    async autoMatchChinese() {
        return await this.call<boolean>('autoMatchChinese', {}, getConfig().autoMatchChinese);
    }

    async conflictPolicy() {
        return await this.call<string>('conflictPolicy', {}, getConfig().conflictPolicy);
    }

    async match(context: { documentText: string }) {
        return await this.call<ConvertGroup[]>('match', context, []);
    }

    async convert(context: { convertGroups: ConvertGroup[], document: TextDocument }) {
        return await this.call<ConvertGroup[]>('convert', context, context.convertGroups);
    }

    async write(context: { convertGroups: ConvertGroup[], editor: TextEditor, document: TextDocument }) {
        return await this.call<boolean>('write', context, false);
    }

    async i18nGroups(context: { i18nFileUri: Uri }) {
        return await this.call<I18nGroup[]>('i18nGroups', context, []);
    }
}

export default Hook;