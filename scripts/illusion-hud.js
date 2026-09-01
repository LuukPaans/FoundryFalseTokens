import { IllusionConfig } from "./illusion-config-app.js";

export function initIllusionHud() {
  Hooks.on("renderTokenHUD", (hud, html) => {
    if (!game.user.isGM) return;

    const el = html instanceof HTMLElement ? html : html[0];
    if (!el) return;
    // Fall back gracefully in case the HUD's internal markup ever changes.
    const container = el.querySelector(".col.right") ?? el.querySelector(".col.left") ?? el;

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
    container.appendChild(icon);
  });
}
