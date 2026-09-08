import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "file:///C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp/dist/index.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const referenceRoot = resolve(root, "references", "benchmark", "youtube", "levels-001-100-nova");
const sourceIndexPath = resolve(referenceRoot, "level-initial-frame-index.json");
const outputRoot = resolve(referenceRoot, "competitor-initial-levels-001-100");
const overviewRoot = resolve(referenceRoot, "competitor-initial-overviews");
const sourceIndex = JSON.parse(await readFile(sourceIndexPath, "utf8"));

await mkdir(outputRoot, { recursive: true });
await mkdir(overviewRoot, { recursive: true });

const levelRecords = [];

for (const segment of sourceIndex.segments) {
  const [firstLevel, lastLevel] = segment.levels.split("-").map(Number);
  if (lastLevel - firstLevel !== 9 || segment.selectedSeconds.length !== 10) {
    throw new Error(`${segment.levels}: expected exactly ten levels and ten selected seconds`);
  }

  for (let offset = 0; offset < 10; offset += 1) {
    const level = firstLevel + offset;
    const seconds = segment.selectedSeconds[offset];
    const relativeDirectory = segment.directoryOverrides?.[String(level)] ?? segment.frameDirectory;
    const sourceDirectory = resolve(referenceRoot, relativeDirectory);
    const files = await readdir(sourceDirectory);
    const suffix = `-${seconds.toFixed(2).padStart(7, "0")}s.jpg`;
    const sourceFilename = files.find((file) => file.endsWith(suffix));
    if (!sourceFilename) {
      throw new Error(`Lv${level}: no frame at ${seconds}s in ${relativeDirectory}`);
    }

    const sourcePath = resolve(sourceDirectory, sourceFilename);
    const sourceBuffer = await readFile(sourcePath);
    const metadata = await sharp(sourceBuffer).metadata();
    if (!metadata.width || !metadata.height) throw new Error(`Lv${level}: unreadable ${sourcePath}`);
    const portraitWidth = Math.min(metadata.width, Math.round(metadata.height * 0.75));
    const left = Math.max(0, Math.round((metadata.width - portraitWidth) / 2));
    const outputFilename = `competitor-level-${String(level).padStart(3, "0")}.jpg`;
    const outputPath = resolve(outputRoot, outputFilename);
    await sharp(sourceBuffer)
      .extract({ left, top: 0, width: portraitWidth, height: metadata.height })
      .resize(540, 720, { fit: "fill" })
      .jpeg({ quality: 94, chromaSubsampling: "4:4:4" })
      .toFile(outputPath);

    levelRecords.push({
      level,
      youtubeId: segment.youtubeId,
      seconds,
      source: `${relativeDirectory}/${sourceFilename}`.replaceAll("\\", "/"),
      output: outputFilename,
      sourceSha256: createHash("sha256").update(sourceBuffer).digest("hex"),
      review: "approved",
    });
  }
}

if (levelRecords.length !== 100 || levelRecords.some((record, index) => record.level !== index + 1)) {
  throw new Error("Export did not resolve a contiguous Lv1-Lv100 set");
}

const panelWidth = 300;
const imageHeight = 400;
const labelHeight = 40;
const cellHeight = imageHeight + labelHeight;
const columns = 5;
const rows = 5;

for (let page = 0; page < 4; page += 1) {
  const pageRecords = levelRecords.slice(page * 25, page * 25 + 25);
  const composites = [];
  for (const [index, record] of pageRecords.entries()) {
    const image = await sharp(resolve(outputRoot, record.output))
      .resize(panelWidth, imageHeight, { fit: "fill" })
      .toBuffer();
    const label = Buffer.from(`<svg width="${panelWidth}" height="${labelHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#11162b"/><text x="12" y="27" fill="#fff" font-family="Arial,sans-serif" font-size="21" font-weight="700">Lv ${record.level} · ${record.seconds}s</text></svg>`);
    const left = (index % columns) * panelWidth;
    const top = Math.floor(index / columns) * cellHeight;
    composites.push({ input: image, left, top });
    composites.push({ input: label, left, top: top + imageHeight });
  }
  const first = pageRecords[0].level;
  const last = pageRecords.at(-1).level;
  await sharp({
    create: {
      width: columns * panelWidth,
      height: rows * cellHeight,
      channels: 4,
      background: "#080b18",
    },
  }).composite(composites).png().toFile(resolve(
    overviewRoot,
    `competitor-levels-${String(first).padStart(3, "0")}-${String(last).padStart(3, "0")}-overview.png`,
  ));
}

await writeFile(resolve(outputRoot, "manifest.json"), `${JSON.stringify({
  version: 2,
  status: "manual-visual-qa-passed",
  sourceIndex: basename(sourceIndexPath),
  count: levelRecords.length,
  levels: levelRecords,
}, null, 2)}\n`, "utf8");

await writeFile(resolve(outputRoot, "README.md"), `# Block Out! 新版竞品关卡开局截图（Lv1–100）\n\n- 来源：Nova's Puzzle Den 于 2026-06 更新索引关联的十段 YouTube 通关视频。\n- 每关保留一个人工选择的完整棋盘帧；已裁去横屏黑边，统一导出为 540×720。\n- 当前状态：已通过四张总览的逐关视觉核对；已排除主页、教学弹窗、广告页和结算页。\n- 旧版 Lv1–20 截图位于 \`deliverables/layout-comparison/competitor-confirmed-levels-001-020\`，不可与本目录混用。\n`, "utf8");

console.log(`Exported ${levelRecords.length} candidate level frames to ${outputRoot}`);
console.log(`Built 4 overview sheets in ${overviewRoot}`);
