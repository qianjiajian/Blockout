import type { BlockSpec, LevelSpec, Point } from "./types";

export type IceEligibleShape = "bar" | "rectangle";

const pointKey = ([x, y]: Point): string => `${x},${y}`;

/**
 * Ice is rendered as one continuous shell, so it may only wrap a solid,
 * axis-aligned footprint. A single cell is deliberately excluded: the visual
 * language for this mechanic is a bar or a larger rectangle.
 */
export const classifyIceEligibleShape = (shape: readonly Point[]): IceEligibleShape | undefined => {
  if (shape.length < 2) return undefined;
  const cells = new Set<string>();
  for (const point of shape) {
    const [x, y] = point;
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isInteger(x) || !Number.isInteger(y)) {
      return undefined;
    }
    const key = pointKey(point);
    if (cells.has(key)) return undefined;
    cells.add(key);
  }

  const xs = shape.map(([x]) => x);
  const ys = shape.map(([, y]) => y);
  const width = Math.max(...xs) - Math.min(...xs) + 1;
  const height = Math.max(...ys) - Math.min(...ys) + 1;
  if (width * height !== cells.size) return undefined;
  return width === 1 || height === 1 ? "bar" : "rectangle";
};

export const isIceEligibleBlockShape = (shape: readonly Point[]): boolean => (
  classifyIceEligibleShape(shape) !== undefined
);

const rectangle = (width: number, height: number): Point[] => Array.from(
  { length: height },
  (_, y) => Array.from({ length: width }, (__, x) => [x, y] as const),
).flat();

const blockColors = (block: BlockSpec) => block.layers?.length ? block.layers : [block.color];

const hasCompatibleExits = (level: LevelSpec, block: BlockSpec, width: number, height: number): boolean => (
  blockColors(block).every((color) => level.gates.some((gate) => {
    if (gate.color !== color || (block.star && !gate.star)) return false;
    const requiredSpan = gate.side === "top" || gate.side === "bottom" ? width : height;
    return gate.size >= requiredSpan;
  }))
);

interface RectangleCandidate {
  x: number;
  y: number;
  width: number;
  height: number;
  changedCells: number;
  areaDelta: number;
  centerDistance: number;
  authoredPreference: boolean;
}

/** Equal-distance choices that preserve the established opening-strategy gates. */
const FROZEN_RECTANGLE_PREFERENCES: Partial<Record<number, Record<string, {
  x: number;
  y: number;
  width: number;
  height: number;
}>>> = {
  15: {
    "composition-15-1": { x: 1, y: 0, width: 2, height: 1 },
    "composition-15-2": { x: 0, y: 2, width: 2, height: 3 },
  },
  21: {
    "blue-load": { x: 6, y: 2, width: 2, height: 1 },
    "composition-21-1": { x: 4, y: 3, width: 3, height: 2 },
  },
  27: {
    "red-target": { x: 2, y: 3, width: 2, height: 2 },
    "green-target": { x: 4, y: 0, width: 2, height: 1 },
  },
  55: { "red-target": { x: 3, y: 4, width: 1, height: 2 } },
  57: { "red-target": { x: 3, y: 5, width: 1, height: 2 } },
};

const nearestLegalRectangle = (
  level: LevelSpec,
  blocks: BlockSpec[],
  blockIndex: number,
): RectangleCandidate | undefined => {
  const block = blocks[blockIndex];
  const playable = new Set((level.playable ?? rectangle(level.width, level.height)).map(pointKey));
  const blocked = new Set((level.blocked ?? []).map(pointKey));
  const occupied = new Set<string>();
  blocks.forEach((other, index) => {
    if (index === blockIndex) return;
    for (const [dx, dy] of other.shape) occupied.add(`${other.x + dx},${other.y + dy}`);
  });

  const original = new Set(block.shape.map(([dx, dy]) => `${block.x + dx},${block.y + dy}`));
  const originalCenterX = [...original].reduce((sum, key) => sum + Number(key.split(",")[0]), 0) / original.size;
  const originalCenterY = [...original].reduce((sum, key) => sum + Number(key.split(",")[1]), 0) / original.size;
  const originalXs = block.shape.map(([x]) => x);
  const originalYs = block.shape.map(([, y]) => y);
  const boundingArea = (
    Math.max(...originalXs) - Math.min(...originalXs) + 1
  ) * (
    Math.max(...originalYs) - Math.min(...originalYs) + 1
  );
  const largestArea = Math.max(block.shape.length + 2, boundingArea);
  const candidates: RectangleCandidate[] = [];
  const preference = FROZEN_RECTANGLE_PREFERENCES[level.id]?.[block.id];

  // A nearest in-place bar is safer than moving a tight three-cell L-piece
  // across the board. Four-cell and larger pieces normally retain at least
  // their authored area. A reviewed preference may balance a smaller piece
  // against a larger neighbour while preserving the level's total density.
  const defaultMinimumArea = block.shape.length >= 4 ? block.shape.length : 2;
  const minimumArea = preference
    ? Math.min(defaultMinimumArea, preference.width * preference.height)
    : defaultMinimumArea;
  for (let area = minimumArea; area <= largestArea; area += 1) {
    for (let height = 1; height <= Math.min(area, level.height); height += 1) {
      if (area % height !== 0) continue;
      const width = area / height;
      if (width > level.width || width * height < 2 || !hasCompatibleExits(level, block, width, height)) continue;
      for (let y = 0; y <= level.height - height; y += 1) {
        for (let x = 0; x <= level.width - width; x += 1) {
          let legal = true;
          let overlap = 0;
          for (let dy = 0; dy < height; dy += 1) {
            for (let dx = 0; dx < width; dx += 1) {
              const key = `${x + dx},${y + dy}`;
              if (!playable.has(key) || blocked.has(key) || occupied.has(key)) legal = false;
              if (original.has(key)) overlap += 1;
            }
          }
          if (!legal) continue;
          candidates.push({
            x,
            y,
            width,
            height,
            changedCells: block.shape.length + area - overlap * 2,
            areaDelta: Math.abs(area - block.shape.length),
            centerDistance: Math.abs(x + (width - 1) / 2 - originalCenterX)
              + Math.abs(y + (height - 1) / 2 - originalCenterY),
            authoredPreference: preference !== undefined
              && preference.x === x
              && preference.y === y
              && preference.width === width
              && preference.height === height,
          });
        }
      }
    }
  }

  return candidates.sort((left, right) => (
    Number(right.authoredPreference) - Number(left.authoredPreference)
    || left.changedCells - right.changedCells
    || left.areaDelta - right.areaDelta
    || left.centerDistance - right.centerDistance
    || Math.abs(left.width - left.height) - Math.abs(right.width - right.height)
    || left.y - right.y
    || left.x - right.x
    || left.width - right.width
  ))[0];
};

/**
 * Migrates legacy frozen irregular pieces at the final campaign-authoring
 * boundary. Cell changes and displacement are minimized, frozen counters and
 * block identity are preserved, and every color layer remains exit-compatible.
 */
export const normalizeFrozenBlockShapes = (level: LevelSpec): LevelSpec => {
  const blocks: BlockSpec[] = level.blocks.map((block) => ({ ...block, shape: [...block.shape] }));
  let changed = false;

  blocks.forEach((block, index) => {
    if ((block.frozen ?? 0) <= 0 || isIceEligibleBlockShape(block.shape)) return;
    if (block.shutterId
      || level.elevators?.some((elevator) => elevator.blockId === block.id)
      || level.conveyors?.some((conveyor) => conveyor.blockId === block.id)
      || level.onboardingHint?.blockId === block.id
      || level.strategyNudge?.blockId === block.id) {
      throw new Error(`Lv${level.id} frozen block ${block.id} must be authored as a bar or rectangle`);
    }
    const candidate = nearestLegalRectangle(level, blocks, index);
    if (!candidate) throw new Error(`Lv${level.id} frozen block ${block.id} has no legal rectangular placement`);
    blocks[index] = {
      ...block,
      x: candidate.x,
      y: candidate.y,
      shape: rectangle(candidate.width, candidate.height),
    };
    changed = true;
  });

  return changed ? { ...level, blocks } : level;
};

export const assertFrozenBlockShapes = (level: LevelSpec): void => {
  for (const block of level.blocks) {
    if ((block.frozen ?? 0) > 0 && !isIceEligibleBlockShape(block.shape)) {
      throw new Error(`Level ${level.id}: frozen block ${block.id} must be a solid bar or rectangle`);
    }
  }
};
