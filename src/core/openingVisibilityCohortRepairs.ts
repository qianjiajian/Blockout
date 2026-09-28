import type { LevelSpec } from "./types";

export const OPENING_VISIBILITY_COHORT_REPAIR_VERSION = "truth-opening-cohort-r1" as const;
export const OPENING_VISIBILITY_COHORT_REPAIR_LEVEL_IDS = [139, 171, 185] as const;

const openingBlockIds = (levelId: number, count: number): readonly string[] => Array.from(
  { length: count },
  (_, index) => `lv${levelId}-opening-b${String(index + 1).padStart(2, "0")}`,
);

const TARGET_OPENING_IDS = new Map<number, readonly string[]>([
  [139, openingBlockIds(139, 16)],
  [171, openingBlockIds(171, 12)],
  [185, openingBlockIds(185, 14)],
]);

const openingVisibleBlockIds = (level: LevelSpec): string[] => {
  const queuedIds = new Set((level.generators ?? []).flatMap((generator) => generator.queueBlockIds));
  const shutterCounts = new Map((level.shutters ?? []).map((shutter) => [shutter.id, shutter.count]));
  return level.blocks
    .filter((block) => !queuedIds.has(block.id))
    .filter((block) => !block.shutterId || (shutterCounts.get(block.shutterId) ?? 0) <= 0)
    .map((block) => block.id)
    .sort();
};

/**
 * Restores source-proven opening cohorts whose runtime block geometry already
 * supports the larger opening. Only internal staging bindings are removed;
 * player-facing/physical mechanisms and every block coordinate stay intact.
 */
export const applyOpeningVisibilityCohortRepair = (level: LevelSpec): LevelSpec => {
  const targetIds = TARGET_OPENING_IDS.get(level.id);
  if (!targetIds) return level;

  const targetIdSet = new Set(targetIds);
  const blockById = new Map(level.blocks.map((block) => [block.id, block]));
  const shutterById = new Map((level.shutters ?? []).map((shutter) => [shutter.id, shutter]));
  const queuedIds = new Set((level.generators ?? []).flatMap((generator) => generator.queueBlockIds));

  for (const targetId of targetIds) {
    const block = blockById.get(targetId);
    if (!block) throw new Error(`Lv${level.id}: missing source opening block ${targetId}`);
    if (queuedIds.has(targetId)) {
      throw new Error(`Lv${level.id}: source opening block ${targetId} is generator cargo`);
    }
    if (!block.shutterId) continue;
    const shutter = shutterById.get(block.shutterId);
    if (!shutter) {
      throw new Error(`Lv${level.id}: source opening block ${targetId} references missing shutter ${block.shutterId}`);
    }
    if (shutter.skin !== "staging") {
      throw new Error(`Lv${level.id}: source opening block ${targetId} is bound to player-facing shutter ${shutter.id}`);
    }
  }

  let changed = false;
  const blocks: LevelSpec["blocks"] = level.blocks.map((block) => {
    if (!targetIdSet.has(block.id) || !block.shutterId) return block;
    changed = true;
    const { shutterId: _removedStagingBinding, ...openingBlock } = block;
    return openingBlock;
  });

  const referencedShutterIds = new Set(blocks.flatMap((block) => block.shutterId ? [block.shutterId] : []));
  const shutters = (level.shutters ?? []).filter((shutter) => {
    const keep = shutter.skin !== "staging" || referencedShutterIds.has(shutter.id);
    if (!keep) changed = true;
    return keep;
  });

  const repaired = changed ? { ...level, blocks, shutters } : level;
  const actualOpeningIds = openingVisibleBlockIds(repaired);
  const expectedOpeningIds = [...targetIds].sort();
  if (actualOpeningIds.length !== expectedOpeningIds.length
    || actualOpeningIds.some((id, index) => id !== expectedOpeningIds[index])) {
    throw new Error(
      `Lv${level.id}: opening cohort drift; expected ${expectedOpeningIds.join(",")}, got ${actualOpeningIds.join(",")}`,
    );
  }

  return repaired;
};
