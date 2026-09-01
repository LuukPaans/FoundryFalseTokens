import { MODULE_ID, SETTING_GM_PREVIEW } from "./illusion-data.js";
import { initIllusionRendering } from "./illusion-render.js";
import { initIllusionHud } from "./illusion-hud.js";
import { initIllusionCombatTracker } from "./illusion-combat-tracker.js";

Hooks.once("init", () => {
  console.log(`${MODULE_ID} | initializing`);
  game.settings.register(MODULE_ID, SETTING_GM_PREVIEW, {
    scope: "client",
    config: false,
    type: Boolean,
    default: false,
  });
});

Hooks.once("ready", () => {
  console.log(`${MODULE_ID} | ready`);
  initIllusionRendering();
  initIllusionHud();
  initIllusionCombatTracker();
});
