import { describe, expect, it } from "vitest";
import { LEVELS } from "../src/core/levels";
import {
  analyzeBoardShape,
  buildCellConstraints,
  cellKey,
  pointsToRows,
  rowsToPoints,
} from "../src/editor/boardEditorModel";

const replaceCell = (rows: readonly string[], x: number, y: number, value: "#" | "."): string[] => {
  const next = [...rows];
  next[y] = `${next[y].slice(0, x)}${value}${next[y].slice(x + 1)}`;
  return next;
};

describe("board shape editor model", () => {
  const levelRows = (level: (typeof LEVELS)[number]): string[] => pointsToRows(level.playable ?? [], level.width, level.height);

  it("accepts all 100 checked-in silhouettes", () => {
    for (const level of LEVELS) {
      const analysis = analyzeBoardShape(level, levelRows(level));
      expect(analysis.errors, `level ${level.id}`).toEqual([]);
      expect(analysis.stats.active, `level ${level.id}`).toBeGreaterThan(0);
    }
  });

  it("prevents carving a gate, block, or shutter requirement", () => {
    const level = LEVELS[0];
    const required = [...buildCellConstraints(level)].find(([, constraint]) => constraint.required);
    expect(required).toBeDefined();
    const [x, y] = required![0].split(",").map(Number);
    const analysis = analyzeBoardShape(level, replaceCell(levelRows(level), x, y, "."));
    expect(analysis.errors.some((message) => message.includes(cellKey(x, y)) && message.includes("不能挖空"))).toBe(true);
  });

  it("keeps production boards free of fixed interior obstacles", () => {
    expect(LEVELS.every((level) => !(level.blocked?.length))).toBe(true);
  });

  it("round-trips a silhouette between row and point formats", () => {
    const level = LEVELS[14];
    const rows = levelRows(level);
    expect(pointsToRows(rowsToPoints(rows), level.width, level.height)).toEqual(rows);
  });

  it("rejects a non-movable void enclosed inside the tray", () => {
    const level = LEVELS[0];
    const rows = Array.from({ length: level.height }, () => "#".repeat(level.width));
    const centerX = Math.floor(level.width / 2);
    const centerY = Math.floor(level.height / 2);
    const withHole = replaceCell(rows, centerX, centerY, ".");
    const analysis = analyzeBoardShape(level, withHole);
    expect(analysis.errors.some((message) => message.includes("不能移动的封闭空格"))).toBe(true);
    expect(analysis.stats.enclosedVoids).toBe(1);
  });
});
