import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const inputs = [
  ".codex-temp/video-audit-101-134/facts.json",
  ".codex-temp/video-audit-135-169/facts.json",
  ".codex-temp/video-audit-170-200/facts.json",
];

const readJson = (relativePath) => JSON.parse(readFileSync(resolve(root, relativePath), "utf8"));
const isObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const isUnknown = (value) => value == null || value === "unclear" || value === "partial";
const positiveInteger = (value) => Number.isInteger(value) && value > 0;
const histogram = (value) => isObject(value)
  && Object.keys(value).length > 0
  && Object.values(value).every(positiveInteger);
const histogramTotal = (value) => Object.values(value ?? {}).reduce((sum, count) => sum + Number(count), 0);

const pathValue = (record, path) => path.split(".").reduce((value, key) => value?.[key], record);
const requiredExactPaths = [
  "time_seconds",
  "board.rows",
  "board.cols",
  "board.playable_cells",
  "board.playable_mask",
  "composition.opening_piece_count",
  "composition.opening_shape_histogram",
  "composition.opening_color_count",
  "composition.full_piece_count",
  "composition.full_shape_histogram",
  "composition.full_color_count",
];

const loaded = inputs.filter((input) => existsSync(resolve(root, input))).map((input) => ({
  input,
  document: readJson(input),
}));
const duplicateLevels = [];
const byLevel = new Map();
for (const { input, document } of loaded) {
  if (!Array.isArray(document.levels)) throw new Error(`${input}: levels must be an array`);
  for (const record of document.levels) {
    if (!Number.isInteger(record.level)) throw new Error(`${input}: invalid level id`);
    if (byLevel.has(record.level)) duplicateLevels.push(record.level);
    byLevel.set(record.level, { input, record });
  }
}

const missingLevels = [];
const perLevel = [];
for (let level = 101; level <= 200; level += 1) {
  const entry = byLevel.get(level);
  if (!entry) {
    missingLevels.push(level);
    perLevel.push({ level, source: null, exact: false, missing: true, unresolved: ["entire_level"] });
    continue;
  }
  const sourceMissing = entry.record.provenance?.source_status === "source_missing";
  if (sourceMissing) missingLevels.push(level);
  const unresolved = requiredExactPaths.filter((path) => {
    const value = pathValue(entry.record, path);
    if (isUnknown(value)) return true;
    if (path.endsWith("shape_histogram")) return !histogram(value);
    if (path === "board.playable_mask") return !Array.isArray(value) || value.length === 0;
    return false;
  });
  const issues = [];
  const openingCount = entry.record.composition?.opening_piece_count;
  const openingHistogram = entry.record.composition?.opening_shape_histogram;
  if (positiveInteger(openingCount) && histogram(openingHistogram)
    && histogramTotal(openingHistogram) !== openingCount) {
    issues.push(`opening histogram totals ${histogramTotal(openingHistogram)}, expected ${openingCount}`);
  }
  const fullCount = entry.record.composition?.full_piece_count;
  const fullHistogram = entry.record.composition?.full_shape_histogram;
  if (positiveInteger(fullCount) && histogram(fullHistogram)
    && histogramTotal(fullHistogram) !== fullCount) {
    issues.push(`full histogram totals ${histogramTotal(fullHistogram)}, expected ${fullCount}`);
  }
  const rows = entry.record.board?.rows;
  const cols = entry.record.board?.cols;
  const mask = entry.record.board?.playable_mask;
  if (positiveInteger(rows) && positiveInteger(cols) && Array.isArray(mask)) {
    if (mask.length !== rows || mask.some((row) => typeof row !== "string" || row.length !== cols || !/^[.#]+$/.test(row))) {
      issues.push("playable mask dimensions/content do not match rows/cols");
    } else {
      const maskCells = mask.join("").replaceAll(".", "").length;
      if (positiveInteger(entry.record.board?.playable_cells) && maskCells !== entry.record.board.playable_cells) {
        issues.push(`playable mask has ${maskCells} cells, expected ${entry.record.board.playable_cells}`);
      }
    }
  }
  perLevel.push({
    level,
    source: entry.input,
    exact: !sourceMissing && unresolved.length === 0 && issues.length === 0,
    missing: sourceMissing,
    unresolved,
    issues,
  });
}

const exactLevels = perLevel.filter((entry) => entry.exact).map((entry) => entry.level);
const unresolvedLevels = perLevel.filter((entry) => !entry.exact && !entry.missing);
const unsupported = [...byLevel.values()].flatMap(({ record }) => {
  const explicit = Array.isArray(record.mechanisms?.unsupported) ? record.mechanisms.unsupported : [];
  const inferred = [];
  if ((record.mechanisms?.bombs?.length ?? 0) > 0) inferred.push({ type: "bomb" });
  if ((record.mechanisms?.flip_doors?.length ?? 0) > 0) inferred.push({ type: "flip_door" });
  if ((record.mechanisms?.colored_grid?.cells?.length ?? 0) > 0) inferred.push({ type: "colored_grid" });
  return [...explicit, ...inferred].map((mechanism) => ({ level: record.level, ...mechanism }));
});

const report = {
  schema_version: "blockout-video-parity-facts-audit-v1",
  input_count: loaded.length,
  loaded_inputs: loaded.map(({ input }) => input),
  level_count: byLevel.size,
  missing_levels: missingLevels,
  duplicate_levels: [...new Set(duplicateLevels)].sort((a, b) => a - b),
  exact_level_count: exactLevels.length,
  exact_levels: exactLevels,
  unresolved_level_count: unresolvedLevels.length,
  unresolved_levels: unresolvedLevels,
  unsupported_mechanisms: unsupported,
  ready_for_formal_generation: missingLevels.length === 0
    && duplicateLevels.length === 0
    && unresolvedLevels.length === 0,
};

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (!report.ready_for_formal_generation) process.exitCode = 2;
