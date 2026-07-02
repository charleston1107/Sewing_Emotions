const compositionSurface = document.querySelector(".composition-surface");
const colorPicker = document.querySelector(".color-picker");
const colorInstruction = document.querySelector(".color-instruction");
const partsInstruction = document.querySelector(".parts-instruction");
const partsGallery = document.querySelector(".parts-gallery");
const finishButton = document.querySelector(".finish-button");

let composition = loadComposition();
let activePointerDrag = null;

function refreshComposition() {
  const body = renderComposition(compositionSurface, composition, { returnBody: true });
  body.classList.add("body-drop-target");
  attachPlacedPartHandlers();
}

function showPartsInstruction() {
  colorInstruction.classList.add("is-hidden");
  partsInstruction.classList.remove("is-hidden");
}

function enableFinish() {
  finishButton.classList.remove("is-disabled");
  finishButton.setAttribute("aria-disabled", "false");
}

function isInsideSurface(clientX, clientY) {
  const rect = compositionSurface.getBoundingClientRect();
  return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
}

function addPartAt(shapeIndex, clientX, clientY) {
  const rect = compositionSurface.getBoundingClientRect();
  const x = clampValue(((clientX - rect.left) / rect.width) * 100, 8, 92);
  const y = clampValue(((clientY - rect.top) / rect.height) * 100, 8, 92);
  const size = 16;
  const rotation = Math.round((Math.random() * 34) - 17);

  composition.parts.push({ shapeIndex: wrapShapeIndex(shapeIndex), x, y, size, rotation, color: "#FFFFFF" });
  saveComposition(composition);
  refreshComposition();
  showPartsInstruction();
  enableFinish();
}

function movePartTo(partIndex, clientX, clientY) {
  const rect = compositionSurface.getBoundingClientRect();
  composition.parts[partIndex].x = clampValue(((clientX - rect.left) / rect.width) * 100, 8, 92);
  composition.parts[partIndex].y = clampValue(((clientY - rect.top) / rect.height) * 100, 8, 92);
  saveComposition(composition);
  refreshComposition();
}

function applyBodyColor(color) {
  composition.bodyColor = color;
  saveComposition(composition);
  refreshComposition();
  showPartsInstruction();
}

function startPointerDrag(event, payload, sourceElement) {
  activePointerDrag = {
    payload,
    pointerId: event.pointerId,
    sourceElement,
    startX: event.clientX,
    startY: event.clientY,
    moved: false
  };
  sourceElement.classList.add("is-pointer-dragging");
  if (event.pointerId !== undefined && sourceElement.setPointerCapture) {
    sourceElement.setPointerCapture(event.pointerId);
  }
}

function finishPointerDrag(event) {
  if (!activePointerDrag || (activePointerDrag.pointerId !== undefined && event.pointerId !== undefined && activePointerDrag.pointerId !== event.pointerId)) {
    return;
  }

  const sourceElement = activePointerDrag.sourceElement;
  sourceElement.classList.remove("is-pointer-dragging");
  if (event.pointerId !== undefined && sourceElement.releasePointerCapture) {
    sourceElement.releasePointerCapture(event.pointerId);
  }

  const payload = activePointerDrag.payload;
  activePointerDrag = null;

  if (!isInsideSurface(event.clientX, event.clientY)) {
    return;
  }

  if (payload.type === "color") {
    applyBodyColor(payload.color());
    return;
  }

  if (payload.type === "shape") {
    addPartAt(payload.shapeIndex, event.clientX, event.clientY);
    return;
  }

  if (payload.type === "move-part") {
    movePartTo(payload.partIndex, event.clientX, event.clientY);
  }
}

function attachPlacedPartHandlers() {
  compositionSurface.querySelectorAll(".placed-part").forEach((part) => {
    const partIndex = Number(part.dataset.partIndex);
    part.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      startPointerDrag(event, { type: "move-part", partIndex }, part);
    });
    part.addEventListener("mousedown", (event) => {
      event.preventDefault();
      startPointerDrag(event, { type: "move-part", partIndex }, part);
    });
  });
}

function renderGallery() {
  partsGallery.innerHTML = "";
  SEWING_SHAPES.forEach((path, index) => {
    const item = document.createElement("button");
    item.className = "gallery-shape";
    item.type = "button";
    item.draggable = false;
    item.setAttribute("aria-label", `Drag shape ${index + 1}`);
    item.dataset.shapeIndex = String(index);

    const icon = createMaskedShape(path, "#FFFFFF", "gallery-shape-icon");
    item.appendChild(icon);

    item.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      startPointerDrag(event, { type: "shape", shapeIndex: index }, item);
    });

    item.addEventListener("mousedown", (event) => {
      event.preventDefault();
      startPointerDrag(event, { type: "shape", shapeIndex: index }, item);
    });

    item.addEventListener("pointermove", (event) => {
      if (activePointerDrag?.pointerId === event.pointerId) {
        activePointerDrag.moved = Math.abs(event.clientX - activePointerDrag.startX) > 3 || Math.abs(event.clientY - activePointerDrag.startY) > 3;
      }
    });

    partsGallery.appendChild(item);
  });
}

colorPicker.addEventListener("input", () => {
  applyBodyColor(colorPicker.value);
});

document.addEventListener("mousemove", (event) => {
  if (!activePointerDrag || activePointerDrag.pointerId !== undefined) {
    return;
  }

  activePointerDrag.moved = Math.abs(event.clientX - activePointerDrag.startX) > 3 || Math.abs(event.clientY - activePointerDrag.startY) > 3;
});

document.addEventListener("pointerup", finishPointerDrag);
document.addEventListener("mouseup", finishPointerDrag);
document.addEventListener("pointercancel", () => {
  activePointerDrag?.sourceElement.classList.remove("is-pointer-dragging");
  activePointerDrag = null;
});

compositionSurface.addEventListener("dragover", (event) => {
  event.preventDefault();
  event.dataTransfer.dropEffect = "copy";
});

compositionSurface.addEventListener("drop", (event) => {
  event.preventDefault();
  const data = event.dataTransfer.getData("text/plain");

  const shapeIndex = data.startsWith("shape:") ? Number(data.replace("shape:", "")) : NaN;
  if (Number.isNaN(shapeIndex)) {
    return;
  }

  addPartAt(shapeIndex, event.clientX, event.clientY);
});

finishButton.addEventListener("click", (event) => {
  if (finishButton.classList.contains("is-disabled")) {
    event.preventDefault();
    return;
  }

  saveComposition(composition);
});

colorPicker.value = composition.bodyColor;
renderGallery();
refreshComposition();

if (composition.parts.length > 0) {
  showPartsInstruction();
  enableFinish();
}
