import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";

const output = fileURLToPath(new URL("../playtest-results/", import.meta.url));
const shot = (name) => resolve(output, name);
const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
await mkdir(output, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 496, height: 1078 } });
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(error.message));

await page.goto(playtestUrl, { waitUntil: "networkidle" });
await page.evaluate(() => localStorage.setItem("color-escape-save-v1", JSON.stringify({
  schemaVersion: 1,
  currentLevel: 1,
  highestLevel: 100,
  coins: 1000,
  sound: false,
  haptic: false,
  reducedMotion: true,
  featureSeen: ["basics", "ice-door", "ice-block", "layer", "shutter"],
  boosters: { time: 3, rocket: 3, pulse: 3 },
  bestStars: {},
  bestMoves: {},
  rewardedLevels: [],
  dailyStreak: 0,
  lastDailyCompletedDay: "",
})));
await page.reload({ waitUntil: "networkidle" });

const authored = await page.evaluate(async () => {
  const [{ LEVELS }, { COMPETITOR_VISIBLE_BLOCK_TARGETS }, { openingStrategyMetrics }] = await Promise.all([
    import("/src/core/levels.ts"),
    import("/src/core/campaignComposition.ts"),
    import("/src/core/levelStrategyMetrics.ts"),
  ]);
  return LEVELS.slice(0, 20).map((level) => {
    const closed = new Set((level.shutters ?? []).filter((shutter) => shutter.count > 0).map((shutter) => shutter.id));
    const visible = level.blocks.filter((block) => !block.shutterId || !closed.has(block.shutterId));
    const signature = (shape) => {
      const minX = Math.min(...shape.map(([x]) => x));
      const minY = Math.min(...shape.map(([, y]) => y));
      return shape.map(([x, y]) => [x - minX, y - minY]).sort().map(([x, y]) => `${x},${y}`).join(";");
    };
    const metrics = openingStrategyMetrics(level);
    return {
      levelId: level.id,
      name: level.name,
      difficulty: level.difficulty,
      width: level.width,
      height: level.height,
      targetBlocks: COMPETITOR_VISIBLE_BLOCK_TARGETS[level.id - 1],
      visibleBlocks: visible.length,
      clearLoad: visible.reduce((sum, block) => sum + (block.layers?.length ?? 1), 0),
      shapeFamilies: new Set(visible.map((block) => signature(block.shape))).size,
      directClearable: metrics.directClearable,
      forcedRepositions: metrics.forcedRepositions,
      oneStepMovable: metrics.oneStepMovable,
      contacts: metrics.contacts,
      matchingEdgeStarts: metrics.matchingEdgeStarts,
      playableCells: level.playable?.length ?? level.width * level.height,
      totalCells: level.width * level.height,
      featureIntro: level.featureIntro?.kind ?? null,
      gates: level.gates.map((gate) => ({ side: gate.side, offset: gate.offset, size: gate.size })),
      blocks: level.blocks.map((block) => ({ id: block.id, x: block.x, y: block.y, shape: block.shape })),
    };
  });
});

const files = [];
for (const level of authored) {
  await page.evaluate((id) => window.__COLOR_ESCAPE__.loadLevel(id, true), level.levelId);
  await page.waitForTimeout(160);
  const filename = `round53-early-level-${String(level.levelId).padStart(3, "0")}.png`;
  await page.screenshot({ path: shot(filename) });
  files.push({ ...level, filename });
}

const countMisses = authored.filter((level) => level.visibleBlocks < level.targetBlocks).map((level) => level.levelId);
if (countMisses.length) throw new Error(`Early-curve E2E: block-count floor missed at ${countMisses.join(",")}`);
const shapeMisses = authored.filter((level) => level.visibleBlocks >= 5 && level.shapeFamilies < 3).map((level) => level.levelId);
if (shapeMisses.length) throw new Error(`Early-curve E2E: shape-family floor missed at ${shapeMisses.join(",")}`);
const matchingEdgeStarts = authored.slice(2).filter((level) => level.matchingEdgeStarts > 0).map((level) => level.levelId);
if (matchingEdgeStarts.length) throw new Error(`Early-curve E2E: matching exit starts returned at ${matchingEdgeStarts.join(",")}`);

const thumbWidth = 248;
const thumbHeight = 539;
const columns = 5;
const sheetPage = await browser.newPage({ viewport: { width: columns * thumbWidth, height: 2400 } });
const cells = await Promise.all(files.map(async (entry) => {
  const image = await readFile(shot(entry.filename));
  const metrics = `${entry.visibleBlocks}块 / ${entry.shapeFamilies}形 / 直出${entry.directClearable}`;
  return `<figure><img src="data:image/png;base64,${image.toString("base64")}"><figcaption><b>Lv${entry.levelId} ${entry.name}</b><span>${metrics}</span></figcaption></figure>`;
}));
await sheetPage.setContent(`<!doctype html><style>*{box-sizing:border-box}html,body{margin:0;background:#090d1c}main{width:${columns * thumbWidth}px;display:grid;grid-template-columns:repeat(${columns},${thumbWidth}px)}figure{margin:0;background:#10152a;border:1px solid #252d57}img{display:block;width:${thumbWidth}px;height:${thumbHeight}px;object-fit:cover}figcaption{height:54px;padding:6px 8px;color:#fff;font:13px/18px Arial,sans-serif}b,span{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}span{color:#9fc9ff}</style><main>${cells.join("")}</main>`);
const sheetBounds = await sheetPage.locator("main").boundingBox();
if (!sheetBounds) throw new Error("Early-curve E2E: could not measure contact sheet");
await sheetPage.screenshot({ path: shot("round53-early-levels-001-020-contact.png"), clip: sheetBounds });

await writeFile(shot("round53-early-curve-report.json"), `${JSON.stringify({
  source: "current shipping campaign",
  method: "static opening-structure audit; no full-level solver",
  viewport: "496x1078",
  countMisses,
  shapeMisses,
  matchingEdgeStarts,
  levels: authored,
}, null, 2)}\n`, "utf8");

await sheetPage.close();
await page.close();
await browser.close();
if (errors.length) throw new Error(`Early-curve browser errors:\n${errors.join("\n")}`);
console.log("Early-game composition curve passed for Levels 1-20 with visual evidence and no full-level solver.");
