import { describe, expect, it } from "vitest";
import { LEVELS } from "../src/core/levels";
import { openingStrategyMetrics } from "../src/core/levelStrategyMetrics";

const VIDEO_PARITY_LEVELS_1_TO_100 = LEVELS.slice(0, 100);

const clearLoad = (level: (typeof LEVELS)[number]): number => level.blocks
  .reduce((sum, block) => sum + (block.layers?.length ?? 1), 0);

describe("opening spatial strategy metrics", () => {
  it("keeps all opening metrics internally consistent", () => {
    for (const level of VIDEO_PARITY_LEVELS_1_TO_100) {
      const metrics = openingStrategyMetrics(level);
      expect(metrics.active, `Lv${level.id} active blocks`).toBeGreaterThan(0);
      expect(metrics.actionable, `Lv${level.id} actionable blocks`).toBeLessThanOrEqual(metrics.active);
      expect(metrics.directClearable, `Lv${level.id} direct clears`).toBeLessThanOrEqual(metrics.actionable);
      expect(metrics.forcedRepositions, `Lv${level.id} forced reposition candidates`)
        .toBe(metrics.actionable - metrics.directClearable);
      expect(metrics.oneStepMovable, `Lv${level.id} one-step movable`).toBeLessThanOrEqual(metrics.actionable);
      expect(metrics.distinctBlockedTargets, `Lv${level.id} blocked targets`)
        .toBeLessThanOrEqual(metrics.forcedRepositions);
    }
  });

  it("records the locked tutorial opening, certified route floors, and video-chapter reposition pressure", () => {
    expect(openingStrategyMetrics(LEVELS[0])).toMatchObject({
      active: 3,
      actionable: 3,
      directClearable: 3,
      forcedRepositions: 0,
      matchingEdgeStarts: 1,
      oneStepMovable: 2,
      contacts: 2,
    });
    for (const level of VIDEO_PARITY_LEVELS_1_TO_100.slice(10)) {
      const floor = level.designTargets?.minimumRepositionOverhead;
      if (level.id >= 31 && level.id <= 40 && floor === null) {
        expect(level.parMoves, `Lv${level.id} uncertified video route`).toBeUndefined();
        expect(openingStrategyMetrics(level).forcedRepositions, `Lv${level.id} necessary opening repositions`)
          .toBeGreaterThanOrEqual(1);
        continue;
      }
      expect(floor, `Lv${level.id} strategy floor`).toBeGreaterThanOrEqual(5);
      expect((level.parMoves ?? 0) - clearLoad(level), `Lv${level.id} witness overhead`)
        .toBeGreaterThanOrEqual(floor ?? 0);
    }
  });

  it("keeps high-pressure samples dense while retaining an actionable opening", () => {
    const sample = [19, 20, 39, 49, 58, 68, 78, 88, 98, 100];
    for (const id of sample) {
      const metrics = openingStrategyMetrics(LEVELS[id - 1]);
      expect(metrics.active, `Lv${id} active blocks`).toBeGreaterThanOrEqual(8);
      expect(
        metrics.oneStepMovable + metrics.directClearable,
        `Lv${id} movable or directly clearable opening`,
      ).toBeGreaterThanOrEqual(1);
      expect(metrics.contacts, `Lv${id} shared-space contacts`).toBeGreaterThanOrEqual(5);
      expect(metrics.directClearable, `Lv${id} opening is not entirely free`).toBeLessThan(metrics.active);
    }
  });
});
