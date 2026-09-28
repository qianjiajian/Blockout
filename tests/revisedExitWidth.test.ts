import { describe, expect, it } from "vitest";
import {
  exitFrontierSpan,
  exitPassingSpan,
  gateCoversExitFrontier,
  matchingPortalForExitFrontier,
  resolveMatchingGatePortal,
} from "../src/core/blockExitFrontier";
import { portalMouthCells } from "../src/core/gatePortals";
import { PuzzleModel, validateLevel } from "../src/core/PuzzleModel";
import type { GatePortalSpec, GateSpec, LevelSpec, Point, Side } from "../src/core/types";
import { matchingContinuousExitPortals } from "../src/game/continuousDrag";

const SIDES = ["top", "right", "bottom", "left"] as const;
const orientedT: Record<Side, { shape: Point[]; anchor: Point }> = {
  top: { shape: [[1, 0], [0, 1], [1, 1], [2, 1]], anchor: [1, 0] },
  right: { shape: [[0, 0], [0, 1], [0, 2], [1, 1]], anchor: [3, 1] },
  bottom: { shape: [[0, 0], [1, 0], [2, 0], [1, 1]], anchor: [1, 3] },
  left: { shape: [[1, 0], [0, 1], [1, 1], [1, 2]], anchor: [0, 1] },
};

const fixture = (side: Side, size = 1): LevelSpec => {
  const { anchor: [x, y], shape } = orientedT[side];
  return {
    id: 98_601,
    name: "revised rigid exit width fixture",
    mechanismRules: "revised-2026-09-21",
    difficulty: "normal",
    timeSeconds: 60,
    reward: 0,
    width: 5,
    height: 5,
    gates: [{ id: "red-exit", side, offset: size === 1 ? 2 : 1, size, color: "red" }],
    blocks: [{ id: "red", x, y, shape, color: "red" }],
  };
};

const cellsOf = (level: LevelSpec): Point[] => {
  const block = level.blocks[0];
  return block.shape.map(([dx, dy]) => [block.x + dx, block.y + dy]);
};

const localFixture = (side: Side, size = 1): LevelSpec => {
  const turns = ["right", "bottom", "left", "top"].indexOf(side);
  const rotate = (point: Point): Point => {
    let [x, y] = point;
    for (let index = 0; index < turns; index += 1) [x, y] = [6 - y, x];
    return [x, y];
  };
  // A connected concave board. The local mouth at x=4 is not the outer x=6.
  const playable: Point[] = [];
  for (let y = 0; y < 5; y += 1) for (let x = 0; x < 5; x += 1) playable.push(rotate([x, y]));
  for (let y = 4; y < 7; y += 1) for (let x = 5; x < 7; x += 1) playable.push(rotate([x, y]));
  const canonicalCells: Point[] = [[3, 1], [3, 2], [3, 3], [4, 2]];
  const shapeCells = canonicalCells.map(rotate);
  const x = Math.min(...shapeCells.map(([cellX]) => cellX));
  const y = Math.min(...shapeCells.map(([, cellY]) => cellY));
  const mouth = portalMouthCells({ side: "right", origin: [4, size === 1 ? 2 : 1], size }).map(rotate);
  const origin: Point = [Math.min(...mouth.map(([cellX]) => cellX)), Math.min(...mouth.map(([, cellY]) => cellY))];
  const portal: GatePortalSpec = { side, origin, size };
  return {
    ...fixture(side, size),
    width: 7,
    height: 7,
    playable,
    blocks: [{ id: "red", x, y, shape: shapeCells.map(([cellX, cellY]) => [cellX - x, cellY - y]), color: "red" }],
    gates: [{ id: "red-exit", color: "red", side, offset: side === "top" || side === "bottom" ? origin[0] : origin[1], size, portals: [portal] }],
  };
};

describe("revised complete exit width", () => {
  it("keeps complete-width and snapshot-to-UI behavior in revised v1.1", () => {
    const level = fixture("bottom");
    level.mechanismRules = "revised-2026-09-21-v1.1";
    const model = new PuzzleModel(level);
    const snapshot = model.snapshot();
    expect(snapshot.mechanismRules).toBe(level.mechanismRules);
    expect(model.exitAttemptStatus("red", "bottom")).toBe("no-gate");
    expect(matchingContinuousExitPortals(snapshot, snapshot.blocks[0], ["bottom"])).toEqual([]);
    const wide = { ...level, gates: [{ ...level.gates[0], offset: 1, size: 3 }] };
    expect(new PuzzleModel(wide).tryExit("red", "bottom").ok).toBe(true);
  });

  for (const side of SIDES) {
    it(`${side}: rejects a T stem at a narrow outer gate in revised and early levels`, () => {
      const level = fixture(side);
      const cells = cellsOf(level);
      expect(exitFrontierSpan(cells, side)).toBe(1);
      expect(exitPassingSpan(cells, side)).toBe(3);
      expect(gateCoversExitFrontier(level, cells, level.gates[0])).toBe(false);
      expect(matchingPortalForExitFrontier(level, cells, level.gates[0], side)).toBeUndefined();
      expect(resolveMatchingGatePortal(level, cells, side, level.gates)).toBeUndefined();
      const legacy = { ...level, mechanismRules: undefined };
      expect(gateCoversExitFrontier(legacy, cells, legacy.gates[0])).toBe(false);
      expect(new PuzzleModel(legacy).tryExit("red", side).ok).toBe(false);
    });

    it(`${side}: requires the complete width and its actual tangent offset, not just size`, () => {
      const level = fixture(side, 3);
      const cells = cellsOf(level);
      const gate = level.gates[0];
      expect(gateCoversExitFrontier(level, cells, gate)).toBe(true);
      expect(resolveMatchingGatePortal(level, cells, side, [gate])?.gateId).toBe(gate.id);
      const shifted = { ...gate, offset: 2 };
      expect(gateCoversExitFrontier(level, cells, shifted)).toBe(false);
      expect(resolveMatchingGatePortal(level, cells, side, [shifted])).toBeUndefined();
    });

    it(`${side}: applies complete width to real concave-board portals`, () => {
      const narrow = localFixture(side);
      const wide = localFixture(side, 3);
      expect(() => validateLevel(narrow)).not.toThrow();
      expect(() => validateLevel(wide)).not.toThrow();
      expect(gateCoversExitFrontier(narrow, cellsOf(narrow), narrow.gates[0])).toBe(false);
      expect(new PuzzleModel(narrow).exitAttemptStatus("red", side)).toBe("no-gate");
      const model = new PuzzleModel(wide);
      expect(model.exitAttemptStatus("red", side)).toBe("ok");
      expect(model.tryExit("red", side)).toMatchObject({ ok: true, gateId: "red-exit", portalIndex: 0 });
    });

    for (const kind of ["normal", "star", "frozen", "flip"] as const) {
      it(`${side}/${kind}: PuzzleModel and continuous portal resolution share the profile`, () => {
        const make = (size: number): LevelSpec => {
          const level = fixture(side, size);
          const gate: GateSpec = { ...level.gates[0] };
          if (kind === "star") {
            gate.star = true;
            level.blocks[0].star = true;
          }
          if (kind === "frozen") gate.frozen = 1;
          if (kind === "flip") {
            level.gates = [];
            level.flipDoors = [{ ...gate, initiallyOpen: true }];
          } else level.gates = [gate];
          return level;
        };
        const narrow = new PuzzleModel(make(1));
        const before = narrow.snapshot();
        expect(before.mechanismRules).toBe("revised-2026-09-21");
        expect(narrow.exitAttemptStatus("red", side)).toBe("no-gate");
        expect(narrow.tryExit("red", side).ok).toBe(false);
        expect(narrow.snapshot()).toEqual(before);
        // Deliberately pass a side instead of filtering through possibleExitSides:
        // this checks the UI's shared geometry path, not only model filtering.
        expect(matchingContinuousExitPortals(before, before.blocks[0], [side])).toEqual([]);

        const wide = new PuzzleModel(make(3));
        if (kind === "frozen") {
          expect(wide.exitAttemptStatus("red", side)).toBe("frozen-gate");
          expect(wide.tryExit("red", side).ok).toBe(false);
          expect(wide.thawAll()).toBe(true);
        }
        const snapshot = wide.snapshot();
        expect(wide.exitAttemptStatus("red", side)).toBe("ok");
        expect(matchingContinuousExitPortals(snapshot, snapshot.blocks[0], wide.possibleExitSides(snapshot.blocks[0])))
          .toEqual([expect.objectContaining({ gateId: "red-exit", gateKind: kind === "flip" ? "flipDoor" : "fixed" })]);
        expect(wide.tryExit("red", side).ok).toBe(true);
        expect(wide.snapshot().complete).toBe(true);
      });
    }
  }

  it("does not assemble adjacent mouths of one logical gate into a wider aperture", () => {
    const level = localFixture("right", 3);
    const split: GateSpec = {
      ...level.gates[0],
      size: 1,
      portals: [1, 2, 3].map((y) => ({ side: "right", origin: [4, y], size: 1 })),
    };
    level.gates = [split];
    validateLevel(level);
    expect(matchingPortalForExitFrontier(level, cellsOf(level), split, "right")).toBeUndefined();
    expect(resolveMatchingGatePortal(level, cellsOf(level), "right", [split])).toBeUndefined();
    expect(new PuzzleModel(level).tryExit("red", "right").ok).toBe(false);
    const legacy = { ...level, mechanismRules: undefined };
    expect(matchingPortalForExitFrontier(legacy, cellsOf(level), split, "right")).toBeUndefined();
  });

  it("does not assemble separate gates or fixed/flip doors into a wider aperture", () => {
    const level = localFixture("right", 3);
    const gate = (y: number): GateSpec => ({
      id: `exit-${y}`, color: y === 1 ? "blue" : y === 2 ? "red" : "green", side: "right", offset: y, size: 1,
      portals: [{ side: "right", origin: [4, y], size: 1 }],
    });
    level.gates = [gate(1), gate(2)];
    level.flipDoors = [{ ...gate(3), initiallyOpen: true }];
    validateLevel(level);
    expect(resolveMatchingGatePortal(level, cellsOf(level), "right", level.gates, level.flipDoors)).toBeUndefined();
    expect(new PuzzleModel(level).tryExit("red", "right").ok).toBe(false);
  });

  it("can skip a narrow first portal and resolve a separate full-width portal", () => {
    const level = fixture("bottom", 3);
    const gate: GateSpec = {
      ...level.gates[0], side: "right", offset: 3, size: 1,
      portals: [{ side: "right", origin: [3, 3], size: 1 }, { side: "bottom", origin: [1, 4], size: 3 }],
    };
    // Pure matcher case: portal identity is retained, not normalized to slot 0.
    expect(matchingPortalForExitFrontier(level, cellsOf(level), gate, "bottom")?.portalIndex).toBe(1);
    expect(resolveMatchingGatePortal(level, cellsOf(level), "bottom", [gate])?.portalIndex).toBe(1);
  });

  it("does not mistake a full-width aperture on the wrong normal rail for an exit", () => {
    const level = localFixture("right", 3);
    const gate: GateSpec = { ...level.gates[0], portals: [{ side: "right", origin: [3, 1], size: 3 }] };
    expect(matchingPortalForExitFrontier(level, cellsOf(level), gate, "right")).toBeUndefined();
    expect(resolveMatchingGatePortal(level, cellsOf(level), "right", [gate])).toBeUndefined();
    expect(exitPassingSpan([], "right")).toBe(0);
  });
});
