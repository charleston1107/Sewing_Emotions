const characterField = document.querySelector(".character-field");
const CHARACTER_DRAG_THRESHOLD = 8;

/*
 * HOMEPAGE EMOTION CHARACTER BACKUP
 *
 * This feature is intentionally paused, but all of its rendering, positioning,
 * dragging, and archive-link code remains below. Change this flag to `true` to
 * restore saved emotion characters on the homepage.
 */
const HOME_EMOTION_CHARACTERS_ENABLED = false;

characterField.hidden = !HOME_EMOTION_CHARACTERS_ENABLED;
characterField.setAttribute("aria-hidden", String(!HOME_EMOTION_CHARACTERS_ENABLED));

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
    if (link.dataset.userPositioned === "true") {
      keepCharacterInsideViewport(link);
    } else {
      moveCharacterAwayFromCloths(link, index, Number(link.dataset.homeSeed));
    }
  });
}

function keepCharacterInsideViewport(link) {
  const fieldRect = characterField.getBoundingClientRect();
  const maxLeft = Math.max(8, fieldRect.width - link.offsetWidth - 8);
  const maxTop = Math.max(8, fieldRect.height - link.offsetHeight - 8);
  const left = Math.min(maxLeft, Math.max(8, link.offsetLeft));
  const top = Math.min(maxTop, Math.max(8, link.offsetTop));
  link.style.left = `${left}px`;
  link.style.top = `${top}px`;
}

function makeCharacterDraggable(link) {
  let drag = null;
  let suppressClickUntil = 0;

  link.draggable = false;
  link.addEventListener("dragstart", (event) => event.preventDefault());

  link.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || event.isPrimary === false) return;
    const rect = link.getBoundingClientRect();
    drag = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      moving: false
    };
    link.setPointerCapture(event.pointerId);
  });

  link.addEventListener("pointermove", (event) => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const distance = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);

    if (!drag.moving && distance < CHARACTER_DRAG_THRESHOLD) return;
    if (!drag.moving) {
      const fieldRect = characterField.getBoundingClientRect();
      const rect = link.getBoundingClientRect();
      link.style.left = `${rect.left - fieldRect.left}px`;
      link.style.top = `${rect.top - fieldRect.top}px`;
      link.classList.add("is-home-dragging");
      drag.moving = true;
    }

    event.preventDefault();
    const fieldRect = characterField.getBoundingClientRect();
    const maxLeft = Math.max(8, fieldRect.width - link.offsetWidth - 8);
    const maxTop = Math.max(8, fieldRect.height - link.offsetHeight - 8);
    const left = Math.min(maxLeft, Math.max(8, event.clientX - fieldRect.left - drag.offsetX));
    const top = Math.min(maxTop, Math.max(8, event.clientY - fieldRect.top - drag.offsetY));
    link.style.left = `${left}px`;
    link.style.top = `${top}px`;
  });

  const finishDrag = (event, cancelled = false) => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    if (link.hasPointerCapture(event.pointerId)) {
      link.releasePointerCapture(event.pointerId);
    }
    if (drag.moving) {
      suppressClickUntil = cancelled ? 0 : performance.now() + 500;
      link.dataset.userPositioned = "true";
      link.classList.remove("is-home-dragging");
      keepCharacterInsideViewport(link);
    }
    drag = null;
  };

  link.addEventListener("pointerup", finishDrag);
  link.addEventListener("pointercancel", (event) => finishDrag(event, true));
  link.addEventListener("click", (event) => {
    if (performance.now() > suppressClickUntil) return;
    event.preventDefault();
    suppressClickUntil = 0;
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
  makeCharacterDraggable(link);

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

// Keep initialization disabled with the feature flag so no characters are
// fetched, rendered, draggable, or linked from the homepage while paused.
if (HOME_EMOTION_CHARACTERS_ENABLED) {
  showSignedInCharacters();
  window.addEventListener("home-sewing-zones-updated", repositionSavedCharacters);
}
