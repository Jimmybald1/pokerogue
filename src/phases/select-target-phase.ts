import { globalScene } from "#app/global-scene";
import { allMoves } from "#data/data-lists";
import type { BattlerIndex } from "#enums/battler-index";
import { Command } from "#enums/command";
import { UiMode } from "#enums/ui-mode";
import { PokemonPhase } from "#phases/pokemon-phase";
import i18next from "#plugins/i18n";
import * as LoggerTools from "../logger";

export class SelectTargetPhase extends PokemonPhase {
  public readonly phaseName = "SelectTargetPhase";
  // biome-ignore lint/complexity/noUselessConstructor: This makes `fieldIndex` required
  constructor(fieldIndex: number) {
    super(fieldIndex);
  }

  start() {
    super.start();

    const turnCommand = globalScene.currentBattle.turnCommands[this.fieldIndex];
    const move = turnCommand?.move?.move;
    globalScene.ui.setMode(UiMode.TARGET_SELECT, this.fieldIndex, move, (targets: BattlerIndex[]) => {
      globalScene.ui.setMode(UiMode.MESSAGE);
      const fieldSide = globalScene.getField();
      const user = fieldSide[this.fieldIndex];
      const moveObject = allMoves[move!];
      // Reject player's target selection
      if (moveObject && user.isMoveTargetRestricted(moveObject.id, user, fieldSide[targets[0]])) {
        const errorMessage = user
          .getRestrictingTag(move!, user, fieldSide[targets[0]])!
          .selectionDeniedText(user, moveObject.id);
        globalScene.phaseManager.queueMessage(i18next.t(errorMessage, { moveName: moveObject.name }), 0, true);
        targets = [];
      }
      // Cancel this action
      if (targets.length < 1) {
        globalScene.currentBattle.turnCommands[this.fieldIndex] = null;
        LoggerTools.Actions[this.fieldIndex] = "";
        globalScene.phaseManager.unshiftNew("CommandPhase", this.fieldIndex);
      } else {
        turnCommand!.targets = targets; //TODO: is the bang correct here?
        if (targets.length == 1) {
          switch (targets[0]) {
            case 0:
            case 1:
              // Specify clearly that you target your own pokemon
              const species = fieldSide[this.fieldIndex].species;
              var pokemonName = species.getName();
              if (species.isRegional()) {
                pokemonName = `${species.getRegion().toString()} ${pokemonName}`;
              }
              LoggerTools.Actions[this.fieldIndex] += ` (on ${pokemonName})`;
              break;
            case 2:
              // Just specify L or R
              LoggerTools.Actions[this.fieldIndex] += " L";
              break;
            case 3:
              // Just specify L or R
              LoggerTools.Actions[this.fieldIndex] += " R";
              break;
          }
        }
      }
      if (turnCommand?.command === Command.BALL && this.fieldIndex) {
        globalScene.currentBattle.turnCommands[this.fieldIndex - 1]!.skip = true; //TODO: is the bang correct here?
      }
      this.end();
    });
  }
}
