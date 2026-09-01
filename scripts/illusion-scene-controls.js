import { setSceneIllusionsActive } from "./illusion-data.js";

// Adds two buttons to the core "tokens" Scene Controls group (the toolbar with
// select/measure/ruler tools) so the GM can flip every configured effect in the
// current scene on or off in one click, without needing a token selected.
export function initIllusionSceneControls() {
  Hooks.on("getSceneControlButtons", (controls) => {
    const tokenControls = controls.tokens;
    if (!tokenControls || !game.user.isGM) return;

    const order = Object.keys(tokenControls.tools).length;
    tokenControls.tools["false-tokens-enable-all"] = {
      name: "false-tokens-enable-all",
      title: "FALSETOKENS.EnableAllTooltip",
      icon: "fa-solid fa-toggle-on",
      order,
      button: true,
      visible: game.user.isGM,
      onChange: () => setSceneIllusionsActive(true),
    };
    tokenControls.tools["false-tokens-disable-all"] = {
      name: "false-tokens-disable-all",
      title: "FALSETOKENS.DisableAllTooltip",
      icon: "fa-solid fa-toggle-off",
      order: order + 1,
      button: true,
      visible: game.user.isGM,
      onChange: () => setSceneIllusionsActive(false),
    };
  });
}
