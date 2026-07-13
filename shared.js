const SEWING_SHAPES = [
  "assets/shapes/circle.svg",
  "assets/shapes/ellipse.svg",
  "assets/shapes/hectagon.svg",
  "assets/shapes/normal_rectangle.svg",
  "assets/shapes/pentagon.svg",
  "assets/shapes/rounded_rectangle.svg",
  "assets/shapes/smooth_triangle.svg",
  "assets/shapes/square.svg",
  "assets/shapes/stone.svg",
  "assets/shapes/triangle.svg",
  "assets/shapes/cloud.svg",
  "assets/shapes/eight.svg",
  "assets/shapes/durian.svg",
  "assets/shapes/spike.svg",
  "assets/shapes/sharp.svg",
  "assets/shapes/mud.svg",
  "assets/shapes/dart.svg",
  "assets/shapes/round_triangle.svg"
];

const DEFAULT_COMPOSITION = {
  parts: []
};

function clampValue(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function wrapShapeIndex(index) {
  return (index + SEWING_SHAPES.length) % SEWING_SHAPES.length;
}

function loadComposition() {
  try {
    const saved = JSON.parse(localStorage.getItem("sewing-emotions-composition"));
    return { ...DEFAULT_COMPOSITION, ...saved, parts: Array.isArray(saved?.parts) ? saved.parts : [] };
  } catch (error) {
    return { ...DEFAULT_COMPOSITION };
  }
}

function saveComposition(composition) {
  localStorage.setItem("sewing-emotions-composition", JSON.stringify(composition));
}

function shapeMaskStyle(path, color) {
  return {
    backgroundColor: color,
    maskImage: `url("${path}")`,
    webkitMaskImage: `url("${path}")`
  };
}

function applyShapeMask(element, path, color) {
  const style = shapeMaskStyle(path, color);
  element.style.backgroundColor = style.backgroundColor;
  element.style.maskImage = style.maskImage;
  element.style.webkitMaskImage = style.webkitMaskImage;
}

function createMaskedShape(path, color, className) {
  const shape = document.createElement("div");
  shape.className = className;
  shape.setAttribute("aria-hidden", "true");
  applyShapeMask(shape, path, color);
  return shape;
}

function renderComposition(surface, composition, options = {}) {
  surface.innerHTML = "";

  composition.parts.forEach((part, index) => {
    const partPath = SEWING_SHAPES[wrapShapeIndex(part.shapeIndex)];
    const partElement = createMaskedShape(partPath, part.color || "#FFFFFF", "placed-part");
    partElement.dataset.partIndex = String(index);
    partElement.style.left = `${part.x}%`;
    partElement.style.top = `${part.y}%`;
    partElement.style.width = `${part.size || 18}%`;
    partElement.style.transform = `translate(-50%, -50%) rotate(${part.rotation || 0}deg)`;
    surface.appendChild(partElement);
  });

  return null;
}
