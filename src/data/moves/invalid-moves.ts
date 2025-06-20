import { MoveId } from "#enums/move-id";

/** Set of moves that cannot be called by {@linkcode MoveId.METRONOME | Metronome}. */
export const invalidMetronomeMoves: ReadonlySet<MoveId> = new Set([
  MoveId.AFTER_YOU,
  MoveId.ASSIST,
  MoveId.BANEFUL_BUNKER,
  MoveId.BEAK_BLAST,
  MoveId.BELCH,
  MoveId.BESTOW,
  MoveId.COMEUPPANCE,
  MoveId.COPYCAT,
  MoveId.COUNTER,
  MoveId.CRAFTY_SHIELD,
  MoveId.DESTINY_BOND,
  MoveId.DETECT,
  MoveId.ENDURE,
  MoveId.FEINT,
  MoveId.FOCUS_PUNCH,
  MoveId.FOLLOW_ME,
  MoveId.HELPING_HAND,
  MoveId.INSTRUCT,
  MoveId.KINGS_SHIELD,
  MoveId.MAT_BLOCK,
  MoveId.ME_FIRST,
  MoveId.METRONOME,
  MoveId.MIMIC,
  MoveId.MIRROR_COAT,
  MoveId.MIRROR_MOVE,
  MoveId.OBSTRUCT,
  MoveId.PROTECT,
  MoveId.QUASH,
  MoveId.QUICK_GUARD,
  MoveId.RAGE_POWDER,
  MoveId.REVIVAL_BLESSING,
  MoveId.SHELL_TRAP,
  MoveId.SILK_TRAP,
  MoveId.SKETCH,
  MoveId.SLEEP_TALK,
  MoveId.SNATCH,
  MoveId.SNORE,
  MoveId.SPIKY_SHIELD,
  MoveId.SPOTLIGHT,
  MoveId.STRUGGLE,
  MoveId.TRANSFORM,
  MoveId.WIDE_GUARD,
]);

/** Set of moves that cannot be called by {@linkcode MoveId.ASSIST Assist} */
export const invalidAssistMoves: ReadonlySet<MoveId> = new Set([
  MoveId.ASSIST,
  MoveId.BANEFUL_BUNKER,
  MoveId.BEAK_BLAST,
  MoveId.BELCH,
  MoveId.BESTOW,
  MoveId.BOUNCE,
  MoveId.CELEBRATE,
  MoveId.CHATTER,
  MoveId.CIRCLE_THROW,
  MoveId.COPYCAT,
  MoveId.COUNTER,
  MoveId.DESTINY_BOND,
  MoveId.DETECT,
  MoveId.DIG,
  MoveId.DIVE,
  MoveId.DRAGON_TAIL,
  MoveId.ENDURE,
  MoveId.FEINT,
  MoveId.FLY,
  MoveId.FOCUS_PUNCH,
  MoveId.FOLLOW_ME,
  MoveId.HELPING_HAND,
  MoveId.HOLD_HANDS,
  MoveId.KINGS_SHIELD,
  MoveId.MAT_BLOCK,
  MoveId.ME_FIRST,
  MoveId.METRONOME,
  MoveId.MIMIC,
  MoveId.MIRROR_COAT,
  MoveId.MIRROR_MOVE,
  MoveId.NATURE_POWER,
  MoveId.PHANTOM_FORCE,
  MoveId.PROTECT,
  MoveId.RAGE_POWDER,
  MoveId.ROAR,
  MoveId.SHADOW_FORCE,
  MoveId.SHELL_TRAP,
  MoveId.SKETCH,
  MoveId.SKY_DROP,
  MoveId.SLEEP_TALK,
  MoveId.SNATCH,
  MoveId.SPIKY_SHIELD,
  MoveId.SPOTLIGHT,
  MoveId.STRUGGLE,
  MoveId.SWITCHEROO,
  MoveId.TRANSFORM,
  MoveId.TRICK,
  MoveId.WHIRLWIND,
]);

/** Set of moves that cannot be called by {@linkcode MoveId.SLEEP_TALK Sleep Talk} */
export const invalidSleepTalkMoves: ReadonlySet<MoveId> = new Set([
  MoveId.ASSIST,
  MoveId.BELCH,
  MoveId.BEAK_BLAST,
  MoveId.BIDE,
  MoveId.BOUNCE,
  MoveId.COPYCAT,
  MoveId.DIG,
  MoveId.DIVE,
  MoveId.FREEZE_SHOCK,
  MoveId.FLY,
  MoveId.FOCUS_PUNCH,
  MoveId.GEOMANCY,
  MoveId.ICE_BURN,
  MoveId.ME_FIRST,
  MoveId.METRONOME,
  MoveId.MIRROR_MOVE,
  MoveId.MIMIC,
  MoveId.PHANTOM_FORCE,
  MoveId.RAZOR_WIND,
  MoveId.SHADOW_FORCE,
  MoveId.SHELL_TRAP,
  MoveId.SKETCH,
  MoveId.SKULL_BASH,
  MoveId.SKY_ATTACK,
  MoveId.SKY_DROP,
  MoveId.SLEEP_TALK,
  MoveId.SOLAR_BLADE,
  MoveId.SOLAR_BEAM,
  MoveId.STRUGGLE,
  MoveId.UPROAR,
]);

/** Set of moves that cannot be copied by {@linkcode MoveId.COPYCAT Copycat} */
export const invalidCopycatMoves: ReadonlySet<MoveId> = new Set([
  MoveId.ASSIST,
  MoveId.BANEFUL_BUNKER,
  MoveId.BEAK_BLAST,
  MoveId.BESTOW,
  MoveId.CELEBRATE,
  MoveId.CHATTER,
  MoveId.CIRCLE_THROW,
  MoveId.COPYCAT,
  MoveId.COUNTER,
  MoveId.DESTINY_BOND,
  MoveId.DETECT,
  MoveId.DRAGON_TAIL,
  MoveId.ENDURE,
  MoveId.FEINT,
  MoveId.FOCUS_PUNCH,
  MoveId.FOLLOW_ME,
  MoveId.HELPING_HAND,
  MoveId.HOLD_HANDS,
  MoveId.KINGS_SHIELD,
  MoveId.MAT_BLOCK,
  MoveId.ME_FIRST,
  MoveId.METRONOME,
  MoveId.MIMIC,
  MoveId.MIRROR_COAT,
  MoveId.MIRROR_MOVE,
  MoveId.PROTECT,
  MoveId.RAGE_POWDER,
  MoveId.ROAR,
  MoveId.SHELL_TRAP,
  MoveId.SKETCH,
  MoveId.SLEEP_TALK,
  MoveId.SNATCH,
  MoveId.SPIKY_SHIELD,
  MoveId.SPOTLIGHT,
  MoveId.STRUGGLE,
  MoveId.SWITCHEROO,
  MoveId.TRANSFORM,
  MoveId.TRICK,
  MoveId.WHIRLWIND,
]);

export const invalidMirrorMoveMoves: ReadonlySet<MoveId> = new Set([
  MoveId.ACUPRESSURE,
  MoveId.AFTER_YOU,
  MoveId.AROMATIC_MIST,
  MoveId.BEAK_BLAST,
  MoveId.BELCH,
  MoveId.CHILLY_RECEPTION,
  MoveId.COACHING,
  MoveId.CONVERSION_2,
  MoveId.COUNTER,
  MoveId.CRAFTY_SHIELD,
  MoveId.CURSE,
  MoveId.DECORATE,
  MoveId.DOODLE,
  MoveId.DOOM_DESIRE,
  MoveId.DRAGON_CHEER,
  MoveId.ELECTRIC_TERRAIN,
  MoveId.FINAL_GAMBIT,
  MoveId.FLORAL_HEALING,
  MoveId.FLOWER_SHIELD,
  MoveId.FOCUS_PUNCH,
  MoveId.FUTURE_SIGHT,
  MoveId.GEAR_UP,
  MoveId.GRASSY_TERRAIN,
  MoveId.GRAVITY,
  MoveId.GUARD_SPLIT,
  MoveId.HAIL,
  MoveId.HAZE,
  MoveId.HEAL_PULSE,
  MoveId.HELPING_HAND,
  MoveId.HOLD_HANDS,
  MoveId.INSTRUCT,
  MoveId.ION_DELUGE,
  MoveId.MAGNETIC_FLUX,
  MoveId.MAT_BLOCK,
  MoveId.ME_FIRST,
  MoveId.MIMIC,
  MoveId.MIRROR_COAT,
  MoveId.MIRROR_MOVE,
  MoveId.MIST,
  MoveId.MISTY_TERRAIN,
  MoveId.MUD_SPORT,
  MoveId.PERISH_SONG,
  MoveId.POWER_SPLIT,
  MoveId.PSYCH_UP,
  MoveId.PSYCHIC_TERRAIN,
  MoveId.PURIFY,
  MoveId.QUICK_GUARD,
  MoveId.RAIN_DANCE,
  MoveId.REFLECT_TYPE,
  MoveId.ROLE_PLAY,
  MoveId.ROTOTILLER,
  MoveId.SANDSTORM,
  MoveId.SHELL_TRAP,
  MoveId.SKETCH,
  MoveId.SNOWSCAPE,
  MoveId.SPIT_UP,
  MoveId.SPOTLIGHT,
  MoveId.STRUGGLE,
  MoveId.SUNNY_DAY,
  MoveId.TEATIME,
  MoveId.TRANSFORM,
  MoveId.WATER_SPORT,
  MoveId.WIDE_GUARD,
]);

/** Set of moves that can never have their type overridden by an ability like Pixilate or Normalize
 *
 * Excludes tera blast and tera starstorm, as these are only conditionally forbidden
 */
export const noAbilityTypeOverrideMoves: ReadonlySet<MoveId> = new Set([
  MoveId.WEATHER_BALL,
  MoveId.JUDGMENT,
  MoveId.REVELATION_DANCE,
  MoveId.MULTI_ATTACK,
  MoveId.TERRAIN_PULSE,
  MoveId.NATURAL_GIFT,
  MoveId.TECHNO_BLAST,
  MoveId.HIDDEN_POWER,
]);

/** Set of all moves that cannot be copied by {@linkcode Moves.SKETCH}. */
export const invalidSketchMoves: ReadonlySet<MoveId> = new Set([
  MoveId.NONE,
  MoveId.CHATTER,
  MoveId.MIRROR_MOVE,
  MoveId.SLEEP_TALK,
  MoveId.STRUGGLE,
  MoveId.SKETCH,
  MoveId.REVIVAL_BLESSING,
  MoveId.TERA_STARSTORM,
  MoveId.BREAKNECK_BLITZ__PHYSICAL,
  MoveId.BREAKNECK_BLITZ__SPECIAL,
]);

/** Set of all moves that cannot be locked into by {@linkcode Moves.ENCORE}. */
export const invalidEncoreMoves: ReadonlySet<MoveId> = new Set([
  MoveId.MIMIC,
  MoveId.MIRROR_MOVE,
  MoveId.TRANSFORM,
  MoveId.STRUGGLE,
  MoveId.SKETCH,
  MoveId.SLEEP_TALK,
  MoveId.ENCORE,
]);
