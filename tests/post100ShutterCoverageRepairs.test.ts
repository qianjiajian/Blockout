import { describe, expect, it } from "vitest";
import { PuzzleModel } from "../src/core/PuzzleModel";
import { getLevel } from "../src/core/levels";
import { solveLevelForValidation } from "../src/core/levelSolver";
import {
  POST_100_SHUTTER_COVERAGE_REPAIR_LEVEL_IDS,
  POST_100_SHUTTER_COVERAGE_REPAIR_VERSION,
} from "../src/core/post100ShutterCoverageRepairs";
import { auditOrdinaryShutterCoverage } from "../src/core/shutterCoverage";

describe(`post-100 shutter coverage ${POST_100_SHUTTER_COVERAGE_REPAIR_VERSION}`, () => {
  it("keeps its repair scope explicit", () => {
    expect(POST_100_SHUTTER_COVERAGE_REPAIR_LEVEL_IDS).toEqual([103, 105, 112]);
  });

  it.each(POST_100_SHUTTER_COVERAGE_REPAIR_LEVEL_IDS)(
    "aligns Lv%i display, reservation and hidden cohorts",
    (levelId) => {
      expect(auditOrdinaryShutterCoverage(getLevel(levelId))
        .filter(({ kind }) => kind !== "missing-hidden-cohort")).toEqual([]);
    },
  );

  it.each(POST_100_SHUTTER_COVERAGE_REPAIR_LEVEL_IDS)(
    "keeps Lv%i solver-complete and replayable",
    (levelId) => {
      const level = getLevel(levelId);
      const result = solveLevelForValidation(level, 20_000);
      expect(result.solved, JSON.stringify(result.staticUnsatReasons)).toBe(true);

      const model = new PuzzleModel(level);
      for (const drag of result.drags) {
        model.beginAction();
        for (const [x, y] of drag.path) expect(model.moveBlockStep(drag.blockId, x, y)).toBe(true);
        if (drag.exitSide) expect(model.tryExit(drag.blockId, drag.exitSide).ok).toBe(true);
        expect(model.commitAction()).toBe(true);
      }
      expect(model.snapshot()).toMatchObject({ complete: true, blocks: [], queuedBlocks: [] });
    },
    30_000,
  );
});
