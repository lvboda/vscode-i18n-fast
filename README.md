command:
- i18n-fast.convert
1. 匹配文本: 选中 > 当前文件的自定义匹配(hook.match) & 当前文件的中文匹配
2. 解析文本中的自定义参数(hook.customParam)
3. 生成i18nKey(hook.i18nKey)
4. 生成替换文本(hook.codeOverwrite)
5. 获取i18n文件(hook.i18nFilePath)
6. 替换i18n文件(hook.i18nFileOverwrite)
7. 替换代码文件

- i18n-fast.paste 获取剪切板文本 调用 convert 得到结果贴到光标处
- i18n-fast.get-selected-files 多文件 convert

问题：
1. 统一项目中的 i18nKey 命名规范
如果内容匹配到一个 -> 直接使用
如果匹配到多个 -> 

2. value 重复但 key 不重复
fuzzysearch
弹面板选
1. key 重复但 value 不重复
fuzzysearch
弹面板选

1. ai 能做什么

2. 还有哪些需要做的
key 旁边显示 i18 内容

