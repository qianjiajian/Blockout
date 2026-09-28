import type { Point } from "../core/types";

export interface DepthSortableBlock {
  readonly y: number;
  readonly shape: readonly Point[];
}

type EffectiveY<T> = (block: T) => number;

const bottomCellY = <T extends DepthSortableBlock>(block: T, effectiveY: number): number => (
  effectiveY + block.shape.reduce((maximum, [, dy]) => Math.max(maximum, dy), Number.NEGATIVE_INFINITY)
);

/**
 * Returns a painter's order from upper to lower blocks without mutating the
 * source collection. Source order is the explicit tie-breaker so the result is
 * stable in every JavaScript host, including older WeChat runtimes.
 */
export const orderBlocksByDepth = <T extends DepthSortableBlock>(
  blocks: readonly T[],
  effectiveY: EffectiveY<T> = (block) => block.y,
): T[] => blocks
  .map((block, sourceIndex) => ({
    block,
    sourceIndex,
    depth: bottomCellY(block, effectiveY(block)),
  }))
  .sort((left, right) => left.depth - right.depth || left.sourceIndex - right.sourceIndex)
  .map(({ block }) => block);
