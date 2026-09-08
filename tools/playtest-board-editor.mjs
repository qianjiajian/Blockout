import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";

const rootPath = fileURLToPath(new URL("../playtest-results/", import.meta.url));
const shot = (name) => resolve(rootPath, name);
const playtestUrl = new URL("board-editor.html", process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/").href;
await mkdir(rootPath, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(error.message));
await page.goto(playtestUrl, { waitUntil: "networkidle" });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: "networkidle" });

if (await page.locator("#level-select option").count() !== 100) throw new Error("Board editor: expected 100 selectable levels");
await page.waitForFunction(() => !document.querySelector("#save-button")?.hasAttribute("disabled"));

const initialCode = await page.locator("#shape-code").inputValue();
const pair = await page.evaluate(() => {
  const cells = [...document.querySelectorAll(".board-cell.active:not(.required):not(.blocked)")];
  const byPosition = new Map(cells.map((cell) => [`${cell.dataset.x},${cell.dataset.y}`, cell]));
  for (const cell of cells) {
    const x = Number(cell.dataset.x);
    const y = Number(cell.dataset.y);
    const neighbor = byPosition.get(`${x + 1},${y}`) ?? byPosition.get(`${x},${y + 1}`);
    if (!neighbor) continue;
    const first = cell.getBoundingClientRect();
    const second = neighbor.getBoundingClientRect();
    return [
      { x: first.x + first.width / 2, y: first.y + first.height / 2 },
      { x: second.x + second.width / 2, y: second.y + second.height / 2 },
    ];
  }
  return undefined;
});
if (!pair) throw new Error("Board editor: no adjacent editable floor cells found");

await page.locator('[data-tool="erase"]').click();
await page.mouse.move(pair[0].x, pair[0].y);
await page.mouse.down();
await page.mouse.move(pair[1].x, pair[1].y, { steps: 5 });
await page.mouse.up();
const editedCode = await page.locator("#shape-code").inputValue();
if (editedCode === initialCode) throw new Error("Board editor: pointer drag did not change the silhouette");
if (!(await page.locator("#save-state").textContent()).includes("未保存")) throw new Error("Board editor: dirty state was not shown");

await page.locator('[data-action="undo"]').click();
if (await page.locator("#shape-code").inputValue() !== initialCode) throw new Error("Board editor: one undo did not restore the grouped drag stroke");

await page.locator("#level-select").selectOption("15");
await page.waitForFunction(() => document.querySelectorAll(".board-cell").length > 20);
await page.screenshot({ path: shot("round38-board-editor-level-015.png"), fullPage: true });
await page.locator("#validate-button").click();
await page.waitForFunction(() => document.querySelector("#solve-status")?.classList.contains("success"), undefined, { timeout: 60_000 });

const dryRun = await page.evaluate(async () => {
  const payload = JSON.parse(document.querySelector("#shape-code").value);
  const firstRow = payload.rows[0];
  payload.rows[0] = `${firstRow[0] === "#" ? "." : "#"}${firstRow.slice(1)}`;
  const response = await fetch("/__board-editor/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ levelId: payload.levelId, width: payload.width, height: payload.height, rows: payload.rows, minimumDrags: 99, dryRun: true }),
  });
  return { status: response.status, body: await response.json() };
});
if (dryRun.status !== 200 || !dryRun.body.ok || !dryRun.body.dryRun) {
  throw new Error(`Board editor: safe write dry-run failed: ${JSON.stringify(dryRun)}`);
}

await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(120);
const mobileMetrics = await page.evaluate(() => ({
  bodyWidth: document.documentElement.scrollWidth,
  viewportWidth: window.innerWidth,
  cellCount: document.querySelectorAll(".board-cell").length,
}));
if (mobileMetrics.bodyWidth > mobileMetrics.viewportWidth + 1) throw new Error(`Board editor: mobile page overflows by ${mobileMetrics.bodyWidth - mobileMetrics.viewportWidth}px`);
if (mobileMetrics.cellCount < 20) throw new Error("Board editor: grid disappeared on mobile");
await page.screenshot({ path: shot("round38-board-editor-mobile-390x844.png"), fullPage: true });

await browser.close();
if (errors.length) throw new Error(`Board-editor browser errors:\n${errors.join("\n")}`);
console.log("Board-editor drag, undo, solver, safe-save, desktop, and mobile E2E passed.");
