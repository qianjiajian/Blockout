import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SOURCE_RELATIVE_PATH =
  "deliverables/competitor-level-relations/blockout-lv001-lv100-youtube-dynamic-recovery.json";
const SOURCE_PATH = path.join(ROOT, SOURCE_RELATIVE_PATH);
const OUTPUT_DIR = path.join(ROOT, "deliverables/level-generation-blueprint");
const OUTPUT_STEM = "blockout-lv001-lv100-competitor-constrained-design-contract-v4";
const OUTPUT_JSON = path.join(OUTPUT_DIR, `${OUTPUT_STEM}.json`);
const OUTPUT_CSV = path.join(OUTPUT_DIR, `${OUTPUT_STEM}.csv`);
const OUTPUT_MD = path.join(OUTPUT_DIR, `${OUTPUT_STEM}.md`);

const LOCAL_VIDEO_EVIDENCE = [
  {
    levels: "Lv001-Lv010",
    path: "F:/ruanjian/xwechat_files/wxid_70xc4dsnvhlm21_58d6/temp/RWTemp/2026-09/8b70aa19612861d7a60de4d01ae0f0a4/15583c7e290ee0622e16734e4e51767c.mp4",
    sha256: "5FBFF77BE42080BDEFC328790AFACCD0D7ED73BE0ADDEC58B5B1E765D412CEC9",
  },
  {
    levels: "Lv011-Lv020",
    path: "F:/ruanjian/xwechat_files/wxid_70xc4dsnvhlm21_58d6/temp/RWTemp/2026-09/8b70aa19612861d7a60de4d01ae0f0a4/67b5604125cac2c8d7b6903679d65867.mp4",
    sha256: "A722A1B7F9AE2DECFA992366D92AC921894597CCF480195BEDB8FDEECB07C39B",
  },
];

const SHAPE_ORDER = [
  "SINGLE",
  "H2",
  "V2",
  "H3",
  "V3",
  "SQ2",
  "L3",
  "T4",
  "L4",
  "CROSS5",
  "RECT2X3",
  "SQ3",
];
const SHAPE_SET = new Set(SHAPE_ORDER);
const SHAPE_CELL_AREA = {
  SINGLE: 1,
  H2: 2,
  V2: 2,
  H3: 3,
  V3: 3,
  SQ2: 4,
  L3: 3,
  T4: 4,
  L4: 4,
  CROSS5: 5,
  RECT2X3: 6,
  SQ3: 9,
};
const DESIGN_COLORS = ["red", "blue", "green", "yellow", "purple", "orange", "pink", "cyan"];
// Shape-aware exceptions are used only when the generic connected-mask grower
// produces a scalar-correct outline that cannot hold the locked histogram.
const DESIGN_MASK_OVERRIDES = {
  9: ["..####", "..####", "######", "######", "######", "######", "####..", "####.."],
};

const EXTRAPOLATED_DESIGN_VALUES = {
  "board.rows": {
    48: {
      value: 9,
      evidence: "Two observed 4x7 components need one separating envelope row: 4+1+4=9.",
    },
  },
  full_level_block_count: {
    49: { value: 28, evidence: "At least 25 pieces are proven (12 opening + 2 numeric-ice + 11 generator); reserve three cover-hidden slots." },
    54: { value: 18, evidence: "Preserve the proven 10-piece subtotal and interpolate the cover-hidden load between Lv53 and Lv55." },
    59: { value: 24, evidence: "Preserve all 16 opening pieces and use the neighboring dense-board range without copying Lv60's exceptional 35-piece peak." },
    64: { value: 17, evidence: "Preserve all 11 opening pieces and add a six-piece hidden allowance bracketed by Lv63/Lv65." },
    78: { value: 13, evidence: "Preserve the 12 opening pieces and the proven 13-piece full-level lower bound." },
  },
  full_level_color_count: {
    47: { value: 5, evidence: "Lock the five colors visibly established at opening; no additional hidden color is established by the video." },
  },
};

const sourceBuffer = fs.readFileSync(SOURCE_PATH);
const source = JSON.parse(sourceBuffer.toString("utf8"));

if (!Array.isArray(source.levels) || source.levels.length !== 100) {
  throw new Error(`Expected 100 source levels, received ${source.levels?.length ?? "missing"}.`);
}

const isPositiveInteger = (value) => Number.isInteger(value) && value > 0;
const isHistogram = (value) =>
  value !== null &&
  typeof value === "object" &&
  !Array.isArray(value) &&
  Object.keys(value).length > 0 &&
  Object.values(value).every(isPositiveInteger);
const histogramTotal = (histogram) =>
  isHistogram(histogram) ? Object.values(histogram).reduce((sum, value) => sum + value, 0) : 0;
const histogramCellArea = (histogram) =>
  isHistogram(histogram)
    ? Object.entries(histogram).reduce((sum, [shape, count]) => {
        const area = SHAPE_CELL_AREA[shape];
        if (!area) throw new Error(`Missing cell-area definition for shape ${shape}.`);
        return sum + area * count;
      }, 0)
    : 0;
const orderedHistogram = (histogram) =>
  Object.fromEntries(
    Object.entries(histogram)
      .filter(([, count]) => count > 0)
      .sort(([shapeA], [shapeB]) => {
        const indexA = SHAPE_ORDER.indexOf(shapeA);
        const indexB = SHAPE_ORDER.indexOf(shapeB);
        return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB) ||
          shapeA.localeCompare(shapeB);
      }),
  );

const levelNumber = (level) => Number(level.level_id.slice(2));
const unclearFields = (level) => new Set(level.core_unclear_fields ?? []);
const exactNumeric = (level, field, value) =>
  !unclearFields(level).has(field) && isPositiveInteger(value) ? value : "unclear";
const exactHistogram = (level) =>
  !unclearFields(level).has("full_level_shape_histogram") &&
  isHistogram(level.full_level_shape_histogram)
    ? orderedHistogram(level.full_level_shape_histogram)
    : "unclear";

const findNeighborAnchors = (index, getter) => {
  let previous = null;
  let next = null;
  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    const value = getter(source.levels[cursor]);
    if (value !== "unclear") {
      previous = {
        level_id: source.levels[cursor].level_id,
        distance: index - cursor,
        value,
      };
      break;
    }
  }
  for (let cursor = index + 1; cursor < source.levels.length; cursor += 1) {
    const value = getter(source.levels[cursor]);
    if (value !== "unclear") {
      next = {
        level_id: source.levels[cursor].level_id,
        distance: cursor - index,
        value,
      };
      break;
    }
  }
  return [previous, next].filter(Boolean);
};

const inferenceConfidence = (anchors) => {
  if (anchors.length === 2 && Math.max(...anchors.map((anchor) => anchor.distance)) <= 3) {
    return "medium";
  }
  return "low";
};

const exactProvenance = (level, field) => ({
  classification:
    levelNumber(level) <= 20
      ? "local_video_and_youtube_dynamic_cross_review_fact"
      : "youtube_dynamic_recovery_fact",
  anchors: [{ level_id: level.level_id, field }],
  rule: "Copy the resolved competitor reference value without changing its quantity.",
  confidence: levelNumber(level) <= 20 ? "high_cross_reviewed" : "source_reported",
  requires_video_confirmation: false,
});

const inferredProvenance = (anchors, rule) => ({
  classification: "extrapolated_design_not_video_fact",
  anchors,
  rule,
  confidence: inferenceConfidence(anchors),
  requires_video_confirmation: true,
});

const interpolateInteger = (anchors) => {
  if (anchors.length === 0) {
    throw new Error("Cannot infer a numeric design target without a neighboring anchor.");
  }
  if (anchors.length === 1) return anchors[0].value;
  const [previous, next] = anchors;
  const span = previous.distance + next.distance;
  return Math.round(
    (previous.value * next.distance + next.value * previous.distance) / span,
  );
};

const resolveNumericTarget = ({ index, level, field, sourceValue, getter, lowerBound = 1 }) => {
  const competitorValue = exactNumeric(level, field, sourceValue);
  if (competitorValue !== "unclear") {
    return {
      value: competitorValue,
      provenance: exactProvenance(level, field),
    };
  }

  const anchors = findNeighborAnchors(index, getter);
  const override = EXTRAPOLATED_DESIGN_VALUES[field]?.[levelNumber(level)];
  if (override) {
    const value = Math.max(lowerBound, override.value);
    return {
      value,
      provenance: inferredProvenance(
        [
          {
            level_id: level.level_id,
            observed_lower_bound: lowerBound,
            evidence: override.evidence,
          },
          ...anchors,
        ],
        `${override.evidence} The fixed design value ${override.value} is checked against the observed lower bound ` +
          `${lowerBound} and the nearest resolved neighboring anchors, producing ${value}.`,
      ),
    };
  }
  const interpolated = interpolateInteger(anchors);
  const value = Math.max(lowerBound, interpolated);
  return {
    value,
    provenance: inferredProvenance(
      anchors,
      `Distance-weighted integer interpolation between the nearest resolved neighboring levels; ` +
        `rounded to ${interpolated} and clamped to the observed lower bound ${lowerBound}, producing ${value}.`,
    ),
  };
};

const normalizeObservedHistogram = (histogram) => {
  if (!isHistogram(histogram)) return {};
  const normalized = {};
  for (const [shape, count] of Object.entries(histogram)) {
    let canonicalShape = shape;
    if (!SHAPE_SET.has(canonicalShape) && canonicalShape.includes("L")) canonicalShape = "L3";
    if (!SHAPE_SET.has(canonicalShape)) continue;
    normalized[canonicalShape] = (normalized[canonicalShape] ?? 0) + count;
  }
  return orderedHistogram(normalized);
};

const mergedObservedHistogram = (level) => {
  const merged = {};
  for (const candidate of [
    normalizeObservedHistogram(level.opening_visible_shape_histogram),
    normalizeObservedHistogram(level.strictly_observed_shape_subtotal),
  ]) {
    for (const [shape, count] of Object.entries(candidate)) {
      merged[shape] = Math.max(merged[shape] ?? 0, count);
    }
  }
  return orderedHistogram(merged);
};

const allocateByLargestRemainder = (count, weightedShares) => {
  if (count === 0) return {};
  const positiveShares = Object.fromEntries(
    Object.entries(weightedShares).filter(([, share]) => share > 0),
  );
  if (Object.keys(positiveShares).length === 0) positiveShares.SINGLE = 1;
  const totalShare = Object.values(positiveShares).reduce((sum, value) => sum + value, 0);
  const quotas = Object.entries(positiveShares).map(([shape, share]) => {
    const exact = (share / totalShare) * count;
    return { shape, exact, floor: Math.floor(exact), remainder: exact - Math.floor(exact) };
  });
  let remaining = count - quotas.reduce((sum, quota) => sum + quota.floor, 0);
  quotas.sort(
    (a, b) =>
      b.remainder - a.remainder ||
      b.exact - a.exact ||
      SHAPE_ORDER.indexOf(a.shape) - SHAPE_ORDER.indexOf(b.shape),
  );
  for (let index = 0; index < quotas.length && remaining > 0; index += 1, remaining -= 1) {
    quotas[index].floor += 1;
  }
  return orderedHistogram(Object.fromEntries(quotas.map(({ shape, floor }) => [shape, floor])));
};

const resolveShapeTarget = ({ index, level, blockCount }) => {
  const competitorHistogram = exactHistogram(level);
  if (competitorHistogram !== "unclear") {
    if (histogramTotal(competitorHistogram) !== blockCount) {
      throw new Error(
        `${level.level_id}: exact competitor histogram sum ${histogramTotal(competitorHistogram)} ` +
          `does not match block count ${blockCount}.`,
      );
    }
    return {
      value: competitorHistogram,
      provenance: exactProvenance(level, "full_level_shape_histogram"),
    };
  }

  const anchors = findNeighborAnchors(index, exactHistogram);
  const observed = mergedObservedHistogram(level);
  const observedTotal = histogramTotal(observed);
  if (observedTotal > blockCount) {
    throw new Error(
      `${level.level_id}: observed shape subtotal ${observedTotal} exceeds target block count ${blockCount}.`,
    );
  }

  const weightedShares = {};
  for (const anchor of anchors) {
    const total = histogramTotal(anchor.value);
    for (const [shape, count] of Object.entries(anchor.value)) {
      weightedShares[shape] = (weightedShares[shape] ?? 0) + count / total / anchor.distance;
    }
  }
  const inferredRemainder = allocateByLargestRemainder(blockCount - observedTotal, weightedShares);
  const merged = { ...observed };
  for (const [shape, count] of Object.entries(inferredRemainder)) {
    merged[shape] = (merged[shape] ?? 0) + count;
  }
  const value = orderedHistogram(merged);
  const observedRule = observedTotal > 0
    ? `Preserve ${observedTotal} video-visible shape observations, normalizing ambiguous L-arm labels to L3 only in the design target; `
    : "No reliable full-shape subtotal was available; ";
  return {
    value,
    provenance: inferredProvenance(
      anchors,
      `${observedRule}allocate the remaining ${blockCount - observedTotal} pieces from inverse-distance-weighted ` +
        "shape shares of the nearest levels with complete histograms, using largest-remainder integer allocation.",
    ),
  };
};

const hash32 = (seed, row, col, step) => {
  let value = seed ^ Math.imul(row + 1, 0x45d9f3b) ^ Math.imul(col + 1, 0x27d4eb2d);
  value ^= Math.imul(step + 1, 0x165667b1);
  value ^= value >>> 16;
  value = Math.imul(value, 0x7feb352d);
  value ^= value >>> 15;
  return value >>> 0;
};

const neighborsOf = (row, col, rows, cols) =>
  [
    [row - 1, col],
    [row + 1, col],
    [row, col - 1],
    [row, col + 1],
  ].filter(([nextRow, nextCol]) =>
    nextRow >= 0 && nextRow < rows && nextCol >= 0 && nextCol < cols,
  );

const generateMaskCandidate = (rows, cols, playableCount, seed) => {
  if (playableCount === rows * cols) return Array.from({ length: rows }, () => "#".repeat(cols));
  if (playableCount < rows + cols - 1) {
    throw new Error(
      `A connected ${rows}x${cols} mask needs at least ${rows + cols - 1} cells to touch all four edges.`,
    );
  }
  const crossRow = seed % rows;
  const crossCol = Math.floor(seed / rows) % cols;
  const selected = new Set();
  for (let row = 0; row < rows; row += 1) selected.add(`${row},${crossCol}`);
  for (let col = 0; col < cols; col += 1) selected.add(`${crossRow},${col}`);
  const frontier = new Set();
  for (const key of selected) {
    const [row, col] = key.split(",").map(Number);
    for (const [nextRow, nextCol] of neighborsOf(row, col, rows, cols)) {
      const nextKey = `${nextRow},${nextCol}`;
      if (!selected.has(nextKey)) frontier.add(nextKey);
    }
  }

  while (selected.size < playableCount) {
    if (frontier.size === 0) throw new Error("Connected-mask frontier unexpectedly became empty.");
    const candidates = [...frontier].map((key) => {
      const [row, col] = key.split(",").map(Number);
      const selectedNeighborCount = neighborsOf(row, col, rows, cols).filter(([nextRow, nextCol]) =>
        selected.has(`${nextRow},${nextCol}`),
      ).length;
      const edgeAffinity = Number(row === 0 || row === rows - 1 || col === 0 || col === cols - 1);
      const score = selectedNeighborCount * 2 ** 36 + edgeAffinity * 2 ** 33 + hash32(seed, row, col, selected.size);
      return { key, row, col, score };
    });
    candidates.sort((a, b) => b.score - a.score || a.row - b.row || a.col - b.col);
    const chosen = candidates[0];
    frontier.delete(chosen.key);
    selected.add(chosen.key);
    for (const [row, col] of neighborsOf(chosen.row, chosen.col, rows, cols)) {
      const key = `${row},${col}`;
      if (!selected.has(key)) frontier.add(key);
    }
  }

  return Array.from({ length: rows }, (_, row) =>
    Array.from({ length: cols }, (_, col) => (selected.has(`${row},${col}`) ? "#" : ".")).join(""),
  );
};

const maskKey = (mask) => mask.join("/");
const maskIsExact = (level) =>
  level.board_mask_status === "exact" &&
  Array.isArray(level.board.playable_mask) &&
  level.board.playable_mask.every((row) => typeof row === "string" && !row.includes("?"));

const buildOriginalMask = (level, rows, cols, playableCount) => {
  const capacity = rows * cols;
  if (playableCount > capacity) {
    throw new Error(`${level.level_id}: playable count ${playableCount} exceeds ${rows}x${cols}.`);
  }
  if (playableCount === capacity) {
    return {
      mask: Array.from({ length: rows }, () => "#".repeat(cols)),
      originality_status: "full_rectangle_shape_locked_no_outline_variation_possible",
      competitor_mask_comparison: maskIsExact(level) ? "same_by_mathematical_necessity" : "unavailable",
      note: "Rows, columns, and playable-cell count fill the whole envelope, so a different logical outline is impossible without violating a locked quantity.",
    };
  }

  const maskOverride = DESIGN_MASK_OVERRIDES[levelNumber(level)];
  if (maskOverride) {
    return {
      mask: maskOverride,
      originality_status: "connected_shape_packable_outline_authored",
      competitor_mask_comparison:
        maskIsExact(level) && maskKey(maskOverride) !== maskKey(level.board.playable_mask)
          ? "different"
          : "reference_mask_not_exact",
      note: "Authored within the locked scalar geometry so the complete shape histogram has an exact non-overlapping placement.",
    };
  }

  const competitorKey = maskIsExact(level) ? maskKey(level.board.playable_mask) : null;
  for (let variant = 0; variant < 512; variant += 1) {
    const seed = levelNumber(level) * 1009 + variant * 9176 + 37;
    const mask = generateMaskCandidate(rows, cols, playableCount, seed);
    if (maskKey(mask) !== competitorKey) {
      return {
        mask,
        originality_status: "connected_original_outline_generated",
        competitor_mask_comparison: competitorKey ? "different" : "reference_mask_not_exact",
        note: competitorKey
          ? "The target mask is connected and differs from the exact competitor mask while preserving all locked scalar geometry."
          : "The target mask is connected; exact outline comparison is unavailable because the competitor mask is partial or missing.",
      };
    }
  }
  throw new Error(`${level.level_id}: failed to generate a mask different from the exact competitor mask.`);
};

const isConnectedMask = (mask) => {
  const rows = mask.length;
  const cols = mask[0].length;
  const cells = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      if (mask[row][col] === "#") cells.push([row, col]);
    }
  }
  if (cells.length === 0) return false;
  const visited = new Set([cells[0].join(",")]);
  const queue = [cells[0]];
  while (queue.length > 0) {
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

const maskTouchesEveryEnvelopeEdge = (mask) =>
  mask[0].includes("#") &&
  mask.at(-1).includes("#") &&
  mask.some((row) => row[0] === "#") &&
  mask.some((row) => row.at(-1) === "#");

const designPalette = (level, colorCount) => {
  const start = (level * 3 + 1) % DESIGN_COLORS.length;
  const stride = level % 2 === 0 ? 3 : 5;
  return Array.from(
    { length: colorCount },
    (_, index) => DESIGN_COLORS[(start + index * stride) % DESIGN_COLORS.length],
  );
};

const localVideoForLevel = (level) => {
  const number = levelNumber(level);
  if (number <= 10) return LOCAL_VIDEO_EVIDENCE[0];
  if (number <= 20) return LOCAL_VIDEO_EVIDENCE[1];
  return null;
};

const levels = source.levels.map((level, index) => {
  const number = levelNumber(level);
  const openingBlockLowerBound = Math.max(
    1,
    isPositiveInteger(level.opening_visible_block_count_min) ? level.opening_visible_block_count_min : 0,
    isPositiveInteger(level.counted_opening_shape_blocks) ? level.counted_opening_shape_blocks : 0,
    isPositiveInteger(level.proven_full_level_block_count_lower_bound)
      ? level.proven_full_level_block_count_lower_bound
      : 0,
    histogramTotal(mergedObservedHistogram(level)),
  );
  const openingColorLowerBound = isPositiveInteger(level.opening_visible_color_count)
    ? level.opening_visible_color_count
    : 1;

  const rows = resolveNumericTarget({
    index,
    level,
    field: "board.rows",
    sourceValue: level.board.rows,
    getter: (candidate) => exactNumeric(candidate, "board.rows", candidate.board.rows),
  });
  const cols = resolveNumericTarget({
    index,
    level,
    field: "board.cols",
    sourceValue: level.board.cols,
    getter: (candidate) => exactNumeric(candidate, "board.cols", candidate.board.cols),
  });
  const playableCellCount = resolveNumericTarget({
    index,
    level,
    field: "board.playable_cell_count",
    sourceValue: level.board.playable_cell_count,
    getter: (candidate) =>
      exactNumeric(candidate, "board.playable_cell_count", candidate.board.playable_cell_count),
  });
  const blockCount = resolveNumericTarget({
    index,
    level,
    field: "full_level_block_count",
    sourceValue: level.full_level_block_count,
    getter: (candidate) =>
      exactNumeric(candidate, "full_level_block_count", candidate.full_level_block_count),
    lowerBound: openingBlockLowerBound,
  });
  const colorCount = resolveNumericTarget({
    index,
    level,
    field: "full_level_color_count",
    sourceValue: level.full_level_color_count,
    getter: (candidate) =>
      exactNumeric(candidate, "full_level_color_count", candidate.full_level_color_count),
    lowerBound: openingColorLowerBound,
  });
  if (colorCount.value > DESIGN_COLORS.length) {
    throw new Error(`${level.level_id}: color count ${colorCount.value} exceeds the supported palette.`);
  }
  const shapeHistogram = resolveShapeTarget({ index, level, blockCount: blockCount.value });
  const fullLevelOccupiedCellCount = histogramCellArea(shapeHistogram.value);
  const originalMask = buildOriginalMask(
    level,
    rows.value,
    cols.value,
    playableCellCount.value,
  );
  const localVideo = localVideoForLevel(level);
  const inferredFields = [
    ["board.rows", rows.provenance],
    ["board.cols", cols.provenance],
    ["board.playable_cell_count", playableCellCount.provenance],
    ["full_level_block_count", blockCount.provenance],
    ["full_level_shape_histogram", shapeHistogram.provenance],
    ["full_level_color_count", colorCount.provenance],
  ]
    .filter(([, provenance]) => provenance.classification === "extrapolated_design_not_video_fact")
    .map(([field]) => field);

  return {
    level_id: level.level_id,
    status: "design_contract_pending_solver",
    evidence: {
      review_status: localVideo
        ? "local_video_and_youtube_dynamic_dataset_cross_reviewed"
        : "youtube_dynamic_recovery_dataset_only",
      local_video: localVideo,
      youtube: level.youtube_evidence,
      cross_review_note: localVideo
        ? `Lv${number <= 10 ? "1-10" : "11-20"} composition agrees with the applicable local continuous-play video and the dynamic YouTube recovery record.`
        : "No local-video cross-review was supplied for this level; unresolved fields remain unclear in competitor_reference.",
    },
    evidence_partition: {
      observed: {
        resolved_competitor_fields: [
          ...(exactNumeric(level, "board.rows", level.board.rows) !== "unclear" ? ["board.rows"] : []),
          ...(exactNumeric(level, "board.cols", level.board.cols) !== "unclear" ? ["board.cols"] : []),
          ...(exactNumeric(level, "board.playable_cell_count", level.board.playable_cell_count) !== "unclear"
            ? ["board.playable_cell_count"]
            : []),
          ...(exactNumeric(level, "full_level_block_count", level.full_level_block_count) !== "unclear"
            ? ["full_level_block_count"]
            : []),
          ...(exactHistogram(level) !== "unclear" ? ["full_level_shape_histogram"] : []),
          ...(exactNumeric(level, "full_level_color_count", level.full_level_color_count) !== "unclear"
            ? ["full_level_color_count"]
            : []),
        ],
        unresolved_competitor_fields: [
          ...(exactNumeric(level, "board.rows", level.board.rows) === "unclear" ? ["board.rows"] : []),
          ...(exactNumeric(level, "board.cols", level.board.cols) === "unclear" ? ["board.cols"] : []),
          ...(exactNumeric(level, "board.playable_cell_count", level.board.playable_cell_count) === "unclear"
            ? ["board.playable_cell_count"]
            : []),
          ...(level.core_unclear_fields ?? []),
        ],
        partial_shape_observation: mergedObservedHistogram(level),
      },
      inferred: {
        fields: inferredFields,
        classification: inferredFields.length > 0 ? "extrapolated_design_not_video_fact" : null,
        requires_video_confirmation: inferredFields.length > 0,
      },
    },
    competitor_reference: {
      board: {
        rows: exactNumeric(level, "board.rows", level.board.rows),
        cols: exactNumeric(level, "board.cols", level.board.cols),
        playable_cell_count: exactNumeric(
          level,
          "board.playable_cell_count",
          level.board.playable_cell_count,
        ),
        playable_mask: maskIsExact(level) ? level.board.playable_mask : "unclear",
        observed_partial_playable_mask:
          !maskIsExact(level) && Array.isArray(level.board.playable_mask)
            ? level.board.playable_mask
            : null,
        board_mask_status: level.board_mask_status,
      },
      full_level_block_count: exactNumeric(
        level,
        "full_level_block_count",
        level.full_level_block_count,
      ),
      full_level_shape_histogram: exactHistogram(level),
      full_level_occupied_cell_count:
        exactHistogram(level) === "unclear" || !isPositiveInteger(level.full_level_occupied_cell_count)
          ? "unclear"
          : level.full_level_occupied_cell_count,
      full_level_color_count: exactNumeric(
        level,
        "full_level_color_count",
        level.full_level_color_count,
      ),
      visible_evidence_when_full_value_unclear: {
        opening_visible_block_count_min: level.opening_visible_block_count_min,
        opening_visible_shape_histogram: level.opening_visible_shape_histogram,
        strictly_observed_shape_subtotal: level.strictly_observed_shape_subtotal,
        opening_visible_color_count: level.opening_visible_color_count,
      },
      mechanisms_from_opening_snapshot: level.mechanisms_from_opening_snapshot,
      core_unclear_fields: level.core_unclear_fields,
      evidence_status: level.evidence_status,
    },
    our_design_target: {
      generation_locks: [
        "board.rows",
        "board.cols",
        "board.playable_cell_count",
        "board.playable_mask",
        "full_level_block_count",
        "full_level_shape_histogram",
        "full_level_color_count",
        "design_palette",
      ],
      board: {
        rows: rows.value,
        cols: cols.value,
        playable_cell_count: playableCellCount.value,
        playable_mask: originalMask.mask,
        connected_component_count: 1,
        originality_status: originalMask.originality_status,
        competitor_mask_comparison: originalMask.competitor_mask_comparison,
        note: originalMask.note,
      },
      full_level_block_count: blockCount.value,
      full_level_shape_histogram: shapeHistogram.value,
      full_level_occupied_cell_count: fullLevelOccupiedCellCount,
      requires_staged_reveal: fullLevelOccupiedCellCount > playableCellCount.value,
      full_level_color_count: colorCount.value,
      design_palette: designPalette(number, colorCount.value),
      target_d1_difficulty: level.our_game_design_targets.target_d1_difficulty,
      recommended_minimum_reposition_overhead:
        level.our_game_design_targets.recommended_minimum_reposition_overhead,
      field_provenance: {
        "board.rows": rows.provenance,
        "board.cols": cols.provenance,
        "board.playable_cell_count": playableCellCount.provenance,
        "board.playable_mask": {
          classification: "original_design_not_competitor_fact",
          anchors: [{
            level_id: level.level_id,
            rows: rows.value,
            cols: cols.value,
            playable_cell_count: playableCellCount.value,
          }],
          rule:
            playableCellCount.value === rows.value * cols.value
              ? "A full rectangular envelope has only one possible mask; preserve it and record the outline-variation conflict."
              : "Deterministically grow one connected component to the locked playable-cell count and reject the exact competitor mask when that mask is known.",
          confidence: "deterministic_contract_value",
          requires_video_confirmation: false,
        },
        full_level_block_count: blockCount.provenance,
        full_level_shape_histogram: shapeHistogram.provenance,
        full_level_color_count: colorCount.provenance,
        design_palette: {
          classification: "original_design_not_competitor_fact",
          anchors: [{ level_id: level.level_id, color_count: colorCount.value }],
          rule: "Select a deterministic unique rotation through the eight project-supported colors; only the locked color-count matches the competitor.",
          confidence: "deterministic_contract_value",
          requires_video_confirmation: false,
        },
      },
      solver_acceptance: {
        status: "pending_solver",
        composition_must_match_contract_exactly: true,
        board_mask_must_match_contract_exactly: true,
        minimum_reposition_overhead:
          level.our_game_design_targets.recommended_minimum_reposition_overhead,
        target_d1_calibrated_score:
          level.our_game_design_targets.target_d1_difficulty.calibrated_score,
      },
    },
  };
});

const countReferenceUnclear = (field) =>
  levels.filter((level) => level.competitor_reference[field] === "unclear").length;
const fullRectangleConflicts = levels.filter(
  (level) =>
    level.our_design_target.board.originality_status ===
    "full_rectangle_shape_locked_no_outline_variation_possible",
).length;
const inferredLevelCount = levels.filter((level) =>
  Object.values(level.our_design_target.field_provenance).some(
    (provenance) => provenance.classification === "extrapolated_design_not_video_fact",
  ),
).length;

const contract = {
  title: "Block Out! Lv1-100 竞品数量同构原创关卡设计合同 v4",
  generated_on: source.generated_on,
  status: "design_contract_pending_solver",
  source_dataset: {
    path: SOURCE_RELATIVE_PATH,
    sha256: crypto.createHash("sha256").update(sourceBuffer).digest("hex").toUpperCase(),
    source_status: source.status,
  },
  local_video_cross_review: {
    scope: "Lv001-Lv020",
    status: "cross_reviewed_against_applicable_local_continuous_play_video",
    videos: LOCAL_VIDEO_EVIDENCE,
    caveat: "Lv020 scalar geometry and composition are locked, but its competitor playable mask remains partial/unclear.",
  },
  contract_rules: {
    competitor_reference:
      "Only resolved video/dynamic-recovery facts are copied. Every unresolved source field remains the literal string unclear.",
    our_design_target:
      "Every generation input is concrete. Resolved quantities are copied; unresolved quantities are extrapolated from neighboring resolved levels and are never relabeled as video facts.",
    geometry:
      "Rows, columns, and playable-cell count are locked. Non-full boards receive a deterministic connected outline different from the competitor mask when exact comparison is possible.",
    full_rectangle_conflict:
      "When playable cells equal rows×cols, changing the logical outline is mathematically impossible; the full rectangle is retained and explicitly flagged.",
    palette:
      "The number of colors is locked, while the concrete project-supported colors may differ.",
    solver:
      "This artifact is neither applied nor solved. A level is acceptable only after exact composition checks and solver/playtest validation satisfy its reposition and D1 targets.",
  },
  summary: {
    level_count: levels.length,
    locally_cross_reviewed_level_count: 20,
    competitor_unclear_block_count_levels: countReferenceUnclear("full_level_block_count"),
    competitor_unclear_shape_histogram_levels: countReferenceUnclear(
      "full_level_shape_histogram",
    ),
    competitor_unclear_color_count_levels: countReferenceUnclear("full_level_color_count"),
    levels_with_extrapolated_design_fields: inferredLevelCount,
    target_masks_connected: levels.length,
    full_rectangle_outline_conflicts: fullRectangleConflicts,
    levels_requiring_staged_reveal: levels.filter(
      (level) => level.our_design_target.requires_staged_reveal,
    ).length,
    applied_level_count: 0,
    solver_validated_level_count: 0,
  },
  levels,
};

const assertContract = () => {
  if (contract.status !== "design_contract_pending_solver" || levels.length !== 100) {
    throw new Error("Contract root status or level count is invalid.");
  }
  for (const [index, level] of levels.entries()) {
    const expectedId = `Lv${String(index + 1).padStart(3, "0")}`;
    if (level.level_id !== expectedId || level.status !== "design_contract_pending_solver") {
      throw new Error(`${expectedId}: level id/status mismatch.`);
    }
    const target = level.our_design_target;
    const { rows, cols, playable_cell_count: playableCount, playable_mask: mask } = target.board;
    if (!isPositiveInteger(rows) || !isPositiveInteger(cols) || !isPositiveInteger(playableCount)) {
      throw new Error(`${level.level_id}: unresolved target geometry.`);
    }
    if (
      mask.length !== rows ||
      mask.some((row) => row.length !== cols || /[^#.]/u.test(row)) ||
      mask.join("").split("#").length - 1 !== playableCount ||
      !isConnectedMask(mask) ||
      !maskTouchesEveryEnvelopeEdge(mask)
    ) {
      throw new Error(`${level.level_id}: target mask dimensions/count/connectivity/envelope failed.`);
    }
    const referenceMask = level.competitor_reference.board.playable_mask;
    if (
      playableCount < rows * cols &&
      Array.isArray(referenceMask) &&
      maskKey(mask) === maskKey(referenceMask)
    ) {
      throw new Error(`${level.level_id}: non-full target mask duplicates the competitor mask.`);
    }
    if (
      !isPositiveInteger(target.full_level_block_count) ||
      target.full_level_block_count <
        (isPositiveInteger(source.levels[index].proven_full_level_block_count_lower_bound)
          ? source.levels[index].proven_full_level_block_count_lower_bound
          : 0) ||
      histogramTotal(target.full_level_shape_histogram) !== target.full_level_block_count
    ) {
      throw new Error(`${level.level_id}: target block lower-bound/count/histogram mismatch.`);
    }
    if (
      target.full_level_occupied_cell_count !== histogramCellArea(target.full_level_shape_histogram) ||
      target.requires_staged_reveal !==
        (target.full_level_occupied_cell_count > target.board.playable_cell_count)
    ) {
      throw new Error(`${level.level_id}: target occupied-cell total/staging flag mismatch.`);
    }
    const observedHistogram = mergedObservedHistogram(source.levels[index]);
    for (const [shape, count] of Object.entries(observedHistogram)) {
      if ((target.full_level_shape_histogram[shape] ?? 0) < count) {
        throw new Error(`${level.level_id}: target histogram loses observed ${shape}×${count}.`);
      }
    }
    if (
      !isPositiveInteger(target.full_level_color_count) ||
      target.design_palette.length !== target.full_level_color_count ||
      new Set(target.design_palette).size !== target.full_level_color_count
    ) {
      throw new Error(`${level.level_id}: target color count/palette mismatch.`);
    }
    if (
      target.target_d1_difficulty.calibrated_score !==
        source.levels[index].our_game_design_targets.target_d1_difficulty.calibrated_score ||
      target.recommended_minimum_reposition_overhead !==
        source.levels[index].our_game_design_targets.recommended_minimum_reposition_overhead
    ) {
      throw new Error(`${level.level_id}: difficulty/reposition target drifted from source.`);
    }
  }
};

const csvEscape = (value) => {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return `"${text.replaceAll('"', '""')}"`;
};
const csvHeaders = [
  "level_id",
  "status",
  "evidence_review_status",
  "competitor_rows",
  "competitor_cols",
  "competitor_playable_cell_count",
  "competitor_board_mask_status",
  "competitor_full_level_block_count",
  "competitor_full_level_shape_histogram",
  "competitor_full_level_occupied_cell_count",
  "competitor_full_level_color_count",
  "target_rows",
  "target_cols",
  "target_playable_cell_count",
  "target_playable_mask",
  "target_mask_originality_status",
  "target_full_level_block_count",
  "target_full_level_shape_histogram",
  "target_full_level_occupied_cell_count",
  "target_requires_staged_reveal",
  "target_full_level_color_count",
  "target_design_palette",
  "target_d1_calibrated_score",
  "target_d1_band",
  "recommended_minimum_reposition_overhead",
  "extrapolated_fields",
  "solver_status",
];
const csvRows = levels.map((level) => {
  const target = level.our_design_target;
  const extrapolatedFields = Object.entries(target.field_provenance)
    .filter(([, provenance]) => provenance.classification === "extrapolated_design_not_video_fact")
    .map(([field]) => field);
  return [
    level.level_id,
    level.status,
    level.evidence.review_status,
    level.competitor_reference.board.rows,
    level.competitor_reference.board.cols,
    level.competitor_reference.board.playable_cell_count,
    level.competitor_reference.board.board_mask_status,
    level.competitor_reference.full_level_block_count,
    level.competitor_reference.full_level_shape_histogram,
    level.competitor_reference.full_level_occupied_cell_count,
    level.competitor_reference.full_level_color_count,
    target.board.rows,
    target.board.cols,
    target.board.playable_cell_count,
    target.board.playable_mask.join("/"),
    target.board.originality_status,
    target.full_level_block_count,
    target.full_level_shape_histogram,
    target.full_level_occupied_cell_count,
    target.requires_staged_reveal,
    target.full_level_color_count,
    target.design_palette,
    target.target_d1_difficulty.calibrated_score,
    target.target_d1_difficulty.band,
    target.recommended_minimum_reposition_overhead,
    extrapolatedFields,
    target.solver_acceptance.status,
  ].map(csvEscape).join(",");
});

const histogramText = (histogram) =>
  histogram === "unclear"
    ? "unclear"
    : Object.entries(histogram).map(([shape, count]) => `${shape}×${count}`).join("；");
const markdownRows = levels.map((level) => {
  const target = level.our_design_target;
  const inferred = Object.entries(target.field_provenance)
    .filter(([, provenance]) => provenance.classification === "extrapolated_design_not_video_fact")
    .map(([field]) => field)
    .join("、") || "无";
  return `| ${level.level_id} | ${target.board.rows}×${target.board.cols}/${target.board.playable_cell_count} | ${target.board.playable_mask.join("/")} | ${target.full_level_block_count} | ${histogramText(target.full_level_shape_histogram)} | ${target.full_level_occupied_cell_count}${target.requires_staged_reveal ? "（需分批）" : ""} | ${target.full_level_color_count} (${target.design_palette.join("/")}) | ${target.target_d1_difficulty.calibrated_score} | ${target.recommended_minimum_reposition_overhead ?? "null"} | ${inferred} | pending |`;
});
const inferredDetails = levels
  .filter((level) =>
    Object.values(level.our_design_target.field_provenance).some(
      (provenance) => provenance.classification === "extrapolated_design_not_video_fact",
    ),
  )
  .map((level) => {
    const fields = Object.entries(level.our_design_target.field_provenance)
      .filter(([, provenance]) => provenance.classification === "extrapolated_design_not_video_fact")
      .map(([field, provenance]) =>
        `  - \`${field}\`：anchors=${provenance.anchors.map((anchor) => anchor.level_id).join("/")}；confidence=${provenance.confidence}；requires_video_confirmation=${provenance.requires_video_confirmation}；${provenance.rule}`,
      )
      .join("\n");
    return `- ${level.level_id}\n${fields}`;
  });

const markdown = `# Block Out! Lv1-100 竞品数量同构原创关卡设计合同 v4

- 状态：\`design_contract_pending_solver\`（尚未应用、尚未求解）
- 源数据：\`${SOURCE_RELATIVE_PATH}\`
- 源数据 SHA-256：\`${contract.source_dataset.sha256}\`
- Lv1-10 本地视频 SHA-256：\`${LOCAL_VIDEO_EVIDENCE[0].sha256}\`
- Lv11-20 本地视频 SHA-256：\`${LOCAL_VIDEO_EVIDENCE[1].sha256}\`
- 竞品不明确：块数 ${contract.summary.competitor_unclear_block_count_levels} 关；完整形状 ${contract.summary.competitor_unclear_shape_histogram_levels} 关；颜色数 ${contract.summary.competitor_unclear_color_count_levels} 关
- 我方含推导字段：${contract.summary.levels_with_extrapolated_design_fields} 关；所有推导均标为 \`extrapolated_design_not_video_fact\`
- 原创 mask：100/100 连通；${contract.summary.full_rectangle_outline_conflicts} 个满矩形因数量锁定无法改变逻辑轮廓，已逐关标注冲突
- 全流程累计色块占格已计算；${contract.summary.levels_requiring_staged_reveal} 关累计占格大于棋盘容量，正式生成时必须使用隐藏仓/生成器分批出现

## 规则

1. 竞品明确的 rows、cols、可玩格数、总块数、完整形状直方图、颜色种类数原值锁定。
2. 竞品不明确字段在 \`competitor_reference\` 中保持 \`unclear\`；我方目标使用相邻明确关推导，并保留 anchors、rule、confidence、requires_video_confirmation。
3. 非满矩形棋盘生成确定的原创连通 mask；满矩形在三项数量同时锁定时无法改变逻辑轮廓。
4. 颜色具体取值可变化，但 \`design_palette\` 的唯一颜色数严格等于竞品颜色种类数。
5. D1 和最低必要腾挪仅是求解验收目标；本合同不声明任何关卡已经生成、应用或通过求解。

## 100关目标

| 关卡 | 棋盘 rows×cols/格数 | 原创 playable mask (#可玩) | 总块数 | 完整形状直方图 | 色块累计占格 | 颜色数与设计色盘 | D1 | 最低腾挪 | 推导字段 | 求解 |
|---|---:|---|---:|---|---:|---|---:|---:|---|---|
${markdownRows.join("\n")}

## 推导字段证据链

${inferredDetails.join("\n") || "无"}
`;

assertContract();
fs.mkdirSync(OUTPUT_DIR, { recursive: true });
fs.writeFileSync(OUTPUT_JSON, `${JSON.stringify(contract, null, 2)}\n`, "utf8");
fs.writeFileSync(OUTPUT_CSV, `${csvHeaders.map(csvEscape).join(",")}\n${csvRows.join("\n")}\n`, "utf8");
fs.writeFileSync(OUTPUT_MD, markdown, "utf8");

console.log(
  JSON.stringify(
    {
      status: contract.status,
      source_sha256: contract.source_dataset.sha256,
      outputs: [OUTPUT_JSON, OUTPUT_CSV, OUTPUT_MD],
      summary: contract.summary,
      validation: "PASS",
    },
    null,
    2,
  ),
);
