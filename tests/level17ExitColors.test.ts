import { describe, expect, it } from "vitest";
import { LEVELS } from "../src/core/levels";

describe("Lv17 exit color contract", () => {
  it("keeps one logical exit per color and treats the yellow rail as one gate", () => {
    const level = LEVELS.find((candidate) => candidate.id === 17);
    expect(level).toBeDefined();
    const gates = level!.gates;
    expect(new Set(gates.map((gate) => gate.color)).size).toBe(gates.length);
    expect(gates.find((gate) => (
      gate.side === "bottom"
      && gate.offset === 0
      && gate.size === 6
      && gate.color === "yellow"
    ))).toBeDefined();
  });
});
