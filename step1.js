const editorSurface = document.querySelector(".editor-surface");
const leftGallery = document.querySelector(".editor-gallery-left");
const rightGallery = document.querySelector(".editor-gallery-right");
const colorPicker = document.querySelector(".editor-color-picker");
const finishButton = document.querySelector(".editor-finish");

let composition = { parts: [] };
let selectedPartId = null;
let activeAction = null;

function makePart(shapeIndex, clientX, clientY) {
  const rect = editorSurface.getBoundingClientRect();
  const x = clampValue(((clientX - rect.left) / rect.width) * 100, 6, 94);
  const y = clampValue(((clientY - rect.top) / rect.height) * 100, 6, 94);

  return {
    id: `shape-${Date.now()}-${Math.round(Math.random() * 10000)}`,
    shapeIndex,
    x,
    y,
    size: 18,
    rotation: 0,
    color: "#FFFFFF"
  };
}

function renderGalleries() {
  [leftGallery, rightGallery].forEach((gallery) => {
    gallery.innerHTML = "";
  });

  SEWING_SHAPES.forEach((path, index) => {
    const button = document.createElement("button");
    button.className = "editor-gallery-item";
    button.type = "button";
    button.dataset.shapeIndex = String(index);
    button.setAttribute("aria-label", `Drag shape ${index + 1}`);

    const icon = createMaskedShape(path, "#FFFFFF", "editor-gallery-icon");
    button.appendChild(icon);

    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      startGalleryDrag(event, index, button);
    });

    button.addEventListener("mousedown", (event) => {
      event.preventDefault();
      startGalleryDrag(event, index, button);
    });

    (index < 8 ? leftGallery : rightGallery).appendChild(button);
  });
}

function renderEditor() {
  editorSurface.innerHTML = "";

  composition.parts.forEach((part) => {
    const path = SEWING_SHAPES[wrapShapeIndex(part.shapeIndex)];
    const partElement = document.createElement("div");
    const shapeElement = createMaskedShape(path, part.color, "editor-part-shape");

    partElement.className = "editor-part";
    partElement.dataset.partId = part.id;
    partElement.style.left = `${part.x}%`;
    partElement.style.top = `${part.y}%`;
    partElement.style.width = `${part.size}%`;
    partElement.style.transform = `translate(-50%, -50%) rotate(${part.rotation}deg)`;
    partElement.appendChild(shapeElement);

    if (part.id === selectedPartId) {
      partElement.classList.add("is-selected");
      partElement.appendChild(makeHandle("resize", "Resize shape"));
      partElement.appendChild(makeHandle("rotate", "Rotate shape"));
    }

    partElement.addEventListener("pointerdown", (event) => {
      if (event.target.classList.contains("editor-handle")) {
        return;
      }

      event.preventDefault();
      selectPart(part.id);
      startPartMove(event, part.id, partElement);
    });

    partElement.addEventListener("mousedown", (event) => {
      if (event.target.classList.contains("editor-handle")) {
        return;
      }

      event.preventDefault();
      selectPart(part.id);
      startPartMove(event, part.id, partElement);
    });

    editorSurface.appendChild(partElement);
  });

  const selected = getSelectedPart();
  colorPicker.disabled = !selected;
  colorPicker.value = selected?.color || "#FFFFFF";

  finishButton.classList.toggle("is-disabled", composition.parts.length === 0);
  finishButton.setAttribute("aria-disabled", composition.parts.length === 0 ? "true" : "false");
}

function makeHandle(type, label) {
  const handle = document.createElement("span");
  handle.className = `editor-handle editor-handle-${type}`;
  handle.dataset.handle = type;
  handle.setAttribute("aria-label", label);

  handle.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const part = getSelectedPart();
    if (!part) {
      return;
    }

    if (type === "resize") {
      startResize(event, part.id, handle);
    } else {
      startRotate(event, part.id, handle);
    }
  });

  handle.addEventListener("mousedown", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const part = getSelectedPart();
    if (!part) {
      return;
    }

    if (type === "resize") {
      startResize(event, part.id, handle);
    } else {
      startRotate(event, part.id, handle);
    }
  });

  return handle;
}

function getSelectedPart() {
  return composition.parts.find((part) => part.id === selectedPartId) || null;
}

function findPart(partId) {
  return composition.parts.find((part) => part.id === partId) || null;
}

function selectPart(partId) {
  selectedPartId = partId;
  renderEditor();
}

function clearSelection(event) {
  if (event.target === editorSurface) {
    selectedPartId = null;
    renderEditor();
  }
}

function saveEditor() {
  saveComposition(composition);
}

function pointToPercent(clientX, clientY) {
  const rect = editorSurface.getBoundingClientRect();
  return {
    x: clampValue(((clientX - rect.left) / rect.width) * 100, 4, 96),
    y: clampValue(((clientY - rect.top) / rect.height) * 100, 4, 96)
  };
}

function partCenterPixels(part) {
  const rect = editorSurface.getBoundingClientRect();
  return {
    x: rect.left + (part.x / 100) * rect.width,
    y: rect.top + (part.y / 100) * rect.height,
    frameWidth: rect.width
  };
}

function startGalleryDrag(event, shapeIndex, sourceElement) {
  activeAction = {
    type: "gallery",
    pointerId: event.pointerId,
    shapeIndex,
    sourceElement
  };
  sourceElement.classList.add("is-pointer-dragging");

  if (event.pointerId !== undefined && sourceElement.setPointerCapture) {
    sourceElement.setPointerCapture(event.pointerId);
  }
}

function startPartMove(event, partId, sourceElement) {
  const part = findPart(partId);
  activeAction = {
    type: "move",
    pointerId: event.pointerId,
    partId,
    sourceElement,
    offsetX: event.clientX - partCenterPixels(part).x,
    offsetY: event.clientY - partCenterPixels(part).y
  };

  sourceElement.classList.add("is-pointer-dragging");

  if (event.pointerId !== undefined && sourceElement.setPointerCapture) {
    sourceElement.setPointerCapture(event.pointerId);
  }
}

function startResize(event, partId, sourceElement) {
  const part = findPart(partId);
  const center = partCenterPixels(part);
  const distance = Math.hypot(event.clientX - center.x, event.clientY - center.y);

  activeAction = {
    type: "resize",
    pointerId: event.pointerId,
    partId,
    sourceElement,
    startDistance: Math.max(distance, 1),
    startSize: part.size
  };

  if (event.pointerId !== undefined && sourceElement.setPointerCapture) {
    sourceElement.setPointerCapture(event.pointerId);
  }
}

function startRotate(event, partId, sourceElement) {
  const part = findPart(partId);
  const center = partCenterPixels(part);
  const startAngle = Math.atan2(event.clientY - center.y, event.clientX - center.x) * 180 / Math.PI;

  activeAction = {
    type: "rotate",
    pointerId: event.pointerId,
    partId,
    sourceElement,
    startAngle,
    startRotation: part.rotation
  };

  if (event.pointerId !== undefined && sourceElement.setPointerCapture) {
    sourceElement.setPointerCapture(event.pointerId);
  }
}

function updateAction(event) {
  if (!activeAction || (activeAction.pointerId !== undefined && event.pointerId !== undefined && activeAction.pointerId !== event.pointerId)) {
    return;
  }

  if (activeAction.type === "move") {
    const adjusted = pointToPercent(event.clientX - activeAction.offsetX, event.clientY - activeAction.offsetY);
    const part = findPart(activeAction.partId);
    part.x = adjusted.x;
    part.y = adjusted.y;
    renderEditor();
    return;
  }

  if (activeAction.type === "resize") {
    const part = findPart(activeAction.partId);
    const center = partCenterPixels(part);
    const distance = Math.hypot(event.clientX - center.x, event.clientY - center.y);
    const nextSize = activeAction.startSize * (distance / activeAction.startDistance);
    part.size = clampValue(nextSize, 5, 70);
    renderEditor();
    return;
  }

  if (activeAction.type === "rotate") {
    const part = findPart(activeAction.partId);
    const center = partCenterPixels(part);
    const angle = Math.atan2(event.clientY - center.y, event.clientX - center.x) * 180 / Math.PI;
    part.rotation = activeAction.startRotation + angle - activeAction.startAngle;
    renderEditor();
  }
}

function finishAction(event) {
  if (!activeAction || (activeAction.pointerId !== undefined && event.pointerId !== undefined && activeAction.pointerId !== event.pointerId)) {
    return;
  }

  const action = activeAction;
  activeAction = null;

  action.sourceElement?.classList.remove("is-pointer-dragging");
  if (event.pointerId !== undefined && action.sourceElement?.releasePointerCapture) {
    action.sourceElement.releasePointerCapture(event.pointerId);
  }

  if (action.type === "gallery") {
    const rect = editorSurface.getBoundingClientRect();
    const inside = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;

    if (inside) {
      const part = makePart(action.shapeIndex, event.clientX, event.clientY);
      composition.parts.push(part);
      selectedPartId = part.id;
    }
  }

  renderEditor();
  saveEditor();
}

function cancelAction() {
  activeAction?.sourceElement?.classList.remove("is-pointer-dragging");
  activeAction = null;
}

colorPicker.addEventListener("input", () => {
  const selected = getSelectedPart();
  if (!selected) {
    return;
  }

  selected.color = colorPicker.value;
  renderEditor();
  saveEditor();
});

finishButton.addEventListener("click", (event) => {
  if (composition.parts.length === 0) {
    event.preventDefault();
    return;
  }

  saveEditor();
});

editorSurface.addEventListener("pointerdown", clearSelection);
document.addEventListener("pointermove", updateAction);
document.addEventListener("mousemove", updateAction);
document.addEventListener("pointerup", finishAction);
document.addEventListener("mouseup", finishAction);
document.addEventListener("pointercancel", cancelAction);

renderGalleries();
renderEditor();
saveEditor();
