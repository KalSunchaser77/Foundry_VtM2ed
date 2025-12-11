import CreateHelper from "../scripts/create-helpers.js";

export class Variant {
  constructor(actor) {
    this.canRoll = false;
    this.close = false;

    // Default variant per type
    if (actor.type === CONFIG.worldofdarkness.sheettype.changeling) {
      // Keep whatever variant the Changeling already has
      this.variant = actor.system.settings.variant;
    } else if (actor.type === CONFIG.worldofdarkness.sheettype.changingbreed) {
      // For Changing Breeds, variant is stored on the actor
      this.variant = actor.system.changingbreed;
    } else if (actor.type === CONFIG.worldofdarkness.sheettype.vampire) {
      // 👇 NEW: Vampires automatically default to “general”
      this.variant = "general";
    } else {
      this.variant = "";
    }

    // Used later in _save to decide which helper to call
    this.type = actor.type;
  }
}

export class DialogVariant extends FormApplication {
  constructor(actor, variant) {
    super(variant, { submitOnChange: true, closeOnSubmit: false });

    this.actor = actor;
    this.isDialog = true;
    this.options.title = `${this.actor.name}`;

    // 👇 NEW: For Vampires, auto-apply the default and never show the prompt
    if (this.actor.type === CONFIG.worldofdarkness.sheettype.vampire) {
      // Make sure the underlying Variant object has something sane
      if (!this.object.variant) {
        this.object.variant = "general";
      }

      // Defer so FormApplication finishes constructing before we update the actor
      setTimeout(() => {
        this._applyVampireDefault();
      }, 0);
    }
  }

  /**
   * Default dialog options
   */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["wod20", "wod-dialog", "dialog-top"],
      template: "systems/vtm20-2e-saa/templates/dialogs/dialog-variant.hbs",
      closeOnSubmit: false,
      submitOnChange: true,
      resizable: true
    });
  }

  getData() {
    const data = super.getData();
    data.actorData = this.actor.system;
    data.config = CONFIG.worldofdarkness;

    if (this.actor.type !== CONFIG.worldofdarkness.sheettype.changingbreed) {
      data.sheettype = this.actor.type.toLowerCase() + "Dialog";
    } else {
      data.sheettype = "werewolfDialog";
    }

    return data;
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.find(".actionbutton").click(this._select.bind(this));
    html.find(".savebutton").click(this._save.bind(this));
  }

  async _updateObject(event, formData) {
    if (this.object.close) {
      this.close();
      return;
    }

    event.preventDefault();
  }

  close() {
    // hook point if you ever want to do something on close
    super.close();
  }

  async _select(event) {
    event.preventDefault();

    const element = event.currentTarget;
    const dataset = element.dataset;

    this.object.variant = dataset.value;
    this.render();
  }

async _save() {
    // If this is a vampire and nothing was chosen, silently default to "general"
    if (this.actor.type === CONFIG.worldofdarkness.sheettype.vampire) {
        if (!this.object.variant) {
            this.object.variant = "general";
        }
    } else {
        // For non-vampire types, the user must explicitly pick something
        if (!this.object.variant) {
            ui.notifications.warn(game.i18n.localize("wod.warning.varianttype"));
            return;
        }
    }

    if (this.actor.type === CONFIG.worldofdarkness.sheettype.vampire) {
        await CreateHelper.SetVampireVariant(this.actor, this.object.variant);
    } else if (this.actor.type === CONFIG.worldofdarkness.sheettype.changeling) {
        await CreateHelper.SetChangelingVariant(this.actor, this.object.variant);
    } else if (this.actor.type === CONFIG.worldofdarkness.sheettype.changingbreed) {
        await CreateHelper.SetChangingVariant(this.actor, this.object.variant);
    } else if (this.actor.type === CONFIG.worldofdarkness.sheettype.mortal) {
        await CreateHelper.SetMortalVariant(this.actor, this.object, this.object.variant);
    } else if (this.actor.type === CONFIG.worldofdarkness.sheettype.creature) {
        await CreateHelper.SetCreatureVariant(this.actor, this.object.variant);
    }

    this.close();
}

  /**
   * NEW: silently apply the default Vampire variant (“general”) and close.
   * This is what gets called automatically from the constructor for Vampires.
   */
  async _applyVampireDefault() {
    try {
      const actorData = foundry.utils.duplicate(this.actor);
      const variant = this.object.variant || "general";

      await CreateHelper.SetVampireVariant(actorData, variant);

      actorData.system.settings.isupdated = false;

      await this.actor.update(actorData);
      await CreateHelper.SetVariantItems(
        this.actor,
        variant,
        game.data.system.version
      );
    } catch (err) {
      console.error("VtM 2E – Failed to auto-apply default Vampire variant:", err);
    } finally {
      // Just in case someone *does* open it manually somehow
      super.close();
    }
  }
}
