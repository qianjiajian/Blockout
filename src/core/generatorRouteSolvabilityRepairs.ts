import type { LevelSpec } from "./types";

export const GENERATOR_ROUTE_SOLVABILITY_REPAIR_VERSION = "generator-route-minimal-r2" as const;

interface RoutePatch {
  readonly blocks?: ReadonlyMap<string, readonly [number, number]>;
  readonly addPlayable?: readonly (readonly [number, number])[];
}

const PATCHES = new Map<number, RoutePatch>([
  [56, { blocks: new Map([["cc-piece-s1-13", [0, 1]]]) }],
  [156, { addPlayable: [[3, 4], [4, 4]] }],
]);
export const GENERATOR_ROUTE_SOLVABILITY_REPAIR_LEVEL_IDS = [...PATCHES.keys()] as readonly number[];

/**
 * Small, pre-alignment route repairs for generator levels whose machinery and
 * queue geometry are already correct. Keeping this layer before center-mouth
 * alignment lets the alignment overlay continue to prove that it changes no
 * non-queued piece.
 */
export const applyGeneratorRouteSolvabilityRepair = (source: LevelSpec): LevelSpec => {
  const patch = PATCHES.get(source.id);
  if (!patch) return source;
  for (const blockId of patch.blocks?.keys() ?? []) {
    if (!source.blocks.some((block) => block.id === blockId)) {
      throw new Error(`Lv${source.id}: generator route repair source drift at ${blockId}`);
    }
  }
  let changed = false;
  const blocks = source.blocks.map((block) => {
    const target = patch.blocks?.get(block.id);
    if (!target || block.x === target[0] && block.y === target[1]) return block;
    changed = true;
    return { ...block, x: target[0], y: target[1] };
  });
  if (patch.addPlayable?.length && !source.playable) {
    throw new Error(`Lv${source.id}: generator route repair expected an authored playable mask`);
  }
  const playableKeys = new Set((source.playable ?? []).map(([x, y]) => `${x},${y}`));
  const playable = [...(source.playable ?? [])];
  for (const cell of patch.addPlayable ?? []) {
    const [x, y] = cell;
    if (x < 0 || y < 0 || x >= source.width || y >= source.height) {
      throw new Error(`Lv${source.id}: generator route repair cell ${x},${y} is outside the board`);
    }
    const key = `${x},${y}`;
    if (playableKeys.has(key)) continue;
    playableKeys.add(key);
    playable.push([x, y]);
    changed = true;
  }
  if (!changed) return source;
  return { ...source, blocks, playable };
};
