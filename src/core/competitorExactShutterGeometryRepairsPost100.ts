import type { BlockSpec, LevelSpec, ShutterSpec } from "./types";

export const COMPETITOR_EXACT_SHUTTER_GEOMETRY_POST100_VERSION = "competitor-exact-shutter-geometry-post100-r1" as const;
export const COMPETITOR_EXACT_SHUTTER_GEOMETRY_POST100_LEVEL_IDS = [137, 154] as const;

type Placement = readonly [blockId: string, x: number, y: number];
type Repair = readonly [x: number, y: number, width: number, height: number, count: number, ...placements: Placement[]];

// Only solver-certified exact rectangles are promoted. The two boundary
// pieces make the direct hidden cohort span the same rectangle as the visible
// shutter without adding/removing a campaign piece.
const REPAIRS = new Map<number, Repair>([
  [137, [0, 0, 4, 5, 3,
    ["lv137-opening-b02", 0, 0],
    ["lv137-cover-count-3-inferred-batch-b02", 3, 4]]],
  [154, [0, 6, 8, 6, 10,
    ["lv154-opening-b30", 0, 6],
    ["lv154-opening-b36", 7, 11]]],
]);

const isManaged = (shutter: ShutterSpec): boolean => shutter.skin === "staging"
  || (shutter.count > 0 && (shutter.skin === undefined || shutter.skin === "shutter"));

/**
 * Promote the two independently certified post-100 competitor rectangles.
 * Remaining non-spatial cargo keeps a deterministic one-piece staging
 * corridor; the exact player-facing countdown is skipped by that corridor so
 * the direct cohort alone owns the visible rectangle and release event.
 */
export const applyCompetitorExactShutterGeometryRepairPost100 = (level: LevelSpec): LevelSpec => {
  const repair = REPAIRS.get(level.id);
  if (!repair) return level;
  const [x, y, width, height, count, ...placements] = repair;
  const managed = new Map((level.shutters ?? []).filter(isManaged).map((shutter) => [shutter.id, shutter]));
  const placed = new Map(placements.map(([id, blockX, blockY]) => [id, { x: blockX, y: blockY }]));
  const remaining = level.blocks.filter((block) => block.shutterId && managed.has(block.shutterId) && !placed.has(block.id))
    .toSorted((left, right) => (
      managed.get(left.shutterId!)!.count - managed.get(right.shutterId!)!.count
      || left.id.localeCompare(right.id)
    ));
  const stageByBlock = new Map<string, { id: string; count: number }>();
  let stageCount = 1;
  for (const block of remaining) {
    if (stageCount === count) stageCount += 1;
    stageByBlock.set(block.id, {
      id: `competitor-exact-cover-${level.id}-stage-${stageByBlock.size + 1}`,
      count: stageCount,
    });
    stageCount += 1;
  }
  const panelId = `competitor-exact-cover-${level.id}-1`;
  const blocks: BlockSpec[] = level.blocks.map((block) => {
    const position = placed.get(block.id);
    if (position) return { ...block, ...position, shutterId: panelId };
    const stage = stageByBlock.get(block.id);
    return stage ? { ...block, shutterId: stage.id } : block;
  });
  const preserved = (level.shutters ?? []).filter((shutter) => !managed.has(shutter.id));
  const shutters: ShutterSpec[] = [
    ...preserved,
    ...[...stageByBlock.values()].map((stage): ShutterSpec => ({
      id: stage.id,
      x: 0,
      y: 0,
      width: 1,
      height: 1,
      count: stage.count,
      skin: "staging",
    })),
    { id: panelId, x, y, width, height, count, skin: "shutter" },
  ];
  return { ...level, blocks, shutters };
};
