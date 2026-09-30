/*
 * p5.js sewing interaction prototype.
 *
 * Each texture is drawn in the cloth's rotated local coordinate system, so
 * its needle, thread, stitches, and avoidance zone all share one transform.
 */

const CLOTH_LAYOUT = [
  {
    x: 0.2, y: 0.36, width: 0.21, aspect: 1162 / 1082, angle: -0.13,
    color: "#ef8f99", thread: "#8f2f4a", texture: "pink",
    crop: { x: 93, y: 49, width: 1082, height: 1162 }
  },
  {
    x: 0.73, y: 0.37, width: 0.19, aspect: 1080 / 929, angle: 0.14,
    color: "#e0b64d", thread: "#79532f", texture: "orange",
    crop: { x: 166, y: 89, width: 929, height: 1080 }
  }
];
const STITCH_SPACING = 16;
const FIRST_STITCH_OFFSET = 8;

let cloths = [];
let activeCloth = null;
let progressLabel;
let completedCount = 0;
let clothTextures = {};

function preload() {
  clothTextures = {
    pink: loadImage("assets/index/pink_fabric.png"),
    orange: loadImage("assets/index/orange_fabric.png")
  };
}

class SewingCloth {
  constructor(config, index) {
    this.config = config;
    this.texture = clothTextures[config.texture];
    this.index = index;
    this.progress = 0;
    this.dragging = false;
    this.complete = false;
    this.needle = { x: 0, y: 0 };
    this.lastDrag = { x: 0, y: 0 };
    this.layout();
  }

  layout() {
    const compact = width < 720;
    const title = document.querySelector(".title-button");
    const titleRect = title?.getBoundingClientRect() || {
      left: width * 0.3,
      right: width * 0.7,
      top: height * 0.38,
      bottom: height * 0.62
    };
    const gap = compact ? 24 : 34;
    const rawWidth = width * this.config.width * (compact ? 1.5 : 1);
    let maxWidth;
    let maxHeight;

    if (compact && this.index < 2) {
      maxWidth = width * 0.34;
      maxHeight = max(80, titleRect.top - gap - 30);
      this.x = width * (this.index === 0 ? 0.22 : 0.78);
      this.y = maxHeight / 2 + 15;
    } else if (compact) {
      maxWidth = width * 0.48;
      maxHeight = max(90, height - titleRect.bottom - gap - 36);
      this.x = width * 0.5;
      this.y = titleRect.bottom + gap + maxHeight / 2;
    } else if (this.index === 0) {
      maxWidth = max(120, titleRect.left - gap - 34);
      maxHeight = height * 0.42;
      this.x = maxWidth / 2 + 17;
      this.y = titleRect.top + (titleRect.bottom - titleRect.top) * 0.48;
    } else if (this.index === 1) {
      maxWidth = max(120, width - titleRect.right - gap - 34);
      maxHeight = height * 0.42;
      this.x = width - maxWidth / 2 - 17;
      this.y = titleRect.top + (titleRect.bottom - titleRect.top) * 0.52;
    } else {
      maxWidth = min(width * 0.3, titleRect.width * 0.7);
      maxHeight = max(100, height - titleRect.bottom - gap - 28);
      this.x = width * 0.5;
      this.y = titleRect.bottom + gap + maxHeight / 2;
    }

    this.w = max(90, min(rawWidth, maxWidth, maxHeight / this.config.aspect, compact ? 180 : 320));
    this.h = this.w * this.config.aspect;
    this.angle = this.config.angle;
    if (!compact && this.index < 2) {
      const rotatedHalfWidth = (abs(cos(this.angle)) * this.w + abs(sin(this.angle)) * this.h) / 2;
      this.x = this.index === 0
        ? max(this.x, rotatedHalfWidth + 30)
        : min(this.x, width - rotatedHalfWidth - 30);
    }
    this.rebuildPath();

    if (!this.dragging) {
      const point = this.pointAt(this.complete ? 0 : this.progress);
      this.needle = this.localToWorld(point.x, point.y);
    }
  }

  rebuildPath() {
    const left = -this.w / 2;
    const right = this.w / 2;
    const top = -this.h / 2;
    const bottom = this.h / 2;
    this.edges = [
      { a: { x: left, y: top }, b: { x: right, y: top }, length: this.w },
      { a: { x: right, y: top }, b: { x: right, y: bottom }, length: this.h },
      { a: { x: right, y: bottom }, b: { x: left, y: bottom }, length: this.w },
      { a: { x: left, y: bottom }, b: { x: left, y: top }, length: this.h }
    ];
    let distance = 0;
    this.edges.forEach((edge) => {
      edge.start = distance;
      distance += edge.length;
      edge.end = distance;
      edge.tx = (edge.b.x - edge.a.x) / edge.length;
      edge.ty = (edge.b.y - edge.a.y) / edge.length;
    });
    this.perimeter = distance;
    this.progress = min(this.progress, this.perimeter);
  }

  localToWorld(localX, localY) {
    const cosine = cos(this.angle);
    const sine = sin(this.angle);
    return {
      x: this.x + localX * cosine - localY * sine,
      y: this.y + localX * sine + localY * cosine
    };
  }

  worldToLocal(worldX, worldY) {
    const dx = worldX - this.x;
    const dy = worldY - this.y;
    const cosine = cos(this.angle);
    const sine = sin(this.angle);
    return {
      x: dx * cosine + dy * sine,
      y: -dx * sine + dy * cosine
    };
  }

  pointAt(distance) {
    const wrapped = constrain(distance, 0, this.perimeter - 0.001);
    const edge = this.edges.find((candidate) => wrapped < candidate.end) || this.edges[3];
    const amount = (wrapped - edge.start) / edge.length;
    return {
      x: lerp(edge.a.x, edge.b.x, amount),
      y: lerp(edge.a.y, edge.b.y, amount),
      angle: atan2(edge.b.y - edge.a.y, edge.b.x - edge.a.x)
    };
  }

  currentEdge() {
    return this.edges.find((edge) => this.progress < edge.end - 0.001) || this.edges[3];
  }

  hitNeedle(worldX, worldY) {
    return !this.complete && dist(worldX, worldY, this.needle.x, this.needle.y) < 28;
  }

  startDrag(worldX, worldY) {
    this.dragging = true;
    this.lastDrag = this.worldToLocal(worldX, worldY);
    this.needle = { x: worldX, y: worldY };
  }

  dragTo(worldX, worldY) {
    if (!this.dragging || this.complete) return;

    const local = this.worldToLocal(worldX, worldY);
    const edge = this.currentEdge();
    const movementX = local.x - this.lastDrag.x;
    const movementY = local.y - this.lastDrag.y;
    const forwardMovement = movementX * edge.tx + movementY * edge.ty;
    const fromStartX = local.x - edge.a.x;
    const fromStartY = local.y - edge.a.y;
    const along = constrain(fromStartX * edge.tx + fromStartY * edge.ty, 0, edge.length);
    const nearestX = edge.a.x + edge.tx * along;
    const nearestY = edge.a.y + edge.ty * along;
    const edgeDistance = dist(local.x, local.y, nearestX, nearestY);
    const targetProgress = edge.start + along;

    if (edgeDistance < 42 && forwardMovement > 0.25 && targetProgress >= this.progress - 3) {
      this.progress = max(this.progress, targetProgress);

      if (along > edge.length - 5) {
        this.progress = edge.end;
      }

      if (this.progress >= this.perimeter - 5) {
        this.finish();
      }
    }

    this.lastDrag = local;
    this.needle = { x: worldX, y: worldY };
  }

  stopDrag() {
    this.dragging = false;
    if (!this.complete) {
      const point = this.pointAt(this.progress);
      this.needle = this.localToWorld(point.x, point.y);
    }
  }

  finish() {
    this.complete = true;
    this.dragging = false;
    this.progress = this.perimeter;
    const start = this.pointAt(0);
    this.needle = this.localToWorld(start.x, start.y);
    completedCount += 1;
    updateProgressLabel();
  }

  reset() {
    this.progress = 0;
    this.complete = false;
    this.dragging = false;
    const start = this.pointAt(0);
    this.needle = this.localToWorld(start.x, start.y);
  }

  drawCloth() {
    push();
    translate(this.x, this.y);
    rotate(this.angle);
    drawingContext.shadowColor = "rgba(96, 59, 39, 0.2)";
    drawingContext.shadowBlur = 18;
    drawingContext.shadowOffsetY = 9;
    if (this.texture) {
      const crop = this.config.crop;
      imageMode(CENTER);
      image(
        this.texture,
        0,
        0,
        this.w,
        this.h,
        crop.x,
        crop.y,
        crop.width,
        crop.height
      );
    } else {
      noStroke();
      fill(this.config.color);
      rectMode(CENTER);
      rect(0, 0, this.w, this.h, 13);
    }
    drawingContext.shadowColor = "transparent";
    pop();
  }

  drawStitches() {
    const visibleProgress = this.complete ? this.perimeter : this.progress;
    noStroke();
    fill(this.config.thread);
    for (
      let distanceAlong = FIRST_STITCH_OFFSET;
      distanceAlong <= visibleProgress;
      distanceAlong += STITCH_SPACING
    ) {
      const point = this.pointAt(distanceAlong % this.perimeter);
      const world = this.localToWorld(point.x, point.y);
      circle(world.x, world.y, 5.5);
    }
  }

  drawThread() {
    const visibleProgress = this.complete ? this.perimeter : this.progress;
    const latestStitchDistance = visibleProgress < FIRST_STITCH_OFFSET
      ? 0
      : FIRST_STITCH_OFFSET
        + floor((visibleProgress - FIRST_STITCH_OFFSET) / STITCH_SPACING) * STITCH_SPACING;
    const anchorLocal = this.pointAt(latestStitchDistance % this.perimeter);
    const anchor = this.localToWorld(anchorLocal.x, anchorLocal.y);
    const needleAngle = this.dragging
      ? atan2(mouseY - pmouseY, mouseX - pmouseX)
      : this.angle + this.pointAt(this.complete ? 0 : this.progress).angle;
    const eye = {
      x: this.needle.x - cos(needleAngle) * 17,
      y: this.needle.y - sin(needleAngle) * 17
    };
    const dx = eye.x - anchor.x;
    const dy = eye.y - anchor.y;
    const length = max(1, sqrt(dx * dx + dy * dy));
    const normalX = -dy / length;
    const normalY = dx / length;
    const softness = min(70, length * 0.34) + sin(frameCount * 0.055 + this.index) * 6;

    noFill();
    stroke(this.config.thread);
    strokeWeight(2.2);
    bezier(
      anchor.x,
      anchor.y,
      anchor.x + dx * 0.28 + normalX * softness,
      anchor.y + dy * 0.28 + normalY * softness,
      anchor.x + dx * 0.72 + normalX * softness * 0.42,
      anchor.y + dy * 0.72 + normalY * softness * 0.42,
      eye.x,
      eye.y
    );
    this.drawNeedle(needleAngle);
  }

  drawNeedle(angle) {
    push();
    translate(this.needle.x, this.needle.y);
    rotate(angle);
    drawingContext.shadowColor = "rgba(47, 60, 118, 0.2)";
    drawingContext.shadowBlur = this.dragging ? 10 : 4;
    stroke("#48505c");
    strokeWeight(4.2);
    strokeCap(ROUND);
    line(-17, 0, 15, 0);
    strokeWeight(1.3);
    line(15, 0, 21, 0);
    fill("#fff8df");
    ellipse(-13.5, 0, 5.5, 3.2);
    pop();
  }

  draw() {
    this.drawCloth();
    this.drawStitches();
    this.drawThread();
  }
}

function setup() {
  const canvas = createCanvas(windowWidth, windowHeight);
  canvas.parent(document.querySelector(".home-sewing-layer"));
  pixelDensity(min(window.devicePixelRatio || 1, 2));
  cloths = CLOTH_LAYOUT.map((config, index) => new SewingCloth(config, index));
  progressLabel = document.querySelector(".sewing-progress");
  document.querySelector(".sewing-reset-button")?.addEventListener("click", resetSewing);
  publishAvoidanceZones();
  updateProgressLabel();
}

function draw() {
  clear();
  cloths.forEach((cloth) => cloth.draw());

  const hovering = cloths.some((cloth) => cloth.hitNeedle(mouseX, mouseY));
  cursor(activeCloth ? "grabbing" : hovering ? "grab" : ARROW);
}

function mousePressed() {
  activeCloth = [...cloths].reverse().find((cloth) => cloth.hitNeedle(mouseX, mouseY)) || null;
  if (!activeCloth) return true;
  activeCloth.startDrag(mouseX, mouseY);
  return false;
}

function mouseDragged() {
  if (!activeCloth) return true;
  activeCloth.dragTo(mouseX, mouseY);
  return false;
}

function mouseReleased() {
  if (!activeCloth) return true;
  activeCloth.stopDrag();
  activeCloth = null;
  return false;
}

function touchStarted() {
  return mousePressed();
}

function touchMoved() {
  return mouseDragged();
}

function touchEnded() {
  return mouseReleased();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  cloths.forEach((cloth) => cloth.layout());
  publishAvoidanceZones();
}

function publishAvoidanceZones() {
  window.homeSewingAvoidanceZones = cloths.map((cloth) => {
    const cosine = abs(cos(cloth.angle));
    const sine = abs(sin(cloth.angle));
    const halfWidth = (cloth.w * cosine + cloth.h * sine) / 2 + 28;
    const halfHeight = (cloth.w * sine + cloth.h * cosine) / 2 + 28;
    return {
      left: cloth.x - halfWidth,
      right: cloth.x + halfWidth,
      top: cloth.y - halfHeight,
      bottom: cloth.y + halfHeight
    };
  });
  window.dispatchEvent(new CustomEvent("home-sewing-zones-updated"));
}

function resetSewing() {
  activeCloth = null;
  completedCount = 0;
  cloths.forEach((cloth) => cloth.reset());
  updateProgressLabel();
}

function updateProgressLabel() {
  if (!progressLabel) return;
  progressLabel.textContent = completedCount === cloths.length
    ? "All cloths sewn — lovely work"
    : `${completedCount} of ${cloths.length} cloths sewn`;
}
