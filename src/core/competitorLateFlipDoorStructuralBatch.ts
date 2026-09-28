import type { BlockColor, FlipDoorSpec, LevelSpec } from "./types";

/**
 * Frame-backed late Flip Door structural repair.
 *
 * Lv152 is the only member of this batch whose source opening supplies every
 * datum needed for an exact, solver-certified projection: the four door rails
 * and initial states, the five shell colour pairs, the blue axis carrier and
 * all remaining opening colours.  The other requested levels remain explicit
 * blockers; this module never substitutes guessed colours or rails for them.
 */
export const COMPETITOR_LATE_FLIP_DOOR_STRUCTURAL_BATCH_VERSION =
  "competitor-late-flip-door-structural-r1" as const;

export const COMPETITOR_LATE_FLIP_DOOR_STRUCTURAL_LEVEL_IDS = [152] as const;
export const COMPETITOR_LATE_FLIP_DOOR_STRUCTURAL_BLOCKED_LEVEL_IDS = [60, 151, 163] as const;

export const COMPETITOR_LATE_FLIP_DOOR_STRUCTURAL_BLOCKERS: Readonly<Record<number, string>> = {
  60: "The video proves 35 axis blocks but does not record each arrow direction; restoring the generated all-vertical attributes conflicts with the final adjacency recolour and leaves axis-incompatible routes.",
  151: "The exact full-board opening and two-open/two-closed Flip Door cadence exceed the 30k solver budget; reclassifying the final exits alone exhausts immediately, so no guessed packing is accepted.",
  163: "The three Flip Doors are exact, but all seven frozen-exit colour/rail bindings and the single star-exit binding are source-unclear; adding only the doors removes required final routes.",
};

const LV152_SHELLS: Readonly<Record<string, readonly [BlockColor, BlockColor]>> = {
  "lv152-opening-b01": ["blue", "yellow"],
  "lv152-opening-b02": ["blue", "green"],
  "lv152-opening-b03": ["red", "green"],
  "lv152-opening-b04": ["yellow", "red"],
  "lv152-opening-b05": ["yellow", "red"],
};

const LV152_PLAIN_COLORS: Readonly<Record<string, BlockColor>> = {
  "lv152-opening-b06": "blue",
  "lv152-opening-b07": "green",
  "lv152-opening-b08": "green",
  "lv152-opening-b09": "green",
  "lv152-opening-b10": "red",
  "lv152-opening-b11": "yellow",
  "lv152-opening-b12": "red",
  "lv152-opening-b13": "green",
};

export const COMPETITOR_LATE_FLIP_DOOR_LV152_DOORS: readonly FlipDoorSpec[] = [
  {
    id: "competitor-late-flip-152-blue",
    side: "top",
    offset: 2,
    size: 2,
    color: "blue",
    initiallyOpen: true,
  },
  {
    id: "competitor-late-flip-152-green",
    side: "left",
    offset: 3,
    size: 2,
    color: "green",
    initiallyOpen: true,
  },
  {
    id: "competitor-late-flip-152-yellow",
    side: "right",
    offset: 3,
    size: 2,
    color: "yellow",
    initiallyOpen: false,
  },
  {
    id: "competitor-late-flip-152-red",
    side: "bottom",
    offset: 2,
    size: 2,
    color: "red",
    initiallyOpen: false,
  },
] as const;

const repairLv152 = (level: LevelSpec): LevelSpec => ({
  ...level,
  blocks: level.blocks.map((block) => {
    const shell = LV152_SHELLS[block.id];
    if (shell) return { ...block, color: shell[0], layers: [...shell] };
    const color = LV152_PLAIN_COLORS[block.id];
    if (!color) throw new Error(`Lv152 late Flip Door repair has no colour binding for ${block.id}`);
    const { layers: _layers, ...plain } = block;
    return { ...plain, color };
  }),
  gates: [],
  flipDoors: COMPETITOR_LATE_FLIP_DOOR_LV152_DOORS.map((door) => ({ ...door })),
});

export const applyCompetitorLateFlipDoorStructuralBatch = (level: LevelSpec): LevelSpec => (
  level.id === 152 ? repairLv152(level) : level
);
