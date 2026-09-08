import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import sharp from "file:///C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp/dist/index.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const referenceRoot = resolve(root, "references", "benchmark", "youtube", "levels-001-100-nova");
const windowsRoot = resolve(referenceRoot, "level-start-windows");
const outputRoot = resolve(referenceRoot, "level-start-window-sheets");
const index = JSON.parse(await readFile(resolve(referenceRoot, "level-start-index.json"), "utf8"));

const columns = 7;
const panelWidth = 210;
const panelHeight = 280;
const labelHeight = 32;
const cellHeight = panelHeight + labelHeight;

await mkdir(outputRoot, { recursive: true });

for (const segment of index.segments) {
  const inputDir = resolve(windowsRoot, `levels-${segment.levels}`);
  const metadata = JSON.parse(await readFile(resolve(inputDir, "metadata.json"), "utf8"));
  if (metadata.frames.length !== columns * 10) {
    throw new Error(`${segment.levels}: expected ${columns * 10} frames, received ${metadata.frames.length}`);
  }

  const [firstLevel] = segment.levels.split("-").map(Number);
  const cells = [];
  for (const [indexInSegment, frame] of metadata.frames.entries()) {
    const input = resolve(inputDir, frame.file);
    const imageMeta = await sharp(input).metadata();
    const sourceWidth = imageMeta.width ?? 0;
    const sourceHeight = imageMeta.height ?? 0;
    if (!sourceWidth || !sourceHeight) throw new Error(`Could not read ${input}`);
    const portraitWidth = Math.min(sourceWidth, Math.round(sourceHeight * 0.75));
    const left = Math.max(0, Math.round((sourceWidth - portraitWidth) / 2));
    const panel = await sharp(input)
      .extract({ left, top: 0, width: portraitWidth, height: sourceHeight })
      .resize(panelWidth, panelHeight, { fit: "fill" })
      .png()
      .toBuffer();
    const level = firstLevel + Math.floor(indexInSegment / columns);
    const label = Buffer.from(`<svg width="${panelWidth}" height="${labelHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#10152a"/><text x="10" y="22" fill="#ffffff" font-family="Arial,sans-serif" font-size="18" font-weight="700">Lv ${level} · ${Number(frame.seconds).toFixed(0)}s</text></svg>`);
    const cell = await sharp({
      create: { width: panelWidth, height: cellHeight, channels: 4, background: "#10152a" },
    }).composite([
      { input: panel, left: 0, top: 0 },
      { input: label, left: 0, top: panelHeight },
    ]).png().toBuffer();
    cells.push(cell);
  }

  const sheet = sharp({
    create: {
      width: columns * panelWidth,
      height: 10 * cellHeight,
      channels: 4,
      background: "#090c18",
    },
  });
  await sheet.composite(cells.map((input, indexInSegment) => ({
    input,
    left: (indexInSegment % columns) * panelWidth,
    top: Math.floor(indexInSegment / columns) * cellHeight,
  }))).png().toFile(resolve(outputRoot, `levels-${segment.levels}-start-window.png`));
}

await writeFile(resolve(outputRoot, "README.md"), `# 竞品关卡开局窗口校对表\n\n每行对应一关，每行 7 张依次为粗开局点前 5 秒至后 1 秒。画面已裁去横屏视频黑边，只保留居中的竖屏游戏区域。应选择棋盘完整出现、且玩家尚未移动任何色块的最早清晰帧。\n`, "utf8");
console.log(`Built ${index.segments.length} start-window sheets in ${outputRoot}`);
