import {
  MODULE_ID,
  resolveImage,
  resolveGMPreview,
  isHiddenFrom,
  isGMInvisibleView,
} from "./illusion-data.js";

// Matches the Token HUD icon's purple, toned down so it reads as a tint, not a wash.
const TINT_COLOR = "rgba(184, 146, 255, 0.22)";
const GHOST_OPACITY = 0.4;
const GM_INVISIBLE_ALPHA = 0.5;

// Cache loaded PIXI textures (and composited canvases) by key so refreshToken
// (which fires every animation frame while dragging/updating) doesn't redo work.
// Failures are cached too (as null) - refreshToken fires many times per second,
// so a bad path must fail once and stay failed, never retry-and-reject on a loop.
const textureCache = new Map();

function getRoute(src) {
  return foundry.utils?.getRoute ? foundry.utils.getRoute(src) : src;
}

function getCachedTexture(src) {
  if (!textureCache.has(src)) {
    const loader = foundry.canvas?.loadTexture ?? loadTexture;
    textureCache.set(
      src,
      Promise.resolve(loader(src)).catch((err) => {
        console.warn(`false-tokens | failed to load texture "${src}"`, err);
        return null;
      }),
    );
  }
  return textureCache.get(src);
}

function loadImageElement(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`failed to load image "${src}"`));
    img.src = getRoute(src);
  });
}

// Tints only the image's own opaque silhouette purple (source-atop only paints
// where alpha already exists), so it stays legible instead of becoming a block of color.
function tintImage(img) {
  const canvasEl = document.createElement("canvas");
  canvasEl.width = img.naturalWidth || img.width;
  canvasEl.height = img.naturalHeight || img.height;
  const ctx = canvasEl.getContext("2d");
  ctx.drawImage(img, 0, 0, canvasEl.width, canvasEl.height);
  ctx.globalCompositeOperation = "source-atop";
  ctx.fillStyle = TINT_COLOR;
  ctx.fillRect(0, 0, canvasEl.width, canvasEl.height);
  ctx.globalCompositeOperation = "source-over";
  return canvasEl;
}

async function buildTintedIllusionTexture(illusionSrc) {
  const img = await loadImageElement(illusionSrc);
  return PIXI.Texture.from(tintImage(img));
}

async function buildMixedTexture(trueSrc, illusionSrc) {
  const [trueImg, illusionImg] = await Promise.all([
    loadImageElement(trueSrc),
    loadImageElement(illusionSrc),
  ]);
  const tintedIllusion = tintImage(illusionImg);

  const canvasEl = document.createElement("canvas");
  canvasEl.width = trueImg.naturalWidth || trueImg.width;
  canvasEl.height = trueImg.naturalHeight || trueImg.height;
  const ctx = canvasEl.getContext("2d");
  ctx.drawImage(trueImg, 0, 0, canvasEl.width, canvasEl.height);
  ctx.globalAlpha = GHOST_OPACITY;
  ctx.drawImage(tintedIllusion, 0, 0, canvasEl.width, canvasEl.height);
  ctx.globalAlpha = 1;
  return PIXI.Texture.from(canvasEl);
}

function previewKey(preview) {
  if (!preview) return null;
  if (preview.mode === "true") return "true";
  if (preview.mode === "illusion") return `tinted:${preview.src}`;
  return `mixed:${preview.trueSrc}|${preview.illusionSrc}`;
}

function getPreviewTexture(preview, doc) {
  const key = previewKey(preview);
  if (preview.mode === "true") return getCachedTexture(doc.texture.src);
  if (!textureCache.has(key)) {
    const builder =
      preview.mode === "illusion"
        ? buildTintedIllusionTexture(preview.src)
        : buildMixedTexture(preview.trueSrc, preview.illusionSrc);
    textureCache.set(
      key,
      builder.catch((err) => {
        console.warn(`false-tokens | failed to build preview texture "${key}"`, err);
        return null;
      }),
    );
  }
  return textureCache.get(key);
}

async function applyGMPreview(token, doc) {
  const preview = resolveGMPreview(doc);
  const key = previewKey(preview);
  if (token._falseTokensSrc === key) return;

  if (!preview) {
    if (!token._falseTokensSrc) return; // never overridden, nothing to revert
    const texture = await getCachedTexture(doc.texture.src);
    if (!texture || !token.mesh || token.destroyed) return;
    if (previewKey(resolveGMPreview(doc)) !== key) return;
    token.mesh.texture = texture;
    token._falseTokensSrc = null;
    return;
  }

  const texture = await getPreviewTexture(preview, doc);
  if (!texture || !token.mesh || token.destroyed) return;
  // Selection or flags may have changed again while the texture was loading.
  if (previewKey(resolveGMPreview(doc)) !== key) return;
  token.mesh.texture = texture;
  token._falseTokensSrc = key;
}

// Fully hides a token from a specific client without touching the synced document,
// only ever restoring visibility if we were the one who last forced it off (so we
// never fight core's own fog-of-war/hidden-token visibility logic). The token's
// artwork (token.mesh) lives in a separate primary-canvas render group from the
// token's own container (name/bars/border), so both need to be toggled - setting
// only token.visible left the actual image fully visible to "invisible" players.
function setHidden(token, hidden) {
  if (hidden) {
    token.visible = false;
    if (token.mesh) token.mesh.visible = false;
    token._falseTokensHidden = true;
  } else if (token._falseTokensHidden) {
    token.visible = true;
    if (token.mesh) token.mesh.visible = true;
    token._falseTokensHidden = false;
  }
}

// Base D&D/Foundry convention: the GM sees invisible creatures translucent.
function setGMInvisibleAlpha(token, active) {
  if (!token.mesh) return;
  if (active) {
    token.mesh.alpha = GM_INVISIBLE_ALPHA;
    token._falseTokensAlpha = true;
  } else if (token._falseTokensAlpha) {
    token.mesh.alpha = 1;
    token._falseTokensAlpha = false;
  }
}

async function revertTextureOverride(token, doc) {
  if (!token._falseTokensSrc) return;
  const texture = await getCachedTexture(doc.texture.src);
  if (!texture || !token.mesh || token.destroyed) return;
  token.mesh.texture = texture;
  token._falseTokensSrc = null;
}

async function applyIllusionUnsafe(token) {
  const doc = token?.document;
  if (!doc) return;

  if (game.user.isGM) {
    if (isGMInvisibleView(doc)) {
      setGMInvisibleAlpha(token, true);
      await revertTextureOverride(token, doc); // invisible mode never swaps texture
      return;
    }
    setGMInvisibleAlpha(token, false);
    await applyGMPreview(token, doc);
    return;
  }

  if (isHiddenFrom(doc, game.user)) {
    setHidden(token, true);
    return;
  }
  setHidden(token, false);

  const targetSrc = resolveImage(doc, game.user) ?? doc.texture.src;
  if (!targetSrc || token._falseTokensSrc === targetSrc) return;

  const texture = await getCachedTexture(targetSrc);
  if (!texture || !token.mesh || token.destroyed) return;
  const currentTarget = resolveImage(doc, game.user) ?? doc.texture.src;
  if (currentTarget !== targetSrc) return;

  token.mesh.texture = texture;
  token._falseTokensSrc = targetSrc;
}

// refreshToken/drawToken fire continuously (every animation frame while a token is
// moving/updating); never let an unexpected error surface as an unhandled rejection
// on every one of those ticks.
async function applyIllusion(token) {
  try {
    await applyIllusionUnsafe(token);
  } catch (err) {
    console.error("false-tokens | failed to apply token illusion", err);
  }
}

export function refreshAllTokenIllusions() {
  for (const token of canvas.tokens?.placeables ?? []) applyIllusion(token);
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
    refreshAllTokenIllusions();
  });
}
