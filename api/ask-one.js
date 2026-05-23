const Anthropic = require("@anthropic-ai/sdk");
const { PERSONALITY_PROMPTS } = require("../lib/prompts.js");

const promptMap = {};
PERSONALITY_PROMPTS.forEach(p => { promptMap[p.type] = p; });

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(204).end();
  }

  try {
    const { type, question } = req.body || {};
    if (!type || !question) return res.status(400).json({ error: "缺少参数" });

    const p = promptMap[type];
    if (!p) return res.status(400).json({ error: `未知类型: ${type}` });

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

    res.json({ type, response: text });
  } catch (err) {
    console.error(`Failed for ${req.body?.type}:`, err.message);
    res.status(500).json({ error: "生成失败", type: req.body?.type });
  }
};
