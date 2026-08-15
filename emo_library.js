const libraryFrame = document.querySelector(".character-image-frame");
const libraryBubble = document.querySelector(".character-chat-bubble p");
const libraryForm = document.querySelector(".character-input-bar");
const libraryInput = document.querySelector(".character-text-input");

const localCharacters = loadCharacters();
let character = localCharacters.at(-1) || loadCurrentCharacter();
let characterIsRemote = false;
let libraryReady = false;

const libraryInitialization = initializeLibrary();

async function initializeLibrary() {
  libraryBubble.textContent = "Opening your emotion library...";
  let loadError = "";

  try {
    const requestedId = new URLSearchParams(window.location.search).get("character") || "";
    const remoteCharacter = await loadCharacterFromAccount(requestedId);

    if (remoteCharacter) {
      character = remoteCharacter;
      characterIsRemote = true;
      saveCurrentCharacter(character);
      saveCharacterToLibrary(character);
    }
  } catch (error) {
    loadError = `Your browser character is still here, but the online library could not load. ${error.message}`;
  }

  renderLibraryCharacter();
  if (loadError) {
    libraryBubble.textContent = loadError;
  } else {
    renderLatestMessage();
  }
  libraryReady = true;
}

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

function renderLatestMessage() {
  const lastAssistantMessage = character.messages
    .filter((message) => message.role === "assistant")
    .at(-1);

  if (lastAssistantMessage?.content) {
    libraryBubble.textContent = lastAssistantMessage.content;
  } else if (!character.imageUrl) {
    libraryBubble.textContent = "Your saved emotion characters will appear here.";
  } else {
    libraryBubble.textContent = "I'm here with the feelings you gave me.";
  }
}

libraryForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await libraryInitialization;

  const userMessage = libraryInput.value.trim();
  if (!userMessage || !libraryReady) {
    return;
  }

  libraryInput.value = "";
  character.userInputs.push(userMessage);
  character.messages.push({
    id: crypto.randomUUID(),
    role: "user",
    content: userMessage,
    at: new Date().toISOString()
  });
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

    character.messages.push({
      id: crypto.randomUUID(),
      role: "assistant",
      content: data.reply,
      at: new Date().toISOString()
    });
    libraryBubble.textContent = data.reply;
  } catch (error) {
    libraryBubble.textContent = error.message;
  }

  saveCharacterToLibrary(character);

  if (characterIsRemote) {
    try {
      await saveCharacterToAccount(character);
    } catch (error) {
      console.error("The conversation could not sync to the account.", error);
    }
  }
});
