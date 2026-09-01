import { MODULE_ID } from "./illusion-data.js";
import { initIllusionRendering } from "./illusion-render.js";
import { initIllusionHud } from "./illusion-hud.js";
import { initIllusionCombatTracker } from "./illusion-combat-tracker.js";

Hooks.once("init", () => {
  console.log(`${MODULE_ID} | initializing`);
});

Hooks.once("ready", () => {
  console.log(`${MODULE_ID} | ready`);
  initIllusionRendering();
  initIllusionHud();
  initIllusionCombatTracker();
});
