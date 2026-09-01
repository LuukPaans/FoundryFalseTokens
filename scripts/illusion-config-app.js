import { MODULE_ID, getIllusion, setIllusion } from "./illusion-data.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class IllusionConfig extends HandlebarsApplicationMixin(ApplicationV2) {
  static #instances = new Map();

  static DEFAULT_OPTIONS = {
    tag: "form",
    window: {
      title: "FALSETOKENS.ConfigTitle",
      icon: "fa-solid fa-mask",
      contentClasses: ["false-tokens-config"],
    },
    position: { width: 420, height: "auto" },
    form: {
      handler: IllusionConfig.#onSubmit,
      submitOnChange: true,
      closeOnSubmit: false,
    },
    actions: {
      pickIllusion: IllusionConfig.#onPickImage,
      pickTrue: IllusionConfig.#onPickImage,
      allTrue: IllusionConfig.#onBulkToggle,
      allFalse: IllusionConfig.#onBulkToggle,
    },
  };

  static PARTS = {
    body: { template: `modules/${MODULE_ID}/templates/illusion-config.hbs` },
  };

  constructor(tokenDocument, options = {}) {
    super({ ...options, id: `false-tokens-config-${tokenDocument.id}` });
    this.tokenDocument = tokenDocument;
  }

  get title() {
    return game.i18n.format("FALSETOKENS.ConfigTitleFor", { name: this.tokenDocument.name });
  }

  static open(tokenDocument) {
    let app = IllusionConfig.#instances.get(tokenDocument.id);
    if (!app) {
      app = new IllusionConfig(tokenDocument);
      IllusionConfig.#instances.set(tokenDocument.id, app);
    }
    app.render(true);
    return app;
  }

  async _prepareContext() {
    const illusion = getIllusion(this.tokenDocument) ?? {};
    const isInvisible = illusion.type === "invisible";
    const users = game.users
      .filter((u) => !u.isGM)
      .map((u) => ({
        id: u.id,
        name: u.name,
        fooled: illusion.fooled?.includes(u.id) ?? false,
      }));
    return {
      active: illusion.active ?? false,
      isInvisible,
      illusionImg: illusion.illusionImg ?? "",
      users,
    };
  }

  static async #onPickImage(event, target) {
    const fieldName = target.dataset.target;
    const input = this.element.querySelector(`input[name="${fieldName}"]`);
    const FP = foundry.applications.apps.FilePicker.implementation ?? FilePicker;
    const picker = new FP({
      type: "image",
      current: input?.value || this.tokenDocument.texture.src,
      callback: (path) => {
        if (input) input.value = path;
        this.element.requestSubmit();
      },
    });
    picker.render(true);
  }

  static async #onBulkToggle(event, target) {
    const checked = target.dataset.action === "allTrue";
    this.element.querySelectorAll('input[name^="fooled."]').forEach((el) => {
      el.checked = checked;
    });
    this.element.requestSubmit();
  }

  static async #onSubmit(event, form, formData) {
    const data = foundry.utils.expandObject(formData.object);
    const existing = getIllusion(this.tokenDocument) ?? {};
    const fooled = Object.entries(data.fooled ?? {})
      .filter(([, checked]) => checked)
      .map(([id]) => id);
    await setIllusion(this.tokenDocument, {
      active: !!data.active,
      type: data.type === "invisible" ? "invisible" : "illusion",
      // These fields are hidden (not submitted) when type is invisible, or always
      // (trueImg) — don't blow away a previously-set value just because it's hidden.
      illusionImg: data.illusionImg !== undefined ? data.illusionImg : (existing.illusionImg ?? ""),
      trueImg: existing.trueImg ?? "",
      fooled,
    });
  }

  async _onClose(options) {
    await super._onClose?.(options);
    IllusionConfig.#instances.delete(this.tokenDocument.id);
  }
}
