// @ts-expect-error The app tsconfig intentionally excludes Node ambient types; Vitest still runs in Node.
import { createHash } from "node:crypto";
// @ts-expect-error The app tsconfig intentionally excludes Node ambient types; Vitest still runs in Node.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

type JsonRecord = Record<string, any>;
type Histogram = Record<string, number>;

const TRUTH_PATH = new URL(
  "../deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-truth-v6.json",
  import.meta.url,
);
const CONTRACT_PATH = new URL(
  "../deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-design-contract-v6.json",
  import.meta.url,
);
const STAGE_AUDIT_PATH = new URL(
  "../.codex-temp/video-parity-v6-stage-audit/stage-audit.json",
  import.meta.url,
);
const LV91_REAUDIT_PATH = new URL(
  "../.codex-temp/video-parity-v6-lv91-reaudit/audit.json",
  import.meta.url,
);
const SOURCE_REAUDIT_PATH = new URL(
  "../playtest-results/experiments/video-parity-v6/source-audit/capacity-chain-reaudit/corrections.json",
  import.meta.url,
);

const TRUTH_BYTES = readFileSync(TRUTH_PATH);
const TRUTH = JSON.parse(TRUTH_BYTES.toString("utf8")) as JsonRecord;
const CONTRACT = JSON.parse(readFileSync(CONTRACT_PATH, "utf8")) as JsonRecord;
const STAGE_AUDIT = JSON.parse(readFileSync(STAGE_AUDIT_PATH, "utf8")) as JsonRecord;
const LV91_REAUDIT = JSON.parse(readFileSync(LV91_REAUDIT_PATH, "utf8")) as JsonRecord;
const SOURCE_REAUDIT = JSON.parse(readFileSync(SOURCE_REAUDIT_PATH, "utf8")) as JsonRecord;

const TRUTH_LEVELS = TRUTH.levels as JsonRecord[];
const CONTRACT_LEVELS = CONTRACT.levels as JsonRecord[];
const truthByNumber = new Map(TRUTH_LEVELS.map((level) => [Number(level.level), level]));
const contractById = new Map(CONTRACT_LEVELS.map((level) => [String(level.level_id), level]));
const sourceReauditByLevel = new Map((SOURCE_REAUDIT.levels as JsonRecord[])
  .map((entry) => [Number(entry.level), entry]));

const OFFICIAL_COLORS = ["red", "yellow", "blue", "green", "purple", "orange", "cyan", "pink"];
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

const levelId = (level: number): string => `Lv${String(level).padStart(3, "0")}`;
const records = (value: any): JsonRecord[] => value as JsonRecord[];
const histogram = (value: any): Histogram => value as Histogram;

const normalizedHistogram = (value: Histogram): Histogram => Object.fromEntries(
  Object.entries(value)
    .filter(([, count]) => count !== 0)
    .sort(([left], [right]) => left.localeCompare(right)),
);

const histogramCount = (value: Histogram): number => (
  Object.values(value).reduce((sum, count) => sum + count, 0)
);

const histogramCells = (value: Histogram): number => Object.entries(value).reduce((sum, [shape, count]) => {
  const area = SHAPE_AREA[shape];
  if (area === undefined) throw new Error(`Unknown shape ${shape}`);
  return sum + area * count;
}, 0);

const addHistograms = (...values: Histogram[]): Histogram => normalizedHistogram(values.reduce<Histogram>(
  (result, value) => {
    for (const [shape, count] of Object.entries(value)) result[shape] = (result[shape] ?? 0) + count;
    return result;
  },
  {},
));

const runtimeHistogram = (source: Histogram): Histogram => {
  const result = { ...source };
  const sq3Count = result.SQ3 ?? 0;
  delete result.SQ3;
  if (sq3Count) result.RECT2X3 = (result.RECT2X3 ?? 0) + sq3Count;
  return normalizedHistogram(result);
};

const canonicalShape = (shape: unknown): string => {
  const aliases: Record<string, string> = {
    RECT3x2: "RECT2X3",
    RECT3X2: "RECT2X3",
    V2_numericIce: "V2",
    V3_numericIce: "V3",
  };
  const raw = String(shape);
  return aliases[raw] ?? raw.split("_")[0];
};

const itemHistogram = (items: JsonRecord[]): Histogram => addHistograms(...items.map((item) => ({
  [canonicalShape(item.shape)]: 1,
})));

const sortedNumbers = (values: any): number[] => [...values as number[]].sort((left, right) => left - right);

const expectedDirectStages = (raw: JsonRecord): JsonRecord[] => {
  const stages: JsonRecord[] = [{
    id: "opening",
    kind: "opening",
    count: raw.blocks.opening_count,
    shape_histogram: normalizedHistogram(histogram(raw.blocks.opening_shape_histogram)),
    provenance: "source_video_untouched_opening_fact",
  }];
  records(raw.blocks.hidden_batches ?? []).forEach((batch, index) => {
    const match = /^countdown_cover_(\d+)_?(.*)$/.exec(String(batch.stage));
    const observedRegion = index === 0 && raw.blocks.cover_region
      ? {
        x: raw.blocks.cover_region.x,
        y: raw.blocks.cover_region.y,
        width: raw.blocks.cover_region.width,
        height: raw.blocks.cover_region.height,
      }
      : null;
    stages.push({
      id: `cover-${index + 1}`,
      kind: "countdown_cover",
      trigger_value: match ? Number(match[1]) : null,
      position: observedRegion ?? (match?.[2] || null),
      source_stage_id: batch.stage,
      count: batch.count,
      shape_histogram: normalizedHistogram(histogram(batch.shape_histogram)),
      provenance: "source_fps_event_ledger_fact",
    });
  });
  return stages;
};

const expectedDirectMechanisms = (raw: JsonRecord, stages: JsonRecord[]): JsonRecord => {
  const source = raw.mechanisms as JsonRecord;
  const sourceStageToId = new Map(
    records(raw.blocks.hidden_batches ?? []).map((batch, index) => [String(batch.stage), `cover-${index + 1}`]),
  );
  const stageIdFor = (sourceStage: unknown): string | null => (
    sourceStage === "opening" ? "opening" : sourceStageToId.get(String(sourceStage)) ?? null
  );
  const result: JsonRecord = {
    directional_exits: {
      ordinary_count: source.directional_exit?.count ?? 0,
      frozen_values: source.frozen_exit?.values ?? [],
      star_count: 0,
      star_frozen_count: 0,
      star_frozen_values: [],
      star_mapping: null,
    },
  };

  const rawNumeric = source.numbered_ice_block as JsonRecord | undefined;
  const rawNumericItems = records(rawNumeric?.items ?? []);
  if (rawNumeric?.count) {
    const items = rawNumericItems.map((item) => ({
      value: item.value,
      shape: canonicalShape(item.shape),
      stage_id: stageIdFor(item.stage),
      source_core_color: item.core ?? null,
    }));
    const openingVisibleCount = items.filter((item) => item.stage_id === "opening").length;
    result.numeric_ice = {
      count: rawNumeric.count,
      values: items.map((item) => item.value),
      shape_histogram: itemHistogram(items),
      stage_scope: openingVisibleCount === 0
        ? "hidden_only"
        : openingVisibleCount < items.length ? "opening_and_hidden" : "opening_or_unspecified",
      post_melt_shell: rawNumericItems.filter((item) => String(item.post_thaw ?? "").startsWith("nested_shell")).length,
      opening_visible_count: openingVisibleCount,
      items,
      item_pairing_status: "source_frame_exact",
    };
  }

  const rawShell = source.nested_shell_block as JsonRecord | undefined;
  if (rawShell?.count) {
    const claimedNumeric = new Set<number>();
    const items = records(rawShell.items ?? []).map((item) => {
      let stageId = stageIdFor(item.stage);
      let requiresNumericIce = false;
      if (item.stage === "after_numeric_ice_thaw") {
        const matchIndex = rawNumericItems.findIndex((candidate, index) => (
          !claimedNumeric.has(index)
          && canonicalShape(candidate.shape) === canonicalShape(item.shape)
          && String(candidate.post_thaw ?? "").startsWith("nested_shell")
        ));
        if (matchIndex >= 0) {
          claimedNumeric.add(matchIndex);
          stageId = stageIdFor(rawNumericItems[matchIndex].stage);
          requiresNumericIce = true;
        }
      }
      return {
        shape: canonicalShape(item.shape),
        stage_id: stageId,
        extra_layers: rawShell.extra_layers_each ?? 1,
        requires_numeric_ice: requiresNumericIce,
        source_outer_color: item.outer ?? null,
        source_core_color: item.core ?? null,
      };
    });
    result.shells = {
      count: rawShell.count,
      opening_visible_count: items.filter((item) => item.stage_id === "opening").length,
      extra_layers: items.map((item) => item.extra_layers),
      shape_histogram: itemHistogram(items),
      items,
    };
  }

  const rawCovers = source.countdown_cover as JsonRecord | undefined;
  if (rawCovers?.count) {
    const coverStages = stages.filter((stage) => stage.kind === "countdown_cover");
    result.covers = {
      count: rawCovers.count,
      values: coverStages.map((stage) => stage.trigger_value),
      hidden_batch_counts: coverStages.map((stage) => stage.count),
      hidden_batch_histograms: coverStages.map((stage) => stage.shape_histogram),
      per_cover_partition_status: "source_observed_or_unique",
    };
  }
  return result;
};

const executableSq3Paths = (value: any, path = "target"): string[] => {
  if (Array.isArray(value)) {
    return value.flatMap((entry, index) => executableSq3Paths(entry, `${path}[${index}]`));
  }
  if (!value || typeof value !== "object") return value === "SQ3" ? [path] : [];
  return Object.entries(value).flatMap(([key, entry]) => {
    if (key.startsWith("source_")) return [];
    const nextPath = `${path}.${key}`;
    return [
      ...(key === "SQ3" ? [nextPath] : []),
      ...executableSq3Paths(entry, nextPath),
    ];
  });
};

const actualFirstAppearances = (levels: JsonRecord[]): JsonRecord => {
  const first = (predicate: (level: JsonRecord) => boolean): number | null => (
    levels.find(predicate)?.level ?? null
  );
  return {
    directional_exit: first((level) => level.mechanisms.directional_exits.ordinary_count > 0
      || level.mechanisms.directional_exits.frozen_values.length > 0),
    irregular_block: first((level) => level.mechanisms.irregular_blocks?.count > 0),
    frozen_exit: first((level) => level.mechanisms.directional_exits.frozen_values.length > 0),
    irregular_board: first((level) => level.board.playable_cell_count < level.board.rows * level.board.cols),
    numeric_ice: first((level) => level.mechanisms.numeric_ice?.count > 0),
    nested_shell: first((level) => level.mechanisms.shells?.count > 0),
    countdown_cover: first((level) => level.mechanisms.covers?.count > 0),
    move_generator: first((level) => level.mechanisms.generators?.trigger === "move"),
    axis_constrained_block: first((level) => level.mechanisms.axis_blocks?.count > 0),
    key_token: first((level) => level.mechanisms.key_locks?.key_count > 0),
    chain_lock: first((level) => level.mechanisms.key_locks?.lock_count > 0),
    lift: first((level) => level.mechanisms.lifts?.count > 0),
    timed_feeder: first((level) => level.mechanisms.generators?.trigger === "time"),
    staged_frame: first((level) => level.mechanisms.staged_frames?.count > 0),
    star_block: first((level) => level.mechanisms.stars?.count > 0),
    star_exit: first((level) => level.mechanisms.directional_exits.star_count > 0),
  };
};

const verifyMechanismItemLedgers = (
  label: string,
  mechanisms: JsonRecord,
  stages: JsonRecord[],
): void => {
  const stageById = new Map(stages.map((stage) => [String(stage.id), stage]));
  const itemStage = (item: JsonRecord): JsonRecord | undefined => (
    item.stage_id === "lift-layer-1" ? stageById.get("opening") : stageById.get(String(item.stage_id))
  );
  const assertItemsFitStages = (kind: string, items: JsonRecord[]): void => {
    const counts = new Map<string, number>();
    for (const item of items) {
      const stage = itemStage(item);
      expect(stage, `${label} ${kind} item stage ${String(item.stage_id)}`).toBeDefined();
      const key = `${String(stage?.id)}:${canonicalShape(item.shape)}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    for (const [key, count] of counts) {
      const separator = key.indexOf(":");
      const stage = stageById.get(key.slice(0, separator));
      const shape = key.slice(separator + 1);
      expect(histogram(stage?.shape_histogram)[shape] ?? 0, `${label} ${kind} carriers at ${key}`).toBeGreaterThanOrEqual(count);
    }
  };

  const numeric = mechanisms.numeric_ice as JsonRecord | undefined;
  const numericItems = records(numeric?.items ?? []);
  if (numericItems.length) {
    expect(numericItems, `${label} numeric item count`).toHaveLength(numeric?.count);
    expect(itemHistogram(numericItems), `${label} numeric item shapes`).toEqual(
      normalizedHistogram(histogram(numeric?.shape_histogram)),
    );
    expect(sortedNumbers(numericItems.map((item) => item.value)), `${label} numeric item values`).toEqual(
      sortedNumbers(numeric?.values),
    );
    const openingCount = numericItems.filter((item) => (
      item.stage_id === "opening" || item.stage_id === "lift-layer-1"
    )).length;
    expect(numeric?.opening_visible_count, `${label} numeric opening count`).toBe(openingCount);
    expect(numeric?.stage_scope, `${label} numeric stage scope`).toBe(
      openingCount === 0 ? "hidden_only" : openingCount < numericItems.length ? "opening_and_hidden" : "opening_or_unspecified",
    );
    assertItemsFitStages("numeric", numericItems);
  }

  const shells = mechanisms.shells as JsonRecord | undefined;
  const shellItems = records(shells?.items ?? []);
  if (shells) {
    if (shells.shape_histogram && typeof shells.shape_histogram === "object") {
      expect(histogramCount(histogram(shells.shape_histogram)), `${label} shell shape count`).toBe(shells.count);
    } else {
      expect(shells.shape_histogram, `${label} shell shape ledger`).toBeNull();
      expect(shellItems, `${label} shell items require a shape ledger`).toEqual([]);
    }
    expect(shells.extra_layers as number[], `${label} shell layer count`).toHaveLength(shells.count);
  }
  if (shellItems.length) {
    expect(shellItems, `${label} shell item count`).toHaveLength(shells?.count);
    expect(itemHistogram(shellItems), `${label} shell item shapes`).toEqual(
      normalizedHistogram(histogram(shells?.shape_histogram)),
    );
    expect(shellItems.filter((item) => item.stage_id === "opening"), `${label} opening shell items`).toHaveLength(
      shells?.opening_visible_count,
    );
    expect(sortedNumbers(shellItems.map((item) => Number(item.extra_layers ?? 1))), `${label} shell item layers`).toEqual(
      sortedNumbers(shells?.extra_layers),
    );
    assertItemsFitStages("shell", shellItems);
  }

  const requiredShells = shellItems.filter((item) => item.requires_numeric_ice === true);
  if (typeof numeric?.post_melt_shell === "number") {
    expect(requiredShells, `${label} post-melt shell count`).toHaveLength(numeric.post_melt_shell);
  }
  const availableNumericItems = [...numericItems];
  for (const shell of requiredShells) {
    const matchIndex = availableNumericItems.findIndex((item) => (
      item.stage_id === shell.stage_id && canonicalShape(item.shape) === canonicalShape(shell.shape)
    ));
    expect(matchIndex, `${label} shell must share its stage/shape carrier with numeric ice`).toBeGreaterThanOrEqual(0);
    if (matchIndex >= 0) availableNumericItems.splice(matchIndex, 1);
  }

  const axisBlocks = mechanisms.axis_blocks as JsonRecord | undefined;
  const axisItems = records(axisBlocks?.items ?? []);
  if (axisItems.length) {
    expect(axisItems, `${label} axis item count`).toHaveLength(axisBlocks?.count);
    expect(itemHistogram(axisItems), `${label} axis item shapes`).toEqual(
      normalizedHistogram(histogram(axisBlocks?.shape_histogram)),
    );
    expect(axisItems.map((item) => String(item.axis)).sort(), `${label} axis item axes`).toEqual(
      records(axisBlocks?.axes ?? []).map(String).sort(),
    );
    const byAxisShape = axisItems.reduce<JsonRecord>((result, item) => {
      const axis = String(item.axis);
      result[axis] ??= {};
      const shape = canonicalShape(item.shape);
      result[axis][shape] = (result[axis][shape] ?? 0) + 1;
      return result;
    }, {});
    expect(byAxisShape, `${label} axis item shape/axis ledger`).toEqual(axisBlocks?.by_axis_shape);
    assertItemsFitStages("axis", axisItems.filter((item) => item.stage_id));
  }
};

describe("video-parity v6 truth/contract", () => {
  it("contains exactly one complete, unique Lv1-Lv100 set and hashes the real truth bytes", () => {
    const expectedNumbers = Array.from({ length: 100 }, (_, index) => index + 1);
    const truthNumbers = TRUTH_LEVELS.map((level) => Number(level.level));
    const truthIds = TRUTH_LEVELS.map((level) => String(level.level_id));
    const contractIds = CONTRACT_LEVELS.map((level) => String(level.level_id));

    expect(TRUTH_LEVELS).toHaveLength(100);
    expect(CONTRACT_LEVELS).toHaveLength(100);
    expect(truthNumbers).toEqual(expectedNumbers);
    expect(new Set(truthNumbers).size).toBe(100);
    expect(truthIds).toEqual(expectedNumbers.map(levelId));
    expect(new Set(truthIds).size).toBe(100);
    expect(contractIds).toEqual(truthIds);
    expect(new Set(contractIds).size).toBe(100);
    expect(TRUTH.summary.level_count).toBe(100);
    expect(CONTRACT.summary.level_count).toBe(100);

    const actualTruthSha = createHash("sha256").update(TRUTH_BYTES).digest("hex").toUpperCase();
    expect(CONTRACT.truth_artifact).toBe(
      "deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-truth-v6.json",
    );
    expect(CONTRACT.truth_sha256).toMatch(/^[A-F0-9]{64}$/);
    expect(CONTRACT.truth_sha256).toBe(actualTruthSha);
  });

  it("takes exactly Lv21-Lv30 field-by-field from the embedded direct source-fps evidence", () => {
    expect(records(TRUTH.sources).filter((source) => source.scope === "lv021_030_direct")).toHaveLength(1);
    const directLevels = TRUTH_LEVELS.filter((level) => Number(level.level) >= 21 && Number(level.level) <= 30
      && String(level.provenance.source).endsWith("/21-30.mp4"));
    expect(directLevels.map((level) => level.level)).toEqual(Array.from({ length: 10 }, (_, index) => index + 21));

    for (const level of directLevels) {
      const raw = level.raw_evidence as JsonRecord;
      const correction = sourceReauditByLevel.get(Number(level.level));
      const stages = records(correction?.stage_seeds ?? expectedDirectStages(raw));
      expect(raw.level, `${level.level_id} direct level id`).toBe(level.level);
      expect(level.provenance).toMatchObject({
        classification: correction?.provenance?.classification ?? "local_video_fact_source_fps_crosschecked",
        confidence: correction?.provenance?.confidence ?? "source_fps_exact",
        unclear_fields: correction?.provenance?.unclear_fields ?? raw.unclear_fields ?? [],
        design_fill_fields: correction?.provenance?.design_fill_fields ?? [],
      });
      if (correction) expect(level.reaudit_evidence).toMatchObject({ correction_id: correction.correction_id });
      expect(level.provenance.source, `${level.level_id} direct video`).toMatch(/\/21-30\.mp4$/);
      expect(level.time_seconds, `${level.level_id} timer`).toBe(raw.time_seconds);
      expect(level.board, `${level.level_id} board`).toEqual({
        rows: raw.board.rows,
        cols: raw.board.cols,
        playable_cell_count: raw.board.playable_cells,
        source_playable_mask: raw.board.playable_mask,
        source_mask_status: "source_video_exact",
        source_component_count: null,
      });
      const openingHistogram = normalizedHistogram(histogram(
        correction?.composition?.opening_shape_histogram ?? raw.blocks.opening_shape_histogram,
      ));
      const openingCount = correction?.composition?.opening_piece_count ?? raw.blocks.opening_count;
      const sourceFullHistogram = normalizedHistogram(histogram(
        correction?.composition?.full_shape_histogram ?? raw.blocks.full_shape_histogram,
      ));
      const fullCount = correction?.composition?.full_piece_count ?? raw.blocks.full_count;
      expect(level.composition, `${level.level_id} composition`).toEqual({
        opening_piece_count: openingCount,
        opening_shape_histogram: openingHistogram,
        source_full_piece_count: fullCount,
        source_full_shape_histogram: sourceFullHistogram,
        design_fill_full_piece_count: null,
        design_fill_full_shape_histogram: null,
        effective_design_piece_count: fullCount,
        effective_design_shape_histogram: sourceFullHistogram,
        source_occupied_cell_count: histogramCells(sourceFullHistogram),
        effective_design_occupied_cell_count: histogramCells(sourceFullHistogram),
        opening_color_count: raw.colors.opening_color_count,
        full_color_count: raw.colors.full_color_count,
        source_sq3_count: sourceFullHistogram.SQ3 ?? 0,
      });
      expect(level.stage_seeds, `${level.level_id} direct stages`).toEqual(stages);
      const expectedMechanisms = expectedDirectMechanisms(raw, expectedDirectStages(raw));
      Object.assign(expectedMechanisms, correction?.mechanisms ?? {});
      expect(level.mechanisms, `${level.level_id} direct mechanisms`).toEqual(expectedMechanisms);

      const rawCoverValues = sortedNumbers(correction?.mechanisms?.covers?.values
        ?? raw.mechanisms.countdown_cover?.values ?? []);
      const derivedCoverValues = sortedNumbers(stages.filter((stage) => stage.kind === "countdown_cover")
        .map((stage) => stage.trigger_value));
      expect(derivedCoverValues, `${level.level_id} direct cover values`).toEqual(rawCoverValues);
    }
  });

  it("keeps timer, board, opening/full composition, and color scalars aligned", () => {
    expect(TRUTH.summary.source_fact_full_histogram_count).toBe(100);
    expect(TRUTH.summary.design_fill_full_histogram_count).toBe(0);
    for (const truthLevel of TRUTH_LEVELS) {
      const label = String(truthLevel.level_id);
      const contractLevel = contractById.get(label);
      expect(contractLevel, `${label} contract`).toBeDefined();
      const reference = contractLevel?.competitor_reference as JsonRecord;
      const target = contractLevel?.our_design_target as JsonRecord;
      const composition = truthLevel.composition as JsonRecord;

      expect(reference.board, `${label} competitor board`).toEqual(truthLevel.board);
      expect(reference.time_seconds, `${label} competitor timer`).toBe(truthLevel.time_seconds);
      expect(reference.opening_piece_count, `${label} competitor opening count`).toBe(composition.opening_piece_count);
      expect(reference.opening_shape_histogram, `${label} competitor opening shapes`).toEqual(
        composition.opening_shape_histogram,
      );
      expect(reference.source_full_piece_count, `${label} competitor full count`).toBe(composition.source_full_piece_count);
      expect(reference.source_full_shape_histogram, `${label} competitor full shapes`).toEqual(
        composition.source_full_shape_histogram,
      );
      expect(reference.opening_color_count, `${label} competitor opening colors`).toBe(composition.opening_color_count);
      expect(reference.full_color_count, `${label} competitor full colors`).toBe(composition.full_color_count);
      expect(reference.mechanisms, `${label} competitor mechanisms`).toEqual(truthLevel.mechanisms);

      expect([target.board.rows, target.board.cols, target.board.playable_cell_count], `${label} target board scalars`).toEqual([
        truthLevel.board.rows,
        truthLevel.board.cols,
        truthLevel.board.playable_cell_count,
      ]);
      expect(target.board.playable_mask, `${label} target mask rows`).toHaveLength(target.board.rows);
      expect(target.board.playable_mask as string[], `${label} target mask columns`).toSatisfy(
        (rows: string[]) => rows.every((row) => row.length === target.board.cols),
      );
      expect((target.board.playable_mask as string[]).join("").replace(/[^#]/g, "").length, `${label} target mask cells`).toBe(
        target.board.playable_cell_count,
      );
      expect(target.time_seconds, `${label} target timer`).toBe(truthLevel.time_seconds);
      expect(target.full_level_block_count, `${label} target full count`).toBe(composition.effective_design_piece_count);
      expect(normalizedHistogram(histogram(target.full_level_shape_histogram)), `${label} target full shapes`).toEqual(
        runtimeHistogram(histogram(composition.effective_design_shape_histogram)),
      );
      expect(target.full_level_occupied_cell_count, `${label} target occupied cells`).toBe(
        histogramCells(histogram(target.full_level_shape_histogram)),
      );
      expect(target.opening_color_count, `${label} target opening colors`).toBe(composition.opening_color_count);
      expect(target.full_level_color_count, `${label} target full colors`).toBe(composition.full_color_count);

      const openingStages = records(target.stage_partitions).filter((stage) => stage.kind === "opening");
      expect(openingStages, `${label} opening stage`).toHaveLength(1);
      expect(openingStages[0].count, `${label} target opening count`).toBe(composition.opening_piece_count);
      expect(normalizedHistogram(histogram(openingStages[0].shape_histogram)), `${label} target opening shapes`).toEqual(
        runtimeHistogram(histogram(composition.opening_shape_histogram)),
      );
      expect(histogramCount(histogram(composition.opening_shape_histogram)), `${label} truth opening histogram`).toBe(
        composition.opening_piece_count,
      );
      expect(histogramCount(histogram(composition.source_full_shape_histogram)), `${label} truth full histogram`).toBe(
        composition.source_full_piece_count,
      );
      for (const [shape, count] of Object.entries(histogram(composition.opening_shape_histogram))) {
        expect(histogram(composition.source_full_shape_histogram)[shape] ?? 0, `${label} opening ${shape}`).toBeGreaterThanOrEqual(count);
      }
    }
  });

  it("replaces all 11 source SQ3 pieces one-for-one and leaves no executable nested SQ3", () => {
    let replacementCount = 0;
    let sourceSq3Count = 0;
    for (const truthLevel of TRUTH_LEVELS) {
      const target = contractById.get(String(truthLevel.level_id))?.our_design_target as JsonRecord;
      const sourceHistogram = histogram(truthLevel.composition.effective_design_shape_histogram);
      const sourceCount = sourceHistogram.SQ3 ?? 0;
      const replacements = records(target.source_shape_replacements);
      sourceSq3Count += sourceCount;
      replacementCount += replacements.reduce((sum, replacement) => sum + Number(replacement.count), 0);
      if (sourceCount === 0) {
        expect(replacements, `${truthLevel.level_id} unnecessary SQ3 replacement`).toEqual([]);
      } else {
        expect(replacements, `${truthLevel.level_id} SQ3 replacement`).toEqual([expect.objectContaining({
          source_shape: "SQ3",
          runtime_shape: "RECT2X3",
          count: sourceCount,
        })]);
      }
      expect(normalizedHistogram(histogram(target.full_level_shape_histogram)), `${truthLevel.level_id} one-for-one runtime shapes`).toEqual(
        runtimeHistogram(sourceHistogram),
      );
      expect(executableSq3Paths({
        full_level_shape_histogram: target.full_level_shape_histogram,
        stage_partitions: target.stage_partitions,
        mechanism_contract: target.mechanism_contract,
      }), `${truthLevel.level_id} executable SQ3 paths`).toEqual([]);
    }
    expect(sourceSq3Count).toBe(11);
    expect(replacementCount).toBe(11);
    expect(TRUTH.summary.source_sq3_piece_count).toBe(11);
    expect(CONTRACT.summary.runtime_sq3_count).toBe(0);
    expect(CONTRACT.summary.runtime_rect2x3_replacement_piece_count).toBe(11);
  });

  it("closes every runtime stage count and histogram against the full composition", () => {
    for (const truthLevel of TRUTH_LEVELS) {
      const label = String(truthLevel.level_id);
      const target = contractById.get(label)?.our_design_target as JsonRecord;
      const truthStages = records(truthLevel.stage_seeds);
      const targetStages = records(target.stage_partitions);
      expect(targetStages.map((stage) => stage.id), `${label} stage ids`).toEqual(truthStages.map((stage) => stage.id));
      expect(truthStages.reduce((sum, stage) => sum + Number(stage.count), 0), `${label} truth stage count closure`).toBe(
        truthLevel.composition.effective_design_piece_count,
      );
      expect(targetStages.reduce((sum, stage) => sum + Number(stage.count), 0), `${label} target stage count closure`).toBe(
        target.full_level_block_count,
      );
      for (let index = 0; index < targetStages.length; index += 1) {
        const sourceStage = truthStages[index];
        const targetStage = targetStages[index];
        expect([targetStage.id, targetStage.kind, targetStage.count], `${label}/${targetStage.id} identity`).toEqual([
          sourceStage.id,
          sourceStage.kind,
          sourceStage.count,
        ]);
        expect(histogramCount(histogram(targetStage.shape_histogram)), `${label}/${targetStage.id} histogram count`).toBe(
          targetStage.count,
        );
        if (sourceStage.shape_histogram && typeof sourceStage.shape_histogram === "object") {
          expect(normalizedHistogram(histogram(targetStage.shape_histogram)), `${label}/${targetStage.id} runtime histogram`).toEqual(
            runtimeHistogram(histogram(sourceStage.shape_histogram)),
          );
        }
      }
      expect(addHistograms(...targetStages.map((stage) => histogram(stage.shape_histogram))), `${label} target histogram closure`).toEqual(
        normalizedHistogram(histogram(target.full_level_shape_histogram)),
      );
    }
  });

  it("keeps every countdown-cover trigger within the conservative clear-layer capacity chain", () => {
    for (const truthLevel of TRUTH_LEVELS) {
      const stages = records(truthLevel.stage_seeds);
      const coverStages = stages.filter((stage) => stage.kind === "countdown_cover");
      if (!coverStages.length) continue;

      const shellSpec = truthLevel.mechanisms.shells as JsonRecord | undefined;
      const shellItems = records(shellSpec?.items ?? []);
      const shellLayersByStage = new Map<string, number>();
      for (const item of shellItems) {
        if (!item.stage_id) continue;
        shellLayersByStage.set(
          String(item.stage_id),
          (shellLayersByStage.get(String(item.stage_id)) ?? 0) + Number(item.extra_layers ?? 1),
        );
      }
      const declaredShellLayers = records(shellSpec?.extra_layers ?? [])
        .reduce((sum, layer) => sum + Number(layer), 0);
      const assignedShellLayers = [...shellLayersByStage.values()].reduce((sum, count) => sum + count, 0);
      // Unassigned source shells are deliberately treated as already available.
      // This makes the check a conservative upper bound: a failure is a real
      // impossible countdown chain, while a pass never invents a stricter stage fact.
      const unassignedShellLayers = Math.max(0, declaredShellLayers - assignedShellLayers);
      let availableClearLayers = stages
        .filter((stage) => stage.kind !== "countdown_cover")
        .reduce((sum, stage) => sum + Number(stage.count) + (shellLayersByStage.get(String(stage.id)) ?? 0), 0)
        + unassignedShellLayers;

      const groups = new Map<number, JsonRecord[]>();
      const declaredCoverValues = records(truthLevel.mechanisms.covers?.values ?? []);
      for (let coverIndex = 0; coverIndex < coverStages.length; coverIndex += 1) {
        const stage = coverStages[coverIndex];
        const trigger = Number(stage.trigger_value ?? declaredCoverValues[coverIndex]);
        expect(Number.isFinite(trigger), `${truthLevel.level_id}/${stage.id} finite cover trigger`).toBe(true);
        groups.set(trigger, [...(groups.get(trigger) ?? []), stage]);
      }
      for (const [trigger, group] of [...groups.entries()].sort(([left], [right]) => left - right)) {
        expect(
          availableClearLayers,
          `${truthLevel.level_id} needs ${trigger} clears before ${group.map((stage) => stage.id).join("+")}`,
        ).toBeGreaterThanOrEqual(trigger);
        availableClearLayers += group.reduce((sum, stage) => (
          sum + Number(stage.count) + (shellLayersByStage.get(String(stage.id)) ?? 0)
        ), 0);
      }
    }
  });

  it("reflects the base stage audit and the dedicated Lv91 source-fps resolution in truth provenance", () => {
    expect(STAGE_AUDIT.summary).toMatchObject({
      audited_stage_count: 45,
      per_stage_exact_count: 14,
      per_stage_unclear_count: 31,
      aggregate_exact_level_count: 10,
    });
    const exactStages = records(STAGE_AUDIT.exact_stages);
    const baseUnclearLevels = records(STAGE_AUDIT.aggregate_exact_per_cover_unclear);
    const correctedCoverLevels = new Set(records(SOURCE_REAUDIT.levels)
      .filter((entry) => entry.mechanisms?.covers?.per_cover_partition_status === "source_observed_or_unique")
      .map((entry) => Number(entry.level)));
    const supersededUnclearLevels = baseUnclearLevels.filter((entry) => (
      Number(entry.level) !== 91 && correctedCoverLevels.has(Number(entry.level))
    ));
    const unclearLevels = baseUnclearLevels.filter((entry) => (
      Number(entry.level) !== 91 && !correctedCoverLevels.has(Number(entry.level))
    ));
    expect(exactStages).toHaveLength(14);
    expect(baseUnclearLevels).toHaveLength(10);
    expect(unclearLevels).toHaveLength(9 - supersededUnclearLevels.length);
    expect(unclearLevels.reduce((sum, entry) => sum + Number(entry.cover_stage_count), 0)).toBe(
      29 - supersededUnclearLevels.reduce((sum, entry) => sum + Number(entry.cover_stage_count), 0),
    );

    for (const audited of exactStages) {
      const truthLevel = truthByNumber.get(Number(audited.level));
      const stage = records(truthLevel?.stage_seeds).find((candidate) => candidate.id === audited.stage_id);
      expect(stage, `Lv${audited.level}/${audited.stage_id}`).toBeDefined();
      expect(stage).toMatchObject({
        count: audited.count,
        shape_histogram: normalizedHistogram(histogram(audited.shape_histogram)),
        provenance: "source_fps_stage_partition_fact",
        source_stage_audit_evidence: audited.evidence ?? audited.derivation ?? null,
      });
      expect(truthLevel?.provenance.design_fill_fields as string[], `Lv${audited.level} exact provenance`).not.toContain(
        `stage_seeds.${audited.stage_id}`,
      );
    }

    const truth91 = truthByNumber.get(91) as JsonRecord;
    const target91 = contractById.get("Lv091")?.our_design_target as JsonRecord;
    const cover91 = records(truth91.stage_seeds).filter((stage) => stage.kind === "countdown_cover");
    expect(LV91_REAUDIT.source_facts.full_level_union.piece_count).toBe(27);
    expect(cover91.map((stage) => [stage.trigger_value, stage.count, normalizedHistogram(stage.shape_histogram)])).toEqual([
      [10, 5, { SINGLE: 1, V3: 4 }],
      [8, 5, { L3: 1, SINGLE: 3, V2: 1 }],
    ]);
    expect(cover91.every((stage) => stage.provenance === "source_fps_stage_partition_fact")).toBe(true);
    expect(truth91.provenance.design_fill_fields).toEqual([]);
    expect(target91.full_level_block_count).toBe(27);
    expect(target91.mechanism_contract.numeric_ice).toMatchObject({
      count: 3,
      values: [2, 8, 12],
      shape_histogram: { SINGLE: 3 },
      opening_visible_count: 0,
    });

    for (const audited of unclearLevels) {
      const truthLevel = truthByNumber.get(Number(audited.level)) as JsonRecord;
      const contractLevel = contractById.get(levelId(Number(audited.level))) as JsonRecord;
      const truthCoverStages = records(truthLevel.stage_seeds).filter((stage) => stage.kind === "countdown_cover");
      const targetCoverStages = records(contractLevel.our_design_target.stage_partitions)
        .filter((stage) => stage.kind === "countdown_cover");
      expect(truthCoverStages, `Lv${audited.level} unclear truth covers`).toHaveLength(audited.cover_stage_count);
      expect(targetCoverStages, `Lv${audited.level} unclear target covers`).toHaveLength(audited.cover_stage_count);
      expect(truthCoverStages.map((stage) => stage.trigger_value), `Lv${audited.level} cover values`).toEqual(
        audited.cover_trigger_values,
      );
      expect(truthCoverStages.map((stage) => stage.count), `Lv${audited.level} design partition`).toEqual(
        audited.current_contract_design_partition,
      );
      for (const stage of truthCoverStages) {
        expect(stage).toMatchObject({
          provenance: "runtime_design_choice_design_fill_not_video_fact_per_cover_unclear",
          source_partition_status: "unclear",
          source_count: "unclear",
          source_shape_histogram: "unclear",
          source_hidden_aggregate_count: audited.hidden_aggregate_count,
          source_hidden_aggregate_shape_histogram: normalizedHistogram(histogram(audited.hidden_aggregate_shape_histogram)),
        });
        expect(truthLevel.provenance.design_fill_fields).toContain(`stage_seeds.${stage.id}`);
      }
      const unclearText = String(truthLevel.provenance.unclear_fields).toLowerCase();
      expect(
        unclearText.includes("per-cover") || (unclearText.includes("cover") && unclearText.includes("unclear")),
        `Lv${audited.level} unclear provenance text`,
      ).toBe(true);
      expect(truthLevel.mechanisms.covers).toMatchObject({
        per_cover_partition_status: "unclear",
        source_hidden_aggregate_count: audited.hidden_aggregate_count,
        source_hidden_aggregate_shape_histogram: normalizedHistogram(histogram(audited.hidden_aggregate_shape_histogram)),
      });
      expect(addHistograms(...targetCoverStages.map((stage) => histogram(stage.shape_histogram))), `Lv${audited.level} runtime aggregate`).toEqual(
        runtimeHistogram(histogram(audited.hidden_aggregate_shape_histogram)),
      );
      expect(targetCoverStages.reduce((sum, stage) => sum + Number(stage.count), 0), `Lv${audited.level} aggregate count`).toBe(
        audited.hidden_aggregate_count,
      );
    }

    for (const audited of supersededUnclearLevels) {
      const truthLevel = truthByNumber.get(Number(audited.level)) as JsonRecord;
      const corrected = sourceReauditByLevel.get(Number(audited.level)) as JsonRecord;
      expect(truthLevel.reaudit_evidence, `Lv${audited.level} re-audit link`).toMatchObject({
        correction_id: corrected.correction_id,
      });
      expect(truthLevel.mechanisms.covers.per_cover_partition_status, `Lv${audited.level} resolved covers`).toBe(
        "source_observed_or_unique",
      );
      expect(truthLevel.provenance.design_fill_fields, `Lv${audited.level} corrected provenance`).toEqual([]);
    }

    const truthDesignFillStages = TRUTH_LEVELS.flatMap((level) => records(level.stage_seeds)
      .filter((stage) => String(stage.provenance).includes("design_fill")));
    const expectedRemainingDesignFillStages = 29 - supersededUnclearLevels
      .reduce((sum, entry) => sum + Number(entry.cover_stage_count), 0);
    expect(truthDesignFillStages).toHaveLength(expectedRemainingDesignFillStages);
    expect(TRUTH.summary.stage_design_fill_stage_count).toBe(expectedRemainingDesignFillStages);
  });

  it("preserves the Lv34/Lv66 corrections and validates numeric/shell carrier ledgers", () => {
    const truth34 = truthByNumber.get(34) as JsonRecord;
    const target34 = contractById.get("Lv034")?.our_design_target as JsonRecord;
    expect(truth34.mechanisms.shells.opening_visible_count).toBe(0);
    expect(records(truth34.mechanisms.shells.items).every((item) => item.stage_id !== "opening")).toBe(true);
    expect(target34.mechanism_contract.shells.opening_visible_count).toBe(0);

    const truth66 = truthByNumber.get(66) as JsonRecord;
    const target66 = contractById.get("Lv066")?.our_design_target as JsonRecord;
    expect(truth66.mechanisms.numeric_ice.stage_scope).toBe("opening_and_hidden");
    expect(target66.mechanism_contract.numeric_ice.stage_scope).toBe("opening_and_hidden");

    for (const truthLevel of TRUTH_LEVELS) {
      verifyMechanismItemLedgers(
        `${truthLevel.level_id} truth`,
        truthLevel.mechanisms,
        records(truthLevel.stage_seeds),
      );
      const target = contractById.get(String(truthLevel.level_id))?.our_design_target as JsonRecord;
      verifyMechanismItemLedgers(
        `${truthLevel.level_id} target`,
        target.mechanism_contract,
        records(target.stage_partitions),
      );

      const truthNumeric = truthLevel.mechanisms.numeric_ice as JsonRecord | undefined;
      const targetNumeric = target.mechanism_contract.numeric_ice as JsonRecord | undefined;
      if (records(truthNumeric?.items ?? []).length) {
        expect(records(targetNumeric?.items), `${truthLevel.level_id} runtime numeric items`).toEqual(
          records(truthNumeric?.items).map((item) => ({
            ...item,
            ...(item.shape === "SQ3" ? { source_shape: "SQ3" } : {}),
            shape: item.shape === "SQ3" ? "RECT2X3" : item.shape,
          })),
        );
      }
      const truthShells = truthLevel.mechanisms.shells as JsonRecord | undefined;
      const targetShells = target.mechanism_contract.shells as JsonRecord | undefined;
      if (records(truthShells?.items ?? []).length) {
        expect(records(targetShells?.items), `${truthLevel.level_id} runtime shell items`).toEqual(
          records(truthShells?.items).map((item) => ({
            ...item,
            ...(item.shape === "SQ3" ? { source_shape: "SQ3" } : {}),
            shape: item.shape === "SQ3" ? "RECT2X3" : item.shape,
          })),
        );
      }
    }
  });

  it("uses only the eight official palette colors", () => {
    const usedColors = new Set<string>();
    for (const contractLevel of CONTRACT_LEVELS) {
      const target = contractLevel.our_design_target as JsonRecord;
      const palette = target.design_palette as string[];
      expect(palette, `${contractLevel.level_id} palette length`).toHaveLength(target.full_level_color_count);
      expect(new Set(palette).size, `${contractLevel.level_id} unique palette`).toBe(palette.length);
      expect(palette.every((color) => OFFICIAL_COLORS.includes(color)), `${contractLevel.level_id} official palette`).toBe(true);
      palette.forEach((color) => usedColors.add(color));
    }
    expect([...usedColors].sort()).toEqual([...OFFICIAL_COLORS].sort());
  });

  it("derives both first-appearance tables from the actual level mechanisms", () => {
    const actualTruth = actualFirstAppearances(TRUTH_LEVELS);
    const competitorLevels = CONTRACT_LEVELS.map((level) => ({
      level: Number(String(level.level_id).slice(2)),
      board: level.competitor_reference.board,
      mechanisms: level.competitor_reference.mechanisms,
    }));
    const targetLevels = CONTRACT_LEVELS.map((level) => ({
      level: Number(String(level.level_id).slice(2)),
      board: level.our_design_target.board,
      mechanisms: level.our_design_target.mechanism_contract,
    }));
    expect(TRUTH.competitor_mechanism_first_appearance).toEqual(actualTruth);
    expect(CONTRACT.competitor_mechanism_first_appearance).toEqual(actualFirstAppearances(competitorLevels));
    expect(CONTRACT.competitor_mechanism_first_appearance).toEqual(actualTruth);
    expect(CONTRACT.design_target_mechanism_first_appearance).toEqual(actualFirstAppearances(targetLevels));
  });
});
