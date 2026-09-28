import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { build } from "esbuild";

const ROOT = process.cwd();
const OUTPUT_DIR = path.resolve(
  ROOT,
  process.argv[2] ?? "deliverables/competitor-vs-ours-v8-video-parity-direct",
);
const JSON_OUTPUT = path.join(OUTPUT_DIR, "imagegen-temporary-whole-piece-assets.json");
const MARKDOWN_OUTPUT = path.join(OUTPUT_DIR, "imagegen-temporary-whole-piece-assets.md");

const GENERATOR_ASSET = {
  filename: "side-generator-horizontal-3-v1.png",
  assetKind: "mechanism",
  shape: "side_generator_horizontal_3",
  shapeLabel: "三格边框色块制造器",
  manifestSource: "gameplay/mechanics/video-parity-v1/side-generator-horizontal-3-v1.png",
};

const COLORS = ["red", "blue", "green", "yellow", "purple", "orange", "pink", "cyan"];
const COLOR_LABELS = {
  red: "红",
  blue: "蓝",
  green: "绿",
  yellow: "黄",
  purple: "紫",
  orange: "橙",
  pink: "粉",
  cyan: "青",
};

const FAMILY_SPECS = [
  {
    shapeId: 10,
    shape: "l_tetromino",
    shapeLabel: "L 四格",
    suffix: "l-tetromino",
    colors: COLORS,
  },
  {
    shapeId: 11,
    shape: "z_tetromino",
    shapeLabel: "Z 四格",
    suffix: "z-tetromino",
    colors: ["red", "purple", "cyan"],
  },
  {
    shapeId: 12,
    shape: "plus_pentomino",
    shapeLabel: "十字五格",
    suffix: "plus-pentomino",
    colors: ["blue", "green", "pink", "purple", "cyan", "red"],
  },
  {
    shapeId: 13,
    shape: "rectangle_2x3",
    shapeLabel: "2×3 长方形",
    suffix: "rectangle-2x3",
    colors: COLORS,
  },
  {
    shapeId: 14,
    shape: "square_3x3",
    shapeLabel: "3×3 方形",
    suffix: "square-3x3",
    colors: COLORS,
  },
  {
    shapeId: 15,
    shape: "horizontal_4",
    shapeLabel: "横向四格",
    suffix: "horizontal-4",
    colors: ["blue", "pink"],
  },
  {
    shapeId: 16,
    shape: "t_pentomino",
    shapeLabel: "T 五格",
    suffix: "t-pentomino",
    colors: ["pink"],
  },
];

const canonical = (value) => {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().filter((key) => value[key] !== undefined)
    .map((key) => [key, canonical(value[key])]));
};

const sha256 = (buffer) => createHash("sha256").update(buffer).digest("hex").toUpperCase();

const formatLevelIds = (levelIds) => levelIds.length > 0
  ? levelIds.map((levelId) => `Lv${levelId}`).join("、")
  : "未使用（仅注册）";

const compiled = await build({
  stdin: {
    contents: `
      import { LEVELS } from "./src/core/levels.ts";
      import { matchFormalBlockShape } from "./src/game/formalBlockShapes.ts";
      import { VIDEO_PARITY_GENERATOR_RIM_GEOMETRY } from "./src/core/videoParityGeneratorRimGeometry.ts";
      export default {
        levels: LEVELS,
        generatorRimGeometry: VIDEO_PARITY_GENERATOR_RIM_GEOMETRY,
        matches: LEVELS.flatMap((level) => {
          const queuedIds = new Set((level.generators ?? []).flatMap((generator) => generator.queueBlockIds));
          return level.blocks.flatMap((block) => {
            const match = matchFormalBlockShape(block.shape);
            if (!match) return [];
            const colors = block.layers?.length ? block.layers : [block.color];
            return colors.map((color, stageIndex) => ({
              levelId: level.id,
              blockId: block.id,
              color,
              shapeId: match.shapeId,
              quarterTurns: match.quarterTurns,
              stageIndex,
              stageCount: colors.length,
              generatorQueued: queuedIds.has(block.id),
            }));
          });
        }),
      };
    `,
    resolveDir: ROOT,
    loader: "ts",
    sourcefile: "temporary-whole-piece-asset-report-entry.ts",
  },
  bundle: true,
  platform: "node",
  format: "esm",
  target: "es2022",
  write: false,
  logLevel: "silent",
});

const moduleUrl = `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`;
const { default: campaign } = await import(moduleUrl);
if (!Array.isArray(campaign.levels) || campaign.levels.length !== 100) {
  throw new Error(`Expected 100 current formal levels, received ${campaign.levels?.length ?? typeof campaign.levels}`);
}

const manifest = JSON.parse(await readFile(path.join(ROOT, "art-source/manifest.json"), "utf8"));
const manifestBySource = new Map(manifest.assets.map((asset) => [asset.source, asset]));

const assets = [];
for (const family of FAMILY_SPECS) {
  for (const color of family.colors) {
    const filename = `${color}-${family.suffix}.png`;
    const manifestSource = `gameplay/blocks/formal-v1/${filename}`;
    const sourceFile = `art-source/${manifestSource}`;
    const runtimeFile = `public/assets/art/${manifestSource}`;
    const manifestEntry = manifestBySource.get(manifestSource);
    if (!manifestEntry) throw new Error(`Missing art manifest entry for ${manifestSource}`);
    await access(path.join(ROOT, sourceFile));
    await access(path.join(ROOT, runtimeFile));

    const sourceBytes = await readFile(path.join(ROOT, sourceFile));
    const runtimeBytes = await readFile(path.join(ROOT, runtimeFile));
    const sourceSha256 = sha256(sourceBytes);
    const runtimeSha256 = sha256(runtimeBytes);
    if (sourceSha256 !== runtimeSha256) {
      throw new Error(`Source/runtime bytes differ for ${filename}`);
    }

    const matchingUsage = campaign.matches
      .filter((usage) => usage.shapeId === family.shapeId && usage.color === color)
      .map((usage) => ({
        level_id: usage.levelId,
        block_id: usage.blockId,
        layer_role: usage.stageCount === 1
          ? "body"
          : usage.stageIndex === 0
            ? "outer"
            : usage.stageIndex === usage.stageCount - 1
              ? "inner"
              : `layer_${usage.stageIndex + 1}`,
        quarter_turns_clockwise: usage.quarterTurns,
        generator_queued: usage.generatorQueued,
      }))
      .sort((left, right) => left.level_id - right.level_id
        || left.block_id.localeCompare(right.block_id)
        || left.layer_role.localeCompare(right.layer_role));
    const levelIds = [...new Set(matchingUsage.map((usage) => usage.level_id))];
    const blockKeys = new Set(matchingUsage.map((usage) => `${usage.level_id}:${usage.block_id}`));

    assets.push({
      filename,
      color,
      color_label: COLOR_LABELS[color],
      shape: family.shape,
      shape_label: family.shapeLabel,
      shape_id: family.shapeId,
      dimensions: { width: manifestEntry.width, height: manifestEntry.height },
      source_file: sourceFile,
      runtime_file: runtimeFile,
      sha256: sourceSha256,
      replacement_status: "imagegen_temporary_replace_in_place",
      usage_status: levelIds.length > 0 ? "used" : "registered_only",
      level_ids: levelIds,
      level_count: levelIds.length,
      block_count: blockKeys.size,
      layer_stage_usage_count: matchingUsage.length,
      usage: matchingUsage,
    });
  }
}

if (assets.length !== 36) throw new Error(`Expected 36 temporary whole-piece assets, received ${assets.length}`);

const generatorManifestEntry = manifestBySource.get(GENERATOR_ASSET.manifestSource);
if (!generatorManifestEntry) {
  throw new Error(`Missing art manifest entry for ${GENERATOR_ASSET.manifestSource}`);
}
const generatorSourceFile = `art-source/${GENERATOR_ASSET.manifestSource}`;
const generatorRuntimeFile = `public/assets/art/${GENERATOR_ASSET.manifestSource}`;
await access(path.join(ROOT, generatorSourceFile));
await access(path.join(ROOT, generatorRuntimeFile));
const generatorSourceBytes = await readFile(path.join(ROOT, generatorSourceFile));
const generatorRuntimeBytes = await readFile(path.join(ROOT, generatorRuntimeFile));
const generatorSourceSha256 = sha256(generatorSourceBytes);
const generatorRuntimeSha256 = sha256(generatorRuntimeBytes);
if (generatorSourceSha256 !== generatorRuntimeSha256) {
  throw new Error(`Source/runtime bytes differ for ${GENERATOR_ASSET.filename}`);
}

const generatorUsage = campaign.generatorRimGeometry
  .map((entry) => {
    const level = campaign.levels.find((candidate) => candidate.id === entry.levelId);
    const anchor = entry.anchor ?? (entry.side === "top"
      ? { x: entry.offset + 0.5, y: 0, quarterTurns: 0 }
      : entry.side === "right"
        ? { x: level.width, y: entry.offset + 0.5, quarterTurns: 1 }
        : entry.side === "bottom"
          ? { x: entry.offset + 0.5, y: level.height, quarterTurns: 2 }
          : { x: 0, y: entry.offset + 0.5, quarterTurns: 3 });
    return {
      level_id: entry.levelId,
      generator_id: entry.generatorId,
      queue_side: entry.side,
      queue_offset: entry.offset,
      rim_span: entry.rimSpan,
      rim_mount: entry.rimMount,
      quarter_turns_clockwise: anchor.quarterTurns,
      anchor,
    };
  })
  .sort((left, right) => left.level_id - right.level_id
    || left.generator_id.localeCompare(right.generator_id));
const generatorLevelIds = [...new Set(generatorUsage.map((usage) => usage.level_id))];
assets.push({
  filename: GENERATOR_ASSET.filename,
  asset_kind: GENERATOR_ASSET.assetKind,
  color: null,
  color_label: "—",
  shape: GENERATOR_ASSET.shape,
  shape_label: GENERATOR_ASSET.shapeLabel,
  shape_id: null,
  dimensions: { width: generatorManifestEntry.width, height: generatorManifestEntry.height },
  source_file: generatorSourceFile,
  runtime_file: generatorRuntimeFile,
  sha256: generatorSourceSha256,
  replacement_status: "imagegen_temporary_replace_in_place",
  usage_status: "used",
  level_ids: generatorLevelIds,
  level_count: generatorLevelIds.length,
  block_count: 0,
  layer_stage_usage_count: 0,
  machine_count: generatorUsage.length,
  usage: generatorUsage,
});

if (assets.length !== 36) throw new Error(`Expected 36 temporary assets, received ${assets.length}`);
const filenames = new Set(assets.map((asset) => asset.filename));
if (filenames.size !== assets.length) throw new Error("Temporary asset filenames are not unique");

const familySummaries = FAMILY_SPECS.map((family) => {
  const familyAssets = assets.filter((asset) => asset.shape_id === family.shapeId);
  return {
    shape: family.shape,
    shape_label: family.shapeLabel,
    shape_id: family.shapeId,
    asset_count: familyAssets.length,
    used_asset_count: familyAssets.filter((asset) => asset.usage_status === "used").length,
    registered_only_count: familyAssets.filter((asset) => asset.usage_status === "registered_only").length,
    colors: familyAssets.map((asset) => asset.color),
    level_ids: [...new Set(familyAssets.flatMap((asset) => asset.level_ids))].sort((a, b) => a - b),
  };
});

const usedLevelIds = [...new Set(assets.flatMap((asset) => asset.level_ids))].sort((a, b) => a - b);
const generatorAsset = assets.find((asset) => asset.filename === GENERATOR_ASSET.filename);
const report = {
  schema_version: 1,
  title: "Block Out! ImageGen 临时整块色块与制造器替换清单",
  provenance: {
    campaign_source: "src/core/levels.ts -> VIDEO_PARITY_LEVELS",
    art_mapping_source: "src/game/artManifest.ts + src/game/formalBlockShapes.ts",
    levels_canonical_sha256: sha256(Buffer.from(JSON.stringify(canonical(campaign.levels)))),
    derivation: "Static LEVELS/formal-art mapping only; no solver and no gameplay mutation.",
  },
  replacement_rule: "项目方正式资源须保持同名文件、透明背景、轮廓占格及当前清单尺寸约束；可直接原位替换 source/runtime 两份文件。制造器横图按 quarter_turns_clockwise 旋转复用。",
  summary: {
    temporary_asset_count: assets.length,
    temporary_whole_piece_asset_count: 36,
    temporary_mechanism_asset_count: 1,
    used_asset_count: assets.filter((asset) => asset.usage_status === "used").length,
    registered_only_count: assets.filter((asset) => asset.usage_status === "registered_only").length,
    shape_family_count: familySummaries.length,
    used_level_count: usedLevelIds.length,
    used_level_ids: usedLevelIds,
    generator_level_count: generatorAsset.level_count,
    generator_machine_count: generatorAsset.machine_count,
  },
  families: familySummaries,
  assets,
};

const markdown = [
  "# ImageGen 临时整块色块与制造器替换清单",
  "",
  "> 依据当前正式 `LEVELS`、`formalBlockShapes.ts` 与 `artManifest.ts` 静态反查；未调用求解器，也未修改关卡或 UI。`外层/内层`均按双色块实际阶段计入。",
  "",
  `- 待替换临时资源：${report.summary.temporary_asset_count} 张`,
  `- 临时整块色块：${report.summary.temporary_whole_piece_asset_count} 张`,
  `- 临时机制资源：${report.summary.temporary_mechanism_asset_count} 张`,
  `- 当前关卡实际使用：${report.summary.used_asset_count} 张`,
  `- 仅注册、当前未使用：${report.summary.registered_only_count} 张`,
  `- 涉及关卡：${report.summary.used_level_count} 关（${formatLevelIds(usedLevelIds)}）`,
  `- 制造器资源使用：${report.summary.generator_level_count} 关 / ${report.summary.generator_machine_count} 台`,
  `- 当前 LEVELS 规范化内容 SHA-256（非 freeze semantic SHA）：\`${report.provenance.levels_canonical_sha256}\``,
  "",
  "## 按形状汇总",
  "",
  "| 形状 | Shape ID | 临时资源数 | 已使用 | 仅注册 | 涉及关卡 |",
  "|---|---:|---:|---:|---:|---|",
  ...familySummaries.map((family) => `| ${family.shape_label} | ${family.shape_id} | ${family.asset_count} | ${family.used_asset_count} | ${family.registered_only_count} | ${formatLevelIds(family.level_ids)} |`),
  "",
  "## 临时机制资源",
  "",
  "| 文件名 | 类型 | 尺寸 | Source | Runtime | SHA-256 | 使用关卡 | 机器数 |",
  "|---|---|---:|---|---|---|---|---:|",
  `| \`${generatorAsset.filename}\` | ${generatorAsset.shape_label} | ${generatorAsset.dimensions.width}×${generatorAsset.dimensions.height} | \`${generatorAsset.source_file}\` | \`${generatorAsset.runtime_file}\` | \`${generatorAsset.sha256}\` | ${formatLevelIds(generatorAsset.level_ids)} | ${generatorAsset.machine_count} |`,
  "",
  "## 逐资源替换表",
  "",
  "| 文件名 | 颜色 | 形状 | 尺寸 | 使用关卡 | 块数 | 阶段调用数 | 状态 |",
  "|---|---|---|---:|---|---:|---:|---|",
  ...assets.map((asset) => `| \`${asset.filename}\` | ${asset.color_label} | ${asset.shape_label} | ${asset.dimensions.width}×${asset.dimensions.height} | ${formatLevelIds(asset.level_ids)} | ${asset.block_count} | ${asset.layer_stage_usage_count} | ${asset.usage_status === "used" ? "使用中" : "仅注册"} |`),
  "",
  "## 替换位置",
  "",
  "每张正式资源需保持文件名不变，并同步替换以下两处：",
  "",
  "- `art-source/gameplay/blocks/formal-v1/<文件名>`",
  "- `public/assets/art/gameplay/blocks/formal-v1/<文件名>`",
  "- 制造器：`art-source/gameplay/mechanics/video-parity-v1/side-generator-horizontal-3-v1.png`",
  "- 制造器运行时：`public/assets/art/gameplay/mechanics/video-parity-v1/side-generator-horizontal-3-v1.png`",
  "",
  "逐块、逐层、旋转方向与生成器队列明细见同目录 JSON 的 `assets[].usage`。",
  "",
].join("\n");

await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(JSON_OUTPUT, `${JSON.stringify(report, null, 2)}\n`, "utf8");
await writeFile(MARKDOWN_OUTPUT, markdown, "utf8");

console.log(JSON.stringify({
  json: path.relative(ROOT, JSON_OUTPUT).replaceAll("\\", "/"),
  markdown: path.relative(ROOT, MARKDOWN_OUTPUT).replaceAll("\\", "/"),
  ...report.summary,
  levels_canonical_sha256: report.provenance.levels_canonical_sha256,
}, null, 2));
