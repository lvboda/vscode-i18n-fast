import { workspace } from 'vscode';

import { PLUGIN_NAME } from "./constant";
import { ConflictPolicy } from './types/enums';

import type { WorkspaceConfiguration } from "vscode";
import type { Config } from './types';


const defaultConfig: Config = {
    hookFilePattern: '.vscode/i18n-fast.hook.js',
    i18nFilePattern: '',
    autoMatchChinese: true,
    conflictPolicy: ConflictPolicy.Smart,
};

const genConfig = (config: WorkspaceConfiguration): Config => {
    return Object.entries(defaultConfig).reduce((pre, [key]) => {
        return { ...pre, [key]: config.get(key) };
    }, defaultConfig);
}

export const getConfig = (): Config => {
    return genConfig(workspace.getConfiguration(PLUGIN_NAME));
}