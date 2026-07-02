const carousel = document.querySelector(".shape-carousel");
const ring = document.querySelector(".carousel-ring");
const previousButton = document.querySelector(".carousel-arrow-left");
const nextButton = document.querySelector(".carousel-arrow-right");
const selectButton = document.querySelector(".select-button");

const shapes = window.SEWING_SHAPES || [
  "assets/Ellipse 39.svg",
  "assets/Polygon 12.svg",
  "assets/Polygon 13.svg",
  "assets/Rectangle 29.svg",
  "assets/Vector 45.svg",
  "assets/Vector 49.svg",
  "assets/Vector 50.svg",
  "assets/Vector 53.svg"
];

let selectedIndex = Number(localStorage.getItem("sewing-emotions-selected-index")) || 0;
let position = selectedIndex;
let targetPosition = selectedIndex;
let dragStartX = 0;
let dragStartPosition = 0;
let pointerDown = false;
let animationFrame = 0;
let lastRenderedIndex = -1;

function wrapIndex(index) {
  return (index + shapes.length) % shapes.length;
}

function shortestDistance(index, center) {
  let distance = index - center;
  while (distance > shapes.length / 2) {
    distance -= shapes.length;
  }
  while (distance < -shapes.length / 2) {
    distance += shapes.length;
  }
  return distance;
}

function renderCarousel() {
  const width = carousel.clientWidth || 820;
  const spacing = Math.min(360, Math.max(220, width * 0.48));

  Array.from(ring.children).forEach((item, index) => {
    const distance = shortestDistance(index, position);
    const absDistance = Math.abs(distance);
    const depth = Math.max(0, 1 - absDistance);
    const scale = 0.62 + depth * 0.62;
    const y = absDistance * 24;
    const rotate = distance * -8;
    const opacity = absDistance > 2.15 ? 0 : 0.34 + Math.max(0, 1 - absDistance / 2.15) * 0.66;
    const zIndex = Math.round(100 - absDistance * 10);

    item.style.transform = `translate(-50%, -50%) translateX(${distance * spacing}px) translateY(${y}px) scale(${scale}) rotate(${rotate}deg)`;
    item.style.opacity = opacity.toFixed(2);
    item.style.zIndex = zIndex;
  });

  selectedIndex = wrapIndex(Math.round(position));
  if (selectedIndex !== lastRenderedIndex) {
    lastRenderedIndex = selectedIndex;
    localStorage.setItem("sewing-emotions-selected-index", String(selectedIndex));
  }
}

function animateCarousel() {
  if (!pointerDown) {
    position += (targetPosition - position) * 0.13;
    if (Math.abs(targetPosition - position) < 0.002) {
      position = targetPosition;
    }
  }

  renderCarousel();
  animationFrame = requestAnimationFrame(animateCarousel);
}

function snapToNearest() {
  targetPosition = Math.round(position);
}

function moveCarousel(direction) {
  targetPosition = Math.round(targetPosition + direction);
}

previousButton.addEventListener("click", () => moveCarousel(-1));
nextButton.addEventListener("click", () => moveCarousel(1));

carousel.addEventListener("pointerdown", (event) => {
  pointerDown = true;
  dragStartX = event.clientX;
  dragStartPosition = position;
  targetPosition = position;
  carousel.classList.add("dragging");
  carousel.setPointerCapture(event.pointerId);
});

carousel.addEventListener("pointermove", (event) => {
  if (!pointerDown) {
    return;
  }

  const width = carousel.clientWidth || 820;
  const spacing = Math.min(360, Math.max(220, width * 0.48));
  const distance = event.clientX - dragStartX;
  position = dragStartPosition - distance / spacing;

  const nearest = Math.round(position);
  if (Math.abs(position - nearest) < 0.055) {
    position = nearest;
  }
});

carousel.addEventListener("pointerup", (event) => {
  if (!pointerDown) {
    return;
  }

  pointerDown = false;
  carousel.classList.remove("dragging");
  carousel.releasePointerCapture(event.pointerId);
  snapToNearest();
});

carousel.addEventListener("pointercancel", () => {
  pointerDown = false;
  carousel.classList.remove("dragging");
  snapToNearest();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft") {
    moveCarousel(-1);
  }

  if (event.key === "ArrowRight") {
    moveCarousel(1);
  }
});

selectButton.addEventListener("click", () => {
  const composition = loadComposition();
  composition.selectedShapeIndex = selectedIndex;
  composition.bodyColor = "#FFFFFF";
  composition.parts = [];
  saveComposition(composition);
});

shapes.forEach((path, index) => {
  const item = document.createElement("figure");
  item.className = "ring-shape";
  item.setAttribute("aria-label", index === selectedIndex ? "Selected shape" : "Shape option");
  item.innerHTML = `<img src="${path}" alt="" draggable="false">`;
  ring.appendChild(item);
});

renderCarousel();
animateCarousel();
