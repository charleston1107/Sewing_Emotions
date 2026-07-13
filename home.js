const characterField = document.querySelector(".character-field");

const palette = [
  { body: "#F75F8F", face: "#FFE34F", line: "#2E75B6" },
  { body: "#33C27F", face: "#FFDB47", line: "#2F3C76" },
  { body: "#51A9E3", face: "#F7A0C5", line: "#603B27" },
  { body: "#FF8A00", face: "#F6A4BD", line: "#3B6F4B" },
  { body: "#A2C5E1", face: "#FFE36A", line: "#2F3C76" },
  { body: "#FFD43B", face: "#FF8AAF", line: "#0F9B72" }
];

const positions = [
  ["9%", "15%"], ["27%", "10%"], ["68%", "12%"], ["84%", "20%"],
  ["13%", "55%"], ["31%", "68%"], ["70%", "66%"], ["86%", "52%"],
  ["49%", "12%"], ["49%", "78%"]
];

const shapes = ["blob", "round", "rect", "triangle", "capsule"];

function seeded(seed) {
  const value = Math.sin(seed * 9283.63) * 10000;
  return value - Math.floor(value);
}

function shapePath(shape, seed) {
  if (shape === "round") {
    return '<ellipse cx="78" cy="76" rx="48" ry="52" />';
  }

  if (shape === "rect") {
    return '<rect x="31" y="25" width="94" height="96" rx="24" />';
  }

  if (shape === "triangle") {
    return '<path d="M80 19 L132 122 L24 121 Z" />';
  }

  if (shape === "capsule") {
    return '<rect x="25" y="36" width="110" height="76" rx="38" transform="rotate(-8 80 74)" />';
  }

  const a = Math.round(12 + seeded(seed) * 10);
  return `<path d="M79 ${18 + a / 4} C115 16 134 38 132 76 C130 112 106 131 74 126 C39 121 21 98 25 64 C28 35 47 19 79 ${18 + a / 4} Z" />`;
}

function faceExpression(seed) {
  const mood = seed % 4;
  if (mood === 0) {
    return '<path class="crayon-line" d="M66 82 C72 89 84 89 91 82" stroke-width="4" />';
  }
  if (mood === 1) {
    return '<path class="crayon-line" d="M68 86 C75 80 84 80 91 86" stroke-width="4" />';
  }
  if (mood === 2) {
    return '<path class="crayon-line" d="M69 83 L90 83" stroke-width="4" />';
  }
  return '<ellipse cx="80" cy="85" rx="6" ry="8" fill="var(--line)" />';
}

function createCharacter(index) {
  const button = document.createElement("button");
  const colors = palette[index % palette.length];
  const shape = shapes[index % shapes.length];
  const [left, top] = positions[index];
  const tilt = Math.round(seeded(index + 3) * 28 - 14);

  button.className = "emo-character";
  button.type = "button";
  button.setAttribute("aria-label", "Open emotion library");
  button.style.left = left;
  button.style.top = top;
  button.style.setProperty("--tilt", `${tilt}deg`);
  button.style.setProperty("--float-duration", `${8 + seeded(index + 8) * 5}s`);
  button.style.setProperty("--float-delay", `${seeded(index + 11) * -7}s`);
  button.style.setProperty("--line", colors.line);

  button.innerHTML = `
    <svg viewBox="0 0 160 160" role="img" aria-hidden="true">
      <g fill="${colors.body}">
        ${shapePath(shape, index)}
        <path d="M36 83 C22 87 17 99 21 110" class="crayon-line" stroke="${colors.body}" stroke-width="13" />
        <path d="M124 79 C139 84 144 96 139 108" class="crayon-line" stroke="${colors.body}" stroke-width="13" />
        <path d="M60 122 C56 135 50 143 42 147" class="crayon-line" stroke="${colors.body}" stroke-width="12" />
        <path d="M99 121 C105 134 111 142 119 146" class="crayon-line" stroke="${colors.body}" stroke-width="12" />
      </g>
      <ellipse cx="80" cy="75" rx="31" ry="26" fill="${colors.face}" opacity="0.96" />
      <path d="M58 57 C68 48 80 45 97 52" class="crayon-line" stroke-width="5" />
      <circle cx="68" cy="73" r="4" fill="var(--line)" />
      <circle cx="92" cy="73" r="4" fill="var(--line)" />
      ${faceExpression(index)}
      <path d="M34 33 C47 25 53 25 65 34" class="crayon-line" stroke-width="4" opacity="0.75" />
      <path d="M103 36 C113 30 119 31 127 40" class="crayon-line" stroke-width="4" opacity="0.65" />
    </svg>
  `;

  button.addEventListener("click", () => {
    window.location.href = "emo_library.html";
  });

  characterField.appendChild(button);
}

positions.forEach((_, index) => createCharacter(index));

function createSavedCharacterEntry() {
  if (typeof loadCharacters !== "function") {
    return;
  }

  const characters = loadCharacters();
  const character = characters.at(-1) || loadCurrentCharacter();
  if (!character?.imageUrl) {
    return;
  }

  const seed = Array.from(character.id || "emotion").reduce((total, char) => total + char.charCodeAt(0), 0);
  const button = document.createElement("button");
  const image = document.createElement("img");

  button.className = "saved-home-character";
  button.type = "button";
  button.setAttribute("aria-label", "Open saved emotion character");
  button.style.left = `${12 + seeded(seed) * 68}%`;
  button.style.top = `${14 + seeded(seed + 17) * 62}%`;
  button.style.setProperty("--float-duration", `${9 + seeded(seed + 4) * 4}s`);
  button.style.setProperty("--float-delay", `${seeded(seed + 9) * -5}s`);

  image.src = character.imageUrl;
  image.alt = "";
  button.appendChild(image);

  button.addEventListener("click", () => {
    saveCurrentCharacter(character);
    window.location.href = "emo_library.html";
  });

  characterField.appendChild(button);
}

createSavedCharacterEntry();
