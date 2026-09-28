// @ts-expect-error The app tsconfig intentionally excludes Node ambient types; Vitest still runs in Node.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

type JsonRecord = Record<string, any>;

const TRUTH_PATH = new URL(
  "../deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-truth-v6.json",
  import.meta.url,
);
const V7_PATH = new URL(
  "../deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-design-contract-v7.json",
  import.meta.url,
);
const V8_PATH = new URL(
  "../deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-design-contract-v8.json",
  import.meta.url,
);

const TRUTH = JSON.parse(readFileSync(TRUTH_PATH, "utf8")) as JsonRecord;
const V7 = JSON.parse(readFileSync(V7_PATH, "utf8")) as JsonRecord;
const V8 = JSON.parse(readFileSync(V8_PATH, "utf8")) as JsonRecord;
const SHAPE_AREA: Record<string, number> = {
  SINGLE: 1,
  H2: 2,
  V2: 2,
  H3: 3,
  V3: 3,
  H4: 4,
  V4: 4,
  SQ2: 4,
  RECT2X3: 6,
  SQ3: 9,
  L3: 3,
  L4: 4,
  L5: 5,
  T4: 4,
  T5: 5,
  S4: 4,
  CROSS5: 5,
};

const records = (value: unknown): JsonRecord[] => Array.isArray(value) ? value as JsonRecord[] : [];
const histogramCount = (histogram: JsonRecord) => Object.values(histogram)
  .reduce((sum: number, count) => sum + Number(count), 0);
const histogramCells = (histogram: JsonRecord) => Object.entries(histogram)
  .reduce((sum, [shape, count]) => sum + SHAPE_AREA[shape] * Number(count), 0);
const addHistograms = (histograms: JsonRecord[]) => histograms.reduce((result, histogram) => {
  for (const [shape, count] of Object.entries(histogram)) result[shape] = (result[shape] ?? 0) + Number(count);
  return result;
}, {} as JsonRecord);
const isShapeHistogram = (value: unknown): value is JsonRecord => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const entries = Object.entries(value as JsonRecord);
  return entries.length > 0 && entries.every(([shape, count]) => shape in SHAPE_AREA && Number(count) > 0);
};

const expectTruthFacts = (actual: unknown, truth: unknown, label: string): void => {
  if (truth === "unclear") return;
  if (Array.isArray(truth)) {
    expect(actual, `${label} array`).toBeInstanceOf(Array);
    expect(actual as unknown[], `${label} length`).toHaveLength(truth.length);
    truth.forEach((entry, index) => expectTruthFacts((actual as unknown[])[index], entry, `${label}[${index}]`));
    return;
  }
  if (truth && typeof truth === "object") {
    expect(actual, `${label} object`).toBeTypeOf("object");
    if (isShapeHistogram(truth)) {
      expect(actual, `${label} exact shape histogram`).toEqual(truth);
      return;
    }
    for (const [key, value] of Object.entries(truth as JsonRecord)) {
      expectTruthFacts((actual as JsonRecord)[key], value, `${label}.${key}`);
    }
    return;
  }
  expect(actual, label).toEqual(truth);
};

const expectHistogramSize = (histogram: unknown, count: unknown, label: string) => {
  if (!histogram || typeof histogram !== "object" || Array.isArray(histogram) || !Number.isInteger(count)) return;
  expect(histogramCount(histogram as JsonRecord), label).toBe(count);
};

const expectMechanismClosure = (mechanisms: JsonRecord, label: string) => {
  const numericIce = mechanisms.numeric_ice as JsonRecord | undefined;
  if (numericIce) expectHistogramSize(numericIce.shape_histogram, numericIce.count, `${label}.numeric_ice`);
  const shells = mechanisms.shells as JsonRecord | undefined;
  if (shells) expectHistogramSize(shells.shape_histogram, shells.count, `${label}.shells`);
  const covers = mechanisms.covers as JsonRecord | undefined;
  if (covers) records(covers.hidden_batch_histograms).forEach((histogram, index) => {
    expectHistogramSize(histogram, covers.hidden_batch_counts[index], `${label}.covers[${index}]`);
  });
  const generators = mechanisms.generators as JsonRecord | undefined;
  if (generators) records(generators.queue_histograms).forEach((histogram, index) => {
    expectHistogramSize(histogram, generators.queue_lengths[index], `${label}.generators[${index}]`);
  });
  const axisBlocks = mechanisms.axis_blocks as JsonRecord | undefined;
  if (axisBlocks) {
    expectHistogramSize(axisBlocks.shape_histogram, axisBlocks.count, `${label}.axis_blocks`);
    if (axisBlocks.by_axis_shape) {
      const axisCount = Object.values(axisBlocks.by_axis_shape as JsonRecord)
        .reduce((sum: number, histogram) => sum + histogramCount(histogram as JsonRecord), 0);
      expect(axisCount, `${label}.axis_blocks.by_axis_shape`).toBe(axisBlocks.count);
    }
  }
  const keyLocks = mechanisms.key_locks as JsonRecord | undefined;
  if (keyLocks) {
    expectHistogramSize(keyLocks.key_shapes, keyLocks.key_count, `${label}.key_locks.keys`);
    expectHistogramSize(keyLocks.lock_shapes, keyLocks.lock_count, `${label}.key_locks.locks`);
  }
  for (const mechanismName of ["lifts", "staged_frames"]) {
    const mechanism = mechanisms[mechanismName] as JsonRecord | undefined;
    records(mechanism?.layers).forEach((layer, index) => {
      expectHistogramSize(layer.histogram, layer.count, `${label}.${mechanismName}[${index}]`);
    });
  }
  const stars = mechanisms.stars as JsonRecord | undefined;
  if (stars) expectHistogramSize(stars.shape_histogram, stars.count, `${label}.stars`);
};

describe("video parity design contract v8", () => {
  it("preserves all 100 v7 boards while restoring exact source compositions", () => {
    expect(V8.levels).toHaveLength(100);
    expect(V8.summary).toMatchObject({
      level_count: 100,
      runtime_sq3_count: 11,
      runtime_sq3_level_count: 8,
      runtime_rect2x3_replacement_piece_count: 0,
      solver_validated_level_count: 0,
    });

    for (let index = 0; index < 100; index += 1) {
      const truthLevel = TRUTH.levels[index] as JsonRecord;
      const v7Level = V7.levels[index] as JsonRecord;
      const v8Level = V8.levels[index] as JsonRecord;
      const target = v8Level.our_design_target as JsonRecord;
      const sourceHistogram = truthLevel.composition.source_full_shape_histogram as JsonRecord;
      expect(v8Level.level_id).toBe(truthLevel.level_id);
      expect(target.board, `${v8Level.level_id} board`).toEqual(v7Level.our_design_target.board);
      expect(target.time_seconds, `${v8Level.level_id} timer`).toBe(truthLevel.time_seconds);
      expect(target.full_level_block_count, `${v8Level.level_id} block count`).toBe(
        truthLevel.composition.source_full_piece_count,
      );
      expect(target.full_level_shape_histogram, `${v8Level.level_id} shape histogram`).toEqual(sourceHistogram);
      expect(histogramCount(target.full_level_shape_histogram), `${v8Level.level_id} histogram count`).toBe(
        target.full_level_block_count,
      );
      expect(target.full_level_occupied_cell_count, `${v8Level.level_id} occupied cells`).toBe(
        histogramCells(sourceHistogram),
      );
      expect(target.source_shape_replacements, `${v8Level.level_id} replacements`).toEqual([]);

      const truthStages = records(truthLevel.stage_seeds);
      const targetStages = records(target.stage_partitions);
      expect(targetStages.map((stage) => [stage.id, stage.kind, stage.count, stage.shape_histogram]), `${v8Level.level_id} stages`).toEqual(
        truthStages.map((stage, stageIndex) => [
          stage.id,
          stage.kind,
          stage.count,
          stage.shape_histogram ?? v7Level.our_design_target.stage_partitions[stageIndex].shape_histogram,
        ]),
      );
      expect(targetStages.reduce((sum, stage) => sum + Number(stage.count), 0), `${v8Level.level_id} stage count closure`).toBe(
        target.full_level_block_count,
      );
      expect(addHistograms(targetStages.map((stage) => stage.shape_histogram)), `${v8Level.level_id} stage shape closure`).toEqual(
        sourceHistogram,
      );
      expectTruthFacts(target.mechanism_contract, truthLevel.mechanisms, `${v8Level.level_id}.mechanisms`);
      expectMechanismClosure(target.mechanism_contract, `${v8Level.level_id}.mechanisms`);
    }
  });

  it("contains the exact 11 SQ3 pieces on the eight source levels", () => {
    const sq3Levels = records(V8.levels)
      .map((level) => [level.level_id, Number(level.our_design_target.full_level_shape_histogram.SQ3 ?? 0)] as const)
      .filter(([, count]) => count > 0);
    expect(sq3Levels).toEqual([
      ["Lv008", 1],
      ["Lv014", 1],
      ["Lv018", 1],
      ["Lv059", 1],
      ["Lv064", 1],
      ["Lv072", 1],
      ["Lv076", 3],
      ["Lv089", 2],
    ]);
    expect(sq3Levels.reduce((sum, [, count]) => sum + count, 0)).toBe(11);
  });

  it("retains every v7 unclear-field design fill", () => {
    for (let index = 0; index < 100; index += 1) {
      const truthLevel = TRUTH.levels[index] as JsonRecord;
      const v7Mechanisms = V7.levels[index].our_design_target.mechanism_contract as JsonRecord;
      const v8Mechanisms = V8.levels[index].our_design_target.mechanism_contract as JsonRecord;
      const truthCovers = truthLevel.mechanisms.covers as JsonRecord | undefined;
      if (!truthCovers) continue;
      const hiddenBatchCounts = Array.isArray(truthCovers.hidden_batch_counts)
        ? truthCovers.hidden_batch_counts as unknown[]
        : [];
      hiddenBatchCounts.forEach((value, batchIndex) => {
        if (value !== "unclear") return;
        expect(v8Mechanisms.covers.hidden_batch_counts[batchIndex], `${truthLevel.level_id} cover count fill`).toEqual(
          v7Mechanisms.covers.hidden_batch_counts[batchIndex],
        );
        expect(v8Mechanisms.covers.hidden_batch_histograms[batchIndex], `${truthLevel.level_id} cover shape fill`).toEqual(
          v7Mechanisms.covers.hidden_batch_histograms[batchIndex],
        );
      });
    }
  });
});
