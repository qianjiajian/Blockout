import { describe, expect, it } from "vitest";
// @ts-expect-error The app tsconfig intentionally excludes Node ambient types; Vitest still runs in Node.
import { readFileSync } from "node:fs";
// @ts-expect-error The app tsconfig intentionally excludes Node ambient types; Vitest still runs in Node.
import { createHash } from "node:crypto";
import {
  REMADE_201_210_LEVELS,
  FORMAL_201_210_LEVELS,
  FORMAL_ISOLATED_201_210_LEVELS,
} from "../src/core/remake201to210";
import { evaluateLevelStars, levelStarTargets } from "../src/core/levelStarConditions";
import { replayRevisedRoute } from "../src/core/revisedLevelSearch";
import { auditRevisedMechanismContract } from "../src/core/revisedMechanismContract";
// @ts-expect-error The app tsconfig intentionally excludes Node ambient types; Vitest still runs in Node.
import { auditHiddenCoverage } from "../tools/revised-hidden-coverage.mjs";
import type { RevisedSearchDrag } from "../src/core/revisedLevelSearch";

const fixture = JSON.parse(readFileSync(
  new URL("./fixtures/remake201-210-hidden-repair-20260930.json", import.meta.url),
  "utf8",
)) as {
  levels: Record<string, {
    route: RevisedSearchDrag[];
    lowerBound: number;
    upperBound: number;
    totalDrags: number;
    starTargets: { moveTarget: number; timeTargetSeconds: number };
  }>;
};
const formalRecord = JSON.parse(readFileSync(
  new URL("../deliverables/continue201-210-20260930/formal-isolated-hidden-repair.json", import.meta.url),
  "utf8",
)) as {
  ruleVersion: string;
  productionBoundary: { campaignLevelCount: number; releaseApproved: boolean };
  levels: Array<{ id: number; levelSha256: string; status: string; certifiedLowerBound: number; currentObjectLowerBoundCertified: boolean; pointerValidated: boolean; naturalClockValidated: boolean; starsValidated: boolean }>;
};
type FloorResult = { status: string; thresholdProven: boolean; floor: number; sourceLevelSha256: string };
const repairedFloors = JSON.parse(readFileSync(
  new URL("../deliverables/continue201-210-20260930/fresh-floor-adjacency-repair.json", import.meta.url),
  "utf8",
)) as { records: Record<string, { result: FloorResult }> };
const hiddenFloors = JSON.parse(readFileSync(
  new URL("../deliverables/continue201-210-20260930/fresh-floor-hidden-repair.json", import.meta.url),
  "utf8",
)) as { records: Record<string, { result: FloorResult }> };
const otherFloors = JSON.parse(readFileSync(
  new URL("../deliverables/continue201-210-20260930/fresh-six-audit.json", import.meta.url),
  "utf8",
)) as { records: Array<{ id: number; freshResult: FloorResult }> };

const levelHash = (level: unknown): string => createHash("sha256")
  .update(JSON.stringify(level))
  .digest("hex");
const canonical = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    const object = value as Record<string, unknown>;
    return Object.fromEntries(Object.keys(object).sort().map((key) => [key, canonical(object[key])]));
  }
  return value;
};
const proofHash = (level: unknown): string => levelHash(canonical(level));

const sameColourContacts = (level: typeof FORMAL_ISOLATED_201_210_LEVELS[number]): string[] => {
  const occupied = new Map<string, Array<{ id: string; color: string }>>();
  for (const block of level.blocks) {
    for (const [dx, dy] of block.shape) {
      const key = `${block.x + dx},${block.y + dy}`;
      const owners = occupied.get(key) ?? [];
      owners.push({ id: block.id, color: block.layers?.[0] ?? block.color });
      occupied.set(key, owners);
    }
  }
  const pairs = new Set<string>();
  for (const [key, owners] of occupied) {
    const [x, y] = key.split(",").map(Number);
    for (const neighbor of [`${x + 1},${y}`, `${x},${y + 1}`]) {
      for (const a of owners) for (const b of occupied.get(neighbor) ?? []) {
        if (a.id !== b.id && a.color === b.color) pairs.add([a.id, b.id].sort().join("|"));
      }
    }
  }
  return [...pairs];
};

const expected = [
  [201, "easy", 5, 7],
  [202, "normal", 12, 12],
  [203, "normal", 11, 15],
  [204, "hard", 17, 19],
  [205, "easy", 5, 7],
  [206, "normal", 12, 12],
  [207, "hard", 17, 19],
  [208, "easy", 5, 7],
  [209, "normal", 11, 15],
  [210, "super", 21, 29],
] as const;

describe("competitor continuation 201–210 v1.124 formal-data package", () => {
  it("registers ten ordered v1.5 candidates in the latest difficulty rhythm", () => {
    expect(REMADE_201_210_LEVELS.map((level) => level.id)).toEqual(
      expected.map(([id]) => id),
    );
    for (const [id, difficulty, lower, upper] of expected) {
      const level = REMADE_201_210_LEVELS.find((candidate) => candidate.id === id)!;
      expect(level.mechanismRules).toBe("revised-2026-09-27-v1.5");
      expect(level.difficulty).toBe(difficulty);
      expect(level.designTargets?.minimumRepositionOverhead).toBe(lower);
      expect(level.designTargets?.minimumRepositionOverhead).toBeLessThanOrEqual(upper);
      expect(level.mechanismAdaptation?.userAuthorized).toMatch(/^201-210竞品视频续作/);
      expect(auditRevisedMechanismContract(level)).toEqual([]);
    }
  });

  it("registers all ten accepted formal objects without changing the old isolated record", () => {
    expect(FORMAL_201_210_LEVELS.map((level) => level.id)).toEqual(
      expected.map(([id]) => id),
    );
  });

  it("records all ten levels in the isolated formal-data package", () => {
    expect(FORMAL_ISOLATED_201_210_LEVELS.map((level) => level.id)).toEqual(
      expected.map(([id]) => id),
    );
    expect(FORMAL_ISOLATED_201_210_LEVELS.map((level) => level.id)).toEqual(
      REMADE_201_210_LEVELS.map((level) => level.id),
    );
    expect(formalRecord.ruleVersion).toBe("v1.124.0");
    expect(formalRecord.productionBoundary).toEqual({
      campaignLevelCount: 200,
      productionLevelsChanged: false,
      releaseApproved: false,
    });
    for (const level of FORMAL_ISOLATED_201_210_LEVELS) {
      const row = formalRecord.levels.find((candidate) => candidate.id === level.id)!;
      expect(row.levelSha256).toBe(levelHash(level));
      expect(row.pointerValidated).toBe(false);
      expect(row.naturalClockValidated).toBe(false);
      expect(row.starsValidated).toBe(false);
      expect(row.status).toMatch(/^FORMAL_DATA_PRESENT_/);
    }
  });

  it("separates same-colour contacts across all authored inventory", () => {
    for (const [id] of expected) {
      const level = FORMAL_ISOLATED_201_210_LEVELS.find((candidate) => candidate.id === id)!;
      expect(sameColourContacts(level), `Lv${id}`).toEqual([]);
    }
  });

  it("fills every real hidden cohort after the Lv202/Lv206 repair", () => {
    for (const [id] of expected) {
      const level = FORMAL_ISOLATED_201_210_LEVELS.find((candidate) => candidate.id === id)!;
      const audit = auditHiddenCoverage(level);
      expect(audit.passed, `Lv${id}: ${JSON.stringify(audit.issues)}`).toBe(true);
    }
  });

  it("binds fresh difficulty floors to the current ten level objects", () => {
    for (const [id, , lower] of expected) {
      const level = FORMAL_ISOLATED_201_210_LEVELS.find((candidate) => candidate.id === id)!;
      const floor = hiddenFloors.records[String(id)]?.result
        ?? repairedFloors.records[String(id)]?.result
        ?? otherFloors.records.find((record) => record.id === id)?.freshResult;
      const row = formalRecord.levels.find((candidate) => candidate.id === id)!;
      expect(floor, `Lv${id} fresh proof`).toBeDefined();
      expect(floor!.status).toBe("threshold-proven");
      expect(floor!.thresholdProven).toBe(true);
      expect(floor!.sourceLevelSha256).toBe(proofHash(level));
      expect(floor!.floor).toBeGreaterThanOrEqual(lower);
      expect(row.currentObjectLowerBoundCertified).toBe(true);
      expect(row.certifiedLowerBound).toBe(lower);
    }
  });

  it.each(expected.map(([id]) => id))("replays the current v1.5 route and meets Lv%i stars", (id) => {
    const level = REMADE_201_210_LEVELS.find((candidate) => candidate.id === id)!;
    const row = fixture.levels[String(id)]!;
    const replay = replayRevisedRoute(level, row.route);
    expect(replay.valid, replay.error).toBe(true);
    expect(replay.complete).toBe(true);
    expect(replay.nonClearingDrags).toBe(row.upperBound);
    expect(replay.effectiveDrags).toBe(row.totalDrags);
    expect(row.lowerBound).toBe(expected.find(([candidate]) => candidate === id)![2]);
    expect(row.upperBound).toBe(expected.find(([candidate]) => candidate === id)![3]);
    expect(levelStarTargets(level)).toEqual(row.starTargets);
    expect(evaluateLevelStars(level, {
      moves: row.starTargets.moveTarget,
      elapsedSeconds: row.starTargets.timeTargetSeconds,
    }).earnedStars).toBe(3);
  });
});
