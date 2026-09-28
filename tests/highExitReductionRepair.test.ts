// @ts-expect-error The app tsconfig intentionally excludes Node ambient types; Vitest still runs in Node.
import { createHash } from "node:crypto";
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
const SELECTIONS = JSON.parse(readFileSync(new URL(
  "../playtest-results/experiments/high-exit-reduction/selected-candidates.json",
  import.meta.url,
), "utf8")) as JsonRecord;
const BATCH_02_SELECTIONS = JSON.parse(readFileSync(new URL(
  "../playtest-results/experiments/high-exit-reduction-batch-02/selected-candidates.json",
  import.meta.url,
), "utf8")) as JsonRecord;

const EVIDENCE = [
  {
    path: "../playtest-results/experiments/high-exit-reduction/report.json",
    sha256: "A834EF394595C61C29D54F29310E65FE80562BB8077E651D8199199C1F436F13",
  },
  {
    path: "../playtest-results/experiments/high-exit-reduction/selected-candidates.json",
    sha256: "AB17DD0A9F522231153B214E744E8EE69487C159CD99BDCF9E8EE5DF22ED6D14",
  },
  {
    path: "../playtest-results/experiments/high-exit-reduction/attempts.jsonl",
    sha256: "9B4E448CC58583728A8F37E255679E31077515299D57AFE1FF48B144C5650A9C",
  },
] as const;
const BATCH_02_EVIDENCE = [
  {
    path: "../playtest-results/experiments/high-exit-reduction-batch-02/report.json",
    sha256: "838B18B7C8D819924F6E81B8CB53D859CD30013E455983086BE8B174A91B98B7",
  },
  {
    path: "../playtest-results/experiments/high-exit-reduction-batch-02/selected-candidates.json",
    sha256: "F2C30D81E1EB2CE9A25C0AEB7B129AECE337322A964BC404689161811D60A034",
  },
  {
    path: "../playtest-results/experiments/high-exit-reduction-batch-02/lv073-c813-certificate.json",
    sha256: "EFC3D5639339E0F3C9ABD40612198F46BACEA993CA81D212C4E23068DCFC5CEB",
  },
] as const;

const EXPECTED = new Map<number, JsonRecord>([
  [50, { source: "3A17CDC6118F830E89273D7C8DE8F65805E810EE6EA93E3CB2D0A32A6CF86688", target: "6C590CB0EC335C16D6466ACFBEE5FD2F8D5CBDC637A2C12FE1B3A06629BBDFE8", exploredStates: 50, drags: 19, clearLoad: 13, overhead: 6, gridSteps: 49, turns: 0, reduction: 1 }],
  [71, { source: "0C07611802FB0274965303579AFA086FACAE1940B8D5C12145B717F30C71C16F", target: "5934136916D60F1ED5E29E7BBFF59A1B1960020F66755DAF53D57F890C590787", exploredStates: 116, drags: 33, clearLoad: 26, overhead: 7, gridSteps: 152, turns: 18, reduction: 2 }],
  [73, { source: "9B987FDB4EB77D8AF8B72A8EF538C6D14C345D8E77B8E8B672009B5CC1A2E3FF", target: "AB893963815B53AC11A5DCE64534C907CA18E2CFE5E094E65FA97C0F45D9EC7F", exploredStates: 91_073, drags: 81, clearLoad: 30, overhead: 51, gridSteps: 189, turns: 14, reduction: 6, maxStates: 120_000 }],
  [75, { source: "7D79FA452534DC3E17367EC75603B991D548ABD6C5F1FFE394BCD8328682153A", target: "8CC8864F888DC0F3F2DABFC6F1EF182F835FB7247EE2C9D5C22CB48BDA2A94D4", exploredStates: 9_662, drags: 45, clearLoad: 26, overhead: 19, gridSteps: 204, turns: 25, reduction: 2 }],
]);

const sha256 = (value: string | Uint8Array): string => createHash("sha256").update(value).digest("hex").toUpperCase();

const openingSameColorComponentMaximum = (level: NonNullable<(typeof LEVELS)[number]>): number => {
  const queued = new Set((level.generators ?? []).flatMap((generator) => generator.queueBlockIds));
  const shutterById = new Map((level.shutters ?? []).map((shutter) => [shutter.id, shutter]));
  const blocks = level.blocks.filter((block) => {
    if (queued.has(block.id)) return false;
    const shutter = block.shutterId ? shutterById.get(block.shutterId) : undefined;
    return !shutter || shutter.count <= 0;
  });
  const cells = new Map(blocks.map((block) => [
    block.id,
    block.shape.map(([dx, dy]) => [block.x + dx, block.y + dy] as const),
  ]));
  const contacts = new Map(blocks.map(({ id }) => [id, new Set<string>()]));
  for (let leftIndex = 0; leftIndex < blocks.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < blocks.length; rightIndex += 1) {
      const left = blocks[leftIndex];
      const right = blocks[rightIndex];
      if ((left.layers?.[0] ?? left.color) !== (right.layers?.[0] ?? right.color)) continue;
      const touches = cells.get(left.id)!.some(([leftX, leftY]) => cells.get(right.id)!.some(
        ([rightX, rightY]) => Math.abs(leftX - rightX) + Math.abs(leftY - rightY) === 1,
      ));
      if (!touches) continue;
      contacts.get(left.id)!.add(right.id);
      contacts.get(right.id)!.add(left.id);
    }
  }
  const unseen = new Set(blocks.map(({ id }) => id));
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

const auditByLevel = new Map<number, JsonRecord>(
  (AUDIT.high_exit_reduction_runtime_repairs as JsonRecord[] ?? []).map((repair) => [repair.level_id, repair]),
);
const selectionByLevel = new Map<number, JsonRecord>(
  [...SELECTIONS.candidates, ...BATCH_02_SELECTIONS.candidates]
    .map((candidate) => [candidate.level_id, candidate]),
);

describe("solver-certified minimum high-exit reductions", () => {
  it("locks the accepted evidence and publishes only Lv50/Lv71/Lv73/Lv75", () => {
    for (const evidence of [...EVIDENCE, ...BATCH_02_EVIDENCE]) {
      const raw = readFileSync(new URL(evidence.path, import.meta.url));
      expect(sha256(raw)).toBe(evidence.sha256);
    }
    expect(AUDIT.inputs.high_exit_reduction_evidence).toEqual(EVIDENCE.map(({ path, sha256: hash }) => ({
      path: path.replace(/^\.\.\//, ""),
      sha256: hash,
    })));
    expect(AUDIT.inputs.high_exit_reduction_batch_02_evidence).toEqual(BATCH_02_EVIDENCE.map(({ path, sha256: hash }) => ({
      path: path.replace(/^\.\.\//, ""),
      sha256: hash,
    })));
    expect(AUDIT.summary.high_exit_reduction_runtime_repair_level_ids).toEqual([50, 71, 73, 75]);
    expect([...auditByLevel.keys()]).toEqual([50, 71, 73, 75]);
    expect(auditByLevel.has(48)).toBe(false);
    expect(auditByLevel.has(68)).toBe(false);

    for (const [levelId, expected] of EXPECTED) {
      const level = LEVELS.find(({ id }) => id === levelId)!;
      const repair = auditByLevel.get(levelId)!;
      const selected = selectionByLevel.get(levelId)!;
      expect(() => validateLevel(level)).not.toThrow();
      expect(sha256(JSON.stringify(level))).toBe(expected.target);
      expect(repair).toMatchObject({
        level_id: levelId,
        repair_type: "minimum_exit_count_reduction_exception_for_eight_unique_colors",
        source_level_spec_sha256: expected.source,
        target_level_spec_sha256: expected.target,
        source_field_assertions_passed: true,
        target_record_sha256_verified: true,
        campaign_projection_applied: levelId === 71,
        mechanism_count_delta: selected.mechanism_count_delta,
        minimum_exit_record_reduction: expected.reduction,
        minimum_exit_record_reduction_verified: true,
        exit_count: 8,
        unique_exit_color_count: 8,
        opening_same_color_component_maximum: 2,
        solver_and_replay: {
          explored_states: expected.exploredStates,
          minimum_drags: expected.drags,
          clear_load: expected.clearLoad,
          reposition_overhead: expected.overhead,
          puzzle_model_replay: { ok: true, moves: expected.drags, cleared: expected.clearLoad },
        },
      });
      expect(repair.operation).toEqual(selected.operation);
      expect(repair.recolor.layer_changes).toEqual(selected.recolor.layer_changes);
      expect(repair.recolor.exit_changes).toEqual(selected.recolor.exit_changes);
      expect(repair.mechanism_counts_before.exits - repair.mechanism_counts_after.exits).toBe(expected.reduction);
      expect(repair.mechanism_counts_after.exits).toBe(8);
      const exits = [...level.gates, ...(level.flipDoors ?? [])];
      expect(exits).toHaveLength(8);
      expect(new Set(exits.map(({ color }) => color)).size).toBe(8);
      expect(openingSameColorComponentMaximum(level)).toBeLessThanOrEqual(2);
    }
  });

  it("fresh-solves and fully replays every accepted reduction", () => {
    for (const [levelId, expected] of EXPECTED) {
      const level = LEVELS.find(({ id }) => id === levelId)!;
      const result = solveLevelForValidation(level, expected.maxStates ?? 20_000);
      expect(result).toMatchObject({
        solved: true,
        termination: "solved",
        unsupportedReasons: [],
        staticUnsatReasons: [],
        exploredStates: expected.exploredStates,
        minimumDrags: expected.drags,
        clearLoad: expected.clearLoad,
        repositionOverhead: expected.overhead,
        gridSteps: expected.gridSteps,
        turns: expected.turns,
      });
      const model = new PuzzleModel(level);
      for (const drag of result.drags) {
        model.beginAction();
        for (const [x, y] of drag.path) expect(model.moveBlockStep(drag.blockId, x, y)).toBe(true);
        if (drag.exitSide) expect(model.tryExit(drag.blockId, drag.exitSide).ok).toBe(true);
        expect(model.commitAction()).toBe(true);
      }
      expect(model.snapshot()).toMatchObject({
        complete: true,
        blocks: [],
        queuedBlocks: [],
        moves: expected.drags,
      });
    }
  }, 180_000);
});
