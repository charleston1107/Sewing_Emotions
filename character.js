const generatedFrame = document.querySelector(".character-generated-frame");
const designSurface = document.querySelector(".character-design-surface");
const chatBubble = document.querySelector(".character-chat-bubble p");
const inputForm = document.querySelector(".character-input-bar");
const textInput = document.querySelector(".character-text-input");
const finishButton = document.querySelector(".character-finish-button");

let character = loadCurrentCharacter();
let savingCharacter = false;

if (!Array.isArray(character.designChoices?.composition?.parts)) {
  character.designChoices = {
    ...character.designChoices,
    composition: JSON.parse(JSON.stringify(loadComposition()))
  };
  saveCurrentCharacter(character);
}

renderCharacterVisuals();
const openingReflectionPromise = prepareOpeningReflection();

if (new URLSearchParams(window.location.search).get("save") === "1") {
  window.history.replaceState({}, "", "character.html");
  openingReflectionPromise.then(finishCharacter);
}

function renderCharacterVisuals() {
  generatedFrame.innerHTML = "";

  const composition = character.designChoices?.composition || loadComposition();
  renderCharacterDesign(designSurface, composition);

  if (!character.imageUrl) {
    return;
  }

  const image = document.createElement("img");
  image.className = "character-main-image";
  image.src = character.imageUrl;
  image.alt = "Generated emotion plushie";
  generatedFrame.appendChild(image);
}

inputForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const userMessage = textInput.value.trim();
  if (!userMessage) {
    return;
  }

  textInput.value = "";
  character.userInputs.push(userMessage);
  character.messages.push({ id: crypto.randomUUID(), role: "user", content: userMessage, at: new Date().toISOString() });
  chatBubble.textContent = "I'm listening...";
  saveCurrentCharacter(character);

  try {
    const response = await fetch("/api/emotion-chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        userMessage,
        history: character.messages.slice(0, -1),
        character
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "The emotion character could not reply.");
    }

    character.messages.push({ id: crypto.randomUUID(), role: "assistant", content: data.reply, at: new Date().toISOString() });
    chatBubble.textContent = data.reply;
  } catch (error) {
    chatBubble.textContent = error.message;
  }

  saveCurrentCharacter(character);
});

finishButton.addEventListener("click", finishCharacter);

async function finishCharacter() {
  if (savingCharacter) {
    return;
  }

  try {
    savingCharacter = true;
    finishButton.disabled = true;
    finishButton.textContent = "Saving...";

    const result = await saveCharacterToAccount(character);

    if (result.requiresLogin) {
      const returnTo = encodeURIComponent("/character.html?save=1");
      window.location.href = `account.html?mode=signup&returnTo=${returnTo}`;
      return;
    }

    window.location.href = "emo_library.html";
  } catch (error) {
    chatBubble.textContent = `I am still safe in this browser, but I could not save to your account yet. ${error.message}`;
    savingCharacter = false;
    finishButton.disabled = false;
    finishButton.textContent = "Finish";
  }
}

async function prepareOpeningReflection() {
  if (character.messages.length > 0) {
    const lastAssistantMessage = character.messages.filter((message) => message.role === "assistant").at(-1);
    if (lastAssistantMessage?.content) {
      chatBubble.textContent = lastAssistantMessage.content;
    }
    return;
  }

  if (typeof buildEmotionInsightsFromDesign === "function") {
    const insights = await buildEmotionInsightsFromDesign();
    character.designChoices = insights.designChoices;
    character.emotionHints = insights.emotionHints;
    saveCurrentCharacter(character);
  }

  try {
    const response = await fetch("/api/emotion-chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        opening: true,
        history: [],
        character
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "The emotion character could not begin.");
    }

    character.messages.push({ id: crypto.randomUUID(), role: "assistant", content: data.reply, at: new Date().toISOString() });
    chatBubble.textContent = data.reply;
    saveCurrentCharacter(character);
  } catch (error) {
    chatBubble.textContent = openingFallbackText();
  }
}

function openingFallbackText() {
  const ranked = character.emotionHints?.ranked || [];
  if (ranked.length === 0) {
    return "I can feel that you made something tender here. Do you want to tell me what emotion I might be holding?";
  }

  const names = ranked.slice(0, 2).map((item) => item.emotion);
  return `I might be carrying something like ${names.join(" and ")}. Does that feel close, or is there another feeling inside me?`;
}
