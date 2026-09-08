import type { Point } from "../core/types";

export type QuarterTurn = 0 | 1 | 2 | 3;

export interface BoardRimRail {
  x: number;
  y: number;
  quarterTurns: QuarterTurn;
}

export interface BoardRimCorner {
  x: number;
  y: number;
  quarterTurns: QuarterTurn;
}

export interface BoardRimLayout {
  rails: BoardRimRail[];
  convexCorners: BoardRimCorner[];
}

const key = (x: number, y: number): string => `${x},${y}`;

export const buildBoardRimLayout = (
  playable: readonly Point[],
  blocked: readonly Point[],
  width: number,
  height: number,
): BoardRimLayout => {
  const active = new Set(playable.map(([x, y]) => key(x, y)));
  for (const [x, y] of blocked) active.delete(key(x, y));
  const isFloor = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < width && y < height && active.has(key(x, y));
  const rails: BoardRimRail[] = [];
  const convexCorners: BoardRimCorner[] = [];

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!isFloor(x, y)) continue;
      if (!isFloor(x, y - 1)) rails.push({ x: x + 0.5, y, quarterTurns: 0 });
      if (!isFloor(x + 1, y)) rails.push({ x: x + 1, y: y + 0.5, quarterTurns: 1 });
      if (!isFloor(x, y + 1)) rails.push({ x: x + 0.5, y: y + 1, quarterTurns: 2 });
      if (!isFloor(x - 1, y)) rails.push({ x, y: y + 0.5, quarterTurns: 3 });
    }
  }

  for (let y = 0; y <= height; y += 1) {
    for (let x = 0; x <= width; x += 1) {
      const northWest = isFloor(x - 1, y - 1);
      const northEast = isFloor(x, y - 1);
      const southWest = isFloor(x - 1, y);
      const southEast = isFloor(x, y);
      const count = Number(northWest) + Number(northEast) + Number(southWest) + Number(southEast);
      if (count !== 1) continue;
      const quarterTurns: QuarterTurn = southEast ? 0 : southWest ? 1 : northWest ? 2 : 3;
      convexCorners.push({ x, y, quarterTurns });
    }
  }

  return { rails, convexCorners };
};
