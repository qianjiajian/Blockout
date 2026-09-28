import { COLORS, type BlockColor, type GateSpec, type GeneratorSpec, type LevelSpec, type Point, type ShutterSpec } from "./types";

export const COMPETITOR_BOARD_OUTLINE_REPAIR_VERSION = "competitor-board-outline-r3" as const;

/**
 * Final outline-only corrections for boards that the topology cleanup made
 * rectangular. Coordinates are packed as base-36 x/y pairs to keep the
 * runtime table small. Every removed cell is exterior-connected, so these
 * notches cannot recreate an internal wall or enclosed hole.
 */
const PACKED_REMOVALS: Readonly<Record<number, string>> = {
  27: "53",
  46: "65",
  47: "57",
  48: "62",
  61: "53",
  71: "39",
  84: "39",
  195: "56",
};

interface ExactBoardContract {
  mask: readonly string[];
  /** Seven chars per source-order block: x, y, color, layer 1, layer 2, frozen, cover. */
  blocks: string;
  gates: readonly GateSpec[];
  shutters: readonly ShutterSpec[];
}

interface PositionOnlyBoardContract {
  mask: readonly string[];
  /** Two base-36 chars per source-order block. */
  blocks: string;
  /** Side code (top/right/bottom/left = 0/1/2/3) plus base-36 offset per source-order gate. */
  gates: string;
}

const POSITION_ONLY_BOARD_CONTRACTS: Readonly<Record<number, PositionOnlyBoardContract>> = {
  8: {
    mask: ["######", "######", "######", "...###", "...###", "...###", "...###", "...###"],
    blocks: "44430131541200405042203410523302321121415322355130",
    gates: "10130215",
  },
  9: {
    mask: ["##..##", "##..##", "######", "######", "######", "######", "##..##", "##..##"],
    blocks: "40002242442446060402",
    gates: "2014003235",
  },
  12: {
    mask: ["######", "######", "######", "..##..", "..##..", "..##..", "######", "######", "######"],
    blocks: "230046160620331040503026",
    gates: "00360221",
  },
  15: {
    mask: ["##..##", "##..##", "######", "######", "######", "######", "##..##", "##..##"],
    blocks: "40462444000242220604",
    gates: "1234361614",
  },
  25: {
    mask: ["######", "######", "######", "..##..", "..##..", "..##..", "######", "######", "######"],
    blocks: "27102032303722504224344756400616003517124626",
    gates: "01361621310504",
  },
  42: {
    mask: ["#.#.#", "#.#.#", "#.#.#", "#.#.#", "#####", "#.#.#", "#.#.#", "#.#.#", "#.#.#"],
    blocks: "020614420008264448030107432240462445204104054728",
    gates: "02121304",
  },
};

const EXACT_BOARD_CONTRACTS: Readonly<Record<number, ExactBoardContract>> = {
  24: {
    mask: ["###.#", "###.#", "###.#", "###.#", "#####", "###.#", "###.#", "###.#", "###.#"],
    blocks: "2011__02211__00411__04411__04044__04244__04644__04844__04177__04377__04577__04777__01011__102220611211__100002611344__11744__21877__22511__22644__20822_6205220622777__21511__22855__2",
    gates: [
      { id: "vp-024-gate-01", side: "top", offset: 2, size: 1, color: "blue" },
      { id: "vp-024-gate-02", side: "left", offset: 4, size: 1, color: "cyan", frozen: 6 },
      { id: "vp-024-gate-03", side: "right", offset: 4, size: 1, color: "purple", frozen: 4 },
      { id: "vp-024-gate-04", side: "bottom", offset: 0, size: 1, color: "green", frozen: 15 },
      { id: "vp-024-gate-05", side: "bottom", offset: 1, size: 1, color: "red", frozen: 18 },
      { id: "vp-024-gate-06", side: "bottom", offset: 2, size: 1, color: "orange", frozen: 18 },
    ],
    shutters: [
      { id: "vp-024-cover-1", x: 0, y: 0, width: 2, height: 4, count: 12, skin: "shutter" },
      { id: "vp-024-cover-2", x: 0, y: 5, width: 3, height: 4, count: 12, skin: "shutter" },
    ],
  },
  26: {
    mask: ["#######", "#######", "#######", "...#...", "...#...", "...#...", "...#...", "#######", "#######", "#######", "#######"],
    blocks: "0077__01066__02022__03055__04011__05077__00122__04255__01155__02111__03177__04166__05122__05211__00211__06277__01277__02266__06011__03222__03322__13522__15900__23700__25700__20a22__22a22__25a00__25855__22822__20922__24900__20822__20722__23833__2",
    gates: [
      { id: "vp-026-gate-01", side: "top", offset: 0, size: 1, color: "cyan" },
      { id: "vp-026-gate-02", side: "top", offset: 6, size: 1, color: "blue" },
      { id: "vp-026-gate-03", side: "left", offset: 0, size: 3, color: "pink" },
      { id: "vp-026-gate-04", side: "right", offset: 0, size: 3, color: "orange" },
      { id: "vp-026-gate-05", side: "top", offset: 2, size: 3, color: "green" },
      { id: "vp-026-gate-06", side: "left", offset: 7, size: 2, color: "green" },
      { id: "vp-026-gate-07", side: "right", offset: 7, size: 1, color: "red" },
      { id: "vp-026-gate-08", side: "right", offset: 8, size: 1, color: "orange" },
      { id: "vp-026-gate-09", side: "left", offset: 9, size: 2, color: "green", frozen: 5 },
      { id: "vp-026-gate-10", side: "right", offset: 9, size: 2, color: "red", frozen: 9 },
      { id: "vp-026-gate-11", side: "bottom", offset: 3, size: 2, color: "yellow", frozen: 14 },
    ],
    shutters: [
      { id: "vp-026-cover-1", x: 3, y: 3, width: 1, height: 4, count: 19, skin: "shutter" },
      { id: "vp-026-cover-2", x: 0, y: 7, width: 7, height: 4, count: 22, skin: "shutter" },
    ],
  },
  30: {
    mask: ["...##...", "...##...", "...##...", "...##...", "...##...", "...##...", "########", "########", "########"],
    blocks: "066___0263___0561___0761___0073___0271___0673___0081___0183___0381___0586___0783___0161___0666___0363___0304___1334___1403___1",
    gates: [
      { id: "vp-030-gate-01", side: "top", offset: 3, size: 2, color: "yellow" },
      { id: "vp-030-gate-02", side: "left", offset: 6, size: 3, color: "pink" },
      { id: "vp-030-gate-03", side: "right", offset: 6, size: 3, color: "blue" },
      { id: "vp-030-gate-04", side: "bottom", offset: 5, size: 2, color: "yellow" },
      { id: "vp-030-gate-05", side: "bottom", offset: 3, size: 1, color: "purple" },
      { id: "vp-030-gate-06", side: "bottom", offset: 1, size: 2, color: "purple", frozen: 9 },
    ],
    shutters: [
      { id: "vp-030-cover-1", x: 3, y: 0, width: 2, height: 6, count: 12, skin: "shutter" },
    ],
  },
};

const BLOCK_POSITIONS: Readonly<Record<number, Readonly<Record<string, readonly [number, number]>>>> = {
  71: { "strategy-guard-s1-09": [2, 5] },
  84: { "cc-084-b1-12": [3, 8] },
};

export const COMPETITOR_BOARD_OUTLINE_REPAIR_LEVEL_IDS = [
  8, 9, 12, 15, 24, 25, 26, 27, 30, 42, 43, 46, 47, 48, 61, 71, 84, 176, 195,
] as const;

const LV176_BLOCK_POSITIONS: Readonly<Record<string, readonly [number, number]>> = {
  "lv176-opening-b01": [0, 6],
  "lv176-opening-b02": [0, 9],
  "lv176-opening-b03": [2, 9],
  "lv176-opening-b04": [0, 10],
  "lv176-opening-b05": [1, 10],
  "lv176-opening-b06": [2, 10],
  "lv176-opening-b07": [3, 6],
  "lv176-opening-b08": [3, 9],
  "lv176-opening-b09": [3, 10],
  "lv176-pooled-hidden-b02": [4, 8],
  "lv176-pooled-hidden-b03": [6, 9],
  "lv176-pooled-hidden-b04": [6, 8],
  "lv176-pooled-hidden-b05": [0, 8],
  "lv176-pooled-hidden-b06": [5, 7],
  "lv176-pooled-hidden-b07": [3, 9],
  "lv176-pooled-hidden-b08": [0, 0],
  "lv176-pooled-hidden-b09": [7, 6],
  "lv176-pooled-hidden-b10": [6, 6],
  "lv176-pooled-hidden-b11": [0, 9],
  "lv176-pooled-hidden-b12": [4, 10],
  "lv176-pooled-hidden-b13": [0, 6],
  "lv176-pooled-hidden-b14": [6, 10],
};

const LV176_GATE_POSITIONS: Readonly<Record<string, readonly [GeneratorSpec["side"], number]>> = {
  "solvability-repair-gate-176-purple": ["right", 6],
  "solvability-repair-gate-176-red": ["left", 6],
  "solvability-repair-gate-176-yellow": ["bottom", 4],
  "solvability-repair-gate-176-blue": ["top", 0],
  "solvability-repair-gate-176-cyan": ["right", 9],
  "solvability-repair-gate-176-green": ["left", 9],
};

const key = (x: number, y: number): string => `${x},${y}`;

const rectangle = (width: number, height: number): Point[] => Array.from(
  { length: height },
  (_, y) => Array.from({ length: width }, (__, x) => [x, y] as Point),
).flat();

const pointsFromMask = (mask: readonly string[]): Point[] => mask.flatMap((row, y) => (
  [...row].flatMap((cell, x) => cell === "#" ? [[x, y] as Point] : [])
));

const decodeOptional = (value: string): number | undefined => value === "_" ? undefined : parseInt(value, 36);

const patchExactBoardContract = (source: LevelSpec, contract: ExactBoardContract): LevelSpec => {
  if (contract.blocks.length !== source.blocks.length * 7) {
    throw new Error(`Lv${source.id} exact board contract source block-count drift`);
  }
  const blocks = source.blocks.map((block, index) => {
    const record = contract.blocks.slice(index * 7, index * 7 + 7);
    const layer1 = decodeOptional(record[3]!);
    const layer2 = decodeOptional(record[4]!);
    const frozen = decodeOptional(record[5]!);
    const cover = Number(record[6]);
    if (!Number.isInteger(cover) || cover < 0 || cover > contract.shutters.length) {
      throw new Error(`Lv${source.id} exact board contract invalid cover code at ${block.id}`);
    }
    const { x: _x, y: _y, color: _color, layers: _layers, frozen: _frozen, shutterId: _shutterId, ...rest } = block;
    return {
      ...rest,
      x: parseInt(record[0]!, 36),
      y: parseInt(record[1]!, 36),
      color: COLORS[parseInt(record[2]!, 36)] as BlockColor,
      ...(layer1 === undefined ? {} : { layers: [COLORS[layer1]!, ...(layer2 === undefined ? [] : [COLORS[layer2]!])] }),
      ...(frozen === undefined ? {} : { frozen }),
      ...(cover === 0 ? {} : { shutterId: contract.shutters[cover - 1]!.id }),
    };
  });
  const playable = pointsFromMask(contract.mask);
  const candidate: LevelSpec = {
    ...source,
    width: contract.mask[0]!.length,
    height: contract.mask.length,
    playable,
    blocked: undefined,
    blocks,
    gates: contract.gates.map((gate) => ({ ...gate })),
    shutters: contract.shutters.map((shutter) => ({ ...shutter })),
  };
  const same = source.width === candidate.width
    && source.height === candidate.height
    && source.blocked === undefined
    && JSON.stringify(source.playable) === JSON.stringify(candidate.playable)
    && JSON.stringify(source.blocks) === JSON.stringify(candidate.blocks)
    && JSON.stringify(source.gates) === JSON.stringify(candidate.gates)
    && JSON.stringify(source.shutters) === JSON.stringify(candidate.shutters);
  return same ? source : candidate;
};

const SIDES = ["top", "right", "bottom", "left"] as const;

const patchPositionOnlyBoardContract = (source: LevelSpec, contract: PositionOnlyBoardContract): LevelSpec => {
  if (contract.blocks.length !== source.blocks.length * 2) {
    throw new Error(`Lv${source.id} position-only board contract source block-count drift`);
  }
  if (contract.gates.length !== source.gates.length * 2) {
    throw new Error(`Lv${source.id} position-only board contract source gate-count drift`);
  }
  const blocks = source.blocks.map((block, index) => ({
    ...block,
    x: parseInt(contract.blocks[index * 2]!, 36),
    y: parseInt(contract.blocks[index * 2 + 1]!, 36),
  }));
  const gates = source.gates.map((gate, index) => {
    const side = SIDES[parseInt(contract.gates[index * 2]!, 36)];
    if (!side) throw new Error(`Lv${source.id} position-only board contract invalid side at ${gate.id}`);
    return { ...gate, side, offset: parseInt(contract.gates[index * 2 + 1]!, 36) };
  });
  const candidate: LevelSpec = {
    ...source,
    width: contract.mask[0]!.length,
    height: contract.mask.length,
    playable: pointsFromMask(contract.mask),
    blocked: undefined,
    blocks,
    gates,
  };
  const same = source.width === candidate.width
    && source.height === candidate.height
    && source.blocked === undefined
    && JSON.stringify(source.playable) === JSON.stringify(candidate.playable)
    && JSON.stringify(source.blocks) === JSON.stringify(candidate.blocks)
    && JSON.stringify(source.gates) === JSON.stringify(candidate.gates);
  return same ? source : candidate;
};

const patchLevel43 = (source: LevelSpec): LevelSpec => {
  const playable = source.playable ?? rectangle(source.width, source.height);
  const present = new Set(playable.map(([x, y]) => key(x, y)));
  let changed = false;
  const nextPlayable = [...playable];
  for (let x = 3; x < 7; x += 1) {
    if (present.has(key(x, 9))) continue;
    nextPlayable.push([x, 9]);
    changed = true;
  }
  let foundGenerator = false;
  const generators = source.generators?.map((generator): GeneratorSpec => {
    if (generator.id !== "vp-043-generator-6") return generator;
    foundGenerator = true;
    const anchor = generator.rimAnchor;
    if (!anchor) throw new Error("Lv43 board outline repair expected generator-6 rimAnchor");
    if (generator.spawn[0] === 3 && generator.spawn[1] === 7 && anchor.y === 10) return generator;
    changed = true;
    return {
      ...generator,
      spawn: [3, 7],
      rimAnchor: { ...anchor, y: 10 },
    };
  });
  if (!foundGenerator) throw new Error("Lv43 board outline repair source drift at vp-043-generator-6");
  if (!changed) return source;
  nextPlayable.sort((left, right) => left[1] - right[1] || left[0] - right[0]);
  return { ...source, playable: nextPlayable, generators };
};

const patchLevel176 = (source: LevelSpec): LevelSpec => {
  const playable = rectangle(8, 11).filter(([, y]) => y !== 5);
  const playableKeys = playable.map(([x, y]) => key(x, y));
  const currentPlayableKeys = (source.playable ?? rectangle(source.width, source.height))
    .map(([x, y]) => key(x, y));
  const blockById = new Map(source.blocks.map((block) => [block.id, block]));
  const gateById = new Map(source.gates.map((gate) => [gate.id, gate]));
  for (const id of Object.keys(LV176_BLOCK_POSITIONS)) {
    if (!blockById.has(id)) throw new Error(`Lv176 board outline repair source drift at ${id}`);
  }
  for (const id of Object.keys(LV176_GATE_POSITIONS)) {
    if (!gateById.has(id)) throw new Error(`Lv176 board outline repair source drift at ${id}`);
  }
  const shutter = source.shutters?.find((candidate) => candidate.id === "solvability-minimal-stage-176-5");
  if (!shutter) throw new Error("Lv176 board outline repair source drift at count-5 shutter");

  if (source.height === 11) {
    const maskMatches = source.width === 8
      && currentPlayableKeys.length === playableKeys.length
      && currentPlayableKeys.every((cell, index) => cell === playableKeys[index]);
    const blocksMatch = Object.entries(LV176_BLOCK_POSITIONS).every(([id, [x, y]]) => {
      const block = blockById.get(id)!;
      return block.x === x && block.y === y;
    });
    const gatesMatch = Object.entries(LV176_GATE_POSITIONS).every(([id, [side, offset]]) => {
      const gate = gateById.get(id)!;
      return gate.side === side && gate.offset === offset;
    });
    if (maskMatches && blocksMatch && gatesMatch && shutter.x === 3 && shutter.y === 9) return source;
    throw new Error("Lv176 board outline repair is partially applied");
  }
  if (source.width !== 8 || source.height !== 10) {
    throw new Error(`Lv176 board outline repair expected 8x10 source, got ${source.width}x${source.height}`);
  }
  return {
    ...source,
    height: 11,
    playable,
    blocks: source.blocks.map((block) => {
      const target = LV176_BLOCK_POSITIONS[block.id];
      return target ? { ...block, x: target[0], y: target[1] } : block;
    }),
    gates: source.gates.map((gate) => {
      const target = LV176_GATE_POSITIONS[gate.id];
      return target ? { ...gate, side: target[0], offset: target[1] } : gate;
    }),
    shutters: source.shutters?.map((candidate) => candidate.id === shutter.id
      ? { ...candidate, x: 3, y: 9 }
      : candidate),
  };
};

export const applyCompetitorBoardOutlineRepair = (source: LevelSpec): LevelSpec => {
  const exact = EXACT_BOARD_CONTRACTS[source.id];
  if (exact) return patchExactBoardContract(source, exact);
  const positionOnly = POSITION_ONLY_BOARD_CONTRACTS[source.id];
  if (positionOnly) return patchPositionOnlyBoardContract(source, positionOnly);
  if (source.id === 43) return patchLevel43(source);
  if (source.id === 176) return patchLevel176(source);
  const packed = PACKED_REMOVALS[source.id];
  if (packed === undefined) return source;
  const playable = source.playable ?? rectangle(source.width, source.height);
  const removals = new Set<string>();
  for (let index = 0; index < packed.length; index += 2) {
    removals.add(key(parseInt(packed[index]!, 36), parseInt(packed[index + 1]!, 36)));
  }
  const present = new Set(playable.map(([x, y]) => key(x, y)));
  const presentRemovalCount = [...removals].filter((cell) => present.has(cell)).length;
  if (presentRemovalCount !== 0 && presentRemovalCount !== removals.size) {
    throw new Error(`Lv${source.id} board outline repair has a partially applied playable mask`);
  }
  const positions = BLOCK_POSITIONS[source.id];
  if (positions) for (const id of Object.keys(positions)) {
    if (!source.blocks.some((block) => block.id === id)) {
      throw new Error(`Lv${source.id} board outline repair source drift at ${id}`);
    }
  }
  let changed = presentRemovalCount > 0;
  const blocks = positions ? source.blocks.map((block) => {
    const target = positions[block.id];
    if (!target || block.x === target[0] && block.y === target[1]) return block;
    changed = true;
    return { ...block, x: target[0], y: target[1] };
  }) : source.blocks;
  if (!changed) return source;
  return {
    ...source,
    playable: presentRemovalCount > 0
      ? playable.filter(([x, y]) => !removals.has(key(x, y)))
      : playable,
    blocks,
  };
};
