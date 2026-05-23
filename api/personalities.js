const { PERSONALITY_PROMPTS } = require("../lib/prompts.js");

module.exports = function handler(_req, res) {
  const meta = PERSONALITY_PROMPTS.map(p => ({
    type: p.type,
    title: p.title,
    group: p.group,
    groupLabel: p.groupLabel,
    color: p.color,
    avatar: p.avatar,
  }));
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.json(meta);
};
