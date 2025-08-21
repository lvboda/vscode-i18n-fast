import { window } from 'vscode';

/**
 * 装饰器类型：用于标记 i18n key 冲突的区域
 */
export const conflictDecorationType = window.createTextEditorDecorationType({
    backgroundColor: 'rgba(255, 0, 0, 0.5)'
});

/**
 * 装饰器类型：在 i18n key 后面显示对应的值（value）
 * 用于在编辑器中实时预览国际化文本的实际内容
 */
export const i18nValueDecorationType = window.createTextEditorDecorationType({
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