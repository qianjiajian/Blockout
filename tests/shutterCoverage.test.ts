import { describe, expect, it } from "vitest";
import { getLevel, LEVELS } from "../src/core/levels";
import {
  assertOrdinaryShutterCoverage,
  auditOrdinaryShutterCoverage,
} from "../src/core/shutterCoverage";
import { rect, type LevelSpec } from "../src/core/types";

const validFixture = (): LevelSpec => ({
  id: 964,
  name: "shutter coverage fixture",
  difficulty: "normal",
  timeSeconds: 60,
  reward: 0,
  width: 4,
  height: 3,
  gates: [],
  shutters: [{ id: "cover", x: 0, y: 1, width: 2, height: 2, count: 2, skin: "shutter" }],
  blocks: [
    { id: "opening", x: 2, y: 0, shape: rect(2, 1), color: "red" },
    { id: "hidden-a", x: 0, y: 1, shape: rect(1, 2), color: "blue", shutterId: "cover" },
    { id: "hidden-b", x: 1, y: 1, shape: rect(1, 2), color: "green", shutterId: "cover" },
  ],
});

describe("ordinary shutter coverage contract", () => {
  it("keeps every final runtime cover aligned with its reserved and hidden regions", () => {
    const mismatches = LEVELS.flatMap((level) => auditOrdinaryShutterCoverage(level)
      .filter(({ kind }) => kind !== "missing-hidden-cohort"));
    expect(mismatches).toEqual([]);
    for (const level of LEVELS) expect(() => assertOrdinaryShutterCoverage(level), `Lv${level.id}`).not.toThrow();
  });

  it("accepts the repaired Lv21 display/reservation/reveal regions", () => {
    expect(auditOrdinaryShutterCoverage(getLevel(21))).toEqual([]);
    expect(() => assertOrdinaryShutterCoverage(getLevel(21))).not.toThrow();
  });

  it("accepts a hidden batch that tiles its displayed cover", () => {
    expect(auditOrdinaryShutterCoverage(validFixture())).toEqual([]);
  });

  it("detects all three player-visible mismatch classes", () => {
    const level = validFixture();
    level.blocks = level.blocks.map((block) => block.id === "hidden-b"
      ? { ...block, x: 0, y: 2 }
      : block.id === "opening"
        ? { ...block, x: 1, y: 0, shape: rect(1, 2) }
        : block);
    const kinds = auditOrdinaryShutterCoverage(level).map(({ kind }) => kind);
    expect(kinds).toContain("hidden-cell-outside-cover");
    expect(kinds).toContain("hidden-cell-overlap");
    expect(kinds).toContain("opening-cell-covered");
  });

  it("does not treat non-spatial staging, lift, or staged-frame devices as shutters", () => {
    const level = validFixture();
    level.shutters = ["staging", "lift", "staged-frame"].map((skin, index) => ({
      id: `non-spatial-${skin}`,
      x: index,
      y: 0,
      width: 1,
      height: 1,
      count: 1,
      skin: skin as "staging" | "lift" | "staged-frame",
    }));
    level.blocks = [{ id: "opening", x: 0, y: 0, shape: rect(1, 1), color: "red" }];
    expect(auditOrdinaryShutterCoverage(level)).toEqual([]);
  });

  it("does not report inactive non-spatial cargo as opening cover overlap", () => {
    const level = validFixture();
    level.shutters?.push({
      id: "stage",
      x: 0,
      y: 0,
      width: 1,
      height: 1,
      count: 1,
      skin: "staging",
    });
    level.blocks.push({
      id: "staged-cargo",
      x: 0,
      y: 1,
      shape: rect(1, 1),
      color: "orange",
      shutterId: "stage",
    });
    expect(auditOrdinaryShutterCoverage(level)).toEqual([]);
  });
});
