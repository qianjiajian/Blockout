// @ts-expect-error Node fixture IO is outside the browser tsconfig.
import { readFileSync } from "node:fs";
// @ts-expect-error Node fixture hashing is outside the browser tsconfig.
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { LEVELS, LEVELS_BEFORE_51_60_REMAKE, LEVELS_BEFORE_91_100_REMAKE, getLevelStrict } from "../src/core/levels";
import { REMADE_51_60_IDS, applyRemake51to60 } from "../src/core/remake51to60";
import { evaluateLevelStars, levelStarTargets } from "../src/core/levelStarConditions";
import { validateLevel } from "../src/core/PuzzleModel";
import { replayRevisedRoute, type RevisedSearchDrag } from "../src/core/revisedLevelSearch";
import { matchFormalBlockShapeForLevel } from "../src/game/formalBlockShapes";
import type { LevelSpec } from "../src/core/types";

const fixtureBytes = readFileSync(new URL("./fixtures/native-remake51to60-v153.json", import.meta.url));
const fixture = JSON.parse(fixtureBytes.toString("utf8")) as {
  ruleVersion: string;
  inheritedContract: string;
  formalAdopted: boolean;
  formalAdoptedIds: number[];
  rows: {
    id: number;
    level: LevelSpec;
    drags: RevisedSearchDrag[];
    lowerBound: number | null;
    lowerBoundValidated?: boolean;
    upperBound: number;
    totalDrags: number;
    exception: string | null;
    adoptionStatus?: string;
  }[];
};
const baseline = JSON.parse(readFileSync(new URL("../deliverables/remake31-200-v145-20260924/baseline.json", import.meta.url), "utf8")) as {
  levels: { level: LevelSpec; starTargets: ReturnType<typeof levelStarTargets> }[];
};
const acceptedIds = [51, 52, 53, 54, 55, 56, 57, 58, 59, 60];
const adjustedMoveTargets: Readonly<Record<number, number>> = {
  52: 45, 54: 48, 55: 34, 56: 40, 58: 41, 59: 51,
};
const timeTargets: Readonly<Record<number, number>> = {
  51: 86, 52: 75, 53: 129, 54: 129, 55: 129,
  56: 97, 57: 72, 58: 90, 59: 129, 60: 64,
};
const difficulty: Record<number, LevelSpec["difficulty"]> = {
  51: "normal", 52: "super", 53: "easy", 54: "normal", 55: "normal",
  56: "hard", 57: "easy", 58: "normal", 59: "hard", 60: "easy",
};
const bounds: Record<string, readonly [number, number]> = {
  easy: [5, 10], normal: [11, 15], hard: [16, 20], super: [21, 30],
};

const expectedAtAdoptionStage = (historical: LevelSpec): LevelSpec => ({
  ...historical,
  preservedMoveTarget: adjustedMoveTargets[historical.id] ?? historical.preservedMoveTarget,
});

// Explicitly encode the two later v1.60 changes; no general field stripping or
// production repair helper can hide an unrelated gameplay change in this test.
const expectedCurrentLevel = (historical: LevelSpec): LevelSpec => {
  const expected = structuredClone(expectedAtAdoptionStage(historical));
  if (expected.id === 54) {
    delete expected.blocks.find(block => block.id === "s54-13-blue-axis")!.movementAxis;
  }
  if (expected.id === 56) {
    delete expected.blocks.find(block => block.id === "s56-o2")!.movementAxis;
    expected.blocks.find(block => block.id === "s56-o1")!.movementAxis = "horizontal";
  }
  return expected;
};

describe("51–60 v1.53 adoption, v1.60 axis repairs and v1.94 star targets", () => {
  it("preserves the historical fixture and binds all ten IDs at the correct adoption stage", () => {
    expect(createHash("sha256").update(fixtureBytes).digest("hex"))
      .toBe("6fcafae7e7a949dba28c210c44e7aeebc74d8fbdcf23c212d24b2c1f36cc4c33");
    expect(fixture.ruleVersion).toBe("1.53.0");
    expect(fixture.inheritedContract).toBe("v1.51.0-for-51-60");
    expect(fixture.formalAdopted).toBe(true);
    expect(fixture.formalAdoptedIds).toEqual(acceptedIds);
    expect(fixture.rows.map(row => row.id)).toEqual(acceptedIds);
    expect(REMADE_51_60_IDS).toEqual(acceptedIds);
    expect(LEVELS).toHaveLength(200);

    const stage = LEVELS_BEFORE_51_60_REMAKE.map(applyRemake51to60);
    for (const [index, level] of LEVELS.entries()) {
      expect(level.id).toBe(index + 1);
      expect(getLevelStrict(index + 1)).toBe(level);
      expect(stage[index]).toBe(LEVELS_BEFORE_91_100_REMAKE[index]);
      if (acceptedIds.includes(level.id)) {
        const historical = fixture.rows.find(row => row.id === level.id)!.level;
        expect(stage[index]).toEqual(expectedAtAdoptionStage(historical));
        expect(stage[index]).not.toBe(LEVELS_BEFORE_51_60_REMAKE[index]);
        if (![54, 56].includes(level.id)) expect(stage[index]).toBe(level);
      } else {
        expect(stage[index]).toBe(LEVELS_BEFORE_51_60_REMAKE[index]);
      }
    }
  });

  it("does not change the first 30 at this adoption stage and keeps level 5 legacy rotations", () => {
    for (let index = 0; index < 30; index += 1) {
      expect(LEVELS_BEFORE_91_100_REMAKE[index]).toBe(LEVELS_BEFORE_51_60_REMAKE[index]);
    }
    expect(getLevelStrict(5)).toEqual(baseline.levels[4]!.level);
    const rotated = getLevelStrict(5).blocks.filter(block => (
      (matchFormalBlockShapeForLevel(block.shape, 5)?.quarterTurns ?? 0) !== 0
    ));
    expect(rotated).toHaveLength(3);
    // Native-only drawing must stay scoped to adopted IDs; protected level 5 keeps legacy support.
    for (const block of rotated) {
      expect(matchFormalBlockShapeForLevel(block.shape, 5)).toBeDefined();
      for (const id of acceptedIds) expect(matchFormalBlockShapeForLevel(block.shape, id)).toBeUndefined();
    }
  });

  it("retains exactly the approved level 54 removal and level 56 axis transfer", () => {
    const historical54 = fixture.rows.find(row => row.id === 54)!.level;
    const historical56 = fixture.rows.find(row => row.id === 56)!.level;
    expect(historical54.blocks.find(block => block.id === "s54-13-blue-axis")!.movementAxis).toBe("horizontal");
    expect(historical56.blocks.find(block => block.id === "s56-o2")!.movementAxis).toBe("horizontal");
    expect(historical56.blocks.find(block => block.id === "s56-o1")!.movementAxis).toBeUndefined();
    expect(getLevelStrict(54)).toEqual(expectedCurrentLevel(historical54));
    expect(getLevelStrict(56)).toEqual(expectedCurrentLevel(historical56));
  });

  for (const row of fixture.rows) {
    it(`Lv${row.id} preserves its exact reviewed gameplay and replays the current complete route`, () => {
      const level = getLevelStrict(row.id);
      const before = baseline.levels[row.id - 1]!;
      expect(level).toEqual(expectedCurrentLevel(row.level));
      expect(() => validateLevel(level)).not.toThrow();
      for (const key of ["width", "height", "playable", "blocked", "seams", "id", "name", "timeSeconds", "reward", "parMoves"] as const) {
        expect(level[key], `preserved ${key}`).toEqual(before.level[key]);
      }
      expect(levelStarTargets(level)).toEqual({
        ...before.starTargets,
        moveTarget: adjustedMoveTargets[row.id] ?? before.starTargets.moveTarget,
      });
      expect(levelStarTargets(level).timeTargetSeconds).toBe(timeTargets[row.id]);
      expect(level.difficulty).toBe(difficulty[row.id]);
      expect(level.mechanismRules).toBe("revised-2026-09-23-v1.4");
      for (const block of level.blocks) {
        expect(matchFormalBlockShapeForLevel(block.shape, level.id)?.quarterTurns, block.id).toBe(0);
      }

      const [min, max] = bounds[level.difficulty]!;
      expect(row.upperBound).toBeLessThanOrEqual(max);
      if (row.id === 58) {
        expect(row.lowerBound).toBeNull();
        expect(row.exception).toBe("user-waived-below-11-floor");
      } else if (row.id === 59) {
        expect(row.lowerBound).toBeNull();
        expect(row.lowerBoundValidated).toBe(false);
        expect(row.exception).toBe("user-direct-write-lower-bound-unverified");
        expect(row.adoptionStatus).toBe("USER_DIRECT_WRITE_LOWER_BOUND_UNVERIFIED");
        expect(row.upperBound).toBe(20);
      } else {
        expect(row.exception).toBeNull();
        expect(row.lowerBound).toBeGreaterThanOrEqual(min);
        expect(row.lowerBound).toBeLessThanOrEqual(row.upperBound);
      }
      // These bounds remain historical metadata. In particular, this route test
      // does not recertify floors after the v1.60 axis repairs to 54 and 56.
      // Fresh lower-bound and natural-clock Pointer evidence stay separate.
      expect(row.drags).toHaveLength(row.totalDrags);
      expect(replayRevisedRoute(level, row.drags)).toMatchObject({
        valid: true,
        complete: true,
        effectiveDrags: row.totalDrags,
        nonClearingDrags: row.upperBound,
      });
    });

    it(`Lv${row.id} awards stars at the inclusive targets and rejects excess moves or time`, () => {
      const level = getLevelStrict(row.id);
      const { moveTarget, timeTargetSeconds } = levelStarTargets(level);
      expect(evaluateLevelStars(level, { moves: moveTarget, elapsedSeconds: timeTargetSeconds }))
        .toMatchObject({ moveAchieved: true, timeAchieved: true, earnedStars: 3 });
      expect(evaluateLevelStars(level, { moves: moveTarget + 1, elapsedSeconds: timeTargetSeconds }))
        .toMatchObject({ moveAchieved: false, timeAchieved: true, earnedStars: 2 });
      expect(evaluateLevelStars(level, { moves: moveTarget, elapsedSeconds: timeTargetSeconds + 0.001 }))
        .toMatchObject({ elapsedSeconds: timeTargetSeconds + 1, moveAchieved: true, timeAchieved: false, earnedStars: 2 });
      expect(evaluateLevelStars(level, { moves: moveTarget + 1, elapsedSeconds: timeTargetSeconds + 0.001 }))
        .toMatchObject({ moveAchieved: false, timeAchieved: false, earnedStars: 1 });
      expect(row.totalDrags).toBeLessThanOrEqual(moveTarget);
      if (adjustedMoveTargets[row.id] !== undefined) {
        expect(row.totalDrags).toBe(adjustedMoveTargets[row.id]);
        expect(row.totalDrags).toBeGreaterThan(levelStarTargets(row.level).moveTarget);
      }
    });
  }

  it("keeps key-lock teaching in level 60 and does not introduce it into earlier accepted remakes", () => {
    for (const id of acceptedIds.filter(id => id < 60)) {
      expect(getLevelStrict(id).blocks.some(block => block.keyId || block.lockedBy)).toBe(false);
    }
    const row = fixture.rows.find(candidate => candidate.id === 60)!;
    const keys = row.level.blocks.filter(block => block.keyId);
    const locks = row.level.blocks.filter(block => block.lockedBy);
    expect(keys).toHaveLength(1);
    expect(locks).toHaveLength(1);
    expect(locks[0]!.lockedBy).toBe(keys[0]!.keyId);
    expect(locks[0]!.lockCount).toBe(1);
    const release = row.drags.findIndex(drag => drag.blockId === keys[0]!.id && drag.exitSide);
    const firstLockMove = row.drags.findIndex(drag => drag.blockId === locks[0]!.id);
    expect(release).toBeGreaterThanOrEqual(0);
    expect(firstLockMove).toBeGreaterThan(release);
  });
});
