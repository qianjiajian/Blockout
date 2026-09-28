// Historical failed/diagnostic search, intentionally excluded from production regression tests.
import { describe, it } from "vitest";
import { solveLevelForValidation, solveLevelOptimally } from "../../src/core/levelSolver";
import { LEVELS_BEFORE_LEVEL20_ORIGINAL_REMAKE } from "../../src/core/levels";
const old = LEVELS_BEFORE_LEVEL20_ORIGINAL_REMAKE.find((entry) => entry.id === 20)!;
const candidate = {
  ...old,
  gates: old.gates.map((gate) => gate.frozen === 2 ? { ...gate, color: "blue" } : gate.frozen === 3 || gate.frozen === 6 || gate.frozen === 10 ? { ...gate, color: "red" } : gate.frozen === 8 ? { ...gate, color: "green" } : gate.frozen === 1 || gate.frozen === 7 ? { ...gate, color: "pink" } : { ...gate }),
};
describe("Lv20 old source gate probe", () => it("probes", () => {
  const p = solveLevelForValidation(candidate, 100_000);
  const o = solveLevelOptimally(candidate, 100_000);
  console.log("OLD_SOURCE", JSON.stringify({ validation: { solved: p.solved, termination: p.termination, exploredStates: p.exploredStates, minimumDrags: p.minimumDrags, repositionOverhead: p.repositionOverhead }, optimal: { solved: o.solved, termination: o.termination, exploredStates: o.exploredStates, minimumDrags: o.minimumDrags, repositionOverhead: o.repositionOverhead } }));
  expect(true).toBe(true);
}));
