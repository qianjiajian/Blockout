// Historical failed/diagnostic search, intentionally excluded from production regression tests.
import { describe, it } from "vitest";
import { solveLevelForValidation, solveLevelOptimally } from "../../src/core/levelSolver";
import { LEVELS } from "../../src/core/levels";
const base = LEVELS.find((entry) => entry.id === 20)!;
const candidate = {
  ...base,
  gates: base.gates.map((gate) => ({ ...gate, offset: ({
    "lv020-original-right-pink-7": 0,
    "lv020-original-right-pink-1": 3,
    "lv020-original-left-red-10": 4,
    "lv020-original-left-red-3": 3,
  } as Record<string, number>)[gate.id] ?? gate.offset })),
  blocks: base.blocks.map((block, index) => {
    if (index < 7) {
      const positions: Array<[number, number]> = [[1, 3], [3, 3], [1, 4], [3, 4], [1, 5], [3, 5], [0, 3]];
      const colors = ["red", "pink", "red", "yellow", "blue", "yellow", "green"];
      return { ...block, x: positions[index][0], y: positions[index][1], color: colors[index], layers: [colors[index]], shape: block.shape.map(([x, y]) => [x, y] as [number, number]) };
    }
    return { ...block, shape: block.shape.map(([x, y]) => [x, y] as [number, number]) };
  }),
};
describe("v3 x0", () => it("probes", () => {
  const v = solveLevelForValidation(candidate, 200_000);
  const o = solveLevelOptimally(candidate, 200_000);
  console.log("V3X0", JSON.stringify({ v: { solved: v.solved, termination: v.termination, exploredStates: v.exploredStates, minimumDrags: v.minimumDrags, repositionOverhead: v.repositionOverhead }, o: { solved: o.solved, termination: o.termination, exploredStates: o.exploredStates, minimumDrags: o.minimumDrags, repositionOverhead: o.repositionOverhead, drags: o.drags } }));
}));
