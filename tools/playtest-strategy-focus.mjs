import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";

const output = fileURLToPath(new URL("../playtest-results/strategy-focus/", import.meta.url));
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
  featureSeen: ["basics", "ice-door", "ice-block", "layer", "shutter", "generator", "elevator", "conveyor", "star"],
  boosterUnlockSeen: ["time", "rocket", "pulse"],
  boosters: { time: 0, rocket: 0, pulse: 0 },
  bestStars: {},
  bestMoves: {},
  rewardedLevels: [],
  dailyStreak: 0,
  lastDailyCompletedDay: "",
  lastSeenUpdate: "2026-09-05-r95",
});

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 360, height: 792 }, deviceScaleFactor: 2 });
const page = await context.newPage();
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(error.stack ?? error.message));

const debug = () => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const seed = async (reducedMotion = false) => {
  await page.goto(playtestUrl, { waitUntil: "networkidle" });
  await page.evaluate((value) => localStorage.setItem("color-escape-save-v1", JSON.stringify(value)), save(reducedMotion));
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForFunction(() => Boolean(window.__COLOR_ESCAPE__?.getDebugState().art?.ready));
};
const openLevel = async (levelId) => {
  await page.evaluate((id) => window.__COLOR_ESCAPE__.loadLevel(id, true), levelId);
  await page.waitForTimeout(120);
};
const screenPoint = (_state, logical) => {
  const viewport = page.viewportSize();
  const scale = Math.min(viewport.width / 496, viewport.height / 1078);
  return {
    x: (viewport.width - 496 * scale) / 2 + logical.x * scale,
    y: (viewport.height - 1078 * scale) / 2 + logical.y * scale,
  };
};
const blockPoint = (state, block, x, y) => {
  const [anchorX, anchorY] = block.shape[0];
  return screenPoint(state, {
    x: state.board.innerX + (x + anchorX + 0.5) * state.board.cell,
    y: state.board.innerY + (y + anchorY + 0.5) * state.board.cell,
  });
};
const drag = async (blockId, path) => {
  const state = await debug();
  const block = state.puzzle.blocks.find((candidate) => candidate.id === blockId);
  if (!block) throw new Error(`Strategy focus E2E: missing ${blockId}`);
  const start = blockPoint(state, block, block.x, block.y);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  for (const [x, y] of path) {
    const target = blockPoint(state, block, x, y);
    await page.mouse.move(target.x, target.y, { steps: 3 });
    await page.waitForTimeout(22);
  }
  await page.mouse.up();
  await page.waitForTimeout(140);
};
const levelRoute = (levelId) => page.evaluate(async (id) => {
  const [{ getLevel }, { solveLevelForValidation }] = await Promise.all([
    import("/src/core/levels.ts"),
    import("/src/core/levelSolver.ts"),
  ]);
  const level = getLevel(id);
  const solution = solveLevelForValidation(level);
  const firstClearIndex = solution.drags.findIndex((candidate) => Boolean(candidate.exitSide));
  if (!solution.solved || firstClearIndex < 1 || solution.drags[0].exitSide) {
    throw new Error(`Strategy focus E2E: Lv${id} lacks a setup-first validation route`);
  }
  const first = solution.drags[0];
  const block = level.blocks.find((candidate) => candidate.id === first.blockId);
  const backward = [...first.path.slice(0, -1).reverse(), [block.x, block.y]];
  return {
    focus: level.strategyFocus,
    first: { ...first, start: [block.x, block.y], backward },
    breakthrough: solution.drags.slice(0, firstClearIndex + 1),
  };
}, levelId);
const exposeFocus = async (levelId) => {
  const route = await levelRoute(levelId);
  if (!route.focus) throw new Error(`Strategy focus E2E: Lv${levelId} has no focus configuration`);
  for (let index = 0; index < route.focus.afterMoves; index += 1) {
    await drag(route.first.blockId, index % 2 === 0 ? route.first.path : route.first.backward);
    const state = await debug();
    if (state.puzzle.cleared !== 0) throw new Error(`Strategy focus E2E: Lv${levelId} oscillation unexpectedly cleared a block`);
    if (state.strategyFocus.noClearMoveStreak !== index + 1) {
      const block = state.puzzle.blocks.find((candidate) => candidate.id === route.first.blockId);
      throw new Error(`Strategy focus E2E: Lv${levelId} gesture ${index + 1} did not commit (${JSON.stringify({ focus: state.strategyFocus, block, viewport: state.viewportTransform })})`);
    }
    if (index < route.focus.afterMoves - 1 && state.strategyFocus.visible) {
      throw new Error(`Strategy focus E2E: Lv${levelId} focus appeared before its threshold`);
    }
  }
  const state = await debug();
  if (!state.strategyFocus.visible || state.strategyFocus.blockId !== route.focus.blockId
    || state.strategyFocus.directional || !state.strategyFocus.artReady
    || Object.hasOwn(state.strategyFocus, "path")) {
    throw new Error(`Strategy focus E2E: Lv${levelId} non-directional contract failed ${JSON.stringify(state.strategyFocus)}`);
  }
  return { route, state };
};
const exposeNudge = async (evidence) => {
  await drag(evidence.route.first.blockId, evidence.route.first.path);
  await drag(evidence.route.first.blockId, evidence.route.first.backward);
  const state = await debug();
  const expectedOrigins = [evidence.route.first.start, ...evidence.route.first.path];
  if (!state.strategyNudge.visible
    || state.strategyNudge.guide?.blockId !== evidence.route.first.blockId
    || JSON.stringify(state.strategyNudge.guide?.origins) !== JSON.stringify(expectedOrigins)
    || state.strategyFocus.visible) {
    throw new Error(`Strategy focus E2E: one-step escalation contract failed ${JSON.stringify({ expectedOrigins, strategyNudge: state.strategyNudge, strategyFocus: state.strategyFocus })}`);
  }
  return { ...evidence, state };
};

await seed(false);
await openLevel(70);
let evidence = await exposeFocus(70);
if (evidence.state.strategyFocus.noClearMoveStreak !== 4 || evidence.state.strategyFocus.threshold !== 4) {
  throw new Error("Strategy focus E2E: low-pressure lesson threshold is not four moves");
}
await page.screenshot({ path: resolve(output, "01-lv70-focus-720x1584.png") });
evidence = await exposeNudge(evidence);
if (evidence.state.strategyFocus.noClearMoveStreak !== 6) {
  throw new Error("Strategy focus E2E: local setup drag did not wait two moves after focus");
}
await page.screenshot({ path: resolve(output, "02-lv70-one-step-rescue-720x1584.png") });
await drag(evidence.route.first.blockId, evidence.route.first.path);
for (const action of evidence.route.breakthrough.slice(1)) await drag(action.blockId, action.path);
let state = await debug();
if (state.puzzle.cleared < 1 || state.strategyFocus.visible || state.strategyNudge.visible || state.strategyFocus.noClearMoveStreak !== 0) {
  throw new Error("Strategy focus E2E: first clear did not dismiss the rescue focus");
}
await page.screenshot({ path: resolve(output, "03-lv70-first-clear-720x1584.png") });

await openLevel(88);
evidence = await exposeFocus(88);
if (evidence.state.strategyFocus.noClearMoveStreak !== 8 || evidence.state.strategyFocus.threshold !== 8) {
  throw new Error("Strategy focus E2E: high-pressure threshold is not eight moves");
}
await page.screenshot({ path: resolve(output, "04-lv88-focus-720x1584.png") });
evidence = await exposeNudge(evidence);
if (evidence.state.strategyFocus.noClearMoveStreak !== 10) {
  throw new Error("Strategy focus E2E: high-pressure local setup drag did not wait two moves after focus");
}
await page.screenshot({ path: resolve(output, "05-lv88-one-step-rescue-720x1584.png") });

await openLevel(98);
evidence = await exposeFocus(98);
if (evidence.state.strategyFocus.noClearMoveStreak !== 6 || evidence.state.strategyFocus.threshold !== 6) {
  throw new Error("Strategy focus E2E: Lv98 readability focus threshold is not six moves");
}
await page.screenshot({ path: resolve(output, "06-lv98-focus-720x1584.png") });
evidence = await exposeNudge(evidence);
if (evidence.state.strategyFocus.noClearMoveStreak !== 8
  || JSON.stringify(evidence.state.strategyNudge.guide?.origins) !== JSON.stringify([[0, 5], [0, 6]])) {
  throw new Error(`Strategy focus E2E: Lv98 local opening nudge is not the validated first drag ${JSON.stringify(evidence.state.strategyNudge)}`);
}
await page.screenshot({ path: resolve(output, "07-lv98-one-step-rescue-720x1584.png") });
await drag(evidence.state.strategyNudge.guide.blockId, evidence.state.strategyNudge.guide.origins.slice(1));
state = await debug();
if (!state.strategyNudge.acknowledged || !state.strategyNudge.visible
  || state.strategyNudge.reason !== "followup" || !state.strategyNudge.followup.ready
  || state.strategyNudge.rescueDrags !== 1 || state.strategyNudge.followup.drags !== 0
  || state.strategyNudge.guide?.blockId !== "red-target"
  || JSON.stringify(state.strategyNudge.guide?.origins) !== JSON.stringify([[0, 3], [0, 4]])) {
  throw new Error(`Strategy focus E2E: Lv98 did not expose exactly one remaining corridor dependency ${JSON.stringify(state.strategyNudge)}`);
}
await page.screenshot({ path: resolve(output, "08-lv98-corridor-followup-720x1584.png") });
await drag(state.strategyNudge.guide.blockId, state.strategyNudge.guide.origins.slice(1));
state = await debug();
if (state.strategyNudge.visible || state.strategyNudge.followup.ready
  || state.strategyNudge.followup.drags !== 1 || state.puzzle.cleared !== 0) {
  throw new Error(`Strategy focus E2E: Lv98 follow-up did not stop before the player-owned clear ${JSON.stringify(state.strategyNudge)}`);
}
await drag(evidence.route.breakthrough[2].blockId, evidence.route.breakthrough[2].path);
state = await debug();
if (state.puzzle.cleared < 1 || state.strategyNudge.visible || state.strategyNudge.followup.ready) {
  throw new Error(`Strategy focus E2E: Lv98 player-owned clear failed ${JSON.stringify({ cleared: state.puzzle.cleared, strategyNudge: state.strategyNudge })}`);
}
await page.screenshot({ path: resolve(output, "09-lv98-player-first-clear-720x1584.png") });

await openLevel(80);
const disturbedLevel80 = [
  { blockId: "composition-80-5", path: [[8, 3], [8, 2]] },
  { blockId: "red-target", path: [[7, 0]] },
  { blockId: "composition-80-6", path: [[5, 11], [6, 11], [7, 11]] },
  { blockId: "composition-80-3", path: [[4, 2], [4, 3]] },
  { blockId: "pink-target", path: [[6, 9]] },
  { blockId: "pink-target", path: [[6, 8]] },
  { blockId: "red-target", path: [[6, 0]] },
  { blockId: "red-target", path: [[7, 0]] },
  { blockId: "composition-80-5", path: [[8, 3]] },
  { blockId: "red-target", path: [[7, 1], [8, 1]] },
];
for (const [index, action] of disturbedLevel80.entries()) {
  const before = await debug();
  await drag(action.blockId, action.path);
  let after = await debug();
  if (after.strategyNudge.noClearMoveStreak === before.strategyNudge.noClearMoveStreak) {
    await page.waitForTimeout(180);
    await drag(action.blockId, action.path);
    after = await debug();
  }
  if (after.strategyNudge.noClearMoveStreak !== before.strategyNudge.noClearMoveStreak + 1) {
    throw new Error(`Strategy focus E2E: disturbed Lv80 gesture ${index + 1} did not commit exactly once ${JSON.stringify({ before: before.strategyNudge, after: after.strategyNudge })}`);
  }
}
state = await debug();
if (state.puzzle.cleared !== 0
  || state.strategyNudge.noClearMoveStreak !== 10
  || !state.strategyNudge.visible
  || state.strategyNudge.reason !== "blocker"
  || state.strategyNudge.focusBlockId !== "blue-load"
  || state.strategyNudge.guide?.blockId !== "red-target"
  || JSON.stringify(state.strategyNudge.guide?.origins) !== JSON.stringify([[8, 1], [7, 1], [6, 1]])
  || !state.strategyNudge.blockerFocusArtReady) {
  throw new Error(`Strategy focus E2E: disturbed Lv80 did not select one legal active blocker ${JSON.stringify(state.strategyNudge)}`);
}
await page.screenshot({ path: resolve(output, "07-lv80-adaptive-blocker-720x1584.png") });
await drag(state.strategyNudge.guide.blockId, state.strategyNudge.guide.origins.slice(1));
state = await debug();
if (!state.strategyNudge.acknowledged || !state.strategyNudge.visible
  || state.strategyNudge.rescueDrags !== 1 || state.puzzle.cleared !== 0
  || state.strategyNudge.reason !== "followup"
  || state.strategyNudge.guide?.blockId !== "blue-load"
  || JSON.stringify(state.strategyNudge.guide?.origins) !== JSON.stringify([[8, 0], [7, 0], [6, 0]])
  || !state.strategyNudge.followup.ready
  || state.strategyNudge.followup.drags !== 0) {
  throw new Error(`Strategy focus E2E: adaptive rescue did not expose exactly one local corridor-opening follow-up ${JSON.stringify(state.strategyNudge)}`);
}
await page.screenshot({ path: resolve(output, "08-lv80-corridor-followup-720x1584.png") });
await drag(state.strategyNudge.guide.blockId, state.strategyNudge.guide.origins.slice(1));
state = await debug();
if (state.strategyNudge.visible || !state.strategyNudge.acknowledged
  || state.strategyNudge.rescueDrags !== 1 || state.strategyNudge.followup.ready
  || state.strategyNudge.followup.drags !== 1 || state.puzzle.cleared !== 0) {
  throw new Error(`Strategy focus E2E: corridor-opening follow-up did not stop before the clear ${JSON.stringify(state.strategyNudge)}`);
}
await drag("composition-80-5", [[8, 2], [8, 1]]);
state = await debug();
if (state.puzzle.cleared < 1 || state.strategyNudge.visible || state.strategyNudge.followup.ready) {
  throw new Error(`Strategy focus E2E: player-owned clear after the follow-up failed ${JSON.stringify({ cleared: state.puzzle.cleared, strategyNudge: state.strategyNudge })}`);
}
await page.screenshot({ path: resolve(output, "09-lv80-player-first-clear-720x1584.png") });

await page.setViewportSize({ width: 320, height: 568 });
await seed(true);
await openLevel(70);
evidence = await exposeFocus(70);
if (evidence.state.strategyFocus.animated || !evidence.state.strategyFocus.visible) {
  throw new Error("Strategy focus E2E: reduced motion did not preserve a static focus");
}
await page.screenshot({ path: resolve(output, "10-lv70-focus-reduced-320x568.png") });
await openLevel(80);
for (const action of disturbedLevel80) await drag(action.blockId, action.path);
state = await debug();
await drag(state.strategyNudge.guide.blockId, state.strategyNudge.guide.origins.slice(1));
state = await debug();
if (!state.strategyNudge.visible || state.strategyNudge.reason !== "followup"
  || JSON.stringify(state.strategyNudge.guide?.origins) !== JSON.stringify([[8, 0], [7, 0], [6, 0]])) {
  throw new Error(`Strategy focus E2E: reduced-motion corridor follow-up lost its static actionable geometry ${JSON.stringify(state.strategyNudge)}`);
}
await page.screenshot({ path: resolve(output, "11-lv80-followup-reduced-320x568.png") });

await openLevel(98);
evidence = await exposeFocus(98);
evidence = await exposeNudge(evidence);
state = evidence.state;
if (!state.strategyNudge.visible
  || JSON.stringify(state.strategyNudge.guide?.origins) !== JSON.stringify([[0, 5], [0, 6]])) {
  throw new Error(`Strategy focus E2E: reduced-motion Lv98 lost its local opening geometry ${JSON.stringify(state.strategyNudge)}`);
}
await page.screenshot({ path: resolve(output, "12-lv98-rescue-reduced-320x568.png") });
await drag(state.strategyNudge.guide.blockId, state.strategyNudge.guide.origins.slice(1));
state = await debug();
if (!state.strategyNudge.visible || state.strategyNudge.reason !== "followup"
  || JSON.stringify(state.strategyNudge.guide?.origins) !== JSON.stringify([[0, 3], [0, 4]])) {
  throw new Error(`Strategy focus E2E: reduced-motion Lv98 lost its corridor follow-up ${JSON.stringify(state.strategyNudge)}`);
}
await drag(state.strategyNudge.guide.blockId, state.strategyNudge.guide.origins.slice(1));
await drag(evidence.route.breakthrough[2].blockId, evidence.route.breakthrough[2].path);
state = await debug();
if (state.puzzle.cleared < 1 || state.strategyNudge.visible) {
  throw new Error(`Strategy focus E2E: reduced-motion Lv98 player-owned clear failed ${JSON.stringify({ cleared: state.puzzle.cleared, strategyNudge: state.strategyNudge })}`);
}
await page.screenshot({ path: resolve(output, "13-lv98-player-first-clear-reduced-320x568.png") });

const report = {
  method: "Real Pointer gestures create the configured no-clear streak. Stage one exposes one block id without direction; two further no-clear gestures escalate to one currently legal local setup drag. If that drag still leaves a verified two-drag-horizon dependency, the game may show exactly one more local setup drag that stops when the corridor opens. It never identifies or animates the following clear, exit, or full route. Disturbed Lv80 and the revised Lv98 receive one corridor-opening follow-up, then the test performs each clear separately.",
  levels: [
    { levelId: 70, focusThreshold: 4, nudgeThreshold: 6, focusBlockId: "yellow-load" },
    { levelId: 88, focusThreshold: 8, nudgeThreshold: 10, focusBlockId: "composition-88-6" },
    { levelId: 98, focusThreshold: 6, nudgeThreshold: 8, focusBlockId: "composition-98-4", firstRescueDragBudget: 1, corridorFollowupBlockId: "red-target", corridorFollowupDragBudget: 1, playerOwnedClear: true },
    { levelId: 80, focusThreshold: 8, nudgeThreshold: 10, focusBlockId: "blue-load", adaptiveBlockerId: "red-target", adaptiveReason: "blocker", firstRescueDragBudget: 1, corridorFollowupBlockId: "blue-load", corridorFollowupDragBudget: 1, playerOwnedClear: true },
  ],
  focusDirectionExposed: false,
  oneLocalSetupDragExposed: true,
  maximumCorridorFollowupDragsExposed: 1,
  followingExitOrFullRouteExposed: false,
  adaptiveBlockerUsesImageGenCorners: true,
  reducedMotionStatic: true,
  reducedMotionCorridorFollowupVisible: true,
  reducedMotionLv98PlayerOwnedClear: true,
  browserErrors: errors,
};
await writeFile(resolve(output, "strategy-focus-report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");

await context.close();
await browser.close();
if (errors.length) throw new Error(`Strategy focus browser errors:\n${errors.join("\n")}`);
console.log("Two-stage rescue, adaptive blocker, one corridor-opening follow-up, player-owned first clear, revised Lv98 opening, ImageGen art, DPR2, reduced motion, and 320x568 passed.");
