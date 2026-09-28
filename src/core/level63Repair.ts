import type { BlockSpec, LevelSpec, Point } from "./types";

const H2: Point[] = [[0, 0], [1, 0]];
const H3: Point[] = [[0, 0], [1, 0], [2, 0]];
const L3: Point[] = [[0, 0], [0, 1], [1, 1]];
const S1: Point[] = [[0, 0]];
const S2x2: Point[] = [[0, 0], [1, 0], [0, 1], [1, 1]];

type Placement = readonly [string, Point, Point[]];

/**
 * v1.64: regenerate Lv63 after the old green L3 opening-clear route was
 * rejected by the fixed full-shape exit contract.  The green pieces no longer
 * occupy the green top portal at the opening. Three non-green portals are
 * ordinary at the opening so the board has a real release chain; their first
 * clears then thaw the remaining counters. Board geometry, block identities,
 * colours and native (unrotated) footprints remain otherwise unchanged.
 */
const ACTIVE_LAYOUT: readonly Placement[] = [
  ["v146-63-opening-4", [4, 1], H2],
  ["v146-63-opening-2", [5, 2], S1],
  ["v146-63-opening-13", [0, 1], L3],
  ["v146-63-opening-5", [2, 0], H2],
  ["v146-63-opening-6", [1, 1], H2],
  ["v146-63-opening-14", [2, 2], L3],
  ["v146-63-opening-1", [3, 4], S1],
  ["v146-63-opening-10", [4, 3], S2x2],
  ["v146-63-opening-7", [4, 0], H2],
  ["v146-63-opening-16", [0, 4], H3],
  ["v146-63-opening-11", [3, 7], H3],
  ["v146-63-opening-8", [0, 0], H2],
  ["v146-63-opening-3", [0, 3], H2],
  ["v146-63-opening-15", [3, 1], L3],
  ["v146-63-opening-18", [0, 5], S2x2],
  ["v146-63-opening-17", [2, 5], S2x2],
  ["v146-63-opening-9", [4, 5], S2x2],
  ["v146-63-opening-12", [0, 7], H3],
];

const cloneShape = (shape: readonly Point[]): Point[] => shape.map(([x, y]) => [x, y] as Point);

export const applyLevel63Repair = (source: LevelSpec): LevelSpec => {
  if (source.id !== 63) return source;
  const sourceBlocks = new Map(source.blocks.map((block) => [block.id, block]));
  const blocks = ACTIVE_LAYOUT.map(([id, [x, y], shape]) => {
    const original = sourceBlocks.get(id);
    if (!original) throw new Error(`Lv63 repair missing source block ${id}`);
    return { ...original, id, x, y, shape: cloneShape(shape) };
  });
  const gates = source.gates.map((gate) => {
    if (!["v146-63-gate-pink", "v146-63-gate-red", "v146-63-gate-cyan"].includes(gate.id)) {
      return { ...gate };
    }
    const { frozen: _frozen, ...ordinary } = gate;
    return ordinary;
  });
  return { ...source, blocks, gates };
};
