import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { build } from "esbuild";
import { chromium } from "playwright";

const ROOT = process.cwd();
const OUTPUT = path.resolve(ROOT, process.argv[2] ?? "deliverables/competitor-vs-ours-lv001-200-current");
const BASE_URL = process.env.BLOCK_OUT_URL ?? "http://127.0.0.1:5173/";
const VIEWPORT = { width: 496, height: 1078 };
const PAIR_VIEWPORT = { width: 1500, height: 1280 };
const LEVEL_FROM = 1;
const LEVEL_TO = 200;
const LEVEL_COUNT = LEVEL_TO - LEVEL_FROM + 1;

const TRUTH_001_100 = path.resolve(ROOT, "deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-truth-v6.json");
const TRUTH_101_200 = path.resolve(ROOT, "deliverables/level-generation-blueprint/blockout-lv101-lv200-video-parity-truth-v1.json");
const COMPETITOR_001_100 = path.resolve(ROOT, "deliverables/competitor-screenshots/BlockOut-competitor-levels-001-100-2026-06/levels");
const COMPETITOR_101_200_ARCHIVE = path.resolve(ROOT, "deliverables/competitor-vs-ours-lv101-200-candidates-v1/competitor-opening");
const OUR_OPENINGS = path.join(OUTPUT, "ours-opening");
const GENERATED_PLACEHOLDERS = path.join(OUTPUT, "competitor-placeholders");
const COMPARISONS = path.join(OUTPUT, "level-comparisons");

const SHAPE_ORDER = [
  "SINGLE", "H2", "V2", "H3", "V3", "H4", "V4", "SQ2", "L3", "T4", "L4", "S4",
  "T5", "L5", "T6", "L6", "CROSS5", "RECT2X3", "SQ3",
];
const SHAPE_LABELS = {
  SINGLE: "单格", H2: "横2格", V2: "竖2格", H3: "横3格", V3: "竖3格", H4: "横4格", V4: "竖4格",
  SQ2: "2×2", L3: "L形3格", T4: "T形4格", L4: "L形4格", S4: "S形4格", T5: "T形5格",
  L5: "L形5格", T6: "T形6格", L6: "L形6格", CROSS5: "十字5格", RECT2X3: "2×3", SQ3: "3×3",
};
const SHAPE_VARIANTS = {
  SINGLE: [[[0, 0]]],
  H2: [[[0, 0], [1, 0]]], V2: [[[0, 0], [0, 1]]],
  H3: [[[0, 0], [1, 0], [2, 0]]], V3: [[[0, 0], [0, 1], [0, 2]]],
  H4: [[[0, 0], [1, 0], [2, 0], [3, 0]]], V4: [[[0, 0], [0, 1], [0, 2], [0, 3]]],
  SQ2: [[[0, 0], [1, 0], [0, 1], [1, 1]]],
  L3: [
    [[0, 0], [0, 1], [1, 1]], [[0, 0], [1, 0], [0, 1]],
    [[0, 0], [1, 0], [1, 1]], [[1, 0], [0, 1], [1, 1]],
  ],
  T4: [
    [[0, 0], [1, 0], [2, 0], [1, 1]], [[1, 0], [0, 1], [1, 1], [1, 2]],
    [[1, 0], [0, 1], [1, 1], [2, 1]], [[0, 0], [0, 1], [1, 1], [0, 2]],
  ],
  L4: [
    [[0, 0], [0, 1], [0, 2], [1, 2]], [[0, 0], [1, 0], [2, 0], [0, 1]],
    [[0, 0], [1, 0], [1, 1], [1, 2]], [[2, 0], [0, 1], [1, 1], [2, 1]],
  ],
  S4: [[[1, 0], [2, 0], [0, 1], [1, 1]], [[0, 0], [0, 1], [1, 1], [1, 2]]],
  T5: [
    [[0, 0], [1, 0], [2, 0], [1, 1], [1, 2]], [[0, 0], [0, 1], [1, 1], [2, 1], [0, 2]],
    [[1, 0], [1, 1], [0, 2], [1, 2], [2, 2]], [[2, 0], [0, 1], [1, 1], [2, 1], [2, 2]],
  ],
  L5: [
    [[0, 0], [0, 1], [0, 2], [0, 3], [1, 3]], [[0, 0], [1, 0], [2, 0], [3, 0], [0, 1]],
    [[0, 0], [1, 0], [1, 1], [1, 2], [1, 3]], [[3, 0], [0, 1], [1, 1], [2, 1], [3, 1]],
  ],
  T6: [
    [[0, 0], [1, 0], [2, 0], [3, 0], [1, 1], [1, 2]],
    [[0, 0], [1, 0], [2, 0], [3, 0], [2, 1], [2, 2]],
    [[1, 0], [1, 1], [0, 2], [1, 2], [2, 2], [3, 2]],
    [[2, 0], [2, 1], [0, 2], [1, 2], [2, 2], [3, 2]],
    [[0, 0], [0, 1], [1, 1], [2, 1], [0, 2], [0, 3]],
    [[0, 0], [0, 1], [0, 2], [1, 2], [2, 2], [0, 3]],
    [[2, 0], [0, 1], [1, 1], [2, 1], [2, 2], [2, 3]],
    [[2, 0], [2, 1], [0, 2], [1, 2], [2, 2], [2, 3]],
  ],
  L6: [
    [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [1, 4]],
    [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [0, 1]],
    [[0, 0], [1, 0], [1, 1], [1, 2], [1, 3], [1, 4]],
    [[4, 0], [0, 1], [1, 1], [2, 1], [3, 1], [4, 1]],
  ],
  CROSS5: [[[1, 0], [0, 1], [1, 1], [2, 1], [1, 2]]],
  RECT2X3: [
    [[0, 0], [1, 0], [0, 1], [1, 1], [0, 2], [1, 2]],
    [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]],
  ],
  SQ3: [[
    [0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1], [0, 2], [1, 2], [2, 2],
  ]],
};

const canonical = (value) => {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().filter((key) => value[key] !== undefined)
    .map((key) => [key, canonical(value[key])]));
};
const same = (left, right) => JSON.stringify(canonical(left)) === JSON.stringify(canonical(right));
const sha256Buffer = (value) => createHash("sha256").update(value).digest("hex").toUpperCase();
const sha256File = async (file) => sha256Buffer(await readFile(file));
const relativeRoot = (file) => path.relative(ROOT, file).replaceAll("\\", "/");
const relativeOutput = (file) => path.relative(OUTPUT, file).replaceAll("\\", "/");
const escapeHtml = (value) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const csvCell = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
const finite = (value) => value !== null && value !== undefined && value !== ""
  && String(value).toLowerCase() !== "unclear" && Number.isFinite(Number(value));
const asArray = (value) => Array.isArray(value) ? value : [];
const sortedNumbers = (values) => asArray(values).map(Number).filter(Number.isFinite).sort((a, b) => a - b);
const levelStem = (levelId) => `level-${String(levelId).padStart(3, "0")}`;
const mimeOf = (file) => path.extname(file).toLowerCase() === ".png" ? "image/png" : "image/jpeg";
const imageDataUrl = async (file) => `data:${mimeOf(file)};base64,${(await readFile(file)).toString("base64")}`;

const shapeSignature = (shape) => {
  const points = asArray(shape);
  if (!points.length) return "";
  const minX = Math.min(...points.map(([x]) => x));
  const minY = Math.min(...points.map(([, y]) => y));
  return points.map(([x, y]) => [x - minX, y - minY]).sort((a, b) => a[1] - b[1] || a[0] - b[0])
    .map(([x, y]) => `${x},${y}`).join("|");
};
const SHAPE_BY_SIGNATURE = new Map(Object.entries(SHAPE_VARIANTS).flatMap(([shapeId, variants]) => (
  variants.map((shape) => [shapeSignature(shape), shapeId])
)));
const shapeIdOf = (shape) => SHAPE_BY_SIGNATURE.get(shapeSignature(shape))
  ?? `IRREGULAR_${asArray(shape).length}_${shapeSignature(shape)}`;
const histogramOf = (blocks) => {
  const histogram = {};
  for (const block of blocks) {
    const shapeId = shapeIdOf(block.shape);
    histogram[shapeId] = (histogram[shapeId] ?? 0) + 1;
  }
  return orderedHistogram(histogram);
};
const orderedHistogram = (histogram) => Object.fromEntries([
  ...SHAPE_ORDER.filter((shapeId) => Number(histogram?.[shapeId] ?? 0) > 0),
  ...Object.keys(histogram ?? {}).filter((shapeId) => !SHAPE_ORDER.includes(shapeId) && Number(histogram[shapeId]) > 0).sort(),
].map((shapeId) => [shapeId, Number(histogram[shapeId])]));
const histogramText = (histogram) => Object.entries(orderedHistogram(histogram)).map(([shapeId, count]) => {
  const irregular = shapeId.startsWith("IRREGULAR_") ? `异形${shapeId.split("_")[1]}格` : shapeId;
  return `${SHAPE_LABELS[shapeId] ?? irregular}×${count}`;
}).join("、") || "无";
const blockColors = (block) => block.layers?.length ? block.layers : [block.color];
const outerColor = (block) => block.layers?.[0] ?? block.color;

async function loadLevels() {
  const result = await build({
    stdin: {
      contents: `import { LEVELS } from "./src/core/levels.ts"; export default LEVELS;`,
      resolveDir: ROOT,
      loader: "ts",
      sourcefile: "generate-competitor-vs-ours-1-200.ts",
    },
    bundle: true,
    platform: "node",
    format: "esm",
    target: "es2022",
    write: false,
    logLevel: "silent",
  });
  const moduleUrl = `data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`;
  const { default: levels } = await import(moduleUrl);
  if (!Array.isArray(levels) || levels.length !== LEVEL_COUNT) {
    throw new Error(`Expected exactly ${LEVEL_COUNT} formal levels, received ${levels?.length ?? typeof levels}`);
  }
  levels.forEach((level, index) => {
    const expected = index + LEVEL_FROM;
    if (level.id !== expected) throw new Error(`LEVELS must be continuous 1-200; index ${index} is Lv${level.id}, expected Lv${expected}`);
  });
  return levels;
}

function openingVisibleBlocks(level) {
  const queuedIds = new Set(asArray(level.generators).flatMap((generator) => asArray(generator.queueBlockIds)));
  const positiveShutterIds = new Set(asArray(level.shutters).filter((shutter) => Number(shutter.count ?? 0) > 0)
    .map((shutter) => shutter.id));
  // triggerBlockIds are intentionally not excluded: they are the visible trigger cohort.
  return level.blocks.filter((block) => !queuedIds.has(block.id)
    && !(block.shutterId && positiveShutterIds.has(block.shutterId)));
}

function playableCellCount(level) {
  if (Array.isArray(level.playable)) return new Set(level.playable.map(([x, y]) => `${x},${y}`)).size;
  return level.width * level.height - new Set(asArray(level.blocked).map(([x, y]) => `${x},${y}`)).size;
}

const countOf = (value) => {
  if (value === null || value === "unclear") return null;
  if (value === undefined) return 0;
  if (Array.isArray(value)) return value.length;
  if (typeof value === "number") return value;
  if (Object.hasOwn(value, "count")) return finite(value.count) ? Number(value.count) : null;
  if (value && Array.isArray(value.items)) return value.items.length;
  if (value?.items === "unclear") return null;
  return value && typeof value === "object" && Object.keys(value).length ? 1 : 0;
};
const valuesOf = (value, keys = ["value"]) => {
  if (value === null || value === "unclear") return null;
  if (Array.isArray(value)) return sortedNumbers(value.map((item) => {
    if (typeof item === "number") return item;
    for (const key of keys) if (finite(item?.[key])) return Number(item[key]);
    if (finite(item?.frozen?.value)) return Number(item.frozen.value);
    return null;
  }).filter((item) => item !== null));
  if (Array.isArray(value?.values)) return sortedNumbers(value.values);
  return [];
};

function truthMechanismFacts(truthLevel) {
  if (truthLevel.provenance?.classification === "source_missing_external_reference_only") {
    return { sourceMissing: true, unknownKeys: ["all"], values: {}, digest: "竞品来源缺失，机制未明确" };
  }
  const mechanisms = truthLevel.mechanisms ?? {};
  const exits = mechanisms.directional_exits ?? {};
  const ordinary = exits.ordinary === null ? null
    : Array.isArray(exits.ordinary) ? exits.ordinary.length
      : finite(exits.ordinary_count) ? Number(exits.ordinary_count) : exits.ordinary_count === null ? null : 0;
  const frozenValues = Array.isArray(exits.frozen_values) ? sortedNumbers(exits.frozen_values)
    : exits.frozen === null ? null : valuesOf(exits.frozen, ["value", "frozen_value"]);
  const star = exits.star === null ? null
    : Array.isArray(exits.star) ? exits.star.length
      : finite(exits.star_count) ? Number(exits.star_count) : exits.star_count === null ? null : 0;
  const starFrozenValues = Array.isArray(exits.star_frozen_values) ? sortedNumbers(exits.star_frozen_values)
    : exits.star === null ? null : valuesOf(asArray(exits.star).filter((gate) => gate?.frozen), ["value", "frozen_value"]);
  const numericIce = countOf(mechanisms.numeric_ice);
  const numericIceValues = mechanisms.numeric_ice?.values
    ? sortedNumbers(mechanisms.numeric_ice.values)
    : valuesOf(Array.isArray(mechanisms.numeric_ice) ? mechanisms.numeric_ice : mechanisms.numeric_ice?.items, ["value"]);
  const shells = countOf(mechanisms.shells);
  const covers = countOf(mechanisms.covers);
  const coverValues = mechanisms.covers?.values
    ? sortedNumbers(mechanisms.covers.values)
    : valuesOf(Array.isArray(mechanisms.covers) ? mechanisms.covers : mechanisms.covers?.items, ["count", "value"]);
  const generators = countOf(mechanisms.generators);
  const generatorRecords = Array.isArray(mechanisms.generators) ? mechanisms.generators
    : mechanisms.generators && !Object.hasOwn(mechanisms.generators, "count") && !Array.isArray(mechanisms.generators.items)
      ? [mechanisms.generators] : asArray(mechanisms.generators?.items);
  const generatorRecordQueueLengths = generatorRecords.map((generator) => {
    if (finite(generator.queue_length)) return Number(generator.queue_length);
    if (finite(generator.queue_count)) return Number(generator.queue_count);
    if (Array.isArray(generator.queueBlockIds)) return generator.queueBlockIds.length;
    if (Array.isArray(generator.queue)) return generator.queue.length;
    return null;
  });
  const generatorQueueLengths = mechanisms.generators?.queue_lengths
    ? sortedNumbers(mechanisms.generators.queue_lengths)
    : generatorRecordQueueLengths.every((value) => value !== null)
      ? generatorRecordQueueLengths.sort((a, b) => a - b)
      : generators === 0 ? [] : null;
  const keysLocks = mechanisms.key_locks ?? mechanisms.keys_locks;
  const keys = keysLocks === null ? null : Object.hasOwn(keysLocks ?? {}, "key_count")
    ? (finite(keysLocks.key_count) ? Number(keysLocks.key_count) : null)
    : Array.isArray(keysLocks) ? keysLocks.filter((item) => item.kind === "key" || item.key === true).length : 0;
  const locks = keysLocks === null ? null : Object.hasOwn(keysLocks ?? {}, "lock_count")
    ? (finite(keysLocks.lock_count) ? Number(keysLocks.lock_count) : null)
    : Array.isArray(keysLocks) ? keysLocks.filter((item) => item.kind === "lock" || item.lock_count !== undefined).length : 0;
  const lockRequirements = locks === null ? null : keysLocks?.lock_requirements ? sortedNumbers(keysLocks.lock_requirements)
    : sortedNumbers(asArray(keysLocks?.locks ?? keysLocks).map((item) => item.lock_count).filter(finite));
  const coloredGridCells = (value) => {
    if (value === null || value === "unclear") return null;
    const entries = Array.isArray(value) ? value : value ? [value] : [];
    return entries.reduce((sum, entry) => sum + (finite(entry?.count) ? Number(entry.count) : asArray(entry?.cells).length), 0);
  };
  const facts = {
    ordinaryExits: ordinary,
    frozenExitValues: frozenValues,
    starExits: star,
    starFrozenValues,
    numericIce,
    numericIceValues,
    shells,
    covers,
    coverValues,
    generators,
    generatorQueueLengths,
    keys,
    locks,
    lockRequirements,
    axisBlocks: countOf(mechanisms.axis_blocks),
    liftLayers: countOf(mechanisms.lifts),
    stagedFrames: countOf(mechanisms.staged_frames),
    elevators: countOf(mechanisms.elevators),
    conveyors: countOf(mechanisms.conveyors),
    starBlocks: countOf(mechanisms.star_blocks ?? mechanisms.stars),
    bombs: countOf(mechanisms.bombs),
    rotationBadges: countOf(mechanisms.rotatable_blocks),
    flipDoors: countOf(mechanisms.flip_doors),
    coloredGrids: coloredGridCells(mechanisms.colored_grid),
  };
  const unknownKeys = Object.entries(facts).filter(([, value]) => value === null).map(([key]) => key);
  return { sourceMissing: false, unknownKeys, values: facts, digest: mechanismDigest(facts, unknownKeys) };
}

function actualMechanismFacts(level) {
  const ordinaryGates = level.gates.filter((gate) => !gate.star && Number(gate.frozen ?? 0) === 0);
  const frozenGates = level.gates.filter((gate) => !gate.star && Number(gate.frozen ?? 0) > 0);
  const starGates = level.gates.filter((gate) => gate.star);
  const numericIce = level.blocks.filter((block) => Number(block.frozen ?? 0) > 0);
  const covers = asArray(level.shutters).filter((shutter) => Number(shutter.count ?? 0) > 0
    && (!shutter.skin || shutter.skin === "shutter" || shutter.skin === "generator"));
  const liftLayers = asArray(level.shutters).filter((shutter) => shutter.skin === "lift");
  const stagedFrames = asArray(level.shutters).filter((shutter) => shutter.skin === "staged-frame");
  const values = {
    ordinaryExits: ordinaryGates.length,
    frozenExitValues: sortedNumbers(frozenGates.map((gate) => gate.frozen)),
    starExits: starGates.length,
    starFrozenValues: sortedNumbers(starGates.filter((gate) => Number(gate.frozen ?? 0) > 0).map((gate) => gate.frozen)),
    numericIce: numericIce.length,
    numericIceValues: sortedNumbers(numericIce.map((block) => block.frozen)),
    shells: level.blocks.filter((block) => (block.layers?.length ?? 1) > 1).length,
    covers: covers.length,
    coverValues: sortedNumbers(covers.map((cover) => cover.count)),
    generators: asArray(level.generators).length,
    generatorQueueLengths: asArray(level.generators).map((generator) => asArray(generator.queueBlockIds).length).sort((a, b) => a - b),
    keys: level.blocks.filter((block) => block.keyId).length,
    locks: level.blocks.filter((block) => block.lockedBy).length,
    lockRequirements: sortedNumbers(level.blocks.filter((block) => block.lockedBy).map((block) => block.lockCount ?? 1)),
    axisBlocks: level.blocks.filter((block) => block.movementAxis).length,
    liftLayers: liftLayers.length,
    stagedFrames: stagedFrames.length,
    elevators: asArray(level.elevators).length,
    conveyors: asArray(level.conveyors).length,
    starBlocks: level.blocks.filter((block) => block.star).length,
    bombs: level.blocks.filter((block) => finite(block.timedBombSeconds)).length,
    rotationBadges: level.blocks.filter((block) => block.rotationBadge).length,
    flipDoors: asArray(level.flipDoors).length,
    coloredGrids: asArray(level.coloredGrids).reduce((sum, grid) => sum + asArray(grid.cells).length, 0),
  };
  return { values, digest: mechanismDigest(values, []) };
}

function mechanismDigest(facts, unknownKeys) {
  const unknown = new Set(unknownKeys);
  const show = (key, value) => unknown.has(key) ? "未明确" : Array.isArray(value) ? `[${value.join(",")}]` : String(value ?? 0);
  const parts = [
    `出口：普通${show("ordinaryExits", facts.ordinaryExits)}、冰冻${show("frozenExitValues", facts.frozenExitValues)}、星门${show("starExits", facts.starExits)}${facts.starFrozenValues?.length || unknown.has("starFrozenValues") ? `（冰冻${show("starFrozenValues", facts.starFrozenValues)}）` : ""}`,
  ];
  const append = (key, label, details = "") => {
    if (unknown.has(key)) parts.push(`${label}未明确`);
    else if (Number(facts[key] ?? 0) > 0) parts.push(`${label}×${facts[key]}${details}`);
  };
  append("numericIce", "数字冰", facts.numericIceValues?.length ? ` ${show("numericIceValues", facts.numericIceValues)}` : "");
  append("shells", "多层块");
  append("covers", "卷帘门", facts.coverValues?.length ? ` ${show("coverValues", facts.coverValues)}` : "");
  append("generators", "制造器", facts.generatorQueueLengths?.length ? ` 队列${show("generatorQueueLengths", facts.generatorQueueLengths)}` : "");
  append("keys", "钥匙"); append("locks", "锁", facts.lockRequirements?.length ? ` 要求${show("lockRequirements", facts.lockRequirements)}` : "");
  append("axisBlocks", "轴向块"); append("liftLayers", "Lift层"); append("stagedFrames", "固定分层框");
  append("elevators", "升降台"); append("conveyors", "传送带"); append("starBlocks", "星标块");
  append("bombs", "炸弹"); append("rotationBadges", "双箭头块"); append("flipDoors", "翻转门"); append("coloredGrids", "彩色网格");
  return parts.join("；");
}

function mechanismMetric(truthLevel, level) {
  const competitor = truthMechanismFacts(truthLevel);
  const ours = actualMechanismFacts(level);
  const comparableKeys = Object.keys(ours.values).filter((key) => !competitor.unknownKeys.includes("all")
    && !competitor.unknownKeys.includes(key));
  const mismatches = comparableKeys.filter((key) => !same(competitor.values[key], ours.values[key]));
  const match = competitor.unknownKeys.length ? null : mismatches.length === 0;
  return {
    key: "mechanisms",
    label: "机制摘要",
    competitor: competitor.digest,
    ours: ours.digest,
    match,
    known: !competitor.unknownKeys.length,
    unknownFields: competitor.unknownKeys,
    knownMismatches: mismatches,
    raw: { competitor: competitor.values, ours: ours.values },
  };
}

const truthStatusKnown = (status) => !status || /exact|high|source_observed|unique/i.test(String(status));
function metric(key, label, competitor, ours, options = {}) {
  const known = options.sourceMissing !== true && options.known !== false
    && competitor !== null && competitor !== undefined && competitor !== "unclear";
  return {
    key,
    label,
    competitor: known ? competitor : "未明确",
    ours,
    known,
    match: known ? same(competitor, ours) : null,
    note: options.note ?? (known ? "" : "竞品来源未提供可核实的精确值"),
  };
}

function buildMetrics(truthLevel, level) {
  const sourceMissing = truthLevel.provenance?.classification === "source_missing_external_reference_only";
  const composition = truthLevel.composition ?? {};
  const opening = openingVisibleBlocks(level);
  const all = level.blocks;
  const openingShapeStatus = composition.opening_shape_histogram_status;
  const fullShapeStatus = composition.source_full_shape_histogram_status;
  return [
    metric("board_size", "棋盘大小", finite(truthLevel.board?.cols) && finite(truthLevel.board?.rows)
      ? `${truthLevel.board.cols}×${truthLevel.board.rows}` : null, `${level.width}×${level.height}`, { sourceMissing }),
    metric("playable_cells", "可玩格数", truthLevel.board?.playable_cell_count, playableCellCount(level), {
      sourceMissing, known: truthStatusKnown(truthLevel.board?.source_mask_status), note: truthLevel.board?.source_mask_status,
    }),
    metric("time_seconds", "总时间", truthLevel.time_seconds, level.timeSeconds, { sourceMissing }),
    metric("opening_piece_count", "开局色块数量", composition.opening_piece_count, opening.length, { sourceMissing }),
    metric("full_piece_count", "全关色块数量", composition.source_full_piece_count, all.length, { sourceMissing }),
    metric("opening_shape_histogram", "开局形状分布", composition.opening_shape_histogram
      ? orderedHistogram(composition.opening_shape_histogram) : null, histogramOf(opening), {
      sourceMissing, known: truthStatusKnown(openingShapeStatus), note: openingShapeStatus,
    }),
    metric("full_shape_histogram", "全关形状分布", composition.source_full_shape_histogram
      ? orderedHistogram(composition.source_full_shape_histogram) : null, histogramOf(all), {
      sourceMissing, known: truthStatusKnown(fullShapeStatus), note: fullShapeStatus,
    }),
    metric("occupied_cells", "全关色块占格", composition.source_occupied_cell_count,
      all.reduce((sum, block) => sum + block.shape.length, 0), { sourceMissing }),
    metric("opening_colors", "开局颜色种类", composition.opening_color_count,
      new Set(opening.map(outerColor)).size, { sourceMissing }),
    metric("full_colors", "全关颜色种类", composition.full_color_count,
      new Set(all.flatMap(blockColors)).size, { sourceMissing }),
  ];
}

function metricText(metricEntry, side) {
  const value = metricEntry[side];
  if (value === "未明确") return value;
  if (metricEntry.key.includes("shape_histogram")) return histogramText(value);
  return typeof value === "string" ? value : JSON.stringify(value);
}

function candidateEvidencePaths(truthLevel) {
  const provenance = truthLevel.provenance ?? {};
  const evidenceBase = provenance.evidence_artifact ? path.dirname(path.resolve(ROOT, provenance.evidence_artifact)) : null;
  const raw = [provenance.opening_frame, ...asArray(truthLevel.raw_evidence)].filter(Boolean);
  const candidates = [];
  for (const entry of raw) {
    if (path.isAbsolute(entry)) candidates.push(entry);
    else {
      candidates.push(path.resolve(ROOT, entry));
      if (evidenceBase) candidates.push(path.resolve(evidenceBase, entry));
    }
  }
  return [...new Set(candidates)];
}

function competitorImageSource(truthLevel) {
  const levelId = truthLevel.level;
  if (levelId <= 100) {
    const file = path.join(COMPETITOR_001_100, `competitor-level-${String(levelId).padStart(3, "0")}.jpg`);
    return existsSync(file) ? { file, kind: "lv001-100-archive", placeholder: false } : { file: null, kind: "missing", placeholder: true };
  }
  const sourceMissing = truthLevel.provenance?.classification === "source_missing_external_reference_only";
  for (const extension of ["jpg", "png"]) {
    const archive = path.join(COMPETITOR_101_200_ARCHIVE, `${levelStem(levelId)}.${extension}`);
    if (existsSync(archive)) {
      return { file: archive, kind: sourceMissing ? "truth-source-missing-archive-placeholder" : "truth-evidence-stable-archive", placeholder: sourceMissing };
    }
  }
  if (!sourceMissing) {
    const evidence = candidateEvidencePaths(truthLevel).find((candidate) => existsSync(candidate));
    if (evidence) return { file: evidence, kind: "truth-provenance-opening-frame-or-raw-evidence", placeholder: false };
  }
  return { file: null, kind: "generated-source-missing-placeholder", placeholder: true };
}

const waitTwoFrames = (page) => page.evaluate(() => new Promise((resolve) => {
  requestAnimationFrame(() => requestAnimationFrame(resolve));
}));

async function waitForCurrentLevelArt(page, levelId) {
  try {
    await page.waitForFunction((expectedId) => {
      const state = window.__COLOR_ESCAPE__?.getDebugState();
      const formal = state?.art?.formalGameplay;
      // Treat an unexpected return to Home as a terminal state for this
      // attempt so the caller can recover immediately instead of spending the
      // full art timeout waiting for a screen that is no longer active.
      if (state?.screen === "home" && state?.level?.id === expectedId) return true;
      return state?.screen === "playing" && state?.level?.id === expectedId
        && state?.art?.ready === true && state?.art?.plainBlocksReady === true
        && formal?.uiReady === true && formal?.floorReady === true && formal?.selectionFrameReady === true
        && formal?.requestedBlockSignature === undefined && !formal?.blockError
        && formal?.loadedWholeBlockCoverage === formal?.exactWholeBlockCoverage;
    }, levelId, { timeout: 45_000 });
    const state = await page.evaluate(() => window.__COLOR_ESCAPE__?.getDebugState());
    if (state?.screen === "home") return false;
    return true;
  } catch (error) {
    const state = await page.evaluate(() => window.__COLOR_ESCAPE__?.getDebugState()).catch(() => undefined);
    throw new Error(`Lv${levelId}: formal opening art did not settle: ${JSON.stringify({
      screen: state?.screen, level: state?.level?.id, art: state?.art,
    })}`, { cause: error });
  }
}

async function waitForCaptureApp(page) {
  await page.waitForLoadState("domcontentloaded", { timeout: 45_000 }).catch(() => undefined);
  await page.waitForFunction(
    () => window.__COLOR_ESCAPE__?.getDebugState()?.art?.ready === true,
    undefined,
    { timeout: 45_000 },
  );
}

async function loadLevelForCapture(page, levelId) {
  let state;
  let lastError;
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      await waitForCaptureApp(page);
      await page.evaluate((id) => window.__COLOR_ESCAPE__.loadLevel(id, true), levelId);
      if (await waitForCurrentLevelArt(page, levelId)) return;
    } catch (error) {
      lastError = error;
      if (page.isClosed()) throw error;
    }
    state = await page.evaluate(() => window.__COLOR_ESCAPE__?.getDebugState()).catch(() => undefined);
    console.warn(`Lv${levelId}: load attempt ${attempt} was interrupted or returned Home; retrying`);
  }
  throw new Error(`Lv${levelId}: could not keep the requested level active: ${JSON.stringify({
    screen: state?.screen, level: state?.level?.id,
  })}`, { cause: lastError });
}

async function prepareCapturePage(browser, levels) {
  const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: 1 });
  page.on("pageerror", (error) => console.error("PAGE", error.message));
  page.on("console", (message) => { if (message.type() === "error") console.error("CONSOLE", message.text()); });
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 45_000 });
  const featureSeen = ["basics", ...new Set(levels.map((level) => level.featureIntro?.kind).filter(Boolean))];
  await page.evaluate(({ features, highestLevel }) => {
    localStorage.setItem("color-escape-save-v1", JSON.stringify({
      schemaVersion: 1,
      currentLevel: 1,
      highestLevel,
      coins: 9999,
      sound: false,
      haptic: false,
      reducedMotion: true,
      language: "zh-CN",
      featureSeen: features,
      boosterUnlockSeen: ["time", "rocket", "pulse"],
      boosters: { time: 3, rocket: 3, pulse: 3 },
      bestStars: {},
      bestMoves: {},
      rewardedLevels: [],
      journeyProgress: { claimedMilestoneLevels: [], seenEpisodeUnlockLevels: [] },
      selectedJourneyEpisode: 1,
      lastSeenUpdate: "",
    }));
  }, { features: featureSeen, highestLevel: LEVEL_TO });
  await page.reload({ waitUntil: "domcontentloaded", timeout: 45_000 });
  await page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState()?.art?.ready === true, undefined, { timeout: 45_000 });
  await page.evaluate(() => document.fonts?.ready);
  return page;
}

async function captureOpeningAttempt(page, expectedLevel, outputFile) {
  const levelId = expectedLevel.id;
  await loadLevelForCapture(page, levelId);
  // The immediate second load removes any animation residue caused by the first asset request.
  await loadLevelForCapture(page, levelId);
  await waitTwoFrames(page);
  const state = await page.evaluate(() => {
    const value = window.__COLOR_ESCAPE__.getDebugState();
    return {
      screen: value.screen,
      level: value.level,
      levelId: value.level?.id,
      timeSeconds: value.level?.timeSeconds,
      moves: value.puzzle?.moves,
      started: value.puzzle?.started,
      remainingSeconds: value.puzzle?.remainingSeconds,
      complete: value.puzzle?.complete,
      failed: value.puzzle?.failed,
      selectedId: value.selectedId,
      activePointer: value.activePointer,
      particles: value.particles,
      exitGhosts: value.exitGhosts,
      exitPulses: value.exitPulses,
      mechanicPulses: value.mechanicPulses,
      boardShakeTime: value.boardShakeTime,
      formal: value.art?.formalGameplay,
    };
  });
  const empty = (value) => value == null || value === 0 || (Array.isArray(value) && value.length === 0);
  // Revised v1.1+ levels intentionally start their clock on the first stable
  // playable frame.  That means a clean opening can legitimately report
  // `started=true` by the time art has settled.  Keep the stronger invariants
  // (zero moves, no pointer/FX, same level data) and allow only a sub-second
  // clock advance caused by waiting for the first frame.
  const immediateClock = ["revised-2026-09-21-v1.1", "revised-2026-09-21-v1.2",
    "revised-2026-09-23-v1.3", "revised-2026-09-23-v1.4"].includes(expectedLevel.mechanismRules);
  const clockClean = immediateClock
    ? (state.started === false && state.remainingSeconds === state.timeSeconds)
      || (state.started === true && state.remainingSeconds <= state.timeSeconds
        && state.timeSeconds - state.remainingSeconds < 1)
    : state.started === false && state.remainingSeconds === state.timeSeconds;
  const clean = state.screen === "playing" && state.levelId === levelId && state.moves === 0
    && clockClean && state.complete === false && state.failed === false
    && !state.selectedId && !state.activePointer && empty(state.particles) && empty(state.exitGhosts)
    && empty(state.exitPulses) && empty(state.mechanicPulses) && state.boardShakeTime === 0;
  if (!clean) throw new Error(`Lv${levelId}: debug state is not a clean untouched opening: ${JSON.stringify(state)}`);
  if (state.formal?.blockError || state.formal?.loadedWholeBlockCoverage !== state.formal?.exactWholeBlockCoverage) {
    throw new Error(`Lv${levelId}: formal whole-piece art coverage is incomplete`);
  }
  if (!same(state.level, expectedLevel)) {
    throw new Error(`Lv${levelId}: browser level data differs from the report snapshot; stop source writes and regenerate`);
  }
  const screenshot = await page.screenshot();
  const levelAfterCapture = await page.evaluate(() => window.__COLOR_ESCAPE__?.getDebugState()?.level);
  if (!same(levelAfterCapture, expectedLevel)) {
    throw new Error(`Lv${levelId}: browser level data changed during capture; image was not saved`);
  }
  await writeFile(outputFile, screenshot);
}

async function captureOpening(page, expectedLevel, outputFile) {
  const levelId = expectedLevel.id;
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await captureOpeningAttempt(page, expectedLevel, outputFile);
      return;
    } catch (error) {
      lastError = error;
      if (page.isClosed()) throw error;
      console.warn(`Lv${levelId}: capture attempt ${attempt} was interrupted; restarting the clean opening`);
      await waitForCaptureApp(page).catch(() => undefined);
    }
  }
  throw new Error(`Lv${levelId}: opening capture failed after three attempts`, { cause: lastError });
}

async function generatePlaceholder(page, levelId, outputFile, reason) {
  await page.setContent(`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><style>
    *{box-sizing:border-box}html,body{margin:0;width:${VIEWPORT.width}px;height:${VIEWPORT.height}px;overflow:hidden}
    body{display:flex;align-items:center;justify-content:center;background:linear-gradient(160deg,#171347,#0d0a2d);color:#fff;font-family:Arial,"Microsoft YaHei",sans-serif}
    main{width:410px;padding:45px 30px;border:2px dashed #827bc5;border-radius:24px;background:#211b60;text-align:center}
    h1{margin:0 0 20px;font-size:42px}.icon{font-size:74px;color:#ffcf4a}p{font-size:24px;line-height:1.55;margin:15px 0}.small{font-size:18px;color:#bbb6e8}
  </style></head><body><main><div class="icon">?</div><h1>竞品 Lv${levelId}</h1><p>开局截图缺失</p><p class="small">${escapeHtml(reason)}<br>所有未证实字段均标记“未明确”，不会推测。</p></main></body></html>`, { waitUntil: "load" });
  await page.evaluate(() => document.fonts?.ready);
  await page.screenshot({ path: outputFile });
}

function recordStatus(metrics, mechanism, sourcePlaceholder) {
  if (sourcePlaceholder) return { id: "source-missing", label: "竞品来源缺失", className: "missing" };
  const knownRows = metrics.filter((entry) => entry.known);
  const hasMismatch = knownRows.some((entry) => entry.match === false) || mechanism.knownMismatches.length > 0;
  if (hasMismatch) return { id: "mismatch", label: "存在差异", className: "bad" };
  if (metrics.some((entry) => !entry.known) || mechanism.match === null) return { id: "unclear", label: "含未明确字段", className: "unclear" };
  return { id: "exact", label: "已知项一致", className: "ok" };
}

async function renderComparison(page, record, competitorFile, ourFile, outputFile, captureLabel) {
  const [competitorImage, ourImage] = await Promise.all([imageDataUrl(competitorFile), imageDataUrl(ourFile)]);
  const metricRows = record.metrics.map((entry) => {
    const result = entry.match === true ? "一致" : entry.match === false ? "不同" : "未明确";
    const className = entry.match === true ? "ok" : entry.match === false ? "bad" : "unclear";
    return `<div class="row"><b>${escapeHtml(entry.label)} <i class="${className}">${result}</i></b><span>${escapeHtml(metricText(entry, "competitor"))}</span><span>${escapeHtml(metricText(entry, "ours"))}</span></div>`;
  }).join("");
  const mechanismResult = record.mechanism.match === true ? "一致" : record.mechanism.match === false ? "不同" : "部分未明确";
  const mechanismClass = record.mechanism.match === true ? "ok" : record.mechanism.match === false ? "bad" : "unclear";
  await page.setContent(`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><style>
    *{box-sizing:border-box}html,body{margin:0;width:${PAIR_VIEWPORT.width}px;height:${PAIR_VIEWPORT.height}px;overflow:hidden;background:#0e0a32;color:#fff;font-family:Arial,"Microsoft YaHei",sans-serif}
    body{padding:18px 24px}header{height:53px;display:flex;justify-content:space-between;align-items:flex-start}h1{margin:0;font-size:30px}.status{padding:8px 14px;border-radius:17px;font-weight:800}
    .shots{display:grid;grid-template-columns:1fr 1fr;gap:18px;height:578px}.panel{background:#1b1753;border:1px solid #45408a;border-radius:12px;padding:9px;display:flex;flex-direction:column;align-items:center}.panel h2{font-size:20px;margin:0 0 7px}.panel img{display:block;max-width:100%;height:526px;object-fit:contain;border-radius:7px}
    .head,.row{display:grid;grid-template-columns:250px 1fr 1fr;gap:10px}.head{margin-top:11px;padding:7px 10px;background:#332d74;border-radius:7px;font-weight:800}.row{min-height:31px;padding:5px 10px;border-bottom:1px solid #312c6c;font-size:13px;line-height:20px}.row span{overflow-wrap:anywhere}.row i{font-style:normal;font-size:11px;padding:2px 7px;border-radius:10px}
    .ok{background:#174f3b;color:#7df2b5}.bad{background:#64253a;color:#ff9bae}.unclear{background:#5b4c20;color:#ffe48a}.missing{background:#55305c;color:#f0b5ff}
    .mechanism{margin-top:8px;padding:8px 11px;border-radius:8px;background:#171348;font-size:12px;line-height:1.45}.mechanism-grid{display:grid;grid-template-columns:235px 1fr 1fr;gap:10px;margin-top:5px}.note{margin-top:6px;color:#aaa6da;font-size:12px;line-height:1.35}.capture-stamp{position:absolute;bottom:10px;left:24px;right:24px;color:#aaa6da;font-size:12px;line-height:18px;background:#0e0a32}
  </style></head><body><header><h1>Lv${record.level} · ${escapeHtml(record.name)}</h1><div class="status ${record.status.className}">${escapeHtml(record.status.label)}</div></header>
    <div class="shots"><section class="panel"><h2>竞品开局截图${record.competitor.placeholder ? "（缺失占位）" : ""}</h2><img src="${competitorImage}"></section><section class="panel"><h2>本游戏当前正式开局</h2><img src="${ourImage}"></section></div>
    <div class="head"><span>核对项</span><span>竞品</span><span>本游戏</span></div>${metricRows}
    <div class="mechanism"><b>机制核对 <i class="${mechanismClass}">${mechanismResult}</i></b><div class="mechanism-grid"><strong>机制摘要</strong><span>${escapeHtml(record.mechanism.competitor)}</span><span>${escapeHtml(record.mechanism.ours)}</span></div></div>
    <div class="note">开局可见口径：排除制造器队列，以及 block.shutterId 指向正计数卷帘门的隐藏载荷；triggerBlockIds 保持可见。${record.unclearNotes.length ? ` 竞品未明确：${escapeHtml(record.unclearNotes.join("；"))}` : ""}</div>
    <footer class="capture-stamp">${escapeHtml(captureLabel)}</footer>
  </body></html>`, { waitUntil: "load" });
  await page.waitForFunction(() => [...document.images].every((image) => image.complete && image.naturalWidth > 0));
  await page.evaluate(() => document.fonts?.ready);
  await page.screenshot({ path: outputFile });
}

const levels = await loadLevels();
const truthPaths = [TRUTH_001_100, TRUTH_101_200];
const truthBuffers = await Promise.all(truthPaths.map((file) => readFile(file)));
const truthSourceSha256 = Object.fromEntries(truthPaths.map((file, index) => (
  [relativeRoot(file), sha256Buffer(truthBuffers[index])]
)));
const [truthOne, truthTwo] = truthBuffers.map((buffer) => JSON.parse(buffer.toString("utf8").replace(/^\uFEFF/, "")));
const truthLevels = [...asArray(truthOne.levels), ...asArray(truthTwo.levels)];
if (truthLevels.length !== LEVEL_COUNT) throw new Error(`Expected 200 truth records, received ${truthLevels.length}`);
const truthById = new Map(truthLevels.map((entry) => [entry.level, entry]));
for (let levelId = LEVEL_FROM; levelId <= LEVEL_TO; levelId += 1) {
  if (!truthById.has(levelId)) throw new Error(`Truth data is missing Lv${levelId}`);
}

await Promise.all([
  mkdir(OUTPUT, { recursive: true }), mkdir(OUR_OPENINGS, { recursive: true }),
  mkdir(GENERATED_PLACEHOLDERS, { recursive: true }), mkdir(COMPARISONS, { recursive: true }),
]);

const campaignSemanticSha256 = sha256Buffer(JSON.stringify(canonical(levels)));
const generatedAt = new Date().toISOString();
const captureLabel = `生成于 ${new Date(generatedAt).toLocaleString("sv-SE", { timeZone: "Asia/Shanghai" })}（北京时间） · Campaign ${campaignSemanticSha256.slice(0, 12)}`;
const browser = await chromium.launch({ headless: true });
const capturePage = await prepareCapturePage(browser, levels);
const pairPage = await browser.newPage({ viewport: PAIR_VIEWPORT, deviceScaleFactor: 1 });
const placeholderPage = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: 1 });
const records = [];

for (const level of levels) {
  const levelId = level.id;
  const truthLevel = truthById.get(levelId);
  const stem = levelStem(levelId);
  const ourFile = path.join(OUR_OPENINGS, `${stem}.png`);
  await captureOpening(capturePage, level, ourFile);

  const source = competitorImageSource(truthLevel);
  let competitorFile = source.file;
  if (!competitorFile) {
    competitorFile = path.join(GENERATED_PLACEHOLDERS, `${stem}.png`);
    await generatePlaceholder(placeholderPage, levelId, competitorFile,
      truthLevel.provenance?.classification === "source_missing_external_reference_only" ? "truth-v1 标记 source_missing" : "归档图与 provenance/raw_evidence 均不可用");
  }
  const metrics = buildMetrics(truthLevel, level);
  const mechanism = mechanismMetric(truthLevel, level);
  const competitorPlaceholder = source.placeholder || source.file === null;
  const status = recordStatus(metrics, mechanism, competitorPlaceholder);
  const comparisonFile = path.join(COMPARISONS, `${stem}.png`);
  const record = {
    level: levelId,
    name: level.name,
    status,
    metrics,
    mechanism,
    competitor: {
      image: relativeRoot(competitorFile),
      sourceKind: source.kind,
      placeholder: competitorPlaceholder,
      provenance: truthLevel.provenance ?? null,
      rawEvidence: truthLevel.raw_evidence ?? [],
      sha256: await sha256File(competitorFile),
    },
    ours: { image: relativeOutput(ourFile), sha256: await sha256File(ourFile) },
    comparisonImage: relativeOutput(comparisonFile),
    unclearNotes: [
      ...asArray(truthLevel.provenance?.unclear_fields),
      ...metrics.filter((entry) => !entry.known).map((entry) => `${entry.label}未明确`),
      ...mechanism.unknownFields.map((field) => `机制.${field}未明确`),
    ],
  };
  await renderComparison(pairPage, record, competitorFile, ourFile, comparisonFile, captureLabel);
  record.comparisonSha256 = await sha256File(comparisonFile);
  records.push(record);
  console.log(`captured and paired Lv${String(levelId).padStart(3, "0")}`);
}

await Promise.all([capturePage.close(), pairPage.close(), placeholderPage.close()]);
await browser.close();

// Publish the index and manifests only if both sides still describe the
// exact data used to build the report, rather than a mixture of HMR snapshots.
const finalCampaignSemanticSha256 = sha256Buffer(JSON.stringify(canonical(await loadLevels())));
if (finalCampaignSemanticSha256 !== campaignSemanticSha256) {
  throw new Error("Campaign data changed during capture; the partial screenshots are not a completed report");
}
for (const file of truthPaths) {
  if (await sha256File(file) !== truthSourceSha256[relativeRoot(file)]) {
    throw new Error(`Competitor truth changed during capture: ${relativeRoot(file)}; regenerate the report`);
  }
}

const summary = {
  levelCount: records.length,
  exactKnownLevels: records.filter((record) => record.status.id === "exact").length,
  mismatchLevels: records.filter((record) => record.status.id === "mismatch").length,
  unclearLevels: records.filter((record) => record.status.id === "unclear").length,
  sourceMissingLevels: records.filter((record) => record.status.id === "source-missing").map((record) => record.level),
};
const payload = {
  schemaVersion: 1,
  generatedAt,
  campaignSemanticSha256,
  sourceUrl: BASE_URL,
  viewport: VIEWPORT,
  comparisonViewport: PAIR_VIEWPORT,
  openingVisibility: "exclude generator queue IDs and positive-count block.shutterId payloads; keep triggerBlockIds visible",
  solverRun: false,
  truthSources: [relativeRoot(TRUTH_001_100), relativeRoot(TRUTH_101_200)],
  truthSourceSha256,
  summary,
  levels: records,
};
const comparisonJson = path.join(OUTPUT, "comparison.json");
await writeFile(comparisonJson, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

const csvHeader = [
  "关卡", "名称", "状态", "棋盘(竞品/本游戏)", "可玩格(竞品/本游戏)", "时间(竞品/本游戏)",
  "开局块数(竞品/本游戏)", "全关块数(竞品/本游戏)", "开局形状(竞品/本游戏)", "全关形状(竞品/本游戏)",
  "开局颜色数(竞品/本游戏)", "全关颜色数(竞品/本游戏)", "机制(竞品/本游戏)", "未明确字段", "对比图",
];
const csvRows = records.map((record) => {
  const row = (key) => record.metrics.find((entry) => entry.key === key);
  const pair = (key) => `${metricText(row(key), "competitor")} / ${metricText(row(key), "ours")}`;
  return [
    record.level, record.name, record.status.label, pair("board_size"), pair("playable_cells"), pair("time_seconds"),
    pair("opening_piece_count"), pair("full_piece_count"), pair("opening_shape_histogram"), pair("full_shape_histogram"),
    pair("opening_colors"), pair("full_colors"), `${record.mechanism.competitor} / ${record.mechanism.ours}`,
    record.unclearNotes.join("；"), record.comparisonImage,
  ];
});
const comparisonCsv = path.join(OUTPUT, "comparison.csv");
await writeFile(comparisonCsv, `\uFEFF${[csvHeader, ...csvRows].map((row) => row.map(csvCell).join(",")).join("\n")}\n`, "utf8");

const cards = records.map((record) => `<article data-status="${record.status.id}"><h2>Lv${record.level} · ${escapeHtml(record.name)} <span class="${record.status.className}">${escapeHtml(record.status.label)}</span></h2><a href="${record.comparisonImage}"><img loading="lazy" src="${record.comparisonImage}" alt="Lv${record.level} 竞品与本游戏开局对比"></a><details><summary>逐项数据</summary><div class="detail">${record.metrics.map((entry) => `<div class="drow ${entry.match === false ? "diff" : entry.match === null ? "unknown" : ""}"><b>${escapeHtml(entry.label)}</b><span>${escapeHtml(metricText(entry, "competitor"))}</span><span>${escapeHtml(metricText(entry, "ours"))}</span></div>`).join("")}<div class="drow ${record.mechanism.knownMismatches.length ? "diff" : record.mechanism.match === null ? "unknown" : ""}"><b>机制摘要</b><span>${escapeHtml(record.mechanism.competitor)}</span><span>${escapeHtml(record.mechanism.ours)}</span></div></div></details></article>`).join("");
const indexHtml = path.join(OUTPUT, "index.html");
await writeFile(indexHtml, `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>竞品 Lv1–200 vs 本游戏 current</title><style>
  *{box-sizing:border-box}body{margin:0;background:#0e0a32;color:#fff;font-family:Arial,"Microsoft YaHei",sans-serif}header{position:sticky;top:0;z-index:3;padding:15px 21px;background:#17124cf2;border-bottom:1px solid #453e8e}h1{margin:0 0 5px;font-size:27px}header p{margin:0 0 9px;color:#bcb7e9}.buttons{display:flex;gap:8px;flex-wrap:wrap}button{border:0;border-radius:16px;padding:8px 14px;background:#39327b;color:#fff;cursor:pointer}main{display:grid;grid-template-columns:repeat(auto-fill,minmax(600px,1fr));gap:15px;padding:18px}article{padding:10px;background:#211b60;border:1px solid #453e8e;border-radius:12px}article h2{font-size:18px;margin:0 0 8px}article h2 span{float:right;padding:3px 9px;border-radius:12px;font-size:13px}.ok{background:#174f3b;color:#7df2b5}.bad{background:#64253a;color:#ff9bae}.unclear{background:#5b4c20;color:#ffe48a}.missing{background:#55305c;color:#f0b5ff}article>a{display:block;background:#141044;border-radius:7px;overflow:hidden}article img{display:block;width:100%;height:auto}details{margin-top:8px;color:#d3d0f1}summary{cursor:pointer}.detail{margin-top:7px;max-height:520px;overflow:auto}.drow{display:grid;grid-template-columns:155px 1fr 1fr;gap:6px;padding:5px;border-bottom:1px solid #39327b;font-size:12px;overflow-wrap:anywhere}.drow.diff{background:#51243a}.drow.unknown{background:#4c421f}.hidden{display:none}
</style></head><body><header><h1>竞品 Lv1–200 vs 本游戏 current</h1><p>${escapeHtml(captureLabel)}</p><p>共200关 · 已知项一致 ${summary.exactKnownLevels} · 有差异 ${summary.mismatchLevels} · 含未明确 ${summary.unclearLevels} · 来源缺失 ${summary.sourceMissingLevels.length}（${summary.sourceMissingLevels.map((id) => `Lv${id}`).join("、") || "无"}） · 未运行求解器</p><div class="buttons"><button data-filter="all">全部200关</button><button data-filter="exact">已知项一致</button><button data-filter="mismatch">有差异</button><button data-filter="unclear">含未明确</button><button data-filter="source-missing">来源缺失</button></div></header><main>${cards}</main><script>document.querySelectorAll('button').forEach((button)=>button.onclick=()=>document.querySelectorAll('article').forEach((card)=>card.classList.toggle('hidden',button.dataset.filter!=='all'&&card.dataset.status!==button.dataset.filter)));</script></body></html>`, "utf8");

const readmePath = path.join(OUTPUT, "README.md");
await writeFile(readmePath, `# 竞品 Lv1–200 与本游戏当前正式关卡对比\n\n- 生成命令：\`node tools/generate-competitor-vs-ours-1-200.mjs [输出目录]\`\n- 默认输出：\`deliverables/competitor-vs-ours-lv001-200-current\`\n- 本游戏开局截图：从 \`src/core/levels.ts\` 通过 esbuild \`write:false\` 加载连续 200 关，并在 ${VIEWPORT.width}×${VIEWPORT.height} 的正式运行页面抓取。\n- 竞品 Lv1–100：既有 competitor-screenshots 归档。\n- 竞品 Lv101–200：truth-v1 的 provenance/opening_frame/raw_evidence 的稳定归档镜像；若归档缺失再解析原证据路径。Lv190、Lv191 在 truth-v1 中为 source_missing，左图使用明确缺失占位，所有对应字段显示“未明确”。\n- 开局可见口径：排除 generator queue IDs；排除 \`block.shutterId\` 指向正计数 shutter 的隐藏载荷；\`triggerBlockIds\` 仍为开局可见触发块。\n- 报告不调用、导入或运行求解器。\n- \`index.html\` 的 CSS/筛选 JS 均内联，无 CDN；逐关 PNG 位于 \`level-comparisons/\`。\n\nCampaign semantic SHA-256: \`${campaignSemanticSha256}\`\n`, "utf8");

const primaryFiles = [comparisonJson, comparisonCsv, indexHtml, readmePath];
const manifest = {
  schemaVersion: 1,
  generatedAt: payload.generatedAt,
  campaignSemanticSha256,
  truthSourceSha256,
  levelCount: records.length,
  solverRun: false,
  output: relativeRoot(OUTPUT),
  primaryFiles: await Promise.all(primaryFiles.map(async (file) => ({ path: relativeOutput(file), sha256: await sha256File(file) }))),
  comparisons: records.map((record) => ({
    level: record.level,
    path: record.comparisonImage,
    sha256: record.comparisonSha256,
    competitorSourceKind: record.competitor.sourceKind,
    competitorPlaceholder: record.competitor.placeholder,
    oursOpening: record.ours.image,
    oursOpeningSha256: record.ours.sha256,
  })),
};
const manifestPath = path.join(OUTPUT, "manifest.json");
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

console.log(JSON.stringify({ output: OUTPUT, campaignSemanticSha256, summary, manifest: relativeRoot(manifestPath) }, null, 2));
