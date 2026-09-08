import { describe, expect, it } from "vitest";
import type { BlockState, GateState } from "../src/core/types";
import { availableGateTargets, gateIsAvailableTarget } from "../src/game/gateFocus";

const block = (overrides: Partial<BlockState> = {}): BlockState => ({
  id: "block",
  x: 0,
  y: 0,
  shape: [[0, 0]],
  color: "blue",
  layers: ["blue"],
  frozen: 0,
  ...overrides,
});

const gate = (overrides: Partial<GateState> = {}): GateState => ({
  id: "gate",
  side: "top",
  offset: 0,
  size: 1,
  color: "blue",
  frozen: 0,
  ...overrides,
});

describe("selected-block gate focus", () => {
  it("focuses only available gates matching the active layer color", () => {
    const selected = block({ color: "red", layers: ["blue", "red"] });
    const targets = availableGateTargets(selected, [
      gate({ id: "blue-top" }),
      gate({ id: "red-right", side: "right", color: "red" }),
      gate({ id: "blue-frozen", side: "bottom", frozen: 2 }),
    ]);
    expect(targets.map((target) => target.id)).toEqual(["blue-top"]);
  });

  it("requires star blocks to target star gates while ordinary blocks may use either", () => {
    const ordinaryGate = gate({ id: "ordinary" });
    const starGate = gate({ id: "star", star: true });
    expect(gateIsAvailableTarget(block({ star: true }), ordinaryGate)).toBe(false);
    expect(gateIsAvailableTarget(block({ star: true }), starGate)).toBe(true);
    expect(availableGateTargets(block(), [ordinaryGate, starGate]).map((target) => target.id)).toEqual(["ordinary", "star"]);
  });

  it("does not focus for frozen blocks, frozen exits, or no selection", () => {
    expect(gateIsAvailableTarget(block({ frozen: 1 }), gate())).toBe(false);
    expect(gateIsAvailableTarget(block(), gate({ frozen: 1 }))).toBe(false);
    expect(gateIsAvailableTarget(undefined, gate())).toBe(false);
  });
});
