import { copyFile, mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";
import sharp from "file:///C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp/dist/index.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = resolve(root, "deliverables", "layout-comparison");
const oursDir = resolve(output, "our-game-levels-001-050");
const competitorDir = resolve(output, "competitor-confirmed-levels-001-020");
const sourceDir = resolve(root, "references", "benchmark", "youtube", "levels-001-020", "1fps");
const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";

await mkdir(oursDir, { recursive: true });
await mkdir(competitorDir, { recursive: true });

const competitorStarts = [1, 9, 15, 25, 45, 63, 85, 105, 121, 155, 165, 195, 235, 270, 316, 333, 363, 420, 480, 558];
const competitorFiles = [];
for (let index = 0; index < competitorStarts.length; index += 1) {
  const level = index + 1;
  const second = competitorStarts[index];
  const source = resolve(sourceDir, `frame-${String(second).padStart(4, "0")}-${String(second).padStart(4, "0")}.00s.jpg`);
  const target = resolve(competitorDir, `competitor-level-${String(level).padStart(3, "0")}.jpg`);
  await copyFile(source, target);
  competitorFiles.push(target);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 720, height: 1584 }, deviceScaleFactor: 1 });
await page.goto(playtestUrl, { waitUntil: "networkidle" });
await page.evaluate(() => localStorage.setItem("color-escape-save-v1", JSON.stringify({
  schemaVersion: 1,
  currentLevel: 1,
  highestLevel: 100,
  coins: 1000,
  sound: false,
  haptic: false,
  reducedMotion: true,
  featureSeen: ["basics", "ice-door", "ice-block", "layer", "shutter", "generator", "elevator", "conveyor", "star"],
  boosters: { time: 3, rocket: 3, pulse: 3 },
  bestStars: {},
  bestMoves: {},
  rewardedLevels: [],
  dailyStreak: 0,
  lastDailyCompletedDay: "",
  lastSeenUpdate: "2026-09-05-r95",
})));
await page.reload({ waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);

const ourFiles = [];
for (let level = 1; level <= 50; level += 1) {
  await page.evaluate((id) => window.__COLOR_ESCAPE__.loadLevel(id, true), level);
  await page.waitForTimeout(80);
  const state = await page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
  if (state.screen !== "playing" || state.level.id !== level || state.puzzle.moves !== 0) {
    throw new Error(`Layout export: Lv${level} did not open as a clean board`);
  }
  const target = resolve(oursDir, `our-game-level-${String(level).padStart(3, "0")}.png`);
  await page.screenshot({ path: target });
  ourFiles.push(target);
}
await browser.close();

const escapeXml = (value) => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");

const makeSheet = async ({ files, labels, target, columns, thumbWidth, thumbHeight }) => {
  const gap = 16;
  const labelHeight = 42;
  const cardWidth = thumbWidth + gap * 2;
  const cardHeight = thumbHeight + labelHeight + gap * 2;
  const rows = Math.ceil(files.length / columns);
  const width = columns * cardWidth + gap;
  const height = rows * cardHeight + gap;
  const composites = [];
  for (let index = 0; index < files.length; index += 1) {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const left = gap + column * cardWidth;
    const top = gap + row * cardHeight;
    const image = await sharp(files[index]).resize({ width: thumbWidth, height: thumbHeight, fit: "contain", background: "#08091d" }).png().toBuffer();
    const label = Buffer.from(`<svg width="${thumbWidth}" height="${labelHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" rx="8" fill="#20245b"/><text x="50%" y="28" text-anchor="middle" font-family="Microsoft YaHei,Arial,sans-serif" font-size="22" font-weight="700" fill="#ffffff">${escapeXml(labels[index])}</text></svg>`);
    composites.push({ input: image, left, top });
    composites.push({ input: label, left, top: top + thumbHeight + 8 });
  }
  await sharp({ create: { width, height, channels: 4, background: "#090b27" } }).composite(composites).png().toFile(target);
};

await makeSheet({
  files: competitorFiles,
  labels: competitorFiles.map((_, index) => `Competitor Lv${index + 1}`),
  target: resolve(output, "competitor-levels-001-020-overview.png"),
  columns: 5,
  thumbWidth: 236,
  thumbHeight: 510,
});

for (const [start, end] of [[1, 25], [26, 50]]) {
  const files = ourFiles.slice(start - 1, end);
  await makeSheet({
    files,
    labels: files.map((_, index) => `Our Game Lv${start + index}`),
    target: resolve(output, `our-game-levels-${String(start).padStart(3, "0")}-${String(end).padStart(3, "0")}-overview.png`),
    columns: 5,
    thumbWidth: 216,
    thumbHeight: 475,
  });
}

for (const [start, end] of [[1, 10], [11, 20]]) {
  const files = [];
  const labels = [];
  for (let level = start; level <= end; level += 1) {
    files.push(competitorFiles[level - 1], ourFiles[level - 1]);
    labels.push(`Competitor Lv${level}`, `Our Game Lv${level}`);
  }
  await makeSheet({
    files,
    labels,
    target: resolve(output, `side-by-side-levels-${String(start).padStart(3, "0")}-${String(end).padStart(3, "0")}.png`),
    columns: 4,
    thumbWidth: 236,
    thumbHeight: 510,
  });
}

await writeFile(resolve(output, "README.md"), `# 关卡布局图资料\n\n- \`our-game-levels-001-050/\`：本游戏第 1–50 关，720×1584 初始布局逐关截图。\n- \`competitor-confirmed-levels-001-020/\`：竞品 YouTube Levels 1–20 视频中按已核对时间点提取的初始布局。\n- \`side-by-side-levels-001-010.png\`、\`side-by-side-levels-011-020.png\`：前 20 关同编号并排参考；只用于节奏与结构研究，不代表两款游戏关卡一一对应。\n- 两张 \`our-game-*-overview.png\`：本游戏第 1–50 关总览。\n\n竞品来源：<https://www.youtube.com/watch?v=VU9mQ_gleN8>。当前已持有且能确认编号的连续竞品资料为第 1–20 关；未把缺少可靠首帧的第 21–50 关伪造成布局图。不同平台或版本的竞品关卡编号可能变化。\n`, "utf8");

console.log(`Exported ${ourFiles.length} local layouts, ${competitorFiles.length} confirmed competitor layouts, and 5 overview sheets to ${output}`);
