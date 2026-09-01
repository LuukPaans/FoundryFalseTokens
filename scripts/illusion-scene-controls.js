import { setSceneIllusionsActive } from "./illusion-data.js";

async function toggleAll(active) {
  await setSceneIllusionsActive(active);
  ui.notifications.info(
    game.i18n.localize(active ? "FALSETOKENS.EnabledAllNotification" : "FALSETOKENS.DisabledAllNotification"),
  );
}

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
      // Registered under both names: different Foundry versions/tool types
      // dispatch button clicks via one or the other, and having both costs nothing.
      onClick: () => toggleAll(true),
      onChange: () => toggleAll(true),
    };
    tokenControls.tools["false-tokens-disable-all"] = {
      name: "false-tokens-disable-all",
      title: "FALSETOKENS.DisableAllTooltip",
      icon: "fa-solid fa-toggle-off",
      order: order + 1,
      button: true,
      visible: game.user.isGM,
      onClick: () => toggleAll(false),
      onChange: () => toggleAll(false),
    };
  });
}
