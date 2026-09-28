import { describe, expect, it } from "vitest";
import { LEVELS } from "../src/core/levels";
import {
  VIDEO_PARITY_GENERATOR_RIM_GEOMETRY,
  getVideoParityGeneratorRimGeometry,
  videoParityGeneratorRimGeometryKey,
} from "../src/core/videoParityGeneratorRimGeometry";

const campaignGeneratorKeys = (): string[] => LEVELS.flatMap((level) => (
  (level.generators ?? []).map((generator) => (
    videoParityGeneratorRimGeometryKey(level.id, generator.id)
  ))
));

describe("video parity generator rim geometry", () => {
  it("keeps the 37 source-authored visual references unique and linked to a final generator", () => {
    const geometryKeys = VIDEO_PARITY_GENERATOR_RIM_GEOMETRY.map((entry) => (
      videoParityGeneratorRimGeometryKey(entry.levelId, entry.generatorId)
    ));
    const expectedKeys = campaignGeneratorKeys();

    expect(expectedKeys).toHaveLength(62);
    expect(geometryKeys).toHaveLength(37);
    expect(new Set(geometryKeys).size).toBe(37);
    expect(geometryKeys.every((key) => expectedKeys.includes(key))).toBe(true);
  });

  it("uses the competitor three-rail footprint and valid edge metadata", () => {
    for (const entry of VIDEO_PARITY_GENERATOR_RIM_GEOMETRY) {
      const level = LEVELS.find((candidate) => candidate.id === entry.levelId);
      expect(level, `missing Lv${entry.levelId}`).toBeDefined();
      expect(entry.rimSpan).toBe(3);
      expect(["rim", "outboard"]).toContain(entry.rimMount);
      expect(Number.isInteger(entry.offset)).toBe(true);
      expect(entry.offset).toBeGreaterThanOrEqual(0);

      const edgeLength = entry.side === "top" || entry.side === "bottom"
        ? level!.width
        : level!.height;
      expect(entry.offset).toBeLessThan(edgeLength);

      if (entry.anchor) {
        expect(Number.isFinite(entry.anchor.x)).toBe(true);
        expect(Number.isFinite(entry.anchor.y)).toBe(true);
        expect([0, 1, 2, 3]).toContain(entry.anchor.quarterTurns);
      }
    }
  });

  it("preserves Lv36 queue sides while moving the right visual mount to a free band", () => {
    expect([
      getVideoParityGeneratorRimGeometry(36, "vp-036-generator-1"),
      getVideoParityGeneratorRimGeometry(36, "vp-036-generator-2"),
      getVideoParityGeneratorRimGeometry(36, "vp-036-generator-3"),
    ]).toMatchObject([
      { side: "left", offset: 2, rimSpan: 3 },
      { side: "right", offset: 4, rimSpan: 3 },
      { side: "left", offset: 6, rimSpan: 3 },
    ]);
  });

  it("locks Lv43 to five free rim spans plus one non-blocking outboard mount", () => {
    const placements = Array.from({ length: 6 }, (_, index) => (
      getVideoParityGeneratorRimGeometry(43, `vp-043-generator-${index + 1}`)
    ));

    expect(placements).toMatchObject([
      { side: "left", offset: 1, rimSpan: 3 },
      { side: "right", offset: 1, rimSpan: 3 },
      { side: "left", offset: 4, rimSpan: 3 },
      { side: "right", offset: 4, rimSpan: 3 },
      { side: "left", offset: 7, rimSpan: 3 },
      { side: "right", offset: 7, rimSpan: 3, rimMount: "outboard" },
    ]);
  });

  it("pins local and outboard cohorts away from playable-cell occlusion", () => {
    expect(getVideoParityGeneratorRimGeometry(46, "vp-046-generator-1")?.anchor)
      .toEqual({ x: 2, y: 6.5, quarterTurns: 3 });
    expect(getVideoParityGeneratorRimGeometry(46, "vp-046-generator-2")?.anchor)
      .toEqual({ x: -0.98, y: 2.5, quarterTurns: 3 });
    expect(getVideoParityGeneratorRimGeometry(77, "vp-077-generator-1")?.anchor)
      .toEqual({ x: 5.5, y: 3, quarterTurns: 0 });
    expect(getVideoParityGeneratorRimGeometry(87, "vp-087-generator-1")?.anchor)
      .toEqual({ x: 0, y: 5.5, quarterTurns: 3 });
    expect(getVideoParityGeneratorRimGeometry(87, "vp-087-generator-2")?.anchor)
      .toEqual({ x: 5.5, y: 9, quarterTurns: 2 });
    expect(getVideoParityGeneratorRimGeometry(88, "vp-088-generator-1")?.anchor)
      .toEqual({ x: 5.5, y: 0, quarterTurns: 0 });
    expect(getVideoParityGeneratorRimGeometry(88, "vp-088-generator-2")?.anchor)
      .toEqual({ x: 7.98, y: 6.5, quarterTurns: 1 });
  });
});
