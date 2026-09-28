import type { BlockSpec, LevelSpec, ShutterSpec } from "./types";

export const COMPETITOR_SHUTTER_CONTRACT_REPAIR_VERSION = "competitor-shutter-contract-r2" as const;

export const COMPETITOR_SHUTTER_CONTRACT_REPAIR_LEVEL_IDS = [28, 98] as const;

const LV28_OPENING_POSITIONS: Readonly<Record<string, readonly [number, number]>> = {
  "cc-028-b1-01": [0, 6],
  "cc-028-b1-02": [3, 6],
  "cc-028-b1-03": [0, 8],
  "cc-028-b1-04": [0, 7],
  "cc-028-b1-05": [3, 8],
  "cc-028-b1-06": [3, 7],
};

const LV28_HIDDEN_POSITIONS: Readonly<Record<string, readonly [number, number, string]>> = {
  "cc-028-b2-03": [0, 3, "vp-028-cover-1"],
  "cc-028-b2-05": [2, 3, "vp-028-cover-1"],
  "cc-028-b2-01": [3, 3, "vp-028-cover-1"],
  "cc-028-b2-06": [4, 3, "vp-028-cover-1"],
  "cc-028-b2-07": [0, 4, "vp-028-cover-1"],
  "cc-028-b2-02": [2, 5, "vp-028-cover-1"],
  "cc-028-b2-04": [4, 5, "vp-028-cover-1"],
  "cc-028-b3-04": [0, 0, "vp-028-cover-2"],
  "cc-028-b3-01": [2, 0, "vp-028-cover-2"],
  "cc-028-b3-02": [3, 0, "vp-028-cover-2"],
  "cc-028-b3-03": [4, 0, "vp-028-cover-2"],
  "cc-028-b3-05": [5, 0, "vp-028-cover-2"],
  "cc-028-b3-06": [0, 2, "vp-028-cover-2"],
};

const LV28_STAGE_IDS = new Set([
  "sr-28-0", "sr-28-4", "sr-28-5", "sr-28-6", "sr-28-7", "sr-28-9", "sr-28-10",
  "sr-28-12", "sr-28-13", "sr-28-14", "sr-28-15", "sr-28-16", "sr-28-17",
]);

const LV28_SHUTTERS: Readonly<Record<string, Readonly<Pick<ShutterSpec, "x" | "y" | "width" | "height" | "count">>>> = {
  "vp-028-cover-1": { x: 0, y: 3, width: 6, height: 3, count: 3 },
  "vp-028-cover-2": { x: 0, y: 0, width: 6, height: 3, count: 7 },
};

const LV98_OPENING_POSITIONS: Readonly<Record<string, readonly [number, number]>> = {
  "cc-098-b1-01": [1, 6],
  "cc-098-b1-02": [2, 6],
  "cc-098-b1-03": [3, 6],
  "cc-098-b1-04": [1, 5],
  "cc-098-b1-05": [0, 5],
  "cc-098-b1-06": [2, 3],
  "cc-098-b1-07": [2, 3],
  "cc-098-b1-08": [0, 3],
  "cc-098-b1-09": [4, 5],
  "cc-098-b1-10": [0, 7],
  "cc-098-b1-11": [1, 8],
  "cc-098-b1-12": [4, 3],
  "cc-098-b1-13": [3, 8],
  "cc-098-b1-14": [2, 9],
};

const LV98_HIDDEN_POSITIONS: Readonly<Record<string, readonly [number, number, string]>> = {
  "cc-098-b2-01": [5, 2, "vp-098-cover-1"],
  "cc-098-b2-02": [5, 1, "vp-098-cover-1"],
  "cc-098-b3-01": [5, 8, "vp-098-cover-2"],
  "cc-098-b3-02": [6, 6, "vp-098-cover-2"],
  "cc-098-b3-03": [5, 6, "vp-098-cover-2"],
};

const LV98_STAGE_IDS = new Set(["sr-98-8", "sr-98-10", "sr-98-14", "sr-98-15", "sr-98-18"]);

const LV98_SHUTTERS: Readonly<Record<string, Readonly<Pick<ShutterSpec, "x" | "y" | "width" | "height" | "count">>>> = {
  "vp-098-cover-1": { x: 5, y: 1, width: 3, height: 5, count: 9 },
  "vp-098-cover-2": { x: 5, y: 6, width: 3, height: 4, count: 14 },
};

const blockMatches = (block: BlockSpec, x: number, y: number, shutterId?: string): boolean => (
  block.x === x && block.y === y && block.shutterId === shutterId
);

const patchLevel28 = (source: LevelSpec): LevelSpec => {
  const blockById = new Map(source.blocks.map((block) => [block.id, block]));
  for (const id of [...Object.keys(LV28_OPENING_POSITIONS), ...Object.keys(LV28_HIDDEN_POSITIONS)]) {
    if (!blockById.has(id)) throw new Error(`Lv28 shutter contract source drift at ${id}`);
  }
  const shutterById = new Map((source.shutters ?? []).map((shutter) => [shutter.id, shutter]));
  for (const id of Object.keys(LV28_SHUTTERS)) {
    if (!shutterById.has(id)) throw new Error(`Lv28 shutter contract source drift at ${id}`);
  }
  const presentStageCount = [...LV28_STAGE_IDS].filter((id) => shutterById.has(id)).length;
  if (presentStageCount !== 0 && presentStageCount !== LV28_STAGE_IDS.size) {
    throw new Error("Lv28 shutter contract is partially applied");
  }
  const alreadyApplied = presentStageCount === 0
    && Object.entries(LV28_OPENING_POSITIONS).every(([id, [x, y]]) => blockMatches(blockById.get(id)!, x, y))
    && Object.entries(LV28_HIDDEN_POSITIONS).every(([id, [x, y, shutterId]]) => (
      blockMatches(blockById.get(id)!, x, y, shutterId)
    ))
    && Object.entries(LV28_SHUTTERS).every(([id, target]) => {
      const shutter = shutterById.get(id)!;
      return Object.entries(target).every(([field, value]) => shutter[field as keyof typeof target] === value);
    });
  if (alreadyApplied) return source;

  return {
    ...source,
    blocks: source.blocks.map((block): BlockSpec => {
      const opening = LV28_OPENING_POSITIONS[block.id];
      if (opening) {
        const { shutterId: _shutterId, ...rest } = block;
        return { ...rest, x: opening[0], y: opening[1] };
      }
      const hidden = LV28_HIDDEN_POSITIONS[block.id];
      return hidden
        ? { ...block, x: hidden[0], y: hidden[1], shutterId: hidden[2] }
        : block;
    }),
    shutters: source.shutters
      ?.filter((shutter) => !LV28_STAGE_IDS.has(shutter.id))
      .map((shutter): ShutterSpec => {
        const target = LV28_SHUTTERS[shutter.id];
        return target ? { ...shutter, ...target, skin: "shutter" } : shutter;
      }),
  };
};

const patchLevel98 = (source: LevelSpec): LevelSpec => {
  const blockById = new Map(source.blocks.map((block) => [block.id, block]));
  for (const id of [...Object.keys(LV98_OPENING_POSITIONS), ...Object.keys(LV98_HIDDEN_POSITIONS)]) {
    if (!blockById.has(id)) throw new Error(`Lv98 shutter contract source drift at ${id}`);
  }
  const shutterById = new Map((source.shutters ?? []).map((shutter) => [shutter.id, shutter]));
  for (const id of Object.keys(LV98_SHUTTERS)) {
    if (!shutterById.has(id)) throw new Error(`Lv98 shutter contract source drift at ${id}`);
  }
  const presentStageCount = [...LV98_STAGE_IDS].filter((id) => shutterById.has(id)).length;
  if (presentStageCount !== 0 && presentStageCount !== LV98_STAGE_IDS.size) {
    throw new Error("Lv98 shutter contract is partially applied");
  }
  const alreadyApplied = presentStageCount === 0
    && Object.entries(LV98_OPENING_POSITIONS).every(([id, [x, y]]) => blockMatches(blockById.get(id)!, x, y))
    && Object.entries(LV98_HIDDEN_POSITIONS).every(([id, [x, y, shutterId]]) => (
      blockMatches(blockById.get(id)!, x, y, shutterId)
    ))
    && Object.entries(LV98_SHUTTERS).every(([id, target]) => {
      const shutter = shutterById.get(id)!;
      return Object.entries(target).every(([field, value]) => shutter[field as keyof typeof target] === value);
    });
  if (alreadyApplied) return source;

  return {
    ...source,
    blocks: source.blocks.map((block): BlockSpec => {
      const opening = LV98_OPENING_POSITIONS[block.id];
      if (opening) {
        const { shutterId: _shutterId, ...rest } = block;
        return { ...rest, x: opening[0], y: opening[1] };
      }
      const hidden = LV98_HIDDEN_POSITIONS[block.id];
      return hidden
        ? { ...block, x: hidden[0], y: hidden[1], shutterId: hidden[2] }
        : block;
    }),
    shutters: source.shutters
      ?.filter((shutter) => !LV98_STAGE_IDS.has(shutter.id))
      .map((shutter): ShutterSpec => {
        const target = LV98_SHUTTERS[shutter.id];
        return target ? { ...shutter, ...target, skin: "shutter" } : shutter;
      }),
  };
};

/**
 * Restores source-observed player-facing shutters and packs the exact hidden
 * cohorts into the same rectangles, so the art, reserved area and collision
 * contract cannot diverge.
 */
export const applyCompetitorShutterContractRepair = (source: LevelSpec): LevelSpec => (
  source.id === 28 ? patchLevel28(source) : source.id === 98 ? patchLevel98(source) : source
);
