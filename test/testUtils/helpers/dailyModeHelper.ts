import { BattleStyle } from "#app/enums/battle-style";
import { Button } from "#app/enums/buttons";
import overrides from "#app/overrides";
import { CommandPhase } from "#app/phases/command-phase";
import { EncounterPhase } from "#app/phases/encounter-phase";
import { TitlePhase } from "#app/phases/title-phase";
import { TurnInitPhase } from "#app/phases/turn-init-phase";
import type SaveSlotSelectUiHandler from "#app/ui/save-slot-select-ui-handler";
import { UiMode } from "#enums/ui-mode";
import { GameManagerHelper } from "./gameManagerHelper";

/**
 * Helper to handle daily mode specifics
 */
export class DailyModeHelper extends GameManagerHelper {
  /**
   * Runs the daily game to the summon phase.
   * @returns A promise that resolves when the summon phase is reached.
   * @remarks Please do not use for starting normal battles - use {@linkcode startBattle} instead
   */
  async runToSummon(): Promise<void> {
    await this.game.runToTitle();

    if (this.game.override.disableShinies) {
      this.game.override.shiny(false).enemyShiny(false);
    }

    this.game.onNextPrompt("TitlePhase", UiMode.TITLE, () => {
      const titlePhase = new TitlePhase();
      titlePhase.initDailyRun();
    });

    this.game.onNextPrompt("TitlePhase", UiMode.SAVE_SLOT, () => {
      const uihandler = this.game.scene.ui.getHandler<SaveSlotSelectUiHandler>();
      uihandler.processInput(Button.ACTION); // select first slot. that's fine
    });

    await this.game.phaseInterceptor.to(EncounterPhase);

    if (overrides.OPP_HELD_ITEMS_OVERRIDE.length === 0 && this.game.override.removeEnemyStartingItems) {
      this.game.removeEnemyHeldItems();
    }
  }

  /**
   * Transitions to the start of a battle.
   * @returns A promise that resolves when the battle is started.
   */
  async startBattle(): Promise<void> {
    await this.runToSummon();

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
    console.log("==================[New Turn]==================");
  }
}
