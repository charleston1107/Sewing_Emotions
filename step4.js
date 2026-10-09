const plushieFrame = document.querySelector(".result-plushie-frame");
const patternFrame = document.querySelector(".result-pattern-frame");
const imageUrl = localStorage.getItem("sewing-emotions-generated-image");

if (imageUrl) {
  const image = document.createElement("img");
  image.className = "step4-generated-image";
  image.src = imageUrl;
  image.alt = "Generated emotion character";
  plushieFrame.appendChild(image);
} else {
  showEmptyMessage(plushieFrame);
}

loadPatternImage();

async function loadPatternImage() {
  try {
    const patternUrl = await window.sewingGeneratedImageStorage.getPatternImageUrl();
    if (!patternUrl) {
      showEmptyMessage(patternFrame);
      return;
    }

    const image = document.createElement("img");
    image.className = "step4-generated-image";
    image.src = patternUrl;
    image.alt = "Generated fabric sewing pattern";
    image.addEventListener("load", () => URL.revokeObjectURL(patternUrl), { once: true });
    patternFrame.appendChild(image);
  } catch (error) {
    console.error("The sewing pattern could not be loaded.", error);
    showEmptyMessage(patternFrame);
  }
}

function showEmptyMessage(frame) {
  const message = document.createElement("p");
  message.className = "step4-empty-message";
  message.textContent = window.sewingI18n.t("No generated image yet.");
  frame.appendChild(message);
}
