import { globalScene } from "#app/global-scene";
import { allMoves } from "#data/data-lists";
import type { BattlerIndex } from "#enums/battler-index";
import { Command } from "#enums/command";
import { UiMode } from "#enums/ui-mode";
import { PokemonPhase } from "#phases/pokemon-phase";
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
    const moveId = turnCommand?.move?.move;
    if (!moveId) {
      this.end();
      return;
    }

    // TODO: Move the logic for computing default targets here instead of `target-select-ui-handler`
    const move = allMoves[moveId];
    const fieldSide = globalScene.getField();

    const user = fieldSide[this.fieldIndex];
    const ally = user.getAlly();
    const shouldDefaultToAlly =
      globalScene.currentBattle.double // formatting
      && move.allyTargetDefault
      && ally != null
      && !ally.isFainted();
    const defaultTargets = shouldDefaultToAlly ? [ally.getBattlerIndex()] : undefined;

    globalScene.ui.setMode(
      UiMode.TARGET_SELECT,
      this.fieldIndex,
      move.id,
      (targets: BattlerIndex[]) => {
        globalScene.ui.setMode(UiMode.MESSAGE);
        // Find any tags blocking this target from being selected
        // TODO: Denest and make less jank

        // TODO: when would this occur?
        if (targets[0]) {
          const restrictingTag = user.getTargetRestrictingTag(moveId, fieldSide[targets[0]]);
          if (restrictingTag) {
            globalScene.phaseManager.queueMessage(restrictingTag.selectionDeniedText(user, moveId));
            targets = [];
          }
        }

        if (targets.length === 0) {
          globalScene.currentBattle.turnCommands[this.fieldIndex] = null;
          LoggerTools.Actions[this.fieldIndex] = "";
          globalScene.phaseManager.unshiftNew("CommandPhase", this.fieldIndex);
        } else {
          turnCommand.targets = targets;
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
        if (turnCommand.command === Command.BALL && this.fieldIndex) {
          globalScene.currentBattle.turnCommands[this.fieldIndex - 1]!.skip = true;
        }
        this.end();
      },
      defaultTargets,
    );
  }
}
