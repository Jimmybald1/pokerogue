import { BattlerIndex } from "#enums/battler-index";
import {
  handleMysteryEncounterBattleStartEffects,
  handleMysteryEncounterTurnStartEffects,
} from "#app/data/mystery-encounters/utils/encounter-phase-utils";
import { TurnInitEvent } from "#app/events/battle-scene";
import type { PlayerPokemon, EnemyPokemon } from "#app/field/pokemon";
import i18next from "i18next";
import { FieldPhase } from "./field-phase";
import { globalScene } from "#app/global-scene";
import * as LoggerTools from "../logger";
import { EnemyCommandPhase } from "./enemy-command-phase";

export class TurnInitPhase extends FieldPhase {
  public readonly phaseName = "TurnInitPhase";
  start() {
    super.start();

    // If the flyout was shown automatically, and the user hasn't made it go away, auto-hide it
    globalScene.arenaFlyout.dismiss();

    globalScene.getPlayerField().forEach(p => {
      // If this pokemon is in play and evolved into something illegal under the current challenge, force a switch
      if (p.isOnField() && !p.isAllowedInBattle()) {
        globalScene.phaseManager.queueMessage(
          i18next.t("challenges:illegalEvolution", { pokemon: p.name }),
          null,
          true,
        );

        const allowedPokemon = globalScene.getPokemonAllowedInBattle();

        if (!allowedPokemon.length) {
          // If there are no longer any legal pokemon in the party, game over.
          globalScene.phaseManager.clearPhaseQueue();
          globalScene.phaseManager.unshiftNew("GameOverPhase");
        } else if (
          allowedPokemon.length >= globalScene.currentBattle.getBattlerCount() ||
          (globalScene.currentBattle.double && !allowedPokemon[0].isActive(true))
        ) {
          // If there is at least one pokemon in the back that is legal to switch in, force a switch.
          p.switchOut();
        } else {
          // If there are no pokemon in the back but we're not game overing, just hide the pokemon.
          // This should only happen in double battles.
          p.leaveField();
        }
        if (allowedPokemon.length === 1 && globalScene.currentBattle.double) {
          globalScene.phaseManager.unshiftNew("ToggleDoublePositionPhase", true);
        }
      }
    });

    globalScene.eventTarget.dispatchEvent(new TurnInitEvent());

    // Add new blank actions
    LoggerTools.Actions[0] = "";
    LoggerTools.Actions[1] = "";

    LoggerTools.enemyPlan[0] = "";
    LoggerTools.enemyPlan[1] = "";
    LoggerTools.enemyPlan[2] = "";
    LoggerTools.enemyPlan[3] = "";

    handleMysteryEncounterBattleStartEffects();

    // If true, will skip remainder of current phase (and not queue CommandPhases etc.)
    if (handleMysteryEncounterTurnStartEffects()) {
      this.end();
      return;
    }

    // Pathing tool function
    // Activate enemy command phase for move and catch prediction
    globalScene.getField().forEach((pokemon, i) => {
      if (pokemon?.isActive()) {
        if (!pokemon.isPlayer()) {
          (pokemon as EnemyPokemon).toggleFlyout(false);
          pokemon.resetTurnData();

          const enemyCommandPhase = new EnemyCommandPhase(i - BattlerIndex.ENEMY, true);
          enemyCommandPhase.start();

          // Reset all commands and rng, but dont increment the actual turn
          globalScene.currentBattle.incrementTurn();
          globalScene.currentBattle.turn--;
        }
      }
    });

    globalScene.getField().forEach((pokemon, i) => {
      if (pokemon?.isActive()) {
        if (pokemon.isPlayer()) {
          globalScene.currentBattle.addParticipant(pokemon as PlayerPokemon);
        }

        pokemon.resetTurnData();

        if (pokemon.isPlayer()) {
          globalScene.phaseManager.pushNew("CommandPhase", i);
        } else {
          globalScene.phaseManager.pushNew("EnemyCommandPhase", i - BattlerIndex.ENEMY);
        }
      }
    });

    globalScene.phaseManager.pushNew("TurnStartPhase");

    this.end();
  }
}
