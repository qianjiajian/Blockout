import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";

const output = fileURLToPath(new URL("../playtest-results/", import.meta.url));
const shot = (name) => resolve(output, name);
const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
await mkdir(output, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 372, height: 794 } });
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(error.message));

await page.goto(playtestUrl, { waitUntil: "networkidle" });
await page.evaluate(() => window.__COLOR_ESCAPE__.loadLevel(63, true));
await page.waitForTimeout(120);

const debug = () => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const screenPoint = (state, x, y) => {
  const viewport = page.viewportSize();
  const scale = Math.min(viewport.width / 496, viewport.height / 1078);
  return {
    x: (viewport.width - 496 * scale) / 2 + (state.board.innerX + (x + 0.5) * state.board.cell) * scale,
    y: (viewport.height - 1078 * scale) / 2 + (state.board.innerY + (y + 0.5) * state.board.cell) * scale,
  };
};

let state = await debug();
const blockId = "composition-63-5";
const generator = state.puzzle.shutters.find((shutter) => shutter.id === "shutter-a");
const opening = state.puzzle.blocks.find((block) => block.id === blockId);
if (!opening || opening.x !== 5 || opening.y !== 6) throw new Error("Left-drag E2E: level 63 lower-lane block moved");
if (!generator || generator.x !== 0 || generator.y !== 2 || generator.width !== 4 || generator.height !== 4) {
  throw new Error("Left-drag E2E: visible generator and logical footprint diverged");
}

const start = screenPoint(state, 5, 6);
const finish = screenPoint(state, 0, 6);
await page.mouse.move(start.x, start.y);
await page.mouse.down();
for (let sample = 1; sample <= 32; sample += 1) {
  await page.mouse.move(start.x + (finish.x - start.x) * sample / 32, start.y);
}
state = await debug();
const held = state.puzzle.blocks.find((block) => block.id === blockId);
if (!held || held.x !== 0 || held.y !== 6 || state.dragMotion?.blockId !== blockId) {
  throw new Error("Left-drag E2E: the recorded level 63 gesture did not cross five cells left");
}
if (Math.abs(state.dragMotion.visualX) > 0.03 || state.selectionFeedback?.mode === "blocked") {
  throw new Error("Left-drag E2E: the open upper lane still produced collision feedback");
}
await page.screenshot({ path: shot("round55-level63-left-drag-held.png") });
await page.mouse.up();
await page.waitForTimeout(140);
state = await debug();
const committed = state.puzzle.blocks.find((block) => block.id === blockId);
if (!committed || committed.x !== 0 || committed.y !== 6 || state.puzzle.moves !== 1 || state.dragMotion) {
  throw new Error("Left-drag E2E: leftward release did not commit and settle exactly once");
}

const reverseStart = screenPoint(state, 0, 6);
const reverseFinish = screenPoint(state, 5, 6);
await page.mouse.move(reverseStart.x, reverseStart.y);
await page.mouse.down();
await page.mouse.move(reverseFinish.x, reverseFinish.y, { steps: 24 });
await page.mouse.up();
await page.waitForTimeout(140);
state = await debug();
const restored = state.puzzle.blocks.find((block) => block.id === blockId);
if (!restored || restored.x !== 5 || restored.y !== 6 || state.puzzle.moves !== 2) {
  throw new Error("Left-drag E2E: reverse drag did not restore the opening pose");
}

await writeFile(shot("round55-level63-left-drag-report.json"), `${JSON.stringify({
  levelId: 63,
  blockId,
  leftCellsCrossed: 5,
  committedMoves: state.puzzle.moves,
  generator: { x: generator.x, y: generator.y, width: generator.width, height: generator.height },
  browserErrors: errors,
}, null, 2)}\n`, "utf8");

await browser.close();
if (errors.length) throw new Error(`Left-drag browser errors:\n${errors.join("\n")}`);
console.log("Level 63 left drag passed: the lower-lane block crosses five cells and reverses cleanly.");
