import { window } from 'vscode';

/**
 * 装饰器类型：用于标记 i18n key 冲突的区域
 */
export const conflictDecorationType = window.createTextEditorDecorationType({
    backgroundColor: 'rgba(255, 0, 0, 0.5)'
});

/**
 * 装饰器类型：用于显示 i18n key 的翻译内容
 */
export const translationDecorationType = window.createTextEditorDecorationType({
    light: {
        after: {
            margin: '0 5px',
            color: '#838383',
            backgroundColor: '#F6F6F6',
        }
    },
    dark: {
        after: {
            margin: '0 5px',
            color: '#999999',
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
        }
    }
});