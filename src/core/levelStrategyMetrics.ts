import type { LevelSpec, Point } from "./types";

const pointKey = (x: number, y: number): string => `${x},${y}`;

const placementFitsGate = (
  level: LevelSpec,
  block: LevelSpec["blocks"][number],
  gate: LevelSpec["gates"][number],
  x: number,
  y: number,
): boolean => {
  const cells = block.shape.map(([dx, dy]) => [x + dx, y + dy] as const);
  const minX = Math.min(...cells.map(([cellX]) => cellX));
  const maxX = Math.max(...cells.map(([cellX]) => cellX));
  const minY = Math.min(...cells.map(([, cellY]) => cellY));
  const maxY = Math.max(...cells.map(([, cellY]) => cellY));
  if (gate.side === "top") return minY === 0 && minX >= gate.offset && maxX < gate.offset + gate.size;
  if (gate.side === "bottom") return maxY === level.height - 1 && minX >= gate.offset && maxX < gate.offset + gate.size;
  if (gate.side === "left") return minX === 0 && minY >= gate.offset && maxY < gate.offset + gate.size;
  return maxX === level.width - 1 && minY >= gate.offset && maxY < gate.offset + gate.size;
};

const placementTouchesGateMouth = (
  level: LevelSpec,
  block: LevelSpec["blocks"][number],
  gate: LevelSpec["gates"][number],
  x: number,
  y: number,
): boolean => block.shape.some(([dx, dy]) => {
  const cellX = x + dx;
  const cellY = y + dy;
  if (gate.side === "top") return cellY === 0 && cellX >= gate.offset && cellX < gate.offset + gate.size;
  if (gate.side === "bottom") return cellY === level.height - 1 && cellX >= gate.offset && cellX < gate.offset + gate.size;
  if (gate.side === "left") return cellX === 0 && cellY >= gate.offset && cellY < gate.offset + gate.size;
  return cellX === level.width - 1 && cellY >= gate.offset && cellY < gate.offset + gate.size;
});

const closedShutterIds = (level: LevelSpec): Set<string> => new Set((level.shutters ?? [])
  .filter((shutter) => shutter.count > 0)
  .map((shutter) => shutter.id));

const activeBlocks = (level: LevelSpec): LevelSpec["blocks"] => {
  const closed = closedShutterIds(level);
  return level.blocks.filter((block) => !block.shutterId || !closed.has(block.shutterId));
};

const closedShutterCells = (level: LevelSpec): Set<string> => {
  const cells = new Set<string>();
  for (const shutter of level.shutters ?? []) {
    if (shutter.count <= 0) continue;
    for (let y = shutter.y; y < shutter.y + shutter.height; y += 1) {
      for (let x = shutter.x; x < shutter.x + shutter.width; x += 1) cells.add(pointKey(x, y));
    }
  }
  return cells;
};

const hasOpenMatchingGate = (level: LevelSpec, block: LevelSpec["blocks"][number]): boolean => {
  const color = block.layers?.[0] ?? block.color;
  return level.gates.some((gate) => (
    gate.color === color
    && (gate.frozen ?? 0) === 0
    && (!block.star || gate.star)
  ));
};

/**
 * Opening-only reachability check. Other movable blocks are held fixed, so this
 * measures whether one block can be cleared before the player repositions any
 * other block. It deliberately does not search multi-block move sequences.
 */
export const canClearWithOtherBlocksFixed = (
  level: LevelSpec,
  blockId: string,
  ignoredBlockIds: ReadonlySet<string> = new Set(),
): boolean => {
  const blocks = activeBlocks(level);
  const block = blocks.find((candidate) => candidate.id === blockId);
  if (!block || block.shutterId || (block.frozen ?? 0) > 0 || !hasOpenMatchingGate(level, block)) return false;

  const playable = new Set((level.playable ?? []).map(([x, y]) => pointKey(x, y)));
  const obstacles = closedShutterCells(level);
  for (const other of blocks) {
    if (other.id === block.id || ignoredBlockIds.has(other.id)) continue;
    for (const [dx, dy] of other.shape) obstacles.add(pointKey(other.x + dx, other.y + dy));
  }
  const canPlace = (x: number, y: number): boolean => block.shape.every(([dx, dy]) => {
    const key = pointKey(x + dx, y + dy);
    return playable.has(key) && !obstacles.has(key);
  });
  if (!canPlace(block.x, block.y)) return false;

  const color = block.layers?.[0] ?? block.color;
  const gates = level.gates.filter((gate) => (
    gate.color === color
    && (gate.frozen ?? 0) === 0
    && (!block.star || gate.star)
  ));
  const queue: Point[] = [[block.x, block.y]];
  const visited = new Set([pointKey(block.x, block.y)]);
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const [x, y] = queue[cursor];
    if (gates.some((gate) => placementFitsGate(level, block, gate, x, y))) return true;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nextX = x + dx;
      const nextY = y + dy;
      const key = pointKey(nextX, nextY);
      if (visited.has(key) || !canPlace(nextX, nextY)) continue;
      visited.add(key);
      queue.push([nextX, nextY]);
    }
  }
  return false;
};

/**
 * Two-block opening relation only: every unrelated block stays fixed, the
 * blocker must make at least one legal in-board move, and only then may the
 * target's route become available. This is not a campaign-completion search.
 */
const canClearAfterRelocatingBlocker = (
  level: LevelSpec,
  targetId: string,
  blockerId: string,
): boolean => {
  const blocks = activeBlocks(level);
  const blocker = blocks.find((candidate) => candidate.id === blockerId);
  if (!blocker || blocker.shutterId || (blocker.frozen ?? 0) > 0) return false;

  const playable = new Set((level.playable ?? []).map(([x, y]) => pointKey(x, y)));
  const obstacles = closedShutterCells(level);
  for (const other of blocks) {
    if (other.id === blocker.id) continue;
    for (const [dx, dy] of other.shape) obstacles.add(pointKey(other.x + dx, other.y + dy));
  }
  const canPlace = (x: number, y: number): boolean => blocker.shape.every(([dx, dy]) => {
    const key = pointKey(x + dx, y + dy);
    return playable.has(key) && !obstacles.has(key);
  });
  if (!canPlace(blocker.x, blocker.y)) return false;

  const queue: Point[] = [[blocker.x, blocker.y]];
  const visited = new Set([pointKey(blocker.x, blocker.y)]);
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const [x, y] = queue[cursor];
    if ((x !== blocker.x || y !== blocker.y) && canClearWithOtherBlocksFixed({
      ...level,
      blocks: level.blocks.map((block) => block.id === blocker.id ? { ...block, x, y } : block),
    }, targetId)) return true;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nextX = x + dx;
      const nextY = y + dy;
      const key = pointKey(nextX, nextY);
      if (visited.has(key) || !canPlace(nextX, nextY)) continue;
      visited.add(key);
      queue.push([nextX, nextY]);
    }
  }
  return false;
};

export interface OpeningStrategyMetrics {
  active: number;
  actionable: number;
  directClearable: number;
  forcedRepositions: number;
  matchingEdgeStarts: number;
  oneStepMovable: number;
  contacts: number;
  blockerRelations: ReadonlyArray<readonly [blockerId: string, targetId: string]>;
  distinctBlockedTargets: number;
}

export const openingStrategyMetrics = (level: LevelSpec): OpeningStrategyMetrics => {
  const blocks = activeBlocks(level);
  const actionable = blocks.filter((block) => (
    !block.shutterId && (block.frozen ?? 0) === 0 && hasOpenMatchingGate(level, block)
  ));
  const directIds = new Set(actionable
    .filter((block) => canClearWithOtherBlocksFixed(level, block.id))
    .map((block) => block.id));
  const blockerRelations: Array<readonly [string, string]> = [];
  for (const target of actionable) {
    if (directIds.has(target.id)) continue;
    for (const blocker of blocks) {
      if (blocker.id === target.id) continue;
      if (canClearAfterRelocatingBlocker(level, target.id, blocker.id)) {
        blockerRelations.push([blocker.id, target.id]);
      }
    }
  }

  const occupied = new Map<string, string>();
  for (const block of blocks) {
    for (const [dx, dy] of block.shape) occupied.set(pointKey(block.x + dx, block.y + dy), block.id);
  }
  const contactPairs = new Set<string>();
  for (const [key, blockId] of occupied) {
    const [x, y] = key.split(",").map(Number);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const otherId = occupied.get(pointKey(x + dx, y + dy));
      if (otherId && otherId !== blockId) contactPairs.add([blockId, otherId].sort().join("|"));
    }
  }
  const playable = new Set((level.playable ?? []).map(([x, y]) => pointKey(x, y)));
  const shutterCells = closedShutterCells(level);
  const oneStepMovable = actionable.filter((block) => (
    ([[1, 0], [-1, 0], [0, 1], [0, -1]] as const).some(([moveX, moveY]) => (
      block.shape.every(([dx, dy]) => {
        const key = pointKey(block.x + moveX + dx, block.y + moveY + dy);
        return playable.has(key)
          && !shutterCells.has(key)
          && (!occupied.has(key) || occupied.get(key) === block.id);
      })
    ))
  )).length;

  return {
    active: blocks.length,
    actionable: actionable.length,
    directClearable: directIds.size,
    forcedRepositions: actionable.length - directIds.size,
    matchingEdgeStarts: blocks.filter((block) => {
      const color = block.layers?.[0] ?? block.color;
      return level.gates.some((gate) => (
        gate.color === color
        && (!block.star || gate.star)
        && placementTouchesGateMouth(level, block, gate, block.x, block.y)
      ));
    }).length,
    oneStepMovable,
    contacts: contactPairs.size,
    blockerRelations,
    distinctBlockedTargets: new Set(blockerRelations.map(([, targetId]) => targetId)).size,
  };
};
