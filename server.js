const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const ROOT_DIR = __dirname;
loadEnvFile();

const PORT = Number(process.env.PORT || 8000);
const DEFAULT_GEMINI_IMAGE_MODELS = [
  "gemini-2.5-flash-image-lite",
  "gemini-2.5-flash-image"
];
const GEMINI_IMAGE_MODELS = getGeminiImageModels();
const MAX_JSON_BYTES = 16 * 1024 * 1024;

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp"
};

const server = http.createServer(async (request, response) => {
  try {
    if (request.method === "POST" && request.url === "/api/generate-image") {
      await handleGenerateImage(request, response);
      return;
    }

    if (request.method === "GET" || request.method === "HEAD") {
      serveStatic(request, response);
      return;
    }

    sendJson(response, 405, { error: "Method not allowed" });
  } catch (error) {
    console.error(error);
    sendJson(response, 500, { error: error.message || "Unexpected server error" });
  }
});

server.listen(PORT, () => {
  console.log(`Sewing Emotions server running at http://localhost:${PORT}`);
});

function loadEnvFile() {
  const envPath = path.join(ROOT_DIR, ".env");
  if (!fs.existsSync(envPath)) {
    return;
  }

  const env = fs.readFileSync(envPath, "utf8");
  env.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      return;
    }

    const separator = trimmed.indexOf("=");
    if (separator === -1) {
      return;
    }

    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) {
      process.env[key] = value;
    }
  });
}

function serveStatic(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const pathname = decodeURIComponent(url.pathname);
  const filePath = path.normalize(path.join(ROOT_DIR, pathname === "/" ? "index.html" : pathname));

  if (!filePath.startsWith(ROOT_DIR)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  const stat = fs.existsSync(filePath) ? fs.statSync(filePath) : null;
  const finalPath = stat?.isDirectory() ? path.join(filePath, "index.html") : filePath;

  if (!fs.existsSync(finalPath) || !fs.statSync(finalPath).isFile()) {
    response.writeHead(404);
    response.end("Not found");
    return;
  }

  const ext = path.extname(finalPath).toLowerCase();
  response.writeHead(200, {
    "Content-Type": mimeTypes[ext] || "application/octet-stream",
    "Cache-Control": "no-store"
  });

  if (request.method === "HEAD") {
    response.end();
    return;
  }

  fs.createReadStream(finalPath).pipe(response);
}

async function handleGenerateImage(request, response) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "put_your_gemini_api_key_here") {
    sendJson(response, 500, {
      error: "Missing GEMINI_API_KEY. Add it to .env or Render environment variables before starting the server."
    });
    return;
  }

  const body = await readJson(request);
  const prompt = buildImagePrompt(body);
  const boardImage = typeof body.boardImage === "string" ? body.boardImage : "";

  const result = await callGeminiImageGeneration(apiKey, prompt, boardImage);

  sendJson(response, 200, result);
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];

    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_JSON_BYTES) {
        reject(new Error("Request body is too large."));
        request.destroy();
        return;
      }

      chunks.push(chunk);
    });

    request.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"));
      } catch (error) {
        reject(new Error("Invalid JSON body."));
      }
    });

    request.on("error", reject);
  });
}

function buildImagePrompt(body) {
  const parts = Array.isArray(body.composition?.parts) ? body.composition.parts : [];
  const shapeSummary = parts.map((part, index) => {
    const shapeName = shapeNameFromPath(part.shapeIndex);
    return `${index + 1}. ${shapeName}, color ${part.color || "#FFFFFF"}, position ${Math.round(part.x || 0)}%/${Math.round(part.y || 0)}%, size ${Math.round(part.size || 18)}%, rotation ${Math.round(part.rotation || 0)} degrees`;
  }).join("\n");

  return [
    "Create a playful hand-drawn emotion character inspired by the submitted drawing-board reference image.",
    "Style: childlike crayon illustration, handmade texture, colorful, soft, expressive, cute, like a sticker or children's craft character.",
    "Respect the rough silhouette, composition, shape placement, and colors from the reference, but reinterpret it as a polished illustration.",
    "Keep the background simple and clean.",
    "",
    "User shape composition:",
    shapeSummary || "No separate shape metadata was provided.",
    "",
    "Do not include text, labels, UI controls, grid lines, resize handles, or color picker elements in the final image."
  ].join("\n");
}

function shapeNameFromPath(shapeIndex) {
  const pathName = [
    "Ellipse 39", "Ellipse 40", "Polygon 12", "Polygon 13",
    "Polygon 14", "Rectangle 29", "Rectangle leg 1", "Rectangle leg 2",
    "Rectangle leg 3", "Vector 45", "Vector 47", "Vector 48",
    "Vector 49", "Vector 50", "Vector 52", "Vector 53"
  ][Number(shapeIndex)];
  return pathName || `shape ${shapeIndex}`;
}

async function callGeminiImageGeneration(apiKey, prompt, boardImage) {
  const parts = [{ text: prompt }];

  if (boardImage.startsWith("data:image/")) {
    const { mimeType, buffer } = parseDataUrl(boardImage);
    parts.push({
      inline_data: {
        mime_type: mimeType,
        data: buffer.toString("base64")
      }
    });
  }

  const errors = [];

  for (const model of GEMINI_IMAGE_MODELS) {
    try {
      return await callGeminiGenerateContent(apiKey, model, parts);
    } catch (error) {
      errors.push(`${model}: ${error.message}`);

      if (!isModelAvailabilityError(error) || model === GEMINI_IMAGE_MODELS.at(-1)) {
        throw new Error(errors.join("\n"));
      }

      console.warn(`Gemini model ${model} failed, trying next model: ${error.message}`);
    }
  }

  throw new Error("No Gemini image models were configured.");
}

async function callGeminiGenerateContent(apiKey, rawModel, parts) {
  const model = rawModel.replace(/^models\//, "");
  const apiResponse = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts
          }
        ],
        generationConfig: {
          responseModalities: ["TEXT", "IMAGE"]
        }
      })
    }
  );

  return parseGeminiImageResponse(apiResponse, model);
}

async function parseGeminiImageResponse(apiResponse, model) {
  const json = await apiResponse.json().catch(() => ({}));

  if (!apiResponse.ok) {
    const message = json.error?.message || `Gemini API request failed with status ${apiResponse.status}`;
    const error = new Error(message);
    error.status = apiResponse.status;
    error.model = model;
    throw error;
  }

  const parts = (json.candidates || []).flatMap((candidate) => candidate.content?.parts || []);
  const imagePart = parts.find((part) => {
    const inlineData = part.inlineData || part.inline_data;
    return inlineData?.data;
  });

  if (imagePart) {
    const inlineData = imagePart.inlineData || imagePart.inline_data;
    const mimeType = inlineData.mimeType || inlineData.mime_type || "image/png";
    const result = { imageUrl: `data:${mimeType};base64,${inlineData.data}` };
    const text = parts.map((part) => part.text).filter(Boolean).join("\n").trim();

    if (text) {
      result.note = text;
    }

    return result;
  }

  const text = parts.map((part) => part.text).filter(Boolean).join("\n").trim();
  throw new Error(text || "Gemini response did not include an image.");
}

function getGeminiImageModels() {
  const configured = process.env.GEMINI_IMAGE_MODEL || process.env.GEMINI_IMAGE_MODELS || "";
  const models = configured.split(",").map((model) => model.trim()).filter(Boolean);
  return models.length ? models : DEFAULT_GEMINI_IMAGE_MODELS;
}

function isModelAvailabilityError(error) {
  return error.status === 400 || error.status === 404;
}

function parseDataUrl(dataUrl) {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw new Error("Invalid board image data URL.");
  }

  return {
    mimeType: match[1],
    buffer: Buffer.from(match[2], "base64")
  };
}

function sendJson(response, status, data) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(JSON.stringify(data));
}
