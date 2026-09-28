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
const fixture = await page.evaluate(async () => {
  const [{ LEVELS }, { PuzzleModel }] = await Promise.all([
    import("/src/core/levels.ts"),
    import("/src/core/PuzzleModel.ts"),
  ]);
  for (const level of LEVELS) {
    for (const authored of level.blocks) {
      const model = new PuzzleModel(level);
      let block = model.getBlock(authored.id);
      if (!block || !model.isBlockActive(block) || block.frozen > 0
        || model.possibleExitSides(block).length > 0) continue;
      const startX = block.x;
      const startY = block.y;
      let leftCells = 0;
      while (model.moveBlockStep(block.id, startX - leftCells - 1, startY)) {
        leftCells += 1;
        block = model.getBlock(block.id);
        if (!block || model.possibleExitSides(block).length > 0) break;
      }
      if (block && leftCells >= 4 && model.possibleExitSides(block).length === 0) {
        return { levelId: level.id, blockId: block.id, startX, startY, leftCells };
      }
    }
  }
  throw new Error("Left-drag E2E: campaign has no four-cell reversible left lane");
});
await page.evaluate((levelId) => window.__COLOR_ESCAPE__.loadLevel(levelId, true), fixture.levelId);
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
const { blockId } = fixture;
const opening = state.puzzle.blocks.find((block) => block.id === blockId);
if (!opening || opening.x !== fixture.startX || opening.y !== fixture.startY) {
  throw new Error(`Left-drag E2E: Lv${fixture.levelId} reversible-lane block moved`);
}
const [anchorX, anchorY] = opening.shape[0];
const endX = fixture.startX - fixture.leftCells;

const start = screenPoint(state, fixture.startX + anchorX, fixture.startY + anchorY);
const finish = screenPoint(state, endX + anchorX, fixture.startY + anchorY);
await page.mouse.move(start.x, start.y);
await page.mouse.down();
for (let sample = 1; sample <= 32; sample += 1) {
  await page.mouse.move(start.x + (finish.x - start.x) * sample / 32, start.y);
}
state = await debug();
const held = state.puzzle.blocks.find((block) => block.id === blockId);
if (!held || held.x !== endX || held.y !== fixture.startY || state.dragMotion?.blockId !== blockId) {
  throw new Error(`Left-drag E2E: Lv${fixture.levelId} gesture did not cross ${fixture.leftCells} cells left`);
}
if (Math.abs(state.dragMotion.visualX - endX) > 0.03 || state.selectionFeedback?.mode === "blocked") {
  throw new Error("Left-drag E2E: the open lane produced collision feedback");
}
await page.screenshot({ path: shot(`round55-level${fixture.levelId}-left-drag-held.png`) });
await page.mouse.up();
await page.waitForTimeout(140);
state = await debug();
const committed = state.puzzle.blocks.find((block) => block.id === blockId);
if (!committed || committed.x !== endX || committed.y !== fixture.startY || state.puzzle.moves !== 1 || state.dragMotion) {
  throw new Error("Left-drag E2E: leftward release did not commit and settle exactly once");
}

const reverseStart = screenPoint(state, endX + anchorX, fixture.startY + anchorY);
const reverseFinish = screenPoint(state, fixture.startX + anchorX, fixture.startY + anchorY);
await page.mouse.move(reverseStart.x, reverseStart.y);
await page.mouse.down();
await page.mouse.move(reverseFinish.x, reverseFinish.y, { steps: 24 });
await page.mouse.up();
await page.waitForTimeout(140);
state = await debug();
const restored = state.puzzle.blocks.find((block) => block.id === blockId);
if (!restored || restored.x !== fixture.startX || restored.y !== fixture.startY || state.puzzle.moves !== 2) {
  throw new Error("Left-drag E2E: reverse drag did not restore the opening pose");
}

await writeFile(shot(`round55-level${fixture.levelId}-left-drag-report.json`), `${JSON.stringify({
  levelId: fixture.levelId,
  blockId,
  leftCellsCrossed: fixture.leftCells,
  committedMoves: state.puzzle.moves,
  browserErrors: errors,
}, null, 2)}\n`, "utf8");

await browser.close();
if (errors.length) throw new Error(`Left-drag browser errors:\n${errors.join("\n")}`);
console.log(`Level ${fixture.levelId} left drag passed: the block crosses ${fixture.leftCells} cells and reverses cleanly.`);
