// Historical failed/diagnostic search, intentionally excluded from production regression tests.
import { describe, it } from "vitest";
import { solveLevelForValidation, solveLevelOptimally } from "../../src/core/levelSolver";
import { LEVELS } from "../../src/core/levels";
const base = LEVELS.find((entry) => entry.id === 20)!;
const candidate = { ...base, gates: base.gates.map((gate) => ({ ...gate, color: ({ 2: "red", 3: "blue", 6: "red", 7: "pink", 8: "green", 10: "blue", 1: "pink" } as Record<number, string>)[gate.frozen ?? -1] ?? gate.color, offset: ({ "lv020-original-right-pink-7": 0, "lv020-original-right-pink-1": 3, "lv020-original-left-red-10": 4, "lv020-original-left-red-3": 3 } as Record<string, number>)[gate.id] ?? gate.offset })) };
describe("old map rect", () => it("probes", () => { const v = solveLevelForValidation(candidate, 100_000); const o = solveLevelOptimally(candidate, 100_000); console.log("OMR", JSON.stringify({v:{solved:v.solved,termination:v.termination,exploredStates:v.exploredStates,repositionOverhead:v.repositionOverhead},o:{solved:o.solved,termination:o.termination,exploredStates:o.exploredStates,repositionOverhead:o.repositionOverhead,minimumDrags:o.minimumDrags,drags:o.drags}})); }));
