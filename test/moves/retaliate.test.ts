import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import Phaser from "phaser";
import GameManager from "#test/testUtils/gameManager";
import { SpeciesId } from "#enums/species-id";
import { MoveId } from "#enums/move-id";
import { allMoves } from "#app/data/data-lists";
import type Move from "#app/data/moves/move";

describe("Moves - Retaliate", () => {
  let phaserGame: Phaser.Game;
  let game: GameManager;

  let retaliate: Move;

  beforeAll(() => {
    phaserGame = new Phaser.Game({
      type: Phaser.HEADLESS,
    });
  });

  afterEach(() => {
    game.phaseInterceptor.restoreOg();
  });

  beforeEach(() => {
    retaliate = allMoves[MoveId.RETALIATE];
    game = new GameManager(phaserGame);
    game.override
      .battleStyle("single")
      .enemySpecies(SpeciesId.SNORLAX)
      .enemyMoveset(MoveId.RETALIATE)
      .enemyLevel(100)
      .moveset([MoveId.RETALIATE, MoveId.SPLASH])
      .startingLevel(80)
      .criticalHits(false);
  });

  it("increases power if ally died previous turn", async () => {
    vi.spyOn(retaliate, "calculateBattlePower");
    await game.classicMode.startBattle([SpeciesId.ABRA, SpeciesId.COBALION]);
    game.move.select(MoveId.RETALIATE);
    await game.phaseInterceptor.to("TurnEndPhase");
    expect(retaliate.calculateBattlePower).toHaveLastReturnedWith(70);
    game.doSelectPartyPokemon(1);

    await game.toNextTurn();
    game.move.select(MoveId.RETALIATE);
    await game.phaseInterceptor.to("MoveEffectPhase");
    expect(retaliate.calculateBattlePower).toHaveReturnedWith(140);
  });
});
