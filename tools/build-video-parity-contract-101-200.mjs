import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = resolve(root, "deliverables/level-generation-blueprint");
const truthPath = resolve(outputDir, "blockout-lv101-lv200-video-parity-truth-v1.json");
const contractPath = resolve(outputDir, "blockout-lv101-lv200-video-parity-design-contract-v1.json");
const markdownPath = resolve(outputDir, "blockout-lv101-lv200-video-parity-design-contract-v1.md");

const SHAPE_ORDER = [
  "SINGLE", "H2", "V2", "H3", "V3", "H4", "V4", "SQ2", "RECT2X3", "SQ3",
  "L3", "L4", "L5", "T4", "T5", "T6", "S4", "CROSS5",
];
const SHAPE_AREA = {
  SINGLE: 1, H2: 2, V2: 2, H3: 3, V3: 3, H4: 4, V4: 4, SQ2: 4,
  RECT2X3: 6, SQ3: 9, L3: 3, L4: 4, L5: 5, T4: 4, T5: 5, T6: 6, S4: 4, CROSS5: 5,
};
const COLORS = ["red", "yellow", "blue", "green", "purple", "orange", "cyan", "pink"];
const SOURCE_COLORS = [...COLORS, "lime"];
const UNSUPPORTED_RUNTIME_MECHANISMS = {
  timed_bomb: 120,
  circular_double_arrow_marked_block: 128,
  flip_door: 150,
  colored_grid: 200,
};
const FORMAL_SOLVABILITY_REPAIRS = new Map([
  [125, {
    kind: "swap_and_deduplicate_directional_exit_colors",
    ordinary_exit_indices: [1, 3],
    expected_from: ["red", "cyan"],
    to: ["cyan", "red"],
    frozen_exit_indices: [0],
    frozen_expected_from: ["unclear"],
    frozen_to: ["blue"],
    evidence: "playtest-results/lv101-150-solver-r162/lv125-verified-repair-final.json",
  }],
]);

const stripBom = (value) => value.replace(/^\uFEFF/, "");
const readJson = async (path) => JSON.parse(stripBom(await readFile(path, "utf8")));
const sha256 = async (path) => createHash("sha256").update(await readFile(path)).digest("hex").toUpperCase();
const rel = (path) => relative(root, path).replaceAll("\\", "/");
const clone = (value) => structuredClone(value);
const isObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const positiveInt = (value) => Number.isInteger(value) && value > 0 ? value : null;
const histogramTotal = (histogram) => Object.values(histogram ?? {}).reduce((sum, value) => sum + value, 0);
const histogramArea = (histogram) => Object.entries(histogram ?? {}).reduce(
  (sum, [shape, count]) => sum + (SHAPE_AREA[shape] ?? 0) * count,
  0,
);
const mechanismPresent = (value) => Array.isArray(value)
  ? value.length > 0
  : isObject(value)
    ? (Number(value.count) > 0 || (Array.isArray(value.items) && value.items.length > 0) || Object.keys(value).length > 0)
    : false;
const maskCount = (mask) => mask?.reduce((sum, row) => sum + [...row].filter((cell) => cell === "#").length, 0) ?? 0;
const componentCount = (mask) => {
  const rows = mask?.length ?? 0;
  const cols = mask?.[0]?.length ?? 0;
  const remaining = new Set();
  for (let row = 0; row < rows; row += 1) for (let col = 0; col < cols; col += 1) {
    if (mask[row][col] === "#") remaining.add(`${row},${col}`);
  }
  let components = 0;
  while (remaining.size) {
    components += 1;
    const first = remaining.values().next().value;
    remaining.delete(first);
    const queue = [first];
    while (queue.length) {
      const [row, col] = queue.shift().split(",").map(Number);
      for (const [nextRow, nextCol] of neighbors(row, col, rows, cols)) {
        const key = `${nextRow},${nextCol}`;
        if (remaining.delete(key)) queue.push(key);
      }
    }
  }
  return components;
};
const fullMask = (rows, cols) => Array.from({ length: rows }, () => "#".repeat(cols));
const validMask = (mask, rows, cols) => Array.isArray(mask)
  && mask.length === rows
  && mask.every((row) => typeof row === "string" && row.length === cols && /^[.#]+$/.test(row));
const rotatePalette = (level, count) => Array.from({ length: Math.max(1, Math.min(COLORS.length, count)) }, (
  _, index,
) => COLORS[(level + index * 3) % COLORS.length]);
const canonical = (value) => {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
};
const sameJson = (left, right) => JSON.stringify(canonical(left)) === JSON.stringify(canonical(right));
const sourceColorsOf = (value, result = new Set()) => {
  if (Array.isArray(value)) {
    for (const item of value) sourceColorsOf(item, result);
  } else if (value && typeof value === "object") {
    for (const item of Object.values(value)) sourceColorsOf(item, result);
  } else if (typeof value === "string") {
    for (const color of SOURCE_COLORS) if (new RegExp(`(^|[^a-z])${color}([^a-z]|$)`, "i").test(value)) {
      result.add(color);
    }
  }
  return result;
};
const remapColors = (value, mapping) => {
  if (Array.isArray(value)) return value.map((item) => remapColors(item, mapping));
  if (!value || typeof value !== "object") {
    if (typeof value === "string" && mapping[value.toLowerCase()]) return mapping[value.toLowerCase()];
    return value;
  }
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, remapColors(item, mapping)]));
};
const remapStageQueueColors = (stagePlan, mapping) => {
  const result = clone(stagePlan);
  const remapQueue = (queue) => Array.isArray(queue)
    ? queue.map((item) => ({
      ...item,
      color: typeof item?.color === "string" && mapping[item.color.toLowerCase()]
        ? mapping[item.color.toLowerCase()]
        : item?.color ?? null,
    }))
    : queue;
  for (const producer of result.producers ?? []) producer.ordered_queue = remapQueue(producer.ordered_queue);
  for (const event of result.event_groups ?? []) {
    event.ordered_queue = remapQueue(event.ordered_queue);
  }
  return result;
};
const shellColorGroups = (mechanisms) => {
  const source = Array.isArray(mechanisms?.shells)
    ? mechanisms.shells
    : Array.isArray(mechanisms?.shells?.items)
      ? mechanisms.shells.items
      : [];
  return source.flatMap((item) => {
    const listed = Array.isArray(item?.colors)
      ? item.colors
      : Array.isArray(item?.layer_colors)
        ? item.layer_colors
      : Array.isArray(item?.layers) && item.layers.every((entry) => typeof entry === "string")
        ? item.layers
        : [item?.outer_color_class ?? item?.outer_color, item?.inner_color_class ?? item?.inner_color];
    const colors = [...new Set(listed.filter((color) => (
      typeof color === "string" && SOURCE_COLORS.includes(color.toLowerCase())
    )).map((color) => color.toLowerCase()))];
    return item?.colors_distinct && colors.length > 1 ? [colors] : [];
  });
};
const buildColorClassMapping = (sourceColors, mechanisms, palette, openingColorCount) => {
  const neighbors = new Map(sourceColors.map((color) => [color, new Set()]));
  for (const group of shellColorGroups(mechanisms)) for (const color of group) for (const other of group) {
    if (color !== other) neighbors.get(color)?.add(other);
  }
  const preferredPalette = palette.slice(0, Math.max(1, Math.min(palette.length, openingColorCount)));
  const openingMechanismColors = new Set(mechanismEntries(mechanisms)
    .filter(({ item }) => itemStage(item) === "opening")
    .flatMap(({ item }) => [...sourceColorsOf(item)]));
  const orderedSourceColors = [...sourceColors].sort((left, right) => (
    Number(openingMechanismColors.has(right)) - Number(openingMechanismColors.has(left))
    || SOURCE_COLORS.indexOf(left) - SOURCE_COLORS.indexOf(right)
  ));
  const mapping = {};
  const usedDesignColors = new Set();
  orderedSourceColors.forEach((color, colorIndex) => {
    const forbidden = new Set([...neighbors.get(color) ?? []].map((other) => mapping[other]).filter(Boolean));
    const baseCandidates = openingMechanismColors.has(color)
      ? [...preferredPalette, ...palette.filter((candidate) => !preferredPalette.includes(candidate))]
      : [...palette];
    const start = colorIndex % Math.max(1, baseCandidates.length);
    const candidates = Array.from(
      { length: baseCandidates.length },
      (_, offset) => baseCandidates[(start + offset) % baseCandidates.length],
    );
    mapping[color] = candidates.find((candidate) => !usedDesignColors.has(candidate) && !forbidden.has(candidate))
      ?? candidates.find((candidate) => !forbidden.has(candidate))
      ?? candidates[0];
    usedDesignColors.add(mapping[color]);
  });
  return mapping;
};

const normalizeHistogram = (histogram) => {
  if (!isObject(histogram)) return null;
  const result = {};
  for (const shape of SHAPE_ORDER) {
    const count = positiveInt(histogram[shape]);
    if (count) result[shape] = count;
  }
  return Object.keys(result).length ? result : null;
};
const canonicalShape = (rawShape) => {
  const normalized = String(rawShape ?? "").trim().toUpperCase().replaceAll("×", "X").replaceAll("-", "_");
  if (!normalized || /UNCLEAR|_OR_|\bOR\b|LIKE|IRREGULAR/.test(normalized)) return null;
  const aliases = {
    SQUARE_1X1: "SINGLE", SQUARE_2X2: "SQ2", SQUARE_3X3: "SQ3",
    HORIZONTAL_2: "H2", HORIZONTAL_3: "H3", HORIZONTAL_4: "H4",
    VERTICAL_2: "V2", VERTICAL_3: "V3", VERTICAL_4: "V4",
    RECTANGLE_2X3: "RECT2X3", RECTANGLE_3X2: "RECT2X3",
    R3X2: "RECT2X3", R3X3: "SQ3", PLUS5: "CROSS5", PLUS_5: "CROSS5",
    T6_TOP4_STEM2: "T6",
  };
  if (aliases[normalized]) return aliases[normalized];
  if (normalized.includes("SQUARE_3X3")) return "SQ3";
  if (normalized.includes("SQUARE_2X2")) return "SQ2";
  if (normalized.includes("SQUARE_1X1")) return "SINGLE";
  if (normalized.includes("RECTANGLE_2X3") || normalized.includes("RECTANGLE_3X2")) return "RECT2X3";
  if (normalized.includes("PLUS5") || normalized.includes("PLUS_5")) return "CROSS5";
  if (SHAPE_AREA[normalized]) return normalized;
  return SHAPE_ORDER.find((candidate) => new RegExp(`(^|_)${candidate}($|_)`).test(normalized)) ?? null;
};
const shapeOptions = (rawShape) => {
  const exact = canonicalShape(rawShape);
  if (exact) return [exact];
  const normalized = String(rawShape ?? "").trim().toUpperCase().replaceAll("×", "X").replaceAll("-", "_");
  if (!normalized) return [];
  if (/PLUS/.test(normalized)) return ["CROSS5"];
  if (/SQUARE.*RECT|RECT.*SQUARE/.test(normalized)) return ["SQ2", "SQ3", "RECT2X3"];
  if (/VERTICAL.*GRID|GRID.*VERTICAL/.test(normalized)) return ["V2", "V3", "V4", "SQ2", "SQ3"];
  if (/HORIZONTAL.*GRID|GRID.*HORIZONTAL/.test(normalized)) return ["H2", "H3", "H4", "SQ2", "SQ3"];
  if (/SQUARE[_ ]?LIKE/.test(normalized)) return ["SINGLE", "SQ2", "SQ3"];
  if (/SQUARE|GRID/.test(normalized)) return ["SQ2", "SQ3"];
  if (/V2_OR_V3/.test(normalized)) return ["V2", "V3"];
  if (/L3_OR_L4/.test(normalized)) return ["L3", "L4"];
  if (/T[_ ]?LIKE|T_SHAPE|\bT\b/.test(normalized)) return ["T4", "T5", "T6"];
  if (/VERTICAL/.test(normalized)) return ["V2", "V3", "V4"];
  if (/HORIZONTAL/.test(normalized)) return ["H2", "H3", "H4"];
  if (/L[_ ]?LIKE|\bL\b/.test(normalized)) return ["L3", "L4", "L5"];
  if (/IRREGULAR_?5|POLYOMINO_?5/.test(normalized)) return ["L5", "T5", "CROSS5"];
  if (/BAR/.test(normalized)) return ["H2", "V2", "H3", "V3", "H4", "V4"];
  return [];
};
const mechanismEntries = (mechanisms) => {
  const entries = [];
  const add = (kind, source) => {
    const items = Array.isArray(source) ? source : Array.isArray(source?.items) ? source.items : [];
    const count = positiveInt(source?.count) ?? items.length;
    if (!items.length && !positiveInt(source?.count) && source?.items === "unclear") {
      entries.push({
        kind,
        item: { ...source, source_unresolved_count_or_items: true },
      });
    }
    let expandedCount = 0;
    for (const item of items) {
      const multiplicity = positiveInt(item?.block_count) ?? 1;
      for (let itemIndex = 0; itemIndex < multiplicity; itemIndex += 1) {
        entries.push({
          kind,
          item: multiplicity > 1 ? {
            ...item,
            shape: Array.isArray(item?.shapes) ? item.shapes[itemIndex] ?? null : item?.shape ?? null,
            source_aggregate_index: itemIndex + 1,
            source_aggregate_count: multiplicity,
          } : item,
        });
        expandedCount += 1;
      }
    }
    for (let index = expandedCount; index < count; index += 1) {
      entries.push({ kind, item: { source_count_only_placeholder: index + 1 } });
    }
  };
  add("numeric_ice", mechanisms?.numeric_ice);
  add("shell", mechanisms?.shells);
  add("axis_block", mechanisms?.axis_blocks);
  add("star_block", mechanisms?.star_blocks);
  add("bomb", mechanisms?.bombs);
  add("rotatable_block", mechanisms?.rotatable_blocks);
  const keyLocks = mechanisms?.keys_locks;
  if (Array.isArray(keyLocks)) {
    for (const record of keyLocks) {
      entries.push({
        kind: "lock_block",
        item: {
          ...record,
          role: "lock",
          shape: record?.locked_shape ?? record?.lock_shape ?? record?.shape ?? null,
          color: record?.locked_color ?? record?.color ?? null,
        },
      });
      const explicitKeys = Array.isArray(record?.key_blocks)
        ? record.key_blocks
        : isObject(record?.paired_key_block)
          ? [record.paired_key_block]
          : [];
      if (explicitKeys.length) {
        for (const key of explicitKeys) entries.push({ kind: "key_block", item: { ...key, role: "key" } });
      } else if (positiveInt(record?.visible_key_piece_count)) {
        for (let index = 0; index < record.visible_key_piece_count; index += 1) entries.push({
          kind: "key_block",
          item: { role: "key", stage: record?.stage ?? null, source_count_only_placeholder: index + 1 },
        });
      } else if (typeof record?.key_color === "string") {
        entries.push({
          kind: "key_block",
          item: { role: "key", shape: record?.key_shape ?? null, color: record.key_color },
        });
      }
    }
  } else if (isObject(keyLocks)) {
    const locks = Array.isArray(keyLocks.locks) ? keyLocks.locks : [];
    const lockCount = positiveInt(keyLocks.lock_count) ?? locks.length;
    for (const item of locks) entries.push({ kind: "lock_block", item });
    for (let index = locks.length; index < lockCount; index += 1) {
      entries.push({ kind: "lock_block", item: { source_count_only_placeholder: index + 1 } });
    }
    for (let index = 0; index < (positiveInt(keyLocks.key_count) ?? 0); index += 1) {
      entries.push({ kind: "key_block", item: { source_count_only_placeholder: index + 1 } });
    }
  }
  for (const unsupported of mechanisms?.unsupported ?? []) {
    if (!/circular|double-arrow|双箭头/i.test(JSON.stringify(unsupported))) continue;
    const count = positiveInt(unsupported?.count) ?? 1;
    const appearanceShape = String(unsupported?.appearance ?? "").match(/\b(H[2-4]|V[2-4]|L[3-5]|T[4-5]|S4|SQ[23])\b/i)?.[1];
    for (let index = 0; index < count; index += 1) entries.push({
      kind: "circular_double_arrow_marked_block",
      item: {
        ...unsupported,
        shape: unsupported?.opening_shape ?? appearanceShape ?? null,
        source_unsupported_index: index + 1,
      },
    });
  }
  return entries;
};
const itemStage = (item) => {
  const explicitStage = String(item?.stage ?? "");
  if (/opening/i.test(explicitStage)) return "opening";
  const stageEvidence = [explicitStage, item?.visual_position, item?.trigger]
    .filter((value) => value != null)
    .join(" ");
  return item?.hidden_at_open || /hidden|reveal(?:ed)?/i.test(stageEvidence) ? "hidden" : "opening";
};
const itemStageIdentity = (item) => {
  const raw = String(item?.stage ?? item?.trigger ?? "").trim();
  if (item?.hidden_at_open) return `hidden:${raw || "unknown"}`;
  return raw || "opening";
};
const itemAnchor = (item) => {
  const x = Number.isInteger(item?.anchor?.x) ? item.anchor.x : Number.isInteger(item?.x) ? item.x : null;
  const y = Number.isInteger(item?.anchor?.y) ? item.anchor.y : Number.isInteger(item?.y) ? item.y : null;
  if (x != null && y != null) return `${itemStageIdentity(item)}:${x},${y}`;
  const match = String(item?.visual_position ?? "").match(/\((\d+)\s*,\s*(\d+)\)/);
  return match ? `${itemStageIdentity(item)}:${Number(match[1])},${Number(match[2])}` : null;
};
const mechanismShapeMinimums = (mechanisms, stage = "all", knownHistogram = null) => {
  const grouped = new Map();
  mechanismEntries(mechanisms).forEach(({ item }, index) => {
    const options = shapeOptions(item?.shape ?? item?.opening_shape);
    if (!options.length
      || (stage === "opening" && itemStage(item) !== "opening")
      || (stage === "hidden" && itemStage(item) === "opening")) return;
    const anchor = itemAnchor(item);
    const key = anchor ? `anchor:${anchor}` : `item:${index}`;
    const existing = grouped.get(key);
    if (!existing) grouped.set(key, options);
    else {
      const intersection = existing.filter((shape) => options.includes(shape));
      if (intersection.length) grouped.set(key, intersection);
      else grouped.set(`${key}:conflict:${index}`, options);
    }
  });
  const used = {};
  return orderedHistogram([...grouped.values()].reduce((result, options) => {
    const shape = options.find((candidate) => (used[candidate] ?? 0) < (knownHistogram?.[candidate] ?? 0))
      ?? options[0];
    used[shape] = (used[shape] ?? 0) + 1;
    result[shape] = (result[shape] ?? 0) + 1;
    return result;
  }, {}));
};
const histogramMaximum = (...histograms) => orderedHistogram(histograms.reduce((result, histogram) => {
  for (const [shape, count] of Object.entries(histogram ?? {})) result[shape] = Math.max(result[shape] ?? 0, count);
  return result;
}, {}));
const orderedHistogram = (histogram) => Object.fromEntries(SHAPE_ORDER.flatMap((shape) => (
  positiveInt(histogram?.[shape]) ? [[shape, histogram[shape]]] : []
)));
const addHistograms = (...histograms) => orderedHistogram(histograms.reduce((result, histogram) => {
  for (const [shape, count] of Object.entries(histogram ?? {})) result[shape] = (result[shape] ?? 0) + count;
  return result;
}, {}));
const subtractHistogram = (whole, part) => {
  const result = { ...(whole ?? {}) };
  for (const [shape, count] of Object.entries(part ?? {})) {
    result[shape] = Math.max(0, (result[shape] ?? 0) - count);
    if (!result[shape]) delete result[shape];
  }
  return orderedHistogram(result);
};

const nearestKnown = (levels, index, getter, fallback) => {
  for (let radius = 0; radius < levels.length; radius += 1) {
    for (const candidateIndex of [index - radius, index + radius]) {
      if (candidateIndex < 0 || candidateIndex >= levels.length) continue;
      const value = getter(levels[candidateIndex]);
      if (value != null && value !== "unclear" && value !== "partial") return clone(value);
    }
  }
  return clone(fallback);
};

const allocateCounts = (count, weights) => {
  if (!positiveInt(count)) return {};
  const normalizedWeights = normalizeHistogram(weights) ?? { H2: 3, V2: 3, H3: 2, V3: 2, SQ2: 1, L3: 1 };
  const entries = Object.entries(normalizedWeights);
  const totalWeight = entries.reduce((sum, [, value]) => sum + value, 0);
  const quotas = entries.map(([shape, value]) => {
    const exact = count * value / totalWeight;
    return { shape, count: Math.floor(exact), remainder: exact - Math.floor(exact) };
  });
  let remaining = count - quotas.reduce((sum, entry) => sum + entry.count, 0);
  quotas.sort((left, right) => right.remainder - left.remainder || SHAPE_ORDER.indexOf(left.shape) - SHAPE_ORDER.indexOf(right.shape));
  for (let index = 0; remaining > 0; index = (index + 1) % quotas.length, remaining -= 1) quotas[index].count += 1;
  return orderedHistogram(Object.fromEntries(quotas.filter((entry) => entry.count > 0).map((entry) => [entry.shape, entry.count])));
};

const fillHistogram = ({ known, minimums, count, neighborWeights }) => {
  const normalized = histogramMaximum(normalizeHistogram(known), normalizeHistogram(minimums));
  if (normalized && histogramTotal(normalized) === count) return normalized;
  if (normalized && histogramTotal(normalized) < count) {
    return addHistograms(normalized, allocateCounts(count - histogramTotal(normalized), neighborWeights));
  }
  return normalized ?? allocateCounts(count, neighborWeights);
};
const compactDesignFilledHistogram = (histogram, fixedMinimums, capacity) => {
  const result = { ...(histogram ?? {}) };
  const fixed = normalizeHistogram(fixedMinimums) ?? {};
  while (histogramArea(result) > capacity) {
    const shape = SHAPE_ORDER
      .filter((candidate) => (SHAPE_AREA[candidate] ?? 1) > 1 && (result[candidate] ?? 0) > (fixed[candidate] ?? 0))
      .sort((left, right) => SHAPE_AREA[right] - SHAPE_AREA[left] || SHAPE_ORDER.indexOf(right) - SHAPE_ORDER.indexOf(left))[0];
    if (!shape) break;
    result[shape] -= 1;
    if (!result[shape]) delete result[shape];
    result.SINGLE = (result.SINGLE ?? 0) + 1;
  }
  return orderedHistogram(result);
};
const trimHistogramToCount = (histogram, protectedMinimums, count) => {
  const result = { ...(histogram ?? {}) };
  const protectedCounts = normalizeHistogram(protectedMinimums) ?? {};
  while (histogramTotal(result) > count) {
    const removable = SHAPE_ORDER
      .filter((shape) => (result[shape] ?? 0) > (protectedCounts[shape] ?? 0))
      .sort((left, right) => (
        (result[right] - (protectedCounts[right] ?? 0)) - (result[left] - (protectedCounts[left] ?? 0))
        || SHAPE_AREA[right] - SHAPE_AREA[left]
        || SHAPE_ORDER.indexOf(left) - SHAPE_ORDER.indexOf(right)
      ));
    if (!removable.length) break;
    const shape = removable[0];
    result[shape] -= 1;
    if (!result[shape]) delete result[shape];
  }
  return orderedHistogram(result);
};

const mirrorHorizontal = (mask) => mask.map((row) => [...row].reverse().join(""));
const mirrorVertical = (mask) => [...mask].reverse();
const maskKey = (mask) => mask.join("/");
const logicalMaskKey = (mask) => {
  let rows = [...mask];
  while (rows.length && /^\.+$/.test(rows[0])) rows.shift();
  while (rows.length && /^\.+$/.test(rows.at(-1))) rows.pop();
  if (!rows.length) return "";
  let left = 0;
  let right = rows[0].length - 1;
  while (left <= right && rows.every((row) => row[left] === ".")) left += 1;
  while (right >= left && rows.every((row) => row[right] === ".")) right -= 1;
  return rows.map((row) => row.slice(left, right + 1)).join("/");
};
const componentsOf = (mask) => {
  const rows = mask.length;
  const cols = mask[0]?.length ?? 0;
  const remaining = new Set();
  for (let row = 0; row < rows; row += 1) for (let col = 0; col < cols; col += 1) {
    if (mask[row][col] === "#") remaining.add(`${row},${col}`);
  }
  const components = [];
  while (remaining.size) {
    const first = remaining.values().next().value;
    remaining.delete(first);
    const queue = [first];
    const cells = [];
    while (queue.length) {
      const [row, col] = queue.shift().split(",").map(Number);
      cells.push([row, col]);
      for (const [nextRow, nextCol] of neighbors(row, col, rows, cols)) {
        const key = `${nextRow},${nextCol}`;
        if (remaining.delete(key)) queue.push(key);
      }
    }
    const minRow = Math.min(...cells.map(([row]) => row));
    const minCol = Math.min(...cells.map(([, col]) => col));
    components.push(cells.map(([row, col]) => [row - minRow, col - minCol]));
  }
  return components;
};
const relocateComponents = (sourceMask, seed) => {
  const rows = sourceMask.length;
  const cols = sourceMask[0]?.length ?? 0;
  const components = componentsOf(sourceMask).sort((left, right) => right.length - left.length);
  if (components.length < 2) return null;
  const placed = [];
  const occupied = new Set();
  const touchesOccupied = (cells) => cells.some(([row, col]) => (
    occupied.has(`${row},${col}`)
    || neighbors(row, col, rows, cols).some(([nextRow, nextCol]) => occupied.has(`${nextRow},${nextCol}`))
  ));
  const search = (index) => {
    if (index === components.length) return true;
    const component = components[index];
    const height = Math.max(...component.map(([row]) => row)) + 1;
    const width = Math.max(...component.map(([, col]) => col)) + 1;
    const candidates = [];
    for (let row = 0; row <= rows - height; row += 1) for (let col = 0; col <= cols - width; col += 1) {
      candidates.push({ row, col, score: hash32(seed, row, col, index) });
    }
    candidates.sort((left, right) => left.score - right.score || left.row - right.row || left.col - right.col);
    for (const candidate of candidates) {
      const cells = component.map(([row, col]) => [candidate.row + row, candidate.col + col]);
      if (touchesOccupied(cells)) continue;
      for (const [row, col] of cells) occupied.add(`${row},${col}`);
      placed.push(cells);
      if (search(index + 1)) return true;
      placed.pop();
      for (const [row, col] of cells) occupied.delete(`${row},${col}`);
    }
    return false;
  };
  if (!search(0)) return null;
  const mask = Array.from({ length: rows }, (_, row) => Array.from(
    { length: cols },
    (_, col) => occupied.has(`${row},${col}`) ? "#" : ".",
  ).join(""));
  return maskKey(mask) === maskKey(sourceMask) ? null : mask;
};
const hash32 = (seed, row, col, step = 0) => {
  let value = seed ^ Math.imul(row + 1, 0x45d9f3b) ^ Math.imul(col + 1, 0x27d4eb2d) ^ Math.imul(step + 1, 0x165667b1);
  value ^= value >>> 16;
  value = Math.imul(value, 0x7feb352d);
  value ^= value >>> 15;
  return value >>> 0;
};
const neighbors = (row, col, rows, cols) => [
  [row - 1, col], [row + 1, col], [row, col - 1], [row, col + 1],
].filter(([nextRow, nextCol]) => nextRow >= 0 && nextRow < rows && nextCol >= 0 && nextCol < cols);
const generatedMask = (rows, cols, requestedCount, seed) => {
  const playableCount = Math.max(1, Math.min(rows * cols, requestedCount));
  if (playableCount === rows * cols) return fullMask(rows, cols);
  const selected = new Set();
  const start = [seed % rows, Math.floor(seed / Math.max(1, rows)) % cols];
  selected.add(start.join(","));
  const frontier = new Set(neighbors(...start, rows, cols).map((cell) => cell.join(",")));
  while (selected.size < playableCount && frontier.size) {
    const candidates = [...frontier].map((key) => {
      const [row, col] = key.split(",").map(Number);
      const contacts = neighbors(row, col, rows, cols).filter((cell) => selected.has(cell.join(","))).length;
      return { key, row, col, score: contacts * 2 ** 32 + hash32(seed, row, col, selected.size) };
    }).sort((left, right) => right.score - left.score || left.row - right.row || left.col - right.col);
    const chosen = candidates[0];
    frontier.delete(chosen.key);
    selected.add(chosen.key);
    for (const cell of neighbors(chosen.row, chosen.col, rows, cols)) {
      const key = cell.join(",");
      if (!selected.has(key)) frontier.add(key);
    }
  }
  return Array.from({ length: rows }, (_, row) => Array.from(
    { length: cols },
    (_, col) => selected.has(`${row},${col}`) ? "#" : ".",
  ).join(""));
};
const generatedMultiComponentMask = (rows, cols, playableCount, componentTarget, seed) => {
  if (componentTarget <= 1) return generatedMask(rows, cols, playableCount, seed);
  const horizontalCapacity = rows >= componentTarget * 2 - 1 ? (rows - componentTarget + 1) * cols : 0;
  const verticalCapacity = cols >= componentTarget * 2 - 1 ? (cols - componentTarget + 1) * rows : 0;
  const orientation = playableCount <= horizontalCapacity
    ? "horizontal"
    : playableCount <= verticalCapacity
      ? "vertical"
      : null;
  if (!orientation) return generatedMask(rows, cols, playableCount, seed);
  const primaryLength = orientation === "horizontal" ? rows : cols;
  const secondaryLength = orientation === "horizontal" ? cols : rows;
  const usablePrimary = primaryLength - componentTarget + 1;
  const bandSizes = Array.from({ length: componentTarget }, (_, index) => (
    Math.floor(usablePrimary / componentTarget) + (index < usablePrimary % componentTarget ? 1 : 0)
  ));
  const capacities = bandSizes.map((size) => size * secondaryLength);
  const allocations = Array.from({ length: componentTarget }, () => 1);
  let remaining = playableCount - componentTarget;
  while (remaining > 0) {
    const index = capacities
      .map((capacity, candidate) => ({ candidate, room: capacity - allocations[candidate] }))
      .sort((left, right) => right.room - left.room || left.candidate - right.candidate)[0]?.candidate;
    if (index == null || allocations[index] >= capacities[index]) break;
    allocations[index] += 1;
    remaining -= 1;
  }
  if (remaining > 0) return generatedMask(rows, cols, playableCount, seed);
  const output = Array.from({ length: rows }, () => Array.from({ length: cols }, () => "."));
  let primaryOffset = 0;
  for (let index = 0; index < componentTarget; index += 1) {
    const bandRows = orientation === "horizontal" ? bandSizes[index] : rows;
    const bandCols = orientation === "horizontal" ? cols : bandSizes[index];
    const bandMask = generatedMask(bandRows, bandCols, allocations[index], seed + index * 104729);
    for (let row = 0; row < bandRows; row += 1) for (let col = 0; col < bandCols; col += 1) {
      if (bandMask[row][col] !== "#") continue;
      const targetRow = orientation === "horizontal" ? primaryOffset + row : row;
      const targetCol = orientation === "horizontal" ? col : primaryOffset + col;
      output[targetRow][targetCol] = "#";
    }
    primaryOffset += bandSizes[index] + 1;
  }
  return output.map((row) => row.join(""));
};
const originalMask = (sourceMask, rows, cols, playableCount, componentTarget, level) => {
  if (validMask(sourceMask, rows, cols)) {
    if (maskCount(sourceMask) === rows * cols) {
      return {
        mask: clone(sourceMask),
        status: "full_rectangle_shape_locked_no_outline_variation_possible",
        comparison: "same_by_mathematical_necessity",
        transform: "identity",
      };
    }
    for (const { candidate, transform } of [
      { candidate: mirrorHorizontal(sourceMask), transform: "mirror_horizontal" },
      { candidate: mirrorVertical(sourceMask), transform: "mirror_vertical" },
      { candidate: mirrorVertical(mirrorHorizontal(sourceMask)), transform: "mirror_both" },
    ]) {
      if (maskKey(candidate) !== maskKey(sourceMask) && logicalMaskKey(candidate) !== logicalMaskKey(sourceMask)) {
        return {
          mask: candidate,
          status: "original_transform_preserving_dimensions_and_cell_count",
          comparison: "different",
          transform,
        };
      }
    }
    const relocated = relocateComponents(sourceMask, level * 15485863);
    if (relocated) {
      return {
        mask: relocated,
        status: "original_component_relayout_preserving_dimensions_and_cell_count",
        comparison: "different",
        transform: "component_relayout",
      };
    }
  }
  return {
    mask: generatedMultiComponentMask(rows, cols, playableCount, componentTarget ?? 1, level * 7919),
    status: "original_generated_outline_from_exact_or_design_fill_scalars",
    comparison: validMask(sourceMask, rows, cols) ? "different" : "source_mask_unclear",
    transform: "generated",
  };
};

const transformLocalMask = (mask, transform) => {
  if (!Array.isArray(mask)) return null;
  if (transform === "mirror_horizontal" || transform === "mirror_both") mask = mirrorHorizontal(mask);
  if (transform === "mirror_vertical" || transform === "mirror_both") mask = mirrorVertical(mask);
  return mask;
};
const transformRect = (rect, rows, cols, transform) => {
  if (!rect || !Number.isInteger(rect.x) || !Number.isInteger(rect.y)
    || !positiveInt(rect.w) || !positiveInt(rect.h)) return null;
  let { x, y, w, h } = rect;
  if (transform === "mirror_horizontal" || transform === "mirror_both") x = cols - x - w;
  if (transform === "mirror_vertical" || transform === "mirror_both") y = rows - y - h;
  return { x, y, w, h };
};
const buildTargetComponentLayout = (components, rows, cols, transform, level = 0, preserveComponentNames = new Set()) => {
  if (!Array.isArray(components) || components.length < 2) return null;
  if (!["identity", "mirror_horizontal", "mirror_vertical", "mirror_both", "component_custom"].includes(transform)) return null;
  return components.map((component, index) => {
    const componentRows = positiveInt(component?.rows) ?? component?.mask?.length;
    const componentCols = positiveInt(component?.cols) ?? component?.mask?.[0]?.length;
    const sourceOrigin = component?.origin;
    if (!componentRows || !componentCols
      || !Number.isInteger(sourceOrigin?.x) || !Number.isInteger(sourceOrigin?.y)) return null;
    const targetRect = transformRect({
      x: sourceOrigin.x,
      y: sourceOrigin.y,
      w: componentCols,
      h: componentRows,
    }, rows, cols, transform);
    const sourceLocalMask = Array.isArray(component?.mask)
      ? clone(component.mask)
      : Array.from({ length: componentRows }, () => "#".repeat(componentCols));
    let targetLocalMask = transform === "component_custom" && !preserveComponentNames.has(component?.name)
      ? generatedMask(componentRows, componentCols, maskCount(sourceLocalMask), level * 104729 + index * 7919)
      : transformLocalMask(sourceLocalMask, transform);
    if (transform === "component_custom" && !preserveComponentNames.has(component?.name)
      && maskKey(targetLocalMask) === maskKey(sourceLocalMask)
      && maskCount(sourceLocalMask) < componentRows * componentCols) {
      for (let attempt = 1; attempt < 32 && maskKey(targetLocalMask) === maskKey(sourceLocalMask); attempt += 1) {
        targetLocalMask = generatedMask(
          componentRows,
          componentCols,
          maskCount(sourceLocalMask),
          level * 104729 + index * 7919 + attempt * 1543,
        );
      }
    }
    return {
      source_name: component?.name ?? `component-${index + 1}`,
      source_origin: { x: sourceOrigin.x, y: sourceOrigin.y },
      target_origin: { x: targetRect.x, y: targetRect.y },
      rows: componentRows,
      cols: componentCols,
      mask: targetLocalMask,
      transform,
      adjacent_to_other_components: component?.adjacent_to_other_components ?? null,
    };
  }).filter(Boolean);
};
const maskFromComponentLayout = (layout, rows, cols) => {
  if (!Array.isArray(layout)) return null;
  const output = Array.from({ length: rows }, () => Array.from({ length: cols }, () => "."));
  for (const component of layout) for (let localY = 0; localY < component.mask.length; localY += 1) {
    for (let localX = 0; localX < component.mask[localY].length; localX += 1) {
      if (component.mask[localY][localX] !== "#") continue;
      const x = component.target_origin.x + localX;
      const y = component.target_origin.y + localY;
      if (x < 0 || y < 0 || x >= cols || y >= rows || output[y][x] === "#") return null;
      output[y][x] = "#";
    }
  }
  return output.map((row) => row.join(""));
};
const targetRegionFor = (sourceRegion, targetComponentLayout, rows, cols, transform) => {
  if (!sourceRegion) return null;
  if (sourceRegion.component && Array.isArray(targetComponentLayout)) {
    const component = targetComponentLayout.find((entry) => entry.source_name === sourceRegion.component);
    if (!component) return null;
    const local = transformRect(sourceRegion, component.rows, component.cols, transform);
    return local ? {
      component: component.source_name,
      x: component.target_origin.x + local.x,
      y: component.target_origin.y + local.y,
      w: local.w,
      h: local.h,
    } : null;
  }
  const global = transformRect(sourceRegion, rows, cols, transform);
  return global ? { component: null, ...global } : null;
};
const enrichStageGeometry = (stagePlan, targetComponentLayout, rows, cols, transform) => {
  const result = clone(stagePlan);
  for (const producer of result.producers) {
    producer.target_region = targetRegionFor(producer.source_region, targetComponentLayout, rows, cols, transform);
  }
  const producerById = new Map(result.producers.map((producer) => [producer.producer_id, producer]));
  for (const event of result.event_groups) {
    event.producers = event.producer_ids.map((id) => producerById.get(id)).filter(Boolean);
    event.target_regions = event.producers.map((producer) => producer.target_region).filter(Boolean);
  }
  return result;
};

const normalizeEvidenceHistogram = (histogram) => {
  if (!isObject(histogram)) return null;
  const result = {};
  for (const [rawShape, rawCount] of Object.entries(histogram)) {
    const count = positiveInt(rawCount);
    const shape = shapeOptions(rawShape)[0];
    if (!count || !shape) continue;
    result[shape] = (result[shape] ?? 0) + count;
  }
  return Object.keys(result).length ? orderedHistogram(result) : null;
};
const generatorQueueHistogram = (generator) => {
  if (!Array.isArray(generator?.queue)) return null;
  const result = {};
  for (const item of generator.queue) {
    const shape = shapeOptions(item?.shape)[0];
    if (!shape) continue;
    result[shape] = (result[shape] ?? 0) + 1;
  }
  return Object.keys(result).length ? orderedHistogram(result) : null;
};
const sourceRegionOf = (record) => {
  const candidate = isObject(record?.cover)
    ? record.cover
    : isObject(record?.region)
      ? record.region
      : record;
  return isObject(candidate) && Number.isInteger(candidate.x) && Number.isInteger(candidate.y)
    && positiveInt(candidate.w) && positiveInt(candidate.h)
    ? {
      component: candidate.component ?? record?.component ?? null,
      x: candidate.x,
      y: candidate.y,
      w: candidate.w,
      h: candidate.h,
    }
    : null;
};
const hiddenBatchOf = (record) => isObject(record?.hidden_batch) ? record.hidden_batch : {};
const hiddenHistogramOf = (record) => {
  const batch = hiddenBatchOf(record);
  return normalizeEvidenceHistogram(
    batch.shape_histogram
    ?? record?.hidden_shape_histogram
    ?? record?.hidden_batch_shape_histogram
    ?? record?.shape_histogram,
  );
};
const hiddenCountOf = (record, kind) => {
  const batch = hiddenBatchOf(record);
  return positiveInt(batch.piece_count)
    ?? positiveInt(record?.hidden_piece_count)
    ?? positiveInt(record?.hidden_batch_piece_count)
    ?? (histogramTotal(hiddenHistogramOf(record)) || null)
    ?? (kind === "generator"
      ? positiveInt(record?.queue_length)
        ?? positiveInt(record?.queue_count)
        ?? positiveInt(record?.generator_queue_count)
        ?? positiveInt(record?.count)
      : null);
};
const coverTriggerCountOf = (record) => positiveInt(record?.count)
  ?? positiveInt(record?.cover?.count)
  ?? (String(record?.trigger ?? "").match(/cover count\s*(\d+)/i)?.[1]
    ? Number(String(record.trigger).match(/cover count\s*(\d+)/i)[1])
    : null);
const sameRegion = (left, right) => {
  const a = sourceRegionOf(left);
  const b = sourceRegionOf(right);
  if (!a || !b) return false;
  return a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h
    && (a.component == null || b.component == null || a.component === b.component);
};
const sourceColorFromText = (value) => SOURCE_COLORS.find((color) => (
  new RegExp(`(^|[^a-z])${color}([^a-z]|$)`, "i").test(String(value ?? ""))
)) ?? null;
const orderedGeneratorQueue = (generator) => {
  if (Array.isArray(generator?.queue)) return generator.queue.map((entry, index) => {
    const options = shapeOptions(entry?.shape);
    return {
      queue_index: index,
      shape: options[0] ?? null,
      allowed_shapes: options,
      shape_evidence_status: options.length === 1 ? "source_exact" : "source_family_design_choice",
      source_shape: entry?.shape ?? null,
      color: entry?.color ?? entry?.color_class ?? null,
      color_evidence_status: entry?.color || entry?.color_class ? "source_exact" : "source_unclear",
    };
  });
  const queueCount = positiveInt(generator?.queue_length)
    ?? positiveInt(generator?.queue_count)
    ?? positiveInt(generator?.generator_queue_count)
    ?? positiveInt(generator?.count);
  if (!queueCount) return null;
  const preview = generator?.next_shape
    ?? generator?.preview_shape
    ?? (typeof generator?.queue === "string" && !/unclear/i.test(generator.queue) ? generator.queue : null);
  const options = shapeOptions(preview);
  const color = sourceColorFromText(preview);
  if (!preview || (!options.length && !color)) return null;
  return Array.from({ length: queueCount }, (_, index) => index === 0 ? {
    queue_index: 0,
    shape: options[0] ?? null,
    allowed_shapes: options,
    shape_evidence_status: options.length === 1 ? "source_exact" : options.length ? "source_family_design_choice" : "source_unclear",
    source_shape: preview,
    color,
    color_evidence_status: color ? "source_exact" : "source_unclear",
  } : {
    queue_index: index,
    shape: null,
    allowed_shapes: [],
    shape_evidence_status: "source_unobserved",
    source_shape: null,
    color: null,
    color_evidence_status: "source_unobserved",
  });
};
const orderedQueueKnownHistogram = (queue) => {
  if (!Array.isArray(queue)) return null;
  const result = {};
  for (const item of queue) if (item?.shape) result[item.shape] = (result[item.shape] ?? 0) + 1;
  return Object.keys(result).length ? orderedHistogram(result) : null;
};
const stageEvidenceOf = (level) => {
  const seeds = Array.isArray(level.stage_seeds) ? level.stage_seeds : [];
  const coverSeeds = seeds.filter((seed) => (
    seed?.kind !== "generator"
    && seed?.kind !== "unclassified_piece_counter"
    && seed?.kind !== "unclassified_empty_frame"
    && seed?.kind !== "flip_door_state"
    && seed?.generator_queue_count == null
    && (seed?.kind === "cover" || seed?.cover || /cover count/i.test(String(seed?.trigger ?? "")))
  ));
  const generatorSeeds = seeds.filter((seed) => seed?.kind === "generator" || seed?.generator_queue_count != null);
  const producers = [];

  const sourceCovers = Array.isArray(level.mechanisms?.covers) ? level.mechanisms.covers : [];
  const coverRecords = sourceCovers.length
    ? sourceCovers
    : coverSeeds.map((seed) => ({ ...(isObject(seed?.cover) ? seed.cover : isObject(seed?.region) ? seed.region : {}), count: coverTriggerCountOf(seed) }));
  const unusedCoverSeeds = new Set(coverSeeds.map((_, index) => index));
  coverRecords.forEach((cover, index) => {
    const count = coverTriggerCountOf(cover);
    const seedIndex = [...unusedCoverSeeds].find((candidate) => sameRegion(coverSeeds[candidate], cover))
      ?? [...unusedCoverSeeds].find((candidate) => coverTriggerCountOf(coverSeeds[candidate]) === count)
      ?? unusedCoverSeeds.values().next().value;
    const seed = seedIndex == null ? null : coverSeeds[seedIndex];
    if (seedIndex != null) unusedCoverSeeds.delete(seedIndex);
    const histogram = hiddenHistogramOf(seed) ?? hiddenHistogramOf(cover);
    const knownCount = hiddenCountOf(seed, "cover") ?? hiddenCountOf(cover, "cover")
      ?? (histogramTotal(histogram) || null);
    const region = sourceRegionOf(seed) ?? sourceRegionOf(cover);
    producers.push({
      producer_id: `cover-${index + 1}`,
      producer_type: "cover",
      source_index: index,
      event_group_id: count ? `cover-count-${count}` : `cover-unknown-${index + 1}`,
      source_stage_order: positiveInt(seed?.stage),
      trigger_order: positiveInt(seed?.stage),
      trigger: seed?.trigger ?? (count ? `cover count ${count} reaches zero` : "cover trigger unclear"),
      trigger_count: count,
      source_region: region,
      component: region?.component ?? cover?.component ?? null,
      known_count: knownCount,
      known_histogram: histogram,
      known_histogram_status: histogram
        ? seed?.hidden_batch_shape_histogram_status === "partial_minimum"
          ? "source_partial_stage_minimum"
          : "source_stage_seed"
        : "source_unclear",
      ordered_queue: null,
      source_reference: { cover: clone(cover), stage_seed: clone(seed) },
    });
  });

  const generators = Array.isArray(level.mechanisms?.generators) ? level.mechanisms.generators : [];
  const generatorCount = Math.max(generators.length, generatorSeeds.length);
  for (let index = 0; index < generatorCount; index += 1) {
    const generator = generators[index] ?? {};
    const seed = generatorSeeds[index] ?? null;
    const queue = orderedGeneratorQueue(generator);
    const exactQueueHistogram = generatorQueueHistogram(generator);
    const previewHistogram = orderedQueueKnownHistogram(queue);
    const seedHistogram = hiddenHistogramOf(seed);
    const histogram = exactQueueHistogram ?? previewHistogram ?? seedHistogram;
    const knownCount = positiveInt(generator?.queue_length)
      ?? positiveInt(generator?.queue_count)
      ?? positiveInt(seed?.generator_queue_count)
      ?? hiddenCountOf(seed, "generator")
      ?? (histogramTotal(histogram) || null);
    producers.push({
      producer_id: `generator-${index + 1}`,
      producer_type: "generator",
      source_index: index,
      event_group_id: `generator-${index + 1}`,
      trigger_order: null,
      trigger: generator?.trigger ?? seed?.trigger ?? "generator trigger unclear",
      trigger_count: null,
      source_region: sourceRegionOf(generator) ?? sourceRegionOf(seed),
      component: generator?.component ?? seed?.component ?? null,
      known_count: knownCount,
      known_histogram: histogram,
      known_histogram_status: exactQueueHistogram
        ? "source_exact_ordered_queue"
        : previewHistogram
          ? "source_partial_preview_minimum"
          : seedHistogram
            ? "source_stage_seed"
            : "source_unclear",
      ordered_queue: queue,
      source_reference: { generator: clone(generator), stage_seed: clone(seed) },
    });
  }

  const grouped = new Map();
  for (const producer of producers) {
    const existing = grouped.get(producer.event_group_id) ?? {
      event_group_id: producer.event_group_id,
      event_type: producer.producer_type === "generator" ? "generator_queue" : "cover_clear",
      trigger_count: producer.trigger_count,
      trigger_order: producer.trigger_order,
      producers: [],
    };
    existing.producers.push(producer);
    grouped.set(producer.event_group_id, existing);
  }
  const eventGroups = [...grouped.values()].map((group) => {
    const knownHistograms = group.producers.map((producer) => producer.known_histogram).filter(Boolean);
    const knownCounts = group.producers.map((producer) => producer.known_count).filter((value) => value != null);
    const components = [...new Set(group.producers.map((producer) => producer.component).filter(Boolean))];
    const sourceStageOrders = [...new Set(group.producers
      .map((producer) => producer.source_stage_order)
      .filter((value) => value != null))].sort((left, right) => left - right);
    return {
      ...group,
      source_stage_orders: sourceStageOrders,
      source_stage_order: sourceStageOrders[0] ?? null,
      trigger_order: sourceStageOrders[0] ?? null,
      producer_ids: group.producers.map((producer) => producer.producer_id),
      known_histogram: knownHistograms.length ? addHistograms(...knownHistograms) : null,
      known_histogram_statuses: group.producers.map((producer) => producer.known_histogram_status).filter(Boolean),
      known_count: knownCounts.length === group.producers.length
        ? knownCounts.reduce((sum, value) => sum + value, 0)
        : knownHistograms.length
          ? histogramTotal(addHistograms(...knownHistograms))
          : null,
      allowed_components: components.length ? components : null,
      ordered_queue: group.event_type === "generator_queue" ? group.producers[0].ordered_queue : null,
      simultaneous_event: group.event_type === "cover_clear",
      assignment_status: "source_event_preserved_payload_pending",
    };
  }).sort((left, right) => {
    if (left.event_type !== right.event_type) return left.event_type === "cover_clear" ? -1 : 1;
    if (left.event_type === "cover_clear") {
      return (left.trigger_order ?? Number.MAX_SAFE_INTEGER) - (right.trigger_order ?? Number.MAX_SAFE_INTEGER)
        || (left.trigger_count ?? Number.MAX_SAFE_INTEGER) - (right.trigger_count ?? Number.MAX_SAFE_INTEGER)
        || left.event_group_id.localeCompare(right.event_group_id);
    }
    return left.event_group_id.localeCompare(right.event_group_id, undefined, { numeric: true });
  });
  return { producers, event_groups: eventGroups };
};
const takeHistogram = (histogram, count, preferred = null) => {
  const result = {};
  let remaining = count;
  const order = [
    ...SHAPE_ORDER.filter((shape) => (preferred?.[shape] ?? 0) > 0),
    ...SHAPE_ORDER.filter((shape) => !(preferred?.[shape] > 0)),
  ];
  for (const shape of order) {
    const available = histogram[shape] ?? 0;
    const taken = Math.min(available, remaining);
    if (taken > 0) {
      result[shape] = taken;
      histogram[shape] -= taken;
      if (!histogram[shape]) delete histogram[shape];
      remaining -= taken;
    }
    if (!remaining) break;
  }
  return { histogram: orderedHistogram(result), missing_count: remaining };
};
const buildHiddenStagePartitions = (hiddenHistogram, stagePlan, sourceExact) => {
  const remaining = { ...(hiddenHistogram ?? {}) };
  const partitions = [];
  const conflicts = [];
  const events = clone(stagePlan.event_groups);
  const eventById = new Map(events.map((event) => [event.event_group_id, event]));
  const known = events.filter((event) => event.known_histogram || event.known_count).sort((left, right) => (
    Number(Boolean(right.known_histogram)) - Number(Boolean(left.known_histogram))
    || Number(right.event_type === "generator_queue") - Number(left.event_type === "generator_queue")
    || left.event_group_id.localeCompare(right.event_group_id, undefined, { numeric: true })
  ));
  const unknown = events.filter((event) => (
    (!event.known_histogram && !event.known_count)
    || event.known_histogram_statuses?.includes("source_partial_stage_minimum")
  ));
  for (const descriptor of known) {
    const exactHistogram = descriptor.known_histogram;
    const desiredCount = descriptor.known_count ?? histogramTotal(exactHistogram);
    let takenHistogram = {};
    let missingCount = 0;
    if (exactHistogram) {
      for (const [shape, count] of Object.entries(exactHistogram)) {
        const available = remaining[shape] ?? 0;
        const taken = Math.min(available, count);
        if (taken) takenHistogram[shape] = taken;
        remaining[shape] = available - taken;
        if (!remaining[shape]) delete remaining[shape];
        missingCount += count - taken;
      }
    }
    const extraCount = Math.max(0, desiredCount - histogramTotal(takenHistogram));
    if (extraCount > 0) {
      const extra = takeHistogram(remaining, extraCount);
      takenHistogram = addHistograms(takenHistogram, extra.histogram);
      missingCount += extra.missing_count;
    }
    if (missingCount > 0) {
      conflicts.push({
        type: sourceExact ? "exact_full_histogram_conflicts_with_source_producer" : "design_histogram_capacity_conflict",
        event_group_id: descriptor.event_group_id,
        missing_count: missingCount,
        required_histogram: clone(exactHistogram),
      });
    }
    takenHistogram = orderedHistogram(takenHistogram);
    const partitionId = descriptor.event_group_id;
    const exactHistogramStatus = descriptor.known_histogram_statuses?.every((status) => (
      status === "source_exact_ordered_queue" || status === "source_stage_seed"
    ));
    const provenance = exactHistogram && sameJson(takenHistogram, exactHistogram) && exactHistogramStatus
      ? "source_exact_hidden_batch"
      : "source_count_exact_shape_design_fill";
    const sourceRegions = descriptor.producers.map((producer) => producer.source_region).filter(Boolean);
    const targetRegions = descriptor.producers.map((producer) => producer.target_region).filter(Boolean);
    partitions.push({
      id: partitionId,
      kind: descriptor.event_type === "generator_queue" ? "generator_queue" : "hidden_cover_event_batch",
      count: histogramTotal(takenHistogram),
      shape_histogram: takenHistogram,
      provenance,
      assignment_status: "source_trigger_bound",
      event_group_id: descriptor.event_group_id,
      producer_ids: descriptor.producer_ids,
      trigger_reference: {
        trigger_count: descriptor.trigger_count,
        producers: descriptor.producers.map((producer) => producer.source_reference),
      },
      allowed_components: descriptor.allowed_components,
      source_regions: sourceRegions,
      target_regions: targetRegions,
      region_constraint_status: provenance === "source_exact_hidden_batch"
        && sourceRegions.length > 0
        && targetRegions.length === sourceRegions.length
        ? "enforced_exact_source_batch_region"
        : "unresolved_source_anchor_not_enforced",
      ordered_queue: descriptor.ordered_queue,
      simultaneous_visibility: descriptor.event_type !== "generator_queue",
      atomic_batches: descriptor.event_type === "generator_queue" && descriptor.producers.length === 1 ? [{
        batch_id: `${descriptor.producers[0].producer_id}-batch`,
        producer_id: descriptor.producers[0].producer_id,
        count: histogramTotal(takenHistogram),
        shape_histogram: clone(takenHistogram),
        ordered_queue: clone(descriptor.producers[0].ordered_queue),
        provenance,
      }] : descriptor.producers.flatMap((producer) => producer.known_count || producer.known_histogram ? [{
        batch_id: `${producer.producer_id}-batch`,
        producer_id: producer.producer_id,
        count: producer.known_count ?? histogramTotal(producer.known_histogram),
        shape_histogram: clone(producer.known_histogram),
        ordered_queue: clone(producer.ordered_queue),
        provenance: producer.known_histogram_status ?? "source_stage_seed",
      }] : []),
      missing_count: missingCount,
    });
    const event = eventById.get(descriptor.event_group_id);
    event.assignment_status = missingCount ? "source_payload_conflicts_with_full_histogram" : "materialized_in_partition";
    event.partition_ids = [partitionId];
  }
  const remainingCount = histogramTotal(remaining);
  if (remainingCount > 0) {
    if (unknown.length === 1) {
      partitions.push({
        id: `${unknown[0].event_group_id}-inferred-batch`,
        kind: unknown[0].event_type === "generator_queue" ? "generator_queue" : "hidden_cover_event_batch",
        count: remainingCount,
        shape_histogram: orderedHistogram(remaining),
        provenance: sourceExact ? "derived_from_exact_full_minus_opening" : "source_partial_plus_design_fill",
        assignment_status: "single_source_trigger_inferred",
        event_group_id: unknown[0].event_group_id,
        producer_ids: unknown[0].producer_ids,
        trigger_reference: {
          trigger_count: unknown[0].trigger_count,
          producers: unknown[0].producers.map((producer) => producer.source_reference),
        },
        allowed_components: unknown[0].allowed_components,
        source_regions: unknown[0].producers.map((producer) => producer.source_region).filter(Boolean),
        target_regions: unknown[0].producers.map((producer) => producer.target_region).filter(Boolean),
        region_constraint_status: "unresolved_source_anchor_not_enforced",
        ordered_queue: unknown[0].ordered_queue,
        simultaneous_visibility: unknown[0].event_type !== "generator_queue",
        atomic_batches: [],
      });
      const event = eventById.get(unknown[0].event_group_id);
      const alreadyMaterialized = Array.isArray(event.partition_ids) && event.partition_ids.length > 0;
      event.assignment_status = alreadyMaterialized
        ? "partial_minimum_and_inferred_remainder_materialized"
        : "materialized_from_single_unresolved_source_event";
      event.partition_ids = [...new Set([
        ...(event.partition_ids ?? []),
        `${unknown[0].event_group_id}-inferred-batch`,
      ])];
    } else if (unknown.length > 1) {
      partitions.push({
        id: "pooled-hidden",
        kind: "pooled_hidden_batch",
        count: remainingCount,
        shape_histogram: orderedHistogram(remaining),
        provenance: sourceExact
          ? "source_exact_hidden_pool_assignment_unresolved"
          : "source_partial_hidden_pool_assignment_unresolved",
        assignment_status: "unresolved_across_source_triggers",
        trigger_reference: {
          candidate_event_groups: unknown.map((entry) => entry.event_group_id),
          candidate_triggers: unknown.map((entry) => ({
            trigger_count: entry.trigger_count,
            producers: entry.producers.map((producer) => producer.source_reference),
          })),
        },
        event_group_ids: unknown.map((entry) => entry.event_group_id),
        producer_ids: unknown.flatMap((entry) => entry.producer_ids),
        allowed_components: (() => {
          const values = [...new Set(unknown.flatMap((entry) => entry.allowed_components ?? []))];
          return values.length ? values : null;
        })(),
        source_regions: unknown.flatMap((entry) => entry.producers.map((producer) => producer.source_region).filter(Boolean)),
        target_regions: unknown.flatMap((entry) => entry.producers.map((producer) => producer.target_region).filter(Boolean)),
        region_constraint_status: "unresolved_cross_trigger_not_enforced",
        ordered_queue: null,
        simultaneous_visibility: false,
        atomic_batches: [],
      });
      for (const descriptor of unknown) {
        const event = eventById.get(descriptor.event_group_id);
        const alreadyMaterialized = Array.isArray(event.partition_ids) && event.partition_ids.length > 0;
        event.assignment_status = alreadyMaterialized
          ? "partial_minimum_materialized_with_unresolved_remainder_pool"
          : "payload_materialized_in_unresolved_cross_trigger_pool";
        event.partition_ids = [...new Set([...(event.partition_ids ?? []), "pooled-hidden"] )];
      }
    } else {
      partitions.push({
        id: "pooled-hidden-design-fill",
        kind: "hidden_or_dynamic_batch",
        count: remainingCount,
        shape_histogram: orderedHistogram(remaining),
        provenance: sourceExact ? "derived_from_exact_full_minus_opening" : "explicit_design_fill",
        assignment_status: "no_source_trigger_available",
        trigger_reference: null,
        event_group_ids: [],
        producer_ids: [],
        allowed_components: null,
        source_regions: [],
        target_regions: [],
        region_constraint_status: "no_source_region",
        ordered_queue: null,
        simultaneous_visibility: false,
        atomic_batches: [],
      });
    }
  }
  return {
    partitions: partitions.filter((partition) => partition.count > 0),
    events,
    conflicts,
  };
};

const truth = await readJson(truthPath);
const truthSha = await sha256(truthPath);
const levels = truth.levels;
if (levels.length !== 100 || levels[0]?.level !== 101 || levels.at(-1)?.level !== 200) {
  throw new Error("Truth input must contain exactly Lv101-Lv200");
}

const contracts = levels.map((level, index) => {
  const fills = [];
  const observedRows = positiveInt(level.board?.rows);
  const observedCols = positiveInt(level.board?.cols);
  const rows = observedRows ?? nearestKnown(levels, index, (candidate) => positiveInt(candidate.board?.rows), 8);
  const cols = observedCols ?? nearestKnown(levels, index, (candidate) => positiveInt(candidate.board?.cols), 8);
  if (!observedRows) fills.push("board.rows");
  if (!observedCols) fills.push("board.cols");
  const sourceMask = validMask(level.board?.source_playable_mask, rows, cols) ? level.board.source_playable_mask : null;
  const sourceComponentCount = positiveInt(level.board?.source_component_count);
  const observedPlayableCount = positiveInt(level.board?.playable_cell_count) ?? (sourceMask ? maskCount(sourceMask) : null);
  const neighborDensity = nearestKnown(levels, index, (candidate) => {
    const candidateRows = positiveInt(candidate.board?.rows);
    const candidateCols = positiveInt(candidate.board?.cols);
    const candidateCount = positiveInt(candidate.board?.playable_cell_count);
    return candidateRows && candidateCols && candidateCount ? candidateCount / (candidateRows * candidateCols) : null;
  }, 0.82);
  let playableCount = Math.max(1, Math.min(rows * cols, observedPlayableCount ?? Math.round(rows * cols * neighborDensity)));
  if (!observedPlayableCount && sourceComponentCount && sourceComponentCount > 1) {
    const horizontalCapacity = rows >= sourceComponentCount * 2 - 1 ? (rows - sourceComponentCount + 1) * cols : 0;
    const verticalCapacity = cols >= sourceComponentCount * 2 - 1 ? (cols - sourceComponentCount + 1) * rows : 0;
    const disconnectedCapacity = Math.max(horizontalCapacity, verticalCapacity);
    if (disconnectedCapacity > 0 && playableCount > disconnectedCapacity) {
      playableCount = disconnectedCapacity;
      fills.push("board.playable_cell_count_component_gap_design_fill");
    }
  }
  if (!observedPlayableCount) fills.push("board.playable_cell_count");
  if (!sourceMask) fills.push("board.source_playable_mask");

  const observedFullHistogram = normalizeHistogram(level.composition?.source_full_shape_histogram);
  const observedOpeningHistogram = normalizeHistogram(level.composition?.opening_shape_histogram);
  const observedFullCount = positiveInt(level.composition?.source_full_piece_count)
    ?? (histogramTotal(observedFullHistogram) || null);
  const observedOpeningCount = positiveInt(level.composition?.opening_piece_count)
    ?? (histogramTotal(observedOpeningHistogram) || null);
  const sourceStagePlan = stageEvidenceOf(level);
  const stageEvidenceShapeMinimums = addHistograms(
    ...sourceStagePlan.event_groups.map((record) => record.known_histogram).filter(Boolean),
  );
  const openingShapeMinimums = mechanismShapeMinimums(level.mechanisms, "opening", observedOpeningHistogram);
  const hiddenMechanismShapeMinimums = mechanismShapeMinimums(level.mechanisms, "hidden", observedFullHistogram);
  const hiddenShapeMinimums = histogramMaximum(hiddenMechanismShapeMinimums, stageEvidenceShapeMinimums);
  const fullShapeMinimums = addHistograms(openingShapeMinimums, hiddenShapeMinimums);
  const neighborHistogram = nearestKnown(levels, index, (candidate) => (
    normalizeHistogram(candidate.composition?.source_full_shape_histogram)
  ), { H2: 3, V2: 3, H3: 2, V3: 2, SQ2: 1, L3: 1 });
  const designHistogramWeights = Object.keys(neighborHistogram ?? {}).length >= 3
    ? neighborHistogram
    : { SINGLE: 1, H2: 4, V2: 4, H3: 2, V3: 2, SQ2: 1 };
  const neighborPieceDensity = nearestKnown(levels, index, (candidate) => {
    const count = positiveInt(candidate.composition?.source_full_piece_count)
      ?? histogramTotal(normalizeHistogram(candidate.composition?.source_full_shape_histogram));
    const cells = positiveInt(candidate.board?.playable_cell_count);
    return count && cells ? count / cells : null;
  }, 0.28);
  const designAverageArea = histogramArea(designHistogramWeights) / Math.max(1, histogramTotal(designHistogramWeights));
  const designFullCount = Math.max(1, Math.min(
    Math.round(playableCount * neighborPieceDensity),
    Math.floor(playableCount * 0.86 / Math.max(1, designAverageArea)),
  ));
  const minimumHiddenPieceCount = sourceStagePlan.event_groups.reduce((sum, record) => (
    sum + (record.known_count ?? histogramTotal(record.known_histogram))
  ), 0);
  const inferredFullCount = Math.max(
    observedOpeningCount ?? 1,
    designFullCount,
    histogramTotal(observedOpeningHistogram),
    histogramTotal(observedFullHistogram),
    histogramTotal(openingShapeMinimums),
    histogramTotal(fullShapeMinimums),
    (observedOpeningCount ?? 0) + minimumHiddenPieceCount,
  );
  let fullCount = observedFullCount ?? inferredFullCount;
  if (!observedFullCount) fills.push("composition.source_full_piece_count");
  const openingSourceExact = Boolean(observedOpeningHistogram)
    && level.composition?.opening_shape_histogram_status === "exact"
    && histogramTotal(observedOpeningHistogram) === observedOpeningCount;
  const fullSourceExact = Boolean(observedFullHistogram)
    && level.composition?.source_full_shape_histogram_status === "exact"
    && histogramTotal(observedFullHistogram) === observedFullCount;
  let designOpeningCount = fullCount;
  if (!observedOpeningCount && designAverageArea * fullCount > playableCount) {
    designOpeningCount = Math.max(
      histogramTotal(openingShapeMinimums),
      Math.min(fullCount, Math.floor(playableCount * 0.86 / Math.max(1, designAverageArea))),
    );
  }
  if (!observedOpeningCount && minimumHiddenPieceCount > 0) {
    designOpeningCount = Math.max(
      histogramTotal(openingShapeMinimums),
      Math.min(designOpeningCount, fullCount - minimumHiddenPieceCount),
    );
  }
  const openingCount = observedOpeningCount ?? Math.min(fullCount, Math.max(
    designOpeningCount,
    histogramTotal(observedOpeningHistogram),
    histogramTotal(openingShapeMinimums),
  ));
  if (!observedOpeningCount) fills.push("composition.opening_piece_count");
  const openingFixedMinimums = openingSourceExact
    ? observedOpeningHistogram
    : histogramMaximum(observedOpeningHistogram, openingShapeMinimums);
  let openingHistogram = fillHistogram({
    known: observedOpeningHistogram,
    minimums: openingSourceExact ? null : openingShapeMinimums,
    count: openingCount,
    neighborWeights: observedFullHistogram ?? designHistogramWeights,
  });
  if (!openingSourceExact && histogramTotal(openingHistogram) > openingCount) {
    openingHistogram = trimHistogramToCount(openingHistogram, openingShapeMinimums, openingCount);
    fills.push("composition.opening_shape_histogram_reclassified_to_observed_count");
  }
  if (!openingSourceExact) openingHistogram = compactDesignFilledHistogram(openingHistogram, openingFixedMinimums, playableCount);
  if (!observedOpeningHistogram
    || level.composition?.opening_shape_histogram_status !== "exact"
    || histogramTotal(observedOpeningHistogram) !== openingCount) fills.push("composition.opening_shape_histogram");
  const requiredFullFromStages = addHistograms(openingHistogram, hiddenShapeMinimums);
  if (!observedFullCount && fullCount < histogramTotal(requiredFullFromStages)) {
    fullCount = histogramTotal(requiredFullFromStages);
    fills.push("composition.source_full_piece_count_reconciled_to_stage_minimums");
  }
  const fullMinimums = fullSourceExact
    ? observedFullHistogram
    : histogramMaximum(observedFullHistogram, requiredFullFromStages);
  let fullHistogram = fillHistogram({
    known: observedFullHistogram,
    minimums: fullSourceExact ? null : requiredFullFromStages,
    count: fullCount,
    neighborWeights: designHistogramWeights,
  });
  if (!observedFullHistogram
    || level.composition?.source_full_shape_histogram_status !== "exact"
    || histogramTotal(observedFullHistogram) !== fullCount) fills.push("composition.source_full_shape_histogram");
  if (!fullSourceExact && histogramTotal(fullHistogram) > fullCount) {
    fullHistogram = trimHistogramToCount(fullHistogram, requiredFullFromStages, fullCount);
    fills.push("composition.source_full_shape_histogram_mechanism_minimums");
  }
  // A partial/full design fill must still contain every opening block shape.
  if (!fullSourceExact && Object.entries(openingHistogram).some(([shape, count]) => (fullHistogram[shape] ?? 0) < count)) {
    fullHistogram = fillHistogram({
      known: histogramMaximum(fullHistogram, openingHistogram),
      count: fullCount,
      neighborWeights: designHistogramWeights,
    });
    fills.push("composition.source_full_shape_histogram_reconciled");
  }

  const observedOpeningColors = positiveInt(level.composition?.opening_color_count);
  const observedFullColors = positiveInt(level.composition?.full_color_count);
  const sourceMechanismColors = [...sourceColorsOf(level.mechanisms)].sort((left, right) => (
    SOURCE_COLORS.indexOf(left) - SOURCE_COLORS.indexOf(right)
  ));
  const inferredFullColors = observedFullColors ?? nearestKnown(
    levels, index, (candidate) => positiveInt(candidate.composition?.full_color_count), 6,
  );
  const provisionalFullColorCount = observedFullColors ?? Math.max(1, Math.min(
    8,
    fullCount,
    Math.max(inferredFullColors, observedOpeningColors ?? 1),
  ));
  let openingColorCount = observedOpeningColors
    ?? Math.max(1, Math.min(provisionalFullColorCount, openingCount));
  const inferredColorCapacity = openingColorCount + Math.max(0, fullCount - openingCount);
  const fullColorCount = observedFullColors
    ?? Math.max(openingColorCount, Math.min(provisionalFullColorCount, inferredColorCapacity));
  if (!observedOpeningColors) openingColorCount = Math.min(openingColorCount, fullColorCount);
  if (!observedOpeningColors) fills.push("composition.opening_color_count");
  if (!observedFullColors) fills.push("composition.full_color_count");
  if (observedOpeningColors && observedFullColors && observedFullColors < observedOpeningColors) {
    fills.push("composition.full_color_count_reconciled_to_opening");
  }
  const designPalette = rotatePalette(level.level, fullColorCount);
  const colorClassMapping = buildColorClassMapping(
    sourceMechanismColors,
    level.mechanisms,
    designPalette,
    openingColorCount,
  );
  const remappedMechanismContract = remapColors(level.mechanisms, colorClassMapping);
  const formalRepair = FORMAL_SOLVABILITY_REPAIRS.get(level.level);
  if (formalRepair) {
    const ordinary = remappedMechanismContract.directional_exits?.ordinary ?? [];
    const current = formalRepair.ordinary_exit_indices.map((index) => ordinary[index]?.color);
    if (!sameJson(current, formalRepair.expected_from)) {
      throw new Error(`${level.level_id}: formal solvability repair source drifted (${current.join("/")})`);
    }
    formalRepair.ordinary_exit_indices.forEach((index, repairIndex) => {
      ordinary[index].color = formalRepair.to[repairIndex];
    });
    const frozen = remappedMechanismContract.directional_exits?.frozen ?? [];
    const currentFrozen = formalRepair.frozen_exit_indices.map((index) => frozen[index]?.color);
    if (!sameJson(currentFrozen, formalRepair.frozen_expected_from)) {
      throw new Error(`${level.level_id}: formal frozen-exit colour repair source drifted (${currentFrozen.join("/")})`);
    }
    formalRepair.frozen_exit_indices.forEach((index, repairIndex) => {
      frozen[index].color = formalRepair.frozen_to[repairIndex];
    });
  }
  const observedTime = positiveInt(level.time_seconds);
  const timeSeconds = observedTime ?? nearestKnown(levels, index, (candidate) => positiveInt(candidate.time_seconds), 120);
  if (!observedTime) fills.push("time_seconds");

  const hasExplicitSeparatedComponentGeometry = Array.isArray(level.board?.source_components)
    && level.board.source_components.length > 1
    && level.board.source_components.every((component) => component?.adjacent_to_other_components === false);
  let targetMask = originalMask(sourceMask, rows, cols, playableCount, sourceComponentCount, level.level);
  const denseOpeningComponentNames = new Set();
  if (level.composition?.opening_component) {
    const openingComponent = level.board?.source_components?.find((component) => (
      component?.name === level.composition.opening_component
    ));
    if (openingComponent && histogramArea(openingHistogram) === maskCount(openingComponent.mask)) {
      denseOpeningComponentNames.add(level.composition.opening_component);
    }
  }
  let targetComponentLayout = hasExplicitSeparatedComponentGeometry
    ? buildTargetComponentLayout(
      level.board.source_components,
      rows,
      cols,
      targetMask.transform,
      level.level,
      denseOpeningComponentNames,
    )
    : null;
  if (hasExplicitSeparatedComponentGeometry && !targetComponentLayout) {
    targetComponentLayout = buildTargetComponentLayout(
      level.board.source_components,
      rows,
      cols,
      "component_custom",
      level.level,
      denseOpeningComponentNames,
    );
    const componentMask = maskFromComponentLayout(targetComponentLayout, rows, cols);
    if (componentMask) targetMask = {
      mask: componentMask,
      status: "original_component_local_outline_preserving_dimensions_and_cell_count",
      comparison: sourceMask && maskKey(componentMask) === maskKey(sourceMask) ? "same_by_component_capacity" : "different",
      transform: "component_custom",
    };
  }
  const maskComponentCount = componentCount(targetMask.mask);
  if (hasExplicitSeparatedComponentGeometry
    && (!targetComponentLayout || targetComponentLayout.length !== sourceComponentCount)) {
    throw new Error(`${level.level_id}: explicit component topology lacks a transformable source origin`);
  }
  const generatedComponentCount = targetComponentLayout?.length ?? maskComponentCount;
  const stagePlan = enrichStageGeometry(
    remapStageQueueColors(sourceStagePlan, colorClassMapping),
    targetComponentLayout,
    rows,
    cols,
    targetMask.transform,
  );
  const hiddenHistogram = subtractHistogram(fullHistogram, openingHistogram);
  const hiddenStagePlan = buildHiddenStagePartitions(
    hiddenHistogram,
    stagePlan,
    fullSourceExact && openingSourceExact,
  );
  if (hiddenStagePlan.partitions.some((partition) => /unresolved/.test(partition.assignment_status))) {
    fills.push("staging.trigger_assignment");
  }
  if (hiddenStagePlan.conflicts.length) fills.push("staging.source_conflict");
  const coverProducers = stagePlan.producers.filter((producer) => producer.producer_type === "cover");
  const openingExcludedTargetRegions = coverProducers.map((producer) => producer.target_region).filter(Boolean);
  const stagePartitions = [
    {
      id: "opening",
      kind: "opening",
      count: histogramTotal(openingHistogram),
      shape_histogram: openingHistogram,
      provenance: openingSourceExact && sameJson(openingHistogram, observedOpeningHistogram)
        ? "source_exact"
        : observedOpeningHistogram
          ? "source_partial_plus_design_fill"
          : "explicit_design_fill",
      event_group_id: "opening",
      producer_ids: [],
      allowed_components: level.composition?.opening_component ? [level.composition.opening_component] : null,
      source_regions: [],
      target_regions: [],
      excluded_target_regions: openingExcludedTargetRegions,
      region_exclusion_complete: false,
      region_constraint_status: coverProducers.length
        ? "opening_vs_cover_anchor_relation_unresolved_not_enforced"
        : "no_cover_regions",
      ordered_queue: null,
      simultaneous_visibility: true,
      atomic_batches: [],
    },
    ...hiddenStagePlan.partitions,
  ].filter((stage) => stage.count > 0);

  const runtimeBlocked = Object.entries(UNSUPPORTED_RUNTIME_MECHANISMS).flatMap(([mechanism, firstLevel]) => (
    level.level >= firstLevel && (
      (mechanism === "timed_bomb" && mechanismPresent(level.mechanisms?.bombs))
      || (mechanism === "circular_double_arrow_marked_block" && (
        mechanismPresent(level.mechanisms?.rotatable_blocks)
        || level.mechanisms?.unsupported?.some((entry) => /circular|double-arrow|双箭头/i.test(JSON.stringify(entry)))
      ))
      || (mechanism === "flip_door" && mechanismPresent(level.mechanisms?.flip_doors))
      || (mechanism === "colored_grid" && mechanismPresent(level.mechanisms?.colored_grid))
    ) ? [mechanism] : []
  ));

  return {
    level_id: level.level_id,
    status: level.provenance?.classification === "source_missing_external_reference_only"
      ? "source_missing_design_placeholder_unsolved_not_integrated"
      : "formal_candidate_ready_unsolved_not_runtime_integrated",
    truth_reference: {
      artifact: rel(truthPath),
      level_id: level.level_id,
      source_classification: level.provenance?.classification,
      external_reference: clone(level.provenance?.web_reference ?? null),
      required_exact_fields_missing: level.required_exact_fields_missing,
      source_unclear_fields: level.source_unclear_fields,
      design_fill_fields: [...new Set(fills)].sort(),
    },
    competitor_reference: {
      board: clone(level.board),
      time_seconds: level.time_seconds,
      composition: clone(level.composition),
      mechanisms: clone(level.mechanisms),
      stage_seeds: clone(level.stage_seeds),
    },
    our_design_target: {
      board: {
        rows,
        cols,
        playable_cell_count: playableCount,
        playable_mask: targetMask.mask,
        source_connected_component_count: sourceComponentCount,
        source_component_geometry: clone(level.board?.source_components ?? null),
        target_component_layout: clone(targetComponentLayout),
        topology_component_count: generatedComponentCount,
        mask_component_count: maskComponentCount,
        uses_explicit_component_topology: hasExplicitSeparatedComponentGeometry,
        generated_connected_component_count: generatedComponentCount,
        component_parity_status: sourceComponentCount == null
          ? "source_unclear"
          : sourceComponentCount === generatedComponentCount
            ? "matched"
            : "explicit_design_fill_not_matched",
        originality_status: targetMask.status,
        competitor_mask_comparison: targetMask.comparison,
        source_to_target_transform: targetMask.transform,
      },
      time_seconds: timeSeconds,
      full_level_block_count: fullCount,
      full_level_shape_histogram: fullHistogram,
      full_level_occupied_cell_count: histogramArea(fullHistogram),
      opening_block_count: openingCount,
      opening_shape_histogram: openingHistogram,
      opening_color_count: openingColorCount,
      full_level_color_count: fullColorCount,
      design_palette: designPalette,
      source_to_design_color_class: colorClassMapping,
      requires_staged_reveal: hiddenStagePlan.events.length > 0 || stagePartitions.length > 1,
      stage_events: hiddenStagePlan.events,
      stage_conflicts: hiddenStagePlan.conflicts,
      stage_partitions: stagePartitions,
      mechanism_contract: clone(remappedMechanismContract),
      formal_repairs: formalRepair ? [clone(formalRepair)] : [],
      runtime_unsupported_mechanisms: runtimeBlocked,
      solver_acceptance: {
        status: "not_run_by_user_request",
        completion_witness: null,
        par_moves: null,
        difficulty_score: null,
        necessary_reposition_overhead: null,
      },
    },
  };
});

const sourceExact = contracts.filter((level) => level.truth_reference.design_fill_fields.length === 0).length;
const sourceMissing = contracts.filter((level) => level.truth_reference.source_classification !== "local_video_fact")
  .map((level) => level.level_id);
const unsupportedCounts = Object.fromEntries(Object.keys(UNSUPPORTED_RUNTIME_MECHANISMS).map((mechanism) => [
  mechanism,
  contracts.filter((level) => level.our_design_target.runtime_unsupported_mechanisms.includes(mechanism)).length,
]));
const contract = {
  schema_version: "blockout-video-parity-design-contract-101-200-v1",
  title: "Block Out! Lv101-200 competitor-composition / original-board contract v1",
  generated_on: "2026-09-17",
  status: "formal_candidate_contract_unsolved_not_runtime_integrated",
  truth: { path: rel(truthPath), sha256: truthSha },
  rules: {
    source_separation: "Observed facts, external references, and deterministic design fills stay explicitly separated per field.",
    composition: "Use the competitor opening/full piece counts, shape histogram and color count when the source is exact.",
    board: "Keep logical rows, columns and playable-cell count; use a different outline when mathematically possible.",
    mechanism: "Preserve mechanism type, instance count, counter values, physical region and trigger logic when observed.",
    no_solver: "No completion witness, par moves, difficulty score or reposition metric is claimed in this pass.",
    integration: "Lv101-200 remain standalone candidate data until solver validation and missing runtime mechanics are implemented.",
  },
  summary: {
    level_count: contracts.length,
    levels_with_no_design_fill: sourceExact,
    levels_with_explicit_design_fill: contracts.length - sourceExact,
    source_missing_level_ids: sourceMissing,
    runtime_unsupported_mechanism_level_counts: unsupportedCounts,
    solver_validated_level_count: 0,
    runtime_integrated_level_count: 0,
  },
  levels: contracts,
};

const markdown = [
  "# Block Out! Lv101–200 生成合同 v1",
  "",
  `- 关卡：${contracts.length}`,
  `- 无设计填充：${sourceExact}`,
  `- 含显式设计填充：${contracts.length - sourceExact}`,
  `- 视频缺失：${sourceMissing.join("、") || "无"}`,
  "- 求解：未运行",
  "- 当前运行时：未接入",
  "",
  "| 关卡 | 棋盘 | 可玩格 | 开局/完整色块 | 颜色 | 阶段 | 设计填充字段 | 未支持机制 |",
  "|---:|---:|---:|---:|---:|---:|---|---|",
  ...contracts.map((level) => {
    const target = level.our_design_target;
    return `| ${level.level_id} | ${target.board.rows}×${target.board.cols} | ${target.board.playable_cell_count} | ${target.opening_block_count}/${target.full_level_block_count} | ${target.full_level_color_count} | ${target.stage_partitions.length} | ${level.truth_reference.design_fill_fields.join("、") || "-"} | ${target.runtime_unsupported_mechanisms.join("、") || "-"} |`;
  }),
  "",
].join("\n");

await mkdir(outputDir, { recursive: true });
await Promise.all([
  writeFile(contractPath, `${JSON.stringify(contract, null, 2)}\n`),
  writeFile(markdownPath, markdown),
]);

console.log(JSON.stringify({
  contract: rel(contractPath),
  markdown: rel(markdownPath),
  level_count: contracts.length,
  levels_with_no_design_fill: sourceExact,
  levels_with_explicit_design_fill: contracts.length - sourceExact,
  source_missing_level_ids: sourceMissing,
  solver_validated_level_count: 0,
}, null, 2));
