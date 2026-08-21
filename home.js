const characterField = document.querySelector(".character-field");

function seeded(seed) {
  const value = Math.sin(seed * 9283.63) * 10000;
  return value - Math.floor(value);
}

function characterSeed(character, index) {
  return Array.from(character.id || `emotion-${index}`).reduce(
    (total, characterLetter) => total + characterLetter.charCodeAt(0),
    index + 1
  );
}

function characterPosition(index, seed) {
  const desktopPositions = [
    ["5%", "12%"], ["23%", "8%"], ["67%", "10%"], ["84%", "18%"],
    ["7%", "58%"], ["25%", "72%"], ["68%", "70%"], ["86%", "57%"],
    ["47%", "7%"], ["48%", "79%"]
  ];
  const base = desktopPositions[index % desktopPositions.length];
  const cycle = Math.floor(index / desktopPositions.length);
  const horizontalNudge = (seeded(seed + cycle) - 0.5) * 8;
  const verticalNudge = (seeded(seed + cycle + 13) - 0.5) * 7;

  return [
    `calc(${base[0]} + ${horizontalNudge.toFixed(1)}vw)`,
    `calc(${base[1]} + ${verticalNudge.toFixed(1)}vh)`
  ];
}

function createSavedDesign(character, index) {
  const composition = character.designChoices?.composition;
  if (!Array.isArray(composition?.parts) || composition.parts.length === 0) {
    return;
  }

  const seed = characterSeed(character, index);
  const [left, top] = characterPosition(index, seed);
  const link = document.createElement("a");
  const surface = document.createElement("span");

  link.className = "home-design-character";
  link.href = `emo_library.html?character=${encodeURIComponent(character.id)}`;
  link.setAttribute("aria-label", `Open ${character.name || "saved emotion"}`);
  link.style.left = left;
  link.style.top = top;
  link.style.setProperty("--tilt", `${Math.round(seeded(seed + 4) * 18 - 9)}deg`);
  link.style.setProperty("--float-duration", `${8 + seeded(seed + 8) * 5}s`);
  link.style.setProperty("--float-delay", `${seeded(seed + 11) * -7}s`);

  surface.className = "character-design-surface";
  renderCharacterDesign(surface, composition);
  link.appendChild(surface);
  characterField.appendChild(link);
}

async function showSignedInCharacters() {
  try {
    const result = await listCharactersFromAccount({ includeImages: false });
    if (result.requiresLogin) {
      return;
    }

    result.characters.forEach(createSavedDesign);
  } catch (error) {
    console.warn("The landing-page characters could not load.", error);
  }
}

showSignedInCharacters();
