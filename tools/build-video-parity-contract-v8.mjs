import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Restore the competitor's exact SQ3 composition after the user explicitly
// withdrew the former product rule that prohibited full 3x3 blocks. This is a
// structural contract migration only: it never invokes a gameplay solver.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const truthRelative = "deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-truth-v6.json";
const sourceRelative = "deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-design-contract-v7.json";
const outputRelative = "deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-design-contract-v8.json";
const expectedTruthSha256 = "9480A7C24409A82527070522815F65090AF1A3EF6C98027069B69D4372825F0B";
const expectedSourceSha256 = "1A413DB0084EA42C507AFB2D232B9537A3F9AB91E8F16D409C0ACD19A03DE88D";

const SHAPE_ORDER = [
  "SINGLE", "H2", "V2", "H3", "V3", "H4", "V4", "SQ2", "RECT2X3", "SQ3",
  "L3", "L4", "L5", "T4", "T5", "S4", "CROSS5",
];
const SHAPE_AREA = {
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

const sha256 = (value) => createHash("sha256").update(value).digest("hex").toUpperCase();
const canonical = (value) => {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  }
  return value;
};
const same = (left, right) => JSON.stringify(canonical(left)) === JSON.stringify(canonical(right));
const asObject = (value) => value && typeof value === "object" && !Array.isArray(value) ? value : null;
const isShapeHistogram = (value) => {
  const object = asObject(value);
  const entries = Object.entries(object ?? {});
  return entries.length > 0
    && entries.every(([shape, count]) => shape in SHAPE_AREA && Number.isInteger(count) && count > 0);
};
const histogramCount = (histogram) => Object.values(histogram ?? {}).reduce((sum, count) => sum + Number(count), 0);
const histogramCells = (histogram) => Object.entries(histogram ?? {}).reduce((sum, [shape, count]) => {
  if (!(shape in SHAPE_AREA)) throw new Error(`Unknown shape ${shape}.`);
  return sum + SHAPE_AREA[shape] * Number(count);
}, 0);
const orderedHistogram = (histogram) => Object.fromEntries(
  Object.entries(histogram ?? {})
    .filter(([, count]) => Number(count) > 0)
    .sort(([left], [right]) => SHAPE_ORDER.indexOf(left) - SHAPE_ORDER.indexOf(right)),
);
const addHistograms = (...histograms) => orderedHistogram(histograms.reduce((result, histogram) => {
  for (const [shape, count] of Object.entries(histogram ?? {})) {
    result[shape] = (result[shape] ?? 0) + Number(count);
  }
  return result;
}, {}));

const mergeExactTruthFacts = (truthValue, designValue) => {
  if (truthValue === "unclear") return structuredClone(designValue);
  if (Array.isArray(truthValue)) {
    if (!Array.isArray(designValue) || designValue.length !== truthValue.length) {
      throw new Error("Truth/design array lengths differ while restoring exact source facts.");
    }
    return truthValue.map((entry, index) => mergeExactTruthFacts(entry, designValue[index]));
  }
  const truthObject = asObject(truthValue);
  if (truthObject) {
    // A shape histogram is an atomic source fact. Copying its keys onto the v7
    // runtime histogram would retain the normalization-derived RECT2X3 entry
    // beside the restored SQ3 entry and double-count the same carrier.
    if (isShapeHistogram(truthObject)) return orderedHistogram(truthObject);
    const result = structuredClone(asObject(designValue) ?? {});
    for (const [key, entry] of Object.entries(truthObject)) {
      result[key] = mergeExactTruthFacts(entry, result[key]);
    }
    // v6/v7 added this marker solely for their executable SQ3 replacement.
    if (truthObject.shape === "SQ3" && result.source_shape === "SQ3") delete result.source_shape;
    return result;
  }
  return structuredClone(truthValue);
};

const assertHistogramSize = (histogram, expectedCount, path) => {
  if (!asObject(histogram) || !Number.isInteger(expectedCount)) return;
  const actualCount = histogramCount(histogram);
  if (actualCount !== expectedCount) {
    throw new Error(`${path}: shape histogram totals ${actualCount}, expected ${expectedCount}.`);
  }
};

const assertMechanismHistogramClosure = (mechanisms, label) => {
  const numericIce = asObject(mechanisms.numeric_ice);
  if (numericIce) {
    assertHistogramSize(numericIce.shape_histogram, numericIce.count, `${label}.numeric_ice.shape_histogram`);
    if (Array.isArray(numericIce.values) && numericIce.values.length !== numericIce.count) {
      throw new Error(`${label}.numeric_ice.values: expected ${numericIce.count} entries.`);
    }
    if (Array.isArray(numericIce.items) && numericIce.items.length !== numericIce.count) {
      throw new Error(`${label}.numeric_ice.items: expected ${numericIce.count} entries.`);
    }
  }

  const shells = asObject(mechanisms.shells);
  if (shells) {
    assertHistogramSize(shells.shape_histogram, shells.count, `${label}.shells.shape_histogram`);
    if (Array.isArray(shells.extra_layers) && shells.extra_layers.length !== shells.count) {
      throw new Error(`${label}.shells.extra_layers: expected ${shells.count} entries.`);
    }
    if (Array.isArray(shells.items) && shells.items.length !== shells.count) {
      throw new Error(`${label}.shells.items: expected ${shells.count} entries.`);
    }
  }

  const covers = asObject(mechanisms.covers);
  if (covers) {
    if (!Array.isArray(covers.values) || covers.values.length !== covers.count) {
      throw new Error(`${label}.covers.values: expected ${covers.count} entries.`);
    }
    if (!Array.isArray(covers.hidden_batch_counts) || !Array.isArray(covers.hidden_batch_histograms)
      || covers.hidden_batch_histograms.length !== covers.hidden_batch_counts.length) {
      throw new Error(`${label}.covers: hidden batch counts and histograms must have the same length.`);
    }
    covers.hidden_batch_histograms.forEach((histogram, index) => {
      assertHistogramSize(histogram, covers.hidden_batch_counts[index], `${label}.covers.hidden_batch_histograms[${index}]`);
    });
  }

  const generators = asObject(mechanisms.generators);
  if (generators) {
    if (!Array.isArray(generators.queue_lengths) || generators.queue_lengths.length !== generators.count) {
      throw new Error(`${label}.generators.queue_lengths: expected ${generators.count} entries.`);
    }
    if (!Array.isArray(generators.queue_histograms) || generators.queue_histograms.length !== generators.count) {
      throw new Error(`${label}.generators.queue_histograms: expected ${generators.count} entries.`);
    }
    generators.queue_histograms.forEach((histogram, index) => {
      assertHistogramSize(histogram, generators.queue_lengths[index], `${label}.generators.queue_histograms[${index}]`);
    });
  }

  const axisBlocks = asObject(mechanisms.axis_blocks);
  if (axisBlocks) {
    assertHistogramSize(axisBlocks.shape_histogram, axisBlocks.count, `${label}.axis_blocks.shape_histogram`);
    if (asObject(axisBlocks.by_axis_shape)) {
      const axisTotal = Object.values(axisBlocks.by_axis_shape).reduce(
        (sum, histogram) => sum + histogramCount(histogram),
        0,
      );
      if (axisTotal !== axisBlocks.count) {
        throw new Error(`${label}.axis_blocks.by_axis_shape: totals ${axisTotal}, expected ${axisBlocks.count}.`);
      }
    }
    if (Array.isArray(axisBlocks.items) && axisBlocks.items.length !== axisBlocks.count) {
      throw new Error(`${label}.axis_blocks.items: expected ${axisBlocks.count} entries.`);
    }
  }

  const keyLocks = asObject(mechanisms.key_locks);
  if (keyLocks) {
    assertHistogramSize(keyLocks.key_shapes, keyLocks.key_count, `${label}.key_locks.key_shapes`);
    assertHistogramSize(keyLocks.lock_shapes, keyLocks.lock_count, `${label}.key_locks.lock_shapes`);
    if (Array.isArray(keyLocks.lock_requirements) && keyLocks.lock_requirements.length !== keyLocks.lock_count) {
      throw new Error(`${label}.key_locks.lock_requirements: expected ${keyLocks.lock_count} entries.`);
    }
  }

  for (const mechanismName of ["lifts", "staged_frames"]) {
    const mechanism = asObject(mechanisms[mechanismName]);
    if (!mechanism || !Array.isArray(mechanism.layers)) continue;
    mechanism.layers.forEach((layer, index) => {
      assertHistogramSize(layer.histogram, layer.count, `${label}.${mechanismName}.layers[${index}].histogram`);
    });
  }

  const stars = asObject(mechanisms.stars);
  if (stars) assertHistogramSize(stars.shape_histogram, stars.count, `${label}.stars.shape_histogram`);
};

const assertTruthFacts = (actual, truthValue, path) => {
  if (truthValue === "unclear") return;
  if (Array.isArray(truthValue)) {
    if (!Array.isArray(actual) || actual.length !== truthValue.length) {
      throw new Error(`${path}: expected an array of length ${truthValue.length}.`);
    }
    truthValue.forEach((entry, index) => assertTruthFacts(actual[index], entry, `${path}[${index}]`));
    return;
  }
  const truthObject = asObject(truthValue);
  if (truthObject) {
    if (!asObject(actual)) throw new Error(`${path}: expected an object.`);
    for (const [key, entry] of Object.entries(truthObject)) {
      assertTruthFacts(actual[key], entry, `${path}.${key}`);
    }
    return;
  }
  if (!same(actual, truthValue)) {
    throw new Error(`${path}: source fact changed (${JSON.stringify(actual)} !== ${JSON.stringify(truthValue)}).`);
  }
};

const truthPath = resolve(root, truthRelative);
const sourcePath = resolve(root, sourceRelative);
const outputPath = resolve(root, outputRelative);
const [truthText, sourceText] = await Promise.all([
  readFile(truthPath, "utf8"),
  readFile(sourcePath, "utf8"),
]);
const truthSha256 = sha256(truthText);
const sourceSha256 = sha256(sourceText);
if (truthSha256 !== expectedTruthSha256) throw new Error(`Unexpected truth SHA-256: ${truthSha256}`);
if (sourceSha256 !== expectedSourceSha256) throw new Error(`Unexpected v7 contract SHA-256: ${sourceSha256}`);

const truth = JSON.parse(truthText);
const source = JSON.parse(sourceText);
if (!Array.isArray(truth.levels) || truth.levels.length !== 100) {
  throw new Error("Truth-v6 must contain exactly 100 levels.");
}
if (!Array.isArray(source.levels) || source.levels.length !== 100) {
  throw new Error("Design-contract-v7 must contain exactly 100 levels.");
}

const contract = structuredClone(source);
contract.schema_version = "blockout-video-parity-design-contract-v8";
contract.title = "Block Out! Lv1-100 exact competitor composition + original board contract v8";
contract.generated_on = "2026-09-16";
contract.status = "design_contract_ready_for_direct_formal_data_generation";
contract.truth_sha256 = truthSha256;
contract.contract_rules.shape_parity = "Runtime shape histogram matches the competitor source one-for-one, including every full 3x3 (SQ3) block.";
contract.contract_rules.difficulty = "D1 and campaignRepositionFloor remain design metadata; this v8 structural migration does not run or claim gameplay solver validation.";
contract.revision = {
  parent_contract: { path: sourceRelative, sha256: sourceSha256 },
  immutable_truth_preserved: true,
  board_masks_preserved_from_v7: true,
  unclear_design_fills_preserved_from_v7: true,
  changed_level_ids: ["Lv022", "Lv023"],
  reason: "Restore the exact 8-level / 11-piece competitor SQ3 composition, preserve Lv22's source-observed 6x7 cover, and correct Lv23's two source-observed 3x3 cover footprints plus the cover-9 V2 transcription without changing board masks or unclear-field design fills.",
};

let fullSq3Count = 0;
const sq3LevelIds = [];
for (let index = 0; index < contract.levels.length; index += 1) {
  const truthLevel = truth.levels[index];
  const sourceLevel = source.levels[index];
  const level = contract.levels[index];
  const label = String(truthLevel.level_id);
  if (level.level_id !== label || sourceLevel.level_id !== label) {
    throw new Error(`Level order mismatch at index ${index}.`);
  }

  const target = level.our_design_target;
  const sourceTarget = sourceLevel.our_design_target;
  const sourceComposition = truthLevel.composition;
  if (!same(target.board, sourceTarget.board)) throw new Error(`${label}: v7 board changed before migration.`);

  const sourceHistogram = orderedHistogram(sourceComposition.source_full_shape_histogram);
  const sourceCount = Number(sourceComposition.source_full_piece_count);
  target.full_level_block_count = sourceCount;
  target.full_level_shape_histogram = sourceHistogram;
  target.full_level_occupied_cell_count = histogramCells(sourceHistogram);
  target.source_shape_replacements = [];

  const truthStages = truthLevel.stage_seeds;
  if (!Array.isArray(truthStages) || target.stage_partitions.length !== truthStages.length) {
    throw new Error(`${label}: stage count differs from truth.`);
  }
  target.stage_partitions = target.stage_partitions.map((stage, stageIndex) => {
    const truthStage = truthStages[stageIndex];
    if (stage.id !== truthStage.id || stage.kind !== truthStage.kind || stage.count !== truthStage.count) {
      throw new Error(`${label}/${stage.id}: stage identity differs from truth.`);
    }
    return {
      ...stage,
      position: truthStage.position === undefined
        ? stage.position
        : structuredClone(truthStage.position),
      shape_histogram: asObject(truthStage.shape_histogram)
        ? orderedHistogram(truthStage.shape_histogram)
        : structuredClone(stage.shape_histogram),
    };
  });
  target.mechanism_contract = mergeExactTruthFacts(truthLevel.mechanisms, target.mechanism_contract);

  const levelSq3Count = Number(sourceHistogram.SQ3 ?? 0);
  fullSq3Count += levelSq3Count;
  if (levelSq3Count > 0) {
    sq3LevelIds.push(label);
    contract.revision.changed_level_ids.push(label);
  }

  if (!same(target.board, sourceTarget.board)) throw new Error(`${label}: v7 board mask or scalar changed.`);
  if (target.time_seconds !== truthLevel.time_seconds) throw new Error(`${label}: timer mismatch.`);
  if (target.full_level_block_count !== sourceCount || histogramCount(sourceHistogram) !== sourceCount) {
    throw new Error(`${label}: full source block-count mismatch.`);
  }
  if (!same(target.full_level_shape_histogram, sourceHistogram)) throw new Error(`${label}: source shape mismatch.`);
  if (target.full_level_occupied_cell_count !== histogramCells(sourceHistogram)) {
    throw new Error(`${label}: occupied-cell total mismatch.`);
  }
  const stageHistogram = addHistograms(...target.stage_partitions.map((stage) => stage.shape_histogram));
  if (!same(stageHistogram, sourceHistogram)) throw new Error(`${label}: stage histograms do not close to full composition.`);
  if (target.stage_partitions.reduce((sum, stage) => sum + Number(stage.count), 0) !== sourceCount) {
    throw new Error(`${label}: stage counts do not close to full block count.`);
  }
  assertTruthFacts(target.mechanism_contract, truthLevel.mechanisms, `${label}.mechanism_contract`);
  assertMechanismHistogramClosure(target.mechanism_contract, `${label}.mechanism_contract`);
}

if (fullSq3Count !== 11 || sq3LevelIds.length !== 8) {
  throw new Error(`Expected 11 SQ3 pieces across 8 levels, found ${fullSq3Count} across ${sq3LevelIds.length}.`);
}
if (!same(sq3LevelIds, ["Lv008", "Lv014", "Lv018", "Lv059", "Lv064", "Lv072", "Lv076", "Lv089"])) {
  throw new Error(`Unexpected SQ3 level set: ${sq3LevelIds.join(", ")}.`);
}

contract.summary = {
  ...contract.summary,
  runtime_sq3_count: fullSq3Count,
  runtime_sq3_level_count: sq3LevelIds.length,
  runtime_rect2x3_replacement_piece_count: 0,
  solver_validated_level_count: 0,
};

const outputText = `${JSON.stringify(contract, null, 2)}\n`;
await writeFile(outputPath, outputText, "utf8");
console.log(JSON.stringify({
  output: relative(root, outputPath).replaceAll("\\", "/"),
  sha256: sha256(outputText),
  parent_sha256: sourceSha256,
  truth_sha256: truthSha256,
  level_count: contract.levels.length,
  board_masks_preserved: contract.levels.every((entry, index) => same(
    entry.our_design_target.board,
    source.levels[index].our_design_target.board,
  )),
  sq3_level_ids: sq3LevelIds,
  sq3_piece_count: fullSq3Count,
  solver_invoked: false,
}, null, 2));
