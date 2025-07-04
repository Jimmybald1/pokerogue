import * as MysteryEncounters from "#app/data/mystery-encounters/mystery-encounters";
import { BiomeId } from "#enums/biome-id";
import { MysteryEncounterType } from "#app/enums/mystery-encounter-type";
import { SpeciesId } from "#enums/species-id";
import GameManager from "#test/testUtils/gameManager";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  runMysteryEncounterToEnd,
  runSelectMysteryEncounterOption,
  skipBattleRunMysteryEncounterRewardsPhase,
} from "#test/mystery-encounter/encounter-test-utils";
import { MoveId } from "#enums/move-id";
import type BattleScene from "#app/battle-scene";
import { PokemonMove } from "#app/data/moves/pokemon-move";
import { UiMode } from "#enums/ui-mode";
import ModifierSelectUiHandler from "#app/ui/modifier-select-ui-handler";
import { MysteryEncounterOptionMode } from "#enums/mystery-encounter-option-mode";
import { MysteryEncounterTier } from "#enums/mystery-encounter-tier";
import { initSceneWithoutEncounterPhase } from "#test/testUtils/gameManagerUtils";
import * as EncounterPhaseUtils from "#app/data/mystery-encounters/utils/encounter-phase-utils";
import { FightOrFlightEncounter } from "#app/data/mystery-encounters/encounters/fight-or-flight-encounter";
import { MysteryEncounterPhase } from "#app/phases/mystery-encounter-phases";
import { CommandPhase } from "#app/phases/command-phase";
import { SelectModifierPhase } from "#app/phases/select-modifier-phase";

const namespace = "mysteryEncounters/fightOrFlight";
const defaultParty = [SpeciesId.LAPRAS, SpeciesId.GENGAR, SpeciesId.ABRA];
const defaultBiome = BiomeId.CAVE;
const defaultWave = 45;

describe("Fight or Flight - Mystery Encounter", () => {
  let phaserGame: Phaser.Game;
  let game: GameManager;
  let scene: BattleScene;

  beforeAll(() => {
    phaserGame = new Phaser.Game({ type: Phaser.HEADLESS });
  });

  beforeEach(async () => {
    game = new GameManager(phaserGame);
    scene = game.scene;
    game.override
      .mysteryEncounterChance(100)
      .startingWave(defaultWave)
      .startingBiome(defaultBiome)
      .disableTrainerWaves();

    vi.spyOn(MysteryEncounters, "mysteryEncountersByBiome", "get").mockReturnValue(
      new Map<BiomeId, MysteryEncounterType[]>([[BiomeId.CAVE, [MysteryEncounterType.FIGHT_OR_FLIGHT]]]),
    );
  });

  afterEach(() => {
    game.phaseInterceptor.restoreOg();
  });

  it("should have the correct properties", async () => {
    await game.runToMysteryEncounter(MysteryEncounterType.FIGHT_OR_FLIGHT, defaultParty);

    expect(FightOrFlightEncounter.encounterType).toBe(MysteryEncounterType.FIGHT_OR_FLIGHT);
    expect(FightOrFlightEncounter.encounterTier).toBe(MysteryEncounterTier.COMMON);
    expect(FightOrFlightEncounter.dialogue).toBeDefined();
    expect(FightOrFlightEncounter.dialogue.intro).toStrictEqual([{ text: `${namespace}:intro` }]);
    expect(FightOrFlightEncounter.dialogue.encounterOptionsDialogue?.title).toBe(`${namespace}:title`);
    expect(FightOrFlightEncounter.dialogue.encounterOptionsDialogue?.description).toBe(`${namespace}:description`);
    expect(FightOrFlightEncounter.dialogue.encounterOptionsDialogue?.query).toBe(`${namespace}:query`);
    expect(FightOrFlightEncounter.options.length).toBe(3);
  });

  it("should initialize fully", async () => {
    initSceneWithoutEncounterPhase(scene, defaultParty);
    scene.currentBattle.mysteryEncounter = FightOrFlightEncounter;

    const { onInit } = FightOrFlightEncounter;

    expect(FightOrFlightEncounter.onInit).toBeDefined();

    FightOrFlightEncounter.populateDialogueTokensFromRequirements();
    const onInitResult = onInit!();

    const config = FightOrFlightEncounter.enemyPartyConfigs[0];
    expect(config).toBeDefined();
    expect(config.pokemonConfigs?.[0].isBoss).toBe(true);
    expect(onInitResult).toBe(true);
  });

  describe("Option 1 - Fight", () => {
    it("should have the correct properties", () => {
      const option = FightOrFlightEncounter.options[0];
      expect(option.optionMode).toBe(MysteryEncounterOptionMode.DEFAULT);
      expect(option.dialogue).toBeDefined();
      expect(option.dialogue).toStrictEqual({
        buttonLabel: `${namespace}:option.1.label`,
        buttonTooltip: `${namespace}:option.1.tooltip`,
        selected: [
          {
            text: `${namespace}:option.1.selected`,
          },
        ],
      });
    });

    it("should start a fight against the boss", async () => {
      await game.runToMysteryEncounter(MysteryEncounterType.FIGHT_OR_FLIGHT, defaultParty);

      const config = game.scene.currentBattle.mysteryEncounter!.enemyPartyConfigs[0];
      const speciesToSpawn = config.pokemonConfigs?.[0].species.speciesId;

      await runMysteryEncounterToEnd(game, 1, undefined, true);

      const enemyField = scene.getEnemyField();
      expect(scene.phaseManager.getCurrentPhase()?.constructor.name).toBe(CommandPhase.name);
      expect(enemyField.length).toBe(1);
      expect(enemyField[0].species.speciesId).toBe(speciesToSpawn);
    });

    it("should reward the player with the item based on wave", async () => {
      await game.runToMysteryEncounter(MysteryEncounterType.FIGHT_OR_FLIGHT, defaultParty);

      const item = game.scene.currentBattle.mysteryEncounter?.misc;

      await runMysteryEncounterToEnd(game, 1, undefined, true);
      await skipBattleRunMysteryEncounterRewardsPhase(game);
      await game.phaseInterceptor.to(SelectModifierPhase, false);
      expect(scene.phaseManager.getCurrentPhase()?.constructor.name).toBe(SelectModifierPhase.name);
      await game.phaseInterceptor.run(SelectModifierPhase);
      expect(scene.ui.getMode()).to.equal(UiMode.MODIFIER_SELECT);

      const modifierSelectHandler = scene.ui.handlers.find(
        h => h instanceof ModifierSelectUiHandler,
      ) as ModifierSelectUiHandler;
      expect(modifierSelectHandler.options.length).toEqual(1);
      expect(item.type.name).toBe(modifierSelectHandler.options[0].modifierTypeOption.type.name);
    });
  });

  describe("Option 2 - Attempt to Steal", () => {
    it("should have the correct properties", () => {
      const option = FightOrFlightEncounter.options[1];
      expect(option.optionMode).toBe(MysteryEncounterOptionMode.DISABLED_OR_SPECIAL);
      expect(option.dialogue).toBeDefined();
      expect(option.dialogue).toStrictEqual({
        buttonLabel: `${namespace}:option.2.label`,
        buttonTooltip: `${namespace}:option.2.tooltip`,
        disabledButtonTooltip: `${namespace}:option.2.disabled_tooltip`,
        selected: [
          {
            text: `${namespace}:option.2.selected`,
          },
        ],
      });
    });

    it("should NOT be selectable if the player doesn't have a Stealing move", async () => {
      await game.runToMysteryEncounter(MysteryEncounterType.FIGHT_OR_FLIGHT, defaultParty);
      scene.getPlayerParty().forEach(p => (p.moveset = []));
      await game.phaseInterceptor.to(MysteryEncounterPhase, false);

      const encounterPhase = scene.phaseManager.getCurrentPhase();
      expect(encounterPhase?.constructor.name).toBe(MysteryEncounterPhase.name);
      const mysteryEncounterPhase = encounterPhase as MysteryEncounterPhase;
      vi.spyOn(mysteryEncounterPhase, "continueEncounter");
      vi.spyOn(mysteryEncounterPhase, "handleOptionSelect");
      vi.spyOn(scene.ui, "playError");

      await runSelectMysteryEncounterOption(game, 2);

      expect(scene.phaseManager.getCurrentPhase()?.constructor.name).toBe(MysteryEncounterPhase.name);
      expect(scene.ui.playError).not.toHaveBeenCalled(); // No error sfx, option is disabled
      expect(mysteryEncounterPhase.handleOptionSelect).not.toHaveBeenCalled();
      expect(mysteryEncounterPhase.continueEncounter).not.toHaveBeenCalled();
    });

    it("Should skip fight when player meets requirements", async () => {
      const leaveEncounterWithoutBattleSpy = vi.spyOn(EncounterPhaseUtils, "leaveEncounterWithoutBattle");

      await game.runToMysteryEncounter(MysteryEncounterType.FIGHT_OR_FLIGHT, defaultParty);

      // Mock moveset
      scene.getPlayerParty()[0].moveset = [new PokemonMove(MoveId.KNOCK_OFF)];
      const item = game.scene.currentBattle.mysteryEncounter!.misc;

      await runMysteryEncounterToEnd(game, 2);
      await game.phaseInterceptor.to(SelectModifierPhase, false);
      expect(scene.phaseManager.getCurrentPhase()?.constructor.name).toBe(SelectModifierPhase.name);
      await game.phaseInterceptor.run(SelectModifierPhase);
      expect(scene.ui.getMode()).to.equal(UiMode.MODIFIER_SELECT);

      const modifierSelectHandler = scene.ui.handlers.find(
        h => h instanceof ModifierSelectUiHandler,
      ) as ModifierSelectUiHandler;
      expect(modifierSelectHandler.options.length).toEqual(1);
      expect(item.type.name).toBe(modifierSelectHandler.options[0].modifierTypeOption.type.name);

      expect(leaveEncounterWithoutBattleSpy).toBeCalled();
    });
  });

  describe("Option 3 - Leave", () => {
    it("should leave encounter without battle", async () => {
      const leaveEncounterWithoutBattleSpy = vi.spyOn(EncounterPhaseUtils, "leaveEncounterWithoutBattle");

      await game.runToMysteryEncounter(MysteryEncounterType.FIGHT_OR_FLIGHT, defaultParty);
      await runMysteryEncounterToEnd(game, 3);

      expect(leaveEncounterWithoutBattleSpy).toBeCalled();
    });
  });
});
