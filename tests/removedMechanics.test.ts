import { describe, expect, it } from "vitest";
import { LEVELS } from "../src/core/levels";
import { validateLevel } from "../src/core/PuzzleModel";
import type { LevelSpec } from "../src/core/types";
import originalLevelsRaw from "../deliverables/original-levels/blockout-original-levels-101-120.json?raw";
import completedLevelsRaw from "../deliverables/original-levels/blockout-original-levels-101-120-completed.json?raw";
import alignedLevelsRaw from "../deliverables/original-levels/blockout-original-levels-101-105-benchmark-aligned.json?raw";
import trialLevelsRaw from "../deliverables/original-levels/blockout-original-levels-101-105-trial.json?raw";

const REMOVED_MECHANISMS = ["钥匙方块", "钥匙与锁", "双向箭头方块"] as const;
const ORIGINAL_LEVEL_FILES = [
  ["blockout-original-levels-101-120.json", originalLevelsRaw],
  ["blockout-original-levels-101-120-completed.json", completedLevelsRaw],
  ["blockout-original-levels-101-105-benchmark-aligned.json", alignedLevelsRaw],
  ["blockout-original-levels-101-105-trial.json", trialLevelsRaw],
] as const;

interface OriginalLevelRecord {
  level_id: number;
  mechanism?: string[];
  mechanism_config?: Record<string, unknown>;
  exits?: Array<Record<string, unknown>>;
  number_elements?: Array<Record<string, unknown>>;
}

describe("removed key-lock and arrow-block mechanics", () => {
  it("keeps removed mechanics out of every maintained original-level config", () => {
    const violations: string[] = [];
    for (const [relativePath, raw] of ORIGINAL_LEVEL_FILES) {
      const levels = JSON.parse(raw) as OriginalLevelRecord[];
      for (const level of levels) {
        for (const removed of REMOVED_MECHANISMS) {
          if (level.mechanism?.includes(removed) || Object.hasOwn(level.mechanism_config ?? {}, removed)) {
            violations.push(`${relativePath}:Lv${level.level_id}:${removed}`);
          }
        }
        for (const exit of level.exits ?? []) {
          for (const field of ["locked", "unlock_counter_id", "required_key"]) {
            if (Object.hasOwn(exit, field)) violations.push(`${relativePath}:Lv${level.level_id}:exit:${field}`);
          }
        }
        for (const element of level.number_elements ?? []) {
          if (element.role === "exit_lock") violations.push(`${relativePath}:Lv${level.level_id}:counter:exit_lock`);
          if (Object.hasOwn(element, "locks_exit_id")) violations.push(`${relativePath}:Lv${level.level_id}:counter:locks_exit_id`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it("does not expose removed mechanics in playable level names or tutorials", () => {
    const removedWording = /钥匙|箭头方块/;
    const violations = LEVELS.flatMap((level) => [
      { level: level.id, field: "name", text: level.name },
      { level: level.id, field: "feature-title", text: level.featureIntro?.title ?? "" },
      { level: level.id, field: "feature-description", text: level.featureIntro?.description ?? "" },
    ]).filter((entry) => removedWording.test(entry.text));
    expect(violations).toEqual([]);
  });

  it("keeps block and gate schemas free of key-link and axis-lock fields", () => {
    const allowedBlockFields = new Set(["id", "x", "y", "shape", "color", "layers", "frozen", "shutterId", "star"]);
    const allowedGateFields = new Set(["id", "side", "offset", "size", "color", "frozen", "star"]);
    const violations = LEVELS.flatMap((level) => [
      ...level.blocks.flatMap((block) => Object.keys(block)
        .filter((field) => !allowedBlockFields.has(field))
        .map((field) => `Lv${level.id}:block:${block.id}:${field}`)),
      ...level.gates.flatMap((gate) => Object.keys(gate)
        .filter((field) => !allowedGateFields.has(field))
        .map((field) => `Lv${level.id}:gate:${gate.id}:${field}`)),
    ]);
    expect(violations).toEqual([]);
  });

  it("keeps runtime identifiers free of retired key and arrow-block semantics", () => {
    const retiredId = /(?:^|[-_])(key|arrow-block|belt-lock)(?:$|[-_])/i;
    const violations = LEVELS.flatMap((level) => [
      ...level.blocks.filter((block) => retiredId.test(block.id)).map((block) => `Lv${level.id}:block:${block.id}`),
      ...level.gates.filter((gate) => retiredId.test(gate.id)).map((gate) => `Lv${level.id}:gate:${gate.id}`),
      ...(level.shutters ?? []).filter((shutter) => retiredId.test(shutter.id)).map((shutter) => `Lv${level.id}:shutter:${shutter.id}`),
      ...(level.conveyors ?? []).filter((conveyor) => retiredId.test(conveyor.id) || retiredId.test(conveyor.blockId))
        .map((conveyor) => `Lv${level.id}:conveyor:${conveyor.id}:${conveyor.blockId}`),
      ...(level.strategyNudge && retiredId.test(level.strategyNudge.blockId)
        ? [`Lv${level.id}:strategy:${level.strategyNudge.blockId}`]
        : []),
    ]);
    expect(violations).toEqual([]);
  });

  it("rejects legacy key-lock fields even when an old level bypasses TypeScript", () => {
    const base = LEVELS[0];
    const legacyGate = {
      ...base,
      gates: base.gates.map((gate, index) => index === 0 ? { ...gate, locked: true, required_key: "red-key" } : gate),
    } as unknown as LevelSpec;
    const legacyMechanism = {
      ...base,
      mechanism: ["钥匙与锁"],
      mechanism_config: { "钥匙与锁": { key: "A", lock: "X1" } },
    } as unknown as LevelSpec;

    expect(() => validateLevel(legacyGate)).toThrow(/retired key-lock\/arrow-block/);
    expect(() => validateLevel(legacyMechanism)).toThrow(/retired key-lock\/arrow-block/);
  });

  it("rejects legacy arrow-block movement restrictions instead of silently ignoring them", () => {
    const base = LEVELS[0];
    const legacyArrowBlock = {
      ...base,
      blocks: base.blocks.map((block, index) => index === 0
        ? { ...block, arrow_direction: "horizontal", allowedDirections: ["left", "right"] }
        : block),
    } as unknown as LevelSpec;

    expect(() => validateLevel(legacyArrowBlock)).toThrow(/retired key-lock\/arrow-block/);
  });
});
