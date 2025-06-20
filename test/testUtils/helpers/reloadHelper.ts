import { GameManagerHelper } from "./gameManagerHelper";
import { TitlePhase } from "#app/phases/title-phase";
import { UiMode } from "#enums/ui-mode";
import { vi } from "vitest";
import { BattleStyle } from "#app/enums/battle-style";
import { CommandPhase } from "#app/phases/command-phase";
import { TurnInitPhase } from "#app/phases/turn-init-phase";
import type { SessionSaveData } from "#app/system/game-data";
import type GameManager from "../gameManager";

/**
 * Helper to allow reloading sessions in unit tests.
 */
export class ReloadHelper extends GameManagerHelper {
  sessionData: SessionSaveData;

  constructor(game: GameManager) {
    super(game);

    // Whenever the game saves the session, save it to the reloadHelper instead
    vi.spyOn(game.scene.gameData, "saveAll").mockImplementation(() => {
      return new Promise<boolean>((resolve, _reject) => {
        this.sessionData = game.scene.gameData.getSessionSaveData();
        resolve(true);
      });
    });
  }

  /**
   * Simulate reloading the session from the title screen, until reaching the
   * beginning of the first turn (equivalent to running `startBattle()`) for
   * the reloaded session.
   */
  async reloadSession(): Promise<void> {
    const scene = this.game.scene;
    const titlePhase = new TitlePhase();

    scene.phaseManager.clearPhaseQueue();

    // Set the last saved session to the desired session data
    vi.spyOn(scene.gameData, "getSession").mockReturnValue(
      new Promise((resolve, _reject) => {
        resolve(this.sessionData);
      }),
    );
    scene.phaseManager.unshiftPhase(titlePhase);
    this.game.endPhase(); // End the currently ongoing battle

    // remove all persistent mods before loading
    // TODO: Look into why these aren't removed before load
    if (this.game.scene.modifiers.length) {
      console.log(
        "Removing %d modifiers from scene on load...",
        this.game.scene.modifiers.length,
        this.game.scene.modifiers,
      );
      this.game.scene.modifiers = [];
    }
    titlePhase.loadSaveSlot(-1); // Load the desired session data
    this.game.phaseInterceptor.shift(); // Loading the save slot also ended TitlePhase, clean it up

    // Run through prompts for switching Pokemon, copied from classicModeHelper.ts
    if (this.game.scene.battleStyle === BattleStyle.SWITCH) {
      this.game.onNextPrompt(
        "CheckSwitchPhase",
        UiMode.CONFIRM,
        () => {
          this.game.setMode(UiMode.MESSAGE);
          this.game.endPhase();
        },
        () => this.game.isCurrentPhase(CommandPhase) || this.game.isCurrentPhase(TurnInitPhase),
      );

      this.game.onNextPrompt(
        "CheckSwitchPhase",
        UiMode.CONFIRM,
        () => {
          this.game.setMode(UiMode.MESSAGE);
          this.game.endPhase();
        },
        () => this.game.isCurrentPhase(CommandPhase) || this.game.isCurrentPhase(TurnInitPhase),
      );
    }

    await this.game.phaseInterceptor.to(CommandPhase);
    console.log("==================[New Turn (Reloaded)]==================");
  }
}
