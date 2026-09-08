import { validateLevel } from "../core/PuzzleModel";
import { enclosedBoardVoids } from "../core/boardTopology";
import type { BlockColor, LevelSpec, Point, Side } from "../core/types";

export interface CellConstraint {
  blocked: boolean;
  required: boolean;
  tags: string[];
  gateSides: Side[];
  colors: BlockColor[];
}

export interface BoardShapeStats {
  active: number;
  voids: number;
  enclosedVoids: number;
  components: number;
  perimeter: number;
  coverage: number;
}

export interface BoardShapeAnalysis {
  errors: string[];
  warnings: string[];
  stats: BoardShapeStats;
}

export const cellKey = (x: number, y: number): string => `${x},${y}`;

export const normalizeRows = (rows: readonly string[], width: number, height: number): string[] => (
  Array.from({ length: height }, (_, y) => (
    Array.from({ length: width }, (_, x) => rows[y]?.[x] === "#" ? "#" : ".").join("")
  ))
);

export const rowsToPoints = (rows: readonly string[]): Point[] => {
  const points: Point[] = [];
  rows.forEach((row, y) => [...row].forEach((cell, x) => {
    if (cell === "#") points.push([x, y]);
  }));
  return points;
};

export const pointsToRows = (points: readonly Point[], width: number, height: number): string[] => {
  const active = new Set(points.map(([x, y]) => cellKey(x, y)));
  return Array.from({ length: height }, (_, y) => (
    Array.from({ length: width }, (_, x) => active.has(cellKey(x, y)) ? "#" : ".").join("")
  ));
};

const constraintAt = (constraints: Map<string, CellConstraint>, x: number, y: number): CellConstraint => {
  const key = cellKey(x, y);
  const existing = constraints.get(key);
  if (existing) return existing;
  const created: CellConstraint = { blocked: false, required: false, tags: [], gateSides: [], colors: [] };
  constraints.set(key, created);
  return created;
};

export const buildCellConstraints = (level: LevelSpec): Map<string, CellConstraint> => {
  const constraints = new Map<string, CellConstraint>();
  for (const [x, y] of level.blocked ?? []) {
    const cell = constraintAt(constraints, x, y);
    cell.blocked = true;
    cell.tags.push("固定障碍");
  }
  for (const gate of level.gates) {
    for (let offset = gate.offset; offset < gate.offset + gate.size; offset += 1) {
      const [x, y]: Point = gate.side === "top" ? [offset, 0]
        : gate.side === "bottom" ? [offset, level.height - 1]
          : gate.side === "left" ? [0, offset]
            : [level.width - 1, offset];
      const cell = constraintAt(constraints, x, y);
      cell.required = true;
      cell.tags.push(`${gate.color} 出口`);
      cell.gateSides.push(gate.side);
      cell.colors.push(gate.color);
    }
  }
  for (const block of level.blocks) {
    for (const [dx, dy] of block.shape) {
      const cell = constraintAt(constraints, block.x + dx, block.y + dy);
      cell.required = true;
      cell.tags.push(`${block.color} 方块 ${block.id}`);
      cell.colors.push(block.color);
    }
  }
  for (const shutter of level.shutters ?? []) {
    for (let y = shutter.y; y < shutter.y + shutter.height; y += 1) {
      for (let x = shutter.x; x < shutter.x + shutter.width; x += 1) {
        const cell = constraintAt(constraints, x, y);
        cell.required = true;
        cell.tags.push(`卷帘 ${shutter.id}`);
      }
    }
  }
  return constraints;
};

const connectedComponents = (active: Set<string>, width: number, height: number): string[][] => {
  const remaining = new Set(active);
  const components: string[][] = [];
  const directions: Point[] = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  while (remaining.size) {
    const first = remaining.values().next().value as string;
    remaining.delete(first);
    const queue = [first];
    const component: string[] = [];
    for (let index = 0; index < queue.length; index += 1) {
      const current = queue[index];
      component.push(current);
      const [x, y] = current.split(",").map(Number);
      for (const [dx, dy] of directions) {
        const nx = x + dx;
        const ny = y + dy;
        const neighbor = cellKey(nx, ny);
        if (nx < 0 || ny < 0 || nx >= width || ny >= height || !remaining.has(neighbor)) continue;
        remaining.delete(neighbor);
        queue.push(neighbor);
      }
    }
    components.push(component);
  }
  return components;
};

export const analyzeBoardShape = (level: LevelSpec, rows: readonly string[]): BoardShapeAnalysis => {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (rows.length !== level.height) errors.push(`行数应为 ${level.height}，当前为 ${rows.length}`);
  rows.forEach((row, y) => {
    if (row.length !== level.width) errors.push(`第 ${y + 1} 行应为 ${level.width} 格，当前为 ${row.length}`);
    if (/[^#.]/.test(row)) errors.push(`第 ${y + 1} 行包含非法字符，仅允许 # 和 .`);
  });

  const normalized = normalizeRows(rows, level.width, level.height);
  const active = new Set(rowsToPoints(normalized).map(([x, y]) => cellKey(x, y)));
  const constraints = buildCellConstraints(level);
  for (const [key, constraint] of constraints) {
    if (constraint.blocked && active.has(key)) errors.push(`${key} 是固定障碍，不能铺设棋盘`);
    if (constraint.required && !active.has(key)) errors.push(`${key} 承载${constraint.tags.join(" / ")}，不能挖空`);
  }
  if (!active.size) errors.push("棋盘不能完全为空");

  const components = connectedComponents(active, level.width, level.height);
  const required = new Set([...constraints].filter(([, value]) => value.required).map(([key]) => key));
  const emptyComponents = components.filter((component) => !component.some((key) => required.has(key)));
  if (emptyComponents.length) warnings.push(`有 ${emptyComponents.length} 个分区没有方块、出口或卷帘，可能是无意义孤岛`);
  const oneCellComponents = components.filter((component) => component.length === 1).length;
  if (oneCellComponents) warnings.push(`有 ${oneCellComponents} 个单格孤岛，触控和视觉都容易误解`);
  if (components.length > 4) warnings.push(`当前有 ${components.length} 个独立分区，建议控制在 1–4 个`);

  let perimeter = 0;
  for (const cell of active) {
    const [x, y] = cell.split(",").map(Number);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as Point[]) {
      if (!active.has(cellKey(x + dx, y + dy))) perimeter += 1;
    }
  }
  const area = level.width * level.height;
  const voids = area - active.size;
  const enclosedVoids = enclosedBoardVoids(normalized, level.width, level.height);
  if (enclosedVoids.length) {
    errors.push(`棋盘内部有 ${enclosedVoids.length} 个不能移动的封闭空格，请铺平或把缺口连到外沿`);
  }
  if (voids < 3) warnings.push("轮廓接近完整矩形，策略差异可能不明显");
  if (active.size / area < 0.42) warnings.push("棋盘可用面积低于 42%，可能过于拥挤");

  if (!errors.length) {
    try {
      validateLevel({ ...level, playable: rowsToPoints(normalized) });
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  return {
    errors: [...new Set(errors)],
    warnings: [...new Set(warnings)],
    stats: {
      active: active.size,
      voids,
      enclosedVoids: enclosedVoids.length,
      components: components.length,
      perimeter,
      coverage: area ? active.size / area : 0,
    },
  };
};
