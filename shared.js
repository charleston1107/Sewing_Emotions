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

const SEWING_FACE_ASSETS = {
  brow: ["assets/face/brow_0.png", "assets/face/brow_1.png", "assets/face/brow_2.png", "assets/face/brow_3.png"],
  eye: ["assets/face/eye_0.png", "assets/face/eye_1.png", "assets/face/eye_2.png", "assets/face/eye_3.png"],
  mouth: ["assets/face/mouth_0.png", "assets/face/mouth_1.png", "assets/face/mouth_2.png", "assets/face/mouth_3.png"]
};

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

function renderCharacterDesign(surface, composition) {
  const safeComposition = composition && Array.isArray(composition.parts)
    ? composition
    : { parts: [], faceParts: [] };

  const aspectRatio = Number(safeComposition.aspectRatio);
  surface.parentElement?.style.setProperty(
    "--design-aspect",
    Number.isFinite(aspectRatio) && aspectRatio > 0 ? String(aspectRatio) : "1.2"
  );

  renderComposition(surface, safeComposition);

  (safeComposition.faceParts || []).forEach((part) => {
    const src = SEWING_FACE_ASSETS[part.type]?.[part.index];
    if (!src) {
      return;
    }

    const image = document.createElement("img");
    image.className = "rendered-face-part";
    image.src = src;
    image.alt = "";
    image.style.left = `${part.x}%`;
    image.style.top = `${part.y}%`;
    image.style.width = `${part.size || (part.type === "mouth" ? 16 : 13)}%`;
    image.style.transform = `translate(-50%, -50%) rotate(${part.rotation || 0}deg)`;
    surface.appendChild(image);
  });

  renderDrawingStrokes(surface, safeComposition.drawingStrokes);
}

function renderDrawingStrokes(surface, strokes) {
  if (!Array.isArray(strokes) || strokes.length === 0) {
    return;
  }

  const namespace = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(namespace, "svg");
  svg.classList.add("rendered-drawing-layer");
  svg.setAttribute("viewBox", "0 0 100 100");
  svg.setAttribute("preserveAspectRatio", "none");
  svg.setAttribute("aria-hidden", "true");

  strokes.forEach((stroke) => {
    const points = (Array.isArray(stroke.points) ? stroke.points : []).filter((point) => (
      Number.isFinite(Number(point.x)) && Number.isFinite(Number(point.y))
    ));
    if (points.length === 0) {
      return;
    }

    if (points.length === 1) {
      const dot = document.createElementNS(namespace, "circle");
      dot.setAttribute("cx", String(points[0].x));
      dot.setAttribute("cy", String(points[0].y));
      dot.setAttribute("r", String((Number(stroke.width) || 0.46) / 2));
      dot.setAttribute("fill", stroke.color || "#603B27");
      svg.appendChild(dot);
      return;
    }

    const path = document.createElementNS(namespace, "path");
    const pathData = points.map((point, index) => (
      `${index === 0 ? "M" : "L"} ${Number(point.x).toFixed(3)} ${Number(point.y).toFixed(3)}`
    )).join(" ");
    path.setAttribute("d", pathData);
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", stroke.color || "#603B27");
    path.setAttribute("stroke-width", String(Number(stroke.width) || 0.46));
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-linejoin", "round");
    svg.appendChild(path);
  });

  surface.appendChild(svg);
}
