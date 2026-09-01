import { MODULE_ID, resolveImage } from "./illusion-data.js";

// Cache loaded PIXI textures by path so refreshToken (which fires every animation
// frame while dragging/updating) doesn't reload the same image repeatedly.
const textureCache = new Map();

async function getCachedTexture(src) {
  if (!textureCache.has(src)) {
    const loader = foundry.canvas?.loadTexture ?? loadTexture;
    textureCache.set(src, loader(src));
  }
  return textureCache.get(src);
}

async function applyIllusion(token) {
  const doc = token?.document;
  if (!doc) return;
  const targetSrc = resolveImage(doc, game.user) ?? doc.texture.src;
  if (!targetSrc || token._falseTokensSrc === targetSrc) return;

  const texture = await getCachedTexture(targetSrc);
  if (!token.mesh || token.destroyed) return;
  // The flag or document may have changed again while the texture was loading.
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
}
