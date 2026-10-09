const generatedImage = localStorage.getItem(GENERATED_IMAGE_KEY) || "";
const generatedFrame = document.querySelector(".sewing-generated-frame");

if (generatedImage) {
  const image = document.createElement("img");
  image.className = "sewing-generated-image";
  image.src = generatedImage;
  image.alt = "Generated plushie reference";
  generatedFrame.appendChild(image);
} else {
  const message = document.createElement("p");
  message.className = "sewing-empty-message";
  message.textContent = window.sewingI18n.t("No generated image yet.");
  generatedFrame.appendChild(message);
}

const character = loadCurrentCharacter();
character.imageUrl = generatedImage || character.imageUrl;
saveCurrentCharacter(character);

let audioContext = null;
let ambientNodes = [];

function startMeditationSound() {
  if (audioContext) {
    audioContext.resume();
    return;
  }

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;

  audioContext = new AudioContextClass();
  const master = audioContext.createGain();
  master.gain.value = 0.035;
  master.connect(audioContext.destination);

  [174, 220, 261.63].forEach((frequency, index) => {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency + Math.random() * 3;
    gain.gain.value = index === 0 ? 0.75 : 0.38;
    oscillator.connect(gain);
    gain.connect(master);
    oscillator.start();
    ambientNodes.push(oscillator, gain);
  });
}

window.addEventListener("pointerdown", startMeditationSound, { once: true });
document.querySelector(".sewing-finish-button").addEventListener("click", () => {
  ambientNodes.forEach((node) => {
    if (typeof node.stop === "function") node.stop();
  });
});
