import { MODULE_ID, resolveImage, isHiddenFrom } from "./illusion-data.js";

function applyToRow(row, combat) {
  const combatantId = row.dataset.combatantId;
  const combatant = combat?.combatants.get(combatantId);
  const tokenDocument = combatant?.token;
  if (!tokenDocument) return;

  // Invisible mode: the player shouldn't learn about the creature from the tracker either.
  if (!game.user.isGM && isHiddenFrom(tokenDocument, game.user)) {
    row.style.display = "none";
    return;
  }

  const src = resolveImage(tokenDocument, game.user);
  if (!src) return;

  const img = row.querySelector("img.token-image") ?? row.querySelector("img");
  if (img && img.getAttribute("src") !== src) img.setAttribute("src", src);
}

export function initIllusionCombatTracker() {
  // Fires for the sidebar tracker and any popped-out tracker window, including
  // system-specific subclasses (e.g. dnd5e's), since ApplicationV2 dispatches
  // render hooks for every class up to BASE_APPLICATION.
  Hooks.on("renderCombatTracker", (app, html) => {
    const el = html instanceof HTMLElement ? html : html[0];
    if (!el) return;
    const combat = app.viewed ?? game.combats?.active;
    el.querySelectorAll("[data-combatant-id]").forEach((row) => applyToRow(row, combat));
  });

  // The tracker doesn't re-render on a plain flag change, so force one when the
  // GM edits an illusion — cheap, and keeps every open tracker window in sync.
  Hooks.on("updateToken", (tokenDocument, changes) => {
    if (!foundry.utils.hasProperty(changes, `flags.${MODULE_ID}`)) return;
    ui.combat?.render();
  });
}
