import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { chromium } from "playwright";
import { build } from "esbuild";

const ROOT = process.cwd();
const BASE_URL = process.env.BLOCK_OUT_URL ?? "http://127.0.0.1:5173/";
const REVISION = process.env.VIDEO_PARITY_REPORT_REVISION ?? "v8-direct-data";
const OUTPUT_ROOT = path.resolve(ROOT, process.argv[2] ?? `deliverables/level-layouts-${REVISION}`);
const VIEWPORT = { width: 496, height: 1078 };
const LEVEL_COUNT = 100;
const screensDir = path.join(OUTPUT_ROOT, "full-screens");
const boardsDir = path.join(OUTPUT_ROOT, "boards");
const chaptersDir = path.join(OUTPUT_ROOT, "chapter-overviews");

const canonical = (value) => {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().filter((key) => value[key] !== undefined)
    .map((key) => [key, canonical(value[key])]));
};
const sha256 = (value) => createHash("sha256").update(value).digest("hex").toUpperCase();
const escapeHtml = (value) => String(value ?? "")
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const dataUrl = (buffer) => `data:image/png;base64,${buffer.toString("base64")}`;

async function loadFormalLevels() {
  const result = await build({
    stdin: {
      contents: `import { LEVELS } from "./src/core/levels.ts"; export default LEVELS;`,
      resolveDir: ROOT,
      loader: "ts",
      sourcefile: "capture-video-parity-levels.ts",
    },
    bundle: true,
    platform: "node",
    format: "esm",
    target: "es2022",
    write: false,
    logLevel: "silent",
  });
  const url = `data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`;
  const { default: levels } = await import(url);
  if (!Array.isArray(levels) || levels.length !== LEVEL_COUNT) {
    throw new Error(`Expected ${LEVEL_COUNT} formal levels, received ${levels?.length ?? typeof levels}`);
  }
  return levels;
}

const waitTwoFrames = (page) => page.evaluate(() => new Promise((resolve) => {
  requestAnimationFrame(() => requestAnimationFrame(resolve));
}));

async function waitForCurrentLevelArt(page, levelId) {
  await waitTwoFrames(page);
  try {
    await page.waitForFunction((expectedId) => {
      const state = window.__COLOR_ESCAPE__?.getDebugState();
      const formal = state?.art?.formalGameplay;
      return state?.screen === "playing"
        && state?.level?.id === expectedId
        && state?.art?.ready === true
        && state?.art?.plainBlocksReady === true
        && formal?.uiReady === true
        && formal?.floorReady === true
        && formal?.selectionFrameReady === true
        && formal?.requestedBlockSignature === undefined
        && !formal?.blockError
        && formal?.loadedWholeBlockCoverage === formal?.exactWholeBlockCoverage;
    }, levelId, { timeout: 30_000 });
  } catch (error) {
    const state = await page.evaluate(() => window.__COLOR_ESCAPE__?.getDebugState());
    throw new Error(`Lv${levelId}: formal art did not settle: ${JSON.stringify({ screen: state?.screen, id: state?.level?.id, art: state?.art })}`, { cause: error });
  }
}

function boardClip(board) {
  const left = Math.max(0, Math.floor(board.x - 55));
  const top = Math.max(0, Math.floor(board.y - 55));
  const right = Math.min(VIEWPORT.width, Math.ceil(board.x + board.width + 55));
  const visualBottom = Math.max(board.y + board.height, board.visualBottom ?? 0);
  const bottom = Math.min(VIEWPORT.height, Math.ceil(visualBottom + 30));
  return { x: left, y: top, width: right - left, height: bottom - top };
}

async function renderSheet(browser, items, outputPath, title, columns, previewHeight) {
  const cardWidth = columns === 10 ? 132 : 236;
  const rows = Math.ceil(items.length / columns);
  const page = await browser.newPage({
    viewport: { width: columns * cardWidth + 56, height: Math.min(16000, 118 + rows * (previewHeight + 56) + 34) },
  });
  await page.setContent(`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><style>
    *{box-sizing:border-box}html,body{margin:0;background:#130f42;color:#fff;font-family:Arial,"Microsoft YaHei",sans-serif}
    body{padding:22px 28px 32px}h1{margin:0;font-size:30px;line-height:40px}p{margin:3px 0 20px;color:#bcb7ed;font-size:15px}
    main{display:grid;grid-template-columns:repeat(${columns},${cardWidth - 12}px);gap:12px}figure{margin:0;padding:8px;border:1px solid #443c8c;border-radius:12px;background:#211b60;overflow:hidden}
    figcaption{height:30px;font-size:19px;font-weight:800;text-align:center;line-height:27px}.preview{width:100%;height:${previewHeight}px;display:flex;align-items:center;justify-content:center;border-radius:7px;background:#19154d;overflow:hidden}
    img{display:block;max-width:100%;max-height:100%;object-fit:contain}
  </style></head><body><h1>${escapeHtml(title)}</h1><p>${escapeHtml(REVISION)} · 刚开局 · 未拖动</p><main>${items.map((item) => `<figure><figcaption>Lv${item.levelId}</figcaption><div class="preview"><img src="${item.dataUrl}"></div></figure>`).join("")}</main></body></html>`, { waitUntil: "load" });
  await page.evaluate(() => document.fonts?.ready);
  await waitTwoFrames(page);
  await page.screenshot({ path: outputPath, fullPage: true });
  await page.close();
}

const levels = await loadFormalLevels();
const semanticSha256 = sha256(JSON.stringify(canonical(levels)));
const featureSeen = ["basics", ...new Set(levels.map((level) => level.featureIntro?.kind).filter(Boolean))];
await Promise.all([mkdir(screensDir, { recursive: true }), mkdir(boardsDir, { recursive: true }), mkdir(chaptersDir, { recursive: true })]);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: 1 });
page.on("pageerror", (error) => console.error("PAGE", error.message));
page.on("console", (message) => { if (message.type() === "error") console.error("CONSOLE", message.text()); });
await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 30_000 });
await page.evaluate((seenFeatures) => {
  localStorage.setItem("color-escape-save-v1", JSON.stringify({
    schemaVersion: 1, currentLevel: 1, highestLevel: 100, coins: 9999,
    sound: false, haptic: false, reducedMotion: true,
    featureSeen: seenFeatures,
    boosterUnlockSeen: ["time", "rocket", "pulse"], boosters: { time: 3, rocket: 3, pulse: 3 },
    bestStars: {}, bestMoves: {}, rewardedLevels: [], journeyProgress: { claimedMilestoneLevels: [], seenEpisodeUnlockLevels: [] },
    selectedJourneyEpisode: 1, dailyStreak: 0, lastDailyCompletedDay: "", lastSeenUpdate: "",
  }));
}, featureSeen);
await page.reload({ waitUntil: "domcontentloaded", timeout: 30_000 });
await page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().art.ready === true, undefined, { timeout: 30_000 });
await page.evaluate(() => document.fonts?.ready);

const entries = [];
for (let levelId = 1; levelId <= LEVEL_COUNT; levelId += 1) {
  await page.evaluate((id) => window.__COLOR_ESCAPE__.loadLevel(id, true), levelId);
  await waitForCurrentLevelArt(page, levelId);
  await page.evaluate((id) => window.__COLOR_ESCAPE__.loadLevel(id, true), levelId);
  await waitTwoFrames(page);
  const state = await page.evaluate(() => {
    const value = window.__COLOR_ESCAPE__.getDebugState();
    return {
      screen: value.screen, level: value.level, board: value.board, puzzle: value.puzzle,
      selectedId: value.selectedId, activePointer: value.activePointer,
      particles: value.particles, exitGhosts: value.exitGhosts, exitPulses: value.exitPulses,
      mechanicPulses: value.mechanicPulses, boardShakeTime: value.boardShakeTime,
      formal: value.art.formalGameplay,
    };
  });
  const empty = (value) => value == null || value === 0 || (Array.isArray(value) && value.length === 0);
  const clean = state.screen === "playing" && state.level.id === levelId
    && state.puzzle.moves === 0 && state.puzzle.started === false
    && state.puzzle.remainingSeconds === state.level.timeSeconds
    && state.puzzle.complete === false && state.puzzle.failed === false
    && !state.selectedId && !state.activePointer
    && empty(state.particles) && empty(state.exitGhosts) && empty(state.exitPulses)
    && empty(state.mechanicPulses) && state.boardShakeTime === 0;
  if (!clean) throw new Error(`Lv${levelId}: capture is not a clean opening state`);
  if (state.formal.blockError || state.formal.loadedWholeBlockCoverage !== state.formal.exactWholeBlockCoverage) {
    throw new Error(`Lv${levelId}: formal whole-block art coverage is incomplete`);
  }
  const stem = `level-${String(levelId).padStart(3, "0")}`;
  const screenFile = path.join(screensDir, `${stem}.png`);
  const boardFile = path.join(boardsDir, `${stem}.png`);
  const clip = boardClip(state.board);
  await page.screenshot({ path: screenFile });
  await page.screenshot({ path: boardFile, clip });
  const [screenBuffer, boardBuffer] = await Promise.all([readFile(screenFile), readFile(boardFile)]);
  entries.push({
    levelId, name: state.level.name, width: state.level.width, height: state.level.height,
    blockCount: state.level.blocks.length, gateCount: state.level.gates.length,
    boardClip: clip,
    screenFile: path.relative(OUTPUT_ROOT, screenFile).replaceAll("\\", "/"),
    boardFile: path.relative(OUTPUT_ROOT, boardFile).replaceAll("\\", "/"),
    screenSha256: sha256(screenBuffer), boardSha256: sha256(boardBuffer),
  });
  console.log(`captured Lv${String(levelId).padStart(3, "0")}`);
}

for (let chapter = 0; chapter < 10; chapter += 1) {
  const items = await Promise.all(entries.slice(chapter * 10, chapter * 10 + 10).map(async (entry) => ({
    levelId: entry.levelId,
    dataUrl: dataUrl(await readFile(path.join(OUTPUT_ROOT, entry.boardFile))),
  })));
  const from = chapter * 10 + 1;
  await renderSheet(browser, items, path.join(chaptersDir, `chapter-${String(chapter + 1).padStart(2, "0")}.png`), `本游戏 Lv${from}–${from + 9} 开局布局`, 5, 430);
}
const allItems = await Promise.all(entries.map(async (entry) => ({ levelId: entry.levelId, dataUrl: dataUrl(await readFile(path.join(OUTPUT_ROOT, entry.boardFile))) })));
await renderSheet(browser, allItems, path.join(OUTPUT_ROOT, "all-levels-overview.png"), "本游戏 Lv1–100 开局布局总览", 10, 248);
await page.close();
await browser.close();

const manifest = {
  schemaVersion: 2,
  generatedAt: new Date().toISOString(),
  revision: REVISION,
  sourceUrl: BASE_URL,
  viewport: VIEWPORT,
  campaignSemanticSha256: semanticSha256,
  levelCount: entries.length,
  captureSemantics: "opening-layout-after-assets-ready-then-immediate-level-reset-no-input",
  levels: entries,
};
await writeFile(path.join(OUTPUT_ROOT, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ output: OUTPUT_ROOT, revision: REVISION, levelCount: entries.length, semanticSha256 }, null, 2));
