import { workspace } from 'vscode';

import { PLUGIN_NAME } from "./constant";

import type { WorkspaceConfiguration } from "vscode";

type Config = {
    hookFilePattern: string;
    i18nFilePattern: string;
    autoMatchChinese: boolean;
    conflictPolicy: 'reuse' | 'ignore' | 'picker' | 'smart';
}

const defaultConfig: Config = {
    hookFilePattern: '.vscode/i18n-fast.hook.js',
    i18nFilePattern: '',
    autoMatchChinese: true,
    conflictPolicy: 'smart',
};

const genConfig = (config: WorkspaceConfiguration) => {
    return Object.entries(defaultConfig).reduce((pre, [key]) => {
        return { ...pre, [key]: config.get(key) };
    }, defaultConfig);
}

export const getConfig = () => {
    return genConfig(workspace.getConfiguration(PLUGIN_NAME));
}