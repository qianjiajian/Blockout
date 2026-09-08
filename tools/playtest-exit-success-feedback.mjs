import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";

const output = fileURLToPath(new URL("../playtest-results/", import.meta.url));
const shot = (name) => resolve(output, name);
const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
await mkdir(output, { recursive: true });

const save = (reducedMotion = false) => ({
  schemaVersion: 1,
  currentLevel: 1,
  highestLevel: 100,
  coins: 1000,
  sound: false,
  haptic: false,
  reducedMotion,
  featureSeen: ["basics", "ice-door", "ice-block", "layer", "shutter"],
  boosters: { time: 3, rocket: 3, pulse: 3 },
  bestStars: {},
  bestMoves: {},
  rewardedLevels: [1, 2, 3],
  dailyStreak: 0,
  lastDailyCompletedDay: "",
});

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 496, height: 1078 } });
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(error.message));
const debug = () => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const screenPoint = (logical) => {
  const viewport = page.viewportSize();
  const scale = Math.min(viewport.width / 496, viewport.height / 1078);
  return {
    x: (viewport.width - 496 * scale) / 2 + logical.x * scale,
    y: (viewport.height - 1078 * scale) / 2 + logical.y * scale,
  };
};
const logicalCell = (board, x, y) => ({
  x: board.innerX + (x + 0.5) * board.cell,
  y: board.innerY + (y + 0.5) * board.cell,
});
const seed = async (reducedMotion = false) => {
  await page.goto(playtestUrl, { waitUntil: "networkidle" });
  await page.evaluate((value) => localStorage.setItem("color-escape-save-v1", JSON.stringify(value)), save(reducedMotion));
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(180);
};
const openLevel = async (levelId) => {
  await page.evaluate((id) => window.__COLOR_ESCAPE__.loadLevel(id, true), levelId);
  await page.waitForTimeout(100);
  const state = await debug();
  if (state.screen !== "playing" || state.level.id !== levelId) {
    throw new Error(`Exit-success E2E: expected playing Lv${levelId}`);
  }
  return state;
};
const performDrag = async (drag, capture) => {
  let state = await debug();
  let block = state.puzzle.blocks.find((candidate) => candidate.id === drag.blockId);
  if (!block) throw new Error(`Exit-success E2E: missing ${drag.blockId}`);
  const beforeBlock = block;
  const [anchorX, anchorY] = block.shape[0];
  const start = screenPoint(logicalCell(state.board, block.x + anchorX, block.y + anchorY));
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  for (const [x, y] of drag.path) {
    const next = screenPoint(logicalCell(state.board, x + anchorX, y + anchorY));
    await page.mouse.move(next.x, next.y, { steps: 3 });
  }
  state = await debug();
  block = state.puzzle.blocks.find((candidate) => candidate.id === drag.blockId);
  if (drag.exitSide) {
    const expectedLayers = Math.max(0, beforeBlock.layers.length - 1);
    if (state.selectedId || state.activePointer !== undefined
      || (expectedLayers === 0 && block)
      || (expectedLayers > 0 && (!block || block.layers.length !== expectedLayers))) {
      throw new Error(`Exit-success E2E: ${drag.blockId} did not resolve while the pointer stayed down`);
    }
    await page.waitForTimeout(capture ? 75 : 20);
  } else if (!block) {
    throw new Error(`Exit-success E2E: ${drag.blockId} disappeared during a parking drag`);
  }
  const after = await debug();
  await page.mouse.up();
  return after;
};

await seed(false);
const fixtures = await page.evaluate(async () => {
  const [{ LEVELS }, { solveLevelOptimally }, { PuzzleModel }] = await Promise.all([
    import("/src/core/levels.ts"),
    import("/src/core/levelSolver.ts"),
    import("/src/core/PuzzleModel.ts"),
  ]);
  const events = [];
  for (const level of LEVELS.slice(0, 30)) {
    const result = solveLevelOptimally(level);
    if (!result.solved) continue;
    const model = new PuzzleModel(level);
    const prefix = [];
    for (const drag of result.drags) {
      const before = model.snapshot().blocks.find((block) => block.id === drag.blockId);
      model.beginAction();
      for (const [x, y] of drag.path) model.moveBlock(drag.blockId, x, y);
      if (drag.exitSide) model.tryExit(drag.blockId, drag.exitSide);
      model.commitAction();
      const fullyExited = !model.snapshot().blocks.some((block) => block.id === drag.blockId);
      if (drag.exitSide && before && fullyExited) {
        events.push({ levelId: level.id, color: before.color, side: drag.exitSide, prefix: [...prefix, drag] });
      }
      prefix.push(drag);
    }
  }
  const colors = ["blue", "purple", "yellow", "pink", "red", "orange", "green", "cyan"];
  const selected = [];
  const coveredSides = new Set();
  for (const color of colors) {
    const candidates = events.filter((event) => event.color === color)
      .sort((a, b) => Number(coveredSides.has(a.side)) - Number(coveredSides.has(b.side)) || a.prefix.length - b.prefix.length);
    if (!candidates.length) throw new Error(`No exit-success fixture for ${color}`);
    selected.push(candidates[0]);
    coveredSides.add(candidates[0].side);
  }
  if (coveredSides.size < 4) throw new Error(`Exit-success fixtures cover only ${coveredSides.size} directions`);
  let layer;
  for (const level of LEVELS.slice(0, 40)) {
    const result = solveLevelOptimally(level);
    if (!result.solved) continue;
    const model = new PuzzleModel(level);
    const prefix = [];
    for (const drag of result.drags) {
      const before = model.snapshot().blocks.find((block) => block.id === drag.blockId);
      model.beginAction();
      for (const [x, y] of drag.path) model.moveBlock(drag.blockId, x, y);
      if (drag.exitSide) model.tryExit(drag.blockId, drag.exitSide);
      model.commitAction();
      prefix.push(drag);
      const after = model.snapshot().blocks.find((block) => block.id === drag.blockId);
      if (drag.exitSide && before && after && before.layers.length > after.layers.length) {
        layer = {
          levelId: level.id,
          blockId: drag.blockId,
          color: before.color,
          side: drag.exitSide,
          layersBefore: before.layers.length,
          prefix: [...prefix],
        };
        break;
      }
    }
    if (layer) break;
  }
  if (!layer) throw new Error("No layered exit-success fixture");
  return { exits: selected, layer };
});
for (const fixture of fixtures.exits) {
  await openLevel(fixture.levelId);
  for (let index = 0; index < fixture.prefix.length; index += 1) {
    const target = index === fixture.prefix.length - 1;
    const state = await performDrag(fixture.prefix[index], target);
    if (!target) {
      await page.waitForTimeout(850);
      continue;
    }
    const pulse = state.exitPulses.find((candidate) => candidate.color === fixture.color && candidate.side === fixture.side);
    if (!pulse || !state.fragmentColors.includes(fixture.color) || state.particles < 18 || state.exitGhosts < 1) {
      throw new Error(`Exit-success E2E: ${fixture.color}/${fixture.side} on Lv${fixture.levelId} did not expose its matching pulse, fragments, and gate-under ghost (${JSON.stringify({ pulses: state.exitPulses, fragments: state.fragmentColors, particles: state.particles, ghosts: state.exitGhosts })})`);
    }
    if (state.fragmentColors.some((color) => color !== fixture.color)) {
      throw new Error(`Exit-success E2E: ${fixture.color}/${fixture.side} mixed another fragment color`);
    }
    await page.screenshot({ path: shot(`round43-exit-${fixture.color}-${fixture.side}.png`) });
    if (fixture.color === "blue") {
      await page.waitForTimeout(105);
      await page.screenshot({ path: shot("round43-exit-blue-top-mid.png") });
    }
  }
}

await openLevel(fixtures.layer.levelId);
let state;
for (let index = 0; index < fixtures.layer.prefix.length; index += 1) {
  state = await performDrag(fixtures.layer.prefix[index], index === fixtures.layer.prefix.length - 1);
  if (index < fixtures.layer.prefix.length - 1) await page.waitForTimeout(850);
}
const peeled = state.puzzle.blocks.find((block) => block.id === fixtures.layer.blockId);
if (!peeled || peeled.layers.length !== fixtures.layer.layersBefore - 1 || state.exitGhosts !== 0
  || !state.fragmentColors.includes(fixtures.layer.color)
  || !state.exitPulses.some((pulse) => pulse.color === fixtures.layer.color && pulse.side === fixtures.layer.side)) {
  throw new Error("Exit-success E2E: layered peel did not burst in the removed outer color while keeping the block");
}
await page.screenshot({ path: shot(`round43-exit-layered-peel-level-${String(fixtures.layer.levelId).padStart(3, "0")}.png`) });

await page.setViewportSize({ width: 320, height: 568 });
await seed(true);
const reducedFixture = fixtures.exits.find((fixture) => fixture.color === "blue");
if (!reducedFixture) throw new Error("Exit-success E2E: missing reduced-motion blue fixture");
await openLevel(reducedFixture.levelId);
for (let index = 0; index < reducedFixture.prefix.length; index += 1) {
  state = await performDrag(reducedFixture.prefix[index], index === reducedFixture.prefix.length - 1);
  if (index < reducedFixture.prefix.length - 1) await page.waitForTimeout(850);
}
if (!state.settings.reducedMotion || !state.fragmentColors.includes("blue")
  || state.particles < 2 || state.particles > 9
  || !state.exitPulses.some((pulse) => pulse.color === "blue" && pulse.side === reducedFixture.side)) {
  throw new Error("Exit-success E2E: 320x568 reduced-motion exit lost its causal color feedback or particle budget");
}
await page.screenshot({ path: shot("round43-exit-blue-top-320x568-reduced.png") });

await browser.close();
if (errors.length) throw new Error(`Exit-success browser errors:\n${errors.join("\n")}`);
console.log("Eight colors, four exit directions, layered peel, gate-under ordering, reduced motion, and 320x568 success feedback passed.");
