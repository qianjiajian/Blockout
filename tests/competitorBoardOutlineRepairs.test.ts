import { describe, expect, it } from "vitest";

import {
  applyCompetitorBoardOutlineRepair,
  COMPETITOR_BOARD_OUTLINE_REPAIR_LEVEL_IDS,
  COMPETITOR_BOARD_OUTLINE_REPAIR_VERSION,
} from "../src/core/competitorBoardOutlineRepairs";
import { finalGeneratorPlacementIssues } from "../src/core/finalGeneratorContracts";
import { generatorSpawnAlignmentIssues } from "../src/core/generatorSpawnAlignmentRepairs";
import { solveLevelForValidation, type SolverDrag } from "../src/core/levelSolver";
import {
  LEVELS,
  LEVELS_BEFORE_COMPETITOR_BOARD_OUTLINE_REPAIR,
  LEVELS_BEFORE_COMPETITOR_EARLY_JOINT_MASK_REPAIR,
  LEVELS_BEFORE_COMPETITOR_LATE_BOARD_MASK_REPAIR,
} from "../src/core/levels";
import { classifyRuntimeMechanismKinds } from "../src/core/mechanismKindParity";
import { PuzzleModel, validateLevel } from "../src/core/PuzzleModel";
import { auditOrdinaryShutterCoverage } from "../src/core/shutterCoverage";
import type { LevelSpec, Point } from "../src/core/types";

const key = (x: number, y: number): string => `${x},${y}`;
const neighbours = (x: number, y: number): Point[] => [
  [x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1],
];
const rectangle = (level: Pick<LevelSpec, "width" | "height">): Point[] => Array.from(
  { length: level.height },
  (_, y) => Array.from({ length: level.width }, (__, x) => [x, y] as Point),
).flat();

const maskRows = (level: LevelSpec): string[] => {
  const playable = new Set((level.playable ?? rectangle(level)).map(([x, y]) => key(x, y)));
  return Array.from({ length: level.height }, (_, y) => (
    Array.from({ length: level.width }, (__, x) => playable.has(key(x, y)) ? "#" : ".").join("")
  ));
};

const topologyIssues = (level: LevelSpec): string[] => {
  const playable = new Set((level.playable ?? rectangle(level)).map(([x, y]) => key(x, y)));
  const remaining = new Set(playable);
  let components = 0;
  while (remaining.size) {
    components += 1;
    const queue = [remaining.values().next().value!];
    remaining.delete(queue[0]!);
    while (queue.length) {
      const [x, y] = queue.shift()!.split(",").map(Number);
      for (const [nx, ny] of neighbours(x!, y!)) {
        const next = key(nx, ny);
        if (remaining.delete(next)) queue.push(next);
      }
    }
  }
  const exterior = new Set([key(-1, -1)]);
  const queue = [key(-1, -1)];
  while (queue.length) {
    const [x, y] = queue.shift()!.split(",").map(Number);
    for (const [nx, ny] of neighbours(x!, y!)) {
      if (nx < -1 || ny < -1 || nx > level.width || ny > level.height) continue;
      const next = key(nx, ny);
      const outside = nx < 0 || ny < 0 || nx >= level.width || ny >= level.height;
      if ((outside || !playable.has(next)) && !exterior.has(next)) {
        exterior.add(next);
        queue.push(next);
      }
    }
  }
  const enclosed = rectangle(level).filter(([x, y]) => !playable.has(key(x, y)) && !exterior.has(key(x, y)));
  const expectedComponents = level.id === 176 ? 2 : 1;
  return [
    ...(level.blocked?.length ? [`${level.blocked.length} blocked`] : []),
    ...(components !== expectedComponents ? [`${components} components`] : []),
    ...(enclosed.length ? [`${enclosed.length} enclosed`] : []),
  ];
};

const replay = (level: LevelSpec, drags: readonly SolverDrag[]): boolean => {
  const model = new PuzzleModel(level);
  model.start();
  model.startCountdown();
  for (const drag of drags) {
    if (!model.getBlock(drag.blockId)) return false;
    model.beginAction();
    for (const [x, y] of drag.path) {
      const before = model.getBlock(drag.blockId);
      if (!before) return false;
      const distance = Math.abs(before.x - x) + Math.abs(before.y - y);
      const moved = distance === 1
        ? model.moveBlockStep(drag.blockId, x, y)
        : model.moveBlock(drag.blockId, x, y);
      if (!moved) return false;
    }
    if (drag.exitSide && !model.tryExit(drag.blockId, drag.exitSide).ok) return false;
    if (!model.commitAction()) return false;
  }
  const snapshot = model.snapshot();
  return snapshot.complete && snapshot.blocks.length === 0 && snapshot.queuedBlocks.length === 0;
};

describe(`competitor board outlines ${COMPETITOR_BOARD_OUTLINE_REPAIR_VERSION}`, () => {
  it("changes only the certified outline scope and never creates internal obstacles", () => {
    expect(COMPETITOR_BOARD_OUTLINE_REPAIR_LEVEL_IDS).toEqual([
      8, 9, 12, 15, 24, 25, 26, 27, 30, 42, 43, 46, 47, 48, 61, 71, 84, 176, 195,
    ]);
    for (const level of LEVELS_BEFORE_COMPETITOR_BOARD_OUTLINE_REPAIR) {
      const repaired = applyCompetitorBoardOutlineRepair(level);
      const affected = (COMPETITOR_BOARD_OUTLINE_REPAIR_LEVEL_IDS as readonly number[]).includes(level.id);
      expect(repaired === level, `Lv${level.id}`).toBe(!affected);
      if (!affected) continue;
      expect(repaired).toEqual(LEVELS_BEFORE_COMPETITOR_EARLY_JOINT_MASK_REPAIR[level.id - 1]);
      expect(applyCompetitorBoardOutlineRepair(repaired)).toBe(repaired);
      expect(topologyIssues(repaired), `Lv${level.id}`).toEqual([]);
      expect(classifyRuntimeMechanismKinds(repaired)["irregular-board"], `Lv${level.id}`)
        .toBe(level.id !== 43);
      if (![8, 9, 12, 15, 24, 25, 26, 30, 42, 71, 84, 176].includes(level.id)) {
        expect(repaired.blocks).toEqual(level.blocks);
      }
      if (![8, 9, 12, 15, 24, 25, 26, 30, 42, 176].includes(level.id)) {
        expect(repaired.gates).toEqual(level.gates);
        expect(repaired.shutters).toEqual(level.shutters);
      }
      expect(() => validateLevel(repaired)).not.toThrow();
      expect(generatorSpawnAlignmentIssues(repaired), `Lv${level.id} centre mouth`).toEqual([]);
      expect(finalGeneratorPlacementIssues(repaired), `Lv${level.id} generator rim`).toEqual([]);
    }
  });

  it("uses the certified exact competitor masks for the position-only batch", () => {
    const expected = new Map<number, readonly string[]>([
      [8, ["######", "######", "######", "...###", "...###", "...###", "...###", "...###"]],
      [9, ["##..##", "##..##", "######", "######", "######", "######", "##..##", "##..##"]],
      [12, ["######", "######", "######", "..##..", "..##..", "..##..", "######", "######", "######"]],
      [15, ["##..##", "##..##", "######", "######", "######", "######", "##..##", "##..##"]],
      [25, ["######", "######", "######", "..##..", "..##..", "..##..", "######", "######", "######"]],
      [42, ["#.#.#", "#.#.#", "#.#.#", "#.#.#", "#####", "#.#.#", "#.#.#", "#.#.#", "#.#.#"]],
    ]);
    for (const [levelId, rows] of expected) expect(maskRows(LEVELS[levelId - 1]!)).toEqual(rows);
  });

  it("uses the exact source masks and matching physical shutter cohorts for Lv24/26/30", () => {
    expect(maskRows(LEVELS[23]!)).toEqual([
      "###.#", "###.#", "###.#", "###.#", "#####", "###.#", "###.#", "###.#", "###.#",
    ]);
    expect(maskRows(LEVELS[25]!)).toEqual([
      "#######", "#######", "#######", "...#...", "...#...", "...#...", "...#...",
      "#######", "#######", "#######", "#######",
    ]);
    expect(maskRows(LEVELS[29]!)).toEqual([
      "...##...", "...##...", "...##...", "...##...", "...##...", "...##...",
      "########", "########", "########",
    ]);
    expect(LEVELS[23]!.shutters).toEqual([
      { id: "vp-024-cover-1", x: 0, y: 0, width: 2, height: 4, count: 12, skin: "shutter" },
      { id: "vp-024-cover-2", x: 0, y: 5, width: 3, height: 4, count: 12, skin: "shutter" },
    ]);
    expect(LEVELS[25]!.shutters).toEqual([
      { id: "vp-026-cover-1", x: 3, y: 3, width: 1, height: 4, count: 19, skin: "shutter" },
      { id: "vp-026-cover-2", x: 0, y: 7, width: 7, height: 4, count: 22, skin: "shutter" },
    ]);
    expect(LEVELS[29]!.shutters).toEqual([
      { id: "vp-030-cover-1", x: 3, y: 0, width: 2, height: 6, count: 12, skin: "shutter" },
    ]);
    for (const levelId of [24, 26, 30]) {
      expect(auditOrdinaryShutterCoverage(LEVELS[levelId - 1]!), `Lv${levelId}`).toEqual([]);
    }
  });

  it("uses one proven block move for each outline notch that was initially occupied", () => {
    expect(LEVELS[70]!.blocks.find((block) => block.id === "strategy-guard-s1-09")).toMatchObject({ x: 2, y: 5 });
    expect(LEVELS_BEFORE_COMPETITOR_LATE_BOARD_MASK_REPAIR[83]!.blocks.find((block) => (
      block.id === "cc-084-b1-12"
    ))).toMatchObject({ x: 3, y: 8 });
  });

  it("represents Lv176 as two solid 8x5 panels separated by outside-board space", () => {
    const level = LEVELS[175]!;
    expect(level).toMatchObject({ width: 8, height: 11 });
    expect(level.playable).toHaveLength(80);
    expect(level.playable?.some(([, y]) => y === 5)).toBe(false);
    expect(level.playable?.filter(([, y]) => y < 5)).toHaveLength(40);
    expect(level.playable?.filter(([, y]) => y > 5)).toHaveLength(40);
    expect(level.blocks.find((block) => block.id === "lv176-opening-b01")).toMatchObject({ x: 0, y: 6 });
    expect(level.shutters?.find((shutter) => shutter.id === "solvability-minimal-stage-176-5"))
      .toMatchObject({ x: 3, y: 9, count: 5, skin: "shutter" });
  });

  it("preserves every Lv43 generator except the bottom mouth moved to the completed rim", () => {
    const before = LEVELS_BEFORE_COMPETITOR_BOARD_OUTLINE_REPAIR[42]!;
    const after = LEVELS[42]!;
    expect(after.playable).toHaveLength(after.width * after.height);
    expect(after.generators?.filter((generator) => generator.id !== "vp-043-generator-6"))
      .toEqual(before.generators?.filter((generator) => generator.id !== "vp-043-generator-6"));
    expect(after.generators?.find((generator) => generator.id === "vp-043-generator-6")).toMatchObject({
      spawn: [3, 7],
      rimAnchor: { x: 4.5, y: 10, quarterTurns: 2 },
    });
  });

  it("fresh-solves and independently replays every changed level", () => {
    for (const levelId of COMPETITOR_BOARD_OUTLINE_REPAIR_LEVEL_IDS) {
      const level = LEVELS[levelId - 1]!;
      const solution = solveLevelForValidation(level, 20_000);
      expect(solution.staticUnsatReasons, `Lv${levelId} static`).toEqual([]);
      expect(solution.unsupportedReasons, `Lv${levelId} unsupported`).toEqual([]);
      expect(solution.solved, `Lv${levelId}: ${solution.termination}/${solution.exploredStates}`).toBe(true);
      expect(replay(level, solution.drags), `Lv${levelId} replay`).toBe(true);
    }
  }, 30_000);
});
