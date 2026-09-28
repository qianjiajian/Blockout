import type { Point } from "../core/types";
import type { FormalBlockShapeMatch } from "./formalBlockShapes";

export interface SelectionFrameBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type SelectionFrameLoop = readonly Point[];

const pointKey = ([x, y]: Point): string => `${x},${y}`;

const transformedPoint = (
  x: number,
  y: number,
  match: Pick<FormalBlockShapeMatch, "quarterTurns" | "targetWidth" | "targetHeight">,
  authoredCell: number,
): Point => {
  const targetWidth = match.targetWidth * authoredCell;
  const targetHeight = match.targetHeight * authoredCell;
  if (match.quarterTurns === 1) return [targetWidth - y, x];
  if (match.quarterTurns === 2) return [targetWidth - x, targetHeight - y];
  if (match.quarterTurns === 3) return [y, targetHeight - x];
  return [x, y];
};

/**
 * Mirrors the exact registration used by drawFormalWholeBlockAt and returns
 * the visible whole-sprite rectangle in the matched block's local grid space.
 */
export const formalBlockVisualBounds = (
  match: Pick<
    FormalBlockShapeMatch,
    "quarterTurns" | "targetWidth" | "targetHeight" | "canonicalWidth" | "canonicalHeight"
  >,
  imageWidth: number,
  imageHeight: number,
  authoredCell = 95,
): SelectionFrameBounds => {
  const sourceWidth = match.canonicalWidth * authoredCell;
  const sourceHeight = match.canonicalHeight * authoredCell;
  const sourceX = (sourceWidth - imageWidth) / 2;
  const sourceY = imageHeight - sourceHeight >= 3
    ? sourceHeight - imageHeight
    : (sourceHeight - imageHeight) / 2;
  const corners = [
    transformedPoint(sourceX, sourceY, match, authoredCell),
    transformedPoint(sourceX + imageWidth, sourceY, match, authoredCell),
    transformedPoint(sourceX + imageWidth, sourceY + imageHeight, match, authoredCell),
    transformedPoint(sourceX, sourceY + imageHeight, match, authoredCell),
  ];
  const minX = Math.min(...corners.map(([x]) => x));
  const minY = Math.min(...corners.map(([, y]) => y));
  const maxX = Math.max(...corners.map(([x]) => x));
  const maxY = Math.max(...corners.map(([, y]) => y));
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
};

export const formalSelectionFrameBounds = (
  match: Pick<
    FormalBlockShapeMatch,
    "quarterTurns" | "targetWidth" | "targetHeight" | "canonicalWidth" | "canonicalHeight"
  >,
  imageWidth: number,
  imageHeight: number,
  padding = 6,
  authoredCell = 95,
): SelectionFrameBounds => {
  const sprite = formalBlockVisualBounds(match, imageWidth, imageHeight, authoredCell);
  return {
    x: sprite.x - padding,
    y: sprite.y - padding,
    width: sprite.width + padding * 2,
    height: sprite.height + padding * 2,
  };
};

const simplifyOrthogonalLoop = (points: readonly Point[]): Point[] => {
  if (points.length < 3) return [...points];
  const simplified: Point[] = [];
  for (let index = 0; index < points.length; index += 1) {
    const previous = points[(index - 1 + points.length) % points.length];
    const current = points[index];
    const next = points[(index + 1) % points.length];
    const previousHorizontal = previous[1] === current[1];
    const nextHorizontal = current[1] === next[1];
    if (previousHorizontal === nextHorizontal) continue;
    simplified.push(current);
  }
  return simplified;
};

/**
 * Traces only the exterior grid boundary of a connected polyomino. Shared
 * cell edges never enter the returned loops, so a multi-cell selection does
 * not repeat single-cell corners at its internal joins.
 */
export const traceSelectionFrameLoops = (cells: readonly Point[]): SelectionFrameLoop[] => {
  const occupied = new Set(cells.map(pointKey));
  const edges: Array<{ start: Point; end: Point }> = [];
  for (const [x, y] of cells) {
    if (!occupied.has(`${x},${y - 1}`)) edges.push({ start: [x, y], end: [x + 1, y] });
    if (!occupied.has(`${x + 1},${y}`)) edges.push({ start: [x + 1, y], end: [x + 1, y + 1] });
    if (!occupied.has(`${x},${y + 1}`)) edges.push({ start: [x + 1, y + 1], end: [x, y + 1] });
    if (!occupied.has(`${x - 1},${y}`)) edges.push({ start: [x, y + 1], end: [x, y] });
  }

  const byStart = new Map<string, number[]>();
  edges.forEach((edge, index) => {
    const key = pointKey(edge.start);
    const entries = byStart.get(key) ?? [];
    entries.push(index);
    byStart.set(key, entries);
  });
  const visited = new Set<number>();
  const loops: Point[][] = [];
  edges.forEach((edge, edgeIndex) => {
    if (visited.has(edgeIndex)) return;
    const firstKey = pointKey(edge.start);
    const loop: Point[] = [edge.start];
    let currentIndex = edgeIndex;
    while (!visited.has(currentIndex)) {
      visited.add(currentIndex);
      const current = edges[currentIndex];
      const endKey = pointKey(current.end);
      if (endKey === firstKey) break;
      loop.push(current.end);
      const nextIndex = (byStart.get(endKey) ?? []).find((candidate) => !visited.has(candidate));
      if (nextIndex == null) break;
      currentIndex = nextIndex;
    }
    if (loop.length >= 4) loops.push(simplifyOrthogonalLoop(loop));
  });
  return loops;
};

