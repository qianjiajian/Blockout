// @ts-expect-error The app tsconfig intentionally excludes Node ambient types; Vitest runs in Node.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  auditCompetitorMechanismCountContracts,
  extractCompetitorMechanismCountContracts,
} from "../src/core/competitorMechanismCountContract";
import { LEVELS_BEFORE_MECHANISM_ATTRIBUTE_REPAIR as LEVELS } from "../src/core/levels";
import {
  applyMechanismAttributeRepair,
  AXIS_ATTRIBUTE_BLOCKED_LEVEL_IDS,
  AXIS_ATTRIBUTE_REPAIR_LEVEL_IDS,
  COLORED_GRID_ATTRIBUTE_BLOCKED_LEVEL_IDS,
  LOCK_ATTRIBUTE_BLOCKED_LEVEL_IDS,
  LOCK_ATTRIBUTE_REPAIR_LEVEL_IDS,
  MECHANISM_ATTRIBUTE_REPAIR_LEVEL_IDS,
  NUMERIC_ICE_ATTRIBUTE_BLOCKED_LEVEL_IDS,
  NUMERIC_ICE_ATTRIBUTE_REPAIR_LEVEL_IDS,
} from "../src/core/mechanismAttributeRepairs";
import { validateLevel } from "../src/core/PuzzleModel";
import type { BlockSpec, LevelSpec } from "../src/core/types";

const TRUTH_PATHS = [
  new URL("../deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-truth-v6.json", import.meta.url),
  new URL("../deliverables/level-generation-blueprint/blockout-lv101-lv200-video-parity-truth-v1.json", import.meta.url),
] as const;

const contracts = TRUTH_PATHS.flatMap((path) => extractCompetitorMechanismCountContracts(
  JSON.parse(readFileSync(path, "utf8").replace(/^\uFEFF/, "")),
));

const scopedFields = new Set([
  "numericIceCount",
  "numericIceValues",
  "axisBlockCount",
  "keyCount",
  "lockCount",
  "lockRequirements",
  "starBlockCount",
  "bombCount",
  "rotationBadgeCount",
  "coloredGridCellCount",
]);

const withoutRepairableAttributes = (block: BlockSpec): Omit<
  BlockSpec,
  "frozen" | "movementAxis" | "keyId" | "lockedBy" | "lockCount"
> => {
  const {
    frozen: _frozen,
    movementAxis: _movementAxis,
    keyId: _keyId,
    lockedBy: _lockedBy,
    lockCount: _lockCount,
    ...rest
  } = block;
  return rest;
};

const playerFacingStructure = (level: LevelSpec) => ({
  ...level,
  blocks: level.blocks.map(withoutRepairableAttributes),
});

const issueKey = (issue: { levelId: number; field: string }) => `${issue.levelId}:${issue.field}`;

const sortedNumbers = (values: Iterable<number>) => [...values].sort((left, right) => left - right);

describe("same-numbered competitor mechanism attribute repairs", () => {
  it("repairs every solver-certified quantity and leaves only declared blockers", () => {
    const repaired = LEVELS.map(applyMechanismAttributeRepair);
    const beforeIssues = auditCompetitorMechanismCountContracts(LEVELS, contracts)
      .flatMap((record) => record.issues)
      .filter((issue) => scopedFields.has(issue.field) && issue.levelId !== 19 && issue.levelId !== 20);
    const afterIssues = auditCompetitorMechanismCountContracts(repaired, contracts)
      .flatMap((record) => record.issues)
      .filter((issue) => scopedFields.has(issue.field) && issue.levelId !== 19 && issue.levelId !== 20);

    const numericSafe = new Set<number>(NUMERIC_ICE_ATTRIBUTE_REPAIR_LEVEL_IDS);
    const axisSafe = new Set<number>(AXIS_ATTRIBUTE_REPAIR_LEVEL_IDS);
    const lockSafe = new Set<number>(LOCK_ATTRIBUTE_REPAIR_LEVEL_IDS);
    const safeIssues = afterIssues.filter((issue) => (
      (numericSafe.has(issue.levelId) && ["numericIceCount", "numericIceValues"].includes(issue.field))
      || (axisSafe.has(issue.levelId) && issue.field === "axisBlockCount")
      || (lockSafe.has(issue.levelId) && ["keyCount", "lockCount", "lockRequirements"].includes(issue.field))
    ));

    expect(beforeIssues.length).toBeGreaterThan(afterIssues.length);
    expect(safeIssues.map(issueKey), JSON.stringify(safeIssues, null, 2)).toEqual([]);
    expect(sortedNumbers(new Set(afterIssues
      .filter((issue) => ["numericIceCount", "numericIceValues"].includes(issue.field))
      .map((issue) => issue.levelId)))).toEqual([...NUMERIC_ICE_ATTRIBUTE_BLOCKED_LEVEL_IDS]);
    expect(sortedNumbers(new Set(afterIssues
      .filter((issue) => issue.field === "axisBlockCount")
      .map((issue) => issue.levelId)))).toEqual([...AXIS_ATTRIBUTE_BLOCKED_LEVEL_IDS]);
    expect(sortedNumbers(new Set(afterIssues
      .filter((issue) => ["lockCount", "lockRequirements"].includes(issue.field))
      .map((issue) => issue.levelId)))).toEqual([...LOCK_ATTRIBUTE_BLOCKED_LEVEL_IDS]);
    expect(sortedNumbers(new Set(afterIssues
      .filter((issue) => issue.field === "coloredGridCellCount")
      .map((issue) => issue.levelId)))).toEqual([...COLORED_GRID_ATTRIBUTE_BLOCKED_LEVEL_IDS]);
  });

  it("preserves block geometry, colour, layer, staging visibility, exits, shutters, and generators", () => {
    for (const levelId of MECHANISM_ATTRIBUTE_REPAIR_LEVEL_IDS) {
      const before = LEVELS.find((level) => level.id === levelId)!;
      const after = applyMechanismAttributeRepair(before);
      expect(playerFacingStructure(after), `Lv${levelId}`).toEqual(playerFacingStructure(before));
      expect(after.blocks.map((block) => block.id)).toEqual(before.blocks.map((block) => block.id));
      expect(after.gates).toEqual(before.gates);
      expect(after.flipDoors).toEqual(before.flipDoors);
      expect(after.shutters).toEqual(before.shutters);
      expect(after.generators).toEqual(before.generators);
      expect(() => validateLevel(after), `Lv${levelId}`).not.toThrow();
    }
  });

  it("uses the certified Lv156 ice binding and counts grouped Lv163 stars", () => {
    const lv156 = applyMechanismAttributeRepair(LEVELS.find((level) => level.id === 156)!);
    expect(lv156.blocks.filter((block) => block.frozen).map((block) => [block.id, block.frozen])).toEqual([
      ["lv156-opening-b01", 1],
      ["lv156-opening-b02", 1],
    ]);

    const lv163 = LEVELS.find((level) => level.id === 163)!;
    expect(lv163.blocks.filter((block) => block.star)).toHaveLength(2);
  });
});
