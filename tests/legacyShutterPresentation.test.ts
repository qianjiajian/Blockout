import { describe, expect, it } from "vitest";
import { getLevel } from "../src/core/levels";
import { PuzzleModel } from "../src/core/PuzzleModel";
import { usesImmediatePlayableClock, usesRevisedMechanisms } from "../src/core/mechanismRules";
import type { ShutterSpec } from "../src/core/types";
import {
  missingMechanismArtPaths, requiredMechanismArtPaths,
  ACTIVE_REVISED_MECHANISM_ART_PATHS,
} from "../src/game/revisedMechanismArt";
import { SHUTTER_NINE_SLICE_PATHS } from "../src/game/shutterNineSlice";
import { isMechanismRegionRevealed, usesReferenceRegionVisuals } from "../src/game/revisedMechanismPresentation";

describe("legacy curtain reference presentation without a rules migration", () => {
  it("gives the formal Lv20 curtain the nine original pieces but preserves legacy gameplay", () => {
    const level = getLevel(20);
    const original = JSON.stringify(level);
    const snapshot = new PuzzleModel(level).snapshot();
    expect(usesRevisedMechanisms(level)).toBe(false);
    expect(usesImmediatePlayableClock(level)).toBe(false);
    expect(snapshot.started).toBe(false);
    expect(snapshot.shutters).toEqual([expect.objectContaining({
      id: "vp-020-cover-1", width: 5, height: 3, count: 6, skin: "shutter",
    })]);
    expect(usesReferenceRegionVisuals(snapshot, snapshot.shutters[0])).toBe(true);
    expect(requiredMechanismArtPaths(level)).toEqual(SHUTTER_NINE_SLICE_PATHS);
    expect(JSON.stringify(level)).toBe(original);
  });

  it("does not restyle legacy lifts, internal staging or generators as curtains", () => {
    for (const skin of [undefined, "shutter", "lift", "generator", "staging", "staged-frame"] as const) {
      const region: ShutterSpec = { id: "region", x: 0, y: 0, width: 1, height: 1, count: 1, skin };
      const curtain = skin == null || skin === "shutter";
      expect(usesReferenceRegionVisuals({}, region)).toBe(curtain);
      expect(requiredMechanismArtPaths({ shutters: [region] })).toHaveLength(curtain ? 9 : 0);
      expect(usesReferenceRegionVisuals(getLevel(21), region)).toBe(curtain || skin === "lift");
    }
    expect(requiredMechanismArtPaths(getLevel(1))).toEqual([]);
  });

  it("keeps legacy count-zero reveal and revised occupancy-delayed reveal separate", () => {
    const region = { id: "cover", x: 0, y: 0, width: 1, height: 1, count: 0, revealed: false };
    expect(isMechanismRegionRevealed(getLevel(20), region)).toBe(true);
    expect(isMechanismRegionRevealed(getLevel(21), region)).toBe(false);
    expect(isMechanismRegionRevealed(getLevel(20), { ...region, count: 1 })).toBe(false);
  });

  it("loads the other 62 assets after a nine-piece Lv20 cache, without reloading the frame", () => {
    const cache = new Map(SHUTTER_NINE_SLICE_PATHS.map((path) => [path, {}]));
    expect(missingMechanismArtPaths(getLevel(20), cache)).toEqual([]);
    const missing = missingMechanismArtPaths(getLevel(21), cache);
    expect(missing).toHaveLength(62);
    for (const path of SHUTTER_NINE_SLICE_PATHS) expect(missing).not.toContain(path);
    for (const path of missing) cache.set(path, {});
    expect(cache.size).toBe(ACTIVE_REVISED_MECHANISM_ART_PATHS.length);
    expect(missingMechanismArtPaths(getLevel(21), cache)).toEqual([]);
    expect(missingMechanismArtPaths(getLevel(20), cache)).toEqual([]);
  });
});
