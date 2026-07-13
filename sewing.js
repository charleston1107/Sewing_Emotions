const generatedImage = localStorage.getItem(GENERATED_IMAGE_KEY) || "";
const character = loadCurrentCharacter();
character.imageUrl = generatedImage || character.imageUrl;
saveCurrentCharacter(character);

let audioContext = null;
let ambientNodes = [];

function startMeditationPlaceholder() {
  if (audioContext) {
    audioContext.resume();
    return;
  }

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    return;
  }

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

startMeditationPlaceholder();
window.addEventListener("pointerdown", startMeditationPlaceholder, { once: true });
document.querySelector(".sewing-finish-button").addEventListener("click", () => {
  ambientNodes.forEach((node) => {
    if (typeof node.stop === "function") {
      node.stop();
    }
  });
});
