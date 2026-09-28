import type { BlockColor, GateSpec, LevelSpec } from "./types";

/**
 * Frame-backed star-exit structural repair.
 *
 * Lv100 is the only requested level whose pristine opening records the full
 * two-colour board, every starred block, and all four exit bindings/counters.
 * The remaining requested levels stay explicit blockers: their sampled truth
 * either shows starred blocks without a recorded star exit, or leaves the
 * star/frozen exit colour and rail bindings unclear.
 */
export const COMPETITOR_STAR_EXIT_STRUCTURAL_BATCH_VERSION =
  "competitor-star-exit-structural-r1" as const;

export const COMPETITOR_STAR_EXIT_STRUCTURAL_LEVEL_IDS = [100] as const;
export const COMPETITOR_STAR_EXIT_STRUCTURAL_BLOCKED_LEVEL_IDS = [102, 104, 118, 131, 163] as const;

export const COMPETITOR_STAR_EXIT_STRUCTURAL_BLOCKERS: Readonly<Record<number, string>> = {
  102: "The opening proves green and purple SQ2 star blocks, but both countdown covers hide the later routing and the truth records no visible star exit; a solvable star-gate colour/rail cannot be inferred.",
  104: "The opening proves red and yellow star blocks while the seven frozen exits have unclear colours/rails and no star exit is recorded; removing the current star exits is statically unsatisfiable.",
  118: "The opening proves at least one cyan star block but records no star exit and leaves six frozen-exit colour/rail bindings unclear; any target gate would be guessed.",
  131: "The frame proves blue-left and yellow-right star exits, but the source star inventory is only a lower bound and the two frozen-exit colours/sizes are unclear; the current block geometry cannot be rebound without an unproven full-layout rewrite.",
  163: "The frame proves one star exit and two red star blocks, but the star exit side/colour/size and all seven frozen-exit colour/rail bindings are explicitly unclear; a routable exact binding is not source-proven.",
};

interface Lv100BlockBinding {
  color: BlockColor;
  star: boolean;
}

/** Exact 3x4 SQ2 opening read from 91-100.mp4 at 00:22:29.500. */
export const COMPETITOR_STAR_EXIT_LV100_BLOCKS: Readonly<Record<string, Lv100BlockBinding>> = {
  "0,0": { color: "yellow", star: false },
  "2,0": { color: "green", star: true },
  "4,0": { color: "yellow", star: true },
  "0,2": { color: "green", star: true },
  "2,2": { color: "yellow", star: true },
  "4,2": { color: "green", star: false },
  "0,4": { color: "yellow", star: false },
  "2,4": { color: "green", star: true },
  "4,4": { color: "yellow", star: true },
  "0,6": { color: "green", star: true },
  "2,6": { color: "yellow", star: false },
  "4,6": { color: "green", star: false },
};

/**
 * Exact semantic bindings: green ordinary frozen 6 (top), yellow ordinary
 * open (bottom), yellow star frozen 3 (left), green star frozen 8 (right).
 */
export const COMPETITOR_STAR_EXIT_LV100_GATES: readonly GateSpec[] = [
  {
    id: "competitor-star-100-green-ordinary",
    side: "top",
    offset: 2,
    size: 2,
    color: "green",
    frozen: 6,
  },
  {
    id: "competitor-star-100-yellow-ordinary",
    side: "bottom",
    offset: 2,
    size: 2,
    color: "yellow",
  },
  {
    id: "competitor-star-100-yellow-star",
    side: "left",
    offset: 2,
    size: 2,
    color: "yellow",
    frozen: 3,
    star: true,
  },
  {
    id: "competitor-star-100-green-star",
    side: "right",
    offset: 2,
    size: 2,
    color: "green",
    frozen: 8,
    star: true,
  },
] as const;

const repairLv100 = (level: LevelSpec): LevelSpec => {
  if (level.blocks.length !== Object.keys(COMPETITOR_STAR_EXIT_LV100_BLOCKS).length) {
    throw new Error(`Lv100 star-exit repair expected 12 blocks, received ${level.blocks.length}`);
  }
  const seen = new Set<string>();
  const blocks = level.blocks.map((block) => {
    const key = `${block.x},${block.y}`;
    const binding = COMPETITOR_STAR_EXIT_LV100_BLOCKS[key];
    if (!binding || seen.has(key)) throw new Error(`Lv100 star-exit repair has no unique binding for ${block.id} at ${key}`);
    seen.add(key);
    const { star: _star, layers: _layers, ...plain } = block;
    return {
      ...plain,
      color: binding.color,
      ...(binding.star ? { star: true } : {}),
    };
  });
  return {
    ...level,
    blocks,
    gates: COMPETITOR_STAR_EXIT_LV100_GATES.map((gate) => ({ ...gate })),
  };
};

export const applyCompetitorStarExitStructuralBatch = (level: LevelSpec): LevelSpec => (
  level.id === 100 ? repairLv100(level) : level
);
