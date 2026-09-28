import { describe, expect, it } from "vitest";
import { LEVELS } from "../src/core/levels";
import { PuzzleModel, validateLevel } from "../src/core/PuzzleModel";
import {
  exitFrontierSpan,
  exitPassingSpan,
  gateCoversExitFrontier,
  matchingPortalForExitFrontier,
  resolveMatchingGatePortal,
} from "../src/core/blockExitFrontier";
import { matchingContinuousExitPortals } from "../src/game/continuousDrag";
import type { LevelSpec, Point, Side } from "../src/core/types";

const PROFILES = [undefined, "revised-2026-09-21", "revised-2026-09-21-v1.1", "revised-2026-09-21-v1.2"] as const;
const SHAPES: Record<Side, { shape: Point[]; anchor: Point }> = {
  top: { shape: [[1, 0], [0, 1], [1, 1], [2, 1]], anchor: [1, 0] },
  right: { shape: [[0, 0], [0, 1], [0, 2], [1, 1]], anchor: [3, 1] },
  bottom: { shape: [[0, 0], [1, 0], [2, 0], [1, 1]], anchor: [1, 3] },
  left: { shape: [[1, 0], [0, 1], [1, 1], [1, 2]], anchor: [0, 1] },
};
const fixture = (side: Side, profile: LevelSpec["mechanismRules"], offset: number, size: number): LevelSpec => {
  const { shape, anchor: [x, y] } = SHAPES[side];
  return {
    id: 99005, name: "full shape alignment", difficulty: "normal", timeSeconds: 60, reward: 0,
    width: 5, height: 5, mechanismRules: profile,
    blocks: [{ id: "piece", x, y, shape, color: "cyan" }],
    gates: [{ id: "exit", side, offset, size, color: "cyan" }],
  };
};
const cellsOf = (level: LevelSpec): Point[] => level.blocks[0].shape.map(([dx, dy]) => [
  level.blocks[0].x + dx, level.blocks[0].y + dy,
]);

describe("all profiles require every block cell to align with one exit", () => {
  it("reproduces the actual Lv5 cyan T: y=5 protrudes below the left gate, y=4 fits", () => {
    const actual = LEVELS.find((level) => level.id === 5)!;
    expect(actual.mechanismRules).toBeUndefined();
    const block = actual.blocks.find((entry) => entry.id === "strategy-guard-01")!;
    const gate = actual.gates.find((entry) => entry.id === "vp-002-gate-02")!;
    expect(block.shape).toEqual([[0, 0], [1, 0], [2, 0], [1, 1]]);
    expect(gate).toMatchObject({ side: "left", offset: 3, size: 3, color: "cyan" });
    // Isolate the actual shape and aperture at the video's exit position. Other
    // pieces have already cleared/moved by then and are irrelevant to alignment.
    const bad = { ...structuredClone(actual), blocks: [{ ...structuredClone(block), x: 0, y: 5 }] };
    validateLevel(bad);
    const badModel = new PuzzleModel(bad);
    const before = badModel.snapshot();
    expect(exitFrontierSpan(cellsOf(bad), "left")).toBe(1);
    expect(exitPassingSpan(cellsOf(bad), "left")).toBe(2);
    expect(badModel.exitAttemptStatus(block.id, "left")).toBe("no-gate");
    expect(badModel.tryExit(block.id, "left")).toEqual({ ok: false });
    expect(badModel.snapshot()).toEqual(before);
    expect(matchingContinuousExitPortals(before, before.blocks[0], ["left"])).toEqual([]);
    const good = { ...structuredClone(bad), blocks: [{ ...structuredClone(block), x: 0, y: 4 }] };
    expect(new PuzzleModel(good).tryExit(block.id, "left")).toMatchObject({ ok: true, gateId: gate.id });
  });

  for (const profile of PROFILES) for (const side of ["top", "right", "bottom", "left"] as const) {
    it(`${profile ?? "legacy"}/${side}: rejects a narrow stem and a shifted full-size door`, () => {
      for (const [offset, size] of [[2, 1], [2, 3]]) {
        const level = fixture(side, profile, offset, size);
        const cells = cellsOf(level);
        expect(gateCoversExitFrontier(level, cells, level.gates[0])).toBe(false);
        expect(matchingPortalForExitFrontier(level, cells, level.gates[0], side)).toBeUndefined();
        expect(resolveMatchingGatePortal(level, cells, side, level.gates)).toBeUndefined();
        const model = new PuzzleModel(level);
        const snapshot = model.snapshot();
        expect(model.tryExit("piece", side).ok).toBe(false);
        expect(model.snapshot()).toEqual(snapshot);
        expect(matchingContinuousExitPortals(snapshot, snapshot.blocks[0], [side])).toEqual([]);
      }
      const level = fixture(side, profile, 1, 3);
      expect(new PuzzleModel(level).tryExit("piece", side).ok).toBe(true);
    });
  }

  for (const profile of PROFILES) {
    it(`${profile ?? "legacy"}: local concave mouth uses its actual rail and does not combine apertures`, () => {
      const level = fixture("right", profile, 1, 3);
      level.width = 7; level.height = 7;
      level.playable = [];
      for (let y = 0; y < 5; y++) for (let x = 0; x < 5; x++) level.playable.push([x, y]);
      for (let y = 4; y < 7; y++) for (let x = 5; x < 7; x++) level.playable.push([x, y]);
      level.gates[0].portals = [{ side: "right", origin: [4, 1], size: 3 }];
      validateLevel(level);
      expect(new PuzzleModel(level).tryExit("piece", "right").ok).toBe(true);
      const split = structuredClone(level);
      split.gates[0].size = 1;
      split.gates[0].portals = [1, 2, 3].map((y) => ({ side: "right", origin: [4, y], size: 1 }));
      validateLevel(split);
      expect(new PuzzleModel(split).tryExit("piece", "right").ok).toBe(false);
      const wrongRail = structuredClone(level);
      wrongRail.gates[0].portals = [{ ...wrongRail.gates[0].portals![0], origin: [3, 1] }];
      expect(resolveMatchingGatePortal(wrongRail, cellsOf(wrongRail), "right", wrongRail.gates)).toBeUndefined();
    });

    it(`${profile ?? "legacy"}: full alignment keeps star, ice and flip-door conditions`, () => {
      const star = fixture("bottom", profile, 1, 3);
      star.blocks[0].star = true;
      expect(new PuzzleModel(star).exitAttemptStatus("piece", "bottom")).toBe("star-gate-required");
      star.gates[0].star = true;
      expect(new PuzzleModel(star).tryExit("piece", "bottom").ok).toBe(true);
      const ice = fixture("bottom", profile, 1, 3);
      ice.gates[0].frozen = 2;
      expect(new PuzzleModel(ice).exitAttemptStatus("piece", "bottom")).toBe("frozen-gate");
      const flip = fixture("bottom", profile, 1, 3);
      flip.flipDoors = [{ ...flip.gates[0], initiallyOpen: false }]; flip.gates = [];
      expect(new PuzzleModel(flip).tryExit("piece", "bottom").ok).toBe(false);
      flip.flipDoors[0].initiallyOpen = true;
      expect(new PuzzleModel(flip).tryExit("piece", "bottom").ok).toBe(true);
    });
  }
});
