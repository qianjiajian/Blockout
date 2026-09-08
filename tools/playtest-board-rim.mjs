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
const loadedRimAssets = new Set();
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(error.message));
page.on("response", (response) => {
  if (response.url().includes("board-rim-")) loadedRimAssets.add(new URL(response.url()).pathname.split("/").at(-1));
});
await page.goto(playtestUrl, { waitUntil: "networkidle" });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(700);

const levels = [1, 15, 20, 23, 72, 100];
for (const levelId of levels) {
  await page.evaluate((id) => window.__COLOR_ESCAPE__.loadLevel(id, true), levelId);
  await page.waitForTimeout(180);
  await page.screenshot({ path: shot(`round39-rim-level-${String(levelId).padStart(3, "0")}.png`) });
}

if (!loadedRimAssets.has("board-rim-rail-v1.png") || !loadedRimAssets.has("board-rim-corner-v1.png")) {
  throw new Error(`Board rim assets not loaded: ${[...loadedRimAssets].join(", ")}`);
}

await page.setViewportSize({ width: 320, height: 568 });
await page.evaluate(() => window.__COLOR_ESCAPE__.loadLevel(72, true));
await page.waitForTimeout(180);
await page.screenshot({ path: shot("round39-rim-level-072-320x568.png") });

await browser.close();
if (errors.length) throw new Error(`Board-rim browser errors:\n${errors.join("\n")}`);
console.log(`Continuous ImageGen board-rim visual E2E passed for ${levels.length} silhouettes plus 320x568.`);
