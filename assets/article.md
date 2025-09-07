# I18n Fast：一个彻底解决了国际化项目痛点的 VSCode 插件

## 前言

最近把公司内部在用的国际化插件（[I18n Fast](https://github.com/lvboda/vscode-i18n-fast)）开源了。这是一个基于 Hook 机制**可动态扩展**的插件，理论上可以**支持任何技术栈，满足任何复杂需求**。

如果你：

- 项目技术栈比较特殊，没有可用的 i18n 插件
- 有复杂的国际化需求无法满足
- 想要完全掌控国际化流程
- 愿意花时间了解并写一些 js 代码

不妨试试 [I18n Fast](https://github.com/lvboda/vscode-i18n-fast)，也许它就是你要找的工具。

## 背景

去年在对公司项目进行国际化改造时，我发现了一个普遍存在的问题：**现有的国际化插件难以满足复杂项目的需求**。

### 国际化开发场景

**场景一：添加文案的繁琐流程**

1. 复制文本 ”确认删除吗？”
2. 想个 key 名字... “confirm.delete”？“dialog.confirmDelete”？
3. 打开 zh.json，添加 `"confirm.delete": "确认删除吗？"`
4. 打开 en.json，添加 `"confirm.delete": "Confirm delete?"`  
5. 回到代码，改成 `formatMessage({ id: 'confirm.delete' })`
6. 哦对了，还要检查是不是已经有重复的 key 了...

一个简单的文案，3 分钟就过去了。

**场景二：老项目国际化改造**
```html
<div>欢迎使用系统</div>
<span>用户名不能为空</span>
// ... 还有几百个
```
手动改？下班之前能改完算我输。

**场景三：团队协作的混乱**
- A定义了 `user.name.required`
- B不知道，又定义了 `form.username.empty`
- 结果同一个文案，两个 key，维护的时候傻眼了

### 我的国际化需求

1. 添加一个 i18n 文案要完全自动化
2. 技术栈高适配性（因为公司有一些老项目要支持）
3. 去重逻辑，避免重复 i18n 出现
4. i18n 的 key 要做语义化处理，需要 AI 生成（因为公司有一个翻译系统，需要语义化的 key 来协助翻译）

### 现有插件的局限性

尝试了几个市场中比较流行的 i18n 插件：

| 插件 | 优点 | 问题 |
|------|------|------|
| [I18n Ally](https://marketplace.visualstudio.com/items?itemName=lokalise.i18n-ally) | 可视化翻译管理、多框架支持、完善文档 | 需手动输入 key、团队 key 风格不统一、不支持特殊技术栈 |
| [Du I18N](https://marketplace.visualstudio.com/items?itemName=DewuTeam.du-i18n) | 自动扫描中文、可自动生成 key | Hash key 无语义、无法直接写入文件、不支持特殊技术栈 |
| [Sherlock](https://marketplace.visualstudio.com/items?itemName=inlang.vs-code-extension) | 实时预览翻译、支持 i18next、代码内编辑 | 配置复杂、需要 inlang 项目文件、功能相对固定 |

### I18n Fast 核心理念

经过反复思考，我意识到问题的根源在于：**每个项目的国际化方案都不一样，但插件却试图用一套规则覆盖所有场景**。

那为什么不反过来，让使用者自己定义规则呢？

于是 [I18n Fast](https://github.com/lvboda/vscode-i18n-fast) 诞生了，这是一个侧重于**可定制化**的 i18n 管理插件。插件本身并未实现具体功能，而是通过 Hook 机制让使用者自行实现，插件负责把这些 Hook 串联起来跑通流程。

简单来说，它通过增加配置成本和动态执行外部代码，换取了通用性和灵活性，从而能够满足更多项目的国际化需求。

**工作流**

匹配 → 转换 → 写入 → 收集 → 展示

**流程图**

![](https://i.vgy.me/LvIv6G.png "Flowchart")

## 使用

完整 demo 请参考：https://github.com/lvboda/vscode-i18n-fast-simple-demo

安装好插件直接把项目拉下来就可以看到效果。

### 第一步：安装插件

```bash
# VSCode 扩展商店搜索 ”I18n Fast”
# 或命令行安装
code --install-extension lvboda.vscode-i18n-fast
```

![](https://i.vgy.me/7KC944.png "Install")

### 第二步：基础配置

在项目目录下创建`.vscode/settings.json`（已有则忽略）

写入配置：

```json
// .vscode/settings.json
{
  "i18n-fast.i18nFilePattern": "src/locales/**/*.{js,json}" // i18n 文件匹配规则
}
```

### 第三步：编写 Hook

以最简单的 React + react-intl 项目为例

在项目目录下创建`.vscode/i18n-fast.hook.js`

Copy [Hook 模版](https://github.com/lvboda/vscode-i18n-fast/blob/main/example/i18n-fast.hook.template.js)粘贴到该文件

开始写 Hook：

> 这里简化了类型部分，实际的模版中会有 jsdoc 做类型提示

```javascript
// .vscode/i18n-fast.hook.js
module.exports = {
    /**
     * 匹配：找出需要国际化的文本返回固定格式
     * 可以不配置，默认有匹配中文和选中匹配的机制
     */
    match(context) {
        return [];
    },

    /**
     * 转换：拿到匹配到的文本数组，按你的需求进行转换
     * 可以不配置，这里的逻辑可以放在 Write Hook 里
     */
    convert(context) {
        const { convertGroups, document, _, uuid, safeCall, isInJsxElement, isInJsxAttribute } = context;

        // 获取当前文档
        const documentText = document.getText();
        
        // 组装成规定格式返回
        return convertGroups.map(group => {
            // 只有 type 为 new 才会新生成，type 的值根据 i18n-fast.conflictPolicy 配置+插件内部机制得来
            const i18nKey = group.type === 'new' ? `i18n_fast_key_${_.replace(uuid.v4(), /-/g, '_')}` : group.i18nKey;
            // 获取当前匹配的文本在文档中的位置
            const startIndex = document.offsetAt(group.range.start);
            const endIndex = document.offsetAt(group.range.end);
            // 判断这个位置是否在 JSX 中或在 JSX 属性中
            const inJsxOrJsxAttribute = safeCall(isInJsxElement, [documentText, startIndex, endIndex]) || safeCall(isInJsxAttribute, [documentText, startIndex, endIndex]);
            // 覆写代码文本 inJsxOrJsxAttribute 为 true 加 {} 包裹
            const overwriteText = inJsxOrJsxAttribute ? `{formatMessage({ id: '${i18nKey}' })}` : `formatMessage({ id: '${i18nKey}' })`;

            return {
                ...group,
                i18nKey: i18nKey,
                i18nValue: group.i18nValue,
                overwriteText,
            };
        });
    },

    /**
     * 写入：把你转换后的结果写入 i18n 文件和代码文件
     * 必须配置
     */
    async write(context) {
        const { convertGroups, document, writeFileByEditor, vscode, getConfig } = context;

        // 遍历 i18n 文件
        for (const fileUri of await vscode.workspace.findFiles(getConfig().i18nFilePattern)) {
            // 这里简单用文件名判断语言
            const isEn = fileUri.fsPath.endsWith('en-US.json');
            // 读 i18n 文件内容并转成 JSON 方便后续追加
            const i18nJSON = JSON.parse((await vscode.workspace.fs.readFile(fileUri)).toString());

            // 将新生成的 key value 追加进去
            convertGroups.forEach((group) => {
                // 只有 type 为 new 才新建
                if (group.type === 'new') {
                    // 这里简单模拟翻译成英文的效果
                    i18nJSON[group.i18nKey] = isEn ? `模拟翻译英文：${group.i18nValue}` : group.i18nValue;
                }
            });

            // 写入 i18n 文件
            await writeFileByEditor(fileUri, JSON.stringify(i18nJSON, null, 2), true);
        }

        // 写入代码文件
        await writeFileByEditor(document.uri, convertGroups.map(({ range, overwriteText }) => ({ range, content: overwriteText })));
    },

    /**
     * 采集 i18n：收集 i18n 做显示和去重
     * 推荐配置，不然无法回显，转换时的去重机制（i18n-fast.conflictPolicy）也需要这个 Hook 支持
     */
    async collectI18n(context) {
        const { i18nFileUri, vscode, getICUMessageFormatAST, safeCall, _ } = context;

        // 排除英文 这个案例中不用采集英文
        if (_.includes(i18nFileUri.fsPath, 'en-US.json')) {
            return [];
        }

        // 读取 i18n 文件并转为 JSON
        const i18nJSON = JSON.parse((await vscode.workspace.fs.readFile(i18nFileUri)).toString());

        // 组装成规定格式返回
        return Object.entries(i18nJSON).map(([key, value], index) => ({
            key, // i18n key
            value, // i18n value
            valueAST: safeCall(getICUMessageFormatAST, [value]), // 用于格式化显示 非必需 根据项目实际需求来
            line: index + 2, // 用于跳转至定义处 非必需 根据项目实际需求获取
        }));
    },

    /**
     * 匹配 i18n：匹配文档中的 i18n key 主要用于过滤和自定义显示逻辑
     * 可以不配置，用于对回显做特殊处理的 Hook
     */
    matchI18n(context) {
        return context.i18nGroups; // 默认全匹配
    },
};
```

> 配置和 Hook 都推荐以项目维度来配置（在项目目录下添加配置和 Hook 文件），不同项目之间会起到隔离作用

> Hook 代码或配置改动完会立即生效，不需要重启插件或编辑器

### 第四步：使用

- `cmd + option + c` (macOS) / `ctrl + alt + c` (Windows|Linux)：转换当前文件匹配到的文本|选中文本
- `cmd + option + v` (macOS) / `ctrl + alt + v` (Windows|Linux)：转换剪切板文本并粘贴
- `cmd + option + b` (macOS) / `ctrl + alt + b` (Windows|Linux)：撤销操作

**回显效果：**

- 文案后面有中文回显
- hover 上去有完整的中文
- `cmd/ctrl + click` 下钻跳转至 i18n 定义位置

![](https://i.vgy.me/7iUaIT.gif "Echo")

**选中转换：**

1. 选中需要转换的文本
2. `cmd + option + c` / `ctrl + alt + c`
3. i18n 文件自动写入，代码文件自动更新

![](https://i.vgy.me/xylZpi.gif "Select Convert")

**批量转换：**

1. 在当前文件`cmd + option + c` / `ctrl + alt + c`
2. i18n 文件自动写入，代码文件自动更新

![](https://i.vgy.me/vcgWJG.gif "Batch Convert")

**转换剪切板文本并粘贴：**

1. 复制需要转换的文本
2. 在要粘贴的位置`cmd + option + v` / `ctrl + alt + v`
3. i18n 文件自动写入，代码文件自动更新

![](https://i.vgy.me/RdcOpV.gif "Paste")

**遇到重复 i18n 时：**

- 根据`i18n-fast.conflictPolicy`配置来执行对应策略
- 图中为`smart`模式，有超过一个 i18n 定义，所以弹出选择器自行选择：要复用的 key 、忽略（重新生成）、跳过

更多`i18n-fast.conflictPolicy`可选项参考[配置](#配置)

![](https://i.vgy.me/J50sn0.gif "Repeat")

**撤销：**

- 撤销上一步的所有写入操作，i18n 文件、代码文件等
- 最大可撤销次数：10 次

![](https://i.vgy.me/IIjpJd.gif "Undo")

## 进阶

### 配置

参考文档：https://github.com/lvboda/vscode-i18n-fast?tab=readme-ov-file#plugin-configuration

### Hook Context

为了使 Hook 编写简单，每个 Hook 的 Context 都提供了丰富的工具，通过参数传递
- 完整的 [VSCode API](https://code.visualstudio.com/api/references/vscode-api)
- [lodash](https://www.lodashjs.com)、[babel](https://babel.dev)、[uuid](https://github.com/uuidjs/uuid) 等常用库
- 文件写入、消息提示等封装好的 API

参考文档：https://github.com/lvboda/vscode-i18n-fast?tab=readme-ov-file#context

### Hook 规范

- NodeJS 运行时
- 使用 CommonJS 规范
- 可以 `require` 三方模块
- 支持异步

> 基于这些，理论上可以实现任何需求

### 实际项目中的技巧

#### 自定义匹配规则

自动匹配`#()`包裹的文本，解决一些匹配中文覆盖不到的地方，比如要转换一些英文或符号

```javascript
module.exports = {
    match(context) {
        const { document } = context;

        // 从当前文档中匹配 #() 包裹的文本
        const matchedArr = document.getText().match(/(?:(['"`])#\((.+?)\)\1|#\((.+?)\))/gs) || [];

        return matchedArr
            .map((matchedText) => {
                // 提取文案
                const i18nValue = [...matchedText.matchAll(/#\((.*?)\)/gs)]?.[0]?.[1];

                if (!i18nValue) {
                    return;
                };

                return {
                    matchedText, // 完整文本
                    i18nValue // 文案
                };
            }).filter(Boolean);
    }
}
```

#### JSX 内的转换结果加`{}`包裹

在上面[编写的 Hook](#第三步编写-hook) 里，我们写了根据匹配的文本位置如果在 JSX 中或 JSX 属性中则加`{}`包裹的逻辑

这里我们扩展一下，Context 里带的 `isInJsxElement` & `isInJsxAttribute` 这两个方法都只是默认支持 js，如果遇到 ts 或者非 js 项目怎么判断呢？

以 ts 项目举例，`isInJsxElement` & `isInJsxAttribute` 的第一个参数是可以传 AST 进去的，所以这里可以自己用 babel 解析成 AST 传进去

如果是非 js|ts 项目，有类似逻辑自行实现或引入对应的三方库实现即可。

举一反三，如果有类似自动引入 `formatMessage` 的需求，也可以参考这种思路去写。

```javascript
module.exports = {
    convert(context) {
        const { convertGroups, document, _, uuid, safeCall, isInJsxElement, isInJsxAttribute, babel } = context;

        // 获取当前文档
        const documentText = document.getText();
        
        // 组装成规定格式返回
        return convertGroups.map(group => {
            // 只有 type 为 new 才新生成 type 的值根据 conflictPolicy 配置+插件内部机制得来
            const i18nKey = group.type === 'new' ? `i18n_fast_key_${_.replace(uuid.v4(), /-/g, '_')}` : group.i18nKey;
            // 获取当前匹配的文本在文档中的位置
            const startIndex = document.offsetAt(group.range.start);
            const endIndex = document.offsetAt(group.range.end);
            // 将当前代码转为 AST 语法树
            const AST = safeCall(() => babel.parse(documentText, {
                sourceType: 'module',
                plugins: ['typescript', 'jsx'],
                errorRecovery: true,
                allowImportExportEverywhere: true,
                allowReturnOutsideFunction: true,
                allowSuperOutsideMethod: true,
                allowUndeclaredExports: true,
                allowAwaitOutsideFunction: true,
            }));
            // 判断这个位置是否在 JSX 中或在 JSX 属性中
            const inJsxOrJsxAttribute = safeCall(isInJsxElement, [AST, startIndex, endIndex]) || safeCall(isInJsxAttribute, [AST, startIndex, endIndex]);
            // 覆写代码文本 inJsxOrJsxAttribute 为 true 加 {} 包裹
            const overwriteText = inJsxOrJsxAttribute ? `{formatMessage({ id: '${i18nKey}' })}` : `formatMessage({ id: '${i18nKey}' })`;

            return {
                ...group,
                i18nKey: i18nKey,
                i18nValue: group.i18nValue,
                overwriteText,
            };
        });
    },
}
```

#### 引入三方库进行翻译

在 Hook 中可以 `require` 三方模块，只要确保项目中或全局 install 了这个模块。

这个例子中，我们引入了 OpenAI SDK 来做翻译，异步操作前后可以用 Context 中提供的 setLoading、showMessage 使功能更健壮。

```javascript
const { OpenAI } = require('openai');

// 使用三方模块进行翻译，这里省略实现代码
// 在项目中或全局安装 OpenAI SDK，确保可以 require 到
const aiTranslate = async (groups) => {
    // use OpenAI...
}

module.exports = {
    async write(context) {
        const { convertGroups, document, writeFileByEditor, vscode, getConfig, setLoading, showMessage } = context;

        try {
            // 状态栏全局 loading
            setLoading(true);

            // 遍历 i18n 文件
            for (const fileUri of await vscode.workspace.findFiles(getConfig().i18nFilePattern)) {
                // 这里简单用文件名判断语言
                const isEn = fileUri.fsPath.endsWith('en-US.json');
                // 读i18n文件内容并转成 JSON 方便后续追加
                const i18nJSON = JSON.parse((await vscode.workspace.fs.readFile(fileUri)).toString());

                // 将新生成的 key value 追加进去
                // 如果是英文则调用翻译
                (isEn ? (await aiTranslate(convertGroups)) : convertGroups).forEach((group) => {
                    // 只有 type 为 new 才新建
                    if (group.type === 'new') {
                        i18nJSON[group.i18nKey] = group.i18nValue
                    }
                });

                // 写入 i18n 文件
                await writeFileByEditor(fileUri, JSON.stringify(i18nJSON, null, 2), true);
            }

            // 写入代码文件
            await writeFileByEditor(document.uri, convertGroups.map(({ range, overwriteText }) => ({ range, content: overwriteText })));
        } catch (e) {
            showMessage('error', `<genI18nKey error> ${e?.stack || e}`)
        } finally {
            setLoading(false);
        }
    }
}
```

#### 不是 app 开头的 key 不显示装饰器

解决一些不是 i18n key 的文本却被匹配到造成的”幻觉”，增加一些条件使匹配到的 i18n 更精准，相关 Issue：https://github.com/lvboda/vscode-i18n-fast/issues/3

`matchI18n` 这个 Hook 自由度比较高，可以控制装饰器、HoverMessage、跳转定义是否生效，还能自定义显示的内容和样式，可以自行探索。

```javascript
module.exports = {
    matchI18n(context) {
        const { i18nGroups, _ } = context;

        return i18nGroups.map((group) => {
            if (!_.startsWith(group.key, 'app.')) {
                group.supportType = 7 & ~1;
            }

            return group;
        });
    }
}
```

![](https://i.vgy.me/xmKouL.gif "MatchI18n Demo")

### 公司内部在用的完整 Hook

**AI 生成 i18n key（React 项目）**

Hook 示例：https://github.com/lvboda/vscode-i18n-fast/issues/21

demo：https://github.com/lvboda/vscode-i18n-fast/tree/main/test/react

**AI 生成 i18n key（PHP + Jquery 项目）**

Hook 示例：https://github.com/lvboda/vscode-i18n-fast/issues/22

demo：https://github.com/lvboda/vscode-i18n-fast/tree/main/test/php

### Hook 分享

Hook 本质上就是代码片段，所以是可以进行复用或参考的。

欢迎[提交 Issue](https://github.com/lvboda/vscode-i18n-fast/issues) 来分享你的 Hook，我会在这类 Issue 上打上 `hook-example` 标签，以供别人参考或复用。

Hook Example 列表：https://github.com/lvboda/vscode-i18n-fast/labels/hook%20example

## 思考

[I18n Fast](https://github.com/lvboda/vscode-i18n-fast) 的理念和主流的“约定优于配置”相反，我把其配置的部分“复杂化”了，所以无法像其他插件一样安装即可使用。

为什么要这么做？

因为国际化这件事，不同项目或团队之间的差异实在太大了：
- key 命名风格千差万别：驼峰、下划线、点分隔，各有偏好
- 存储方式五花八门：JSON、YAML、数据库、Properties 文件等
- 技术栈的多样性：React、Vue、Angular、原生 js 甚至是后端项目
- 各种定制化需求：引入 AI、调用接口、同步文件等等

与其做一个“看起来什么都支持但实际处处受限”的插件，不如提供一个足够灵活的机制，让使用者自行实现。

当然，灵活性是有代价的 —— 需要写 Hook。但考虑到：
- Hook 只需要写一次
- 可以复用和分享
- 完全满足需求带来的效率提升

这个代价是值得的。

## 最后

[I18n Fast](https://github.com/lvboda/vscode-i18n-fast) 已经开源：

- **GitHub**: https://github.com/lvboda/vscode-i18n-fast
- **VSCode Marketplace**: https://marketplace.visualstudio.com/items?itemName=lvboda.i18n-fast
- **Hook 模版**: https://github.com/lvboda/vscode-i18n-fast/blob/main/example/i18n-fast.hook.template.js
- **Hook 示例**: https://github.com/lvboda/vscode-i18n-fast/labels/hook%20example
- **问题反馈**: https://github.com/lvboda/vscode-i18n-fast/issues

---

欢迎 Star ⭐、提 Issue、分享你的 Hook 配置。您的每一个反馈都是我继续前进的动力！！！
