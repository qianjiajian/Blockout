import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { LEVELS } from "../src/core/levels";
import { solveLevelOptimally } from "../src/core/levelSolver";
import type { LevelSpec, Point } from "../src/core/types";
import { BOARD_PAR_OVERRIDES } from "../src/core/boardShapes";
import { enclosedBoardVoids, fillEnclosedBoardVoids } from "../src/core/boardTopology";

const FAMILIES = [
  "corner-notches",
  "hourglass",
  "vertical-dumbbell",
  "crossroads",
  "descending-steps",
  "ascending-steps",
  "twin-chambers",
  "top-hammer",
  "u-bay",
  "s-bend",
  "side-bays",
  "narrow-bridge",
] as const;

const key = (x: number, y: number): string => `${x},${y}`;

const cellsAt = (shape: Point[], x: number, y: number): Point[] => (
  shape.map(([dx, dy]) => [x + dx, y + dy] as const)
);

const addCells = (target: Set<string>, cells: Point[]): void => {
  for (const [x, y] of cells) target.add(key(x, y));
};

const addRouteProtection = (level: LevelSpec): Set<string> => {
  const protectedCells = new Set<string>();
  const positions = new Map(level.blocks.map((block) => [block.id, { x: block.x, y: block.y, shape: block.shape }]));
  for (const block of level.blocks) addCells(protectedCells, cellsAt(block.shape, block.x, block.y));
  for (const shutter of level.shutters ?? []) {
    for (let y = shutter.y; y < shutter.y + shutter.height; y += 1) {
      for (let x = shutter.x; x < shutter.x + shutter.width; x += 1) protectedCells.add(key(x, y));
    }
  }
  for (const gate of level.gates) {
    for (let offset = gate.offset; offset < gate.offset + gate.size; offset += 1) {
      if (gate.side === "top") protectedCells.add(key(offset, 0));
      else if (gate.side === "bottom") protectedCells.add(key(offset, level.height - 1));
      else if (gate.side === "left") protectedCells.add(key(0, offset));
      else protectedCells.add(key(level.width - 1, offset));
    }
  }

  const solution = solveLevelOptimally(level);
  if (!solution.solved) throw new Error(`Cannot generate board shape for unsolved level ${level.id}`);
  for (const drag of solution.drags) {
    const position = positions.get(drag.blockId);
    if (!position) continue;
    addCells(protectedCells, cellsAt(position.shape, position.x, position.y));
    for (const [x, y] of drag.path) {
      addCells(protectedCells, cellsAt(position.shape, x, y));
      position.x = x;
      position.y = y;
    }
  }
  return protectedCells;
};

const motifIncludes = (family: number, x: number, y: number, width: number, height: number, seed: number): boolean => {
  const left = x < Math.ceil(width / 2);
  const top = y < Math.ceil(height / 2);
  const centerX = Math.abs(x - (width - 1) / 2);
  const centerY = Math.abs(y - (height - 1) / 2);
  const bandX = centerX <= Math.max(1, Math.floor(width / 5));
  const bandY = centerY <= Math.max(1, Math.floor(height / 5));
  const thirdY = Math.floor((y * 3) / height);
  const thirdX = Math.floor((x * 3) / width);
  if (family === 0) {
    const notch = 1 + (seed % 2);
    return !((x < notch && y < notch) || (x >= width - notch && y >= height - notch));
  }
  if (family === 1) return bandX || y < Math.ceil(height / 3) || y >= height - Math.ceil(height / 3);
  if (family === 2) return bandY || x < Math.ceil(width / 3) || x >= width - Math.ceil(width / 3);
  if (family === 3) return bandX || bandY;
  if (family === 4) return x >= Math.min(2, thirdY) && x < width - Math.max(0, 1 - thirdY);
  if (family === 5) return x >= Math.max(0, 1 - thirdY) && x < width - Math.min(2, thirdY);
  if (family === 6) return y < Math.ceil(height / 3) || y >= height - Math.ceil(height / 3) || (bandX && centerY <= 2);
  if (family === 7) return y < Math.ceil(height / 3) || bandX;
  if (family === 8) return x < Math.ceil(width / 3) || x >= width - Math.ceil(width / 3) || y >= height - Math.ceil(height / 3);
  if (family === 9) return bandY || (top ? x < width - Math.floor(width / 4) : x >= Math.floor(width / 4));
  if (family === 10) return thirdX === 1 || thirdY !== 1 || ((x + y + seed) % 3 !== 0);
  return y < Math.ceil(height / 3) || y >= height - Math.ceil(height / 3) || bandX;
};

const dilateProtected = (level: LevelSpec, protectedCells: Set<string>, radius: number): Set<string> => {
  const result = new Set(protectedCells);
  for (const cell of protectedCells) {
    const [x, y] = cell.split(",").map(Number);
    for (let dy = -radius; dy <= radius; dy += 1) {
      for (let dx = -radius; dx <= radius; dx += 1) {
        if (Math.abs(dx) + Math.abs(dy) > radius) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && ny >= 0 && nx < level.width && ny < level.height) result.add(key(nx, ny));
      }
    }
  }
  return result;
};

const rowsFor = (level: LevelSpec, protectedCells: Set<string>): string[] => {
  const family = (level.id - 1) % FAMILIES.length;
  const halo = dilateProtected(level, protectedCells, level.id <= 20 ? 1 : 0);
  const rows: string[] = [];
  for (let y = 0; y < level.height; y += 1) {
    let row = "";
    for (let x = 0; x < level.width; x += 1) {
      const cell = key(x, y);
      const active = halo.has(cell) || motifIncludes(family, x, y, level.width, level.height, level.id);
      row += active ? "#" : ".";
    }
    rows.push(row);
  }
  return rows;
};

const mutableCellCandidates = (level: LevelSpec, protectedCells: Set<string>): Point[] => {
  const cells: Array<{ point: Point; score: number }> = [];
  for (let y = 0; y < level.height; y += 1) {
    for (let x = 0; x < level.width; x += 1) {
      if (protectedCells.has(key(x, y))) continue;
      const score = (Math.imul(level.id + 29, 0x45d9f3b) ^ Math.imul(x + 7, 0x27d4eb2d) ^ Math.imul(y + 13, 0x165667b1)) >>> 0;
      cells.push({ point: [x, y], score });
    }
  }
  return cells.sort((a, b) => a.score - b.score).map(({ point }) => point);
};

const enforceVoidBudget = (level: LevelSpec, rows: string[], protectedCells: Set<string>): void => {
  const chapter = Math.floor((level.id - 1) / 10);
  const desired = Math.max(4, Math.ceil(level.width * level.height * (0.08 + chapter * 0.015)));
  const countVoids = (): number => rows.reduce((sum, row) => sum + [...row].filter((cell) => cell === ".").length, 0);
  const candidates = mutableCellCandidates(level, protectedCells);
  while (countVoids() < desired) {
    const active = candidates.filter(([x, y]) => rows[y][x] === "#" && (
      x === 0 || y === 0 || x === level.width - 1 || y === level.height - 1
      || ([[1, 0], [-1, 0], [0, 1], [0, -1]] as Point[]).some(([dx, dy]) => rows[y + dy]?.[x + dx] === ".")
    ));
    if (!active.length) break;
    active.sort(([ax, ay], [bx, by]) => {
      const voidNeighbors = (x: number, y: number): number => ([[1, 0], [-1, 0], [0, 1], [0, -1]] as Point[])
        .filter(([dx, dy]) => x + dx < 0 || y + dy < 0 || x + dx >= level.width || y + dy >= level.height || rows[y + dy][x + dx] === ".").length;
      const aEdge = ax === 0 || ay === 0 || ax === level.width - 1 || ay === level.height - 1 ? 1 : 0;
      const bEdge = bx === 0 || by === 0 || bx === level.width - 1 || by === level.height - 1 ? 1 : 0;
      const aScore = voidNeighbors(ax, ay) * 100 + aEdge * 20 + Math.abs(ax - (level.width - 1) / 2) + Math.abs(ay - (level.height - 1) / 2);
      const bScore = voidNeighbors(bx, by) * 100 + bEdge * 20 + Math.abs(bx - (level.width - 1) / 2) + Math.abs(by - (level.height - 1) / 2);
      return bScore - aScore || ay - by || ax - bx;
    });
    const [x, y] = active[0];
    rows[y] = `${rows[y].slice(0, x)}.${rows[y].slice(x + 1)}`;
  }
};

const signatures = new Set<string>();
const output = LEVELS.map((level) => {
  const protectedCells = addRouteProtection(level);
  const tutorialRectangle = level.id === 1;
  const rows = tutorialRectangle
    ? Array.from({ length: level.height }, () => "#".repeat(level.width))
    : rowsFor(level, protectedCells);
  if (!tutorialRectangle) enforceVoidBudget(level, rows, protectedCells);
  rows.splice(0, rows.length, ...fillEnclosedBoardVoids(rows, level.width, level.height));
  const signature = (): string => `${level.width}x${level.height}:${rows.join("/")}`;
  if (!tutorialRectangle && rows.every((row) => !row.includes("."))) {
    const removable = mutableCellCandidates(level, protectedCells)[0];
    if (!removable) throw new Error(`Level ${level.id} has no safe cell for a non-rectangular silhouette`);
    const [x, y] = removable;
    rows[y] = `${rows[y].slice(0, x)}.${rows[y].slice(x + 1)}`;
  }
  if (signatures.has(signature())) {
    let madeUnique = false;
    for (const [x, y] of mutableCellCandidates(level, protectedCells)) {
      const original = rows[y][x];
      rows[y] = `${rows[y].slice(0, x)}${original === "#" ? "." : "#"}${rows[y].slice(x + 1)}`;
      if (!enclosedBoardVoids(rows, level.width, level.height).length && !signatures.has(signature())) {
        madeUnique = true;
        break;
      }
      rows[y] = `${rows[y].slice(0, x)}${original}${rows[y].slice(x + 1)}`;
    }
    if (!madeUnique) throw new Error(`Could not make level ${level.id} silhouette unique`);
  }
  signatures.add(signature());
  return {
    id: level.id,
    family: tutorialRectangle ? "tutorial-rectangle" : FAMILIES[(level.id - 1) % FAMILIES.length],
    rows,
  };
});

const lines = [
  'import type { Point } from "./types";',
  'import { fillEnclosedBoardVoids } from "./boardTopology";',
  "",
  "// Generated by tools/generate-board-shapes.ts.",
  "// # = playable floor, . = void. One compact, replaceable silhouette per level.",
  "export const RAW_BOARD_SHAPE_ROWS: Record<number, readonly string[]> = {",
  ...output.flatMap(({ id, family, rows }) => [
    `  // Level ${id}: ${family}`,
    `  ${id}: [${rows.map((row) => `"${row}"`).join(", ")}],`,
  ]),
  "};",
  "",
  "export const BOARD_SHAPE_ROWS: Record<number, readonly string[]> = Object.fromEntries(",
  "  Object.entries(RAW_BOARD_SHAPE_ROWS).map(([id, rows]) => [",
  "    Number(id),",
  "    fillEnclosedBoardVoids(rows, Math.max(...rows.map((row) => row.length)), rows.length),",
  "  ]),",
  ");",
  "",
  `export const BOARD_PAR_OVERRIDES: Record<number, number> = ${JSON.stringify(BOARD_PAR_OVERRIDES)};`,
  "",
  "export const BOARD_SHAPE_FAMILY_BY_LEVEL: Record<number, string> = {",
  ...output.map(({ id, family }) => `  ${id}: "${family}",`),
  "};",
  "",
  "export const boardShapeForLevel = (levelId: number, width?: number, height?: number): Point[] | undefined => {",
  "  const stored = BOARD_SHAPE_ROWS[levelId];",
  "  const dimensionsMatch = width === undefined || height === undefined",
  "    || (stored?.length === height && stored.every((row) => row.length === width));",
  "  const rows = dimensionsMatch && stored",
  "    ? stored",
  "    : width !== undefined && height !== undefined",
  "      ? Array.from({ length: height }, () => \"#\".repeat(width))",
  "      : stored;",
  "  if (!rows) return undefined;",
  "  const cells: Point[] = [];",
  "  rows.forEach((row, y) => [...row].forEach((cell, x) => { if (cell === \"#\") cells.push([x, y]); }));",
  "  return cells;",
  "};",
  "",
  "export const boardParForLevel = (levelId: number): number | undefined => BOARD_PAR_OVERRIDES[levelId];",
  "",
];

const target = resolve(process.cwd(), "src/core/boardShapes.ts");
writeFileSync(target, `${lines.join("\n")}\n`, "utf8");

const voidCounts = output.map(({ rows }) => rows.reduce((sum, row) => sum + [...row].filter((cell) => cell === ".").length, 0));
console.log(JSON.stringify({
  levels: output.length,
  families: new Set(output.map(({ family }) => family)).size,
  uniqueSilhouettes: signatures.size,
  minVoids: Math.min(...voidCounts),
  maxVoids: Math.max(...voidCounts),
  averageVoids: Number((voidCounts.reduce((sum, count) => sum + count, 0) / voidCounts.length).toFixed(1)),
}, null, 2));
