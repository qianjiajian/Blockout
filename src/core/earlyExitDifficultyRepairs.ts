import type { BlockColor, LevelSpec } from "./types";
import { VIDEO_PARITY_LEVELS } from "./videoParityLevels.generated";

/**
 * Post-pipeline repair for the early level whose later adjacency overlays
 * replaced the source exit contract and collapsed its certified move floor.
 *
 * This module is deliberately independent from `levels.ts`: callers can place
 * it after every geometry/adjacency overlay once the shared pipeline is ready.
 */
export const EARLY_EXIT_DIFFICULTY_REPAIR_VERSION = "lv8-exact-exits-floor7-r1" as const;

const SOURCE = VIDEO_PARITY_LEVELS.find(({ id }) => id === 8);
if (!SOURCE) throw new Error("Lv8 source level is missing");

/** The eight minimum colour changes found by exhaustive graph colouring. */
const COLOR_REPAIRS = new Map<string, BlockColor>([
  ["cc-piece-06", "green"],
  ["strategy-guard-09", "purple"],
  ["cc-piece-10", "cyan"],
  ["cc-piece-13", "blue"],
  ["cc-piece-16", "cyan"],
  ["cc-piece-17", "purple"],
  ["cc-piece-24", "blue"],
  ["cc-piece-25", "cyan"],
]);

const EXPECTED_GATES = "top:5:1:green:9|bottom:0:1:blue:17|right:5:3:cyan:0|bottom:1:3:purple:0";
const gateContract = SOURCE.gates
  .map(({ side, offset, size, color, frozen = 0 }) => `${side}:${offset}:${size}:${color}:${frozen}`)
  .join("|");
if (gateContract !== EXPECTED_GATES) throw new Error("Lv8 exact exit source contract drifted");
if (SOURCE.blocks.length !== 25 || [...COLOR_REPAIRS.keys()].some((id) => !SOURCE.blocks.some((block) => block.id === id))) {
  throw new Error("Lv8 source block order or identifiers drifted");
}

const buildLevel8Candidate = (): LevelSpec => ({
  ...SOURCE,
  playable: SOURCE.playable?.map(([x, y]) => [x, y]),
  gates: SOURCE.gates.map((gate) => gate.portals ? ({
    ...gate,
    portals: gate.portals.map((portal) => ({ ...portal, origin: [...portal.origin] as [number, number] })),
  }) : ({ ...gate })),
  blocks: SOURCE.blocks.map((block) => block.layers ? ({
    ...block,
    color: COLOR_REPAIRS.get(block.id) ?? block.color,
    shape: block.shape.map(([x, y]) => [x, y]),
    layers: [...block.layers],
  }) : ({
    ...block,
    color: COLOR_REPAIRS.get(block.id) ?? block.color,
    shape: block.shape.map(([x, y]) => [x, y]),
  })),
  designTargets: SOURCE.designTargets ? { ...SOURCE.designTargets } : undefined,
});

/** Standalone proof input, intentionally not wired into the campaign here. */
export const EARLY_EXIT_DIFFICULTY_REPAIR_LEVELS: LevelSpec[] = [buildLevel8Candidate()];

/** Apply after the final adjacency/board overlays; every other level is untouched. */
export const applyEarlyExitDifficultyRepair = (level: LevelSpec): LevelSpec => (
  level.id === 8 ? buildLevel8Candidate() : level
);
