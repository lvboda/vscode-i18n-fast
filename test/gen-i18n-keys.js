const { OpenAI } = require('openai');

const openai = new OpenAI({
    apiKey: 'sk-f97325f50afb4ab3a374a9e6cd9502c3',
    baseURL: 'https://api.deepseek.com',
});

const examples = [
    {
        path: 'app/share/locales/zh-CN/accountAuth.js',
        map: {
            'app.account.auth.current-account': '当前账号',
            'app.account.auth.pf-auth-fmt': '{platform}账号授权',
            'app.account.auth.step.next': '下一步',
            'app.account.auth.operator-step': '操作步骤',
            'app.account.auth.click-me-to-auth': '点此授权',
            'app.account': '账号',
        },
    },
    {
        path: 'app/share/locales/zh-CN/report/buybox.js',
        map: {
            'app.report.buybox.winner': 'Buy Box拥有者',
            'app.report.buybox.seller.id': '卖家ID',
            'app.report.buybox.followers.watch': '跟卖调价',
            'app.report.buybox.no.followers': '无跟卖',
            'app.report.buybox.competitor.quantity': '竞争对手数',
            'app.report.buybox.competitor.detail': '竞争对手明细',
            'app.report.buybox.competitor.quantity.7day': '7日内竞争对手数',
            'app.report.buybox.be.followed.shop': '被跟卖店铺',
            'app.report.buybox.filter.self.account': '过滤自己跟卖自己的账号',
        },
    },
    {
        path: 'app/share/locales/zh-CN/report/listing.js',
        map: {
            'app.report.listing.com.applied': '已应用',
            'app.report.listing.dynamic.rate': '动态费率',
            'app.report.listing.predict.ads.fee': '预计广告费用',
            'app.report.listing.wait.ebay.handle': '等待eBay处理',
        },
    },
];

/**
 * @param {{text: string, path: string}[]} inputs 
 * @param {string[]} i18nFiles 
 * @returns {Promise<{originalText: string, i18nKey: string, path: string, confidence: number}[]>}
 */
const genI18nKey = async (inputs, i18nFiles) => {
    const systemPrompt = `You are an expert in generating i18n keys. Follow these instructions strictly:

1. **Input Format**:  
   An array of objects, each containing:  
   - text: The original text requiring an i18n key.  
   - path: The file path where the text appears.  

2. **Output Format**:  
   Return a JSON object with a single key: \`result\`, each containing:  
   - originalText: The original input text.  
   - i18nKey: The generated i18n key.  
   - path: The best-matching i18n file from the provided list (or undefined if no match is found).  

3. **i18n Key Rules**:  
   - Structure: \`app.[main module (optional)].[sub module (optional)].[semantic content]\`.  
   - Extract module names from file paths when relevant, but do not force matches.  
   - Prefer nouns for semantic content.  
   - Use lowercase and hyphens for multi-word keys.  
   - Keep it concise (preferably under 15 characters).  

4. **File Matching Rules**:  
   - Match the most relevant functional module.  
   - Prioritize files in the same directory hierarchy.  
   - Only use provided file names—do not create new ones.  

5. **Response Requirements**:  
   - Maintain the same input order in the output.  
   - Ensure each input has a corresponding output.  
   - **Return JSON format strictly.**`;

    const userPrompt = `### Input:
${JSON.stringify(inputs, null, 2)}

### Reference Examples:
${examples.map(e => `[File] ${e.path}\n[Keys]\n${Object.entries(e.map).map(([k, v]) => `${k} = ${v}`).join('\n')}`).join('\n\n')}

### Available i18n Files:
${i18nFiles.join('\n')}
`;

    try {
        const completion = await openai.chat.completions.create({
            model: "deepseek-chat",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            temperature: 0.5,
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
