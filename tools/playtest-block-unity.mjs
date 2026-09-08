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
const loadedConnectors = new Set();
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(error.message));
page.on("response", (response) => {
  if (response.url().includes("-connector-v1.png")) loadedConnectors.add(new URL(response.url()).pathname.split("/").at(-1));
});
await page.goto(playtestUrl, { waitUntil: "networkidle" });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(700);

const coverageLevels = [1, 2, 3, 7, 12, 16, 24, 100];
for (const levelId of coverageLevels) {
  await page.evaluate((id) => window.__COLOR_ESCAPE__.loadLevel(id, true), levelId);
  await page.waitForTimeout(160);
  await page.screenshot({ path: shot(`round40-unified-block-level-${String(levelId).padStart(3, "0")}.png`) });
}

const expectedAssets = ["red", "blue", "green", "yellow", "purple", "orange", "pink", "cyan"]
  .map((color) => `${color}-connector-v1.png`);
for (const asset of expectedAssets) {
  if (!loadedConnectors.has(asset)) throw new Error(`Block unity: connector asset did not load: ${asset}`);
}

await page.evaluate(() => window.__COLOR_ESCAPE__.loadLevel(3, true));
await page.waitForTimeout(120);
const debug = await page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const target = debug.puzzle.blocks.find((block) => block.shape.length > 1 && (block.frozen ?? 0) === 0);
if (!target) throw new Error("Block unity: no selectable multi-cell block found");
const [offsetX, offsetY] = target.shape[0];
const pointer = {
  x: debug.board.innerX + (target.x + offsetX + 0.5) * debug.board.cell,
  y: debug.board.innerY + (target.y + offsetY + 0.5) * debug.board.cell,
};
await page.mouse.move(pointer.x, pointer.y);
await page.mouse.down();
await page.waitForTimeout(90);
const selected = await page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
if (selected.selectedId !== target.id) throw new Error("Block unity: multi-cell block was not selected as one object");
await page.screenshot({ path: shot("round40-unified-block-selected.png") });
await page.mouse.up();

await page.setViewportSize({ width: 320, height: 568 });
await page.evaluate(() => window.__COLOR_ESCAPE__.loadLevel(24, true));
await page.waitForTimeout(160);
await page.screenshot({ path: shot("round40-unified-block-level-024-320x568.png") });

await browser.close();
if (errors.length) throw new Error(`Block-unity browser errors:\n${errors.join("\n")}`);
console.log("Eight-color ImageGen block connectors, grouped selection, layered state, and 320x568 E2E passed.");
