import { globalScene } from "#app/global-scene";
import { settings } from "#app/global-settings-manager";
import { getPokemonNameWithAffix } from "#app/messages";
import { BattleStyle } from "#enums/battle-style";
import { SwitchType } from "#enums/switch-type";
import { UiMode } from "#enums/ui-mode";
import { BattlePhase } from "#phases/battle-phase";
import type { ConfirmModeConfig } from "#types/ui-types";
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

  public override start(): void {
    super.start();

    const pokemon = globalScene.getPlayerField()[this.fieldIndex];

    // End this phase early...

    // ...if the user is playing in Set Mode
    if (settings.general.battleStyle === BattleStyle.SET) {
      this.end();
      return;
    }

    // ...if the checked Pokemon is somehow not on the field
    if (globalScene.field.getAll().indexOf(pokemon) === -1) {
      globalScene.phaseManager.unshiftNew("SummonMissingPhase", this.fieldIndex);
      super.end();
      return;
    }

    // ...if there are no other allowed Pokemon in the player's party to switch with
    if (
      globalScene
        .getPlayerParty()
        .slice(1)
        .filter(p => p.isActive()).length === 0
    ) {
      this.end();
      return;
    }

    // ...or if any player Pokemon has an effect that prevents the checked Pokemon from switching
    if (!pokemon.canSwitch()) {
      this.end();
      return;
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
        const options: ConfirmModeConfig = {
          yesHandler: () => {
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
          noHandler: () => {
            // No, I want to leave my Pokémon as is
            globalScene.ui.setMode(UiMode.MESSAGE);
            for (let i = 0; i < globalScene.getEnemyField().length; i++) {
              const pk = globalScene.getEnemyField()[i];
              pk.toggleFlyout(true);
              pk.setBattleInfoFlyout("???", "???", "???", "???", 0);
            }

            this.end();
          },
        };
        globalScene.ui.setMode(UiMode.CONFIRM, options);
      },
    );
  }
}
