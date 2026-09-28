import { describe, expect, it } from "vitest";
import { PuzzleModel, validateLevel } from "../src/core/PuzzleModel";
import { solveLevelForValidation } from "../src/core/levelSolver";
import { rect, shutterHasPhysicalFootprint, type LevelSpec } from "../src/core/types";

const fixture = (): LevelSpec => ({
  id: 978,
  name: "fixed staged frame fixture",
  difficulty: "normal",
  timeSeconds: 60,
  reward: 0,
  width: 4,
  height: 3,
  gates: [
    { id: "red-left", side: "left", offset: 0, size: 1, color: "red" },
    { id: "blue-top", side: "top", offset: 0, size: 1, color: "blue" },
    { id: "green-right", side: "right", offset: 1, size: 1, color: "green" },
    { id: "orange-left", side: "left", offset: 2, size: 1, color: "orange" },
    { id: "purple-top", side: "top", offset: 1, size: 1, color: "purple" },
  ],
  shutters: [{
    id: "fixed-frame",
    x: 0,
    y: 0,
    width: 4,
    height: 2,
    count: 2,
    skin: "staged-frame",
    triggerBlockIds: ["front-a", "front-b"],
  }],
  blocks: [
    { id: "front-a", x: 0, y: 0, shape: rect(1, 1), color: "red", layers: ["red", "blue"] },
    { id: "front-b", x: 3, y: 1, shape: rect(1, 1), color: "green" },
    { id: "bystander", x: 0, y: 2, shape: rect(1, 1), color: "orange" },
    { id: "hidden", x: 1, y: 0, shape: rect(1, 1), color: "purple", shutterId: "fixed-frame" },
  ],
});

describe("fixed staged-frame semantics", () => {
  it("keeps its identity and reveals only after every framed body is removed", () => {
    const level = fixture();
    const frame = level.shutters![0];
    expect(frame.skin).toBe("staged-frame");
    expect(shutterHasPhysicalFootprint(frame)).toBe(false);

    const model = new PuzzleModel(level);
    expect(model.isBlockActive(model.getBlock("hidden")!)).toBe(false);
    expect(model.thawAll(99)).toBe(false);
    expect(model.snapshot().shutters[0].count).toBe(2);

    model.beginAction();
    expect(model.moveBlockStep("front-b", 2, 1)).toBe(true);
    expect(model.commitAction()).toBe(true);
    expect(model.snapshot().shutters[0].count).toBe(2);

    expect(model.tryExit("bystander", "left")).toMatchObject({ ok: true });
    expect(model.snapshot().shutters[0].count).toBe(2);

    expect(model.tryExit("front-a", "left")).toMatchObject({ ok: true, layerRemoved: true });
    expect(model.snapshot().shutters[0].count).toBe(2);
    expect(model.tryExit("front-a", "top")).toMatchObject({ ok: true, complete: false });
    expect(model.snapshot().shutters[0].count).toBe(1);
    expect(model.isBlockActive(model.getBlock("hidden")!)).toBe(false);

    model.beginAction();
    expect(model.moveBlockStep("front-b", 3, 1)).toBe(true);
    expect(model.commitAction()).toBe(true);
    expect(model.tryExit("front-b", "right")).toMatchObject({ ok: true });
    expect(model.snapshot().shutters[0].count).toBe(0);
    expect(model.isBlockActive(model.getBlock("hidden")!)).toBe(true);
  });

  it("requires an exact opening-visible cohort contained by the frame", () => {
    const missingCohort = fixture();
    delete missingCohort.shutters![0].triggerBlockIds;
    expect(() => validateLevel(missingCohort)).toThrow(/requires an exact trigger block cohort/);

    const emptyCohort = fixture();
    emptyCohort.shutters![0].count = 0;
    emptyCohort.shutters![0].triggerBlockIds = [];
    expect(() => validateLevel(emptyCohort)).toThrow(/trigger block cohort cannot be empty/);

    const lift = fixture();
    lift.shutters![0].skin = "lift";
    delete lift.shutters![0].triggerBlockIds;
    expect(() => validateLevel(lift)).toThrow(/requires an exact trigger block cohort/);

    const wrongCount = fixture();
    wrongCount.shutters![0].count = 1;
    expect(() => validateLevel(wrongCount)).toThrow(/count must equal its trigger block cohort/);

    const hiddenTrigger = fixture();
    hiddenTrigger.shutters![0].triggerBlockIds = ["front-a", "hidden"];
    expect(() => validateLevel(hiddenTrigger)).toThrow(/trigger block hidden must be opening-visible/);

    const outsideTrigger = fixture();
    outsideTrigger.shutters![0].width = 3;
    expect(() => validateLevel(outsideTrigger)).toThrow(/does not contain trigger block front-b/);
  });

  it("keeps solver release timing in parity with PuzzleModel", () => {
    const level = fixture();
    const solution = solveLevelForValidation(level, 10_000);
    expect(solution.solved).toBe(true);
    expect(solution.drags.some((drag) => drag.blockId === "hidden")).toBe(true);

    const model = new PuzzleModel(level);
    for (const drag of solution.drags) {
      model.beginAction();
      for (const [x, y] of drag.path) expect(model.moveBlockStep(drag.blockId, x, y)).toBe(true);
      if (drag.exitSide) expect(model.tryExit(drag.blockId, drag.exitSide)).toMatchObject({ ok: true });
      expect(model.commitAction()).toBe(true);
    }
    expect(model.snapshot().complete).toBe(true);
  });
});
