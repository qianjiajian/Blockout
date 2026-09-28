import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = resolve(root, "deliverables/level-generation-blueprint");
const contractPath = resolve(outputDir, "blockout-lv101-lv200-video-parity-design-contract-v1.json");
const candidatePath = resolve(outputDir, "blockout-lv101-lv200-video-parity-formal-candidates-v1.json");
const auditPath = resolve(outputDir, "blockout-lv101-lv200-video-parity-formal-candidates-v1-audit.json");
const markdownPath = resolve(outputDir, "blockout-lv101-lv200-video-parity-formal-candidates-v1.md");

const SHAPE_VARIANTS = {
  SINGLE: [[[0, 0]]],
  H2: [[[0, 0], [1, 0]]],
  V2: [[[0, 0], [0, 1]]],
  H3: [[[0, 0], [1, 0], [2, 0]]],
  V3: [[[0, 0], [0, 1], [0, 2]]],
  H4: [[[0, 0], [1, 0], [2, 0], [3, 0]]],
  V4: [[[0, 0], [0, 1], [0, 2], [0, 3]]],
  SQ2: [[[0, 0], [1, 0], [0, 1], [1, 1]]],
  RECT2X3: [
    [[0, 0], [1, 0], [0, 1], [1, 1], [0, 2], [1, 2]],
    [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]],
  ],
  SQ3: [[
    [0, 0], [1, 0], [2, 0],
    [0, 1], [1, 1], [2, 1],
    [0, 2], [1, 2], [2, 2],
  ]],
  L3: [
    [[0, 0], [0, 1], [1, 1]], [[0, 0], [1, 0], [0, 1]],
    [[0, 0], [1, 0], [1, 1]], [[1, 0], [0, 1], [1, 1]],
  ],
  L4: [
    [[0, 0], [0, 1], [0, 2], [1, 2]], [[0, 0], [1, 0], [2, 0], [0, 1]],
    [[0, 0], [1, 0], [1, 1], [1, 2]], [[2, 0], [0, 1], [1, 1], [2, 1]],
  ],
  L5: [
    [[0, 0], [0, 1], [0, 2], [0, 3], [1, 3]], [[0, 0], [1, 0], [2, 0], [3, 0], [0, 1]],
    [[0, 0], [1, 0], [1, 1], [1, 2], [1, 3]], [[3, 0], [0, 1], [1, 1], [2, 1], [3, 1]],
  ],
  T4: [
    [[0, 0], [1, 0], [2, 0], [1, 1]], [[1, 0], [0, 1], [1, 1], [1, 2]],
    [[1, 0], [0, 1], [1, 1], [2, 1]], [[0, 0], [0, 1], [1, 1], [0, 2]],
  ],
  T5: [
    [[0, 0], [1, 0], [2, 0], [1, 1], [1, 2]], [[0, 0], [0, 1], [1, 1], [2, 1], [0, 2]],
    [[1, 0], [1, 1], [0, 2], [1, 2], [2, 2]], [[2, 0], [0, 1], [1, 1], [2, 1], [2, 2]],
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
  S4: [
    [[1, 0], [2, 0], [0, 1], [1, 1]], [[0, 0], [0, 1], [1, 1], [1, 2]],
  ],
  CROSS5: [[[1, 0], [0, 1], [1, 1], [2, 1], [1, 2]]],
};
const SHAPE_ORDER = Object.keys(SHAPE_VARIANTS);
const SHAPE_AREA = Object.fromEntries(SHAPE_ORDER.map((shape) => [shape, SHAPE_VARIANTS[shape][0].length]));

const stripBom = (value) => value.replace(/^\uFEFF/, "");
const readJson = async (path) => JSON.parse(stripBom(await readFile(path, "utf8")));
const sha256 = async (path) => createHash("sha256").update(await readFile(path)).digest("hex").toUpperCase();
const rel = (path) => relative(root, path).replaceAll("\\", "/");
const clone = (value) => structuredClone(value);
const keyOf = (x, y) => `${x},${y}`;
const histogramOf = (blocks) => Object.fromEntries(SHAPE_ORDER.flatMap((shape) => {
  const count = blocks.filter((block) => block.shape_id === shape).length;
  return count ? [[shape, count]] : [];
}));
const canonical = (value) => {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
};
const sameJson = (left, right) => JSON.stringify(canonical(left)) === JSON.stringify(canonical(right));
const KNOWN_COLORS = new Set(["red", "yellow", "blue", "green", "purple", "orange", "cyan", "pink"]);
const colorsIn = (value, result = new Set()) => {
  if (Array.isArray(value)) {
    for (const item of value) colorsIn(item, result);
  } else if (value && typeof value === "object") {
    for (const item of Object.values(value)) colorsIn(item, result);
  } else if (typeof value === "string" && KNOWN_COLORS.has(value.toLowerCase())) {
    result.add(value.toLowerCase());
  }
  return result;
};
const maskKey = (mask) => mask.join("/");
const maskCellCount = (mask) => mask.reduce((sum, row) => sum + [...row].filter((cell) => cell === "#").length, 0);
const maskComponentCount = (mask) => {
  const rows = mask.length;
  const cols = mask[0]?.length ?? 0;
  const remaining = new Set(mask.flatMap((row, y) => [...row].flatMap((cell, x) => cell === "#" ? [keyOf(x, y)] : [])));
  let count = 0;
  while (remaining.size) {
    count += 1;
    const first = remaining.values().next().value;
    remaining.delete(first);
    const queue = [first];
    while (queue.length) {
      const [x, y] = queue.shift().split(",").map(Number);
      for (const [nextX, nextY] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
        const next = keyOf(nextX, nextY);
        if (remaining.delete(next)) queue.push(next);
      }
    }
  }
  return count;
};
const topologyComponentMap = (target) => {
  if (!target.board.uses_explicit_component_topology) return null;
  const components = target.board.target_component_layout;
  if (!Array.isArray(components) || components.length < 2) return null;
  const result = new Map();
  for (const [componentIndex, component] of components.entries()) {
    const componentRows = Number.isInteger(component?.rows) ? component.rows : component?.mask?.length;
    const componentCols = Number.isInteger(component?.cols) ? component.cols : component?.mask?.[0]?.length;
    const origin = component?.target_origin;
    if (!Number.isInteger(origin?.x) || !Number.isInteger(origin?.y)) return null;
    const componentMask = Array.isArray(component?.mask)
      ? component.mask
      : Array.from({ length: componentRows ?? 0 }, () => "#".repeat(componentCols ?? 0));
    for (let y = 0; y < componentMask.length; y += 1) for (let x = 0; x < componentMask[y].length; x += 1) {
      if (componentMask[y][x] !== "#") continue;
      const globalX = origin.x + x;
      const globalY = origin.y + y;
      const key = keyOf(globalX, globalY);
      if (result.has(key)) return null;
      result.set(key, {
        component_index: componentIndex,
        component_name: component.source_name ?? `component-${componentIndex + 1}`,
        local_x: x,
        local_y: y,
      });
    }
  }
  return result;
};
const cellInRegion = (x, y, region) => x >= region.x && x < region.x + region.w
  && y >= region.y && y < region.y + region.h;
const validRegionShape = (region) => Number.isInteger(region?.x) && Number.isInteger(region?.y)
  && Number.isInteger(region?.w) && region.w > 0
  && Number.isInteger(region?.h) && region.h > 0;
const sourceRegionWithinBoardOrComponent = (region, board) => {
  if (!validRegionShape(region)) return false;
  if (region.component) {
    const component = board.source_component_geometry?.find((entry) => entry.name === region.component);
    return Boolean(component)
      && region.x >= 0 && region.y >= 0
      && region.x + region.w <= component.cols
      && region.y + region.h <= component.rows;
  }
  return region.x >= 0 && region.y >= 0
    && region.x + region.w <= board.cols
    && region.y + region.h <= board.rows;
};
const targetRegionWithinBoardOrComponent = (region, board) => {
  if (!validRegionShape(region)) return false;
  if (region.component) {
    const component = board.target_component_layout?.find((entry) => entry.source_name === region.component);
    return Boolean(component)
      && region.x >= component.target_origin.x
      && region.y >= component.target_origin.y
      && region.x + region.w <= component.target_origin.x + component.cols
      && region.y + region.h <= component.target_origin.y + component.rows;
  }
  return region.x >= 0 && region.y >= 0
    && region.x + region.w <= board.cols
    && region.y + region.h <= board.rows;
};
const stageMask = (baseMask, target, stage, topologyMap) => {
  const allowedComponents = new Set(stage.allowed_components ?? []);
  const includeRegions = /^enforced/.test(stage.region_constraint_status ?? "")
    && Array.isArray(stage.target_regions) && stage.target_regions.length
    ? stage.target_regions
    : null;
  const excludedRegions = stage.region_exclusion_complete
    && Array.isArray(stage.excluded_target_regions)
    && stage.excluded_target_regions.length
    ? stage.excluded_target_regions
    : null;
  return baseMask.map((row, y) => [...row].map((cell, x) => {
    if (cell !== "#") return ".";
    const component = topologyMap?.get(keyOf(x, y));
    if (allowedComponents.size && !allowedComponents.has(component?.component_name)) return ".";
    if (includeRegions && !includeRegions.some((region) => cellInRegion(x, y, region))) return ".";
    if (excludedRegions && excludedRegions.some((region) => cellInRegion(x, y, region))) return ".";
    return "#";
  }).join(""));
};
const hash32 = (seed, a, b, c = 0) => {
  let value = seed ^ Math.imul(a + 1, 0x45d9f3b) ^ Math.imul(b + 1, 0x27d4eb2d) ^ Math.imul(c + 1, 0x165667b1);
  value ^= value >>> 16;
  value = Math.imul(value, 0x7feb352d);
  value ^= value >>> 15;
  return value >>> 0;
};
const normalizeShape = (shape) => {
  const minX = Math.min(...shape.map(([x]) => x));
  const minY = Math.min(...shape.map(([, y]) => y));
  return shape.map(([x, y]) => [x - minX, y - minY])
    .sort((left, right) => left[1] - right[1] || left[0] - right[0]);
};

const placementsByShape = (mask, seed, topologyMap = null) => {
  const rows = mask.length;
  const cols = mask[0]?.length ?? 0;
  const indexByCell = new Map();
  let bitIndex = 0;
  for (let y = 0; y < rows; y += 1) for (let x = 0; x < cols; x += 1) {
    if (mask[y][x] === "#") indexByCell.set(keyOf(x, y), bitIndex++);
  }
  return Object.fromEntries(SHAPE_ORDER.map((shapeId, shapeOrder) => {
    const placements = [];
    const seen = new Set();
    for (const rawShape of SHAPE_VARIANTS[shapeId]) {
      const shape = normalizeShape(rawShape);
      const signature = shape.map(([x, y]) => keyOf(x, y)).join("|");
      if (seen.has(signature)) continue;
      seen.add(signature);
      const width = Math.max(...shape.map(([x]) => x)) + 1;
      const height = Math.max(...shape.map(([, y]) => y)) + 1;
      for (let y = 0; y <= rows - height; y += 1) for (let x = 0; x <= cols - width; x += 1) {
        const cells = shape.map(([dx, dy]) => [x + dx, y + dy]);
        if (!cells.every(([cellX, cellY]) => indexByCell.has(keyOf(cellX, cellY)))) continue;
        if (topologyMap) {
          const components = new Set(cells.map(([cellX, cellY]) => (
            topologyMap.get(keyOf(cellX, cellY))?.component_name
          )));
          if (components.has(undefined) || components.size !== 1) continue;
        }
        const bitMask = cells.reduce((bits, [cellX, cellY]) => (
          bits | (1n << BigInt(indexByCell.get(keyOf(cellX, cellY))))
        ), 0n);
        placements.push({ x, y, shape, cells, bit_mask: bitMask });
      }
    }
    placements.sort((left, right) => {
      const leftScore = hash32(seed, left.x, left.y, shapeOrder);
      const rightScore = hash32(seed, right.x, right.y, shapeOrder);
      return leftScore - rightScore || left.y - right.y || left.x - right.x;
    });
    return [shapeId, placements];
  }));
};

const packStage = (mask, histogram, seed, topologyMap = null) => {
  const candidatesByShape = placementsByShape(mask, seed, topologyMap);
  const counts = Object.fromEntries(SHAPE_ORDER.map((shapeId) => [shapeId, histogram?.[shapeId] ?? 0]));
  if (SHAPE_ORDER.some((shapeId) => counts[shapeId] > 0 && candidatesByShape[shapeId].length === 0)) {
    return { placements: null, search_nodes: 0, reason: "shape_has_no_legal_placement" };
  }
  const playableCells = mask.flatMap((row, y) => [...row].flatMap((cell, x) => cell === "#" ? [[x, y]] : []));
  const bitByCell = new Map(playableCells.map(([x, y], index) => [keyOf(x, y), 1n << BigInt(index)]));
  const candidatesByCell = new Map(playableCells.map(([x, y]) => [keyOf(x, y), []]));
  for (const shapeId of SHAPE_ORDER) for (const candidate of candidatesByShape[shapeId]) {
    for (const [x, y] of candidate.cells) candidatesByCell.get(keyOf(x, y)).push({ shapeId, candidate });
  }
  const chosen = [];
  let nodes = 0;
  const nodeLimit = 2_000_000;
  const dead = new Set();
  const initialPieceCount = Object.values(counts).reduce((sum, count) => sum + count, 0);
  const initialArea = Object.entries(counts).reduce((sum, [shapeId, count]) => sum + SHAPE_AREA[shapeId] * count, 0);
  if (initialArea > playableCells.length) {
    return { placements: null, search_nodes: 0, reason: "stage_piece_area_exceeds_playable_cells" };
  }
  const search = (occupied, unavailableCount, remainingPieceCount, remainingArea) => {
    nodes += 1;
    if (nodes > nodeLimit) return false;
    if (remainingPieceCount === 0) return true;
    if (playableCells.length - unavailableCount < remainingArea) return false;
    const countKey = SHAPE_ORDER.map((shapeId) => counts[shapeId]).join("");
    const stateKey = `${countKey}:${occupied.toString(16)}`;
    if (dead.has(stateKey)) return false;
    let selectedCell = null;
    let selectedOptions = null;
    for (const [x, y] of playableCells) {
      const bit = bitByCell.get(keyOf(x, y));
      if ((occupied & bit) !== 0n) continue;
      const options = candidatesByCell.get(keyOf(x, y)).filter(({ shapeId, candidate }) => (
        counts[shapeId] > 0 && (occupied & candidate.bit_mask) === 0n
      ));
      if (!selectedOptions || options.length < selectedOptions.length) {
        selectedCell = [x, y];
        selectedOptions = options;
        if (options.length === 0) break;
      }
    }
    if (!selectedCell) return false;
    selectedOptions.sort((left, right) => (
      SHAPE_AREA[right.shapeId] - SHAPE_AREA[left.shapeId]
      || SHAPE_ORDER.indexOf(left.shapeId) - SHAPE_ORDER.indexOf(right.shapeId)
      || left.candidate.y - right.candidate.y
      || left.candidate.x - right.candidate.x
    ));
    for (const { shapeId, candidate } of selectedOptions) {
      counts[shapeId] -= 1;
      chosen.push({ shape_id: shapeId, ...candidate });
      if (search(
        occupied | candidate.bit_mask,
        unavailableCount + SHAPE_AREA[shapeId],
        remainingPieceCount - 1,
        remainingArea - SHAPE_AREA[shapeId],
      )) return true;
      chosen.pop();
      counts[shapeId] += 1;
    }
    // The selected playable cell may intentionally be empty in a sparse opening.
    const selectedBit = bitByCell.get(keyOf(...selectedCell));
    if (playableCells.length - (unavailableCount + 1) >= remainingArea
      && search(occupied | selectedBit, unavailableCount + 1, remainingPieceCount, remainingArea)) return true;
    if (dead.size < 250_000) dead.add(stateKey);
    return false;
  };
  const success = search(0n, 0, initialPieceCount, initialArea);
  return {
    placements: success ? chosen.map(({ bit_mask, ...placement }) => placement) : null,
    search_nodes: nodes,
    reason: success ? null : nodes > nodeLimit ? "search_node_limit" : "no_non_overlapping_layout",
  };
};

const derivePackingAwareMask = (target, levelNumber) => {
  const originalMask = target.board.playable_mask;
  const topologyMap = topologyComponentMap(target);
  const firstPass = target.stage_partitions.map((stage, stageIndex) => (
    packStage(
      stageMask(originalMask, target, stage, topologyMap),
      stage.shape_histogram,
      levelNumber * 1009 + stageIndex * 37,
      topologyMap,
    )
  ));
  if (firstPass.every((result) => result.placements)) {
    return { mask: originalMask, packed: firstPass, adjustment: null };
  }
  if (target.board.uses_explicit_component_topology) {
    return { mask: originalMask, packed: firstPass, adjustment: null };
  }
  const rows = target.board.rows;
  const cols = target.board.cols;
  const playableCount = target.board.playable_cell_count;
  const fullMask = Array.from({ length: rows }, () => "#".repeat(cols));
  for (let attempt = 0; attempt < 160; attempt += 1) {
    const fullPacked = target.stage_partitions.map((stage, stageIndex) => (
      packStage(
        stageMask(fullMask, target, stage, topologyMap),
        stage.shape_histogram,
        levelNumber * 100_003 + attempt * 1009 + stageIndex * 37,
        topologyMap,
      )
    ));
    if (!fullPacked.every((result) => result.placements)) continue;
    const selected = new Set(fullPacked.flatMap((result) => result.placements.flatMap((placement) => (
      placement.cells.map(([x, y]) => keyOf(x, y))
    ))));
    if (selected.size > playableCount) continue;
    while (selected.size < playableCount) {
      const candidates = [];
      for (let y = 0; y < rows; y += 1) for (let x = 0; x < cols; x += 1) {
        const key = keyOf(x, y);
        if (selected.has(key)) continue;
        const contacts = [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]
          .filter(([nextX, nextY]) => selected.has(keyOf(nextX, nextY))).length;
        candidates.push({ x, y, contacts, score: hash32(levelNumber + attempt, x, y, selected.size) });
      }
      candidates.sort((left, right) => right.contacts - left.contacts || left.score - right.score);
      const chosen = candidates[0];
      if (!chosen) break;
      selected.add(keyOf(chosen.x, chosen.y));
    }
    if (selected.size !== playableCount) continue;
    const mask = Array.from({ length: rows }, (_, y) => Array.from(
      { length: cols },
      (_, x) => selected.has(keyOf(x, y)) ? "#" : ".",
    ).join(""));
    if (maskKey(mask) === maskKey(originalMask)) continue;
    const sourceComponents = target.board.source_connected_component_count;
    if (sourceComponents && !target.board.uses_explicit_component_topology && maskComponentCount(mask) !== sourceComponents) continue;
    const packed = target.stage_partitions.map((stage, stageIndex) => (
      packStage(
        stageMask(mask, target, stage, topologyMap),
        stage.shape_histogram,
        levelNumber * 1009 + stageIndex * 37,
        topologyMap,
      )
    ));
    if (packed.every((result) => result.placements)) {
      return {
        mask,
        packed,
        adjustment: {
          reason: "original contract mask could not host the exact simultaneous-stage shape histogram",
          method: "pack_on_envelope_then_expand_to_exact_playable_cell_count",
          attempt,
          preserved_rows: rows,
          preserved_cols: cols,
          preserved_playable_cell_count: playableCount,
          preserved_component_count: sourceComponents ?? null,
        },
      };
    }
  }
  return { mask: originalMask, packed: firstPass, adjustment: null };
};

const shapeAlias = (shape) => {
  const normalized = String(shape ?? "").toUpperCase().replaceAll("×", "X").replaceAll("-", "_");
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
  if (SHAPE_VARIANTS[normalized]) return normalized;
  return SHAPE_ORDER.find((candidate) => normalized.includes(candidate)) ?? null;
};
const shapeOptions = (rawShape) => {
  const exact = shapeAlias(rawShape);
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
const sourceStage = (item) => {
  const explicitStage = String(item?.stage ?? "");
  if (/opening/i.test(explicitStage)) return "opening";
  const stageEvidence = [explicitStage, item?.visual_position, item?.trigger]
    .filter((value) => value != null)
    .join(" ");
  return item?.hidden_at_open || /hidden|reveal(?:ed)?/i.test(stageEvidence) ? "hidden" : "opening";
};
const sourceEventGroup = (item) => {
  const stage = String(item?.stage ?? "");
  const coverMatch = stage.match(/hidden_after_cover_(\d+)/i);
  return coverMatch ? `cover-count-${Number(coverMatch[1])}` : null;
};
const sourceStageIdentity = (item) => {
  const raw = String(item?.stage ?? item?.trigger ?? "").trim();
  if (item?.hidden_at_open) return `hidden:${raw || "unknown"}`;
  return raw || "opening";
};
const sourceAnchor = (item) => {
  const x = Number.isInteger(item?.anchor?.x) ? item.anchor.x : Number.isInteger(item?.x) ? item.x : null;
  const y = Number.isInteger(item?.anchor?.y) ? item.anchor.y : Number.isInteger(item?.y) ? item.y : null;
  if (x != null && y != null) return `${sourceStageIdentity(item)}:${x},${y}`;
  const match = String(item?.visual_position ?? "").match(/\((\d+)\s*,\s*(\d+)\)/);
  return match ? `${sourceStageIdentity(item)}:${Number(match[1])},${Number(match[2])}` : null;
};
const mechanismItems = (mechanismContract) => {
  const entries = [];
  const add = (kind, source) => {
    const items = Array.isArray(source) ? source : Array.isArray(source?.items) ? source.items : [];
    const count = Number.isInteger(source?.count) && source.count > 0 ? source.count : items.length;
    if (!items.length && !(Number.isInteger(source?.count) && source.count > 0) && source?.items === "unclear") {
      entries.push({
        kind,
        item: { ...source, source_unresolved_count_or_items: true },
      });
    }
    let expandedCount = 0;
    for (const item of items) {
      const multiplicity = Number.isInteger(item?.block_count) && item.block_count > 0 ? item.block_count : 1;
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
  add("numeric_ice", mechanismContract.numeric_ice);
  add("shell", mechanismContract.shells);
  add("axis_block", mechanismContract.axis_blocks);
  add("star_block", mechanismContract.star_blocks);
  add("bomb", mechanismContract.bombs);
  add("rotatable_block", mechanismContract.rotatable_blocks);
  const keyLocks = mechanismContract.keys_locks;
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
        : record?.paired_key_block && typeof record.paired_key_block === "object"
          ? [record.paired_key_block]
          : [];
      if (explicitKeys.length) {
        for (const key of explicitKeys) entries.push({ kind: "key_block", item: { ...key, role: "key" } });
      } else if (Number.isInteger(record?.visible_key_piece_count) && record.visible_key_piece_count > 0) {
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
  } else if (keyLocks && typeof keyLocks === "object") {
    const locks = Array.isArray(keyLocks.locks) ? keyLocks.locks : [];
    const lockCount = Number.isInteger(keyLocks.lock_count) && keyLocks.lock_count > 0 ? keyLocks.lock_count : locks.length;
    for (const item of locks) entries.push({ kind: "lock_block", item });
    for (let index = locks.length; index < lockCount; index += 1) {
      entries.push({ kind: "lock_block", item: { source_count_only_placeholder: index + 1 } });
    }
    for (let index = 0; index < (Number.isInteger(keyLocks.key_count) ? keyLocks.key_count : 0); index += 1) {
      entries.push({ kind: "key_block", item: { source_count_only_placeholder: index + 1 } });
    }
  }
  for (const unsupported of mechanismContract.unsupported ?? []) {
    if (!/circular|double-arrow|双箭头/i.test(JSON.stringify(unsupported))) continue;
    const count = Number.isInteger(unsupported?.count) && unsupported.count > 0 ? unsupported.count : 1;
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
const bindMechanisms = (blocks, mechanismContract) => {
  const used = new Set();
  const boundBySourceIdentity = new Map();
  return mechanismItems(mechanismContract).map(({ kind, item }, index) => {
    if (item?.source_unresolved_count_or_items) return {
      id: `binding-${kind}-${String(index + 1).padStart(2, "0")}`,
      kind,
      block_id: null,
      requested_shape: null,
      allowed_shapes: [],
      source_stage: null,
      actual_stage: null,
      source_identity_key: null,
      binding_status: "unresolved_source_count_or_items",
      source_item: clone(item),
    };
    const allowedShapes = shapeOptions(item?.shape ?? item?.opening_shape);
    const requestedShape = allowedShapes.length === 1 ? allowedShapes[0] : null;
    const stage = sourceStage(item);
    const expectedEventGroup = sourceEventGroup(item);
    const identity = sourceAnchor(item);
    const prior = identity ? boundBySourceIdentity.get(identity) : null;
    const inStage = (candidate) => expectedEventGroup
      ? candidate.event_group_id === expectedEventGroup
      : stage === "opening" ? candidate.stage_id === "opening" : candidate.stage_id !== "opening";
    const shapeMatches = (candidate) => !allowedShapes.length || allowedShapes.includes(candidate.shape_id);
    let block = prior && inStage(prior) && shapeMatches(prior) ? prior : null;
    let bindingStatus = block ? "exact_source_identity_relocated" : null;
    if (!block && allowedShapes.length) {
      block = blocks.find((candidate) => !used.has(candidate.id) && inStage(candidate) && shapeMatches(candidate)) ?? null;
      bindingStatus = block
        ? allowedShapes.length === 1 ? "exact_shape_relocated" : "exact_shape_family_relocated"
        : "unresolved_missing_shape_capacity";
    }
    if (!block && !allowedShapes.length) {
      block = blocks.find((candidate) => !used.has(candidate.id) && inStage(candidate)) ?? null;
      bindingStatus = block ? "design_fill_shape" : "unresolved_missing_block_capacity";
    }
    if (block && !prior) used.add(block.id);
    if (block && identity && !prior) boundBySourceIdentity.set(identity, block);
    return {
      id: `binding-${kind}-${String(index + 1).padStart(2, "0")}`,
      kind,
      block_id: block?.id ?? null,
      requested_shape: requestedShape,
      allowed_shapes: allowedShapes,
      source_stage: stage,
      actual_stage: block?.stage_id ?? null,
      source_event_group_id: expectedEventGroup,
      actual_event_group_id: block?.event_group_id ?? null,
      stage_binding_status: expectedEventGroup
        ? block?.event_group_id === expectedEventGroup ? "exact_source_event" : "source_event_unresolved"
        : block ? "source_stage_category" : "unresolved",
      source_identity_key: identity,
      binding_status: bindingStatus,
      source_item: clone(item),
    };
  });
};
const knownColor = (value) => typeof value === "string" && KNOWN_COLORS.has(value.toLowerCase())
  ? value.toLowerCase()
  : null;
const mechanismBaseColor = (kind, item) => {
  const candidates = kind === "shell"
    ? [
      item?.outer_color_class,
      item?.outer_color,
      Array.isArray(item?.colors) ? item.colors[0] : null,
      Array.isArray(item?.layer_colors) ? item.layer_colors[0] : null,
      Array.isArray(item?.layers) ? item.layers[0] : null,
      item?.color_class,
      item?.color,
    ]
    : [item?.color_class, item?.color, item?.locked_color, item?.key_color, item?.base_color];
  return candidates.map(knownColor).find(Boolean) ?? null;
};
const mechanismLayerColors = (kind, item) => {
  if (kind !== "shell") return [];
  const listed = Array.isArray(item?.colors)
    ? item.colors
    : Array.isArray(item?.layer_colors)
      ? item.layer_colors
    : Array.isArray(item?.layers) && item.layers.every((entry) => typeof entry === "string")
      ? item.layers
      : [item?.outer_color_class ?? item?.outer_color, item?.inner_color_class ?? item?.inner_color];
  return [...new Set(listed.map(knownColor).filter(Boolean))];
};
const effectiveColorsOf = (blocks) => [...new Set(blocks.flatMap((block) => [
  block.color,
  ...(block.mechanism_color_layers ?? []),
]).filter(Boolean))];
const fillBlockColors = (blocks, requiredPalette, alreadyUsed = []) => {
  const available = blocks.filter((block) => !block.color);
  const used = new Set([...alreadyUsed, ...effectiveColorsOf(blocks)]);
  for (const color of requiredPalette) {
    if (used.has(color)) continue;
    const block = available.shift();
    if (!block) break;
    block.color = color;
    used.add(color);
  }
  let index = 0;
  for (const block of available) {
    block.color = requiredPalette[index % Math.max(1, requiredPalette.length)] ?? null;
    index += 1;
  }
};

const contract = await readJson(contractPath);
const contractSha = await sha256(contractPath);
const levels = [];
const audits = [];
for (const contractLevel of contract.levels) {
  const target = contractLevel.our_design_target;
  const levelNumber = Number(contractLevel.level_id.replace(/^Lv/i, ""));
  const packingPlan = derivePackingAwareMask(target, levelNumber);
  const effectiveMask = packingPlan.mask;
  const levelTopologyMap = topologyComponentMap(target);
  const stageSpecs = [];
  for (let stageIndex = 0; stageIndex < target.stage_partitions.length; stageIndex += 1) {
    const stage = target.stage_partitions[stageIndex];
    const packed = packingPlan.packed[stageIndex];
    const blocks = (packed.placements ?? []).map((placement, placementIndex) => {
      const component = levelTopologyMap?.get(keyOf(...placement.cells[0])) ?? null;
      const componentLayout = target.board.target_component_layout?.find((entry) => (
        entry.source_name === component?.component_name
      ));
      return {
        id: `lv${String(levelNumber).padStart(3, "0")}-${stage.id}-b${String(placementIndex + 1).padStart(2, "0")}`,
        color: null,
        shape_id: placement.shape_id,
        x: placement.x,
        y: placement.y,
        shape: placement.shape,
        cells: placement.cells,
        stage_id: stage.id,
        event_group_id: stage.event_group_id ?? null,
        component: component?.component_name ?? null,
        local_x: componentLayout ? placement.x - componentLayout.target_origin.x : null,
        local_y: componentLayout ? placement.y - componentLayout.target_origin.y : null,
        storage_semantics: stage.kind === "generator_queue" ? "ordered_generator_queue" : "board_stage_payload",
      };
    });
    if (Array.isArray(stage.ordered_queue)) {
      const unassigned = new Set(blocks.map((block) => block.id));
      for (const item of stage.ordered_queue) {
        const allowedShapes = Array.isArray(item.allowed_shapes) ? item.allowed_shapes : [];
        const block = blocks.find((candidate) => unassigned.has(candidate.id)
          && (!item.shape || candidate.shape_id === item.shape)
          && (!allowedShapes.length || allowedShapes.includes(candidate.shape_id)));
        if (!block) continue;
        block.queue_index = item.queue_index;
        block.source_queue_item = clone(item);
        if (item.color) block.color = item.color;
        unassigned.delete(block.id);
      }
    }
    stageSpecs.push({
      id: stage.id,
      kind: stage.kind,
      trigger_reference: clone(stage.trigger_reference ?? null),
      event_group_id: stage.event_group_id ?? null,
      event_group_ids: clone(stage.event_group_ids ?? null),
      producer_ids: clone(stage.producer_ids ?? []),
      allowed_components: clone(stage.allowed_components ?? null),
      source_regions: clone(stage.source_regions ?? []),
      target_regions: clone(stage.target_regions ?? []),
      region_constraint_status: stage.region_constraint_status ?? "unresolved_source_anchor_not_enforced",
      excluded_target_regions: clone(stage.excluded_target_regions ?? []),
      region_exclusion_complete: Boolean(stage.region_exclusion_complete),
      ordered_queue: clone(stage.ordered_queue ?? null),
      simultaneous_visibility: stage.simultaneous_visibility ?? true,
      atomic_batches: clone(stage.atomic_batches ?? []),
      provenance: stage.provenance,
      assignment_status: stage.assignment_status ?? null,
      target_shape_histogram: clone(stage.shape_histogram),
      layout_status: packed.placements ? "structurally_packed_unsolved" : "packing_failed_requires_manual_layout",
      packing_search_nodes: packed.search_nodes,
      packing_failure_reason: packed.reason,
      blocks,
    });
  }
  const openingBlocks = stageSpecs.find((stage) => stage.id === "opening")?.blocks ?? [];
  const hiddenBlocks = stageSpecs.filter((stage) => stage.id !== "opening").flatMap((stage) => stage.blocks);
  const allBlocks = stageSpecs.flatMap((stage) => stage.blocks);
  const bindings = bindMechanisms(allBlocks, target.mechanism_contract);
  const sourceUnresolvedMechanismBindings = bindings.filter((binding) => (
    binding.binding_status === "unresolved_source_count_or_items"
  ));
  const pendingStagePayloadCount = (target.stage_events ?? []).filter((event) => (
    event.assignment_status === "source_event_preserved_payload_pending"
  )).length;
  const unresolvedStagePartitionCount = stageSpecs.filter((stage) => (
    stage.assignment_status === "unresolved_across_source_triggers"
  )).length;
  const sourceMissingExternalReference = contractLevel.truth_reference.source_classification
    === "source_missing_external_reference_only";
  const hasExplicitSourceEvidenceGaps = sourceUnresolvedMechanismBindings.length
    || pendingStagePayloadCount
    || unresolvedStagePartitionCount
    || sourceMissingExternalReference;
  const blockById = new Map(allBlocks.map((block) => [block.id, block]));
  const mechanismColorConflicts = [];
  for (const binding of bindings) {
    const block = blockById.get(binding.block_id);
    const expectedBaseColor = mechanismBaseColor(binding.kind, binding.source_item);
    const expectedLayerColors = mechanismLayerColors(binding.kind, binding.source_item);
    binding.expected_base_color = expectedBaseColor;
    binding.expected_layer_colors = expectedLayerColors;
    if (!block) {
      binding.color_status = expectedBaseColor ? "unbound" : "source_color_unclear_or_not_applicable";
      continue;
    }
    if (expectedBaseColor && block.color && block.color !== expectedBaseColor) {
      mechanismColorConflicts.push({ block_id: block.id, existing: block.color, expected: expectedBaseColor });
    }
    if (expectedBaseColor) block.color = expectedBaseColor;
    if (expectedLayerColors.length) {
      block.mechanism_color_layers = [...new Set([
        ...(block.mechanism_color_layers ?? []),
        ...expectedLayerColors,
      ])];
      block.mechanism_color_layer_provenance = "source_mechanism_contract";
    }
    binding.color_status = expectedBaseColor
      ? block.color === expectedBaseColor ? "matched" : "mismatch"
      : "source_color_unclear_or_not_applicable";
    binding.layer_color_status = binding.source_item?.colors_distinct && expectedLayerColors.length > 1
      ? new Set(expectedLayerColors).size === expectedLayerColors.length ? "distinct_matched" : "distinctness_violation"
      : expectedLayerColors.length ? "matched" : "not_applicable";
  }
  const openingPalette = target.design_palette.slice(0, target.opening_color_count);
  fillBlockColors(openingBlocks, openingPalette);
  fillBlockColors(hiddenBlocks, target.design_palette, effectiveColorsOf(openingBlocks));
  const openingBlockColors = effectiveColorsOf(openingBlocks);
  const allBlockColors = [...new Set(allBlocks.map((block) => block.color))];
  const mechanismColors = [...colorsIn(target.mechanism_contract)].filter((color) => target.design_palette.includes(color));
  const effectiveBlockColorClasses = effectiveColorsOf(allBlocks);
  const deferredColorClasses = target.design_palette.filter((color) => !effectiveBlockColorClasses.includes(color));
  const generatedTopologyComponentCount = target.board.uses_explicit_component_topology
    ? target.board.topology_component_count
    : maskComponentCount(effectiveMask);
  const level = {
    id: levelNumber,
    level_id: contractLevel.level_id,
    status: stageSpecs.every((stage) => stage.layout_status === "structurally_packed_unsolved")
      ? hasExplicitSourceEvidenceGaps
        ? "formal_candidate_structurally_valid_unsolved_with_explicit_source_evidence_gaps"
        : "formal_candidate_structurally_valid_unsolved"
      : "formal_candidate_incomplete_packing_unsolved",
    provenance: {
      contract: rel(contractPath),
      source_classification: contractLevel.truth_reference.source_classification,
      design_fill_fields: clone(contractLevel.truth_reference.design_fill_fields),
    },
    board: {
      width: target.board.cols,
      height: target.board.rows,
      playable_cell_count: target.board.playable_cell_count,
      playable_mask: clone(effectiveMask),
      playable_cells: effectiveMask.flatMap((row, y) => [...row].flatMap((cell, x) => cell === "#" ? [[x, y]] : [])),
      originality_status: target.board.originality_status,
      source_connected_component_count: target.board.source_connected_component_count,
      source_component_geometry: clone(target.board.source_component_geometry ?? null),
      component_partitions: clone(target.board.uses_explicit_component_topology ? target.board.target_component_layout : null),
      uses_explicit_component_topology: Boolean(target.board.uses_explicit_component_topology),
      mask_component_count: maskComponentCount(effectiveMask),
      generated_connected_component_count: generatedTopologyComponentCount,
      component_parity_status: target.board.source_connected_component_count == null
        ? "source_unclear"
        : target.board.source_connected_component_count === generatedTopologyComponentCount
          ? "matched"
          : "explicit_design_fill_not_matched",
      packing_aware_adjustment: packingPlan.adjustment,
    },
    time_seconds: target.time_seconds,
    palette: clone(target.design_palette),
    source_to_design_color_class: clone(target.source_to_design_color_class ?? {}),
    color_realization: {
      opening_target_count: target.opening_color_count,
      opening_block_color_count: openingBlockColors.length,
      full_target_count: target.full_level_color_count,
      all_block_color_count: allBlockColors.length,
      effective_block_color_count_including_layers: effectiveBlockColorClasses.length,
      effective_block_color_classes: effectiveBlockColorClasses,
      mechanism_color_classes: mechanismColors,
      deferred_color_classes: deferredColorClasses,
      status: deferredColorClasses.length ? "unresolved" : "realized_in_block_base_or_layer_colors",
    },
    opening_stage_id: "opening",
    stage_events: clone(target.stage_events ?? []),
    stage_conflicts: clone(target.stage_conflicts ?? []),
    stages: stageSpecs,
    mechanism_contract: clone(target.mechanism_contract),
    formal_repairs: clone(target.formal_repairs ?? []),
    mechanism_bindings: bindings,
    runtime_unsupported_mechanisms: clone(target.runtime_unsupported_mechanisms),
    solver: {
      status: "not_run_by_user_request",
      completion_witness: null,
      par_moves: null,
      difficulty_score: null,
      necessary_reposition_overhead: null,
    },
    runtime_integration: {
      status: "not_integrated",
      blockers: [
        "solver_not_run",
        ...(target.runtime_unsupported_mechanisms.length ? ["runtime_mechanism_implementation_required"] : []),
        ...(contractLevel.truth_reference.design_fill_fields.length ? ["source_design_fill_present"] : []),
        ...(bindings.some((binding) => binding.binding_status === "design_fill_shape") ? ["mechanism_binding_design_fill"] : []),
        ...(sourceUnresolvedMechanismBindings.length ? ["source_mechanism_count_or_items_unresolved"] : []),
        ...(pendingStagePayloadCount ? ["source_stage_payload_unresolved"] : []),
        ...(unresolvedStagePartitionCount ? ["source_stage_trigger_assignment_unresolved"] : []),
        ...(sourceMissingExternalReference ? ["source_missing_external_reference"] : []),
        ...(deferredColorClasses.length ? ["deferred_color_assignment_required"] : []),
      ],
    },
  };

  const issues = [];
  if (level.board.playable_cells.length !== level.board.playable_cell_count) issues.push("playable_cell_count_mismatch");
  if (level.board.source_connected_component_count != null
    && level.board.generated_connected_component_count !== level.board.source_connected_component_count) issues.push("component_count_mismatch");
  if (stageSpecs.some((stage) => stage.layout_status !== "structurally_packed_unsolved")) issues.push("stage_packing_failed");
  if (new Set(stageSpecs.map((stage) => stage.id)).size !== stageSpecs.length) issues.push("duplicate_stage_id");
  if (new Set(allBlocks.map((block) => block.id)).size !== allBlocks.length) issues.push("duplicate_block_id");
  if (target.stage_conflicts?.length) issues.push("source_stage_contract_conflict");
  for (const event of target.stage_events ?? []) for (const producer of event.producers ?? []) {
    if (producer.source_region && !sourceRegionWithinBoardOrComponent(producer.source_region, target.board)) {
      issues.push(`${event.event_group_id}_${producer.producer_id}_source_region_out_of_bounds`);
    }
    if (producer.target_region && !targetRegionWithinBoardOrComponent(producer.target_region, target.board)) {
      issues.push(`${event.event_group_id}_${producer.producer_id}_target_region_out_of_bounds`);
    }
  }
  for (const [stageIndex, stage] of stageSpecs.entries()) {
    if (!sameJson(histogramOf(stage.blocks), stage.target_shape_histogram)) issues.push(`stage_${stageIndex + 1}_histogram_mismatch`);
    const occupied = new Set();
    for (const block of stage.blocks) for (const [x, y] of block.cells) {
      if (x < 0 || y < 0 || x >= level.board.width || y >= level.board.height) issues.push(`stage_${stageIndex + 1}_out_of_bounds`);
      if (level.board.playable_mask[y]?.[x] !== "#") issues.push(`stage_${stageIndex + 1}_outside_playable_mask`);
      const key = keyOf(x, y);
      if (occupied.has(key)) issues.push(`stage_${stageIndex + 1}_overlap`);
      occupied.add(key);
    }
    const allowedComponents = new Set(stage.allowed_components ?? []);
    if (allowedComponents.size && stage.blocks.some((block) => !allowedComponents.has(block.component))) {
      issues.push(`stage_${stageIndex + 1}_component_assignment_mismatch`);
    }
    if (/^enforced/.test(stage.region_constraint_status) && stage.target_regions.length
      && stage.blocks.some((block) => block.cells.some(([x, y]) => (
      !stage.target_regions.some((region) => cellInRegion(x, y, region))
      )))) issues.push(`stage_${stageIndex + 1}_outside_target_regions`);
    if (stage.region_exclusion_complete && stage.blocks.some((block) => block.cells.some(([x, y]) => (
      stage.excluded_target_regions.some((region) => cellInRegion(x, y, region))
    )))) issues.push(`stage_${stageIndex + 1}_inside_excluded_region`);
    if (stage.kind === "generator_queue" && stage.ordered_queue
      && stage.blocks.some((block) => !Number.isInteger(block.queue_index))) {
      issues.push(`stage_${stageIndex + 1}_generator_queue_order_unbound`);
    }
    if (stage.kind === "generator_queue" && stage.ordered_queue) for (const item of stage.ordered_queue) {
      const queuedBlock = stage.blocks.find((block) => block.queue_index === item.queue_index);
      const allowedShapes = Array.isArray(item.allowed_shapes) ? item.allowed_shapes : [];
      if (!queuedBlock
        || (item.shape && queuedBlock.shape_id !== item.shape)
        || (allowedShapes.length && !allowedShapes.includes(queuedBlock.shape_id))) {
        issues.push(`stage_${stageIndex + 1}_generator_queue_shape_mismatch`);
      }
      if (item.color && queuedBlock?.color !== item.color) {
        issues.push(`stage_${stageIndex + 1}_generator_queue_color_mismatch`);
      }
    }
  }
  const topologyMap = levelTopologyMap;
  if (target.board.uses_explicit_component_topology) {
    if (!topologyMap) issues.push("explicit_component_topology_invalid");
    else {
      const playableKeys = new Set(level.board.playable_cells.map(([x, y]) => keyOf(x, y)));
      if (topologyMap.size !== playableKeys.size
        || [...playableKeys].some((key) => !topologyMap.has(key))
        || [...topologyMap.keys()].some((key) => !playableKeys.has(key))) {
        issues.push("component_layout_does_not_exactly_cover_playable_mask");
      }
      const componentNames = new Set([...topologyMap.values()].map((entry) => entry.component_name));
      if (componentNames.size !== target.board.topology_component_count) issues.push("component_layout_count_mismatch");
    }
  }
  if (topologyMap) for (const stage of stageSpecs) for (const block of stage.blocks) {
    const components = new Set(block.cells.map(([x, y]) => topologyMap.get(keyOf(x, y))?.component_name));
    if (components.has(undefined) || components.size !== 1) issues.push("block_crosses_component_topology_seam");
    if (block.component !== [...components][0]) issues.push("block_component_metadata_mismatch");
  }
  if (allBlocks.length !== target.full_level_block_count) issues.push("full_level_block_count_mismatch");
  if (!sameJson(histogramOf(allBlocks), target.full_level_shape_histogram)) issues.push("full_level_histogram_mismatch");
  if (level.palette.length !== target.full_level_color_count || new Set(level.palette).size !== level.palette.length) issues.push("full_palette_count_mismatch");
  if (openingBlockColors.length !== target.opening_color_count) issues.push("opening_color_count_mismatch");
  if (effectiveBlockColorClasses.length !== target.full_level_color_count) issues.push("full_block_color_count_mismatch");
  if (deferredColorClasses.length) issues.push("deferred_color_classes_unassigned");
  if (mechanismColorConflicts.length) issues.push("mechanism_base_color_constraint_conflict");
  if (openingBlockColors.some((color) => !openingPalette.includes(color))) issues.push("opening_color_outside_opening_palette");
  if (allBlocks.some((block) => !level.palette.includes(block.color))) issues.push("block_color_outside_palette");
  if (mechanismColors.some((color) => !level.palette.includes(color))) issues.push("mechanism_color_outside_palette");
  if (!sameJson(level.mechanism_contract, target.mechanism_contract)) issues.push("mechanism_contract_mismatch");
  if (bindings.length !== mechanismItems(target.mechanism_contract).length) issues.push("mechanism_binding_count_mismatch");
  if (bindings.some((binding) => (
    binding.binding_status !== "unresolved_source_count_or_items"
    && (!binding.block_id || binding.binding_status?.startsWith("unresolved"))
  ))) issues.push("unresolved_block_mechanism");
  if (bindings.some((binding) => binding.allowed_shapes?.length
    && !binding.allowed_shapes.includes(allBlocks.find((block) => block.id === binding.block_id)?.shape_id))) {
    issues.push("mechanism_shape_mismatch");
  }
  if (bindings.some((binding) => binding.expected_base_color
    && allBlocks.find((block) => block.id === binding.block_id)?.color !== binding.expected_base_color)) {
    issues.push("mechanism_base_color_mismatch");
  }
  if (bindings.some((binding) => binding.expected_layer_colors?.some((color) => (
    !allBlocks.find((block) => block.id === binding.block_id)?.mechanism_color_layers?.includes(color)
  )))) issues.push("mechanism_layer_color_mismatch");
  if (bindings.some((binding) => binding.layer_color_status === "distinctness_violation")) {
    issues.push("mechanism_layer_color_distinctness_violation");
  }
  if (bindings.some((binding) => binding.source_stage === "opening" ? binding.actual_stage !== "opening" : binding.actual_stage === "opening")) {
    issues.push("mechanism_stage_mismatch");
  }
  if (bindings.some((binding) => binding.source_event_group_id
    && binding.actual_event_group_id !== binding.source_event_group_id)) issues.push("mechanism_source_event_mismatch");
  const bindingsByBlock = new Map();
  for (const binding of bindings) {
    if (!binding.block_id) continue;
    const group = bindingsByBlock.get(binding.block_id) ?? [];
    group.push(binding);
    bindingsByBlock.set(binding.block_id, group);
  }
  for (const group of bindingsByBlock.values()) if (group.length > 1) {
    const identities = new Set(group.map((binding) => binding.source_identity_key));
    if (identities.size !== 1 || identities.has(null)) issues.push("unsupported_composite_mechanism_binding");
  }
  if (level.solver.status !== "not_run_by_user_request") issues.push("solver_status_invalid");
  audits.push({
    level_id: level.level_id,
    status: issues.length ? "fail" : "pass",
    issues: [...new Set(issues)],
    stage_count: stageSpecs.length,
    block_count: allBlocks.length,
    mechanism_binding_count: bindings.length,
    exact_mechanism_binding_count: bindings.filter((binding) => binding.binding_status?.startsWith("exact_")).length,
    design_fill_mechanism_binding_count: bindings.filter((binding) => binding.binding_status === "design_fill_shape").length,
    unbound_mechanism_count: bindings.filter((binding) => !binding.block_id || binding.binding_status?.startsWith("unresolved")).length,
    source_unresolved_mechanism_count: sourceUnresolvedMechanismBindings.length,
    pending_stage_payload_event_count: pendingStagePayloadCount,
    unresolved_stage_partition_count: unresolvedStagePartitionCount,
    source_missing_external_reference: sourceMissingExternalReference,
    opening_color_count: openingBlockColors.length,
    full_block_color_count: allBlockColors.length,
    effective_block_color_count_including_layers: effectiveBlockColorClasses.length,
    deferred_color_class_count: deferredColorClasses.length,
  });
  levels.push(level);
}

const passed = audits.filter((entry) => entry.status === "pass").length;
const levelsWithSourceUnresolvedMechanisms = audits
  .filter((entry) => entry.source_unresolved_mechanism_count > 0)
  .map((entry) => entry.level_id);
const pendingStagePayloadEvents = levels.flatMap((level) => (level.stage_events ?? [])
  .filter((event) => event.assignment_status === "source_event_preserved_payload_pending")
  .map((event) => `${level.level_id}/${event.event_group_id}`));
const pooledHiddenPartitions = levels.flatMap((level) => level.stages
  .filter((stage) => stage.assignment_status === "unresolved_across_source_triggers")
  .map((stage) => `${level.level_id}/${stage.id}`));
const packingAdjustedLevelIds = levels
  .filter((level) => level.board.packing_aware_adjustment)
  .map((level) => level.level_id);
const sourceMissingLevelIds = audits
  .filter((entry) => entry.source_missing_external_reference)
  .map((entry) => entry.level_id);
const candidates = {
  schema_version: "blockout-video-parity-formal-candidates-101-200-v1",
  title: "Block Out! Lv101-200 formal candidate data (unsolved)",
  generated_on: "2026-09-17",
  status: passed === levels.length
    ? pendingStagePayloadEvents.length || pooledHiddenPartitions.length || levelsWithSourceUnresolvedMechanisms.length
      ? "structurally_valid_unsolved_with_explicit_source_evidence_gaps_not_integrated"
      : "structurally_valid_unsolved_not_integrated"
    : "structural_failures_present_unsolved_not_integrated",
  contract: { path: rel(contractPath), sha256: contractSha },
  rules: {
    source_separation: "Every field filled beyond source evidence is listed in provenance.design_fill_fields.",
    stage_overlap: "Blocks are non-overlapping inside each simultaneously visible stage. Cover events preserve source stage chronology; equal-count covers are grouped atomically, while generator queues stay independent and ordered.",
    packing_adjustment: "If the contract outline cannot pack the required unsolved composition, the candidate may use a different original outline only while preserving board dimensions, playable-cell count and explicit component topology; every such change is recorded.",
    no_solver: "No candidate has been solved, scored or assigned a par/reposition metric.",
    no_runtime_integration: "This artifact does not alter the active Lv1-100 campaign.",
  },
  summary: {
    level_count: levels.length,
    structurally_valid_level_count: passed,
    structurally_failed_level_count: levels.length - passed,
    solver_validated_level_count: 0,
    runtime_integrated_level_count: 0,
    levels_with_source_unresolved_mechanisms: levelsWithSourceUnresolvedMechanisms,
    source_unresolved_mechanism_level_count: levelsWithSourceUnresolvedMechanisms.length,
    pending_stage_payload_event_count: pendingStagePayloadEvents.length,
    pending_stage_payload_events: pendingStagePayloadEvents,
    unresolved_pooled_hidden_partition_count: pooledHiddenPartitions.length,
    unresolved_pooled_hidden_partitions: pooledHiddenPartitions,
    packing_adjusted_level_count: packingAdjustedLevelIds.length,
    packing_adjusted_level_ids: packingAdjustedLevelIds,
    source_missing_level_count: sourceMissingLevelIds.length,
    source_missing_level_ids: sourceMissingLevelIds,
  },
  levels,
};
const audit = {
  schema_version: "blockout-video-parity-formal-candidate-audit-101-200-v1",
  generated_on: "2026-09-17",
  candidate: rel(candidatePath),
  summary: candidates.summary,
  levels: audits,
};
const markdown = [
  "# Block Out! Lv101–200 正式候选数据 v1（未求解）",
  "",
  `- 关卡：${levels.length}`,
  `- 结构校验通过：${passed}`,
  `- 结构校验失败：${levels.length - passed}`,
  "- 求解通过：0（按要求未运行）",
  "- 当前正式 Campaign 接入：0",
  `- 来源机制数量/条目仍不明确：${levelsWithSourceUnresolvedMechanisms.length} 关（${levelsWithSourceUnresolvedMechanisms.join("、") || "无"}）`,
  `- 卷帘门事件 payload 尚无来源证据：${pendingStagePayloadEvents.length} 个`,
  `- 跨触发器隐藏池尚不能精确分配：${pooledHiddenPartitions.length} 个`,
  `- 为容纳既定构成而调整候选外框：${packingAdjustedLevelIds.length} 关（${packingAdjustedLevelIds.join("、") || "无"}）`,
  `- 本地视频及历史截图均缺失：${sourceMissingLevelIds.length} 关（${sourceMissingLevelIds.join("、") || "无"}）`,
  "",
  "| 关卡 | 棋盘 | 阶段 | 色块 | 结构 | 设计填充 | 新运行时机制 |",
  "|---:|---:|---:|---:|---|---|---|",
  ...levels.map((level, index) => `| ${level.level_id} | ${level.board.height}×${level.board.width}/${level.board.playable_cell_count} | ${level.stages.length} | ${level.stages.reduce((sum, stage) => sum + stage.blocks.length, 0)} | ${audits[index].status} | ${level.provenance.design_fill_fields.length} | ${level.runtime_unsupported_mechanisms.join("、") || "-"} |`),
  "",
].join("\n");

await mkdir(outputDir, { recursive: true });
await Promise.all([
  writeFile(candidatePath, `${JSON.stringify(candidates, null, 2)}\n`),
  writeFile(auditPath, `${JSON.stringify(audit, null, 2)}\n`),
  writeFile(markdownPath, markdown),
]);

console.log(JSON.stringify({
  candidate: rel(candidatePath),
  audit: rel(auditPath),
  markdown: rel(markdownPath),
  ...candidates.summary,
}, null, 2));
if (passed !== levels.length) process.exitCode = 1;
