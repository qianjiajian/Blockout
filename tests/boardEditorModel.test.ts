import { describe, expect, it } from "vitest";
import { LEVELS } from "../src/core/levels";
import type { LevelSpec, Side } from "../src/core/types";
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
  // These video-parity masks intentionally contain a sealed void. Runtime
  // validation accepts that topology; the editor keeps surfacing its warning
  // so a designer cannot introduce another one accidentally.
  const certifiedInteriorSilhouettes = new Set([
    20, 33, 75,
    123, 146, 155, 158, 163, 172, 173, 178, 179, 182, 196,
  ]);

  it("accepts all 200 checked-in silhouettes", () => {
    for (const level of LEVELS) {
      const analysis = analyzeBoardShape(level, levelRows(level));
      if (certifiedInteriorSilhouettes.has(level.id)) {
        expect(analysis.errors, `level ${level.id}`).toHaveLength(1);
        expect(analysis.errors[0]).toContain("不能移动的封闭空格");
      } else {
        expect(analysis.errors, `level ${level.id}`).toEqual([]);
      }
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

  it("maps every fixed-gate and flip-door portal mouth to its directed side", () => {
    const level: LevelSpec = {
      id: 999,
      name: "editor portal fixture",
      difficulty: "normal",
      timeSeconds: 60,
      reward: 0,
      width: 7,
      height: 7,
      gates: [{
        id: "fixed-red",
        side: "right",
        offset: 1,
        size: 2,
        color: "red",
        portals: [
          { side: "right", origin: [1, 1], size: 2 },
          { side: "left", origin: [5, 4], size: 2 },
        ],
      }],
      flipDoors: [{
        id: "flip-blue",
        side: "bottom",
        offset: 1,
        size: 2,
        color: "blue",
        initiallyOpen: true,
        portals: [
          { side: "bottom", origin: [1, 5], size: 2 },
          { side: "top", origin: [4, 1], size: 2 },
        ],
      }],
      blocks: [],
    };
    const constraints = buildCellConstraints(level);
    const expected = new Map<string, { side: Side; color: "red" | "blue"; tag: string }>([
      ["1,1", { side: "right", color: "red", tag: "red 出口" }],
      ["1,2", { side: "right", color: "red", tag: "red 出口" }],
      ["5,4", { side: "left", color: "red", tag: "red 出口" }],
      ["5,5", { side: "left", color: "red", tag: "red 出口" }],
      ["1,5", { side: "bottom", color: "blue", tag: "blue 翻转门" }],
      ["2,5", { side: "bottom", color: "blue", tag: "blue 翻转门" }],
      ["4,1", { side: "top", color: "blue", tag: "blue 翻转门" }],
      ["5,1", { side: "top", color: "blue", tag: "blue 翻转门" }],
    ]);

    expect([...constraints.keys()].sort()).toEqual([...expected.keys()].sort());
    for (const [key, value] of expected) {
      expect(constraints.get(key)).toMatchObject({
        required: true,
        tags: [value.tag],
        gateSides: [value.side],
        colors: [value.color],
      });
    }
  });

  it("keeps legacy side, offset, and size gate placement unchanged", () => {
    const level: LevelSpec = {
      id: 998,
      name: "editor legacy gate fixture",
      difficulty: "normal",
      timeSeconds: 60,
      reward: 0,
      width: 4,
      height: 3,
      gates: [{ id: "fixed-red", side: "top", offset: 1, size: 2, color: "red" }],
      flipDoors: [{
        id: "flip-blue",
        side: "right",
        offset: 0,
        size: 2,
        color: "blue",
        initiallyOpen: false,
      }],
      blocks: [],
    };
    const constraints = buildCellConstraints(level);

    expect([...constraints.keys()].sort()).toEqual(["1,0", "2,0", "3,0", "3,1"]);
    expect(constraints.get("1,0")).toMatchObject({
      tags: ["red 出口"],
      gateSides: ["top"],
      colors: ["red"],
    });
    expect(constraints.get("2,0")).toMatchObject({ gateSides: ["top"] });
    expect(constraints.get("3,0")).toMatchObject({
      tags: ["blue 翻转门"],
      gateSides: ["right"],
      colors: ["blue"],
    });
    expect(constraints.get("3,1")).toMatchObject({ gateSides: ["right"] });
  });

  it("maps both directed sides of horizontal and vertical board seams", () => {
    const level: LevelSpec = {
      id: 996,
      name: "editor seam fixture",
      difficulty: "normal",
      timeSeconds: 60,
      reward: 0,
      width: 5,
      height: 5,
      seams: [
        { orientation: "horizontal", offset: 2, start: 1, size: 2 },
        { orientation: "vertical", offset: 4, start: 0, size: 2 },
      ],
      gates: [],
      blocks: [],
    };
    const constraints = buildCellConstraints(level);
    const expected = new Map<string, Side>([
      ["1,1", "bottom"],
      ["2,1", "bottom"],
      ["1,2", "top"],
      ["2,2", "top"],
      ["3,0", "right"],
      ["4,0", "left"],
      ["3,1", "right"],
      ["4,1", "left"],
    ]);

    expect([...constraints.keys()].sort()).toEqual([...expected.keys()].sort());
    for (const [key, side] of expected) {
      expect(constraints.get(key)).toMatchObject({
        required: true,
        tags: ["棋盘接缝"],
        gateSides: [side],
        colors: [],
      });
    }
  });

  it("splits components and counts both directed edges of full-span seams", () => {
    const fixtures: LevelSpec[] = [
      {
        id: 994,
        name: "horizontal seam analysis fixture",
        difficulty: "normal",
        timeSeconds: 60,
        reward: 0,
        width: 3,
        height: 4,
        seams: [{ orientation: "horizontal", offset: 2, start: 0, size: 3 }],
        gates: [],
        blocks: [],
      },
      {
        id: 993,
        name: "vertical seam analysis fixture",
        difficulty: "normal",
        timeSeconds: 60,
        reward: 0,
        width: 4,
        height: 3,
        seams: [{ orientation: "vertical", offset: 2, start: 0, size: 3 }],
        gates: [],
        blocks: [],
      },
    ];

    for (const level of fixtures) {
      const rows = Array.from({ length: level.height }, () => "#".repeat(level.width));
      expect(analyzeBoardShape(level, rows).stats).toMatchObject({
        components: 2,
        perimeter: 20,
      });
    }
  });

  it("warns when a seam chamber contains only seam boundary constraints", () => {
    const level: LevelSpec = {
      id: 992,
      name: "empty seam chamber fixture",
      difficulty: "normal",
      timeSeconds: 60,
      reward: 0,
      width: 3,
      height: 4,
      seams: [{ orientation: "horizontal", offset: 2, start: 0, size: 3 }],
      gates: [{ id: "upper-red", side: "top", offset: 1, size: 1, color: "red" }],
      blocks: [{ id: "upper-block", x: 1, y: 1, shape: [[0, 0]], color: "red" }],
    };
    const rows = Array.from({ length: level.height }, () => "#".repeat(level.width));
    const analysis = analyzeBoardShape(level, rows);

    expect(analysis.stats.components).toBe(2);
    expect(analysis.warnings).toContain("有 1 个分区没有方块、出口或卷帘，可能是无意义孤岛");
  });

  it("merges a portal on a seam rail and prevents erasing either seam side", () => {
    const level: LevelSpec = {
      id: 995,
      name: "editor seam portal fixture",
      difficulty: "normal",
      timeSeconds: 60,
      reward: 0,
      width: 3,
      height: 4,
      seams: [{ orientation: "horizontal", offset: 2, start: 0, size: 3 }],
      gates: [{
        id: "upper-red",
        side: "bottom",
        offset: 0,
        size: 2,
        color: "red",
        portals: [{ side: "bottom", origin: [0, 1], size: 2 }],
      }],
      blocks: [],
    };
    const constraints = buildCellConstraints(level);

    expect(constraints.get("0,1")).toMatchObject({
      required: true,
      tags: ["red 出口", "棋盘接缝"],
      gateSides: ["bottom"],
      colors: ["red"],
    });
    expect(constraints.get("1,1")?.gateSides).toEqual(["bottom"]);
    expect(constraints.get("0,2")).toMatchObject({
      required: true,
      tags: ["棋盘接缝"],
      gateSides: ["top"],
      colors: [],
    });

    const rows = Array.from({ length: level.height }, () => "#".repeat(level.width));
    const intactAnalysis = analyzeBoardShape(level, rows);
    expect(intactAnalysis.stats).toMatchObject({
      components: 2,
      perimeter: 20,
    });
    expect(intactAnalysis.warnings).toContain("有 1 个分区没有方块、出口或卷帘，可能是无意义孤岛");
    const withoutPortalMouth = analyzeBoardShape(level, replaceCell(rows, 0, 1, "."));
    expect(withoutPortalMouth.errors.some((message) => (
      message.includes("0,1")
      && message.includes("red 出口 / 棋盘接缝")
      && message.includes("不能挖空")
    ))).toBe(true);
    const withoutOppositeSeamCell = analyzeBoardShape(level, replaceCell(rows, 2, 2, "."));
    expect(withoutOppositeSeamCell.errors.some((message) => (
      message.includes("2,2") && message.includes("棋盘接缝") && message.includes("不能挖空")
    ))).toBe(true);
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
