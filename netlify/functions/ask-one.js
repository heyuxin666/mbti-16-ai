const Anthropic = require("@anthropic-ai/sdk");
const { PERSONALITY_PROMPTS } = require("../../lib/prompts.js");

const promptMap = {};
PERSONALITY_PROMPTS.forEach(p => { promptMap[p.type] = p; });

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json; charset=utf-8",
  };

  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        ...headers,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    };
  }

  try {
    const { type, question } = JSON.parse(event.body || "{}");
    if (!type || !question) return { statusCode: 400, headers, body: JSON.stringify({ error: "缺少参数" }) };

    const p = promptMap[type];
    if (!p) return { statusCode: 400, headers, body: JSON.stringify({ error: `未知类型: ${type}` }) };

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 350,
      temperature: 0.95,
      thinking: { type: "disabled" },
      system: p.systemPrompt,
      messages: [{ role: "user", content: `请以${p.type}（${p.title}）的身份回答以下问题。用中文回答，字数在80-150字之间。记住：按照你系统提示中定义的人格特征来回答，展现你独特的思维方式、语言风格和价值观。\n\n问题：${question}` }],
    });

    const textBlock = msg.content.find(b => b.type === "text");
    const text = textBlock?.text?.trim();
    if (!text) throw new Error("No text in response");

    return { statusCode: 200, headers, body: JSON.stringify({ type, response: text }) };
  } catch (err) {
    console.error(`Failed:`, err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: "生成失败" }) };
  }
};
