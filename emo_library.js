const collectionView = document.querySelector('[data-library-view="collection"]');
const memoryView = document.querySelector('[data-library-view="memory"]');
const chatView = document.querySelector('[data-library-view="chat"]');
const libraryGrid = document.querySelector(".library-card-grid");
const libraryStatus = document.querySelector(".library-status");
const libraryEmptyState = document.querySelector(".library-empty-state");
const memoryGeneratedImage = document.querySelector(".memory-generated-image");
const memoryGeneratedImageFallback = document.querySelector(".memory-generated-image-fallback");
const memoryNameDisplay = document.querySelector(".memory-name-display");
const memoryNameForm = document.querySelector(".memory-name-form");
const memoryNameMessage = document.querySelector(".memory-name-message");
const memoryCreatedAt = document.querySelector(".memory-created-at");
const memoryEmotions = document.querySelector(".memory-emotions");
const memoryDesignSurface = document.querySelector(".memory-design-surface");
const memoryTalkButton = document.querySelector(".memory-talk-button");
const memoryTranscript = document.querySelector(".memory-transcript");
const memoryViewStatus = document.querySelector(".memory-view-status");
const libraryDetailName = document.querySelector(".library-detail-name");
const libraryDesignSurface = document.querySelector(".character-design-surface");
const libraryBubble = document.querySelector(".character-chat-bubble p");
const libraryForm = document.querySelector(".character-input-bar");
const libraryInput = document.querySelector(".character-text-input");
const librarySendButton = document.querySelector(".character-send-button");
const memoryNavigationButton = document.querySelector('[data-library-nav="memory"]');
const chatNavigationButton = document.querySelector('[data-library-nav="chat"]');
const i18n = window.sewingI18n;

let character = null;
let libraryReady = false;
let collectionCharacters = [];
let collectionLoaded = false;
let collectionRequiresLogin = false;

const libraryParams = new URLSearchParams(window.location.search);
const requestedCharacterId = libraryParams.get("character") || "";
const requestedCharacterView = libraryParams.get("view") === "chat" ? "chat" : "memory";
const libraryInitialization = requestedCharacterId
  ? initializeCharacterDetail(requestedCharacterId, requestedCharacterView)
  : initializeCollection();

async function initializeCollection() {
  showLibraryView("collection");
  libraryStatus.textContent = i18n.t("Opening your library...");

  try {
    const result = await listCharactersFromAccount();

    if (result.requiresLogin) {
      collectionRequiresLogin = true;
      renderLoginRequired();
      return;
    }

    collectionCharacters = result.characters;
    collectionLoaded = true;
    renderCollectionCards();
  } catch (error) {
    libraryStatus.textContent = i18n.t("library.openError", { error: error.message });
  }
}

async function initializeCharacterDetail(characterId, view) {
  showLibraryView(view);
  if (view === "chat") {
    resizeLibraryInput();
    setChatEnabled(false);
  } else {
    memoryViewStatus.textContent = i18n.t("library.openingBox");
  }

  try {
    character = await loadCharacterFromAccount(characterId);

    if (!character) {
      const message = i18n.t("library.characterMissing");
      if (view === "chat") {
        libraryBubble.textContent = message;
      } else {
        memoryViewStatus.textContent = message;
      }
      return;
    }

    saveCurrentCharacter(character);
    saveCharacterToLibrary(character);
    if (view === "chat") {
      renderCharacterDetail();
      libraryReady = true;
      setChatEnabled(true);
    } else {
      renderMemoryDetail();
      memoryViewStatus.textContent = "";
    }
  } catch (error) {
    const message = i18n.t("library.characterLoadError", { error: error.message });
    if (view === "chat") {
      libraryBubble.textContent = message;
    } else {
      memoryViewStatus.textContent = message;
    }
  }
}

function showLibraryView(view) {
  collectionView.hidden = view !== "collection";
  memoryView.hidden = view !== "memory";
  chatView.hidden = view !== "chat";
  memoryNavigationButton.hidden = view !== "memory";
  chatNavigationButton.hidden = view !== "chat";

  if (view === "chat" && requestedCharacterId) {
    chatNavigationButton.href = `emo_library.html?character=${encodeURIComponent(requestedCharacterId)}`;
  }
}

function renderCollectionCards() {
  libraryGrid.innerHTML = "";
  libraryStatus.textContent = collectionCharacters.length === 1
    ? i18n.t("library.count.one")
    : i18n.t("library.count.many", { count: collectionCharacters.length });
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
    placeholder.textContent = i18n.t("A feeling lives here");
    imageFrame.appendChild(placeholder);
  }

  const text = document.createElement("div");
  text.className = "library-card-copy";
  const name = document.createElement("h2");
  name.textContent = isUnnamedCharacterName(savedCharacter.name || "")
    ? i18n.t("My emotion")
    : savedCharacter.name;
  const emotion = document.createElement("p");
  emotion.textContent = emotionDescription(savedCharacter.emotionHints);
  const date = document.createElement("time");
  date.dateTime = savedCharacter.updatedAt;
  date.textContent = i18n.t("library.lastVisited", { date: formatLibraryDate(savedCharacter.updatedAt) });
  text.append(name, emotion, date);
  openLink.append(imageFrame, text);

  const actions = document.createElement("div");
  actions.className = "library-card-actions";

  const renameButton = document.createElement("button");
  renameButton.type = "button";
  renameButton.dataset.action = "rename";
  renameButton.textContent = i18n.t("Rename");

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.dataset.action = "delete";
  deleteButton.textContent = i18n.t("Delete");

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
  saveButton.textContent = i18n.t("Save");
  const cancelButton = document.createElement("button");
  cancelButton.type = "button";
  cancelButton.dataset.action = "cancel-rename";
  cancelButton.textContent = i18n.t("Cancel");
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
  libraryStatus.textContent = i18n.t("Log in to open your private emotion library.");

  const loginLink = document.createElement("a");
  loginLink.className = "library-login-button";
  loginLink.href = "account.html?returnTo=%2Femo_library.html";
  loginLink.textContent = i18n.t("Log in or create an account");
  libraryGrid.appendChild(loginLink);
}

function renderCharacterDetail() {
  libraryDetailName.textContent = isUnnamedCharacterName(character.name || "")
    ? i18n.t("My emotion")
    : character.name;
  renderCharacterDesign(libraryDesignSurface, character.designChoices?.composition);

  const lastAssistantMessage = character.messages
    .filter((message) => message.role === "assistant")
    .at(-1);
  libraryBubble.textContent = lastAssistantMessage?.content || "I'm here with the feelings you gave me.";
}

function renderMemoryDetail() {
  renderMemoryName();

  if (character.imageUrl) {
    memoryGeneratedImage.src = character.imageUrl;
    memoryGeneratedImage.alt = `${character.name || "Saved"} generated emotion character`;
    memoryGeneratedImage.hidden = false;
    memoryGeneratedImageFallback.hidden = true;
  } else {
    memoryGeneratedImage.removeAttribute("src");
    memoryGeneratedImage.alt = "";
    memoryGeneratedImage.hidden = true;
    memoryGeneratedImageFallback.hidden = false;
  }

  const createdAt = new Date(character.createdAt);
  memoryCreatedAt.dateTime = Number.isNaN(createdAt.getTime()) ? "" : createdAt.toISOString();
  memoryCreatedAt.textContent = formatMemoryDate(character.createdAt);

  const rankedEmotions = Array.isArray(character.emotionHints?.ranked)
    ? character.emotionHints.ranked
      .map((hint) => String(hint?.emotion || "").trim())
      .filter(Boolean)
      .slice(0, 4)
    : [];
  memoryEmotions.textContent = rankedEmotions.length ? rankedEmotions.join(", ") : "—";

  renderCharacterDesign(memoryDesignSurface, character.designChoices?.composition);
  memoryTalkButton.href = `emo_library.html?character=${encodeURIComponent(character.id)}&view=chat`;
  renderMemoryTranscript();
}

function renderMemoryName() {
  const name = String(character?.name || "").trim();
  const unnamed = isUnnamedCharacterName(name);
  memoryNameDisplay.textContent = unnamed ? "" : name;
  memoryNameDisplay.classList.toggle("is-unnamed", unnamed);
  memoryNameDisplay.setAttribute(
    "aria-label",
    unnamed ? "Unnamed emotion. Double-click to add a name." : `${name}. Double-click to rename.`
  );
  memoryNameForm.elements.characterName.value = unnamed ? "" : name;
}

function renderMemoryTranscript() {
  memoryTranscript.innerHTML = "";
  const messages = Array.isArray(character.messages) ? character.messages : [];

  if (messages.length === 0) {
    const emptyMessage = document.createElement("p");
    emptyMessage.className = "memory-transcript-empty";
    emptyMessage.textContent = i18n.t("No saved conversation yet.");
    memoryTranscript.appendChild(emptyMessage);
    return;
  }

  messages.forEach((message) => {
    const entry = document.createElement("article");
    const isAssistant = message.role === "assistant";
    entry.className = `memory-message memory-message-${isAssistant ? "emotion" : "user"}`;

    const role = document.createElement("p");
    role.className = "memory-message-role";
    role.textContent = i18n.t(isAssistant ? "Emotion" : "You");

    const content = document.createElement("p");
    content.className = "memory-message-content";
    content.textContent = String(message.content || "");

    entry.append(role, content);
    memoryTranscript.appendChild(entry);
  });
}

function formatMemoryDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat(i18n.language === "cn" ? "zh-CN" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function isUnnamedCharacterName(name) {
  return !name || ["my emotion", "unnamed", "untitled", "untitled emotion"].includes(name.toLowerCase());
}

function emotionDescription(emotionHints) {
  const ranked = Array.isArray(emotionHints?.ranked) ? emotionHints.ranked : [];
  if (!ranked.length) {
    return i18n.t("library.unnamed");
  }

  return i18n.t("library.mayHold", {
    emotions: ranked.slice(0, 2).map((hint) => hint.emotion).join(i18n.language === "cn" ? "、" : " and ")
  });
}

function formatLibraryDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "recently";
  }

  return new Intl.DateTimeFormat(i18n.language === "cn" ? "zh-CN" : "en-US", {
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

memoryNameDisplay.addEventListener("dblclick", () => {
  if (character) {
    setMemoryNameEditing(true);
  }
});

memoryNameForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const input = memoryNameForm.elements.characterName;
  const nextName = input.value.trim();
  if (!character || !nextName) {
    memoryNameMessage.textContent = i18n.t("Please give this emotion a name.");
    return;
  }

  const buttons = memoryNameForm.querySelectorAll("button");
  buttons.forEach((button) => {
    button.disabled = true;
  });
  memoryNameMessage.textContent = i18n.t("Saving name...");

  try {
    const result = await renameCharacterInAccount(character.id, nextName);
    try {
      renameCharacterInLocalLibrary(character.id, result.name);
    } catch (localError) {
      console.warn("The renamed character could not be refreshed in the local cache.", localError);
    }
    character.name = result.name;
    renderMemoryName();
    setMemoryNameEditing(false);
  } catch (error) {
    memoryNameMessage.textContent = error.message;
  } finally {
    buttons.forEach((button) => {
      button.disabled = false;
    });
  }
});

memoryNameForm.querySelector('[data-memory-action="cancel-name"]').addEventListener("click", () => {
  renderMemoryName();
  setMemoryNameEditing(false);
});

function setMemoryNameEditing(editing) {
  memoryNameDisplay.hidden = editing;
  memoryNameForm.hidden = !editing;
  memoryNameMessage.textContent = "";

  if (editing) {
    const input = memoryNameForm.elements.characterName;
    input.focus();
    input.select();
  }
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
  message.textContent = i18n.t("Saving name...");

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
  const confirmed = window.confirm(i18n.t("library.deleteConfirm", { name: savedCharacter.name }));
  if (!confirmed) {
    return;
  }

  const deleteButton = card.querySelector('[data-action="delete"]');
  deleteButton.disabled = true;
  deleteButton.textContent = i18n.t("Deleting...");

  try {
    const result = await deleteCharacterFromAccount(savedCharacter.id, savedCharacter.imagePath);
    if (result.imageCleanupError) {
      console.warn("The character was deleted, but its image could not be cleaned up.", result.imageCleanupError);
    }
    removeCharacterFromLocalLibrary(savedCharacter.id);
    collectionCharacters = collectionCharacters.filter((item) => item.id !== savedCharacter.id);
    renderCollectionCards();
  } catch (error) {
    libraryStatus.textContent = i18n.t("library.deleteError", { error: error.message });
    deleteButton.disabled = false;
    deleteButton.textContent = i18n.t("Delete");
  }
}

function setFormBusy(form, busy) {
  [...form.elements].forEach((control) => {
    control.disabled = busy;
  });
}

window.addEventListener("sewing-language-change", () => {
  if (!collectionView.hidden) {
    if (collectionRequiresLogin) {
      renderLoginRequired();
    } else if (collectionLoaded) {
      renderCollectionCards();
    }
  } else if (!memoryView.hidden && character) {
    renderMemoryDetail();
  } else if (!chatView.hidden && character && isUnnamedCharacterName(character.name || "")) {
    libraryDetailName.textContent = i18n.t("My emotion");
  }
});
