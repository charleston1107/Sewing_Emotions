const welcomeLine = document.querySelector(".welcome-line");
const breathingCircle = document.querySelector(".breathing-circle");
const introLines = [
  "Before you start designing the plushie,",
  "Let's take a moment to calm down and breathe."
];

let introIndex = 0;

function showIntroLine() {
  if (introIndex >= introLines.length) {
    welcomeLine.classList.remove("is-visible");
    window.setTimeout(startBreathing, 650);
    return;
  }

  welcomeLine.textContent = introLines[introIndex];
  welcomeLine.classList.remove("is-visible");

  window.requestAnimationFrame(() => {
    welcomeLine.classList.add("is-visible");
  });

  window.setTimeout(() => {
    welcomeLine.classList.remove("is-visible");
    introIndex += 1;
    window.setTimeout(showIntroLine, 650);
  }, 2400);
}

function startBreathing() {
  breathingCircle.classList.add("is-active");
  window.setTimeout(() => {
    window.location.href = "step1.html";
  }, 18000);
}

showIntroLine();
