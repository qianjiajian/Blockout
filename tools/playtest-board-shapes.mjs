import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";

const rootPath = fileURLToPath(new URL("../playtest-results/", import.meta.url));
const shot = (name) => resolve(rootPath, name);
const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
await mkdir(rootPath, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 496, height: 1078 } });
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(error.message));
await page.goto(playtestUrl, { waitUntil: "networkidle" });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(800);

const levels = [1, 14, 15, 20, 23, 48, 72, 100];
const signatures = new Set();
for (const levelId of levels) {
  await page.evaluate((id) => window.__COLOR_ESCAPE__.loadLevel(id, true), levelId);
  await page.waitForTimeout(180);
  const state = await page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
  const playable = state.puzzle.playable;
  if (!playable?.length || (levelId !== 1 && playable.length >= state.puzzle.width * state.puzzle.height)) {
    throw new Error(`Board-shape E2E: level ${levelId} is not visibly irregular`);
  }
  const signature = `${state.puzzle.width}x${state.puzzle.height}:${playable.map(([x, y]) => `${x},${y}`).join("|")}`;
  if (signatures.has(signature)) throw new Error(`Board-shape E2E: repeated checkpoint silhouette at level ${levelId}`);
  signatures.add(signature);
  await page.screenshot({ path: shot(`round37-shape-level-${String(levelId).padStart(3, "0")}.png`) });
}

await page.setViewportSize({ width: 320, height: 568 });
await page.evaluate(() => window.__COLOR_ESCAPE__.loadLevel(72, true));
await page.waitForTimeout(180);
await page.screenshot({ path: shot("round37-shape-level-072-320x568.png") });

await browser.close();
if (errors.length) throw new Error(`Board-shape browser errors:\n${errors.join("\n")}`);
console.log(`Benchmark-cadence board visual E2E passed for ${levels.length} silhouettes plus 320x568.`);
