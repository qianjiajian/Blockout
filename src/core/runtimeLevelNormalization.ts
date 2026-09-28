import type { LevelSpec, Point, Side } from "./types";

export interface SourceReplayDrag {
  blockId: string;
  path: Point[];
  exitSide?: Side;
}

export const isFullThreeByThreeCargo = (shape: readonly Point[]): boolean => {
  if (shape.length !== 9) return false;
  const xs = shape.map(([x]) => x);
  const ys = shape.map(([, y]) => y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return maxX - minX === 2
    && maxY - minY === 2
    && new Set(shape.map(([x, y]) => `${x},${y}`)).size === 9;
};

/**
 * Keeps the source footprint unchanged at the runtime boundary.
 *
 * This compatibility hook remains because authored campaign modules and
 * replay tooling already call it, but SQ3 is now a supported cargo shape and
 * must not be rewritten to a smaller rectangle.
 */
export const normalizeRuntimeLevel = (source: LevelSpec): LevelSpec => source;

/**
 * Replay routes now use the same footprint as their authored source level, so
 * no SQ3-specific edge compensation is required. Return defensive path copies
 * to preserve the historical helper's non-mutating contract.
 */
export const normalizeRuntimeReplayRoute = (
  _sourceLevel: LevelSpec,
  sourceRoute: readonly SourceReplayDrag[],
): SourceReplayDrag[] => sourceRoute.map((drag) => ({
  ...drag,
  path: drag.path.map(([x, y]) => [x, y] as Point),
}));
