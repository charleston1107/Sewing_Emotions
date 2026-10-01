const assert = require("node:assert/strict");
const test = require("node:test");

const user = { id: "11111111-1111-4111-8111-111111111111" };
const savedCharacters = new Map();
const savedMessages = new Map();
const uploadedImages = new Map();
let currentUser = user;
let localCharacter;
let localSaveCount = 0;
let authError = null;
let uploadError = null;
let characterUpsertError = null;

const client = {
  auth: {
    async getUser() {
      return { data: { user: currentUser }, error: authError };
    }
  },
  storage: {
    from() {
      return {
        async upload(path, blob) {
          if (uploadError) {
            return { error: uploadError };
          }
          uploadedImages.set(path, blob);
          return { error: null };
        },
        async createSignedUrl(path) {
          return { data: { signedUrl: `https://images.test/${path}` }, error: null };
        },
        async remove(paths) {
          paths.forEach((path) => uploadedImages.delete(path));
          return { error: null };
        }
      };
    }
  },
  from(table) {
    return {
      async upsert(rows) {
        if (table === "characters") {
          if (characterUpsertError) {
            return { error: characterUpsertError };
          }
          savedCharacters.set(rows.id, rows);
        } else {
          rows.forEach((row) => {
            savedMessages.set(`${row.character_id}:${row.source_message_id}`, row);
          });
        }
        return { error: null };
      },
      select() {
        return makeQuery(table, "select");
      },
      update(values) {
        return makeQuery(table, "update", values);
      },
      delete() {
        return makeQuery(table, "delete");
      }
    };
  }
};

function makeQuery(table, operation, values = {}) {
  const filters = [];
  const query = {
    eq(column, value) {
      filters.push([column, value]);
      return query;
    },
    order() {
      return query;
    },
    then(resolve) {
      let rows = table === "characters" ? [...savedCharacters.values()] : [...savedMessages.values()];
      rows = rows.filter((row) => filters.every(([column, value]) => row[column] === value));

      if (operation === "update") {
        rows.forEach((row) => Object.assign(row, values));
      }

      if (operation === "delete") {
        rows.forEach((row) => {
          savedCharacters.delete(row.id);
          [...savedMessages.entries()].forEach(([key, message]) => {
            if (message.character_id === row.id) {
              savedMessages.delete(key);
            }
          });
        });
      }

      resolve({ data: operation === "select" ? rows : null, error: null });
    }
  };
  return query;
}

global.window = global;
global.getSupabaseClient = async () => client;
global.saveCurrentCharacter = (character) => {
  localSaveCount += 1;
  localCharacter = structuredClone(character);
};
global.saveCharacterToLibrary = global.saveCurrentCharacter;

require("../character-storage.js");

test("a retry updates one cloud character without duplicating messages", async () => {
  localSaveCount = 0;
  const character = {
    id: "emotion-local",
    name: "Cloudy",
    imageUrl: "data:image/png;base64,aGVsbG8=",
    messages: [
      { role: "user", content: "I feel nervous", at: "2026-08-15T00:00:00.000Z" },
      { role: "assistant", content: "I am listening", at: "2026-08-15T00:00:01.000Z" }
    ],
    designChoices: { shapes: ["cloud"] },
    emotionHints: { ranked: [{ emotion: "anxious", count: 1 }] },
    createdAt: "2026-08-15T00:00:00.000Z"
  };

  const first = await window.saveCharacterToAccount(character);
  const second = await window.saveCharacterToAccount(character);

  assert.equal(first.requiresLogin, false);
  assert.equal(second.characterId, first.characterId);
  assert.equal(savedCharacters.size, 1);
  assert.equal(savedMessages.size, 2);
  assert.equal(uploadedImages.size, 1);
  assert.equal(character.remote.characterId, first.characterId);
  assert.equal(localSaveCount, 0);
});

test("a guest is sent to login without writing cloud data", async () => {
  currentUser = null;
  const beforeCharacters = savedCharacters.size;
  const beforeMessages = savedMessages.size;

  const result = await window.saveCharacterToAccount({ messages: [] });

  assert.equal(result.requiresLogin, true);
  assert.equal(savedCharacters.size, beforeCharacters);
  assert.equal(savedMessages.size, beforeMessages);
});

test("a missing Supabase auth session is treated as signed out", async () => {
  currentUser = null;
  authError = Object.assign(new Error("Auth session missing!"), {
    name: "AuthSessionMissingError"
  });

  const result = await window.saveCharacterToAccount({ messages: [] });

  assert.equal(result.requiresLogin, true);
  authError = null;
});

test("account saving does not write the base64 character back to local storage", async () => {
  currentUser = user;
  const originalSaveCurrentCharacter = global.saveCurrentCharacter;
  const originalSaveCharacterToLibrary = global.saveCharacterToLibrary;
  global.saveCurrentCharacter = () => {
    throw new Error("QuotaExceededError");
  };
  global.saveCharacterToLibrary = global.saveCurrentCharacter;

  const result = await window.saveCharacterToAccount({
    name: "Storage-safe",
    imageUrl: "data:image/png;base64,aGVsbG8=",
    messages: []
  });

  assert.equal(result.requiresLogin, false);
  savedCharacters.delete(result.characterId);
  uploadedImages.delete(`${user.id}/${result.characterId}/character.png`);
  global.saveCurrentCharacter = originalSaveCurrentCharacter;
  global.saveCharacterToLibrary = originalSaveCharacterToLibrary;
});

test("an image upload failure leaves the local draft untouched", async () => {
  currentUser = user;
  const draftBefore = structuredClone(localCharacter);
  const charactersBefore = savedCharacters.size;
  uploadError = new Error("Image upload failed");

  await assert.rejects(() => window.saveCharacterToAccount({
    imageUrl: "data:image/png;base64,aGVsbG8=",
    messages: []
  }), /Image upload failed/);

  assert.deepEqual(localCharacter, draftBefore);
  assert.equal(savedCharacters.size, charactersBefore);
  uploadError = null;
});

test("a character-row failure after upload leaves the local draft untouched", async () => {
  currentUser = user;
  const draftBefore = structuredClone(localCharacter);
  const charactersBefore = savedCharacters.size;
  const uploadsBefore = uploadedImages.size;
  characterUpsertError = new Error("Character save failed");

  const failedCharacter = {
    imageUrl: "data:image/png;base64,aGVsbG8=",
    messages: []
  };

  await assert.rejects(() => window.saveCharacterToAccount(failedCharacter), /Character save failed/);

  assert.deepEqual(localCharacter, draftBefore);
  assert.equal(savedCharacters.size, charactersBefore);
  assert.equal(uploadedImages.size, uploadsBefore + 1);
  uploadedImages.delete(`${user.id}/${failedCharacter.remote.characterId}/character.png`);
  characterUpsertError = null;
});

test("the collection lists, renames, and deletes only the signed-in user's character", async () => {
  currentUser = user;
  const result = await window.listCharactersFromAccount();

  assert.equal(result.requiresLogin, false);
  assert.equal(result.characters.length, 1);
  assert.equal(result.characters[0].name, "Cloudy");
  assert.match(result.characters[0].imageUrl, /^https:\/\/images\.test\//);

  await window.renameCharacterInAccount(result.characters[0].id, "Soft Cloud");
  assert.equal(savedCharacters.get(result.characters[0].id).name, "Soft Cloud");

  await window.deleteCharacterFromAccount(result.characters[0].id, result.characters[0].imagePath);
  assert.equal(savedCharacters.size, 0);
  assert.equal(savedMessages.size, 0);
  assert.equal(uploadedImages.size, 0);
});
