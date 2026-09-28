import type { BoardSeamSpec, LevelSpec, Point, Side } from "./types";

export type SeamBoardGeometry = Readonly<Pick<LevelSpec, "width" | "height" | "seams">>;

const inSpan = (value: number, seam: BoardSeamSpec): boolean => (
  value >= seam.start && value < seam.start + seam.size
);

/** True when the directed rail leaves a cell across an authored board seam. */
export const boardRailIsSeam = (
  board: SeamBoardGeometry,
  [x, y]: Point,
  side: Side,
): boolean => (board.seams ?? []).some((seam) => {
  if (seam.orientation === "horizontal") {
    if (!inSpan(x, seam)) return false;
    return (side === "bottom" && y === seam.offset - 1)
      || (side === "top" && y === seam.offset);
  }
  if (!inSpan(y, seam)) return false;
  return (side === "right" && x === seam.offset - 1)
    || (side === "left" && x === seam.offset);
});

/** True when one orthogonal cell edge is replaced by a physical gap. */
export const boardCellsSeparatedBySeam = (
  board: SeamBoardGeometry,
  [ax, ay]: Point,
  [bx, by]: Point,
): boolean => {
  const dx = bx - ax;
  const dy = by - ay;
  if (Math.abs(dx) + Math.abs(dy) !== 1) return false;
  const side: Side = dx > 0 ? "right" : dx < 0 ? "left" : dy > 0 ? "bottom" : "top";
  return boardRailIsSeam(board, [ax, ay], side);
};

/** Rigid pieces may never straddle a seam in a settled board position. */
export const footprintCrossesBoardSeam = (
  board: SeamBoardGeometry,
  cells: readonly Point[],
): boolean => {
  if (!(board.seams?.length) || cells.length < 2) return false;
  const occupied = new Set(cells.map(([x, y]) => `${x},${y}`));
  return cells.some(([x, y]) => (
    (occupied.has(`${x + 1},${y}`) && boardRailIsSeam(board, [x, y], "right"))
    || (occupied.has(`${x},${y + 1}`) && boardRailIsSeam(board, [x, y], "bottom"))
  ));
};

/** Tests the discrete path of a rigid translation against every seam rail. */
export const translationCrossesBoardSeam = (
  board: SeamBoardGeometry,
  cells: readonly Point[],
  dx: number,
  dy: number,
): boolean => {
  if (!(board.seams?.length)) return false;
  if (!Number.isInteger(dx) || !Number.isInteger(dy)) return true;
  let remainingX = dx;
  let remainingY = dy;
  let current = cells.map(([x, y]) => [x, y] as Point);
  while (remainingX !== 0 || remainingY !== 0) {
    const stepX = Math.sign(remainingX);
    const stepY = Math.sign(remainingY);
    if (stepX !== 0) {
      const side: Side = stepX > 0 ? "right" : "left";
      if (current.some((cell) => boardRailIsSeam(board, cell, side))) return true;
    }
    if (stepY !== 0) {
      const side: Side = stepY > 0 ? "bottom" : "top";
      // Check both diagonal orderings so a corner cannot bypass a finite seam.
      if (current.some(([x, y]) => (
        boardRailIsSeam(board, [x, y], side)
        || boardRailIsSeam(board, [x + stepX, y], side)
      ))) return true;
    }
    current = current.map(([x, y]) => [x + stepX, y + stepY] as Point);
    remainingX -= stepX;
    remainingY -= stepY;
  }
  return false;
};

export const cloneBoardSeams = (seams: readonly BoardSeamSpec[] | undefined): BoardSeamSpec[] => (
  seams?.map((seam) => ({ ...seam })) ?? []
);

/** Validates ranges and reserves every undirected physical seam rail once. */
export const validateBoardSeams = (
  level: Readonly<Pick<LevelSpec, "id" | "width" | "height" | "seams">>,
): void => {
  if (level.seams !== undefined && !Array.isArray(level.seams)) {
    throw new Error(`Level ${level.id}: board seams must be an array`);
  }
  const occupiedRails = new Set<string>();
  for (let index = 0; index < (level.seams?.length ?? 0); index += 1) {
    const seam = level.seams![index];
    const label = `Level ${level.id}: board seam ${index}`;
    if (!seam || (seam.orientation !== "horizontal" && seam.orientation !== "vertical")) {
      throw new Error(`${label} has invalid orientation ${String(seam?.orientation)}`);
    }
    if (![seam.offset, seam.start, seam.size].every(Number.isInteger) || seam.size <= 0) {
      throw new Error(`${label} needs integer offset/start and positive integer size`);
    }
    const normalLimit = seam.orientation === "horizontal" ? level.height : level.width;
    const tangentLimit = seam.orientation === "horizontal" ? level.width : level.height;
    if (seam.offset <= 0 || seam.offset >= normalLimit
      || seam.start < 0 || seam.start + seam.size > tangentLimit) {
      throw new Error(`${label} is out of bounds`);
    }
    for (let tangent = seam.start; tangent < seam.start + seam.size; tangent += 1) {
      const rail = `${seam.orientation}:${seam.offset}:${tangent}`;
      if (occupiedRails.has(rail)) throw new Error(`${label} overlaps another board seam at ${rail}`);
      occupiedRails.add(rail);
    }
  }
};
