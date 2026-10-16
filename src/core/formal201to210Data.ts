import type { BlockColor, LevelSpec } from "./types";
import { FORMAL_201_210_LEVELS as SEEDED_201_210_LEVELS } from "./formal201to210SeedData";
import { SIMPLE_201_205_LEVELS } from "./simple201205Data";

/**
 * v1.124 formal-isolated data, inheriting the v1.123 latest ten-level
 * difficulty cadence easy/normal/normal/hard/easy/normal/hard/easy/normal/
 * super. Source maps are cloned with stable ids; each derived object needs
 * its own route and lower-bound evidence before acceptance.
 */

const deepClone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const collectIds = (level: LevelSpec, targetId: number): Map<string, string> => {
  const idMap = new Map<string, string>();
  const collect = (items: readonly { id?: string }[] | undefined) => {
    for (const item of items ?? []) {
      if (item.id) idMap.set(item.id, `l${targetId}-continuation-${item.id}`);
    }
  };
  collect(level.gates);
  collect(level.blocks);
  collect(level.flipDoors);
  collect(level.coloredGrids);
  collect(level.shutters);
  collect(level.generators);
  collect(level.elevators);
  collect(level.conveyors);
  return idMap;
};

const rewriteReferences = (value: unknown, idMap: Map<string, string>): unknown => {
  if (typeof value === "string") return idMap.get(value) ?? value;
  if (Array.isArray(value)) return value.map((item) => rewriteReferences(item, idMap));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, rewriteReferences(item, idMap)]));
  }
  return value;
};

const cloneWithId = (source: LevelSpec, id: number): LevelSpec => {
  const cloned = deepClone(source);
  const idMap = collectIds(cloned, id);
  const rewritten = rewriteReferences(cloned, idMap) as LevelSpec;
  rewritten.id = id;
  return rewritten;
};

const seeded = (id: number): LevelSpec => {
  const source = SEEDED_201_210_LEVELS.find((level) => level.id === id);
  if (!source) throw new Error(`Missing seeded continuation level ${id}`);
  return source;
};

const remapColors = (source: LevelSpec, mapping: Partial<Record<BlockColor, BlockColor>>): LevelSpec => {
  const cloned = deepClone(source);
  const color = (value: BlockColor): BlockColor => mapping[value] ?? value;
  cloned.gates = cloned.gates.map((gate) => ({ ...gate, color: color(gate.color) }));
  cloned.blocks = cloned.blocks.map((block) => ({
    ...block,
    color: color(block.color),
    layers: block.layers?.map(color),
  }));
  cloned.flipDoors = cloned.flipDoors?.map((door) => ({ ...door, color: color(door.color) }));
  cloned.coloredGrids = cloned.coloredGrids?.map((grid) => ({ ...grid, color: color(grid.color) }));
  return cloned;
};

const adapt = (
  source: LevelSpec,
  id: number,
  difficulty: LevelSpec["difficulty"],
  lowerBound: number,
  timeSeconds: number,
  name: string,
  sourceNote: string,
): LevelSpec => ({
  ...cloneWithId(source, id),
  mechanismRules: "revised-2026-09-27-v1.5",
  id,
  name,
  difficulty,
  timeSeconds,
  reward: 200,
  preservedMoveTarget: source.parMoves,
  designTargets: {
    formulaVersion: "blockout-d1",
    calibratedDifficulty: lowerBound,
    minimumRepositionOverhead: lowerBound,
  },
  mechanismAdaptation: {
    userAuthorized: "201-210竞品视频续作·v1.123十关难度重生成",
    change: sourceNote,
  },
});

const source201 = {
  ...SIMPLE_201_205_LEVELS.find((level) => level.id === 201)!,
  parMoves: 37,
  preservedMoveTarget: 37,
};
const source205 = {
  ...SIMPLE_201_205_LEVELS.find((level) => level.id === 205)!,
  parMoves: 36,
  preservedMoveTarget: 36,
};
const source208 = remapColors(source201, {
  red: "cyan", cyan: "red", blue: "pink", pink: "blue",
});
const source207 = SEEDED_201_210_LEVELS.find((level) => level.id === 204)!;
const source209 = SEEDED_201_210_LEVELS.find((level) => level.id === 203)!;

const UNREPAIRED_LEVELS: readonly LevelSpec[] = [
  // simple / 5–10: exact Lv20-certified geometry, remapped to continuation id.
  adapt(source201, 201, "easy", 5, 120, "竞品续章·三向冰门简化巩固", "视频可见顶部5计数冰门、中央红色彩格和下方3计数卷帘；彩格与当前外壳硬规则存在冲突，候选暂按可验证v1.5卷帘/冰门布局适配，差异单列。"),
  // normal / 11–15: seeded fresh lower-bound records.
  adapt(seeded(202), 202, "normal", 12, 120, "竞品续章·双补给分区与双批卷帘", "沿用201–210视频中的双补给/卷帘意图，采用已验证L12适配布局。"),
  adapt(seeded(203), 203, "normal", 11, 120, "竞品续章·上下分区连桥与单卷帘", "沿用视频上下分区连桥意图，采用已验证L11适配布局。"),
  adapt(seeded(204), 204, "hard", 17, 180, "竞品续章·三重硬门与三段覆盖", "对应视频多硬门与三段覆盖段落，采用已验证L17适配布局。"),
  // simple / 5–10: certified Lv38 geometry, remapped and retimed.
  adapt(source205, 205, "easy", 5, 120, "竞品续章·金色棋盘简易巩固", "视频可见外围黄色彩格、顶部10计数冰门且无卷帘；候选保留冰门和满铺空间压力，彩格逐格语义与本游戏外壳规则冲突处单列适配差异。"),
  adapt(seeded(206), 206, "normal", 12, 120, "竞品续章·回转门节奏与双补给", "沿用视频回转门与双补给意图，采用已验证L12适配布局。"),
  adapt(source207, 207, "hard", 17, 180, "竞品续章·双侧冰锁与硬档回撤", "将已验证L17硬档空间节奏适配到视频双侧冰锁意图，保持机制差异可追溯。"),
  // simple / 5–10: certified Lv39 geometry, remapped and retimed.
  adapt(source208, 208, "easy", 5, 120, "竞品续章·钥印补给简易巩固", "视频可见下方7计数卷帘及钥印/设备视觉；候选先保可验证卷帘与空间节奏，钥印语义仍按来源差异记录。"),
  adapt(source209, 209, "normal", 11, 150, "竞品续章·超难双舱普通收束", "将已验证L11普通档空间节奏适配到视频双舱段落，保留来源未知标记。"),
  adapt(seeded(210), 210, "super", 21, 210, "竞品续章·三域终局与高压锁序", "沿用视频终局三域与高压锁序意图，采用已验证L21超难档适配布局。"),
];

/**
 * The source video does not resolve the affected hidden inventories precisely.
 * Preserve the existing board, gates and scoring while separating the six
 * same-colour contacts found in the isolated formal-data audit. Each changed
 * object has its own fresh route and lower-bound evidence in the repair log.
 */
const repairSameColourContacts = (source: LevelSpec): LevelSpec => {
  if (![203, 204, 207, 209].includes(source.id)) return source;
  const level = deepClone(source);
  const block = (suffix: string) => {
    const match = level.blocks.find((candidate) => candidate.id.endsWith(suffix));
    if (!match) throw new Error(`Lv${level.id} missing adjacency repair block ${suffix}`);
    return match;
  };

  if (level.id === 203 || level.id === 209) {
    const red = block("-s40-c1-1-12");
    const green = block("-s40-c1-3-14");
    const yellow = block("-s40-c1-6-17");
    if (red.color !== "red" || red.x !== 2 || red.y !== 1
      || JSON.stringify(red.shape) !== "[[0,0],[1,0]]"
      || green.color !== "green" || green.x !== 2 || green.y !== 2
      || JSON.stringify(green.shape) !== "[[0,0],[0,1]]"
      || yellow.color !== "yellow" || yellow.x !== 1 || yellow.y !== 3) {
      throw new Error(`Lv${level.id} adjacency repair source changed; obtain fresh evidence`);
    }
    [red.x, green.x] = [green.x, red.x];
    [red.y, green.y] = [green.y, red.y];
    [red.shape, green.shape] = [green.shape, red.shape];
    yellow.color = "green";
  } else {
    const green = block("-bay8-green-14");
    const red = block("-bay8-red-15");
    if (green.color !== "green" || green.x !== 0 || green.y !== 0
      || JSON.stringify(green.shape) !== "[[0,0],[1,0]]"
      || red.color !== "red" || red.x !== 0 || red.y !== 1
      || JSON.stringify(red.shape) !== "[[0,0],[1,0]]") {
      throw new Error(`Lv${level.id} adjacency repair source changed; obtain fresh evidence`);
    }
    [green.y, red.y] = [red.y, green.y];
  }
  return level;
};

/** Fill each 3×2 hidden bay with an actual six-cell block on Lv202/Lv206. */
const repairHiddenCoverage = (source: LevelSpec): LevelSpec => {
  if (source.id !== 202 && source.id !== 206) return source;
  const level = deepClone(source);
  const hidden = (suffix: string) => {
    const match = level.blocks.find((candidate) => candidate.id.endsWith(suffix));
    if (!match) throw new Error(`Lv${level.id} missing hidden repair block ${suffix}`);
    return match;
  };
  const near = hidden("-q21-hidden-0-14");
  const far = hidden("-q21-hidden-1-15");
  const square = "[[0,0],[1,0],[0,1],[1,1]]";
  if (near.color !== "yellow" || near.x !== 0 || near.y !== 0
    || JSON.stringify(near.shape) !== square
    || far.color !== "purple" || far.x !== 3 || far.y !== 0
    || JSON.stringify(far.shape) !== square) {
    throw new Error(`Lv${level.id} hidden repair source changed; obtain fresh evidence`);
  }
  const rectangle: LevelSpec["blocks"][number]["shape"] = [
    [0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1],
  ];
  near.shape = rectangle.map((cell) => [...cell] as [number, number]);
  far.shape = rectangle.map((cell) => [...cell] as [number, number]);
  // Source hidden colours are unknown; red avoids contact with the visible purple V3.
  far.color = "red";
  return level;
};

const LEVELS: readonly LevelSpec[] = UNREPAIRED_LEVELS
  .map(repairSameColourContacts)
  .map(repairHiddenCoverage);

/** All ten regenerated continuation candidates, kept outside production LEVELS. */
export const CANDIDATE_201_210_LEVELS: readonly LevelSpec[] = Object.freeze(LEVELS);

/**
 * All ten current objects passed formal-data acceptance. This registry is
 * separate from the 1–200 production campaign in levels.ts.
 */
export const FORMAL_201_210_LEVELS: readonly LevelSpec[] = Object.freeze(LEVELS);

/**
 * v1.124 isolated package retained for audit. The same objects are now in the
 * accepted formal-data registry above; production LEVELS remains separate.
 * Structural, Pointer, natural-clock and three-star gates are bound below.
 */
export const FORMAL_ISOLATED_201_210_LEVELS: readonly LevelSpec[] = Object.freeze(LEVELS);

/** Same-object acceptance records; route drags and three-star targets are independent. */
export const FORMAL_201_210_EVIDENCE = [
  { id: 201, levelSha256: "b88021bda03ac884b78d95b43e65a7928fb8300733f155865beef6eba742a47f", rawLevelSha256: "7989323790c4d36220d3e438feeeea13bb9fe721dd0fa6cd54511b6a2e952d97", L: 5, U: 7, routeMoves: 37, starMoves: 37, evidence: "deliverables/continue201-210-20260930/formal-adoption/level-201.json" },
  { id: 202, levelSha256: "8f46cd15027db1045e46ad03d28a7f4d8c40496fcc0c039278e7ea142c4718e0", rawLevelSha256: "d6f43da879117ec027146d31754d6a150ff19778904385fc85369cd533cb2837", L: 12, U: 12, routeMoves: 30, starMoves: 31, evidence: "deliverables/continue201-210-20260930/formal-adoption/level-202.json" },
  { id: 203, levelSha256: "fc4fe82abddc83596a176f889c44aa7425750a0161e8c93e0820c716da391d50", rawLevelSha256: "5c92e3c49198d375675c301e4ea94cb7a222927066392ecfbe3d2a7224d8726a", L: 11, U: 15, routeMoves: 34, starMoves: 34, evidence: "deliverables/continue201-210-20260930/formal-adoption/level-203.json" },
  { id: 204, levelSha256: "02dcfe3652f16125817c004d74e4f4bf953b65179162b0209eee82c21be9a421", rawLevelSha256: "702dc2a0b6adcd407472a4bb22d26c7a1976e5e00d0b6aed9c2abbe7447247fb", L: 17, U: 19, routeMoves: 41, starMoves: 41, evidence: "deliverables/continue201-210-20260930/formal-adoption/level-204.json" },
  { id: 205, levelSha256: "60b10bc8749a8ec20d0c8ec59f6fe42e5dee368df517dec2ada826a9790fa1f9", rawLevelSha256: "2a3caa20523207875cca55282efe260c27aad8963b67bab223916bc407ad4c38", L: 5, U: 7, routeMoves: 36, starMoves: 36, evidence: "deliverables/continue201-210-20260930/formal-adoption/level-205.json" },
  { id: 206, levelSha256: "020e1b1ad71442bf1d2a5f824d2df5e45a5f88dd8ade06797f93a9f96ce87b9a", rawLevelSha256: "2f1111b371170a68afa1d537df8521cf82cd5b0d54bc52f284e6023459ab1df8", L: 12, U: 12, routeMoves: 30, starMoves: 31, evidence: "deliverables/continue201-210-20260930/formal-adoption/level-206.json" },
  { id: 207, levelSha256: "36e6738f35d9ed2b7a775f2fe45ba571d8cc1367ec450309687cefc3d0d78ac9", rawLevelSha256: "becaef6a53dbd3ec243305961a33e2699c46b19c42acdf5862874d6800fb358a", L: 17, U: 19, routeMoves: 41, starMoves: 41, evidence: "deliverables/continue201-210-20260930/formal-adoption/level-207.json" },
  { id: 208, levelSha256: "ef90f8482a4f586584749417dc681668f7f0783d3cfc9aecb25fa17bed25d59c", rawLevelSha256: "f2d05aae59ba1f7851d39e8d94c33b71b2bd4a1897a715b783db81e4e7f4a4fa", L: 5, U: 7, routeMoves: 37, starMoves: 37, evidence: "deliverables/continue201-210-20260930/formal-adoption/level-208.json" },
  { id: 209, levelSha256: "74c86678706e7f6c17652896d761d61fcf548cdeff31070b778fe0ad74d00ece", rawLevelSha256: "0524f0df6c73dade361ddd0d09e67daea7e4d15ebef686ae18cea75dcc1a5dfb", L: 11, U: 15, routeMoves: 34, starMoves: 34, evidence: "deliverables/continue201-210-20260930/formal-adoption/level-209.json" },
  { id: 210, levelSha256: "f4df558e27e2c4e4ddee53ac7834e8d19b47f33fa7ecd445536519f64aa4ed96", rawLevelSha256: "902800610d6cb88b6a50810a611426055b6700fffc1edce44bc812c6c0762f07", L: 21, U: 29, routeMoves: 70, starMoves: 70, evidence: "deliverables/continue201-210-20260930/formal-adoption/level-210.json" },
] as const;

export const getFormal201to210LevelStrict = (id: number): LevelSpec => {
  const level = FORMAL_201_210_LEVELS.find((candidate) => candidate.id === id);
  if (!level) throw new RangeError(`Level ${id} has not passed 201–210 formal-data acceptance`);
  return level;
};
