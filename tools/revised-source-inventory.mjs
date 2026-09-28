import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

export const INVENTORY_REVIEWS = [
  "docs/level-generation/reviews/mechanism-inventory-lv021-024.json",
  "docs/level-generation/reviews/mechanism-inventory-lv025-027.json",
  "docs/level-generation/reviews/mechanism-inventory-lv028-030.json",
];
export const INVENTORY_FIELDS = {
  generators: "generators", axisBlocks: "axis_blocks", keyLocks: "keys_locks",
  starBlocks: "star_blocks", flipDoors: "flip_doors", coloredGrids: "colored_grids",
  bombs: "bombs", lifts: "lifts", numericIce: "numeric_ice", shells: "shells", covers: "covers",
};
const TRUTH = "deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-truth-v6.json";
const DIRECT = ".codex-temp/video-audit-21-30-independent/audit-lv021-030.json";
const CORRECTIONS = "playtest-results/experiments/video-parity-v6/source-audit/capacity-chain-reaudit/corrections.json";
const FRAME_ROOT = ".codex-temp/video-audit-21-30-independent/";
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
const integer = (n) => Number.isSafeInteger(n) && n >= 0;
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const sameHistogram = (a, b) => same(Object.entries(a).sort(), Object.entries(b).sort());

// Hash integrity does not prove an observation; the checked-in reviews record
// the actual opening/reveal/thaw/late-frame inspection separately.
export async function verifyInventoryReview(review, { truthSha256, directSha256, readBytes }) {
  if (review.schemaVersion !== 1 || review.truth?.path !== TRUTH || review.truth.sha256 !== truthSha256
    || review.direct?.path !== DIRECT || review.direct.sha256 !== directSha256) {
    throw new Error("Mechanism inventory source binding mismatch");
  }
  if (!Array.isArray(review.levels) || !review.levels.length) throw new Error("Empty mechanism inventory review");
  const seen = new Set();
  for (const row of review.levels) {
    if (!integer(row.level) || row.level < 21 || row.level > 30 || seen.has(row.level)) throw new Error("Duplicate/out-of-scope inventory level");
    seen.add(row.level);
    if (!Array.isArray(row.observations) || !row.observations.length || !Array.isArray(row.evidence) || row.evidence.length < 3) {
      throw new Error(`Lv${row.level}: inventory requires explicit observations and multiple source frames`);
    }
    const paths = new Set();
    let frameCount = 0;
    for (const item of row.evidence) {
      const frame = typeof item.path === "string" && item.path.startsWith(FRAME_ROOT) && /\.(jpg|png)$/.test(item.path);
      if (typeof item.path !== "string" || (!frame && ![TRUTH, DIRECT, CORRECTIONS].includes(item.path)) || item.path.includes("..")
        || !/^[a-f0-9]{64}$/i.test(item.sha256) || paths.has(item.path)) {
        throw new Error(`Lv${row.level}: invalid/duplicate inventory evidence path`);
      }
      paths.add(item.path);
      if (frame) frameCount++;
      if (digest(await readBytes(item.path)) !== item.sha256.toLowerCase()) throw new Error(`Inventory frame hash mismatch: ${item.path}`);
    }
    if (frameCount < 3) throw new Error(`Lv${row.level}: fewer than three inspected source frames`);
    if (row.stableOpeningEvidence && !paths.has(row.stableOpeningEvidence)) throw new Error(`Lv${row.level}: unbound stable opening frame`);
    for (const family of Object.keys(INVENTORY_FIELDS)) {
      if (!Object.hasOwn(row.mechanisms ?? {}, family)) throw new Error(`Lv${row.level}: missing inventory family ${family}`);
      const mechanism = row.mechanisms[family];
      if (mechanism === null) continue; // Unresolved observations remain unknown, not zero.
      if (!integer(mechanism.count)) throw new Error(`Lv${row.level}: invalid ${family} count`);
      if (typeof mechanism.reason !== "string" || !mechanism.reason.trim()) throw new Error(`Lv${row.level}: ${family} needs an observation reason`);
      if (mechanism.count === 0 && ["values", "items", "extra_layers", "hidden_batch_counts"].some((key) => mechanism[key]?.length)) {
        throw new Error(`Lv${row.level}: contradictory absent ${family} inventory`);
      }
      if (mechanism.evidencePaths?.some((path) => !paths.has(path))) throw new Error(`Lv${row.level}: unbound ${family} evidence`);
    }
    if (row.sourceCorrections && (typeof row.sourceCorrections.id !== "string" || !row.sourceCorrections.id)) {
      throw new Error(`Lv${row.level}: source correction needs a distinct identity`);
    }
  }
  return review;
}

export async function loadMechanismInventory({ root, truthSha256, directSha256 }) {
  const rows = new Map(), bindings = {};
  const readBytes = (path) => readFile(resolve(root, path));
  for (const path of INVENTORY_REVIEWS) {
    const bytes = await readBytes(path);
    const review = await verifyInventoryReview(JSON.parse(bytes.toString("utf8").replace(/^\uFEFF/, "")), { truthSha256, directSha256, readBytes });
    bindings[path] = { sha256: digest(bytes) };
    for (const row of review.levels) {
      if (rows.has(row.level)) throw new Error(`Inventory level repeated across reviews: ${row.level}`);
      rows.set(row.level, { ...structuredClone(row), reviewPath: path, verified: true });
      for (const evidence of row.evidence) bindings[evidence.path] = { sha256: evidence.sha256.toLowerCase() };
    }
  }
  if (rows.size !== 10) throw new Error("Inventory review must account for all Lv21-30, including explicit unknowns");
  return { rows, bindings };
}

function validateMergedMechanism(level, family, value) {
  if (value.shape_histogram && Object.values(value.shape_histogram).reduce((a, b) => a + b, 0) !== value.count) {
    throw new Error(`Lv${level}: ${family} shape histogram/count mismatch`);
  }
  if (["numericIce", "covers"].includes(family) && (!Array.isArray(value.values) || value.values.length !== value.count || value.values.some((n) => !integer(n)))) {
    throw new Error(`Lv${level}: ${family} values/count mismatch`);
  }
  if (family === "shells" && (!Array.isArray(value.extra_layers) || value.extra_layers.length !== value.count || value.extra_layers.some((n) => n !== 1))) {
    throw new Error(`Lv${level}: shell layers/count mismatch`);
  }
  if (family === "covers" && (!Array.isArray(value.hidden_batch_counts) || value.hidden_batch_counts.length !== value.count || value.hidden_batch_counts.some((n) => !integer(n) || n === 0))) {
    throw new Error(`Lv${level}: cover cohorts/count mismatch`);
  }
  if (["numericIce", "shells"].includes(family) && (!Array.isArray(value.items) || value.items.length !== value.count)) {
    throw new Error(`Lv${level}: ${family} carrier list/count mismatch`);
  }
  if (family === "covers" && (!Array.isArray(value.hidden_batch_histograms) || value.hidden_batch_histograms.length !== value.count
    || value.hidden_batch_histograms.some((histogram, index) => Object.values(histogram).reduce((a, b) => a + b, 0) !== value.hidden_batch_counts[index]))) {
    throw new Error(`Lv${level}: cover shape histogram/cohort mismatch`);
  }
}

export function applyInventoryReview(source, row) {
  if (!row?.verified || row.level !== source.level) throw new Error("Unverified/wrong-level inventory review");
  const result = structuredClone(source);
  result.mechanisms ??= {};
  for (const [family, key] of Object.entries(INVENTORY_FIELDS)) {
    const observation = row.mechanisms[family];
    if (observation === null) { result.mechanisms[key] = null; continue; }
    const base = result.mechanisms[key];
    for (const field of ["count", "values", "hidden_batch_counts", "post_melt_shell"]) {
      if (base && Object.hasOwn(base, field) && Object.hasOwn(observation, field) && !same(base[field], observation[field]) && !row.sourceCorrections) {
        throw new Error(`Lv${source.level}: unlabelled source correction to ${family}.${field}`);
      }
    }
    const empty = { count: 0, values: [], items: [], extra_layers: [], hidden_batch_counts: [], hidden_batch_histograms: [] };
    const value = observation.count === 0 ? { ...empty, ...observation } : { ...base, ...observation };
    validateMergedMechanism(source.level, family, value);
    result.mechanisms[key] = value;
  }
  const correction = row.sourceCorrections;
  if (correction?.composition) result.composition = { ...result.composition, ...structuredClone(correction.composition) };
  if (correction?.stage_seeds) result.stage_seeds = structuredClone(correction.stage_seeds);
  // The four remaining mechanism families (ordinary/frozen exits, shapes and
  // board) have explicit observations too, not inferred absence from 11 keys.
  const exits = row.exits ?? row.mechanisms.exits;
  const sourceExits = result.mechanisms.directional_exits;
  const ordinaryCount = exits?.ordinary_count ?? exits?.ordinary?.count;
  const iceValues = exits?.frozen_values ?? exits?.frozen?.values;
  const starCount = exits?.star_count ?? exits?.star?.count;
  const frozenStarCount = exits?.star_frozen_count ?? exits?.starFrozen?.count;
  if (!integer(ordinaryCount) || !Array.isArray(iceValues) || !integer(starCount) || !integer(frozenStarCount)
    || ordinaryCount !== sourceExits.ordinary_count || starCount !== sourceExits.star_count || frozenStarCount !== sourceExits.star_frozen_count
    || !same([...iceValues].sort((a, b) => a - b), [...sourceExits.frozen_values].sort((a, b) => a - b))) {
    throw new Error(`Lv${source.level}: reviewed exit inventory mismatch`);
  }
  const board = row.boardReference ?? row.board ?? row.mechanisms.irregularBoard;
  if (board?.cols !== result.board.cols || board?.rows !== result.board.rows) throw new Error(`Lv${source.level}: reviewed board dimensions mismatch`);
  const shapes = row.blocks ?? row.composition ?? row.mechanisms.irregularBlocks;
  const fullHistogram = shapes?.fullShapeHistogram ?? shapes?.full_shape_histogram;
  if (!fullHistogram || !sameHistogram(fullHistogram, result.composition.source_full_shape_histogram)) throw new Error(`Lv${source.level}: reviewed full shape inventory mismatch`);
  return result;
}
