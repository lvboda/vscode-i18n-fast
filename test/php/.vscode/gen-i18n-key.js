const { OpenAI } = require('openai');

const openai = new OpenAI({
    apiKey: '', // <- your api key
    baseURL: 'https://api.deepseek.com',
});

const examples = [
    {
        path: 'application/third_party/language/chinese/erp_lang.php',
        map: {
            'com_pau_warehouse_inventory_new_stock': '新库存总数',
            'com_pau_warehouse_inventory_sold_new_stock': '新可售',
            'com_pau_warehouse_inventory_order_deliver': '订单标发',
            'com_pau_warehouse_inventory_stock_change': '可售库存变动记录',
            'com_package_can_print': '全部到齐, 可以打包',
            'com_package_pick_item': '已到货, 补货拣货',
            'com_package_print_paper': '打印面单',
            'com_package_print_package_tag': '打印包裹标签',
            'com_package_reprint_paper': '已打印，重新打印面单',
            'com_package_scan_error1': '货品({0})不属于当前包裹, 请扫描正确的货品',
            'com_crm_customer_message': '买家消息',
            'com_crm_platform_message': '平台消息',
            'com_crm_customer_platform_message': '买家、平台消息',
            'com_crm_customer_platform_message_chose': '选择消息平台',
            'com_crm_reply_message': '回复消息',
            'com_wfs_ple_select_category': '请先选择转换类目',
            'com_wfs_async_listing_attr_tip': '系统将自动为您从Listing页面获取品牌、产品属性、长宽高重(仅限酋长刊登的Listing)等信息，未能成功获取的，可自行填写',
            'com_wfs_sync_stock': '同步WFS库存',
            'com_wfs_sync_finish': '同步完成',
            'com_walmart_lag_time': '履约时间',
            'com_product_safety_information_pictograms': '象形图',
            'com_product_safety_information_statements': '安全声明',
            'com_product_safety_information_additional_information': '附加信息',
            'com_product_safety_information_pictograms_placeholder': '请输入象形图',
            'com_product_safety_information_statements_placeholder': '请输入安全声明',
        },
    },
    {
        path: 'application/third_party/language/chinese/common_lang.php',
        map: {
            'com_yes': '是',
            'com_no': '否',
            'com_back': '返回',
            'com_sure': '确定',
            'com_cancel': '取消',
            'com_create': '创建',
            'com_if': '如果',
            'com_delete': '删除',
            'com_save': '保存',
            'com_disable': '禁用',
            'com_enable': '启用',
            'com_edit': '编辑',
            'com_perfect': '完善',
            'com_preview': '预览',
            'com_title': '标题',
            'com_close': '关闭',
        },
    },
];

/**
 * @param {{text: string, path: string}[]} inputs
 * @returns {Promise<{originalText: string, i18nKey: string, isCommon: boolean}[]>}
 */
const genI18nKey = async (inputs) => {
    const systemPrompt = `You are an expert in generating i18n keys. Follow these instructions strictly:

1. **Input Format**:
   An array of objects, each containing:
   - text: The original text requiring an i18n key.
   - path: The file path where the text appears.

2. **Output Format**:
   Return a JSON object with a single key: \`result\`, each containing:
   - originalText: The original input text.
   - i18nKey: The generated i18n key.
   - isCommon: Whether the text is a generic text.
    -- Set to true only if the text is generic.
    -- Usually, this should be false.
    -- Refer to \`common_lang.php\` for examples.

3. **i18n Key Rules**:
   - Structure: \`com_[main module (optional)]_[sub module (optional)]_[semantic content]\`.
   - Extract module names from file paths when relevant, but do not force matches.
   - Prefer nouns for semantic content.
   - Separate multiple words with underscores (_).
   - Keep it concise.

5. **Response Requirements**:
   - Maintain the same input order in the output.
   - Ensure each input has a corresponding output.
   - You must return a **valid JSON string**, without extra text, explanations, or code blocks.`;

    const userPrompt = `### Input:
${JSON.stringify(inputs, null, 2)}

### Reference Examples:
${examples.map(e => `[File] ${e.path}\n[Keys]\n${Object.entries(e.map).map(([k, v]) => `${k} = ${v}`).join('\n')}`).join('\n\n')}
`;

    try {
        const completion = await openai.chat.completions.create({
            model: "deepseek-chat",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            temperature: 0.2,
            response_format: { type: 'json_object' }
        });

        const { result } = JSON.parse(completion.choices[0].message.content);

        if (inputs.some(({ text }, index) => !result[index].originalText === text)) throw new Error('generate structure error');

        return result;
    } catch (error) {
        console.error(error, 'genI18nKey error');
        return [];
    }
};

module.exports = genI18nKey;
