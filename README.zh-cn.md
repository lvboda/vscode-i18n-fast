<div align="center">

[![](./assets/logo.png "logo")](https://github.com/lvboda/vscode-i18n-fast)

# I18n Fast

[![](https://badgen.net/badge/icon/github?icon=github&label)](https://github.com/lvboda/vscode-i18n-fast)  [![](https://badgen.net/github/license/lvboda/vscode-i18n-fast?color=green)](./LICENSE)  [![](https://badgen.net/vs-marketplace/i/lvboda.vscode-i18n-fast?color=red)](https://marketplace.visualstudio.com/items?itemName=lvboda.vscode-i18n-fast)  [![](https://badgen.net/vs-marketplace/v/lvboda.vscode-i18n-fast?color=pink)](https://marketplace.visualstudio.com/items?itemName=lvboda.vscode-i18n-fast)

一个 hook 驱动的 i18n 生成插件

[**English**](./README.md) **|** **简体中文**

</div>

![demo](./assets/demo.gif)

## 写在前面

市场中现有的 i18n 插件最大的痛点在于不能覆盖所有项目的国际化需求。

以我司项目为例，需求是根据词条的语义自动生成 key，并写入到对应的 i18n 文件和代码中，这样可以使国际化项目的开发变得像普通项目一样简单。需求看似简单，但一直没找到合适的插件。

[i18n Ally](https://github.com/lokalise/i18n-ally) 更注重翻译和管理，不能自动生成 key，需要手动输入；[Du I18N](https://github.com/ctq123/du-i18n) 生成的 key 是 hash 值，不符合我的需求，也不能直接写入 i18n 文件，需要手动同步。此外，这两个插件对项目技术栈也有严格的限制，对 PHP 的支持较差。

**I18n Fast** 是一个侧重于**可定制化**的 i18n 生成插件。插件本身并未实现具体功能，而是通过 hook 机制让使用者自行实现，插件仅负责串联 hook 以使流程跑通。简单来说，它通过增加配置成本和动态执行外部代码，换取了通用性和灵活性，从而能够满足更多项目的国际化需求。

如果市场上其他 i18n 插件无法满足你的需求，并且你愿意花一点时间了解和编写 hook 文件，那么 **I18n Fast** 将是你的理想选择。

## 流程图

![](./assets/flowchart.png "flowchart")

## 功能

- 支持 i18n 回显
- 支持跳转至 i18n 定义
- 支持 i18n 冲突处理 (遇到定义过的 i18n 时)
- 支持读取剪切板文本
- 理论上支持一切你想要的功能（需自己实现）
- ~~支持匹配代码里的中文~~ https://github.com/lvboda/vscode-i18n-fast/issues/19
- ~~支持搜索 i18n~~ https://github.com/lvboda/vscode-i18n-fast/issues/1

## 配置

### 插件配置

- i18nFilePattern: i18n 文件匹配规则
- hookFilePattern: hook 文件匹配规则 默认 `.vscode/i18n-fast.hook.js`
- conflictPolicy: 遇到重复 i18n 时, 如何处理 默认 `smart`
  - reuse: 复用已有 i18n
  - ignore: 忽略重复
  - picker: 弹出选择器手动选择
  - smart: 如果匹配到一个 i18n 直接复用，匹配到多个弹出选择器手动选择
- ~~autoMatchChinese: 是否自动匹配中文 默认 `true`~~

> i18nFilePattern 一般是以项目为单位来配置的，不同项目应在各自根目录下的 `.vscode/settings.json` 中配置。

### Hook 配置

hook 配置就是通过一个 js 文件导出 hook 方法给插件端调用（调用时机可以参考[流程图](#流程图)），这个 js 文件是 commonjs 规范、支持异步（async/await）、可以 require 其他模块（项目内的其他模块或三方库），所以理论上讲可以实现任何你需要的功能。

hook 文件位置根据 [config.hookFilePattern](#插件配置) 来找，默认为 `.vscode/i18n-fast.hook.js`，可直接下载[模版文件](./example/i18n-fast.hook.template.js)到对应位置进行修改，模版文件里定义好了方法类型。

#### Context

共享给 hook 的上下文对象，作为 hook 的第一个参数传入

- [context.vscode](https://code.visualstudio.com/api/references/vscode-api)
- [context.qs](https://www.npmjs.com/package/qs)
- [context.crypto](https://www.npmjs.com/package/crypto-js)
- [context.uuid](https://www.npmjs.com/package/uuid)
- [context._](https://www.npmjs.com/package/lodash)
- [context.babel](https://babeljs.io/docs/babel-parser)
- context.hook: 当前文件导出的 hook 对象，可以在当前 hook 中调用其他 hook
- context.i18n: i18n 的存储相关实例，i18n 词条读写
- context.convert2pinyin: 基于 [tiny-pinyin](https://www.npmjs.com/package/tiny-pinyin) 封装转换中文为拼音的方法
- context.isInJsxElement: 基于 [babel](https://babeljs.io/docs/babel-parser)  封装判断是否在 JSX 元素内的方法
- context.isInJsxAttribute: 基于 [babel](https://babeljs.io/docs/babel-parser)  封装判断是否在 JSX 属性内的方法
- context.writeFileByEditor: 通过编辑器写入文件
- context.getAST: 基于 [babel](https://babeljs.io/docs/babel-parser) 获取 AST 的方法
- context.getICUMessageFormatAST: 基于 [formatjs/icu-messageformat-parser](https://www.npmjs.com/package/@formatjs/icu-messageformat-parser) 获取 ICU MessageFormat AST 的方法
- context.safeCall: 吞掉函数执行抛出的错误
- context.asyncSafeCall: 同上异步函数
- context.getConfig: 获取[插件配置](#插件配置)
- context.setLoading: 设置全局 loading 状态
- context.showMessage: vscode 弹窗简化版

以上列出的都是公共的 context 属性，也就是每个 hook 都能拿到，还有一些没有列出来的比如 `context.document`、`context.convertGroups`、`context.i18nFileUri` 等，这些是 hook 执行时特有上下文，具体类型请参考[模版文件](./example/i18n-fast.hook.template.js)中的定义。

#### hook.match

在命令最开始执行，用于自定义匹配当前文档中的文本，返回匹配后的结果。但需要注意优先级问题，可参考[流程图](#流程图)的 match 阶段，如果调用 [i18n-fast.paste](#i18n-fastpaste) 命令或者有选中的文本，`hook.match` 将不会执行。

在[这个例子](https://github.com/lvboda/vscode-i18n-fast/issues/21) 中，`hook.match` 用于匹配当前文档中所有`#(...)`包裹的文本。

### hook.convert

> hook 文件的代码修改后立即生效，不需要重启插件或 vscode

## 命令

### i18n-fast.convert

快捷键：`cmd + option + c` (macOS) / `ctrl + alt + c` (Windows/Linux)

执行流程：
1. 匹配文本（优先级：参数文本 > 光标选中文本 > hook.match + ~~匹配中文~~）
2. 转换数据 (hook.convert)
3. 写入文件 (hook.write)

### i18n-fast.paste

快捷键：`cmd + option + v` (macOS) / `ctrl + alt + v` (Windows/Linux)

执行流程：
1. 获取剪切板文本
2. 调用[`i18n-fast.convert`](#i18n-fastconvert)，入参为剪切板文本

### i18n-fast.undo

快捷键：`cmd + option + z` (macOS) / `ctrl + alt + z` (Windows/Linux)

撤销此次所有文件的写入操作

> 这个命令目前还有些问题，不稳定 https://github.com/lvboda/vscode-i18n-fast/issues/4

## 安装

在 vscode 扩展市场搜索 **I18n Fast**，点击 Install 进行安装，或者在 [releases](https://github.com/lvboda/vscode-i18n-fast/releases) 中下载对应版本，在 vscode 中`ctrl + shift + p` 呼出命令面板，输入 `Install from VSIX`，选择下载的文件即可安装。

## 使用

## 许可

[MIT](./LICENSE)

Copyright (c) 2025 - Boda Lü