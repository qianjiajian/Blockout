import { describe, expect, it } from "vitest";
import { solveLevelForValidation, solveLevelOptimally } from "../src/core/levelSolver";
import { PuzzleModel } from "../src/core/PuzzleModel";
import type { LevelSpec } from "../src/core/types";

const trivial = (): LevelSpec => ({
  id: 99020, name: "profile boundary", width: 2, height: 2,
  difficulty: "normal", timeSeconds: 60, reward: 0,
  blocks: [{ id: "one", x: 0, y: 0, shape: [[0, 0]], color: "red" }],
  gates: [{ id: "exit", side: "left", offset: 0, size: 1, color: "red" }],
});

describe("legacy solver cannot certify revised mechanics", () => {
  it("also refuses unknown serialized profiles at runtime instead of silently playing legacy rules", () => {
    const future = JSON.parse(JSON.stringify({ ...trivial(), mechanismRules: "revised-future" })) as LevelSpec;
    expect(() => new PuzzleModel(future)).toThrow("unsupported mechanismRules");
    expect(() => new PuzzleModel(trivial())).not.toThrow();
    expect(() => new PuzzleModel({ ...trivial(), mechanismRules: "revised-2026-09-21-v1.1" })).not.toThrow();
    expect(() => new PuzzleModel({ ...trivial(), mechanismRules: "revised-2026-09-21-v1.2" })).not.toThrow();
  });
  for (const [name, solve] of [["validation", solveLevelForValidation], ["optimal", solveLevelOptimally]] as const) {
    it(`${name}: retains a legacy completion but refuses an identical revised fixture`, () => {
      expect(solve(trivial(), 20).solved).toBe(true);
      for (const mechanismRules of ["revised-2026-09-21", "revised-2026-09-21-v1.1", "revised-2026-09-21-v1.2"] as const) {
        const result = solve({ ...trivial(), mechanismRules }, 20);
        expect(result).toMatchObject({ solved: false, termination: "unsupported", exploredStates: 0, drags: [], staticUnsatReasons: [] });
        expect(result.unsupportedReasons.join(" ")).toContain("not qualified");
        expect(result.minimumDrags).toBe(Infinity);
        expect(result.repositionOverhead).toBe(Infinity);
      }
    });
    it(`${name}: does not silently fall back for a future serialized rules profile`, () => {
      const future = JSON.parse(JSON.stringify({ ...trivial(), mechanismRules: "revised-future" })) as LevelSpec;
      expect(solve(future).termination).toBe("unsupported");
    });
  }
});
