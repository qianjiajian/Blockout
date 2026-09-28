import type {
  BlockColor,
  BlockSpec,
  GateSpec,
  LevelSpec,
  Point,
  ShutterSpec,
  Side,
} from "./types";

export const COMPETITOR_DISCONNECTED_BOARD_REPAIR_VERSION = "competitor-disconnected-board-r1" as const;
export const COMPETITOR_DISCONNECTED_BOARD_REPAIR_LEVEL_IDS = [176, 185] as const;

type BlockPatch = Readonly<{
  x: number;
  y: number;
  color?: BlockColor;
  shutterId?: string | null;
}>;

const fullMask = (width: number, height: number): Point[] => Array.from(
  { length: width * height },
  (_, index) => [index % width, Math.floor(index / width)] as Point,
);

const gate = (
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

const patchBlocks = (
  source: readonly BlockSpec[],
  patches: Readonly<Record<string, BlockPatch>>,
): BlockSpec[] => {
  const sourceIds = new Set(source.map(({ id }) => id));
  for (const id of Object.keys(patches)) {
    if (!sourceIds.has(id)) throw new Error(`disconnected-board block source drift: ${id}`);
  }
  return source.map((block) => {
    const patch = patches[block.id];
    if (!patch) return block;
    const shutterId = patch.shutterId === null ? undefined : patch.shutterId ?? block.shutterId;
    return {
      ...block,
      x: patch.x,
      y: patch.y,
      color: patch.color ?? block.color,
      ...(shutterId ? { shutterId } : { shutterId: undefined }),
    };
  });
};

const LV176_UPPER = "lv176-upper-cover-18";
const LV176_LOWER = "lv176-lower-cover-5";

const LV176_BLOCKS: Readonly<Record<string, BlockPatch>> = {
  "lv176-opening-b01": { x: 0, y: 5, shutterId: null },
  "lv176-opening-b02": { x: 0, y: 8, shutterId: null },
  "lv176-opening-b03": { x: 2, y: 8, color: "blue", shutterId: null },
  "lv176-opening-b04": { x: 0, y: 9, shutterId: null },
  "lv176-opening-b05": { x: 1, y: 9, color: "pink", shutterId: null },
  "lv176-opening-b06": { x: 2, y: 9, color: "green", shutterId: null },
  "lv176-opening-b07": { x: 3, y: 5, shutterId: null },
  "lv176-opening-b08": { x: 3, y: 8, color: "green", shutterId: null },
  "lv176-opening-b09": { x: 3, y: 9, color: "yellow", shutterId: null },

  "lv176-pooled-hidden-b01": { x: 0, y: 0, color: "purple", shutterId: LV176_UPPER },
  "lv176-pooled-hidden-b02": { x: 2, y: 0, shutterId: LV176_UPPER },
  "lv176-pooled-hidden-b03": { x: 4, y: 0, shutterId: LV176_UPPER },
  "lv176-pooled-hidden-b04": { x: 6, y: 0, shutterId: LV176_UPPER },
  "lv176-pooled-hidden-b05": { x: 0, y: 2, color: "blue", shutterId: LV176_UPPER },
  "lv176-pooled-hidden-b07": { x: 1, y: 3, color: "purple", shutterId: LV176_UPPER },

  "lv176-pooled-hidden-b06": { x: 4, y: 7, color: "blue", shutterId: LV176_LOWER },
  "lv176-pooled-hidden-b08": { x: 4, y: 5, color: "red", shutterId: LV176_LOWER },
  "lv176-pooled-hidden-b09": { x: 7, y: 6, shutterId: LV176_LOWER },
  "lv176-pooled-hidden-b10": { x: 6, y: 5, color: "blue", shutterId: LV176_LOWER },
  "lv176-pooled-hidden-b11": { x: 5, y: 6, color: "pink", shutterId: LV176_LOWER },
  "lv176-pooled-hidden-b12": { x: 4, y: 8, color: "red", shutterId: LV176_LOWER },
  "lv176-pooled-hidden-b13": { x: 6, y: 8, shutterId: LV176_LOWER },
  "lv176-pooled-hidden-b14": { x: 4, y: 9, color: "green", shutterId: LV176_LOWER },
  "lv176-pooled-hidden-b15": { x: 6, y: 9, color: "red", shutterId: LV176_LOWER },
};

const LV176_GATES: readonly GateSpec[] = [
  gate("lv176-upper-top-23", "blue", "top", [0, 0], 3, 23),
  gate("lv176-upper-top-22", "red", "top", [6, 0], 2, 22),
  gate("lv176-upper-left-21", "green", "left", [0, 0], 2, 21),
  gate("lv176-upper-right-18a", "cyan", "right", [7, 0], 2, 18),
  gate("lv176-upper-right-18b", "purple", "right", [7, 3], 2, 18),
  gate("lv176-upper-bottom-30", "yellow", "bottom", [2, 4], 2, 30),
  gate("lv176-lower-top-16", "purple", "top", [2, 5], 2, 16),
  gate("lv176-lower-top-12", "blue", "top", [5, 5], 3, 12),
  gate("lv176-lower-left-ordinary", "red", "left", [0, 5], 3),
  gate("lv176-lower-left-4", "yellow", "left", [0, 8], 2, 4),
  gate("lv176-lower-bottom-1", "green", "bottom", [0, 9], 2, 1),
  gate("lv176-lower-bottom-8", "pink", "bottom", [6, 9], 2, 8),
];

const LV176_SHUTTERS: readonly ShutterSpec[] = [
  { id: LV176_UPPER, x: 0, y: 0, width: 8, height: 5, count: 18, skin: "shutter" },
  { id: LV176_LOWER, x: 4, y: 5, width: 4, height: 5, count: 5, skin: "shutter" },
];

const LV185_LOWER = "lv185-lower-cover-14";
const LV185_BLOCKS: Readonly<Record<string, BlockPatch>> = {
  "lv185-opening-b01": { x: 0, y: 0, shutterId: null },
  "lv185-opening-b02": { x: 2, y: 0, color: "cyan", shutterId: null },
  "lv185-opening-b03": { x: 4, y: 0, shutterId: null },
  "lv185-opening-b04": { x: 4, y: 1, color: "red", shutterId: null },
  "lv185-opening-b05": { x: 6, y: 1, color: "green", shutterId: null },
  "lv185-opening-b06": { x: 0, y: 2, shutterId: null },
  "lv185-opening-b07": { x: 2, y: 2, shutterId: null },
  "lv185-opening-b08": { x: 4, y: 2, color: "cyan", shutterId: null },
  "lv185-opening-b09": { x: 0, y: 3, shutterId: null },
  "lv185-opening-b10": { x: 2, y: 3, color: "red", shutterId: null },
  "lv185-opening-b11": { x: 4, y: 3, color: "green", shutterId: null },
  "lv185-opening-b12": { x: 0, y: 4, shutterId: null },
  "lv185-opening-b13": { x: 2, y: 4, shutterId: null },
  "lv185-opening-b14": { x: 4, y: 4, color: "cyan", shutterId: null },
  "lv185-cover-count-14-inferred-batch-b01": { x: 0, y: 5, shutterId: LV185_LOWER },
  "lv185-cover-count-14-inferred-batch-b02": { x: 1, y: 5, shutterId: LV185_LOWER },
  "lv185-cover-count-14-inferred-batch-b03": { x: 3, y: 5, shutterId: LV185_LOWER },
};

const LV185_GATES: readonly GateSpec[] = [
  gate("lv185-upper-top-yellow", "yellow", "top", [0, 0], 2),
  gate("lv185-upper-right-red", "red", "right", [6, 0], 2),
  gate("lv185-upper-right-cyan", "cyan", "right", [6, 3], 2),
  gate("lv185-upper-left-pink", "pink", "left", [0, 4], 1),
  gate("lv185-upper-bottom-green", "green", "bottom", [3, 4], 2),
  gate("lv185-lower-top-14", "yellow", "top", [3, 5], 2, 14),
  gate("lv185-lower-left-14a", "pink", "left", [0, 5], 2, 14),
  gate("lv185-lower-left-14b", "purple", "left", [0, 8], 2, 14),
  gate("lv185-lower-right-14a", "blue", "right", [6, 5], 2, 14),
  gate("lv185-lower-right-14b", "orange", "right", [6, 8], 2, 14),
];

const LV185_SHUTTERS: readonly ShutterSpec[] = [
  { id: LV185_LOWER, x: 0, y: 5, width: 7, height: 5, count: 14, skin: "shutter" },
];

const repair176 = (source: LevelSpec): LevelSpec => ({
  ...source,
  width: 8,
  height: 10,
  playable: fullMask(8, 10),
  blocked: undefined,
  seams: [{ orientation: "horizontal", offset: 5, start: 0, size: 8 }],
  gates: LV176_GATES.map((entry) => ({ ...entry, portals: entry.portals?.map((portal) => ({ ...portal, origin: [...portal.origin] as Point })) })),
  blocks: patchBlocks(source.blocks, LV176_BLOCKS),
  shutters: LV176_SHUTTERS.map((shutter) => ({ ...shutter })),
});

const repair185 = (source: LevelSpec): LevelSpec => ({
  ...source,
  width: 7,
  height: 10,
  playable: fullMask(7, 10),
  blocked: undefined,
  seams: [{ orientation: "horizontal", offset: 5, start: 0, size: 7 }],
  gates: LV185_GATES.map((entry) => ({ ...entry, portals: entry.portals?.map((portal) => ({ ...portal, origin: [...portal.origin] as Point })) })),
  blocks: patchBlocks(source.blocks, LV185_BLOCKS),
  shutters: LV185_SHUTTERS.map((shutter) => ({ ...shutter })),
});

const sameRepair = (source: LevelSpec, repaired: LevelSpec): boolean => (
  JSON.stringify(source) === JSON.stringify(repaired)
);

/** Restores the two video-proven, vertically separated dual-board levels. */
export const applyCompetitorDisconnectedBoardRepair = (source: LevelSpec): LevelSpec => {
  const repaired = source.id === 176 ? repair176(source) : source.id === 185 ? repair185(source) : source;
  return repaired === source || sameRepair(source, repaired) ? source : repaired;
};
