require("dotenv").config();
const express = require("express");
const Anthropic = require("@anthropic-ai/sdk");
const { PERSONALITY_PROMPTS } = require("./lib/prompts.js");

const app = express();
app.use(express.json());
app.use(express.static("public"));

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Quick lookup map
const promptMap = {};
PERSONALITY_PROMPTS.forEach(p => { promptMap[p.type] = p; });

// Serve personality metadata to frontend
app.get("/api/personalities", (_req, res) => {
  const meta = PERSONALITY_PROMPTS.map(p => ({
    type: p.type,
    title: p.title,
    group: p.group,
    groupLabel: p.groupLabel,
    color: p.color,
    avatar: p.avatar,
  }));
  res.json(meta);
});

// Ask ONE personality — called by frontend per selected type
app.post("/api/ask-one", async (req, res) => {
  try {
    const { type, question } = req.body;
    if (!type || !question) return res.status(400).json({ error: "缺少参数" });

    const p = promptMap[type];
    if (!p) return res.status(400).json({ error: `未知类型: ${type}` });

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
    res.status(500).json({ error: "生成失败" });
  }
});

// Legacy: ask all 16 at once
app.post("/api/ask", async (req, res) => {
  try {
    const { question } = req.body;
    if (!question) return res.status(400).json({ error: "请提供一个问题" });

    const promises = PERSONALITY_PROMPTS.map(p =>
      anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 350,
        temperature: 0.95,
        thinking: { type: "disabled" },
        system: p.systemPrompt,
        messages: [{ role: "user", content: `请以${p.type}（${p.title}）的身份回答以下问题。用中文回答，字数在80-150字之间。\n\n问题：${question}` }],
      })
      .then(msg => {
        const textBlock = msg.content.find(b => b.type === "text");
        const text = textBlock?.text?.trim();
        if (!text) throw new Error(`No text for ${p.type}`);
        return { type: p.type, response: text };
      })
    );

    const results = await Promise.allSettled(promises);

    const responses = results.map((r, i) => {
      if (r.status === "fulfilled") return r.value;
      console.error(`Failed for ${PERSONALITY_PROMPTS[i].type}:`, r.reason?.message);
      return { type: PERSONALITY_PROMPTS[i].type, response: "（思考中……请稍后再试）" };
    });

    res.json({ responses, question });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "生成回复时出错，请稍后再试" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`MBTI AI running at http://localhost:${PORT}`));
