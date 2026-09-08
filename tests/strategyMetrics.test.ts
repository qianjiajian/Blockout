import { describe, expect, it } from "vitest";
import { LEVELS } from "../src/core/levels";
import { openingStrategyMetrics } from "../src/core/levelStrategyMetrics";

describe("opening spatial strategy metrics", () => {
  it("keeps free clears limited to the tutorial and two chapter-one parity layouts", () => {
    const allowedDirectClears = new Map([[1, 2], [7, 1], [9, 1]]);
    const offenders = LEVELS
      .map((level) => ({ id: level.id, metrics: openingStrategyMetrics(level) }))
      .filter(({ id, metrics }) => (
        metrics.matchingEdgeStarts > 0
        || (metrics.directClearable > 0 && !allowedDirectClears.has(id))
      ))
      .map(({ id, metrics }) => ({ id, direct: metrics.directClearable, edge: metrics.matchingEdgeStarts }));
    expect(offenders).toEqual([]);
    for (const [id, directClears] of allowedDirectClears) {
      const metrics = openingStrategyMetrics(LEVELS[id - 1]);
      expect(metrics.directClearable, `Lv${id} direct clear count`).toBe(directClears);
      if (id > 1) expect(LEVELS[id - 1].parMoves, `Lv${id} validated work`).toBeGreaterThanOrEqual(12);
    }
  });

  it("applies the level-three opening floor while respecting locked mechanic intros", () => {
    const tutorial = openingStrategyMetrics(LEVELS[0]);
    expect(tutorial).toMatchObject({
      active: 2,
      actionable: 2,
      directClearable: 2,
      forcedRepositions: 0,
      matchingEdgeStarts: 0,
      oneStepMovable: 2,
      contacts: 0,
    });

    const failures = LEVELS.slice(1).map((level) => {
      const metrics = openingStrategyMetrics(level);
      return {
        id: level.id,
        active: metrics.active,
        forced: metrics.forcedRepositions,
        forcedTarget: Math.min(3, metrics.actionable),
        movable: metrics.oneStepMovable,
        movableTarget: Math.min(2, metrics.actionable),
        contacts: metrics.contacts,
        contactTarget: Math.min(3, Math.max(0, metrics.active - 1)),
      };
    }).filter((entry) => (
      entry.active < 4
      || entry.forced < entry.forcedTarget
      || entry.movable < entry.movableTarget
      || entry.contacts < entry.contactTarget
    ));
    expect(failures).toEqual([]);
  });

  it("keeps high-pressure samples dense while still offering a legal first move", () => {
    const sample = [19, 20, 39, 49, 58, 68, 78, 88, 98, 100];
    for (const id of sample) {
      const metrics = openingStrategyMetrics(LEVELS[id - 1]);
      expect(metrics.active, `Lv${id} active blocks`).toBeGreaterThanOrEqual(8);
      expect(metrics.oneStepMovable, `Lv${id} movable opening`).toBeGreaterThanOrEqual(3);
      expect(metrics.contacts, `Lv${id} shared-space contacts`).toBeGreaterThanOrEqual(5);
      expect(metrics.directClearable, `Lv${id} free clears`).toBe(0);
    }
  });
});
