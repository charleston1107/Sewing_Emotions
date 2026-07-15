const characterFrame = document.querySelector(".character-image-frame");
const chatBubble = document.querySelector(".character-chat-bubble p");
const inputForm = document.querySelector(".character-input-bar");
const textInput = document.querySelector(".character-text-input");
const finishButton = document.querySelector(".character-finish-button");

let character = loadCurrentCharacter();

renderCharacterImage();
prepareOpeningReflection();

function renderCharacterImage() {
  characterFrame.innerHTML = "";

  if (!character.imageUrl) {
    return;
  }

  const image = document.createElement("img");
  image.className = "character-main-image";
  image.src = character.imageUrl;
  image.alt = "Generated emotion plushie";
  characterFrame.appendChild(image);
}

inputForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const userMessage = textInput.value.trim();
  if (!userMessage) {
    return;
  }

  textInput.value = "";
  character.userInputs.push(userMessage);
  character.messages.push({ role: "user", content: userMessage, at: new Date().toISOString() });
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

    character.messages.push({ role: "assistant", content: data.reply, at: new Date().toISOString() });
    chatBubble.textContent = data.reply;
  } catch (error) {
    chatBubble.textContent = error.message;
  }

  saveCurrentCharacter(character);
});

finishButton.addEventListener("click", () => {
  saveCharacterToLibrary(character);
  window.location.href = "emo_library.html";
});

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

    character.messages.push({ role: "assistant", content: data.reply, at: new Date().toISOString() });
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
