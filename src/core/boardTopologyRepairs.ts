import type { GeneratorSpec, LevelSpec, Point, Side } from "./types";

/**
 * A formal irregular board may change only along its outside outline. These
 * additions fill enclosed voids and minimally join split playable islands;
 * Lv43's legacy interior wall is removed by the same overlay.
 *
 * Coordinates are packed as base-36 x/y pairs to keep the runtime patch tiny.
 */
const PACKED_ADDITIONS: Readonly<Record<number, string>> = {
  24: "112131132333",
  25: "12223242",
  26: "34",
  27: "35453646",
  30: "36",
  33: "2131511222425214341525",
  43: "091929",
  46: "16",
  47: "36",
  48: "22",
  59: "2a",
  61: "23",
  71: "34",
  72: "2b",
  83: "182819",
  84: "23",
  114: "36",
  115: "103003041535",
  130: "24",
  156: "1060246667",
  176: "44",
  179: "576768",
  195: "46",
};

type PackedGeneratorPlacement = readonly [Side, number, number, number, 0 | 1 | 2 | 3];
const GENERATOR_PLACEMENTS: Readonly<Record<number, Readonly<Record<string, PackedGeneratorPlacement>>>> = {
  43: {
    "vp-043-generator-1": ["left", 1, 0, 1.5, 3],
    "vp-043-generator-2": ["left", 4, 0, 4.5, 3],
    "vp-043-generator-3": ["left", 7, 0, 7.5, 3],
    "vp-043-generator-4": ["bottom", 1, 1.5, 10, 2],
    "vp-043-generator-5": ["right", 7, 7, 7.5, 1],
    "vp-043-generator-6": ["bottom", 4, 4.5, 9, 2],
  },
  156: {
    "lv156-generator-1": ["left", 2, 2, 2.5, 3],
    "lv156-generator-3": ["right", 2, 6, 2.5, 1],
  },
};

export const BOARD_TOPOLOGY_REPAIR_VERSION = "outline-only-board-topology-v1" as const;
export const BOARD_TOPOLOGY_REPAIR_LEVEL_IDS = Object.freeze(
  Object.keys(PACKED_ADDITIONS).map(Number),
);

const rectangularCells = (width: number, height: number): Point[] => Array.from(
  { length: height },
  (_, y) => Array.from({ length: width }, (__, x) => [x, y] as const),
).flat();

export const applyBoardTopologyRepair = (level: LevelSpec): LevelSpec => {
  const packed = PACKED_ADDITIONS[level.id];
  if (packed === undefined) return level;

  const height = level.id === 43 ? 10 : level.height;
  const playable = [...(level.playable ?? rectangularCells(level.width, level.height))];
  const present = new Set(playable.map(([x, y]) => `${x},${y}`));
  for (let index = 0; index < packed.length; index += 2) {
    const cell = [parseInt(packed[index], 36), parseInt(packed[index + 1], 36)] as const;
    if (!present.has(`${cell[0]},${cell[1]}`)) playable.push(cell);
  }
  playable.sort((left, right) => left[1] - right[1] || left[0] - right[0]);

  const { blocked: _blocked, ...withoutBlocked } = level;
  const placements = GENERATOR_PLACEMENTS[level.id];
  const generators = placements && level.generators?.map((generator): GeneratorSpec => {
    const placement = placements[generator.id];
    if (!placement) return generator;
    const [side, offset, x, y, quarterTurns] = placement;
    return { ...generator, side, offset, rimSpan: 3, rimMount: "rim", rimAnchor: { x, y, quarterTurns } };
  });
  return {
    ...withoutBlocked,
    height,
    playable,
    ...(generators ? { generators } : {}),
  };
};
