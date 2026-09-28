import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";

const output = fileURLToPath(new URL("../playtest-results/", import.meta.url));
const shot = (name) => resolve(output, name);
const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
await mkdir(output, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 592, height: 1280 } });
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(error.message));
await page.goto(playtestUrl, { waitUntil: "networkidle" });

// Locate four real campaign corners where the integer path is legal but the
// trailing 0.39-cell floating pose would snag without turn assistance.
const fixtures = await page.evaluate(async () => {
  const [{ LEVELS }, { PuzzleModel }, { createContinuousCollisionValidator, sweepContinuousPose }] = await Promise.all([
    import("/src/core/levels.ts"),
    import("/src/core/PuzzleModel.ts"),
    import("/src/game/continuousDrag.ts"),
  ]);
  const turns = [
    { name: "right-up", first: [1, 0], second: [0, -1], axis: "y" },
    { name: "up-left", first: [0, -1], second: [-1, 0], axis: "x" },
    { name: "left-down", first: [-1, 0], second: [0, 1], axis: "y" },
    { name: "down-right", first: [0, 1], second: [1, 0], axis: "x" },
  ];
  return turns.map((turn) => {
    for (const level of LEVELS) {
      for (const authored of level.blocks) {
        const model = new PuzzleModel(level);
        const block = model.getBlock(authored.id);
        if (!block || !model.isBlockActive(block)) continue;
        if (model.possibleExitSides(block).length > 0) continue;
        const initial = model.snapshot();
        const coveredByClosedShutter = initial.shutters.some((shutter) => shutter.count > 0
          && model.blockCells(block).some(([cellX, cellY]) => (
            cellX >= shutter.x && cellX < shutter.x + shutter.width
            && cellY >= shutter.y && cellY < shutter.y + shutter.height
          )));
        if (coveredByClosedShutter) continue;
        const origin = [block.x, block.y];
        if (!model.moveBlockStep(block.id, block.x + turn.first[0], block.y + turn.first[1])) continue;
        const afterFirst = model.getBlock(block.id);
        if (!afterFirst || model.possibleExitSides(afterFirst).length > 0 || !model.moveBlockStep(
          block.id,
          afterFirst.x + turn.second[0],
          afterFirst.y + turn.second[1],
        )) continue;
        const afterSecond = model.getBlock(block.id);
        if (!afterSecond || model.possibleExitSides(afterSecond).length > 0) continue;
        const start = {
          x: origin[0] + turn.first[0] * 0.61,
          y: origin[1] + turn.first[1] * 0.61,
        };
        const target = { x: start.x + turn.second[0], y: start.y + turn.second[1] };
        const raw = sweepContinuousPose(start, target, createContinuousCollisionValidator(initial, block.id));
        if (Math.abs(raw[turn.axis] - target[turn.axis]) > 0.2) {
          return { ...turn, levelId: level.id, blockId: block.id, origin };
        }
      }
    }
    throw new Error(`Turn-drag E2E: no real ${turn.name} corner fixture`);
  });
});

const screenPoint = (logical) => {
  const viewport = page.viewportSize();
  const scale = Math.min(viewport.width / 496, viewport.height / 1078);
  return {
    x: (viewport.width - 496 * scale) / 2 + logical.x * scale,
    y: (viewport.height - 1078 * scale) / 2 + logical.y * scale,
  };
};
const debug = () => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const results = [];

for (const fixture of fixtures) {
  await page.evaluate((levelId) => window.__COLOR_ESCAPE__.loadLevel(levelId, true), fixture.levelId);
  await page.waitForTimeout(120);
  let state = await debug();
  const block = state.puzzle.blocks.find((candidate) => candidate.id === fixture.blockId);
  if (!block) throw new Error(`Turn-drag E2E: missing ${fixture.blockId} on Lv${fixture.levelId}`);
  const [anchorX, anchorY] = block.shape[0];
  const point = (x, y) => screenPoint({
    x: state.board.innerX + (x + anchorX + 0.5) * state.board.cell,
    y: state.board.innerY + (y + anchorY + 0.5) * state.board.cell,
  });
  const start = point(fixture.origin[0], fixture.origin[1]);
  const afterFirstPose = [
    fixture.origin[0] + fixture.first[0] * 0.61,
    fixture.origin[1] + fixture.first[1] * 0.61,
  ];
  const firstTarget = point(afterFirstPose[0], afterFirstPose[1]);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(firstTarget.x, firstTarget.y, { steps: 6 });
  state = await debug();
  const firstGrid = state.puzzle.blocks.find((candidate) => candidate.id === fixture.blockId);
  const expectedFirst = [fixture.origin[0] + fixture.first[0], fixture.origin[1] + fixture.first[1]];
  if (!firstGrid || firstGrid.x !== expectedFirst[0] || firstGrid.y !== expectedFirst[1]) {
    throw new Error(`Turn-drag E2E: ${fixture.name} did not cross the first hysteresis boundary ${JSON.stringify({
      fixture,
      expectedFirst,
      firstGrid,
      dragMotion: state.dragMotion,
      selectionFeedback: state.selectionFeedback,
      screen: state.screen,
      overlay: state.overlay,
    })}`);
  }

  const secondPose = [afterFirstPose[0] + fixture.second[0], afterFirstPose[1] + fixture.second[1]];
  const secondTarget = point(secondPose[0], secondPose[1]);
  await page.mouse.move(secondTarget.x, secondTarget.y, { steps: 8 });
  state = await debug();
  const turned = state.puzzle.blocks.find((candidate) => candidate.id === fixture.blockId);
  const expectedTurn = [expectedFirst[0] + fixture.second[0], expectedFirst[1] + fixture.second[1]];
  if (!turned || turned.x !== expectedTurn[0] || turned.y !== expectedTurn[1]) {
    throw new Error(`Turn-drag E2E: ${fixture.name} remained stuck after the 90-degree turn ${JSON.stringify({
      fixture,
      expectedFirst,
      expectedTurn,
      turned,
      dragMotion: state.dragMotion,
      selectionFeedback: state.selectionFeedback,
    })}`);
  }
  if (state.selectionFeedback?.mode === "blocked") {
    throw new Error(`Turn-drag E2E: ${fixture.name} emitted false blocked feedback after assistance`);
  }
  await page.screenshot({ path: shot(`round56-turn-${fixture.name}-held.png`) });
  await page.mouse.up();
  await page.waitForTimeout(150);
  state = await debug();
  const committed = state.puzzle.blocks.find((candidate) => candidate.id === fixture.blockId);
  if (!committed || committed.x !== expectedTurn[0] || committed.y !== expectedTurn[1]
    || state.puzzle.moves !== 1 || state.dragMotion) {
    throw new Error(`Turn-drag E2E: ${fixture.name} did not settle as one committed gesture`);
  }
  results.push({
    turn: fixture.name,
    levelId: fixture.levelId,
    blockId: fixture.blockId,
    from: fixture.origin,
    via: expectedFirst,
    to: expectedTurn,
    committedMoves: state.puzzle.moves,
  });
}

await writeFile(shot("round56-turn-drag-report.json"), `${JSON.stringify({ results, browserErrors: errors }, null, 2)}\n`, "utf8");
await browser.close();
if (errors.length) throw new Error(`Turn-drag browser errors:\n${errors.join("\n")}`);
console.log("Four real-campaign 90-degree turn drags passed without release or false blocked feedback.");
