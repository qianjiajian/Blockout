import { describe, expect, it } from "vitest";

import {
  applyCompetitorShutterContractRepair,
  COMPETITOR_SHUTTER_CONTRACT_REPAIR_LEVEL_IDS,
  COMPETITOR_SHUTTER_CONTRACT_REPAIR_VERSION,
} from "../src/core/competitorShutterContractRepairs";
import { solveLevelForValidation, type SolverDrag } from "../src/core/levelSolver";
import { LEVELS, LEVELS_BEFORE_COMPETITOR_SHUTTER_CONTRACT_REPAIR } from "../src/core/levels";
import { PuzzleModel, validateLevel } from "../src/core/PuzzleModel";
import { auditOrdinaryShutterCoverage } from "../src/core/shutterCoverage";
import type { LevelSpec } from "../src/core/types";

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

describe(`competitor shutter contracts ${COMPETITOR_SHUTTER_CONTRACT_REPAIR_VERSION}`, () => {
  it("changes only the certified level and is idempotent", () => {
    expect(COMPETITOR_SHUTTER_CONTRACT_REPAIR_LEVEL_IDS).toEqual([28, 98]);
    for (const before of LEVELS_BEFORE_COMPETITOR_SHUTTER_CONTRACT_REPAIR) {
      const after = applyCompetitorShutterContractRepair(before);
      const affected = (COMPETITOR_SHUTTER_CONTRACT_REPAIR_LEVEL_IDS as readonly number[]).includes(before.id);
      expect(after === before, `Lv${before.id}`).toBe(!affected);
      if (!affected) continue;
      expect(after).toEqual(LEVELS[before.id - 1]);
      expect(applyCompetitorShutterContractRepair(after)).toBe(after);
    }
  });

  it("makes both Lv28 visual rectangles exactly match their hidden cohorts", () => {
    const level = LEVELS[27]!;
    expect(level.shutters?.filter(({ skin }) => skin === "staging")).toEqual([]);
    expect(level.shutters?.filter(({ skin }) => skin === "shutter")).toEqual([
      { id: "vp-028-cover-1", x: 0, y: 3, width: 6, height: 3, count: 3, skin: "shutter" },
      { id: "vp-028-cover-2", x: 0, y: 0, width: 6, height: 3, count: 7, skin: "shutter" },
    ]);
    expect(level.blocks.filter(({ shutterId }) => shutterId === "vp-028-cover-1").map(({ id }) => id).sort())
      .toEqual([
        "cc-028-b2-01", "cc-028-b2-02", "cc-028-b2-03", "cc-028-b2-04", "cc-028-b2-05",
        "cc-028-b2-06", "cc-028-b2-07",
      ]);
    expect(level.blocks.filter(({ shutterId }) => shutterId === "vp-028-cover-2").map(({ id }) => id).sort())
      .toEqual([
        "cc-028-b3-01", "cc-028-b3-02", "cc-028-b3-03", "cc-028-b3-04", "cc-028-b3-05",
        "cc-028-b3-06",
      ]);
    expect(auditOrdinaryShutterCoverage(level)).toEqual([]);
    expect(() => validateLevel(level)).not.toThrow();
  });

  it("makes both Lv98 visual rectangles exactly match their hidden cohorts", () => {
    const level = LEVELS[97]!;
    expect(level.shutters?.filter(({ skin }) => skin === "staging")).toEqual([]);
    expect(level.shutters?.filter(({ skin }) => skin === "shutter")).toEqual([
      { id: "vp-098-cover-1", x: 5, y: 1, width: 3, height: 5, count: 9, skin: "shutter" },
      { id: "vp-098-cover-2", x: 5, y: 6, width: 3, height: 4, count: 14, skin: "shutter" },
    ]);
    expect(level.blocks.filter(({ shutterId }) => shutterId === "vp-098-cover-1").map(({ id }) => id).sort())
      .toEqual(["cc-098-b2-01", "cc-098-b2-02"]);
    expect(level.blocks.filter(({ shutterId }) => shutterId === "vp-098-cover-2").map(({ id }) => id).sort())
      .toEqual(["cc-098-b3-01", "cc-098-b3-02", "cc-098-b3-03"]);
    expect(auditOrdinaryShutterCoverage(level)).toEqual([]);
    expect(() => validateLevel(level)).not.toThrow();
  });

  it("preserves the fourteen-piece opening and fresh-solves with PuzzleModel replay", () => {
    const level = LEVELS[97]!;
    const closed = new Set(level.shutters?.filter(({ count }) => count > 0).map(({ id }) => id));
    const opening = level.blocks.filter((block) => !(block.shutterId && closed.has(block.shutterId)));
    expect(opening.map(({ id }) => id).sort()).toEqual(Array.from(
      { length: 14 },
      (_, index) => `cc-098-b1-${String(index + 1).padStart(2, "0")}`,
    ));
    const solution = solveLevelForValidation(level, 20_000);
    expect(solution.staticUnsatReasons).toEqual([]);
    expect(solution.unsupportedReasons).toEqual([]);
    expect(solution.solved, `${solution.termination}/${solution.exploredStates}`).toBe(true);
    expect(replay(level, solution.drags)).toBe(true);
  });

  it("preserves the six-piece Lv28 opening and fresh-solves with PuzzleModel replay", () => {
    const level = LEVELS[27]!;
    const closed = new Set(level.shutters?.filter(({ count }) => count > 0).map(({ id }) => id));
    const opening = level.blocks.filter((block) => !(block.shutterId && closed.has(block.shutterId)));
    expect(opening.map(({ id }) => id).sort()).toEqual(Array.from(
      { length: 6 },
      (_, index) => `cc-028-b1-${String(index + 1).padStart(2, "0")}`,
    ));
    const solution = solveLevelForValidation(level, 20_000);
    expect(solution.staticUnsatReasons).toEqual([]);
    expect(solution.unsupportedReasons).toEqual([]);
    expect(solution.solved, `${solution.termination}/${solution.exploredStates}`).toBe(true);
    expect(replay(level, solution.drags)).toBe(true);
  });
});
