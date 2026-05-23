const { PERSONALITY_PROMPTS } = require("../../lib/prompts.js");

exports.handler = async () => {
  const meta = PERSONALITY_PROMPTS.map(p => ({
    type: p.type,
    title: p.title,
    group: p.group,
    groupLabel: p.groupLabel,
    color: p.color,
    avatar: p.avatar,
  }));
  return {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify(meta),
  };
};
