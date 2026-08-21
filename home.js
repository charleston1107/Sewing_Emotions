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

function rectanglesOverlap(first, second) {
  return first.left < second.right
    && first.right > second.left
    && first.top < second.bottom
    && first.bottom > second.top;
}

function moveCharacterAwayFromCloths(link, index, seed) {
  const zones = window.homeSewingAvoidanceZones || [];
  if (zones.length === 0 || !link.isConnected) return;
  const titleRect = document.querySelector(".title-button")?.getBoundingClientRect();
  const blockedZones = titleRect
    ? [...zones, {
        left: titleRect.left - 18,
        right: titleRect.right + 18,
        top: titleRect.top - 18,
        bottom: titleRect.bottom + 18
      }]
    : zones;

  const [originalLeft, originalTop] = characterPosition(index, seed);
  link.style.left = originalLeft;
  link.style.top = originalTop;

  const linkWidth = link.offsetWidth;
  const linkHeight = link.offsetHeight;
  const currentCandidate = [link.offsetLeft, link.offsetTop];
  const safeSlots = window.innerWidth < 720
    ? [[0.03, 0.61], [0.7, 0.61], [0.36, 0.25], [0.03, 0.76], [0.7, 0.76], [0.36, 0.82], [0.03, 0.24], [0.7, 0.24]]
    : [[0.02, 0.53], [0.84, 0.53], [0.25, 0.04], [0.66, 0.04], [0.02, 0.73], [0.84, 0.73], [0.23, 0.8], [0.68, 0.8], [0.42, 0.03]];
  const orderedCandidates = [
    currentCandidate,
    ...safeSlots.map((slot, slotIndex) => {
      const horizontalNudge = (seeded(seed + slotIndex * 7) - 0.5) * 18;
      const verticalNudge = (seeded(seed + slotIndex * 11) - 0.5) * 14;
      return [window.innerWidth * slot[0] + horizontalNudge, window.innerHeight * slot[1] + verticalNudge];
    })
  ];

  const safeCandidate = orderedCandidates.find(([left, top]) => {
    const candidate = {
      left,
      right: left + linkWidth,
      top,
      bottom: top + linkHeight
    };
    const withinViewport = candidate.left >= 8
      && candidate.top >= 8
      && candidate.right <= window.innerWidth - 8
      && candidate.bottom <= window.innerHeight - 8;
    return withinViewport && blockedZones.every((zone) => !rectanglesOverlap(candidate, zone));
  });

  if (safeCandidate) {
    link.style.left = `${safeCandidate[0]}px`;
    link.style.top = `${safeCandidate[1]}px`;
  }
}

function repositionSavedCharacters() {
  document.querySelectorAll(".home-design-character").forEach((link, index) => {
    moveCharacterAwayFromCloths(link, index, Number(link.dataset.homeSeed));
  });
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
  link.dataset.homeSeed = seed;
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
  requestAnimationFrame(() => moveCharacterAwayFromCloths(link, index, seed));
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
window.addEventListener("home-sewing-zones-updated", repositionSavedCharacters);
