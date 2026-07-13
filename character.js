const characterFrame = document.querySelector(".character-image-frame");
const chatBubble = document.querySelector(".character-chat-bubble p");
const inputForm = document.querySelector(".character-input-bar");
const textInput = document.querySelector(".character-text-input");
const finishButton = document.querySelector(".character-finish-button");

let character = loadCurrentCharacter();

renderCharacterImage();

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
