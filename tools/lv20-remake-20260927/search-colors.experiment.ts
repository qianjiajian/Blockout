// Historical failed/diagnostic search, intentionally excluded from production regression tests.
import { describe, it } from "vitest";
import { solveLevelForValidation, solveLevelOptimally } from "../../src/core/levelSolver";
import { LEVELS } from "../../src/core/levels";

const base = LEVELS.find((entry) => entry.id === 20)!;
const colors = ["red", "red", "yellow", "yellow", "blue", "pink"] as const;
const permutations: string[][] = [];
const generate = (prefix: string[], rest: string[]) => {
  if (!rest.length) { permutations.push(prefix); return; }
  for (let index = 0; index < rest.length; index += 1) {
    if (index > 0 && rest[index] === rest[index - 1]) continue;
    generate([...prefix, rest[index]], [...rest.slice(0, index), ...rest.slice(index + 1)]);
  }
};
generate([], [...colors].sort());

const candidateFor = (assignment: string[]) => ({
  ...base,
  gates: base.gates.map((gate) => {
    const offsets: Record<string, number> = {
      "lv020-original-right-pink-7": 0,
      "lv020-original-right-pink-1": 3,
      "lv020-original-left-red-10": 4,
      "lv020-original-left-red-3": 3,
    };
    return { ...gate, offset: offsets[gate.id] ?? gate.offset };
  }),
  blocks: base.blocks.map((block, index) => {
    if (index < 6) return { ...block, color: assignment[index], layers: [assignment[index]], shape: block.shape.map(([x, y]) => [x, y] as [number, number]) };
    return { ...block, shape: block.shape.map(([x, y]) => [x, y] as [number, number]) };
  }),
});

describe("Lv20 color arrangement search", () => {
  it("finds a simple-band candidate", () => {
    for (const assignment of permutations) {
      const candidate = candidateFor(assignment);
      const proof = solveLevelForValidation(candidate, 10_000);
      if (!proof.solved || proof.repositionOverhead < 5 || proof.repositionOverhead > 10) continue;
      const optimal = solveLevelOptimally(candidate, 100_000);
      console.log("COLOR_FOUND", JSON.stringify({ assignment, validation: { minimumDrags: proof.minimumDrags, repositionOverhead: proof.repositionOverhead, exploredStates: proof.exploredStates }, optimal: { solved: optimal.solved, termination: optimal.termination, minimumDrags: optimal.minimumDrags, repositionOverhead: optimal.repositionOverhead, exploredStates: optimal.exploredStates, drags: optimal.drags } }));
      return;
    }
    throw new Error(`no candidate among ${permutations.length}`);
  }, 120_000);
});
