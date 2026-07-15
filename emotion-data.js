const CURRENT_CHARACTER_KEY = "sewing-emotions-current-character";
const CHARACTER_LIST_KEY = "sewing-emotions-characters";
const GENERATED_IMAGE_KEY = "sewing-emotions-generated-image";

function makeCharacterId() {
  return `emotion-${Date.now()}-${Math.round(Math.random() * 10000)}`;
}

function loadCurrentCharacter() {
  try {
    const saved = JSON.parse(localStorage.getItem(CURRENT_CHARACTER_KEY));
    if (saved?.id) {
      return normalizeCharacter(saved);
    }
  } catch (error) {
    // Fall through and create a character below.
  }

  return normalizeCharacter({
    id: makeCharacterId(),
    imageUrl: localStorage.getItem(GENERATED_IMAGE_KEY) || "",
    messages: [],
    userInputs: [],
    createdAt: new Date().toISOString()
  });
}

function saveCurrentCharacter(character) {
  localStorage.setItem(CURRENT_CHARACTER_KEY, JSON.stringify(normalizeCharacter(character)));
}

function loadCharacters() {
  try {
    const saved = JSON.parse(localStorage.getItem(CHARACTER_LIST_KEY));
    return Array.isArray(saved) ? saved.map(normalizeCharacter) : [];
  } catch (error) {
    return [];
  }
}

function saveCharacterToLibrary(character) {
  const normalized = normalizeCharacter(character);
  const characters = loadCharacters();
  const existingIndex = characters.findIndex((item) => item.id === normalized.id);

  if (existingIndex >= 0) {
    characters[existingIndex] = normalized;
  } else {
    characters.push(normalized);
  }

  localStorage.setItem(CHARACTER_LIST_KEY, JSON.stringify(characters));
  saveCurrentCharacter(normalized);
}

function normalizeCharacter(character) {
  return {
    id: character.id || makeCharacterId(),
    imageUrl: character.imageUrl || localStorage.getItem(GENERATED_IMAGE_KEY) || "",
    messages: Array.isArray(character.messages) ? character.messages : [],
    userInputs: Array.isArray(character.userInputs) ? character.userInputs : [],
    designChoices: character.designChoices || {},
    emotionHints: character.emotionHints || {},
    createdAt: character.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}
