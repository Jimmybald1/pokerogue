import * as LoggerTools from "../logger";
import { globalScene } from "#app/global-scene";
import { BattleStyle } from "#app/enums/battle-style";
import { BattlerTagType } from "#app/enums/battler-tag-type";
import { getPokemonNameWithAffix } from "#app/messages";
import { UiMode } from "#enums/ui-mode";
import i18next from "i18next";
import { BattlePhase } from "./battle-phase";
import { getNatureName } from "#app/data/nature";
import { SwitchType } from "#enums/switch-type";
import { EnemyCommandPhase } from "./enemy-command-phase";
import { BattlerIndex } from "#enums/battler-index";

export class CheckSwitchPhase extends BattlePhase {
  public readonly phaseName = "CheckSwitchPhase";
  protected fieldIndex: number;
  protected useName: boolean;

  constructor(fieldIndex: number, useName: boolean) {
    super();

    this.fieldIndex = fieldIndex;
    this.useName = useName;
  }

  start() {
    super.start();

    const pokemon = globalScene.getPlayerField()[this.fieldIndex];

    // End this phase early...

    // ...if the user is playing in Set Mode
    if (globalScene.battleStyle === BattleStyle.SET) {
      return super.end();
    }

    // ...if the checked Pokemon is somehow not on the field
    if (globalScene.field.getAll().indexOf(pokemon) === -1) {
      globalScene.phaseManager.unshiftNew("SummonMissingPhase", this.fieldIndex);
      return super.end();
    }

    // ...if there are no other allowed Pokemon in the player's party to switch with
    if (
      !globalScene
        .getPlayerParty()
        .slice(1)
        .filter(p => p.isActive()).length
    ) {
      return super.end();
    }

    // ...or if any player Pokemon has an effect that prevents the checked Pokemon from switching
    if (
      pokemon.getTag(BattlerTagType.FRENZY) ||
      pokemon.isTrapped() ||
      globalScene.getPlayerField().some(p => p.getTag(BattlerTagType.COMMANDED))
    ) {
      return super.end();
    }

    for (let i = 0; i < globalScene.getEnemyField().length; i++) {
      const pk = globalScene.getEnemyField()[i];
      var maxIVs: string[] = [];
      var ivnames = [ "HP", "Atk", "Def", "Sp.Atk", "Sp.Def", "Speed" ];
      pk.ivs.forEach((iv, j) => {
        if (iv == 31) {
          maxIVs.push(ivnames[j]);
        }
      });
      let ivDesc = maxIVs.join(",");
      if (ivDesc == "") {
        ivDesc = "No Max IVs";
      } else {
        ivDesc = "31iv: " + ivDesc;
      }

      pk.toggleFlyout(true);
      pk.setBattleInfoFlyout(getNatureName(pk.nature), ivDesc, pk.getAbility().name, pk.getPassiveAbility().name, pk.abilityIndex);
    }

    globalScene.predictEnemy();

    globalScene.ui.showText(
      i18next.t("battle:switchQuestion", {
        pokemonName: this.useName ? getPokemonNameWithAffix(pokemon) : i18next.t("battle:pokemon"),
      }),
      null,
      () => {
        globalScene.ui.setMode(
          UiMode.CONFIRM,
          () => {
            // Yes, I want to Pre-Switch
            globalScene.ui.setMode(UiMode.MESSAGE);
            globalScene.phaseManager.unshiftNew("SwitchPhase", SwitchType.INITIAL_SWITCH, this.fieldIndex, false, true);
            for (let i = 0; i < globalScene.getEnemyField().length; i++) {
              const pk = globalScene.getEnemyField()[i];
              pk.toggleFlyout(true);
              pk.setBattleInfoFlyout("???", "???", "???", "???", 0);
            }
            
            this.end();
          },
          () => {
            // No, I want to leave my Pokémon as is
            globalScene.ui.setMode(UiMode.MESSAGE);
            for (let i = 0; i < globalScene.getEnemyField().length; i++) {
              const pk = globalScene.getEnemyField()[i];
              pk.toggleFlyout(true);
              pk.setBattleInfoFlyout("???", "???", "???", "???", 0);
            }

            this.end();
          },
        );
      },
    );
  }
}
