const drawingSurface = document.querySelector(".drawing-surface");
const canvas = document.querySelector(".drawing-canvas");
const context = canvas.getContext("2d");
const composition = loadComposition();

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
