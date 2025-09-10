//#region 00 Imports
import type { PlayerPokemon, EnemyPokemon, Pokemon } from "./field/pokemon";
import { getNatureDecrease, getNatureIncrease, getNatureName } from "./data/nature";
import type { PokemonHeldItemModifier } from "./modifier/modifier";
import { BypassSpeedChanceModifier, EnemyAttackStatusEffectChanceModifier, overrideHeldItems, overrideModifiers } from "./modifier/modifier";
import type { TitlePhase } from "./phases/title-phase";
import { getStatusEffectCatchRateMultiplier } from "./data/status-effect";
import type { SessionSaveData } from "./system/game-data";
import { loggedInUser } from "./account";
import { Challenges } from "./enums/challenges";
import { biomeLinks, getBiomeName } from "./data/balance/biomes";
import { Nature } from "./enums/nature";
import { StatusEffect } from "./enums/status-effect";
import { getCriticalCaptureChance } from "./data/pokeball";
import { globalScene } from "./global-scene";
import { UiMode } from "#enums/ui-mode";
import { SpeciesId } from "#enums/species-id";
import { GameModes } from "#enums/game-modes";
import { getPokemonSpecies } from "./utils/pokemon-utils";
import { AbilityId } from "#enums/ability-id";
import { decrypt } from "./utils/data";
import { BooleanHolder, isNullOrUndefined, NumberHolder, randSeedInt, rangemap } from "#utils/common";
import { PokemonData } from "#system/pokemon-data";
import { getEnumKeys, getEnumValues } from "#utils/enums";
import { Trainer } from "#field/trainer";
import { OptionSelectItem } from "#ui/abstract-option-select-ui-handler";
import { TrainerData } from "#system/trainer-data";
import { ArenaData } from "#system/arena-data";
import { ChallengeData } from "#system/challenge-data";
import { ModifierData as PersistentModifierData } from "#system/modifier-data";
import { TrainerType } from "#enums/trainer-type";
import { PokemonMove } from "#moves/pokemon-move";
import { MoveCategory } from "#enums/move-category";
import { applyMoveAttrs } from "#moves/apply-attrs";
import { Command } from "#enums/command";
import { MultiHitAttr } from "#types/move-types";
import { MultiHitType } from "#enums/multi-hit-type";
import { getPlayerModifierTypeOptions, ModifierTypeOption, PokemonMultiHitModifierType, regenerateModifierPoolThresholds } from "#modifiers/modifier-type";
import { allAbilities, allSpecies } from "#data/data-lists";
import { MoveId } from "#enums/move-id";
import { ModifierPoolType } from "#enums/modifier-pool-type";
import { getPokemonNameWithAffix } from "./messages";
import { PokemonType } from "#enums/pokemon-type";
import { Gender } from "#data/gender";
import { BattleType } from "#enums/battle-type";
import { TrainerSlot } from "#enums/trainer-slot";
import { BattleSpec } from "#enums/battle-spec";
import { applyAbAttrs } from "#abilities/apply-ab-attrs";
import { Battle } from "./battle";
import { BiomeId } from "#enums/biome-id";
import { getRandomWeatherType } from "#data/weather";
import { WeatherType } from "#enums/weather-type";
import { TimeOfDay } from "#enums/time-of-day";

/*
SECTIONS
00 Imports         import statements, as well as this list.
01 Variables       Contains variables, constants, value holders, and the like.
02 Downloading     Functions for exporting DRPD data to .json files.
03 Log Handler     Catalogs and manages the log array.
04 Utilities       General functions.
05 DRPD            Stores data about a run.
06 Wave            Stores data about a Wave.
07 Pokémon         Stores data about a Pokémon.
08 Nature          Stores data about a Pokémon's Nature.
09 IVs             Stores data about a Pokémon's Individual Values (IVs).
10 Trainer         Stores data about the opposing Trainer, if any.
11 Item            Stores data about held items.
12 Ingame Menu     Functions for the "Manage Logs" menu ingame.
13 Logging Events  Functions for adding data to the logger.
*/

//#endregion


// #region 01 Variables

// constants
/** The number of enemy actions to log. */
export const EnemyEventLogCount = 3;
/** The current DRPD version. */
export const DRPD_Version = "1.1.0b";
/** (Unused / reference only) All the log versions that this mod can keep updated.
 * @see updateLog
*/
export const acceptedVersions = [
  "1.0.0",
  "1.0.0a",
  "1.1.0",
  "1.1.0a",
  "1.1.0b",
];

/** Toggles console messages about catch prediction. */
const catchDebug: boolean = false;
const logDamagePrediction: boolean = false;

// Value holders
/** Holds the encounter rarities for the Pokemon in this wave. */
export const rarities = [];

// Holds the encounter HA rolls for the Pokemon in this wave.
export const haChances: Number[][] = [];

/** Used to store rarity tier between files when calculating and storing a Pokemon's encounter rarity.
 *
 * The second index is (very lazily) used to store a log's name/seed for `setFileInfo`.
 * @see setFileInfo
 */
export const rarityslot = [ 0, "" ];

/** Stores a list of the user's battle actions in a turn.
 *
 * Its contents are printed to the current wave's actions list, separated by pipes `|`, when the turn begins playing out. */
export const Actions: string[] = [];
/** Used for enemy attack prediction. Stored here so that it's universally available. */
export const enemyPlan: string[] = [];

// Booleans
export const SheetsMode = new BooleanHolder(false);
export const isTransferAll: BooleanHolder = new BooleanHolder(false);

export const logCommand: BooleanHolder = new BooleanHolder(true);

// #endregion


//#region 02 Downloading
/**
 * Saves a log to your device.
 * @param i The index of the log you want to save.
 */
export function downloadLogByID(i: number) {
  console.log(i);
  const d = JSON.parse(localStorage.getItem(logs[i][1])!);
  const blob = new Blob([ printDRPD("", "", d as DRPD) ], { type: "text/json" });
  const link = document.createElement("a");
  link.href = window.URL.createObjectURL(blob);
  const date: string = (d as DRPD).date;
  const filename: string = date[5] + date[6] + "_" + date[8] + date[9] + "_" + date[0] + date[1] + date[2] + date[3] + "_" + (d as DRPD).label + ".json";
  link.download = `${filename}`;
  link.click();
  link.remove();
}

/**
 * Saves a log to your device in an alternate format.
 * @param i The index of the log you want to save.
 */
export function downloadLogByIDToCSV(i: number) {
  console.log(i);
  const d = JSON.parse(localStorage.getItem(logs[i][1])!);
  const waves = d["waves"];
  const encounterList: string[] = [];
  encounterList.push(convertPokemonToCSV({ "id": "a", "biome": waves[0].biome, "actions": []}, d.starters[0], false));
  encounterList.push(convertPokemonToCSV({ "id": "b", "biome": waves[0].biome, "actions": []}, d.starters[1], false));
  encounterList.push(convertPokemonToCSV({ "id": "c", "biome": waves[0].biome, "actions": []}, d.starters[2], false));

  for (var i = 1; i < waves.length; i++) {
    const wave = waves[i];
    console.log(wave);
    if (wave != null && wave.trainer == null) {
      const pokemon1 = wave.pokemon[0];
      if (pokemon1 == null) {
        continue;
      }
      encounterList.push(convertPokemonToCSV(wave, pokemon1, false));
      if (wave.double) {
        const pokemon2 = wave.pokemon[1];
        if (pokemon2 == null) {
          continue;
        }
        encounterList.push(convertPokemonToCSV(wave, pokemon2, true));
      }
    } else if (wave != null) {
      encounterList.push(convertTrainerToCSV(wave, wave.trainer));
    }
  }
  const encounters = encounterList.join("\n");
  const blob = new Blob([ encounters ], { type: "text/csv" });
  const link = document.createElement("a");
  link.href = window.URL.createObjectURL(blob);
  const date: string = (d as DRPD).date;
  const filename: string = date[5] + date[6] + "_" + date[8] + date[9] + "_" + date[0] + date[1] + date[2] + date[3] + "_" + (d as DRPD).label + ".csv";
  link.download = `${filename}`;
  link.click();
  link.remove();
}

function convertPokemonToCSV(wave: any, pokemon: any, second: boolean): string {
  return `${wave.id}${second ? "d" : ""},${wave.biome},${pokemon.id > 1025 ? SpeciesId[pokemon.formName] : SpeciesId[pokemon.id + 1]},${pokemon.id + 1},${pokemon.formName},${Object.values(pokemon.iv_raw).join(",")},${pokemon.ability},${pokemon.passiveAbility},${pokemon.nature.name},${pokemon.gender},${pokemon.captured},${second ? "" : wave.actions.join(";")}`;
}

function convertTrainerToCSV(wave: any, trainer: any): string {
  return `${wave.id}t,${wave.biome},${trainer.type},${trainer.name},,,,,,,,,,,,,${wave.actions.join(";")}`;
}

/**
 * Saves a log to your device in an alternate format.
 * @param i The index of the log you want to save.
 */
export function downloadLogByIDToSheet(i: number) {
  console.log(i);
  const d = JSON.parse(localStorage.getItem(logs[i][1])!);
  SheetsMode.value = true;
  const blob = new Blob([ printDRPD("", "", d as DRPD) ], { type: "text/json" });
  SheetsMode.value = false;
  const link = document.createElement("a");
  link.href = window.URL.createObjectURL(blob);
  const date: string = (d as DRPD).date;
  const filename: string = date[5] + date[6] + "_" + date[8] + date[9] + "_" + date[0] + date[1] + date[2] + date[3] + "_" + (d as DRPD).label + "_sheetexport" + ".json";
  link.download = `${filename}`;
  link.click();
  link.remove();
}
//#endregion


// #region 03 Log Handler


// These are general utilities for keeping track of the user's logs.
// For the functions that log the player's actions, see "13. Logging Events"


/**
 * Stores logs.
 * Generate a new list with `getLogs()`.
 *
 * @see getLogs
 */
export const logs: string[][] = [
  [ "drpd.json", "drpd", "DRPD", "", "wide_lens", "" ],
];

/** @deprecated */
export const logKeys: string[] = [
  "i", // Instructions/steps
  "e", // Encounters
  "d", // Debug
];

/**
 * Uses the save's RNG seed to create a log ID. Used to assign each save its own log.
 * @returns The ID of the current save's log.
 */
export function getLogID() {
  return "drpd_log:" + globalScene.seed;
}

/**
 * Gets a log's item list storage, for detecting reloads via a change in the loot rewards.
 *
 * Not used yet.
 * @returns The ID of the current save's log.
 */
export function getItemsID() {
  return "drpd_items:" + globalScene.seed;
}

/**
 * Resets the `logs` array, and creates a list of all game logs in LocalStorage.
 *
 * @see logs
 */
export function getLogs() {
  while (logs.length > 0) {
    logs.pop();
  }
  for (let i = 0; i < localStorage.length; i++) {
    if (localStorage.key(i)!.substring(0, 9) == "drpd_log:") {
      logs.push([ "drpd.json", localStorage.key(i)!, localStorage.key(i)!.substring(9), "", "", "" ]);
      for (let j = 0; j < 5; j++) {
        const D = parseSlotData(j);
        if (D != undefined) {
          if (logs[logs.length - 1][2] == D.seed) {
            logs[logs.length - 1][3] = j.toString();
          }
        }
      }
    }
  }
  /*
  logs.forEach((log, idx) => {
    var dat = JSON.parse(localStorage.getItem(logs[idx][1])) as DRPD;
    logs[idx][4] = dat.version + "-" + dat.date
  })
  logs.sort((a, b) => {
    var data1 = a[4].split("-")
    var data2 = b[4].split("-")
    var S = 0
    // Sort by game version
    if (S == 0) {
      S = acceptedVersions.indexOf(data1[0]) - acceptedVersions.indexOf(b[0])
      if (acceptedVersions.indexOf(data1[0]) == -1) {
        S = -1
        if (acceptedVersions.indexOf(data2[0]) == -1) {
          S = 0
        }
      } else if (acceptedVersions.indexOf(data2[0]) == -1) {
        S = 1
      }
    }
    // Sort by year
    if (S == 0) {
      S = (Number(data1[1]) - Number(data2[1]))
    }
    // Sort by month
    if (S == 0) {
      S = (Number(data1[2]) - Number(data2[2]))
    }
    // Sort by day
    if (S == 0) {
      S = (Number(data1[3]) - Number(data2[3]))
    }
    return S;
  })
  logs.forEach((log, idx) => {
    logs[idx][4] = ""
  })
  */
}

/**
 * Returns a string for the name of the current game mode.
 * @returns The name of the game mode, for use in naming a game log.
 */
export function getMode() {
  if (globalScene.gameMode == undefined) {
    return "???";
  }
  switch (globalScene.gameMode.modeId) {
    case GameModes.CLASSIC:
      return "Classic";
    case GameModes.ENDLESS:
      return "Endless";
    case GameModes.SPLICED_ENDLESS:
      return "Spliced Endless";
    case GameModes.DAILY:
      return "Daily";
    case GameModes.CHALLENGE:
      return "Challenge";
  }
}

// #endregion


// #region 04 Utilities

/**
 * Pulls the current run's DRPD from LocalStorage using the run's RNG seed.
 *
 * When loaded, the file is automatically updated and assigned a seed
 * @returns The DRPD file, or `null` if there is no file for this run.
 */
export function getDRPD(): DRPD {
  if (localStorage.getItem(getLogID()) == null) {
    const D = newDocument(getMode() + " Run");
    D.seed = globalScene.seed;
    localStorage.setItem(getLogID(), JSON.stringify(D));
  }
  let drpd: DRPD = JSON.parse(localStorage.getItem(getLogID())!) as DRPD;
  drpd = updateLog(drpd);
  //globalScene.arenaFlyout.updateFieldText()
  return drpd;
}

export function save(drpd: DRPD) {
  console.log(drpd);
  localStorage.setItem(getLogID(), JSON.stringify(drpd));
}

/**
 * Testing purposes only. Currently unused.
 */
export const RNGState: number[] = [];

/**
 * The waves that autosaves are created at.
 */
export const autoCheckpoints: number[] = [
  1,
  11,
  21,
  31,
  41,
  50
];

/**
 * Used to get the filesize of a string.
 */
export const byteSize = str => new Blob([ str ]).size;

/**
 * Contains names for different file size units.
 *
 * B: 1 byte
 *
 * KB: 1,000 bytes
 *
 * MB: 1,000,000 bytes
 *
 * GB: 1,000,000,000 bytes
 *
 * TB: 1,000,000,000,000 bytes
 */
const filesizes = [ "b", "kb", "mb", "gb", "tb" ];

/**
 * Returns the size of a file, in bytes, KB, MB, GB, or (hopefully not) TB.
 * @param str The data to get the size of.
 * @returns The file size. Every thousand units is moved up to the next unit and rounded to the nearest tenth (i.e. 1,330,000 bytes will return "1.3mb" - 1,330,000b --> 1,330kb --> 1.3mb)
 * @see filesizes
 */
export function getSize(str: string) {
  let d = byteSize(str);
  let unit = 0;
  while (d > 1000 && unit < filesizes.length - 1) {
    d = Math.round(d / 100) / 10;
    unit++;
  }
  return d.toString() + filesizes[unit];
}

/**
 * Formats a Pokemon in the player's party.
 *
 * If multiple Pokemon of the same species exist in the party, it will specify which slot they are in.
 * @param index The slot index.
 * @returns [INDEX] NAME (example: `[1] Walking Wake` is a Walking Wake in the first party slot)
 */
export function playerPokeName(index: number | Pokemon | PlayerPokemon) {
  const species: string[] = [];
  const dupeSpecies: string[] = [];
  for (let i = 0; i < globalScene.getPlayerParty().length; i++) {
    if (!species.includes(globalScene.getPlayerParty()[i].name)) {
      species.push(globalScene.getPlayerParty()[i].name);
    } else if (!dupeSpecies.includes(globalScene.getPlayerParty()[i].name)) {
      dupeSpecies.push(globalScene.getPlayerParty()[i].name);
    }
  }
  if (typeof index === "number") {
    //console.log(globalScene.getParty()[index], species, dupeSpecies)
    if (dupeSpecies.includes(globalScene.getPlayerParty()[index].name)) {
      return globalScene.getPlayerParty()[index].name + " (Slot " + (index  + 1) + ")";
    }
    return globalScene.getPlayerParty()[index].name;
  }
  if (!index.isPlayer()) {
    return "[Not a player Pokemon??]";
  }
  //console.log(index.name, species, dupeSpecies)
  if (dupeSpecies.includes(index.name)) {
    return index.name + " (Slot " + (globalScene.getPlayerParty().indexOf(index as PlayerPokemon) + 1) + ")";
  }
  return index.name;
}

/**
 * Formats a Pokemon in the opposing party.
 *
 * If multiple Pokemon of the same species exist in the party, it will specify which slot they are in.
 * @param index The slot index.
 * @returns [INDEX] NAME (example: `[2] Zigzagoon` is a Zigzagoon in the right slot (for a double battle) or in the second party slot (for a single battle against a Trainer))
 */
export function enemyPokeName(index: number | Pokemon | EnemyPokemon) {
  const species: string[] = [];
  const dupeSpecies: string[] = [];
  for (let i = 0; i < globalScene.getEnemyParty().length; i++) {
    if (!species.includes(globalScene.getEnemyParty()[i].name)) {
      species.push(globalScene.getEnemyParty()[i].name);
    } else if (!dupeSpecies.includes(globalScene.getEnemyParty()[i].name)) {
      dupeSpecies.push(globalScene.getEnemyParty()[i].name);
    }
  }
  if (typeof index === "number") {
    //console.log(globalScene.getEnemyParty()[index], species, dupeSpecies)
    if (dupeSpecies.includes(globalScene.getEnemyParty()[index].name)) {
      return globalScene.getEnemyParty()[index].name + " (Slot " + (index  + 1) + ")";
    }
    return globalScene.getEnemyParty()[index].name;
  }
  if (index.isPlayer()) {
    return "[Not an enemy Pokemon??]";
  }
  //console.log(index.name, species, dupeSpecies)
  if (dupeSpecies.includes(index.name)) {
    return index.name + " (Slot " + (globalScene.getEnemyParty().indexOf(index as EnemyPokemon) + 1) + ")";
  }
  return index.name;
}
// LoggerTools.logActions(globalScene, globalScene.currentBattle.waveIndex, "")

// #endregion


// #region 05 DRPD
/**
 * The Daily Run Pathing Description (DRPD) Specification is a JSON standard for organizing the information about a daily run.
 */
export interface DRPD {
  /** The version of this run. @see DRPD_Version */
  version: string,
  /** The run seed for this day. */
  seed: string,
  /** The display name of this run. Not to be confused with `label`. Entered by the user. */
  title?: string,
  /** The webpage path and internal name of this run. Entered by the user. Not to be confused with `title`, which is only a cosmetic identifier. */
  label: string,
  /** A unique ID for this run. Currently unused, but may be used in the future. */
  uuid: string,
  /** The name(s) of the users that worked on this run. Entered by the user. */
  authors: string[],
  /** The date that this document was created on. Does NOT automatically detect the date of daily runs (It can't) */
  date: string,
  /**
   * A list of all the waves in this Daily Run.
   *
   * A completed Daily Run will have 50 waves.
   *
   * This array automatically sorts by wave number, with blank slots being pushed to the bottom.
   *
   * @see Wave
   */
  waves: Wave[],
  /** The Pokemon that the player started with. Daily runs will have 3. @see PokeData */
  starters?: PokeData[],
  /** The maximum luck value you can have. If your luck value is higher than this, some floors may break. */
  maxluck?: number;
  minSafeLuckFloor?: number[];
}

/**
 * Imports a string as a DRPD.
 * @param drpd The JSON string to import.
 * @returns The imported document.
 */
export function importDocument(drpd: string): DRPD {
  return JSON.parse(drpd) as DRPD;
}

/**
 * Creates a new document in the DRPD format
 * @param name (Optional) The name for the file. Defaults to "Untitled Run".
 * @param authorName (Optional) The author(s) of the file. Defaults to "Write your name here".
 * @returns The fresh DRPD document.
 */
export function newDocument(name: string = "Untitled Run", authorName: string | string[] = "Write your name here"): DRPD {
  const ret: DRPD = {
    version: DRPD_Version,
    seed: "",
    title: name,
    label: "unnamedRoute",
    uuid: "",
    authors: (Array.isArray(authorName) ? authorName : [ authorName ]),
    date: new Date().getUTCFullYear() + "-" + (new Date().getUTCMonth() + 1 < 10 ? "0" : "") + (new Date().getUTCMonth() + 1) + "-" + (new Date().getUTCDate() < 10 ? "0" : "") + new Date().getUTCDate(),
    waves: new Array(50),
    starters: new Array(3),
    //maxluck: 14,
    //minSafeLuckFloor: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
  };
  const RState = Phaser.Math.RND.state();
  ret.uuid = Phaser.Math.RND.uuid();
  Phaser.Math.RND.state(RState);
  return ret;
}

/**
 * Prints a DRPD as a string, for saving it to your device.
 * @param inData The data to add on to.
 * @param indent The indent string (just a bunch of spaces).
 * @param drpd The `DRPD` to export.
 * @returns `inData`, with all the DRPD's data appended to it.
 *
 * @see downloadLogByID
 */
export function printDRPD(inData: string, indent: string, drpd: DRPD): string {
  console.log("Printing for sheet?: " + SheetsMode.value);
  inData += indent + "{";
  inData += "\n" + indent + "  \"version\": \"" + drpd.version + "\"";
  inData += ",\n" + indent + "  \"seed\": \"" + drpd.seed + "\"";
  inData += ",\n" + indent + "  \"title\": \"" + drpd.title + "\"";
  inData += ",\n" + indent + "  \"authors\": [\"" + drpd.authors.join("\", \"") + "\"]";
  inData += ",\n" + indent + "  \"date\": \"" + drpd.date + "\"";
  inData += ",\n" + indent + "  \"label\": \"" + drpd.label + "\"";
  inData += ",\n" + indent + "  \"uuid\": \"" + drpd.uuid + "\"";
  if (drpd.waves) {
    inData += ",\n" + indent + "  \"waves\": [\n";
    var isFirst = true;
    for (var i = 0; i < drpd.waves.length; i++) {
      if (drpd.waves[i] != undefined && drpd.waves[i] != null) {
        if (isFirst) {
          isFirst = false;
        } else {
          inData += ",\n";
        }
        inData = printWave(inData, indent + "    ", drpd.waves[i]);
      }
    }
    inData += "\n" + indent + "  ]\n";
  } else {
    inData += ",\n" + indent + "  \"waves\": []";
  }
  inData += ",\n" + indent + "  \"starters\": [\n";
  var isFirst = true;
  if (drpd.starters) {
    for (var i = 0; i < drpd.starters.length; i++) {
      if (drpd.starters[i] != undefined && drpd.starters[i] != null) {
        if (isFirst) {
          isFirst = false;
        } else {
          inData += ",\n";
        }
        inData = printPoke(inData, indent + "    ", drpd.starters[i]);
      }
    }
  }
  inData += "\n" + indent + "  ]\n" + indent + "}";
  return inData;
}

/**
 * Updates a DRPD, checkings its version and making any necessary changes to it in order to keep it up to date.
 *
 * @param drpd The DRPD document to update. Its version will be read automatically.
 * @see DRPD
 */
function updateLog(drpd: DRPD): DRPD {
  if (drpd.date[2] == "-") {
    const date_month = drpd.date.substring(0, 2);
    const date_day = drpd.date.substring(3, 5);
    const date_year = drpd.date.substring(6, 10);
    console.log(`Corrected date from ${drpd.date} to ${date_year}-${date_month}-${date_day}`);
    drpd.date = `${date_year}-${date_month}-${date_day}`;
  }
  if (drpd.version == "1.0.0") {
    drpd.version = "1.0.0a";
    console.log("Updated to 1.0.0a - changed item IDs to strings");
    for (var i = 0; i < drpd.waves.length; i++) {
      if (drpd.waves[i] != undefined) {
        if (drpd.waves[i].pokemon) {
          for (var j = 0; j < drpd.waves[i].pokemon!.length; j++) {
            for (var k = 0; k < drpd.waves[i].pokemon![j].items.length; k++) {
              drpd.waves[i].pokemon![j].items[k].id = drpd.waves[i].pokemon![j].items[k].id.toString();
            }
          }
        }
      }
    }
    for (var j = 0; j < drpd.starters!.length; j++) {
      for (var k = 0; k < drpd.starters![j].items.length; k++) {
        drpd.starters![j].items[k].id = drpd.starters![j].items[k].id.toString();
      }
    }
  } // 1.0.0 → 1.0.0a
  if (drpd.version == "1.0.0a") {
    drpd.version = "1.1.0";
    const RState = Phaser.Math.RND.state();
    drpd.uuid = Phaser.Math.RND.uuid();
    Phaser.Math.RND.state(RState);
    drpd.label = "route";
  } // 1.0.0a → 1.1.0
  if (drpd.version == "1.1.0") {
    drpd.version = "1.1.0a";
    drpd.maxluck = 14;
    drpd.minSafeLuckFloor = [ 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1 ];
  } // 1.1.0 → 1.1.0a
  if (drpd.version == "1.1.0a") {
    drpd.version = "1.1.0b";
    for (var i = 0; i < drpd.waves.length; i++) {
      if (drpd.waves[i] && drpd.waves[i].pokemon) {
        for (var j = 0; j < drpd.waves[i].pokemon!.length; j++) {
          if (drpd.waves[i].pokemon![j].ivs) {
            drpd.waves[i].pokemon![j].iv_raw = drpd.waves[i].pokemon![j].ivs!;
            drpd.waves[i].pokemon![j].ivs = undefined;
            drpd.waves[i].pokemon![j].iv = formatIVs(drpd.waves[i].pokemon![j].ivs!);
          }
        }
      }
    }
  } // 1.1.0a → 1.1.0b
  return drpd;
}
// #endregion


// #region 06 Wave
/**
 * A Wave is one individual battle in the run.
 * Each group of ten waves has the same biome.
 */
export interface Wave {
  /** The wave number. Used to label the wave, detect and delete duplicates, and automatically sort `DRPD.waves[]`. */
  id: number,
  /** Set to `true` if a reload is required to play this wave properly.Setting this value is the PITA I have ever dealt with. */
  reload: boolean,
  /**
   * The specific type of wave.
   *
   * `wild`: This is a wild encounter.
   *
   * `trainer`: This is a trainer battle.
   *
   * `boss`: This is a boss floor (floors 10, 20, 30, etc). Overrides the two values above.
   */
  type: "wild" | "trainer" | "boss",
  /** Set to `true` if this is a double battle. */
  double: boolean,
  /** The list of actions that the player took during this wave. */
  actions: string[],
  /** The item that the player took in the shop. A blank string (`""`) if there is no shop (wave 10, 20, 30, etc.) or the player fled from battle. */
  shop: string,
  /** The biome that this battle takes place in. */
  biome: string,
  /** If true, the next time an action is logged, all previous actions will be deleted.
   * @see Wave.actions
   * @see logActions
   * @see resetWaveActions
   */
  clearActionsFlag: boolean,
  /** The trainer that you fight in this floor, if any.
   * @see LogTrainerData
   * @see Wave.type
   */
  trainer?: LogTrainerData,
  /** The Pokémon that you have to battle against.
   * Not included if this is a trainer battle.
   * @see PokeData
   * @see Wave.type
   */
  pokemon?: PokeData[],
  /**
   * Contains the first 3 turns or so of the enemy's actions.
   * Used to check for refreshes.
   */
  initialActions: string[],
  /**
   * Contains the names of the first set of modifier rewards.
   * Used to check for refreshes.
   */
  modifiers: string[]
}

/**
 * Exports the current battle as a `Wave`.
 * @returns The wave data.
 */
export function exportWave(): Wave {
  const ret: Wave = {
    id: globalScene.currentBattle.waveIndex,
    reload: false,
    type: globalScene.getEnemyField()[0].hasTrainer() ? "trainer" : globalScene.getEnemyField()[0].isBoss() ? "boss" : "wild",
    double: globalScene.currentBattle.double,
    actions: [],
    shop: "",
    clearActionsFlag: false,
    biome: getBiomeName(globalScene.arena.biomeType),
    initialActions: [],
    modifiers: []
  };
  if (ret.double == undefined) {
    ret.double = false;
  }
  switch (ret.type) {
    case "wild":
    case "boss":
      ret.pokemon = [];
      for (var i = 0; i < globalScene.getEnemyParty().length; i++) {
        ret.pokemon.push(exportPokemon(globalScene.getEnemyParty()[i]));
      }
      break;
    case "trainer":
      ret.trainer = {
        id: globalScene.currentBattle.trainer!.config.trainerType,
        name: globalScene.currentBattle.trainer!.name,
        type: globalScene.currentBattle.trainer!.config.title
      };
      ret.pokemon = [];
      for (var i = 0; i < globalScene.getEnemyParty().length; i++) {
        ret.pokemon.push(exportPokemon(globalScene.getEnemyParty()[i]));
      }
      break;
  }
  return ret;
}

/**
 * Prints a wave as a string, for saving a DRPD to your device.
 * @param inData The data to add on to.
 * @param indent The indent string (just a bunch of spaces).
 * @param wave The `Wave` to export.
 * @returns `inData`, with all the wave's data appended to it.
 *
 * @see printDRPD
 */
function printWave(inData: string, indent: string, wave: Wave): string {
  inData += indent + "{";
  inData += "\n" + indent + "  \"id\": " + wave.id + "";
  inData += ",\n" + indent + "  \"reload\": " + wave.reload + "";
  inData += ",\n" + indent + "  \"type\": \"" + wave.type + "\"";
  inData += ",\n" + indent + "  \"double\": " + wave.double + "";
  var isFirst = true;
  if (wave.actions.length > 0) {
    if (SheetsMode.value) {
      inData += ",\n" + indent + "  \"actions\": \"";
      var isFirst = true;
      for (var i = 0; i < wave.actions.length; i++) {
        if (wave.actions[i] != undefined) {
          if (isFirst) {
            isFirst = false;
          } else {
            inData += "CHAR(10)";
          }
          inData += wave.actions[i];
        }
      }
      inData +=  "\"";
    } else {
      inData += ",\n" + indent + "  \"actions\": [";
      for (var i = 0; i < wave.actions.length; i++) {
        if (wave.actions[i] != undefined) {
          if (isFirst) {
            isFirst = false;
          } else {
            inData += ",";
          }
          inData += "\n    " + indent + "\"" + wave.actions[i] + "\"";
        }
      }
      if (!isFirst) {
        inData += "\n";
      }
      inData += indent + "  ]";
    }
  } else {
    inData += ",\n" + indent + "  \"actions\": [\"[No actions?]\"]";
  }
  inData += ",\n  " + indent + "\"shop\": \"" + wave.shop + "\"";
  inData += ",\n  " + indent + "\"biome\": \"" + wave.biome + "\"";
  if (wave.trainer) {
    inData += ",\n  " + indent + "\"trainer\": ";
    inData = printTrainer(inData, indent + "  ", wave.trainer);
  }
  if (wave.pokemon) {
    if (wave.pokemon.length > 0) {
      inData += ",\n  " + indent + "\"pokemon\": [\n";
      isFirst = true;
      for (var i = 0; i < wave.pokemon.length; i++) {
        if (wave.pokemon[i] != undefined) {
          if (isFirst) {
            isFirst = false;
          } else {
            inData += ",\n";
          }
          inData = printPoke(inData, indent + "    ", wave.pokemon[i]);
        }
      }
      if (SheetsMode.value && wave.pokemon.length == 1) {
        inData += "," + indent + "    \n{" + indent + "    \n}";
      }
      inData += "\n" + indent + "  ]";
    }
  }
  inData += "\n" + indent + "}";
  return inData;
}

/**
 * Retrieves a wave from the DRPD. If the wave doesn't exist, it creates a new one.
 * @param drpd The document to read from.
 * @param floor The wave index to retrieve.
 * @returns The requested `Wave`.
 */
export function getWave(drpd: DRPD, floor: number): Wave {
  let wv: Wave | undefined = undefined;
  let insertPos: number | undefined = undefined;
  console.log(drpd.waves);
  for (var i = 0; i < drpd.waves.length; i++) {
    if (drpd.waves[i] != undefined && drpd.waves[i] != null) {
      if (drpd.waves[i].id == floor) {
        wv = drpd.waves[i];
        console.log("Found wave for floor " + floor + " at index " + i);
        if (wv.pokemon == undefined) {
          wv.pokemon = [];
        }
        return wv;
      }
    } else if (insertPos == undefined) {
      insertPos = i;
    }
  }
  if (wv == undefined && insertPos != undefined) {
    console.log("Created new wave for floor " + floor + " at index " + insertPos);
    drpd.waves[insertPos] = {
      id: floor,
      reload: false,
      //type: floor % 10 == 0 ? "boss" : (floor % 10 == 5 ? "trainer" : "wild"),
      type: floor % 10 == 0 ? "boss" : "wild",
      double: globalScene.currentBattle.double,
      actions: [],
      shop: "",
      clearActionsFlag: false,
      biome: getBiomeName(globalScene.arena.biomeType),
      initialActions: [],
      modifiers: [],
      //pokemon: []
    };
    wv = drpd.waves[insertPos];
  }
  drpd.waves.sort((a, b) => {
    if (a == undefined) {
      return 1;
    }  // empty values move to the bottom
    if (b == undefined) {
      return -1;
    } // empty values move to the bottom
    return a.id - b.id;
  });
  for (var i = 0; i < drpd.waves.length - 1; i++) {
    if (drpd.waves[i] != undefined && drpd.waves[i + 1] != undefined) {
      if (drpd.waves[i].id == drpd.waves[i + 1].id) {
        drpd.waves.splice(i, 1);
        drpd.waves.sort((a, b) => {
          if (a == undefined) {
            return 1;
          }  // empty values move to the bottom
          if (b == undefined) {
            return -1;
          } // empty values move to the bottom
          return a.id - b.id;
        });
      }
    }
  }
  if (wv == undefined) {
    if (globalScene.gameMode.modeId != GameModes.DAILY || true) {
      if (globalScene.gameMode.modeId == GameModes.DAILY) {
        console.log(";-;");
      }
      drpd.waves.push({
        id: floor,
        reload: false,
        //type: floor % 10 == 0 ? "boss" : (floor % 10 == 5 ? "trainer" : "wild"),
        type: floor % 10 == 0 ? "boss" : "wild",
        double: globalScene.currentBattle.double,
        actions: [],
        shop: "",
        biome: getBiomeName(globalScene.arena.biomeType),
        clearActionsFlag: false,
        initialActions: [],
        modifiers: [],
        //pokemon: []
      });
      return drpd.waves[drpd.waves.length - 1];
    }
    /*
    console.error("Out of wave slots??")
    globalScene.ui.showText("Out of wave slots!\nClearing duplicates...", null, () => {
      for (var i = 0; i < drpd.waves.length - 1; i++) {
        if (drpd.waves[i] != undefined && drpd.waves[i+1] != undefined) {
          if (drpd.waves[i].id == drpd.waves[i+1].id) {
            drpd.waves[i+1] = undefined
            drpd.waves.sort((a, b) => {
              if (a == undefined) return 1;  // empty values move to the bottom
              if (b == undefined) return -1; // empty values move to the bottom
              return a.id - b.id
            })
          }
        }
      }
      if (drpd.waves[drpd.waves.length - 1] != undefined) {
        if (globalScene.gameMode.modeId == GameModes.DAILY) {
          globalScene.ui.showText("No space!\nPress F12 for info")
          console.error("There should have been 50 slots, but somehow the program ran out of space.")
          console.error("Go yell at @redstonewolf8557 to fix this")
        } else {
          drpd.waves.push(null)
          console.log("Created new wave for floor " + floor + " at newly inserted index " + insertPos)
          drpd.waves[drpd.waves.length - 1] = {
            id: floor,
            reload: false,
            //type: floor % 10 == 0 ? "boss" : (floor % 10 == 5 ? "trainer" : "wild"),
            type: floor % 10 == 0 ? "boss" : "wild",
            double: globalScene.currentBattle.double,
            actions: [],
            shop: "",
            biome: getBiomeName(globalScene.arena.biomeType),
            clearActionsFlag: false,
            initialActions: [],
            modifiers: [],
            //pokemon: []
          }
          wv = drpd.waves[drpd.waves.length - 1]
        }
      } else {
        for (var i = 0; i < drpd.waves.length; i++) {
          if (drpd.waves[i] != undefined && drpd.waves[i] != null) {
            if (drpd.waves[i].id == floor) {
              wv = drpd.waves[i]
              console.log("Found wave for floor " + floor + " at index " + i)
              if (wv.pokemon == undefined) wv.pokemon = []
            }
          } else if (insertPos == undefined) {
            insertPos = i
          }
        }
        if (wv == undefined && insertPos != undefined) {
          console.log("Created new wave for floor " + floor + " at index " + insertPos)
          drpd.waves[insertPos] = {
            id: floor,
            reload: false,
            //type: floor % 10 == 0 ? "boss" : (floor % 10 == 5 ? "trainer" : "wild"),
            type: floor % 10 == 0 ? "boss" : "wild",
            double: globalScene.currentBattle.double,
            actions: [],
            shop: "",
            clearActionsFlag: false,
            biome: getBiomeName(globalScene.arena.biomeType),
            initialActions: [],
            modifiers: [],
            //pokemon: []
          }
          wv = drpd.waves[insertPos]
        }
        drpd.waves.sort((a, b) => {
          if (a == undefined) return 1;  // empty values move to the bottom
          if (b == undefined) return -1; // empty values move to the bottom
          return a.id - b.id
        })
        if (wv == undefined) {
          globalScene.ui.showText("Failed to make space\nPress F12 for info")
          console.error("There should be space to store a new wave, but the program failed to find space anyways")
          console.error("Go yell at @redstonewolf8557 to fix this")
          return undefined;
        }
      }
    })
    */
  }
  if (wv == undefined) {
    globalScene.ui.showText("Failed to retrieve wave\nPress F12 for info", 10000);
    console.error("Failed to retrieve wave??");
    console.error("this mod i stg");
    console.error("Go yell at @redstonewolf8557 to fix this");
    return {
      id: -1,
      reload: true,
      type: "wild",
      double: false,
      actions: [
        "THIS IS AN ERROR!",
        "TypeScript forced me to specify a value",
        "REPORT THIS TO REDSTONEWOLF"
      ],
      shop: "",
      biome: "",
      clearActionsFlag: false,
      initialActions: [],
      modifiers: []
    };
  }
  return wv;
}
// #endregion


// #region 07 Pokémon
/**
 * Stores information about a Pokémon.
 *
 * This data type is used in `DRPD.starters` to list the player's starting Pokémon, or in `Wave.pokemon` to list the opponent(s) in a wild encounter.
 */
export interface PokeData {
  /** The party position of this Pokémon, as of the beginning of the battle. */
  id: number,
  /** The name of this Pokémon as it would appear in the party list or in battle. */
  name: string,
  /** The Pokémon's primary ability. */
  ability: string,
  /** Set to `true` if this Pokémon's ability is its Hidden Ability.
   * @see PokeData.ability
   */
  isHiddenAbility: boolean,
  /** The Pokémon's passive / secondary ability. */
  passiveAbility: string,
  /** The Pokémon's nature. Influences its stats.
   * @see NatureData
   */
  nature: NatureData,
  /** The Pokémon's gender. */
  gender: "Male" | "Female" | "Genderless",
  /** The Pokémon's encounter rarity within the current biome. */
  rarity: string,
  /** Whether or not the Pokémon was captured. */
  captured: boolean,
  /** The Pokémon's level. */
  level: number,
  /** The Pokémon's Held Items, if any.
   * @see ItemData
   */
  items: ItemData[],
  /** The Pokémon's IVs. Influences its base stats.
   * @see IVData
   */
  iv_raw: IVData,
  /** The Pokémon's IVs, printed as ordered text. */
  iv: string[],
  /** @deprecated */
  ivs?: IVData,
  /** The Pokémon that was used to generate this `PokeData`. Not exported.
   * @see Pokemon
   */
  source?: Pokemon,
  /*
   */
  formName: string
}

/**
 * Exports a Pokemon's data as `PokeData`.
 * @param pokemon The Pokemon to store.
 * @param encounterRarity The rarity tier of the Pokemon for this biome.
 * @returns The Pokemon data.
 */
export function exportPokemon(pokemon: Pokemon, encounterRarity?: string): PokeData {
  return {
    id: getEnumValues(SpeciesId).indexOf(pokemon.species.speciesId),
    name: pokemon.species.getName(),
    ability: pokemon.getAbility().name,
    isHiddenAbility: pokemon.hasAbility(pokemon.species.abilityHidden),
    passiveAbility: pokemon.getPassiveAbility().name,
    nature: exportNature(pokemon.nature),
    gender: pokemon.gender == 0 ? "Male" : (pokemon.gender == 1 ? "Female" : "Genderless"),
    rarity: encounterRarity!,
    captured: false,
    level: pokemon.level,
    items: pokemon.getHeldItems().map((item, idx) => exportItem(item)),
    iv_raw: exportIVs(pokemon.ivs),
    iv: formatIVs(pokemon.ivs),
    formName: pokemon.getSpeciesForm().getSpriteAtlasPath(false, pokemon.formIndex)
  };
}

/**
 * Exports a Pokemon's data as `PokeData`, using `PokemonData` rather than the Pokemon object.
 * @param pokemon The Pokemon to store.
 * @param encounterRarity The rarity tier of the Pokemon for this biome.
 * @returns The Pokemon data.
 */
export function exportPokemonFromData(pokemon: PokemonData, encounterRarity?: string): PokeData {
  const P = getPokemonSpecies(pokemon.species);
  return {
    id: pokemon.species,
    name: P.name,
    ability: getEnumKeys(AbilityId)[P.getAbility(pokemon.abilityIndex)],
    isHiddenAbility: P.getAbility(pokemon.abilityIndex) === P.abilityHidden,
    passiveAbility: "Cannot pull Passive or Held Items from raw file data",
    nature: exportNature(pokemon.nature),
    gender: pokemon.gender == 0 ? "Male" : (pokemon.gender == 1 ? "Female" : "Genderless"),
    rarity: encounterRarity!,
    captured: false,
    level: pokemon.level,
    items: [],
    iv_raw: exportIVs(pokemon.ivs),
    iv: formatIVs(pokemon.ivs),
    formName: "" // pokemon.species.forms[pokemon.formIndex]?.formName // PokemonData doesnt have EnemyPokemon, only species enum
  };
}

/**
 * Prints a Pokemon as a string, for saving a DRPD to your device.
 * @param inData The data to add on to.
 * @param indent The indent string (just a bunch of spaces).
 * @param wave The `PokeData` to export.
 * @returns `inData`, with all the Pokemon's data appended to it.
 *
 * @see printDRPD
 */
function printPoke(inData: string, indent: string, pokemon: PokeData) {
  inData += indent + "{";
  inData += "\n" + indent + "  \"id\": " + pokemon.id;
  inData += ",\n" + indent + "  \"name\": \"" + pokemon.name + "\"";
  inData += ",\n" + indent + "  \"ability\": \"" + pokemon.ability + "\"";
  inData += ",\n" + indent + "  \"isHiddenAbility\": " + pokemon.isHiddenAbility;
  inData += ",\n" + indent + "  \"passiveAbility\": \"" + pokemon.passiveAbility + "\"";
  inData += ",\n" + indent + "  \"nature\": \n";
  inData = printNature(inData, indent + "    ", pokemon.nature);
  inData += ",\n" + indent + "  \"gender\": \"" + pokemon.gender + "\"";
  inData += ",\n" + indent + "  \"rarity\": \"" + pokemon.rarity + "\"";
  inData += ",\n" + indent + "  \"captured\": " + pokemon.captured;
  inData += ",\n" + indent + "  \"level\": " + pokemon.level;
  if (SheetsMode.value) {
    inData += ",\n" + indent + "  \"items\": \"";
    var isFirst = true;
    for (var i = 0; i < pokemon.items.length; i++) {
      if (pokemon.items[i] != undefined) {
        if (isFirst) {
          isFirst = false;
        } else {
          inData += "CHAR(10)";
        }
        inData += printItemNoNewline(inData, "", pokemon.items[i]);
      }
    }
    inData +=  "\"";
  } else {
    if (pokemon.items.length > 0) {
      inData += ",\n" + indent + "  \"items\": [\n";
      var isFirst = true;
      for (var i = 0; i < pokemon.items.length; i++) {
        if (pokemon.items[i] != undefined) {
          if (isFirst) {
            isFirst = false;
          } else {
            inData += ",";
          }
          inData = printItem(inData, indent + "    ", pokemon.items[i]);
        }
      }
      if (!isFirst) {
        inData += "\n";
      }
      inData += indent + "  ]";
    } else {
      inData += ",\n" + indent + "  \"items\": []";
    }
  }
  inData += ",\n" + indent + "  \"ivs\": ";
  inData = printIV(inData, indent + "  ", pokemon.iv_raw);
  //inData += ",\n" + indent + "  \"rarity\": " + pokemon.rarity
  inData += "\n" + indent + "}";
  return inData;
}

/**
 * Calls `logPokemon` once for each opponent or, if it's a trainer battle, logs the trainer's data.
 * @param floor The wave index to write to. Defaults to the current wave.
 */
export function logTeam(floor: number = globalScene.currentBattle.waveIndex) {
  const team = globalScene.getEnemyParty();
  console.log("Log Enemy Team");
  if (team[0]?.hasTrainer()) {
    //var sprite = globalScene.currentBattle.trainer.config.getSpriteKey()
    //var trainerCat = getEnumKeys(TrainerType)[getEnumValues(TrainerType).indexOf(globalScene.currentBattle.trainer.config.trainerType)]
    //setRow("e", floor + ",0," + sprite + ",trainer," + trainerCat + ",,,,,,,,,,,,", floor, 0)
  } else {
    for (let i = 0; i < team.length; i++) {
      logPokemon(floor, i, team[i], rarities[i]);
    }
    if (team.length == 1) {
      //setRow("e", ",,,,,,,,,,,,,,,,", floor, 1)
    }
  }
}
// #endregion


// #region 08 Nature
/**
 * Information about a Pokémon's nature.
 */
export interface NatureData {
  /** The display name of this nature. */
  name: string,
  /** The stat that gets a 10% increase from this nature, if any. */
  increased: "" | "atk" | "def" | "spatk" | "spdef" | "spe",
  /** The stat that gets a 10% decrease from this nature, if any. */
  decreased: "" | "atk" | "def" | "spatk" | "spdef" | "spe"
}

/**
 * Exports a Pokemon's nature as `NatureData`.
 * @param nature The nature to store.
 * @returns The nature data.
 */
export function exportNature(nature: Nature): NatureData {
  return {
    name: getNatureName(nature),
    increased: getNatureIncrease(nature),
    decreased: getNatureDecrease(nature),
  };
}

/**
 * Prints a Nature as a string, for saving a DRPD to your device.
 * @param inData The data to add on to.
 * @param indent The indent string (just a bunch of spaces).
 * @param wave The `NatureData` to export.
 * @returns `inData`, with all the nature data appended to it.
 *
 * @see printDRPD
 */
function printNature(inData: string, indent: string, nature: NatureData) {
  inData += indent + "{";
  inData += "\n" + indent + "  \"name\": \"" + nature.name + "\"";
  inData += ",\n" + indent + "  \"increased\": \"" + nature.increased + "\"";
  inData += ",\n" + indent + "  \"decreased\": \"" + nature.decreased + "\"";
  inData += "\n" + indent + "}";
  return inData;
}
// #endregion


// #region 09 IVs
/**
 * Information about a Pokémon's Individual Values (IVs).
 */
export interface IVData {
  /** Influences a Pokémon's maximum health. */
  hp: number,
  /** Influences a Pokémon's physical strength. */
  atk: number,
  /** Influences a Pokémon's resistance to physical attacks. */
  def: number,
  /** Influences the power of a Pokémon's ranged attacks */
  spatk: number,
  /** Influences a Pokémon's resistance to ranged attacks. */
  spdef: number,
  /** Influences a Pokémon's action speed. */
  speed: number
}

/**
 * Exports a Pokémon's IVs as `IVData`.
 * @param ivs The IV array to store.
 * @returns The IV data.
 */
export function exportIVs(ivs: number[]): IVData {
  return {
    hp: ivs[0],
    atk: ivs[1],
    def: ivs[2],
    spatk: ivs[3],
    spdef: ivs[4],
    speed: ivs[5]
  };
}

export function formatIVs(ivs: number[] | IVData): string[] {
  return [
    `HP: ${Array.isArray(ivs) ? ivs[0] : ivs.hp}`,
    `Attack: ${Array.isArray(ivs) ? ivs[1] : ivs.hp}`,
    `Defense: ${Array.isArray(ivs) ? ivs[2] : ivs.hp}`,
    `Sp. Atk: ${Array.isArray(ivs) ? ivs[3] : ivs.hp}`,
    `Sp. Def: ${Array.isArray(ivs) ? ivs[4] : ivs.hp}`,
    `Speed: ${Array.isArray(ivs) ? ivs[5] : ivs.hp}`,
  ];
}

/**
 * Prints a Pokemon's IV data as a string, for saving a DRPD to your device.
 * @param inData The data to add on to.
 * @param indent The indent string (just a bunch of spaces).
 * @param wave The `IVData` to export.
 * @returns `inData`, with the IV data appended to it.
 *
 * @see printDRPD
 */
function printIV(inData: string, indent: string, iv: IVData) {
  inData += "{";
  inData += "\n" + indent + "  \"hp\": " + iv.hp;
  inData += ",\n" + indent + "  \"atk\": " + iv.atk;
  inData += ",\n" + indent + "  \"def\": " + iv.def;
  inData += ",\n" + indent + "  \"spatk\": " + iv.spatk;
  inData += ",\n" + indent + "  \"spdef\": " + iv.spdef;
  inData += ",\n" + indent + "  \"spe\": " + iv.speed;
  inData += "\n" + indent + "}";
  return inData;
}
// #endregion


// #region 10 Trainer
/**
 * A Trainer that the player has to battle against.
 * A Trainer will have 1-6 Pokémon in their party, depending on their difficulty.
 *
 * If the wave has a Trainer, their party is not logged, and `Wave.pokemon` is left empty.
 */
export interface LogTrainerData {
  /** The trainer type's position in the Trainers enum.
   * @see Trainer
  */
  id: number,
  /** The Trainer's ingame name. */
  name: string,
  /** The Trainer's ingame title. */
  type: string,
}

/**
 * Exports the opposing trainer as `LogTrainerData`.
 * @param trainer The Trainer to store.
 * @returns The Trainer data.
 */
export function exportTrainer(trainer: Trainer): LogTrainerData {
  return {
    id: trainer.config.trainerType,
    name: trainer.getNameOnly(),
    type: TrainerType[trainer.config.trainerType]
  };
}

/**
 * Prints a Trainer as a string, for saving a DRPD to your device.
 * @param inData The data to add on to.
 * @param indent The indent string (just a bunch of spaces).
 * @param wave The `LogTrainerData` to export.
 * @returns `inData`, with all the Trainer's data appended to it.
 *
 * @see printDRPD
 */
function printTrainer(inData: string, indent: string, trainer: LogTrainerData) {
  inData += "{";
  inData += "\n" + indent + "  \"id\": \"" + trainer.id + "\"";
  inData += ",\n" + indent + "  \"name\": \"" + trainer.name + "\"";
  inData += ",\n" + indent + "  \"type\": \"" + trainer.type + "\"";
  inData += "\n" + indent + "}";
  return inData;
}
// #endregion


// #region 11 Item
/** An item held by a Pokémon. Quantities and ownership are recorded at the start of the battle, and do not reflect items being used up or stolen. */
export interface ItemData {
  /** A type:key pair identifying the specific item.
   *
   * Example: `FormChange:TOXIC_PLATE`
   */
  id: string,
  /** The item's ingame name. */
  name: string,
  /** This item's stack size. */
  quantity: number,
}

/**
 * Exports a Held Item as `ItemData`.
 * @param item The item to store.
 * @returns The item data.
 */
export function exportItem(item: PokemonHeldItemModifier): ItemData {
  return {
    id: item.type.identifier,
    name: item.type.name,
    quantity: item.getStackCount()
  };
}

/**
 * Prints an item as a string, for saving a DRPD to your device.
 * @param inData The data to add on to.
 * @param indent The indent string (just a bunch of spaces).
 * @param wave The `ItemData` to export.
 * @returns `inData`, with all the Item's data appended to it.
 *
 * @see printDRPD
 */
function printItem(inData: string, indent: string, item: ItemData) {
  inData += indent + "{";
  inData += "\n" + indent + "  \"id\": \"" + item.id + "\"";
  inData += ",\n" + indent + "  \"name\": \"" + item.name + "\"";
  inData += ",\n" + indent + "  \"quantity\": " + item.quantity;
  inData += "\n" + indent + "}";
  return inData;
}

/**
 * Prints an item as a string, for saving a DRPD to your device.
 * @param inData The data to add on to.
 * @param indent The indent string (just a bunch of spaces).
 * @param wave The `ItemData` to export.
 * @returns `inData`, with all the Item's data appended to it.
 *
 * @see `downloadLogByIDToSheet`
 */
function printItemNoNewline(inData: string, indent: string, item: ItemData) {
  inData = "{\\\"id\\\": \\\"" + item.id + "\\\", \\\"name\\\": \\\"" + item.name + "\\\", \\\"quantity\\\": " + item.quantity + "}";
  return inData;
}
// #endregion


//#region 12 Ingame Menu

/**
 * Sets the name, author, and label for a file.
 * @param title The display name of the file.
 * @param authors The author(s) of the file.
 */
export function setFileInfo(title: string, authors: string[], label: string) {
  console.log("Setting file " + rarityslot[1] + " to " + title + " / [" + authors.join(", ") + "]");
  const fileID = rarityslot[1] as string;
  let drpd = JSON.parse(localStorage.getItem(fileID)!) as DRPD;
  drpd = updateLog(drpd);
  for (var i = 0; i < authors.length; i++) {
    while (authors[i][0] == " ") {
      authors[i] = authors[i].substring(1);
    }
    while (authors[i][authors[i].length - 1] == " ") {
      authors[i] = authors[i].substring(0, authors[i].length - 1);
    }
  }
  for (var i = 0; i < authors.length; i++) {
    if (authors[i] == "") {
      authors.splice(i, 1);
      i--;
    }
  }
  drpd.title = title;
  drpd.authors = authors;
  drpd.label = label;
  localStorage.setItem(fileID, JSON.stringify(drpd));
}

/**
 * Generates a UI option to save a log to your device.
 * @param i The slot number. Corresponds to an index in `logs`.
 * @param saves Your session data. Used to label logs if they match one of your save slots.
 * @returns A UI option.
 */
export function generateOption(i: number, saves: any): OptionSelectItem {
  const filename: string = (JSON.parse(localStorage.getItem(logs[i][1])!) as DRPD).title!;
  const op: OptionSelectItem = {
    label: `Export ${filename} (${getSize(printDRPD("", "", JSON.parse(localStorage.getItem(logs[i][1])!) as DRPD))})`,
    handler: () => {
      downloadLogByID(i);
      return false;
    }
  };
  for (let j = 0; j < saves.length; j++) {
    console.log(saves[j].seed, logs[i][2], saves[j].seed == logs[i][2]);
    if (saves[j].seed == logs[i][2]) {
      op.label = "[Slot " + (saves[j].slot + 1) + "]" + op.label.substring(6);
    }
  }
  if (logs[i][4] != "") {
    op.label = " " + op.label;
    op.item = logs[i][4];
  }
  return op;
}

/**
 * Generates a UI option to save a log to your device.
 * @param i The slot number. Corresponds to an index in `logs`.
 * @param saves Your session data. Used to label logs if they match one of your save slots.
 * @returns A UI option.
 */
export function generateEditOption(i: number, saves: any, phase: TitlePhase): OptionSelectItem {
  const filename: string = (JSON.parse(localStorage.getItem(logs[i][1])!) as DRPD).title || "unlabeled";
  const op: OptionSelectItem = {
    label: `Export ${filename} (${getSize(printDRPD("", "", JSON.parse(localStorage.getItem(logs[i][1])!) as DRPD))})`,
    handler: () => {
      rarityslot[1] = logs[i][1];
      //globalScene.phaseQueue[0].end()
      globalScene.ui.setMode(UiMode.NAME_LOG, {
        autofillfields: [
          (JSON.parse(localStorage.getItem(logs[i][1])!) as DRPD).title,
          (JSON.parse(localStorage.getItem(logs[i][1])!) as DRPD).authors.join(", "),
          (JSON.parse(localStorage.getItem(logs[i][1])!) as DRPD).label,
        ],
        buttonActions: [
          () => {
            console.log("Rename");
            globalScene.ui.playSelect();
            phase.callEnd();
          },
          () => {
            console.log("Export");
            globalScene.ui.playSelect();
            downloadLogByID(i);
            phase.callEnd();
          },
          () => {
            console.log("Export to CSV");
            globalScene.ui.playSelect();
            downloadLogByIDToCSV(i);
            phase.callEnd();
          },
          () => {
            console.log("Export to Sheets");
            globalScene.ui.playSelect();
            downloadLogByIDToSheet(i);
            phase.callEnd();
          },
          () => {
            console.log("Delete");
            globalScene.ui.playSelect();
            localStorage.removeItem(logs[i][1]);
            phase.callEnd();
          }
        ]
      });
      return false;
    }
  };
  for (let j = 0; j < saves.length; j++) {
    //console.log(saves[j].seed, logs[i][2], saves[j].seed == logs[i][2])
    if (saves[j].seed == logs[i][2]) {
      op.label = "[Slot " + (saves[j].slot + 1) + "]" + op.label.substring(6);
    }
  }
  if (logs[i][4] != "") {
    op.label = " " + op.label;
    op.item = logs[i][4];
  }
  return op;
}

/**
 * Generates a UI option to save a log to your device.
 * @param i The slot number. Corresponds to an index in `logs`.
 * @param saves Your session data. Used to label logs if they match one of your save slots.
 * @returns A UI option.
 */
export function generateEditHandler(logId: string, callback: Function) {
  let i;
  for (let j = 0; j < logs.length; j++) {
    if (logs[j][2] == logId) {
      i = j;
    }
  }
  if (i == undefined) {
    return;
  } // Failed to find a log
  return (): boolean => {
    rarityslot[1] = logs[i][1];
    //globalScene.phaseQueue[0].end()
    globalScene.ui.setMode(UiMode.NAME_LOG, {
      autofillfields: [
        (JSON.parse(localStorage.getItem(logs[i][1])!) as DRPD).title,
        (JSON.parse(localStorage.getItem(logs[i][1])!) as DRPD).authors.join(", "),
        (JSON.parse(localStorage.getItem(logs[i][1])!) as DRPD).label,
      ],
      buttonActions: [
        () => {
          console.log("Rename");
          globalScene.ui.playSelect();
          callback();
        },
        () => {
          console.log("Export");
          globalScene.ui.playSelect();
          downloadLogByID(i);
          callback();
        },
        () => {
          console.log("Export to CSV");
          globalScene.ui.playSelect();
          downloadLogByIDToCSV(i);
          callback();
        },
        () => {
          console.log("Export to Sheets");
          globalScene.ui.playSelect();
          downloadLogByIDToSheet(i);
          callback();
        },
        () => {
          console.log("Delete");
          globalScene.ui.playSelect();
          localStorage.removeItem(logs[i][1]);
          callback();
        }
      ]
    });
    return false;
  };
}

/**
 * Generates a UI option to save a log to your device.
 * @param i The slot number. Corresponds to an index in `logs`.
 * @param saves Your session data. Used to label logs if they match one of your save slots.
 * @returns A UI option.
 */
export function generateEditHandlerForLog(i: number, callback: Function) {
  return (): boolean => {
    rarityslot[1] = logs[i][1];
    //globalScene.phaseQueue[0].end()
    globalScene.ui.setMode(UiMode.NAME_LOG, {
      autofillfields: [
        (JSON.parse(localStorage.getItem(logs[i][1])!) as DRPD).title,
        (JSON.parse(localStorage.getItem(logs[i][1])!) as DRPD).authors.join(", "),
        (JSON.parse(localStorage.getItem(logs[i][1])!) as DRPD).label,
      ],
      buttonActions: [
        () => {
          console.log("Rename");
          globalScene.ui.playSelect();
          callback();
        },
        () => {
          console.log("Export");
          globalScene.ui.playSelect();
          downloadLogByID(i);
          callback();
        },
        () => {
          console.log("Export to CSV");
          globalScene.ui.playSelect();
          downloadLogByIDToCSV(i);
          callback();
        },
        () => {
          console.log("Export to Sheets");
          globalScene.ui.playSelect();
          downloadLogByIDToSheet(i);
          callback();
        },
        () => {
          console.log("Delete");
          globalScene.ui.playSelect();
          localStorage.removeItem(logs[i][1]);
          callback();
        }
      ]
    });
    return false;
  };
}

//#endregion


//#region 13 Logging Events

//        * The functions in this section are sorted in alphabetical order.

/**
 * Logs the actions that the player took.
 *
 * This includes attacks you perform, items you transfer during the shop, Poke Balls you throw, running from battl, (or attempting to), and switching (including pre-switches).
 * @param floor The wave index to write to. Defaults to the current floor.
 * @param action The text you want to add to the actions list.
 *
 * @see resetWaveActions
 */
export function logActions(floor: number = globalScene.currentBattle.waveIndex, action: string) {
  const drpd = getDRPD();
  console.log(`Logging an action: "${action}"`);
  const wv: Wave = getWave(drpd, floor);
  if (wv.double == undefined) {
    wv.double = false;
  }
  if (wv.clearActionsFlag) {
    console.log("Triggered clearActionsFlag");
    wv.clearActionsFlag = false;
    wv.actions = [];
  }
  wv.actions.push(action);
  console.log("--> ", drpd);
  localStorage.setItem(getLogID(), JSON.stringify(drpd));
}

/**
 * Logs the actions that the player took, adding text to the most recent action.
 * @param floor The wave index to write to. Defaults to the current floor.
 * @param action The text you want to add to the actions list.
 *
 * @see resetWaveActions
 */
export function appendAction(floor: number = globalScene.currentBattle.waveIndex, action: string) {
  const drpd = getDRPD();
  const wv: Wave = getWave(drpd, floor);
  if (wv.clearActionsFlag) {
    console.log("Triggered clearActionsFlag");
    wv.clearActionsFlag = false;
    wv.actions = [];
  }
  console.log(`Appending to an action: "${wv.actions[wv.actions.length - 1]}" + "${action}"`);
  if (wv.double == undefined) {
    wv.double = false;
  }
  wv.actions[wv.actions.length - 1] = wv.actions[wv.actions.length - 1] + action;
  console.log("--> ", drpd);
  localStorage.setItem(getLogID(), JSON.stringify(drpd));
}

/**
 * Logs the actions that the player took.
 *
 * This includes attacks you perform, items you transfer during the shop, Poke Balls you throw, running from battl, (or attempting to), and switching (including pre-switches).
 * @param floor The wave index to write to.
 * @param action The text you want to add to the actions list.
 *
 * @see resetWaveActions
 */
export function getActionCount(floor: number) {
  const drpd = getDRPD();
  console.log("Checking action count");
  console.log(drpd);
  const wv: Wave = getWave(drpd, floor);
  if (wv.double == undefined) {
    wv.double = false;
  }
  if (wv.clearActionsFlag) {
    console.log("Triggered clearActionsFlag");
    wv.clearActionsFlag = false;
    wv.actions = [];
  }
  return (wv.actions.length);
}

/**
 * Logs that a Pokémon was captured.
 * @param floor The wave index to write to. Defaults to the current floor.
 * @param target The Pokémon that you captured.
 */
export function logCapture(floor: number = globalScene.currentBattle.waveIndex, target: EnemyPokemon) {
  const drpd = getDRPD();
  console.log(`Logging successful capture: ${target.name}`);
  const wv: Wave = getWave(drpd, floor);
  const pkslot = Math.max(0, target.fieldPosition - 1);
  if (wv.id != -1) {
    wv.pokemon![pkslot].captured = true;
    console.log("--> ", drpd);
    localStorage.setItem(getLogID(), JSON.stringify(drpd));
  } else {
    console.error("Error: Failed to log capture");
  }
}

/**
 * Logs the player's current party.
 *
 * Called on Floor 1 to store the starters list.
 */
export function logPlayerTeam() {
  const drpd = getDRPD();
  console.log(`Logging player starters: ${globalScene.getPlayerParty().map(p => p.name).join(", ")}`);
  const P = globalScene.getPlayerParty();
  for (let i = 0; i < P.length; i++) {
    drpd.starters![i] = exportPokemon(P[i]);
  }
  console.log("--> ", drpd);
  localStorage.setItem(getLogID(), JSON.stringify(drpd));
}

/**
 * Checks the minimum luck that will break this floor's shop, and updates the appropriate values.
 */
export function logLuck() {
  //return;
  const drpd = getDRPD();
  if (globalScene.waveShinyMinToBreak > 0) {
    console.log("Logging luck stats");
    drpd.maxluck = Math.min(drpd.maxluck!, globalScene.waveShinyMinToBreak - 1);
    for (let i = globalScene.waveShinyMinToBreak; i <= 14; i++) {
      drpd.minSafeLuckFloor![i] = Math.max(drpd.minSafeLuckFloor![i], globalScene.currentBattle.waveIndex);
    }
    console.log("--> ", drpd);
    localStorage.setItem(getLogID(), JSON.stringify(drpd));
  } else {
    console.log("Skipped logging luck stats: Luck has no effect on this floor");
  }
}

/**
 * Logs a wild Pokémon to a wave's data.
 * @param floor The wave index to write to. Defaults to the current floor.
 * @param slot The slot to write to. In a single battle, 0 = the Pokémon that is out first. In a double battle, 0 = Left and 1 = Right.
 * @param pokemon The `EnemyPokemon` to store the data of. (Automatically converted via `exportPokemon`)
 * @param encounterRarity The rarity tier of this Pokémon. If not specified, it calculates this automatically by searching the current biome's species pool.
 */
export function logPokemon(floor: number = globalScene.currentBattle.waveIndex, slot: number, pokemon: EnemyPokemon, encounterRarity?: string) {
  const drpd = getDRPD();
  console.log(`Logging opposing team member: ${pokemon.name}`);
  const wv: Wave = getWave(drpd, floor);
  const pk: PokeData = exportPokemon(pokemon, encounterRarity);
  pk.source = pokemon;
  if (wv.pokemon == undefined) {
    wv.pokemon = [];
  }
  if (wv.pokemon[slot] != undefined) {
    if (JSON.stringify(wv.pokemon[slot]) != JSON.stringify(pk)) {
      console.log("A different Pokemon already exists in this slot! Flagging as a reload");
      wv.reload = true;
    }
  }
  if (pk.rarity == undefined) {
    pk.rarity = "[Unknown]";
  }
  if (globalScene.currentBattle.enemyParty.length == 1 && wv.pokemon.length >= 2) {
    wv.pokemon = [];
  }
  wv.pokemon[slot] = pk;
  wv.double = globalScene.currentBattle.double;
  //while (wv.actions.length > 0)
  //wv.actions.pop()
  //wv.actions = []
  wv.clearActionsFlag = false;
  wv.shop = "";
  drpd.seed = globalScene.seed;
  console.log("--> ", drpd);
  localStorage.setItem(getLogID(), JSON.stringify(drpd));
}

/**
 * Logs what the player took from the rewards pool and, if applicable, who they used it on.
 * @param floor The wave index to write to. Defaults to the current floor.
 * @param action The shop action. Left blank if there was no shop this floor or if you ran away. Logged as "Skip taking items" if you didn't take anything for some reason.
 */
export function logShop(floor: number = globalScene.currentBattle.waveIndex, action: string) {
  const drpd = getDRPD();
  console.log(`Logging shop result: "${action}"`);
  const wv: Wave = getWave(drpd, floor);
  wv.shop = action;
  console.log("--> ", drpd);
  localStorage.setItem(getLogID(), JSON.stringify(drpd));
  if (action != "") {
    logActions(floor, `Shop: ${action}`);
  }
}

/**
 * Logs the current floor's Trainer.
 * @param floor The wave index to write to. Defaults to the current floor.
 */
export function logTrainer(floor: number = globalScene.currentBattle.waveIndex) {
  const drpd: DRPD = getDRPD();
  console.log(`Logging trainer: ${globalScene.currentBattle.trainer!.getTitleOnly()} ${globalScene.currentBattle.trainer!.getNameOnly()}`);
  const wv: Wave = getWave(drpd, floor);
  const t: LogTrainerData = exportTrainer(globalScene.currentBattle.trainer!);
  wv.trainer = t;
  wv.type = "trainer";
  console.log("--> ", drpd);
  localStorage.setItem(getLogID(), JSON.stringify(drpd));
}

/**
 * Flags a wave as a reset.
 * @param floor The wave index to write to.
 */
export function flagReset(floor: number = globalScene.currentBattle.waveIndex) {
  const drpd = getDRPD();
  console.log("Flag Reset", drpd);
  const wv = getWave(drpd, floor);
  wv.reload = true;
  console.log("--> ", drpd);
  localStorage.setItem(getLogID(), JSON.stringify(drpd));
}

/**
 * Flags a wave as a reset, unless this is your first time playing the wave.
 * @param floor The wave index to write to. Defaults to the current floor.
 */
export function flagResetIfExists(floor: number = globalScene.currentBattle.waveIndex) {
  const drpd = getDRPD();
  let waveExists = false;
  for (let i = 0; i < drpd.waves.length; i++) {
    if (drpd.waves[i] != undefined) {
      if (drpd.waves[i].id == floor) {
        waveExists = true;
      }
    }
  }
  if (!waveExists) {
    console.log("Skipped wave reset because this is not a reload", drpd);
    return;
  }
  console.log("Flag reset as wave was already played before", drpd);
  const wv = getWave(drpd, floor);
  wv.reload = true;
  console.log("--> ", drpd);
  localStorage.setItem(getLogID(), JSON.stringify(drpd));
}

/**
 * Clears the action list for a wave.
 * @param floor The wave index to write to. Defaults to the current floor.
 * @param softflag Rather than deleting everything right away, the actions will be cleared the next time we attempt to log an action.
 *
 * @see logActions
 */
export function resetWaveActions(floor: number = globalScene.currentBattle.waveIndex, softflag: boolean) {
  const drpd = getDRPD();
  console.log("Clear Actions", drpd);
  const wv: Wave = getWave(drpd, floor);
  if (softflag) {
    wv.clearActionsFlag = true;
  } else {
    wv.actions = [];
  }
  console.log("--> ", drpd);
  localStorage.setItem(getLogID(), JSON.stringify(drpd));
}
//#endregion


// #region 14 Utils from Phases.ts
export const tierNames = [
  "Poké",
  "Great",
  "Ultra",
  "Rogue",
  "Master"
];

function generateBallChance(pk: EnemyPokemon, pokeballMultiplier: number) {
  const _3m = 3 * pk.getMaxHp();
  const _2h = 2 * pk.hp;
  const catchRate = pk.species.catchRate;
  const statusMultiplier = pk.status ? getStatusEffectCatchRateMultiplier(pk.status.effect) : 1;
  return Math.round(65536 / Math.pow((255 / Math.round((((_3m - _2h) * catchRate * pokeballMultiplier) / _3m) * statusMultiplier)), 0.1875));
}

function generateCritChance(pk: EnemyPokemon, pokeballMultiplier: number) {
  const _3m = 3 * pk.getMaxHp();
  const _2h = 2 * pk.hp;
  const catchRate = pk.species.catchRate;
  const statusMultiplier = pk.status ? getStatusEffectCatchRateMultiplier(pk.status.effect) : 1;
  return getCriticalCaptureChance(Math.round((((_3m - _2h) * catchRate * pokeballMultiplier) / _3m) * statusMultiplier));
}

function catchCalc(pokemon: EnemyPokemon) {
  const rates = [
    [ generateBallChance(pokemon, 1), 0, generateCritChance(pokemon, 1), 0 ],
    [ generateBallChance(pokemon, 1.5), 0, generateCritChance(pokemon, 1.5), 1 ],
    [ generateBallChance(pokemon, 2), 0, generateCritChance(pokemon, 2), 2 ],
    [ generateBallChance(pokemon, 3), 0, generateCritChance(pokemon, 3), 3 ]
  ];
  for (let i = 0; i < rates.length; i++) {
    rates[i][1] = (rates[i][0] / 65536) ** 3;
  }
  return rates;
}

/**
 * Finds the best Poké Ball to catch a Pokemon with, and the % chance of capturing it.
 * @param pokemon The Pokémon to get the catch rate for.
 * @param override Show the best Poké Ball to use, even if you don't have any.
 * @returns The name and % rate of the best Poké Ball.
 */
export function findBest(pokemon: EnemyPokemon, override?: boolean) {
  const rates = catchCalc(pokemon);
  const rolls = [];
  const critCap = [];
  let offset = 0;

  globalScene.getModifiers(BypassSpeedChanceModifier, true).forEach(m => {
    //console.log(m, m.getPokemon(globalScene), pokemon)
    const p = m.getPokemon();
    globalScene.getField().forEach((p2, idx) => {
      if (p == p2) {
        if (catchDebug) {
          console.log(m.getPokemon()?.name + " (Position: " + (idx + 1) + ") has a Quick Claw");
        }
        offset++;
      }
    });
  });

  globalScene.currentBattle.multiInt(critCap, offset + 1, 256, undefined, "Critical Capture Check");
  offset++;
  globalScene.currentBattle.multiInt(rolls, offset + 3, 65536, undefined, "Catch prediction");

  //console.log(rolls)
  //console.log(rolls.slice(offset, offset + 3))

  if (globalScene.pokeballCounts[0] == 0 && !override) {
    rates[0][0] = 0;
  }
  if (globalScene.pokeballCounts[1] == 0 && !override) {
    rates[1][0] = 0;
  }
  if (globalScene.pokeballCounts[2] == 0 && !override) {
    rates[2][0] = 0;
  }
  if (globalScene.pokeballCounts[3] == 0 && !override) {
    rates[3][0] = 0;
  }

  if (catchDebug) {
    console.log("Rate data [raw rate, % odds of success, crit rate, idx]");
  }

  if (catchDebug) {
    for (let i = 0; i < rates.length; i++) {
      console.log(rates[i]);
    }
  }

  if (catchDebug) {
    console.log("Note: if middle number is less than " + critCap[0] + ", a critical capture should occur");
  }

  rates.sort(function(a, b) {
    return b[0] - a[0];
  });

  const ballNames = [
    "Poké Ball",
    "Great Ball",
    "Ultra Ball",
    "Rogue Ball",
    "Master Ball"
  ];

  let func_output = "";
  rates.forEach((v, i) => {
    if (catchDebug) {
      console.log("Ball: " + ballNames[v[3]], v);
    }

    const rawRate = v[0];
    const catchRate = v[1];
    const critRate = v[2];
    if (globalScene.pokeballCounts[v[3]] == 0 && !override) {
      if (catchDebug) {
        console.log("  Skipped because the player doesn't have any of this ball");
      }

      return; // Don't list success for Poke Balls we don't have
    }

    //console.log(ballNames[i])
    //console.log(v, rolls[offset + 0], v > rolls[offset + 0])
    //console.log(v, rolls[offset + 1], v > rolls[offset + 1])
    //console.log(v, rolls[offset + 2], v > rolls[offset + 2])

    if (catchDebug) {
      console.log(`  Critical capture requirement: (${critCap[0]} < ${critRate})`);
    }

    if (rawRate > rolls[offset + 0]) {
      if (catchDebug) {
        console.log(`  Passed roll 1 (${rolls[offset + 0]} < ${rawRate})`);
      }

      //console.log("1 roll")
      if (critCap[0] < critRate) {
        func_output = ballNames[v[3]] + " crits";
        if (catchDebug) {
          console.log(`  Critical capture triggered (${critCap[0]} < ${critRate}) - ended early`);
        }
      } else if (rawRate > rolls[offset + 1]) {
        //console.log("2 roll")
        if (catchDebug) {
          console.log(`  Passed roll 2 (${rolls[offset + 1]} < ${rawRate} )`);
        }

        if (rawRate > rolls[offset + 2]) {
          //console.log("Caught!")
          if (catchDebug) {
            console.log(`  Passed roll 3 (${rolls[offset + 2]} < ${rawRate} ) - capture successful`);
          }
          func_output = ballNames[v[3]] + " catches";
        } else {
          if (catchDebug) {
            console.log(`  Failed roll 3 (checked for ${rolls[offset + 2]} < ${rawRate})`);
          }
        }
      } else {
        if (catchDebug) {
          console.log(`  Failed roll 2 (checked for ${rolls[offset + 1]} < ${rawRate})`);
        }
      }
    } else {
      if (catchDebug) {
        console.log(`  Failed roll 1 (checked for ${rolls[offset + 0]} < ${rawRate})`);
      }
    }
  });
  if (func_output != "") {
    return func_output;
  }
  return "---";
}

export function parseSlotData(slotId: number): SessionSaveData | undefined {
  const S = localStorage.getItem(`sessionData${slotId ? slotId : ""}_${loggedInUser?.username}`);
  if (S == null) {
    // No data in this slot
    return undefined;
  }
  const dataStr = decrypt(S, true);
  const Save = JSON.parse(dataStr, (k: string, v: any) => {
    /*const versions = [ globalScene.game.config.gameVersion, sessionData.gameVersion || '0.0.0' ];

    if (versions[0] !== versions[1]) {
      const [ versionNumbers, oldVersionNumbers ] = versions.map(ver => ver.split('.').map(v => parseInt(v)));
    }*/

    if (k === "party" || k === "enemyParty") {
      const ret: PokemonData[] = [];
      if (v === null) {
        v = [];
      }
      for (const pd of v) {
        ret.push(new PokemonData(pd));
      }
      return ret;
    }

    if (k === "trainer") {
      return v ? new TrainerData(v) : null;
    }

    if (k === "modifiers" || k === "enemyModifiers") {
      const player = k === "modifiers";
      const ret: PersistentModifierData[] = [];
      if (v === null) {
        v = [];
      }
      for (const md of v) {
        if (md?.className === "ExpBalanceModifier") { // Temporarily limit EXP Balance until it gets reworked
          md.stackCount = Math.min(md.stackCount, 4);
        }
        if (md instanceof EnemyAttackStatusEffectChanceModifier && md.effect === StatusEffect.FREEZE || md.effect === StatusEffect.SLEEP) {
          continue;
        }
        ret.push(new PersistentModifierData(md, player));
      }
      return ret;
    }

    if (k === "arena") {
      return new ArenaData(v);
    }

    if (k === "challenges") {
      const ret: ChallengeData[] = [];
      if (v === null) {
        v = [];
      }
      for (const c of v) {
        ret.push(new ChallengeData(c));
      }
      return ret;
    }

    return v;
  }) as SessionSaveData;
  Save.slot = slotId;
  Save.description = (slotId + 1) + " - ";
  const challengeParts: ChallengeData[] | undefined[] = new Array(5);
  const nameParts: string[] | undefined[] = new Array(5);
  if (Save.challenges != undefined) {
    for (var i = 0; i < Save.challenges.length; i++) {
      switch (Save.challenges[i].id) {
        case Challenges.SINGLE_TYPE:
          challengeParts[0] = Save.challenges[i];
          nameParts[1] = Save.challenges[i].toChallenge().getValue();
          nameParts[1] = nameParts[1][0].toUpperCase() + nameParts[1].substring(1);
          if (nameParts[1] == "unknown") {
            nameParts[1] = undefined;
            challengeParts[1] = undefined;
          }
          break;
        case Challenges.SINGLE_GENERATION:
          challengeParts[1] = Save.challenges[i];
          nameParts[0] = "Gen " + Save.challenges[i].value;
          if (nameParts[0] == "Gen 0") {
            nameParts[0] = undefined;
            challengeParts[0] = undefined;
          }
          break;
        case Challenges.LOWER_MAX_STARTER_COST:
          challengeParts[2] = Save.challenges[i];
          nameParts[3] = (10 - challengeParts[0]!.value) + "cost";
          break;
        case Challenges.LOWER_STARTER_POINTS:
          challengeParts[3] = Save.challenges[i];
          nameParts[4] = (10 - challengeParts[0]!.value) + "pt";
          break;
        case Challenges.FRESH_START:
          challengeParts[4] = Save.challenges[i];
          nameParts[2] = "FS";
          break;
      }
    }
  }
  for (var i = 0; i < challengeParts.length; i++) {
    if (challengeParts[i] == undefined || challengeParts[i] == null) {
      challengeParts.splice(i, 1);
      i--;
    }
  }
  for (var i = 0; i < nameParts.length; i++) {
    if (nameParts[i] == undefined || nameParts[i] == null || nameParts[i] == "") {
      nameParts.splice(i, 1);
      i--;
    }
  }
  if (challengeParts.length == 1 && false) {
    switch (challengeParts[0]!.id) {
      case Challenges.SINGLE_TYPE:
        Save.description += "Mono " + challengeParts[0]!.toChallenge().getValue();
        break;
      case Challenges.SINGLE_GENERATION:
        Save.description += "Gen " + challengeParts[0]!.value;
        break;
      case Challenges.LOWER_MAX_STARTER_COST:
        Save.description += "Max cost " + (10 - challengeParts[0]!.value);
        break;
      case Challenges.LOWER_STARTER_POINTS:
        Save.description += (10 - challengeParts[0]!.value) + "-point";
        break;
      case Challenges.FRESH_START:
        Save.description += "Fresh Start";
        break;
    }
  } else if (challengeParts.length == 0) {
    switch (Save.gameMode) {
      case GameModes.CLASSIC:
        Save.description += "Classic";
        break;
      case GameModes.ENDLESS:
        Save.description += "Endless";
        break;
      case GameModes.SPLICED_ENDLESS:
        Save.description += "Endless+";
        break;
      case GameModes.DAILY:
        Save.description += "Daily";
        break;
    }
  } else {
    Save.description += nameParts.join(" ");
  }
  Save.description += " (" + getBiomeName(Save.arena.biome) + " " + Save.waveIndex + ")";
  return Save;
}

/**
 * PathingTool function
 * Calculates the damage ranges that are possible if this move would be selected.
 */
export function predictDamage(user: Pokemon, target: Pokemon, move: PokemonMove, willTera: boolean, damageDisplay?: string) {
  const moveObj = move.getMove();
  if (moveObj.category == MoveCategory.STATUS) {
    return ""; // Don't give a damage estimate for status moves
  }

  if (target.getMoveEffectiveness(user, moveObj, false, true) == undefined) {
    return ""; // Target is immune
  }

  if (logDamagePrediction) {
    console.log(`HP left: ${target.hp}`);
  }

  let dmgRange = 0.85;
  const fixedDamage = new NumberHolder(0);
  applyMoveAttrs("FixedDamageAttr", user, target, moveObj, fixedDamage);
  if (fixedDamage.value > 0) {
    dmgRange = 1;
  }

  const isGuaranteedCrit = target.isGuaranteedCrit(user, moveObj, true);
  const isTera = user.isTerastallized;
  user.isTerastallized = isTera ? isTera : willTera; // If not yet terastallized, check if command wants to terastallize
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

  if (logDamagePrediction) {
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

  if (logDamagePrediction) {
    console.log(`MinHits: ${minHits} | MaxHits: ${maxHits}`);
  }

  // Actual damage dealt
  let dmgLowF = Math.floor(dmgLow);
  let dmgHighF = Math.floor(dmgHigh);

  if (logDamagePrediction) {
    console.log(`HP min: ${dmgLowF} | HP max: ${dmgHighF}`);
  }

  let maxEHP = target.getMaxHp();

  let koText = "";
  if (dmgLowF >= target.hp) {
    koText = " KO";
  } else if (dmgHighF >= target.hp) {
    var percentChance = rangemap(target.hp, dmgLow, dmgHigh);
    koText = " " + Math.floor(percentChance * 100) + "% KO";
  }

  // Calculate boss shield segments cleared
  let qSuffix = "";
  if (target.isBoss()) {
    const segmentRequirements = (target as EnemyPokemon).calculateBossShieldRequirements();
    if (logDamagePrediction) {
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

    if (logDamagePrediction) {
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
    if (logDamagePrediction) {
      console.log(`Boss damage min: ${dmgLow} | Boss damage max: ${dmgHigh}`);
    }
  }

  // %HP removed
  const dmgLowP = Math.round((dmgLowF) / maxEHP * 100);
  const dmgHighP = Math.round((dmgHighF) / maxEHP * 100);

  if (logDamagePrediction) {
    console.log(`HP% min: ${dmgLowP} | HP% max: ${dmgHighP}`);
  }

  if (logDamagePrediction) {
    console.log(`Enemy HP: ${target.hp} | Enemy HP%: ${target.getHpRatio() * 100}`);
  }
  if (logDamagePrediction) {
    console.log(`Max EHP: ${maxEHP}`);
  }
  if (logDamagePrediction && !isNullOrUndefined(koText)) {
    console.log(`KO%: ${koText}`);
  }

  if (!damageDisplay) {
    damageDisplay = globalScene.damageDisplay;
  }

  if (damageDisplay === "Percent") {
    return (dmgLowP == dmgHighP ? dmgLowP + "%" + qSuffix : dmgLowP + "%-" + dmgHighP + "%" + qSuffix) + koText;
  }
  if (damageDisplay === "Value") {
    return (dmgLowF == dmgHighF ? dmgLowF + qSuffix : dmgLowF + "-" + dmgHighF + qSuffix) + koText;
  }
  return "";
}
// #endregion

// #region 15 Scouting
export function InitScouting(charms: number) {
  globalScene.sessionSlotId = 0;
  globalScene.gameData.loadSession(globalScene.sessionSlotId).then(() => {
    ScoutingWithoutUI(charms);
  }).catch(err => {
    console.error(err);
    globalScene.ui.showText("something went wrong, see console error", null);
  });
}

let encounterList: string[] = [];
function ScoutingWithoutUI(charms: number) {
  const startingBiome = globalScene.arena.biomeType;

  const starters: string[] = [];
  const party = globalScene.getPlayerParty();
  party.forEach(p => {
    starters.push(`Pokemon: ${getPokemonNameWithAffix(p)} ` +
      `Form: ${p.getSpeciesForm().getSpriteAtlasPath(false, p.formIndex)} Species ID: ${p.species.speciesId} Stats: ${p.stats} IVs: ${p.ivs} Ability: ${p.getAbility().name} ` +
      `Passive Ability: ${p.getPassiveAbility().name} Nature: ${Nature[p.nature]} Gender: ${Gender[p.gender]} Rarity: undefined AbilityIndex: ${p.abilityIndex} ` +
      `ID: ${p.id} Type: ${p.getTypes().map(t => PokemonType[t]).join(",")} Moves: ${p.getMoveset().map(m => MoveId[m?.moveId ?? 0]).join(",")}`);
  });

  ClearParty(party);
  FillParty(party, [ SpeciesId.VENUSAUR ], 20);

  var output: string[][] = [];
  output.push([ "startstarters" ]);
  output.push(starters);
  output.push([ "endstarters" ]);
  localStorage.setItem("scouting", JSON.stringify(output));

  // Remove any lures or charms
  globalScene.RemoveModifiers();

  // Add 0 to 4 charms
  if (charms > 0) {
    globalScene.InsertAbilityCharm(charms);
  }

  // Keep track of encounters, Generate Biomes and encounters
  console.log(`Starting 0 lures and ${charms} charms ${new Date().toLocaleString()}`);
  encounterList = [];
  GenerateBiomes(startingBiome, 0);
  StoreEncounters(`0${charms}`);

  console.log(`Starting 1 lures and ${charms} charms ${new Date().toLocaleString()}`);
  encounterList = [];
  globalScene.InsertLure();
  GenerateBiomes(startingBiome, 0);
  StoreEncounters(`1${charms}`);

  console.log(`Starting 2 lures and ${charms} charms ${new Date().toLocaleString()}`);
  encounterList = [];
  globalScene.InsertSuperLure();
  GenerateBiomes(startingBiome, 0);
  StoreEncounters(`2${charms}`);

  // Only generate wave 10 for 3 lures.
  console.log(`Starting 3 lures and ${charms} charms ${new Date().toLocaleString()}`);
  encounterList = [];
  globalScene.InsertMaxLure();
  globalScene.newArena(startingBiome);
  globalScene.currentBattle.waveIndex = 9;
  globalScene.arena.updatePoolsForTimeOfDay();
  GenerateBattle();
  StoreEncounters(`3${charms}`);

  var output = JSON.parse(localStorage.getItem("scouting")!) as string[][];
  console.log("All scouting data:", output);
  output = [];
  globalScene.ui.showText("DONE! Copy the data from the console and then you can refresh this page.", null);
}

function StoreEncounters(lurecharm: string) {
  let output = JSON.parse(localStorage.getItem("scouting")!) as string[][];
  output.push([ `start${lurecharm}` ]);
  output.push(encounterList);
  output.push([ `end${lurecharm}` ]);
  localStorage.setItem("scouting", JSON.stringify(output));
  output = [];
}

function GenerateBattle(nolog: boolean = false) {
  console.log(`%%%%%  Wave: ${globalScene.currentBattle.waveIndex + 1}  %%%%%`);
  const timeOfDay = globalScene.arena.getTimeOfDay();
  const battle = globalScene.newBattle() as Battle;
  while (rarities.length > 0) {
    rarities.pop();
  }
  rarityslot[0] = 0;
  while (haChances.length > 0) {
    haChances.pop();
  }

  if (!nolog && battle?.trainer != null) {
    encounterList.push(`Wave: ${globalScene.currentBattle.waveIndex} Biome: ${BiomeId[globalScene.arena.biomeType]} Trainer: ${battle.trainer.config.name}`);
  }

  battle.enemyLevels?.forEach((level, e) => {
    if (battle.battleType === BattleType.TRAINER) {
      battle.enemyParty[e] = battle.trainer?.genPartyMember(e)!;
    } else {
      rarityslot[0] = e;
      const enemySpecies = globalScene.randomSpecies(battle.waveIndex, level, true);
      battle.enemyParty[e] = globalScene.addEnemyPokemon(enemySpecies, level, TrainerSlot.NONE, !!globalScene.getEncounterBossSegments(battle.waveIndex, level, enemySpecies));
      if (globalScene.currentBattle.battleSpec === BattleSpec.FINAL_BOSS) {
        battle.enemyParty[e].ivs = new Array(6).fill(31);
      }
      globalScene.getPlayerParty().slice(0, !battle.double ? 1 : 2).reverse().forEach(playerPokemon => {
        applyAbAttrs("SyncEncounterNatureAbAttr", { pokemon: playerPokemon, target: battle.enemyParty[e], passive: undefined });
      });
    }      

    if (!nolog) {
      const enemy = battle.enemyParty[e];
      let atlaspath = enemy.getSpeciesForm().getSpriteAtlasPath(false, enemy.formIndex);
      // Regional pokemon have the same name, instead get their atlas path.
      if (enemy.species.speciesId > 1025) {
        // Using nicknames here because i want the getPokemonNameWithAffix so i have Wild/Foe information
        // Nicknames are stored in base 64? so convert btoa here
        enemy.nickname = btoa(SpeciesId[enemy.species.speciesId]);
      }

      // Male/Female sprites for Frillish, Jellicent, Pyroar, Meowstic, Indeedee, Basculegion, Oinkologne...
      if (["592","593","668","678","876","902","916"].includes(atlaspath)) {
        atlaspath += `-${Gender[enemy.gender].toLowerCase()}`;
      }

      // Store encounters in a list, basically CSV (uses regex in sheets), but readable as well
      const text = `Wave: ${globalScene.currentBattle.waveIndex} Biome: ${BiomeId[globalScene.arena.biomeType]} Pokemon: ${getPokemonNameWithAffix(enemy)} ` +
      `Form: ${atlaspath} Species ID: ${enemy.species.speciesId} Stats: ${enemy.stats} IVs: ${enemy.ivs} Ability: ${enemy.getAbility().name} ` +
      `Passive Ability: ${enemy.getPassiveAbility().name} Nature: ${Nature[enemy.nature]} Gender: ${Gender[enemy.gender]} Rarity: ${rarities[e]} AbilityIndex: ${enemy.abilityIndex} ` +
      `ID: ${enemy.id} Type: ${enemy.getTypes().map(t => PokemonType[t]).join(",")} Moves: ${enemy.getMoveset().map(m => MoveId[m?.moveId ?? 0]).join(",")} HARolls: ${haChances[e].join(",")} ` +
      `Hidden Ability: ${allAbilities[enemy.getSpeciesForm().abilityHidden].name}`;
      encounterList.push(text);
      console.log(text);
      if (battle.waveIndex == 50) {
        // separate print so its easier to find for discord pin
        console.log(enemy.getMoveset().map(m => MoveId[m?.moveId ?? 0]));
      }
    }
  });
  
  if (!nolog && globalScene.currentBattle.waveIndex % 10 === 1) {
    regenerateModifierPoolThresholds(
      globalScene.getEnemyField(),
      battle.battleType === BattleType.TRAINER ? ModifierPoolType.TRAINER : ModifierPoolType.WILD,
    );
    globalScene.generateEnemyModifiers();
    overrideModifiers(false);

    for (const enemy of globalScene.getEnemyField()) {
      overrideHeldItems(enemy, false);
    }

    const weather = getRandomWeatherType(globalScene.arena);
    encounterList.push(`Wave: ${globalScene.currentBattle.waveIndex} Biome: ${BiomeId[globalScene.arena.biomeType]} TimeOfDay: ${TimeOfDay[timeOfDay]} Weather: ${WeatherType[weather]}`);
  }

  globalScene.resetSeed();
}

function GenerateBiomes(biomeId: BiomeId, waveIndex: integer) {
  globalScene.newArena(biomeId);
  globalScene.currentBattle.waveIndex = waveIndex;
  globalScene.arena.updatePoolsForTimeOfDay();

  // Finish biome
  for (let i = 1; i <= 10; i++) {
    GenerateBattle();
  }

  // Victory
  if (globalScene.currentBattle.waveIndex >= 50) {
    return;
  }

  const biomeChoices: BiomeId[] = (!Array.isArray(biomeLinks[biomeId])
    ? [ biomeLinks[biomeId] as BiomeId ]
    : biomeLinks[biomeId] as (BiomeId | [BiomeId, integer])[])
      .filter(b => !Array.isArray(b) || !randSeedInt(b[1], undefined, "Choosing next biome"))
      .map(b => (!Array.isArray(b) ? b : b[0]));

  // Recursively generate next biomes
  for (const b of biomeChoices) {
    // If waveindex is not the same anymore, that means a different path ended and we continue with a new branch
    if (globalScene.currentBattle.waveIndex != waveIndex) {
      // Back to x9 wave to generate the x0 wave again, that sets the correct rng
      globalScene.newArena(biomeId);
      globalScene.currentBattle.waveIndex = waveIndex + 9;
      GenerateBattle(true);
    }

    GenerateBiomes(b, waveIndex + 10);
  }
}
// #endregion

// #region 16 Shop Scouting
export function InitShopScouting(method) {
  globalScene.sessionSlotId = 0;
  globalScene.gameData.loadSession(globalScene.sessionSlotId).then(() => {
    console.time('Shop Scouting');
    ShopScouting(method);
    console.timeEnd('Shop Scouting');
  }).catch(err => {
    console.error(err);
    globalScene.ui.showText("something went wrong, see console error", null);
  });
}

let iterations: string[] = [];
const charmList: string[] = [];
function ShopScouting(method) {
  // Remove any lures or charms
  globalScene.RemoveModifiers();
  console.log(`Starting shop scouting ${new Date().toLocaleTimeString()}`);

  const party = globalScene.getPlayerParty();

  const comps = [
    [ SpeciesId.MEW, SpeciesId.MEW, SpeciesId.MEW, SpeciesId.MEW, SpeciesId.MEW, SpeciesId.MEW ],
    [ SpeciesId.MEW, SpeciesId.MEW, SpeciesId.MEW, SpeciesId.MEW, SpeciesId.MEW, SpeciesId.BULBASAUR ],
    [ SpeciesId.MEW, SpeciesId.MEW, SpeciesId.MEW, SpeciesId.MEW, SpeciesId.MEW, SpeciesId.JIGGLYPUFF ],
    [ SpeciesId.MEW, SpeciesId.MEW, SpeciesId.MEW, SpeciesId.MEW, SpeciesId.MEW, SpeciesId.POLIWHIRL ],
    // [SpeciesId.MEW, SpeciesId.MEW, SpeciesId.MEW, SpeciesId.MEW, SpeciesId.SWELLOW, SpeciesId.MEW],
    // [SpeciesId.MEW, SpeciesId.MEW, SpeciesId.MEW, SpeciesId.MEW, SpeciesId.SWELLOW, SpeciesId.BULBASAUR],
    // [SpeciesId.MEW, SpeciesId.MEW, SpeciesId.MEW, SpeciesId.MEW, SpeciesId.SWELLOW, SpeciesId.JIGGLYPUFF],
    // [SpeciesId.MEW, SpeciesId.MEW, SpeciesId.MEW, SpeciesId.MEW, SpeciesId.SWELLOW, SpeciesId.POLIWHIRL],
  ];

  const revives = [
    () => {
      party[3].hp = party[3].getMaxHp();
      party[4].hp = party[4].getMaxHp();
      party[5].hp = party[5].getMaxHp();
      return 0;
    },
    () => {
      party[3].hp = 0;
      return 1;
    },
    () => {
      party[4].hp = 0;
      return 2;
    },
    () => {
      party[5].hp = 0;
      return 3;
    }
  ]

  const ethers = [
    (pokemon: PlayerPokemon) => {
      SetFullPP(pokemon);
      return 0;
    },
    (pokemon: PlayerPokemon) => {
      SetFullPP(pokemon);
      pokemon.moveset[0]?.usePp(pokemon.moveset[0].getMovePp());
      return 1;
    },
    (pokemon: PlayerPokemon) =>  {
      SetFullPP(pokemon);
      pokemon.moveset[1]?.usePp(pokemon.moveset[1].getMovePp());
      return 2;
    },
    (pokemon: PlayerPokemon) =>  {
      SetFullPP(pokemon);
      pokemon.moveset[2]?.usePp(pokemon.moveset[2].getMovePp());
      return 3;
    },
  ];

  const lures = [
    () => {
      globalScene.RemoveLures();
      return "";
    },
    () => {
      globalScene.RemoveLures();
      globalScene.InsertLure();
      return "Lure";
    },
    () => {
      globalScene.RemoveLures();
      globalScene.InsertSuperLure();
      return "Super Lure";
    },
    () => {
      globalScene.RemoveLures();
      globalScene.InsertMaxLure();
      return "Max Lure";
    },
    () => {
      globalScene.RemoveLures();
      globalScene.InsertLure();
      globalScene.InsertSuperLure();
      return "Lure + Super Lure";
    },
    () => {
      globalScene.RemoveLures();
      globalScene.InsertSuperLure();
      globalScene.InsertMaxLure();
      return "Super Lure + Max Lure";
    },
    () => {
      globalScene.RemoveLures();
      globalScene.InsertThreeLures();
      return "All Lures";
    },
  ];

  const comp = comps[method];
  const mushroom = [
    (mu: {start: integer, end: integer, level: integer}) => {
      ClearParty(party);
      mu.level = 39;
      FillParty(party, comp, mu.level);
      mu.start = 1;
      mu.end  = 20;
    },
    (mu: {start: integer, end: integer, level: integer}) => {
      ClearParty(party);
      mu.level = 59;
      FillParty(party, comp, mu.level);
      mu.start = 15;
      mu.end  = 40;
    },
    (mu: {start: integer, end: integer, level: integer}) => {
      ClearParty(party);
      mu.level = 79;
      FillParty(party, comp, mu.level);
      mu.start = 35;
      mu.end  = 49;
    },
  ];

  const globals = [
    () => {
      return "";
    },
    // () => {
    //   globalScene.InsertMegaBracelet();
    //   return "Mega";
    // },
    // () => {
    //   globalScene.InsertDynamaxBand();
    //   return "Band";
    // },
    // () => {
    //   globalScene.InsertLockCapsule();
    //   return "Lock";
    // },
    // () => {
    //   globalScene.InsertMegaBracelet();
    //   globalScene.InsertDynamaxBand();
    //   return "Mega + Band";
    // },
    // () => {
    //   globalScene.InsertMegaBracelet();
    //   globalScene.InsertLockCapsule();
    //   return "Mega + Lock";
    // },
    // () => {
    //   globalScene.InsertDynamaxBand();
    //   globalScene.InsertLockCapsule();
    //   return "Band + Lock";
    // },
    // () => {
    //   globalScene.InsertMegaBracelet();
    //   globalScene.InsertDynamaxBand();
    //   globalScene.InsertLockCapsule();
    //   return "Mega + Band + Lock";
    // },
    // () => {
    //   globalScene.InsertTeraOrb();
    //   return "Tera";
    // },
  ];

  iterations = [];

  // ClearParty(party);
  // overrides.MOVESET_OVERRIDE = [Moves.TACKLE, Moves.SPLASH, Moves.SPLASH, Moves.SPLASH];
  // FillParty(party, comps[0], 39);
  // party[0].hp = 0;
  // GenerateShop(party, "test", 9, 10);
  // party[0].hp = party[0].getMaxHp();
  // GenerateShop(party, "test", 9, 10);
  // return

  globals.forEach(g => {
    globalScene.RemoveModifiers();

    // globalScene.InsertDynamaxBand();
    // globalScene.InsertMegaBracelet();
    // globalScene.InsertLockCapsule();
    // globalScene.InsertTeraOrb();
    // globalScene.InsertIVScanner();

    const rogueItem = g();
    mushroom.forEach(m => {
      const mu = {
        start: 0,
        end: 0,
        level: 0
      };
      m(mu);

      const partynames = party.map(p => p.name);
      console.log(rogueItem, mu.level, partynames, party);

      lures.forEach(lure => {
        const text = lure();
        
        ethers.forEach(ether => {
          const e = ether(party[0]);

          revives.forEach(revive => {
            const r = revive();
            IteratePotions(party, 0, 0, 0, 0, 0, r, e, text, mu.start, mu.end, mu.level, rogueItem);
          })
        });
      });
    });
  });

  console.log(charmList);
  console.log(`Shop scouting done ${new Date().toLocaleTimeString()}`);
  globalScene.ui.showText("DONE! Copy the list from the console and refresh the page.", null);
}

function ClearParty(party: PlayerPokemon[]) {
  do {
    globalScene.removePokemonFromPlayerParty(party[0], true);
  }
  while (party.length > 0);
}

function FillParty(party: PlayerPokemon[], comp: SpeciesId[], level: integer) {
  comp.forEach((s: SpeciesId) => {
    AddPokemon(party, s, level);
  });
}

function AddPokemon(party: PlayerPokemon[], speciesId: SpeciesId, level: integer) {
  const pokemon = allSpecies.filter(sp => sp.speciesId == speciesId)[0];
  const playerPokemon = globalScene.addPlayerPokemon(pokemon, level);
  playerPokemon.moveset = [ new PokemonMove(MoveId.TACKLE), new PokemonMove(MoveId.SPLASH), new PokemonMove(MoveId.SPLASH), new PokemonMove(MoveId.SPLASH) ];
  party.push(playerPokemon);
}

function SetFullPP(pokemon: PlayerPokemon) {
  pokemon.getMoveset().forEach(ms => {
    ms?.setFullPp();
  });
}

// Done:
//  Potion
//  Super Potion
//  Hyper Potion
//  Max Potion
//  Ether
//  Max Ether
//  Elixir
//  Max Elixir
//  Lure
//  Super Lure
//  Max Lure
//  Memory Mushroom
//  Revive
//  Max Revive
//  Lock Capsule
//  Dynamax Band
//  Mega Bracelet
//
// Planned:
//  Full Heal
//  Full Restore
//  Sacred Ash
//  Form Change Items
//  Species Items
//  Leek
//  Toxic Orb
//  Flame Orb
//  Tera Orb
function CreateLog(pot = 0, suppot = 0, hyppot = 0, maxpot = 0, revive = 0, eth = 0, lure = "", level = 79, rogueItem = "") {
  const items: string[] = [];
  if (pot - suppot > 0) {
    items.push(`${pot - suppot}x <87.5% HP and 10+ dmg taken`);
  }
  if (suppot - hyppot > 0) {
    items.push(`${suppot - hyppot}x <75% HP and 25+ dmg taken`);
  }
  if (hyppot - maxpot > 0) {
    items.push(`${hyppot - maxpot}x 50%-62.5% and 100+ dmg taken`);
  }
  if (maxpot - revive > 0) {
    items.push(`${maxpot - revive}x <50% and 100+ dmg taken`);
  }
  if (revive > 0) {
    items.push(`${revive}x fainted`);
  }
  if (eth > 0) {
    items.push(`${eth}x low PP`);
  }
  if (lure != "") {
    items.push(`${lure}`);
  }
  if (rogueItem != "") {
    items.push(`${rogueItem}`);
  }

  if (items.length == 0) {
    items.push("nothing");
  }

  items.push(`Highest lvl: ${level - 19}-${level}`);

  return items.join(" + ");
}

function IteratePotions(party: PlayerPokemon[], n = 0, pot = 0, suppot = 0, hyppot = 0, maxpot = 0, revive = 0, eth = 0, lure = "", start = 1, end = 50, level = 79, rogueItem = "") {
  if (n == Math.min(3, party.length)) {
    const i = `${pot} ${suppot} ${hyppot} ${maxpot} ${revive} ${eth} ${lure} ${level} ${rogueItem}`;
    if (iterations.some(it => it == i)) {
      return;
    }

    iterations.push(i);
    const comptext = CreateLog(pot, suppot, hyppot, maxpot, revive, eth, lure, level, rogueItem);
    GenerateShop(party, comptext, start, end);
    return;
  }

  const pokemon = party[n];
  const mhp = pokemon.getMaxHp();

  // Nothing
  IteratePotions(party, n + 1, pot, suppot, hyppot, maxpot, revive, eth, lure, start, end, level, rogueItem);

  // potion
  var damage = Math.min(Math.max(Math.floor(mhp * 0.18), 10));
  if (damage < mhp) {
    pokemon.hp = mhp - damage;
    IteratePotions(party, n + 1, pot + 1, suppot, hyppot, maxpot, revive, eth, lure, start, end, level, rogueItem);
  }

  // super potion
  var damage = Math.min(Math.max(Math.floor(mhp * 0.31), 25));
  if (damage < mhp) {
    pokemon.hp = mhp - damage;
    IteratePotions(party, n + 1, pot + 1, suppot + 1, hyppot, maxpot, revive, eth, lure, start, end, level, rogueItem);
  }

  // hyper potion
  var damage = Math.min(Math.max(Math.floor(mhp * 0.45), 100));
  if (damage < mhp && (mhp - damage) / mhp > 0.5) {
    pokemon.hp = mhp - damage;
    IteratePotions(party, n + 1, pot + 1, suppot + 1, hyppot + 1, maxpot, revive, eth, lure, start, end, level, rogueItem);
  }

  // max potion
  var damage = Math.min(Math.max(Math.floor(mhp * 0.51), 100));
  if (damage < mhp) {
    pokemon.hp = mhp - damage;
    IteratePotions(party, n + 1, pot + 1, suppot + 1, hyppot + 1, maxpot + 1, revive, eth, lure, start, end, level, rogueItem);
  }

  // // Revive
  // pokemon.hp = 0;
  // IteratePotions(party, n + 1, pot + 1, suppot + 1, hyppot + 1, maxpot + 1, revive + 1, eth, lure, start, end, level, rogueItem);

  // reset pokemon
  pokemon.hp = pokemon.getMaxHp();
}

function GenerateShop(party: PlayerPokemon[], comptext: string, start: integer, end: integer) {
  for (var w = start; w < end; w++) {
    if (w % 10 == 0) {
      continue;
    }

    globalScene.executeWithSeedOffset(() => {
      globalScene.currentBattle.waveIndex = w;
      for (let i = 0; i < 4; i++) {
        regenerateModifierPoolThresholds(party, ModifierPoolType.PLAYER, i);
        const typeOptions: ModifierTypeOption[] = getPlayerModifierTypeOptions(Math.min(6, Math.max(3, 3 + Math.floor((w / 10) - 1))), party);
        if (typeOptions.some(t => t.type.id == "ABILITY_CHARM")) {
          console.log(w, i, comptext);
          charmList.push(`${w} ${i} ${comptext}`);
        }
      }
    }, w);
  }
}
// #endregion