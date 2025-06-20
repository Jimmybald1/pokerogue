import { Gender } from "#app/data/gender";
import { Nature } from "#enums/nature";
import { allSpecies } from "#app/data/data-lists";
import { GameModes } from "#enums/game-modes";
import { EncounterPhase } from "#app/phases/encounter-phase";
import { SelectStarterPhase } from "#app/phases/select-starter-phase";
import type { TitlePhase } from "#app/phases/title-phase";
import type { OptionSelectItem } from "#app/ui/abstact-option-select-ui-handler";
import type SaveSlotSelectUiHandler from "#app/ui/save-slot-select-ui-handler";
import type OptionSelectUiHandler from "#app/ui/settings/option-select-ui-handler";
import type StarterSelectUiHandler from "#app/ui/starter-select-ui-handler";
import { UiMode } from "#enums/ui-mode";
import { AbilityId } from "#enums/ability-id";
import { Button } from "#enums/buttons";
import { SpeciesId } from "#enums/species-id";
import GameManager from "#test/testUtils/gameManager";
import i18next from "i18next";
import Phaser from "phaser";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

describe("UI - Starter select", () => {
  let phaserGame: Phaser.Game;
  let game: GameManager;

  beforeAll(() => {
    phaserGame = new Phaser.Game({
      type: Phaser.HEADLESS,
    });
  });

  afterEach(() => {
    game.phaseInterceptor.restoreOg();
  });

  beforeEach(() => {
    game = new GameManager(phaserGame);
  });

  it("Bulbasaur - shiny - variant 2 male", async () => {
    await game.importData("./test/testUtils/saves/everything.prsv");
    const caughtCount = Object.keys(game.scene.gameData.dexData).filter(key => {
      const species = game.scene.gameData.dexData[key];
      return species.caughtAttr !== 0n;
    }).length;
    expect(caughtCount).toBe(Object.keys(allSpecies).length);
    await game.runToTitle();
    game.onNextPrompt("TitlePhase", UiMode.TITLE, () => {
      const currentPhase = game.scene.phaseManager.getCurrentPhase() as TitlePhase;
      currentPhase.gameMode = GameModes.CLASSIC;
      currentPhase.end();
    });
    game.onNextPrompt("SelectStarterPhase", UiMode.STARTER_SELECT, () => {
      const handler = game.scene.ui.getHandler() as StarterSelectUiHandler;
      handler.processInput(Button.RIGHT);
      handler.processInput(Button.LEFT);
      handler.processInput(Button.ACTION);
      game.phaseInterceptor.unlock();
    });
    await game.phaseInterceptor.run(SelectStarterPhase);
    let options: OptionSelectItem[] = [];
    let optionSelectUiHandler: OptionSelectUiHandler | undefined;
    await new Promise<void>(resolve => {
      game.onNextPrompt("SelectStarterPhase", UiMode.OPTION_SELECT, () => {
        optionSelectUiHandler = game.scene.ui.getHandler() as OptionSelectUiHandler;
        options = optionSelectUiHandler.getOptionsWithScroll();
        resolve();
      });
    });
    expect(options.some(option => option.label === i18next.t("starterSelectUiHandler:addToParty"))).toBe(true);
    expect(options.some(option => option.label === i18next.t("starterSelectUiHandler:toggleIVs"))).toBe(true);
    expect(options.some(option => option.label === i18next.t("starterSelectUiHandler:manageMoves"))).toBe(true);
    expect(options.some(option => option.label === i18next.t("starterSelectUiHandler:useCandies"))).toBe(true);
    expect(options.some(option => option.label === i18next.t("menu:cancel"))).toBe(true);
    optionSelectUiHandler?.processInput(Button.ACTION);

    await new Promise<void>(resolve => {
      game.onNextPrompt("SelectStarterPhase", UiMode.STARTER_SELECT, () => {
        const handler = game.scene.ui.getHandler() as StarterSelectUiHandler;
        handler.processInput(Button.SUBMIT);
      });
      game.onNextPrompt("SelectStarterPhase", UiMode.CONFIRM, () => {
        const handler = game.scene.ui.getHandler() as StarterSelectUiHandler;
        handler.processInput(Button.ACTION);
      });
      game.onNextPrompt("SelectStarterPhase", UiMode.SAVE_SLOT, () => {
        const saveSlotSelectUiHandler = game.scene.ui.getHandler() as SaveSlotSelectUiHandler;
        saveSlotSelectUiHandler.processInput(Button.ACTION);
        resolve();
      });
    });
    await game.phaseInterceptor.whenAboutToRun(EncounterPhase);

    expect(game.scene.getPlayerParty()[0].species.speciesId).toBe(SpeciesId.BULBASAUR);
    expect(game.scene.getPlayerParty()[0].shiny).toBe(true);
    expect(game.scene.getPlayerParty()[0].variant).toBe(2);
    expect(game.scene.getPlayerParty()[0].gender).toBe(Gender.MALE);
  });

  it("Bulbasaur - shiny - variant 2 female hardy overgrow", async () => {
    await game.importData("./test/testUtils/saves/everything.prsv");
    const caughtCount = Object.keys(game.scene.gameData.dexData).filter(key => {
      const species = game.scene.gameData.dexData[key];
      return species.caughtAttr !== 0n;
    }).length;
    expect(caughtCount).toBe(Object.keys(allSpecies).length);
    await game.runToTitle();
    game.onNextPrompt("TitlePhase", UiMode.TITLE, () => {
      const currentPhase = game.scene.phaseManager.getCurrentPhase() as TitlePhase;
      currentPhase.gameMode = GameModes.CLASSIC;
      currentPhase.end();
    });
    game.onNextPrompt("SelectStarterPhase", UiMode.STARTER_SELECT, () => {
      const handler = game.scene.ui.getHandler() as StarterSelectUiHandler;
      handler.processInput(Button.RIGHT);
      handler.processInput(Button.LEFT);
      handler.processInput(Button.CYCLE_GENDER);
      handler.processInput(Button.ACTION);
      game.phaseInterceptor.unlock();
    });
    await game.phaseInterceptor.run(SelectStarterPhase);
    let options: OptionSelectItem[] = [];
    let optionSelectUiHandler: OptionSelectUiHandler | undefined;
    await new Promise<void>(resolve => {
      game.onNextPrompt("SelectStarterPhase", UiMode.OPTION_SELECT, () => {
        optionSelectUiHandler = game.scene.ui.getHandler() as OptionSelectUiHandler;
        options = optionSelectUiHandler.getOptionsWithScroll();
        resolve();
      });
    });
    expect(options.some(option => option.label === i18next.t("starterSelectUiHandler:addToParty"))).toBe(true);
    expect(options.some(option => option.label === i18next.t("starterSelectUiHandler:toggleIVs"))).toBe(true);
    expect(options.some(option => option.label === i18next.t("starterSelectUiHandler:manageMoves"))).toBe(true);
    expect(options.some(option => option.label === i18next.t("starterSelectUiHandler:useCandies"))).toBe(true);
    expect(options.some(option => option.label === i18next.t("menu:cancel"))).toBe(true);
    optionSelectUiHandler?.processInput(Button.ACTION);

    await new Promise<void>(resolve => {
      game.onNextPrompt("SelectStarterPhase", UiMode.STARTER_SELECT, () => {
        const handler = game.scene.ui.getHandler() as StarterSelectUiHandler;
        handler.processInput(Button.SUBMIT);
      });
      game.onNextPrompt("SelectStarterPhase", UiMode.CONFIRM, () => {
        const handler = game.scene.ui.getHandler() as StarterSelectUiHandler;
        handler.processInput(Button.ACTION);
      });
      game.onNextPrompt("SelectStarterPhase", UiMode.SAVE_SLOT, () => {
        const saveSlotSelectUiHandler = game.scene.ui.getHandler() as SaveSlotSelectUiHandler;
        saveSlotSelectUiHandler.processInput(Button.ACTION);
        resolve();
      });
    });
    await game.phaseInterceptor.whenAboutToRun(EncounterPhase);

    expect(game.scene.getPlayerParty()[0].species.speciesId).toBe(SpeciesId.BULBASAUR);
    expect(game.scene.getPlayerParty()[0].shiny).toBe(true);
    expect(game.scene.getPlayerParty()[0].variant).toBe(2);
    expect(game.scene.getPlayerParty()[0].nature).toBe(Nature.HARDY);
    expect(game.scene.getPlayerParty()[0].getAbility().id).toBe(AbilityId.OVERGROW);
  });

  it("Bulbasaur - shiny - variant 2 female lonely chlorophyl", async () => {
    await game.importData("./test/testUtils/saves/everything.prsv");
    const caughtCount = Object.keys(game.scene.gameData.dexData).filter(key => {
      const species = game.scene.gameData.dexData[key];
      return species.caughtAttr !== 0n;
    }).length;
    expect(caughtCount).toBe(Object.keys(allSpecies).length);
    await game.runToTitle();
    game.onNextPrompt("TitlePhase", UiMode.TITLE, () => {
      const currentPhase = game.scene.phaseManager.getCurrentPhase() as TitlePhase;
      currentPhase.gameMode = GameModes.CLASSIC;
      currentPhase.end();
    });
    game.onNextPrompt("SelectStarterPhase", UiMode.STARTER_SELECT, () => {
      const handler = game.scene.ui.getHandler() as StarterSelectUiHandler;
      handler.processInput(Button.RIGHT);
      handler.processInput(Button.LEFT);
      handler.processInput(Button.CYCLE_GENDER);
      handler.processInput(Button.CYCLE_NATURE);
      handler.processInput(Button.CYCLE_ABILITY);
      handler.processInput(Button.ACTION);
      game.phaseInterceptor.unlock();
    });
    await game.phaseInterceptor.run(SelectStarterPhase);
    let options: OptionSelectItem[] = [];
    let optionSelectUiHandler: OptionSelectUiHandler | undefined;
    await new Promise<void>(resolve => {
      game.onNextPrompt("SelectStarterPhase", UiMode.OPTION_SELECT, () => {
        optionSelectUiHandler = game.scene.ui.getHandler() as OptionSelectUiHandler;
        options = optionSelectUiHandler.getOptionsWithScroll();
        resolve();
      });
    });
    expect(options.some(option => option.label === i18next.t("starterSelectUiHandler:addToParty"))).toBe(true);
    expect(options.some(option => option.label === i18next.t("starterSelectUiHandler:toggleIVs"))).toBe(true);
    expect(options.some(option => option.label === i18next.t("starterSelectUiHandler:manageMoves"))).toBe(true);
    expect(options.some(option => option.label === i18next.t("starterSelectUiHandler:useCandies"))).toBe(true);
    expect(options.some(option => option.label === i18next.t("menu:cancel"))).toBe(true);
    optionSelectUiHandler?.processInput(Button.ACTION);

    await new Promise<void>(resolve => {
      game.onNextPrompt("SelectStarterPhase", UiMode.STARTER_SELECT, () => {
        const handler = game.scene.ui.getHandler() as StarterSelectUiHandler;
        handler.processInput(Button.SUBMIT);
      });
      game.onNextPrompt("SelectStarterPhase", UiMode.CONFIRM, () => {
        const handler = game.scene.ui.getHandler() as StarterSelectUiHandler;
        handler.processInput(Button.ACTION);
      });
      game.onNextPrompt("SelectStarterPhase", UiMode.SAVE_SLOT, () => {
        const saveSlotSelectUiHandler = game.scene.ui.getHandler() as SaveSlotSelectUiHandler;
        saveSlotSelectUiHandler.processInput(Button.ACTION);
        resolve();
      });
    });
    await game.phaseInterceptor.whenAboutToRun(EncounterPhase);

    expect(game.scene.getPlayerParty()[0].species.speciesId).toBe(SpeciesId.BULBASAUR);
    expect(game.scene.getPlayerParty()[0].shiny).toBe(true);
    expect(game.scene.getPlayerParty()[0].variant).toBe(2);
    expect(game.scene.getPlayerParty()[0].gender).toBe(Gender.FEMALE);
    expect(game.scene.getPlayerParty()[0].nature).toBe(Nature.LONELY);
    expect(game.scene.getPlayerParty()[0].getAbility().id).toBe(AbilityId.CHLOROPHYLL);
  });

  it("Bulbasaur - shiny - variant 2 female", async () => {
    await game.importData("./test/testUtils/saves/everything.prsv");
    const caughtCount = Object.keys(game.scene.gameData.dexData).filter(key => {
      const species = game.scene.gameData.dexData[key];
      return species.caughtAttr !== 0n;
    }).length;
    expect(caughtCount).toBe(Object.keys(allSpecies).length);
    await game.runToTitle();
    game.onNextPrompt("TitlePhase", UiMode.TITLE, () => {
      const currentPhase = game.scene.phaseManager.getCurrentPhase() as TitlePhase;
      currentPhase.gameMode = GameModes.CLASSIC;
      currentPhase.end();
    });
    game.onNextPrompt("SelectStarterPhase", UiMode.STARTER_SELECT, () => {
      const handler = game.scene.ui.getHandler() as StarterSelectUiHandler;
      handler.processInput(Button.RIGHT);
      handler.processInput(Button.LEFT);
      handler.processInput(Button.CYCLE_GENDER);
      handler.processInput(Button.ACTION);
      game.phaseInterceptor.unlock();
    });
    await game.phaseInterceptor.run(SelectStarterPhase);
    let options: OptionSelectItem[] = [];
    let optionSelectUiHandler: OptionSelectUiHandler | undefined;
    await new Promise<void>(resolve => {
      game.onNextPrompt("SelectStarterPhase", UiMode.OPTION_SELECT, () => {
        optionSelectUiHandler = game.scene.ui.getHandler() as OptionSelectUiHandler;
        options = optionSelectUiHandler.getOptionsWithScroll();
        resolve();
      });
    });
    expect(options.some(option => option.label === i18next.t("starterSelectUiHandler:addToParty"))).toBe(true);
    expect(options.some(option => option.label === i18next.t("starterSelectUiHandler:toggleIVs"))).toBe(true);
    expect(options.some(option => option.label === i18next.t("starterSelectUiHandler:manageMoves"))).toBe(true);
    expect(options.some(option => option.label === i18next.t("starterSelectUiHandler:useCandies"))).toBe(true);
    expect(options.some(option => option.label === i18next.t("menu:cancel"))).toBe(true);
    optionSelectUiHandler?.processInput(Button.ACTION);

    await new Promise<void>(resolve => {
      game.onNextPrompt("SelectStarterPhase", UiMode.STARTER_SELECT, () => {
        const handler = game.scene.ui.getHandler() as StarterSelectUiHandler;
        handler.processInput(Button.SUBMIT);
      });
      game.onNextPrompt("SelectStarterPhase", UiMode.CONFIRM, () => {
        const handler = game.scene.ui.getHandler() as StarterSelectUiHandler;
        handler.processInput(Button.ACTION);
      });
      game.onNextPrompt("SelectStarterPhase", UiMode.SAVE_SLOT, () => {
        const saveSlotSelectUiHandler = game.scene.ui.getHandler() as SaveSlotSelectUiHandler;
        saveSlotSelectUiHandler.processInput(Button.ACTION);
        resolve();
      });
    });
    await game.phaseInterceptor.whenAboutToRun(EncounterPhase);

    expect(game.scene.getPlayerParty()[0].species.speciesId).toBe(SpeciesId.BULBASAUR);
    expect(game.scene.getPlayerParty()[0].shiny).toBe(true);
    expect(game.scene.getPlayerParty()[0].variant).toBe(2);
    expect(game.scene.getPlayerParty()[0].gender).toBe(Gender.FEMALE);
  });

  it("Bulbasaur - not shiny", async () => {
    await game.importData("./test/testUtils/saves/everything.prsv");
    const caughtCount = Object.keys(game.scene.gameData.dexData).filter(key => {
      const species = game.scene.gameData.dexData[key];
      return species.caughtAttr !== 0n;
    }).length;
    expect(caughtCount).toBe(Object.keys(allSpecies).length);
    await game.runToTitle();
    game.onNextPrompt("TitlePhase", UiMode.TITLE, () => {
      const currentPhase = game.scene.phaseManager.getCurrentPhase() as TitlePhase;
      currentPhase.gameMode = GameModes.CLASSIC;
      currentPhase.end();
    });
    game.onNextPrompt("SelectStarterPhase", UiMode.STARTER_SELECT, () => {
      const handler = game.scene.ui.getHandler() as StarterSelectUiHandler;
      handler.processInput(Button.RIGHT);
      handler.processInput(Button.LEFT);
      handler.processInput(Button.ACTION);
      handler.processInput(Button.CYCLE_SHINY);
      game.phaseInterceptor.unlock();
    });
    await game.phaseInterceptor.run(SelectStarterPhase);
    let options: OptionSelectItem[] = [];
    let optionSelectUiHandler: OptionSelectUiHandler | undefined;
    await new Promise<void>(resolve => {
      game.onNextPrompt("SelectStarterPhase", UiMode.OPTION_SELECT, () => {
        optionSelectUiHandler = game.scene.ui.getHandler() as OptionSelectUiHandler;
        options = optionSelectUiHandler.getOptionsWithScroll();
        resolve();
      });
    });
    expect(options.some(option => option.label === i18next.t("starterSelectUiHandler:addToParty"))).toBe(true);
    expect(options.some(option => option.label === i18next.t("starterSelectUiHandler:toggleIVs"))).toBe(true);
    expect(options.some(option => option.label === i18next.t("starterSelectUiHandler:manageMoves"))).toBe(true);
    expect(options.some(option => option.label === i18next.t("starterSelectUiHandler:useCandies"))).toBe(true);
    expect(options.some(option => option.label === i18next.t("menu:cancel"))).toBe(true);
    optionSelectUiHandler?.processInput(Button.ACTION);

    await new Promise<void>(resolve => {
      game.onNextPrompt("SelectStarterPhase", UiMode.STARTER_SELECT, () => {
        const handler = game.scene.ui.getHandler() as StarterSelectUiHandler;
        handler.processInput(Button.SUBMIT);
      });
      game.onNextPrompt("SelectStarterPhase", UiMode.CONFIRM, () => {
        const handler = game.scene.ui.getHandler() as StarterSelectUiHandler;
        handler.processInput(Button.ACTION);
      });
      game.onNextPrompt("SelectStarterPhase", UiMode.SAVE_SLOT, () => {
        const saveSlotSelectUiHandler = game.scene.ui.getHandler() as SaveSlotSelectUiHandler;
        saveSlotSelectUiHandler.processInput(Button.ACTION);
        resolve();
      });
    });
    await game.phaseInterceptor.whenAboutToRun(EncounterPhase);

    expect(game.scene.getPlayerParty()[0].species.speciesId).toBe(SpeciesId.BULBASAUR);
    expect(game.scene.getPlayerParty()[0].shiny).toBe(false);
    expect(game.scene.getPlayerParty()[0].variant).toBe(0);
  });

  it("Bulbasaur - shiny - variant 1", async () => {
    await game.importData("./test/testUtils/saves/everything.prsv");
    const caughtCount = Object.keys(game.scene.gameData.dexData).filter(key => {
      const species = game.scene.gameData.dexData[key];
      return species.caughtAttr !== 0n;
    }).length;
    expect(caughtCount).toBe(Object.keys(allSpecies).length);
    await game.runToTitle();
    game.onNextPrompt("TitlePhase", UiMode.TITLE, () => {
      const currentPhase = game.scene.phaseManager.getCurrentPhase() as TitlePhase;
      currentPhase.gameMode = GameModes.CLASSIC;
      currentPhase.end();
    });
    game.onNextPrompt("SelectStarterPhase", UiMode.STARTER_SELECT, () => {
      const handler = game.scene.ui.getHandler() as StarterSelectUiHandler;
      handler.processInput(Button.RIGHT);
      handler.processInput(Button.LEFT);
      handler.processInput(Button.CYCLE_SHINY);
      handler.processInput(Button.CYCLE_SHINY);
      handler.processInput(Button.CYCLE_SHINY);
      handler.processInput(Button.ACTION);
      game.phaseInterceptor.unlock();
    });
    await game.phaseInterceptor.run(SelectStarterPhase);
    let options: OptionSelectItem[] = [];
    let optionSelectUiHandler: OptionSelectUiHandler | undefined;
    await new Promise<void>(resolve => {
      game.onNextPrompt("SelectStarterPhase", UiMode.OPTION_SELECT, () => {
        optionSelectUiHandler = game.scene.ui.getHandler() as OptionSelectUiHandler;
        options = optionSelectUiHandler.getOptionsWithScroll();
        resolve();
      });
    });
    expect(options.some(option => option.label === i18next.t("starterSelectUiHandler:addToParty"))).toBe(true);
    expect(options.some(option => option.label === i18next.t("starterSelectUiHandler:toggleIVs"))).toBe(true);
    expect(options.some(option => option.label === i18next.t("starterSelectUiHandler:manageMoves"))).toBe(true);
    expect(options.some(option => option.label === i18next.t("starterSelectUiHandler:useCandies"))).toBe(true);
    expect(options.some(option => option.label === i18next.t("menu:cancel"))).toBe(true);
    optionSelectUiHandler?.processInput(Button.ACTION);

    await new Promise<void>(resolve => {
      game.onNextPrompt("SelectStarterPhase", UiMode.STARTER_SELECT, () => {
        const handler = game.scene.ui.getHandler() as StarterSelectUiHandler;
        handler.processInput(Button.SUBMIT);
      });
      game.onNextPrompt("SelectStarterPhase", UiMode.CONFIRM, () => {
        const handler = game.scene.ui.getHandler() as StarterSelectUiHandler;
        handler.processInput(Button.ACTION);
      });
      game.onNextPrompt("SelectStarterPhase", UiMode.SAVE_SLOT, () => {
        const saveSlotSelectUiHandler = game.scene.ui.getHandler() as SaveSlotSelectUiHandler;
        saveSlotSelectUiHandler.processInput(Button.ACTION);
        resolve();
      });
    });
    await game.phaseInterceptor.whenAboutToRun(EncounterPhase);

    expect(game.scene.getPlayerParty()[0].species.speciesId).toBe(SpeciesId.BULBASAUR);
    expect(game.scene.getPlayerParty()[0].shiny).toBe(true);
    expect(game.scene.getPlayerParty()[0].variant).toBe(1);
  });

  it("Bulbasaur - shiny - variant 0", async () => {
    await game.importData("./test/testUtils/saves/everything.prsv");
    const caughtCount = Object.keys(game.scene.gameData.dexData).filter(key => {
      const species = game.scene.gameData.dexData[key];
      return species.caughtAttr !== 0n;
    }).length;
    expect(caughtCount).toBe(Object.keys(allSpecies).length);
    await game.runToTitle();
    game.onNextPrompt("TitlePhase", UiMode.TITLE, () => {
      const currentPhase = game.scene.phaseManager.getCurrentPhase() as TitlePhase;
      currentPhase.gameMode = GameModes.CLASSIC;
      currentPhase.end();
    });
    game.onNextPrompt("SelectStarterPhase", UiMode.STARTER_SELECT, () => {
      const handler = game.scene.ui.getHandler() as StarterSelectUiHandler;
      handler.processInput(Button.RIGHT);
      handler.processInput(Button.LEFT);
      handler.processInput(Button.CYCLE_SHINY);
      handler.processInput(Button.CYCLE_SHINY);
      handler.processInput(Button.ACTION);
      game.phaseInterceptor.unlock();
    });
    await game.phaseInterceptor.run(SelectStarterPhase);
    let options: OptionSelectItem[] = [];
    let optionSelectUiHandler: OptionSelectUiHandler | undefined;
    await new Promise<void>(resolve => {
      game.onNextPrompt("SelectStarterPhase", UiMode.OPTION_SELECT, () => {
        optionSelectUiHandler = game.scene.ui.getHandler() as OptionSelectUiHandler;
        options = optionSelectUiHandler.getOptionsWithScroll();
        resolve();
      });
    });
    expect(options.some(option => option.label === i18next.t("starterSelectUiHandler:addToParty"))).toBe(true);
    expect(options.some(option => option.label === i18next.t("starterSelectUiHandler:toggleIVs"))).toBe(true);
    expect(options.some(option => option.label === i18next.t("starterSelectUiHandler:manageMoves"))).toBe(true);
    expect(options.some(option => option.label === i18next.t("starterSelectUiHandler:useCandies"))).toBe(true);
    expect(options.some(option => option.label === i18next.t("menu:cancel"))).toBe(true);
    optionSelectUiHandler?.processInput(Button.ACTION);

    await new Promise<void>(resolve => {
      game.onNextPrompt("SelectStarterPhase", UiMode.STARTER_SELECT, () => {
        const handler = game.scene.ui.getHandler() as StarterSelectUiHandler;
        handler.processInput(Button.SUBMIT);
      });
      game.onNextPrompt("SelectStarterPhase", UiMode.CONFIRM, () => {
        const handler = game.scene.ui.getHandler() as StarterSelectUiHandler;
        handler.processInput(Button.ACTION);
      });
      game.onNextPrompt("SelectStarterPhase", UiMode.SAVE_SLOT, () => {
        const saveSlotSelectUiHandler = game.scene.ui.getHandler() as SaveSlotSelectUiHandler;
        saveSlotSelectUiHandler.processInput(Button.ACTION);
        resolve();
      });
    });
    await game.phaseInterceptor.whenAboutToRun(EncounterPhase);

    expect(game.scene.getPlayerParty()[0].species.speciesId).toBe(SpeciesId.BULBASAUR);
    expect(game.scene.getPlayerParty()[0].shiny).toBe(true);
    expect(game.scene.getPlayerParty()[0].variant).toBe(0);
  });

  it("Check if first pokemon in party is caterpie from gen 1 and 1rd row, 3rd column", async () => {
    await game.importData("./test/testUtils/saves/everything.prsv");
    const caughtCount = Object.keys(game.scene.gameData.dexData).filter(key => {
      const species = game.scene.gameData.dexData[key];
      return species.caughtAttr !== 0n;
    }).length;
    expect(caughtCount).toBe(Object.keys(allSpecies).length);
    await game.runToTitle();
    game.onNextPrompt("TitlePhase", UiMode.TITLE, () => {
      const currentPhase = game.scene.phaseManager.getCurrentPhase() as TitlePhase;
      currentPhase.gameMode = GameModes.CLASSIC;
      currentPhase.end();
    });
    game.onNextPrompt("SelectStarterPhase", UiMode.STARTER_SELECT, () => {
      const handler = game.scene.ui.getHandler() as StarterSelectUiHandler;
      handler.processInput(Button.RIGHT);
      handler.processInput(Button.RIGHT);
      handler.processInput(Button.RIGHT);
      handler.processInput(Button.ACTION);
      game.phaseInterceptor.unlock();
    });
    await game.phaseInterceptor.run(SelectStarterPhase);
    let options: OptionSelectItem[] = [];
    let optionSelectUiHandler: OptionSelectUiHandler | undefined;
    await new Promise<void>(resolve => {
      game.onNextPrompt("SelectStarterPhase", UiMode.OPTION_SELECT, () => {
        optionSelectUiHandler = game.scene.ui.getHandler() as OptionSelectUiHandler;
        options = optionSelectUiHandler.getOptionsWithScroll();
        resolve();
      });
    });
    expect(options.some(option => option.label === i18next.t("starterSelectUiHandler:addToParty"))).toBe(true);
    expect(options.some(option => option.label === i18next.t("starterSelectUiHandler:toggleIVs"))).toBe(true);
    expect(options.some(option => option.label === i18next.t("starterSelectUiHandler:manageMoves"))).toBe(true);
    expect(options.some(option => option.label === i18next.t("starterSelectUiHandler:useCandies"))).toBe(true);
    expect(options.some(option => option.label === i18next.t("menu:cancel"))).toBe(true);
    optionSelectUiHandler?.processInput(Button.ACTION);

    let starterSelectUiHandler: StarterSelectUiHandler;
    await new Promise<void>(resolve => {
      game.onNextPrompt("SelectStarterPhase", UiMode.STARTER_SELECT, () => {
        starterSelectUiHandler = game.scene.ui.getHandler() as StarterSelectUiHandler;
        starterSelectUiHandler.processInput(Button.SUBMIT);
        resolve();
      });
    });

    // expect(starterSelectUiHandler.starterGens[0]).toBe(0);
    // expect(starterSelectUiHandler.starterCursors[0]).toBe(3);
    // expect(starterSelectUiHandler.cursorObj.x).toBe(132 + 4 * 18);
    // expect(starterSelectUiHandler.cursorObj.y).toBe(10);

    game.onNextPrompt("SelectStarterPhase", UiMode.CONFIRM, () => {
      const handler = game.scene.ui.getHandler() as StarterSelectUiHandler;
      handler.processInput(Button.ACTION);
    });
    game.onNextPrompt("SelectStarterPhase", UiMode.SAVE_SLOT, () => {
      const saveSlotSelectUiHandler = game.scene.ui.getHandler() as SaveSlotSelectUiHandler;
      saveSlotSelectUiHandler.processInput(Button.ACTION);
    });
    await game.phaseInterceptor.whenAboutToRun(EncounterPhase);
    expect(game.scene.getPlayerParty()[0].species.speciesId).toBe(SpeciesId.CATERPIE);
  });

  it("Check if first pokemon in party is nidoran_m from gen 1 and 2nd row, 4th column (cursor (9+4)-1)", async () => {
    await game.importData("./test/testUtils/saves/everything.prsv");
    const caughtCount = Object.keys(game.scene.gameData.dexData).filter(key => {
      const species = game.scene.gameData.dexData[key];
      return species.caughtAttr !== 0n;
    }).length;
    expect(caughtCount).toBe(Object.keys(allSpecies).length);
    await game.runToTitle();
    game.onNextPrompt("TitlePhase", UiMode.TITLE, () => {
      const currentPhase = game.scene.phaseManager.getCurrentPhase() as TitlePhase;
      currentPhase.gameMode = GameModes.CLASSIC;
      currentPhase.end();
    });
    game.onNextPrompt("SelectStarterPhase", UiMode.STARTER_SELECT, () => {
      const handler = game.scene.ui.getHandler() as StarterSelectUiHandler;
      handler.processInput(Button.RIGHT);
      handler.processInput(Button.RIGHT);
      handler.processInput(Button.RIGHT);
      handler.processInput(Button.DOWN);
      handler.processInput(Button.ACTION);
      game.phaseInterceptor.unlock();
    });
    await game.phaseInterceptor.run(SelectStarterPhase);
    let options: OptionSelectItem[] = [];
    let optionSelectUiHandler: OptionSelectUiHandler | undefined;
    await new Promise<void>(resolve => {
      game.onNextPrompt("SelectStarterPhase", UiMode.OPTION_SELECT, () => {
        optionSelectUiHandler = game.scene.ui.getHandler() as OptionSelectUiHandler;
        options = optionSelectUiHandler.getOptionsWithScroll();
        resolve();
      });
    });
    expect(options.some(option => option.label === i18next.t("starterSelectUiHandler:addToParty"))).toBe(true);
    expect(options.some(option => option.label === i18next.t("starterSelectUiHandler:toggleIVs"))).toBe(true);
    expect(options.some(option => option.label === i18next.t("starterSelectUiHandler:manageMoves"))).toBe(true);
    expect(options.some(option => option.label === i18next.t("starterSelectUiHandler:useCandies"))).toBe(true);
    expect(options.some(option => option.label === i18next.t("menu:cancel"))).toBe(true);
    optionSelectUiHandler?.processInput(Button.ACTION);

    let starterSelectUiHandler: StarterSelectUiHandler | undefined;
    await new Promise<void>(resolve => {
      game.onNextPrompt("SelectStarterPhase", UiMode.STARTER_SELECT, () => {
        starterSelectUiHandler = game.scene.ui.getHandler() as StarterSelectUiHandler;
        starterSelectUiHandler.processInput(Button.SUBMIT);
        resolve();
      });
    });

    expect(starterSelectUiHandler?.starterSpecies.length).toBe(1);
    expect(starterSelectUiHandler?.starterSpecies[0].generation).toBe(1);
    expect(starterSelectUiHandler?.starterSpecies[0].speciesId).toBe(32);
    expect(starterSelectUiHandler?.cursorObj.x).toBe(53);
    expect(starterSelectUiHandler?.cursorObj.y).toBe(31);

    game.onNextPrompt("SelectStarterPhase", UiMode.CONFIRM, () => {
      const handler = game.scene.ui.getHandler() as StarterSelectUiHandler;
      handler.processInput(Button.ACTION);
    });
    game.onNextPrompt("SelectStarterPhase", UiMode.SAVE_SLOT, () => {
      const saveSlotSelectUiHandler = game.scene.ui.getHandler() as SaveSlotSelectUiHandler;
      saveSlotSelectUiHandler.processInput(Button.ACTION);
    });
    await game.phaseInterceptor.whenAboutToRun(EncounterPhase);
    expect(game.scene.getPlayerParty()[0].species.speciesId).toBe(SpeciesId.NIDORAN_M);
  });
});
