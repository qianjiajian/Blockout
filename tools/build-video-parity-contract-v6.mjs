import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_DIR = join(ROOT, "deliverables", "level-generation-blueprint");
const V4_PATH = join(OUTPUT_DIR, "blockout-lv001-lv100-competitor-constrained-design-contract-v4.json");
const EVIDENCE_PATHS = {
  lv001_030: join(ROOT, ".codex-temp", "video-audit-01-30", "evidence-lv001-030.json"),
  lv021_030_direct: join(ROOT, ".codex-temp", "video-audit-21-30-independent", "audit-lv021-030.json"),
  lv031_040: join(ROOT, ".codex-temp", "video-audit-31-40", "evidence.json"),
  lv041_070: join(ROOT, ".codex-temp", "video-audit-41-70", "evidence.json"),
  lv041_070_resolved: join(ROOT, ".codex-temp", "video-audit-41-70", "evidence-resolved.json"),
  lv041_070_final: join(ROOT, ".codex-temp", "video-audit-41-70", "evidence-final.json"),
  lv071_100: join(ROOT, ".codex-temp", "video-audit-71-100", "evidence.json"),
  lv081_100_crosscheck: join(ROOT, ".codex-temp", "video-audit-81-100-crosscheck", "evidence.json"),
  lv091_source_reaudit: join(ROOT, ".codex-temp", "video-parity-v6-lv91-reaudit", "audit.json"),
  stage_partition_audit: join(ROOT, ".codex-temp", "video-parity-v6-stage-audit", "stage-audit.json"),
  capacity_chain_reaudit: join(
    ROOT,
    "playtest-results",
    "experiments",
    "video-parity-v6",
    "source-audit",
    "capacity-chain-reaudit",
    "corrections.json",
  ),
};
const TRUTH_PATH = join(OUTPUT_DIR, "blockout-lv001-lv100-video-parity-truth-v6.json");
const TRUTH_MD_PATH = join(OUTPUT_DIR, "blockout-lv001-lv100-video-parity-truth-v6.md");
const CONTRACT_PATH = join(OUTPUT_DIR, "blockout-lv001-lv100-video-parity-design-contract-v6.json");
const SOURCE_VIDEO_DIR = "C:/Users/Administrator/Desktop/block out/参考视频";
const SOURCE_VIDEO_NAMES = [
  "1-10.mp4", "11-20.mp4", "21-30.mp4", "31-40.mp4", "41-50.mp4",
  "51-60.mp4", "61-70.mp4", "71-80.mp4", "81-90.mp4", "91-100.mp4",
];

const COLORS = ["red", "yellow", "blue", "green", "purple", "orange", "cyan", "pink"];
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
const SHAPE_ALIASES = {
  RECT3x2: "RECT2X3",
  RECT3X2: "RECT2X3",
  V2_numericIce: "V2",
  V3_numericIce: "V3",
};

const REPOSITION_FLOORS = [
  null, 2, 1, 5, 5, 5, 6, 7, 8, 10,
  6, 7, 8, 9, 5, 8, 9, 10, 12, 11,
  6, 7, 8, 10, 5, 8, 9, 11, 12, 13,
  7, 8, 10, 11, 6, 10, 12, 13, 14, 15,
  8, 9, 11, 12, 6, 11, 13, 14, 15, 5,
  9, 10, 12, 13, 6, 12, 13, 15, 16, 17,
  10, 11, 12, 14, 7, 13, 14, 16, 17, 5,
  11, 12, 14, 15, 7, 14, 15, 16, 17, 18,
  12, 13, 14, 15, 7, 15, 16, 17, 18, 18,
  8, 13, 15, 16, 8, 15, 16, 17, 18, 18,
];
const FIVE_LEVEL_WAVE_OFFSETS = [0, 2, 4, 5.5, 7];

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const deepClone = (value) => value == null ? value : JSON.parse(JSON.stringify(value));
const sha256 = (path) => createHash("sha256").update(readFileSync(path)).digest("hex").toUpperCase();
const rel = (path) => relative(ROOT, path).replaceAll("\\", "/");
const levelId = (level) => `Lv${String(level).padStart(3, "0")}`;
const isPositiveInt = (value) => Number.isInteger(value) && value > 0;
const asObject = (value) => value && typeof value === "object" && !Array.isArray(value) ? value : null;

const canonicalShape = (shape) => {
  const aliased = SHAPE_ALIASES[shape] ?? shape;
  if (aliased in SHAPE_AREA) return aliased;
  const base = String(aliased).split("_")[0];
  return base in SHAPE_AREA ? base : aliased;
};
const orderedHistogram = (histogram) => {
  if (!asObject(histogram)) return null;
  const normalized = {};
  for (const [rawShape, rawCount] of Object.entries(histogram)) {
    if (!isPositiveInt(rawCount)) continue;
    const shape = canonicalShape(rawShape);
    if (!(shape in SHAPE_AREA)) continue;
    normalized[shape] = (normalized[shape] ?? 0) + rawCount;
  }
  return Object.fromEntries(
    Object.entries(normalized).sort(([a], [b]) => {
      const aIndex = SHAPE_ORDER.indexOf(a);
      const bIndex = SHAPE_ORDER.indexOf(b);
      return (aIndex < 0 ? 999 : aIndex) - (bIndex < 0 ? 999 : bIndex) || a.localeCompare(b);
    }),
  );
};
const histogramTotal = (histogram) => Object.values(histogram ?? {}).reduce((sum, count) => sum + count, 0);
const histogramCells = (histogram) => Object.entries(histogram ?? {}).reduce((sum, [shape, count]) => {
  if (!(shape in SHAPE_AREA)) throw new Error(`Unknown shape area for ${shape}`);
  return sum + SHAPE_AREA[shape] * count;
}, 0);
const addHistograms = (...histograms) => orderedHistogram(histograms.reduce((result, histogram) => {
  for (const [shape, count] of Object.entries(orderedHistogram(histogram) ?? {})) {
    result[shape] = (result[shape] ?? 0) + count;
  }
  return result;
}, {}));
const subtractHistograms = (whole, part, label = "histogram") => {
  const result = { ...(orderedHistogram(whole) ?? {}) };
  for (const [shape, count] of Object.entries(orderedHistogram(part) ?? {})) {
    result[shape] = (result[shape] ?? 0) - count;
    if (result[shape] < 0) throw new Error(`${label}: ${shape} underflow (${result[shape]})`);
    if (result[shape] === 0) delete result[shape];
  }
  return orderedHistogram(result);
};
const histogramContains = (whole, part) => {
  try {
    subtractHistograms(whole, part);
    return true;
  } catch {
    return false;
  }
};
const runtimeHistogram = (sourceHistogram) => {
  const result = { ...(orderedHistogram(sourceHistogram) ?? {}) };
  const sq3Count = result.SQ3 ?? 0;
  if (sq3Count > 0) {
    delete result.SQ3;
    result.RECT2X3 = (result.RECT2X3 ?? 0) + sq3Count;
  }
  return orderedHistogram(result);
};
const runtimeReplacement = (sourceHistogram) => {
  const count = orderedHistogram(sourceHistogram)?.SQ3 ?? 0;
  return count > 0
    ? [{ source_shape: "SQ3", runtime_shape: "RECT2X3", count, reason: "Product rule prohibits full 3x3 blocks." }]
    : [];
};

const allocateByWeights = (count, weights) => {
  if (count === 0) return {};
  const positive = Object.entries(orderedHistogram(weights) ?? {}).filter(([, value]) => value > 0);
  if (positive.length === 0) positive.push(["SINGLE", 1]);
  const total = positive.reduce((sum, [, value]) => sum + value, 0);
  const quotas = positive.map(([shape, value]) => {
    const exact = value / total * count;
    return { shape, count: Math.floor(exact), remainder: exact - Math.floor(exact) };
  });
  let left = count - quotas.reduce((sum, item) => sum + item.count, 0);
  quotas.sort((a, b) => b.remainder - a.remainder || SHAPE_ORDER.indexOf(a.shape) - SHAPE_ORDER.indexOf(b.shape));
  for (let index = 0; left > 0; index = (index + 1) % quotas.length, left -= 1) quotas[index].count += 1;
  return orderedHistogram(Object.fromEntries(quotas.map(({ shape, count: value }) => [shape, value])));
};

const fillFullHistogram = ({ opening, fullCount, preferred, neighbors, label }) => {
  const visible = orderedHistogram(opening) ?? {};
  const visibleCount = histogramTotal(visible);
  if (visibleCount > fullCount) throw new Error(`${label}: opening histogram exceeds full count`);
  const remainingCount = fullCount - visibleCount;
  if (remainingCount === 0) return visible;
  const preferredHistogram = orderedHistogram(preferred);
  let weights = {};
  if (preferredHistogram) {
    for (const [shape, count] of Object.entries(preferredHistogram)) {
      const residual = Math.max(0, count - (visible[shape] ?? 0));
      if (residual > 0) weights[shape] = residual;
    }
  }
  if (Object.keys(weights).length === 0) {
    for (const histogram of neighbors ?? []) {
      const total = histogramTotal(histogram);
      if (!total) continue;
      for (const [shape, count] of Object.entries(histogram)) weights[shape] = (weights[shape] ?? 0) + count / total;
    }
  }
  return addHistograms(visible, allocateByWeights(remainingCount, weights));
};

const maskFromUnknown = (mask, rows, cols) => {
  if (Array.isArray(mask)) return mask.map(String);
  if (typeof mask === "string" && mask.includes("/")) return mask.split("/");
  return null;
};
const exactSourceMask = (mask, rows, cols) => Array.isArray(mask) && mask.length === rows &&
  mask.every((line) => typeof line === "string" && line.length === cols && /^[.#]+$/.test(line));
const maskCount = (mask) => mask.reduce((sum, line) => sum + [...line].filter((cell) => cell === "#").length, 0);
const maskKey = (mask) => mask.join("/");
const boundaryCellCount = (mask) => {
  const rows = mask.length;
  const cols = mask[0]?.length ?? 0;
  let count = 0;
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      if (mask[row][col] !== "#") continue;
      if (row === 0 || row === rows - 1 || col === 0 || col === cols - 1) count += 1;
    }
  }
  return count;
};
const neighborsOf = (row, col, rows, cols) => [
  [row - 1, col], [row + 1, col], [row, col - 1], [row, col + 1],
].filter(([nextRow, nextCol]) => nextRow >= 0 && nextRow < rows && nextCol >= 0 && nextCol < cols);
const isConnectedMask = (mask) => {
  const rows = mask.length;
  const cols = mask[0]?.length ?? 0;
  const cells = [];
  for (let row = 0; row < rows; row += 1) for (let col = 0; col < cols; col += 1) {
    if (mask[row][col] === "#") cells.push([row, col]);
  }
  if (cells.length === 0) return false;
  const visited = new Set([cells[0].join(",")]);
  const queue = [cells[0]];
  while (queue.length) {
    const [row, col] = queue.shift();
    for (const [nextRow, nextCol] of neighborsOf(row, col, rows, cols)) {
      const key = `${nextRow},${nextCol}`;
      if (mask[nextRow][nextCol] === "#" && !visited.has(key)) {
        visited.add(key);
        queue.push([nextRow, nextCol]);
      }
    }
  }
  return visited.size === cells.length;
};
const spansEnvelope = (mask) => {
  const rows = mask.length;
  const cols = mask[0].length;
  const positions = [];
  for (let row = 0; row < rows; row += 1) for (let col = 0; col < cols; col += 1) {
    if (mask[row][col] === "#") positions.push([row, col]);
  }
  return positions.some(([row]) => row === 0) && positions.some(([row]) => row === rows - 1) &&
    positions.some(([, col]) => col === 0) && positions.some(([, col]) => col === cols - 1);
};
const hash32 = (seed, row, col, step) => {
  let value = seed ^ Math.imul(row + 1, 0x45d9f3b) ^ Math.imul(col + 1, 0x27d4eb2d);
  value ^= Math.imul(step + 1, 0x165667b1);
  value ^= value >>> 16;
  value = Math.imul(value, 0x7feb352d);
  value ^= value >>> 15;
  return value >>> 0;
};
const generateMaskCandidate = (rows, cols, playableCount, seed) => {
  if (playableCount === rows * cols) return Array.from({ length: rows }, () => "#".repeat(cols));
  if (playableCount < rows + cols - 1) throw new Error(`Cannot span ${rows}x${cols} with ${playableCount} connected cells`);
  const crossRow = seed % rows;
  const crossCol = Math.floor(seed / rows) % cols;
  const selected = new Set();
  for (let row = 0; row < rows; row += 1) selected.add(`${row},${crossCol}`);
  for (let col = 0; col < cols; col += 1) selected.add(`${crossRow},${col}`);
  const frontier = new Set();
  const refresh = (row, col) => {
    for (const [nextRow, nextCol] of neighborsOf(row, col, rows, cols)) {
      const key = `${nextRow},${nextCol}`;
      if (!selected.has(key)) frontier.add(key);
    }
  };
  for (const key of selected) refresh(...key.split(",").map(Number));
  while (selected.size < playableCount) {
    const candidates = [...frontier].map((key) => {
      const [row, col] = key.split(",").map(Number);
      const contacts = neighborsOf(row, col, rows, cols).filter(([r, c]) => selected.has(`${r},${c}`)).length;
      return { key, row, col, score: contacts * 2 ** 36 + hash32(seed, row, col, selected.size) };
    }).sort((a, b) => b.score - a.score || a.row - b.row || a.col - b.col);
    const chosen = candidates[0];
    if (!chosen) throw new Error("Mask frontier unexpectedly empty");
    frontier.delete(chosen.key);
    selected.add(chosen.key);
    refresh(chosen.row, chosen.col);
  }
  return Array.from({ length: rows }, (_, row) => Array.from({ length: cols }, (_, col) =>
    selected.has(`${row},${col}`) ? "#" : ".",
  ).join(""));
};

const generateBoundaryRichMask = (rows, cols, playableCount, seed) => {
  const boundaryCount = rows * cols === 1 ? 1 : 2 * rows + 2 * cols - 4;
  if (playableCount < boundaryCount) return null;
  const selected = new Set();
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      if (row === 0 || row === rows - 1 || col === 0 || col === cols - 1) {
        selected.add(`${row},${col}`);
      }
    }
  }
  const frontier = new Set();
  const refresh = (row, col) => {
    for (const [nextRow, nextCol] of neighborsOf(row, col, rows, cols)) {
      const key = `${nextRow},${nextCol}`;
      if (!selected.has(key)) frontier.add(key);
    }
  };
  for (const key of selected) refresh(...key.split(",").map(Number));
  while (selected.size < playableCount) {
    const candidates = [...frontier].map((key) => {
      const [row, col] = key.split(",").map(Number);
      const contacts = neighborsOf(row, col, rows, cols)
        .filter(([nextRow, nextCol]) => selected.has(`${nextRow},${nextCol}`)).length;
      return { key, row, col, score: contacts * 2 ** 36 + hash32(seed, row, col, selected.size) };
    }).sort((left, right) => right.score - left.score || left.row - right.row || left.col - right.col);
    const chosen = candidates[0];
    if (!chosen) throw new Error("Boundary-rich mask frontier unexpectedly empty");
    frontier.delete(chosen.key);
    selected.add(chosen.key);
    refresh(chosen.row, chosen.col);
  }
  return Array.from({ length: rows }, (_, row) => Array.from(
    { length: cols },
    (_, col) => selected.has(`${row},${col}`) ? "#" : ".",
  ).join(""));
};

const targetD1 = (level) => {
  if (level === 1) return 35.29;
  if (level === 2) return 57.1;
  if (level === 3) return 50.54;
  if (level === 4) return 70;
  if (level === 5) return 76;
  const waveIndex = Math.floor((level - 6) / 5);
  const position = (level - 6) % 5;
  return 70 + waveIndex + FIVE_LEVEL_WAVE_OFFSETS[position];
};
const d1Band = (score, level) => {
  if (level === 1) return { id: "tutorial", label: "教学" };
  if (score < 50) return { id: "entry", label: "入门" };
  if (score < 60) return { id: "normal", label: "普通" };
  if (score < 70) return { id: "advanced", label: "进阶" };
  if (score < 80) return { id: "hard", label: "困难" };
  return { id: "extreme", label: "极难" };
};

const normalizeDirectionMechanism = ({ ordinary = 0, frozenValues = [] }) => ({
  directional_exit: { ordinary_count: ordinary },
  ...(frozenValues.length ? { frozen_exit: { count: frozenValues.length, initial_values: frozenValues } } : {}),
});

const normalizeMechanisms01to30 = (record) => {
  const result = {};
  for (const mechanism of record.mechanisms) {
    if (mechanism.type === "ice_frame") continue;
    if (mechanism.type === "directional_exit") {
      result.directional_exit = { ordinary_count: mechanism.opening_visible_count };
    } else if (mechanism.type === "frozen_exit") {
      result.frozen_exit = {
        count: mechanism.opening_visible_count,
        initial_values: mechanism.opening_values,
        value_semantics: mechanism.value_semantics,
      };
    } else if (mechanism.type === "numbered_ice_block") {
      const values = mechanism.full_observed_values ?? mechanism.opening_values ?? [];
      result.numeric_ice = {
        count: mechanism.full_observed_count ?? mechanism.opening_visible_count,
        opening_visible_count: mechanism.opening_visible_count,
        initial_values: values,
        shape_histogram: orderedHistogram(mechanism.attached_shape_histogram),
      };
    } else if (mechanism.type === "nested_shell_block") {
      const count = mechanism.full_observed_count ?? mechanism.opening_visible_count;
      result.shell = {
        count,
        opening_visible_count: mechanism.opening_visible_count,
        layers: Array.from({ length: count }, () => mechanism.extra_shell_layers ?? 1),
        shape_histogram: orderedHistogram(
          mechanism.full_attached_shape_histogram ?? mechanism.opening_attached_shape_histogram,
        ),
      };
    } else if (mechanism.type === "countdown_cover") {
      result.countdown_cover = {
        count: mechanism.opening_visible_count,
        initial_values: mechanism.opening_values,
      };
    } else if (mechanism.type === "irregular_block") {
      result.irregular_block = { count: mechanism.opening_visible_count };
    }
  }
  return result;
};

const normalizeDirectMechanisms21to30 = (record, sourceStageToId) => {
  const source = record.mechanisms ?? {};
  const result = normalizeDirectionMechanism({
    ordinary: source.directional_exit?.count ?? 0,
    frozenValues: source.frozen_exit?.values ?? [],
  });
  if (source.countdown_cover?.count) result.countdown_cover = {
    count: source.countdown_cover.count,
    initial_values: source.countdown_cover.values,
  };
  if (source.numbered_ice_block?.count) {
    const items = (source.numbered_ice_block.items ?? []).map((item) => ({
      value: item.value,
      shape: canonicalShape(item.shape),
      stage_id: sourceStageToId.get(item.stage) ?? (item.stage === "opening" ? "opening" : null),
      source_core_color: item.core ?? null,
    }));
    const shapeHistogram = orderedHistogram(items.reduce((histogram, item) => {
      histogram[item.shape] = (histogram[item.shape] ?? 0) + 1;
      return histogram;
    }, {}));
    result.numeric_ice = {
      count: source.numbered_ice_block.count,
      opening_visible_count: items.filter((item) => item.stage_id === "opening").length,
      initial_values: items.map((item) => item.value),
      shape_histogram: shapeHistogram,
      items,
      post_melt_shell: (source.numbered_ice_block.items ?? [])
        .filter((item) => String(item.post_thaw ?? "").startsWith("nested_shell")).length,
    };
  }
  if (source.nested_shell_block?.count) {
    const numericItems = source.numbered_ice_block?.items ?? [];
    const claimedNumeric = new Set();
    const items = (source.nested_shell_block.items ?? []).map((item) => {
      let stageId = sourceStageToId.get(item.stage) ?? (item.stage === "opening" ? "opening" : null);
      let requiresNumericIce = false;
      if (item.stage === "after_numeric_ice_thaw") {
        const matchIndex = numericItems.findIndex((candidate, index) => (
          !claimedNumeric.has(index)
          && canonicalShape(candidate.shape) === canonicalShape(item.shape)
          && String(candidate.post_thaw ?? "").startsWith("nested_shell")
        ));
        if (matchIndex >= 0) {
          claimedNumeric.add(matchIndex);
          const matched = numericItems[matchIndex];
          stageId = sourceStageToId.get(matched.stage) ?? (matched.stage === "opening" ? "opening" : null);
          requiresNumericIce = true;
        }
      }
      return {
        shape: canonicalShape(item.shape),
        stage_id: stageId,
        extra_layers: source.nested_shell_block.extra_layers_each ?? 1,
        requires_numeric_ice: requiresNumericIce,
        source_outer_color: item.outer ?? null,
        source_core_color: item.core ?? null,
      };
    });
    result.shell = {
      count: source.nested_shell_block.count,
      opening_visible_count: items.filter((item) => item.stage_id === "opening").length,
      layers: items.map((item) => item.extra_layers),
      shape_histogram: orderedHistogram(items.reduce((histogram, item) => {
        histogram[item.shape] = (histogram[item.shape] ?? 0) + 1;
        return histogram;
      }, {})),
      items,
    };
  }
  return result;
};

const normalizeMechanisms41to70 = (record) => {
  const source = record.mechanisms ?? {};
  const result = normalizeDirectionMechanism({
    ordinary: source.directionExits?.ordinary ?? 0,
    frozenValues: source.directionExits?.frozenValues ?? [],
  });
  if (source.numericIce) result.numeric_ice = {
    count: source.numericIce.count,
    initial_values: source.numericIce.values,
    shape_histogram: Array.isArray(source.numericIce.attachedShapes)
      ? orderedHistogram(source.numericIce.attachedShapes.reduce((hist, shape) => {
        hist[canonicalShape(shape)] = (hist[canonicalShape(shape)] ?? 0) + 1;
        return hist;
      }, {}))
      : orderedHistogram(source.numericIce.attachedShapes),
  };
  if (source.covers) result.countdown_cover = {
    count: source.covers.count,
    initial_values: source.covers.countdowns,
  };
  if (source.sideGenerators) result.side_generator = {
    count: source.sideGenerators.count,
    queue_lengths: source.sideGenerators.queueLengths,
    total_queue_count: (source.sideGenerators.queueLengths ?? []).reduce((sum, count) => sum + count, 0),
    queue_shape_histogram: orderedHistogram(source.sideGenerators.queueShapeHistogram),
    queue_shape_sequences: Array.isArray(source.sideGenerators.queueShapeSequences)
      ? source.sideGenerators.queueShapeSequences.map((sequence) => sequence.map(canonicalShape))
      : null,
    preview_shapes: source.sideGenerators.previewShapes ?? source.sideGenerators.openingPreviewShapes ??
      (source.sideGenerators.firstPreviewShape ? [source.sideGenerators.firstPreviewShape] : null),
  };
  if (source.shell?.count) result.shell = {
    count: source.shell.count,
    layers: Array.from({ length: source.shell.count }, () => source.shell.extraLayersEach ?? 1),
    shape_histogram: Array.isArray(source.shell.attachedShapes)
      ? orderedHistogram(source.shell.attachedShapes.reduce((hist, shape) => {
        hist[canonicalShape(shape)] = (hist[canonicalShape(shape)] ?? 0) + 1;
        return hist;
      }, {}))
      : null,
  };
  if (source.arrowBlocks?.count) result.axis_constrained_arrow = {
    count: source.arrowBlocks.count,
    by_axis_and_shape: deepClone(source.arrowBlocks.byAxisAndShape ?? null),
    semantic: source.arrowBlocks.rule ?? "Player-dragged only along the printed axis; never autonomous.",
  };
  if (source.lift?.count) result.lift = deepClone(source.lift);
  if (source.timedTopFeeder?.count) result.timed_feeder = deepClone(source.timedTopFeeder);
  return result;
};

const normalizeMechanisms71to100 = (record) => {
  const source = record.mechanisms ?? {};
  const result = normalizeDirectionMechanism({
    ordinary: source.directional_exits?.count ?? 0,
    frozenValues: source.frozen_exits?.initial_values ?? [],
  });
  if (source.star_exits) result.star_exit = deepClone(source.star_exits);
  if (source.numeric_ice) result.numeric_ice = {
    count: source.numeric_ice.count,
    opening_visible_count: source.numeric_ice.opening_visible_count ??
      (source.numeric_ice.hidden_at_opening ? 0 : source.numeric_ice.count),
    initial_values: source.numeric_ice.values,
    shape_histogram: orderedHistogram(source.numeric_ice.shapes),
    post_melt_shell: source.numeric_ice.post_melt_shell,
  };
  if (source.covers) result.countdown_cover = {
    count: source.covers.count,
    initial_values: source.covers.initial_values,
  };
  if (source.nested_shells) result.shell = {
    count: source.nested_shells.count,
    layers: source.nested_shells.layers,
    shape_histogram: orderedHistogram(source.nested_shells.shapes),
    ...(record.level === 84 ? {
      opening_visible_count: "unclear",
      opening_visible_count_bounds: { minimum: 1, maximum: 3 },
    } : {}),
  };
  if (source.generators) result.side_generator = {
    count: source.generators.count,
    queue_lengths: source.generators.queue_lengths,
    total_queue_count: (source.generators.queue_lengths ?? []).reduce((sum, count) => sum + count, 0),
    queue_shape_histogram: orderedHistogram(source.generators.queue_shape_histogram),
    queue_shape_histograms: Array.isArray(source.generators.queue_shape_histograms)
      ? source.generators.queue_shape_histograms.map(orderedHistogram)
      : null,
    queue_shape_sequences: Array.isArray(source.generators.queue_shape_sequences)
      ? source.generators.queue_shape_sequences.map((sequence) => sequence.map(canonicalShape))
      : null,
    queue_sides: source.generators.queue_sides ?? null,
  };
  if (source.axis_constrained_arrow_blocks) result.axis_constrained_arrow = {
    count: source.axis_constrained_arrow_blocks.count,
    shape_histogram: orderedHistogram(source.axis_constrained_arrow_blocks.shapes),
    axes: source.axis_constrained_arrow_blocks.axes ?? null,
    items: deepClone(source.axis_constrained_arrow_blocks.items ?? null),
    hidden_at_opening: source.axis_constrained_arrow_blocks.hidden_at_opening ?? false,
    semantic: source.axis_constrained_arrow_blocks.semantic,
  };
  if (source.keys) result.key = deepClone(source.keys);
  // Lv89 has two keys over the full run, but only the H3 key is present in the
  // untouched opening.  The V3 key belongs to the first cover-reveal cohort.
  if (record.level === 89 && result.key) result.key.opening_visible_count = 1;
  if (source.locks) result.lock = deepClone(source.locks);
  if (record.level === 89 && result.lock) result.lock.hidden_at_opening = true;
  if (source.staged_frames) result.staged_frame = deepClone(source.staged_frames);
  if (source.star_blocks) result.star_block = deepClone(source.star_blocks);
  return result;
};

const repeatIceItems = (shape, value, count, stageId = "opening") => Array.from(
  { length: count },
  () => ({ value, shape, stage_id: stageId }),
);

// Source-frame instance ledger.  Keeping value, carrier shape and reveal cohort
// together prevents a later runtime assembler from silently permuting otherwise
// equal mechanism multisets into a different level.
const NUMERIC_ICE_ITEMS_BY_LEVEL = new Map([
  [10, [
    ...repeatIceItems("V3", 22, 2), ...repeatIceItems("V3", 19, 2),
    { value: 21, shape: "SQ2", stage_id: "opening" },
    { value: 19, shape: "SQ2", stage_id: "opening" },
    { value: 13, shape: "SQ2", stage_id: "opening" },
    { value: 12, shape: "SQ2", stage_id: "opening" },
    { value: 11, shape: "SQ2", stage_id: "opening" },
  ]],
  [17, [
    ...repeatIceItems("H2", 6, 3),
    ...repeatIceItems("H3", 18, 2),
    ...repeatIceItems("H3", 19, 2),
  ]],
  [18, [
    ...repeatIceItems("V2", 7, 2),
    { value: 14, shape: "H3", stage_id: "opening" },
    { value: 11, shape: "SQ3", stage_id: "opening" },
  ]],
  [21, [
    { value: 6, shape: "V2", stage_id: "cover-1" },
    { value: 2, shape: "SQ2", stage_id: "cover-2" },
  ]],
  [44, [
    { value: 2, shape: "SQ2", stage_id: "opening" },
    { value: 4, shape: "V2", stage_id: "opening" },
    { value: 1, shape: "V2", stage_id: "opening" },
    { value: 2, shape: "V2", stage_id: "opening" },
  ]],
  [49, [
    { value: 10, shape: "H2", stage_id: "opening" },
    { value: 7, shape: "H2", stage_id: "opening" },
  ]],
  [53, [
    ...repeatIceItems("H2", 7, 2),
    { value: 5, shape: "SQ2", stage_id: "opening" },
  ]],
  [56, [
    { value: 7, shape: "V2", stage_id: "opening" },
    { value: 5, shape: "L3", stage_id: "opening" },
  ]],
  [58, [
    { value: 3, shape: "SQ2", stage_id: "opening" },
    { value: 9, shape: "SQ2", stage_id: "opening" },
    ...repeatIceItems("H2", 5, 2),
    ...repeatIceItems("V2", 12, 2),
    { value: 12, shape: "RECT2X3", stage_id: "opening" },
    { value: 7, shape: "L3", stage_id: "opening" },
  ]],
  [66, [
    ...repeatIceItems("H3", 6, 3, "lift-layer-1"), ...repeatIceItems("V3", 6, 2, "lift-layer-1"),
    { value: 5, shape: "T4", stage_id: "lift-layer-3" },
    { value: 5, shape: "L3", stage_id: "lift-layer-3" },
  ]],
  [67, [
    { value: 10, shape: "V3", stage_id: "opening" },
    { value: 5, shape: "V3", stage_id: "lift-layer-1" },
    { value: 5, shape: "H2", stage_id: "lift-layer-1" },
    { value: 5, shape: "SQ2", stage_id: "lift-layer-1" },
  ]],
  [71, [{ value: 7, shape: "L3", stage_id: "cover-1" }]],
  [76, [
    { value: 14, shape: "L4", stage_id: "opening" },
    { value: 14, shape: "SQ3", stage_id: "opening" },
    { value: 5, shape: "SQ3", stage_id: "opening" },
    { value: 8, shape: "SQ3", stage_id: "opening" },
    { value: 5, shape: "V2", stage_id: "opening" },
    ...repeatIceItems("SQ2", 5, 2),
    { value: 5, shape: "L3", stage_id: "opening" },
    { value: 5, shape: "T4", stage_id: "opening" },
  ]],
  [78, [
    { value: 5, shape: "H2", stage_id: "opening" },
    { value: 3, shape: "H2", stage_id: "staged-frame-1" },
    { value: 3, shape: "L3", stage_id: "staged-frame-1" },
  ]],
  [91, [
    { value: 2, shape: "SINGLE", stage_id: "cover-1" },
    { value: 8, shape: "SINGLE", stage_id: "cover-2" },
    { value: 12, shape: "SINGLE", stage_id: "cover-2" },
  ]],
  [98, [
    { value: 7, shape: "H2", stage_id: "opening" },
    { value: 7, shape: "L3", stage_id: "opening" },
    { value: 10, shape: "CROSS5", stage_id: "opening" },
    { value: 8, shape: "V3", stage_id: "opening" },
  ]],
]);

const standardizeMechanisms = (mechanisms, stageSeeds, level) => {
  const sourceFrozenValues = mechanisms.frozen_exit?.initial_values ?? [];
  // A zero counter is already open in the source and is therefore an ordinary
  // directional exit, not a frozen exit carrying an invalid `frozen: 0` field.
  const zeroValueExitCount = sourceFrozenValues.filter((value) => Number(value) === 0).length;
  const frozenValues = sourceFrozenValues.filter((value) => Number(value) > 0);
  const result = {
    directional_exits: {
      ordinary_count: (mechanisms.directional_exit?.ordinary_count ?? 0) + zeroValueExitCount,
      frozen_values: frozenValues,
      star_count: mechanisms.star_exit?.count ?? 0,
      star_frozen_count: mechanisms.star_exit?.frozen_count ?? 0,
      star_frozen_values: mechanisms.star_exit?.frozen_values ?? [],
      star_mapping: mechanisms.star_exit?.mapping ?? null,
    },
  };
  if (mechanisms.numeric_ice) result.numeric_ice = {
    count: mechanisms.numeric_ice.count,
    values: mechanisms.numeric_ice.initial_values,
    shape_histogram: mechanisms.numeric_ice.shape_histogram,
    stage_scope: mechanisms.numeric_ice.opening_visible_count === 0
      ? "hidden_only"
      : mechanisms.numeric_ice.opening_visible_count != null &&
          mechanisms.numeric_ice.opening_visible_count < mechanisms.numeric_ice.count
        ? "opening_and_hidden"
        : "opening_or_unspecified",
    post_melt_shell: mechanisms.numeric_ice.post_melt_shell ?? null,
  };
  const numericItems = mechanisms.numeric_ice?.items ?? NUMERIC_ICE_ITEMS_BY_LEVEL.get(level);
  if (numericItems && result.numeric_ice) {
    const itemValues = numericItems.map((item) => item.value).sort((a, b) => a - b);
    const declaredValues = [...result.numeric_ice.values].sort((a, b) => a - b);
    const itemHistogram = orderedHistogram(numericItems.reduce((histogram, item) => {
      histogram[item.shape] = (histogram[item.shape] ?? 0) + 1;
      return histogram;
    }, {}));
    if (numericItems.length !== result.numeric_ice.count ||
        JSON.stringify(itemValues) !== JSON.stringify(declaredValues) ||
        JSON.stringify(itemHistogram) !== JSON.stringify(orderedHistogram(result.numeric_ice.shape_histogram))) {
      throw new Error(`${levelId(level)} numeric-ice instance ledger does not match declared totals`);
    }
    const stageIds = new Set(stageSeeds.map((stage) => stage.id));
    // Lift layer 1 is physically visible at opening, so it remains part of the
    // opening composition stage.  Keep a virtual sub-stage id for mechanisms
    // that must bind to the framed subset instead of any same-shape opening block.
    if (mechanisms.lift?.layers?.length) stageIds.add("lift-layer-1");
    for (const item of numericItems) {
      if (item.stage_id && !stageIds.has(item.stage_id)) {
        throw new Error(`${levelId(level)} numeric-ice item references missing stage ${item.stage_id}`);
      }
    }
    const openingNumericCount = numericItems.filter((item) => (
      item.stage_id === "opening" || item.stage_id === "lift-layer-1"
    )).length;
    if (mechanisms.numeric_ice.opening_visible_count != null &&
        mechanisms.numeric_ice.opening_visible_count !== openingNumericCount) {
      throw new Error(`${levelId(level)} numeric-ice opening count disagrees with its instance ledger`);
    }
    result.numeric_ice.opening_visible_count = openingNumericCount;
    result.numeric_ice.stage_scope = openingNumericCount === 0
      ? "hidden_only"
      : openingNumericCount < numericItems.length
        ? "opening_and_hidden"
        : "opening_or_unspecified";
    result.numeric_ice.items = deepClone(numericItems);
    result.numeric_ice.item_pairing_status = "source_frame_exact";
  }
  if (mechanisms.shell) {
    const shellItems = Array.isArray(mechanisms.shell.items) ? mechanisms.shell.items : null;
    result.shells = {
      count: mechanisms.shell.count,
      opening_visible_count: shellItems
        ? shellItems.filter((item) => item.stage_id === "opening").length
        : mechanisms.shell.opening_visible_count ?? mechanisms.shell.count,
      extra_layers: mechanisms.shell.layers,
      shape_histogram: mechanisms.shell.shape_histogram,
      items: deepClone(shellItems),
      ...(mechanisms.shell.opening_visible_count_bounds
        ? { opening_visible_count_bounds: deepClone(mechanisms.shell.opening_visible_count_bounds) }
        : {}),
    };
  }
  if (Array.isArray(result.shells?.items)) {
    const shellItems = result.shells.items;
    const itemHistogram = orderedHistogram(shellItems.reduce((histogram, item) => {
      histogram[item.shape] = (histogram[item.shape] ?? 0) + 1;
      return histogram;
    }, {}));
    const itemLayers = shellItems.map((item) => Number(item.extra_layers ?? 1)).sort((a, b) => a - b);
    const openingItemCount = shellItems.filter((item) => item.stage_id === "opening").length;
    if (shellItems.length !== result.shells.count ||
        openingItemCount !== result.shells.opening_visible_count ||
        JSON.stringify(itemHistogram) !== JSON.stringify(orderedHistogram(result.shells.shape_histogram)) ||
        JSON.stringify(itemLayers) !== JSON.stringify(
          (result.shells.extra_layers ?? []).map(Number).sort((a, b) => a - b),
        )) {
      throw new Error(`${levelId(level)} shell instance ledger does not match declared totals`);
    }
    const stageIds = new Set(stageSeeds.map((stage) => stage.id));
    for (const item of shellItems) {
      if (item.stage_id && !stageIds.has(item.stage_id)) {
        throw new Error(`${levelId(level)} shell item references missing stage ${item.stage_id}`);
      }
    }
    const requiredNumeric = shellItems.filter((item) => item.requires_numeric_ice);
    if (requiredNumeric.length) {
      const available = [...(result.numeric_ice?.items ?? [])];
      for (const shell of requiredNumeric) {
        const matchIndex = available.findIndex((ice) => (
          ice.stage_id === shell.stage_id && canonicalShape(ice.shape) === canonicalShape(shell.shape)
        ));
        if (matchIndex < 0) {
          throw new Error(`${levelId(level)} shell item requires a missing numeric-ice carrier`);
        }
        available.splice(matchIndex, 1);
      }
    }
  }
  if (mechanisms.countdown_cover) {
    const coverStages = stageSeeds.filter((stage) => stage.kind === "countdown_cover");
    const perCoverUnclear = mechanisms.countdown_cover.per_cover_partition_status === "unclear";
    result.covers = {
      count: mechanisms.countdown_cover.count,
      values: coverStages.length === mechanisms.countdown_cover.count &&
          coverStages.every((stage) => Number.isInteger(stage.trigger_value))
        ? coverStages.map((stage) => stage.trigger_value)
        : mechanisms.countdown_cover.initial_values,
      hidden_batch_counts: perCoverUnclear
        ? Array.from({ length: mechanisms.countdown_cover.count }, () => "unclear")
        : coverStages.map((stage) => stage.count),
      hidden_batch_histograms: perCoverUnclear
        ? Array.from({ length: mechanisms.countdown_cover.count }, () => "unclear")
        : coverStages.map((stage) => orderedHistogram(stage.shape_histogram) ?? "unclear"),
      per_cover_partition_status: perCoverUnclear ? "unclear" : "source_observed_or_unique",
      ...(perCoverUnclear ? {
        source_hidden_aggregate_count: mechanisms.countdown_cover.source_hidden_aggregate_count,
        source_hidden_aggregate_shape_histogram: orderedHistogram(
          mechanisms.countdown_cover.source_hidden_aggregate_shape_histogram,
        ),
      } : {}),
    };
  }
  if (mechanisms.side_generator) {
    const generatorStages = stageSeeds.filter((stage) => stage.kind === "side_generator");
    result.generators = {
      count: mechanisms.side_generator.count,
      trigger: "move",
      queue_lengths: mechanisms.side_generator.queue_lengths,
      queue_histograms: generatorStages.length
        ? generatorStages.map((stage) => orderedHistogram(stage.shape_histogram) ?? "unclear")
        : mechanisms.side_generator.queue_shape_histograms ??
          (mechanisms.side_generator.queue_shape_histogram ? [mechanisms.side_generator.queue_shape_histogram] : "unclear"),
      preview_shapes: mechanisms.side_generator.preview_shapes ??
        mechanisms.side_generator.queue_shape_sequences?.map((sequence) => sequence[0]) ?? null,
      queue_shape_sequences: mechanisms.side_generator.queue_shape_sequences ?? null,
      queue_sides: mechanisms.side_generator.queue_sides ?? null,
    };
    if (result.generators.queue_shape_sequences) {
      const sequences = result.generators.queue_shape_sequences;
      if (sequences.length !== result.generators.count ||
          sequences.some((sequence, index) => sequence.length !== result.generators.queue_lengths[index])) {
        throw new Error("Generator sequence count/length does not match declared queues");
      }
      sequences.forEach((sequence, index) => {
        const sequenceHistogram = orderedHistogram(sequence.reduce((histogram, shape) => {
          histogram[shape] = (histogram[shape] ?? 0) + 1;
          return histogram;
        }, {}));
        if (JSON.stringify(sequenceHistogram) !== JSON.stringify(orderedHistogram(result.generators.queue_histograms[index]))) {
          throw new Error(`Generator queue ${index + 1} sequence does not match its histogram`);
        }
        const preview = result.generators.preview_shapes?.[index];
        if (preview && canonicalShape(preview) !== sequence[0]) {
          throw new Error(`Generator queue ${index + 1} preview ${preview} != first item ${sequence[0]}`);
        }
      });
    }
  }
  if (mechanisms.timed_feeder) {
    result.generators = {
      count: mechanisms.timed_feeder.count,
      trigger: "time",
      queue_lengths: [mechanisms.timed_feeder.queueLength],
      queue_histograms: [orderedHistogram(mechanisms.timed_feeder.queueShapeHistogram)],
      release_rule: mechanisms.timed_feeder.releaseRule,
      blocking_behavior: mechanisms.timed_feeder.blockingBehavior,
      observed_counter_timeline: mechanisms.timed_feeder.observedCounterTimeline,
    };
  }
  if (mechanisms.lift) result.lifts = {
    count: mechanisms.lift.count,
    trigger: mechanisms.lift.trigger,
    layers: (mechanisms.lift.layers ?? []).map((layer) => ({
      layer: layer.layer,
      count: layer.blockCount,
      histogram: orderedHistogram(layer.shapeHistogram),
    })),
    blocking_behavior: mechanisms.lift.blockingBehavior,
  };
  if (mechanisms.staged_frame) result.staged_frames = {
    count: mechanisms.staged_frame.count,
    layers: [
      { layer: 1, count: null, histogram: "opening_subset" },
      {
        layer: 2,
        count: mechanisms.staged_frame.hidden_batch_count,
        histogram: orderedHistogram(mechanisms.staged_frame.hidden_batch_shape_histogram),
      },
    ],
    semantic: mechanisms.staged_frame.semantic,
  };
  if (mechanisms.axis_constrained_arrow) result.axis_blocks = {
    count: mechanisms.axis_constrained_arrow.count,
    by_axis_shape: mechanisms.axis_constrained_arrow.by_axis_and_shape ??
      (mechanisms.axis_constrained_arrow.items
        ? mechanisms.axis_constrained_arrow.items.reduce((byAxis, item) => {
          byAxis[item.axis] ??= {};
          byAxis[item.axis][canonicalShape(item.shape)] = (byAxis[item.axis][canonicalShape(item.shape)] ?? 0) + 1;
          return byAxis;
        }, {})
        : null),
    shape_histogram: mechanisms.axis_constrained_arrow.shape_histogram ?? null,
    axes: mechanisms.axis_constrained_arrow.axes ?? null,
    items: Array.isArray(mechanisms.axis_constrained_arrow.items)
      ? mechanisms.axis_constrained_arrow.items.map((item) => ({
        ...deepClone(item),
        shape: canonicalShape(item.shape),
      }))
      : null,
    hidden_at_opening: mechanisms.axis_constrained_arrow.hidden_at_opening ?? false,
    semantic: mechanisms.axis_constrained_arrow.semantic,
  };
  if (mechanisms.key || mechanisms.lock) result.key_locks = {
    key_count: mechanisms.key?.count ?? 0,
    key_shapes: orderedHistogram(mechanisms.key?.key_shapes),
    opening_visible_key_count: mechanisms.key?.opening_visible_count ?? mechanisms.key?.count ?? 0,
    lock_count: mechanisms.lock?.count ?? 0,
    lock_requirements: mechanisms.lock?.initial_requirements ?? [],
    lock_shapes: orderedHistogram(mechanisms.lock?.locked_shapes),
    pairs: mechanisms.lock?.pairing ?? null,
    lock_hidden_at_opening: mechanisms.lock?.hidden_at_opening ?? false,
  };
  if (mechanisms.star_block) result.stars = {
    count: mechanisms.star_block.count,
    shape_histogram: orderedHistogram(mechanisms.star_block.shapes),
    plain_same_shape_count: mechanisms.star_block.plain_same_shape_count,
    semantic: mechanisms.star_block.semantic,
  };
  if (mechanisms.irregular_block) result.irregular_blocks = {
    count: mechanisms.irregular_block.count,
  };
  return result;
};

const sourceDescriptor = (path, scope, cadence) => ({
  path: rel(path),
  sha256: sha256(path),
  scope,
  cadence,
});

const v4 = readJson(V4_PATH);
const v4ByLevel = new Map(v4.levels.map((entry, index) => [index + 1, entry]));

const raw01to30 = readJson(EVIDENCE_PATHS.lv001_030);
const rawDirect21to30 = readJson(EVIDENCE_PATHS.lv021_030_direct);
const direct21to30Ids = (rawDirect21to30.levels ?? []).map((record) => record.level).sort((a, b) => a - b);
const expectedDirect21to30Ids = Array.from({ length: 10 }, (_, index) => index + 21);
if (JSON.stringify(direct21to30Ids) !== JSON.stringify(expectedDirect21to30Ids) ||
    new Set(direct21to30Ids).size !== expectedDirect21to30Ids.length) {
  throw new Error("Direct Lv21-Lv30 evidence must contain each level exactly once; fallback to legacy evidence is forbidden");
}
const direct21to30ByLevel = new Map(rawDirect21to30.levels.map((record) => [record.level, record]));
const raw41to70 = readJson(EVIDENCE_PATHS.lv041_070);
const resolved41to70 = readJson(EVIDENCE_PATHS.lv041_070_resolved);
const final41to70 = readJson(EVIDENCE_PATHS.lv041_070_final);
const raw71to100 = readJson(EVIDENCE_PATHS.lv071_100);
const raw81to100Crosscheck = readJson(EVIDENCE_PATHS.lv081_100_crosscheck);
const rawLv91SourceReaudit = readJson(EVIDENCE_PATHS.lv091_source_reaudit);
const crosscheckByLevel = new Map(raw81to100Crosscheck.levels.map((record) => [record.level, record]));
const rawStagePartitionAudit = readJson(EVIDENCE_PATHS.stage_partition_audit);

if (rawLv91SourceReaudit.source_facts?.level !== 91 ||
    rawLv91SourceReaudit.source_facts.full_level_union?.piece_count !== 27 ||
    rawLv91SourceReaudit.source_facts.mechanisms?.numeric_ice?.count !== 3) {
  throw new Error("Dedicated Lv91 source-frame re-audit is missing or incomplete");
}

if (rawStagePartitionAudit.summary?.audited_stage_count !== 45 ||
    rawStagePartitionAudit.summary?.per_stage_exact_count !== 14 ||
    rawStagePartitionAudit.summary?.per_stage_unclear_count !== 31) {
  throw new Error("Stage-partition audit is incomplete; expected 45 = 14 exact + 31 unclear stages");
}

const exactStageAuditByLevel = new Map();
for (const stage of rawStagePartitionAudit.exact_stages ?? []) {
  const list = exactStageAuditByLevel.get(stage.level) ?? [];
  list.push(stage);
  exactStageAuditByLevel.set(stage.level, list);
}
const aggregateStageAuditByLevel = new Map(
  (rawStagePartitionAudit.aggregate_exact_per_cover_unclear ?? []).map((entry) => [entry.level, entry]),
);
// The dedicated continuous Lv91 review supersedes the former single-snapshot
// aggregate. It follows both cover transitions and proves two disjoint five-
// piece batches, so Lv91 is no longer a per-cover design fill.
aggregateStageAuditByLevel.delete(91);
exactStageAuditByLevel.set(91, [
  {
    level: 91,
    stage_id: "cover-1",
    kind: "countdown_cover",
    trigger_value: 10,
    count: 5,
    shape_histogram: { SINGLE: 1, V3: 4 },
    evidence: "Dedicated Lv91 source-fps re-audit: upper-right value-10 cover stable reveal at 39.4s.",
  },
  {
    level: 91,
    stage_id: "cover-2",
    kind: "countdown_cover",
    trigger_value: 8,
    count: 5,
    shape_histogram: { SINGLE: 3, V2: 1, L3: 1 },
    evidence: "Dedicated Lv91 source-fps re-audit: lower-right value-8 cover stable reveal at 37.0s.",
  },
]);
const otherExactGeneratorAuditByLevel = new Map(
  (rawStagePartitionAudit.other_exact_generators ?? []).map((entry) => [entry.level, entry]),
);

const applyStagePartitionAudit = ({ level, mechanisms, stageSeeds, unclearFields }) => {
  const auditedMechanisms = deepClone(mechanisms);
  const auditedStages = deepClone(stageSeeds);
  const auditedUnclear = [...unclearFields];
  const exactStages = exactStageAuditByLevel.get(level) ?? [];
  for (const exact of exactStages) {
    const index = auditedStages.findIndex((stage) => stage.id === exact.stage_id);
    if (index < 0) throw new Error(`${levelId(level)} audited stage ${exact.stage_id} is missing`);
    auditedStages[index] = {
      ...auditedStages[index],
      count: exact.count,
      shape_histogram: orderedHistogram(exact.shape_histogram),
      provenance: "source_fps_stage_partition_fact",
      ...(exact.trigger_value != null ? { trigger_value: exact.trigger_value } : {}),
      ...(exact.position ? { source_position: exact.position } : {}),
      ...(exact.side ? { source_side: exact.side } : {}),
      ...(exact.queue_shape_sequence ? { source_queue_shape_sequence: exact.queue_shape_sequence.map(canonicalShape) } : {}),
      source_stage_audit_evidence: exact.evidence ?? exact.derivation ?? null,
    };
  }

  const exactGeneratorStages = exactStages.filter((stage) => stage.kind === "side_generator");
  if (exactGeneratorStages.length) {
    if (!auditedMechanisms.side_generator) throw new Error(`${levelId(level)} has audited generators but no generator mechanism`);
    auditedMechanisms.side_generator.queue_shape_sequences = exactGeneratorStages
      .map((stage) => stage.queue_shape_sequence.map(canonicalShape));
    auditedMechanisms.side_generator.preview_shapes = exactGeneratorStages
      .map((stage) => canonicalShape(stage.queue_shape_sequence[0]));
    auditedMechanisms.side_generator.queue_sides = exactGeneratorStages.map((stage) => stage.side);
    auditedMechanisms.side_generator.source_positions = exactGeneratorStages.map((stage) => stage.position);
  }

  const otherGenerator = otherExactGeneratorAuditByLevel.get(level);
  if (otherGenerator) {
    if (!auditedMechanisms.side_generator) throw new Error(`${levelId(level)} has generator audit but no generator mechanism`);
    auditedMechanisms.side_generator.queue_shape_sequences = [otherGenerator.queue_shape_sequence.map(canonicalShape)];
    auditedMechanisms.side_generator.preview_shapes = [canonicalShape(otherGenerator.queue_shape_sequence[0])];
    if (otherGenerator.side === "top-center") {
      auditedMechanisms.side_generator.queue_sides = ["top"];
      auditedMechanisms.side_generator.source_positions = ["top-center"];
    }
  }

  const aggregate = aggregateStageAuditByLevel.get(level);
  if (aggregate) {
    const coverStages = auditedStages.filter((stage) => stage.kind === "countdown_cover");
    if (coverStages.length !== aggregate.cover_stage_count) {
      throw new Error(`${levelId(level)} cover-stage count does not match audited unclear partition`);
    }
    const runtimeCounts = coverStages.map((stage) => stage.count);
    if (JSON.stringify(runtimeCounts) !== JSON.stringify(aggregate.current_contract_design_partition) ||
        runtimeCounts.reduce((sum, count) => sum + count, 0) !== aggregate.hidden_aggregate_count) {
      throw new Error(`${levelId(level)} runtime cover partition does not close to audited aggregate`);
    }
    for (const stage of coverStages) {
      stage.provenance = "runtime_design_choice_design_fill_not_video_fact_per_cover_unclear";
      stage.source_partition_status = "unclear";
      stage.source_count = "unclear";
      stage.source_shape_histogram = "unclear";
      stage.source_hidden_aggregate_count = aggregate.hidden_aggregate_count;
      stage.source_hidden_aggregate_shape_histogram = orderedHistogram(aggregate.hidden_aggregate_shape_histogram);
    }
    if (!auditedMechanisms.countdown_cover) {
      throw new Error(`${levelId(level)} has audited cover aggregate but no cover mechanism`);
    }
    auditedMechanisms.countdown_cover.per_cover_partition_status = "unclear";
    auditedMechanisms.countdown_cover.source_hidden_aggregate_count = aggregate.hidden_aggregate_count;
    auditedMechanisms.countdown_cover.source_hidden_aggregate_shape_histogram = orderedHistogram(
      aggregate.hidden_aggregate_shape_histogram,
    );
    if (!auditedUnclear.some((entry) => {
      const normalized = String(entry).toLowerCase();
      return normalized.includes("per-cover") || (normalized.includes("cover") && normalized.includes("unclear"));
    })) {
      auditedUnclear.push(
        `Per-cover hidden ownership is unclear; the ${aggregate.hidden_aggregate_count}-piece hidden aggregate and its shape histogram are exact.`,
      );
    }
  }

  return { mechanisms: auditedMechanisms, stageSeeds: auditedStages, unclearFields: auditedUnclear, aggregate };
};

const resolvedByLevel = new Map(resolved41to70.resolvedLevels.map((record) => [record.level, record]));
const finalByLevel = new Map(final41to70.levels.map((record) => [record.level, record]));

const makeTruthRecord = ({
  level,
  source,
  classification,
  confidence,
  timeSeconds,
  board,
  openingCount,
  openingHistogram,
  sourceFullCount,
  sourceFullHistogram,
  designFillFullCount = null,
  designFillFullHistogram = null,
  colorCount,
  mechanisms,
  stageSeeds,
  unclearFields = [],
  designFillFields = [],
  notes = [],
  rawEvidence = null,
}) => {
  const stageAudit = applyStagePartitionAudit({ level, mechanisms, stageSeeds, unclearFields });
  mechanisms = stageAudit.mechanisms;
  stageSeeds = stageAudit.stageSeeds;
  unclearFields = stageAudit.unclearFields;
  const normalizedSourceFullHistogram = orderedHistogram(sourceFullHistogram);
  const effectiveFullCount = normalizedSourceFullHistogram
    ? sourceFullCount
    : (designFillFullCount ?? sourceFullCount);
  const effectiveFullHistogram = normalizedSourceFullHistogram ?? orderedHistogram(designFillFullHistogram);
  if (!isPositiveInt(effectiveFullCount)) throw new Error(`${levelId(level)}: no effective full block count`);
  if (!effectiveFullHistogram) throw new Error(`${levelId(level)}: no effective full shape histogram`);
  const normalizedOpening = orderedHistogram(openingHistogram);
  if (!normalizedOpening || histogramTotal(normalizedOpening) !== openingCount) {
    throw new Error(`${levelId(level)}: opening histogram ${histogramTotal(normalizedOpening)} != ${openingCount}`);
  }
  if (histogramTotal(effectiveFullHistogram) !== effectiveFullCount) {
    throw new Error(`${levelId(level)}: full histogram ${histogramTotal(effectiveFullHistogram)} != ${effectiveFullCount}`);
  }
  if (!histogramContains(effectiveFullHistogram, normalizedOpening)) {
    throw new Error(`${levelId(level)}: full histogram does not contain opening histogram`);
  }
  if (stageAudit.aggregate) {
    const nonCoverHistogram = addHistograms(...stageSeeds
      .filter((stage) => stage.kind !== "countdown_cover")
      .map((stage) => stage.shape_histogram));
    const hiddenAggregate = subtractHistograms(
      effectiveFullHistogram,
      nonCoverHistogram,
      `${levelId(level)}/audited-hidden-aggregate`,
    );
    if (histogramTotal(hiddenAggregate) !== stageAudit.aggregate.hidden_aggregate_count ||
        JSON.stringify(hiddenAggregate) !== JSON.stringify(orderedHistogram(stageAudit.aggregate.hidden_aggregate_shape_histogram))) {
      throw new Error(`${levelId(level)} audited hidden aggregate does not close against full composition`);
    }
  }
  const currentDesignStagePaths = new Set(stageSeeds
    .filter((stage) => String(stage.provenance ?? "").includes("design_fill"))
    .map((stage) => `stage_seeds.${stage.id}`));
  designFillFields = designFillFields.filter((field) => (
    field !== "stage_seeds" &&
    (!field.startsWith("stage_seeds.") || currentDesignStagePaths.has(field))
  ));
  return {
    level,
    level_id: levelId(level),
    provenance: {
      source,
      classification,
      confidence,
      unclear_fields: [...new Set(unclearFields)],
      design_fill_fields: [...new Set([
        ...designFillFields,
        ...stageSeeds
          .filter((stage) => String(stage.provenance ?? "").includes("design_fill"))
          .map((stage) => `stage_seeds.${stage.id}`),
      ])],
    },
    time_seconds: timeSeconds,
    board: {
      rows: board.rows,
      cols: board.cols,
      playable_cell_count: board.playableCellCount,
      source_playable_mask: board.mask ?? "unclear",
      source_mask_status: board.maskStatus,
      source_component_count: board.components ?? null,
    },
    composition: {
      opening_piece_count: openingCount,
      opening_shape_histogram: normalizedOpening,
      source_full_piece_count: sourceFullCount ?? "unclear",
      source_full_shape_histogram: normalizedSourceFullHistogram ?? "unclear",
      design_fill_full_piece_count: designFillFullCount,
      design_fill_full_shape_histogram: orderedHistogram(designFillFullHistogram),
      effective_design_piece_count: effectiveFullCount,
      effective_design_shape_histogram: effectiveFullHistogram,
      source_occupied_cell_count: normalizedSourceFullHistogram ? histogramCells(normalizedSourceFullHistogram) : "unclear",
      effective_design_occupied_cell_count: histogramCells(effectiveFullHistogram),
      opening_color_count: colorCount.opening ?? colorCount.full,
      full_color_count: colorCount.full,
      source_sq3_count: effectiveFullHistogram.SQ3 ?? 0,
    },
    mechanisms: standardizeMechanisms(mechanisms, stageSeeds, level),
    stage_seeds: stageSeeds,
    notes,
    raw_evidence: rawEvidence,
  };
};

// The Lv17 1fps ledger originally classified all seven cyan numbered pieces as
// H3.  The untouched opening frame shows three H2 pieces in the first numbered
// row and four H3 pieces in the two rows below.  This correction is also forced
// by the exact 6x8 board: the corrected histogram occupies 48 cells, while the
// stale H3x7 reading would occupy 51 cells and could not be an opening layout.
const COMPOSITION_EVIDENCE_CORRECTIONS_01_TO_30 = new Map([
  [17, {
    numericIceHistogram: { H2: 3, H3: 4 },
    fullHistogram: { SINGLE: 12, H2: 3, V2: 4, H3: 6, SQ2: 1 },
    note: "Untouched Lv17 opening frame: numbered ice is H2x3 plus H3x4; the corrected full histogram tiles the exact 6x8 board (48/48 cells).",
  }],
]);

const truth01to30 = raw01to30.levels.map((record) => {
  const direct = direct21to30ByLevel.get(record.level);
  if (direct) {
    const sourceStageToId = new Map((direct.blocks.hidden_batches ?? []).map(
      (batch, index) => [batch.stage, `cover-${index + 1}`],
    ));
    const stageSeeds = [{
      id: "opening",
      kind: "opening",
      count: direct.blocks.opening_count,
      shape_histogram: orderedHistogram(direct.blocks.opening_shape_histogram),
      provenance: "source_video_untouched_opening_fact",
    }];
    (direct.blocks.hidden_batches ?? []).forEach((batch, index) => {
      const triggerValue = Number(String(batch.stage).match(/countdown_cover_(\d+)/)?.[1]);
      const position = String(batch.stage).replace(/^countdown_cover_\d+_?/, "") || null;
      stageSeeds.push({
        id: `cover-${index + 1}`,
        kind: "countdown_cover",
        trigger_value: Number.isInteger(triggerValue) ? triggerValue : null,
        position,
        source_stage_id: batch.stage,
        count: batch.count,
        shape_histogram: orderedHistogram(batch.shape_histogram),
        provenance: "source_fps_event_ledger_fact",
      });
    });
    return makeTruthRecord({
      level: direct.level,
      source: rawDirect21to30.source,
      classification: "local_video_fact_source_fps_crosschecked",
      confidence: "source_fps_exact",
      timeSeconds: direct.time_seconds,
      board: {
        rows: direct.board.rows,
        cols: direct.board.cols,
        playableCellCount: direct.board.playable_cells,
        mask: direct.board.playable_mask,
        maskStatus: "source_video_exact",
        components: null,
      },
      openingCount: direct.blocks.opening_count,
      openingHistogram: direct.blocks.opening_shape_histogram,
      sourceFullCount: direct.blocks.full_count,
      sourceFullHistogram: direct.blocks.full_shape_histogram,
      colorCount: {
        opening: direct.colors.opening_color_count,
        full: direct.colors.full_color_count,
      },
      mechanisms: normalizeDirectMechanisms21to30(direct, sourceStageToId),
      stageSeeds,
      unclearFields: direct.unclear_fields ?? [],
      designFillFields: [],
      notes: [
        `Untouched opening: ${direct.opening_evidence}.`,
        "Lv21-Lv30 values were re-audited from the newly supplied local source video; legacy 2-second recovery data is not used.",
      ],
      rawEvidence: direct,
    });
  }
  const evidenceCorrection = COMPOSITION_EVIDENCE_CORRECTIONS_01_TO_30.get(record.level);
  const ice = record.mechanisms.find((mechanism) => mechanism.type === "numbered_ice_block");
  const openingIceHistogram = record.blocks.locked_numbered_opening_count > 0
    ? orderedHistogram(evidenceCorrection?.numericIceHistogram ?? ice?.attached_shape_histogram)
    : null;
  const openingHistogram = addHistograms(record.blocks.opening_shape_histogram, openingIceHistogram);
  const openingCount = record.blocks.opening_draggable_count + record.blocks.locked_numbered_opening_count;
  const sourceFullHistogram = orderedHistogram(evidenceCorrection?.fullHistogram ?? record.blocks.full_shape_histogram);
  const sourceFullCount = record.blocks.full_count;
  const mechanisms = normalizeMechanisms01to30(record);
  if (evidenceCorrection?.numericIceHistogram && mechanisms.numeric_ice) {
    mechanisms.numeric_ice.shape_histogram = orderedHistogram(evidenceCorrection.numericIceHistogram);
  }
  const designFullHistogram = null;
  const designFullCount = null;
  const stageSeeds = [{
    id: "opening",
    kind: "opening",
    count: openingCount,
    shape_histogram: openingHistogram,
    provenance: "video_fact",
  }];
  const batches = record.blocks.hidden_behind_cover?.batches ?? [];
  batches.forEach((batch, index) => stageSeeds.push({
    id: `cover-${index + 1}`,
    kind: "countdown_cover",
    trigger_value: batch.cover_value,
    position: batch.position ?? null,
    count: batch.count,
    shape_histogram: orderedHistogram(batch.histogram),
    provenance: batch.confidence === "source_fps_exact" ? "source_fps_event_ledger_fact" :
      batch.confidence === "unclear" ? "unclear" : "video_fact",
  }));
  return makeTruthRecord({
    level: record.level,
    source: record.evidence.source,
    classification: record.level <= 20 ? "local_video_fact" :
      record.evidence.review_cadence.includes("source-fps") ? "local_video_fact_source_fps_crosschecked" : "historical_2fps_recovery_fact",
    confidence: record.blocks.full_shape_confidence,
    timeSeconds: record.timeSeconds,
    board: {
      rows: record.board.rows,
      cols: record.board.cols,
      playableCellCount: record.board.playable_cells,
      mask: record.board.playable_mask,
      maskStatus: record.board.confidence === "high" ? "exact_or_high_confidence" : "partial_or_medium",
      components: null,
    },
    openingCount,
    openingHistogram,
    sourceFullCount,
    sourceFullHistogram,
    designFillFullCount: designFullCount,
    designFillFullHistogram: designFullHistogram,
    colorCount: {
      opening: record.opening_color_count ?? record.color_count,
      full: record.full_color_count ?? record.color_count,
    },
    mechanisms,
    stageSeeds,
    unclearFields: record.unclear_fields.filter((field) => !field.includes("ice_frame") && !field.includes("冰框")),
    designFillFields: [],
    notes: record.level === 14
      ? [...record.notes.filter((note) => !note.includes("冰框")), "Selection-following frame is UI feedback, not a level mechanic."]
      : [...record.notes, ...(evidenceCorrection ? [evidenceCorrection.note] : [])],
    rawEvidence: record,
  });
});

const finalFullFor41to70 = (record) => {
  const final = finalByLevel.get(record.level);
  const resolved = resolvedByLevel.get(record.level);
  const full = final?.full ?? final?.observedFull ?? final?.designFill ?? resolved?.full ?? record.full;
  const histogram = orderedHistogram(full?.shapeHistogram);
  const count = full?.blockCount ?? record.full?.blockCount;
  const classification = final?.classification ?? (histogram ? "video_fact" : null);
  return { final, resolved, histogram, count, classification };
};

const mechanisms41to70WithOverrides = (record, final, resolved) => {
  const mechanisms = normalizeMechanisms41to70(record);
  const setNumericShapes = (histogram) => {
    if (mechanisms.numeric_ice) mechanisms.numeric_ice.shape_histogram = orderedHistogram(histogram);
  };
  if (record.level === 41 && mechanisms.side_generator) {
    mechanisms.side_generator.queue_shape_sequences = [["L4", "H3", "V2"], ["L4", "V3", "V3"]];
    mechanisms.side_generator.queue_shape_histograms = [{ H3: 1, V2: 1, L4: 1 }, { V3: 2, L4: 1 }];
    mechanisms.side_generator.preview_shapes = ["L4", "L4"];
  }
  if (record.level === 44 && mechanisms.side_generator) {
    mechanisms.side_generator.queue_shape_sequences = [["V3", "L3", "H3"]];
    mechanisms.side_generator.queue_shape_histograms = [{ H3: 1, V3: 1, L3: 1 }];
    mechanisms.side_generator.preview_shapes = ["V3"];
  }
  if (record.level === 44) {
    if (mechanisms.numeric_ice) {
      mechanisms.numeric_ice.opening_visible_count = 4;
      mechanisms.numeric_ice.post_melt_shell = 1;
      mechanisms.numeric_ice.items = NUMERIC_ICE_ITEMS_BY_LEVEL.get(44).map((item) => ({ ...item }));
    }
    mechanisms.shell = {
      count: 2,
      opening_visible_count: 1,
      layers: [1, 1],
      shape_histogram: { V2: 1, SQ2: 1 },
      items: [
        {
          shape: "V2",
          stage_id: "opening",
          extra_layers: 1,
          requires_numeric_ice: true,
          source_outer_color: "light-blue",
          source_core_color: "green",
        },
        {
          shape: "SQ2",
          stage_id: "allFiveCoversCombined-5",
          extra_layers: 1,
          source_outer_color: "light-blue",
          source_core_color: "purple",
        },
      ],
    };
  }
  if (record.level === 41) setNumericShapes({ V2: 4 });
  if (record.level === 46 && mechanisms.side_generator && final?.observed?.generatorSequences) {
    mechanisms.side_generator.queue_lengths = final.observed.generatorSequences.map((sequence) => sequence.length);
    mechanisms.side_generator.queue_shape_histograms = final.observed.generatorSequences.map((sequence) => orderedHistogram(
      sequence.reduce((result, shape) => {
        const normalized = canonicalShape(shape);
        result[normalized] = (result[normalized] ?? 0) + 1;
        return result;
      }, {}),
    ));
    mechanisms.side_generator.queue_shape_sequences = final.observed.generatorSequences.map((sequence) => sequence.map(canonicalShape));
    mechanisms.side_generator.preview_shapes = mechanisms.side_generator.queue_shape_sequences.map((sequence) => sequence[0]);
  }
  if (record.level === 47) setNumericShapes({ V3: 2 });
  if (record.level === 47 && mechanisms.side_generator) {
    mechanisms.side_generator.queue_lengths = [3, 3];
    mechanisms.side_generator.queue_shape_histograms = [{ H3: 3 }, { H3: 3 }];
    mechanisms.side_generator.queue_shape_sequences = [["H3", "H3", "H3"], ["H3", "H3", "H3"]];
    mechanisms.side_generator.preview_shapes = ["H3", "H3"];
  }
  if (record.level === 49 && mechanisms.side_generator && final?.observed?.generatorSequences) {
    mechanisms.side_generator.queue_lengths = final.observed.generatorSequences.map((sequence) => sequence.length);
    mechanisms.side_generator.queue_shape_histograms = final.observed.generatorSequences.map((sequence) => orderedHistogram(
      sequence.reduce((result, shape) => {
        const normalized = canonicalShape(shape);
        result[normalized] = (result[normalized] ?? 0) + 1;
        return result;
      }, {}),
    ));
    mechanisms.side_generator.queue_shape_sequences = final.observed.generatorSequences.map((sequence) => sequence.map(canonicalShape));
    mechanisms.side_generator.preview_shapes = mechanisms.side_generator.queue_shape_sequences.map((sequence) => sequence[0]);
  }
  if (record.level === 49 && mechanisms.numeric_ice) {
    mechanisms.numeric_ice.shape_histogram = { H2: 2 };
  }
  if (record.level === 54) setNumericShapes({ V2: 3 });
  if (record.level === 56 && mechanisms.axis_constrained_arrow) mechanisms.axis_constrained_arrow.count = 3;
  if (record.level === 58) {
    setNumericShapes({ H2: 2, V2: 2, SQ2: 2, RECT2X3: 1, L3: 1 });
    if (mechanisms.side_generator && final?.observed?.generatorSequence) {
      mechanisms.side_generator.queue_lengths = [final.observed.generatorSequence.length];
      mechanisms.side_generator.queue_shape_histograms = [orderedHistogram(
        final.observed.generatorSequence.reduce((result, shape) => {
          const normalized = canonicalShape(shape);
          result[normalized] = (result[normalized] ?? 0) + 1;
          return result;
        }, {}),
      )];
      mechanisms.side_generator.queue_shape_sequences = [final.observed.generatorSequence.map(canonicalShape)];
      mechanisms.side_generator.preview_shapes = [canonicalShape(final.observed.generatorSequence[0])];
    }
  }
  if (record.level === 57 && mechanisms.numeric_ice) {
    mechanisms.numeric_ice.shape_histogram = { H2: 1 };
  }
  if (record.level === 56 && mechanisms.side_generator) {
    mechanisms.side_generator.queue_shape_sequences = [["H3", "L3", "H3"]];
    mechanisms.side_generator.preview_shapes = ["H3"];
  }
  if (record.level === 57 && mechanisms.side_generator) {
    mechanisms.side_generator.queue_shape_sequences = [["L3", "V3", "H2"]];
    mechanisms.side_generator.preview_shapes = ["L3"];
  }
  if (record.level === 59) {
    delete mechanisms.axis_constrained_arrow;
    mechanisms.key = { count: 2, opening_visible_count: 0, key_shapes: { H2: 2 } };
    mechanisms.lock = {
      count: 2,
      initial_requirements: [1, 1],
      locked_shapes: { V3: 1, SQ2: 1 },
      pairing: final?.keyLock?.observedPairing ?? "two observed one-key locks; second pair proves pairing is not color-global",
      hidden_at_opening: true,
    };
  }
  if (record.level === 64) {
    mechanisms.numeric_ice = {
      count: 1,
      initial_values: [3],
      shape_histogram: { L3: 1 },
      opening_visible_count: 0,
      post_melt_shell: 0,
      items: [{ value: 3, shape: "L3", stage_id: "cover-13" }],
    };
    mechanisms.shell = {
      count: 3,
      opening_visible_count: 0,
      layers: [1, 1, 1],
      shape_histogram: { L4: 2, T4: 1 },
      items: [
        { shape: "L4", stage_id: "cover-8", extra_layers: 1 },
        { shape: "T4", stage_id: "cover-13", extra_layers: 1 },
        { shape: "L4", stage_id: "cover-13", extra_layers: 1 },
      ],
    };
  }
  if (record.level === 69) {
    mechanisms.numeric_ice = {
      count: 1,
      initial_values: [5],
      shape_histogram: { SQ2: 1 },
      opening_visible_count: 0,
      post_melt_shell: 0,
      items: [{ value: 5, shape: "SQ2", stage_id: "cover18" }],
    };
    mechanisms.shell = {
      count: 3,
      opening_visible_count: 1,
      layers: [1, 1, 1],
      shape_histogram: { H2: 1, H3: 1, V3: 1 },
      items: [
        { shape: "H2", stage_id: "opening", extra_layers: 1 },
        { shape: "H3", stage_id: "cover18", extra_layers: 1 },
        { shape: "V3", stage_id: "cover18", extra_layers: 1 },
      ],
    };
  }
  if (record.level === 62 && mechanisms.side_generator) {
    mechanisms.side_generator.queue_lengths = [3];
    mechanisms.side_generator.queue_shape_histograms = [{ H4: 2, V3: 1 }];
    mechanisms.side_generator.queue_shape_sequences = [["H4", "V3", "H4"]];
    mechanisms.side_generator.preview_shapes = ["H4"];
  }
  return mechanisms;
};

const openingFor41to70 = (record, resolved, final, effectiveFullHistogram) => {
  let histogram = orderedHistogram(
    final?.observed?.openingHistogram ?? resolved?.opening?.shapeHistogram ?? record.opening?.shapeHistogram,
  );
  if (!histogram) histogram = addHistograms(record.opening?.baseShapeHistogram, record.opening?.attachedShapeHistogram);
  const count = final?.observed?.openingHistogram
    ? histogramTotal(final.observed.openingHistogram)
    : resolved?.opening?.blockCount ?? record.opening?.totalVisibleBlocks ?? record.opening?.baseBlocks;
  if (histogramTotal(histogram) < count) {
    const missingCount = count - histogramTotal(histogram);
    const numericIce = record.mechanisms?.numericIce;
    const shapeList = numericIce?.attachedShapes;
    const attachmentHistogram = Array.isArray(shapeList)
      ? orderedHistogram(shapeList.reduce((result, shape) => {
        result[canonicalShape(shape)] = (result[canonicalShape(shape)] ?? 0) + 1;
        return result;
      }, {}))
      : orderedHistogram(shapeList);
    if (attachmentHistogram && histogramTotal(attachmentHistogram) === missingCount &&
        histogramContains(effectiveFullHistogram, addHistograms(histogram, attachmentHistogram))) {
      histogram = addHistograms(histogram, attachmentHistogram);
    } else {
      const remaining = subtractHistograms(effectiveFullHistogram, histogram, `${levelId(record.level)} opening`);
      histogram = addHistograms(histogram, allocateByWeights(missingCount, remaining));
    }
  }
  if (histogramTotal(histogram) !== count) throw new Error(`${levelId(record.level)}: bad opening normalization`);
  return { count, histogram };
};

const explicitStages41to70 = (record, final, resolved, opening, fullCount) => {
  if (record.level === 41 && resolved?.stagedLedger) {
    return [
      { id: "opening", kind: "opening", count: opening.count, shape_histogram: opening.histogram, provenance: "video_fact" },
      { id: "generator-1", kind: "side_generator", count: 3, shape_histogram: { H3: 1, V2: 1, L4: 1 }, provenance: "source_fps_event_ledger_fact" },
      { id: "generator-2", kind: "side_generator", count: 3, shape_histogram: { V3: 2, L4: 1 }, provenance: "source_fps_event_ledger_fact" },
      { id: "cover-8", kind: "countdown_cover", trigger_value: 8, count: 3, shape_histogram: { H3: 1, V3: 2 }, provenance: "source_fps_event_ledger_fact" },
      { id: "cover-14", kind: "countdown_cover", trigger_value: 14, count: 6, shape_histogram: { V2: 2, L4: 4 }, provenance: "source_fps_event_ledger_fact" },
    ];
  }
  if (record.level === 46 && final?.observed?.generatorSequences) {
    const generatorStages = final.observed.generatorSequences.map((sequence, index) => ({
      id: `generator-${index + 1}`,
      kind: "side_generator",
      count: sequence.length,
      shape_histogram: orderedHistogram(sequence.reduce((result, shape) => {
        const normalized = canonicalShape(shape);
        result[normalized] = (result[normalized] ?? 0) + 1;
        return result;
      }, {})),
      provenance: "source_high_fps_event_ledger_fact",
    }));
    return [
      { id: "opening", kind: "opening", count: opening.count, shape_histogram: opening.histogram, provenance: "video_fact" },
      ...generatorStages,
      { id: "cover-4", kind: "countdown_cover", trigger_value: 4, count: histogramTotal(final.observed.cover4Reveal), shape_histogram: orderedHistogram(final.observed.cover4Reveal), provenance: "source_high_fps_event_ledger_fact" },
      { id: "cover-9", kind: "countdown_cover", trigger_value: 9, count: histogramTotal(final.observed.cover9Reveal), shape_histogram: orderedHistogram(final.observed.cover9Reveal), provenance: "source_high_fps_event_ledger_fact" },
      { id: "cover-14", kind: "countdown_cover", trigger_value: 14, count: histogramTotal(final.observed.cover14Reveal), shape_histogram: orderedHistogram(final.observed.cover14Reveal), provenance: "source_high_fps_event_ledger_fact" },
    ];
  }
  if (record.level === 49 && final?.observed?.generatorSequences) {
    const generatorStages = final.observed.generatorSequences.map((sequence, index) => ({
      id: `generator-${index + 1}`,
      kind: "side_generator",
      count: sequence.length,
      shape_histogram: orderedHistogram(sequence.reduce((result, shape) => {
        const normalized = canonicalShape(shape);
        result[normalized] = (result[normalized] ?? 0) + 1;
        return result;
      }, {})),
      provenance: "source_high_fps_event_ledger_fact",
    }));
    return [
      { id: "opening", kind: "opening", count: opening.count, shape_histogram: opening.histogram, provenance: "video_fact" },
      ...generatorStages,
      {
        id: "cover-19-combined",
        kind: "countdown_cover",
        trigger_value: 19,
        count: histogramTotal(final.observed.simultaneousCoverRevealHistogram),
        shape_histogram: orderedHistogram(final.observed.simultaneousCoverRevealHistogram),
        provenance: "source_high_fps_combined_reveal_fact_per_cover_assignment_not_observable",
      },
    ];
  }
  if (record.level === 64 && final?.observed?.cover5Reveal) {
    return [
      { id: "opening", kind: "opening", count: opening.count, shape_histogram: opening.histogram, provenance: "video_fact" },
      { id: "cover-5", kind: "countdown_cover", trigger_value: 5, count: histogramTotal(final.observed.cover5Reveal), shape_histogram: orderedHistogram(final.observed.cover5Reveal), provenance: "source_high_fps_event_ledger_fact" },
      { id: "cover-8", kind: "countdown_cover", trigger_value: 8, count: histogramTotal(final.observed.cover8Reveal), shape_histogram: orderedHistogram(final.observed.cover8Reveal), provenance: "source_high_fps_event_ledger_fact" },
      { id: "cover-13", kind: "countdown_cover", trigger_value: 13, count: histogramTotal(final.observed.cover13Reveal), shape_histogram: orderedHistogram(final.observed.cover13Reveal), provenance: "source_high_fps_event_ledger_fact" },
    ];
  }
  if (record.level === 69 && final?.observedFull?.batchLedger) {
    return Object.entries(final.observedFull.batchLedger).map(([id, rawHistogram]) => {
      const histogram = orderedHistogram(rawHistogram);
      const namedCoverValue = /^cover(\d+)$/i.exec(id)?.[1];
      return {
        id,
        kind: id === "opening" ? "opening" : "countdown_cover",
        trigger_value: namedCoverValue ? Number(namedCoverValue) : null,
        count: histogramTotal(histogram),
        shape_histogram: histogram,
        provenance: "source_high_fps_event_ledger_fact",
      };
    });
  }
  if (final?.designFill?.batchLedger) {
    const stages = [];
    for (const [id, rawHistogram] of Object.entries(final.designFill.batchLedger)) {
      const histogram = orderedHistogram(rawHistogram);
      if (id === "opening") {
        stages.push({ id, kind: "opening", count: histogramTotal(histogram), shape_histogram: histogram, provenance: "video_fact" });
        continue;
      }
      const isGenerator = id === "generators";
      const splitCounts = isGenerator
        ? (record.mechanisms?.sideGenerators?.queueLengths ?? [histogramTotal(histogram)])
        : id === "covers"
          ? (() => {
            const count = record.mechanisms?.covers?.count ?? 1;
            let left = histogramTotal(histogram);
            return Array.from({ length: count }, (_, index) => {
              const value = Math.floor(left / (count - index));
              left -= value;
              return value;
            });
          })()
          : [histogramTotal(histogram)];
      let remaining = histogram;
      splitCounts.forEach((count, index) => {
        const allocated = index === splitCounts.length - 1 ? remaining : allocateByWeights(count, remaining);
        const namedCoverValue = /^cover(\d+)$/i.exec(id)?.[1];
        stages.push({
          id: splitCounts.length === 1 ? id : `${id}-${index + 1}`,
          kind: isGenerator ? "side_generator" : "countdown_cover",
          trigger_value: isGenerator ? null : namedCoverValue ? Number(namedCoverValue) : record.mechanisms?.covers?.countdowns?.[index] ?? null,
          count,
          shape_histogram: allocated,
          provenance: "design_fill_not_video_fact",
        });
        remaining = subtractHistograms(remaining, allocated, `${levelId(record.level)}/${id}-${index + 1}`);
      });
    }
    return stages;
  }
  if (record.level === 47 && resolved?.generators?.shapeHistogram) {
    return [
      { id: "opening", kind: "opening", count: opening.count, shape_histogram: opening.histogram, provenance: "video_fact" },
      { id: "generator-1", kind: "side_generator", count: 3, shape_histogram: { H3: 3 }, provenance: "video_fact" },
      { id: "generator-2", kind: "side_generator", count: 3, shape_histogram: { H3: 3 }, provenance: "video_fact" },
    ];
  }
  if (record.level === 54 && final?.observed) {
    return [
      { id: "opening", kind: "opening", count: histogramTotal(final.observed.openingHistogram), shape_histogram: orderedHistogram(final.observed.openingHistogram), provenance: "video_fact" },
      ...[5, 8, 13, 21].map((value) => ({
        id: `cover-${value}`,
        kind: "countdown_cover",
        trigger_value: value,
        count: histogramTotal(final.observed[`cover${value}Reveal`]),
        shape_histogram: orderedHistogram(final.observed[`cover${value}Reveal`]),
        provenance: "video_fact_with_shape_alias",
      })),
    ];
  }
  if (record.level === 57 && final?.observed) {
    return [
      { id: "opening", kind: "opening", count: histogramTotal(final.observed.openingHistogram), shape_histogram: orderedHistogram(final.observed.openingHistogram), provenance: "video_fact" },
      { id: "generator-1", kind: "side_generator", count: final.observed.generatorSequence.length, shape_histogram: orderedHistogram(final.observed.generatorSequence.reduce((result, shape) => ({ ...result, [canonicalShape(shape)]: (result[canonicalShape(shape)] ?? 0) + 1 }), {})), provenance: "video_fact" },
      { id: "cover-6", kind: "countdown_cover", trigger_value: 6, count: histogramTotal(final.observed.cover6Reveal), shape_histogram: orderedHistogram(final.observed.cover6Reveal), provenance: "video_fact" },
      { id: "cover-12", kind: "countdown_cover", trigger_value: 12, count: histogramTotal(final.observed.cover12Reveal), shape_histogram: orderedHistogram(final.observed.cover12Reveal), provenance: "video_fact" },
    ];
  }
  if (record.level === 58 && final?.observed?.generatorSequence) {
    const generatorHistogram = final.observed.generatorSequence.reduce((result, shape) => {
      result[canonicalShape(shape)] = (result[canonicalShape(shape)] ?? 0) + 1;
      return result;
    }, {});
    return [
      { id: "opening", kind: "opening", count: histogramTotal(final.observed.openingHistogram), shape_histogram: orderedHistogram(final.observed.openingHistogram), provenance: "video_fact" },
      { id: "generator-1", kind: "side_generator", count: 5, shape_histogram: orderedHistogram(generatorHistogram), provenance: "source_high_fps_event_ledger_fact" },
    ];
  }
  if (record.level === 59 && final?.observed) {
    return [
      { id: "opening", kind: "opening", count: histogramTotal(final.observed.openingHistogram), shape_histogram: orderedHistogram(final.observed.openingHistogram), provenance: "video_fact" },
      { id: "cover-6", kind: "countdown_cover", trigger_value: 6, count: histogramTotal(final.observed.cover6Reveal), shape_histogram: orderedHistogram(final.observed.cover6Reveal), provenance: "video_fact" },
      { id: "cover-12", kind: "countdown_cover", trigger_value: 12, count: histogramTotal(final.observed.cover12Reveal), shape_histogram: orderedHistogram(final.observed.cover12Reveal), provenance: "video_fact" },
    ];
  }
  if (record.level === 62 && final?.observed) {
    const genHistogram = final.observed.generatorSequence.reduce((result, shape) => {
      result[canonicalShape(shape)] = (result[canonicalShape(shape)] ?? 0) + 1;
      return result;
    }, {});
    return [
      { id: "opening", kind: "opening", count: histogramTotal(final.observed.openingHistogram), shape_histogram: orderedHistogram(final.observed.openingHistogram), provenance: "video_fact" },
      { id: "cover-1", kind: "countdown_cover", count: histogramTotal(final.observed.coverRevealHistogram), shape_histogram: orderedHistogram(final.observed.coverRevealHistogram), provenance: "video_fact" },
      { id: "generator-1", kind: "side_generator", count: final.observed.generatorSequence.length, shape_histogram: orderedHistogram(genHistogram), provenance: "video_fact" },
    ];
  }
  if (record.level === 69 && (final?.observedFull?.batchLedger || final?.designFill?.batchLedger)) throw new Error("Lv69 ledger should have been handled");
  if (resolved?.stagedLedger) {
    const stages = [{ id: "opening", kind: "opening", count: opening.count, shape_histogram: opening.histogram, provenance: "video_fact" }];
    for (const [name, batch] of Object.entries(resolved.stagedLedger)) {
      const histogram = orderedHistogram(batch?.shapeHistogram);
      const count = batch?.blockCount ?? histogramTotal(histogram);
      if (!isPositiveInt(count)) continue;
      const isGenerator = name.toLowerCase().includes("generator");
      const generatorQueueLengths = isGenerator ? (record.mechanisms?.sideGenerators?.queueLengths ?? []) : [];
      if (generatorQueueLengths.length > 1) {
        let remainingHistogram = histogram;
        generatorQueueLengths.forEach((queueCount, index) => {
          const allocated = remainingHistogram
            ? (index === generatorQueueLengths.length - 1 ? remainingHistogram : allocateByWeights(queueCount, remainingHistogram))
            : null;
          stages.push({
            id: `${name}-${index + 1}`,
            kind: "side_generator",
            count: queueCount,
            shape_histogram: allocated,
            provenance: allocated ? "batch_partition_design_fill_not_video_fact" : "shape_design_fill_not_video_fact",
          });
          if (allocated) remainingHistogram = subtractHistograms(remainingHistogram, allocated, `${levelId(record.level)}/${name}`);
        });
        continue;
      }
      const combinedCoverCount = !isGenerator && name.toLowerCase().includes("combined")
        ? (record.mechanisms?.covers?.count ?? 1)
        : 1;
      if (combinedCoverCount > 1) {
        let left = count;
        let remainingHistogram = histogram;
        for (let index = 0; index < combinedCoverCount; index += 1) {
          const splitCount = Math.floor(left / (combinedCoverCount - index));
          const allocated = remainingHistogram
            ? (index === combinedCoverCount - 1 ? remainingHistogram : allocateByWeights(splitCount, remainingHistogram))
            : null;
          stages.push({
            id: `${name}-${index + 1}`,
            kind: "countdown_cover",
            trigger_value: record.mechanisms?.covers?.countdowns?.[index] ?? null,
            count: splitCount,
            shape_histogram: allocated,
            provenance: "batch_partition_design_fill_not_video_fact",
          });
          left -= splitCount;
          if (allocated) remainingHistogram = subtractHistograms(remainingHistogram, allocated, `${levelId(record.level)}/${name}`);
        }
        continue;
      }
      stages.push({
        id: name,
        kind: isGenerator ? "side_generator" : "countdown_cover",
        count,
        shape_histogram: histogram,
        provenance: histogram ? "video_fact" : "shape_design_fill_not_video_fact",
      });
    }
    if (stages.reduce((sum, stage) => sum + stage.count, 0) === fullCount) return stages;
  }
  if (resolved?.generators?.shapeHistogram) {
    const generatorCount = resolved.generators.blockCount ??
      resolved.generators.queueLengths?.reduce((sum, count) => sum + count, 0) ??
      histogramTotal(resolved.generators.shapeHistogram);
    return [
      { id: "opening", kind: "opening", count: opening.count, shape_histogram: opening.histogram, provenance: "video_fact" },
      { id: "generators", kind: "side_generator", count: generatorCount, shape_histogram: orderedHistogram(resolved.generators.shapeHistogram), provenance: "video_fact" },
    ];
  }
  if (resolved?.generator?.shapeHistogram) {
    return [
      { id: "opening", kind: "opening", count: opening.count, shape_histogram: opening.histogram, provenance: "video_fact" },
      { id: "generator-1", kind: "side_generator", count: resolved.generator.blockCount, shape_histogram: orderedHistogram(resolved.generator.shapeHistogram), provenance: "video_fact" },
    ];
  }
  if (record.mechanisms?.lift?.count) {
    const stages = [
      { id: "opening", kind: "opening", count: opening.count, shape_histogram: opening.histogram, provenance: "video_fact" },
      ...record.mechanisms.lift.layers.slice(1).map((layer, index) => ({
        id: `lift-layer-${index + 2}`,
        kind: "lift",
        layer: index + 2,
        count: layer.blockCount,
        shape_histogram: orderedHistogram(layer.shapeHistogram),
        provenance: "video_fact",
      })),
    ];
    const coverCount = record.mechanisms?.covers?.count ?? 0;
    if (coverCount > 0) {
      const assigned = stages.reduce((sum, stage) => sum + stage.count, 0);
      let left = fullCount - assigned;
      for (let index = 0; index < coverCount; index += 1) {
        const count = Math.floor(left / (coverCount - index));
        stages.push({
          id: `cover-${index + 1}`,
          kind: "countdown_cover",
          trigger_value: record.mechanisms.covers.countdowns?.[index] ?? null,
          count,
          shape_histogram: orderedHistogram(record.mechanisms.covers.revealedShapes),
          provenance: record.mechanisms.covers.revealedShapes ? "video_fact" : "shape_design_fill_not_video_fact",
        });
        left -= count;
      }
    }
    return stages;
  }
  const stages = [{ id: "opening", kind: "opening", count: opening.count, shape_histogram: opening.histogram, provenance: "video_fact" }];
  const generatorLengths = record.mechanisms?.sideGenerators?.queueLengths ?? [];
  generatorLengths.forEach((count, index) => stages.push({
    id: `generator-${index + 1}`,
    kind: "side_generator",
    count,
    shape_histogram: null,
    provenance: "shape_design_fill_not_video_fact",
  }));
  const timedQueue = record.mechanisms?.timedTopFeeder?.queueLength;
  if (timedQueue) stages.push({
    id: "timed-feeder-1",
    kind: "timed_feeder",
    count: timedQueue,
    shape_histogram: orderedHistogram(record.mechanisms.timedTopFeeder.queueShapeHistogram),
    provenance: "video_fact",
  });
  const coverCount = record.mechanisms?.covers?.count ?? 0;
  const already = stages.reduce((sum, stage) => sum + stage.count, 0);
  const coverHidden = fullCount - already;
  if (coverHidden < 0) throw new Error(`${levelId(record.level)} stage counts exceed full count`);
  if (coverCount > 0) {
    const values = record.mechanisms.covers.countdowns ?? [];
    let left = coverHidden;
    for (let index = 0; index < coverCount; index += 1) {
      const count = Math.floor(left / (coverCount - index));
      stages.push({
        id: `cover-${index + 1}`,
        kind: "countdown_cover",
        trigger_value: values[index] ?? null,
        count,
        shape_histogram: null,
        provenance: "batch_count_and_shape_design_fill_not_video_fact",
      });
      left -= count;
    }
  } else if (coverHidden > 0) {
    stages.push({ id: "staged-remainder", kind: "staged_remainder", count: coverHidden, shape_histogram: null, provenance: "stage_identity_design_fill_not_video_fact" });
  }
  return stages;
};

const COLOR_COUNT_EVIDENCE_CORRECTIONS_41_TO_70 = new Map([
  [54, {
    count: 6,
    note: "Evidence correction: the complete Lv54 run contains exactly green, yellow, red, purple, light-blue, and dark-blue blocks. Its one ordinary plus five frozen color exits account for all six colors; no seventh color exit or other color-clearing mechanism appears in the video.",
  }],
  [57, {
    count: 8,
    note: "Evidence correction: the untouched opening and both cover reveals contain eight distinct block colors matching the eight boundary color exits; the prior count of seven merged light-blue and dark-blue.",
  }],
  [67, {
    count: 6,
    note: "Evidence correction: the complete Lv67 opening, cover reveal, and both Lift reveal layers contain exactly green, yellow, red, purple, light-blue, and dark-blue blocks. Its one ordinary plus five frozen color exits account for all six colors; the gold Lift frame is mechanism art, not a seventh block color or exit.",
  }],
]);

const OPENING_COLOR_COUNT_EVIDENCE_CORRECTIONS_41_TO_70 = new Map([
  [41, {
    count: 3,
    note: "Lv41 opening-batch tracking through 00:10, before either cover opens, resolves exactly red, light-blue, and purple; yellow, dark-blue, and green first arrive from later staged batches.",
  }],
  [46, {
    count: 4,
    note: "Untouched Lv46 opening shows four block colors (blue, red, purple, green); the remaining three of the seven full-level colors arrive from covers/generators.",
  }],
  [48, {
    count: 4,
    note: "Untouched Lv48 opening at 08:33 shows four block colors (red, yellow, light-blue, and dark-blue); the remaining two of the six full-level colors are introduced by the countdown-cover batch.",
  }],
  [49, {
    count: 4,
    note: "Lv49 opening-batch tracking through 09:52, while all three covers remain closed, resolves exactly red, green, yellow, and dark-blue; pink, orange, and light-blue arrive later.",
  }],
  [54, {
    count: 5,
    note: "Untouched Lv54 opening at 02:10-02:12 shows five block colors (yellow, green, red, purple, and dark-blue); light-blue first appears in the cover-5 reveal at about 02:28.",
  }],
  [55, {
    count: 6,
    note: "Lv55 opening-batch tracking through 04:42, after all four numeric-ice carriers thaw but before the cover opens, resolves six logical colors; pink first appears as the cover-hidden H3.",
  }],
  [57, {
    count: 4,
    note: "Untouched Lv57 opening shows four visually distinct block colors; red, dark-blue, pink, and orange first appear through the two covers and side generator.",
  }],
  [61, {
    count: 7,
    note: "The Lv61 first recorded second already has the opening pink H2 moving toward its exit; including that still-visible piece, the untouched opening resolves seven logical colors. Orange first appears in the cover batch as the eighth full-level color.",
  }],
  [64, {
    count: 5,
    note: "Untouched Lv64 opening at 03:57 contains five logical block colors; light-blue first appears in the cover-8 hidden batch.",
  }],
  [70, {
    count: 1,
    note: "Untouched Lv70 opening contains the single first feeder block, so opening color variety is one; its timed queue expands the full level to four colors.",
  }],
]);

const truth41to70 = raw41to70.levels.map((record) => {
  const { final, resolved, histogram, count, classification } = finalFullFor41to70(record);
  if (!histogram || !isPositiveInt(count)) throw new Error(`${levelId(record.level)} unresolved 41-70 full composition`);
  const opening = openingFor41to70(record, resolved, final, histogram);
  const sourceIsDesignFill = classification === "design_fill_not_video_fact";
  const stages = explicitStages41to70(record, final, resolved, opening, count);
  const colorCountCorrection = COLOR_COUNT_EVIDENCE_CORRECTIONS_41_TO_70.get(record.level);
  const correctedColorCount = colorCountCorrection?.count ?? (record.level === 47 ? 5 : record.colorCount);
  const openingColorCountCorrection = OPENING_COLOR_COUNT_EVIDENCE_CORRECTIONS_41_TO_70.get(record.level);
  const correctedOpeningColorCount = openingColorCountCorrection?.count ?? correctedColorCount;
  return makeTruthRecord({
    level: record.level,
    source: `${record.video}.mp4`,
    classification: sourceIsDesignFill ? "local_video_plus_design_fill" : "local_video_fact",
    confidence: sourceIsDesignFill ? "design_fill" : (record.uncertain?.length ? "medium_high_after_dynamic_resolution" : "high"),
    timeSeconds: record.timeSeconds,
    board: {
      rows: record.level === 48 ? 9 : record.board.rows,
      cols: record.board.cols,
      playableCellCount: record.board.playableCells,
      mask: maskFromUnknown(record.board.mask, record.level === 48 ? 9 : record.board.rows, record.board.cols),
      maskStatus: record.board.mask ? (String(record.board.mask).includes("?") ? "partial" : "exact") : "unclear",
      components: record.board.componentSizes?.length ?? 1,
    },
    openingCount: opening.count,
    openingHistogram: opening.histogram,
    sourceFullCount: sourceIsDesignFill
      ? ([49, 58, 64, 69].includes(record.level) ? count : null)
      : count,
    sourceFullHistogram: sourceIsDesignFill ? null : histogram,
    designFillFullCount: sourceIsDesignFill ? count : null,
    designFillFullHistogram: sourceIsDesignFill ? histogram : null,
    colorCount: { opening: correctedOpeningColorCount, full: correctedColorCount },
    mechanisms: mechanisms41to70WithOverrides(record, final, resolved),
    stageSeeds: stages,
    unclearFields: sourceIsDesignFill
      ? [...(record.uncertain ?? []), "source_full_shape_histogram"]
      : [],
    designFillFields: sourceIsDesignFill
      ? ["composition.design_fill_full_shape_histogram", "stage_seeds"]
      : stages.filter((stage) => stage.provenance.includes("design_fill")).map((stage) => `stage_seeds.${stage.id}`),
    notes: [
      ...(record.notes ?? []),
      ...(final?.unresolvedVideoFact ? [final.unresolvedVideoFact] : []),
      ...(final?.artOnly ? [final.artOnly] : []),
      ...(colorCountCorrection ? [colorCountCorrection.note] : []),
      ...(openingColorCountCorrection ? [openingColorCountCorrection.note] : []),
      ...(record.level === 69 ? [
        "Untouched Lv69 opening at 10:15 contains one H2 nested shell: the red outer layer reveals a green H2 core. The prior ledger omitted this opening shell and counted only the hidden H3/V3 shells.",
      ] : []),
      ...(record.level === 44 ? [
        "Lv44 contains two one-layer nested shells: an opening V2 revealed after its numeric ice thaws, plus a cover-hidden SQ2. The prior mechanism ledger omitted both shells.",
      ] : []),
    ],
    rawEvidence: { base: record, resolved: resolved ?? null, final: final ?? null },
  });
});

const provisionalTruth = [...truth01to30, ...truth41to70];
const completeNeighborHistograms = (level) => provisionalTruth
  .filter((candidate) => Math.abs(candidate.level - level) <= 3)
  .map((candidate) => candidate.composition.effective_design_shape_histogram);

const stages71to100 = (record, openingHistogram, effectiveFullHistogram) => {
  const stages = [{
    id: "opening",
    kind: "opening",
    count: record.blocks.opening_piece_count,
    shape_histogram: openingHistogram,
    provenance: histogramTotal(orderedHistogram(record.blocks.opening_shape_histogram)) === record.blocks.opening_piece_count
      ? "video_fact"
      : "partial_video_fact_plus_shape_design_fill",
  }];
  const mechanisms = record.mechanisms ?? {};
  if (mechanisms.staged_frames?.hidden_batch_count) stages.push({
    id: "staged-frame-1",
    kind: "staged_frame",
    count: mechanisms.staged_frames.hidden_batch_count,
    shape_histogram: orderedHistogram(mechanisms.staged_frames.hidden_batch_shape_histogram),
    provenance: "video_fact",
  });
  const generatorLengths = mechanisms.generators?.queue_lengths ?? [];
  generatorLengths.forEach((count, index) => {
    const perQueue = mechanisms.generators.queue_shape_histograms?.[index];
    const aggregate = generatorLengths.length === 1 ? mechanisms.generators.queue_shape_histogram : null;
    stages.push({
      id: `generator-${index + 1}`,
      kind: "side_generator",
      count,
      shape_histogram: orderedHistogram(perQueue ?? aggregate),
      provenance: orderedHistogram(perQueue ?? aggregate) ? "video_fact" : "shape_design_fill_not_video_fact",
    });
  });
  const coverCount = mechanisms.covers?.count ?? 0;
  const declaredCoverHidden = record.blocks.staged?.cover_hidden ?? 0;
  if (coverCount > 0) {
    const exactBatches = record.blocks.staged?.cover_batches;
    if (Array.isArray(exactBatches) && exactBatches.length === coverCount) {
      exactBatches.forEach((batch, index) => stages.push({
        id: `cover-${index + 1}`,
        kind: "countdown_cover",
        trigger_value: batch.trigger_value,
        count: batch.count,
        shape_histogram: orderedHistogram(batch.shape_histogram),
        provenance: "source_fps_crosscheck_fact",
      }));
    } else {
    let left = declaredCoverHidden;
    for (let index = 0; index < coverCount; index += 1) {
      const count = Math.floor(left / (coverCount - index));
      stages.push({
        id: `cover-${index + 1}`,
        kind: "countdown_cover",
        trigger_value: mechanisms.covers.initial_values?.[index] ?? null,
        count,
        shape_histogram: null,
        provenance: coverCount === 1 ? "video_count_fact_shape_design_fill" : "batch_count_and_shape_design_fill_not_video_fact",
      });
      left -= count;
    }
    }
  }
  const assigned = stages.reduce((sum, stage) => sum + stage.count, 0);
  if (assigned < record.blocks.full_piece_count) stages.push({
    id: "staged-remainder",
    kind: "staged_remainder",
    count: record.blocks.full_piece_count - assigned,
    shape_histogram: null,
    provenance: "stage_identity_design_fill_not_video_fact",
  });
  if (assigned > record.blocks.full_piece_count) throw new Error(`${levelId(record.level)} stages exceed full count`);
  return stages;
};

const histogramFromSequence = (sequence) => orderedHistogram((sequence ?? []).reduce((result, shape) => {
  result[canonicalShape(shape)] = (result[canonicalShape(shape)] ?? 0) + 1;
  return result;
}, {}));

const mergeSourceFpsCrosscheck = (primary) => {
  const cross = crosscheckByLevel.get(primary.level);
  if (!cross) return primary;
  const exits = cross.mechanisms.exits;
  const numericItems = cross.mechanisms.numericIce?.items ?? [];
  const numericShapeHistogram = numericItems.length
    ? histogramFromSequence(numericItems.map((item) => item.shape))
    : orderedHistogram(cross.mechanisms.numericIce?.shapeHistogram);
  const queues = cross.mechanisms.generators?.queues ?? [];
  const axisItems = cross.mechanisms.axisConstrainedBlocks?.items ?? [];
  const keyLocks = cross.mechanisms.keysAndLocks ?? {};
  const starOther = cross.mechanisms.other?.find((item) => item.type === "star-target class");
  const crossFullHistogram = orderedHistogram(
    cross.blocks.sourceFullShapeHistogram ?? cross.blocks.fullShapeHistogram,
  );
  const coverBatches = cross.blocks.staged?.coverBatches?.map((batch) => ({
    trigger_value: batch.coverInitialValue,
    count: batch.count,
    shape_histogram: orderedHistogram(batch.shapeHistogram),
  })) ?? null;
  return {
    ...primary,
    time_limit_seconds: cross.timeLimitSeconds,
    board: {
      rows: cross.board.rows,
      cols: cross.board.cols,
      playable_cells: cross.board.playableCells,
      components: cross.board.components,
      mask: cross.board.mask,
    },
    blocks: {
      opening_piece_count: cross.blocks.openingCount,
      full_piece_count: cross.blocks.fullCount,
      opening_shape_histogram: orderedHistogram(cross.blocks.openingShapeHistogram),
      full_shape_histogram: crossFullHistogram,
      opening_color_count: cross.blocks.openingColorCount,
      full_color_count: cross.blocks.fullColorCount,
      staged: {
        cover_hidden: cross.blocks.staged?.coverHiddenCount ?? 0,
        generator_queue: cross.blocks.staged?.generatorQueueCount ?? queues.reduce((sum, queue) => sum + queue.length, 0),
        frame_hidden: cross.blocks.staged?.frameHiddenCount ?? 0,
        cover_batches: coverBatches,
      },
    },
    mechanisms: {
      directional_exits: { count: exits.ordinaryUnfrozenCount },
      frozen_exits: exits.ordinaryFrozenCount > 0
        ? { count: exits.ordinaryFrozenCount, initial_values: exits.ordinaryFrozenValues }
        : undefined,
      star_exits: exits.starExitCount > 0
        ? {
          count: exits.starExitCount,
          frozen_count: exits.starFrozenCount ?? 0,
          frozen_values: exits.starFrozenValues ?? [],
          mapping: exits.mapping ?? null,
        }
        : undefined,
      numeric_ice: cross.mechanisms.numericIce?.count > 0
        ? {
          count: cross.mechanisms.numericIce.count,
          opening_visible_count: cross.mechanisms.numericIce.hiddenAtOpening === true
            ? 0
            : cross.mechanisms.numericIce.count,
          hidden_at_opening: cross.mechanisms.numericIce.hiddenAtOpening ?? false,
          values: numericItems.length ? numericItems.map((item) => item.value) : cross.mechanisms.numericIce.values,
          shapes: numericShapeHistogram,
          post_melt_shell: cross.mechanisms.numericIce.postMeltShellCount ?? 0,
        }
        : undefined,
      nested_shells: cross.mechanisms.shells?.count > 0
        ? {
          count: cross.mechanisms.shells.count,
          layers: cross.mechanisms.shells.layers,
          shapes: orderedHistogram(cross.mechanisms.shells.shapeHistogram),
        }
        : undefined,
      covers: cross.mechanisms.countdownCovers?.count > 0
        ? {
          count: cross.mechanisms.countdownCovers.count,
          initial_values: cross.mechanisms.countdownCovers.initialValues,
        }
        : undefined,
      generators: queues.length
        ? {
          count: cross.mechanisms.generators.count,
          queue_lengths: queues.map((queue) => queue.length),
          queue_shape_histograms: queues.map((queue) => histogramFromSequence(queue.shapeSequence)),
          queue_shape_sequences: queues.map((queue) => queue.shapeSequence.map(canonicalShape)),
          queue_sides: queues.every((queue) => ["left", "right", "top", "bottom"].includes(queue.side))
            ? queues.map((queue) => queue.side)
            : null,
        }
        : undefined,
      axis_constrained_arrow_blocks: axisItems.length
        ? {
          count: cross.mechanisms.axisConstrainedBlocks.count,
          shapes: histogramFromSequence(axisItems.map((item) => item.shape)),
          axes: axisItems.map((item) => item.axis),
          items: axisItems,
          hidden_at_opening: cross.mechanisms.axisConstrainedBlocks.hiddenAtOpening ??
            axisItems.every((item) => item.hiddenAtOpening),
          semantic: cross.mechanisms.axisConstrainedBlocks.behavior,
        }
        : undefined,
      keys: keyLocks.keyCount > 0
        ? {
          count: keyLocks.keyCount,
          opening_visible_count: keyLocks.openingVisibleKeyCount ??
            (keyLocks.hiddenAtOpening === true ? 0 : keyLocks.keyCount),
          hidden_at_opening: keyLocks.hiddenAtOpening ?? false,
          key_shapes: orderedHistogram(keyLocks.keyShapeHistogram),
        }
        : undefined,
      locks: keyLocks.lockCount > 0
        ? {
          count: keyLocks.lockCount,
          initial_requirements: keyLocks.lockValues,
          locked_shapes: orderedHistogram(keyLocks.lockedShapeHistogram),
          pairing: keyLocks.pairing,
          hidden_at_opening: keyLocks.hiddenAtOpening ?? false,
        }
        : undefined,
      star_blocks: starOther
        ? {
          count: starOther.starBlockCount,
          shapes: { SQ2: starOther.starBlockCount },
          plain_same_shape_count: starOther.plainBlockCount,
          semantic: starOther.semantic,
        }
        : undefined,
    },
    unclear: cross.unclear ?? [],
    confidence: cross.opening.confidence,
    crosscheck_correction: cross.crosscheckCorrection ?? null,
    _primary_evidence: primary,
    _crosscheck_evidence: cross,
  };
};

const applyLv91SourceReaudit = (record) => {
  if (record.level !== 91) return record;
  const facts = rawLv91SourceReaudit.source_facts;
  const lowerReveal = facts.cover_reveals.find((entry) => entry.cover === "lower-right");
  const upperReveal = facts.cover_reveals.find((entry) => entry.cover === "upper-right");
  if (!lowerReveal || !upperReveal) throw new Error("Lv91 re-audit must contain both cover reveals");
  const ice = facts.mechanisms.numeric_ice;
  const keyLocks = facts.mechanisms.keys_and_locks;
  const axis = facts.mechanisms.axis_constrained_arrow_blocks;
  return {
    ...record,
    time_limit_seconds: facts.timer_seconds,
    board: {
      rows: facts.board.rows,
      cols: facts.board.cols,
      playable_cells: facts.board.cell_count,
      components: 1,
      mask: Array.from({ length: facts.board.rows }, () => "#".repeat(facts.board.cols)).join("/"),
    },
    blocks: {
      ...record.blocks,
      opening_piece_count: facts.opening.piece_count,
      full_piece_count: facts.full_level_union.piece_count,
      opening_shape_histogram: orderedHistogram(facts.opening.shape_histogram),
      full_shape_histogram: orderedHistogram(facts.full_level_union.shape_histogram),
      staged: {
        cover_hidden: lowerReveal.piece_count + upperReveal.piece_count,
        generator_queue: 0,
        frame_hidden: 0,
        // Keep stage order aligned to the source cover-value order [10, 8].
        cover_batches: [
          {
            trigger_value: 10,
            count: upperReveal.piece_count,
            shape_histogram: orderedHistogram(upperReveal.shape_histogram),
          },
          {
            trigger_value: 8,
            count: lowerReveal.piece_count,
            shape_histogram: orderedHistogram(lowerReveal.shape_histogram),
          },
        ],
      },
    },
    mechanisms: {
      ...record.mechanisms,
      covers: {
        count: facts.mechanisms.countdown_covers.count,
        initial_values: facts.mechanisms.countdown_covers.initial_values,
      },
      numeric_ice: {
        count: ice.count,
        opening_visible_count: ice.opening_visible_count,
        hidden_at_opening: true,
        values: ice.initial_values,
        shapes: orderedHistogram(ice.shape_histogram),
        post_melt_shell: ice.post_melt_shell_count,
      },
      keys: {
        count: keyLocks.key_count,
        opening_visible_count: keyLocks.key_count,
        hidden_at_opening: false,
        key_shapes: orderedHistogram(keyLocks.key_carrier_shape_histogram),
      },
      locks: {
        count: keyLocks.lock_count,
        initial_requirements: keyLocks.lock_initial_requirements,
        locked_shapes: orderedHistogram(keyLocks.locked_shape_histogram),
        hidden_at_opening: true,
        pairing: "opening V3 key unlocks lower-right cover V2 lock",
      },
      axis_constrained_arrow_blocks: {
        count: axis.count,
        shapes: orderedHistogram(axis.shape_histogram),
        axes: axis.axes,
        items: [{ shape: "V3", axis: "vertical", stage_id: "cover-1", hiddenAtOpening: true }],
        hidden_at_opening: true,
        semantic: "Player-dragged only along the printed vertical axis; never autonomous.",
      },
    },
    unclear: rawLv91SourceReaudit.unclear.map((entry) => `${entry.field}: ${entry.value}`),
    confidence: "source_fps_exact_union",
    crosscheck_correction: "Dedicated continuous source-fps audit corrects Lv91 from 25 to 27 pieces and resolves both five-piece cover batches.",
    _lv91_source_reaudit: rawLv91SourceReaudit,
  };
};

const truth71to100 = raw71to100.levels.map((primaryRecord) => {
  const record = applyLv91SourceReaudit(mergeSourceFpsCrosscheck(primaryRecord));
  let openingHistogram = orderedHistogram(record.blocks.opening_shape_histogram);
  const sourceHistogram = orderedHistogram(record.blocks.full_shape_histogram);
  const openingNeededDesignFill = histogramTotal(openingHistogram) !== record.blocks.opening_piece_count;
  if (histogramTotal(openingHistogram) !== record.blocks.opening_piece_count) {
    const known = histogramTotal(openingHistogram);
    const weights = sourceHistogram
      ? subtractHistograms(sourceHistogram, openingHistogram, `${levelId(record.level)} partial opening`)
      : v4ByLevel.get(record.level).our_design_target.full_level_shape_histogram;
    openingHistogram = addHistograms(openingHistogram, allocateByWeights(record.blocks.opening_piece_count - known, weights));
  }
  const designFillHistogram = sourceHistogram ? null : fillFullHistogram({
    opening: openingHistogram,
    fullCount: record.blocks.full_piece_count,
    preferred: v4ByLevel.get(record.level).our_design_target.full_level_shape_histogram,
    neighbors: completeNeighborHistograms(record.level),
    label: levelId(record.level),
  });
  const effective = sourceHistogram ?? designFillHistogram;
  return makeTruthRecord({
    level: record.level,
    source: `C:/Users/Administrator/Desktop/block out/参考视频/${record.video}`,
    classification: sourceHistogram
      ? (record._crosscheck_evidence ? "local_video_fact_source_fps_crosschecked" : "local_video_fact")
      : "local_video_plus_design_fill",
    confidence: record.confidence,
    timeSeconds: record.time_limit_seconds,
    board: {
      rows: record.board.rows,
      cols: record.board.cols,
      playableCellCount: record.board.playable_cells,
      mask: maskFromUnknown(record.board.mask, record.board.rows, record.board.cols),
      maskStatus: exactSourceMask(maskFromUnknown(record.board.mask, record.board.rows, record.board.cols), record.board.rows, record.board.cols) ? "exact" : "partial_or_unclear",
      components: record.board.components,
    },
    openingCount: record.blocks.opening_piece_count,
    openingHistogram,
    sourceFullCount: record.blocks.full_piece_count,
    sourceFullHistogram: sourceHistogram,
    designFillFullCount: sourceHistogram ? null : record.blocks.full_piece_count,
    designFillFullHistogram: designFillHistogram,
    colorCount: { opening: record.blocks.opening_color_count, full: record.blocks.full_color_count },
    mechanisms: normalizeMechanisms71to100(record),
    stageSeeds: stages71to100(record, openingHistogram, effective),
    unclearFields: record.unclear ?? [],
    designFillFields: [
      ...(sourceHistogram ? [] : ["composition.design_fill_full_shape_histogram", "stage_seeds"]),
      ...(openingNeededDesignFill ? ["composition.opening_shape_histogram"] : []),
    ],
    notes: [
      record.relative_new_mechanism,
      record.crosscheck_correction,
      ...(record.trigger_evidence ?? []).map((entry) => entry.observation),
    ].filter(Boolean),
    rawEvidence: record._lv91_source_reaudit
      ? {
        primary: record._primary_evidence,
        source_fps_crosscheck: record._crosscheck_evidence,
        dedicated_source_fps_reaudit: record._lv91_source_reaudit,
      }
      : record._crosscheck_evidence
      ? { primary: record._primary_evidence, source_fps_crosscheck: record._crosscheck_evidence }
      : record,
  });
});

const normalizeMechanisms31to40 = (record) => {
  const source = record.mechanisms ?? {};
  const result = {
    directional_exit: { ordinary_count: source.normal_exits?.instances ?? 0 },
  };
  if (source.frozen_exits) result.frozen_exit = {
    count: source.frozen_exits.instances,
    initial_values: source.frozen_exits.values,
  };
  if (source.numeric_ice) result.numeric_ice = {
    count: source.numeric_ice.instances,
    initial_values: source.numeric_ice.values,
    shape_histogram: orderedHistogram(source.numeric_ice.contained_shapes),
    post_melt_shell: source.numeric_ice.post_thaw_extra_shell_layers ?? null,
  };
  if (source.multilayer_shell) {
    const count = source.multilayer_shell.instances;
    result.shell = {
      count,
      layers: isPositiveInt(count) ? Array.from({ length: count }, () => source.multilayer_shell.layers_per_piece ?? 1) : [],
      shape_histogram: orderedHistogram(source.multilayer_shell.attached_shape_histogram) ??
        (record.level === 32 ? { L4: 6 } : record.level === 34 && isPositiveInt(count) ? { V3: count } : null),
      source_count: source.multilayer_shell.instances ?? "unclear",
      provenance: source.multilayer_shell.status === "source_fps_exact" ? "source_fps_event_ledger_fact" : "video_fact",
      items: record.level === 34
        ? Array.from({ length: count }, () => ({ shape: "V3", stage_id: "cover-1", extra_layers: 1 }))
        : record.level === 32
          ? Array.from({ length: count }, () => ({
            shape: "L4",
            stage_id: "opening",
            extra_layers: 1,
            requires_numeric_ice: true,
          }))
        : null,
    };
  }
  if (record.level === 32 && result.numeric_ice) {
    result.numeric_ice.post_melt_shell = 6;
    result.numeric_ice.items = Array.from({ length: 6 }, () => ({
      value: 4,
      shape: "L4",
      stage_id: "opening",
    }));
  }
  const cover = source.covers ?? source.cover;
  if (cover) result.countdown_cover = {
    count: cover.instances,
    initial_values: cover.opening_values ?? [cover.opening_value],
  };
  const generator = source.generators ?? source.generator;
  if (generator) {
    const queueLengths = generator.queue_lengths ?? [generator.queue_length];
    result.side_generator = {
      count: generator.instances,
      queue_lengths: queueLengths,
      total_queue_count: generator.total_generated_pieces ?? queueLengths.reduce((sum, count) => sum + count, 0),
      queue_shape_histogram: orderedHistogram(
        generator.generated_shape_histogram ?? generator.full_queue_shape_histogram ?? generator.queue_shape_histogram,
      ),
      queue_shape_histograms: generator.queue_shape_histograms?.map((histogram) => orderedHistogram(histogram)) ?? null,
      queue_shape_sequences: generator.queue_sequences?.map((sequence) => sequence.map(canonicalShape)) ??
        (generator.queue_sequence ? [generator.queue_sequence.map(canonicalShape)] : null),
      preview_shapes: generator.opening_preview_shape ? [generator.opening_preview_shape] : null,
    };
  }
  if (source.irregular_board) result.irregular_board = deepClone(source.irregular_board);
  return result;
};

const designFill31to40 = () => null;

const stages31to40 = (record, effectiveFullCount, openingHistogram) => {
  const stages = [{
    id: "opening",
    kind: "opening",
    count: record.opening_piece_count,
    shape_histogram: openingHistogram,
    provenance: "video_fact",
  }];
  const source = record.mechanisms ?? {};
  const generator = source.generators ?? source.generator;
  if (generator) {
    const queueLengths = generator.queue_lengths ?? [generator.queue_length];
    const aggregateHistogram = orderedHistogram(
      generator.generated_shape_histogram ?? generator.full_queue_shape_histogram ?? generator.queue_shape_histogram,
    );
    let remaining = aggregateHistogram;
    queueLengths.forEach((count, index) => {
      const exactPerQueue = orderedHistogram(generator.queue_shape_histograms?.[index]);
      const allocated = exactPerQueue ?? (remaining
        ? (index === queueLengths.length - 1 ? remaining : allocateByWeights(count, remaining))
        : null);
      stages.push({
        id: `generator-${index + 1}`,
        kind: "side_generator",
        count,
        shape_histogram: allocated,
        provenance: exactPerQueue ? "source_high_fps_event_ledger_fact" : allocated ? "video_fact" : "shape_design_fill_not_video_fact",
      });
      if (allocated && remaining) remaining = subtractHistograms(remaining, allocated, `${levelId(record.level)}/generator-${index + 1}`);
    });
  }
  const cover = source.covers ?? source.cover;
  if (cover) {
    if (record.level === 34) {
      stages.push(
        {
          id: "cover-1",
          kind: "countdown_cover",
          trigger_value: 12,
          count: 8,
          shape_histogram: { V3: 8 },
          provenance: "source_fps_event_ledger_fact",
        },
        {
          id: "cover-2",
          kind: "countdown_cover",
          trigger_value: 22,
          count: 5,
          shape_histogram: { V3: 5 },
          provenance: "source_fps_event_ledger_fact",
        },
      );
      return stages;
    }
    const coverCount = cover.instances;
    const totalAlready = stages.reduce((sum, stage) => sum + stage.count, 0);
    const totalHidden = cover.released_piece_count ?? (effectiveFullCount - totalAlready);
    const aggregateHistogram = orderedHistogram(cover.released_shape_histogram);
    let left = totalHidden;
    let remaining = aggregateHistogram;
    for (let index = 0; index < coverCount; index += 1) {
      const count = Math.floor(left / (coverCount - index));
      const allocated = remaining
        ? (index === coverCount - 1 ? remaining : allocateByWeights(count, remaining))
        : null;
      stages.push({
        id: `cover-${index + 1}`,
        kind: "countdown_cover",
        trigger_value: (cover.opening_values ?? [cover.opening_value])[index] ?? null,
        count,
        shape_histogram: allocated,
        provenance: coverCount === 1 && allocated ? "video_fact" : "batch_count_and_shape_design_fill_not_video_fact",
      });
      left -= count;
      if (allocated) remaining = subtractHistograms(remaining, allocated, `${levelId(record.level)}/cover-${index + 1}`);
    }
  }
  const assigned = stages.reduce((sum, stage) => sum + stage.count, 0);
  if (assigned < effectiveFullCount) stages.push({
    id: "staged-remainder",
    kind: "staged_remainder",
    count: effectiveFullCount - assigned,
    shape_histogram: null,
    provenance: "stage_identity_design_fill_not_video_fact",
  });
  if (assigned > effectiveFullCount) throw new Error(`${levelId(record.level)} stage counts exceed effective full count`);
  return stages;
};

const load31to40 = () => {
  if (!existsSync(EVIDENCE_PATHS.lv031_040)) {
    throw new Error(
      `Missing ${rel(EVIDENCE_PATHS.lv031_040)}. The 31-40 video audit must finish before v6 can be built; no silent fallback is allowed.`,
    );
  }
  const evidence = readJson(EVIDENCE_PATHS.lv031_040);
  if (!Array.isArray(evidence.levels) || evidence.levels.length !== 10) {
    throw new Error("31-40 evidence must expose a ten-entry levels array");
  }
  return evidence.levels.map((record) => {
    const isFlat = "opening_piece_count" in record;
    const isModern = record.blocks && "opening_piece_count" in record.blocks;
    const isLegacy = record.blocks && "opening_draggable_count" in record.blocks;
    if (!isFlat && !isModern && !isLegacy) throw new Error(`${levelId(record.level)} unsupported 31-40 evidence schema`);
    if (isFlat) {
      const sourceHistogram = orderedHistogram(record.full_shape_histogram);
      const explicitFill = designFill31to40(record);
      const designHistogram = explicitFill?.histogram ?? (!sourceHistogram
        ? fillFullHistogram({
          opening: record.opening_shape_histogram,
          fullCount: record.full_piece_count,
          preferred: v4ByLevel.get(record.level).our_design_target.full_level_shape_histogram,
          neighbors: completeNeighborHistograms(record.level),
          label: levelId(record.level),
        })
        : null);
      const effectiveCount = sourceHistogram ? record.full_piece_count : explicitFill?.count ?? record.full_piece_count;
      if (!isPositiveInt(effectiveCount) || (!sourceHistogram && !designHistogram)) {
        throw new Error(`${levelId(record.level)} unresolved full composition requires an explicit design fill`);
      }
      const openingHistogram = orderedHistogram(record.opening_shape_histogram);
      const stageSeeds = stages31to40(record, effectiveCount, openingHistogram);
      return makeTruthRecord({
        level: record.level,
        source: evidence.source_video ?? "C:/Users/Administrator/Desktop/block out/参考视频/31-40.mp4",
        classification: sourceHistogram ? "local_video_fact" : "local_video_plus_design_fill",
        confidence: record.confidence,
        timeSeconds: record.time_limit_seconds,
        board: {
          rows: record.board.rows,
          cols: record.board.cols,
          playableCellCount: record.board.playable_cells,
          mask: maskFromUnknown(record.board.mask, record.board.rows, record.board.cols),
          maskStatus: record.board.confidence,
          components: record.mechanisms?.irregular_board?.components ?? 1,
        },
        openingCount: record.opening_piece_count,
        openingHistogram,
        sourceFullCount: record.full_piece_count,
        sourceFullHistogram: sourceHistogram,
        designFillFullCount: sourceHistogram ? null : effectiveCount,
        designFillFullHistogram: designHistogram,
        colorCount: { opening: record.opening_color_count, full: record.full_color_count },
        mechanisms: normalizeMechanisms31to40(record),
        stageSeeds,
        unclearFields: [
          ...(record.unclear_fields ?? []),
          ...(!sourceHistogram ? ["source_full_shape_histogram"] : []),
          ...(record.mechanisms?.multilayer_shell && record.mechanisms.multilayer_shell.instances == null
            ? ["mechanisms.multilayer_shell.instances"]
            : []),
        ],
        designFillFields: [
          ...(!sourceHistogram ? ["composition.design_fill_full_shape_histogram", "stage_seeds"] : []),
          ...(record.mechanisms?.multilayer_shell && record.mechanisms.multilayer_shell.instances == null
            ? ["mechanism_contract.shells.count"]
            : []),
        ],
        notes: [record.relative_difficulty_source, explicitFill?.reason].filter(Boolean),
        rawEvidence: record,
      });
    }
    if (isLegacy) {
      const ice = (record.mechanisms ?? []).find((mechanism) => mechanism.type === "numbered_ice_block");
      const openingHistogram = addHistograms(
        record.blocks.opening_shape_histogram,
        record.blocks.locked_numbered_opening_count ? ice?.attached_shape_histogram : null,
      );
      const openingCount = record.blocks.opening_draggable_count + (record.blocks.locked_numbered_opening_count ?? 0);
      const fullHistogram = orderedHistogram(record.blocks.full_shape_histogram);
      if (!fullHistogram) throw new Error(`${levelId(record.level)} 31-40 full histogram must be resolved before contract build`);
      return makeTruthRecord({
        level: record.level,
        source: record.evidence?.source ?? "C:/Users/Administrator/Desktop/block out/参考视频/31-40.mp4",
        classification: "local_video_fact",
        confidence: record.blocks.full_shape_confidence ?? "high",
        timeSeconds: record.timeSeconds,
        board: {
          rows: record.board.rows,
          cols: record.board.cols,
          playableCellCount: record.board.playable_cells,
          mask: record.board.playable_mask,
          maskStatus: record.board.confidence ?? "high",
          components: null,
        },
        openingCount,
        openingHistogram,
        sourceFullCount: record.blocks.full_count,
        sourceFullHistogram: fullHistogram,
        colorCount: { opening: record.color_count, full: record.color_count },
        mechanisms: normalizeMechanisms01to30(record),
        stageSeeds: [
          { id: "opening", kind: "opening", count: openingCount, shape_histogram: openingHistogram, provenance: "video_fact" },
          ...(record.blocks.hidden_behind_cover?.batches ?? []).map((batch, index) => ({
            id: `cover-${index + 1}`,
            kind: "countdown_cover",
            trigger_value: batch.cover_value,
            count: batch.count,
            shape_histogram: orderedHistogram(batch.histogram),
            provenance: "video_fact",
          })),
        ],
        unclearFields: record.unclear_fields ?? [],
        notes: record.notes ?? [],
        rawEvidence: record,
      });
    }
    const openingHistogram = orderedHistogram(record.blocks.opening_shape_histogram);
    const sourceHistogram = orderedHistogram(record.blocks.full_shape_histogram);
    const designFill = sourceHistogram ? null : fillFullHistogram({
      opening: openingHistogram,
      fullCount: record.blocks.full_piece_count,
      preferred: v4ByLevel.get(record.level).our_design_target.full_level_shape_histogram,
      neighbors: completeNeighborHistograms(record.level),
      label: levelId(record.level),
    });
    const normalizedMechanisms = normalizeMechanisms71to100(record);
    const effective = sourceHistogram ?? designFill;
    return makeTruthRecord({
      level: record.level,
      source: record.evidence?.source ?? "C:/Users/Administrator/Desktop/block out/参考视频/31-40.mp4",
      classification: sourceHistogram ? "local_video_fact" : "local_video_plus_design_fill",
      confidence: record.confidence ?? record.opening_confidence ?? "high",
      timeSeconds: record.time_limit_seconds ?? record.timeSeconds,
      board: {
        rows: record.board.rows,
        cols: record.board.cols,
        playableCellCount: record.board.playable_cells,
        mask: maskFromUnknown(record.board.mask ?? record.board.playable_mask, record.board.rows, record.board.cols),
        maskStatus: "video_reviewed",
        components: record.board.components ?? null,
      },
      openingCount: record.blocks.opening_piece_count,
      openingHistogram,
      sourceFullCount: record.blocks.full_piece_count,
      sourceFullHistogram: sourceHistogram,
      designFillFullCount: sourceHistogram ? null : record.blocks.full_piece_count,
      designFillFullHistogram: designFill,
      colorCount: { opening: record.blocks.opening_color_count, full: record.blocks.full_color_count },
      mechanisms: normalizedMechanisms,
      stageSeeds: stages71to100(record, openingHistogram, effective),
      unclearFields: record.unclear ?? [],
      designFillFields: sourceHistogram ? [] : ["composition.design_fill_full_shape_histogram", "stage_seeds"],
      notes: record.notes ?? [],
      rawEvidence: record,
    });
  });
};

const truth31to40 = load31to40();
const sourceReaudit = existsSync(EVIDENCE_PATHS.capacity_chain_reaudit)
  ? readJson(EVIDENCE_PATHS.capacity_chain_reaudit)
  : { levels: [] };
const sourceReauditByLevel = new Map((sourceReaudit.levels ?? []).map((entry) => [entry.level, entry]));

const applySourceReauditCorrection = (sourceLevel) => {
  const correction = sourceReauditByLevel.get(sourceLevel.level);
  if (!correction) return sourceLevel;
  const level = deepClone(sourceLevel);
  if (correction.board) Object.assign(level.board, deepClone(correction.board));
  const composition = correction.composition ?? {};
  if (composition.opening_shape_histogram) {
    level.composition.opening_shape_histogram = orderedHistogram(composition.opening_shape_histogram);
    level.composition.opening_piece_count = composition.opening_piece_count
      ?? histogramTotal(level.composition.opening_shape_histogram);
  } else if (isPositiveInt(composition.opening_piece_count)) {
    level.composition.opening_piece_count = composition.opening_piece_count;
  }
  if (composition.full_shape_histogram) {
    const full = orderedHistogram(composition.full_shape_histogram);
    const fullCount = composition.full_piece_count ?? histogramTotal(full);
    level.composition.source_full_piece_count = fullCount;
    level.composition.source_full_shape_histogram = full;
    level.composition.design_fill_full_piece_count = null;
    level.composition.design_fill_full_shape_histogram = null;
    level.composition.effective_design_piece_count = fullCount;
    level.composition.effective_design_shape_histogram = full;
    level.composition.source_occupied_cell_count = histogramCells(full);
    level.composition.effective_design_occupied_cell_count = histogramCells(full);
    level.composition.source_sq3_count = full.SQ3 ?? 0;
  } else if (isPositiveInt(composition.full_piece_count)) {
    level.composition.source_full_piece_count = composition.full_piece_count;
    level.composition.effective_design_piece_count = composition.full_piece_count;
  }
  for (const key of correction.remove_mechanisms ?? []) delete level.mechanisms[key];
  for (const [key, mechanism] of Object.entries(correction.mechanisms ?? {})) {
    if (mechanism === null) delete level.mechanisms[key];
    else level.mechanisms[key] = deepClone(mechanism);
  }
  if (Array.isArray(correction.stage_seeds)) level.stage_seeds = deepClone(correction.stage_seeds);
  if (correction.provenance) Object.assign(level.provenance, deepClone(correction.provenance));
  level.notes = [...(level.notes ?? []), ...(correction.notes ?? [])];
  level.reaudit_evidence = {
    artifact: rel(EVIDENCE_PATHS.capacity_chain_reaudit),
    correction_id: correction.correction_id,
    evidence: deepClone(correction.evidence ?? []),
  };

  const opening = level.composition.opening_shape_histogram;
  const full = level.composition.effective_design_shape_histogram;
  if (histogramTotal(opening) !== level.composition.opening_piece_count) {
    throw new Error(`${level.level_id}: re-audited opening count/histogram mismatch`);
  }
  if (histogramTotal(full) !== level.composition.effective_design_piece_count) {
    throw new Error(`${level.level_id}: re-audited full count/histogram mismatch`);
  }
  const stageCount = level.stage_seeds.reduce((sum, stage) => sum + Number(stage.count), 0);
  if (stageCount !== level.composition.effective_design_piece_count) {
    throw new Error(`${level.level_id}: re-audited stage count ${stageCount} does not close full count`);
  }
  const stageHistogram = addHistograms(...level.stage_seeds.map((stage) => stage.shape_histogram));
  if (JSON.stringify(stageHistogram) !== JSON.stringify(orderedHistogram(full))) {
    throw new Error(`${level.level_id}: re-audited stage histograms do not close full histogram`);
  }
  return level;
};

const truthLevels = [...truth01to30, ...truth31to40, ...truth41to70, ...truth71to100]
  .sort((a, b) => a.level - b.level)
  .map(applySourceReauditCorrection);

const firstLevelWhere = (predicate) => truthLevels.find(predicate)?.level ?? null;
const mechanismFirstAppearance = {
  directional_exit: firstLevelWhere((level) => (
    level.mechanisms.directional_exits.ordinary_count > 0
    || level.mechanisms.directional_exits.frozen_values.length > 0
  )),
  irregular_block: firstLevelWhere((level) => level.mechanisms.irregular_blocks?.count > 0),
  frozen_exit: firstLevelWhere((level) => level.mechanisms.directional_exits.frozen_values.length > 0),
  irregular_board: firstLevelWhere((level) => (
    level.board.playable_cell_count < level.board.rows * level.board.cols
  )),
  numeric_ice: firstLevelWhere((level) => level.mechanisms.numeric_ice?.count > 0),
  nested_shell: firstLevelWhere((level) => level.mechanisms.shells?.count > 0),
  countdown_cover: firstLevelWhere((level) => level.mechanisms.covers?.count > 0),
  move_generator: firstLevelWhere((level) => level.mechanisms.generators?.trigger === "move"),
  axis_constrained_block: firstLevelWhere((level) => level.mechanisms.axis_blocks?.count > 0),
  key_token: firstLevelWhere((level) => level.mechanisms.key_locks?.key_count > 0),
  chain_lock: firstLevelWhere((level) => level.mechanisms.key_locks?.lock_count > 0),
  lift: firstLevelWhere((level) => level.mechanisms.lifts?.count > 0),
  timed_feeder: firstLevelWhere((level) => level.mechanisms.generators?.trigger === "time"),
  staged_frame: firstLevelWhere((level) => level.mechanisms.staged_frames?.count > 0),
  star_block: firstLevelWhere((level) => level.mechanisms.stars?.count > 0),
  star_exit: firstLevelWhere((level) => level.mechanisms.directional_exits.star_count > 0),
};

const allocateStageHistograms = (truthLevel) => {
  const fullHistogram = truthLevel.composition.effective_design_shape_histogram;
  const stages = deepClone(truthLevel.stage_seeds);
  const known = stages.filter((stage) => orderedHistogram(stage.shape_histogram));
  let remainder = fullHistogram;
  for (const stage of known) remainder = subtractHistograms(remainder, stage.shape_histogram, `${truthLevel.level_id}/${stage.id}`);
  for (const stage of stages.filter((candidate) => !orderedHistogram(candidate.shape_histogram))) {
    if (stage.count > histogramTotal(remainder)) {
      throw new Error(`${truthLevel.level_id}/${stage.id}: stage count exceeds remaining histogram`);
    }
    const allocated = allocateByWeights(stage.count, remainder);
    stage.shape_histogram = allocated;
    stage.provenance = stage.provenance.includes("design_fill")
      ? stage.provenance
      : "shape_design_fill_not_video_fact";
    remainder = subtractHistograms(remainder, allocated, `${truthLevel.level_id}/${stage.id}`);
  }
  if (histogramTotal(remainder) !== 0) {
    throw new Error(`${truthLevel.level_id}: ${histogramTotal(remainder)} pieces remain outside stage partitions`);
  }
  return stages.map((stage) => ({
    ...stage,
    shape_histogram: runtimeHistogram(stage.shape_histogram),
  }));
};

// Proof-bearing masks must live in the reproducible builder.  Otherwise a
// later truth refresh would silently replace them with generic outlines and
// invalidate their independently checked reposition certificates.
const CERTIFIED_FLOOR_BOARD_OVERRIDES = new Map([
  [24, {
    playable_mask: ["#####", "....#", "#####", "#....", "#####", "#####", "#####", "#####", "#####"],
    connected_component_count: 1,
    originality_status: "generated_v6_s_handle_mechanism_room",
    competitor_mask_comparison: "different",
  }],
  [25, {
    playable_mask: ["######", "######", ".....#", "######", "######", "######", "###..#", "#.....", "######"],
    connected_component_count: 1,
    originality_status: "generated_v6_dual_handle_room_outline",
    competitor_mask_comparison: "different",
  }],
  [26, {
    playable_mask: ["#######", "......#", "#######", "#......", "#......", "#######", "#######", "#######", "#######", "#######", "#......"],
    connected_component_count: 1,
    originality_status: "generated_v6_pair_handle_room_outline",
    competitor_mask_comparison: "different",
  }],
  [27, {
    playable_mask: ["######", "######", "######", "######", "...###", ".....#", ".....#", "..####", "###..."],
    connected_component_count: 1,
    originality_status: "generated_v6_stacked_h3_handle_outline",
    competitor_mask_comparison: "different",
  }],
  [30, {
    playable_mask: ["########", "#..#...#", "#..#...#", "#..##..#", "#..##...", "...##...", "...#..#.", ".######.", ".###.##."],
    connected_component_count: 1,
    originality_status: "generated_v6_dual_handle_with_v3_exchange_shaft",
    competitor_mask_comparison: "different",
  }],
  [33, {
    playable_mask: ["#######", ".#..#.#", "#..#..#", "#######", "#.#.#.#", "#..#...", "#####.#", "#.#.###", "....#.#"],
    connected_component_count: 1,
    originality_status: "generated_v6_tree_parking_outline",
    competitor_mask_comparison: "different",
  }],
  [42, {
    playable_mask: ["#####", "....#", "#####", "#....", "#####", "....#", "#####", "#....", "#####"],
    connected_component_count: 1,
    originality_status: "generated_v6_pair_corridor_outline",
    competitor_mask_comparison: "different",
  }],
  [47, {
    playable_mask: ["#.....", "#..###", "#.####", "#.####", "#.####", "#.####", "#....#", "######"],
    connected_component_count: 1,
    originality_status: "generated_v6_sealed_single_spine_with_generator_gallery",
    competitor_mask_comparison: "source_mask_unclear",
  }],
  [85, {
    playable_mask: ["###.##", "###.##", "###.##", "###.##", "###.##", "###.##", "######", "######", "######"],
    connected_component_count: 1,
    originality_status: "generated_v6_sealed_mixed_spine_outline",
    competitor_mask_comparison: "different",
  }],
  [92, {
    playable_mask: ["#.#..##", "#.##.##", "#.##.##", "#.##.##", "#.##.##", "#.##.##", "####.##", "#######", "#######", "#######", "#######", "#######"],
    connected_component_count: 1,
    originality_status: "generated_v6_dual_handle_spines_with_cover_gallery",
    competitor_mask_comparison: "different",
  }],
  [95, {
    playable_mask: ["#.......", "#.......", "#.####..", "#.######", "#.######", "#.######", "#.######", "#.######", "#.######", "#.######", "########"],
    connected_component_count: 1,
    originality_status: "generated_v6_single_handle_spine_with_lower_gallery",
    competitor_mask_comparison: "different",
  }],
]);

const buildTargetMask = (truthLevel) => {
  const { rows, cols, playable_cell_count: playableCount } = truthLevel.board;
  if (!isPositiveInt(rows) || !isPositiveInt(cols) || !isPositiveInt(playableCount) || playableCount > rows * cols) {
    throw new Error(`${truthLevel.level_id}: invalid board geometry`);
  }
  const certifiedOverride = CERTIFIED_FLOOR_BOARD_OVERRIDES.get(truthLevel.level);
  if (certifiedOverride) return deepClone(certifiedOverride);
  // Lv73 uses a sealed, connected Klotski-style outline.  The exact source
  // composition and 12x7/50-cell scalar contract are unchanged; this original
  // outline is required by the independently replayed completion witness and
  // the exhaustive 14-reposition physical-cover-prefix proof.
  if (truthLevel.level === 73) return {
    playable_mask: [
      "#####..",
      "#####..",
      "#####..",
      "#####..",
      "#####..",
      "#######",
      "......#",
      "......#",
      "......#",
      "..#####",
      "#######",
      "....###",
    ],
    connected_component_count: 1,
    originality_status: "video_parity_exact_floor_proof_original_outline",
    competitor_mask_comparison: "different",
  };
  // Lv75 needs a distinct connected staging frame that can hold its complete
  // front/hidden partition while preserving the exact 11x7/56-cell contract.
  // It also admits the certified pair of disjoint reposition cores.
  if (truthLevel.level === 75) return {
    playable_mask: [
      "#......",
      "#...#..",
      "#.###..",
      "#.#####",
      "#.#####",
      "#.#####",
      "#######",
      "#######",
      "#######",
      "#.##...",
      "#######",
    ],
    connected_component_count: 1,
    originality_status: "video_parity_exact_staged_frame_original_outline",
    competitor_mask_comparison: "different",
  };
  // Lv77 is 51/52 occupied cells.  The generic connected mask is scalar-valid
  // but cannot fit its exact V2/V3/SQ2 composition.  This alternate original
  // outline preserves the required 9x7 envelope and 52 playable cells while
  // admitting an exact packing; it is part of the reproducible contract rather
  // than a generator-only escape hatch.
  if (truthLevel.level === 77) return {
    playable_mask: ["##.....", "####...", "####...", ...Array.from({ length: 6 }, () => "#######")],
    connected_component_count: 1,
    originality_status: "video_parity_exact_packing_original_outline",
    competitor_mask_comparison: "different",
  };
  const sourceMask = maskFromUnknown(truthLevel.board.source_playable_mask, rows, cols);
  const sourceExact = exactSourceMask(sourceMask, rows, cols) && maskCount(sourceMask) === playableCount;
  const exits = truthLevel.mechanisms.directional_exits;
  const gateCount = Number(exits.ordinary_count ?? 0)
    + Number(exits.frozen_values?.length ?? 0)
    + Number(exits.star_count ?? 0);
  const maximumBoundary = rows * cols === 1 ? 1 : 2 * rows + 2 * cols - 4;
  // Every exit needs a distinct boundary cell. Reserve one additional slot per
  // gameplay color so the primary exits can accept non-single silhouettes.
  // Otherwise a scalar-correct original outline can make exact source gate
  // multiplicity impossible (notably Lv73 and Lv79).
  const minimumGateBoundary = Math.min(
    maximumBoundary,
    playableCount,
    gateCount + Math.min(truthLevel.composition.full_color_count, gateCount),
  );
  const admitsGateBoundary = (mask) => boundaryCellCount(mask) >= minimumGateBoundary;
  if (playableCount === rows * cols) return {
    playable_mask: Array.from({ length: rows }, () => "#".repeat(cols)),
    connected_component_count: 1,
    originality_status: "full_rectangle_shape_locked_no_outline_variation_possible",
    competitor_mask_comparison: sourceExact ? "same_by_mathematical_necessity" : "source_mask_unclear",
  };
  const prior = v4ByLevel.get(truthLevel.level)?.our_design_target?.board;
  const priorMask = prior?.playable_mask;
  if (prior?.rows === rows && prior?.cols === cols && prior?.playable_cell_count === playableCount &&
      exactSourceMask(priorMask, rows, cols) && maskCount(priorMask) === playableCount &&
      isConnectedMask(priorMask) && spansEnvelope(priorMask) && admitsGateBoundary(priorMask) &&
      (!sourceExact || maskKey(priorMask) !== maskKey(sourceMask))) {
    return {
      playable_mask: priorMask,
      connected_component_count: 1,
      originality_status: "reused_v4_connected_original_outline",
      competitor_mask_comparison: sourceExact ? "different" : "source_mask_unclear",
    };
  }
  for (let variant = 0; variant < 512; variant += 1) {
    const mask = generateMaskCandidate(rows, cols, playableCount, truthLevel.level * 1009 + variant * 9176 + 37);
    if (admitsGateBoundary(mask) && (!sourceExact || maskKey(mask) !== maskKey(sourceMask))) return {
      playable_mask: mask,
      connected_component_count: 1,
      originality_status: "deterministic_connected_original_outline_generated",
      competitor_mask_comparison: sourceExact ? "different" : "source_mask_unclear",
    };
  }
  for (let variant = 0; variant < 512; variant += 1) {
    const mask = generateBoundaryRichMask(
      rows,
      cols,
      playableCount,
      truthLevel.level * 2029 + variant * 7919 + 73,
    );
    if (mask && admitsGateBoundary(mask) && (!sourceExact || maskKey(mask) !== maskKey(sourceMask))) return {
      playable_mask: mask,
      connected_component_count: 1,
      originality_status: "deterministic_gate_capacity_original_outline_generated",
      competitor_mask_comparison: sourceExact ? "different" : "source_mask_unclear",
    };
  }
  throw new Error(`${truthLevel.level_id}: failed to produce a distinct target mask`);
};

const designPalette = (truthLevel) => {
  const count = truthLevel.composition.full_color_count;
  if (!isPositiveInt(count) || count > COLORS.length) throw new Error(`${truthLevel.level_id}: invalid color count ${count}`);
  const prior = v4ByLevel.get(truthLevel.level)?.our_design_target;
  if (prior?.full_level_color_count === count && Array.isArray(prior.design_palette) &&
      prior.design_palette.length === count && new Set(prior.design_palette).size === count &&
      prior.design_palette.every((color) => COLORS.includes(color))) {
    return prior.design_palette;
  }
  const offset = (truthLevel.level * 3 + Math.floor(truthLevel.level / 10)) % COLORS.length;
  return Array.from({ length: count }, (_, index) => COLORS[(offset + index) % COLORS.length]);
};

const mechanismContractForTarget = (truthLevel, stagePartitions) => {
  const target = deepClone(truthLevel.mechanisms);
  if (target.numeric_ice?.shape_histogram) {
    target.numeric_ice.shape_histogram = runtimeHistogram(target.numeric_ice.shape_histogram);
  }
  if (target.numeric_ice?.items) {
    target.numeric_ice.items = target.numeric_ice.items.map((item) => ({
      ...item,
      ...(item.shape === "SQ3" ? { source_shape: "SQ3" } : {}),
      shape: item.shape === "SQ3" ? "RECT2X3" : item.shape,
    }));
  }
  if (target.shells?.shape_histogram) {
    target.shells.shape_histogram = runtimeHistogram(target.shells.shape_histogram);
  }
  if (target.shells?.items) {
    target.shells.items = target.shells.items.map((item) => ({
      ...item,
      ...(item.shape === "SQ3" ? { source_shape: "SQ3" } : {}),
      shape: item.shape === "SQ3" ? "RECT2X3" : item.shape,
    }));
  }
  if (target.covers) {
    const stages = stagePartitions.filter((stage) => stage.kind === "countdown_cover");
    target.covers.hidden_batch_counts = stages.map((stage) => stage.count);
    target.covers.hidden_batch_histograms = stages.map((stage) => stage.shape_histogram);
  }
  if (target.generators) {
    const kind = target.generators.trigger === "time" ? "timed_feeder" : "side_generator";
    const stages = stagePartitions.filter((stage) => stage.kind === kind);
    target.generators.queue_lengths = stages.map((stage) => stage.count);
    target.generators.queue_histograms = stages.map((stage) => stage.shape_histogram);
    if (target.generators.queue_shape_sequences) {
      target.generators.queue_shape_sequences = target.generators.queue_shape_sequences.map((sequence) => (
        sequence.map((shape) => shape === "SQ3" ? "RECT2X3" : shape)
      ));
    }
  }
  if (target.lifts) {
    target.lifts.layers = target.lifts.layers.map((layer) => ({
      ...layer,
      histogram: runtimeHistogram(layer.histogram),
    }));
  }
  if (target.staged_frames) {
    const hidden = stagePartitions.filter((stage) => stage.kind === "staged_frame");
    target.staged_frames.layers = [
      { layer: 1, count: null, histogram: "opening_subset" },
      ...hidden.map((stage, index) => ({ layer: index + 2, count: stage.count, histogram: stage.shape_histogram })),
    ];
  }
  if (target.axis_blocks?.shape_histogram) {
    target.axis_blocks.shape_histogram = runtimeHistogram(target.axis_blocks.shape_histogram);
  }
  if (target.axis_blocks?.by_axis_shape) {
    target.axis_blocks.by_axis_shape = Object.fromEntries(
      Object.entries(target.axis_blocks.by_axis_shape).map(([axis, histogram]) => [
        axis,
        runtimeHistogram(histogram),
      ]),
    );
  }
  if (target.axis_blocks?.items) {
    target.axis_blocks.items = target.axis_blocks.items.map((item) => ({
      ...item,
      ...(item.shape === "SQ3" ? { source_shape: "SQ3" } : {}),
      shape: item.shape === "SQ3" ? "RECT2X3" : item.shape,
    }));
  }
  if (target.key_locks?.key_shapes) target.key_locks.key_shapes = runtimeHistogram(target.key_locks.key_shapes);
  if (target.key_locks?.lock_shapes) target.key_locks.lock_shapes = runtimeHistogram(target.key_locks.lock_shapes);
  if (target.stars?.shape_histogram) target.stars.shape_histogram = runtimeHistogram(target.stars.shape_histogram);
  return target;
};

const contractLevels = truthLevels.map((truthLevel) => {
  const runtimeFullHistogram = runtimeHistogram(truthLevel.composition.effective_design_shape_histogram);
  const stagePartitions = allocateStageHistograms(truthLevel);
  const score = targetD1(truthLevel.level);
  const band = d1Band(score, truthLevel.level);
  return {
    level_id: truthLevel.level_id,
    status: "video_parity_contract_pending_generation_and_solver",
    truth_reference: {
      artifact: rel(TRUTH_PATH),
      level_id: truthLevel.level_id,
      source_classification: truthLevel.provenance.classification,
      unresolved_video_fields: truthLevel.provenance.unclear_fields,
      design_fill_fields: truthLevel.provenance.design_fill_fields,
    },
    competitor_reference: {
      board: deepClone(truthLevel.board),
      time_seconds: truthLevel.time_seconds,
      opening_piece_count: truthLevel.composition.opening_piece_count,
      opening_shape_histogram: truthLevel.composition.opening_shape_histogram,
      opening_color_count: truthLevel.composition.opening_color_count,
      source_full_piece_count: truthLevel.composition.source_full_piece_count,
      source_full_shape_histogram: truthLevel.composition.source_full_shape_histogram,
      full_color_count: truthLevel.composition.full_color_count,
      mechanisms: truthLevel.mechanisms,
    },
    our_design_target: {
      board: {
        rows: truthLevel.board.rows,
        cols: truthLevel.board.cols,
        playable_cell_count: truthLevel.board.playable_cell_count,
        ...buildTargetMask(truthLevel),
      },
      time_seconds: truthLevel.time_seconds,
      full_level_block_count: truthLevel.composition.effective_design_piece_count,
      full_level_shape_histogram: runtimeFullHistogram,
      full_level_occupied_cell_count: histogramCells(runtimeFullHistogram),
      source_shape_replacements: runtimeReplacement(truthLevel.composition.effective_design_shape_histogram),
      opening_color_count: truthLevel.composition.opening_color_count,
      full_level_color_count: truthLevel.composition.full_color_count,
      design_palette: designPalette(truthLevel),
      requires_staged_reveal: stagePartitions.length > 1,
      stage_partitions: stagePartitions,
      mechanism_contract: mechanismContractForTarget(truthLevel, stagePartitions),
      target_d1_difficulty: {
        formula_version: "blockout-d1-campaign-wave",
        score_kind: "calibrated_design_target_not_measured",
        calibrated_score: score,
        band: band.id,
        band_label: band.label,
        curve_role: truthLevel.level <= 5 ? "tutorial_ramp" : truthLevel.level % 5 === 0 ? "five_level_peak" : "wave_ramp",
      },
      campaign_reposition_floor: REPOSITION_FLOORS[truthLevel.level - 1],
      recommended_minimum_reposition_overhead: REPOSITION_FLOORS[truthLevel.level - 1],
      solver_acceptance: {
        status: "pending_solver",
        exact_board_scalars_required: true,
        exact_runtime_shape_histogram_required: true,
        exact_stage_partition_counts_required: true,
        exact_mechanism_contract_required: true,
        exact_time_seconds_required: true,
        necessary_reposition_lower_bound: REPOSITION_FLOORS[truthLevel.level - 1],
        target_d1_calibrated_score: score,
      },
    },
  };
});

const runtimeSq3Paths = (value, path = "") => {
  if (Array.isArray(value)) return value.flatMap((entry, index) => runtimeSq3Paths(entry, `${path}[${index}]`));
  if (!asObject(value)) return value === "SQ3" && !path.endsWith("source_shape") ? [path] : [];
  return Object.entries(value).flatMap(([key, entry]) => [
    ...(key === "SQ3" ? [`${path}.${key}`] : []),
    ...runtimeSq3Paths(entry, path ? `${path}.${key}` : key),
  ]);
};

const validate = () => {
  if (truthLevels.length !== 100 || new Set(truthLevels.map((level) => level.level)).size !== 100) {
    throw new Error("Truth must contain 100 unique levels");
  }
  for (const [mechanism, firstLevel] of Object.entries(mechanismFirstAppearance)) {
    if (!isPositiveInt(firstLevel)) throw new Error(`Missing first appearance for ${mechanism}`);
  }
  truthLevels.forEach((level, index) => {
    if (level.level !== index + 1) throw new Error(`Missing or reordered level at index ${index}`);
  });
  for (const [index, contractLevel] of contractLevels.entries()) {
    const level = index + 1;
    const target = contractLevel.our_design_target;
    const stageCount = target.stage_partitions.reduce((sum, stage) => sum + stage.count, 0);
    const stageHistogram = addHistograms(...target.stage_partitions.map((stage) => stage.shape_histogram));
    if (stageCount !== target.full_level_block_count) throw new Error(`${levelId(level)} stage count mismatch`);
    if (JSON.stringify(stageHistogram) !== JSON.stringify(target.full_level_shape_histogram)) {
      throw new Error(`${levelId(level)} stage histogram mismatch`);
    }
    if (histogramTotal(target.full_level_shape_histogram) !== target.full_level_block_count) {
      throw new Error(`${levelId(level)} contract full histogram mismatch`);
    }
    if (!isPositiveInt(target.time_seconds) ||
        target.time_seconds !== contractLevel.competitor_reference.time_seconds) {
      throw new Error(`${levelId(level)} invalid or mismatched timer`);
    }
    if (target.full_level_shape_histogram.SQ3) throw new Error(`${levelId(level)} runtime contract contains SQ3`);
    const nestedSq3 = runtimeSq3Paths({
      stage_partitions: target.stage_partitions,
      mechanism_contract: target.mechanism_contract,
    });
    if (nestedSq3.length) throw new Error(`${levelId(level)} runtime contract contains nested SQ3 at ${nestedSq3.join(", ")}`);
    if (target.board.playable_mask.length !== target.board.rows ||
        target.board.playable_mask.some((row) => row.length !== target.board.cols) ||
        maskCount(target.board.playable_mask) !== target.board.playable_cell_count ||
        !isConnectedMask(target.board.playable_mask) || !spansEnvelope(target.board.playable_mask)) {
      throw new Error(`${levelId(level)} invalid target mask`);
    }
    if (target.design_palette.length !== target.full_level_color_count ||
        new Set(target.design_palette).size !== target.full_level_color_count ||
        target.design_palette.some((color) => !COLORS.includes(color))) {
      throw new Error(`${levelId(level)} invalid palette`);
    }
    const fullColorCarrierSlots = target.full_level_block_count
      + (target.mechanism_contract.shells?.extra_layers ?? [])
        .reduce((sum, layerCount) => sum + Number(layerCount), 0);
    if (!isPositiveInt(target.full_level_color_count) ||
        target.full_level_color_count > fullColorCarrierSlots ||
        target.full_level_color_count !== contractLevel.competitor_reference.full_color_count) {
      throw new Error(`${levelId(level)} invalid full-level color count`);
    }
    const shellContract = target.mechanism_contract.shells;
    const openingShellExtraSlots = Array.isArray(shellContract?.items)
      ? shellContract.items
        .filter((item) => item.stage_id === "opening")
        .reduce((sum, item) => sum + Number(item.extra_layers ?? 1), 0)
      : (shellContract?.extra_layers ?? [])
        .slice(0, shellContract?.opening_visible_count ?? 0)
        .reduce((sum, layerCount) => sum + Number(layerCount), 0);
    if (!isPositiveInt(target.opening_color_count) ||
        target.opening_color_count > target.stage_partitions[0].count + openingShellExtraSlots ||
        target.opening_color_count > target.full_level_color_count ||
        target.opening_color_count !== contractLevel.competitor_reference.opening_color_count) {
      throw new Error(`${levelId(level)} invalid opening color count`);
    }
    if (target.campaign_reposition_floor !== REPOSITION_FLOORS[index]) throw new Error(`${levelId(level)} reposition mismatch`);
    if (target.target_d1_difficulty.calibrated_score !== targetD1(level)) throw new Error(`${levelId(level)} D1 mismatch`);
  }
};

validate();

const truth = {
  schema_version: "blockout-video-parity-truth-v6",
  title: "Block Out! Lv1-100 competitor video parity truth v6",
  generated_on: "2026-09-14",
  rules: {
    evidence_only: "Source facts stay separate from explicit design fills; unclear source fields are never relabeled as facts.",
    video_sampling: "Local videos were scanned at one frame per second, with higher-rate review around untouched openings, reveals, and mechanic triggers.",
    complete_range: "Lv1-Lv100 are backed by the ten local chapter videos; Lv21-Lv30 use the newly supplied direct video and no longer depend on historical 2fps recovery or design fill.",
    staged_partition_evidence: "Every formerly inferred stage was re-audited: the base audit proved 14 exact stages and left 31 per-cover partitions unclear; the dedicated Lv91 continuous review then resolved two more exact stages, leaving 29 unclear per-cover partitions. Runtime-only partitions stay labelled as design choices.",
    sq3: "Source SQ3 is preserved in truth. Runtime contracts replace every SQ3 piece one-for-one with RECT2X3.",
    ice_frame_correction: "Lv14 selection-following frame is UI feedback and is excluded from mechanics.",
  },
  sources: Object.entries(EVIDENCE_PATHS).filter(([, path]) => existsSync(path)).map(([scope, path]) =>
    sourceDescriptor(path, scope, scope === "lv001_030"
      ? "Lv1-Lv20 1fps local plus source-fps trigger review"
      : scope === "lv021_030_direct"
        ? "Lv21-Lv30 1fps untouched openings plus 10fps/source-fps reveal ledgers"
        : scope === "stage_partition_audit"
          ? "45-stage source-fps ownership audit: 14 exact stages and 31 explicitly unclear per-cover partitions"
        : "1fps plus high-rate trigger review"),
  ),
  source_videos: SOURCE_VIDEO_NAMES.map((name, index) => {
    const path = join(SOURCE_VIDEO_DIR, name);
    if (!existsSync(path)) throw new Error(`Missing source video ${path}`);
    return {
      path: path.replaceAll("\\", "/"),
      scope: `Lv${index * 10 + 1}-Lv${index * 10 + 10}`,
      bytes: statSync(path).size,
      sha256: sha256(path),
    };
  }),
  summary: {
    level_count: truthLevels.length,
    source_fact_full_histogram_count: truthLevels.filter((level) => level.composition.source_full_shape_histogram !== "unclear").length,
    design_fill_full_histogram_count: truthLevels.filter((level) => level.composition.design_fill_full_shape_histogram).length,
    stage_design_fill_level_count: truthLevels.filter((level) => (
      level.provenance.design_fill_fields.some((field) => field.startsWith("stage_seeds."))
    )).length,
    stage_design_fill_stage_count: truthLevels.reduce((sum, level) => sum +
      level.provenance.design_fill_fields.filter((field) => field.startsWith("stage_seeds.")).length, 0),
    levels_with_unclear_source_fields: truthLevels.filter((level) => level.provenance.unclear_fields.length).length,
    source_sq3_level_count: truthLevels.filter((level) => level.composition.source_sq3_count > 0).length,
    source_sq3_piece_count: truthLevels.reduce((sum, level) => sum + level.composition.source_sq3_count, 0),
  },
  competitor_mechanism_first_appearance: mechanismFirstAppearance,
  levels: truthLevels,
};

const truthSerialized = `${JSON.stringify(truth, null, 2)}\n`;
const truthSha256 = createHash("sha256").update(truthSerialized).digest("hex").toUpperCase();

const contract = {
  schema_version: "blockout-video-parity-design-contract-v6",
  title: "Block Out! Lv1-100 competitor-video composition parity + original board contract v6",
  generated_on: "2026-09-14",
  status: "design_contract_pending_generation_and_solver",
  truth_artifact: rel(TRUTH_PATH),
  truth_sha256: truthSha256,
  contract_rules: {
    scalar_parity: "Rows, columns, playable-cell count, timer, full block count, color count, mechanic counts/values/layers/queues match the normalized video truth or its explicitly labeled design fill.",
    shape_parity: "Runtime shape histogram matches source one-for-one, except source SQ3 becomes RECT2X3 because 3x3 blocks are prohibited.",
    board_originality: "Reuse a valid v4 original connected mask when scalar geometry is unchanged; otherwise deterministically create a connected, envelope-spanning mask different from the exact source mask when mathematically possible.",
    staged_composition: "Opening and every cover/generator/Lift/frame batch are explicit stage_partitions whose histograms sum exactly to the full runtime histogram.",
    difficulty: "D1 and campaignRepositionFloor are generation/solver acceptance targets, not claims that a candidate already satisfies them.",
  },
  summary: {
    level_count: contractLevels.length,
    runtime_sq3_count: contractLevels.reduce((sum, level) => sum + (level.our_design_target.full_level_shape_histogram.SQ3 ?? 0), 0),
    runtime_rect2x3_replacement_piece_count: contractLevels.reduce((sum, level) => sum +
      level.our_design_target.source_shape_replacements.reduce((part, replacement) => part + replacement.count, 0), 0),
    full_rectangle_outline_conflict_count: contractLevels.filter((level) =>
      level.our_design_target.board.originality_status.includes("full_rectangle"),
    ).length,
    staged_level_count: contractLevels.filter((level) => level.our_design_target.requires_staged_reveal).length,
    solver_validated_level_count: 0,
  },
  competitor_mechanism_first_appearance: mechanismFirstAppearance,
  design_target_mechanism_first_appearance: mechanismFirstAppearance,
  levels: contractLevels,
};

const histText = (histogram) => Object.entries(histogram ?? {}).map(([shape, count]) => `${shape}×${count}`).join("、") || "—";
const mechanicText = (mechanisms) => Object.entries(mechanisms).map(([type, value]) => {
  const count = value.count ?? value.ordinary_count ?? value.total_queue_count ?? 1;
  const values = value.initial_values?.length ? `(${value.initial_values.join("/")})` : "";
  return `${type}×${count}${values}`;
}).join("；") || "—";
const firstAppearanceText = Object.entries(mechanismFirstAppearance)
  .map(([mechanism, level]) => `- ${mechanism}: Lv${level}`)
  .join("\n");
const truthMarkdown = `# Block Out! Lv1–100 视频同构 truth v6\n\n` +
  `- 关卡：${truth.summary.level_count}\n` +
  `- 完整形状为视频事实：${truth.summary.source_fact_full_histogram_count}\n` +
  `- 完整形状含显式 design fill：${truth.summary.design_fill_full_histogram_count}\n` +
  `- 含源字段 unclear：${truth.summary.levels_with_unclear_source_fields}\n` +
  `- 竞品 SQ3：${truth.summary.source_sq3_level_count} 关 / ${truth.summary.source_sq3_piece_count} 块。v6 历史运行合同曾一对一替换为 RECT2X3；当前 v8 正式运行合同已恢复并保留全部 SQ3。\n\n` +
  `> Lv21–30 已由新增本地视频逐秒扫描，并对揭幕/融冰使用 10fps 或源帧率复核；全季不再含完整构成 design fill。truth 中的 \`unclear\` 只保留视频无法唯一证明的细分归属。\n\n` +
  `## 竞品机制首次出现\n\n${firstAppearanceText}\n\n` +
  `| 关卡 | 棋盘/格 | 时间 | 开局块 | 全流程块 | 竞品完整形状 | 设计有效形状 | 颜色 | 机制 | provenance |\n` +
  `|---|---:|---:|---:|---:|---|---|---:|---|---|\n` +
  truthLevels.map((level) => `| ${level.level_id} | ${level.board.rows}×${level.board.cols}/${level.board.playable_cell_count} | ${level.time_seconds}s | ${level.composition.opening_piece_count} | ${level.composition.effective_design_piece_count} | ${level.composition.source_full_shape_histogram === "unclear" ? "unclear" : histText(level.composition.source_full_shape_histogram)} | ${histText(level.composition.effective_design_shape_histogram)} | ${level.composition.full_color_count} | ${mechanicText(level.mechanisms)} | ${level.provenance.classification} |`).join("\n") + "\n";

mkdirSync(OUTPUT_DIR, { recursive: true });
writeFileSync(TRUTH_PATH, truthSerialized, "utf8");
writeFileSync(CONTRACT_PATH, `${JSON.stringify(contract, null, 2)}\n`, "utf8");
writeFileSync(TRUTH_MD_PATH, truthMarkdown, "utf8");

console.log(JSON.stringify({
  truth: rel(TRUTH_PATH),
  truth_sha256: sha256(TRUTH_PATH),
  truth_markdown: rel(TRUTH_MD_PATH),
  contract: rel(CONTRACT_PATH),
  contract_sha256: sha256(CONTRACT_PATH),
  summary: { truth: truth.summary, contract: contract.summary },
}, null, 2));
