import { shape, type BlockColor, type BlockSpec, type LevelSpec, type Point } from "./types";

const SINGLE = shape("#");
const H2 = shape("##");
const V2 = shape("#", "#");
const H3 = shape("###");
const V3 = shape("#", "#", "#");
const L3_A = shape("##", "#.");
const L3_B = shape("##", ".#");
const T4 = shape(".#.", "###");
const SQ2 = shape("##", "##");
const SQ3 = shape("###", "###", "###");

const occupiedKeys = (blocks: readonly BlockSpec[]): Set<string> => new Set(
  blocks.flatMap((block) => block.shape.map(([dx, dy]) => `${block.x + dx},${block.y + dy}`)),
);

const fillSingles = (
  playable: readonly Point[],
  solids: readonly BlockSpec[],
  colorFor: (index: number, point: Point) => BlockColor,
  prefix = "chip",
): BlockSpec[] => {
  const occupied = occupiedKeys(solids);
  return playable
    .filter(([x, y]) => !occupied.has(`${x},${y}`))
    .map(([x, y], index) => ({
      id: `${prefix}-${String(index + 1).padStart(2, "0")}`,
      x,
      y,
      shape: SINGLE,
      color: colorFor(index, [x, y]),
    }));
};

const base = (
  id: number,
  name: string,
  width: number,
  height: number,
  playable: Point[],
  parMoves: number,
): Omit<LevelSpec, "gates" | "blocks"> => ({
  id,
  name,
  width,
  height,
  playable,
  blocked: [],
  parMoves,
  difficulty: id < 4 ? "normal" : "hard",
  timeSeconds: id < 4 ? 180 : 150,
  reward: 15 + id * 5,
});

const lv1Playable = shape("#####.", "######", ".#####", ".#####", "..####");
const lv2Playable = shape(".#####", "######", "######", "######", "######", "######");
const lv3Playable = shape("######.", "######.", ".######", ".######", "######.", "######.");
const lv4Playable = shape("######.", ".######", "#####..", "..#####", "######.", "..##...");
const lv5Playable = shape("####.", "####.", "####.", ".####", ".####", ".####");
const lv6Playable = shape("#####.", ".#####", "#####.", ".#####", "#####.");
const lv7Playable = shape("#####.", "#####.", ".#####", ".#####", "#####.", "#####.", ".#####", ".#####");
const lv8Playable = shape("####..", "####..", "####..", ".###..", ".###..", ".#####", ".#####", ".#####");
const lv9Playable = shape("######.", "######.", ".######", ".######", "####...", "####...", "...####", "...####");
const lv10Playable = shape("######.", "#######", "#######", "#######", "#######", "#######", "#######");

const lv2Blocks: BlockSpec[] = [
  { id: "red-l", x: 1, y: 0, shape: L3_A, color: "red" },
  { id: "blue-l", x: 4, y: 0, shape: L3_B, color: "blue" },
  { id: "green-t", x: 1, y: 1, shape: T4, color: "green" },
  { id: "green-v3", x: 0, y: 3, shape: V3, color: "green" },
  { id: "yellow-v3", x: 1, y: 3, shape: V3, color: "yellow" },
  { id: "red-v3", x: 2, y: 3, shape: V3, color: "red" },
  { id: "purple-v3", x: 3, y: 3, shape: V3, color: "purple" },
  { id: "blue-v3", x: 4, y: 3, shape: V3, color: "blue" },
];

const lv3Positions: Point[] = [
  [0, 0], [2, 0], [4, 0],
  [1, 2], [3, 2], [5, 2],
  [0, 4], [2, 4], [4, 4],
];
const lv3Colors: BlockColor[] = [
  "red", "blue", "green",
  "yellow", "purple", "red",
  "purple", "blue", "yellow",
];
const lv3Blocks = lv3Positions.map(([x, y], index): BlockSpec => ({
  id: `square-${index + 1}`,
  x,
  y,
  shape: SQ2,
  color: lv3Colors[index]!,
}));

const lv4Bars: BlockSpec[] = [
  { id: "blue-bar-top", x: 0, y: 0, shape: H3, color: "blue" },
  { id: "green-bar-top", x: 3, y: 0, shape: H3, color: "green" },
  { id: "blue-bar-upper", x: 1, y: 1, shape: H3, color: "blue" },
  { id: "green-bar-upper", x: 4, y: 1, shape: H3, color: "green" },
  { id: "blue-bar-left", x: 0, y: 2, shape: H3, color: "blue" },
  { id: "green-bar-right", x: 4, y: 3, shape: H3, color: "green" },
];
const lv4SingleColors: BlockColor[] = ["red", "yellow", "purple", "orange", "pink", "cyan"];
const lv4Singles = fillSingles(
  lv4Playable,
  lv4Bars,
  (index) => lv4SingleColors[index % lv4SingleColors.length]!,
);

const lv5Bars: BlockSpec[] = [
  { id: "green-v3", x: 0, y: 0, shape: V3, color: "green" },
  { id: "red-v3", x: 4, y: 3, shape: V3, color: "red" },
];
const lv5Singles = fillSingles(
  lv5Playable,
  lv5Bars,
  (index, [x, y]) => (
    x === 3 && y === 0 ? "blue" : (["green", "red", "blue"] as const)[index % 3]!
  ),
);

const lv6Bars: BlockSpec[] = [
  { id: "red-h2-top", x: 0, y: 0, shape: H2, color: "red" },
  { id: "yellow-h2-right", x: 4, y: 1, shape: H2, color: "yellow" },
  { id: "green-h2-middle", x: 1, y: 3, shape: H2, color: "green" },
  { id: "red-h2-bottom", x: 3, y: 4, shape: H2, color: "red" },
];
const lv6Singles = fillSingles(
  lv6Playable,
  lv6Bars,
  (index) => (
    index < 10 ? "blue" : (["green", "yellow", "red"] as const)[(index - 10) % 3]!
  ),
);

const lv7Blocks: BlockSpec[] = [
  { id: "green-square-top", x: 0, y: 0, shape: SQ2, color: "green" },
  { id: "blue-v2-01", x: 2, y: 0, shape: V2, color: "blue" },
  { id: "blue-v2-02", x: 3, y: 0, shape: V2, color: "blue" },
  { id: "blue-v2-03", x: 4, y: 0, shape: V2, color: "blue" },
  { id: "red-square-upper", x: 4, y: 2, shape: SQ2, color: "red" },
  { id: "blue-v2-04", x: 1, y: 2, shape: V2, color: "blue" },
  { id: "blue-v2-05", x: 2, y: 2, shape: V2, color: "blue" },
  { id: "blue-v2-06", x: 3, y: 2, shape: V2, color: "blue" },
  { id: "blue-square-lower", x: 0, y: 4, shape: SQ2, color: "blue" },
  { id: "blue-v2-07", x: 2, y: 4, shape: V2, color: "blue" },
  { id: "blue-v2-08", x: 3, y: 4, shape: V2, color: "blue" },
  { id: "blue-v2-09", x: 4, y: 4, shape: V2, color: "blue" },
  { id: "red-square-bottom", x: 4, y: 6, shape: SQ2, color: "red" },
  { id: "green-v2-01", x: 1, y: 6, shape: V2, color: "green" },
  { id: "green-v2-02", x: 2, y: 6, shape: V2, color: "green" },
  { id: "red-v2-01", x: 3, y: 6, shape: V2, color: "red" },
];

const lv8Large: BlockSpec[] = [
  { id: "purple-large", x: 3, y: 5, shape: SQ3, color: "purple" },
];
const lv8Counters: Record<"blue" | "green" | "orange" | "purple", number> = {
  blue: 9,
  green: 8,
  orange: 4,
  purple: 3,
};
const lv8Singles = fillSingles(lv8Playable, lv8Large, (_index, [x, y]) => {
  if (x === 0 && y === 0 && lv8Counters.blue > 0) {
    lv8Counters.blue -= 1;
    return "blue";
  }
  if (x === 0 && y === 1 && lv8Counters.green > 0) {
    lv8Counters.green -= 1;
    return "green";
  }
  if (x === 5 && y >= 5 && lv8Counters.orange > 0) {
    lv8Counters.orange -= 1;
    return "orange";
  }
  for (const color of ["blue", "green", "orange", "purple"] as const) {
    if (lv8Counters[color] > 0) {
      lv8Counters[color] -= 1;
      return color;
    }
  }
  return "purple";
});

const lv9Positions: Point[] = [
  [0, 0], [2, 0], [4, 0],
  [1, 2], [3, 2], [5, 2],
  [0, 4], [2, 4],
  [3, 6], [5, 6],
];
const lv9Colors: BlockColor[] = [
  "blue", "blue", "blue", "blue", "blue", "blue",
  "green", "yellow", "purple", "orange",
];
const lv9Blocks = lv9Positions.map(([x, y], index): BlockSpec => ({
  id: `square-${index + 1}`,
  x,
  y,
  shape: SQ2,
  color: lv9Colors[index]!,
}));

const lv10Frozen: BlockSpec[] = [
  { id: "orange-square-19", x: 0, y: 0, shape: SQ2, color: "orange", frozen: 19 },
  { id: "purple-square-21", x: 2, y: 0, shape: SQ2, color: "purple", frozen: 21 },
  { id: "cyan-square-13", x: 4, y: 0, shape: SQ2, color: "cyan", frozen: 13 },
  { id: "cyan-square-12", x: 1, y: 2, shape: SQ2, color: "cyan", frozen: 12 },
  { id: "cyan-square-11", x: 3, y: 2, shape: SQ2, color: "cyan", frozen: 11 },
  { id: "purple-v3-22-a", x: 0, y: 4, shape: V3, color: "purple", frozen: 22 },
  { id: "purple-v3-22-b", x: 2, y: 4, shape: V3, color: "purple", frozen: 22 },
  { id: "orange-v3-19-a", x: 4, y: 4, shape: V3, color: "orange", frozen: 19 },
  { id: "orange-v3-19-b", x: 6, y: 4, shape: V3, color: "orange", frozen: 19 },
];
const lv10Singles = fillSingles(lv10Playable, lv10Frozen, (_index, [x, y]) => {
  if (x >= 5) return "red";
  if (x === 1 && y >= 4) return "green";
  return "yellow";
});

/**
 * Lv1–10 copy the observed competitor's playable-cell counts, exact block-shape
 * histograms, block counts, color counts, and early frozen-mechanic cadence.
 * Only the board silhouettes, block placement, and exit placement are original.
 */
export const CHAPTER_ONE_COMPETITOR_LEVELS: LevelSpec[] = [
  {
    ...base(1, "新手教程", 6, 5, lv1Playable, 3),
    gates: [
      { id: "blue-top", side: "top", offset: 0, size: 2, color: "blue" },
      { id: "green-right", side: "right", offset: 1, size: 2, color: "green" },
      { id: "red-bottom", side: "bottom", offset: 2, size: 2, color: "red" },
    ],
    blocks: [
      { id: "blue-square", x: 2, y: 0, shape: SQ2, color: "blue" },
      { id: "green-square", x: 4, y: 1, shape: SQ2, color: "green" },
      { id: "red-square", x: 2, y: 3, shape: SQ2, color: "red" },
    ],
    onboardingHint: { blockId: "blue-square", path: [[1, 0], [0, 0]] },
  },
  {
    ...base(2, "缺角拼形", 6, 6, lv2Playable, 9),
    gates: [
      { id: "red-top", side: "top", offset: 1, size: 2, color: "red" },
      { id: "blue-top", side: "top", offset: 4, size: 2, color: "blue" },
      { id: "green-left", side: "left", offset: 3, size: 3, color: "green" },
      { id: "yellow-bottom", side: "bottom", offset: 1, size: 1, color: "yellow" },
      { id: "purple-bottom", side: "bottom", offset: 3, size: 1, color: "purple" },
    ],
    blocks: lv2Blocks,
  },
  {
    ...base(3, "错层九宫", 7, 6, lv3Playable, 10),
    gates: [
      { id: "red-top", side: "top", offset: 0, size: 2, color: "red" },
      { id: "blue-top", side: "top", offset: 2, size: 2, color: "blue" },
      { id: "green-top", side: "top", offset: 4, size: 2, color: "green" },
      { id: "purple-bottom", side: "bottom", offset: 0, size: 2, color: "purple" },
      { id: "yellow-bottom", side: "bottom", offset: 4, size: 2, color: "yellow" },
    ],
    blocks: lv3Blocks,
  },
  {
    ...base(4, "折线彩条", 7, 6, lv4Playable, 21),
    gates: [
      { id: "blue-top", side: "top", offset: 0, size: 3, color: "blue" },
      { id: "green-top", side: "top", offset: 3, size: 3, color: "green" },
      { id: "red-left", side: "left", offset: 2, size: 1, color: "red" },
      { id: "pink-left", side: "left", offset: 4, size: 1, color: "pink" },
      { id: "cyan-right", side: "right", offset: 1, size: 1, color: "cyan" },
      { id: "orange-right", side: "right", offset: 3, size: 1, color: "orange" },
      { id: "yellow-bottom", side: "bottom", offset: 2, size: 1, color: "yellow" },
      { id: "purple-bottom", side: "bottom", offset: 3, size: 1, color: "purple" },
    ],
    blocks: [...lv4Bars, ...lv4Singles],
  },
  {
    ...base(5, "三色错肩", 5, 6, lv5Playable, 20),
    gates: [
      { id: "green-left", side: "left", offset: 0, size: 3, color: "green" },
      { id: "red-right", side: "right", offset: 3, size: 3, color: "red" },
      { id: "blue-top", side: "top", offset: 3, size: 1, color: "blue" },
    ],
    blocks: [...lv5Bars, ...lv5Singles],
  },
  {
    ...base(6, "四向冰门", 6, 5, lv6Playable, 21),
    gates: [
      { id: "blue-top", side: "top", offset: 2, size: 1, color: "blue" },
      { id: "red-bottom", side: "bottom", offset: 3, size: 2, color: "red", frozen: 5 },
      { id: "green-left", side: "left", offset: 2, size: 1, color: "green", frozen: 10 },
      { id: "yellow-right", side: "right", offset: 1, size: 1, color: "yellow", frozen: 10 },
    ],
    blocks: [...lv6Bars, ...lv6Singles],
    featureIntro: {
      title: "数字冰门！",
      description: "每清除一块，冰门数字都会同步减少。",
      kind: "ice-door",
    },
  },
  {
    ...base(7, "骨牌折桥", 6, 8, lv7Playable, 16),
    gates: [
      { id: "blue-top", side: "top", offset: 2, size: 2, color: "blue" },
      { id: "red-right", side: "right", offset: 6, size: 2, color: "red", frozen: 4 },
      { id: "green-left", side: "left", offset: 0, size: 2, color: "green", frozen: 10 },
    ],
    blocks: lv7Blocks,
  },
  {
    ...base(8, "折肩大核", 6, 8, lv8Playable, 25),
    gates: [
      { id: "blue-top", side: "top", offset: 0, size: 1, color: "blue" },
      { id: "green-left", side: "left", offset: 1, size: 1, color: "green" },
      { id: "orange-right", side: "right", offset: 5, size: 3, color: "orange", frozen: 9 },
      { id: "purple-bottom", side: "bottom", offset: 3, size: 3, color: "purple", frozen: 17 },
    ],
    blocks: [...lv8Large, ...lv8Singles],
  },
  {
    ...base(9, "双折方阵", 7, 8, lv9Playable, 10),
    gates: [
      { id: "blue-top", side: "top", offset: 0, size: 2, color: "blue" },
      { id: "orange-bottom", side: "bottom", offset: 5, size: 2, color: "orange", frozen: 2 },
      { id: "purple-bottom", side: "bottom", offset: 3, size: 2, color: "purple", frozen: 4 },
      { id: "green-top", side: "top", offset: 2, size: 2, color: "green", frozen: 6 },
      { id: "yellow-top", side: "top", offset: 4, size: 2, color: "yellow", frozen: 8 },
    ],
    blocks: lv9Blocks,
  },
  {
    ...base(10, "六色冰核", 7, 7, lv10Playable, 25),
    gates: [
      { id: "red-right", side: "right", offset: 1, size: 1, color: "red" },
      { id: "green-bottom", side: "bottom", offset: 1, size: 1, color: "green", frozen: 4 },
      { id: "yellow-bottom", side: "bottom", offset: 3, size: 1, color: "yellow", frozen: 11 },
      { id: "cyan-top", side: "top", offset: 4, size: 2, color: "cyan", frozen: 13 },
      { id: "orange-right", side: "right", offset: 4, size: 3, color: "orange", frozen: 19 },
      { id: "purple-left", side: "left", offset: 4, size: 3, color: "purple", frozen: 20 },
    ],
    blocks: [...lv10Frozen, ...lv10Singles],
    featureIntro: {
      title: "数字冰块！",
      description: "先清除普通色块，再按数字顺序逐步解冻。",
      kind: "ice-block",
    },
  },
];
