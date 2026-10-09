(() => {
  const CACHE_NAME = "sewing-emotions-generated-assets-v1";
  const PATTERN_CACHE_URL = new URL("/__sewing-emotions/current-sewing-pattern", window.location.origin).href;

  async function storePatternImage(dataUrl) {
    if (!("caches" in window)) {
      throw new Error("This browser cannot store the generated sewing pattern.");
    }

    const sourceResponse = await fetch(dataUrl);
    const blob = await sourceResponse.blob();
    const cache = await caches.open(CACHE_NAME);
    await cache.put(PATTERN_CACHE_URL, new Response(blob, {
      headers: { "Content-Type": blob.type || "image/png" }
    }));
  }

  async function getPatternImageUrl() {
    if (!("caches" in window)) return "";

    const cache = await caches.open(CACHE_NAME);
    const response = await cache.match(PATTERN_CACHE_URL);
    if (!response) return "";

    return URL.createObjectURL(await response.blob());
  }

  window.sewingGeneratedImageStorage = {
    getPatternImageUrl,
    storePatternImage
  };
})();
