const drawingSurface = document.querySelector(".drawing-surface");
const canvas = document.querySelector(".drawing-canvas");
const context = canvas.getContext("2d");
const generateButton = document.querySelector(".generate-button");
const generateStatus = document.querySelector(".generate-status");
const generatedResult = document.querySelector(".generated-result");
const composition = loadComposition();
const shapeImageCache = new Map();

let drawing = false;
let lastPoint = null;

renderComposition(drawingSurface, composition);

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
}

function pointFromEvent(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  };
}

canvas.addEventListener("pointerdown", (event) => {
  drawing = true;
  lastPoint = pointFromEvent(event);
  canvas.setPointerCapture(event.pointerId);
});

canvas.addEventListener("pointermove", (event) => {
  if (!drawing || !lastPoint) {
    return;
  }

  const point = pointFromEvent(event);
  context.beginPath();
  context.moveTo(lastPoint.x, lastPoint.y);
  context.lineTo(point.x, point.y);
  context.stroke();
  lastPoint = point;
});

canvas.addEventListener("pointerup", (event) => {
  drawing = false;
  lastPoint = null;
  canvas.releasePointerCapture(event.pointerId);
});

canvas.addEventListener("pointercancel", () => {
  drawing = false;
  lastPoint = null;
});

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

generateButton.addEventListener("click", async () => {
  generateButton.disabled = true;
  generateButton.textContent = "Generating...";
  generateStatus.textContent = "Preparing your drawing board...";
  generatedResult.innerHTML = "";

  try {
    const boardImage = await exportBoardImage();
    generateStatus.textContent = "Asking OpenAI to reinterpret your shape...";

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

    showGeneratedImage(data.imageUrl, data.warning);
  } catch (error) {
    generateStatus.textContent = error.message;
  } finally {
    generateButton.disabled = false;
    generateButton.textContent = "Generate";
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
    await drawPart(outputContext, part, width, height);
  }

  outputContext.drawImage(canvas, 0, 0, width, height);
  return output.toDataURL("image/png");
}

async function drawPart(outputContext, part, boardWidth, boardHeight) {
  const image = await loadShapeImage(SEWING_SHAPES[wrapShapeIndex(part.shapeIndex)]);
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

function loadShapeImage(src) {
  if (shapeImageCache.has(src)) {
    return shapeImageCache.get(src);
  }

  const promise = new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load ${src}`));
    image.src = src;
  });

  shapeImageCache.set(src, promise);
  return promise;
}

function showGeneratedImage(imageUrl, warning) {
  const image = document.createElement("img");
  image.className = "generated-image";
  image.src = imageUrl;
  image.alt = "Generated emotion character";

  generatedResult.innerHTML = "";
  generatedResult.appendChild(image);
  generateStatus.textContent = warning || "Generated image ready.";
}
