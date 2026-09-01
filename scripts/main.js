import { MODULE_ID, SETTING_GM_PREVIEW } from "./illusion-data.js";
import { initIllusionRendering } from "./illusion-render.js";
import { initIllusionHud } from "./illusion-hud.js";
import { initIllusionCombatTracker } from "./illusion-combat-tracker.js";
import { initIllusionSceneControls } from "./illusion-scene-controls.js";

// Registered at module-load time (like getSceneControlButtons hooks generally
// need to be) so it's in place before Foundry's first SceneControls render.
initIllusionSceneControls();

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
