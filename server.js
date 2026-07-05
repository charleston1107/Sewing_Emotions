const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const ROOT_DIR = __dirname;
loadEnvFile();

const PORT = Number(process.env.PORT || 8000);
const IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";
const IMAGE_SIZE = process.env.OPENAI_IMAGE_SIZE || "1024x1024";
const IMAGE_QUALITY = process.env.OPENAI_IMAGE_QUALITY || "auto";
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
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === "put_your_api_key_here") {
    sendJson(response, 500, {
      error: "Missing OPENAI_API_KEY. Add it to .env or export it in your shell before starting the server."
    });
    return;
  }

  const body = await readJson(request);
  const prompt = buildImagePrompt(body);
  const boardImage = typeof body.boardImage === "string" ? body.boardImage : "";

  let result;
  if (boardImage.startsWith("data:image/")) {
    try {
      result = await callImageEdit(apiKey, prompt, boardImage);
    } catch (error) {
      if (isAuthError(error)) {
        throw error;
      }

      console.warn(`Image edit failed, falling back to prompt-only generation: ${error.message}`);
      result = await callImageGeneration(apiKey, prompt);
      result.warning = "The image-reference edit failed, so the server generated from the text prompt only.";
    }
  } else {
    result = await callImageGeneration(apiKey, prompt);
  }

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

async function callImageEdit(apiKey, prompt, dataUrl) {
  const { mimeType, buffer } = parseDataUrl(dataUrl);
  const form = new FormData();
  form.append("model", IMAGE_MODEL);
  form.append("prompt", prompt);
  form.append("size", IMAGE_SIZE);
  form.append("quality", IMAGE_QUALITY);
  form.append("image", new Blob([buffer], { type: mimeType }), "drawing-board.png");

  const apiResponse = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`
    },
    body: form
  });

  return parseOpenAIImageResponse(apiResponse);
}

async function callImageGeneration(apiKey, prompt) {
  const apiResponse = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: IMAGE_MODEL,
      prompt,
      size: IMAGE_SIZE,
      quality: IMAGE_QUALITY
    })
  });

  return parseOpenAIImageResponse(apiResponse);
}

async function parseOpenAIImageResponse(apiResponse) {
  const json = await apiResponse.json().catch(() => ({}));

  if (!apiResponse.ok) {
    const message = json.error?.message || `OpenAI API request failed with status ${apiResponse.status}`;
    const error = new Error(message);
    error.status = apiResponse.status;
    throw error;
  }

  const image = json.data?.[0];
  if (image?.b64_json) {
    return { imageUrl: `data:image/png;base64,${image.b64_json}` };
  }

  if (image?.url) {
    return { imageUrl: image.url };
  }

  throw new Error("OpenAI response did not include an image.");
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

function isAuthError(error) {
  return error.status === 401 || error.status === 403;
}

function sendJson(response, status, data) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(JSON.stringify(data));
}
