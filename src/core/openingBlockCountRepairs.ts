import type { LevelSpec } from "./types";

export const OPENING_BLOCK_COUNT_REPAIR_VERSION = "competitor-opening-count-safe-r3" as const;

/*
 * Compact solver-certified table, applied after the existing runtime overlays.
 * Each row is level id, exact competitor opening count, and zero-based block
 * indices whose internal staging binding may be removed. Numeric fields are
 * base-36. The focused test intentionally guards block-order drift.
 */
const PACKED = "y,h,1.2.4.6.8.a.c.g.h.j.k.m.o.q;2k,g,1.3.5.a.c.e.f.g.j.k.n.o.q;2n,h,1.3.5.7.9.a.b.d.g.h.p.q.r.s;2t,4,4;2w,f,3.4.5.6.7.9.a.b.c.d.i.j;3s,d,3.4.5.6.7.9.a.b.d.e;3u,b,3.5.6.7.8.9.b.c;3w,d,3.4.5.6.7.8.9.b.c.d;3x,d,3.4.5.6.7.8.9.c.d.e;41,b,4.5.6.7.8.c.d.e;44,d,3.4.5.6.7.9.b.c.d.e;45,d,3.4.5.6.8.9.b.c.d.e;4d,f,3.4.5.6.8.9.a.b.d.e.g.h;4f,f,3.4.5.7.8.9.a.b.d.e.f.g;4k,9,3.4.6.7.9.a;4l,a,3.4.5.6.8.9.b;4m,8,4.5.9.d.e;4p,8,2.4.5.7.a;4w,9,2.3.4.5.8.9;52,9,3.4.5.8.9.a;5c,j,3.4.5.6.7.9.a.b.c.d.e.f.g.h.i.k;5j,7,2.3.4.5";

type OpeningPatch = Readonly<{
  expectedOpeningCount: number;
  blockIndices: ReadonlySet<number>;
}>;

const n = (value: string): number => Number.parseInt(value, 36);
const PATCH_BY_LEVEL = new Map<number, OpeningPatch>(PACKED.split(";").map((row) => {
  const [levelId, expected, indices] = row.split(",");
  return [n(levelId!), {
    expectedOpeningCount: n(expected!),
    blockIndices: new Set(indices!.split(".").map(n)),
  }];
}));

export const OPENING_BLOCK_COUNT_REPAIR_LEVEL_IDS = [...PATCH_BY_LEVEL.keys()] as readonly number[];

export const expectedOpeningBlockCount = (levelId: number): number | undefined => (
  PATCH_BY_LEVEL.get(levelId)?.expectedOpeningCount
);

export const openingVisibleBlockIds = (level: LevelSpec): string[] => {
  const queuedIds = new Set((level.generators ?? []).flatMap((generator) => generator.queueBlockIds));
  const positiveShutters = new Set((level.shutters ?? [])
    .filter((shutter) => shutter.count > 0)
    .map((shutter) => shutter.id));
  return level.blocks
    .filter((block) => !queuedIds.has(block.id))
    .filter((block) => !block.shutterId || !positiveShutters.has(block.shutterId))
    .map((block) => block.id);
};

/**
 * Restores only the solver-certified portion of competitor opening counts.
 * The selected pieces are removed from internal non-spatial staging; physical
 * shutters, generator queues, block geometry and every player-facing
 * mechanism remain untouched.
 */
export const applyOpeningBlockCountRepair = (source: LevelSpec): LevelSpec => {
  const patch = PATCH_BY_LEVEL.get(source.id);
  if (!patch) return source;

  for (const index of patch.blockIndices) {
    if (!source.blocks[index]) throw new Error(`Lv${source.id}: opening-count block order drift at index ${index}`);
  }

  const queuedIds = new Set((source.generators ?? []).flatMap((generator) => generator.queueBlockIds));
  const shutterById = new Map((source.shutters ?? []).map((shutter) => [shutter.id, shutter]));
  let changed = false;
  const blocks: LevelSpec["blocks"] = source.blocks.map((block, index) => {
    if (!patch.blockIndices.has(index) || !block.shutterId) return block;
    if (queuedIds.has(block.id)) throw new Error(`Lv${source.id}: opening-count block ${block.id} is generator cargo`);
    const shutter = shutterById.get(block.shutterId);
    if (!shutter || shutter.skin !== "staging" || shutter.count <= 0) {
      throw new Error(`Lv${source.id}: opening-count block ${block.id} is not bound to positive internal staging`);
    }
    changed = true;
    const { shutterId: _removedInternalStage, ...visible } = block;
    return visible;
  });

  const referencedShutterIds = new Set(blocks.flatMap((block) => block.shutterId ? [block.shutterId] : []));
  const shutters = (source.shutters ?? []).filter((shutter) => (
    shutter.skin !== "staging" || referencedShutterIds.has(shutter.id)
  ));
  const repaired = changed ? { ...source, blocks, shutters } : source;
  const actual = openingVisibleBlockIds(repaired).length;
  if (actual !== patch.expectedOpeningCount) {
    throw new Error(`Lv${source.id}: expected ${patch.expectedOpeningCount} opening blocks, received ${actual}`);
  }
  return repaired;
};
