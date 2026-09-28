import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";

const output = fileURLToPath(new URL("../playtest-results/gate-readiness-hierarchy/", import.meta.url));
const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
const checkpoints = [
  { levelId: 12, afterDrags: 0, expected: { actionable: 3, latent: 0, frozen: 1, remainingLayers: 12 } },
  { levelId: 19, afterDrags: 0, expected: { actionable: 5, latent: 3, frozen: 0, remainingLayers: 27 } },
  { levelId: 98, afterDrags: 0, expected: { actionable: 3, latent: 4, frozen: 0, remainingLayers: 41 } },
];
await mkdir(output, { recursive: true });

const save = {
  schemaVersion: 1,
  currentLevel: 30,
  highestLevel: 100,
  coins: 1000,
  sound: false,
  haptic: false,
  reducedMotion: true,
  featureSeen: ["basics", "ice-door", "ice-block", "layer", "shutter", "generator", "elevator", "conveyor", "star"],
  boosterUnlockSeen: ["time", "rocket", "pulse"],
  boosters: { time: 0, rocket: 0, pulse: 0 },
  bestStars: {},
  bestMoves: {},
  rewardedLevels: [],
  dailyStreak: 0,
  lastDailyCompletedDay: "",
  lastSeenUpdate: "2026-09-05-r88",
};

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 360, height: 792 }, deviceScaleFactor: 2 });
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(error.stack ?? error.message));
await page.goto(playtestUrl, { waitUntil: "networkidle" });
await page.evaluate((value) => localStorage.setItem("color-escape-save-v1", JSON.stringify(value)), save);
await page.reload({ waitUntil: "networkidle" });
await page.waitForFunction(() => Boolean(window.__COLOR_ESCAPE__?.getDebugState().art?.ready));

const debug = () => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const waitForInput = () => page.waitForFunction(() => {
  const state = window.__COLOR_ESCAPE__.getDebugState();
  return state.activePointer === undefined && state.exitGhosts === 0 && state.pendingCelebration <= 0 && !state.dragMotion;
});
const drag = async (instruction) => {
  const state = await debug();
  const block = state.puzzle.blocks.find((candidate) => candidate.id === instruction.blockId);
  if (!block) throw new Error(`Gate readiness E2E: missing block ${instruction.blockId}`);
  const [anchorX, anchorY] = block.shape[0];
  const toScreen = (originX, originY) => ({
    x: state.viewportTransform.offsetX + (state.board.innerX + (originX + anchorX + 0.5) * state.board.cell) * state.viewportTransform.scale,
    y: state.viewportTransform.offsetY + (state.board.innerY + (originY + anchorY + 0.5) * state.board.cell) * state.viewportTransform.scale,
  });
  const start = toScreen(block.x, block.y);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  for (const [x, y] of instruction.path) {
    const point = toScreen(x, y);
    await page.mouse.move(point.x, point.y, { steps: 2 });
  }
  await page.mouse.up();
  await waitForInput();
};

for (const checkpoint of checkpoints) {
  await page.setViewportSize({ width: 360, height: 792 });
  await page.evaluate((id) => window.__COLOR_ESCAPE__.loadLevel(id, true), checkpoint.levelId);
  await page.waitForTimeout(220);
  const route = await page.evaluate(async ({ levelId, afterDrags }) => {
    if (afterDrags === 0) return [];
    const [{ LEVELS }, { solveLevelForValidation }] = await Promise.all([
      import("/src/core/levels.ts"),
      import("/src/core/levelSolver.ts"),
    ]);
    return solveLevelForValidation(LEVELS[levelId - 1]).drags.slice(0, afterDrags);
  }, checkpoint);
  for (const instruction of route) await drag(instruction);
  await page.waitForFunction(() => {
    const state = window.__COLOR_ESCAPE__.getDebugState();
    return state.exitPulses.length === 0
      && state.mechanicPulses.length === 0
      && state.particles === 0
      && state.boardShakeTime <= 0
      && !state.hudFeedback;
  });

  const audit = await page.evaluate(async () => {
    const state = window.__COLOR_ESCAPE__.getDebugState();
    const readiness = await import("/src/game/gateReadiness.ts");
    const kinds = state.puzzle.gates.map((gate) => readiness.gateReadiness(gate, state.puzzle.blocks, state.puzzle.shutters));
    return {
      actionable: kinds.filter((kind) => kind === "actionable").length,
      latent: kinds.filter((kind) => kind === "latent").length,
      frozen: kinds.filter((kind) => kind === "frozen").length,
      remainingLayers: state.puzzle.blocks.reduce((sum, block) => sum + block.layers.length, 0),
      complete: state.puzzle.complete,
    };
  });
  if (JSON.stringify({ ...audit, complete: undefined }) !== JSON.stringify({ ...checkpoint.expected, complete: undefined }) || audit.complete) {
    throw new Error(`Gate readiness E2E: Lv${checkpoint.levelId} checkpoint drifted ${JSON.stringify(audit)}`);
  }
  await page.screenshot({ path: resolve(output, `level-${checkpoint.levelId}-tail-360x792.png`) });
  await page.setViewportSize({ width: 320, height: 568 });
  await page.waitForTimeout(160);
  await page.screenshot({ path: resolve(output, `level-${checkpoint.levelId}-tail-320x568.png`) });
}

await page.close();
await browser.close();
if (errors.length) throw new Error(`Gate readiness browser errors:\n${errors.join("\n")}`);
console.log("Lv12/19/98 opening states preserve frozen/actionable/latent exit hierarchy and remain readable at 360x792 and 320x568.");
