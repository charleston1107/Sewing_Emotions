const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "deepseek/deepseek-v3.2-exp";

async function callOpenRouterEmotionChat({ apiKey, userMessage, history = [], character = {} }) {
  const messages = [
    {
      role: "system",
      content: buildEmotionSystemPrompt(character)
    },
    ...history.slice(-10).map((message) => ({
      role: message.role === "assistant" ? "assistant" : "user",
      content: String(message.content || "")
    })),
    {
      role: "user",
      content: String(userMessage || "")
    }
  ];

  const apiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.OPENROUTER_SITE_URL || "http://localhost:8000",
      "X-Title": process.env.OPENROUTER_APP_NAME || "Sewing Emotions"
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages,
      temperature: 0.85,
      max_tokens: 260
    })
  });

  const json = await apiResponse.json().catch(() => ({}));

  if (!apiResponse.ok) {
    const message = json.error?.message || `OpenRouter API request failed with status ${apiResponse.status}`;
    const error = new Error(message);
    error.status = apiResponse.status;
    throw error;
  }

  const reply = json.choices?.[0]?.message?.content?.trim();
  if (!reply) {
    throw new Error("OpenRouter response did not include a reply.");
  }

  return { reply };
}

function buildEmotionSystemPrompt(character) {
  const userInputs = Array.isArray(character.userInputs) ? character.userInputs.filter(Boolean) : [];
  const priorDetails = userInputs.length ? userInputs.map((input, index) => `${index + 1}. ${input}`).join("\n") : "No user details yet.";
  const inputCount = userInputs.length;
  let nextMove = "Ask what emotion you are and invite the user to describe how they feel.";

  if (inputCount === 1) {
    nextMove = "The user just answered the opening question. Ask exactly one gentle follow-up question about their emotion.";
  } else if (inputCount === 2) {
    nextMove = "Ask about the specific event or situation that caused this emotion, unless the user already clearly explained it.";
  } else if (inputCount === 3) {
    nextMove = "Ask how this emotion feels in the user's body.";
  } else if (inputCount > 3) {
    nextMove = "Continue as this emotion character. Sometimes reference one specific concrete detail from the known user details.";
  }

  return [
    "You are an emotion character made from the user's plushie design.",
    "Your job is to gently talk with the user as the living voice of their current emotion.",
    "Use a warm, expressive, emotionally attuned style. Adjust your tone to match the user's language, intensity, and mood.",
    "Do not sound clinical. Do not diagnose. Do not give medical advice. Be curious, validating, and specific.",
    "Keep each reply concise: 1-4 short sentences.",
    "",
    `Current conversation move: ${nextMove}`,
    "",
    "Known user details for this character:",
    priorDetails
  ].join("\n");
}

module.exports = {
  callOpenRouterEmotionChat
};
