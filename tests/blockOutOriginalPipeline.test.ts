import { describe, expect, it } from "vitest";
import { scoreBlockOutLevel } from "../src/core/blockOutDifficulty";
import { LEVELS } from "../src/core/levels";
import { canonicalLevelLayoutSignature, validateCampaignOriginality } from "../src/core/levelOriginality";
import { rect, type LevelSpec } from "../src/core/types";

const fixture = (overrides: Partial<LevelSpec> = {}): LevelSpec => ({
  id: 999,
  name: "fixture",
  difficulty: "normal",
  timeSeconds: 180,
  reward: 0,
  width: 6,
  height: 6,
  gates: [
    { id: "red-top", side: "top", offset: 2, size: 2, color: "red" },
    { id: "blue-bottom", side: "bottom", offset: 2, size: 2, color: "blue" },
  ],
  blocks: [
    { id: "red", x: 0, y: 3, shape: rect(2, 2), color: "red" },
    { id: "blue", x: 4, y: 1, shape: rect(2, 2), color: "blue" },
  ],
  ...overrides,
});

describe("Block Out difficulty model", () => {
  it("raises the score for tighter buffers and additional state mechanics", () => {
    const base = scoreBlockOutLevel(fixture());
    const pressured = scoreBlockOutLevel(fixture({
      gates: [
        { id: "red-top", side: "top", offset: 2, size: 2, color: "red", frozen: 3 },
        { id: "blue-bottom", side: "bottom", offset: 2, size: 2, color: "blue" },
      ],
      blocks: [
        { id: "red-a", x: 0, y: 0, shape: rect(2, 2), color: "red", layers: ["red", "blue"] },
        { id: "red-b", x: 2, y: 2, shape: rect(2, 2), color: "red", frozen: 2 },
        { id: "blue", x: 4, y: 4, shape: rect(2, 2), color: "blue" },
      ],
      shutters: [{ id: "cover", x: 0, y: 4, width: 2, height: 2, count: 2 }],
    }));

    expect(pressured.score).toBeGreaterThan(base.score);
    expect(pressured.components.bufferTightness).toBeGreaterThan(base.components.bufferTightness);
    expect(pressured.components.hiddenInformation).toBeGreaterThan(base.components.hiddenInformation);
    expect(pressured.components.exitCompetition).toBeGreaterThan(base.components.exitCompetition);
  });
});

describe("PCG originality guard", () => {
  it("treats a mirror/recolor as the same structural layout", () => {
    const original = fixture();
    const mirrored: LevelSpec = {
      ...fixture(),
      id: 1000,
      name: "mirrored",
      gates: [
        { id: "green-top", side: "top", offset: 2, size: 2, color: "green" },
        { id: "yellow-bottom", side: "bottom", offset: 2, size: 2, color: "yellow" },
      ],
      blocks: [
        { id: "green", x: 4, y: 3, shape: rect(2, 2), color: "green" },
        { id: "yellow", x: 0, y: 1, shape: rect(2, 2), color: "yellow" },
      ],
    };
    expect(canonicalLevelLayoutSignature(mirrored)).toBe(canonicalLevelLayoutSignature(original));
  });

  it("keeps all shipping Block Out levels structurally and semantically unique", () => {
    const report = validateCampaignOriginality(LEVELS);
    expect(report.levelCount).toBe(100);
    expect(report.duplicateLayoutGroups).toEqual([]);
    expect(report.duplicateNameGroups).toEqual([]);
    expect(report.passed).toBe(true);
  });
});
