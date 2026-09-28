// Historical failed/diagnostic search, intentionally excluded from production regression tests.
import { describe, it } from "vitest";
import { solveLevelForValidation, solveLevelOptimally } from "../../src/core/levelSolver";
import { LEVELS } from "../../src/core/levels";
const base = LEVELS.find((entry) => entry.id === 20)!;
const masks = [
  ["#####", "#####", "#####", "..#..", "..#..", "#####", "#####", "#####"],
  ["#####", "#####", "#####", ".#...", ".#...", "#####", "#####", "#####"],
  ["#####", "#####", "#####", "...#.", "...#.", "#####", "#####", "#####"],
  ["#####", "#####", "#####", ".##..", ".##..", "#####", "#####", "####."],
  ["#####", "#####", "#####", "..##.", "..##.", "#####", "#####", ".####"],
];
const candidateFor = (mask: string[]) => ({
  ...base,
  height: 8,
  playable: mask.flatMap((row, y) => [...row].flatMap((cell, x) => cell === "#" ? [[x, y] as [number, number]] : [])),
  gates: base.gates.map((gate) => {
    const updates: Record<string, number> = {
      "lv020-original-right-pink-7": 0,
      "lv020-original-right-pink-1": 6,
      "lv020-original-left-red-10": 2,
      "lv020-original-left-red-3": 5,
    };
    return { ...gate, offset: updates[gate.id] ?? gate.offset };
  }),
  blocks: base.blocks.map((block) => ({
    ...block,
    y: block.shutterId ? block.y : block.y + 2,
    shape: block.shape.map(([x, y]) => [x, y] as [number, number]),
  })),
});
describe("Lv20 mask search", () => {
  it("probes source-compatible shifted outlines", () => {
    for (const mask of masks) {
      const candidate = candidateFor(mask);
      const proof = solveLevelForValidation(candidate, 100_000);
      console.log("MASK", JSON.stringify({ mask, solved: proof.solved, termination: proof.termination, exploredStates: proof.exploredStates, minimumDrags: proof.minimumDrags, repositionOverhead: proof.repositionOverhead }));
      if (!proof.solved || proof.repositionOverhead < 5 || proof.repositionOverhead > 10) continue;
      const optimal = solveLevelOptimally(candidate, 500_000);
      console.log("MASK_FOUND", JSON.stringify({ mask, optimal: { solved: optimal.solved, termination: optimal.termination, exploredStates: optimal.exploredStates, minimumDrags: optimal.minimumDrags, repositionOverhead: optimal.repositionOverhead, drags: optimal.drags } }));
      return;
    }
    throw new Error("no shifted mask in band");
  }, 120_000);
});
