const editorSurface = document.querySelector(".color-editor-surface");
const leftColorGallery = document.querySelector(".editor-color-gallery-left");
const rightColorGallery = document.querySelector(".editor-color-gallery-right");
const finishButton = document.querySelector(".editor-finish");
const LEFT_COLORS = ["#B80B1F", "#E29544", "#EADB01", "#64955D", "#7AABD2", "#5D2D91"];
const RIGHT_COLORS = ["#6B4A42", "#727580", "#B0A6B6", "#E0E0E0", "#EBE8DB", "#000000"];

let composition = loadComposition();
let selectedPartId = composition.parts[0]?.id || null;
let activeColor = getSelectedPart()?.color || "#FFFFFF";

function getSelectedPart() {
  return composition.parts.find((part) => part.id === selectedPartId) || null;
}

function renderColorGalleries() {
  renderColorGallery(leftColorGallery, LEFT_COLORS);
  renderColorGallery(rightColorGallery, RIGHT_COLORS);
  updateColorGalleryState();
}

function renderColorGallery(gallery, colors) {
  gallery.innerHTML = "";

  colors.forEach((color) => {
    const button = document.createElement("button");
    button.className = "editor-color-item";
    button.type = "button";
    button.dataset.color = color;
    button.style.setProperty("--swatch-color", color);
    button.setAttribute("aria-label", `Use color ${color}`);

    const swatch = document.createElement("span");
    swatch.className = "editor-color-swatch";
    button.appendChild(swatch);

    button.addEventListener("click", () => {
      applyColor(color);
    });

    gallery.appendChild(button);
  });
}

function renderColorEditor() {
  editorSurface.innerHTML = "";

  composition.parts.forEach((part) => {
    const path = SEWING_SHAPES[wrapShapeIndex(part.shapeIndex)];
    const partElement = document.createElement("button");
    const shapeElement = createMaskedShape(path, part.color || "#FFFFFF", "editor-part-shape");

    partElement.className = "editor-part color-editor-part";
    partElement.type = "button";
    partElement.dataset.partId = part.id;
    partElement.style.left = `${part.x}%`;
    partElement.style.top = `${part.y}%`;
    partElement.style.width = `${part.size}%`;
    partElement.style.transform = `translate(-50%, -50%) rotate(${part.rotation}deg)`;
    partElement.setAttribute("aria-label", "Select shape to color");
    partElement.appendChild(shapeElement);

    if (part.id === selectedPartId) {
      partElement.classList.add("is-selected");
    }

    partElement.addEventListener("click", () => {
      selectedPartId = part.id;
      activeColor = part.color || "#FFFFFF";
      renderColorEditor();
      updateColorGalleryState();
    });

    editorSurface.appendChild(partElement);
  });
}

function applyColor(color) {
  activeColor = color;
  const selected = getSelectedPart();

  if (!selected) {
    updateColorGalleryState();
    return;
  }

  selected.color = color;
  saveComposition(composition);
  renderColorEditor();
  updateColorGalleryState();
}

function updateColorGalleryState() {
  document.querySelectorAll(".editor-color-item").forEach((button) => {
    const isActive = button.dataset.color?.toLowerCase() === activeColor.toLowerCase();
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  });
}

finishButton.addEventListener("click", () => {
  saveComposition(composition);
});

renderColorGalleries();
renderColorEditor();
