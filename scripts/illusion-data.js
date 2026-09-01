export const MODULE_ID = "false-tokens";
export const FLAG_KEY = "illusion";
export const SETTING_GM_PREVIEW = "gmPreviewEnabled";

/**
 * @typedef {object} IllusionData
 * @property {boolean} active
 * @property {"illusion"|"invisible"} type
 * @property {string} illusionImg - illusion mode: image shown to affected (fooled) users.
 * @property {string} trueImg - illusion mode: image shown to unaffected users; blank means
 *   "whatever the token's current texture is".
 * @property {string[]} fooled - IDs of non-GM users affected by the effect: for illusion
 *   mode they see illusionImg instead of the true image; for invisible mode they can't see
 *   the token at all. Users NOT in this list are unaffected either way.
 */

/** @returns {IllusionData|null} */
export function getIllusion(tokenDocument) {
  return tokenDocument.getFlag(MODULE_ID, FLAG_KEY) ?? null;
}

export function isFooled(tokenDocument, user = game.user) {
  const illusion = getIllusion(tokenDocument);
  if (!illusion?.active) return false;
  if (user.isGM) return false;
  return illusion.fooled?.includes(user.id) ?? false;
}

/** @returns {string|null} Image path to render for `user`, or null if no illusion applies. */
export function resolveImage(tokenDocument, user = game.user) {
  const illusion = getIllusion(tokenDocument);
  if (!illusion?.active || illusion.type !== "illusion" || !illusion.illusionImg) return null;
  if (isFooled(tokenDocument, user)) return illusion.illusionImg;
  return illusion.trueImg || tokenDocument.texture.src;
}

/** @returns {boolean} Whether the token should be fully hidden from `user` (invisible mode). */
export function isHiddenFrom(tokenDocument, user = game.user) {
  const illusion = getIllusion(tokenDocument);
  if (!illusion?.active || illusion.type !== "invisible") return false;
  return isFooled(tokenDocument, user);
}

/** @returns {boolean} Whether the GM should see a translucent "invisible" version of this token. */
export function isGMInvisibleView(tokenDocument) {
  const illusion = getIllusion(tokenDocument);
  return !!(illusion?.active && illusion.type === "invisible");
}

export async function setIllusion(tokenDocument, data) {
  return tokenDocument.setFlag(MODULE_ID, FLAG_KEY, data);
}

/**
 * Scene-wide master switch: activate or deactivate every configured effect
 * (illusion or invisible) on the current scene in one go, e.g. for "the
 * illusion breaks" or "it triggers for the whole party" moments.
 */
export async function setSceneIllusionsActive(active) {
  const scene = canvas.scene;
  if (!scene) return;

  const updates = [];
  for (const tokenDocument of scene.tokens) {
    const illusion = getIllusion(tokenDocument);
    if (!illusion || illusion.active === active) continue;
    updates.push({ _id: tokenDocument.id, [`flags.${MODULE_ID}.${FLAG_KEY}.active`]: active });
  }
  if (updates.length) await scene.updateEmbeddedDocuments("Token", updates);
}

export function isGMPreviewEnabled() {
  return game.settings.get(MODULE_ID, SETTING_GM_PREVIEW);
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
 * What the GM should see for this illusion-mode token, based on which players'
 * tokens are currently selected and whether GM preview is enabled. Null means
 * "no override" (GM sees the true image as usual).
 * @returns {null
 *   | {mode: "true"}
 *   | {mode: "illusion", src: string}
 *   | {mode: "mixed", trueSrc: string, illusionSrc: string}}
 */
export function resolveGMPreview(tokenDocument) {
  const illusion = getIllusion(tokenDocument);
  if (!illusion?.active || illusion.type !== "illusion" || !illusion.illusionImg) return null;
  if (!isGMPreviewEnabled()) return null;

  const previewUsers = getPreviewUsers();
  if (!previewUsers.length) return null;

  const trueSrc = illusion.trueImg || tokenDocument.texture.src;
  const perUser = previewUsers.map((u) =>
    illusion.fooled?.includes(u.id) ? illusion.illusionImg : trueSrc,
  );

  const distinct = new Set(perUser);
  if (distinct.size === 1) {
    const src = perUser[0];
    return src === trueSrc ? { mode: "true" } : { mode: "illusion", src: illusion.illusionImg };
  }
  return { mode: "mixed", trueSrc, illusionSrc: illusion.illusionImg };
}
