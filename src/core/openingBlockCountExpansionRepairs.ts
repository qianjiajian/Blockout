import type { LevelSpec } from "./types";

export const OPENING_BLOCK_COUNT_EXPANSION_VERSION = "competitor-opening-count-expanded-r2" as const;

// Bytes are [level, count, block-index, packed-x/y, ...].
const DATA = "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";
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
  for (let n = 0; n < count; n += 1) positions.set(bytes[at++]!, bytes[at++]!);
  patches.set(id, positions);
}
export const OPENING_BLOCK_COUNT_EXPANSION_LEVEL_IDS = [...patches.keys()] as readonly number[];

export const applyOpeningBlockCountExpansionRepair = (source: LevelSpec): LevelSpec => {
  const patch = patches.get(source.id);
  if (!patch) return source;
  const shutterById = new Map((source.shutters ?? []).map((shutter) => [shutter.id, shutter]));
  let changed = false;
  const blocks = source.blocks.map((block, index) => {
    const packed = patch.get(index);
    if (packed === undefined) return block;
    const x = packed >> 4, y = packed & 15;
    if (!block.shutterId) {
      if (block.x === x && block.y === y) return block;
      throw new Error(`Lv${source.id}: opening expansion order drift`);
    }
    const shutter = shutterById.get(block.shutterId);
    if (!shutter || shutter.skin !== "staging" || shutter.count <= 0) {
      throw new Error(`Lv${source.id}: opening expansion source drift`);
    }
    changed = true;
    const { shutterId: _stage, ...visible } = block;
    return { ...visible, x, y };
  });
  if (!changed) return source;
  const refs = new Set(blocks.flatMap((block) => block.shutterId ? [block.shutterId] : []));
  return { ...source, blocks, shutters: (source.shutters ?? []).filter((shutter) => shutter.skin !== "staging" || refs.has(shutter.id)) };
};
