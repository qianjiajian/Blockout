import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { chromium } from "playwright";

const ROOT = process.cwd();
const TRUTH_PATH = path.resolve(ROOT, "deliverables/level-generation-blueprint/blockout-lv101-lv200-video-parity-truth-v1.json");
const CONTRACT_PATH = path.resolve(ROOT, "deliverables/level-generation-blueprint/blockout-lv101-lv200-video-parity-design-contract-v1.json");
const CANDIDATE_PATH = path.resolve(ROOT, "deliverables/level-generation-blueprint/blockout-lv101-lv200-video-parity-formal-candidates-v1.json");
const OUTPUT = path.resolve(ROOT, process.argv[2] ?? "deliverables/competitor-vs-ours-lv101-200-candidates-v1");
const COMPETITOR_DIR = path.join(OUTPUT, "competitor-opening");
const CANDIDATE_DIR = path.join(OUTPUT, "candidate-opening");
const PAIRS_DIR = path.join(OUTPUT, "level-comparisons");
const LEVEL_FROM = 101;
const LEVEL_TO = 200;
const LEVEL_COUNT = LEVEL_TO - LEVEL_FROM + 1;
const CANDIDATE_VIEWPORT = { width: 496, height: 1078 };
const PAIR_VIEWPORT = { width: 1500, height: 1280 };

const SOURCE_ROOTS = [
  { from: 101, to: 134, root: ".codex-temp/video-audit-101-134" },
  { from: 135, to: 169, root: ".codex-temp/video-audit-135-169" },
  { from: 170, to: 200, root: ".codex-temp/video-audit-170-200" },
];

const COLOR = {
  red: "#ef4056", orange: "#ff881f", yellow: "#f7cf22", green: "#35bc43",
  cyan: "#21bfd1", blue: "#2f6cf5", purple: "#9253e8", pink: "#ef5bb8",
  unclear: "#8890ad", gray: "#8890ad", grey: "#8890ad",
};
const SHAPE_ORDER = ["SINGLE", "H2", "V2", "H3", "V3", "H4", "V4", "SQ2", "L3", "T4", "L4", "S4", "T5", "L5", "T6", "L6", "CROSS5", "RECT2X3", "SQ3"];
const SHAPE_LABEL = {
  SINGLE: "单格", H2: "横2", V2: "竖2", H3: "横3", V3: "竖3", H4: "横4", V4: "竖4",
  SQ2: "2×2", L3: "L3", T4: "T4", L4: "L4", S4: "S4", T5: "T5", L5: "L5",
  T6: "T6", L6: "L6", CROSS5: "十字5", RECT2X3: "2×3", SQ3: "3×3",
};
const SHAPE_SIZE = {
  SINGLE: 1, H2: 2, V2: 2, H3: 3, V3: 3, L3: 3,
  H4: 4, V4: 4, SQ2: 4, T4: 4, L4: 4, S4: 4,
  T5: 5, L5: 5, CROSS5: 5, PLUS5: 5,
  T6: 6, L6: 6, RECT2X3: 6, SQ3: 9,
};
const BINDING_ICON = {
  numeric_ice: "❄", shell: "◈", key_block: "◆", lock_block: "▣", axis_block: "↕",
  star_block: "★", bomb: "●", circular_double_arrow_marked_block: "↻",
};
const UNSUPPORTED_LABEL = {
  timed_bomb: "定时炸弹", circular_double_arrow_marked_block: "环形双箭头",
  flip_door: "翻转门", colored_grid: "彩色网格",
};

const canonical = (value) => {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().filter((key) => value[key] !== undefined)
    .map((key) => [key, canonical(value[key])]));
};
const same = (a, b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
const sha256 = (value) => createHash("sha256").update(value).digest("hex").toUpperCase();
const escapeHtml = (value) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const escapeXml = escapeHtml;
const compact = (value) => typeof value === "string" ? value : JSON.stringify(value);
const csvCell = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
const finite = (value) => value !== null && value !== undefined && value !== ""
  && String(value).toLowerCase() !== "unclear" && Number.isFinite(Number(value));
const asArray = (value) => Array.isArray(value) ? value : [];
const numeric = (value, fallback = 0) => finite(value) ? Number(value) : fallback;
const contractItems = (value) => Array.isArray(value) ? value : asArray(value?.items);
const contractCount = (value) => {
  if (Array.isArray(value)) return value.length;
  if (value === null || value === undefined) return 0;
  if (Object.hasOwn(value, "count")) return finite(value.count) ? Number(value.count) : null;
  return Array.isArray(value.items) ? value.items.length : 0;
};
const sortedNumbers = (values) => asArray(values).map(Number).filter(Number.isFinite).sort((a, b) => a - b);
const total = (histogram) => Object.values(histogram ?? {}).reduce((sum, value) => sum + numeric(value), 0);
const orderedHistogram = (histogram) => Object.fromEntries([
  ...SHAPE_ORDER.filter((id) => numeric(histogram?.[id]) > 0),
  ...Object.keys(histogram ?? {}).filter((id) => !SHAPE_ORDER.includes(id) && numeric(histogram[id]) > 0).sort(),
].map((id) => [id, numeric(histogram[id])]));
const histogramText = (histogram) => Object.entries(orderedHistogram(histogram)).map(([id, count]) => `${SHAPE_LABEL[id] ?? id}×${count}`).join("、") || "无";
const dataUrl = async (file, mime = "image/png") => `data:${mime};base64,${(await readFile(file)).toString("base64")}`;
const rel = (file) => path.relative(OUTPUT, file).replaceAll("\\", "/");
const levelStem = (level) => `level-${String(level).padStart(3, "0")}`;

function sourceFramePath(level) {
  const raw = level.provenance?.opening_frame;
  if (!raw) return null;
  if (path.isAbsolute(raw)) return raw;
  const owner = SOURCE_ROOTS.find((entry) => level.level >= entry.from && level.level <= entry.to);
  return owner ? path.resolve(ROOT, owner.root, raw) : path.resolve(ROOT, raw);
}

function stageBlocks(candidate) {
  return asArray(candidate.stages).flatMap((stage) => asArray(stage.blocks));
}

function openingBlocks(candidate) {
  return asArray(candidate.stages).find((stage) => stage.id === candidate.opening_stage_id)?.blocks ?? [];
}

function histogramOf(blocks) {
  const result = {};
  for (const block of blocks) result[block.shape_id] = (result[block.shape_id] ?? 0) + 1;
  return orderedHistogram(result);
}

function occupiedCells(blocks) {
  return blocks.reduce((sum, block) => sum + asArray(block.cells).length, 0);
}

function occupiedFromHistogram(histogram) {
  if (!histogram || typeof histogram !== "object") return null;
  let sum = 0;
  for (const [shape, count] of Object.entries(histogram)) {
    if (!finite(count) || !finite(SHAPE_SIZE[shape])) return null;
    sum += Number(count) * SHAPE_SIZE[shape];
  }
  return sum;
}

function knownMetric(key, label, competitor, ours, options = {}) {
  const unknown = competitor === null || competitor === undefined || competitor === "unclear";
  const evidenceStatus = options.evidenceStatus ?? "exact";
  if (unknown) return { key, label, competitor: "unclear", ours, status: "source_unknown", match: null, note: options.note ?? "竞品来源没有可核实的精确值；本游戏值属于设计补全。" };
  if (evidenceStatus !== "exact" && evidenceStatus !== "exact_or_reconstructed_from_opening") {
    return { key, label, competitor, ours, status: "source_partial", match: null, note: options.note ?? `来源状态：${evidenceStatus}` };
  }
  const match = same(competitor, ours);
  return { key, label, competitor, ours, status: match ? "source_backed_match" : "mismatch", match, note: options.note ?? "" };
}

function gateValue(gate) {
  return gate?.frozen?.value ?? gate?.frozen_value ?? gate?.value ?? null;
}

function normalizeMechanisms(contract, bindings) {
  const exits = contract?.directional_exits ?? {};
  const numericIce = contract?.numeric_ice ?? null;
  const shells = contract?.shells ?? null;
  const keys = contract?.keys_locks ?? null;
  const numericItems = contractItems(numericIce);
  const shellItems = contractItems(shells);
  const keyItems = Array.isArray(keys) ? keys : asArray(keys?.locks);
  const covers = asArray(contract?.covers);
  const generators = asArray(contract?.generators);
  const stagedFrames = asArray(contract?.staged_frames);
  const bombs = asArray(contract?.bombs);
  const axis = asArray(contract?.axis_blocks);
  const stars = contract?.star_blocks ?? null;
  const starItems = contractItems(stars);
  const flip = asArray(contract?.flip_doors);
  const grids = asArray(contract?.colored_grid);
  const materialized = (kind) => bindings.filter((item) => item.kind === kind && item.block_id).length;
  const keyCount = Array.isArray(keys)
    ? keyItems.reduce((sum, item) => sum + numeric(item.visible_key_piece_count ?? item.key_count, 0), 0)
    : numeric(keys?.key_count, 0);
  const lockCount = Array.isArray(keys) ? keyItems.length : numeric(keys?.lock_count, 0);
  const doubleArrowItems = asArray(contract?.unsupported).filter((item) => {
    const description = [item?.appearance, item?.kind, item?.name, item?.type, item?.classification].filter(Boolean).join(" ");
    return /double-arrow|double_arrow|circular.*arrow/i.test(description);
  });
  return canonical({
    exits: {
      ordinary_count: asArray(exits.ordinary).length,
      frozen_values: sortedNumbers(asArray(exits.frozen).map(gateValue)),
      star_count: asArray(exits.star).length,
      unknown_offset_count: [...asArray(exits.ordinary), ...asArray(exits.frozen), ...asArray(exits.star)]
        .filter((gate) => !finite(gate.offset)).length,
    },
    numeric_ice: { contracted_count: contractCount(numericIce), bound_count: materialized("numeric_ice"), values: sortedNumbers(numericItems.map((item) => item.value)), items: numericItems.map((item) => ({ shape: item.shape, value: item.value, stage: item.stage })) },
    shells: { contracted_count: contractCount(shells), bound_count: materialized("shell"), items: shellItems.map((item) => ({ shape: item.shape, layers: item.layers, stage: item.stage, colors: item.colors ?? [item.outer_color_class, item.inner_color_class].filter(Boolean) })) },
    keys_locks: { key_count: keyCount, bound_keys: materialized("key_block"), lock_count: lockCount, bound_locks: materialized("lock_block"), lock_requirements: sortedNumbers(keyItems.map((item) => item.lock_count)) },
    axis_blocks: { contracted_count: axis.length, bound_count: materialized("axis_block"), items: axis.map((item) => ({ shape: item.shape, axis: item.axis, stage: item.stage })) },
    star_blocks: { contracted_count: contractCount(stars), bound_count: materialized("star_block"), items: starItems.map((item) => ({ shape: item.shape, stage: item.stage })) },
    covers: { count: covers.length, values: covers.map((item) => item.count), geometry_unknown_count: covers.filter((item) => ![item.x, item.y, item.w, item.h].every(finite)).length },
    generators: { count: generators.length, triggers: generators.map((item) => item.trigger), queue_lengths: generators.map((item) => item.queue_length ?? item.queue?.length ?? item.queueBlockIds?.length ?? null), offset_unknown_count: generators.filter((item) => !finite(item.offset)).length },
    staged_frames: { count: stagedFrames.length, geometry_unknown_count: stagedFrames.filter((item) => ![item.x, item.y, item.w, item.h].every(finite)).length },
    bombs: { contracted_count: bombs.length, bound_count: materialized("bomb"), values: sortedNumbers(bombs.map((item) => item.value)) },
    circular_double_arrow: { contracted_count: asArray(contract?.rotatable_blocks).reduce((sum, item) => sum + numeric(item.count, 1), 0) + doubleArrowItems.reduce((sum, item) => sum + numeric(item.count, 1), 0), bound_count: materialized("circular_double_arrow_marked_block") },
    flip_doors: { count: flip.length, items: flip.map((item) => ({ side: item.side, offset: item.offset, size: item.size, initial_state: item.initial_state })) },
    colored_grid: { count: grids.length, cells: grids.reduce((sum, item) => sum + asArray(item.cells).length, 0), colors: grids.map((item) => item.color) },
  });
}

function mechanismRows(contract, bindings) {
  const normalized = normalizeMechanisms(contract, bindings);
  const rows = [];
  const add = (key, label, competitor, ours, status = "source_backed_match", note = "") => rows.push({ key, label, competitor, ours, status, match: status === "source_backed_match" ? true : status === "mismatch" ? false : null, note });
  add("exits", "出口构成", normalized.exits, normalized.exits, "source_backed_match", normalized.exits.unknown_offset_count ? `${normalized.exits.unknown_offset_count}个出口位置仅为示意。` : "");
  for (const [key, label] of [["numeric_ice", "数字冰块"], ["shells", "双层色块"], ["keys_locks", "钥匙与锁"], ["axis_blocks", "轴向限制块"], ["star_blocks", "星标色块"], ["bombs", "定时炸弹"], ["circular_double_arrow", "环形双箭头块"]]) {
    const value = normalized[key];
    const contracted = key === "keys_locks"
      ? (value.key_count ?? 0) + (value.lock_count ?? 0)
      : value.contracted_count;
    const bound = key === "keys_locks"
      ? (value.bound_keys ?? 0) + (value.bound_locks ?? 0)
      : value.bound_count;
    const unresolved = contracted === null || contracted === undefined || bound < contracted;
    add(key, label, value, value, unresolved ? "binding_gap" : "source_backed_match", unresolved ? "来源数量不完整或候选未能绑定到具体色块。" : "候选已绑定到具体色块；尚未运行求解器。" );
  }
  add("covers", "卷帘门", normalized.covers, normalized.covers, normalized.covers.geometry_unknown_count ? "position_unknown" : "source_backed_match", normalized.covers.geometry_unknown_count ? "未知位置不绘入棋盘，仅显示虚线位置不明标记。" : "");
  add("generators", "生成器", normalized.generators, normalized.generators, normalized.generators.offset_unknown_count ? "position_unknown" : "source_backed_match", normalized.generators.offset_unknown_count ? "未知边框偏移使用虚线示意。" : "");
  add("staged_frames", "固定分层框", normalized.staged_frames, normalized.staged_frames, normalized.staged_frames.geometry_unknown_count ? "position_unknown" : "source_backed_match", normalized.staged_frames.geometry_unknown_count ? "来源没有精确区域，图中不伪造覆盖位置。" : "");
  add("flip_doors", "翻转门", normalized.flip_doors, normalized.flip_doors, normalized.flip_doors.count ? "static_contract_only" : "source_backed_match", normalized.flip_doors.count ? "未接入运行时；图中仅为静态合同示意。" : "");
  add("colored_grid", "彩色网格", normalized.colored_grid, normalized.colored_grid, normalized.colored_grid.count ? "static_contract_only" : "source_backed_match", normalized.colored_grid.count ? "未接入运行时；图中仅为静态合同示意。" : "");
  return rows;
}

function recordStatus(truthLevel, contractLevel, candidate) {
  const sourceMissing = truthLevel.provenance?.classification === "source_missing_external_reference_only" || !truthLevel.provenance?.opening_frame;
  if (sourceMissing) return { id: "source_missing", label: "来源缺失·设计占位", className: "missing" };
  const designFill = asArray(contractLevel.truth_reference?.design_fill_fields);
  const unresolvedBindings = asArray(candidate.mechanism_bindings).filter((item) => !item.block_id && String(item.binding_status).includes("unresolved"));
  if (designFill.length || unresolvedBindings.length) return { id: "design_fill", label: "含设计补全/机制缺口", className: "fill" };
  return { id: "source_backed", label: "来源支持的结构候选", className: "backed" };
}

function buildMetrics(truthLevel, target, candidate) {
  const opening = openingBlocks(candidate);
  const all = stageBlocks(candidate);
  const source = truthLevel.composition;
  return [
    knownMetric("board_size", "棋盘大小", finite(truthLevel.board.cols) && finite(truthLevel.board.rows) ? `${truthLevel.board.cols}×${truthLevel.board.rows}` : null, `${candidate.board.width}×${candidate.board.height}`),
    knownMetric("playable_cells", "可玩格数", truthLevel.board.playable_cell_count, candidate.board.playable_cell_count, { evidenceStatus: truthLevel.board.source_mask_status }),
    knownMetric("time_seconds", "总时间", truthLevel.time_seconds, candidate.time_seconds),
    knownMetric("opening_piece_count", "开局色块数量", source.opening_piece_count, opening.length),
    knownMetric("full_piece_count", "全关色块数量", source.source_full_piece_count, all.length),
    knownMetric("opening_shape_histogram", "开局色块形状", orderedHistogram(source.opening_shape_histogram), histogramOf(opening), { evidenceStatus: source.opening_shape_histogram_status }),
    knownMetric("full_shape_histogram", "全关色块形状", source.source_full_shape_histogram ? orderedHistogram(source.source_full_shape_histogram) : null, histogramOf(all), { evidenceStatus: source.source_full_shape_histogram_status }),
    knownMetric("occupied_cells", "全关色块占格", source.source_occupied_cell_count ?? occupiedFromHistogram(source.source_full_shape_histogram), occupiedCells(all), { evidenceStatus: source.source_full_shape_histogram_status }),
    knownMetric("opening_colors", "开局颜色种类", source.opening_color_count, candidate.color_realization?.opening_block_color_count),
    knownMetric("full_colors", "全关颜色种类", source.full_color_count, candidate.color_realization?.effective_block_color_count_including_layers),
    { key: "stages", label: "阶段/隐藏批次", competitor: truthLevel.stage_seeds ?? [], ours: asArray(candidate.stages).map((stage) => ({ id: stage.id, kind: stage.kind, count: stage.blocks.length, shapes: stage.target_shape_histogram })), status: "structural_candidate", match: null, note: "候选仅完成结构摆放，未验证触发流程与可解性。" },
  ];
}

function mechanismDigest(contract, candidate) {
  const value = normalizeMechanisms(contract, candidate.mechanism_bindings);
  const parts = [];
  if (value.exits.ordinary_count || value.exits.frozen_values.length || value.exits.star_count) parts.push(`出口 普通${value.exits.ordinary_count}/冰冻${compact(value.exits.frozen_values)}/星门${value.exits.star_count}`);
  if (value.numeric_ice.contracted_count) parts.push(`数字冰块×${value.numeric_ice.contracted_count}`);
  if (value.shells.contracted_count) parts.push(`双层块×${value.shells.contracted_count}`);
  if (value.covers.count) parts.push(`卷帘门×${value.covers.count}${compact(value.covers.values)}`);
  if (value.generators.count) parts.push(`生成器×${value.generators.count}`);
  if (value.staged_frames.count) parts.push(`固定分层框×${value.staged_frames.count}`);
  if (value.axis_blocks.contracted_count) parts.push(`轴向块×${value.axis_blocks.contracted_count}`);
  if (value.keys_locks.key_count || value.keys_locks.lock_count) parts.push(`钥匙${value.keys_locks.key_count}/锁${value.keys_locks.lock_count}`);
  if (value.bombs.contracted_count) parts.push(`炸弹×${value.bombs.contracted_count}`);
  if (value.circular_double_arrow.contracted_count) parts.push(`双箭头×${value.circular_double_arrow.contracted_count}`);
  if (value.flip_doors.count) parts.push(`翻转门×${value.flip_doors.count}`);
  if (value.colored_grid.count) parts.push(`彩色网格×${value.colored_grid.count}`);
  return parts.join("；") || "无特殊机制";
}

function colorHex(value) {
  return COLOR[String(value ?? "unclear").toLowerCase()] ?? "#8890ad";
}

function cellRectsPath(cells, boardX, boardY, cell) {
  return cells.map(([x, y]) => `M${boardX + x * cell},${boardY + y * cell}h${cell}v${cell}h-${cell}z`).join("");
}

function boundaryLines(cells, boardX, boardY, cell) {
  const set = new Set(cells.map(([x, y]) => `${x},${y}`));
  const lines = [];
  for (const [x, y] of cells) {
    const left = boardX + x * cell; const top = boardY + y * cell; const right = left + cell; const bottom = top + cell;
    if (!set.has(`${x},${y - 1}`)) lines.push(`M${left},${top}H${right}`);
    if (!set.has(`${x + 1},${y}`)) lines.push(`M${right},${top}V${bottom}`);
    if (!set.has(`${x},${y + 1}`)) lines.push(`M${right},${bottom}H${left}`);
    if (!set.has(`${x - 1},${y}`)) lines.push(`M${left},${bottom}V${top}`);
  }
  return lines.join("");
}

function blockCenter(block, boardX, boardY, cell) {
  const cells = asArray(block.cells);
  const xs = cells.map(([x]) => x); const ys = cells.map(([, y]) => y);
  return {
    x: boardX + ((Math.min(...xs) + Math.max(...xs) + 1) / 2) * cell,
    y: boardY + ((Math.min(...ys) + Math.max(...ys) + 1) / 2) * cell,
  };
}

function renderGate(gate, index, sideGroup, geometry, kind) {
  const { boardX, boardY, boardW, boardH, cell } = geometry;
  const side = gate.side ?? "top";
  const sideLength = side === "top" || side === "bottom" ? boardW : boardH;
  const count = sideGroup.length;
  const fallbackSpan = Math.max(cell * 0.9, Math.min(cell * 2.2, sideLength / Math.max(1, count)));
  const requestedSpan = finite(gate.size) ? Number(gate.size) * cell : fallbackSpan;
  const span = Math.min(sideLength / Math.max(1, count), requestedSpan);
  const offsetKnown = finite(gate.offset);
  const start = offsetKnown ? Number(gate.offset) * cell : (index + 0.5) * sideLength / count - span / 2;
  const thickness = 18;
  let x = boardX; let y = boardY; let w = span; let h = thickness;
  if (side === "top") { x += start; y -= thickness + 7; }
  if (side === "bottom") { x += start; y += boardH + 7; }
  if (side === "left") { x -= thickness + 7; y += start; w = thickness; h = span; }
  if (side === "right") { x += boardW + 7; y += start; w = thickness; h = span; }
  const sourceColor = gate.color ?? gate.color_class ?? "unclear";
  const fill = kind === "frozen" ? "#9eeaf3" : colorHex(sourceColor);
  const dash = offsetKnown ? "" : ' stroke-dasharray="5 4"';
  const number = kind === "frozen" ? gateValue(gate) : kind === "star" ? "★" : "▶";
  return `<g><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${fill}" stroke="#fff" stroke-width="2"${dash}/><text x="${x + w / 2}" y="${y + h / 2 + 1}" class="gate-label">${escapeXml(number ?? "?")}</text>${offsetKnown ? "" : `<text x="${x + w / 2}" y="${side === "top" ? y - 7 : y + h + 12}" class="hint">示意</text>`}</g>`;
}

function renderCandidateSvg(record) {
  const candidate = record.candidate;
  const opening = openingBlocks(candidate);
  const width = candidate.board.width; const height = candidate.board.height;
  const cell = Math.min(54, 390 / width, 650 / height);
  const boardW = width * cell; const boardH = height * cell;
  const boardX = (CANDIDATE_VIEWPORT.width - boardW) / 2;
  const boardY = 210 + (650 - boardH) / 2;
  const geometry = { boardX, boardY, boardW, boardH, cell };
  const mask = candidate.board.playable_mask;
  const bindingsByBlock = new Map();
  for (const binding of asArray(candidate.mechanism_bindings)) {
    if (!binding.block_id) continue;
    const list = bindingsByBlock.get(binding.block_id) ?? []; list.push(binding); bindingsByBlock.set(binding.block_id, list);
  }
  const contract = candidate.mechanism_contract ?? {};
  const gridSvg = asArray(contract.colored_grid).flatMap((grid) => asArray(grid.cells).map(([x, y]) => `<rect x="${boardX + x * cell + 1}" y="${boardY + y * cell + 1}" width="${cell - 2}" height="${cell - 2}" rx="4" fill="${colorHex(grid.color)}" opacity=".27" stroke="${colorHex(grid.color)}" stroke-width="2"/>`)).join("");
  const boardCells = [];
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    if (mask[y]?.[x] === "#") boardCells.push(`<rect x="${boardX + x * cell}" y="${boardY + y * cell}" width="${cell}" height="${cell}" fill="#28265d" stroke="#45427c" stroke-width="1"/>`);
  }
  const blocksSvg = opening.map((block) => {
    const cells = asArray(block.cells);
    const fill = colorHex(block.color);
    const pathData = cellRectsPath(cells, boardX, boardY, cell);
    const outline = boundaryLines(cells, boardX, boardY, cell);
    const bindings = bindingsByBlock.get(block.id) ?? [];
    const shell = bindings.find((binding) => binding.kind === "shell");
    const shellColor = shell?.expected_layer_colors?.at(-1);
    const center = blockCenter(block, boardX, boardY, cell);
    const icons = bindings.map((binding, index) => {
      let icon = BINDING_ICON[binding.kind] ?? "?";
      if (binding.kind === "axis_block") icon = binding.source_item?.axis === "horizontal" ? "↔" : "↕";
      if (binding.kind === "numeric_ice" || binding.kind === "bomb") icon = `${BINDING_ICON[binding.kind]}${binding.source_item?.value ?? ""}`;
      if (binding.kind === "lock_block") icon = `▣${binding.source_item?.lock_count ?? 1}`;
      const dx = (index - (bindings.length - 1) / 2) * 24;
      return `<g><circle cx="${center.x + dx}" cy="${center.y}" r="12" fill="#17134d" stroke="#fff" stroke-width="1.4"/><text x="${center.x + dx}" y="${center.y + 1}" class="icon">${escapeXml(icon)}</text></g>`;
    }).join("");
    return `<g data-block="${escapeXml(block.id)}"><path d="${pathData}" fill="${fill}"/><path d="${outline}" fill="none" stroke="#161343" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><path d="${outline}" fill="none" stroke="${shellColor ? colorHex(shellColor) : "#ffffff"}" stroke-opacity="${shellColor ? .9 : .23}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>${icons}</g>`;
  }).join("");
  const covers = asArray(contract.covers);
  const knownCovers = covers.filter((cover) => [cover.x, cover.y, cover.w, cover.h].every(finite));
  const unknownCovers = covers.filter((cover) => ![cover.x, cover.y, cover.w, cover.h].every(finite));
  const coverSvg = knownCovers.map((cover) => {
    const x = boardX + Number(cover.x) * cell; const y = boardY + Number(cover.y) * cell;
    const w = Number(cover.w) * cell; const h = Number(cover.h) * cell;
    return `<g><rect x="${x + 2}" y="${y + 2}" width="${w - 4}" height="${h - 4}" rx="10" fill="#4d3fb0" fill-opacity=".96" stroke="#f49a33" stroke-width="4"/><path d="M${x + 10},${y + h / 2}H${x + w - 10}" stroke="#8173df" stroke-width="5"/><text x="${x + w / 2}" y="${y + h / 2}" class="cover-count">${escapeXml(cover.count ?? "?")}</text></g>`;
  }).join("");
  const exitGroups = [];
  const allGates = [
    ...asArray(contract.directional_exits?.ordinary).map((gate) => ({ gate, kind: "ordinary" })),
    ...asArray(contract.directional_exits?.frozen).map((gate) => ({ gate, kind: "frozen" })),
    ...asArray(contract.directional_exits?.star).map((gate) => ({ gate, kind: "star" })),
  ];
  const gatesBySide = new Map();
  for (const entry of allGates) {
    const side = entry.gate.side ?? "top";
    const group = gatesBySide.get(side) ?? [];
    group.push(entry);
    gatesBySide.set(side, group);
  }
  for (const group of gatesBySide.values()) {
    group.forEach((entry, index) => exitGroups.push(renderGate(entry.gate, index, group, geometry, entry.kind)));
  }
  const generators = asArray(contract.generators);
  const generatorSvg = generators.map((generator, index) => {
    const position = String(generator.visual_position ?? "").toLowerCase();
    const side = generator.side
      ?? (position.includes("top") ? "top" : position.includes("bottom") || position.includes("lower") ? "bottom" : position.includes("right") ? "right" : "left");
    const known = finite(generator.offset);
    const span = numeric(generator.rim_span ?? generator.rimSpan, 3) * cell;
    const offset = known ? Number(generator.offset) * cell : ((index + 0.5) / generators.length) * (side === "left" || side === "right" ? boardH : boardW) - span / 2;
    let x = boardX; let y = boardY; let w = span; let h = 24;
    if (side === "top") { x += offset; y -= 38; }
    if (side === "bottom") { x += offset; y += boardH + 14; }
    if (side === "left") { x -= 38; y += offset; w = 24; h = span; }
    if (side === "right") { x += boardW + 14; y += offset; w = 24; h = span; }
    return `<g><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="#25205f" stroke="#ff79cf" stroke-width="3"${known ? "" : ' stroke-dasharray="6 4"'}/><text x="${x + w / 2}" y="${y + h / 2}" class="icon">G</text>${known ? "" : `<text x="${x + w / 2}" y="${y + h + 12}" class="hint">示意</text>`}</g>`;
  }).join("");
  const flipSvg = asArray(contract.flip_doors).map((door) => {
    const side = door.side ?? "right"; const size = numeric(door.size, 1) * cell; const offsetKnown = finite(door.offset); const offset = offsetKnown ? Number(door.offset) * cell : 0;
    let x = boardX + boardW + 8; let y = boardY + offset; let w = 17; let h = size;
    if (side === "left") x = boardX - 25;
    if (side === "top" || side === "bottom") { x = boardX + offset; y = side === "top" ? boardY - 25 : boardY + boardH + 8; w = size; h = 17; }
    return `<g><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="${colorHex(door.color_class)}" stroke="#fff" stroke-width="2"${offsetKnown ? "" : ' stroke-dasharray="5 4"'}/><text x="${x + w / 2}" y="${y + h / 2}" class="icon">⇄</text></g>`;
  }).join("");
  const stagedFrames = asArray(contract.staged_frames);
  const knownFrames = stagedFrames.filter((frame) => [frame.x, frame.y, frame.w, frame.h].every(finite));
  const unknownFrames = stagedFrames.filter((frame) => ![frame.x, frame.y, frame.w, frame.h].every(finite));
  const frameSvg = knownFrames.map((frame) => `<rect x="${boardX + Number(frame.x) * cell + 2}" y="${boardY + Number(frame.y) * cell + 2}" width="${Number(frame.w) * cell - 4}" height="${Number(frame.h) * cell - 4}" rx="9" fill="none" stroke="#ffb04f" stroke-width="4" stroke-dasharray="8 5"/>`).join("");
  const unknownRegionNotes = [
    ...(unknownCovers.length ? [`卷帘门×${unknownCovers.length}`] : []),
    ...(unknownFrames.length ? [`分层框×${unknownFrames.length}`] : []),
  ];
  const unknownRegionText = unknownRegionNotes.length ? `<g><rect x="38" y="895" width="420" height="34" rx="9" fill="#322b70" stroke="#f49a33" stroke-width="2" stroke-dasharray="7 5"/><text x="248" y="912" class="unknown">${escapeXml(unknownRegionNotes.join("、"))}：位置不明（未伪造覆盖区）</text></g>` : "";
  const unbound = asArray(candidate.mechanism_bindings).filter((item) => !item.block_id);
  const unsupported = asArray(candidate.runtime_unsupported_mechanisms);
  const warnings = [
    ...(unbound.length ? [`未绑定机制×${unbound.length}`] : []),
    ...(unsupported.length ? [`静态示意：${unsupported.map((id) => UNSUPPORTED_LABEL[id] ?? id).join("、")}`] : []),
  ];
  const warningText = warnings.length ? warnings.join("；") : "结构候选已生成；可解性与运行时行为未验证";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="496" height="1078" viewBox="0 0 496 1078">
    <defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#241d68"/><stop offset="1" stop-color="#120e42"/></linearGradient><filter id="shadow"><feDropShadow dx="0" dy="5" stdDeviation="6" flood-opacity=".35"/></filter></defs>
    <style>.title{font:800 28px Arial,"Microsoft YaHei",sans-serif;fill:white}.sub{font:600 14px Arial,"Microsoft YaHei",sans-serif;fill:#c9c5f4}.gate-label,.cover-count,.icon{font:800 13px Arial,"Microsoft YaHei",sans-serif;fill:#fff;text-anchor:middle;dominant-baseline:middle}.cover-count{font-size:22px}.hint{font:700 9px Arial,"Microsoft YaHei",sans-serif;fill:#ffd9a6;text-anchor:middle}.unknown{font:700 13px Arial,"Microsoft YaHei",sans-serif;fill:#ffd39a;text-anchor:middle;dominant-baseline:middle}.footer{font:600 13px Arial,"Microsoft YaHei",sans-serif;fill:#ffd2df;text-anchor:middle}</style>
    <rect width="496" height="1078" fill="url(#bg)"/><text x="248" y="64" class="title" text-anchor="middle">LEVEL ${record.level}</text><text x="248" y="94" class="sub" text-anchor="middle">本游戏候选开局图 · 未求解 · 未接入</text><text x="248" y="120" class="sub" text-anchor="middle">${candidate.board.width}×${candidate.board.height} · ${opening.length}个开局色块 · ${candidate.time_seconds ?? "?"}秒</text>
    <g filter="url(#shadow)"><rect x="${boardX - 10}" y="${boardY - 10}" width="${boardW + 20}" height="${boardH + 20}" rx="12" fill="#595690" stroke="#7a76b3" stroke-width="3"/>${boardCells.join("")}${gridSvg}${blocksSvg}${frameSvg}${coverSvg}${exitGroups.join("")}${generatorSvg}${flipSvg}</g>
    ${unknownRegionText}<rect x="28" y="949" width="440" height="82" rx="12" fill="#1c174e" stroke="#4d458e"/><text x="248" y="976" class="footer">${escapeXml(warningText)}</text><text x="248" y="1002" class="sub" text-anchor="middle">虚线边框＝来源位置不明，仅为示意</text><text x="248" y="1025" class="sub" text-anchor="middle">这是数据候选预览，不代表正式可玩关卡截图</text>
  </svg>`;
}

async function setSvgPage(page, svg) {
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#120e42}svg{display:block}</style></head><body>${svg}</body></html>`, { waitUntil: "load" });
  await page.evaluate(() => document.fonts?.ready);
}

async function renderMissingCompetitor(page, output, level) {
  await page.setViewportSize(CANDIDATE_VIEWPORT);
  await page.setContent(`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><style>*{box-sizing:border-box}html,body{margin:0;width:496px;height:1078px;overflow:hidden;background:linear-gradient(#201a61,#0f0c35);font-family:Arial,"Microsoft YaHei",sans-serif;color:#fff}body{display:flex;align-items:center;justify-content:center}.card{width:404px;padding:42px 28px;border:2px dashed #8177c5;border-radius:20px;background:#211b60;text-align:center}.level{font-size:34px;font-weight:900}.missing{margin:32px 0 12px;font-size:26px;color:#ffafc0}.note{font-size:16px;line-height:1.7;color:#c6c0ec}</style></head><body><div class="card"><div class="level">竞品 Lv${level}</div><div class="missing">开局截图来源缺失</div><div class="note">本地视频与历史截图均无可核实开局帧。<br>此处不使用网络版本截图冒充精确来源。</div></div></body></html>`, { waitUntil: "load" });
  await page.screenshot({ path: output });
}

function renderSummaryRows(record) {
  return record.metrics.slice(0, 10).map((row) => {
    const state = row.status === "source_backed_match" ? "backed" : row.status === "mismatch" ? "diff" : "unclear";
    const badge = row.status === "source_backed_match" ? "来源支持" : row.status === "mismatch" ? "不同" : row.status === "source_partial" ? "来源部分明确" : "未核实";
    const left = row.key.includes("shape_histogram") && typeof row.competitor === "object" ? histogramText(row.competitor) : compact(row.competitor);
    const right = row.key.includes("shape_histogram") ? histogramText(row.ours) : compact(row.ours);
    return `<div class="row ${state}"><b>${escapeHtml(row.label)} <i>${badge}</i></b><span>${escapeHtml(left)}</span><span>${escapeHtml(right)}</span></div>`;
  }).join("");
}

async function renderPair(page, record) {
  await page.setViewportSize(PAIR_VIEWPORT);
  const competitorMime = record.competitorImage.endsWith(".jpg") ? "image/jpeg" : "image/png";
  const [competitorImage, candidateImage] = await Promise.all([
    dataUrl(path.resolve(OUTPUT, record.competitorImage), competitorMime),
    dataUrl(path.resolve(OUTPUT, record.candidateImage), "image/png"),
  ]);
  const mechanismWarnings = record.mechanisms.filter((row) => row.status !== "source_backed_match");
  const warnings = [
    ...record.designFillFields.map((field) => `设计补全：${field}`),
    ...record.unboundMechanisms.map((item) => `未绑定：${item.kind}`),
    ...record.runtimeUnsupported.map((item) => `未接入运行时：${UNSUPPORTED_LABEL[item] ?? item}`),
  ];
  await page.setContent(`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><style>
    *{box-sizing:border-box}html,body{margin:0;width:1500px;height:1280px;overflow:hidden;background:#0e0a32;color:#fff;font-family:Arial,"Microsoft YaHei",sans-serif}body{padding:22px 26px}header{height:62px;display:flex;justify-content:space-between;align-items:flex-start}h1{margin:0;font-size:31px}.status{padding:8px 14px;border-radius:17px;font-weight:800}.backed{background:#174f3b;color:#7df2b5}.fill{background:#5b3d17;color:#ffd28a}.missing{background:#64253a;color:#ff9bae}.shots{display:grid;grid-template-columns:1fr 1fr;gap:18px;height:700px}.panel{background:#1b1753;border:1px solid #45408a;border-radius:12px;padding:10px;display:flex;flex-direction:column;align-items:center}.panel h2{font-size:21px;margin:0 0 8px}.panel img{display:block;max-width:100%;height:642px;object-fit:contain;border-radius:7px}.head,.row{display:grid;grid-template-columns:260px 1fr 1fr;gap:12px}.head{margin-top:14px;padding:8px 10px;background:#332d74;border-radius:8px;font-weight:800}.row{padding:6px 10px;border-bottom:1px solid #312c6c;font-size:13px}.row span{overflow-wrap:anywhere}.row i{font-style:normal;font-size:11px;padding:2px 7px;border-radius:10px}.row.backed i{background:#174f3b;color:#7df2b5}.row.unclear i{background:#5b3d17;color:#ffd28a}.row.diff i{background:#64253a;color:#ff9bae}.mechanism{margin-top:9px;padding:8px 12px;border-radius:8px;background:${mechanismWarnings.length ? "#4b3420" : "#153f35"};font-size:13px;line-height:1.45}.note{margin-top:6px;color:#bbb6e7;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  </style></head><body><header><h1>Lv${record.level} · 竞品 vs 本游戏候选</h1><div class="status ${record.status.className}">${escapeHtml(record.status.label)}</div></header><div class="shots"><section class="panel"><h2>竞品开局截图${record.sourceMissing ? "（来源缺失）" : ""}</h2><img src="${competitorImage}"></section><section class="panel"><h2>本游戏候选开局图（未求解/未接入）</h2><img src="${candidateImage}"></section></div><div class="head"><span>核对项</span><span>竞品来源</span><span>本游戏候选</span></div>${renderSummaryRows(record)}<div class="mechanism"><b>机制合同：</b>${escapeHtml(record.mechanismDigest)}${warnings.length ? `<br><b>明确缺口：</b>${escapeHtml(warnings.join("；"))}` : ""}</div><div class="note">棋盘造型按原创目标绘制；来源 unclear/design-fill 不计为竞品精确一致。${escapeHtml(record.sourceUnclearFields.join("；"))}</div></body></html>`, { waitUntil: "load" });
  await page.evaluate(() => document.fonts?.ready);
  await page.screenshot({ path: path.join(OUTPUT, record.comparisonImage) });
}

const [truth, contract, candidates] = await Promise.all([
  readFile(TRUTH_PATH, "utf8").then(JSON.parse),
  readFile(CONTRACT_PATH, "utf8").then(JSON.parse),
  readFile(CANDIDATE_PATH, "utf8").then(JSON.parse),
]);

if (truth.levels?.length !== LEVEL_COUNT || contract.levels?.length !== LEVEL_COUNT || candidates.levels?.length !== LEVEL_COUNT) {
  throw new Error(`Expected ${LEVEL_COUNT} truth, contract, and candidate records.`);
}
for (let index = 0; index < LEVEL_COUNT; index += 1) {
  const expected = LEVEL_FROM + index;
  if (truth.levels[index].level !== expected || candidates.levels[index].id !== expected || contract.levels[index].level_id !== `Lv${expected}`) {
    throw new Error(`Input sequence mismatch at expected Lv${expected}.`);
  }
}

await Promise.all([COMPETITOR_DIR, CANDIDATE_DIR, PAIRS_DIR].map((dir) => mkdir(dir, { recursive: true })));
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: CANDIDATE_VIEWPORT, deviceScaleFactor: 1 });
const records = [];

for (let index = 0; index < LEVEL_COUNT; index += 1) {
  const truthLevel = truth.levels[index];
  const contractLevel = contract.levels[index];
  const candidate = candidates.levels[index];
  const stem = levelStem(candidate.id);
  const source = sourceFramePath(truthLevel);
  const sourceMissing = !source || !existsSync(source);
  const competitorFile = path.join(COMPETITOR_DIR, `${stem}.${sourceMissing ? "png" : "jpg"}`);
  const candidateFile = path.join(CANDIDATE_DIR, `${stem}.png`);
  if (sourceMissing) await renderMissingCompetitor(page, competitorFile, candidate.id);
  else await copyFile(source, competitorFile);
  await page.setViewportSize(CANDIDATE_VIEWPORT);
  const status = recordStatus(truthLevel, contractLevel, candidate);
  const record = {
    level: candidate.id,
    levelId: candidate.level_id,
    status,
    sourceMissing,
    sourceClassification: truthLevel.provenance?.classification,
    sourceOpeningFrame: sourceMissing ? null : source,
    competitorImage: rel(competitorFile),
    candidateImage: rel(candidateFile),
    comparisonImage: `level-comparisons/${stem}.png`,
    candidate,
    metrics: buildMetrics(truthLevel, contractLevel.our_design_target, candidate),
    mechanisms: mechanismRows(candidate.mechanism_contract, candidate.mechanism_bindings),
    mechanismDigest: mechanismDigest(candidate.mechanism_contract, candidate),
    designFillFields: asArray(contractLevel.truth_reference?.design_fill_fields),
    requiredExactFieldsMissing: asArray(truthLevel.required_exact_fields_missing),
    sourceUnclearFields: asArray(truthLevel.source_unclear_fields),
    unboundMechanisms: asArray(candidate.mechanism_bindings).filter((item) => !item.block_id),
    runtimeUnsupported: asArray(candidate.runtime_unsupported_mechanisms),
    solverStatus: candidate.solver?.status ?? "not_run_by_user_request",
    runtimeIntegration: candidate.runtime_integration?.status ?? "not_integrated",
  };
  await setSvgPage(page, renderCandidateSvg(record));
  await page.screenshot({ path: candidateFile });
  await renderPair(page, record);
  records.push(record);
  console.log(`rendered Lv${candidate.id}`);
}

await page.close();
await browser.close();

const publicRecord = (record) => ({
  level: record.level,
  level_id: record.levelId,
  status: record.status,
  source_missing: record.sourceMissing,
  source_classification: record.sourceClassification,
  source_opening_frame: record.sourceOpeningFrame,
  competitor_image: record.competitorImage,
  candidate_image: record.candidateImage,
  comparison_image: record.comparisonImage,
  metrics: record.metrics,
  mechanisms: record.mechanisms,
  mechanism_digest: record.mechanismDigest,
  design_fill_fields: record.designFillFields,
  required_exact_fields_missing: record.requiredExactFieldsMissing,
  source_unclear_fields: record.sourceUnclearFields,
  unbound_mechanisms: record.unboundMechanisms,
  runtime_unsupported_mechanisms: record.runtimeUnsupported,
  solver_status: record.solverStatus,
  runtime_integration: record.runtimeIntegration,
});
const counts = Object.fromEntries(["source_backed", "design_fill", "source_missing"].map((id) => [id, records.filter((record) => record.status.id === id).length]));
const summary = {
  level_count: records.length,
  ...counts,
  opening_frame_available_count: records.filter((record) => !record.sourceMissing).length,
  source_missing_level_ids: records.filter((record) => record.sourceMissing).map((record) => record.level),
  unbound_mechanism_level_ids: records.filter((record) => record.unboundMechanisms.length).map((record) => record.level),
  runtime_unsupported_level_ids: records.filter((record) => record.runtimeUnsupported.length).map((record) => record.level),
  gameplay_solver_run: false,
  runtime_integrated: false,
};
const payload = {
  schema_version: "competitor-vs-candidate-report-101-200-v1",
  generated_at: new Date().toISOString(),
  title: "竞品 Lv101–200 vs 本游戏未求解候选",
  source_truth: path.relative(ROOT, TRUTH_PATH).replaceAll("\\", "/"),
  source_contract: path.relative(ROOT, CONTRACT_PATH).replaceAll("\\", "/"),
  source_candidates: path.relative(ROOT, CANDIDATE_PATH).replaceAll("\\", "/"),
  candidate_file_sha256: sha256(await readFile(CANDIDATE_PATH)),
  candidate_semantic_sha256: sha256(JSON.stringify(canonical(candidates))),
  report_semantics: "offline candidate visualization; not gameplay screenshots; no solver run; not runtime integrated",
  summary,
  levels: records.map(publicRecord),
};
await writeFile(path.join(OUTPUT, "comparison.json"), `${JSON.stringify(payload, null, 2)}\n`, "utf8");

const csvHeaders = ["level", "status", "source_missing", "board", "time", "opening_count", "full_count", "design_fill_fields", "unbound_mechanisms", "runtime_unsupported", "solver", "runtime_integration", "comparison_image"];
const csvRows = records.map((record) => {
  const metric = (key) => record.metrics.find((item) => item.key === key);
  return [record.level, record.status.label, record.sourceMissing ? "是" : "否", metric("board_size")?.ours, metric("time_seconds")?.ours, metric("opening_piece_count")?.ours, metric("full_piece_count")?.ours, record.designFillFields.join("；"), record.unboundMechanisms.map((item) => item.kind).join("；"), record.runtimeUnsupported.join("；"), record.solverStatus, record.runtimeIntegration, record.comparisonImage];
});
await writeFile(path.join(OUTPUT, "comparison.csv"), `\uFEFF${[csvHeaders, ...csvRows].map((row) => row.map(csvCell).join(",")).join("\n")}\n`, "utf8");

const cards = records.map((record) => `<article data-status="${record.status.id}"><h2>Lv${record.level} · 候选开局 <span class="${record.status.className}">${escapeHtml(record.status.label)}</span></h2><a href="${record.comparisonImage}"><img loading="lazy" src="${record.comparisonImage}"></a><details><summary>查看逐项数据、机制合同与证据缺口</summary><div class="detail">${[...record.metrics, ...record.mechanisms].map((row) => `<div class="drow ${row.status}"><b>${escapeHtml(row.label)}</b><span>${escapeHtml(compact(row.competitor))}</span><span>${escapeHtml(compact(row.ours))}</span><small>${escapeHtml(row.note)}</small></div>`).join("")}</div></details></article>`).join("");
await writeFile(path.join(OUTPUT, "index.html"), `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>竞品 Lv101–200 vs 本游戏未求解候选</title><style>
  *{box-sizing:border-box}body{margin:0;background:#0e0a32;color:#fff;font-family:Arial,"Microsoft YaHei",sans-serif}header{position:sticky;top:0;z-index:3;padding:16px 22px;background:#17124cf2;border-bottom:1px solid #453e8e}h1{margin:0 0 5px;font-size:27px}header p{margin:0 0 10px;color:#bcb7e9}.warning{color:#ffd28a}.buttons{display:flex;gap:8px;flex-wrap:wrap}button{border:0;border-radius:16px;padding:8px 14px;background:#39327b;color:#fff;cursor:pointer}main{display:grid;grid-template-columns:repeat(auto-fill,minmax(520px,1fr));gap:15px;padding:18px}article{padding:10px;background:#211b60;border:1px solid #453e8e;border-radius:12px}article h2{font-size:18px;margin:0 0 8px}article h2 span{float:right;padding:3px 9px;border-radius:12px;font-size:13px}.backed{background:#174f3b;color:#7df2b5}.fill{background:#5b3d17;color:#ffd28a}.missing{background:#64253a;color:#ff9bae}article>a{display:block;background:#141044;border-radius:7px;overflow:hidden}article img{display:block;width:100%;height:auto}details{margin-top:8px;color:#d3d0f1}summary{cursor:pointer}.detail{margin-top:7px;max-height:520px;overflow:auto}.drow{display:grid;grid-template-columns:145px 1fr 1fr;gap:6px;padding:6px;border-bottom:1px solid #39327b;font-size:12px;overflow-wrap:anywhere}.drow small{grid-column:2/4;color:#aba5d6}.drow.source_unknown,.drow.source_partial,.drow.binding_gap,.drow.position_unknown,.drow.static_contract_only{background:#4a371f}.drow.mismatch{background:#51243a}.hidden{display:none}
</style></head><body><header><h1>竞品 Lv101–200 vs 本游戏未求解候选</h1><p>来源支持候选 ${counts.source_backed}/100 · 含设计补全/机制缺口 ${counts.design_fill}/100 · 来源缺失 ${counts.source_missing}/100</p><p class="warning">本报告是离线候选数据预览：未运行求解器、未接入正式游戏；design-fill 不代表与竞品精确一致。</p><div class="buttons"><button data-filter="all">全部100关</button><button data-filter="source_backed">来源支持候选</button><button data-filter="design_fill">含设计补全</button><button data-filter="source_missing">来源缺失</button></div></header><main>${cards}</main><script>document.querySelectorAll('button').forEach((button)=>button.onclick=()=>document.querySelectorAll('article').forEach((card)=>card.classList.toggle('hidden',button.dataset.filter!=='all'&&card.dataset.status!==button.dataset.filter)));</script></body></html>`, "utf8");

const markdown = [
  "# 竞品 Lv101–200 vs 本游戏未求解候选", "",
  "- 本报告为离线候选数据预览，未运行求解器、未接入正式游戏。",
  `- 竞品开局帧可用：${summary.opening_frame_available_count}/100；来源缺失：${summary.source_missing_level_ids.map((id) => `Lv${id}`).join("、") || "无"}。`,
  `- 来源支持候选：${counts.source_backed}/100；含设计补全或机制缺口：${counts.design_fill}/100；来源缺失：${counts.source_missing}/100。`,
  "- design-fill、来源 partial/unclear、静态合同示意均不称为竞品精确一致。", "",
  "|关卡|状态|竞品截图|棋盘|开局/全关色块|设计补全|未绑定机制|未接入运行时|对比图|",
  "|---:|---|---|---|---|---|---|---|---|",
  ...records.map((record) => {
    const metric = (key) => record.metrics.find((item) => item.key === key);
    return `|Lv${record.level}|${record.status.label}|${record.sourceMissing ? "缺失" : "有"}|${metric("board_size")?.ours}|${metric("opening_piece_count")?.ours}/${metric("full_piece_count")?.ours}|${record.designFillFields.join("、") || "-"}|${record.unboundMechanisms.map((item) => item.kind).join("、") || "-"}|${record.runtimeUnsupported.join("、") || "-"}|[查看](${record.comparisonImage})|`;
  }), "",
];
await writeFile(path.join(OUTPUT, "comparison.md"), markdown.join("\n"), "utf8");
console.log(JSON.stringify({ output: OUTPUT, summary, gameplaySolverRun: false, runtimeIntegrated: false }, null, 2));
