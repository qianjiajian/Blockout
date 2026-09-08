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
actions.push(await clickExpandedEdge("leaderboardEfficiency", "top"));
state = await debug();
if (state.leaderboard.mode !== "efficiency") throw new Error("Adaptive-target E2E: expanded leaderboard mode edge missed");
actions.push(await clickExpandedEdge("leaderboardNext", "top"));
state = await debug();
if (state.leaderboard.page !== 1 || state.leaderboard.firstRank !== 6) {
  throw new Error("Adaptive-target E2E: expanded leaderboard next edge missed");
}
actions.push(await clickExpandedEdge("leaderboardPrev", "top"));
state = await debug();
if (state.leaderboard.page !== 0 || state.leaderboard.firstRank !== 1) {
  throw new Error("Adaptive-target E2E: expanded leaderboard previous edge missed");
}

await clickCenter("navigation.3", 280);
state = await debug();
if (state.screen !== "levels" || state.levelPage !== 5) throw new Error("Adaptive-target E2E: journey did not open at the current chapter");
actions.push(await clickExpandedEdge("journeyPrev", "top"));
state = await debug();
if (state.levelPage !== 4) throw new Error("Adaptive-target E2E: expanded journey previous edge missed");

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
  browserErrors: errors,
};
await writeFile(resolve(output, "adaptive-hit-target-report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");

await browser.close();
if (errors.length) throw new Error(`Adaptive-target browser errors:\n${errors.join("\n")}`);
console.log(`Adaptive hit targets passed: ${auditEntries.length} controls, ${minimumWidth.toFixed(1)}x${minimumHeight.toFixed(1)} CSS px minimum, ${actions.length} expanded-edge actions.`);
