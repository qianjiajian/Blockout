// @ts-expect-error Node fixture IO is outside the browser tsconfig.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LEVELS, LEVELS_BEFORE_LEVEL72_REPAIR, LEVELS_BEFORE_LEVEL66_LATE_LIFT_REPAIR, LEVELS_BEFORE_LEVEL9_ORIGINAL_REMAKE } from "../src/core/levels";
import { applyLevel66LateLiftRepair } from "../src/core/level66LateLiftRepair";
import { PuzzleModel, validateLevel } from "../src/core/PuzzleModel";
import { replayRevisedRoute, type RevisedSearchDrag } from "../src/core/revisedLevelSearch";
import { matchFormalBlockShape } from "../src/game/formalBlockShapes";
import { levelStarTargets } from "../src/core/levelStarConditions";

const fixture = JSON.parse(readFileSync(new URL("./fixtures/level66-late-lift-v176.json", import.meta.url), "utf8")) as {
  ruleVersion: string;
  oldDeadlockRoute: RevisedSearchDrag[];
  scenarios: {name: string; prefix: RevisedSearchDrag[]; route: RevisedSearchDrag[]}[];
};
const before = LEVELS_BEFORE_LEVEL72_REPAIR.find((level) => level.id === 66)!;
const after = applyLevel66LateLiftRepair(before);
const liftId = "v146-66-lift2";
const replayOnModel = (level: typeof before, drags: RevisedSearchDrag[]) => {
  const model = new PuzzleModel(level);
  model.startCountdown();
  for (const drag of drags) {
    model.beginAction();
    for (const [x, y] of drag.path) expect(model.moveBlockStep(drag.blockId, x, y)).toBe(true);
    if (drag.exitSide) expect(model.tryExit(drag.blockId, drag.exitSide).ok).toBe(true);
    expect(model.commitAction()).toBe(true);
  }
  return model;
};

describe("Lv66 late lift revelation deadlock repair", () => {
  it("adopts the verified layout and preserves the other 199 final objects", () => {
    expect(LEVELS).toHaveLength(200);
    expect(LEVELS.find((level) => level.id === 66)).toEqual(after);
    for (const [index, level] of LEVELS_BEFORE_LEVEL66_LATE_LIFT_REPAIR.entries()) {
      if (level.id !== 66) expect(LEVELS_BEFORE_LEVEL9_ORIGINAL_REMAKE[index]).toBe(level);
    }
  });

  it("changes only the hidden 15-cell cargo and preserves source objects", () => {
    const original = JSON.stringify(before);
    expect(fixture.ruleVersion).toBe("1.76.0");
    expect(() => validateLevel(after)).not.toThrow();
    expect({ ...after, blocks: undefined }).toEqual({ ...before, blocks: undefined });
    expect(after.blocks.filter((b) => !b.shutterId)).toEqual(before.blocks.filter((b) => !b.shutterId));
    expect(levelStarTargets(after)).toEqual(levelStarTargets(before));
    expect(after.blocks).toHaveLength(before.blocks.length + 1);
    for (const old of before.blocks) {
      const current = after.blocks.find((b) => b.id === old.id)!;
      expect(current.color).toBe(old.color);
      expect(current.frozen).toBe(old.frozen);
      expect(current.layers).toEqual(old.layers);
      if (!old.shutterId) expect(current).toBe(old);
    }
    expect(JSON.stringify(before)).toBe(original);
    for (const level of LEVELS_BEFORE_LEVEL72_REPAIR) {
      if (level.id !== 66) expect(applyLevel66LateLiftRepair(level)).toBe(level);
    }
  });

  it("fills the original lift once with native whole shapes and keeps both ice-5 bodies", () => {
    const hidden = after.blocks.filter((b) => b.shutterId === liftId);
    const cells = hidden.flatMap((b) => b.shape.map(([x, y]) => [b.x + x, b.y + y] as const));
    expect(cells).toHaveLength(15);
    expect(new Set(cells.map((p) => p.join(","))).size).toBe(15);
    expect(cells.every(([x, y]) => x >= 0 && x < 5 && y >= 0 && y < 3)).toBe(true);
    expect(hidden.filter((b) => b.frozen).map((b) => b.frozen)).toEqual([5, 5]);
    for (const block of hidden) expect(matchFormalBlockShape(block.shape, "native-only")?.quarterTurns).toBe(0);
    const unfrozenEvents = hidden.filter((b) => !b.frozen).reduce((sum, b) => sum + (b.layers?.length ?? 1), 0);
    expect(unfrozenEvents).toBe(5);
  });

  it("retains the old-map screenshot deadlock as a negative regression", () => {
    const model = replayOnModel(before, fixture.oldDeadlockRoute);
    const state = model.snapshot();
    expect(state.complete).toBe(false);
    expect(state.blocks.map((b) => [b.id, b.x, b.y, b.frozen])).toEqual([
      ["v146-66-lift2-0", 0, 0, 0],
      ["v146-66-lift2-3", 1, 0, 1],
      ["v146-66-lift2-2", 0, 1, 1],
    ]);
    for (const block of state.blocks) {
      for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
        expect(model.clone().moveBlockStep(block.id, block.x + dx!, block.y + dy!)).toBe(false);
      }
      for (const side of ["top", "right", "bottom", "left"] as const) {
        expect(model.clone().tryExit(block.id, side).ok).toBe(false);
      }
    }
  });

  for (const scenario of fixture.scenarios) {
    it(`completes the repaired map after ${scenario.name}`, () => {
      expect(replayRevisedRoute(after, scenario.prefix).valid).toBe(true);
      const replay = replayRevisedRoute(after, scenario.route);
      expect(replay).toMatchObject({ valid: true, complete: true, clearEvents: 27 });
      expect(replay.nonClearingDrags).toBeLessThanOrEqual(15);
    });
  }

  it("can thaw both ice-5 blocks using only hidden cargo after the last external body leaves", () => {
    const scenario = fixture.scenarios.find((s) => s.name === "latest-reveal-zero-exterior")!;
    const revealed = replayOnModel(after, scenario.prefix).snapshot();
    expect(revealed.shutters[0]?.revealed).toBe(true);
    expect(revealed.blocks).toHaveLength(6);
    expect(revealed.blocks.every((b) => b.shutterId === liftId)).toBe(true);
    expect(revealed.blocks.filter((b) => b.frozen).map((b) => b.frozen)).toEqual([5, 5]);
    const complete = replayOnModel(after, scenario.route).snapshot();
    expect(complete.complete).toBe(true);
    expect(complete.blocks).toEqual([]);
  });
});
