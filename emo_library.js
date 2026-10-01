const collectionView = document.querySelector('[data-library-view="collection"]');
const detailView = document.querySelector('[data-library-view="detail"]');
const libraryGrid = document.querySelector(".library-card-grid");
const libraryStatus = document.querySelector(".library-status");
const libraryEmptyState = document.querySelector(".library-empty-state");
const libraryDetailName = document.querySelector(".library-detail-name");
const libraryDesignSurface = document.querySelector(".character-design-surface");
const libraryBubble = document.querySelector(".character-chat-bubble p");
const libraryForm = document.querySelector(".character-input-bar");
const libraryInput = document.querySelector(".character-text-input");
const librarySendButton = document.querySelector(".character-send-button");

let character = null;
let libraryReady = false;
let collectionCharacters = [];

const requestedCharacterId = new URLSearchParams(window.location.search).get("character") || "";
const libraryInitialization = requestedCharacterId
  ? initializeCharacterDetail(requestedCharacterId)
  : initializeCollection();

async function initializeCollection() {
  showLibraryView("collection");
  libraryStatus.textContent = "Opening your library...";

  try {
    const result = await listCharactersFromAccount();

    if (result.requiresLogin) {
      renderLoginRequired();
      return;
    }

    collectionCharacters = result.characters;
    renderCollectionCards();
  } catch (error) {
    libraryStatus.textContent = `Your library could not load. ${error.message}`;
  }
}

async function initializeCharacterDetail(characterId) {
  showLibraryView("detail");
  resizeLibraryInput();
  setChatEnabled(false);

  try {
    character = await loadCharacterFromAccount(characterId);

    if (!character) {
      libraryBubble.textContent = "This character was not found, or you need to log in to open it.";
      return;
    }

    saveCurrentCharacter(character);
    saveCharacterToLibrary(character);
    renderCharacterDetail();
    libraryReady = true;
    setChatEnabled(true);
  } catch (error) {
    libraryBubble.textContent = `This character could not load. ${error.message}`;
  }
}

function showLibraryView(view) {
  const showingCollection = view === "collection";
  collectionView.hidden = !showingCollection;
  detailView.hidden = showingCollection;
}

function renderCollectionCards() {
  libraryGrid.innerHTML = "";
  libraryStatus.textContent = collectionCharacters.length === 1
    ? "1 emotion character"
    : `${collectionCharacters.length} emotion characters`;
  libraryEmptyState.hidden = collectionCharacters.length > 0;

  collectionCharacters.forEach((savedCharacter) => {
    libraryGrid.appendChild(createCharacterCard(savedCharacter));
  });
}

function createCharacterCard(savedCharacter) {
  const card = document.createElement("article");
  card.className = "library-character-card";
  card.dataset.characterId = savedCharacter.id;

  const openLink = document.createElement("a");
  openLink.className = "library-card-open";
  openLink.href = `emo_library.html?character=${encodeURIComponent(savedCharacter.id)}`;
  openLink.setAttribute("aria-label", `Open ${savedCharacter.name}`);

  const imageFrame = document.createElement("div");
  imageFrame.className = "library-card-image";
  if (savedCharacter.imageUrl) {
    const image = document.createElement("img");
    image.src = savedCharacter.imageUrl;
    image.alt = `${savedCharacter.name} emotion character`;
    imageFrame.appendChild(image);
  } else {
    const placeholder = document.createElement("span");
    placeholder.textContent = "A feeling lives here";
    imageFrame.appendChild(placeholder);
  }

  const text = document.createElement("div");
  text.className = "library-card-copy";
  const name = document.createElement("h2");
  name.textContent = savedCharacter.name;
  const emotion = document.createElement("p");
  emotion.textContent = emotionDescription(savedCharacter.emotionHints);
  const date = document.createElement("time");
  date.dateTime = savedCharacter.updatedAt;
  date.textContent = `Last visited ${formatLibraryDate(savedCharacter.updatedAt)}`;
  text.append(name, emotion, date);
  openLink.append(imageFrame, text);

  const actions = document.createElement("div");
  actions.className = "library-card-actions";

  const renameButton = document.createElement("button");
  renameButton.type = "button";
  renameButton.dataset.action = "rename";
  renameButton.textContent = "Rename";

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.dataset.action = "delete";
  deleteButton.textContent = "Delete";

  actions.append(renameButton, deleteButton);

  const renameForm = document.createElement("form");
  renameForm.className = "library-rename-form";
  renameForm.hidden = true;
  const renameInput = document.createElement("input");
  renameInput.name = "characterName";
  renameInput.value = savedCharacter.name;
  renameInput.maxLength = 100;
  renameInput.required = true;
  renameInput.setAttribute("aria-label", `New name for ${savedCharacter.name}`);
  const saveButton = document.createElement("button");
  saveButton.type = "submit";
  saveButton.textContent = "Save";
  const cancelButton = document.createElement("button");
  cancelButton.type = "button";
  cancelButton.dataset.action = "cancel-rename";
  cancelButton.textContent = "Cancel";
  const renameMessage = document.createElement("p");
  renameMessage.className = "library-card-message";
  renameMessage.setAttribute("aria-live", "polite");
  renameForm.append(renameInput, saveButton, cancelButton, renameMessage);

  card.append(openLink, actions, renameForm);
  return card;
}

function renderLoginRequired() {
  libraryGrid.innerHTML = "";
  libraryEmptyState.hidden = true;
  libraryStatus.textContent = "Log in to open your private emotion library.";

  const loginLink = document.createElement("a");
  loginLink.className = "library-login-button";
  loginLink.href = "account.html?returnTo=%2Femo_library.html";
  loginLink.textContent = "Log in or create an account";
  libraryGrid.appendChild(loginLink);
}

function renderCharacterDetail() {
  libraryDetailName.textContent = character.name || "My emotion";
  renderCharacterDesign(libraryDesignSurface, character.designChoices?.composition);

  const lastAssistantMessage = character.messages
    .filter((message) => message.role === "assistant")
    .at(-1);
  libraryBubble.textContent = lastAssistantMessage?.content || "I'm here with the feelings you gave me.";
}

function emotionDescription(emotionHints) {
  const ranked = Array.isArray(emotionHints?.ranked) ? emotionHints.ranked : [];
  if (!ranked.length) {
    return "An emotion still finding its name";
  }

  return `May be holding ${ranked.slice(0, 2).map((hint) => hint.emotion).join(" and ")}`;
}

function formatLibraryDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "recently";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() === new Date().getFullYear() ? undefined : "numeric"
  }).format(date);
}

function setChatEnabled(enabled) {
  libraryInput.disabled = !enabled;
  librarySendButton.disabled = !enabled;
}

libraryInput.addEventListener("input", resizeLibraryInput);
libraryInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
    event.preventDefault();
    libraryForm.requestSubmit();
  }
});

function resizeLibraryInput() {
  const styles = window.getComputedStyle(libraryInput);
  const lineHeight = Number.parseFloat(styles.lineHeight) || 22;
  const verticalPadding = Number.parseFloat(styles.paddingTop) + Number.parseFloat(styles.paddingBottom);
  const maxHeight = (lineHeight * 3) + verticalPadding;

  libraryInput.style.height = "auto";
  const nextHeight = Math.min(libraryInput.scrollHeight, maxHeight);
  libraryInput.style.height = `${nextHeight}px`;
  libraryInput.style.overflowY = libraryInput.scrollHeight > maxHeight ? "auto" : "hidden";
}

libraryGrid.addEventListener("click", (event) => {
  if (!(event.target instanceof Element)) {
    return;
  }

  const actionButton = event.target.closest("[data-action]");
  if (!actionButton) {
    return;
  }

  const card = actionButton.closest(".library-character-card");
  const savedCharacter = collectionCharacters.find((item) => item.id === card?.dataset.characterId);
  if (!card || !savedCharacter) {
    return;
  }

  if (actionButton.dataset.action === "rename") {
    setRenameFormOpen(card, true);
  } else if (actionButton.dataset.action === "cancel-rename") {
    setRenameFormOpen(card, false);
  } else if (actionButton.dataset.action === "delete") {
    deleteCollectionCharacter(savedCharacter, card);
  }
});

libraryGrid.addEventListener("submit", async (event) => {
  if (!event.target.matches(".library-rename-form")) {
    return;
  }

  event.preventDefault();
  const form = event.target;
  const card = form.closest(".library-character-card");
  const savedCharacter = collectionCharacters.find((item) => item.id === card?.dataset.characterId);
  const message = form.querySelector(".library-card-message");
  const input = form.elements.characterName;
  const name = input.value.trim();

  if (!savedCharacter || !name) {
    return;
  }

  setFormBusy(form, true);
  message.textContent = "Saving name...";

  try {
    await renameCharacterInAccount(savedCharacter.id, name);
    renameCharacterInLocalLibrary(savedCharacter.id, name);
    savedCharacter.name = name;
    renderCollectionCards();
  } catch (error) {
    message.textContent = error.message;
    setFormBusy(form, false);
  }
});

libraryForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await libraryInitialization;

  const userMessage = libraryInput.value.trim();
  if (!userMessage || !libraryReady || !character) {
    return;
  }

  libraryInput.value = "";
  resizeLibraryInput();
  character.userInputs.push(userMessage);
  character.messages.push({
    id: crypto.randomUUID(),
    role: "user",
    content: userMessage,
    at: new Date().toISOString()
  });
  libraryBubble.textContent = "Let me feel that for a second...";
  setChatEnabled(false);
  saveCharacterToLibrary(character);

  try {
    const response = await fetch("/api/emotion-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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

  try {
    await saveCharacterToAccount(character);
  } catch (error) {
    console.error("The conversation could not sync to the account.", error);
  } finally {
    setChatEnabled(true);
    libraryInput.focus();
  }
});

function setRenameFormOpen(card, open) {
  const actions = card.querySelector(".library-card-actions");
  const form = card.querySelector(".library-rename-form");
  actions.hidden = open;
  form.hidden = !open;
  form.querySelector(".library-card-message").textContent = "";

  if (open) {
    form.elements.characterName.focus();
    form.elements.characterName.select();
  }
}

async function deleteCollectionCharacter(savedCharacter, card) {
  const confirmed = window.confirm(`Delete ${savedCharacter.name} and all of this character's conversations? This cannot be undone.`);
  if (!confirmed) {
    return;
  }

  const deleteButton = card.querySelector('[data-action="delete"]');
  deleteButton.disabled = true;
  deleteButton.textContent = "Deleting...";

  try {
    const result = await deleteCharacterFromAccount(savedCharacter.id, savedCharacter.imagePath);
    if (result.imageCleanupError) {
      console.warn("The character was deleted, but its image could not be cleaned up.", result.imageCleanupError);
    }
    removeCharacterFromLocalLibrary(savedCharacter.id);
    collectionCharacters = collectionCharacters.filter((item) => item.id !== savedCharacter.id);
    renderCollectionCards();
  } catch (error) {
    libraryStatus.textContent = `The character could not be deleted. ${error.message}`;
    deleteButton.disabled = false;
    deleteButton.textContent = "Delete";
  }
}

function setFormBusy(form, busy) {
  [...form.elements].forEach((control) => {
    control.disabled = busy;
  });
}
