// Historical failed/diagnostic search, intentionally excluded from production regression tests.
import { describe, it } from "vitest";
import { solveLevelForValidation, solveLevelOptimally } from "../../src/core/levelSolver";
import { LEVELS } from "../../src/core/levels";
const base = LEVELS.find((entry) => entry.id === 20)!;
const candidateFor = (offsets: number[]) => ({
  ...base,
  height: 7,
  playable: Array.from({ length: 7 }, (_, y) => Array.from({ length: 5 }, (_, x) => [x, y] as [number, number])).flat(),
  gates: base.gates.map((gate) => { const i = ["lv020-original-right-pink-7", "lv020-original-right-pink-1", "lv020-original-left-red-10", "lv020-original-left-red-3"].indexOf(gate.id); return { ...gate, offset: i >= 0 ? offsets[i] : gate.offset }; }),
  blocks: base.blocks.map((block) => ({ ...block, shape: block.shape.map(([x, y]) => [x, y] as [number, number]) })),
});
describe("height7 search", () => it("finds overhead", () => {
  let checked = 0;
  for (let a = 0; a < 7; a += 1) for (let b = 0; b < 7; b += 1) for (let c = 0; c < 7; c += 1) for (let d = 0; d < 7; d += 1) {
    const p = solveLevelForValidation(candidateFor([a, b, c, d]), 10_000); checked += 1;
    if (!p.solved || p.repositionOverhead < 5 || p.repositionOverhead > 10) continue;
    const o = solveLevelOptimally(candidateFor([a, b, c, d]), 100_000);
    console.log("H7_FOUND", JSON.stringify({ offsets: [a, b, c, d], p: { minimumDrags: p.minimumDrags, repositionOverhead: p.repositionOverhead, exploredStates: p.exploredStates }, o: { solved: o.solved, termination: o.termination, minimumDrags: o.minimumDrags, repositionOverhead: o.repositionOverhead, exploredStates: o.exploredStates, drags: o.drags } })); return;
  }
  throw new Error(`no candidate after ${checked}`);
}), 120_000);
