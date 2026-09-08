import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";

const output = fileURLToPath(new URL("../playtest-results/", import.meta.url));
const shot = (name) => resolve(output, name);
const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
await mkdir(output, { recursive: true });

const save = {
  schemaVersion: 1,
  currentLevel: 1,
  highestLevel: 100,
  coins: 1000,
  sound: false,
  haptic: false,
  reducedMotion: false,
  featureSeen: ["basics", "ice-door", "ice-block", "layer", "shutter"],
  boosters: { time: 3, rocket: 3, pulse: 3 },
  bestStars: {},
  bestMoves: {},
  rewardedLevels: [],
  dailyStreak: 0,
  lastDailyCompletedDay: "",
};

const browser = await chromium.launch({ headless: true });
const errors = [];
const attachErrors = (page) => {
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("pageerror", (error) => errors.push(error.message));
};
const debug = (page) => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const screenPoint = (page, logical) => {
  const viewport = page.viewportSize();
  const scale = Math.min(viewport.width / 496, viewport.height / 1078);
  return {
    x: (viewport.width - 496 * scale) / 2 + logical.x * scale,
    y: (viewport.height - 1078 * scale) / 2 + logical.y * scale,
  };
};
const logicalPoint = (state, x, y) => ({
  x: state.board.innerX + (x + 0.5) * state.board.cell,
  y: state.board.innerY + (y + 0.5) * state.board.cell,
});
const seed = async (page) => {
  await page.goto(playtestUrl, { waitUntil: "networkidle" });
  await page.evaluate((value) => localStorage.setItem("color-escape-save-v1", JSON.stringify(value)), save);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(180);
};
const findFixtures = async (page) => page.evaluate(async () => {
  const [{ LEVELS }, { PuzzleModel }, { createContinuousCollisionValidator }] = await Promise.all([
    import("/src/core/levels.ts"),
    import("/src/core/PuzzleModel.ts"),
    import("/src/game/continuousDrag.ts"),
  ]);
  const fixtures = {};
  for (const level of LEVELS.filter((candidate) => candidate.id <= 30 && !(candidate.elevators?.length) && !(candidate.conveyors?.length))) {
    const model = new PuzzleModel(level);
    const snapshot = model.snapshot();
    for (const block of snapshot.blocks) {
      if (!model.isBlockActive(block) || snapshot.blocks.length < 2) continue;
      const valid = createContinuousCollisionValidator(snapshot, block.id);
      if (!fixtures.tracking) {
        for (const dx of [-1, 1]) {
          for (const dy of [-1, 1]) {
            if (valid(block.x + dx * 0.34, block.y + dy * 0.34)) {
              fixtures.tracking = { levelId: level.id, blockId: block.id, dx, dy };
            }
          }
        }
      }
      if (!fixtures.wall) {
        for (const [blockedDx, blockedDy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
          const freeOptions = blockedDx ? [[0, -1], [0, 1]] : [[-1, 0], [1, 0]];
          for (const [freeDx, freeDy] of freeOptions) {
            const blocked = !valid(block.x + blockedDx * 0.06, block.y + blockedDy * 0.06);
            const free = valid(block.x + freeDx * 0.36, block.y + freeDy * 0.36);
            if (blocked && free) {
              fixtures.wall = { levelId: level.id, blockId: block.id, blockedDx, blockedDy, freeDx, freeDy };
            }
          }
        }
      }
      if (!fixtures.snap) {
        for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
          if (model.canPlace(block, block.x + dx, block.y + dy)
            && valid(block.x + dx * 0.75, block.y + dy * 0.75)) {
            fixtures.snap = { levelId: level.id, blockId: block.id, dx, dy };
          }
        }
      }
      if (fixtures.tracking && fixtures.wall && fixtures.snap) return fixtures;
    }
  }
  throw new Error(`Hybrid-drag E2E: missing dynamic fixture ${JSON.stringify(fixtures)}`);
});
const openFixture = async (page, fixture) => {
  await page.evaluate((levelId) => window.__COLOR_ESCAPE__.loadLevel(levelId, true), fixture.levelId);
  await page.waitForTimeout(120);
  const state = await debug(page);
  const block = state.puzzle.blocks.find((candidate) => candidate.id === fixture.blockId);
  if (!block) throw new Error(`Hybrid-drag E2E: fixture block ${fixture.blockId} is missing`);
  return { state, block };
};

const page = await browser.newPage({ viewport: { width: 496, height: 1078 } });
attachErrors(page);
await seed(page);
const fixtures = await findFixtures(page);

// A slow 30 FPS sample must expose many real floating poses, not integer jumps.
let { state, block } = await openFixture(page, fixtures.tracking);
let start = screenPoint(page, logicalPoint(state, block.x, block.y));
await page.mouse.move(start.x, start.y);
await page.mouse.down();
const samples = [];
for (let frame = 1; frame <= 10; frame += 1) {
  const progress = frame / 10;
  const targetLogical = logicalPoint(state,
    block.x + fixtures.tracking.dx * 0.34 * progress,
    block.y + fixtures.tracking.dy * 0.34 * progress);
  const target = screenPoint(page, targetLogical);
  await page.mouse.move(target.x, target.y);
  await page.waitForTimeout(34);
  const sample = await debug(page);
  samples.push({
    frame,
    state: sample.dragMotion?.state,
    visualX: sample.dragMotion?.visualX,
    visualY: sample.dragMotion?.visualY,
    gridX: sample.dragMotion?.gridX,
    gridY: sample.dragMotion?.gridY,
  });
}
state = await debug(page);
if (state.dragMotion?.state !== "dragging") throw new Error("Hybrid-drag E2E: floating drag state was not exposed");
if (Math.abs(state.dragMotion.visualX - (block.x + fixtures.tracking.dx * 0.34)) > 0.03
  || Math.abs(state.dragMotion.visualY - (block.y + fixtures.tracking.dy * 0.34)) > 0.03) {
  throw new Error("Hybrid-drag E2E: block did not stay within 0.03 cell of the finger");
}
if (state.dragMotion.gridX !== block.x || state.dragMotion.gridY !== block.y) {
  throw new Error("Hybrid-drag E2E: candidate changed before the hysteresis threshold");
}
const activeSamples = samples.filter((sample) => sample.state === "dragging");
const uniqueFractionalPoses = new Set(activeSamples.map((sample) => `${sample.visualX?.toFixed(3)},${sample.visualY?.toFixed(3)}`));
if (uniqueFractionalPoses.size < 6 || activeSamples.some((sample) => Number.isInteger(sample.visualX) && Number.isInteger(sample.visualY))) {
  throw new Error("Hybrid-drag E2E: 30 FPS slow drag still looked grid-stepped");
}
await page.screenshot({ path: shot("round48-hybrid-diagonal-fractional.png") });
await page.mouse.up();
state = await debug(page);
if (state.puzzle.moves !== 0 || state.dragMotion?.state !== "settling") {
  throw new Error("Hybrid-drag E2E: sub-threshold release did not start a no-op return");
}
await page.waitForTimeout(150);
state = await debug(page);
if (state.dragMotion || state.puzzle.blocks.find((candidate) => candidate.id === block.id)?.y !== block.y) {
  throw new Error("Hybrid-drag E2E: invalid/no-op return did not settle on the original grid cell");
}

// Pressing into the left rim while moving upward must slide on Y and never penetrate X.
({ state, block } = await openFixture(page, fixtures.wall));
start = screenPoint(page, logicalPoint(state, block.x, block.y));
await page.mouse.move(start.x, start.y);
await page.mouse.down();
let target = screenPoint(page, logicalPoint(state,
  block.x + fixtures.wall.blockedDx * 0.8 + fixtures.wall.freeDx * 0.36,
  block.y + fixtures.wall.blockedDy * 0.8 + fixtures.wall.freeDy * 0.36));
await page.mouse.move(target.x, target.y, { steps: 4 });
state = await debug(page);
const blockedDelta = fixtures.wall.blockedDx
  ? (state.dragMotion?.visualX - block.x) * fixtures.wall.blockedDx
  : (state.dragMotion?.visualY - block.y) * fixtures.wall.blockedDy;
const freeDelta = fixtures.wall.freeDx
  ? (state.dragMotion?.visualX - block.x) * fixtures.wall.freeDx
  : (state.dragMotion?.visualY - block.y) * fixtures.wall.freeDy;
if (Math.abs(blockedDelta) > 0.02 || freeDelta < 0.25) {
  throw new Error(`Hybrid-drag E2E: wall contact did not preserve sliding on the free axis ${JSON.stringify({
    fixture: fixtures.wall,
    block: { id: block.id, x: block.x, y: block.y },
    dragMotion: state.dragMotion,
    blockedDelta,
    freeDelta,
  })}`);
}
if (state.selectionFeedback?.mode !== "blocked") throw new Error("Hybrid-drag E2E: wall contact lacked blocked feedback");
await page.screenshot({ path: shot("round48-hybrid-wall-slide.png") });
await page.mouse.up();
await page.waitForTimeout(140);

// Crossing hysteresis changes the integer candidate, commits one move on release,
// and locks block pickup during the 90 ms visual snap.
({ state, block } = await openFixture(page, fixtures.snap));
start = screenPoint(page, logicalPoint(state, block.x, block.y));
await page.mouse.move(start.x, start.y);
await page.mouse.down();
target = screenPoint(page, logicalPoint(state,
  block.x + fixtures.snap.dx * 0.75,
  block.y + fixtures.snap.dy * 0.75));
await page.mouse.move(target.x, target.y, { steps: 7 });
state = await debug(page);
if (state.dragMotion?.gridX !== block.x + fixtures.snap.dx
  || state.dragMotion?.gridY !== block.y + fixtures.snap.dy
  || Math.abs(state.dragMotion.visualX - (block.x + fixtures.snap.dx * 0.75)) > 0.03
  || Math.abs(state.dragMotion.visualY - (block.y + fixtures.snap.dy * 0.75)) > 0.03) {
  throw new Error("Hybrid-drag E2E: floating pose and legal integer candidate diverged");
}
await page.mouse.up();
state = await debug(page);
if (state.puzzle.moves !== 1 || state.dragMotion?.state !== "settling" || state.selectedId) {
  throw new Error("Hybrid-drag E2E: one gesture was not committed once before snap settle");
}
const settleStartDistance = Math.hypot(
  state.dragMotion.visualX - state.dragMotion.gridX,
  state.dragMotion.visualY - state.dragMotion.gridY,
);
await page.waitForTimeout(35);
state = await debug(page);
const settleMidDistance = state.dragMotion ? Math.hypot(
  state.dragMotion.visualX - state.dragMotion.gridX,
  state.dragMotion.visualY - state.dragMotion.gridY,
) : 0;
if (state.dragMotion?.state !== "settling" || settleMidDistance >= settleStartDistance || settleMidDistance <= 0) {
  throw new Error("Hybrid-drag E2E: ease-out snap did not produce an intermediate floating pose");
}
await page.screenshot({ path: shot("round48-hybrid-snap-midpoint.png") });
const other = state.puzzle.blocks.find((candidate) => candidate.id !== block.id && candidate.frozen === 0 && !candidate.shutterId);
if (!other) throw new Error("Hybrid-drag E2E: settle fixture has no second active block");
const [otherAnchorX, otherAnchorY] = other.shape[0];
const otherPoint = screenPoint(page, logicalPoint(state, other.x + otherAnchorX, other.y + otherAnchorY));
await page.mouse.click(otherPoint.x, otherPoint.y);
state = await debug(page);
if (state.selectedId) throw new Error("Hybrid-drag E2E: a second block was grabbed during settle");
await page.waitForTimeout(120);
state = await debug(page);
if (state.dragMotion) throw new Error("Hybrid-drag E2E: 90 ms settle did not finish");
await page.screenshot({ path: shot("round48-hybrid-grid-settled.png") });

await writeFile(shot("round48-hybrid-drag-samples.json"), `${JSON.stringify({ samples }, null, 2)}\n`, "utf8");
await page.close();

// Compact high-density viewport uses the same logical input precision.
const mobile = await browser.newPage({ viewport: { width: 320, height: 568 }, deviceScaleFactor: 2 });
attachErrors(mobile);
await seed(mobile);
({ state, block } = await openFixture(mobile, fixtures.tracking));
start = screenPoint(mobile, logicalPoint(state, block.x, block.y));
await mobile.mouse.move(start.x, start.y);
await mobile.mouse.down();
target = screenPoint(mobile, logicalPoint(state,
  block.x + fixtures.tracking.dx * 0.28,
  block.y + fixtures.tracking.dy * 0.28));
await mobile.mouse.move(target.x, target.y, { steps: 4 });
state = await debug(mobile);
if (!state.dragMotion || Math.abs(state.dragMotion.visualX - (block.x + fixtures.tracking.dx * 0.28)) > 0.04
  || Math.abs(state.dragMotion.visualY - (block.y + fixtures.tracking.dy * 0.28)) > 0.04) {
  throw new Error("Hybrid-drag E2E: 320x568 DPR2 lost sub-cell tracking precision");
}
await mobile.screenshot({ path: shot("round48-hybrid-320x568-dpr2.png") });
await mobile.mouse.up();
await mobile.close();

await browser.close();
if (errors.length) throw new Error(`Hybrid-drag browser errors:\n${errors.join("\n")}`);
console.log("Hybrid drag passed: 30 FPS floating poses, diagonal tracking, wall slide, hysteresis, settle lock, and 320x568 DPR2.");
