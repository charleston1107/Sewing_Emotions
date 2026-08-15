const assert = require("node:assert/strict");
const test = require("node:test");

const user = { id: "11111111-1111-4111-8111-111111111111" };
const savedCharacters = new Map();
const savedMessages = new Map();
const uploadedImages = new Map();
let currentUser = user;
let localCharacter;

const client = {
  auth: {
    async getUser() {
      return { data: { user: currentUser }, error: null };
    }
  },
  storage: {
    from() {
      return {
        async upload(path, blob) {
          uploadedImages.set(path, blob);
          return { error: null };
        }
      };
    }
  },
  from(table) {
    return {
      async upsert(rows) {
        if (table === "characters") {
          savedCharacters.set(rows.id, rows);
        } else {
          rows.forEach((row) => {
            savedMessages.set(`${row.character_id}:${row.source_message_id}`, row);
          });
        }
        return { error: null };
      }
    };
  }
};

global.window = global;
global.getSupabaseClient = async () => client;
global.saveCurrentCharacter = (character) => {
  localCharacter = structuredClone(character);
};
global.saveCharacterToLibrary = global.saveCurrentCharacter;

require("../character-storage.js");

test("a retry updates one cloud character without duplicating messages", async () => {
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
  assert.equal(localCharacter.remote.characterId, first.characterId);
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
