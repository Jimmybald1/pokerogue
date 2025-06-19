import { globalScene } from "#app/global-scene";
import type { BattlerIndex } from "#enums/battler-index";
import { PokemonPhase } from "./pokemon-phase";
import * as LoggerTools from "../logger";

export class ShinySparklePhase extends PokemonPhase {
  public readonly phaseName = "ShinySparklePhase";
  // biome-ignore lint/complexity/noUselessConstructor: This makes `battlerIndex` required
  constructor(battlerIndex: BattlerIndex) {
    super(battlerIndex);
  }

  start() {
    super.start();

    this.getPokemon().sparkle();
    globalScene.time.delayedCall(1000, () => this.end());
  }
}
