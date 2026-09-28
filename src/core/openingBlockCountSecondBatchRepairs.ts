import type { LevelSpec } from "./types";

export const OPENING_BLOCK_COUNT_SECOND_BATCH_VERSION = "competitor-opening-count-second-batch-r1" as const;

// Bytes are [level, count, block-index|remove-staging-bit, packed-x/y, ...].
const DATA = "HRUAAQEAAlKEY4UGhmeHE4hWiWGKQ4sIjFCNAo5ljxWQVJIElCCVRZcWmAMzDAAygQACNQMxhDOFNIYEhxGIMIkFigGLIVcSAAcBOAI2gySENYUjhiKHEYgwiVGKIItTjGWNVY4nj0OQaJEVmA0AQAEAgiCDEwQmhQaGBYdDiAKJRYoyizSMJZ4UAAMBUAJTgwSEAYVjhmKHEogQiRGKM4skjFKNFY5kj0OQRJECklWTVMgLACQBIAIhgxiEJ4UShhOHFogDiVGKAA==";
const bytes: number[] = [];
let bits = 0, value = 0;
for (const char of DATA) {
  const digit = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".indexOf(char);
  if (digit < 0) break;
  value = value * 64 + digit;
  bits += 6;
  if (bits >= 8) { bits -= 8; bytes.push((value >> bits) & 255); value &= (1 << bits) - 1; }
}
const patches = new Map<number, ReadonlyMap<number, number>>();
for (let at = 0; at < bytes.length;) {
  const id = bytes[at++]!, count = bytes[at++]!, positions = new Map<number, number>();
  for (let n = 0; n < count; n += 1) {
    const taggedIndex = bytes[at++]!, packed = bytes[at++]!;
    positions.set(taggedIndex & 127, packed | (taggedIndex & 128 ? 256 : 0));
  }
  patches.set(id, positions);
}
export const OPENING_BLOCK_COUNT_SECOND_BATCH_LEVEL_IDS = [...patches.keys()] as readonly number[];

export const applyOpeningBlockCountSecondBatchRepair = (source: LevelSpec): LevelSpec => {
  const patch = patches.get(source.id);
  if (!patch) return source;
  const shutterById = new Map((source.shutters ?? []).map((shutter) => [shutter.id, shutter]));
  let changed = false;
  const blocks = source.blocks.map((block, index) => {
    const instruction = patch.get(index);
    if (instruction === undefined) return block;
    const removeStaging = instruction > 255, packed = instruction & 255;
    const x = packed >> 4, y = packed & 15;
    if (!removeStaging) {
      if (block.shutterId) throw new Error(`Lv${source.id}: second opening source drift`);
      if (block.x === x && block.y === y) return block;
      changed = true;
      return { ...block, x, y };
    }
    if (!block.shutterId) {
      if (block.x === x && block.y === y) return block;
      throw new Error(`Lv${source.id}: second opening order drift`);
    }
    const shutter = shutterById.get(block.shutterId);
    if (!shutter || shutter.skin !== "staging" || shutter.count <= 0) {
      throw new Error(`Lv${source.id}: second opening staging drift`);
    }
    changed = true;
    const { shutterId: _stage, ...visible } = block;
    return { ...visible, x, y };
  });
  if (!changed) return source;
  const refs = new Set(blocks.flatMap((block) => block.shutterId ? [block.shutterId] : []));
  return { ...source, blocks, shutters: (source.shutters ?? []).filter((shutter) => shutter.skin !== "staging" || refs.has(shutter.id)) };
};
