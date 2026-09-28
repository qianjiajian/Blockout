import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const reviewDir = path.join(root, "playtest-results", "competitor-board-shapes");
const outputDir = path.join(root, "deliverables", "competitor-board-shapes");
const screenshotRoot = path.join(
  root,
  "deliverables",
  "competitor-screenshots",
  "BlockOut-competitor-levels-001-100-2026-06",
  "levels",
);

const reviewFiles = [
  "review-lv001-034.json",
  "review-lv035-067.json",
  "review-lv068-100.json",
].map((name) => path.join(reviewDir, name));

const videoFiles = [
  path.join(reviewDir, "15583c7e-board-shapes", "board-shape-analysis.json"),
  path.join(reviewDir, "e5841e9d60c7908d21cffdbaf6e7feae-board-shapes.json"),
];

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function recordsOf(raw) {
  if (Array.isArray(raw)) return raw;
  return raw.levels ?? raw.records ?? [];
}

function asLevel(value) {
  if (typeof value === "number") return value;
  const match = String(value ?? "").match(/\d+/);
  return match ? Number(match[0]) : Number.NaN;
}

function normalize(raw, evidenceType, evidenceFile) {
  const level = asLevel(raw.level_id ?? raw.level);
  const board = raw.board ?? {};
  const rows = board.rows ?? raw.rows ?? "unclear";
  const cols = board.cols ?? raw.cols ?? "unclear";
  const shape = raw.shape_type_cn ?? raw.outer_contour ?? raw.shape ?? "unclear";
  const componentCount = raw.component_count ?? raw.connected_regions ?? "unclear";
  const mask = raw.playable_mask ?? raw.mask ?? "unclear";
  const description = raw.description_cn ?? raw.shape_description ?? raw.description ?? "unclear";
  const rawOcclusions = raw.occluded_regions_cn
    ?? raw.internal_holes_or_occlusions
    ?? raw.internal_holes_or_occlusions_cn
    ?? [];
  const occlusions = (Array.isArray(rawOcclusions) ? rawOcclusions : [rawOcclusions])
    .map((item) => typeof item === "string" ? item : item?.description ?? JSON.stringify(item));
  const internalHoleCount = raw.internal_hole_count ?? "unclear";
  const confidence = raw.confidence ?? "low";
  const unclearFields = Array.isArray(raw.unclear_fields)
    ? raw.unclear_fields
    : Array.isArray(raw.unclear)
      ? raw.unclear
      : [];
  return {
    level,
    rows,
    cols,
    shape,
    componentCount,
    mask,
    description,
    occlusions,
    internalHoleCount,
    confidence,
    unclearFields,
    evidenceType,
    evidenceFile,
  };
}

function isClear(value) {
  return value !== null && value !== undefined && value !== "unclear";
}

function bestValue(options, key) {
  return options.find((item) => isClear(item[key]))?.[key] ?? "unclear";
}

function bestValueByEvidence(options, key, preferredEvidenceFragment) {
  return bestValue(
    [...options.filter((item) => item.evidenceType.includes(preferredEvidenceFragment)), ...options],
    key,
  );
}

function cleanShapeLabel(value) {
  return String(value)
    .replace(/（[^）]*(?:遮挡|外壳|冰框)[^）]*）/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function bestShape(options) {
  const screenshotShape = options.find(
    (item) => item.evidenceType.includes("screenshot") && isClear(item.shape) && !/(?:遮挡|外壳)/.test(item.shape),
  )?.shape;
  const videoShape = options.find((item) => item.evidenceType.includes("video") && isClear(item.shape))?.shape;
  return cleanShapeLabel(screenshotShape ?? videoShape ?? bestValue(options, "shape"));
}

function score(record) {
  let total = record.evidenceType.includes("video") ? 20 : 10;
  if (isClear(record.rows)) total += 3;
  if (isClear(record.cols)) total += 3;
  if (isClear(record.shape)) total += 3;
  if (isClear(record.componentCount)) total += 2;
  if (Array.isArray(record.mask)) total += 5;
  if (record.confidence === "high") total += 3;
  if (record.confidence === "medium") total += 1;
  total -= record.unclearFields.length;
  return total;
}

function escapedCsv(value) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

function exactMaskStats(mask) {
  if (!Array.isArray(mask) || !mask.length || mask.some((row) => row.includes("?"))) return null;
  const width = mask[0].length;
  if (!width || mask.some((row) => row.length !== width || !/^[#.]+$/.test(row))) return null;
  const cells = mask.map((row) => [...row]);
  let playable = 0;
  let voids = 0;
  let components = 0;
  let enclosedHoles = 0;
  const visited = new Set();
  const key = (row, col) => `${row},${col}`;
  for (let row = 0; row < cells.length; row += 1) {
    for (let col = 0; col < width; col += 1) {
      if (cells[row][col] === "#") playable += 1;
      else voids += 1;
      if (cells[row][col] !== "#" || visited.has(key(row, col))) continue;
      components += 1;
      const queue = [[row, col]];
      visited.add(key(row, col));
      while (queue.length) {
        const [currentRow, currentCol] = queue.shift();
        for (const [nextRow, nextCol] of [
          [currentRow - 1, currentCol],
          [currentRow + 1, currentCol],
          [currentRow, currentCol - 1],
          [currentRow, currentCol + 1],
        ]) {
          if (
            nextRow < 0
            || nextRow >= cells.length
            || nextCol < 0
            || nextCol >= width
            || cells[nextRow][nextCol] !== "#"
            || visited.has(key(nextRow, nextCol))
          ) continue;
          visited.add(key(nextRow, nextCol));
          queue.push([nextRow, nextCol]);
        }
      }
    }
  }
  const visitedVoids = new Set();
  for (let row = 0; row < cells.length; row += 1) {
    for (let col = 0; col < width; col += 1) {
      if (cells[row][col] !== "." || visitedVoids.has(key(row, col))) continue;
      let touchesBoundary = false;
      const queue = [[row, col]];
      visitedVoids.add(key(row, col));
      while (queue.length) {
        const [currentRow, currentCol] = queue.shift();
        if (currentRow === 0 || currentRow === cells.length - 1 || currentCol === 0 || currentCol === width - 1) {
          touchesBoundary = true;
        }
        for (const [nextRow, nextCol] of [
          [currentRow - 1, currentCol],
          [currentRow + 1, currentCol],
          [currentRow, currentCol - 1],
          [currentRow, currentCol + 1],
        ]) {
          if (
            nextRow < 0
            || nextRow >= cells.length
            || nextCol < 0
            || nextCol >= width
            || cells[nextRow][nextCol] !== "."
            || visitedVoids.has(key(nextRow, nextCol))
          ) continue;
          visitedVoids.add(key(nextRow, nextCol));
          queue.push([nextRow, nextCol]);
        }
      }
      if (!touchesBoundary) enclosedHoles += 1;
    }
  }
  return {
    rows: cells.length,
    cols: width,
    playable_cell_count: playable,
    outside_gap_count: voids,
    footprint_ratio: Number((playable / (playable + voids)).toFixed(4)),
    computed_component_count: components,
    computed_internal_hole_count: enclosedHoles,
  };
}

function shapeFamily(shape, componentCount) {
  const text = String(shape);
  if (Number.isInteger(componentCount) && componentCount > 1) return "多分区组合";
  if (/H\s*形|H形/i.test(text)) return "H形";
  if (/L\s*形|L形/i.test(text)) return "L形";
  if (/T\s*形|T形|锤形/i.test(text)) return "T形";
  if (/工字|沙漏|哑铃|窄颈|收腰/i.test(text)) return "窄颈/工字形";
  if (/阶梯|菱形|八边形|漏斗/i.test(text)) return "阶梯/多边形";
  if (/缺口|开槽|U\s*形|凹口|缩进|钥匙孔|城堡|竖槽|隔断|内孔/i.test(text)) return "凹口/开槽形";
  if (/矩形|正方形|rectangle/i.test(text)) return "完整矩形";
  return "其他异形";
}

for (const file of reviewFiles) {
  if (!fs.existsSync(file)) {
    throw new Error(`Missing manual screenshot review: ${path.relative(root, file)}`);
  }
}

const candidates = new Map();
for (const file of reviewFiles) {
  for (const raw of recordsOf(readJson(file))) {
    const record = normalize(raw, "manual_screenshot_review", path.relative(root, file).replaceAll("\\", "/"));
    if (!Number.isInteger(record.level)) continue;
    const list = candidates.get(record.level) ?? [];
    list.push(record);
    candidates.set(record.level, list);
  }
}

for (const file of videoFiles.filter((candidate) => fs.existsSync(candidate))) {
  for (const raw of recordsOf(readJson(file))) {
    const record = normalize(raw, "manual_video_review", path.relative(root, file).replaceAll("\\", "/"));
    if (!Number.isInteger(record.level) || raw.board_visible === false) continue;
    const list = candidates.get(record.level) ?? [];
    list.push(record);
    candidates.set(record.level, list);
  }
}

const levels = [];
const conflicts = [];
const validationIssues = [];
for (let level = 1; level <= 100; level += 1) {
  const options = candidates.get(level) ?? [];
  if (!options.length) throw new Error(`No review record for Level ${level}`);
  options.sort((a, b) => score(b) - score(a));
  const chosen = options[0];

  const rows = bestValueByEvidence(options, "rows", "video");
  const cols = bestValueByEvidence(options, "cols", "video");
  const shape = bestShape(options);
  const componentCount = bestValueByEvidence(options, "componentCount", "screenshot");
  const mask = bestValueByEvidence(options, "mask", "video");
  const description = bestValueByEvidence(options, "description", "video");
  const occlusions = [...new Set(options.flatMap((item) => Array.isArray(item.occlusions) ? item.occlusions : []))];
  let internalHoleCount = bestValue(options, "internalHoleCount");
  const confidence = [...options]
    .sort((a, b) => ({ high: 3, medium: 2, low: 1 }[b.confidence] ?? 0) - ({ high: 3, medium: 2, low: 1 }[a.confidence] ?? 0))[0]
    ?.confidence ?? "low";

  for (const other of options.slice(1)) {
    const differing = ["rows", "cols", "componentCount"]
      .filter((key) => isClear(chosen[key]) && isClear(other[key]) && chosen[key] !== other[key]);
    if (differing.length) {
      conflicts.push({
        level_id: `Level ${level}`,
        fields: differing,
        status: "resolved",
        resolution: chosen.evidenceType.includes("video")
          ? "used the manually reviewed clear-state video grid"
          : "used the manually reviewed opening screenshot",
        chosen_evidence: chosen.evidenceFile,
        alternate_evidence: other.evidenceFile,
      });
    }
  }

  const screenshotName = `competitor-level-${String(level).padStart(3, "0")}.jpg`;
  const screenshot = path.join(screenshotRoot, screenshotName);
  if (!fs.existsSync(screenshot)) throw new Error(`Missing screenshot: ${screenshotName}`);

  const unclearFields = new Set();
  if (!isClear(rows)) unclearFields.add("board.rows");
  if (!isClear(cols)) unclearFields.add("board.cols");
  if (!isClear(shape)) unclearFields.add("shape_type");
  if (!isClear(componentCount)) unclearFields.add("component_count");
  if (!Array.isArray(mask) || mask.some((row) => row.includes("?"))) unclearFields.add("playable_mask");
  const geometryStats = exactMaskStats(mask);
  if (geometryStats) {
    if (!Number.isInteger(internalHoleCount)) internalHoleCount = geometryStats.computed_internal_hole_count;
    if (Number.isInteger(rows) && rows !== geometryStats.rows) {
      validationIssues.push({ level_id: `Level ${level}`, field: "board.rows", reported: rows, mask_value: geometryStats.rows });
    }
    if (Number.isInteger(cols) && cols !== geometryStats.cols) {
      validationIssues.push({ level_id: `Level ${level}`, field: "board.cols", reported: cols, mask_value: geometryStats.cols });
    }
    if (Number.isInteger(componentCount) && componentCount !== geometryStats.computed_component_count) {
      validationIssues.push({
        level_id: `Level ${level}`,
        field: "component_count",
        reported: componentCount,
        mask_value: geometryStats.computed_component_count,
      });
    }
  }
  if (!Number.isInteger(internalHoleCount)) unclearFields.add("internal_hole_count");

  levels.push({
    source: "Block Out! - Color Sort Puzzle",
    source_version: "2026-06 新版 Lv1–100 人工复核截图集",
    level_id: `Level ${level}`,
    screenshot: path.relative(root, screenshot).replaceAll("\\", "/"),
    board: {
      rows,
      cols,
    },
    shape_type: shape,
    shape_family: shapeFamily(shape, componentCount),
    component_count: componentCount,
    playable_mask: mask,
    internal_hole_count: internalHoleCount,
    visibility_notes: occlusions,
    geometry_stats: geometryStats ?? {
      playable_cell_count: "unclear",
      outside_gap_count: "unclear",
      footprint_ratio: "unclear",
    },
    shape_description: description,
    confidence,
    unclear_fields: [...unclearFields],
    evidence: options.map((item) => ({
      type: item.evidenceType,
      file: item.evidenceFile,
    })),
  });
}

fs.mkdirSync(outputDir, { recursive: true });
const result = {
  dataset: "Block Out! competitor board-shape catalog",
  version: 1,
  scope: "仅使用新版 Lv1–100 截图集；已排除旧版 Lv1–20 素材",
  definition: "棋盘造型指可玩托盘的格子轮廓及其独立分区；方块摆放、临时外壳和覆盖内容不计作棋盘造型。",
  mask_legend: {
    "#": "素材中可确认的可玩格",
    ".": "包围网格内、棋盘轮廓之外的缺格",
    "?": "受遮挡或无法从素材确认的格",
  },
  level_count: levels.length,
  unclear_level_count: levels.filter((item) => item.unclear_fields.length > 0).length,
  resolved_evidence_differences: conflicts,
  validation_issues: validationIssues,
  levels,
};

const jsonPath = path.join(outputDir, "blockout-lv001-lv100-board-shapes.json");
fs.writeFileSync(jsonPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");

const csvHeader = [
  "level_id",
  "rows",
  "cols",
  "shape_type",
  "shape_family",
  "component_count",
  "shape_description",
  "confidence",
  "unclear_fields",
  "screenshot",
];
const csvRows = levels.map((item) => [
  item.level_id,
  item.board.rows,
  item.board.cols,
  item.shape_type,
  item.shape_family,
  item.component_count,
  item.shape_description,
  item.confidence,
  item.unclear_fields.join(";"),
  item.screenshot,
].map(escapedCsv).join(","));
const csvPath = path.join(outputDir, "blockout-lv001-lv100-board-shapes.csv");
fs.writeFileSync(csvPath, `\uFEFF${csvHeader.map(escapedCsv).join(",")}\n${csvRows.join("\n")}\n`, "utf8");

const tableRows = levels.map((item) => {
  const dims = `${item.board.rows}×${item.board.cols}`;
  const unclear = item.unclear_fields.length ? item.unclear_fields.join("、") : "—";
  return `| ${item.level_id.replace("Level ", "")} | ${dims} | ${item.shape_type} | ${item.component_count} | ${item.shape_description} | ${item.confidence} | ${unclear} |`;
});
const mdPath = path.join(outputDir, "blockout-lv001-lv100-board-shapes.md");
fs.writeFileSync(
  mdPath,
  [
    "# Block Out! 竞品 Lv1–100 棋盘造型清单",
    "",
    "> 口径：只记录棋盘托盘的可玩外轮廓与分区；方块摆放、临时外壳和覆盖内容不算棋盘造型。`#` 为可玩格，`.` 为包围网格中的外部缺口，`?` 为素材遮挡或看不清。",
    "",
    `- 关卡数：${levels.length}`,
    `- 含 unclear：${result.unclear_level_count}`,
    `- 已解决证据差异：${conflicts.length}`,
    `- 掩码校验问题：${validationIssues.length}`,
    "",
    "| 关卡 | 行×列 | 造型 | 连通分区 | 可见描述 | 置信度 | unclear 字段 |",
    "|---:|---:|---|---:|---|---|---|",
    ...tableRows,
    "",
  ].join("\n"),
  "utf8",
);

console.log(JSON.stringify({
  json: path.relative(root, jsonPath),
  csv: path.relative(root, csvPath),
  markdown: path.relative(root, mdPath),
  levelCount: levels.length,
  unclearLevelCount: result.unclear_level_count,
  conflictCount: conflicts.length,
  validationIssueCount: validationIssues.length,
}, null, 2));
