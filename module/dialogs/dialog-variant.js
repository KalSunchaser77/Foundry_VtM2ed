import CreateHelper from "../scripts/create-helpers.js";

export class DialogVariant extends FormApplication {
	constructor(actor, variant) {
		// "variant" is the data context for the dialog
		super(variant, {
			submitOnChange: true,
			closeOnSubmit: false
		});

		this.actor = actor;
		this.isDialog = true;
		this.options.title = `${this.actor.name}`;
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

  /* added */
  async render(force = false, options = {}) {
    // For Vampires, silently apply the Standard variant and skip the UI
    if (this.actor?.type === CONFIG.worldofdarkness.sheettype.vampire) {
      // Ensure we have a variant value; default to "general" (Standard)
      if (!this.object.variant) {
        this.object.variant = "general";
      }

      // Reuse the existing helper so we don’t duplicate logic
      await this._applyVampireDefault();

      // Do NOT call super.render – this prevents the window from ever opening
      return this;
    }

    // Non-vampire splats behave as normal
    return super.render(force, options);
  }
/*end added */
  
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
 * Silently apply the default Vampire variant (“general”),
 * open the actor sheet, then close the dialog.
 */
async _applyVampireDefault() {
  try {
    const actorData = foundry.utils.duplicate(this.actor);
    const variant = this.object.variant || "general";

    // Apply the same logic the dialog would have used
    await CreateHelper.SetVampireVariant(actorData, variant);
    actorData.system.settings.isupdated = false;

    // Update the actual Actor document
    await this.actor.update(actorData);

    // Add any variant-dependent items (if configured)
    await CreateHelper.SetVariantItems(
      this.actor,
      variant,
      game.data.system.version
    );

    // 🔹 Explicitly open the newly created Vampire’s sheet
    if (this.actor.sheet) {
      this.actor.sheet.render(true);
    }
  } catch (err) {
    console.error("VtM 2E – Failed to auto-apply default Vampire variant:", err);
  } finally {
    // Just in case, make sure the dialog itself is closed
    super.close();
  }
}
