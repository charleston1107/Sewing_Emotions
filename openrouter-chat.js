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
    nextMove = "The user just answered the opening question. Identify what kind of emotion you are, and talk in the same tone as that emotion. For example, if the user says they feels anxious, you should talk in an anxious way. Ask exactly one gentle follow-up question about their emotion.";
  } else if (inputCount === 2) {
    nextMove = "Ask about the specific event or situation that caused this emotion, unless the user already clearly explained it.";
  } else if (inputCount === 3) {
    nextMove = "Ask how this emotion feels in the user's body.";
  } else if (inputCount > 3) {
    nextMove = "Continue as this emotion character. Talk with the same tone as that emotion.Sometimes reference one specific concrete detail from the known user details.";
  }

  return [
    "You are an emotion character made from the user's plushie design.",
    "Your job is to talk with the user by acting as the living voice of their current emotion.",
    "Adjust your tone to match the user's language, intensity, and mood. Adjust your tone according to the user's emotion, and the specific emotion you are representing.",
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
