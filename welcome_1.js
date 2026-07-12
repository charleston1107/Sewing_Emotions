const welcomeLine = document.querySelector(".welcome-line");
const welcomeStage = document.querySelector(".welcome-stage");
const welcomeLines = [
  { text: "Welcome to sewing emotions.", duration: 5000 },
  { text: "Have you ever tried to look at your negative emotions carefully.", duration: 3000 },
  { text: "Understand them.", duration: 3000 },
  { text: "Talk to them.", duration: 3000 },
  { text: "Your negative emotions will be seen here.", duration: 3000 },
  { text: "And your will turn them into plushies with your own hand.", duration: 4000 }
];

let welcomeIndex = 0;

function showWelcomeLine() {
  if (welcomeIndex >= welcomeLines.length) {
    welcomeStage.classList.add("is-whiting-out");
    window.setTimeout(() => {
      window.location.href = "welcome_2.html";
    }, 1600);
    return;
  }

  const line = welcomeLines[welcomeIndex];
  welcomeLine.textContent = line.text;
  welcomeLine.classList.remove("is-visible");

  window.requestAnimationFrame(() => {
    welcomeLine.classList.add("is-visible");
  });

  window.setTimeout(() => {
    welcomeLine.classList.remove("is-visible");
    welcomeIndex += 1;
    window.setTimeout(showWelcomeLine, 650);
  }, line.duration);
}

showWelcomeLine();
