import { MODULE_ID, resolveImage, resolveGMPreview } from "./illusion-data.js";

// Matches the Token HUD icon's purple.
const MIX_TINT = "rgba(184, 146, 255, 0.35)";

// Cache loaded PIXI textures (and composited canvases) by key so refreshToken
// (which fires every animation frame while dragging/updating) doesn't redo work.
const textureCache = new Map();

function getRoute(src) {
  return foundry.utils?.getRoute ? foundry.utils.getRoute(src) : src;
}

async function getCachedTexture(src) {
  if (!textureCache.has(src)) {
    const loader = foundry.canvas?.loadTexture ?? loadTexture;
    textureCache.set(src, loader(src));
  }
  return textureCache.get(src);
}

function loadImageElement(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`false-tokens | failed to load ${src}`));
    img.src = getRoute(src);
  });
}

async function buildCompositeTexture(trueSrc, illusionSrc) {
  const [trueImg, illusionImg] = await Promise.all([
    loadImageElement(trueSrc),
    loadImageElement(illusionSrc),
  ]);
  const canvasEl = document.createElement("canvas");
  canvasEl.width = trueImg.naturalWidth || trueImg.width;
  canvasEl.height = trueImg.naturalHeight || trueImg.height;
  const ctx = canvasEl.getContext("2d");

  ctx.drawImage(trueImg, 0, 0, canvasEl.width, canvasEl.height);

  ctx.globalAlpha = 0.2;
  ctx.drawImage(illusionImg, 0, 0, canvasEl.width, canvasEl.height);
  ctx.globalAlpha = 1;

  // Tint just the silhouette drawn above (source-atop only paints over existing
  // alpha) so the ghost image reads as purple rather than its natural colors.
  ctx.globalCompositeOperation = "source-atop";
  ctx.fillStyle = MIX_TINT;
  ctx.fillRect(0, 0, canvasEl.width, canvasEl.height);
  ctx.globalCompositeOperation = "source-over";

  return PIXI.Texture.from(canvasEl);
}

function getCompositeTexture(trueSrc, illusionSrc) {
  const key = `mixed:${trueSrc}|${illusionSrc}`;
  if (!textureCache.has(key)) {
    textureCache.set(key, buildCompositeTexture(trueSrc, illusionSrc));
  }
  return textureCache.get(key);
}

function previewKey(preview) {
  if (!preview) return null;
  return preview.mode === "single" ? preview.src : `mixed:${preview.trueSrc}|${preview.illusionSrc}`;
}

async function applyGMPreview(token, doc) {
  const preview = resolveGMPreview(doc);
  const key = previewKey(preview);
  if (token._falseTokensSrc === key) return;

  if (!preview) {
    if (!token._falseTokensSrc) return; // never overridden, nothing to revert
    const texture = await getCachedTexture(doc.texture.src);
    if (!token.mesh || token.destroyed) return;
    if (previewKey(resolveGMPreview(doc)) !== key) return;
    token.mesh.texture = texture;
    token._falseTokensSrc = null;
    return;
  }

  const texture = preview.mode === "single"
    ? await getCachedTexture(preview.src)
    : await getCompositeTexture(preview.trueSrc, preview.illusionSrc);

  if (!token.mesh || token.destroyed) return;
  // Selection or flags may have changed again while the texture was loading.
  if (previewKey(resolveGMPreview(doc)) !== key) return;
  token.mesh.texture = texture;
  token._falseTokensSrc = key;
}

async function applyIllusion(token) {
  const doc = token?.document;
  if (!doc) return;

  if (game.user.isGM) {
    await applyGMPreview(token, doc);
    return;
  }

  const targetSrc = resolveImage(doc, game.user) ?? doc.texture.src;
  if (!targetSrc || token._falseTokensSrc === targetSrc) return;

  const texture = await getCachedTexture(targetSrc);
  if (!token.mesh || token.destroyed) return;
  const currentTarget = resolveImage(doc, game.user) ?? doc.texture.src;
  if (currentTarget !== targetSrc) return;

  token.mesh.texture = texture;
  token._falseTokensSrc = targetSrc;
}

export function initIllusionRendering() {
  Hooks.on("drawToken", (token) => applyIllusion(token));
  Hooks.on("refreshToken", (token) => applyIllusion(token));

  Hooks.on("updateToken", (tokenDocument, changes) => {
    if (!foundry.utils.hasProperty(changes, `flags.${MODULE_ID}`)) return;
    const token = tokenDocument.object;
    if (!token) return;
    // Force re-evaluation even if the resolved path happens to match the cached one.
    token._falseTokensSrc = null;
    applyIllusion(token);
  });

  // The GM's preview depends on which player tokens are selected, not on any
  // single token's own data, so re-evaluate every token when selection changes.
  Hooks.on("controlToken", () => {
    if (!game.user.isGM || !canvas.ready) return;
    for (const token of canvas.tokens?.placeables ?? []) applyIllusion(token);
  });
}
