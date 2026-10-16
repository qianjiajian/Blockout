import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";

const output = fileURLToPath(new URL("../playtest-results/formal-win/", import.meta.url));
const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
const testLevelId = 5;
const saveKey = "color-escape-save-v1";
const initialCoins = 0;
const journeyMilestoneLevels = [10, 15, 25, 30, 35, 45, 50, 60, 65, 75, 80, 90, 95];
const journeyEpisodeUnlockLevels = [11, 21, 31, 41, 51, 61, 71, 81, 91];
const winPrefix = "/assets/art/ui/formal-pages/overlays/win/";
const overlayAlpha = 199 / 255;
const glowRotationPeriodSeconds = 12;
const expectedImages = {
  "panel.png": { x: 25, y: 287, width: 671, height: 867 },
  "close.png": { x: 616, y: 336, width: 94, height: 98 },
  "glow.png": { x: 108, y: 398, width: 483, height: 483 },
  "coin-pile.png": { x: 178.8, y: 768.2, width: 174.4, height: 145.6 },
  "reward-pill.png": { x: 444, y: 806, width: 178, height: 69 },
  "continue-button.png": { x: 199, y: 964, width: 322, height: 125 },
};

await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 720, height: 1584 }, deviceScaleFactor: 1 });
const browserErrors = [];
page.on("pageerror", (error) => browserErrors.push(error.message));
page.on("console", (message) => {
  if (message.type() === "error") browserErrors.push(message.text());
});

await page.addInitScript(() => {
  const matrix = (context) => {
    const value = context.getTransform();
    return { a: value.a, b: value.b, c: value.c, d: value.d, e: value.e, f: value.f };
  };
  const normalize = (source) => {
    try { return new URL(String(source || ""), location.href).pathname; }
    catch { return String(source || ""); }
  };
  const audit = { images: [], text: [], fills: [] };
  globalThis.__FORMAL_WIN_AUDIT__ = audit;
  globalThis.__clearFormalWinAudit = () => {
    audit.images.length = 0;
    audit.text.length = 0;
    audit.fills.length = 0;
  };

  const originalDrawImage = CanvasRenderingContext2D.prototype.drawImage;
  CanvasRenderingContext2D.prototype.drawImage = function auditedDrawImage(image, ...args) {
    const path = normalize(image?.currentSrc || image?.src);
    if (path.includes("/assets/art/ui/formal-pages/overlays/win/")) {
      audit.images.push({
        path,
        args: args.map(Number),
        naturalWidth: Number(image?.naturalWidth || image?.width || 0),
        naturalHeight: Number(image?.naturalHeight || image?.height || 0),
        matrix: matrix(this),
      });
    }
    return originalDrawImage.call(this, image, ...args);
  };

  for (const method of ["strokeText", "fillText"]) {
    const original = CanvasRenderingContext2D.prototype[method];
    CanvasRenderingContext2D.prototype[method] = function auditedText(text, x, y, ...args) {
      audit.text.push({
        method,
        text: String(text),
        x: Number(x),
        y: Number(y),
        font: this.font,
        textAlign: this.textAlign,
        textBaseline: this.textBaseline,
        lineJoin: this.lineJoin,
        lineWidth: this.lineWidth,
        fillStyle: String(this.fillStyle).toLowerCase(),
        strokeStyle: String(this.strokeStyle).toLowerCase(),
        matrix: matrix(this),
      });
      return original.call(this, text, x, y, ...args);
    };
  }

  const originalFillRect = CanvasRenderingContext2D.prototype.fillRect;
  CanvasRenderingContext2D.prototype.fillRect = function auditedFillRect(x, y, width, height) {
    audit.fills.push({
      x: Number(x), y: Number(y), width: Number(width), height: Number(height),
      fillStyle: String(this.fillStyle).toLowerCase(),
      globalAlpha: this.globalAlpha,
      matrix: matrix(this),
    });
    return originalFillRect.call(this, x, y, width, height);
  };

  if (!localStorage.getItem("color-escape-save-v1")) localStorage.setItem("color-escape-save-v1", JSON.stringify({
    schemaVersion: 1,
    currentLevel: 5,
    highestLevel: 100,
    coins: 1000,
    sound: false,
    haptic: false,
    reducedMotion: true,
    language: "en",
    featureSeen: ["basics", "ice-door", "ice-block", "layer", "shutter", "generator", "elevator", "conveyor", "star"],
    boosterUnlockSeen: ["time", "rocket", "pulse"],
    boosters: { time: 3, rocket: 3, pulse: 3 },
    bestStars: {},
    bestMoves: {},
    rewardedLevels: [1, 2, 3, 4],
    lastSeenUpdate: "2026-09-10-r118",
  }));
});

const debug = () => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const logicalPoint = async (x, y) => {
  const state = await debug();
  const bounds = await page.locator("canvas").boundingBox();
  if (!bounds) throw new Error("Formal win E2E: canvas bounds are unavailable");
  return {
    x: bounds.x + state.viewportTransform.offsetX + x * state.viewportTransform.scale,
    y: bounds.y + state.viewportTransform.offsetY + y * state.viewportTransform.scale,
  };
};
const clickTarget = async (name) => {
  const state = await debug();
  const hit = state.interactionTargets?.targets?.[name]?.hit;
  if (!hit) throw new Error(`Formal win E2E: ${name} hit target is unavailable`);
  const point = await logicalPoint(hit.x + hit.width / 2, hit.y + hit.height / 2);
  await page.mouse.click(point.x, point.y);
};
const storedSave = () => page.evaluate((key) => JSON.parse(localStorage.getItem(key)), saveKey);
const validationRoute = async (levelId) => {
  const route = await page.evaluate(async (id) => {
    const [{ getLevel }, { solveLevelForValidation }] = await Promise.all([
      import("/src/core/levels.ts"),
      import("/src/core/levelSolver.ts"),
    ]);
    return solveLevelForValidation(getLevel(id));
  }, levelId);
  if (!route.solved || !route.drags.length) {
    throw new Error(`Formal win E2E: Lv${levelId} has no validation route`);
  }
  return route;
};
const completeRoute = async (route, captureScreens = false) => {
  const screens = [];
  let finalExitReleasedAt = 0;
  let formalResultReadyAt = 0;
  for (const [dragIndex, drag] of route.drags.entries()) {
    const state = await debug();
    const block = state.puzzle.blocks.find((candidate) => candidate.id === drag.blockId);
    if (!block) throw new Error(`Formal win E2E: route block ${drag.blockId} is unavailable`);
    const [anchorX, anchorY] = block.shape[0];
    const start = await logicalPoint(
      state.board.innerX + (block.x + anchorX + 0.5) * state.board.cell,
      state.board.innerY + (block.y + anchorY + 0.5) * state.board.cell,
    );
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    for (const [x, y] of drag.path) {
      const target = await logicalPoint(
        state.board.innerX + (x + anchorX + 0.5) * state.board.cell,
        state.board.innerY + (y + anchorY + 0.5) * state.board.cell,
      );
      await page.mouse.move(target.x, target.y, { steps: 2 });
    }
    await page.mouse.up();
    if (dragIndex === route.drags.length - 1) {
      finalExitReleasedAt = Date.now();
      const deadline = Date.now() + 10_000;
      while (Date.now() < deadline) {
        const latest = await debug();
        if (captureScreens) screens.push(latest.screen);
        if (latest.screen === "win" && latest.art.win.ready) {
          formalResultReadyAt = Date.now();
          break;
        }
        await page.waitForTimeout(16);
      }
    } else {
      await page.waitForTimeout(drag.exitSide ? 120 : 30);
    }
  }
  if (!(await debug()).art.win.ready || (await debug()).screen !== "win") {
    const failedState = await debug();
    throw new Error(`Formal win E2E: route did not reach a ready win screen: ${JSON.stringify({
      screen: failedState.screen,
      level: failedState.level.id,
      puzzle: failedState.puzzle,
      winArt: failedState.art.win,
    })}`);
  }
  return { screens, finalExitReleasedAt, formalResultReadyAt };
};
const redrawAndAudit = async () => {
  await page.evaluate(() => new Promise((resolveFrame) => {
    globalThis.__clearFormalWinAudit();
    window.dispatchEvent(new Event("resize"));
    requestAnimationFrame(() => requestAnimationFrame(resolveFrame));
  }));
  return Promise.all([
    debug(),
    page.evaluate(() => structuredClone(globalThis.__FORMAL_WIN_AUDIT__)),
  ]);
};
const assertFormalText = (targetAudit, text, expected) => {
  const strokes = targetAudit.text.filter((record) => record.method === "strokeText" && record.text === text);
  const fills = targetAudit.text.filter((record) => record.method === "fillText" && record.text === text);
  if (!strokes.length || !fills.length) throw new Error(`Formal win E2E: ${text} fill/stroke pair is missing`);
  const renderSize = expected.renderSize ?? 44;
  const lineWidth = expected.lineWidth ?? 6;
  for (const record of [...strokes, ...fills]) {
    if (record.x !== expected.x || record.y !== expected.y || !record.font.includes(`${renderSize}px Arial`)
      || record.textAlign !== "center" || record.textBaseline !== "middle" || record.lineJoin !== "round") {
      throw new Error(`Formal win E2E: ${text} typography geometry differs from the reference: ${JSON.stringify(record)}`);
    }
  }
  if (strokes.some((record) => record.strokeStyle !== expected.stroke || record.lineWidth !== lineWidth)
    || fills.some((record) => record.fillStyle !== "#ffffff")) {
    throw new Error(`Formal win E2E: ${text} color or 3px outward stroke differs from the reference`);
  }
};
const matrixPoint = (matrix, x, y) => ({
  x: matrix.a * x + matrix.c * y + matrix.e,
  y: matrix.b * x + matrix.d * y + matrix.f,
});
const matricesMatch = (left, right, tolerance = 1e-7) => (
  ["a", "b", "c", "d", "e", "f"].every((key) => Math.abs(left[key] - right[key]) <= tolerance)
);

await page.goto(playtestUrl, { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().art.ready, undefined, { timeout: 15_000 });
const route = await validationRoute(testLevelId);

await page.evaluate((levelId) => window.__COLOR_ESCAPE__.loadLevel(levelId, true), testLevelId);
await page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().screen === "playing");
const firstClearTiming = await completeRoute(route, true);
const screensAfterFinalExit = firstClearTiming.screens;

if (!screensAfterFinalExit.includes("win") || screensAfterFinalExit.includes("celebrating")) {
  throw new Error(`Formal win E2E: regular clear did not open the result directly: ${JSON.stringify(screensAfterFinalExit)}`);
}
const formalResultLatencyMs = firstClearTiming.formalResultReadyAt - firstClearTiming.finalExitReleasedAt;
if (!(formalResultLatencyMs >= 0 && formalResultLatencyMs < 1_000)) {
  throw new Error(`Formal win E2E: direct formal result took ${formalResultLatencyMs}ms after the final release`);
}

try {
  await page.waitForFunction(() => {
    const state = window.__COLOR_ESCAPE__?.getDebugState();
    return state?.screen === "win" && state.art.win.ready;
  }, undefined, { timeout: 10_000 });
} catch (error) {
  const failedState = await debug();
  throw new Error(`Formal win E2E: Lv${testLevelId} did not reach the win screen: ${JSON.stringify({
    screen: failedState.screen,
    puzzle: failedState.puzzle,
    selectedId: failedState.selectedId,
    winArt: failedState.art.win,
  })}`, { cause: error });
}
const legacyCelebrationCopyDrawn = await page.evaluate(() => (
  globalThis.__FORMAL_WIN_AUDIT__.text.some(({ text }) => text === "方块出逃!" || text === "CLEAR!")
));
if (legacyCelebrationCopyDrawn) {
  throw new Error("Formal win E2E: retired celebration copy was drawn before the formal result");
}
const [state, audit] = await redrawAndAudit();
const firstClearDisk = await storedSave();
if (state.settlement.coinReward !== 40
  || state.economy.coins !== initialCoins + 40
  || firstClearDisk.coins !== state.economy.coins
  || state.economy.rewardedLevels.filter((id) => id === testLevelId).length !== 1
  || firstClearDisk.rewardedLevels.filter((id) => id === testLevelId).length !== 1) {
  throw new Error(`Formal win E2E: first clear did not present and persist exactly 40 coins: ${JSON.stringify({
    levelReward: state.level.reward,
    presentedReward: state.settlement.coinReward,
    runtimeCoins: state.economy.coins,
    diskCoins: firstClearDisk.coins,
    rewardedLevels: firstClearDisk.rewardedLevels,
  })}`);
}

if (state.art.win.loadedImages !== 7) {
  throw new Error(`Formal win E2E: expected 7 loaded images, received ${state.art.win.loadedImages}`);
}
for (const [filename, expected] of Object.entries(expectedImages)) {
  const records = audit.images.filter(({ path }) => path === `${winPrefix}${filename}`);
  if (!records.length) throw new Error(`Formal win E2E: ${filename} was not drawn`);
  for (const record of records) {
    const expectedArgs = filename === "coin-pile.png"
      ? [expected.x, expected.y, expected.width, expected.height]
      : [expected.x, expected.y];
    if (JSON.stringify(record.args) !== JSON.stringify(expectedArgs)
      || record.naturalWidth !== (filename === "coin-pile.png" ? 243 : expected.width)
      || record.naturalHeight !== (filename === "coin-pile.png" ? 203 : expected.height)) {
      throw new Error(`Formal win E2E: ${filename} was not drawn at its calibrated settlement placement: ${JSON.stringify(record)}`);
    }
    const scaleX = Math.hypot(record.matrix.a, record.matrix.b);
    const scaleY = Math.hypot(record.matrix.c, record.matrix.d);
    if (Math.abs(scaleX - scaleY) > 1e-6 || record.matrix.a * record.matrix.d - record.matrix.b * record.matrix.c <= 0) {
      throw new Error(`Formal win E2E: ${filename} used a distorted or mirrored transform`);
    }
  }
}

const overlay = audit.fills.find((fill) => fill.x === 0 && fill.y === 0 && fill.width === 496 && fill.height === 1078
  && fill.fillStyle === "#000000" && Math.abs(fill.globalAlpha - overlayAlpha) < 1e-8);
if (!overlay) throw new Error("Formal win E2E: exact black 199/255 overlay was not drawn");

const conditions = state.settlement.starConditions;
if (!conditions || conditions.moveTarget !== state.starTargets.moveTarget
  || conditions.timeTargetSeconds !== state.starTargets.timeTargetSeconds
  || conditions.earnedStars < 1 || conditions.earnedStars > 3
  || conditions.moves !== state.puzzle.moves) {
  throw new Error(`Formal win E2E: concrete star conditions were not committed with the settlement: ${JSON.stringify({
    starTargets: state.starTargets,
    starConditions: conditions,
    moves: state.puzzle.moves,
  })}`);
}
for (const expectedText of [
  "Level Complete",
  `Level ${state.level.id}`,
  "Level cleared",
  `${conditions.moveTarget} moves or fewer`,
  `Complete within ${conditions.timeTargetSeconds} seconds`,
]) {
  if (!audit.text.some(({ text }) => text === expectedText)) {
    throw new Error(`Formal win E2E: dynamic result copy was not drawn: ${expectedText}`);
  }
}
const rewardTextPosition = { x: 533, y: 842.5, stroke: "#415ca4" };
const continueTextPosition = { x: 360, y: 1034.5, stroke: "#10520b" };
assertFormalText(audit, "+20", { ...rewardTextPosition, renderSize: 34, lineWidth: 5 });
assertFormalText(audit, "Continue", { ...continueTextPosition, renderSize: 42, lineWidth: 6 });

const forbidden = ["方块出逃!", "CLEAR!", "漂亮通关!", "挑战成功!"];
for (const record of audit.text) {
  if (forbidden.includes(record.text) || record.text.startsWith("完成 ") || record.text.startsWith("道具助力")
    || record.text.includes("首次奖励") || record.text.includes("最佳纪录")) {
    throw new Error(`Formal win E2E: unauthorized result copy was drawn: ${record.text}`);
  }
}

const standardScreenshot = resolve(output, "level-005-first-clear-720x1584.png");
await page.screenshot({ path: standardScreenshot });

// Reduced-motion mode keeps the supplied glow at its authored angle and lets
// the result screen go idle once the short clear particles have finished.
await page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().particles === 0);
await page.waitForTimeout(80);
await page.evaluate(() => globalThis.__clearFormalWinAudit());
await page.waitForTimeout(350);
const reducedMotionIdleAudit = await page.evaluate(() => structuredClone(globalThis.__FORMAL_WIN_AUDIT__));
if (reducedMotionIdleAudit.images.some(({ path }) => path.startsWith(winPrefix))) {
  throw new Error("Formal win E2E: reduced-motion result continued scheduling glow frames after settling");
}

const primary = state.interactionTargets.targets.modalPrimary?.hit;
if (!primary) throw new Error("Formal win E2E: Continue hit target is unavailable");
const pressPoint = await logicalPoint(primary.x + primary.width / 2, primary.y + primary.height / 2);
await page.mouse.move(pressPoint.x, pressPoint.y);
await page.mouse.down();
await page.waitForTimeout(90);
await page.screenshot({ path: resolve(output, "continue-pressed-720x1584.png") });
await page.mouse.move(2, 2);
await page.mouse.up();
if ((await debug()).screen !== "win") throw new Error("Formal win E2E: dragging outside activated Continue before a valid release");

await page.setViewportSize({ width: 320, height: 568 });
await page.waitForTimeout(100);
await page.screenshot({ path: resolve(output, "level-005-first-clear-320x568.png") });
await clickTarget("modalPrimary");
await page.waitForFunction(() => {
  const next = window.__COLOR_ESCAPE__?.getDebugState();
  return next?.screen === "home" && Boolean(next.completionFlow.coinFlight)
    && !next.art.win.ready && !next.art.win.loading;
});
const firstClearFlight = await debug();
if (firstClearFlight.completionFlow.coinFlight.reward !== 20
  || firstClearFlight.completionFlow.coinFlight.startCoins !== initialCoins
  || firstClearFlight.completionFlow.coinFlight.endCoins !== state.economy.coins
  || firstClearFlight.economy.visualCoins !== initialCoins) {
  throw new Error(`Formal win E2E: Continue did not start the settled reward flight on Home: ${JSON.stringify({
    reward: 20,
    economy: firstClearFlight.economy,
    coinFlight: firstClearFlight.completionFlow.coinFlight,
  })}`);
}
await page.waitForFunction(() => {
  const next = window.__COLOR_ESCAPE__?.getDebugState();
  return next?.screen === "home" && !next.completionFlow.coinFlight;
});

// A completed campaign level pays no base coins on later valid clears.
// The first-clear ledger remains a single progression mark.
await page.setViewportSize({ width: 720, height: 1584 });
await page.evaluate((key) => {
  const save = JSON.parse(localStorage.getItem(key));
  save.reducedMotion = false;
  localStorage.setItem(key, JSON.stringify(save));
}, saveKey);
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForFunction(() => {
  const current = window.__COLOR_ESCAPE__?.getDebugState();
  return current?.art.ready && current.screen === "home" && current.settings.reducedMotion === false;
}, undefined, { timeout: 15_000 });
await page.evaluate((levelId) => window.__COLOR_ESCAPE__.loadLevel(levelId, true), testLevelId);
await page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().screen === "playing");
const replayCoinsBefore = (await debug()).economy.coins;
await completeRoute(route);
const [replayState, replayAudit] = await redrawAndAudit();
const replayDisk = await storedSave();
if (replayState.settlement.coinReward !== 0
  || replayState.economy.coins !== replayCoinsBefore
  || replayDisk.coins !== replayState.economy.coins
  || replayDisk.rewardedLevels.filter((id) => id === testLevelId).length !== 1) {
  throw new Error(`Formal win E2E: normal replay did not present zero coins and preserve the wallet: ${JSON.stringify({
    levelReward: replayState.level.reward,
    presentedReward: replayState.settlement.coinReward,
    beforeCoins: replayCoinsBefore,
    runtimeCoins: replayState.economy.coins,
    diskCoins: replayDisk.coins,
    rewardedLevels: replayDisk.rewardedLevels,
  })}`);
}
assertFormalText(replayAudit, `+${replayState.settlement.coinReward}`, { ...rewardTextPosition, renderSize: 34, lineWidth: 5 });
assertFormalText(replayAudit, "Continue", { ...continueTextPosition, renderSize: 42, lineWidth: 6 });
const glowPhaseAScreenshot = resolve(output, "level-005-win-glow-phase-a-720x1584.png");
const glowPhaseBScreenshot = resolve(output, "level-005-win-glow-phase-b-720x1584.png");
await page.screenshot({ path: glowPhaseAScreenshot });
await page.evaluate(() => globalThis.__clearFormalWinAudit());
await page.waitForTimeout(650);
const motionAudit = await page.evaluate(() => structuredClone(globalThis.__FORMAL_WIN_AUDIT__));
await page.screenshot({ path: glowPhaseBScreenshot });

const glowRecords = motionAudit.images.filter(({ path }) => path === `${winPrefix}glow.png`);
if (glowRecords.length < 2) {
  throw new Error(`Formal win E2E: animated glow produced fewer than two frames (${glowRecords.length})`);
}
const glowCenter = {
  x: expectedImages["glow.png"].x + expectedImages["glow.png"].width / 2,
  y: expectedImages["glow.png"].y + expectedImages["glow.png"].height / 2,
};
const firstGlowCenter = matrixPoint(glowRecords[0].matrix, glowCenter.x, glowCenter.y);
for (const record of glowRecords) {
  const center = matrixPoint(record.matrix, glowCenter.x, glowCenter.y);
  if (Math.hypot(center.x - firstGlowCenter.x, center.y - firstGlowCenter.y) > 1e-5) {
    throw new Error(`Formal win E2E: glow rotation center drifted: ${JSON.stringify({ firstGlowCenter, center })}`);
  }
    if (record.args.length !== 2 || record.args[0] !== expectedImages["glow.png"].x
    || record.args[1] !== expectedImages["glow.png"].y) {
    throw new Error(`Formal win E2E: animated glow changed its authored origin or native draw mode: ${JSON.stringify(record.args)}`);
  }
}
const firstGlowAngle = Math.atan2(glowRecords[0].matrix.b, glowRecords[0].matrix.a);
const lastGlowAngle = Math.atan2(glowRecords.at(-1).matrix.b, glowRecords.at(-1).matrix.a);
const clockwiseAngleDelta = Math.atan2(
  Math.sin(lastGlowAngle - firstGlowAngle),
  Math.cos(lastGlowAngle - firstGlowAngle),
);
if (!(clockwiseAngleDelta > 0.03)) {
  throw new Error(`Formal win E2E: glow did not rotate clockwise across sampled frames (${clockwiseAngleDelta})`);
}

for (const filename of Object.keys(expectedImages).filter((filename) => filename !== "glow.png")) {
  const records = motionAudit.images.filter(({ path }) => path === `${winPrefix}${filename}`);
  if (records.length < 2) throw new Error(`Formal win E2E: ${filename} was not sampled across animated frames`);
  const first = records[0];
  for (const record of records.slice(1)) {
    if (JSON.stringify(record.args) !== JSON.stringify(first.args) || !matricesMatch(record.matrix, first.matrix)) {
      throw new Error(`Formal win E2E: ${filename} moved with the rotating glow`);
    }
  }
}
for (const { text, x, y } of [
  { text: `+${replayState.settlement.coinReward}`, x: rewardTextPosition.x, y: rewardTextPosition.y },
  { text: "Continue", x: continueTextPosition.x, y: continueTextPosition.y },
]) {
  const records = motionAudit.text.filter((record) => record.text === text && record.x === x && record.y === y);
  if (records.length < 4) throw new Error(`Formal win E2E: ${text} was not sampled across animated frames`);
  const first = records[0];
  if (records.some((record) => !matricesMatch(record.matrix, first.matrix))) {
    throw new Error(`Formal win E2E: ${text} moved with the rotating glow`);
  }
}

// Refreshing a committed result must not settle the same run a second time.
const replaySettledCoins = replayState.economy.coins;
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().art.ready, undefined, { timeout: 15_000 });
await page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().screen === "home");
const replayRefreshState = await debug();
const replayRefreshDisk = await storedSave();
if (replayRefreshState.economy.coins !== replaySettledCoins
  || replayRefreshDisk.coins !== replaySettledCoins
  || replayRefreshState.activeRun !== undefined) {
  throw new Error(`Formal win E2E: refreshing a committed replay duplicated or lost its reward: ${JSON.stringify({
    expectedCoins: replaySettledCoins,
    state: replayRefreshState.economy,
    diskCoins: replayRefreshDisk.coins,
    activeRun: replayRefreshState.activeRun,
  })}`);
}

// Replaying Lv100 pays no base coins and must not create or alter any Journey
// reward/episode claim. Those ledgers are progression, not repeatable income.
await page.evaluate(({ key, milestones, episodes }) => {
  const save = JSON.parse(localStorage.getItem(key));
  save.currentLevel = 100;
  save.highestLevel = 100;
  save.rewardedLevels = Array.from({ length: 100 }, (_, index) => index + 1);
  save.journeyProgress = {
    claimedMilestoneLevels: milestones,
    seenEpisodeUnlockLevels: episodes,
  };
  save.selectedJourneyEpisode = 10;
  localStorage.setItem(key, JSON.stringify(save));
}, { key: saveKey, milestones: journeyMilestoneLevels, episodes: journeyEpisodeUnlockLevels });
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().art.ready, undefined, { timeout: 15_000 });
const level100Route = await validationRoute(100);
const level100Before = await debug();
const level100CoinsBefore = level100Before.economy.coins;
const level100JourneyBefore = structuredClone(level100Before.journey.progress);
await page.evaluate(() => window.__COLOR_ESCAPE__.loadLevel(100, true));
await page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().screen === "playing");
await completeRoute(level100Route);
const [level100State, level100Audit] = await redrawAndAudit();
const level100Disk = await storedSave();
if (level100State.settlement.coinReward !== 0
  || level100State.economy.coins !== level100CoinsBefore
  || level100Disk.coins !== level100CoinsBefore
  || level100Disk.rewardedLevels.filter((id) => id === 100).length !== 1
  || JSON.stringify(level100State.journey.progress) !== JSON.stringify(level100JourneyBefore)
  || JSON.stringify(level100Disk.journeyProgress) !== JSON.stringify(level100JourneyBefore)) {
  throw new Error(`Formal win E2E: Lv100 replay changed progression ledgers or paid the wrong reward: ${JSON.stringify({
    levelReward: level100State.level.reward,
    presentedReward: level100State.settlement.coinReward,
    beforeCoins: level100CoinsBefore,
    runtimeCoins: level100State.economy.coins,
    rewardedLevel100Count: level100Disk.rewardedLevels.filter((id) => id === 100).length,
    journeyBefore: level100JourneyBefore,
    journeyAfter: level100Disk.journeyProgress,
  })}`);
}
assertFormalText(level100Audit, `+${level100State.settlement.coinReward}`, { ...rewardTextPosition, renderSize: 34, lineWidth: 5 });
await page.screenshot({ path: resolve(output, "level-100-replay-zero-reward-720x1584.png") });
await clickTarget("modalPrimary");
await page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().screen === "home");
const level100AfterContinue = await debug();
if (level100AfterContinue.completionFlow.coinFlight
  || level100AfterContinue.economy.coins !== level100CoinsBefore
  || level100AfterContinue.economy.visualCoins !== level100CoinsBefore
  || level100AfterContinue.journey.presentation
  || JSON.stringify(level100AfterContinue.journey.progress) !== JSON.stringify(level100JourneyBefore)) {
  throw new Error("Formal win E2E: Lv100 replay started a coin flight, changed the wallet, or opened/mutated a Journey progression event");
}

const report = {
  levelId: state.level.id,
  screensAfterFinalExit: [...new Set(screensAfterFinalExit)],
  bypassedLegacyCelebration: !screensAfterFinalExit.includes("celebrating"),
  legacyCelebrationCopyDrawn,
  formalResultLatencyMs,
  reward: state.settlement.coinReward,
  settlementRewards: {
    firstClear: {
      levelId: state.level.id,
      levelReward: state.level.reward,
      presented: state.settlement.coinReward,
      walletAfter: state.economy.coins,
    },
    normalReplay: {
      levelId: replayState.level.id,
      levelReward: replayState.level.reward,
      presented: replayState.settlement.coinReward,
      walletBefore: replayCoinsBefore,
      walletAfter: replayState.economy.coins,
      rewardedLevelLedgerCount: replayDisk.rewardedLevels.filter((id) => id === testLevelId).length,
      refreshIdempotent: replayRefreshState.economy.coins === replaySettledCoins,
    },
    level100Replay: {
      levelReward: level100State.level.reward,
      presented: level100State.settlement.coinReward,
      walletBefore: level100CoinsBefore,
      walletAfter: level100State.economy.coins,
      journeyLedgerUnchanged: JSON.stringify(level100State.journey.progress) === JSON.stringify(level100JourneyBefore),
    },
  },
  overlay: { color: "#000000", alpha: overlayAlpha },
  images: expectedImages,
  text: {
    reward: { x: rewardTextPosition.x, y: rewardTextPosition.y, designSize: 28, renderSize: 34, fill: "#ffffff", stroke: "#415ca4", outwardStroke: 2.5 },
    continue: { x: continueTextPosition.x, y: continueTextPosition.y, designSize: 28, renderSize: 42, fill: "#ffffff", stroke: "#10520b", outwardStroke: 3 },
  },
  loadedImages: state.art.win.loadedImages,
  interaction: { releaseToActivate: true, pressedScale: 0.95, closeReleasedArt: true },
  glowRotation: {
    periodSeconds: glowRotationPeriodSeconds,
    direction: "clockwise",
    center: glowCenter,
    sampledFrames: glowRecords.length,
    sampledAngleDelta: clockwiseAngleDelta,
    reducedMotionIdleDraws: reducedMotionIdleAudit.images.filter(({ path }) => path.startsWith(winPrefix)).length,
    isolatedToGlow: true,
  },
  screenshots: [
    "level-005-first-clear-720x1584.png",
    "continue-pressed-720x1584.png",
    "level-005-first-clear-320x568.png",
    "level-005-win-glow-phase-a-720x1584.png",
    "level-005-win-glow-phase-b-720x1584.png",
    "level-100-replay-zero-reward-720x1584.png",
  ],
  browserErrors,
};
await writeFile(resolve(output, "formal-win-report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
await browser.close();
if (browserErrors.length) throw new Error(`Formal win browser errors:\n${browserErrors.join("\n")}`);
console.log("Formal win passed: exact layout, isolated looping glow rotation, reduced-motion idle, first-clear 40/replay 0 coins, wallet persistence, and Journey-ledger isolation.");
