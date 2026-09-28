import type { BlockColor, LevelSpec } from "./types";

/**
 * Level 72's revised opening had two parking deadlocks: the red single-cell
 * carrier blocks the upper yellow lane, while the orange hidden carrier seals
 * the lower cyan mouth behind the green hidden carrier.  Keep the board,
 * positions, shapes, gates, counters and shutter unchanged; only swap the
 * two authored outer colours to open those two existing routes.
 */
const REPAIR_VERSION = "level72-revised-deadlock-repair-v1" as const;

const recolor = (level: LevelSpec, id: string, from: BlockColor, to: BlockColor): LevelSpec["blocks"][number] => {
  const block = level.blocks.find((candidate) => candidate.id === id);
  if (!block) throw new Error(`Lv72 ${REPAIR_VERSION}: missing block ${id}`);
  if (block.color !== from) throw new Error(`Lv72 ${REPAIR_VERSION}: ${id} expected ${from}, got ${block.color}`);
  const updated = { ...block, color: to };
  if (block.layers) updated.layers = block.layers.map((layer, index) => index === 0 ? to : layer);
  return updated;
};

export const applyLevel72Repair = (level: LevelSpec): LevelSpec => {
  if (level.id !== 72) return level;
  const first = recolor(level, "r147-72-o4", "red", "yellow");
  const second = recolor(level, "r147-72-h2", "orange", "cyan");
  return {
    ...level,
    blocks: level.blocks.map((block) => block.id === first.id ? first : block.id === second.id ? second : block),
  };
};
