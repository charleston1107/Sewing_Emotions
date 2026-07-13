const libraryFrame = document.querySelector(".character-image-frame");
const libraryBubble = document.querySelector(".character-chat-bubble p");
const libraryForm = document.querySelector(".character-input-bar");
const libraryInput = document.querySelector(".character-text-input");

const characters = loadCharacters();
let character = characters.at(-1) || loadCurrentCharacter();

renderLibraryCharacter();

function renderLibraryCharacter() {
  libraryFrame.innerHTML = "";

  if (character.imageUrl) {
    const image = document.createElement("img");
    image.className = "character-main-image";
    image.src = character.imageUrl;
    image.alt = "Saved emotion plushie";
    libraryFrame.appendChild(image);
  }
}

libraryForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const userMessage = libraryInput.value.trim();
  if (!userMessage) {
    return;
  }

  libraryInput.value = "";
  character.userInputs.push(userMessage);
  character.messages.push({ role: "user", content: userMessage, at: new Date().toISOString() });
  libraryBubble.textContent = "Let me feel that for a second...";
  saveCharacterToLibrary(character);

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
    libraryBubble.textContent = data.reply;
  } catch (error) {
    libraryBubble.textContent = error.message;
  }

  saveCharacterToLibrary(character);
});
