export const MODULE_ID = "false-tokens";
export const FLAG_KEY = "illusion";

/**
 * @typedef {object} IllusionData
 * @property {boolean} active
 * @property {string} illusionImg - Image shown to fooled users.
 * @property {string} trueImg - Image shown to users who see through the illusion; blank
 *   means "whatever the token's current texture is".
 * @property {string[]} seesThrough - IDs of non-GM users who see the true image.
 */

/** @returns {IllusionData|null} */
export function getIllusion(tokenDocument) {
  return tokenDocument.getFlag(MODULE_ID, FLAG_KEY) ?? null;
}

export function isFooled(tokenDocument, user = game.user) {
  const illusion = getIllusion(tokenDocument);
  if (!illusion?.active || !illusion.illusionImg) return false;
  if (user.isGM) return false;
  return !illusion.seesThrough?.includes(user.id);
}

/** @returns {string|null} Image path to render for `user`, or null if no illusion applies. */
export function resolveImage(tokenDocument, user = game.user) {
  const illusion = getIllusion(tokenDocument);
  if (!illusion?.active || !illusion.illusionImg) return null;
  if (isFooled(tokenDocument, user)) return illusion.illusionImg;
  return illusion.trueImg || tokenDocument.texture.src;
}

export async function setIllusion(tokenDocument, data) {
  return tokenDocument.setFlag(MODULE_ID, FLAG_KEY, data);
}
