import { Stat } from "#enums/stat";
import { SpeciesStatBoosterModifier } from "#app/modifier/modifier";
import { modifierTypes } from "#app/data/data-lists";
import i18next from "#app/plugins/i18n";
import { NumberHolder } from "#app/utils/common";
import { SpeciesId } from "#enums/species-id";
import GameManager from "#test/testUtils/gameManager";
import Phase from "phaser";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

describe("Items - Light Ball", () => {
  let phaserGame: Phaser.Game;
  let game: GameManager;

  beforeAll(() => {
    phaserGame = new Phase.Game({
      type: Phaser.HEADLESS,
    });
  });

  afterEach(() => {
    game.phaseInterceptor.restoreOg();
  });

  beforeEach(() => {
    game = new GameManager(phaserGame);

    game.override.battleStyle("single");
  });

  it("LIGHT_BALL activates in battle correctly", async () => {
    game.override.startingHeldItems([{ name: "RARE_SPECIES_STAT_BOOSTER", type: "LIGHT_BALL" }]);
    const consoleSpy = vi.spyOn(console, "log");
    await game.classicMode.startBattle([SpeciesId.PIKACHU]);

    const partyMember = game.scene.getPlayerParty()[0];

    // Checking console log to make sure Light Ball is applied when getEffectiveStat (with the appropriate stat) is called
    partyMember.getEffectiveStat(Stat.DEF);
    expect(consoleSpy).not.toHaveBeenLastCalledWith(
      "Applied",
      i18next.t("modifierType:SpeciesBoosterItem.LIGHT_BALL.name"),
      "",
    );

    // Printing dummy console messages along the way so subsequent checks don't pass because of the first
    console.log("");

    partyMember.getEffectiveStat(Stat.SPDEF);
    expect(consoleSpy).not.toHaveBeenLastCalledWith(
      "Applied",
      i18next.t("modifierType:SpeciesBoosterItem.LIGHT_BALL.name"),
      "",
    );

    console.log("");

    partyMember.getEffectiveStat(Stat.ATK);
    expect(consoleSpy).toHaveBeenLastCalledWith(
      "Applied",
      i18next.t("modifierType:SpeciesBoosterItem.LIGHT_BALL.name"),
      "",
    );

    console.log("");

    partyMember.getEffectiveStat(Stat.SPATK);
    expect(consoleSpy).toHaveBeenLastCalledWith(
      "Applied",
      i18next.t("modifierType:SpeciesBoosterItem.LIGHT_BALL.name"),
      "",
    );

    console.log("");

    partyMember.getEffectiveStat(Stat.SPD);
    expect(consoleSpy).not.toHaveBeenLastCalledWith(
      "Applied",
      i18next.t("modifierType:SpeciesBoosterItem.LIGHT_BALL.name"),
      "",
    );
  });

  it("LIGHT_BALL held by PIKACHU", async () => {
    await game.classicMode.startBattle([SpeciesId.PIKACHU]);

    const partyMember = game.scene.getPlayerParty()[0];

    const atkStat = partyMember.getStat(Stat.ATK);
    const spAtkStat = partyMember.getStat(Stat.SPATK);

    // Making sure modifier is not applied without holding item
    const atkValue = new NumberHolder(atkStat);
    game.scene.applyModifiers(SpeciesStatBoosterModifier, true, partyMember, Stat.DEF, atkValue);
    const spAtkValue = new NumberHolder(spAtkStat);
    game.scene.applyModifiers(SpeciesStatBoosterModifier, true, partyMember, Stat.SPDEF, spAtkValue);

    expect(atkValue.value / atkStat).toBe(1);
    expect(spAtkValue.value / spAtkStat).toBe(1);

    // Giving Eviolite to party member and testing if it applies
    await game.scene.addModifier(
      modifierTypes.RARE_SPECIES_STAT_BOOSTER().generateType([], ["LIGHT_BALL"])!.newModifier(partyMember),
      true,
    );
    game.scene.applyModifiers(SpeciesStatBoosterModifier, true, partyMember, Stat.ATK, atkValue);
    game.scene.applyModifiers(SpeciesStatBoosterModifier, true, partyMember, Stat.SPATK, spAtkValue);

    expect(atkValue.value / atkStat).toBe(2);
    expect(spAtkValue.value / spAtkStat).toBe(2);
  });

  it("LIGHT_BALL held by fused PIKACHU (base)", async () => {
    await game.classicMode.startBattle([SpeciesId.PIKACHU, SpeciesId.MAROWAK]);

    const partyMember = game.scene.getPlayerParty()[0];
    const ally = game.scene.getPlayerParty()[1];

    // Fuse party members (taken from PlayerPokemon.fuse(...) function)
    partyMember.fusionSpecies = ally.species;
    partyMember.fusionFormIndex = ally.formIndex;
    partyMember.fusionAbilityIndex = ally.abilityIndex;
    partyMember.fusionShiny = ally.shiny;
    partyMember.fusionVariant = ally.variant;
    partyMember.fusionGender = ally.gender;
    partyMember.fusionLuck = ally.luck;

    const atkStat = partyMember.getStat(Stat.ATK);
    const spAtkStat = partyMember.getStat(Stat.SPATK);

    // Making sure modifier is not applied without holding item
    const atkValue = new NumberHolder(atkStat);
    game.scene.applyModifiers(SpeciesStatBoosterModifier, true, partyMember, Stat.DEF, atkValue);
    const spAtkValue = new NumberHolder(spAtkStat);
    game.scene.applyModifiers(SpeciesStatBoosterModifier, true, partyMember, Stat.SPDEF, spAtkValue);

    expect(atkValue.value / atkStat).toBe(1);
    expect(spAtkValue.value / spAtkStat).toBe(1);

    // Giving Eviolite to party member and testing if it applies
    await game.scene.addModifier(
      modifierTypes.RARE_SPECIES_STAT_BOOSTER().generateType([], ["LIGHT_BALL"])!.newModifier(partyMember),
      true,
    );
    game.scene.applyModifiers(SpeciesStatBoosterModifier, true, partyMember, Stat.ATK, atkValue);
    game.scene.applyModifiers(SpeciesStatBoosterModifier, true, partyMember, Stat.SPATK, spAtkValue);

    expect(atkValue.value / atkStat).toBe(2);
    expect(spAtkValue.value / spAtkStat).toBe(2);
  });

  it("LIGHT_BALL held by fused PIKACHU (part)", async () => {
    await game.classicMode.startBattle([SpeciesId.MAROWAK, SpeciesId.PIKACHU]);

    const partyMember = game.scene.getPlayerParty()[0];
    const ally = game.scene.getPlayerParty()[1];

    // Fuse party members (taken from PlayerPokemon.fuse(...) function)
    partyMember.fusionSpecies = ally.species;
    partyMember.fusionFormIndex = ally.formIndex;
    partyMember.fusionAbilityIndex = ally.abilityIndex;
    partyMember.fusionShiny = ally.shiny;
    partyMember.fusionVariant = ally.variant;
    partyMember.fusionGender = ally.gender;
    partyMember.fusionLuck = ally.luck;

    const atkStat = partyMember.getStat(Stat.ATK);
    const spAtkStat = partyMember.getStat(Stat.SPATK);

    // Making sure modifier is not applied without holding item
    const atkValue = new NumberHolder(atkStat);
    game.scene.applyModifiers(SpeciesStatBoosterModifier, true, partyMember, Stat.DEF, atkValue);
    const spAtkValue = new NumberHolder(spAtkStat);
    game.scene.applyModifiers(SpeciesStatBoosterModifier, true, partyMember, Stat.SPDEF, spAtkValue);

    expect(atkValue.value / atkStat).toBe(1);
    expect(spAtkValue.value / spAtkStat).toBe(1);

    // Giving Eviolite to party member and testing if it applies
    await game.scene.addModifier(
      modifierTypes.RARE_SPECIES_STAT_BOOSTER().generateType([], ["LIGHT_BALL"])!.newModifier(partyMember),
      true,
    );
    game.scene.applyModifiers(SpeciesStatBoosterModifier, true, partyMember, Stat.ATK, atkValue);
    game.scene.applyModifiers(SpeciesStatBoosterModifier, true, partyMember, Stat.SPATK, spAtkValue);

    expect(atkValue.value / atkStat).toBe(2);
    expect(spAtkValue.value / spAtkStat).toBe(2);
  });

  it("LIGHT_BALL not held by PIKACHU", async () => {
    await game.classicMode.startBattle([SpeciesId.MAROWAK]);

    const partyMember = game.scene.getPlayerParty()[0];

    const atkStat = partyMember.getStat(Stat.ATK);
    const spAtkStat = partyMember.getStat(Stat.SPATK);

    // Making sure modifier is not applied without holding item
    const atkValue = new NumberHolder(atkStat);
    game.scene.applyModifiers(SpeciesStatBoosterModifier, true, partyMember, Stat.DEF, atkValue);
    const spAtkValue = new NumberHolder(spAtkStat);
    game.scene.applyModifiers(SpeciesStatBoosterModifier, true, partyMember, Stat.SPDEF, spAtkValue);

    expect(atkValue.value / atkStat).toBe(1);
    expect(spAtkValue.value / spAtkStat).toBe(1);

    // Giving Eviolite to party member and testing if it applies
    await game.scene.addModifier(
      modifierTypes.RARE_SPECIES_STAT_BOOSTER().generateType([], ["LIGHT_BALL"])!.newModifier(partyMember),
      true,
    );
    game.scene.applyModifiers(SpeciesStatBoosterModifier, true, partyMember, Stat.ATK, atkValue);
    game.scene.applyModifiers(SpeciesStatBoosterModifier, true, partyMember, Stat.SPATK, spAtkValue);

    expect(atkValue.value / atkStat).toBe(1);
    expect(spAtkValue.value / spAtkStat).toBe(1);
  });
});
