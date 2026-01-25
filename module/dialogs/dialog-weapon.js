import CombatHelper from "../scripts/combat-helpers.js";
import BonusHelper from "../scripts/bonus-helpers.js";

import { DiceRoller } from "../scripts/roll-dice.js";
import { DiceRollContainer } from "../scripts/roll-dice.js";

/**
 * Safe integer parsing helper
 */
function toInt(value, fallback = 0) {
    const n = parseInt(value);
    return Number.isFinite(n) ? n : fallback;
}

export class MeleeWeapon {
    constructor(item) {
        this.attributeValue = 0;
        this.attributeName = "";

        this.abilityValue = 0;
        this.abilityName = "";

        this.hasSpeciality = false;
        this.specialityText = "";

        this._id = item["_id"];
        this.name = item["name"];
        this.weaponType = "Melee Weapon";

        this.dice1 = item.system.attack["attribute"];
        this.dice2 = item.system.attack["ability"];

        // NOTE: Melee weapons may not have accuracy defined; natural weapons do.
        // We still allow it as an ATTACK bonus only.
        this.bonus = toInt(item.system?.attack?.["accuracy"], 0);
        this.difficulty = toInt(item.system?.["difficulty"], -1);
        this.accuracy = toInt(item.system?.attack?.["accuracy"], 0);

        this.usedReducedDiff = false;
        this.hasburst = false;
        this.hasfullauto = false;
        this.hasspray = false;
        this.modename = "single";
        this.modebonus = 0;
        this.modedifficulty = 0;
        this.basedifficulty = toInt(item.system?.["difficulty"], -1);

        this.rollattack = !!item.system.attack["isrollable"];
        this.rolldamage = !!item.system.damage["isrollable"];

        this.system = item.system["description"];

        this.secondaryabilityid = this.dice2 == "custom" ? item.system.attack["secondaryabilityid"] : "";

        this.canRoll = this.difficulty > -1 ? true : false;
        this.close = false;
        this.sheettype = "";
    }
}

export class RangedWeapon {
    constructor(item) {
        this.attributeValue = 0;
        this.attributeName = "";

        this.abilityValue = 0;
        this.abilityName = "";

        this.hasSpeciality = false;
        this.specialityText = "";

        this._id = item["_id"];
        this.name = item["name"];
        this.weaponType = "Ranged Weapon";

        this.dice1 = item.system.attack["attribute"];
        this.dice2 = item.system.attack["ability"];

        // Firearms accuracy (if present) is treated as an ATTACK bonus only.
        this.bonus = toInt(item.system?.attack?.["accuracy"], 0);
        this.difficulty = toInt(item.system?.["difficulty"], -1);
        this.accuracy = toInt(item.system?.attack?.["accuracy"], 0);

        this.usedReducedDiff = false;
        this.hasburst = !!item.system?.mode?.["hasburst"];
        this.hasfullauto = !!item.system?.mode?.["hasfullauto"];
        this.hasspray = !!item.system?.mode?.["hasspray"];
        this.modename = "single";
        this.modebonus = 0;
        this.numberoftargets = 1;
        this.modedifficulty = 0;
        this.basedifficulty = toInt(item.system?.["difficulty"], -1);

        this.rollattack = !!item.system.attack["isrollable"];
        this.rolldamage = !!item.system.damage["isrollable"];

        this.system = item.system["description"];

        this.secondaryabilityid = this.dice2 == "custom" ? item.system.attack["secondaryabilityid"] : "";

        this.canRoll = this.difficulty > -1 ? true : false;
        this.close = false;
        this.sheettype = ""; 
    }
}

export class Damage {
    constructor(item) {
        this.attributeValue = 0;
        this.attributeName = "";

        this.abilityValue = 0;
        this.abilityName = "";

        this.hasSpeciality = false;
        this.specialityText = "";

        this.name = item["name"];
        this.weaponType = "Damage";

        this.dice1 = item.system.damage["attribute"];
        this.dice2 = "";
        this.bonus = toInt(item.system?.damage?.["bonus"], 0);

        // (Not actually accuracy; kept for compatibility with existing dialog binding)
        this.accuracy = toInt(item.system?.damage?.["bonus"], 0);

        this.difficulty = 6;
        this.damageType = item.system.damage["type"];
        this.damageCode = game.i18n.localize(CONFIG.worldofdarkness.damageTypes[this.damageType]);

        this.hasburst = false;
        this.hasfullauto = false;
        this.hasspray = false;
        this.modename = "single";
        this.numberoftargets = 1;
        this.modebonus = 0;
        this.modedifficulty = 0;
        this.basedifficulty = 6;

        if (item.system.extraSuccesses != undefined) {
            this.extraSuccesses = toInt(item.system.extraSuccesses, 0);
        }
        else {
            this.extraSuccesses = 0;
        }

        // if spray mode has been activated
        if ((item.system.modename != undefined) && (item.system.modename == "spray")) {
            this.modename = "spray";
            this.numberoftargets = toInt(item.system.numberoftargets, 1);
        }

        this.system = item.system["description"];

        this.canRoll = true;
        this.close = false;
        this.sheettype = "";
    }
}

export class DialogWeapon extends FormApplication {
    constructor(actor, weapon) {
        super(weapon, {submitOnChange: true, closeOnSubmit: false});
        this.actor = actor;
        this.isDialog = true;

        this.options.title = `${this.actor.name}`;
    }

    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            classes: ["wod20 wod-dialog weapon-dialog"],
            template: "systems/vtm20-2e-saa/templates/dialogs/dialog-weapon.hbs",
            closeOnSubmit: false,
            submitOnChange: true,
            resizable: true
        });
    }

    async getData() {
        const data = super.getData();

        let attributeSpeciality = "";
        let abilitySpeciality = "";
        let specialityText = "";

        data.actorData = this.actor.system;
        data.actorData.type = this.actor.type;
        data.config = CONFIG.worldofdarkness;
        data.config.meleeAbilities = this.actor.system.listdata.meleeAbilities;
        data.config.rangedAbilities = this.actor.system.listdata.rangedAbilities;

        if (data.actorData.type != CONFIG.worldofdarkness.sheettype.changingbreed) {
            data.object.sheettype = data.actorData.type.toLowerCase() + "Dialog";
        }
        else {
            data.object.sheettype = "werewolfDialog";
        }

        // is dice1 an Attributes
        if ((this.actor.system?.attributes != undefined) && (data.actorData.attributes[data.object.dice1]?.value != undefined)) {
            data.object.attributeValue = toInt(data.actorData.attributes[data.object.dice1].total, 0);
            data.object.attributeName = game.i18n.localize(data.actorData.attributes[data.object.dice1].label);

            if (toInt(data.actorData.attributes[data.object.dice1].value, 0) >= toInt(CONFIG.worldofdarkness.specialityLevel, 0)) {
                data.object.hasSpeciality = true;
                attributeSpeciality = data.actorData.attributes[data.object.dice1].speciality;
            }
        }
        // is dice1 an Advantage
        else if (data.actorData[data.object.dice1]?.roll != undefined) {
            data.object.attributeValue = toInt(data.actorData[data.object.dice1].roll, 0);
            data.object.attributeName = game.i18n.localize(data.actorData[data.object.dice1].label);

            // om willpower
            if ((this.actor.system[data.object.dice1].label == "wod.advantages.willpower") && (CONFIG.worldofdarkness.attributeSettings == "5th")) {
                if (toInt(data.actorData.attributes?.composure.value, 0) >= toInt(CONFIG.worldofdarkness.specialityLevel, 0)) {
                    data.object.hasSpeciality = true;
                    attributeSpeciality = data.actorData.attributes.composure.speciality;
                }

                if ((toInt(data.actorData.attributes?.resolve.value, 0) >= toInt(CONFIG.worldofdarkness.specialityLevel, 0)) && (data.actorData.attributes?.resolve.speciality != "")) {
                    data.object.hasSpeciality = true;

                    if (attributeSpeciality != "") {
                        attributeSpeciality += ", ";
                    }

                    attributeSpeciality += data.actorData.attributes.resolve.speciality;
                }
            }
        }

        if ((this.actor.system?.abilities != undefined) && (data.actorData.abilities[data.object.dice2]?.value != undefined)) {
            data.object.abilityValue = toInt(data.actorData.abilities[data.object.dice2].value, 0);

            if (data.actorData.abilities[data.object.dice2] == undefined) {
                data.object.abilityName = game.i18n.localize(data.actorData.abilities[data.object.dice2].label);
            }
            else {
                data.object.abilityName = (data.actorData.abilities[data.object.dice2].altlabel == "") ? game.i18n.localize(data.actorData.abilities[data.object.dice2].label) : data.actorData.abilities[data.object.dice2].altlabel;
            }

            if ((toInt(data.actorData.abilities[data.object.dice2].value, 0) >= toInt(CONFIG.worldofdarkness.specialityLevel, 0)) || (CONFIG.worldofdarkness.alwaysspeciality.includes(data.actorData.abilities[data.object.dice2]._id))) {
                data.object.hasSpeciality = true;
                abilitySpeciality = data.actorData.abilities[data.object.dice2].speciality;
            }
        }
        else if (data.object.dice2 == "custom") {
            if (this.object.secondaryabilityid != "") {
                const item = await this.actor.getEmbeddedDocument("Item", this.object.secondaryabilityid);
                this.object.abilityValue = toInt(item.system.value, 0);
                this.object.abilityName = item.system.label;

                if (toInt(item.system.value, 0) >= toInt(CONFIG.worldofdarkness.specialityLevel, 0)) {
                    data.object.hasSpeciality = true;
                    abilitySpeciality = item.system.speciality;
                }
            }
        }

        if (data.object.hasSpeciality) {
            if ((attributeSpeciality != "") && (abilitySpeciality != "")) {
                specialityText = attributeSpeciality + ", " + abilitySpeciality;
            }
            else if (attributeSpeciality != "") {
                specialityText = attributeSpeciality;
            }
            else if (abilitySpeciality != "") {
                specialityText = abilitySpeciality;
            }
        }

        data.object.specialityText = specialityText;

        if (await BonusHelper.CheckAttributeDiceBuff(this.actor, data.object.dice1)) {
            let bonus = await BonusHelper.GetAttributeDiceBuff(this.actor, data.object.dice1);
            data.object.attributeValue += toInt(bonus, 0);
        }

        if (await BonusHelper.CheckAbilityBuff(this.actor, data.object.dice2)) {
            let bonus = await BonusHelper.GetAbilityBuff(this.actor, data.object.dice2);
            this.object.abilityValue += toInt(bonus, 0);
        }

        return data;
    }

    activateListeners(html) {
        super.activateListeners(html);

        html.find('.dialog-difficulty-button').click(this._setDifficulty.bind(this));
        html.find('.dialog-numbertargets-button').click(this._setNumberTargets.bind(this));
        html.find('.dialog-secondaryability-button').click(this._setSecondaryAbility.bind(this));
        html.find('.dialog-mode-button').click(this._setMode.bind(this));
        html.find('.actionbutton').click(this._rollAttack.bind(this));
        html.find('.closebutton').click(this._closeForm.bind(this));
    }

    async _updateObject(event, formData){
        if (this.object.close) {
            this.close();
            return;
        }

        event.preventDefault();

        this.object.useSpeciality = formData["specialty"];
        this.object.useWillpower = formData["useWillpower"];

        if (this.object.useSpeciality && CONFIG.worldofdarkness.usespecialityReduceDiff && !this.object.usedReducedDiff) {
            this.object.difficulty -= toInt(CONFIG.worldofdarkness.specialityReduceDiff, 0);
            this.object.usedReducedDiff = true;
        }
        else if (!this.object.useSpeciality && CONFIG.worldofdarkness.usespecialityReduceDiff && this.object.usedReducedDiff){
            this.object.difficulty += toInt(CONFIG.worldofdarkness.specialityReduceDiff, 0);
            this.object.usedReducedDiff = false;
        }

        try {
            this.object.bonus = toInt(formData["bonus"], 0);
        }
        catch {
            this.object.bonus = 0;
        }

        this.object.canRoll = this.object.difficulty > -1 ? true : false;

        this.render();
    }

    close() {
        super.close()
    }

    _setDifficulty(event) {
        event.preventDefault();

        const element = event.currentTarget;
        const parent = $(element.parentNode);
        const steps = parent.find(".dialog-difficulty-button");
        const index = toInt(element.value, -1);

        this.object.difficulty = index + toInt(this.object.modedifficulty, 0);
        this.object.canRoll = this.object.difficulty > -1 ? true : false;

        if (index < 0) return;

        steps.removeClass("active");
        steps.each(function () {
            if (toInt(this.value, -999) === index) $(this).addClass("active");
        });
    }

    _setNumberTargets(event) {
        event.preventDefault();

        const element = event.currentTarget;
        const parent = $(element.parentNode);
        const steps = parent.find(".dialog-numbertargets-button");
        const index = toInt(element.value, 1);

        this.object.numberoftargets = index;

        if (index < 0) return;

        steps.removeClass("active");
        steps.each(function () {
            if (toInt(this.value, -999) === index) $(this).addClass("active");
        });
    }

    _setMode(event) {
        const element = event.currentTarget;
        const parent = $(element.parentNode);
        const steps = parent.find(".dialog-mode-button");

        const key = element.value;

        this.object.modebonus = 0;
        this.object.modedifficulty = 0;

        if (key == "") {
            steps.removeClass("active");
            return;
        }

        if (key == "single") {
            this.object.modebonus = 0;
            this.object.modedifficulty = 0;
            this.object.numberoftargets = 1;
        }
        if (key == "burst") {
            this.object.modebonus = 3;
            this.object.modedifficulty = 1;
            this.object.numberoftargets = 1;
        }
        if (key == "fullauto") {
            this.object.modebonus = 10;
            this.object.modedifficulty = 2;
            this.object.numberoftargets = 1;
        }
        if (key == "spray") {
            this.object.modebonus = 10;
            this.object.modedifficulty = 2;
            this.object.numberoftargets = 1;
        }

        this.object.modename = key;

        steps.removeClass("active");
        steps.each(function () {
            if (this.value == key) $(this).addClass("active");
        });

        this.object.difficulty = toInt(this.object.basedifficulty, 0) + toInt(this.object.modedifficulty, 0);
        this.object.bonus = toInt(this.object.accuracy, 0) + toInt(this.object.modebonus, 0);

        this.render();
    }

    async _setSecondaryAbility(event) {
        event.preventDefault();

        const element = event.currentTarget;
        const parent = $(element.parentNode);
        const steps = parent.find(".dialog-secondaryability-button");
        const key = element.value;

        if (key == "") {
            steps.removeClass("active");
            return;
        }

        const abilityId = key;
        const item = await this.actor.getEmbeddedDocument("Item", abilityId);

        this.object.abilityValue = toInt(item.system.value, 0);
        this.object.abilityName = item.system.label;
        this.object.secondaryabilityid = item._id;

        steps.removeClass("active");
        steps.each(function () {
            if (this.value == key) $(this).addClass("active");
        });

        this.render();
    }

    async _rollAttack(event) {
        if (this.object.close) {
            this.close();
            return;
        }

        this.object.canRoll = this.object.difficulty > -1 ? true : false;
        let woundPenaltyVal = 0;

        if (!this.object.canRoll) {
            ui.notifications.warn(game.i18n.localize("wod.dialog.missingdifficulty"));
            return;
        }

        let template = [];
        let numDices = 0;

        const weaponRoll = new DiceRollContainer(this.actor);
        weaponRoll.attribute = this.object.dice1;
        weaponRoll.ability = this.object.dice2;

        if (this.object.weaponType == "Damage") {
            let prevtext = false;

            weaponRoll.origin = "damage";
            weaponRoll.action = `${this.object.name} (${game.i18n.localize("wod.dialog.weapon.damage")})`;

            if (this.object.attributeName != "") {
                template.push(`${this.object.attributeName} (${this.object.attributeValue})`);
                prevtext = true;
            }

            if (this.object.abilityValue > 0) {
                template.push(this.object.abilityValue);
                prevtext = true;
            }

            // NOTE: this.object.bonus here is DAMAGE bonus, not attack accuracy.
            if (this.object.extraSuccesses > 0) {
                template.push(this.object.extraSuccesses);
            }

            weaponRoll.damageCode = `(${this.object.damageCode})`;

            if (CONFIG.worldofdarkness.usePenaltyDamage) {
                if (CombatHelper.ignoresPain(this.actor)) {
                    woundPenaltyVal = 0;
                }
                else {
                    woundPenaltyVal = toInt(this.actor.system.health.damage.woundpenalty, 0);
                }
            }

            // if several targets number of dices will be different
            if (this.object.numberoftargets == 1) {
                numDices =
                    toInt(this.object.attributeValue, 0) +
                    toInt(this.object.abilityValue, 0) +
                    toInt(this.object.bonus, 0) +
                    toInt(this.object.extraSuccesses, 0);
            }
        }
        else {
            weaponRoll.origin = "attack";
            weaponRoll.action = `${this.object.name} (${game.i18n.localize("wod.dialog.weapon.attack")})`;
            template.push(`${this.object.attributeName} (${this.object.attributeValue})`);

            if (this.object.abilityName != "") {
                template.push(`${this.object.abilityName} (${this.object.abilityValue})`);
            }

            if (this.object.modename != "single") {
                if (this.object.modename == "burst") weaponRoll.extraInfo.push(game.i18n.localize("wod.dialog.weapon.usingburst"));
                if (this.object.modename == "fullauto") weaponRoll.extraInfo.push(game.i18n.localize("wod.dialog.weapon.usingauto"));
                if (this.object.modename == "spray") weaponRoll.extraInfo.push(game.i18n.localize("wod.dialog.weapon.usingspray"));
            }

            if (CombatHelper.ignoresPain(this.actor)) {
                woundPenaltyVal = 0;
            }
            else {
                woundPenaltyVal = toInt(this.actor.system.health.damage.woundpenalty, 0);
            }

            // Attack dice pool includes attack bonus (accuracy etc.)
            numDices = toInt(this.object.attributeValue, 0) + toInt(this.object.abilityValue, 0) + toInt(this.object.bonus, 0);
        }

        let specialityText = "";
        this.object.close = true;

        if (this.object.useSpeciality) {
            specialityText = this.object.specialityText;
        }

        weaponRoll.numDices = numDices;
        weaponRoll.difficulty = toInt(this.object.difficulty, 6);
        weaponRoll.dicetext = template;
        weaponRoll.usewillpower = this.object.useWillpower;
        weaponRoll.woundpenalty = toInt(woundPenaltyVal, 0);

        if (weaponRoll.origin == "attack") {
            weaponRoll.systemText = this.object.system;
            weaponRoll.speciality = this.object.useSpeciality;
            weaponRoll.specialityText = specialityText;
        }
        else {
            if (!CONFIG.worldofdarkness.usePenaltyDamage) {
                weaponRoll.woundpenalty = 0;
            }
            weaponRoll.speciality = false;
            weaponRoll.systemText = "";
        }

        if ((weaponRoll.origin == "attack") && (this.object.rollattack)) {
            weaponRoll.bonus = toInt(this.object.bonus, 0);

            let item = await this.actor.getEmbeddedDocument("Item", this.object._id);

            if (this.object.dice2 == "custom") {
                const itemData = foundry.utils.duplicate(item);
                itemData.system.attack.secondaryabilityid = this.object.secondaryabilityid;
                await item.update(itemData);
            }

            const numberOfSuccesses = await DiceRoller(weaponRoll);

            if ((numberOfSuccesses > 0) && (this.object.rolldamage)) {
                /**
                 * FIXES:
                 * - Melee/Natural: do NOT add attack successes to damage at all (listed damage only).
                 *   This also prevents Natural Weapon Accuracy from inflating damage.
                 * - Firearms (RangedWeapon): add EACH success to damage (not -1).
                 */
                const isRanged = (this.object.weaponType === "Ranged Weapon");
                const isMelee = (this.object.weaponType === "Melee Weapon");

                let extraForDamage = 0;

                if (isRanged) {
                    // Firearms rule: each success adds one damage die
                    extraForDamage = toInt(numberOfSuccesses, 0);
                }
                else if (isMelee) {
                    // Melee/natural: no success-to-damage conversion
                    extraForDamage = 0;
                }

                item.system.extraSuccesses = extraForDamage;
                item.system.numberoftargets = this.object.numberoftargets;
                item.system.modename = this.object.modename;

                const damageData = new Damage(item);
                let rollDamage = new DialogWeapon(this.actor, damageData);
                rollDamage.render(true);
            }
        }
        else {
            weaponRoll.bonus = toInt(this.object.bonus, 0);

            // if you have selected multiple targets and thus are to roll several damage rolls with one "session"
            if ((this.object.numberoftargets > 1) && (this.object.modename == "spray")) {
                let numberTargets = toInt(this.object.numberoftargets, 1);

                // Under "each success adds a die", total available successes to allocate is extraSuccesses (not +1).
                let maxnumberTargets = toInt(this.object.extraSuccesses, 0);

                if (numberTargets > maxnumberTargets) {
                    numberTargets = maxnumberTargets;
                }

                const targetlist = [];

                // Base damage dice for each target (as system currently defines it)
                const baseDice =
                    toInt(this.object.attributeValue, 0) +
                    toInt(this.object.abilityValue, 0) +
                    toInt(this.object.bonus, 0);

                // To hit N targets, we must allocate 1 success to each target.
                // Since "each success adds a die", that allocated success ALSO contributes +1 die to that target.
                // Remaining successes beyond those N get distributed round-robin.
                let rolledSuccesses = maxnumberTargets;

                // Create the "bag of number of dices"
                for (let i = 0; i <= numberTargets - 1; i++) {
                    let target = {
                        // +1 here accounts for the "hit" success that is also a damage die under your rule.
                        numDices: baseDice + 1
                    };
                    targetlist.push(target);
                }

                // Remove the N successes already allocated (one per target)
                rolledSuccesses = rolledSuccesses - numberTargets;

                // Distribute remaining successes
                let list = 0;
                while (rolledSuccesses > 0) {
                    targetlist[list].numDices += 1;
                    rolledSuccesses -= 1;

                    if (list == numberTargets - 1) list = 0;
                    else list += 1;
                }

                let spraytext = `${game.i18n.localize("wod.dialog.weapon.sprayresult")}`;
                spraytext = spraytext.replace("[0]", this.object.numberoftargets);
                spraytext = spraytext.replace("[1]", numberTargets);

                weaponRoll.extraInfo.push(spraytext);
                weaponRoll.targetlist = targetlist;
                DiceRoller(weaponRoll);
            }
            else {
                DiceRoller(weaponRoll);
            }
        }
    }

    _closeForm(event) {
        this.object.close = true;
    }
}

function parseCounterStates(states) {
    return states.split(",").reduce((obj, state) => {
        const [k, v] = state.split(":");
        obj[k] = v;
        return obj;
    }, {});
}
