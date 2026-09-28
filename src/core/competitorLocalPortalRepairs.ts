import type {
  BlockColor,
  BlockSpec,
  GateSpec,
  LevelSpec,
  Point,
  ShutterSpec,
  Side,
} from "./types";

export const COMPETITOR_LOCAL_PORTAL_REPAIR_VERSION = "competitor-local-portals-r2" as const;
export const COMPETITOR_LOCAL_PORTAL_REPAIR_LEVEL_IDS = [73, 75, 83, 130] as const;

type BlockExtra = Omit<Partial<BlockSpec>, "id" | "x" | "y" | "shape" | "color">;
type LocalPortalContract = {
  width: number;
  height: number;
  playable: Point[];
  gates: GateSpec[];
  blocks: BlockSpec[];
  shutters: ShutterSpec[];
};

const S: Point[] = [[0, 0]];
const H2: Point[] = [[0, 0], [1, 0]];
const V2: Point[] = [[0, 0], [0, 1]];
const H3: Point[] = [[0, 0], [1, 0], [2, 0]];
const SQ2: Point[] = [[0, 0], [1, 0], [0, 1], [1, 1]];
const LA: Point[] = [[0, 0], [1, 0], [0, 1]];
const LB: Point[] = [[0, 0], [1, 0], [1, 1]];
const LC: Point[] = [[0, 0], [0, 1], [1, 1]];
const LD: Point[] = [[1, 0], [0, 1], [1, 1]];
const L4A: Point[] = [[0, 0], [1, 0], [2, 0], [0, 1]];
const T4: Point[] = [[1, 0], [0, 1], [1, 1], [1, 2]];

const block = (
  id: string,
  x: number,
  y: number,
  shape: Point[],
  color: BlockColor,
  extra: BlockExtra = {},
): BlockSpec => ({ id, x, y, shape, color, ...extra });

const portalGate = (
  id: string,
  color: BlockColor,
  side: Side,
  origin: Point,
  size: number,
  frozen?: number,
): GateSpec => ({
  id,
  color,
  side,
  offset: side === "top" || side === "bottom" ? origin[0] : origin[1],
  size,
  ...(frozen === undefined ? {} : { frozen }),
  portals: [{ side, origin, size }],
});

const playableFrom = (rows: readonly string[]): Point[] => rows.flatMap((row, y) => (
  [...row].flatMap((cell, x): Point[] => cell === "#" ? [[x, y]] : [])
));

const LV73_FRAME = "vp-073-staged-frame-1";
const LV73_COVER = "vp-073-cover-1";
const LV73_TRIGGER_IDS = [
  "cc-piece-s1-01",
  "cc-piece-s1-02",
  "cc-piece-s1-03",
  "cc-piece-s1-04",
  "strategy-guard-s1-05",
  "cc-piece-s1-06",
  "strategy-guard-s1-07",
  "strategy-guard-s1-08",
  "cc-piece-s1-09",
];

const LV73: LocalPortalContract = {
  width: 7,
  height: 12,
  playable: playableFrom([
    "#####..", "#####..", "#####..", "#####..", "#####..", ".......", ".......",
    "..#####", "..#####", "..#####", "..#####", "..#####",
  ]),
  gates: [
    portalGate("source-lv073-gate-01", "green", "top", [1, 0], 2, 8),
    portalGate("source-lv073-gate-02", "red", "top", [3, 0], 2),
    portalGate("source-lv073-gate-03", "purple", "left", [0, 0], 1, 6),
    portalGate("source-lv073-gate-04", "yellow", "left", [0, 1], 2, 3),
    portalGate("source-lv073-gate-05", "blue", "left", [0, 3], 2, 5),
    portalGate("source-lv073-gate-06", "pink", "right", [4, 0], 1, 6),
    portalGate("source-lv073-gate-07", "cyan", "right", [4, 1], 2, 1),
    portalGate("source-lv073-gate-08", "purple", "left", [2, 7], 2, 23),
    portalGate("source-lv073-gate-09", "blue", "left", [2, 9], 2, 22),
    portalGate("source-lv073-gate-10", "yellow", "right", [6, 7], 2, 20),
    portalGate("source-lv073-gate-11", "pink", "right", [6, 9], 1, 24),
    portalGate("source-lv073-gate-12", "green", "right", [6, 10], 2, 19),
    portalGate("source-lv073-gate-13", "red", "bottom", [3, 11], 3, 25),
  ],
  blocks: [
    block("cc-piece-s1-01", 0, 2, SQ2, "red", { layers: ["green", "red"] }),
    block("cc-piece-s1-02", 0, 0, SQ2, "red"),
    block("cc-piece-s1-03", 2, 4, H2, "pink"),
    block("cc-piece-s1-04", 3, 0, SQ2, "red"),
    block("strategy-guard-s1-05", 2, 0, S, "yellow"),
    block("cc-piece-s1-06", 0, 4, H2, "blue"),
    block("strategy-guard-s1-07", 2, 2, L4A, "yellow"),
    block("strategy-guard-s1-08", 2, 1, S, "purple"),
    block("cc-piece-s1-09", 3, 3, LB, "red"),
    block("cc-piece-s2-01", 0, 4, H3, "blue", { shutterId: LV73_FRAME }),
    block("strategy-guard-s2-02", 2, 1, H2, "purple", { shutterId: LV73_FRAME }),
    block("cc-piece-s2-03", 2, 0, H3, "pink", { shutterId: LV73_FRAME }),
    block("cc-piece-s2-04", 0, 0, SQ2, "green", { shutterId: LV73_FRAME }),
    block("cc-piece-s2-05", 3, 4, H2, "purple", { shutterId: LV73_FRAME }),
    block("cc-piece-s2-06", 0, 2, LB, "red", { shutterId: LV73_FRAME }),
    block("strategy-guard-s2-07", 3, 1, T4, "blue", { shutterId: LV73_FRAME }),
    block("strategy-guard-s2-08", 0, 3, S, "pink", { shutterId: LV73_FRAME }),
    block("strategy-guard-s2-09", 2, 2, LC, "green", { shutterId: LV73_FRAME }),
    block("cc-piece-s3-01", 4, 7, S, "pink", { shutterId: LV73_COVER }),
    block("cc-piece-s3-02", 4, 8, S, "yellow", { shutterId: LV73_COVER }),
    block("strategy-guard-s3-03", 3, 9, S, "red", { shutterId: LV73_COVER }),
    block("strategy-guard-s3-04", 5, 10, S, "yellow", { shutterId: LV73_COVER }),
    block("strategy-guard-s3-05", 2, 11, H2, "purple", { shutterId: LV73_COVER }),
    block("cc-piece-s3-06", 2, 8, V2, "red", { shutterId: LV73_COVER }),
    block("strategy-guard-s3-07", 4, 9, H3, "pink", { shutterId: LV73_COVER }),
    block("cc-piece-s3-08", 2, 10, H2, "blue", { shutterId: LV73_COVER }),
    block("strategy-guard-s3-09", 6, 10, V2, "green", { shutterId: LV73_COVER }),
    block("cc-piece-s3-10", 5, 7, LA, "yellow", { shutterId: LV73_COVER }),
    block("strategy-guard-s3-11", 2, 7, LB, "purple", { shutterId: LV73_COVER }),
  ],
  shutters: [
    { id: LV73_COVER, x: 2, y: 7, width: 5, height: 5, count: 19, skin: "shutter" },
    {
      id: LV73_FRAME,
      x: 0,
      y: 0,
      width: 5,
      height: 5,
      count: LV73_TRIGGER_IDS.length,
      skin: "staged-frame",
      triggerBlockIds: LV73_TRIGGER_IDS,
    },
  ],
};

const LV75_FRAME = "source-lv075-staged-frame-1";
const LV75_TRIGGER_IDS = [
  "cc-piece-s1-03",
  "strategy-guard-s1-04",
  "cc-piece-s1-05",
  "cc-piece-s1-06",
  "cc-piece-s1-07",
];

const LV75: LocalPortalContract = {
  width: 7,
  height: 11,
  playable: playableFrom([
    "..###..",
    ".#####.",
    "#######",
    "#######",
    ".#####.",
    "..###..",
    ".......",
    ".#####.",
    "#######",
    "#######",
    "#######",
  ]),
  gates: [
    portalGate("source-lv075-gate-01", "green", "top", [2, 0], 3, 3),
    portalGate("source-lv075-gate-02", "blue", "left", [0, 2], 2, 2),
    portalGate("source-lv075-gate-03", "red", "right", [6, 2], 2),
    portalGate("source-lv075-gate-04", "yellow", "bottom", [2, 5], 3, 1),
    portalGate("source-lv075-gate-05", "red", "top", [2, 7], 3, 11),
    portalGate("source-lv075-gate-06", "blue", "left", [0, 8], 3, 11),
    portalGate("source-lv075-gate-07", "green", "right", [6, 8], 3, 11),
    portalGate("source-lv075-gate-08", "purple", "bottom", [1, 10], 2, 11),
    portalGate("source-lv075-gate-09", "orange", "bottom", [3, 10], 2, 11),
    portalGate("source-lv075-gate-10", "yellow", "bottom", [5, 10], 2, 11),
  ],
  blocks: [
    block("strategy-guard-s1-01", 0, 2, V2, "red"),
    block("cc-piece-s1-02", 6, 2, V2, "blue"),
    block("cc-piece-s1-03", 2, 1, H3, "yellow"),
    block("strategy-guard-s1-04", 2, 2, S, "blue"),
    block("cc-piece-s1-05", 3, 2, H2, "red"),
    block("cc-piece-s1-06", 2, 3, H3, "green"),
    block("cc-piece-s1-07", 2, 4, H3, "red"),
    block("cc-piece-s1-08", 1, 7, S, "red"),
    block("cc-piece-s1-09", 2, 7, S, "green"),
    block("cc-piece-s1-10", 3, 7, S, "blue"),
    block("cc-piece-s1-11", 4, 7, S, "red"),
    block("strategy-guard-s1-12", 5, 7, S, "orange"),
    block("strategy-guard-s1-13", 0, 8, H2, "blue"),
    block("strategy-guard-s1-14", 2, 8, H2, "orange"),
    block("cc-piece-s1-15", 4, 8, H2, "green"),
    block("cc-piece-s1-16", 6, 8, S, "purple"),
    block("cc-piece-s1-17", 1, 9, H3, "red"),
    block("cc-piece-s1-18", 5, 9, SQ2, "yellow", { layers: ["yellow"] }),
    block("cc-piece-s1-19", 0, 9, LC, "purple", { layers: ["purple"] }),
    block("strategy-guard-s1-20", 3, 9, LD, "orange"),
    block("cc-piece-s2-01", 2, 1, SQ2, "red", { shutterId: LV75_FRAME }),
    block("cc-piece-s2-02", 4, 1, V2, "blue", { shutterId: LV75_FRAME }),
    block("cc-piece-s2-03", 2, 3, LA, "green", { shutterId: LV75_FRAME }),
    block("cc-piece-s2-04", 3, 3, LD, "yellow", { shutterId: LV75_FRAME }),
  ],
  shutters: [{
    id: LV75_FRAME,
    x: 2,
    y: 1,
    width: 3,
    height: 4,
    count: LV75_TRIGGER_IDS.length,
    skin: "staged-frame",
    triggerBlockIds: LV75_TRIGGER_IDS,
  }],
};

const LV83_LEFT_COVER = "vp-083-cover-1";
const LV83_RIGHT_COVER = "vp-083-cover-2";
const LV83: LocalPortalContract = {
  width: 8,
  height: 12,
  playable: playableFrom([
    "###..###",
    "###..###",
    "###..###",
    "###..###",
    "........",
    "........",
    "########",
    "########",
    "########",
    "########",
    "########",
    "########",
  ]),
  gates: [
    portalGate("source-lv083-gate-01", "pink", "right", [2, 0], 1),
    portalGate("source-lv083-gate-02", "blue", "right", [2, 1], 1),
    portalGate("source-lv083-gate-03", "green", "right", [2, 2], 1),
    portalGate("source-lv083-gate-04", "yellow", "right", [2, 3], 1),
    portalGate("source-lv083-gate-05", "cyan", "left", [0, 2], 2),
    portalGate("source-lv083-gate-06", "red", "bottom", [1, 3], 2),
    portalGate("source-lv083-gate-07", "purple", "top", [5, 0], 2),
    portalGate("source-lv083-gate-08", "pink", "right", [7, 0], 1),
    portalGate("source-lv083-gate-09", "blue", "right", [7, 1], 1),
    portalGate("source-lv083-gate-10", "green", "right", [7, 2], 1),
    portalGate("source-lv083-gate-11", "yellow", "right", [7, 3], 1),
    portalGate("source-lv083-gate-12", "orange", "bottom", [6, 3], 2),
    portalGate("source-lv083-gate-13", "green", "left", [0, 10], 2, 8),
    portalGate("source-lv083-gate-14", "purple", "right", [7, 8], 2, 2),
    portalGate("source-lv083-gate-15", "blue", "bottom", [0, 11], 2, 10),
    portalGate("source-lv083-gate-16", "yellow", "bottom", [4, 11], 2, 6),
    portalGate("source-lv083-gate-17", "red", "bottom", [6, 11], 2),
  ],
  blocks: [
    block("cc-083-b1-10", 6, 10, SQ2, "red"),
    block("cc-083-b1-08", 6, 8, SQ2, "green"),
    block("cc-083-b1-04", 6, 6, SQ2, "red"),
    block("cc-083-b1-12", 4, 10, SQ2, "blue"),
    block("cc-083-b1-01", 0, 6, SQ2, "red", { keyId: "vp-083-key-group-1" }),
    block("cc-083-b1-02", 2, 6, SQ2, "blue"),
    block("cc-083-b1-03", 4, 6, SQ2, "purple"),
    block("cc-083-b1-05", 0, 8, SQ2, "purple", { layers: ["purple", "green"] }),
    block("cc-083-b1-06", 2, 8, SQ2, "red", { lockedBy: "vp-083-key-group-1", lockCount: 1 }),
    block("cc-083-b1-07", 4, 8, SQ2, "yellow", { layers: ["yellow", "green"] }),
    block("cc-083-b1-09", 0, 10, SQ2, "yellow", { keyId: "vp-083-key-group-2" }),
    block("cc-083-b1-11", 2, 10, SQ2, "purple", {
      layers: ["purple", "green"],
      lockedBy: "vp-083-key-group-2",
      lockCount: 1,
    }),
    block("cc-083-b2-01", 0, 3, S, "green", { shutterId: LV83_LEFT_COVER }),
    block("cc-083-b2-02", 7, 3, S, "yellow", { shutterId: LV83_RIGHT_COVER }),
    block("cc-083-b2-03", 2, 2, S, "blue", { shutterId: LV83_LEFT_COVER }),
    block("cc-083-b2-04", 7, 0, S, "pink", { shutterId: LV83_RIGHT_COVER }),
    block("cc-083-b2-05", 2, 1, S, "red", { shutterId: LV83_LEFT_COVER }),
    block("cc-083-b2-06", 0, 1, S, "cyan", { shutterId: LV83_LEFT_COVER }),
    block("cc-083-b2-07", 1, 2, LC, "green", { shutterId: LV83_LEFT_COVER }),
    block("cc-083-b2-08", 1, 0, LA, "pink", { shutterId: LV83_LEFT_COVER }),
    block("cc-083-b3-01", 5, 0, S, "purple", { shutterId: LV83_RIGHT_COVER }),
    block("cc-083-b3-02", 5, 3, S, "orange", { shutterId: LV83_RIGHT_COVER }),
    block("cc-083-b3-03", 0, 2, S, "pink", { shutterId: LV83_LEFT_COVER }),
    block("cc-083-b3-04", 5, 2, S, "green", { shutterId: LV83_RIGHT_COVER }),
    block("cc-083-b3-05", 7, 1, S, "blue", { shutterId: LV83_RIGHT_COVER }),
    block("cc-083-b3-06", 0, 0, S, "cyan", { shutterId: LV83_LEFT_COVER }),
    block("cc-083-b3-07", 5, 0, LD, "purple", { shutterId: LV83_RIGHT_COVER }),
    block("cc-083-b3-08", 6, 2, LA, "orange", { shutterId: LV83_RIGHT_COVER }),
  ],
  shutters: [
    { id: LV83_LEFT_COVER, x: 0, y: 0, width: 3, height: 4, count: 15, skin: "shutter" },
    { id: LV83_RIGHT_COVER, x: 5, y: 0, width: 3, height: 4, count: 15, skin: "shutter" },
  ],
};

const LV130_COVER = "lv130-cover-01";
const LV130: LocalPortalContract = {
  width: 8,
  height: 8,
  playable: playableFrom([
    "########",
    "########",
    "########",
    "........",
    "..####..",
    "..####..",
    "..####..",
    "..####..",
  ]),
  gates: [
    portalGate("source-lv130-gate-01", "blue", "top", [3, 0], 2),
    portalGate("source-lv130-gate-02", "red", "left", [0, 1], 2),
    portalGate("source-lv130-gate-03", "yellow", "right", [7, 1], 2),
    portalGate("source-lv130-gate-04", "cyan", "bottom", [2, 2], 1),
    portalGate("source-lv130-gate-05", "green", "bottom", [3, 2], 1, 6),
    portalGate("source-lv130-gate-06", "purple", "bottom", [4, 2], 1, 7),
    portalGate("source-lv130-gate-07", "pink", "bottom", [5, 2], 1, 3),
    portalGate("source-lv130-gate-08", "blue", "top", [3, 4], 2),
    portalGate("source-lv130-gate-09", "yellow", "left", [2, 4], 2),
    portalGate("source-lv130-gate-10", "green", "left", [2, 6], 2),
    portalGate("source-lv130-gate-11", "red", "right", [5, 4], 2),
    portalGate("source-lv130-gate-12", "purple", "right", [5, 6], 2),
  ],
  blocks: [
    block("lv130-opening-b01", 0, 0, S, "pink", { lockedBy: "lv130-lock-a", lockCount: 1 }),
    block("lv130-opening-b02", 1, 0, S, "purple", { lockedBy: "lv130-lock-b", lockCount: 1 }),
    block("lv130-opening-b03", 2, 0, S, "green"),
    block("lv130-opening-b04", 3, 0, H2, "blue", { lockedBy: "lv130-lock-c", lockCount: 1 }),
    block("lv130-opening-b05", 5, 0, S, "green"),
    block("lv130-opening-b06", 6, 0, S, "purple"),
    block("lv130-opening-b07", 7, 0, S, "cyan"),
    block("lv130-opening-b08", 0, 1, S, "red", { keyId: "lv130-lock-a" }),
    block("lv130-opening-b09", 1, 1, S, "pink"),
    block("lv130-opening-b10", 2, 1, S, "purple"),
    block("lv130-opening-b11", 3, 1, S, "green"),
    block("lv130-opening-b12", 4, 1, S, "yellow"),
    block("lv130-opening-b13", 5, 1, S, "purple"),
    block("lv130-opening-b14", 6, 1, S, "pink"),
    block("lv130-opening-b15", 7, 1, V2, "yellow", { keyId: "lv130-lock-b" }),
    block("lv130-opening-b16", 0, 2, H2, "yellow"),
    block("lv130-opening-b17", 2, 2, S, "cyan", { keyId: "lv130-lock-c" }),
    block("lv130-opening-b18", 3, 2, S, "yellow"),
    block("lv130-opening-b19", 4, 2, S, "cyan"),
    block("lv130-opening-b20", 5, 2, S, "yellow"),
    block("sr130-a", 2, 4, LA, "yellow", { shutterId: LV130_COVER }),
    block("sr130-b", 4, 4, LB, "red", { shutterId: LV130_COVER }),
    block("sr130-c", 3, 5, SQ2, "blue", { shutterId: LV130_COVER }),
    block("sr130-d", 2, 6, LC, "green", { shutterId: LV130_COVER }),
    block("sr130-e", 4, 6, LD, "purple", { shutterId: LV130_COVER }),
  ],
  shutters: [{ id: LV130_COVER, x: 2, y: 4, width: 4, height: 4, count: 20, skin: "shutter" }],
};

const CONTRACTS: Readonly<Partial<Record<number, LocalPortalContract>>> = {
  73: LV73,
  75: LV75,
  83: LV83,
  130: LV130,
};

/**
 * Replaces proxy outer-rim exits with the competitor-observed local apertures.
 * Every physical aperture remains an independent GateSpec with exactly one portal.
 */
export const applyCompetitorLocalPortalRepair = (source: LevelSpec): LevelSpec => {
  const contract = CONTRACTS[source.id];
  if (!contract) return source;
  if (source.playable === contract.playable
    && source.gates === contract.gates
    && source.blocks === contract.blocks
    && source.shutters === contract.shutters) return source;
  return {
    ...source,
    width: contract.width,
    height: contract.height,
    playable: contract.playable,
    blocked: undefined,
    seams: undefined,
    gates: contract.gates,
    blocks: contract.blocks,
    shutters: contract.shutters,
    flipDoors: undefined,
    coloredGrids: undefined,
    generators: undefined,
    elevators: undefined,
    conveyors: undefined,
    bombFailurePolicy: undefined,
  };
};
