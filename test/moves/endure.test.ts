import { AbilityId } from "#enums/ability-id";
import { MoveId } from "#enums/move-id";
import { SpeciesId } from "#enums/species-id";
import GameManager from "#test/testUtils/gameManager";
import Phaser from "phaser";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

describe("Moves - Endure", () => {
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
    game.override
      .moveset([MoveId.THUNDER, MoveId.BULLET_SEED, MoveId.TOXIC, MoveId.SHEER_COLD])
      .ability(AbilityId.SKILL_LINK)
      .startingLevel(100)
      .battleStyle("single")
      .criticalHits(false)
      .enemySpecies(SpeciesId.MAGIKARP)
      .enemyAbility(AbilityId.NO_GUARD)
      .enemyMoveset(MoveId.ENDURE);
  });

  it("should let the pokemon survive with 1 HP", async () => {
    await game.classicMode.startBattle([SpeciesId.ARCEUS]);

    game.move.select(MoveId.THUNDER);
    await game.phaseInterceptor.to("BerryPhase");

    expect(game.scene.getEnemyPokemon()!.hp).toBe(1);
  });

  it("should let the pokemon survive with 1 HP when hit with a multihit move", async () => {
    await game.classicMode.startBattle([SpeciesId.ARCEUS]);

    game.move.select(MoveId.BULLET_SEED);
    await game.phaseInterceptor.to("BerryPhase");

    expect(game.scene.getEnemyPokemon()!.hp).toBe(1);
  });

  it("should let the pokemon survive against OHKO moves", async () => {
    await game.classicMode.startBattle([SpeciesId.MAGIKARP]);
    const enemy = game.scene.getEnemyPokemon()!;

    game.move.select(MoveId.SHEER_COLD);
    await game.phaseInterceptor.to("TurnEndPhase");

    expect(enemy.isFainted()).toBeFalsy();
  });

  // comprehensive indirect damage test copied from Reviver Seed test
  it.each([
    { moveType: "Damaging Move Chip Damage", move: MoveId.SALT_CURE },
    { moveType: "Chip Damage", move: MoveId.LEECH_SEED },
    { moveType: "Trapping Chip Damage", move: MoveId.WHIRLPOOL },
    { moveType: "Status Effect Damage", move: MoveId.TOXIC },
    { moveType: "Weather", move: MoveId.SANDSTORM },
  ])("should not prevent fainting from $moveType", async ({ move }) => {
    game.override
      .enemyLevel(1)
      .startingLevel(100)
      .enemySpecies(SpeciesId.MAGIKARP)
      .moveset(move)
      .enemyMoveset(MoveId.ENDURE);
    await game.classicMode.startBattle([SpeciesId.MAGIKARP, SpeciesId.FEEBAS]);
    const enemy = game.scene.getEnemyPokemon()!;
    enemy.damageAndUpdate(enemy.hp - 1);

    game.move.select(move);
    await game.phaseInterceptor.to("TurnEndPhase");

    expect(enemy.isFainted()).toBeTruthy();
  });
});
