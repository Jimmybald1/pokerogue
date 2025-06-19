import { globalScene } from "#app/global-scene";
import { BattlePhase } from "./battle-phase";
import * as LoggerTools from "../logger";

export class HidePartyExpBarPhase extends BattlePhase {
  public readonly phaseName = "HidePartyExpBarPhase";
  start() {
    super.start();

    globalScene.partyExpBar.hide().then(() => this.end());
  }
}
