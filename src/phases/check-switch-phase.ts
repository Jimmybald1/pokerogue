import { globalScene } from "#app/global-scene";
import { getPokemonNameWithAffix } from "#app/messages";
import { BattleStyle } from "#enums/battle-style";
import { BattlerTagType } from "#enums/battler-tag-type";
import { SwitchType } from "#enums/switch-type";
import { UiMode } from "#enums/ui-mode";
import { BattlePhase } from "#phases/battle-phase";
import i18next from "i18next";
import { getNatureName } from "#data/nature";
import * as LoggerTools from "../logger";

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

    LoggerTools.predictEnemy();

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
