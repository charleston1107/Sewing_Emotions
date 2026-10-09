const drawingSurface = document.querySelector(".drawing-surface");
const canvas = document.querySelector(".drawing-canvas");
const context = canvas.getContext("2d");
const generateButton = document.querySelector(".generate-button");
const generateStatus = document.querySelector(".generate-status");
const generationBreathingOverlay = document.querySelector(".generation-breathing-overlay");
const brushToggle = document.querySelector(".brush-toggle");
const brushPulse = document.querySelector(".brush-pulse");
const instructionCloud = document.querySelector(".instruction-cloud");
const instructionCloudText = document.querySelector(".instruction-cloud-text");
const instructionCloudSkip = document.querySelector(".instruction-cloud-skip");
const browGallery = document.querySelector(".face-gallery-brows");
const eyeGallery = document.querySelector(".face-gallery-eyes");
const mouthGallery = document.querySelector(".face-gallery-mouths");
const FACE_ASSETS = {
  brow: ["assets/face/brow_0.png", "assets/face/brow_1.png", "assets/face/brow_2.png", "assets/face/brow_3.png"],
  eye: ["assets/face/eye_0.png", "assets/face/eye_1.png", "assets/face/eye_2.png", "assets/face/eye_3.png"],
  mouth: ["assets/face/mouth_0.png", "assets/face/mouth_1.png", "assets/face/mouth_2.png", "assets/face/mouth_3.png"]
};
const FACE_INSTRUCTIONS = [
  "Drag and drop facial expressions to your plushie.",
  "Optionally, you can use the brush to draw on your plushie's face."
];

const composition = loadComposition();
composition.faceParts = Array.isArray(composition.faceParts) ? composition.faceParts : [];
composition.drawingStrokes = Array.isArray(composition.drawingStrokes) ? composition.drawingStrokes : [];

const imageCache = new Map();
let drawing = false;
let drawingEnabled = false;
let lastPoint = null;
let activeStroke = null;
let activeDrag = null;
let faceInstructionStep = 0;
let faceInstructionsComplete = false;

renderFaceGalleries();
updateInstructionCloud();
renderBoard();
resizeCanvas();

function renderFaceGalleries() {
  renderFaceGallery(browGallery, "brow", FACE_ASSETS.brow);
  renderFaceGallery(eyeGallery, "eye", FACE_ASSETS.eye);
  renderFaceGallery(mouthGallery, "mouth", FACE_ASSETS.mouth);
}

function renderFaceGallery(gallery, type, assets) {
  gallery.innerHTML = "";

  assets.forEach((src, index) => {
    const button = document.createElement("button");
    button.className = "face-gallery-item";
    button.type = "button";
    button.dataset.faceType = type;
    button.dataset.faceIndex = String(index);
    button.setAttribute("aria-label", `Drag ${type} ${index + 1}`);

    const image = document.createElement("img");
    image.src = src;
    image.alt = "";
    button.appendChild(image);

    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      startFaceDrag(event, type, index, button);
    });

    button.addEventListener("mousedown", (event) => {
      event.preventDefault();
      startFaceDrag(event, type, index, button);
    });

    gallery.appendChild(button);
  });
}

function renderBoard() {
  renderComposition(drawingSurface, composition);

  composition.faceParts.forEach((part) => {
    const image = document.createElement("img");
    image.className = "placed-face-part";
    image.src = faceSrc(part);
    image.alt = "";
    image.dataset.facePartId = part.id;
    image.style.left = `${part.x}%`;
    image.style.top = `${part.y}%`;
    image.style.width = `${part.size}%`;
    image.style.transform = `translate(-50%, -50%) rotate(${part.rotation || 0}deg)`;

    image.addEventListener("pointerdown", (event) => {
      if (drawingEnabled) {
        return;
      }

      event.preventDefault();
      startPlacedFaceMove(event, part.id, image);
    });

    image.addEventListener("mousedown", (event) => {
      if (drawingEnabled) {
        return;
      }

      event.preventDefault();
      startPlacedFaceMove(event, part.id, image);
    });

    drawingSurface.appendChild(image);
  });
}

function faceSrc(part) {
  return FACE_ASSETS[part.type]?.[part.index] || "";
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.round(rect.width * ratio);
  canvas.height = Math.round(rect.height * ratio);
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.lineWidth = 4;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.strokeStyle = "#603B27";
  redrawDrawingStrokes();
}

function pointFromEvent(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  };
}

function normalizedDrawingPoint(point) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: clampValue((point.x / rect.width) * 100, 0, 100),
    y: clampValue((point.y / rect.height) * 100, 0, 100)
  };
}

function redrawDrawingStrokes() {
  const rect = canvas.getBoundingClientRect();

  composition.drawingStrokes.forEach((stroke) => {
    const points = Array.isArray(stroke.points) ? stroke.points : [];
    if (points.length === 0) {
      return;
    }

    context.beginPath();
    context.lineWidth = ((Number(stroke.width) || 0.46) / 100) * rect.width;
    context.strokeStyle = stroke.color || "#603B27";
    context.moveTo((points[0].x / 100) * rect.width, (points[0].y / 100) * rect.height);

    if (points.length === 1) {
      context.lineTo((points[0].x / 100) * rect.width + 0.01, (points[0].y / 100) * rect.height + 0.01);
    } else {
      points.slice(1).forEach((point) => {
        context.lineTo((point.x / 100) * rect.width, (point.y / 100) * rect.height);
      });
    }

    context.stroke();
  });
}

function surfacePointToPercent(clientX, clientY) {
  const rect = drawingSurface.getBoundingClientRect();
  return {
    x: clampValue(((clientX - rect.left) / rect.width) * 100, 4, 96),
    y: clampValue(((clientY - rect.top) / rect.height) * 100, 4, 96)
  };
}

function findFacePart(partId) {
  return composition.faceParts.find((part) => part.id === partId) || null;
}

function facePartCenterPixels(part) {
  const rect = drawingSurface.getBoundingClientRect();
  return {
    x: rect.left + (part.x / 100) * rect.width,
    y: rect.top + (part.y / 100) * rect.height
  };
}

function startFaceDrag(event, type, index, sourceElement) {
  activeDrag = {
    type: "gallery-face",
    pointerId: event.pointerId,
    faceType: type,
    faceIndex: index,
    sourceElement
  };
  sourceElement.classList.add("is-pointer-dragging");

  if (event.pointerId !== undefined && sourceElement.setPointerCapture) {
    sourceElement.setPointerCapture(event.pointerId);
  }
}

function startPlacedFaceMove(event, partId, sourceElement) {
  const part = findFacePart(partId);
  const center = facePartCenterPixels(part);
  activeDrag = {
    type: "move-face",
    pointerId: event.pointerId,
    partId,
    sourceElement,
    offsetX: event.clientX - center.x,
    offsetY: event.clientY - center.y
  };
  sourceElement.classList.add("is-pointer-dragging");

  if (event.pointerId !== undefined && sourceElement.setPointerCapture) {
    sourceElement.setPointerCapture(event.pointerId);
  }
}

function updateDrag(event) {
  if (!activeDrag || (activeDrag.pointerId !== undefined && event.pointerId !== undefined && activeDrag.pointerId !== event.pointerId)) {
    return;
  }

  if (activeDrag.type === "move-face") {
    const part = findFacePart(activeDrag.partId);
    const point = surfacePointToPercent(event.clientX - activeDrag.offsetX, event.clientY - activeDrag.offsetY);
    part.x = point.x;
    part.y = point.y;
    renderBoard();
  }
}

function finishDrag(event) {
  if (!activeDrag || (activeDrag.pointerId !== undefined && event.pointerId !== undefined && activeDrag.pointerId !== event.pointerId)) {
    return;
  }

  const action = activeDrag;
  activeDrag = null;

  action.sourceElement?.classList.remove("is-pointer-dragging");
  if (event.pointerId !== undefined && action.sourceElement?.releasePointerCapture) {
    action.sourceElement.releasePointerCapture(event.pointerId);
  }

  if (action.type === "gallery-face" && isInsideSurface(event.clientX, event.clientY)) {
    const point = surfacePointToPercent(event.clientX, event.clientY);
    composition.faceParts.push({
      id: `face-${Date.now()}-${Math.round(Math.random() * 10000)}`,
      type: action.faceType,
      index: action.faceIndex,
      x: point.x,
      y: point.y,
      size: action.faceType === "mouth" ? 16 : 13,
      rotation: 0
    });
    renderBoard();
    showBrushInstruction();
  }

  saveComposition(composition);
}

function cancelDrag() {
  activeDrag?.sourceElement?.classList.remove("is-pointer-dragging");
  activeDrag = null;
}

function isInsideSurface(clientX, clientY) {
  const rect = drawingSurface.getBoundingClientRect();
  return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
}

function setDrawingEnabled(enabled) {
  drawingEnabled = enabled;
  brushToggle.classList.toggle("is-active", enabled);
  brushToggle.setAttribute("aria-pressed", enabled ? "true" : "false");
  canvas.classList.toggle("is-drawing-enabled", enabled);
}

function updateInstructionCloud() {
  instructionCloud.classList.toggle("is-hidden", faceInstructionsComplete);

  if (!faceInstructionsComplete) {
    instructionCloudText.textContent = window.sewingI18n.t(FACE_INSTRUCTIONS[faceInstructionStep]);
  }
}

function showBrushInstruction() {
  if (faceInstructionsComplete || faceInstructionStep === 1) {
    return;
  }

  faceInstructionStep = 1;
  updateInstructionCloud();
  brushPulse.classList.add("is-active");
  window.setTimeout(completeFaceInstructions, 3000);
}

function completeFaceInstructions() {
  faceInstructionsComplete = true;
  updateInstructionCloud();
}

instructionCloudSkip.addEventListener("click", completeFaceInstructions);
window.addEventListener("sewing-language-change", () => {
  updateInstructionCloud();
  generateButton.textContent = window.sewingI18n.t(generateButton.disabled ? "Generating..." : "Generate");
});

brushToggle.addEventListener("click", () => {
  setDrawingEnabled(!drawingEnabled);
});

canvas.addEventListener("pointerdown", (event) => {
  if (!drawingEnabled) {
    return;
  }

  drawing = true;
  lastPoint = pointFromEvent(event);
  activeStroke = {
    color: "#603B27",
    width: (4 / canvas.getBoundingClientRect().width) * 100,
    points: [normalizedDrawingPoint(lastPoint)]
  };
  composition.drawingStrokes.push(activeStroke);
  context.beginPath();
  context.moveTo(lastPoint.x, lastPoint.y);
  context.lineTo(lastPoint.x + 0.01, lastPoint.y + 0.01);
  context.stroke();
  canvas.setPointerCapture(event.pointerId);
});

canvas.addEventListener("pointermove", (event) => {
  if (!drawing || !lastPoint) {
    return;
  }

  const point = pointFromEvent(event);
  const normalizedPoint = normalizedDrawingPoint(point);
  const previousNormalizedPoint = activeStroke?.points.at(-1);
  context.beginPath();
  context.moveTo(lastPoint.x, lastPoint.y);
  context.lineTo(point.x, point.y);
  context.stroke();
  if (!previousNormalizedPoint || Math.hypot(
    normalizedPoint.x - previousNormalizedPoint.x,
    normalizedPoint.y - previousNormalizedPoint.y
  ) >= 0.08) {
    activeStroke?.points.push(normalizedPoint);
  }
  lastPoint = point;
});

canvas.addEventListener("pointerup", (event) => {
  drawing = false;
  lastPoint = null;
  activeStroke = null;
  saveComposition(composition);
  if (canvas.hasPointerCapture(event.pointerId)) {
    canvas.releasePointerCapture(event.pointerId);
  }
});

canvas.addEventListener("pointercancel", () => {
  drawing = false;
  lastPoint = null;
  activeStroke = null;
  saveComposition(composition);
});

window.addEventListener("resize", resizeCanvas);
document.addEventListener("pointermove", updateDrag);
document.addEventListener("mousemove", updateDrag);
document.addEventListener("pointerup", finishDrag);
document.addEventListener("mouseup", finishDrag);
document.addEventListener("pointercancel", cancelDrag);

generateButton.addEventListener("click", async () => {
  generateButton.disabled = true;
  generateButton.hidden = true;
  generateStatus.textContent = "";
  generationBreathingOverlay.hidden = false;

  try {
    const drawingRect = drawingSurface.getBoundingClientRect();
    composition.aspectRatio = drawingRect.width / drawingRect.height;
    saveComposition(composition);
    const boardImage = await exportBoardImage();

    const response = await fetch("/api/generate-image", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        composition,
        boardImage
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Image generation failed.");
    }

    if (!data.imageUrl || !data.patternImageUrl) {
      throw new Error("The image generator did not return the complete image pair.");
    }

    await window.sewingGeneratedImageStorage.storePatternImage(data.patternImageUrl);
    localStorage.setItem("sewing-emotions-generated-image", data.imageUrl);
    localStorage.removeItem("sewing-emotions-current-character");
    window.location.href = "step4.html";
  } catch (error) {
    generationBreathingOverlay.hidden = true;
    generateStatus.textContent = error.message;
    generateButton.disabled = false;
    generateButton.hidden = false;
    generateButton.textContent = window.sewingI18n.t("Generate");
  }
});

async function exportBoardImage() {
  const rect = drawingSurface.getBoundingClientRect();
  const output = document.createElement("canvas");
  const outputContext = output.getContext("2d");
  const width = 1024;
  const height = Math.max(512, Math.round(width * (rect.height / rect.width)));

  output.width = width;
  output.height = height;
  outputContext.fillStyle = "#FFF7EA";
  outputContext.fillRect(0, 0, width, height);

  for (const part of composition.parts) {
    await drawShapePart(outputContext, part, width, height);
  }

  for (const part of composition.faceParts) {
    await drawFacePart(outputContext, part, width, height);
  }

  outputContext.drawImage(canvas, 0, 0, width, height);
  return output.toDataURL("image/png");
}

async function drawShapePart(outputContext, part, boardWidth, boardHeight) {
  const image = await loadImage(SEWING_SHAPES[wrapShapeIndex(part.shapeIndex)]);
  const size = (part.size / 100) * boardWidth;
  const x = (part.x / 100) * boardWidth;
  const y = (part.y / 100) * boardHeight;
  const temp = document.createElement("canvas");
  const tempContext = temp.getContext("2d");

  temp.width = Math.max(1, Math.round(size));
  temp.height = temp.width;
  tempContext.drawImage(image, 0, 0, temp.width, temp.height);
  tempContext.globalCompositeOperation = "source-in";
  tempContext.fillStyle = part.color || "#FFFFFF";
  tempContext.fillRect(0, 0, temp.width, temp.height);

  outputContext.save();
  outputContext.translate(x, y);
  outputContext.rotate((part.rotation || 0) * Math.PI / 180);
  outputContext.drawImage(temp, -temp.width / 2, -temp.height / 2);
  outputContext.restore();
}

async function drawFacePart(outputContext, part, boardWidth, boardHeight) {
  const image = await loadImage(faceSrc(part));
  const size = (part.size / 100) * boardWidth;
  const x = (part.x / 100) * boardWidth;
  const y = (part.y / 100) * boardHeight;
  const ratio = image.naturalHeight / image.naturalWidth || 1;

  outputContext.save();
  outputContext.translate(x, y);
  outputContext.rotate((part.rotation || 0) * Math.PI / 180);
  outputContext.drawImage(image, -size / 2, -(size * ratio) / 2, size, size * ratio);
  outputContext.restore();
}

function loadImage(src) {
  if (imageCache.has(src)) {
    return imageCache.get(src);
  }

  const promise = new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load ${src}`));
    image.src = src;
  });

  imageCache.set(src, promise);
  return promise;
}
