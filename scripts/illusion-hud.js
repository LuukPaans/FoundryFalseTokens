import { MODULE_ID, SETTING_GM_PREVIEW, isGMPreviewEnabled } from "./illusion-data.js";
import { refreshAllTokenIllusions } from "./illusion-render.js";
import { IllusionConfig } from "./illusion-config-app.js";

function createConfigIcon(hud) {
  const icon = document.createElement("div");
  icon.classList.add("control-icon", "false-tokens-control-icon");
  icon.dataset.tooltip = game.i18n.localize("FALSETOKENS.HudTooltip");
  icon.innerHTML = `<i class="fa-solid fa-mask"></i>`;
  icon.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const tokenDocument = hud.object?.document ?? hud.document;
    if (tokenDocument) IllusionConfig.open(tokenDocument);
  });
  return icon;
}

function createDMViewToggle() {
  const icon = document.createElement("div");
  icon.classList.add("control-icon", "false-tokens-dm-view-toggle");
  icon.dataset.tooltip = game.i18n.localize("FALSETOKENS.DMViewTooltip");
  icon.innerHTML = `<i class="fa-solid fa-eye"></i>`;
  icon.classList.toggle("active", isGMPreviewEnabled());
  icon.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();
    const next = !isGMPreviewEnabled();
    await game.settings.set(MODULE_ID, SETTING_GM_PREVIEW, next);
    icon.classList.toggle("active", next);
    refreshAllTokenIllusions();
  });
  return icon;
}

export function initIllusionHud() {
  Hooks.on("renderTokenHUD", (hud, html) => {
    if (!game.user.isGM) return;

    const el = html instanceof HTMLElement ? html : html[0];
    if (!el) return;
    // Fall back gracefully in case the HUD's internal markup ever changes.
    const rightCol = el.querySelector(".col.right") ?? el.querySelector(".col.left") ?? el;
    const leftCol = el.querySelector(".col.left") ?? rightCol;

    rightCol.appendChild(createConfigIcon(hud));
    leftCol.appendChild(createDMViewToggle());
  });
}
