// @ts-expect-error The app tsconfig intentionally excludes Node ambient types; Vitest still runs in Node.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { openingStrategyMetrics } from "../src/core/levelStrategyMetrics";
import { LEVELS } from "../src/core/levels";

interface LevelEvidence {
  level: { id: number; blocks: unknown[]; playable: unknown[] };
  assembly: {
    route_metrics: { actions: number; clear_load: number; reposition_overhead: number };
  };
}

interface Decision {
  target_reposition_overhead: number;
  witness_floor_met: boolean;
  strict_v5_floor_certified: boolean;
  strict_v5_certificates: Array<{ certified_lower_bound: number }>;
}

const REPORT = JSON.parse(readFileSync(new URL(
  "../playtest-results/experiments/competitor-composition-r141/assembled-expanded-density-candidates-v5.json",
  import.meta.url,
), "utf8")) as { levels: LevelEvidence[]; decisions: Decision[] };

describe("level 98 opening readability", () => {
  it("keeps the formal high-density structure and certified solve budget", () => {
    const level = LEVELS[97];
    const evidence = REPORT.levels[97];
    const decision = REPORT.decisions[97];
    expect(level).toMatchObject({
      id: 98,
      difficulty: "super",
      timeSeconds: 120,
      parMoves: 58,
      designTargets: { calibratedDifficulty: 92, minimumRepositionOverhead: 17 },
    });
    expect(level.blocks).toHaveLength(41);
    expect(level.playable).toHaveLength(88);
    expect(evidence.assembly.route_metrics).toEqual({
      actions: 58,
      clear_load: 41,
      reposition_overhead: 17,
    });
    expect(decision.target_reposition_overhead).toBe(17);
    expect(decision.witness_floor_met).toBe(true);
    expect(decision.strict_v5_floor_certified).toBe(true);
    expect(Math.max(...decision.strict_v5_certificates.map((certificate) => certificate.certified_lower_bound)))
      .toBeGreaterThanOrEqual(17);
  });

  it("opens densely with local movement while carrying no stale legacy hint IDs", () => {
    const level = LEVELS[97];
    const metrics = openingStrategyMetrics(level);
    expect(metrics.active).toBeGreaterThanOrEqual(8);
    expect(metrics.contacts).toBeGreaterThanOrEqual(5);
    expect(metrics.oneStepMovable).toBeGreaterThanOrEqual(2);
    expect(metrics.directClearable).toBeLessThan(metrics.active);
    expect(level.strategyFocus).toBeUndefined();
    expect(level.strategyNudge).toBeUndefined();
  });
});
