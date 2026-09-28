import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";

const output = fileURLToPath(new URL("../playtest-results/", import.meta.url));
const shot = (name) => resolve(output, name);
const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
await mkdir(output, { recursive: true });

const makeSave = (currentLevel) => ({
  schemaVersion: 1,
  currentLevel,
  highestLevel: 100,
  coins: 1000,
  sound: false,
  haptic: false,
  reducedMotion: true,
  featureSeen: ["basics", "ice-door", "ice-block", "layer"],
  boosters: { time: 3, rocket: 3, pulse: 3 },
  bestStars: {},
  bestMoves: {},
  rewardedLevels: Array.from({ length: Math.max(0, currentLevel - 1) }, (_, index) => index + 1),
  dailyStreak: 0,
  lastDailyCompletedDay: "",
});

const browser = await chromium.launch({ headless: true });
const errors = [];
const attachErrors = (page) => {
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("pageerror", (error) => errors.push(error.message));
};
const debug = (page) => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const seed = async (page, currentLevel) => {
  await page.goto(playtestUrl, { waitUntil: "networkidle" });
  await page.evaluate((save) => localStorage.setItem("color-escape-save-v1", JSON.stringify(save)), makeSave(currentLevel));
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(300);
};
const screenPoint = (page, point) => {
  const viewport = page.viewportSize();
  const scale = Math.min(viewport.width / 496, viewport.height / 1078);
  return {
    x: (viewport.width - 496 * scale) / 2 + point.x * scale,
    y: (viewport.height - 1078 * scale) / 2 + point.y * scale,
  };
};
const clickLogical = async (page, x, y) => {
  const point = screenPoint(page, { x, y });
  await page.mouse.click(point.x, point.y);
};
const clickInteractionTarget = async (page, name) => {
  const state = await debug(page);
  const hit = state.interactionTargets?.targets?.[name]?.hit;
  const bounds = await page.locator("canvas").boundingBox();
  if (!hit || !bounds) throw new Error(`Pacing E2E: missing interaction target ${name}`);
  await page.mouse.click(
    bounds.x + state.viewportTransform.offsetX + (hit.x + hit.width / 2) * state.viewportTransform.scale,
    bounds.y + state.viewportTransform.offsetY + (hit.y + hit.height / 2) * state.viewportTransform.scale,
  );
};

const page = await browser.newPage({ viewport: { width: 496, height: 1078 } });
attachErrors(page);
await page.goto(playtestUrl, { waitUntil: "networkidle" });
const pacingFixture = await page.evaluate(async () => {
  const [{ LEVELS }, { solveLevelForValidation }, { campaignPacingForTarget }] = await Promise.all([
    import("/src/core/levels.ts"),
    import("/src/core/levelSolver.ts"),
    import("/src/core/campaignDifficultyTargets.ts"),
  ]);
  const intro = LEVELS.find((level) => level.featureIntro?.kind === "generator")
    ?? LEVELS.find((level) => level.featureIntro && level.id < LEVELS.length);
  if (!intro?.featureIntro) throw new Error("Pacing E2E: no formal feature intro");
  const application = LEVELS[intro.id];
  const solution = solveLevelForValidation(intro);
  if (!application || !solution.solved || !solution.drags[0]) throw new Error("Pacing E2E: feature/application route missing");
  const introPacing = campaignPacingForTarget(intro.designTargets?.calibratedDifficulty ?? Number.NaN);
  const applicationPacing = campaignPacingForTarget(application.designTargets?.calibratedDifficulty ?? Number.NaN);
  return {
    introId: intro.id,
    introName: intro.name,
    kind: intro.featureIntro.kind,
    introDifficulty: introPacing.difficulty,
    introTime: introPacing.timeSeconds,
    applicationId: application.id,
    applicationName: application.name,
    applicationDifficulty: application.difficulty,
    applicationTime: application.timeSeconds,
    expectedApplicationDifficulty: applicationPacing.difficulty,
    expectedApplicationTime: applicationPacing.timeSeconds,
    firstDrag: solution.drags[0],
  };
});
await seed(page, pacingFixture.introId);
await clickInteractionTarget(page, "homePlay");
await page.waitForTimeout(100);
let state = await debug(page);
if (state.screen !== "feature" || state.level.id !== pacingFixture.introId
  || state.level.name !== pacingFixture.introName || state.level.featureIntro?.kind !== pacingFixture.kind) {
  throw new Error(`Pacing E2E: ${pacingFixture.kind} introduction did not open on level ${pacingFixture.introId}`);
}
if (state.level.difficulty !== pacingFixture.introDifficulty || state.level.timeSeconds !== pacingFixture.introTime) {
  throw new Error("Pacing E2E: feature introduction drifted from its formal target tier");
}
if (state.puzzle.started || state.puzzle.autonomousStarted
  || state.puzzle.remainingSeconds !== pacingFixture.introTime) {
  throw new Error("Pacing E2E: explanation screen consumed the formal timer");
}
await page.screenshot({ path: shot("round54-feature-intro-pacing.png") });

await clickInteractionTarget(page, "featurePrimary");
await page.waitForTimeout(30);
state = await debug(page);
if (state.screen !== "playing" || !state.puzzle.started || state.puzzle.autonomousStarted
  || state.puzzle.remainingSeconds > pacingFixture.introTime
  || state.puzzle.remainingSeconds < pacingFixture.introTime - 0.12) {
  throw new Error("Pacing E2E: confirming the explanation did not start only the level countdown");
}
const dismissedRemaining = state.puzzle.remainingSeconds;
await page.waitForTimeout(300);
state = await debug(page);
const elapsedAfterDismiss = dismissedRemaining - state.puzzle.remainingSeconds;
if (!state.puzzle.started || state.puzzle.autonomousStarted
  || elapsedAfterDismiss < 0.12 || elapsedAfterDismiss > 0.7) {
  throw new Error(`Pacing E2E: timer did not advance after explanation dismissal (${elapsedAfterDismiss})`);
}
await page.screenshot({ path: shot("round54-feature-first-play.png") });

const firstBlock = state.puzzle.blocks.find((block) => block.id === pacingFixture.firstDrag.blockId);
if (!firstBlock) throw new Error("Pacing E2E: first routed block is missing");
const [anchorX, anchorY] = firstBlock.shape[0];
const start = screenPoint(page, {
  x: state.board.innerX + (firstBlock.x + anchorX + 0.5) * state.board.cell,
  y: state.board.innerY + (firstBlock.y + anchorY + 0.5) * state.board.cell,
});
await page.mouse.move(start.x, start.y);
await page.mouse.down();
for (const [x, y] of pacingFixture.firstDrag.path) {
  const point = screenPoint(page, {
    x: state.board.innerX + (x + anchorX + 0.5) * state.board.cell,
    y: state.board.innerY + (y + anchorY + 0.5) * state.board.cell,
  });
  await page.mouse.move(point.x, point.y, { steps: 3 });
}
if (pacingFixture.firstDrag.exitSide) {
  const held = await debug(page);
  const remaining = held.puzzle.blocks.find((block) => block.id === pacingFixture.firstDrag.blockId);
  const expectedLayers = Math.max(0, firstBlock.layers.length - 1);
  if (held.selectedId || held.activePointer !== undefined
    || (expectedLayers === 0 && remaining)
    || (expectedLayers > 0 && (!remaining || remaining.layers.length !== expectedLayers))) {
    throw new Error("Pacing E2E: routed block did not resolve while the pointer stayed down");
  }
}
await page.mouse.up();
await page.waitForTimeout(100);
state = await debug(page);
if (!state.puzzle.started
  || !state.puzzle.autonomousStarted
  || state.puzzle.remainingSeconds > pacingFixture.introTime
  || state.puzzle.remainingSeconds < pacingFixture.introTime - 2) {
  throw new Error(`Pacing E2E: first real drag did not start from the formal budget (${state.puzzle.remainingSeconds})`);
}
if (state.puzzle.moves !== 1) throw new Error("Pacing E2E: first teaching drag did not commit exactly once");
await page.screenshot({ path: shot("round54-feature-first-action.png") });

await page.evaluate((levelId) => window.__COLOR_ESCAPE__.loadLevel(levelId, true), pacingFixture.applicationId);
await page.waitForTimeout(100);
state = await debug(page);
if (state.level.name !== pacingFixture.applicationName || state.level.difficulty !== pacingFixture.applicationDifficulty
  || state.level.timeSeconds !== pacingFixture.applicationTime
  || state.level.difficulty !== pacingFixture.expectedApplicationDifficulty
  || state.level.timeSeconds !== pacingFixture.expectedApplicationTime) {
  throw new Error("Pacing E2E: the later mechanism application no longer provides the intended difficulty step");
}
await page.screenshot({ path: shot("round54-feature-application.png") });
await page.close();

const small = await browser.newPage({ viewport: { width: 320, height: 568 } });
attachErrors(small);
await seed(small, pacingFixture.introId);
await clickInteractionTarget(small, "homePlay");
await small.waitForTimeout(100);
state = await debug(small);
if (state.screen !== "feature" || state.puzzle.remainingSeconds !== pacingFixture.introTime) {
  throw new Error("Pacing E2E: 320x568 shutter introduction diverged from the standard viewport");
}
await small.screenshot({ path: shot("round54-feature-intro-320x568.png") });
await clickInteractionTarget(small, "featurePrimary");
await small.waitForTimeout(30);
state = await debug(small);
if (state.screen !== "playing" || !state.puzzle.started || state.puzzle.autonomousStarted) {
  throw new Error("Pacing E2E: 320x568 confirmation target or timer contract failed");
}
await small.close();

await browser.close();
if (errors.length) throw new Error(`Pacing browser errors:\n${errors.join("\n")}`);
console.log("Formal feature-introduction pacing, post-dismiss timer, first-action mechanism activation, next application, and 320x568 path passed.");
