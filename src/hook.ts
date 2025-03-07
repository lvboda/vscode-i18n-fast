import { workspace } from 'vscode';
import * as lodash from 'lodash';
import * as qs from 'qs';
import * as safeEval from 'safe-eval';
import * as crypto from 'crypto-js';

import { showMessage } from './tips';
import { getConfig } from './config';
import { convert2pinyin, isInJsxElement, isInJsxAttribute, writeFileByEditor, getICUMessageFormatAST, safeCall, asyncSafeCall } from './utils';

import type { TextDocument, Uri } from 'vscode'
import type { ConvertGroup, I18nGroup } from './types';

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
            const { hookFilePattern } = getConfig();
            const [file] = await workspace.findFiles(hookFilePattern, '{**/node_modules/**, **/.git/**, **/@types/**, **/.vscode/**, **.d.ts, **/.history/**}');
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
            _: lodash,
            workspace,
            convert2pinyin,
            isInJsxElement,
            isInJsxAttribute,
            writeFileByEditor,
            getICUMessageFormatAST,
            safeCall,
            asyncSafeCall,
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
        return await this.call<ConvertGroup[]>('match', context, []);
    }

    async convert(context: { convertGroups: ConvertGroup[], document: TextDocument }) {
        return await this.call<ConvertGroup[]>('convert', context, context.convertGroups);
    }

    async write(context: { convertGroups: ConvertGroup[], document: TextDocument }) {
        return await this.call<boolean>('write', context, false);
    }

    async i18nGroups(context: { i18nFileUri: Uri }) {
        return await this.call<I18nGroup[]>('i18nGroups', context, []);
    }
}

export default Hook;