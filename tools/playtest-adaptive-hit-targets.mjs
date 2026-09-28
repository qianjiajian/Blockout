import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";

const output = fileURLToPath(new URL("../playtest-results/adaptive-hit-targets/", import.meta.url));
const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
await mkdir(output, { recursive: true });

const save = {
  schemaVersion: 1,
  currentLevel: 58,
  highestLevel: 58,
  coins: 1640,
  sound: false,
  haptic: false,
  reducedMotion: false,
  featureSeen: ["basics", "ice-door", "ice-block", "layer", "shutter", "generator", "elevator", "conveyor", "star-gate"],
  boosterUnlockSeen: ["time", "rocket", "pulse"],
  boosters: { time: 3, rocket: 3, pulse: 3 },
  bestStars: {},
  bestMoves: Object.fromEntries(Array.from({ length: 20 }, (_, index) => [String(index + 1), 12 + index])),
  rewardedLevels: Array.from({ length: 57 }, (_, index) => index + 1),
  dailyStreak: 0,
  lastDailyCompletedDay: "",
  lastSeenUpdate: "2026-09-05-r95",
};

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 320, height: 568 }, deviceScaleFactor: 1 });
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(error.message));
await page.addInitScript((initialSave) => {
  localStorage.setItem("color-escape-save-v1", JSON.stringify(initialSave));
}, save);
await page.goto(playtestUrl, { waitUntil: "networkidle" });
await page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().art.ready);

const debug = () => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const canvasBounds = await page.locator("canvas").boundingBox();
if (!canvasBounds) throw new Error("Adaptive-target E2E: canvas bounds unavailable");

const logicalToPage = async ({ x, y }) => {
  const state = await debug();
  return {
    x: canvasBounds.x + state.viewportTransform.offsetX + x * state.viewportTransform.scale,
    y: canvasBounds.y + state.viewportTransform.offsetY + y * state.viewportTransform.scale,
  };
};
const targetEntry = async (name) => {
  const state = await debug();
  const entry = state.interactionTargets.targets[name];
  if (!entry) throw new Error(`Adaptive-target E2E: missing target ${name}`);
  return entry;
};
const clickLogical = async (point, waitMs = 80) => {
  const pagePoint = await logicalToPage(point);
  await page.mouse.click(pagePoint.x, pagePoint.y);
  await page.waitForTimeout(waitMs);
};
const clickCenter = async (name, waitMs = 80) => {
  const { hit } = await targetEntry(name);
  await clickLogical({ x: hit.x + hit.width / 2, y: hit.y + hit.height / 2 }, waitMs);
};
const edgePoint = (entry, edge) => {
  const { visual, hit } = entry;
  if (edge === "left" && hit.x < visual.x) {
    return { x: (hit.x + visual.x) / 2, y: visual.y + visual.height / 2 };
  }
  if (edge === "top" && hit.y < visual.y) {
    return { x: visual.x + visual.width / 2, y: (hit.y + visual.y) / 2 };
  }
  if (edge === "bottom" && hit.y + hit.height > visual.y + visual.height) {
    return {
      x: visual.x + visual.width / 2,
      y: (visual.y + visual.height + hit.y + hit.height) / 2,
    };
  }
  throw new Error(`Adaptive-target E2E: ${edge} edge for ${JSON.stringify(entry)} was not expanded`);
};
const clickExpandedEdge = async (name, edge, waitMs = 80) => {
  const entry = await targetEntry(name);
  const point = edgePoint(entry, edge);
  await clickLogical(point, waitMs);
  return { name, edge, point, visual: entry.visual, hit: entry.hit };
};
const intersectionArea = (a, b) => Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x))
  * Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));

let state = await debug();
const auditEntries = Object.entries(state.interactionTargets.targets);
const undersized = auditEntries.filter(([, entry]) => entry.cssWidth < 43.999 || entry.cssHeight < 43.999);
if (state.screen !== "home" || state.interactionTargets.minimumCssSize !== 44 || undersized.length > 0) {
  throw new Error(`Adaptive-target E2E: physical target audit failed (${JSON.stringify({
    screen: state.screen,
    minimum: state.interactionTargets.minimumCssSize,
    undersized: undersized.map(([name, entry]) => ({ name, cssWidth: entry.cssWidth, cssHeight: entry.cssHeight })),
  })})`);
}
const targets = state.interactionTargets.targets;
if (intersectionArea(targets.modalPrimary.hit, targets.modalSecondary.hit) > 0
  || intersectionArea(targets.pauseResume.hit, targets.pauseRestart.hit) > 0
  || intersectionArea(targets.pauseResume.hit, targets.pauseHome.hit) > 0
  || intersectionArea(targets.homeSupply.hit, targets.updateToast.hit) > 0
  || intersectionArea(targets.homeSettings.hit, targets.updateToast.hit) > 0) {
  throw new Error("Adaptive-target E2E: an expanded target overlaps an adjacent action");
}

const actions = [];
actions.push(await clickExpandedEdge("homeSettings", "left"));
state = await debug();
if (state.screen !== "settings") throw new Error("Adaptive-target E2E: expanded gear edge missed");

actions.push(await clickExpandedEdge("menuBack", "left"));
state = await debug();
if (state.screen !== "home") throw new Error("Adaptive-target E2E: expanded back edge missed");

await clickCenter("navigation.1", 280);
state = await debug();
if (state.screen !== "leaderboard") throw new Error("Adaptive-target E2E: leaderboard did not open");
if (state.leaderboard.mode !== "world" || state.leaderboard.source !== "placeholder-v1"
  || state.leaderboard.totalEntries !== 99 || state.leaderboard.totalPlayers !== 100
  || state.leaderboard.player?.rank !== 66 || state.leaderboard.player?.isPlayer !== true
  || state.leaderboard.entries.some((entry) => entry.isPlayer || !Number.isInteger(entry.totalStars))) {
  throw new Error(`Adaptive-target E2E: default World placeholder contract drifted (${JSON.stringify(state.leaderboard)})`);
}
actions.push(await clickExpandedEdge("leaderboardWeekly", "top"));
state = await debug();
if (state.leaderboard.mode !== "weekly") throw new Error("Adaptive-target E2E: expanded Weekly tab edge missed");
actions.push(await clickExpandedEdge("leaderboardCountry", "top"));
state = await debug();
if (state.leaderboard.mode !== "country") throw new Error("Adaptive-target E2E: expanded Country tab edge missed");

await clickCenter("navigation.3", 280);
state = await debug();
if (state.screen !== "levels" || JSON.stringify(state.journey.displayedLevels) !== JSON.stringify([60, 50])) {
  throw new Error("Adaptive-target E2E: Journey did not expose its current continuous-map reward window");
}
await clickCenter("journeyNode.0");
state = await debug();
if (state.screen !== "levels" || state.level.id !== 58) throw new Error("Adaptive-target E2E: locked Journey card changed the selected level");

await clickCenter("navigation.2", 280);
await clickCenter("homePlay", 120);
state = await debug();
if (state.screen !== "playing") throw new Error("Adaptive-target E2E: play did not start");
actions.push(await clickExpandedEdge("pause", "left"));
state = await debug();
if (state.screen !== "paused") throw new Error("Adaptive-target E2E: expanded pause edge missed");
await page.screenshot({ path: resolve(output, "01-paused-320x568.png") });

actions.push(await clickExpandedEdge("pause.sound", "top"));
state = await debug();
if (!state.settings.sound || state.screen !== "paused") throw new Error("Adaptive-target E2E: expanded pause sound edge missed");
actions.push(await clickExpandedEdge("pauseResume", "top"));
state = await debug();
if (state.screen !== "playing") throw new Error("Adaptive-target E2E: expanded resume edge missed");

actions.push(await clickExpandedEdge("undo", "left"));
state = await debug();
if (state.hudFeedback?.text !== "暂无可撤销操作") throw new Error("Adaptive-target E2E: expanded undo edge missed or hit the board");
actions.push(await clickExpandedEdge("pause", "left"));
actions.push(await clickExpandedEdge("pauseRestart", "bottom", 120));
state = await debug();
if (state.screen !== "playing" || state.puzzle.moves !== 0 || state.puzzle.started) {
  throw new Error("Adaptive-target E2E: expanded restart edge missed or fired a neighboring action");
}
await page.screenshot({ path: resolve(output, "02-restarted-320x568.png") });

// A notched phone supplies a non-zero safeTop. The formal gameplay HUD already
// contains its authored top clearance, so undo/pause visuals and hits must stay
// on the same fixed artboard coordinates. Regressions used to move only the hit
// rectangles down by safeTop, leaving an invisible tappable area below each icon.
const safePage = await browser.newPage({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
});
safePage.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
safePage.on("pageerror", (error) => errors.push(error.message));
await safePage.addInitScript((initialSave) => {
  localStorage.setItem("color-escape-save-v1", JSON.stringify(initialSave));
}, save);
const safeUrl = new URL(playtestUrl);
safeUrl.searchParams.set("safeTop", "47");
safeUrl.searchParams.set("safeBottom", "34");
await safePage.goto(safeUrl.href, { waitUntil: "networkidle" });
await safePage.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().art.ready);
await safePage.evaluate(() => window.__COLOR_ESCAPE__.loadLevel(2, true));
await safePage.waitForTimeout(120);

const safeDebug = () => safePage.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const safeCanvas = await safePage.locator("canvas").boundingBox();
if (!safeCanvas) throw new Error("Adaptive-target E2E: safe-area canvas bounds unavailable");
let safeState = await safeDebug();
const gameplayArtScale = 496 / 720;
const gameplayArtOffsetY = (1078 - 1584 * gameplayArtScale) / 2;
const gameplayRect = ({ x, y, width, height }) => ({
  x: x * gameplayArtScale,
  y: gameplayArtOffsetY + y * gameplayArtScale,
  width: width * gameplayArtScale,
  height: height * gameplayArtScale,
});
const expectedHudVisuals = {
  undo: gameplayRect({ x: 61, y: 153, width: 88, height: 88 }),
  pause: gameplayRect({ x: 582, y: 153, width: 88, height: 88 }),
};
const safeToPage = ({ x, y }) => ({
  x: safeCanvas.x + safeState.viewportTransform.offsetX + x * safeState.viewportTransform.scale,
  y: safeCanvas.y + safeState.viewportTransform.offsetY + y * safeState.viewportTransform.scale,
});
const rectCenter = (rect) => ({ x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 });
const safeCenters = {};
for (const [name, expectedVisual] of Object.entries(expectedHudVisuals)) {
  const entry = safeState.interactionTargets.targets[name];
  if (!entry) throw new Error(`Adaptive-target E2E: missing safe-area ${name} target`);
  const expectedCenter = rectCenter(expectedVisual);
  const visualCenter = rectCenter(entry.visual);
  const hitCenter = rectCenter(entry.hit);
  if (Math.hypot(visualCenter.x - expectedCenter.x, visualCenter.y - expectedCenter.y) > 0.001
    || Math.hypot(hitCenter.x - expectedCenter.x, hitCenter.y - expectedCenter.y) > 0.001) {
    throw new Error(`Adaptive-target E2E: ${name} image and hit center diverged under safeTop (${JSON.stringify({
      expectedVisual,
      visual: entry.visual,
      hit: entry.hit,
    })})`);
  }
  safeCenters[name] = safeToPage(expectedCenter);
}

await safePage.touchscreen.tap(safeCenters.pause.x, safeCenters.pause.y);
await safePage.waitForTimeout(80);
safeState = await safeDebug();
if (safeState.screen !== "paused") {
  throw new Error("Adaptive-target E2E: visible pause image center missed under safeTop");
}

await safePage.evaluate(() => window.__COLOR_ESCAPE__.loadLevel(2, true));
await safePage.waitForTimeout(80);
const formerSafeTopShiftCss = 54 * safeState.viewportTransform.scale;
await safePage.touchscreen.tap(safeCenters.pause.x, safeCenters.pause.y + formerSafeTopShiftCss);
await safePage.waitForTimeout(80);
safeState = await safeDebug();
if (safeState.screen !== "playing") {
  throw new Error("Adaptive-target E2E: former pause ghost target below the image is still active");
}

await safePage.touchscreen.tap(safeCenters.undo.x, safeCenters.undo.y);
await safePage.waitForTimeout(80);
safeState = await safeDebug();
if (safeState.hudFeedback?.text !== "暂无可撤销操作") {
  throw new Error("Adaptive-target E2E: visible undo image center missed under safeTop");
}

await safePage.evaluate(() => window.__COLOR_ESCAPE__.loadLevel(2, true));
await safePage.waitForTimeout(80);
await safePage.touchscreen.tap(safeCenters.undo.x, safeCenters.undo.y + formerSafeTopShiftCss);
await safePage.waitForTimeout(80);
safeState = await safeDebug();
if (safeState.hudFeedback) {
  throw new Error("Adaptive-target E2E: former undo ghost target below the image is still active");
}
await safePage.screenshot({ path: resolve(output, "03-safearea-hud-hit-alignment-390x844.png") });

// The formal border's outer-corner bitmap is 59px tall on the authored 95px
// grid. Use that real visual extent instead of BoardLayout's legacy 18px
// convenience padding, which is too small to detect board/booster overlap.
const formalBoardOutsetCells = 69 / 95;
const minimumBoardBoosterGapLogical = 14;
const gameplayBoosterTargets = ["booster.time", "booster.rocket", "booster.pulse"];
const safeAreaGameplayLevels = [];
const boardBoosterViolations = [];
for (let levelId = 1; levelId <= 100; levelId += 1) {
  await safePage.evaluate((id) => window.__COLOR_ESCAPE__.loadLevel(id, true), levelId);
  if (levelId === 10) {
    await safePage.waitForFunction((id) => {
      const current = window.__COLOR_ESCAPE__?.getDebugState();
      return current?.screen === "playing"
        && current.level.id === id
        && !current.art.formalGameplay.requestedBlockSignature;
    }, levelId, { timeout: 8_000 });
    await safePage.waitForTimeout(120);
  }
  const levelState = await safeDebug();
  const boardVisualBottom = levelState.board.innerY
    + levelState.board.innerHeight
    + levelState.board.cell * formalBoardOutsetCells;
  const boosters = gameplayBoosterTargets.map((name) => {
    const entry = levelState.interactionTargets.targets[name];
    if (!entry) {
      return { name, missing: true, visualGapLogical: Number.NEGATIVE_INFINITY, hitGapLogical: Number.NEGATIVE_INFINITY };
    }
    return {
      name,
      visualTop: entry.visual.y,
      hitTop: entry.hit.y,
      visualGapLogical: entry.visual.y - boardVisualBottom,
      hitGapLogical: entry.hit.y - boardVisualBottom,
    };
  });
  const row = {
    levelId,
    board: {
      width: levelState.level.width,
      height: levelState.level.height,
      cell: levelState.board.cell,
      visualBottom: boardVisualBottom,
    },
    boosters,
    minimumVisualGapLogical: Math.min(...boosters.map(({ visualGapLogical }) => visualGapLogical)),
    minimumHitGapLogical: Math.min(...boosters.map(({ hitGapLogical }) => hitGapLogical)),
  };
  safeAreaGameplayLevels.push(row);
  const failed = boosters.filter(({ visualGapLogical, hitGapLogical }) => (
    visualGapLogical < minimumBoardBoosterGapLogical - 0.001
    || hitGapLogical < minimumBoardBoosterGapLogical - 0.001
  ));
  if (failed.length) boardBoosterViolations.push({ levelId, boardVisualBottom, boosters: failed });
  if (levelId === 10) {
    await safePage.screenshot({ path: resolve(output, "04-level-010-board-booster-gap-safearea-390x844.png") });
  }
}
await safePage.close();

const minimumWidth = Math.min(...auditEntries.map(([, entry]) => entry.cssWidth));
const minimumHeight = Math.min(...auditEntries.map(([, entry]) => entry.cssHeight));
const report = {
  viewport: { width: 320, height: 568 },
  scale: state.viewportTransform.scale,
  minimumRequiredCssSize: state.interactionTargets.minimumCssSize,
  auditedTargets: auditEntries.length,
  minimumMeasuredCssWidth: minimumWidth,
  minimumMeasuredCssHeight: minimumHeight,
  adjacentOverlapArea: 0,
  expandedEdgeActions: actions,
  safeAreaHudAlignment: {
    viewport: { width: 390, height: 844, deviceScaleFactor: 3 },
    safeTopCss: 47,
    formerGhostShiftCss: formerSafeTopShiftCss,
    visibleCenters: safeCenters,
    imageCentersActivate: true,
    formerGhostTargetsInactive: true,
  },
  safeAreaGameplaySeparation: {
    viewport: { width: 390, height: 844, deviceScaleFactor: 3 },
    safeTopCss: 47,
    safeBottomCss: 34,
    formalBoardOutsetCells,
    minimumRequiredGapLogical: minimumBoardBoosterGapLogical,
    levelsAudited: safeAreaGameplayLevels.length,
    minimumVisualGapLogical: Math.min(...safeAreaGameplayLevels.map(({ minimumVisualGapLogical }) => minimumVisualGapLogical)),
    minimumHitGapLogical: Math.min(...safeAreaGameplayLevels.map(({ minimumHitGapLogical }) => minimumHitGapLogical)),
    level10: safeAreaGameplayLevels.find(({ levelId }) => levelId === 10),
    violations: boardBoosterViolations,
    levels: safeAreaGameplayLevels,
  },
  browserErrors: errors,
};
await writeFile(resolve(output, "adaptive-hit-target-report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");

await browser.close();
if (errors.length) throw new Error(`Adaptive-target browser errors:\n${errors.join("\n")}`);
if (boardBoosterViolations.length) {
  throw new Error(`Adaptive-target E2E: ${boardBoosterViolations.length}/100 levels violate the ${minimumBoardBoosterGapLogical} logical board/booster gap (${JSON.stringify(boardBoosterViolations.slice(0, 12))})`);
}
console.log(`Adaptive hit targets passed: ${auditEntries.length} controls, ${minimumWidth.toFixed(1)}x${minimumHeight.toFixed(1)} CSS px minimum, ${actions.length} expanded-edge actions, safe-area HUD centers aligned, and 100/100 board/booster gaps passed.`);
