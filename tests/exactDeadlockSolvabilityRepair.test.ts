// @ts-expect-error The app tsconfig intentionally excludes Node ambient types; Vitest still runs in Node.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { LEVELS } from "../src/core/levels";
import { PuzzleModel, validateLevel } from "../src/core/PuzzleModel";
import { solveLevelForValidation } from "../src/core/levelSolver";

type JsonRecord = Record<string, any>;

const AUDIT = JSON.parse(readFileSync(new URL(
  "../playtest-results/experiments/video-parity-v8/direct-data-build-audit.json",
  import.meta.url,
), "utf8")) as JsonRecord;

const openingSameColorComponentMaximum = (level: NonNullable<(typeof LEVELS)[number]>): number => {
  const hidden = new Set([
    ...(level.generators ?? []).flatMap((generator) => generator.queueBlockIds),
    ...(level.shutters ?? [])
      .filter((shutter) => shutter.count > 0)
      .flatMap((shutter) => shutter.triggerBlockIds ?? []),
  ]);
  const blocks = level.blocks.filter((block) => !hidden.has(block.id));
  const cells = new Map(blocks.map((block) => [
    block.id,
    block.shape.map(([dx, dy]) => [block.x + dx, block.y + dy] as const),
  ]));
  const contacts = new Map(blocks.map((block) => [block.id, new Set<string>()]));
  for (let index = 0; index < blocks.length; index += 1) {
    const left = blocks[index];
    for (let otherIndex = index + 1; otherIndex < blocks.length; otherIndex += 1) {
      const right = blocks[otherIndex];
      if ((left.layers?.[0] ?? left.color) !== (right.layers?.[0] ?? right.color)) continue;
      const touches = cells.get(left.id)!.some(([leftX, leftY]) => cells.get(right.id)!.some(
        ([rightX, rightY]) => Math.abs(leftX - rightX) + Math.abs(leftY - rightY) === 1,
      ));
      if (!touches) continue;
      contacts.get(left.id)!.add(right.id);
      contacts.get(right.id)!.add(left.id);
    }
  }
  const unseen = new Set(blocks.map((block) => block.id));
  let maximum = 0;
  while (unseen.size) {
    const first = unseen.values().next().value!;
    unseen.delete(first);
    const queue = [first];
    let size = 0;
    while (queue.length) {
      const id = queue.shift()!;
      size += 1;
      for (const next of contacts.get(id)!) if (unseen.delete(next)) queue.push(next);
    }
    maximum = Math.max(maximum, size);
  }
  return maximum;
};

const exactRepairAuditByLevel = new Map<number, JsonRecord>(
  (AUDIT.exact_deadlock_runtime_repairs as JsonRecord[]).map((repair) => [repair.level_id, repair]),
);

describe("solver-certified exact deadlock repairs", () => {
  it("publishes the exact Lv8/Lv18/Lv76 patches and their audit evidence", () => {
    const lv8 = LEVELS.find((level) => level.id === 8)!;
    expect(lv8.gates.find((gate) => gate.id === "vp-008-gate-03")).toMatchObject({ side: "right", offset: 5, size: 3, color: "cyan" });
    expect(lv8.gates.find((gate) => gate.id === "vp-008-gate-04")).toMatchObject({ side: "bottom", offset: 1, size: 3, color: "purple" });
    expect(lv8.blocks.find((block) => block.id === "cc-piece-14")?.color).toBe("green");
    expect(lv8.blocks.find((block) => block.id === "cc-piece-16")?.color).toBe("blue");

    const lv18 = LEVELS.find((level) => level.id === 18)!;
    expect(lv18.gates.map(({ id, side, offset, size, color, frozen }) => ({ id, side, offset, size, color, frozen }))).toEqual([
      { id: "vp-018-gate-01", side: "bottom", offset: 1, size: 2, color: "blue", frozen: undefined },
      { id: "vp-018-gate-02", side: "left", offset: 3, size: 1, color: "cyan", frozen: undefined },
      { id: "vp-018-gate-03", side: "right", offset: 5, size: 1, color: "green", frozen: undefined },
      { id: "vp-018-gate-04", side: "top", offset: 3, size: 2, color: "red", frozen: 1 },
      { id: "vp-018-gate-05", side: "left", offset: 4, size: 2, color: "yellow", frozen: 7 },
      { id: "vp-018-gate-06", side: "right", offset: 0, size: 3, color: "pink", frozen: 12 },
    ]);
    expect(Object.fromEntries(["strategy-guard-06", "cc-piece-10", "cc-piece-11", "cc-piece-12", "strategy-guard-15"]
      .map((id) => [id, lv18.blocks.find((block) => block.id === id)?.color]))).toEqual({
      "strategy-guard-06": "blue",
      "cc-piece-10": "blue",
      "cc-piece-11": "blue",
      "cc-piece-12": "blue",
      "strategy-guard-15": "yellow",
    });

    const lv76 = LEVELS.find((level) => level.id === 76)!;
    expect(lv76.gates.slice(1).map(({ id, side, offset, size, color }) => ({ id, side, offset, size, color }))).toEqual([
      { id: "vp-076-gate-02", side: "top", offset: 2, size: 3, color: "red" },
      { id: "vp-076-gate-03", side: "right", offset: 6, size: 3, color: "orange" },
      { id: "vp-076-gate-04", side: "right", offset: 0, size: 3, color: "pink" },
    ]);
    const lv76Blocks = new Map(lv76.blocks.map((block) => [block.id, block]));
    expect(Object.fromEntries(["cc-076-b1-02", "cc-076-b1-05", "cc-076-b1-08", "cc-076-b1-10", "cc-076-b1-11", "cc-076-b1-13"]
      .map((id) => [id, lv76Blocks.get(id)?.color]))).toEqual({
      "cc-076-b1-02": "orange",
      "cc-076-b1-05": "orange",
      "cc-076-b1-08": "red",
      "cc-076-b1-10": "red",
      "cc-076-b1-11": "orange",
      "cc-076-b1-13": "red",
    });
    expect(Object.fromEntries(["cc-076-b1-03", "cc-076-b1-05", "cc-076-b1-06", "cc-076-b1-09", "cc-076-b1-10", "cc-076-b1-12", "cc-076-b1-14", "cc-076-b1-15", "cc-076-b1-16"]
      .map((id) => [id, lv76Blocks.get(id)?.frozen]))).toEqual({
      "cc-076-b1-03": 5,
      "cc-076-b1-05": 5,
      "cc-076-b1-06": 5,
      "cc-076-b1-09": 5,
      "cc-076-b1-10": 8,
      "cc-076-b1-12": 5,
      "cc-076-b1-14": 14,
      "cc-076-b1-15": 14,
      "cc-076-b1-16": 5,
    });
    expect(Object.hasOwn(lv76Blocks.get("cc-076-b1-07")!, "frozen")).toBe(false);
    expect(Object.hasOwn(lv76Blocks.get("cc-076-b1-11")!, "frozen")).toBe(false);

    expect(AUDIT.summary.exact_deadlock_runtime_repair_level_ids).toEqual([8, 18, 76]);
    for (const level of [lv8, lv18, lv76]) {
      expect(() => validateLevel(level)).not.toThrow();
      const exits = [...level.gates, ...(level.flipDoors ?? [])];
      expect(new Set(exits.map((exit) => exit.color)).size).toBe(exits.length);
      expect(openingSameColorComponentMaximum(level)).toBeLessThanOrEqual(2);
      expect(exactRepairAuditByLevel.get(level.id)).toMatchObject({
        level_id: level.id,
        source_field_assertions_passed: true,
        exit_colors_unique: true,
        opening_same_color_component_maximum: 2,
        solver_and_replay: {
          termination: "solved",
          puzzle_model_replay: { passed: true, complete: true, remaining_blocks: 0, queued_blocks: 0 },
        },
      });
      expect(exactRepairAuditByLevel.get(level.id)?.evidence).toHaveLength(3);
    }
  });

  it("re-solves all three repaired levels and completes a fresh PuzzleModel replay", () => {
    const expected = new Map([
      [8, { exploredStates: 15_880, minimumDrags: 39, clearLoad: 25, repositionOverhead: 14, gridSteps: 159, turns: 19 }],
      [18, { exploredStates: 55, minimumDrags: 19, clearLoad: 16, repositionOverhead: 3, gridSteps: 68, turns: 12 }],
      [76, { exploredStates: 19, minimumDrags: 18, clearLoad: 18, repositionOverhead: 0, gridSteps: 83, turns: 9 }],
    ]);
    for (const [levelId, metrics] of expected) {
      const level = LEVELS.find(({ id }) => id === levelId)!;
      const result = solveLevelForValidation(level, 20_000);
      expect(result).toMatchObject({
        solved: true,
        termination: "solved",
        unsupportedReasons: [],
        staticUnsatReasons: [],
        ...metrics,
      });
      const model = new PuzzleModel(level);
      for (const drag of result.drags) {
        for (const [x, y] of drag.path) expect(model.moveBlockStep(drag.blockId, x, y)).toBe(true);
        if (drag.exitSide) expect(model.tryExit(drag.blockId, drag.exitSide).ok).toBe(true);
      }
      expect(model.snapshot()).toMatchObject({ complete: true, blocks: [], queuedBlocks: [] });
    }
  }, 90_000);
});
