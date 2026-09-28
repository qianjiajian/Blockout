// Historical failed/diagnostic search, intentionally excluded from production regression tests.
import { describe, it } from "vitest";
import { solveLevelForValidation, solveLevelOptimally } from "../../src/core/levelSolver";
import { LEVELS } from "../../src/core/levels";
const base = LEVELS.find((entry) => entry.id === 20)!;
const colors = ["red", "red", "yellow", "yellow", "blue", "pink"] as const;
const permutations: string[][] = [];
const gen = (p: string[], r: string[]) => { if (!r.length) { permutations.push(p); return; } for (let i = 0; i < r.length; i += 1) { if (i && r[i] === r[i - 1]) continue; gen([...p, r[i]], [...r.slice(0, i), ...r.slice(i + 1)]); } };
gen([], [...colors].sort());
const candidateFor = (v3x: 0 | 2 | 4, assignment: string[]) => {
  const h2x = v3x === 0 ? [1, 3] : v3x === 2 ? [0, 3] : [0, 2];
  return {
    ...base,
    gates: base.gates.map((gate) => ({ ...gate, offset: ({ "lv020-original-right-pink-7": 0, "lv020-original-right-pink-1": 3, "lv020-original-left-red-10": 4, "lv020-original-left-red-3": 3 } as Record<string, number>)[gate.id] ?? gate.offset })),
    blocks: base.blocks.map((block, index) => {
      if (index < 6) { const row = Math.floor(index / 2) + 3; const x = h2x[index % 2]; return { ...block, x, y: row, color: assignment[index], layers: [assignment[index]], shape: block.shape.map(([dx, dy]) => [dx, dy] as [number, number]) }; }
      if (index === 6) return { ...block, x: v3x, y: 3, shape: block.shape.map(([dx, dy]) => [dx, dy] as [number, number]) };
      return { ...block, shape: block.shape.map(([dx, dy]) => [dx, dy] as [number, number]) };
    }),
  };
};
describe("Lv20 grid search", () => it("finds overhead", () => {
  let max = { v3x: -1, assignment: [] as string[], overhead: -1 };
  for (const v3x of [0, 2, 4] as const) for (const assignment of permutations) {
    const c = candidateFor(v3x, assignment); const p = solveLevelForValidation(c, 5000);
    if (p.solved && p.repositionOverhead > max.overhead) { max = { v3x, assignment, overhead: p.repositionOverhead }; console.log("GRID_MAX", JSON.stringify(max)); }
    if (!p.solved || p.repositionOverhead < 5 || p.repositionOverhead > 10) continue;
    const o = solveLevelOptimally(c, 100_000); console.log("GRID_FOUND", JSON.stringify({ v3x, assignment, p: { minimumDrags: p.minimumDrags, repositionOverhead: p.repositionOverhead }, o: { solved: o.solved, termination: o.termination, exploredStates: o.exploredStates, minimumDrags: o.minimumDrags, repositionOverhead: o.repositionOverhead, drags: o.drags } })); return;
  }
  throw new Error(`no grid candidate; max=${JSON.stringify(max)}`);
}), 120_000);
