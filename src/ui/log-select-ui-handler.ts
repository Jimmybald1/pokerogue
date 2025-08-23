import i18next from "i18next";
import { Button } from "#enums/buttons";
import { addWindow } from "./ui-theme";
import * as LoggerTools from "../logger";
import { globalScene } from "#app/global-scene";
import { UiMode } from "#enums/ui-mode";
import { fixedInt } from "#app/utils/common";
import { allSpecies } from "#app/data/data-lists";
import { SpeciesId } from "#enums/species-id";
import { getPokemonSpecies } from "#app/utils/pokemon-utils";
import { MessageUiHandler } from "./message-ui-handler";
import { addTextObject } from "./text";
import { TextStyle } from "#enums/text-style";
import { getEnumValues } from "#utils/enums";
import { PokemonData } from "#system/pokemon-data";
import { BattleScene } from "#app/battle-scene";

const sessionSlotCount = 5;
const gap = 20;

export type LogSelectCallback = (key?: string) => void;

export default class LogSelectUiHandler extends MessageUiHandler {

  private saveSlotSelectContainer: Phaser.GameObjects.Container;
  private sessionSlotsContainer: Phaser.GameObjects.Container;
  private saveSlotSelectMessageBox: Phaser.GameObjects.NineSlice;
  private saveSlotSelectMessageBoxContainer: Phaser.GameObjects.Container;
  private sessionSlots: SessionSlot[];

  private selectCallback?: LogSelectCallback;
  private quitCallback: LogSelectCallback;

  private scrollCursor: integer = 0;

  private cursorObj?: Phaser.GameObjects.NineSlice;

  private sessionSlotsContainerInitialY: number;

  private extrasLabel: Phaser.GameObjects.Text;

  constructor() {
    super(UiMode.LOG_HANDLER);
  }

  setup() {
    const ui = this.getUi();

    this.saveSlotSelectContainer = globalScene.add.container(0, 0);
    this.saveSlotSelectContainer.setVisible(false);
    ui.add(this.saveSlotSelectContainer);

    const loadSessionBg = globalScene.add.rectangle(0, 0, globalScene.game.canvas.width / 6, -globalScene.game.canvas.height / 6, 0x006860);
    loadSessionBg.setOrigin(0, 0);
    this.saveSlotSelectContainer.add(loadSessionBg);

    this.sessionSlotsContainerInitialY = -globalScene.game.canvas.height / 6 + 8;

    this.sessionSlotsContainer = globalScene.add.container(8, this.sessionSlotsContainerInitialY);
    this.saveSlotSelectContainer.add(this.sessionSlotsContainer);

    this.saveSlotSelectMessageBoxContainer = globalScene.add.container(0, 0);
    this.saveSlotSelectMessageBoxContainer.setVisible(false);
    this.saveSlotSelectContainer.add(this.saveSlotSelectMessageBoxContainer);

    this.saveSlotSelectMessageBox = addWindow(1, -1, 318, 28);
    this.saveSlotSelectMessageBox.setOrigin(0, 1);
    this.saveSlotSelectMessageBoxContainer.add(this.saveSlotSelectMessageBox);

    this.message = addTextObject(8, 8, "", TextStyle.WINDOW, { maxLines: 2 });
    this.message.setOrigin(0, 0);
    this.saveSlotSelectMessageBoxContainer.add(this.message);

    this.extrasLabel = addTextObject(40, 56 * 5 + 5, "Other Files", TextStyle.WINDOW);
    this.extrasLabel.setAlign("center");
    this.sessionSlotsContainer.add(this.extrasLabel);

    this.sessionSlots = [];
  }

  show(args: any[]): boolean {
    if ((args.length < 1 || !(args[0] instanceof Function))) {
      return false;
    }

    super.show(args);

    this.selectCallback = args[0] as LogSelectCallback;
    this.quitCallback = args[1] as LogSelectCallback;

    console.log(this.selectCallback);

    this.saveSlotSelectContainer.setVisible(true);
    this.populateSessionSlots();
    this.setScrollCursor(0);
    this.setCursor(0);

    return true;
  }

  processInput(button: Button): boolean {
    const ui = this.getUi();

    let success = false;
    const error = false;

    if (button === Button.ACTION) {
      const originalCallback = this.selectCallback!;
      const cursor = this.cursor + this.scrollCursor;
      const k = this.sessionSlots[cursor].key;
      if (k != undefined) {
        const file = JSON.parse(localStorage.getItem(k)!) as LoggerTools.DRPD;
        console.log(k, file);
        LoggerTools.generateEditHandlerForLog(this.sessionSlots[cursor].logIndex, () => {
          this.selectCallback = undefined;
          originalCallback(k);
        })();
        success = true;
      }
    } else if (button === Button.CANCEL) {
      this.quitCallback!(undefined);
    } else {
      switch (button) {
        case Button.UP:
          if (this.cursor) {
            success = this.setCursor(this.cursor - 1);
          } else if (this.scrollCursor) {
            success = this.setScrollCursor(this.scrollCursor - 1);
          }
          break;
        case Button.DOWN:
          if (this.cursor < 2) {
            success = this.setCursor(this.cursor + 1);
          } else if (this.scrollCursor < this.sessionSlots.length - 3) {
            success = this.setScrollCursor(this.scrollCursor + 1);
          }
          break;
      }
    }

    if (success) {
      ui.playSelect();
    } else if (error) {
      ui.playError();
    }

    return success || error;
  }

  populateSessionSlots() {
    const ui = this.getUi();
    let ypos = 0;
    LoggerTools.getLogs();
    for (let s = 0; s < sessionSlotCount; s++) {
      let found = false;
      for (var i = 0; i < LoggerTools.logs.length; i++) {
        if (LoggerTools.logs[i][3] == s.toString()) {
          found = true;
          const sessionSlot = new SessionSlot(s, ypos);
          ypos++;
          sessionSlot.load(LoggerTools.logs[i][1]);
          sessionSlot.logIndex = i;
          globalScene.add.existing(sessionSlot);
          this.sessionSlotsContainer.add(sessionSlot);
          this.sessionSlots.push(sessionSlot);
        }
      }
      if (!found) {
        const sessionSlot = new SessionSlot(s, ypos);
        ypos++;
        sessionSlot.load(undefined);
        globalScene.add.existing(sessionSlot);
        this.sessionSlotsContainer.add(sessionSlot);
        this.sessionSlots.push(sessionSlot);
      }
    }
    for (var i = 0; i < LoggerTools.logs.length; i++) {
      if (LoggerTools.logs[i][3] == "") {
        const sessionSlot = new SessionSlot(undefined, ypos);
        ypos++;
        sessionSlot.load(LoggerTools.logs[i][1]);
        sessionSlot.logIndex = i;
        globalScene.add.existing(sessionSlot);
        this.sessionSlotsContainer.add(sessionSlot);
        this.sessionSlots.push(sessionSlot);
      }
    }
  }

  showText(text: string, delay?: integer, callback?: Function, callbackDelay?: integer, prompt?: boolean, promptDelay?: integer) {
    super.showText(text, delay, callback, callbackDelay, prompt, promptDelay);

    if (text?.indexOf("\n") === -1) {
      this.saveSlotSelectMessageBox.setSize(318, 28);
      this.message.setY(-22);
    } else {
      this.saveSlotSelectMessageBox.setSize(318, 42);
      this.message.setY(-37);
    }

    this.saveSlotSelectMessageBoxContainer.setVisible(!!text?.length);
  }

  setCursor(cursor: integer): boolean {
    const changed = super.setCursor(cursor);

    if (!this.cursorObj) {
      this.cursorObj = globalScene.add.nineslice(0, 0, "select_cursor_highlight_thick", undefined, 296, 44, 6, 6, 6, 6);
      this.cursorObj.setOrigin(0, 0);
      this.sessionSlotsContainer.add(this.cursorObj);
    }
    this.cursorObj.setPosition(4, 4 + (cursor + this.scrollCursor) * 56 + ((cursor + this.scrollCursor) > 4 ? gap : 0));

    return changed;
  }

  setScrollCursor(scrollCursor: integer): boolean {
    const changed = scrollCursor !== this.scrollCursor;

    if (changed) {
      this.scrollCursor = scrollCursor;
      this.setCursor(this.cursor);
      globalScene.tweens.add({
        targets: this.sessionSlotsContainer,
        y: this.sessionSlotsContainerInitialY - 56 * scrollCursor - ((this.cursor + this.scrollCursor) > 4 ? gap : 0),
        duration: fixedInt(325),
        ease: "Sine.easeInOut"
      });
    }

    return changed;
  }

  clear() {
    super.clear();
    this.saveSlotSelectContainer.setVisible(false);
    this.eraseCursor();
    this.selectCallback = undefined;
    this.clearSessionSlots();
  }

  eraseCursor() {
    if (this.cursorObj) {
      this.cursorObj.destroy();
    }
    this.cursorObj = undefined;
  }

  clearSessionSlots() {
    this.sessionSlots.splice(0, this.sessionSlots.length);
    this.sessionSlotsContainer.removeAll(true);
  }
}

class SessionSlot extends Phaser.GameObjects.Container {
  public slotId?: integer;
  public autoSlot: integer;
  public hasData: boolean;
  public wv: integer;
  public key: string;
  private loadingLabel: Phaser.GameObjects.Text;
  public logIndex: integer;

  constructor(slotId: integer | undefined = undefined, ypos: integer, autoSlot?: integer) {
    super(globalScene, 0, ypos * 56 + (ypos > 4 ? gap : 0));

    this.slotId = slotId!;
    this.autoSlot = autoSlot!;

    this.setup();
  }

  setup() {
    const slotWindow = addWindow(0, 0, 304, 52);
    this.add(slotWindow);

    this.loadingLabel = addTextObject(152, 26, i18next.t("saveSlotSelectUiHandler:loading"), TextStyle.WINDOW);
    this.loadingLabel.setOrigin(0.5, 0.5);
    this.add(this.loadingLabel);
  }

  async setupWithData(data: LoggerTools.DRPD) {
    this.remove(this.loadingLabel, true);
    let lbl = "???";
    lbl = data.title!;
    let matchesFile = 0;
    if (this.slotId != undefined) {
      lbl = `[${this.slotId + 1}] ${lbl}`;
      matchesFile = this.slotId + 1;
    }
    //console.log(data, this.slotId, this.autoSlot, lbl)
    const gameModeLabel = addTextObject(8, 5, lbl, TextStyle.WINDOW);
    this.add(gameModeLabel);

    const timestampLabel = addTextObject(8, 19, data.date, TextStyle.WINDOW);
    this.add(timestampLabel);

    const playTimeLabel = addTextObject(8, 33, data.version + " / Path: " + (data.label || ""), TextStyle.WINDOW);
    this.add(playTimeLabel);

    let wavecount = 0;
    data.waves.forEach((wv, idx) => {
      if (wv) {
        if (wv.id != 0) {
          wavecount++;
        }
      }
    });
    const waveLabel = addTextObject(185, 33, wavecount + " wv" + (wavecount == 1 ? "" : "s"), TextStyle.WINDOW);
    this.add(waveLabel);
    const fileSizeLabel = addTextObject(255, 33, LoggerTools.getSize(JSON.stringify(data)), TextStyle.WINDOW);
    //fileSizeLabel.setAlign("right")
    this.add(fileSizeLabel);

    const pokemonIconsContainer = globalScene.add.container(144, 4);
    if (data.starters && data.starters![0] != null) {
      data.starters.forEach((p: LoggerTools.PokeData, i: integer) => {
        if (p == undefined) {
          return;
        }
        const iconContainer = globalScene.add.container(26 * i, 0);
        iconContainer.setScale(0.75);

        //if (getEnumValues(Species)[p.id] == undefined)
        //return;

        //if (getPokemonSpecies(getEnumValues(Species)[p.id]) == undefined)
        //return;

        if (allSpecies[getEnumValues(SpeciesId).indexOf(p.id)] == undefined) {
          // Do nothing
          //console.log(p.id)
          const icon = globalScene.addPkIcon(getPokemonSpecies(getEnumValues(SpeciesId)[p.id]), 0, 0, 0, 0, 0);
          iconContainer.add(icon);
        } else {
          const icon = globalScene.addPkIcon(getPokemonSpecies(getEnumValues(SpeciesId)[p.id]), 0, 0, 0, 0, 0);
          //const icon = globalScene.addPkIcon(getPokemonSpecies(getEnumValues(Species)[allSpecies[getEnumValues(Species).indexOf(p.id)].speciesId]), 0, 0, 0, 0, 0);
          iconContainer.add(icon);
        }

        const text = addTextObject(32, 20, "", TextStyle.PARTY, { fontSize: "54px", color: "#f8f8f8" });
        text.setShadow(0, 0, undefined);
        text.setStroke("#424242", 14);
        text.setOrigin(1, 0);

        iconContainer.add(text);

        pokemonIconsContainer.add(iconContainer);
      });
    } else if (this.slotId != undefined) {
      const gamedata = LoggerTools.parseSlotData(this.slotId)!;
      //console.log(gamedata)
      gamedata.party.forEach((pk: PokemonData, i: integer) => {
        if (pk == undefined) {
          return;
        }
        const p = LoggerTools.exportPokemonFromData(pk);
        const iconContainer = globalScene.add.container(26 * i, 0);
        iconContainer.setScale(0.75);

        //if (getEnumValues(Species)[p.id] == undefined)
        //return;

        //if (getPokemonSpecies(getEnumValues(Species)[p.id]) == undefined)
        //return;

        const sp = getPokemonSpecies(pk.species);
        if (allSpecies[getEnumValues(SpeciesId).indexOf(p.id)] == undefined) {
          // Do nothing
          const icon = globalScene.addPkIcon(sp, pk.formIndex, 0, 0, 0, 0, undefined, pk.shiny, pk.variant);
          iconContainer.add(icon);
        } else {
          //console.log(p.id, getEnumValues(Species)[p.id])
          const icon = globalScene.addPkIcon(sp, pk.formIndex, 0, 0, 0, 0, undefined, pk.shiny, pk.variant);
          //const icon = globalScene.addPkIcon(getPokemonSpecies(getEnumValues(Species)[allSpecies[getEnumValues(Species).indexOf(p.id)].speciesId]), 0, 0, 0, 0, 0);
          iconContainer.add(icon);
        }

        const text = addTextObject(32, 20, "", TextStyle.PARTY, { fontSize: "54px", color: "#f8f8f8" });
        text.setShadow(0, 0, undefined);
        text.setStroke("#424242", 14);
        text.setOrigin(1, 0);

        iconContainer.add(text);

        pokemonIconsContainer.add(iconContainer);
      });
    } else {
      const timestampLabel = addTextObject(144, 10, "No Starter data", TextStyle.WINDOW);
      this.add(timestampLabel);
    }

    this.add(pokemonIconsContainer);

    //const modifiersModule = await import("../modifier/modifier");

    const modifierIconsContainer = globalScene.add.container(148, 30);
    modifierIconsContainer.setScale(0.5);
    const visibleModifierIndex = 0;

    this.add(modifierIconsContainer);
  }

  load(l?: string, slot?: integer): Promise<boolean> {
    return new Promise<boolean>(resolve => {
      if (l == undefined) {
        this.hasData = false;
        this.loadingLabel.setText("No data for this run");
        resolve(false);
        return;
      }
      this.key = l;
      if (slot) {
        this.slotId = slot;
      }
      this.setupWithData(JSON.parse(localStorage.getItem(l)!));
      resolve(true);
    });
    /*
    return new Promise<boolean>(resolve => {
      globalScene.gameData.getSession(this.slotId, this.autoSlot).then(async sessionData => {
        if (!sessionData) {
          this.hasData = false;
          this.loadingLabel.setText(i18next.t("saveSlotSelectUiHandler:empty"));
          resolve(false);
          return;
        }
        this.hasData = true;
        await this.setupWithData(undefined);
        resolve(true);
      });
    });
    */
  }
}

interface SessionSlot {
  scene: BattleScene;
}
