import type { PuzzleModel } from "../core/PuzzleModel";
import type { BlockState, LevelSpec, Point } from "../core/types";

type StrategyNudge = NonNullable<LevelSpec["strategyNudge"]>;

export interface AdaptiveRescueAction {
  blockId: string;
  origins: Point[];
  reason: "authored" | "blocker";
  focusBlockId: string;
}

const key = (x: number, y: number): string => `${x},${y}`;
const cellsAt = (block: BlockState, x = block.x, y = block.y): Point[] => (
  block.shape.map(([offsetX, offsetY]) => [x + offsetX, y + offsetY] as const)
);
const overlaps = (left: Point[], right: Set<string>): boolean => (
  left.some(([x, y]) => right.has(key(x, y)))
);

const shortestRelocation = (
  model: PuzzleModel,
  block: BlockState,
  reserved: Set<string>,
): Point[] | undefined => {
  const start: Point = [block.x, block.y];
  const queue: Point[] = [start];
  const previous = new Map<string, string | undefined>([[key(...start), undefined]]);
  const points = new Map<string, Point>([[key(...start), start]]);
  const directions: Point[] = [[0, -1], [1, 0], [0, 1], [-1, 0]];

  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const [x, y] = queue[cursor];
    for (const [dx, dy] of directions) {
      const next: Point = [x + dx, y + dy];
      const nextKey = key(...next);
      if (previous.has(nextKey) || !model.canPlace(block, next[0], next[1])) continue;
      previous.set(nextKey, key(x, y));
      points.set(nextKey, next);
      if (!overlaps(cellsAt(block, next[0], next[1]), reserved)) {
        const reversed: Point[] = [];
        let current: string | undefined = nextKey;
        while (current && current !== key(...start)) {
          reversed.push(points.get(current)!);
          current = previous.get(current);
        }
        return [start, ...reversed.reverse()];
      }
      queue.push(next);
    }
  }
  return undefined;
};

/**
 * Produces one currently legal local rescue drag. It never searches for a
 * clear or a complete route: it either resumes the authored opening drag, or
 * moves one active block that is physically occupying that drag's next pose.
 */
export const adaptiveRescueAction = (
  model: PuzzleModel,
  hint: StrategyNudge,
): AdaptiveRescueAction | undefined => {
  const focus = model.getBlock(hint.blockId);
  if (!focus?.shape.length || !model.isBlockActive(focus)) return undefined;
  const authoredOrigins: Point[] = [hint.from, ...hint.path];
  const progress = authoredOrigins.findIndex(([x, y]) => focus.x === x && focus.y === y);
  if (progress < 0 || progress >= authoredOrigins.length - 1) return undefined;

  const remaining = authoredOrigins.slice(progress);
  let blockedTarget: Point | undefined;
  for (let index = 1; index < remaining.length; index += 1) {
    const [fromX, fromY] = remaining[index - 1];
    const [toX, toY] = remaining[index];
    if (Math.abs(toX - fromX) + Math.abs(toY - fromY) !== 1) return undefined;
    if (!model.canPlace(focus, toX, toY)) {
      blockedTarget = remaining[index];
      break;
    }
  }
  if (!blockedTarget) {
    return { blockId: focus.id, origins: remaining, reason: "authored", focusBlockId: focus.id };
  }

  // A shaped blocker can vacate the first obstructed pose while still covering
  // the very next pose (for example two interlocking L pieces). Reserve the
  // complete remaining authored corridor so the one rescue drag creates a
  // meaningful opening instead of a one-cell tease.
  const reserved = new Set(remaining.slice(1)
    .flatMap(([x, y]) => cellsAt(focus, x, y))
    .map(([x, y]) => key(x, y)));
  const blockedPose = new Set(cellsAt(focus, blockedTarget[0], blockedTarget[1]).map(([x, y]) => key(x, y)));
  const snapshot = model.snapshot();
  const candidates = snapshot.blocks
    .filter((block) => block.id !== focus.id && model.isBlockActive(block) && overlaps(cellsAt(block), blockedPose))
    .map((block) => ({ block, origins: shortestRelocation(model, block, reserved) }))
    .filter((candidate): candidate is { block: BlockState; origins: Point[] } => Boolean(candidate.origins))
    .sort((left, right) => left.origins.length - right.origins.length || left.block.id.localeCompare(right.block.id));
  const best = candidates[0];
  if (!best) return undefined;
  return {
    blockId: best.block.id,
    origins: best.origins,
    reason: "blocker",
    focusBlockId: focus.id,
  };
};
