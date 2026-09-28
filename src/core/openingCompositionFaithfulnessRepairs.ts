import type { LevelSpec } from "./types";

export const OPENING_COMPOSITION_FAITHFULNESS_VERSION = "opening-composition-faithful-a-r1" as const;

/**
 * This batch deliberately publishes no runtime overlay. Every investigated
 * level still violates at least one protected contract when its authoritative
 * opening count is restored. Keeping this list empty prevents an unproved
 * staging, recolour, geometry, or shutter substitution from reaching LEVELS.
 */
export const OPENING_COMPOSITION_FAITHFULNESS_LEVEL_IDS = [] as const;

export const OPENING_COMPOSITION_FAITHFULNESS_BLOCKERS = Object.freeze({
  50: "authoritative 13-piece layout solves, but has two same-colour contacts; 189 adjacency-clean coordinate candidates were solver-unsat",
  52: "authoritative 19-piece layout solves, but has four same-colour contacts; no overlap-free coordinate-only layout covered all four contacts",
  54: "exact four-panel geometry leaves 16 uncovered cells while the 10-piece authoritative opening occupies 18 cells; the missing authored block cannot be restored without false exposure or overlap",
  84: "authoritative panel capacities 9/6/6/12 are smaller than their mapped hidden footprints 12/9/6/15; the 12-piece canonical solver witness therefore fails true shutter coverage",
  107: "the adjacency-clean 18-piece candidate changes the raw colour histogram from green4/pink4 to green5/pink3",
  109: "authoritative 16-piece layout solves and replays, but has three same-colour contacts; 3000 coordinate-only candidates were solver-unsat",
  111: "authoritative 17-piece layout solves and replays, but has three same-colour contacts; 3000 coordinate-only candidates were solver-unsat",
} as const);

export const applyOpeningCompositionFaithfulnessRepair = (source: LevelSpec): LevelSpec => source;
