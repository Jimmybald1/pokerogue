import * as LoggerTools from "../logger";
import { loggedInUser } from "#app/account";
import { BattleType } from "#enums/battle-type";
import { fetchDailyRunSeed, getDailyRunStarters } from "#app/data/daily-run";
import { Gender } from "#app/data/gender";
import { getBiomeKey } from "#app/field/arena";
import { GameMode, getGameMode } from "#app/game-mode";
import { GameModes } from "#enums/game-modes";
import type { Modifier } from "#app/modifier/modifier";
import { getDailyRunStarterModifiers, getPlayerModifierTypeOptions, ModifierTypeOption, regenerateModifierPoolThresholds } from "#app/modifier/modifier-type";
import { allAbilities, allSpecies, modifierTypes } from "#app/data/data-lists";
import { ModifierPoolType } from "#enums/modifier-pool-type";
import { Phase } from "#app/phase";
import type { SessionSaveData } from "#app/system/game-data";
import { Unlockables } from "#enums/unlockables";
import { vouchers } from "#app/system/voucher";
import type { OptionSelectConfig, OptionSelectItem } from "#app/ui/abstact-option-select-ui-handler";
import { SaveSlotUiMode } from "#app/ui/save-slot-select-ui-handler";
import { UiMode } from "#enums/ui-mode";
import { isLocal, isLocalServerConnected, isNullOrUndefined, randSeedInt } from "#app/utils/common";
import i18next from "i18next";
import { globalScene } from "#app/global-scene";
import Overrides from "#app/overrides";
import { SpeciesId } from "#enums/species-id";
import { PlayerPokemon } from "#app/field/pokemon";
import { PokemonMove } from "#app/data/moves/pokemon-move";
import { MoveId } from "#enums/move-id";
import { getPokemonNameWithAffix } from "#app/messages";
import { Nature } from "#enums/nature";
import { PokemonType } from "#enums/pokemon-type";
import Battle from "#app/battle";
import { BiomeId } from "#enums/biome-id";
import { TrainerSlot } from "#enums/trainer-slot";
import { BattleSpec } from "#enums/battle-spec";
import { applyAbAttrs } from "#app/data/abilities/apply-ab-attrs";
import { biomeLinks } from "#app/data/balance/biomes";

export class TitlePhase extends Phase {
  public readonly phaseName = "TitlePhase";
  private loaded = false;
  private lastSessionData: SessionSaveData;
  public gameMode: GameModes;

  start(): void {
    super.start();

    globalScene.ui.clearText();
    globalScene.ui.fadeIn(250);

    globalScene.playBgm("title", true);

    globalScene.gameData
      .getSession(loggedInUser?.lastSessionSlot ?? -1)
      .then(sessionData => {
        if (sessionData) {
          this.lastSessionData = sessionData;
          const biomeKey = getBiomeKey(sessionData.arena.biome);
          const bgTexture = `${biomeKey}_bg`;
          globalScene.arenaBg.setTexture(bgTexture);
        }
        this.showOptions();
      })
      .catch(err => {
        console.error(err);
        this.showOptions();
      });
  }

  showOptions(): void {
    const options: OptionSelectItem[] = [];
    if (loggedInUser && loggedInUser.lastSessionSlot > -1) {
      options.push({
        label: i18next.t("continue", { ns: "menu" }),
        handler: () => {
          this.loadSaveSlot(this.lastSessionData || !loggedInUser ? -1 : loggedInUser.lastSessionSlot);
          return true;
        },
      });
    }
    options.push(
      {
        label: i18next.t("menu:newGame"),
        handler: () => {
          const setModeAndEnd = (gameMode: GameModes) => {
            this.gameMode = gameMode;
            globalScene.ui.setMode(UiMode.MESSAGE);
            globalScene.ui.clearText();
            this.end();
          };
          const { gameData } = globalScene;
          const options: OptionSelectItem[] = [];
          options.push({
            label: GameMode.getModeName(GameModes.CLASSIC),
            handler: () => {
              setModeAndEnd(GameModes.CLASSIC);
              return true;
            },
          });
          options.push({
            label: i18next.t("menu:dailyRun"),
            handler: () => {
              this.initDailyRun();
              return true;
            },
          });
          if (gameData.isUnlocked(Unlockables.ENDLESS_MODE)) {
            options.push({
              label: GameMode.getModeName(GameModes.CHALLENGE),
              handler: () => {
                setModeAndEnd(GameModes.CHALLENGE);
                return true;
              },
            });
            options.push({
              label: GameMode.getModeName(GameModes.ENDLESS),
              handler: () => {
                setModeAndEnd(GameModes.ENDLESS);
                return true;
              },
            });
            if (gameData.isUnlocked(Unlockables.SPLICED_ENDLESS_MODE)) {
              options.push({
                label: GameMode.getModeName(GameModes.SPLICED_ENDLESS),
                handler: () => {
                  setModeAndEnd(GameModes.SPLICED_ENDLESS);
                  return true;
                },
              });
            }
          }
          options.push({
            label: i18next.t("menu:cancel"),
            handler: () => {
              this.callEnd();
              return true;
            },
          });
          globalScene.ui.showText(i18next.t("menu:selectGameMode"), null, () =>
            globalScene.ui.setOverlayMode(UiMode.OPTION_SELECT, {
              options: options,
            }),
          );
          return true;
        },
      },
      { // Pathing tool option
        label: "Scouting",
        handler: () => {
          globalScene.ui.showText("Encounter Scouting", null, () => this.InitScouting(0));
          return true;
        }
      }, 
      { // Pathing tool option
        label: "Shop Scouting",
        handler: () => {
          const shopOptions: OptionSelectItem[] = [];
          shopOptions.push({
            label: "Shop no evo",
            handler: () => {
              this.InitShopScouting(0);
              return true;
            }
          }, {
            label: "Shop lvl evo",
            handler: () => {
              this.InitShopScouting(1);
              return true;
            }
          }, {
            label: "Shop 1x item evo",
            handler: () => {
              this.InitShopScouting(2);
              return true;
            }
          }, {
            label: "Shop 2x item evo",
            handler: () => {
              this.InitShopScouting(3);
              return true;
            }
          });
          globalScene.ui.showText("Shop Scouting", null, () => globalScene.ui.setOverlayMode(UiMode.OPTION_SELECT, { options: shopOptions }));
          return true;
        }
      }, 
      { // Pathing tool option
        label: "Manage Logs",
        handler: () => {
          //return this.logRenameMenu()
          globalScene.ui.setOverlayMode(UiMode.LOG_HANDLER,
            (k: string) => {
              if (k === undefined) {
                return this.showOptions();
              }
              console.log(k);
              this.showOptions();
            }, () => {
              this.showOptions();
            });
          return true;
        },
      }, 
      { // Pathing tool option
        label: "Manage Logs (Old Menu)",
        handler: () => {
          return this.logRenameMenu();
        }
      }, 
      {
        label: i18next.t("menu:loadGame"),
        handler: () => {
          globalScene.ui.setOverlayMode(UiMode.SAVE_SLOT, SaveSlotUiMode.LOAD, (slotId: number) => {
            if (slotId === -1) {
              return this.showOptions();
            }
            this.loadSaveSlot(slotId);
          });
          return true;
        },
      },
      {
        label: i18next.t("menu:runHistory"),
        handler: () => {
          globalScene.ui.setOverlayMode(UiMode.RUN_HISTORY);
          return true;
        },
        keepOpen: true,
      },
      {
        label: i18next.t("menu:settings"),
        handler: () => {
          globalScene.ui.setOverlayMode(UiMode.SETTINGS);
          return true;
        },
        keepOpen: true,
      },
    );
    const config: OptionSelectConfig = {
      options: options,
      noCancel: true,
      yOffset: 47,
    };
    globalScene.ui.setMode(UiMode.TITLE, config);
  }

  loadSaveSlot(slotId: number): void {
    globalScene.sessionSlotId = slotId > -1 || !loggedInUser ? slotId : loggedInUser.lastSessionSlot;
    globalScene.ui.setMode(UiMode.MESSAGE);
    globalScene.ui.resetModeChain();
    globalScene.gameData
      .loadSession(slotId, slotId === -1 ? this.lastSessionData : undefined)
      .then((success: boolean) => {
        if (success) {
          this.loaded = true;
          globalScene.ui.showText(i18next.t("menu:sessionSuccess"), null, () => this.end());
        } else {
          this.end();
        }
      })
      .catch(err => {
        console.error(err);
        globalScene.ui.showText(i18next.t("menu:failedToLoadSession"), null);
      });
  }

  initDailyRun(): void {
    globalScene.ui.clearText();
    globalScene.ui.setMode(UiMode.SAVE_SLOT, SaveSlotUiMode.SAVE, (slotId: number) => {
      globalScene.phaseManager.clearPhaseQueue();
      if (slotId === -1) {
        globalScene.phaseManager.pushNew("TitlePhase");
        return super.end();
      }
      globalScene.sessionSlotId = slotId;

      const generateDaily = (seed: string) => {
        globalScene.gameMode = getGameMode(GameModes.DAILY);
        // Daily runs don't support all challenges yet (starter select restrictions aren't considered)
        globalScene.eventManager.startEventChallenges();

        globalScene.setSeed(seed);
        globalScene.resetSeed(0);

        globalScene.money = globalScene.gameMode.getStartingMoney();

        const starters = getDailyRunStarters(seed);
        const startingLevel = globalScene.gameMode.getStartingLevel();

        const party = globalScene.getPlayerParty();
        const loadPokemonAssets: Promise<void>[] = [];
        for (const starter of starters) {
          const starterProps = globalScene.gameData.getSpeciesDexAttrProps(starter.species, starter.dexAttr);
          const starterFormIndex = Math.min(starterProps.formIndex, Math.max(starter.species.forms.length - 1, 0));
          const starterGender =
            starter.species.malePercent !== null
              ? !starterProps.female
                ? Gender.MALE
                : Gender.FEMALE
              : Gender.GENDERLESS;
          const starterPokemon = globalScene.addPlayerPokemon(
            starter.species,
            startingLevel,
            starter.abilityIndex,
            starterFormIndex,
            starterGender,
            starterProps.shiny,
            starterProps.variant,
            undefined,
            starter.nature,
          );
          starterPokemon.setVisible(false);
          party.push(starterPokemon);
          loadPokemonAssets.push(starterPokemon.loadAssets());
        }

        regenerateModifierPoolThresholds(party, ModifierPoolType.DAILY_STARTER);

        const modifiers: Modifier[] = Array(3)
          .fill(null)
          .map(() => modifierTypes.EXP_SHARE().withIdFromFunc(modifierTypes.EXP_SHARE).newModifier())
          .concat(
            Array(3)
              .fill(null)
              .map(() => modifierTypes.GOLDEN_EXP_CHARM().withIdFromFunc(modifierTypes.GOLDEN_EXP_CHARM).newModifier()),
          )
          .concat([modifierTypes.MAP().withIdFromFunc(modifierTypes.MAP).newModifier()])
          .concat(getDailyRunStarterModifiers(party))
          .filter(m => m !== null);

        for (const m of modifiers) {
          globalScene.addModifier(m, true, false, false, true);
        }
        globalScene.updateModifiers(true, true);

        Promise.all(loadPokemonAssets).then(() => {
          globalScene.time.delayedCall(500, () => globalScene.playBgm());
          globalScene.gameData.gameStats.dailyRunSessionsPlayed++;
          globalScene.newArena(globalScene.gameMode.getStartingBiome());
          globalScene.newBattle();
          globalScene.arena.init();
          globalScene.sessionPlayTime = 0;
          globalScene.lastSavePlayTime = 0;
          this.end();
        });
      };

      // If Online, calls seed fetch from db to generate daily run. If Offline, generates a daily run based on current date.
      if (!isLocal || isLocalServerConnected) {
        fetchDailyRunSeed()
          .then(seed => {
            if (seed) {
              generateDaily(seed);
            } else {
              throw new Error("Daily run seed is null!");
            }
          })
          .catch(err => {
            console.error("Failed to load daily run:\n", err);
          });
      } else {
        let seed: string = btoa(new Date().toISOString().substring(0, 10));
        if (!isNullOrUndefined(Overrides.DAILY_RUN_SEED_OVERRIDE)) {
          seed = Overrides.DAILY_RUN_SEED_OVERRIDE;
        }
        generateDaily(seed);
      }
    });
  }

  end(): void {
    if (!this.loaded && !globalScene.gameMode.isDaily) {
      globalScene.arena.preloadBgm();
      globalScene.gameMode = getGameMode(this.gameMode);
      if (this.gameMode === GameModes.CHALLENGE) {
        globalScene.phaseManager.pushNew("SelectChallengePhase");
      } else {
        globalScene.phaseManager.pushNew("SelectStarterPhase");
      }
      globalScene.newArena(globalScene.gameMode.getStartingBiome());
    } else {
      globalScene.playBgm();
    }

    globalScene.phaseManager.pushNew("EncounterPhase", this.loaded);

    if (this.loaded) {
      const availablePartyMembers = globalScene.getPokemonAllowedInBattle().length;

      globalScene.phaseManager.pushNew("SummonPhase", 0, true, true);
      if (globalScene.currentBattle.double && availablePartyMembers > 1) {
        globalScene.phaseManager.pushNew("SummonPhase", 1, true, true);
      }

      if (
        globalScene.currentBattle.battleType !== BattleType.TRAINER &&
        (globalScene.currentBattle.waveIndex > 1 || !globalScene.gameMode.isDaily)
      ) {
        const minPartySize = globalScene.currentBattle.double ? 2 : 1;
        if (availablePartyMembers > minPartySize) {
          globalScene.phaseManager.pushNew("CheckSwitchPhase", 0, globalScene.currentBattle.double);
          if (globalScene.currentBattle.double) {
            globalScene.phaseManager.pushNew("CheckSwitchPhase", 1, globalScene.currentBattle.double);
          }
        }
      }
    }

    for (const achv of Object.keys(globalScene.gameData.achvUnlocks)) {
      if (vouchers.hasOwnProperty(achv) && achv !== "CLASSIC_VICTORY") {
        globalScene.validateVoucher(vouchers[achv]);
      }
    }

    super.end();
  }

  callEnd(): boolean {
    globalScene.phaseManager.clearPhaseQueue();
    globalScene.phaseManager.pushPhase(new TitlePhase());
    super.end();
    return true;
  }

  showLoggerOptions(txt: string, options: OptionSelectItem[]): boolean {
    globalScene.ui.showText("Export or clear game logs.", null, () => globalScene.ui.setOverlayMode(UiMode.OPTION_SELECT, { options: options }));
    return true;
  }

  logMenu(): boolean {
    const options: OptionSelectItem[] = [];
    LoggerTools.getLogs();
    for (let i = 0; i < LoggerTools.logs.length; i++) {
      if (localStorage.getItem(LoggerTools.logs[i][1]) != null) {
        options.push(LoggerTools.generateOption(i, this.getSaves()) as OptionSelectItem);
      }
    }
    options.push({
      label: "Delete all",
      handler: () => {
        for (let i = 0; i < LoggerTools.logs.length; i++) {
          if (localStorage.getItem(LoggerTools.logs[i][1]) != null) {
            localStorage.removeItem(LoggerTools.logs[i][1]);
          }
        }
        this.callEnd();
        return true;
      }
    }, {
      label: i18next.t("menu:cancel"),
      handler: () => {
        this.callEnd();
        return true;
      }
    });
    globalScene.ui.showText("Export or clear game logs.", null, () => globalScene.ui.setOverlayMode(UiMode.OPTION_SELECT, { options: options }));
    return true;
  }

  logRenameMenu(): boolean {
    const options: OptionSelectItem[] = [];
    LoggerTools.getLogs();
    globalScene.newArena(BiomeId.FACTORY);
    for (let i = 0; i < LoggerTools.logs.length; i++) {
      if (localStorage.getItem(LoggerTools.logs[i][1]) != null) {
        options.push(LoggerTools.generateEditOption(i, this.getSaves(), this) as OptionSelectItem);
      } else {
        //options.push(LoggerTools.generateAddOption(i, globalScene, this))
      }
    }
    options.push({
      label: "Delete all",
      handler: () => {
        for (let i = 0; i < LoggerTools.logs.length; i++) {
          if (localStorage.getItem(LoggerTools.logs[i][1]) != null) {
            localStorage.removeItem(LoggerTools.logs[i][1]);
          }
        }
        this.callEnd();
        return true;
      }
    }, {
      label: i18next.t("menu:cancel"),
      handler: () => {
        this.callEnd();
        return true;
      }
    });
    globalScene.ui.showText("Export, rename, or delete logs.", null, () => globalScene.ui.setOverlayMode(UiMode.OPTION_SELECT, { options: options }));
    return true;
  }

  getSaves(log?: boolean, dailyOnly?: boolean): SessionSaveData[] | undefined {
    const saves: Array<Array<any>> = [];
    for (let i = 0; i < 5; i++) {
      const s = LoggerTools.parseSlotData(i);
      if (s != undefined) {
        if (!dailyOnly || s.gameMode == GameModes.DAILY) {
          saves.push([ i, s, s.timestamp ]);
        }
      }
    }
    saves.sort((a, b): integer => {
      return b[2] - a[2];
    });
    if (log) {
      console.log(saves);
    }
    if (saves == undefined) {
      return undefined;
    }
    return saves.map(f => f[1]);
  }

  InitShopScouting(method) {
    globalScene.sessionSlotId = 0;
    globalScene.gameData.loadSession(globalScene.sessionSlotId, undefined, undefined).then((success: boolean) => {
      console.time('Shop Scouting');
      this.ShopScouting(method);
      console.timeEnd('Shop Scouting');
    }).catch(err => {
      console.error(err);
      globalScene.ui.showText("something went wrong, see console error", null);
    });
  }

  private iterations: string[] = [];
  private charmList: string[] = [];
  ShopScouting(method) {
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

    const ethers = [
      (pokemon: PlayerPokemon) => {
        this.SetFullPP(pokemon);
        return 0;
      },
      (pokemon: PlayerPokemon) => {
        this.SetFullPP(pokemon);
        pokemon.moveset[0]?.usePp(pokemon.moveset[0].getMovePp());
        return 1;
      },
      (pokemon: PlayerPokemon) =>  {
        this.SetFullPP(pokemon);
        pokemon.moveset[1]?.usePp(pokemon.moveset[1].getMovePp());
        return 2;
      },
      (pokemon: PlayerPokemon) =>  {
        this.SetFullPP(pokemon);
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
        this.ClearParty(party);
        mu.level = 39;
        this.FillParty(party, comp, mu.level);
        mu.start = 1;
        mu.end  = 20;
      },
      (mu: {start: integer, end: integer, level: integer}) => {
        this.ClearParty(party);
        mu.level = 59;
        this.FillParty(party, comp, mu.level);
        mu.start = 15;
        mu.end  = 40;
      },
      (mu: {start: integer, end: integer, level: integer}) => {
        this.ClearParty(party);
        mu.level = 79;
        this.FillParty(party, comp, mu.level);
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

    this.iterations = [];

    // this.ClearParty(party);
    // overrides.MOVESET_OVERRIDE = [Moves.TACKLE, Moves.SPLASH, Moves.SPLASH, Moves.SPLASH];
    // this.FillParty(party, comps[0], 39);
    // party[0].hp = 0;
    // this.GenerateShop(party, "test", 9, 10);
    // party[0].hp = party[0].getMaxHp();
    // this.GenerateShop(party, "test", 9, 10);
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
            this.IteratePotions(party, 0, 0, 0, 0, 0, 0, e, text, mu.start, mu.end, mu.level, rogueItem);
          });
        });
      });
    });

    console.log(this.charmList);
    console.log(`Shop scouting done ${new Date().toLocaleTimeString()}`);
    globalScene.ui.showText("DONE! Copy the list from the console and refresh the page.", null);
  }

  ClearParty(party: PlayerPokemon[]) {
    do {
      globalScene.removePokemonFromPlayerParty(party[0], true);
    }
    while (party.length > 0);
  }

  FillParty(party: PlayerPokemon[], comp: SpeciesId[], level: integer) {
    comp.forEach((s: SpeciesId) => {
      this.AddPokemon(party, s, level);
    });
  }

  AddPokemon(party: PlayerPokemon[], speciesId: SpeciesId, level: integer) {
    const pokemon = allSpecies.filter(sp => sp.speciesId == speciesId)[0];
    const playerPokemon = globalScene.addPlayerPokemon(pokemon, level);
    playerPokemon.moveset = [ new PokemonMove(MoveId.TACKLE), new PokemonMove(MoveId.SPLASH), new PokemonMove(MoveId.SPLASH), new PokemonMove(MoveId.SPLASH) ];
    party.push(playerPokemon);
  }

  SetFullPP(pokemon: PlayerPokemon) {
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
  CreateLog(pot = 0, suppot = 0, hyppot = 0, maxpot = 0, revive = 0, eth = 0, lure = "", level = 79, rogueItem = "") {
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

  IteratePotions(party: PlayerPokemon[], n = 0, pot = 0, suppot = 0, hyppot = 0, maxpot = 0, revive = 0, eth = 0, lure = "", start = 1, end = 50, level = 79, rogueItem = "") {
    if (n == Math.min(3, party.length)) {
      const i = `${pot} ${suppot} ${hyppot} ${maxpot} ${revive} ${eth} ${lure} ${level} ${rogueItem}`;
      if (this.iterations.some(it => it == i)) {
        return;
      }

      this.iterations.push(i);
      const comptext = this.CreateLog(pot, suppot, hyppot, maxpot, revive, eth, lure, level, rogueItem);
      this.GenerateShop(party, comptext, start, end);
      return;
    }

    const pokemon = party[n];
    const mhp = pokemon.getMaxHp();

    // Nothing
    this.IteratePotions(party, n + 1, pot, suppot, hyppot, maxpot, revive, eth, lure, start, end, level, rogueItem);

    // potion
    var damage = Math.min(Math.max(Math.floor(mhp * 0.18), 10));
    if (damage < mhp) {
      pokemon.hp = mhp - damage;
      this.IteratePotions(party, n + 1, pot + 1, suppot, hyppot, maxpot, revive, eth, lure, start, end, level, rogueItem);
    }

    // super potion
    var damage = Math.min(Math.max(Math.floor(mhp * 0.31), 25));
    if (damage < mhp) {
      pokemon.hp = mhp - damage;
      this.IteratePotions(party, n + 1, pot + 1, suppot + 1, hyppot, maxpot, revive, eth, lure, start, end, level, rogueItem);
    }

    // hyper potion
    var damage = Math.min(Math.max(Math.floor(mhp * 0.45), 100));
    if (damage < mhp && (mhp - damage) / mhp > 0.5) {
      pokemon.hp = mhp - damage;
      this.IteratePotions(party, n + 1, pot + 1, suppot + 1, hyppot + 1, maxpot, revive, eth, lure, start, end, level, rogueItem);
    }

    // max potion
    var damage = Math.min(Math.max(Math.floor(mhp * 0.51), 100));
    if (damage < mhp) {
      pokemon.hp = mhp - damage;
      this.IteratePotions(party, n + 1, pot + 1, suppot + 1, hyppot + 1, maxpot + 1, revive, eth, lure, start, end, level, rogueItem);
    }

    // Revive
    pokemon.hp = 0;
    this.IteratePotions(party, n + 1, pot + 1, suppot + 1, hyppot + 1, maxpot + 1, revive + 1, eth, lure, start, end, level, rogueItem);

    // reset pokemon
    pokemon.hp = pokemon.getMaxHp();
  }

  GenerateShop(party: PlayerPokemon[], comptext: string, start: integer, end: integer) {
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
            this.charmList.push(`${w} ${i} ${comptext}`);
          }
        }
      }, w);
    }
  }

  InitScouting(charms: number) {
    globalScene.sessionSlotId = 0;
    globalScene.gameData.loadSession(globalScene.sessionSlotId, undefined, undefined).then((success: boolean) => {
      this.ScoutingWithoutUI(charms);
    }).catch(err => {
      console.error(err);
      globalScene.ui.showText("something went wrong, see console error", null);
    });
  }

  private encounterList: string[] = [];
  ScoutingWithoutUI(charms: number) {
    const startingBiome = globalScene.arena.biomeType;

    const starters: string[] = [];
    const party = globalScene.getPlayerParty();
    party.forEach(p => {
      starters.push(`Pokemon: ${getPokemonNameWithAffix(p)} ` +
        `Form: ${p.getSpeciesForm().getSpriteAtlasPath(false, p.formIndex)} Species ID: ${p.species.speciesId} Stats: ${p.stats} IVs: ${p.ivs} Ability: ${p.getAbility().name} ` +
        `Passive Ability: ${p.getPassiveAbility().name} Nature: ${Nature[p.nature]} Gender: ${Gender[p.gender]} Rarity: undefined AbilityIndex: ${p.abilityIndex} ` +
        `ID: ${p.id} Type: ${p.getTypes().map(t => PokemonType[t]).join(",")} Moves: ${p.getMoveset().map(m => MoveId[m?.moveId ?? 0]).join(",")}`);
    });

    this.ClearParty(party);
    this.FillParty(party, [ SpeciesId.VENUSAUR ], 20);

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
    this.encounterList = [];
    this.GenerateBiomes(startingBiome, 0);
    this.StoreEncounters(`0${charms}`);

    console.log(`Starting 1 lures and ${charms} charms ${new Date().toLocaleString()}`);
    this.encounterList = [];
    globalScene.InsertLure();
    this.GenerateBiomes(startingBiome, 0);
    this.StoreEncounters(`1${charms}`);

    console.log(`Starting 2 lures and ${charms} charms ${new Date().toLocaleString()}`);
    this.encounterList = [];
    globalScene.InsertSuperLure();
    this.GenerateBiomes(startingBiome, 0);
    this.StoreEncounters(`2${charms}`);

    // Only generate wave 10 for 3 lures.
    console.log(`Starting 3 lures and ${charms} charms ${new Date().toLocaleString()}`);
    this.encounterList = [];
    globalScene.InsertMaxLure();
    globalScene.newArena(startingBiome);
    globalScene.currentBattle.waveIndex = 9;
    globalScene.arena.updatePoolsForTimeOfDay();
    this.GenerateBattle();
    this.StoreEncounters(`3${charms}`);

    var output = JSON.parse(localStorage.getItem("scouting")!) as string[][];
    console.log("All scouting data:", output);
    output = [];
    globalScene.ui.showText("DONE! Copy the data from the console and then you can refresh this page.", null);
  }

  StoreEncounters(lurecharm: string) {
    let output = JSON.parse(localStorage.getItem("scouting")!) as string[][];
    output.push([ `start${lurecharm}` ]);
    output.push(this.encounterList);
    output.push([ `end${lurecharm}` ]);
    localStorage.setItem("scouting", JSON.stringify(output));
    output = [];
  }

  GenerateBattle(nolog: boolean = false) {
    console.log(`%%%%%  Wave: ${globalScene.currentBattle.waveIndex + 1}  %%%%%`);
    const battle = globalScene.newBattle() as Battle;
    while (LoggerTools.rarities.length > 0) {
      LoggerTools.rarities.pop();
    }
    LoggerTools.rarityslot[0] = 0;
    while (LoggerTools.haChances.length > 0) {
      LoggerTools.haChances.pop();
    }

    if (!nolog && battle?.trainer != null) {
      this.encounterList.push(`Wave: ${globalScene.currentBattle.waveIndex} Biome: ${BiomeId[globalScene.arena.biomeType]} Trainer: ${battle.trainer.config.name}`);
    }

    battle.enemyLevels?.forEach((level, e) => {
      if (battle.battleType === BattleType.TRAINER) {
        battle.enemyParty[e] = battle.trainer?.genPartyMember(e)!;
      } else {
        LoggerTools.rarityslot[0] = e;
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

        // Male/Female sprites for Jellicent, Pyroar and Meowstic...
        if (atlaspath == "593" || atlaspath == "668" || atlaspath == "678") {
          atlaspath += `-${Gender[enemy.gender].toLowerCase()}`;
        }

        // Store encounters in a list, basically CSV (uses regex in sheets), but readable as well
        const text = `Wave: ${globalScene.currentBattle.waveIndex} Biome: ${BiomeId[globalScene.arena.biomeType]} Pokemon: ${getPokemonNameWithAffix(enemy)} ` +
        `Form: ${atlaspath} Species ID: ${enemy.species.speciesId} Stats: ${enemy.stats} IVs: ${enemy.ivs} Ability: ${enemy.getAbility().name} ` +
        `Passive Ability: ${enemy.getPassiveAbility().name} Nature: ${Nature[enemy.nature]} Gender: ${Gender[enemy.gender]} Rarity: ${LoggerTools.rarities[e]} AbilityIndex: ${enemy.abilityIndex} ` +
        `ID: ${enemy.id} Type: ${enemy.getTypes().map(t => PokemonType[t]).join(",")} Moves: ${enemy.getMoveset().map(m => MoveId[m?.moveId ?? 0]).join(",")} HARolls: ${LoggerTools.haChances[e].join(",")} ` +
        `Hidden Ability: ${allAbilities[enemy.getSpeciesForm().abilityHidden].name}`;
        this.encounterList.push(text);
        console.log(text);
        if (battle.waveIndex == 50) {
          // separate print so its easier to find for discord pin
          console.log(enemy.getMoveset().map(m => MoveId[m?.moveId ?? 0]));
        }
      }
    });

    globalScene.resetSeed();
  }

  GenerateBiomes(biomeId: BiomeId, waveIndex: integer) {
    globalScene.newArena(biomeId);
    globalScene.currentBattle.waveIndex = waveIndex;
    globalScene.arena.updatePoolsForTimeOfDay();

    // Finish biome
    for (let i = 1; i <= 10; i++) {
      this.GenerateBattle();
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
        this.GenerateBattle(true);
      }

      this.GenerateBiomes(b, waveIndex + 10);
    }
  }
}