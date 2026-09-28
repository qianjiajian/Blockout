// Historical failed/diagnostic search, intentionally excluded from production regression tests.
import { describe, it } from "vitest";
import { solveLevelForValidation, solveLevelOptimally } from "../../src/core/levelSolver";
import { LEVELS } from "../../src/core/levels";

const base = LEVELS.find((entry) => entry.id === 20)!;
const clone = (offsets: number[]) => ({
  ...base,
  gates: base.gates.map((gate) => {
    const index = ["lv020-original-right-pink-7", "lv020-original-right-pink-1", "lv020-original-left-red-10", "lv020-original-left-red-3"].indexOf(gate.id);
    return index < 0 ? { ...gate } : { ...gate, offset: offsets[index] };
  }),
  blocks: base.blocks.map((block) => ({ ...block, shape: block.shape.map(([x, y]) => [x, y] as [number, number]) })),
});

describe("Lv20 layout search", () => {
  it("finds an easy-band candidate", () => {
    let checked = 0;
    for (let a = 0; a < 6; a += 1) for (let b = 0; b < 6; b += 1)
      for (let c = 0; c < 6; c += 1) for (let d = 0; d < 6; d += 1) {
        const candidate = clone([a, b, c, d]);
        const proof = solveLevelForValidation(candidate, 20_000);
        checked += 1;
        if (!proof.solved || proof.repositionOverhead < 5 || proof.repositionOverhead > 10) continue;
        const optimal = solveLevelOptimally(candidate, 100_000);
        console.log("FOUND", JSON.stringify({ offsets: [a, b, c, d], validation: proof, optimal: { solved: optimal.solved, termination: optimal.termination, exploredStates: optimal.exploredStates, minimumDrags: optimal.minimumDrags, repositionOverhead: optimal.repositionOverhead, drags: optimal.drags } }));
        return;
      }
    throw new Error(`no candidate after ${checked}`);
  }, 120_000);
});
