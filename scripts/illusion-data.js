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

/**
 * Non-GM users who own at least one currently-controlled token, used to let the
 * GM preview what those players see. A player is included once even if they
 * own several selected tokens.
 */
export function getPreviewUsers() {
  const controlled = canvas.tokens?.controlled ?? [];
  const users = new Set();
  for (const token of controlled) {
    const actor = token.actor;
    if (!actor) continue;
    for (const user of game.users) {
      if (!user.isGM && actor.testUserPermission(user, "OWNER")) users.add(user);
    }
  }
  return Array.from(users);
}

/**
 * What the GM should see for this token, based on which players' tokens are
 * currently selected on the canvas. Null means "no override" (GM sees the
 * true image as usual).
 * @returns {null
 *   | {mode: "single", src: string}
 *   | {mode: "mixed", trueSrc: string, illusionSrc: string}}
 */
export function resolveGMPreview(tokenDocument) {
  const illusion = getIllusion(tokenDocument);
  if (!illusion?.active || !illusion.illusionImg) return null;

  const previewUsers = getPreviewUsers();
  if (!previewUsers.length) return null;

  const trueSrc = illusion.trueImg || tokenDocument.texture.src;
  const perUser = previewUsers.map((u) =>
    illusion.seesThrough?.includes(u.id) ? trueSrc : illusion.illusionImg,
  );

  if (new Set(perUser).size === 1) return { mode: "single", src: perUser[0] };
  return { mode: "mixed", trueSrc, illusionSrc: illusion.illusionImg };
}
