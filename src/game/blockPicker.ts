export interface GridPickPoint {
  x: number;
  y: number;
}

export interface BlockPickCandidate {
  id: string;
  cells: ReadonlyArray<readonly [number, number]>;
}

export interface RankedBlockPick {
  blockId: string;
  distance: number;
}

export interface NearbyBlockPick extends RankedBlockPick {
  runnerUpDistance: number;
}

const distanceToCell = (point: GridPickPoint, cell: readonly [number, number]): number => {
  const [cellX, cellY] = cell;
  const dx = point.x < cellX
    ? cellX - point.x
    : point.x > cellX + 1
      ? point.x - cellX - 1
      : 0;
  const dy = point.y < cellY
    ? cellY - point.y
    : point.y > cellY + 1
      ? point.y - cellY - 1
      : 0;
  return Math.hypot(dx, dy);
};

export const distanceToBlockCells = (
  point: GridPickPoint,
  cells: ReadonlyArray<readonly [number, number]>,
): number => cells.reduce((nearest, cell) => Math.min(nearest, distanceToCell(point, cell)), Number.POSITIVE_INFINITY);

export const rankNearbyBlocks = (
  point: GridPickPoint,
  candidates: ReadonlyArray<BlockPickCandidate>,
): RankedBlockPick[] => candidates
  .map((candidate) => ({
    blockId: candidate.id,
    distance: distanceToBlockCells(point, candidate.cells),
  }))
  .filter((candidate) => Number.isFinite(candidate.distance))
  .sort((left, right) => left.distance - right.distance || left.blockId.localeCompare(right.blockId));

export const pickNearbyBlock = (
  point: GridPickPoint,
  candidates: ReadonlyArray<BlockPickCandidate>,
  maximumDistance: number,
  ambiguityMargin: number,
): NearbyBlockPick | undefined => {
  if (!Number.isFinite(maximumDistance) || maximumDistance <= 0) return undefined;
  const ranked = rankNearbyBlocks(point, candidates);
  const nearest = ranked[0];
  if (!nearest || nearest.distance > maximumDistance) return undefined;

  const runnerUpDistance = ranked[1]?.distance ?? Number.POSITIVE_INFINITY;
  const safeMargin = Number.isFinite(ambiguityMargin) ? Math.max(0, ambiguityMargin) : 0;
  if (runnerUpDistance - nearest.distance <= safeMargin) return undefined;

  return { ...nearest, runnerUpDistance };
};
