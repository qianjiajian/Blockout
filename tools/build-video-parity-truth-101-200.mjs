import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = resolve(root, "deliverables/level-generation-blueprint");
const truthPath = resolve(outputDir, "blockout-lv101-lv200-video-parity-truth-v1.json");
const markdownPath = resolve(outputDir, "blockout-lv101-lv200-video-parity-truth-v1.md");
const sourceManifestPath = resolve(root, ".codex-temp/video-audit-101-200-source-manifest.json");
const inputPaths = [
  resolve(root, ".codex-temp/video-audit-101-134/facts.json"),
  resolve(root, ".codex-temp/video-audit-135-169/facts.json"),
  resolve(root, ".codex-temp/video-audit-170-200/facts.json"),
];

const stripBom = (value) => value.replace(/^\uFEFF/, "");
const readJson = async (path) => JSON.parse(stripBom(await readFile(path, "utf8")));
const sha256 = async (path) => createHash("sha256").update(await readFile(path)).digest("hex").toUpperCase();
const rel = (path) => relative(root, path).replaceAll("\\", "/");
const isObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const isUnknown = (value) => value == null || value === "unclear" || value === "partial";
const firstKnown = (...values) => values.find((value) => !isUnknown(value)) ?? null;
const asPositiveInteger = (value) => Number.isInteger(value) && value > 0 ? value : null;
const countMask = (mask) => mask?.join("").replaceAll(".", "").length ?? null;
const countMaskComponents = (mask) => {
  if (!Array.isArray(mask) || !mask.length) return null;
  const rows = mask.length;
  const cols = mask[0]?.length ?? 0;
  const remaining = new Set(mask.flatMap((row, y) => [...row].flatMap((cell, x) => (
    cell === "#" ? [`${x},${y}`] : []
  ))));
  let count = 0;
  while (remaining.size) {
    count += 1;
    const first = remaining.values().next().value;
    remaining.delete(first);
    const queue = [first];
    while (queue.length) {
      const [x, y] = queue.shift().split(",").map(Number);
      for (const [nextX, nextY] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
        const key = `${nextX},${nextY}`;
        if (nextX >= 0 && nextX < cols && nextY >= 0 && nextY < rows && remaining.delete(key)) queue.push(key);
      }
    }
  }
  return count;
};

const SHAPES = new Set([
  "SINGLE", "H2", "V2", "H3", "V3", "H4", "V4", "SQ2", "RECT2X3", "SQ3",
  "L3", "L4", "L5", "T4", "T5", "T6", "S4", "CROSS5",
]);
const SHAPE_ALIASES = new Map([
  ["SINGLE", "SINGLE"], ["SQUARE_1X1", "SINGLE"],
  ["SQUARE_2X2", "SQ2"], ["2X2", "SQ2"], ["SQ2", "SQ2"],
  ["RECTANGLE_2X3", "RECT2X3"], ["RECT2X3", "RECT2X3"], ["RECT3X2", "RECT2X3"], ["R3X2", "RECT2X3"],
  ["SQUARE_3X3", "SQ3"], ["3X3", "SQ3"], ["SQ3", "SQ3"],
  ["R3X3", "SQ3"], ["PLUS5", "CROSS5"], ["PLUS_5", "CROSS5"],
  ["T6_TOP4_STEM2", "T6"],
]);
const canonicalShape = (rawShape) => {
  const normalized = String(rawShape).trim().toUpperCase().replaceAll("×", "X").replaceAll("-", "_");
  if (SHAPE_ALIASES.has(normalized)) return SHAPE_ALIASES.get(normalized);
  if (normalized.includes("SQUARE_3X3")) return "SQ3";
  if (normalized.includes("SQUARE_2X2")) return "SQ2";
  if (normalized.includes("SQUARE_1X1")) return "SINGLE";
  if (normalized.includes("RECTANGLE_2X3") || normalized.includes("RECTANGLE_3X2")) return "RECT2X3";
  if (normalized.includes("PLUS5") || normalized.includes("PLUS_5")) return "CROSS5";
  if (SHAPES.has(normalized)) return normalized;
  const suffix = normalized.split("_").find((part) => SHAPES.has(part));
  return suffix ?? null;
};
const normalizeHistogramDetailed = (rawHistogram) => {
  if (!isObject(rawHistogram)) return { histogram: null, status: "unclear", unparsed: [] };
  const result = {};
  const unparsed = [];
  for (const [rawShape, rawCount] of Object.entries(rawHistogram)) {
    const shape = canonicalShape(rawShape);
    const count = asPositiveInteger(rawCount);
    if (!shape || !count) {
      unparsed.push({ source_shape: rawShape, count: rawCount });
      continue;
    }
    result[shape] = (result[shape] ?? 0) + count;
  }
  return {
    histogram: Object.keys(result).length ? result : null,
    status: unparsed.length ? "partial" : Object.keys(result).length ? "exact" : "unclear",
    unparsed,
  };
};
const histogramTotal = (histogram) => Object.values(histogram ?? {}).reduce((sum, count) => sum + count, 0);

const normalizeMask = (rawMask, rows, cols) => {
  if (Array.isArray(rawMask)
    && rawMask.length === rows
    && rawMask.every((line) => typeof line === "string" && line.length === cols && /^[.#]+$/.test(line))) {
    return rawMask;
  }
  if (typeof rawMask === "string" && /full rectangle/i.test(rawMask) && rows && cols) {
    return Array.from({ length: rows }, () => "#".repeat(cols));
  }
  return null;
};

const normalizeComposition = (record) => {
  const composition = record.composition ?? {};
  const nestedOpening = isObject(composition.opening) ? composition.opening : null;
  const nestedFull = isObject(composition.full) ? composition.full : null;
  const opening = nestedOpening ?? composition;
  const full = nestedFull ?? composition;
  const openingHistogram = normalizeHistogramDetailed(firstKnown(
    nestedOpening?.shape_histogram,
    composition.opening_shape_histogram,
    composition.shape_histogram,
  ));
  const fullHistogram = normalizeHistogramDetailed(firstKnown(
    nestedFull?.shape_histogram,
    composition.full_shape_histogram,
    composition.shape_histogram,
  ));
  const openingMeasurementStatus = String(firstKnown(
    opening.measurement_status,
    composition.opening_measurement_status,
    composition.opening_status,
    "",
  ));
  const fullMeasurementStatus = String(firstKnown(
    full.measurement_status,
    composition.full_measurement_status,
    composition.full_status,
    "",
  ));
  if (/partial|unclear|coarse/i.test(openingMeasurementStatus) && openingHistogram.status === "exact") {
    openingHistogram.status = "partial";
  }
  if (/partial|unclear|coarse/i.test(fullMeasurementStatus) && fullHistogram.status === "exact") {
    fullHistogram.status = "partial";
  }
  return {
    opening_piece_count: asPositiveInteger(firstKnown(opening.piece_count, composition.opening_piece_count)),
    opening_shape_histogram: openingHistogram.histogram,
    opening_shape_histogram_status: openingHistogram.status,
    opening_shape_histogram_unparsed: openingHistogram.unparsed,
    opening_color_count: asPositiveInteger(firstKnown(opening.color_count, composition.opening_color_count)),
    opening_component: firstKnown(opening.component, composition.opening_component),
    source_full_piece_count: asPositiveInteger(firstKnown(full.piece_count, composition.full_piece_count)),
    source_full_shape_histogram: fullHistogram.histogram,
    source_full_shape_histogram_status: fullHistogram.status,
    source_full_shape_histogram_unparsed: fullHistogram.unparsed,
    full_color_count: asPositiveInteger(firstKnown(full.color_count, composition.full_color_count)),
    visible_piece_anchors: Array.isArray(composition.visible_piece_anchors)
      ? composition.visible_piece_anchors
      : null,
    source_notes: firstKnown(composition.notes, opening.observed, full.observed),
  };
};

const normalizeExits = (mechanisms) => {
  if (Array.isArray(mechanisms.gates)) {
    const ordinary = mechanisms.gates.filter((gate) => gate.class === "ordinary");
    const frozen = mechanisms.gates.filter((gate) => gate.class === "frozen");
    const star = mechanisms.gates.filter((gate) => gate.star || gate.class === "star");
    return { ordinary, frozen, star };
  }
  const exits = mechanisms.exits;
  if (!isObject(exits)) return { ordinary: null, frozen: null, star: null };
  const frozen = Array.isArray(exits.frozen)
    ? exits.frozen
    : isObject(exits.frozen_values_by_side)
      ? Object.entries(exits.frozen_values_by_side).flatMap(([side, values]) => (
        Array.isArray(values) ? values.map((value) => ({ side, value })) : []
      ))
      : null;
  return {
    ordinary: Array.isArray(exits.ordinary) ? exits.ordinary : null,
    frozen,
    star: Array.isArray(exits.star) ? exits.star : null,
    source: exits,
  };
};

const asList = (value) => Array.isArray(value) ? value : [];
const mechanismPresent = (value) => Array.isArray(value)
  ? value.length > 0
  : isObject(value)
    ? (Number(value.count) > 0 || (Array.isArray(value.items) && value.items.length > 0) || Object.keys(value).length > 0)
    : false;
const normalizeMechanisms = (record) => {
  const source = record.mechanisms ?? {};
  const unsupported = [
    ...asList(source.unsupported),
    ...asList(source.unsupported_mechanisms),
    ...asList(source.unknown_visuals),
  ];
  return {
    directional_exits: normalizeExits(source),
    numeric_ice: firstKnown(source.numeric_ice, null),
    shells: firstKnown(source.shells, null),
    keys_locks: firstKnown(source.keys_locks, source.key_locks, null),
    axis_blocks: firstKnown(source.axis_blocks, null),
    covers: firstKnown(source.covers, null),
    staged_frames: firstKnown(source.staged_frames, null),
    generators: firstKnown(source.generators, null),
    elevators: firstKnown(source.elevators, null),
    conveyors: firstKnown(source.conveyors, null),
    star_blocks: firstKnown(source.star_blocks, source.stars, null),
    bombs: firstKnown(source.bombs, null),
    rotatable_blocks: firstKnown(source.rotatable_blocks, null),
    flip_doors: firstKnown(source.flip_doors, null),
    colored_grid: firstKnown(source.colored_grid, null),
    unsupported,
    source_record: source,
  };
};

const normalizeProvenance = (record) => {
  const source = record.provenance ?? {};
  const sourceVideo = firstKnown(source.source_video, source.video);
  return {
    source: sourceVideo ? `C:/Users/Administrator/Desktop/block out/参考视频/${String(sourceVideo).split(/[\\/]/).at(-1)}` : null,
    classification: sourceVideo ? "local_video_fact" : "source_missing_external_reference_only",
    opening_second: firstKnown(source.opening_second, null),
    opening_frame: firstKnown(source.opening_frame, null),
    opening_state: firstKnown(source.opening_state, source.opening_status, null),
    confidence: firstKnown(source.confidence, "mixed_by_field"),
    web_reference: record.web_reference ?? null,
  };
};

const exactFieldStatus = (level) => {
  const missing = [];
  const require = (path, value) => { if (isUnknown(value)) missing.push(path); };
  require("time_seconds", level.time_seconds);
  require("board.rows", level.board.rows);
  require("board.cols", level.board.cols);
  require("board.playable_cell_count", level.board.playable_cell_count);
  require("board.source_playable_mask", level.board.source_playable_mask);
  require("composition.opening_piece_count", level.composition.opening_piece_count);
  require("composition.opening_shape_histogram", level.composition.opening_shape_histogram);
  if (level.composition.opening_shape_histogram_status !== "exact") missing.push("composition.opening_shape_histogram(exact)");
  if (level.composition.opening_piece_count
    && histogramTotal(level.composition.opening_shape_histogram) !== level.composition.opening_piece_count) {
    missing.push("composition.opening_shape_histogram(total_matches_piece_count)");
  }
  require("composition.opening_color_count", level.composition.opening_color_count);
  require("composition.source_full_piece_count", level.composition.source_full_piece_count);
  require("composition.source_full_shape_histogram", level.composition.source_full_shape_histogram);
  if (level.composition.source_full_shape_histogram_status !== "exact") missing.push("composition.source_full_shape_histogram(exact)");
  if (level.composition.source_full_piece_count
    && histogramTotal(level.composition.source_full_shape_histogram) !== level.composition.source_full_piece_count) {
    missing.push("composition.source_full_shape_histogram(total_matches_piece_count)");
  }
  require("composition.full_color_count", level.composition.full_color_count);
  return missing;
};

const inputDocuments = await Promise.all(inputPaths.map(async (path) => ({
  path,
  sha256: await sha256(path),
  document: await readJson(path),
})));
const rawByLevel = new Map();
for (const input of inputDocuments) {
  for (const record of input.document.levels ?? []) {
    if (rawByLevel.has(record.level)) throw new Error(`Duplicate Lv${record.level}`);
    rawByLevel.set(record.level, { record, input });
  }
}

const levels = [];
for (let levelNumber = 101; levelNumber <= 200; levelNumber += 1) {
  const source = rawByLevel.get(levelNumber);
  if (!source) throw new Error(`Missing Lv${levelNumber}`);
  const { record, input } = source;
  const rows = asPositiveInteger(record.board?.rows);
  const cols = asPositiveInteger(record.board?.cols);
  const rawMask = firstKnown(record.board?.playable_mask, record.board?.mask);
  const mask = normalizeMask(rawMask, rows, cols);
  const playableCount = asPositiveInteger(firstKnown(
    record.board?.playable_cell_count,
    record.board?.playable_cells,
    countMask(mask),
  ));
  const normalized = {
    level: levelNumber,
    level_id: `Lv${String(levelNumber).padStart(3, "0")}`,
    provenance: {
      ...normalizeProvenance(record),
      evidence_artifact: rel(input.path),
      evidence_sha256: input.sha256,
    },
    time_seconds: asPositiveInteger(record.time_seconds),
    board: {
      rows,
      cols,
      playable_cell_count: playableCount,
      source_playable_mask: mask,
      source_mask_status: mask ? "exact_or_reconstructed_from_opening" : "unclear",
      source_component_count: Array.isArray(record.board?.components) && record.board.components.length > 1
        ? record.board.components.length
        : countMaskComponents(mask)
          ?? asPositiveInteger(record.board?.components)
          ?? (Array.isArray(record.board?.components) ? record.board.components.length : null),
      source_components: Array.isArray(record.board?.components) ? record.board.components : null,
      source_notes: firstKnown(record.board?.outline_notes, rawMask),
    },
    composition: normalizeComposition(record),
    mechanisms: normalizeMechanisms(record),
    stage_seeds: Array.isArray(record.stage_seeds) ? record.stage_seeds : null,
    raw_evidence: record.raw_evidence ?? [],
    source_unclear_fields: Array.isArray(record.unclear_fields) ? record.unclear_fields : [],
  };
  normalized.required_exact_fields_missing = exactFieldStatus(normalized);
  levels.push(normalized);
}

const firstMechanismLevel = (predicate) => levels.find(predicate)?.level ?? null;
const firstAppearances = {
  timed_bomb: firstMechanismLevel((level) => mechanismPresent(level.mechanisms.bombs)),
  circular_double_arrow_marked_block: firstMechanismLevel((level) => mechanismPresent(level.mechanisms.rotatable_blocks)
    || level.mechanisms.unsupported.some((entry) => /circular|double-arrow|双箭头/i.test(JSON.stringify(entry)))),
  flip_door: firstMechanismLevel((level) => mechanismPresent(level.mechanisms.flip_doors)),
  colored_grid: firstMechanismLevel((level) => mechanismPresent(level.mechanisms.colored_grid)),
};

const sourceManifest = await readJson(sourceManifestPath);
const sourceVideos = sourceManifest.map((entry) => ({
  path: entry.path.replaceAll("\\", "/"),
  bytes: entry.bytes,
  sha256: entry.sha256,
}));
const exactLevels = levels.filter((level) => level.required_exact_fields_missing.length === 0);
const sourceMissingLevels = levels.filter((level) => !level.provenance.source).map((level) => level.level);
const truth = {
  schema_version: "blockout-video-parity-truth-101-200-v1",
  title: "Block Out! Lv101-200 competitor video parity truth v1",
  generated_on: "2026-09-17",
  status: exactLevels.length === levels.length ? "source_truth_complete" : "source_truth_with_explicit_unclear_fields",
  rules: {
    evidence_only: "Local-video facts, external references, and design fills are separate. Null/unclear fields are never relabelled as observed facts.",
    video_sampling: "All supplied videos were scanned at one frame per second; openings and mechanism transitions use adjacent-frame review.",
    untouched_opening: "Only the untouched opening, or the earliest explicitly labelled available frame, is used for opening composition.",
    no_solver: "No gameplay solver, completion witness, difficulty score, or reposition proof is run or claimed in this data pass.",
    source_gap: "Lv190-Lv191 are absent from the supplied videos and remain source-missing unless a version-matched historical screenshot is verified.",
  },
  sources: inputDocuments.map((entry) => ({ path: rel(entry.path), sha256: entry.sha256 })),
  source_videos: sourceVideos,
  summary: {
    level_count: levels.length,
    exact_required_field_level_count: exactLevels.length,
    levels_with_required_unclear_fields: levels.length - exactLevels.length,
    source_missing_level_ids: sourceMissingLevels,
  },
  new_mechanism_first_appearance_in_range: firstAppearances,
  levels,
};

const markdown = [
  "# Block Out! Lv101–200 竞品视频事实表 v1",
  "",
  `- 关卡：${levels.length}`,
  `- 关键字段全精确：${exactLevels.length}`,
  `- 仍含关键 unclear：${levels.length - exactLevels.length}`,
  `- 视频缺失：${sourceMissingLevels.map((level) => `Lv${level}`).join("、") || "无"}`,
  "- 求解状态：未运行（按用户要求）",
  "",
  "| 关卡 | 时间 | 棋盘 | 开局块/完整块 | 颜色 | 新机制 | 关键缺失字段 |",
  "|---:|---:|---:|---:|---:|---|---|",
  ...levels.map((level) => {
    const mechanisms = [
      mechanismPresent(level.mechanisms.bombs) ? "Bomb" : null,
      mechanismPresent(level.mechanisms.rotatable_blocks)
        || level.mechanisms.unsupported.some((entry) => /circular|double-arrow|双箭头/i.test(JSON.stringify(entry)))
        ? "Circular double-arrow (logic unclear)" : null,
      mechanismPresent(level.mechanisms.flip_doors) ? "Flip Door" : null,
      mechanismPresent(level.mechanisms.colored_grid) ? "Colored Grid" : null,
    ].filter(Boolean).join("、");
    return `| ${level.level} | ${level.time_seconds ?? "unclear"} | ${level.board.rows ?? "?"}×${level.board.cols ?? "?"} (${level.board.playable_cell_count ?? "?"}) | ${level.composition.opening_piece_count ?? "?"}/${level.composition.source_full_piece_count ?? "?"} | ${level.composition.full_color_count ?? "?"} | ${mechanisms || "-"} | ${level.required_exact_fields_missing.join("、") || "-"} |`;
  }),
  "",
].join("\n");

await mkdir(outputDir, { recursive: true });
await Promise.all([
  writeFile(truthPath, `${JSON.stringify(truth, null, 2)}\n`),
  writeFile(markdownPath, markdown),
]);

console.log(JSON.stringify({
  truth: rel(truthPath),
  markdown: rel(markdownPath),
  level_count: levels.length,
  exact_required_field_level_count: exactLevels.length,
  source_missing_levels: sourceMissingLevels,
  new_mechanism_first_appearance_in_range: firstAppearances,
}, null, 2));
