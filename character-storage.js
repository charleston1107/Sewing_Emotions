const CHARACTER_IMAGE_BUCKET = "emotion-characters";

async function getSignedInUser() {
  const client = await getSupabaseClient();
  const { data, error } = await client.auth.getUser();

  if (error) {
    throw error;
  }

  return data.user || null;
}

async function saveCharacterToAccount(character) {
  const client = await getSupabaseClient();
  const user = await getSignedInUser();

  if (!user) {
    return { requiresLogin: true };
  }

  ensureMessageIds(character);

  if (character.remote?.userId !== user.id) {
    character.remote = {
      userId: user.id,
      characterId: crypto.randomUUID(),
      imagePath: ""
    };
  }

  const characterId = character.remote.characterId;
  let imagePath = character.remote.imagePath || "";

  saveCurrentCharacter(character);

  if (character.imageUrl?.startsWith("data:image/")) {
    const image = dataUrlToBlob(character.imageUrl);
    const extension = imageExtension(image.type);
    imagePath = `${user.id}/${characterId}/character.${extension}`;

    const { error: uploadError } = await client.storage
      .from(CHARACTER_IMAGE_BUCKET)
      .upload(imagePath, image, {
        cacheControl: "3600",
        contentType: image.type,
        upsert: true
      });

    if (uploadError) {
      throw uploadError;
    }

    character.remote.imagePath = imagePath;
    saveCurrentCharacter(character);
  }

  const characterRow = {
    id: characterId,
    user_id: user.id,
    name: character.name || "My emotion",
    image_path: imagePath || null,
    design_choices: character.designChoices || {},
    mapping_hints: character.emotionHints || {},
    emotion_profile: character.emotionProfile || {},
    personality_profile: character.personalityProfile || {},
    conversation_summary: character.conversationSummary || "",
    created_at: validIsoDate(character.createdAt)
  };

  const { error: characterError } = await client
    .from("characters")
    .upsert(characterRow, { onConflict: "id" });

  if (characterError) {
    throw characterError;
  }

  if (character.messages.length > 0) {
    const messageRows = character.messages.map((message) => ({
      character_id: characterId,
      user_id: user.id,
      source_message_id: message.id,
      role: message.role === "assistant" ? "assistant" : "user",
      content: String(message.content || "").trim(),
      created_at: validIsoDate(message.at)
    })).filter((message) => message.content);

    const { error: messageError } = await client
      .from("messages")
      .upsert(messageRows, {
        onConflict: "character_id,source_message_id",
        ignoreDuplicates: true
      });

    if (messageError) {
      throw messageError;
    }
  }

  character.remote.savedAt = new Date().toISOString();
  saveCurrentCharacter(character);
  saveCharacterToLibrary(character);

  return {
    requiresLogin: false,
    characterId
  };
}

async function loadCharacterFromAccount(characterId) {
  const client = await getSupabaseClient();
  const user = await getSignedInUser();

  if (!user) {
    return null;
  }

  let characterQuery = client
    .from("characters")
    .select("*")
    .eq("user_id", user.id);

  if (characterId) {
    characterQuery = characterQuery.eq("id", characterId);
  } else {
    characterQuery = characterQuery.order("updated_at", { ascending: false }).limit(1);
  }

  const { data: characterRows, error: characterError } = await characterQuery.limit(1);

  if (characterError) {
    throw characterError;
  }

  const row = characterRows?.[0];
  if (!row) {
    return null;
  }

  const { data: messageRows, error: messageError } = await client
    .from("messages")
    .select("source_message_id, role, content, created_at")
    .eq("character_id", row.id)
    .order("created_at", { ascending: true });

  if (messageError) {
    throw messageError;
  }

  let imageUrl = "";
  if (row.image_path) {
    const { data: signedImage, error: imageError } = await client.storage
      .from(CHARACTER_IMAGE_BUCKET)
      .createSignedUrl(row.image_path, 60 * 60);

    if (imageError) {
      throw imageError;
    }
    imageUrl = signedImage.signedUrl;
  }

  const messages = (messageRows || []).map((message) => ({
    id: message.source_message_id || crypto.randomUUID(),
    role: message.role,
    content: message.content,
    at: message.created_at
  }));

  return normalizeCharacter({
    id: row.id,
    name: row.name,
    imageUrl,
    messages,
    userInputs: messages.filter((message) => message.role === "user").map((message) => message.content),
    designChoices: row.design_choices,
    emotionHints: row.mapping_hints,
    emotionProfile: row.emotion_profile,
    personalityProfile: row.personality_profile,
    conversationSummary: row.conversation_summary,
    remote: {
      userId: user.id,
      characterId: row.id,
      imagePath: row.image_path || "",
      savedAt: row.updated_at
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at
  });
}

async function listCharactersFromAccount(options = {}) {
  const client = await getSupabaseClient();
  const user = await getSignedInUser();

  if (!user) {
    return { requiresLogin: true, characters: [] };
  }

  const { data: rows, error } = await client
    .from("characters")
    .select("id, name, image_path, design_choices, mapping_hints, created_at, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    throw error;
  }

  const characters = await Promise.all((rows || []).map(async (row) => {
    let imageUrl = "";
    if (options.includeImages !== false) {
      try {
        imageUrl = await createSignedCharacterImage(client, row.image_path);
      } catch (error) {
        console.warn(`The image for character ${row.id} could not be opened.`, error);
      }
    }

    return {
      id: row.id,
      name: row.name,
      imagePath: row.image_path || "",
      imageUrl,
      designChoices: row.design_choices || {},
      emotionHints: row.mapping_hints || {},
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }));

  return { requiresLogin: false, characters };
}

async function renameCharacterInAccount(characterId, nextName) {
  const client = await getSupabaseClient();
  const user = await getSignedInUser();
  const name = String(nextName || "").trim();

  if (!user) {
    throw new Error("Please log in before renaming a character.");
  }
  if (!name || name.length > 100) {
    throw new Error("Character names must contain between 1 and 100 characters.");
  }

  const { error } = await client
    .from("characters")
    .update({ name })
    .eq("id", characterId)
    .eq("user_id", user.id);

  if (error) {
    throw error;
  }

  return { id: characterId, name };
}

async function deleteCharacterFromAccount(characterId, imagePath = "") {
  const client = await getSupabaseClient();
  const user = await getSignedInUser();

  if (!user) {
    throw new Error("Please log in before deleting a character.");
  }

  const { error } = await client
    .from("characters")
    .delete()
    .eq("id", characterId)
    .eq("user_id", user.id);

  if (error) {
    throw error;
  }

  let imageCleanupError = null;
  if (imagePath) {
    const { error: storageError } = await client.storage
      .from(CHARACTER_IMAGE_BUCKET)
      .remove([imagePath]);
    imageCleanupError = storageError || null;
  }

  return { id: characterId, imageCleanupError };
}

async function createSignedCharacterImage(client, imagePath) {
  if (!imagePath) {
    return "";
  }

  const { data, error } = await client.storage
    .from(CHARACTER_IMAGE_BUCKET)
    .createSignedUrl(imagePath, 60 * 60);

  if (error) {
    throw error;
  }

  return data.signedUrl;
}

function ensureMessageIds(character) {
  character.messages = (character.messages || []).map((message) => ({
    ...message,
    id: isUuid(message.id) ? message.id : crypto.randomUUID(),
    at: validIsoDate(message.at)
  }));
}

function dataUrlToBlob(dataUrl) {
  const match = /^data:([^;,]+);base64,(.+)$/.exec(dataUrl);
  if (!match) {
    throw new Error("The generated character image is not in a supported format.");
  }

  const bytes = atob(match[2]);
  const buffer = new Uint8Array(bytes.length);
  for (let index = 0; index < bytes.length; index += 1) {
    buffer[index] = bytes.charCodeAt(index);
  }
  return new Blob([buffer], { type: match[1] });
}

function imageExtension(mimeType) {
  if (mimeType === "image/jpeg") {
    return "jpg";
  }
  if (mimeType === "image/webp") {
    return "webp";
  }
  return "png";
}

function validIsoDate(value) {
  const date = new Date(value || Date.now());
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ""));
}

window.getSignedInUser = getSignedInUser;
window.saveCharacterToAccount = saveCharacterToAccount;
window.loadCharacterFromAccount = loadCharacterFromAccount;
window.listCharactersFromAccount = listCharactersFromAccount;
window.renameCharacterInAccount = renameCharacterInAccount;
window.deleteCharacterFromAccount = deleteCharacterFromAccount;
