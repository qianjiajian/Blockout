import { describe, expect, it } from "vitest";
import { PuzzleModel } from "../src/core/PuzzleModel";
import type { LevelSpec, ShutterState } from "../src/core/types";
import { isMechanismBlockVisible, isMechanismRegionBlocking, isMechanismRegionRevealed } from "../src/game/revisedMechanismPresentation";
import { createContinuousCollisionValidator, isContinuousPoseAtPortal } from "../src/game/continuousDrag";
import { gateReadiness } from "../src/game/gateReadiness";
import { blockingBlockAtPose } from "../src/game/blockingFocus";
import { localBreakthroughFocus } from "../src/game/localBreakthroughFocus";

const profile = { mechanismRules: "revised-2026-09-21-v1.1" as const };
const cover: ShutterState = { id: "cover", x: 1, y: 1, width: 1, height: 1, count: 0, revealed: false };
const scene = (extra: Partial<LevelSpec> = {}): LevelSpec => ({
  ...profile, id: 99010, name: "presentation", difficulty: "normal", width: 4, height: 4,
  timeSeconds: 60, reward: 0, gates: [], blocks: [], ...extra,
});

describe("revised visual state is model-owned", () => {
  it("does not show or unblock an unrevealed zero-count physical cover", () => {
    const snapshot = { ...profile, shutters: [cover] };
    expect(isMechanismRegionRevealed(snapshot, cover)).toBe(false);
    expect(isMechanismBlockVisible(snapshot, { shutterId: "cover" })).toBe(false);
    expect(isMechanismRegionBlocking(snapshot, cover)).toBe(true);
    expect(isMechanismRegionBlocking(snapshot, { ...cover, skin: "lift" })).toBe(false);
    expect(isMechanismRegionRevealed({}, cover)).toBe(true);
    expect(isMechanismRegionBlocking({}, cover)).toBe(false);
  });

  it("keeps hidden lift cargo out of pointer obstacles until the whole region reveals", () => {
    const model = new PuzzleModel(scene({
      shutters: [{ ...cover, skin: "lift" }],
      blocks: [
        { id: "top", x: 1, y: 1, color: "red", shape: [[0, 0]] },
        { id: "bottom", x: 1, y: 1, color: "blue", shape: [[0, 0]], shutterId: "cover", frozen: 6 },
      ],
    }));
    expect(createContinuousCollisionValidator(model.snapshot(), "top")(1, 1)).toBe(true);
    const hiddenGate = { id: "blue-gate", side: "left" as const, offset: 1, size: 1, color: "blue" as const, frozen: 0 };
    const thawed = model.snapshot().blocks.map((block) => ({ ...block, frozen: 0 }));
    expect(gateReadiness(hiddenGate, thawed, model.snapshot().shutters, profile)).toBe("latent");
    expect(blockingBlockAtPose({ ...model.snapshot(), blocks: thawed }, "top", { x: 1, y: 1 })).toBeUndefined();
    expect(localBreakthroughFocus(model)).toBeUndefined();
    model.moveBlockStep("top", 1, 2);
    expect(isMechanismBlockVisible(model.snapshot(), model.getBlock("bottom")!)).toBe(true);
    expect(createContinuousCollisionValidator(model.snapshot(), "top")(1, 1)).toBe(false);
  });

  it("preserves full cross-section at floating portal poses in both rule profiles", () => {
    const shape = [[0, 0], [1, 0], [2, 0], [1, 1]] as const;
    const portal = { side: "bottom" as const, origin: [1, 1] as const, size: 1 };
    expect(isContinuousPoseAtPortal({ x: 0, y: 0 }, shape, portal)).toBe(false);
    expect(isContinuousPoseAtPortal({ x: 0, y: 0 }, shape, portal, 0.04, profile.mechanismRules)).toBe(false);
    expect(isContinuousPoseAtPortal({ x: 0, y: 0 }, shape, { ...portal, origin: [0, 1], size: 3 }, 0.04, profile.mechanismRules)).toBe(true);
  });

  it("prevents visual fractional overlap of forbidden grids and disallowed movement axes", () => {
    const model = new PuzzleModel(scene({
      blocks: [{ id: "red", x: 0, y: 1, color: "red", shape: [[0, 0]], movementAxis: "horizontal" }],
      coloredGrids: [{ id: "blue-grid", color: "blue", cells: [[2, 1]] }],
    }));
    const valid = createContinuousCollisionValidator(model.snapshot(), "red");
    expect(valid(1, 1)).toBe(true);
    expect(valid(1.1, 1)).toBe(false);
    expect(valid(0, 1.1)).toBe(false);
  });
});
