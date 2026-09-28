import type { BlockSpec, LevelSpec } from './types';

/**
 * Give the original ice-3 cargo its own clearing paths after the exterior has
 * gone. Reflow four whole pieces and route the former cyan corner single to
 * the green exit, preserving the level's difficulty band without outside ice
 * counter events. The opening, gate contracts and both ice values stay intact.
 */
export const applyLevel78LateLiftRepair = (level: LevelSpec): LevelSpec => {
  if (level.id !== 78) return level;
  const lift = level.shutters?.find(item => item.id === 'lift');
  const hidden = level.blocks.filter(block => block.shutterId === 'lift');
  if (!lift || lift.skin !== 'lift' || lift.x !== 0 || lift.y !== 3
    || lift.width !== 5 || lift.height !== 3 || hidden.length !== 6
    || [0, 1, 2, 3, 4, 5].some(i => !hidden.some(b => b.id === `r147-78-hidden-${i}`))) {
    throw new Error('Lv78 repair requires the original six-body 5x3 lift cargo');
  }
  for (const id of ['r147-78-hidden-4', 'r147-78-hidden-2']) {
    if (hidden.find(b => b.id === id)?.frozen !== 3) {
      throw new Error('Lv78 repair must preserve both original ice-3 bodies');
    }
  }
  const patches: Record<string, Partial<BlockSpec>> = {
    'r147-78-hidden-5': { color: 'green' },
    'r147-78-hidden-0': { x: 0, y: 4 },
    'r147-78-hidden-4': { x: 3, y: 4 },
    'r147-78-hidden-2': { x: 1, y: 5 },
    'r147-78-hidden-3': { x: 1, y: 3 },
  };
  return { ...level, blocks: level.blocks.map(block => {
    const patch = patches[block.id];
    return patch ? { ...block, ...patch } : block;
  }) };
};
