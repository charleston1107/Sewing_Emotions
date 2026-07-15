async function buildEmotionInsightsFromDesign() {
  const composition = loadComposition();
  const [shapeMap, colorMap, faceMap] = await Promise.all([
    loadEmotionMap("shape_emotions.json"),
    loadEmotionMap("color_emotions.json"),
    loadEmotionMap("face_emotions.json")
  ]);

  const shapeChoices = composition.parts.map((part) => shapeNameFromChoice(part.shapeIndex));
  const colorChoices = composition.parts.map((part) => normalizeColor(part.color)).filter(Boolean);
  const faceChoices = (composition.faceParts || []).map((part) => `${part.type}_${part.index}`);
  const counts = {};
  const sources = [];

  addMappedEmotions(shapeChoices, shapeMap, counts, sources, "shape");
  addMappedEmotions(colorChoices, colorMap, counts, sources, "color");
  addMappedEmotions(faceChoices, faceMap, counts, sources, "face");

  const ranked = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([emotion, count]) => ({ emotion, count }));

  return {
    designChoices: {
      shapes: shapeChoices,
      colors: colorChoices,
      faces: faceChoices
    },
    emotionHints: {
      ranked,
      sources,
      note: "These are only reference possibilities from design mappings, not a diagnosis or exact label."
    }
  };
}

async function loadEmotionMap(path) {
  try {
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) {
      return {};
    }
    return await response.json();
  } catch (error) {
    return {};
  }
}

function addMappedEmotions(choices, mapping, counts, sources, sourceType) {
  choices.forEach((choice) => {
    const emotions = mapping[choice] || mapping[choice.replace("hectagon", "hexagon")] || [];
    emotions.forEach((emotion) => {
      counts[emotion] = (counts[emotion] || 0) + 1;
      sources.push({ sourceType, choice, emotion });
    });
  });
}

function shapeNameFromChoice(shapeIndex) {
  const path = SEWING_SHAPES[wrapShapeIndex(shapeIndex)] || "";
  return path.split("/").pop().replace(/\.[^.]+$/, "");
}

function normalizeColor(color) {
  return String(color || "").trim().toLowerCase();
}
