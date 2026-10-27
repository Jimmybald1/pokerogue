import { applyAbAttrs } from "#abilities/apply-ab-attrs";
import { globalScene } from "#app/global-scene";
import { LapsingPersistentModifier, LapsingPokemonHeldItemModifier } from "#modifiers/modifier";
import { BattlePhase } from "#phases/battle-phase";
import * as LoggerTools from "../logger";

export class BattleEndPhase extends BattlePhase {
  public readonly phaseName = "BattleEndPhase";

  /** Whether the player is considered to have won the battle. */
  public isVictory: boolean;

  constructor(isVictory: boolean) {
    super();

    this.isVictory = isVictory;
  }

  public override start(): void {
    super.start();

    const { currentBattle, gameData, gameMode, phaseManager } = globalScene;
    const { enemyFaints, successfulRun, trainer, waveIndex } = currentBattle;
    const { gameStats } = gameData;
    const { isEndless } = gameMode;

    // cull any extra `BattleEnd` phases from the queue.
    this.isVictory ||= phaseManager.hasPhaseOfType("BattleEndPhase", (phase: BattleEndPhase) => phase.isVictory);
    phaseManager.removeAllPhasesOfType("BattleEndPhase");

    gameStats.battles++;
    if (isEndless && waveIndex + 1 > gameStats.highestEndlessWave) {
      gameStats.highestEndlessWave = waveIndex + 1;
    }

    if (this.isVictory) {
      currentBattle.addBattleScore();

      if (trainer) {
        gameStats.trainersDefeated++;
      }
    }

    // Endless graceful end
    if (isEndless && waveIndex >= 5850) {
      phaseManager.clearPhaseQueue();
      phaseManager.unshiftNew("GameOverPhase", true);
    }

    /*
    Required for Pickup to function correctly due to `BattleScene#canTransferHeldItemModifier`,
    because that method returns `false` if all of the following is true:
    - the last item in a stack would be taken
    - the item has a pokemon source
    - the item no longer exists in the list of items attached to `BattleScene`

    By setting the `pokemonId` field to `-1`, the id won't resolve to a pokemon,
    making the item no longer have a pokemon source, allowing `canTransferHeldItemModifier` to return `true`.
    */
    // TODO: this probably isn't relevant post-item rework, double check after merging
    for (const item of currentBattle.postBattleLoot) {
      item.pokemonId = -1;
    }

    for (const pokemon of globalScene.getPokemonAllowedInBattle()) {
      applyAbAttrs("PostBattleAbAttr", { pokemon, victory: this.isVictory });
    }

    if (currentBattle.moneyScattered) {
      currentBattle.pickUpScatteredMoney();
    }

    globalScene.clearEnemyHeldItemModifiers();
    for (const p of globalScene.getEnemyParty()) {
      try {
        p.destroy();
      } catch {
        console.warn("Unable to destroy stale pokemon object in BattleEndPhase:", p);
      }
    }

    const lapsingModifiers = globalScene.findModifiers(
      m => m instanceof LapsingPersistentModifier || m instanceof LapsingPokemonHeldItemModifier,
    ) as (LapsingPersistentModifier | LapsingPokemonHeldItemModifier)[];
    for (const m of lapsingModifiers) {
      const args: any[] = [];
      if (m instanceof LapsingPokemonHeldItemModifier) {
        args.push(globalScene.getPokemonById(m.pokemonId));
      }
      if (!m.lapse(...args)) {
        globalScene.removeModifier(m);
      }
    }

    // Format this wave's logs
    const drpd: LoggerTools.DRPD = LoggerTools.getDRPD();
    const wv: LoggerTools.Wave = LoggerTools.getWave(drpd, globalScene.currentBattle.waveIndex);
    let lastcount = 0;
    let lastval;
    const tempActions: string[] = wv.actions.slice();
    const prevWaveActions: string[] = [];
    wv.actions = [];
    // Loop through each action
    for (let i = 0; i < tempActions.length; i++) {
      if (tempActions[i].substring(0, 10) == "[MOVEBACK]") {
        prevWaveActions.push(tempActions[i].substring(10));
      } else if (tempActions[i] != lastval) {
        if (lastcount > 0) {
          wv.actions.push(lastval + (lastcount == 1 ? "" : " x" + lastcount));
        }
        lastval = tempActions[i];
        lastcount = 1;
      } else {
        lastcount++;
      }
    }
    if (lastcount > 0) {
      wv.actions.push(lastval + (lastcount == 1 ? "" : " x" + lastcount));
    }
    console.log(tempActions, wv.actions);
    const wv2: LoggerTools.Wave = LoggerTools.getWave(drpd, globalScene.currentBattle.waveIndex - 1);
    wv2.actions = wv2.actions.concat(prevWaveActions);
    console.log(drpd);
    LoggerTools.save(drpd);

    globalScene.updateModifiers();
    if (!this.isVictory && !phaseManager.hasPhaseOfType("SelectModifierPhase") && !successfulRun) {
      if (enemyFaints > 0) {
        phaseManager.unshiftNew("SelectModifierPhase");
      } else {
        phaseManager.unshiftNew("SelectModifierPhase", 0, undefined, { fillRemaining: false, rerollMultiplier: -1 });
      }
    }
    this.end();
  }
}
