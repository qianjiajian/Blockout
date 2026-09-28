import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";

const output = fileURLToPath(new URL("../playtest-results/shutter-coverage/", import.meta.url));
const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
const targetLevelId = Number(process.argv.find((argument) => argument.startsWith("--level="))?.split("=")[1] ?? 21);
if (!Number.isInteger(targetLevelId) || targetLevelId < 1 || targetLevelId > 200) {
  throw new Error(`Invalid shutter-coverage level: ${targetLevelId}`);
}
await mkdir(output, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 603, height: 1149 } });
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(error.message));

await page.addInitScript(() => {
  window.__SHUTTER_DRAWS__ = [];
  const original = CanvasRenderingContext2D.prototype.drawImage;
  CanvasRenderingContext2D.prototype.drawImage = function shutterDrawProbe(image, ...args) {
    const source = typeof image?.src === "string" ? image.src : "";
    if (source.includes("/gameplay/mechanics/shutter-v1.png") && args.length === 8) {
      window.__SHUTTER_DRAWS__.push({
        source,
        destination: args.slice(4),
      });
      if (window.__SHUTTER_DRAWS__.length > 2_000) window.__SHUTTER_DRAWS__.splice(0, 1_000);
    }
    return original.call(this, image, ...args);
  };
});

await page.goto(playtestUrl, { waitUntil: "networkidle" });
await page.evaluate((levelId) => localStorage.setItem("color-escape-save-v1", JSON.stringify({
  schemaVersion: 1,
  currentLevel: levelId,
  highestLevel: 200,
  coins: 1_000,
  sound: false,
  haptic: false,
  featureSeen: ["basics", "ice-door", "layer", "shutter", "generator"],
  boosters: { time: 3, rocket: 3, pulse: 3 },
  bestStars: {},
  bestMoves: {},
  rewardedLevels: [],
  dailyStreak: 0,
  lastDailyCompletedDay: "",
})), targetLevelId);
await page.reload({ waitUntil: "networkidle" });
await page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().art.ready, undefined, { timeout: 10_000 });
await page.evaluate(() => {
  window.__SHUTTER_DRAWS__ = [];
}, targetLevelId);
await page.evaluate((levelId) => window.__COLOR_ESCAPE__.loadLevel(levelId, true), targetLevelId);
await page.waitForFunction((levelId) => window.__COLOR_ESCAPE__?.getDebugState().puzzle.levelId === levelId, targetLevelId, { timeout: 8_000 });
await page.waitForTimeout(250);

const result = await page.evaluate(async (levelId) => {
  const [{ getLevel }, layout] = await Promise.all([
    import("/src/core/levels.ts"),
    import("/src/game/shutterVisualLayout.ts"),
  ]);
  const level = getLevel(levelId);
  const state = window.__COLOR_ESCAPE__.getDebugState();
  const shutters = level.shutters.filter((shutter) => shutter.skin === "shutter");
  const expectedRects = shutters.map((shutter) => ({
    id: shutter.id,
    ...layout.projectShutterVisualRect(shutter.x, shutter.y, shutter.width, shutter.height, state.board),
  }));
  const draws = window.__SHUTTER_DRAWS__.map(({ destination }) => ({
    x: destination[0],
    y: destination[1],
    width: destination[2],
    height: destination[3],
  }));
  const measured = expectedRects.map((expected) => {
    const contained = draws.filter((draw) => (
      draw.x >= expected.x - 0.01
      && draw.y >= expected.y - 0.01
      && draw.x + draw.width <= expected.x + expected.width + 0.01
      && draw.y + draw.height <= expected.y + expected.height + 0.01
    ));
    return {
      id: expected.id,
      expected,
      drawCount: contained.length,
      union: contained.length ? {
        x: Math.min(...contained.map((draw) => draw.x)),
        y: Math.min(...contained.map((draw) => draw.y)),
        right: Math.max(...contained.map((draw) => draw.x + draw.width)),
        bottom: Math.max(...contained.map((draw) => draw.y + draw.height)),
      } : null,
    };
  });
  return { shutters, expectedRects, measured, drawCount: draws.length, board: state.board };
}, targetLevelId);

const expectedByLevel = {
  21: [
    { id: "vp-021-cover-1", x: 0, y: 2, width: 4, height: 2, count: 10 },
    { id: "vp-021-cover-2", x: 0, y: 6, width: 4, height: 3, count: 17 },
    { id: "vp-021-cover-3", x: 4, y: 6, width: 2, height: 3, count: 19 },
  ],
  23: [
    { id: "vp-023-cover-1", x: 3, y: 5, width: 3, height: 3, count: 9 },
    { id: "vp-023-cover-2", x: 0, y: 5, width: 3, height: 3, count: 12 },
  ],
};
const expected = expectedByLevel[targetLevelId]
  ?? result.shutters.map(({ id, x, y, width, height, count }) => ({ id, x, y, width, height, count }));
const actual = result.shutters.map(({ id, x, y, width, height, count }) => ({ id, x, y, width, height, count }));
if (JSON.stringify(actual) !== JSON.stringify(expected)) {
  throw new Error(`Lv${targetLevelId} shutter geometry drifted: ${JSON.stringify(actual)}`);
}
for (const item of result.measured) {
  if (item.drawCount < 9 || !item.union) throw new Error(`${item.id} did not draw a complete nine-slice surface`);
  const tolerance = 0.02;
  if (Math.abs(item.union.x - item.expected.x) > tolerance
    || Math.abs(item.union.y - item.expected.y) > tolerance
    || Math.abs(item.union.right - (item.expected.x + item.expected.width)) > tolerance
    || Math.abs(item.union.bottom - (item.expected.y + item.expected.height)) > tolerance) {
    throw new Error(`${item.id} visual bounds differ from its projected cover: ${JSON.stringify(item)}`);
  }
}
if (errors.length) throw new Error(`Lv${targetLevelId} shutter E2E console errors: ${errors.join(" | ")}`);

const screenshot = resolve(output, `level-${String(targetLevelId).padStart(3, "0")}-shutter-coverage.png`);
await page.screenshot({ path: screenshot, fullPage: true });
console.log(JSON.stringify({ ok: true, levelId: targetLevelId, screenshot, result }, null, 2));
await browser.close();
