import type { LevelSpec, ShutterSpec } from "./types";

export const SHUTTER_GEOMETRY_COVERAGE_REPAIR_VERSION = "exact-visible-cover-bounds-r1" as const;

/** Solver-certified panels whose hidden cohort needed repacking to its full rectangle. */
export const SHUTTER_GEOMETRY_BOUND_REPAIR_LEVEL_IDS = [55, 103, 105, 112] as const;

/**
 * These panels had a same-count one-block `${panel}-cargo-stage` introduced
 * by an older normalizer.  Each listed placement was independently solved:
 * panel and cargo move together to one free physical region, while the shared
 * countdown preserves the original reveal turn.
 */
export const SHUTTER_GEOMETRY_BINDING_REPAIR_LEVEL_IDS = [
  29, 39, 64, 73, 110, 119, 129, 134, 154, 179, 189, 194,
] as const;

export const SHUTTER_GEOMETRY_COVERAGE_REPAIR_LEVEL_IDS = [
  ...SHUTTER_GEOMETRY_BINDING_REPAIR_LEVEL_IDS,
  ...SHUTTER_GEOMETRY_BOUND_REPAIR_LEVEL_IDS,
] as const;

type Position = readonly [x: number, y: number];

// Keep source-backed cover geometry (including the exact post-100 rectangles)
// and minimally move hidden pieces so their occupied bounds reach every edge.
const BLOCK_POSITIONS = new Map<string, Position>([
  ["55:cc-piece-s2-02", [4, 6]],
  ["103:lv103-pooled-hidden-b05", [5, 0]],
  ["103:lv103-pooled-hidden-b07", [1, 2]],
  ["103:lv103-pooled-hidden-b08", [0, 9]],
  ["105:lv105-pooled-hidden-b05", [5, 0]],
  ["105:lv105-pooled-hidden-b09", [3, 3]],
  ["105:lv105-pooled-hidden-b10", [1, 7]],
  ["112:lv112-pooled-hidden-b03", [4, 1]],
  ["112:lv112-pooled-hidden-b02", [5, 2]],
]);

type BindingRepair = readonly [
  panelId: string,
  blockId: string,
  x: number,
  y: number,
  width: number,
  height: number,
];

const BINDINGS = new Map<number, BindingRepair>([
  [29, ["opening-repair-stage-29-0", "cc-029-b1-04", 1, 1, 1, 1]],
  [39, ["solvability-repair-stage-39-1", "cc-039-b1-01", 1, 1, 1, 1]],
  [64, ["solvability-repair-stage-64-1", "cc-064-b1-01", 3, 0, 1, 1]],
  [73, ["solvability-repair-stage-73-2", "cc-piece-s1-04", 2, 3, 2, 2]],
  [110, ["solvability-repair-stage-110-4", "lv110-opening-b07", 2, 0, 2, 1]],
  [119, ["solvability-repair-stage-119-6", "lv119-opening-b09", 0, 5, 2, 1]],
  [129, ["solvability-repair-stage-129-7", "lv129-opening-b10", 2, 1, 1, 2]],
  [134, ["solvability-repair-stage-134-3", "lv134-opening-b06", 0, 5, 1, 2]],
  [154, ["solvability-repair-stage-154-1", "lv154-opening-b03", 2, 1, 2, 3]],
  [179, ["solvability-repair-stage-179-4", "lv179-opening-b07", 3, 1, 2, 2]],
  [189, ["solvability-repair-stage-189-6", "lv189-opening-b09", 4, 0, 1, 2]],
  [194, ["solvability-repair-stage-194-5", "lv194-opening-b08", 0, 12, 1, 2]],
]);

const isPlayerFacing = (shutter: ShutterSpec): boolean => shutter.count > 0
  && (shutter.skin === undefined || shutter.skin === "shutter");

/**
 * Make the visible shutter, its physical collision footprint and its direct
 * hidden cohort describe the same board rectangle.  Internal staging devices
 * remain non-spatial and are ignored unless they are the certified duplicate
 * of one visible panel listed above.
 */
export const applyShutterGeometryCoverageRepair = (level: LevelSpec): LevelSpec => {
  const shutters = level.shutters ?? [];
  const stageToPanel = new Map<string, string>();
  const binding = BINDINGS.get(level.id);
  if (binding) {
    const [panelId, blockId] = binding;
    const panel = shutters.find((shutter) => shutter.id === panelId && isPlayerFacing(shutter));
    const stageId = `${panelId}-cargo-stage`;
    const stage = shutters.find((shutter) => shutter.id === stageId && shutter.skin === "staging");
    const cargo = level.blocks.filter((block) => block.shutterId === stageId);
    if (panel && stage?.count === panel.count && cargo.length === 1 && cargo[0]?.id === blockId) {
      stageToPanel.set(stageId, panelId);
    }
  }

  let changed = stageToPanel.size > 0;
  const blocks = level.blocks.map((block) => {
    const panelId = block.shutterId && stageToPanel.get(block.shutterId);
    const bindingPosition = binding && block.id === binding[1] && stageToPanel.size
      ? [binding[2], binding[3]] as const
      : undefined;
    const position = bindingPosition ?? BLOCK_POSITIONS.get(`${level.id}:${block.id}`);
    if (!panelId && (!position || (position[0] === block.x && position[1] === block.y))) return block;
    changed = true;
    return {
      ...block,
      ...(panelId ? { shutterId: panelId } : {}),
      ...(position ? { x: position[0], y: position[1] } : {}),
    };
  });
  const repairedShutters: ShutterSpec[] = [];
  for (const shutter of shutters) {
    if (stageToPanel.has(shutter.id)) {
      changed = true;
      continue;
    }
    if (binding && stageToPanel.size && shutter.id === binding[0]) {
      changed = true;
      repairedShutters.push({
        ...shutter,
        x: binding[2],
        y: binding[3],
        width: binding[4],
        height: binding[5],
      });
    } else repairedShutters.push(shutter);
  }
  return changed ? { ...level, blocks, shutters: repairedShutters } : level;
};
