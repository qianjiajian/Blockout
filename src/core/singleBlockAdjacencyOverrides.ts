import { applyOpeningPreservingRepair } from "./singleBlockAdjacencyRepairs";
import type { BlockColor, LevelSpec } from "./types";

/** Runtime correction for opening-visible singleton colour adjacency. */
export const SINGLE_BLOCK_ADJACENCY_POLICY_VERSION = "visible-singleton-no-same-color-v1" as const;
export const SINGLE_BLOCK_ADJACENCY_LEVEL_IDS = [4,5,6,8,10,11,14,16,17,19,22,25,27,29,33,40,41,42,48,49,56,58,59,60,61,63,69,71,74,75,76,79,82,84,85,86,88,89,91,93,94,96,97,106,107,108,112,114,116,117,124,127,130,158,193] as const;
export const SINGLE_BLOCK_COLOR_ONLY_SOLVED_LEVEL_IDS = [4,5,6,14,25,40,41,56,59,61,63,75,82,84,85,86,89,91,97,107,108,112,114,116,127,130,158] as const;

export type SingleBlockColorPatch = { readonly blockId: string; readonly from: BlockColor; readonly color: BlockColor };
export const SINGLE_BLOCK_COLOR_PATCHES: Readonly<Record<number, readonly SingleBlockColorPatch[]>> = {
  5: [
    {"blockId":"cc-piece-11","from":"red","color":"green"},
    {"blockId":"cc-piece-15","from":"orange","color":"red"},
    {"blockId":"cc-piece-10","from":"orange","color":"green"},
    {"blockId":"cc-piece-16","from":"green","color":"orange"},
    {"blockId":"strategy-guard-01","from":"orange","color":"red"},
    {"blockId":"strategy-guard-02","from":"red","color":"orange"},
    {"blockId":"cc-piece-08","from":"green","color":"red"},
    {"blockId":"cc-piece-18","from":"orange","color":"red"},
    {"blockId":"strategy-guard-04","from":"orange","color":"green"},
  ],
  4: [
    {"blockId":"cc-piece-02","from":"purple","color":"red"},
    {"blockId":"cc-piece-01","from":"blue","color":"green"},
    {"blockId":"strategy-guard-06","from":"orange","color":"blue"},
  ],
  6: [
    {"blockId":"cc-piece-16","from":"pink","color":"yellow"},
    {"blockId":"strategy-guard-14","from":"blue","color":"yellow"},
    {"blockId":"strategy-guard-18","from":"blue","color":"purple"},
    {"blockId":"strategy-guard-11","from":"pink","color":"yellow"},
  ],
  8: [
    {"blockId":"cc-piece-13","from":"green","color":"blue"},
    {"blockId":"cc-piece-16","from":"blue","color":"green"},
    {"blockId":"cc-piece-25","from":"purple","color":"blue"},
    {"blockId":"cc-piece-10","from":"green","color":"blue"},
    {"blockId":"cc-piece-11","from":"blue","color":"green"},
    {"blockId":"cc-piece-22","from":"blue","color":"purple"},
    {"blockId":"cc-piece-03","from":"cyan","color":"blue"},
    {"blockId":"cc-piece-24","from":"purple","color":"blue"},
    {"blockId":"cc-piece-02","from":"blue","color":"green"},
    {"blockId":"strategy-guard-05","from":"blue","color":"green"},
    {"blockId":"cc-piece-18","from":"cyan","color":"green"},
    {"blockId":"strategy-guard-21","from":"green","color":"blue"},
  ],
  10: [
    {"blockId":"cc-010-b1-19","from":"pink","color":"yellow"},
    {"blockId":"cc-010-b1-01","from":"yellow","color":"pink"},
    {"blockId":"cc-010-b1-02","from":"red","color":"yellow"},
    {"blockId":"cc-010-b1-03","from":"red","color":"pink"},
    {"blockId":"cc-010-b1-21","from":"pink","color":"red"},
    {"blockId":"cc-010-b1-05","from":"red","color":"pink"},
  ],
  11: [
    {"blockId":"piece-19","from":"orange","color":"blue"},
    {"blockId":"piece-21","from":"orange","color":"blue"},
    {"blockId":"piece-16","from":"orange","color":"purple"},
    {"blockId":"piece-22","from":"orange","color":"purple"},
    {"blockId":"piece-14","from":"purple","color":"blue"},
    {"blockId":"piece-15","from":"blue","color":"green"},
  ],
  14: [
    {"blockId":"cc-piece-01","from":"green","color":"red"},
    {"blockId":"cc-piece-08","from":"purple","color":"red"},
    {"blockId":"cc-piece-17","from":"green","color":"purple"},
    {"blockId":"cc-piece-11","from":"purple","color":"orange"},
  ],
  16: [
    {"blockId":"cc-016-b1-01","from":"green","color":"blue"},
    {"blockId":"cc-016-b1-05","from":"orange","color":"blue"},
    {"blockId":"cc-016-b1-18","from":"purple","color":"blue"},
    {"blockId":"cc-016-b1-03","from":"blue","color":"purple"},
    {"blockId":"cc-016-b1-15","from":"orange","color":"blue"},
    {"blockId":"cc-016-b1-17","from":"green","color":"purple"},
  ],
  17: [
    {"blockId":"cc-017-b1-04","from":"purple","color":"yellow"},
    {"blockId":"cc-017-b1-02","from":"purple","color":"yellow"},
    {"blockId":"cc-017-b1-14","from":"yellow","color":"blue"},
    {"blockId":"cc-017-b1-23","from":"purple","color":"blue"},
    {"blockId":"cc-017-b1-26","from":"purple","color":"blue"},
    {"blockId":"cc-017-b1-07","from":"blue","color":"yellow"},
    {"blockId":"cc-017-b1-13","from":"purple","color":"blue"},
    {"blockId":"cc-017-b1-21","from":"purple","color":"yellow"},
  ],
  19: [
    {"blockId":"core-019-c01","from":"cyan","color":"blue"},
    {"blockId":"core-019-c10","from":"green","color":"blue"},
    {"blockId":"core-019-c03","from":"cyan","color":"blue"},
    {"blockId":"core-019-c07","from":"cyan","color":"blue"},
    {"blockId":"core-019-c09","from":"green","color":"yellow"},
  ],
  22: [
    {"blockId":"cc-piece-s1-06","from":"yellow","color":"blue"},
    {"blockId":"cc-piece-s1-17","from":"yellow","color":"green"},
    {"blockId":"cc-piece-s1-01","from":"yellow","color":"green"},
    {"blockId":"cc-piece-s1-05","from":"pink","color":"green"},
  ],
  25: [
    {"blockId":"cc-piece-11","from":"orange","color":"red"},
    {"blockId":"cc-piece-22","from":"pink","color":"red"},
  ],
  27: [
    {"blockId":"cc-027-b1-06","from":"cyan","color":"blue"},
    {"blockId":"cc-027-b1-07","from":"blue","color":"green"},
    {"blockId":"cc-027-b1-01","from":"blue","color":"green"},
    {"blockId":"cc-027-b1-09","from":"cyan","color":"blue"},
  ],
  29: [
    {"blockId":"cc-029-b1-05","from":"green","color":"red"},
    {"blockId":"cc-029-b1-02","from":"red","color":"blue"},
    {"blockId":"cc-029-b1-04","from":"green","color":"blue"},
    {"blockId":"cc-029-b1-10","from":"green","color":"red"},
    {"blockId":"cc-029-b1-11","from":"green","color":"red"},
    {"blockId":"cc-029-b1-16","from":"green","color":"blue"},
    {"blockId":"cc-029-b1-17","from":"green","color":"red"},
    {"blockId":"cc-029-b1-15","from":"green","color":"red"},
    {"blockId":"cc-029-b1-06","from":"red","color":"blue"},
    {"blockId":"cc-029-b1-12","from":"red","color":"blue"},
    {"blockId":"cc-029-b1-08","from":"red","color":"blue"},
    {"blockId":"cc-029-b1-14","from":"red","color":"blue"},
    {"blockId":"cc-029-b1-19","from":"red","color":"blue"},
  ],
  33: [
    {"blockId":"strategy-guard-06","from":"yellow","color":"red"},
    {"blockId":"strategy-guard-07","from":"red","color":"blue"},
    {"blockId":"cc-piece-10","from":"yellow","color":"red"},
    {"blockId":"cc-piece-17","from":"blue","color":"red"},
  ],
  40: [
    {"blockId":"cc-040-b1-02","from":"purple","color":"blue"},
  ],
  41: [
    {"blockId":"cc-041-b1-11","from":"purple","color":"red"},
  ],
  42: [
    {"blockId":"strategy-guard-09","from":"red","color":"green"},
    {"blockId":"strategy-guard-19","from":"red","color":"green"},
    {"blockId":"cc-piece-24","from":"red","color":"green"},
  ],
  48: [
    {"blockId":"cc-048-b1-08","from":"blue","color":"red"},
    {"blockId":"cc-048-b1-10","from":"blue","color":"green"},
  ],
  49: [
    {"blockId":"cc-049-b1-03","from":"yellow","color":"green"},
    {"blockId":"cc-049-b1-12","from":"orange","color":"blue"},
  ],
  56: [
    {"blockId":"strategy-guard-s1-08","from":"green","color":"red"},
  ],
  58: [
    {"blockId":"cc-058-b1-03","from":"cyan","color":"red"},
    {"blockId":"cc-058-b1-17","from":"cyan","color":"red"},
    {"blockId":"cc-058-b1-18","from":"green","color":"blue"},
    {"blockId":"cc-058-b1-08","from":"pink","color":"red"},
  ],
  59: [
    {"blockId":"cc-059-b1-13","from":"yellow","color":"blue"},
    {"blockId":"cc-059-b1-16","from":"blue","color":"green"},
  ],
  60: [
    {"blockId":"axis-seed-060-12","from":"red","color":"yellow"},
    {"blockId":"axis-seed-060-13","from":"yellow","color":"red"},
    {"blockId":"axis-seed-060-14","from":"pink","color":"yellow"},
    {"blockId":"axis-seed-060-22","from":"red","color":"yellow"},
    {"blockId":"axis-seed-060-23","from":"yellow","color":"red"},
    {"blockId":"axis-seed-060-24","from":"pink","color":"yellow"},
    {"blockId":"axis-seed-060-02","from":"red","color":"yellow"},
    {"blockId":"axis-seed-060-03","from":"yellow","color":"red"},
    {"blockId":"axis-seed-060-04","from":"pink","color":"yellow"},
    {"blockId":"axis-seed-060-11","from":"orange","color":"red"},
    {"blockId":"axis-seed-060-15","from":"orange","color":"red"},
    {"blockId":"axis-seed-060-21","from":"orange","color":"red"},
    {"blockId":"axis-seed-060-25","from":"orange","color":"red"},
    {"blockId":"axis-seed-060-32","from":"red","color":"yellow"},
    {"blockId":"axis-seed-060-33","from":"yellow","color":"red"},
    {"blockId":"axis-seed-060-34","from":"pink","color":"yellow"},
    {"blockId":"axis-seed-060-01","from":"orange","color":"red"},
    {"blockId":"axis-seed-060-05","from":"orange","color":"red"},
    {"blockId":"axis-seed-060-31","from":"orange","color":"red"},
    {"blockId":"axis-seed-060-35","from":"orange","color":"red"},
  ],
  61: [
    {"blockId":"strategy-guard-s1-10","from":"green","color":"orange"},
  ],
  63: [
    {"blockId":"strategy-guard-17","from":"red","color":"blue"},
  ],
  69: [
    {"blockId":"cc-069-b1-07","from":"orange","color":"blue"},
  ],
  71: [
    {"blockId":"cc-piece-s1-01","from":"orange","color":"blue"},
  ],
  74: [
    {"blockId":"cc-074-b1-02","from":"red","color":"green"},
    {"blockId":"cc-074-b1-04","from":"green","color":"yellow"},
    {"blockId":"cc-074-b1-01","from":"green","color":"yellow"},
  ],
  75: [
    {"blockId":"cc-piece-s1-07","from":"yellow","color":"red"},
    {"blockId":"cc-piece-s1-03","from":"cyan","color":"red"},
  ],
  76: [
    {"blockId":"cc-076-b1-02","from":"orange","color":"pink"},
    {"blockId":"cc-076-b1-04","from":"yellow","color":"orange"},
    {"blockId":"cc-076-b1-18","from":"orange","color":"pink"},
  ],
  79: [
    {"blockId":"cc-079-b1-02","from":"green","color":"blue"},
    {"blockId":"cc-079-b1-04","from":"green","color":"red"},
  ],
  82: [
    {"blockId":"cc-piece-01","from":"cyan","color":"red"},
    {"blockId":"cc-piece-05","from":"red","color":"blue"},
    {"blockId":"cc-piece-18","from":"yellow","color":"blue"},
  ],
  84: [
    {"blockId":"cc-084-b1-10","from":"blue","color":"red"},
    {"blockId":"cc-084-b1-03","from":"blue","color":"red"},
  ],
  85: [
    {"blockId":"cc-085-b1-07","from":"red","color":"green"},
  ],
  86: [
    {"blockId":"cc-piece-01","from":"yellow","color":"blue"},
    {"blockId":"strategy-guard-06","from":"cyan","color":"blue"},
  ],
  88: [
    {"blockId":"cc-piece-s1-06","from":"blue","color":"red"},
    {"blockId":"cc-piece-s1-04","from":"blue","color":"red"},
  ],
  89: [
    {"blockId":"cc-089-b1-06","from":"purple","color":"green"},
  ],
  91: [
    {"blockId":"cc-091-b1-08","from":"green","color":"red"},
    {"blockId":"cc-091-b1-03","from":"green","color":"red"},
  ],
  93: [
    {"blockId":"cc-093-b1-02","from":"green","color":"purple"},
    {"blockId":"cc-093-b1-09","from":"red","color":"purple"},
    {"blockId":"cc-093-b1-12","from":"red","color":"green"},
    {"blockId":"cc-093-b1-01","from":"green","color":"orange"},
    {"blockId":"cc-093-b1-04","from":"green","color":"red"},
  ],
  94: [
    {"blockId":"cc-094-b1-05","from":"pink","color":"blue"},
    {"blockId":"cc-094-b1-02","from":"yellow","color":"green"},
    {"blockId":"cc-094-b1-06","from":"blue","color":"green"},
  ],
  96: [
    {"blockId":"cc-piece-07","from":"blue","color":"red"},
    {"blockId":"strategy-guard-29","from":"purple","color":"red"},
    {"blockId":"strategy-guard-02","from":"blue","color":"green"},
  ],
  97: [
    {"blockId":"cc-097-b1-01","from":"yellow","color":"red"},
    {"blockId":"cc-097-b1-08","from":"yellow","color":"blue"},
    {"blockId":"cc-097-b1-13","from":"red","color":"blue"},
    {"blockId":"cc-097-b1-19","from":"yellow","color":"red"},
    {"blockId":"cc-097-b1-27","from":"purple","color":"red"},
    {"blockId":"cc-097-b1-29","from":"blue","color":"red"},
    {"blockId":"cc-097-b1-02","from":"yellow","color":"purple"},
    {"blockId":"cc-097-b1-03","from":"red","color":"blue"},
    {"blockId":"cc-097-b1-04","from":"red","color":"yellow"},
    {"blockId":"cc-097-b1-06","from":"red","color":"yellow"},
    {"blockId":"cc-097-b1-17","from":"red","color":"blue"},
    {"blockId":"cc-097-b1-10","from":"red","color":"yellow"},
  ],
  106: [
    {"blockId":"lv106-opening-b08","from":"blue","color":"green"},
  ],
  107: [
    {"blockId":"lv107-opening-b18","from":"yellow","color":"green"},
    {"blockId":"lv107-opening-b16","from":"pink","color":"green"},
  ],
  108: [
    {"blockId":"lv108-opening-b09","from":"red","color":"blue"},
  ],
  112: [
    {"blockId":"lv112-opening-b10","from":"green","color":"red"},
    {"blockId":"lv112-opening-b13","from":"purple","color":"red"},
  ],
  114: [
    {"blockId":"lv114-opening-b04","from":"green","color":"red"},
    {"blockId":"lv114-opening-b12","from":"blue","color":"red"},
    {"blockId":"lv114-opening-b09","from":"cyan","color":"red"},
    {"blockId":"lv114-opening-b16","from":"red","color":"blue"},
  ],
  116: [
    {"blockId":"lv116-opening-b16","from":"red","color":"purple"},
  ],
  117: [
    {"blockId":"lv117-opening-b11","from":"cyan","color":"red"},
    {"blockId":"lv117-opening-b14","from":"orange","color":"green"},
  ],
  124: [
    {"blockId":"lv124-opening-b15","from":"purple","color":"red"},
    {"blockId":"lv124-opening-b17","from":"orange","color":"red"},
    {"blockId":"lv124-opening-b18","from":"orange","color":"red"},
  ],
  127: [
    {"blockId":"lv127-opening-b07","from":"red","color":"blue"},
  ],
  130: [
    {"blockId":"lv130-opening-b08","from":"blue","color":"red"},
    {"blockId":"lv130-opening-b09","from":"orange","color":"blue"},
    {"blockId":"lv130-opening-b11","from":"green","color":"blue"},
    {"blockId":"lv130-opening-b05","from":"cyan","color":"red"},
    {"blockId":"lv130-opening-b13","from":"yellow","color":"red"},
  ],
  158: [
    {"blockId":"lv158-opening-b14","from":"yellow","color":"pink"},
    {"blockId":"lv158-opening-b16","from":"pink","color":"yellow"},
    {"blockId":"lv158-opening-b17","from":"cyan","color":"purple"},
  ],
  193: [
    {"blockId":"lv193-opening-b06","from":"yellow","color":"red"},
    {"blockId":"lv193-opening-b08","from":"pink","color":"red"},
  ],
};

const PATCH_LEVEL_SET = new Set<number>(SINGLE_BLOCK_ADJACENCY_LEVEL_IDS);
const COLOR_ONLY_SOLVED_SET = new Set<number>(SINGLE_BLOCK_COLOR_ONLY_SOLVED_LEVEL_IDS);

const applyColors = (level: LevelSpec, patches: readonly SingleBlockColorPatch[]): LevelSpec => {
  const byId = new Map(patches.map((patch) => [patch.blockId, patch]));
  return { ...level, blocks: level.blocks.map((block) => {
    const patch = byId.get(block.id);
    if (!patch) return block;
    const current = block.layers?.[0] ?? block.color;
    if (current !== patch.from) throw new Error(`Lv${level.id}/${block.id}: expected ${patch.from}, got ${current}`);
    return { ...block, color: patch.color, ...(block.layers?.length ? { layers: [patch.color, ...block.layers.slice(1)] } : {}) };
  }) };
};

/**
 * Apply the minimal colour plan.  The former implementation sent every
 * colour-only-unsolved level through the broad staging corridor, which hid all
 * but one opening block.  The narrow opening-preserving overlay now repairs
 * only the exact countdown/channel defect for those 28 levels.
 */
export const applySingleBlockAdjacencyRepair = (level: LevelSpec): LevelSpec => {
  const patches = SINGLE_BLOCK_COLOR_PATCHES[level.id];
  if (!patches) return level;
  const recolored = applyColors(level, patches);
  return COLOR_ONLY_SOLVED_SET.has(level.id) ? recolored : applyOpeningPreservingRepair(recolored);
};

export const isSingleBlockAdjacencyRepairLevel = (levelOrId: Pick<LevelSpec, "id"> | number): boolean => PATCH_LEVEL_SET.has(typeof levelOrId === "number" ? levelOrId : levelOrId.id);
