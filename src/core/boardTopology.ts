import type { Point } from "./types";

const key = (x: number, y: number): string => `${x},${y}`;
const DIRECTIONS: Point[] = [[1, 0], [-1, 0], [0, 1], [0, -1]];

/**
 * Returns void cells that are completely enclosed by playable floor.
 * A legal tray indentation always remains connected to the outside edge;
 * an enclosed void would read as an immovable cell inside the board.
 */
export const enclosedBoardVoids = (
  rows: readonly string[],
  width: number,
  height: number,
): Point[] => {
  const isVoid = (x: number, y: number): boolean => rows[y]?.[x] !== "#";
  const outside = new Set<string>();
  const queue: Point[] = [];
  const addOutside = (x: number, y: number): void => {
    const cell = key(x, y);
    if (!isVoid(x, y) || outside.has(cell)) return;
    outside.add(cell);
    queue.push([x, y]);
  };

  for (let x = 0; x < width; x += 1) {
    addOutside(x, 0);
    addOutside(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    addOutside(0, y);
    addOutside(width - 1, y);
  }
  for (let index = 0; index < queue.length; index += 1) {
    const [x, y] = queue[index];
    for (const [dx, dy] of DIRECTIONS) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      addOutside(nx, ny);
    }
  }

  const enclosed: Point[] = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (isVoid(x, y) && !outside.has(key(x, y))) enclosed.push([x, y]);
    }
  }
  return enclosed;
};

export const fillEnclosedBoardVoids = (
  rows: readonly string[],
  width: number,
  height: number,
): string[] => {
  const enclosed = new Set(enclosedBoardVoids(rows, width, height).map(([x, y]) => key(x, y)));
  return Array.from({ length: height }, (_, y) => (
    Array.from({ length: width }, (_, x) => rows[y]?.[x] === "#" || enclosed.has(key(x, y)) ? "#" : ".").join("")
  ));
};
