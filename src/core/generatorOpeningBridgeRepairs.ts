import type { GateSpec, LevelSpec } from "./types";

export const GENERATOR_OPENING_BRIDGE_REPAIR_VERSION = "generator-opening-bridge-r1" as const;
export const GENERATOR_OPENING_BRIDGE_REPAIR_LEVEL_IDS = [71, 183] as const;

const LV71_OPENING = new Map<string, readonly [number, number]>([
  ["cc-piece-s1-01", [5, 5]],
  ["cc-piece-s1-02", [4, 5]],
  ["cc-piece-s1-03", [5, 6]],
  ["cc-piece-s1-04", [3, 7]],
  ["cc-piece-s1-05", [3, 5]],
  ["cc-piece-s1-06", [4, 8]],
  ["strategy-guard-s1-07", [6, 7]],
  ["cc-piece-s1-08", [4, 4]],
  ["strategy-guard-s1-09", [3, 8]],
  ["cc-piece-s1-10", [1, 7]],
  ["cc-piece-s1-11", [0, 7]],
]);

const LV71_GATES = new Map<string, Pick<GateSpec, "side" | "offset">>([
  ["sr-gate-71-green", { side: "left", offset: 6 }],
  ["sr-gate-71-orange", { side: "right", offset: 4 }],
  ["sr-gate-71-blue", { side: "bottom", offset: 6 }],
]);

const LV183_OPENING = new Map<string, readonly [number, number]>([
  ["lv183-opening-b01", [0, 4]],
  ["lv183-opening-b02", [4, 0]],
  ["lv183-opening-b03", [5, 7]],
  ["lv183-opening-b04", [3, 3]],
  ["lv183-opening-b05", [0, 8]],
  ["lv183-opening-b06", [3, 6]],
  ["lv183-opening-b07", [5, 5]],
  ["lv183-opening-b08", [0, 0]],
  ["lv183-opening-b09", [3, 8]],
  ["lv183-opening-b10", [1, 0]],
  ["lv183-opening-b11", [0, 2]],
  ["lv183-opening-b12", [2, 8]],
  ["lv183-opening-b13", [2, 1]],
  ["lv183-opening-b14", [3, 0]],
]);

const patchLevel71 = (source: LevelSpec): LevelSpec => {
  const blockIds = new Set(source.blocks.map((block) => block.id));
  for (const id of [...LV71_OPENING.keys(), "cc-piece-s3-04"]) {
    if (!blockIds.has(id)) throw new Error(`Lv71 generator opening bridge source drift at ${id}`);
  }
  const gateIds = new Set(source.gates.map((gate) => gate.id));
  for (const id of LV71_GATES.keys()) {
    if (!gateIds.has(id)) throw new Error(`Lv71 generator opening bridge gate drift at ${id}`);
  }
  let changed = false;
  const blocks = source.blocks.map((block) => {
    const opening = LV71_OPENING.get(block.id);
    if (opening) {
      if (block.x === opening[0] && block.y === opening[1] && block.shutterId === undefined) return block;
      const { shutterId: _staging, ...visible } = block;
      changed = true;
      return { ...visible, x: opening[0], y: opening[1] };
    }
    if (block.id !== "cc-piece-s3-04") return block;
    if (block.x === 4 && block.y === 2 && block.shutterId === "vp-071-cover-1") return block;
    changed = true;
    return { ...block, x: 4, y: 2, shutterId: "vp-071-cover-1" };
  });
  const gates = source.gates.map((gate) => {
    const target = LV71_GATES.get(gate.id);
    if (!target || gate.side === target.side && gate.offset === target.offset) return gate;
    changed = true;
    return { ...gate, ...target };
  });
  return changed ? { ...source, blocks, gates } : source;
};

const patchLevel183 = (source: LevelSpec): LevelSpec => {
  const blockIds = new Set(source.blocks.map((block) => block.id));
  for (const id of [...LV183_OPENING.keys(), "lv183-generator-1-b04"]) {
    if (!blockIds.has(id)) throw new Error(`Lv183 generator opening bridge source drift at ${id}`);
  }
  let changed = false;
  const blocks = source.blocks.map((block) => {
    const opening = LV183_OPENING.get(block.id);
    if (opening) {
      const removeStage = Number(block.id.slice(-2)) >= 4;
      const stageMatches = !removeStage || block.shutterId === undefined;
      const axisMatches = block.id !== "lv183-opening-b10" || block.movementAxis === "vertical";
      if (block.x === opening[0] && block.y === opening[1] && stageMatches && axisMatches) return block;
      changed = true;
      const movementAxis = block.id === "lv183-opening-b10" ? { movementAxis: "vertical" as const } : {};
      if (!removeStage) return { ...block, x: opening[0], y: opening[1], ...movementAxis };
      const { shutterId: _staging, ...visible } = block;
      return { ...visible, x: opening[0], y: opening[1], ...movementAxis };
    }
    if (block.id !== "lv183-generator-1-b04" || block.movementAxis === undefined) return block;
    const { movementAxis: _axis, ...unrestricted } = block;
    changed = true;
    return unrestricted;
  });
  const referencedShutters = new Set(blocks.flatMap((block) => block.shutterId ? [block.shutterId] : []));
  const shutters = (source.shutters ?? []).filter((shutter) => {
    const keep = shutter.skin !== "staging" || referencedShutters.has(shutter.id);
    if (!keep) changed = true;
    return keep;
  });
  return changed ? { ...source, blocks, shutters } : source;
};

/**
 * Restores competitor-authored opening inventories around blocked generator
 * mouths. Lv71 moves the proven minimum three exits needed before its 12-count
 * cover opens; Lv183 keeps every exit fixed and transfers the competitor's one
 * axis restriction from a hidden cargo block to the authored opening axis
 * block. Machines, queue order/shape/colour and centre-mouth placements are
 * preserved by both repairs.
 */
export const applyGeneratorOpeningBridgeRepair = (source: LevelSpec): LevelSpec => {
  if (source.id === 71) return patchLevel71(source);
  if (source.id === 183) return patchLevel183(source);
  return source;
};
