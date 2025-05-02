import { PartyMemberStrength } from "#enums/party-member-strength";
import type { Species } from "#enums/species";
import { globalScene } from "#app/global-scene";
import { PlayerPokemon, PokemonMove } from "#app/field/pokemon";
import type { Starter } from "#app/ui/starter-select-ui-handler";
import { randSeedGauss, randSeedInt, randSeedItem, getEnumValues } from "#app/utils/common";
import type { PokemonSpeciesForm } from "#app/data/pokemon-species";
import PokemonSpecies, { getPokemonSpecies, getPokemonSpeciesForm } from "#app/data/pokemon-species";
import { speciesStarterCosts } from "#app/data/balance/starters";
import { pokerogueApi } from "#app/plugins/api/pokerogue-api";
import { Biome } from "#app/enums/biome";
import type { Variant } from "#app/sprites/variant";
import type { Moves } from "#enums/moves";
import type { StarterMoveset } from "#app/system/game-data";

export interface DailyRunConfig {
  seed: number;
  starters: Starter;
}

export function fetchDailyRunSeed(): Promise<string | null> {
  return new Promise<string | null>((resolve, _reject) => {
    pokerogueApi.daily.getSeed().then(dailySeed => {
      resolve(dailySeed);
    });
  });
}

export function getDailyRunStarters(seed: string): Starter[] {
  let starters: Starter[] = [];

  globalScene.executeWithSeedOffset(
    () => {
      if (isDailyEventSeed(seed)) {
        const eventStarters = getDailyEventSeedStarters(seed);
        if (eventStarters) {
          starters = eventStarters;
          return;
        }
      }

      const startingLevel = globalScene.gameMode.getStartingLevel();
      const starterCosts: number[] = [];
      starterCosts.push(Math.min(Math.round(3.5 + Math.abs(randSeedGauss(1))), 8));
      starterCosts.push(randSeedInt(9 - starterCosts[0], 1));
      starterCosts.push(10 - (starterCosts[0] + starterCosts[1]));

      for (let c = 0; c < starterCosts.length; c++) {
        const cost = starterCosts[c];
        const costSpecies = Object.keys(speciesStarterCosts)
          .map(s => Number.parseInt(s) as Species)
          .filter(s => speciesStarterCosts[s] === cost);
        const randPkmSpecies = getPokemonSpecies(randSeedItem(costSpecies));
        const starterSpecies = getPokemonSpecies(
          randPkmSpecies.getTrainerSpeciesForLevel(startingLevel, true, PartyMemberStrength.STRONGER),
        );
        starters.push(getDailyRunStarter(starterSpecies, startingLevel));
      }
    },
    0,
    seed,
  );

  return starters;
}

function getDailyRunStarter(
  starterSpeciesForm: PokemonSpeciesForm,
  startingLevel: number,
  shiny: boolean | undefined = undefined,
  variant: Variant | undefined = undefined,
  moveset: StarterMoveset | undefined = undefined,
): Starter {
  const starterSpecies =
    starterSpeciesForm instanceof PokemonSpecies ? starterSpeciesForm : getPokemonSpecies(starterSpeciesForm.speciesId);
  const formIndex = starterSpeciesForm instanceof PokemonSpecies ? undefined : starterSpeciesForm.formIndex;
  const pokemon = new PlayerPokemon(
    starterSpecies,
    startingLevel,
    undefined,
    formIndex,
    undefined,
    shiny,
    variant,
    undefined,
    undefined,
    undefined,
  );
  const starter: Starter = {
    species: starterSpecies,
    dexAttr: pokemon.getDexAttr(),
    abilityIndex: pokemon.abilityIndex,
    passive: false,
    nature: pokemon.getNature(),
    pokerus: pokemon.pokerus,
    moveset: moveset,
  };
  pokemon.destroy();
  return starter;
}

interface BiomeWeights {
  [key: number]: number;
}

// Initially weighted by amount of exits each biome has
// Town and End are set to 0 however
// And some other biomes were balanced +1/-1 based on average size of the total daily.
const dailyBiomeWeights: BiomeWeights = {
  [Biome.CAVE]: 3,
  [Biome.LAKE]: 3,
  [Biome.PLAINS]: 3,
  [Biome.SNOWY_FOREST]: 3,
  [Biome.SWAMP]: 3, // 2 -> 3
  [Biome.TALL_GRASS]: 3, // 2 -> 3

  [Biome.ABYSS]: 2, // 3 -> 2
  [Biome.RUINS]: 2,
  [Biome.BADLANDS]: 2,
  [Biome.BEACH]: 2,
  [Biome.CONSTRUCTION_SITE]: 2,
  [Biome.DESERT]: 2,
  [Biome.DOJO]: 2, // 3 -> 2
  [Biome.FACTORY]: 2,
  [Biome.FAIRY_CAVE]: 2,
  [Biome.FOREST]: 2,
  [Biome.GRASS]: 2, // 1 -> 2
  [Biome.MEADOW]: 2,
  [Biome.MOUNTAIN]: 2, // 3 -> 2
  [Biome.SEA]: 2,
  [Biome.SEABED]: 2,
  [Biome.SLUM]: 2,
  [Biome.TEMPLE]: 2, // 3 -> 2
  [Biome.VOLCANO]: 2,

  [Biome.GRAVEYARD]: 1,
  [Biome.ICE_CAVE]: 1,
  [Biome.ISLAND]: 1,
  [Biome.JUNGLE]: 1,
  [Biome.LABORATORY]: 1,
  [Biome.METROPOLIS]: 1,
  [Biome.POWER_PLANT]: 1,
  [Biome.SPACE]: 1,
  [Biome.WASTELAND]: 1,

  [Biome.TOWN]: 0,
  [Biome.END]: 0,
};

/**
 * Either gets a starting biome from
 * @returns True if it is a Daily Event Seed.
 */
export function getDailyStartingBiome(): Biome {
  if (isDailyEventSeed(globalScene.seed)) {
    const eventSeedBiome = getDailyEventSeedBiome(globalScene.seed);
    if (eventSeedBiome) {
      return eventSeedBiome.startingBiome;
    }
  }

  const biomes = getEnumValues(Biome).filter(b => b !== Biome.TOWN && b !== Biome.END);

  let totalWeight = 0;
  const biomeThresholds: number[] = [];
  for (const biome of biomes) {
    // Keep track of the total weight
    totalWeight += dailyBiomeWeights[biome];

    // Keep track of each biomes cumulative weight
    biomeThresholds.push(totalWeight);
  }

  const randInt = randSeedInt(totalWeight);

  for (let i = 0; i < biomes.length; i++) {
    if (randInt < biomeThresholds[i]) {
      return biomes[i];
    }
  }

  // Fallback in case something went wrong
  return biomes[randSeedInt(biomes.length)];
}

/**
 * Checks if the current GameMode is Daily
 * and whether the Seed is longer than the default 24.
 * This indicates that it is a custom event seed.
 * @returns True if it is a Daily Event Seed.
 */
export function isDailyEventSeed(seed: string): boolean {
  return globalScene.gameMode.isDaily && seed.length > 24;
}

/**
 * Expects the seed to contain: /starter\d{21}/
 * Where each Starter is 4 digits for the SpeciesId, 2 digits for the FormIndex and 1 digit for Shiny Variant.
 * @returns An {@linkcode Starter[]} containing the starters or null if invalid.
 */
export function getDailyEventSeedStarters(seed: string): Starter[] | null {
  if (!isDailyEventSeed(seed)) {
    return null;
  }

  const starters: Starter[] = [];
  const match = /starter(\d{4})(\d{2})(\d)(\d{4})(\d{2})(\d)(\d{4})(\d{2})(\d)/g.exec(seed);
  if (match && match.length === 10) {
    const movesets = getDailyEventSeedStarterMoveset(seed);
    for (let i = 1; i < match.length; i += 3) {
      const speciesId = Number.parseInt(match[i]) as Species;
      const formIndex = Number.parseInt(match[i + 1]);

      // 0 = not shiny, 1 = shiny, 2 = rare, 3 = epic
      const shiny = Number.parseInt(match[i + 2]);
      const isShiny = shiny > 0 ? true : undefined;
      const variant = isShiny ? ((shiny - 1) as Variant) : undefined;

      const starterForm = getPokemonSpeciesForm(speciesId, formIndex);
      const startingLevel = globalScene.gameMode.getStartingLevel();
      const moveset = movesets ? movesets[(i - 1) / 3] : undefined;
      const starter = getDailyRunStarter(starterForm, startingLevel, isShiny, variant, moveset);
      starters.push(starter);
    }

    return starters;
  }

  return null;
}

export interface DailyEventSeedBoss {
  speciesForm: PokemonSpeciesForm;
  isShiny: boolean | undefined;
  variant: Variant | undefined;
}

/**
 * Expects the seed to contain: /boss\d{7}/
 * Where the boss is 4 digits for the SpeciesId, 2 digits for the FormIndex and 1 digit for the Shiny Variant.
 * @returns A {@linkcode DailyEventSeedBoss} containing the boss or null if invalid.
 */
export function getDailyEventSeedBoss(seed: string): DailyEventSeedBoss | null {
  if (!isDailyEventSeed(seed)) {
    return null;
  }

  const match = /boss(\d{4})(\d{2})(\d)/g.exec(seed);
  if (match && match.length === 4) {
    const speciesForm = getPokemonSpeciesForm(Number.parseInt(match[1]) as Species, Number.parseInt(match[2]));
    const shiny = Number.parseInt(match[3]);
    const isShiny = shiny > 0 ? true : undefined;
    const variant = isShiny ? ((shiny - 1) as Variant) : undefined;
    return {
      speciesForm,
      isShiny,
      variant,
    };
  }

  return null;
}

export interface DailyEventSeedBiome {
  startingBiome: Biome;
  forceAllLinks: boolean;
}

/**
 * Expects the seed to contain: /biome\d{2}all/ or /biome\d{2}ran/
 * Where the biome is 2 digits for the BiomeId and then either "all" or "ran" for All links forced or Random links.
 * @returns A {@linkcode DailyEventSeedBiome} containing the Biome or null if invalid.
 */
export function getDailyEventSeedBiome(seed: string): DailyEventSeedBiome | null {
  if (!isDailyEventSeed(seed)) {
    return null;
  }

  const match = /biome(\d{2})(all|ran)/g.exec(seed);
  if (match && match.length === 3) {
    const startingBiome = Number.parseInt(match[1]) as Biome;
    let forceAllLinks = false;
    if (match[2] === "all") {
      forceAllLinks = true;
    }

    return {
      startingBiome,
      forceAllLinks,
    };
  }

  return null;
}

/**
 * Expects the seed to contain: /smove\d{48}/
 * Where each Starter has 4 sets of 4 digits for the MoveIds
 * @returns An array of {@linkcode StarterMoveset}s containing the movesets or null if invalid.
 */
export function getDailyEventSeedStarterMoveset(seed: string): StarterMoveset[] | null {
  if (!isDailyEventSeed(seed)) {
    return null;
  }

  const match = /smove(\d{4})(\d{4})(\d{4})(\d{4})(\d{4})(\d{4})(\d{4})(\d{4})(\d{4})(\d{4})(\d{4})(\d{4})/g.exec(seed);
  if (match && match.length === 13) {
    const moves: StarterMoveset[] = [];
    for (let i = 1; i < match.length; i += 4) {
      const starterMoveset = match.slice(i, i + 4).map(m => Number.parseInt(m) as Moves);
      moves.push(starterMoveset as StarterMoveset);
    }

    return moves;
  }

  return null;
}

/**
 * Expects the seed to contain: /bmove\d{16}/
 * Where the Boss has 4 sets of 4 digits for the MoveIds
 * @returns An array of {@linkcode PokemonMove}s containing the movesets or null if invalid.
 */
export function getDailyEventSeedBossMoveset(seed: string): PokemonMove[] | null {
  if (!isDailyEventSeed(seed)) {
    return null;
  }

  const match = /bmove(\d{4})(\d{4})(\d{4})(\d{4})/g.exec(seed);
  if (match && match.length === 5) {
    const moves = match.slice(1).map(m => new PokemonMove(Number.parseInt(m) as Moves));
    return moves;
  }

  return null;
}

/**
 * Expects the seed to contain: /luck\d{2}/
 * Where the Luck has 2 digits for the number.
 * @returns A {@linkcode number} representing the Daily Luck value or null if invalid.
 */
export function getDailyEventSeedLuck(seed: string): number | null {
  if (!isDailyEventSeed(seed)) {
    return null;
  }

  const match = /luck(\d{2})/g.exec(seed);
  if (match && match.length === 2) {
    return Number.parseInt(match[1]);
  }

  return null;
}
