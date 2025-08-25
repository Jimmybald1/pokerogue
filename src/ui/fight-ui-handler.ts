import type { InfoToggle } from "#app/battle-scene";
import { globalScene } from "#app/global-scene";
import { getTypeDamageMultiplierColor } from "#data/type";
import { BattleType } from "#enums/battle-type";
import { Button } from "#enums/buttons";
import { Command } from "#enums/command";
import { MoveCategory } from "#enums/move-category";
import { MoveUseMode } from "#enums/move-use-mode";
import { MultiHitType } from "#enums/multi-hit-type";
import { PokemonType } from "#enums/pokemon-type";
import { StatusEffect } from "#enums/status-effect";
import { TextStyle } from "#enums/text-style";
import { UiMode } from "#enums/ui-mode";
import type { EnemyPokemon, PlayerPokemon, Pokemon } from "#field/pokemon";
import { PokemonMultiHitModifierType } from "#modifiers/modifier-type";
import { applyMoveAttrs } from "#moves/apply-attrs";
import type { PokemonMove } from "#moves/pokemon-move";
import type { CommandPhase } from "#phases/command-phase";
import { MoveInfoOverlay } from "#ui/move-info-overlay";
import { addTextObject } from "#ui/text";
import { UiHandler } from "#ui/ui-handler";
import { fixedInt, getLocalizedSpriteKey, isNullOrUndefined, NumberHolder, padInt, rangemap } from "#utils/common";
import i18next from "i18next";
import * as LoggerTools from "../logger";
import { MultiHitAttr } from "#types/move-types";

export class FightUiHandler extends UiHandler implements InfoToggle {
  public static readonly MOVES_CONTAINER_NAME = "moves";

  private readonly logDamagePrediction: Boolean = false;

  private movesContainer: Phaser.GameObjects.Container;
  private moveInfoContainer: Phaser.GameObjects.Container;
  private typeIcon: Phaser.GameObjects.Sprite;
  private ppLabel: Phaser.GameObjects.Text;
  private ppText: Phaser.GameObjects.Text;
  private powerLabel: Phaser.GameObjects.Text;
  private powerText: Phaser.GameObjects.Text;
  private accuracyLabel: Phaser.GameObjects.Text;
  private accuracyText: Phaser.GameObjects.Text;
  private cursorObj: Phaser.GameObjects.Image | null;
  private moveCategoryIcon: Phaser.GameObjects.Sprite;
  private moveInfoOverlay: MoveInfoOverlay;

  protected fieldIndex = 0;
  protected fromCommand: Command = Command.FIGHT;
  protected cursor2 = 0;

  constructor() {
    super(UiMode.FIGHT);
  }

  /**
   * Set the visibility of the objects in the move info container.
   */
  private setInfoVis(visibility: boolean): void {
    this.moveInfoContainer.iterate((o: Phaser.GameObjects.Components.Visible) => o.setVisible(visibility));
  }

  setup() {
    const ui = this.getUi();

    this.movesContainer = globalScene.add.container(18, -38.7).setName(FightUiHandler.MOVES_CONTAINER_NAME);
    ui.add(this.movesContainer);

    this.moveInfoContainer = globalScene.add.container(1, 0).setName("move-info");
    ui.add(this.moveInfoContainer);

    this.typeIcon = globalScene.add
      .sprite(globalScene.scaledCanvas.width - 57, -36, getLocalizedSpriteKey("types"), "unknown")
      .setVisible(false);

    this.moveCategoryIcon = globalScene.add
      .sprite(globalScene.scaledCanvas.width - 25, -36, "categories", "physical")
      .setVisible(false);

    this.ppLabel = addTextObject(globalScene.scaledCanvas.width - 70, -26, "PP", TextStyle.MOVE_INFO_CONTENT)
      .setOrigin(0.0, 0.5)
      .setVisible(false)
      .setText(i18next.t("fightUiHandler:pp"));

    this.ppText = addTextObject(globalScene.scaledCanvas.width - 12, -26, "--/--", TextStyle.MOVE_INFO_CONTENT)
      .setOrigin(1, 0.5)
      .setVisible(false);

    this.powerLabel = addTextObject(globalScene.scaledCanvas.width - 70, -18, "POWER", TextStyle.MOVE_INFO_CONTENT)
      .setOrigin(0.0, 0.5)
      .setVisible(false)
      .setText(i18next.t("fightUiHandler:power"));

    this.powerText = addTextObject(globalScene.scaledCanvas.width - 12, -18, "---", TextStyle.MOVE_INFO_CONTENT)
      .setOrigin(1, 0.5)
      .setVisible(false);

    this.accuracyLabel = addTextObject(globalScene.scaledCanvas.width - 70, -10, "ACC", TextStyle.MOVE_INFO_CONTENT)
      .setOrigin(0.0, 0.5)
      .setVisible(false)
      .setText(i18next.t("fightUiHandler:accuracy"));

    this.accuracyText = addTextObject(globalScene.scaledCanvas.width - 12, -10, "---", TextStyle.MOVE_INFO_CONTENT)
      .setOrigin(1, 0.5)
      .setVisible(false);

    this.moveInfoContainer.add([
      this.typeIcon,
      this.moveCategoryIcon,
      this.ppLabel,
      this.ppText,
      this.powerLabel,
      this.powerText,
      this.accuracyLabel,
      this.accuracyText,
    ]);

    // prepare move overlay
    this.moveInfoOverlay = new MoveInfoOverlay({
      delayVisibility: true,
      onSide: true,
      right: true,
      x: 0,
      y: -MoveInfoOverlay.getHeight(true),
      width: globalScene.scaledCanvas.width + 4,
      hideEffectBox: true,
      hideBg: true,
    });
    ui.add(this.moveInfoOverlay);
    // register the overlay to receive toggle events
    globalScene.addInfoToggle(this.moveInfoOverlay, this);
  }

  override show(args: [number?, Command?]): boolean {
    super.show(args);

    this.fieldIndex = args[0] ?? 0;
    this.fromCommand = args[1] ?? Command.FIGHT;

    const messageHandler = this.getUi().getMessageHandler();
    messageHandler.bg.setVisible(false);
    messageHandler.commandWindow.setVisible(false);
    messageHandler.movesWindowContainer.setVisible(true);
    const pokemon = (globalScene.phaseManager.getCurrentPhase() as CommandPhase).getPokemon();
    if (pokemon.tempSummonData.turnCount <= 1) {
      this.setCursor(0);
    } else {
      this.setCursor(this.fieldIndex ? this.cursor2 : this.cursor);
    }
    this.displayMoves();
    this.toggleInfo(false); // in case cancel was pressed while info toggle is active
    this.active = true;
    return true;
  }

  /**
   * Process the player inputting the selected {@linkcode Button}.
   * @param button - The {@linkcode Button} being pressed
   * @returns Whether the input was successful (ie did anything).
   */
  processInput(button: Button): boolean {
    const ui = this.getUi();
    let success = false;
    const cursor = this.getCursor();

    switch (button) {
      case Button.ACTION:
        if (
          (globalScene.phaseManager.getCurrentPhase() as CommandPhase).handleCommand(
            this.fromCommand,
            cursor,
            MoveUseMode.NORMAL,
          )
        ) {
          success = true;
        } else {
          ui.playError();
        }
        break;
      case Button.CANCEL: {
        // Cannot back out of fight menu if skipToFightInput is enabled
        const { battleType, mysteryEncounter } = globalScene.currentBattle;
        if (battleType !== BattleType.MYSTERY_ENCOUNTER || !mysteryEncounter?.skipToFightInput) {
          ui.setMode(UiMode.COMMAND, this.fieldIndex);
          success = true;
        }
        break;
      }
      case Button.UP:
        if (cursor >= 2) {
          success = this.setCursor(cursor - 2);
        }
        break;
      case Button.DOWN:
        if (cursor < 2) {
          success = this.setCursor(cursor + 2);
        }
        break;
      case Button.LEFT:
        if (cursor % 2 === 1) {
          success = this.setCursor(cursor - 1);
        }
        break;
      case Button.RIGHT:
        if (cursor % 2 === 0) {
          success = this.setCursor(cursor + 1);
        }
        break;
    }

    if (success) {
      ui.playSelect();
    }

    return success;
  }

  /**
   * Adjust the visibility of move names and the cursor icon when the info overlay is toggled
   * @param visible - The visibility of the info overlay; the move names and cursor's visibility will be set to the opposite
   */
  toggleInfo(visible: boolean): void {
    // The info overlay will already fade in, so we should hide the move name text and cursor immediately
    // rather than adjusting alpha via a tween.
    if (visible) {
      this.movesContainer.setVisible(false).setAlpha(0);
      this.cursorObj?.setVisible(false).setAlpha(0);
      return;
    }
    globalScene.tweens.add({
      targets: [this.movesContainer, this.cursorObj],
      duration: fixedInt(125),
      ease: "Sine.easeInOut",
      alpha: 1,
    });
    this.movesContainer.setVisible(true);
    this.cursorObj?.setVisible(true);
  }

  isActive(): boolean {
    return this.active;
  }

  getCursor(): number {
    return !this.fieldIndex ? this.cursor : this.cursor2;
  }

  /** @returns TextStyle according to percentage of PP remaining */
  private static ppRatioToColor(ppRatio: number): TextStyle {
    if (ppRatio > 0.25 && ppRatio <= 0.5) {
      return TextStyle.MOVE_PP_HALF_FULL;
    }
    if (ppRatio > 0 && ppRatio <= 0.25) {
      return TextStyle.MOVE_PP_NEAR_EMPTY;
    }
    if (ppRatio === 0) {
      return TextStyle.MOVE_PP_EMPTY;
    }
    return TextStyle.MOVE_PP_FULL; // default to full if ppRatio is invalid
  }

  /**
   * Populate the move info overlay with the information of the move at the given cursor index
   * @param cursor - The cursor position to set the move info for
   */
  private setMoveInfo(cursor: number): void {
    const pokemon = (globalScene.phaseManager.getCurrentPhase() as CommandPhase).getPokemon();
    const moveset = pokemon.getMoveset();

    const hasMove = cursor < moveset.length;
    this.setInfoVis(hasMove);

    if (!hasMove) {
      return;
    }

    const pokemonMove = moveset[cursor];
    const moveType = pokemon.getMoveType(pokemonMove.getMove());
    const textureKey = getLocalizedSpriteKey("types");
    this.typeIcon.setTexture(textureKey, PokemonType[moveType].toLowerCase()).setScale(0.8);

    const moveCategory = pokemonMove.getMove().category;
    this.moveCategoryIcon.setTexture("categories", MoveCategory[moveCategory].toLowerCase()).setScale(1.0);
    const power = pokemonMove.getMove().power;
    const accuracy = pokemonMove.getMove().accuracy;
    const maxPP = pokemonMove.getMovePp();
    const pp = maxPP - pokemonMove.ppUsed;

    const ppLeftStr = padInt(pp, 2, "  ");
    const ppMaxStr = padInt(maxPP, 2, "  ");
    this.ppText.setText(`${ppLeftStr}/${ppMaxStr}`);
    this.powerText.setText(`${power >= 0 ? power : "---"}`);
    this.accuracyText.setText(`${accuracy >= 0 ? accuracy : "---"}`);

    const ppColorStyle = FightUiHandler.ppRatioToColor(pp / maxPP);

    // Changes the text color and shadow according to the determined TextStyle
    this.ppText.setColor(this.getTextColor(ppColorStyle, false)).setShadowColor(this.getTextColor(ppColorStyle, true));
    this.moveInfoOverlay.show(pokemonMove.getMove());

    pokemon.getOpponents().forEach(opponent => {
      (opponent as EnemyPokemon).updateEffectiveness(this.getEffectivenessText(pokemon, opponent, pokemonMove));
    });
  }

  setCursor(cursor: number): boolean {
    const ui = this.getUi();

    this.moveInfoOverlay.clear();
    const changed = this.getCursor() !== cursor;
    if (changed) {
      if (!this.fieldIndex) {
        this.cursor = cursor;
      } else {
        this.cursor2 = cursor;
      }
    }

    this.setMoveInfo(cursor);

    if (!this.cursorObj) {
      const isTera = this.fromCommand === Command.TERA;
      this.cursorObj = globalScene.add.image(0, 0, isTera ? "cursor_tera" : "cursor");
      this.cursorObj.setScale(isTera ? 0.7 : 1);
      ui.add(this.cursorObj);
    }

    this.cursorObj.setPosition(13 + (cursor % 2 === 1 ? 114 : 0), -31 + (cursor >= 2 ? 15 : 0));

    return changed;
  }

  /**
   * Gets multiplier text for a pokemon's move against a specific opponent
   */
  private getEffectivenessText(pokemon: Pokemon, opponent: Pokemon, pokemonMove: PokemonMove): string | undefined {
    const effectiveness = opponent.getMoveEffectiveness(
      pokemon,
      pokemonMove.getMove(),
      !opponent.waveData.abilityRevealed,
      undefined,
      undefined,
      true,
    );
    if (pokemonMove.getMove().category === MoveCategory.STATUS) {
      if (effectiveness === 0) {
        return "0x";
      }
      return "1x";
    }
    
    let text = `${effectiveness}x`;
    if (globalScene.pathingToolUI) {
      text += ` - ${this.calcDamage(pokemon, opponent, pokemonMove)}`;
    }
    return text;
  }

  displayMoves() {
    const pokemon = (globalScene.phaseManager.getCurrentPhase() as CommandPhase).getPokemon();
    const moveset = pokemon.getMoveset();

    for (let moveIndex = 0; moveIndex < 4; moveIndex++) {
      const moveText = addTextObject(
        moveIndex % 2 === 0 ? 0 : 114,
        moveIndex < 2 ? 0 : 16,
        "-",
        TextStyle.WINDOW,
      ).setName("text-empty-move");

      if (moveIndex < moveset.length) {
        const pokemonMove = moveset[moveIndex]!; // TODO is the bang correct?
        moveText
          .setText(pokemonMove.getName())
          .setName(pokemonMove.getName())
          .setColor(this.getMoveColor(pokemon, pokemonMove) ?? moveText.style.color);
      }

      this.movesContainer.add(moveText);
    }
  }

  /**
   * Returns a specific move's color based on its type effectiveness against opponents
   * If there are multiple opponents, the highest effectiveness' color is returned
   * @returns A color or undefined if the default color should be used
   */
  private getMoveColor(pokemon: Pokemon, pokemonMove: PokemonMove): string | undefined {
    if (!globalScene.typeHints) {
      return undefined;
    }

    const opponents = pokemon.getOpponents();
    if (opponents.length <= 0) {
      return undefined;
    }

    const moveColors = opponents
      .map(opponent =>
        opponent.getMoveEffectiveness(
          pokemon,
          pokemonMove.getMove(),
          !opponent.waveData.abilityRevealed,
          undefined,
          undefined,
          true,
        ),
      )
      .sort((a, b) => b - a)
      .map(effectiveness => {
        if (pokemonMove.getMove().category === MoveCategory.STATUS && effectiveness !== 0) {
          return undefined;
        }
        return getTypeDamageMultiplierColor(effectiveness ?? 0, "offense");
      });

    return moveColors[0];
  }

  clear() {
    super.clear();
    const messageHandler = this.getUi().getMessageHandler();
    this.clearMoves();
    this.setInfoVis(false);
    this.moveInfoOverlay.clear();
    messageHandler.bg.setVisible(true);
    this.eraseCursor();
    this.active = false;
  }

  clearMoves() {
    this.movesContainer.removeAll(true);

    const opponents = (globalScene.phaseManager.getCurrentPhase() as CommandPhase).getPokemon().getOpponents();
    opponents.forEach(opponent => {
      (opponent as EnemyPokemon).updateEffectiveness();
    });
  }

  eraseCursor() {
    if (this.cursorObj) {
      this.cursorObj.destroy();
    }
    this.cursorObj = null;
  }

  calcDamage(user: Pokemon, target: Pokemon, move: PokemonMove) {
    const moveObj = move.getMove();
    if (moveObj.category == MoveCategory.STATUS) {
      return ""; // Don't give a damage estimate for status moves
    }

    if (target.getMoveEffectiveness(user, moveObj, false, true) == undefined) {
      return ""; // Target is immune
    }

    let dmgRange = 0.85;
    const fixedDamage = new NumberHolder(0);
    applyMoveAttrs("FixedDamageAttr", user, target, moveObj, fixedDamage);
    if (fixedDamage.value > 0) {
      dmgRange = 1;
    }

    const isGuaranteedCrit = target.isGuaranteedCrit(user, moveObj, true);
    const isTera = user.isTerastallized;
    user.isTerastallized = isTera ? isTera : this.fromCommand === Command.TERA; // If not yet terastallized, check if command wants to terastallize
    let dmgLow = target.getAttackDamage(
      {
        source: user, 
        move: moveObj, 
        isCritical: isGuaranteedCrit,
        simulated: true,
      }
    ).damage * dmgRange;
    let dmgHigh = target.getAttackDamage(
      {
        source: user, 
        move: moveObj, 
        isCritical: isGuaranteedCrit,
        simulated: true,
      }
    ).damage;
    user.isTerastallized = isTera; // Revert to whatever the terastallize state was before

    if (this.logDamagePrediction) {
      console.log(`Damage min: ${dmgLow} | Damage max: ${dmgHigh}`);
    }

    let minHits = 1;
    let maxHits = -1; // If nothing changes this value, it is set to minHits
    const mh = moveObj.getAttrs("MultiHitAttr");
    for (var i = 0; i < mh.length; i++) {
      const mh2 = mh[i] as MultiHitAttr;
      switch (mh2.getMultiHitType()) {
        case MultiHitType._2:
          minHits = 2;
        case MultiHitType._2_TO_5:
          minHits = 2;
          maxHits = 5;
        case MultiHitType._3:
          minHits = 3;
        case MultiHitType._10:
          minHits = 1;
          maxHits = 10;
        case MultiHitType.BEAT_UP:
          const party = user.isPlayer() ? globalScene.getPlayerParty() : globalScene.getEnemyParty();
          // No status means the ally pokemon can contribute to Beat Up
          minHits = party.reduce((total, pokemon) => {
            return total + (pokemon.id === user.id ? 1 : pokemon?.status && pokemon.status.effect !== StatusEffect.NONE ? 0 : 1);
          }, 0);
      }
    }

    if (maxHits == -1) {
      maxHits = minHits;
    }

    // Add Multi Lens if its not a multi-hit move
    if (minHits == 1) {
      const h = user.getHeldItems();
      for (var i = 0; i < h.length; i++) {
        if (h[i].type instanceof PokemonMultiHitModifierType) {
          minHits *= h[i].getStackCount();
          maxHits *= h[i].getStackCount();
        }
      }
    }

    if (this.logDamagePrediction) {
      console.log(`MinHits: ${minHits} | MaxHits: ${maxHits}`);
    }

    if (false) {
      dmgLow = dmgLow * minHits;
      dmgHigh = dmgHigh * maxHits;
    }

    // Actual damage dealt
    let dmgLowF = Math.floor(dmgLow);
    let dmgHighF = Math.floor(dmgHigh);

    let maxEHP = target.getMaxHp();

    let koText = "";
    if (dmgLowF >= maxEHP) {
      koText = " KO";
    } else if (dmgHighF >= target.hp) {
      var percentChance = rangemap(maxEHP, dmgLow, dmgHigh);
      koText = " " + Math.floor(percentChance * 100) + "% KO";
    }

    // Calculate boss shield segments cleared
    let qSuffix = "";
    if (target.isBoss()) {
      const segmentRequirements = (target as EnemyPokemon).calculateBossShieldRequirements();
      if (this.logDamagePrediction) {
        console.log(`Segments: ${segmentRequirements}`);
      }

      maxEHP = segmentRequirements[segmentRequirements.length - 1];

      // Count amount of segments cleared.
      const segmentClearedLow = segmentRequirements.reduce((total, req) => {
        return total + (dmgLowF >= req ? 1 : 0);
      }, 0);
      const segmentClearedHigh = segmentRequirements.reduce((total, req) => {
        return total + (dmgHighF >= req ? 1 : 0);
      }, 0);

      // Set info suffix text
      qSuffix = ` (${segmentClearedLow}-${segmentClearedHigh})`;
      if (segmentClearedLow == segmentClearedHigh) {
        qSuffix = ` (${segmentClearedLow})`;
      }

      if (this.logDamagePrediction) {
        console.log(`Segments min: ${segmentClearedLow} | Segments max: ${segmentClearedHigh}`);
      }

      if (segmentClearedLow == segmentRequirements.length) {
        // Same segment, Guaranteed kill
        // 100% KO
        // show damage ranges
        koText = " KO";
      } else if (segmentClearedHigh == segmentRequirements.length) {
        // Different segment, only high is a kill
        // ~% KO
        // show segment damage for low and damage range for high
        var percentChance = rangemap(maxEHP, dmgLow, dmgHigh);
        koText = " " + Math.floor(percentChance * 100) + "% KO";

        dmgLow = segmentClearedLow > 0 ? segmentRequirements[0] * segmentClearedLow : dmgLow;
      } else if (segmentClearedLow == segmentClearedHigh) {
        // Same segment
        // no KO
        // show segment damage for both
        koText = "";

        dmgLow = segmentClearedLow > 0 ? segmentRequirements[0] * segmentClearedLow : dmgLow;
        dmgHigh = segmentClearedHigh > 0 ? segmentRequirements[0] * segmentClearedHigh : dmgHigh;
      } else {
        // Different segment
        // no KO
        // show segment damage for both
        koText = "";

        dmgLow = segmentClearedLow > 0 ? segmentRequirements[0] * segmentClearedLow : dmgLow;
        dmgHigh = segmentClearedHigh > 0 ? segmentRequirements[0] * segmentClearedHigh : dmgHigh;
      }

      // Re-Floor based on the new numbers
      dmgLowF = Math.floor(dmgLow);
      dmgHighF = Math.floor(dmgHigh);
      if (this.logDamagePrediction) {
        console.log(`Boss damage min: ${dmgLow} | Boss damage max: ${dmgHigh}`);
      }
    }

    // %HP removed
    const dmgLowP = Math.round((dmgLowF) / target.getMaxHp() * 100);
    const dmgHighP = Math.round((dmgHighF) / target.getMaxHp() * 100);

    if (this.logDamagePrediction) {
      console.log(`HP% min: ${dmgLowP} | HP% max: ${dmgHighP}`);
    }

    if (this.logDamagePrediction) {
      console.log(`Enemy HP: ${target.hp} | Enemy HP%: ${target.getHpRatio() * 100}`);
    }
    if (this.logDamagePrediction) {
      console.log(`Max EHP: ${maxEHP}`);
    }
    if (this.logDamagePrediction && !isNullOrUndefined(koText)) {
      console.log(`KO%: ${koText}`);
    }

    if (globalScene.damageDisplay == "Percent") {
      return (dmgLowP == dmgHighP ? dmgLowP + "%" + qSuffix : dmgLowP + "%-" + dmgHighP + "%" + qSuffix) + koText;
    }
    if (globalScene.damageDisplay == "Value") {
      return (dmgLowF == dmgHighF ? dmgLowF + qSuffix : dmgLowF + "-" + dmgHighF + qSuffix) + koText;
    }
    return "";
  }
}
