// @ts-expect-error The app tsconfig intentionally excludes Node ambient types; Vitest still runs in Node.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LEVELS } from "../src/core/levels";

interface EvidenceEntry {
  level: { id: number };
  route: Array<{ blockId: string; exitSide?: string }>;
  assembly: {
    route_metrics: { actions: number; clear_load: number; reposition_overhead: number };
  };
}

interface Decision {
  level_id: string;
  target_reposition_overhead: number;
  witness_floor_met: boolean;
  strict_v5_floor_certified: boolean;
  strict_v5_certificates: Array<{ certified_lower_bound: number }>;
}

const REPORT = JSON.parse(readFileSync(new URL(
  "../playtest-results/experiments/competitor-composition-r141/assembled-expanded-density-candidates-v5.json",
  import.meta.url,
), "utf8")) as { levels: EvidenceEntry[]; decisions: Decision[] };

describe("campaign strategy choices", () => {
  for (const levelId of [13, 19, 26, 29, 40]) {
    it(`level ${levelId} has certified non-clear setup work before completion`, () => {
      const evidence = REPORT.levels[levelId - 1];
      const decision = REPORT.decisions[levelId - 1];
      const level = LEVELS[levelId - 1];
      expect(evidence.level.id).toBe(levelId);
      expect(decision.level_id).toBe(`Lv${String(levelId).padStart(3, "0")}`);
      expect(evidence.assembly.route_metrics.actions).toBe(evidence.route.length);
      expect(evidence.assembly.route_metrics.reposition_overhead)
        .toBe(evidence.assembly.route_metrics.actions - evidence.assembly.route_metrics.clear_load);
      expect(evidence.assembly.route_metrics.reposition_overhead)
        .toBeGreaterThanOrEqual(decision.target_reposition_overhead);
      expect(evidence.route.some((drag) => !drag.exitSide)).toBe(true);
      expect(new Set(evidence.route.map((drag) => drag.blockId)).size).toBeGreaterThan(1);
      expect(decision.witness_floor_met).toBe(true);
      expect(decision.strict_v5_floor_certified).toBe(true);
      expect(Math.max(...decision.strict_v5_certificates.map((certificate) => certificate.certified_lower_bound)))
        .toBeGreaterThanOrEqual(level.designTargets?.minimumRepositionOverhead ?? 0);
    });
  }
});
