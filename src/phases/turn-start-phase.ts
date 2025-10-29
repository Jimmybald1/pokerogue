import { applyAbAttrs } from "#abilities/apply-ab-attrs";
import type { TurnCommand } from "#app/battle";
import { globalScene } from "#app/global-scene";
import { ArenaTagSide } from "#enums/arena-tag-side";
import { BattleType } from "#enums/battle-type";
import type { BattlerIndex } from "#enums/battler-index";
import { Command } from "#enums/command";
import { SwitchType } from "#enums/switch-type";
import type { Pokemon } from "#field/pokemon";
import { BypassSpeedChanceModifier } from "#modifiers/modifier";
import { PokemonMove } from "#moves/pokemon-move";
import { FieldPhase } from "#phases/field-phase";
import { inSpeedOrder } from "#utils/speed-order-generator";
import * as LoggerTools from "../logger";

export class TurnStartPhase extends FieldPhase {
  public readonly phaseName = "TurnStartPhase";

  /**
   * Returns an ordering of the current field based on command priority
   * @returns The sequence of commands for this turn
   */
  private getCommandOrder(): BattlerIndex[] {
    const playerField = globalScene.getPlayerField(true).map(p => p.getBattlerIndex());
    const enemyField = globalScene.getEnemyField(true).map(p => p.getBattlerIndex());
    const orderedTargets: BattlerIndex[] = playerField.concat(enemyField);

    // The function begins sorting orderedTargets based on command priority, move priority, and possible speed bypasses.
    // Non-FIGHT commands (SWITCH, BALL, RUN) have a higher command priority and will always occur before any FIGHT commands.
    orderedTargets.sort((a, b) => {
      const aCommand = globalScene.currentBattle.turnCommands[a];
      const bCommand = globalScene.currentBattle.turnCommands[b];

      if (aCommand?.command !== bCommand?.command) {
        if (aCommand?.command === Command.FIGHT) {
          return 1;
        }
        if (bCommand?.command === Command.FIGHT) {
          return -1;
        }
      }

      const aIndex = orderedTargets.indexOf(a);
      const bIndex = orderedTargets.indexOf(b);

      return aIndex < bIndex ? -1 : aIndex > bIndex ? 1 : 0;
    });
    return orderedTargets;
  }

  // TODO: Refactor this alongside `CommandPhase.handleCommand` to use SEPARATE METHODS
  // Also need a clearer distinction between "turn command" and queued moves
  start() {
    super.start();

    const field = globalScene.getField();
    const moveOrder = this.getCommandOrder();

    for (const pokemon of inSpeedOrder(ArenaTagSide.BOTH)) {
      const preTurnCommand = globalScene.currentBattle.preTurnCommands[pokemon.getBattlerIndex()];

      if (preTurnCommand?.skip) {
        continue;
      }

      switch (preTurnCommand?.command) {
        case Command.TERA:
          globalScene.phaseManager.pushNew("TeraPhase", pokemon);
          if (pokemon.isPlayer()) {
            LoggerTools.Actions[pokemon.getFieldIndex()] = `*Terastallize* ${LoggerTools.Actions[pokemon.getFieldIndex()]}`;
          }
      }
    }

    const phaseManager = globalScene.phaseManager;
    for (const pokemon of inSpeedOrder(ArenaTagSide.BOTH)) {
      applyAbAttrs("BypassSpeedChanceAbAttr", { pokemon });
      globalScene.applyModifiers(BypassSpeedChanceModifier, pokemon.isPlayer(), pokemon);
    }

    moveOrder.forEach((o, index) => {
      const pokemon = field[o];
      const turnCommand = globalScene.currentBattle.turnCommands[o];

      if (!turnCommand || turnCommand.skip) {
        return;
      }

      // TODO: Remove `turnData.order` -
      // it is used exclusively for Fusion Flare/Bolt
      // and uses a really jank (and incorrect) implementation
      if (turnCommand.command === Command.FIGHT) {
        pokemon.turnData.order = index;
      }
      this.handleTurnCommand(turnCommand, pokemon);
    });

    // Queue various effects for the end of the turn.
    phaseManager.pushNew("CheckInterludePhase");

    // TODO: Re-order these phases to be consistent with mainline turn order:
    // https://www.smogon.com/forums/threads/sword-shield-battle-mechanics-research.3655528/page-64#post-9244179

    // TODO: In an ideal world, this is handled by the phase manager. The change is nontrivial due to the ordering of post-turn phases like those queued by VictoryPhase
    globalScene.phaseManager.queueTurnEndPhases();

    globalScene.arenaFlyout.updateFieldText();

    if (LoggerTools.Actions.length > 1 && !globalScene.currentBattle.double) {
      console.error(`Removed second entry (${LoggerTools.Actions[1]}) because this is a Single Battle`);
      LoggerTools.Actions.pop(); // If this is a single battle, but we somehow have two actions, delete the second
    }
    if (LoggerTools.Actions.length > 1 && (LoggerTools.Actions[0] == "" || LoggerTools.Actions[0] == "%SKIP" || LoggerTools.Actions[0] == undefined || LoggerTools.Actions[0] == null)) {
      if (LoggerTools.Actions[0] == "") {
        console.error(`Removed first entry (${LoggerTools.Actions[0]}) because it was empty`);
      } else if (LoggerTools.Actions[0] == "%SKIP") {
        console.error(`Removed first entry (${LoggerTools.Actions[0]}) because it was flagged to be skipped`);
      } else if (LoggerTools.Actions[0] == undefined || LoggerTools.Actions[0] == null) {
        console.error(`Removed first entry (${LoggerTools.Actions[0]}) because it had no value`);
      }
      LoggerTools.Actions.shift();
    } // If the left slot isn't doing anything, delete its entry
    if (LoggerTools.Actions.length > 1 && (LoggerTools.Actions[1] == "" || LoggerTools.Actions[1] == "%SKIP" || LoggerTools.Actions[1] == undefined || LoggerTools.Actions[1] == null)) {
      if (LoggerTools.Actions[1] == "") {
        console.error(`Removed second entry (${LoggerTools.Actions[1]}) because it was empty`);
      } else if (LoggerTools.Actions[1] == "%SKIP") {
        console.error(`Removed second entry (${LoggerTools.Actions[1]}) because it was flagged to be skipped`);
      } else if (LoggerTools.Actions[1] == undefined || LoggerTools.Actions[1] == null) {
        console.error(`Removed second entry (${LoggerTools.Actions[1]}) because it had no value`);
      }
      LoggerTools.Actions.pop();
    }  // If the right slot isn't doing anything, delete its entry

    // If there is nothing to be logged, end.
    if (LoggerTools.Actions.length <= 1 && (LoggerTools.Actions[0] == "" || LoggerTools.Actions[0] == "%SKIP" || LoggerTools.Actions[0] == undefined || LoggerTools.Actions[0] == null)) {
      this.end();
      return;
    }

    // Log the player's actions
    LoggerTools.logActions(globalScene.currentBattle.waveIndex, LoggerTools.Actions.join(" & "));

    /*
     * `this.end()` will call `PhaseManager#shiftPhase()`, which dumps everything from `phaseQueuePrepend`
     * (aka everything that is queued via `unshift()`) to the front of the queue and dequeues to start the next phase.
     * This is important since stuff like `SwitchSummonPhase`, `AttemptRunPhase`, and `AttemptCapturePhase` break the "flow" and should take precedence
     */
    this.end();
  }

  private handleTurnCommand(turnCommand: TurnCommand, pokemon: Pokemon) {
    switch (turnCommand?.command) {
      case Command.FIGHT:
        this.handleFightCommand(turnCommand, pokemon);
        break;
      case Command.BALL:
        globalScene.phaseManager.unshiftNew("AttemptCapturePhase", turnCommand.targets![0] % 2, turnCommand.cursor!); //TODO: is the bang correct here?
        break;
      case Command.POKEMON:
        if (pokemon.isPlayer()) {
          if (turnCommand.args?.[0]) {
            // Baton Pass
            LoggerTools.Actions[pokemon.getFieldIndex()] = `Baton Pass ${pokemon.name} to ${globalScene.getPlayerParty()[turnCommand.cursor!].name}`;
          }
          else {
            // Regular Switch
            if (globalScene.currentBattle.turn === 1 && globalScene.currentBattle.battleType !== BattleType.TRAINER) {
              LoggerTools.Actions[pokemon.getFieldIndex()] = `Switch (NOT Pre-Switch) ${pokemon.name} to ${globalScene.getPlayerParty()[turnCommand.cursor!].name}`;
            }
            else {
              LoggerTools.Actions[pokemon.getFieldIndex()] = `Switch ${pokemon.name} to ${globalScene.getPlayerParty()[turnCommand.cursor!].name}`;
            }
          }
        }

        globalScene.phaseManager.unshiftNew(
          "SwitchSummonPhase",
          turnCommand.args?.[0] ? SwitchType.BATON_PASS : SwitchType.SWITCH,
          pokemon.getFieldIndex(),
          turnCommand.cursor!, // TODO: Is this bang correct?
          true,
          pokemon.isPlayer(),
        );
        break;
      case Command.RUN:
        globalScene.phaseManager.unshiftNew("AttemptRunPhase");
        break;
    }
  }

  private handleFightCommand(turnCommand: TurnCommand, pokemon: Pokemon) {
    const queuedMove = turnCommand.move;
    if (!queuedMove) {
      return;
    }

    // TODO: This seems somewhat dubious
    const move =
      pokemon.getMoveset().find(m => m.moveId === queuedMove.move && m.ppUsed < m.getMovePp())
      ?? new PokemonMove(queuedMove.move);

    if (move.getMove().hasAttr("MoveHeaderAttr")) {
      globalScene.phaseManager.unshiftNew("MoveHeaderPhase", pokemon, move);
    }

    globalScene.phaseManager.pushNew(
      "MovePhase",
      pokemon,
      turnCommand.targets ?? queuedMove.targets,
      move,
      queuedMove.useMode,
    );
  }
}
