import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";

const output = fileURLToPath(new URL("../playtest-results/", import.meta.url));
const shot = (name) => resolve(output, name);
const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
await mkdir(output, { recursive: true });

const browser = await chromium.launch({ headless: true });
const errors = [];
const save = (currentLevel = 1, highestLevel = Math.max(10, currentLevel)) => ({
  schemaVersion: 1,
  currentLevel,
  highestLevel,
  coins: 1000,
  sound: false,
  haptic: false,
  reducedMotion: true,
  featureSeen: ["basics"],
  boosters: { time: 3, rocket: 9, pulse: 3 },
  bestStars: {},
  bestMoves: { "1": 17 },
  rewardedLevels: [1, 2, 3],
  dailyStreak: 0,
  lastDailyCompletedDay: "",
});

const attachErrors = (page) => {
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("pageerror", (error) => errors.push(error.message));
};

const openWithSave = async (page, value) => {
  await page.goto(playtestUrl, { waitUntil: "networkidle" });
  await page.evaluate((nextSave) => localStorage.setItem("color-escape-save-v1", JSON.stringify(nextSave)), value);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(120);
};

const pageCoordinates = (width, height) => {
  const scale = Math.min(width / 496, height / 1078);
  const offsetX = (width - 496 * scale) / 2;
  const offsetY = (height - 1078 * scale) / 2;
  return {
    click: (page, x, y) => page.mouse.click(offsetX + x * scale, offsetY + y * scale),
    point: (x, y) => ({ x: offsetX + x * scale, y: offsetY + y * scale }),
  };
};

const completeAssisted = async (page, coordinates) => {
  let state = await page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
  const assistedBlock = state.puzzle.blocks[0];
  if (!assistedBlock) return;
  await coordinates.click(page, 248, 990);
  state = await page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
  const target = state.puzzle.blocks.find((block) => block.id === assistedBlock.id) ?? state.puzzle.blocks[0];
  const [targetAnchorX, targetAnchorY] = target.shape[0];
  await coordinates.click(
    page,
    state.board.innerX + (target.x + targetAnchorX + 0.5) * state.board.cell,
    state.board.innerY + (target.y + targetAnchorY + 0.5) * state.board.cell,
  );
  await page.waitForTimeout(220);

  const solution = await page.evaluate(async () => {
    const current = window.__COLOR_ESCAPE__.getDebugState();
    if (current.puzzle.complete) return { solved: true, drags: [] };
    const { solveLevelForValidation } = await import("/src/core/levelSolver.ts");
    return solveLevelForValidation({
      ...current.level,
      id: current.level.id + 100_000,
      name: `${current.level.name}-continuous-next-remainder`,
      parMoves: undefined,
      playable: current.puzzle.playable,
      blocked: current.puzzle.blocked,
      gates: current.puzzle.gates,
      blocks: current.puzzle.blocks,
      shutters: current.puzzle.shutters,
      elevators: [],
      conveyors: current.puzzle.conveyors,
    });
  });
  if (!solution.solved) throw new Error("Continuous-next E2E: assisted remainder had no validation route");

  for (const drag of solution.drags) {
    state = await page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
    const block = state.puzzle.blocks.find((candidate) => candidate.id === drag.blockId);
    if (!block) throw new Error(`Continuous-next E2E: missing ${drag.blockId} before validation drag`);
    const [anchorX, anchorY] = block.shape[0];
    const start = coordinates.point(
      state.board.innerX + (block.x + anchorX + 0.5) * state.board.cell,
      state.board.innerY + (block.y + anchorY + 0.5) * state.board.cell,
    );
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    for (const [x, y] of drag.path) {
      const point = coordinates.point(
        state.board.innerX + (x + anchorX + 0.5) * state.board.cell,
        state.board.innerY + (y + anchorY + 0.5) * state.board.cell,
      );
      await page.mouse.move(point.x, point.y, { steps: 2 });
    }
    await page.mouse.up();
    await page.waitForTimeout(220);
  }

  state = await page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
  if (!state.puzzle.complete || state.puzzle.blocks.length !== 0) {
    throw new Error("Continuous-next E2E: assisted pointer route did not complete the board");
  }
};

const page = await browser.newPage({ viewport: { width: 496, height: 1078 } });
attachErrors(page);
const standard = pageCoordinates(496, 1078);
const debug = () => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
await openWithSave(page, save());
const firstFeature = await page.evaluate(async () => {
  const { LEVELS } = await import("/src/core/levels.ts");
  const level = LEVELS.find((candidate) => candidate.id > 1 && candidate.featureIntro);
  if (!level?.featureIntro) throw new Error("Continuous-next E2E: campaign has no feature intro");
  return { levelId: level.id, previousLevelId: level.id - 1, kind: level.featureIntro.kind };
});
await page.evaluate(() => window.__COLOR_ESCAPE__.loadLevel(1, true));
let state = await debug();
await completeAssisted(page, standard);
await page.waitForTimeout(1350);
state = await debug();
if (state.screen !== "win" || state.winAction !== "下一关" || state.winSecondaryAction !== "返回主页") {
  throw new Error("Continuous-next E2E: normal result did not expose clear continue/home choices");
}
if (!state.assistedClear || state.progression.bestMoves["1"] !== 17) {
  throw new Error("Continuous-next E2E: rocket-assisted clear overwrote the existing fair best-move record");
}
await page.screenshot({ path: shot("round21-win-next-or-home.png") });

await standard.click(page, 248, 754);
state = await debug();
if (state.screen !== "playing" || state.level.id !== 2 || state.puzzle.moves !== 0 || state.activeRun?.levelId !== 2) {
  throw new Error("Continuous-next E2E: next did not begin a clean level 2 run directly");
}
await page.screenshot({ path: shot("round21-level2-direct-start.png") });

// The secondary route remains a real home exit and does not leave a run journal behind.
await openWithSave(page, save());
await page.evaluate(() => window.__COLOR_ESCAPE__.loadLevel(1, true));
await completeAssisted(page, standard);
await page.waitForTimeout(1350);
await standard.click(page, 248, 833);
state = await debug();
const replayDisk = await page.evaluate(() => JSON.parse(localStorage.getItem("color-escape-save-v1")));
if (state.screen !== "home" || state.level.id !== 1 || state.activeRun
  || replayDisk.currentLevel !== 1 || replayDisk.highestLevel !== 10) {
  throw new Error("Continuous-next E2E: result home route did not settle cleanly");
}

// Seamless continuation must still stop for the next unseen mechanism intro.
await openWithSave(page, save(firstFeature.previousLevelId));
await page.evaluate((levelId) => window.__COLOR_ESCAPE__.loadLevel(levelId, true), firstFeature.previousLevelId);
await completeAssisted(page, standard);
await page.waitForTimeout(1350);
await standard.click(page, 248, 754);
state = await debug();
if (state.screen !== "feature" || state.level.id !== firstFeature.levelId
  || state.level.featureIntro?.kind !== firstFeature.kind || state.activeRun?.levelId !== firstFeature.levelId) {
  throw new Error(`Continuous-next E2E: unseen level-${firstFeature.levelId} mechanism intro was bypassed`);
}
await page.screenshot({ path: shot("round21-next-stops-for-feature.png") });
await standard.click(page, 248, 755);
state = await debug();
if (state.screen !== "playing" || state.level.id !== firstFeature.levelId
  || state.puzzle.moves !== 0 || state.activeRun?.levelId !== firstFeature.levelId) {
  throw new Error("Continuous-next E2E: mechanism confirmation did not resume the prepared next run");
}
await page.close();

// Minimum viewport: both result actions remain readable and the lower action is clickable.
const small = await browser.newPage({ viewport: { width: 320, height: 568 } });
attachErrors(small);
const compact = pageCoordinates(320, 568);
await openWithSave(small, save());
await small.evaluate(() => window.__COLOR_ESCAPE__.loadLevel(1, true));
await completeAssisted(small, compact);
await small.waitForTimeout(1350);
let smallState = await small.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
if (smallState.screen !== "win" || smallState.winSecondaryAction !== "返回主页") {
  throw new Error("Continuous-next E2E: 320x568 result choices are incorrect");
}
await small.screenshot({ path: shot("round21-win-next-or-home-320x568.png") });
await compact.click(small, 248, 833);
smallState = await small.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
if (smallState.screen !== "home") throw new Error("Continuous-next E2E: 320x568 home action was not clickable");
await small.close();

await browser.close();
if (errors.length) throw new Error(`Continuous-next browser errors:\n${errors.join("\n")}`);
console.log("Direct next-level flow, explicit home choice, feature-intro preservation, and 320x568 result actions passed.");
