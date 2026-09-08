import { chromium } from "playwright";

const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 496, height: 1078 } });
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(error.message));

const debug = () => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const pointFor = (state, block, x = block.x, y = block.y) => {
  const [anchorX, anchorY] = block.shape[0];
  return {
    x: state.board.innerX + (x + anchorX + 0.5) * state.board.cell,
    y: state.board.innerY + (y + anchorY + 0.5) * state.board.cell,
  };
};

const drag = async (blockId, path) => {
  let state = await debug();
  const block = state.puzzle.blocks.find((candidate) => candidate.id === blockId);
  assert(block, `Elevator-drag E2E: missing ${blockId}`);
  const start = pointFor(state, block);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  for (const [x, y] of path) {
    state = await debug();
    await page.mouse.move(...Object.values(pointFor(state, block, x, y)), { steps: 3 });
  }
  await page.mouse.up();
  await page.waitForTimeout(40);
};

await page.goto(playtestUrl, { waitUntil: "networkidle" });
await page.evaluate(() => {
  localStorage.clear();
  localStorage.setItem("color-escape-save-v1", JSON.stringify({
    schemaVersion: 1,
    currentLevel: 50,
    highestLevel: 100,
    coins: 1000,
    sound: false,
    haptic: false,
    reducedMotion: false,
    featureSeen: ["basics", "ice-door", "ice-block", "layer", "shutter", "elevator"],
    boosterUnlockSeen: ["time", "rocket", "pulse"],
    metaDiscovery: {},
    boosters: { time: 3, rocket: 3, pulse: 3 },
    bestStars: {},
    bestMoves: {},
    rewardedLevels: [],
    dailyStreak: 0,
    lastDailyCompletedDay: "",
    lastSeenUpdate: "2026-09-07-r107",
  }));
});
await page.reload({ waitUntil: "networkidle" });
await page.evaluate(() => window.__COLOR_ESCAPE__.loadLevel(50, true));
await page.waitForTimeout(80);

// Clear the platform lane, then park the cyan L block exactly on the lift.
await drag("blue-load", [[1, 1], [1, 2], [1, 3]]);
await drag("cyan-open", [[2, 1], [2, 0]]);
let state = await debug();
let cyan = state.puzzle.blocks.find((candidate) => candidate.id === "cyan-open");
let lift = state.puzzle.elevators.find((candidate) => candidate.id === "elevator-intro");
assert(cyan?.x === 2 && cyan?.y === 0 && lift?.x === 2 && lift?.y === 0,
  `Elevator-drag E2E: setup missed the lift ${JSON.stringify({ cyan, lift })}`);
const movesBeforeHold = state.puzzle.moves;
const timeBeforeHold = state.puzzle.remainingSeconds;
const heldPoint = pointFor(state, cyan);
await page.mouse.move(heldPoint.x, heldPoint.y);
await page.mouse.down();

await page.waitForFunction(() => {
  const current = window.__COLOR_ESCAPE__.getDebugState();
  return current.puzzle.elevators.find((item) => item.id === "elevator-intro")?.x === 1;
}, undefined, { timeout: 2_500 });
state = await debug();
cyan = state.puzzle.blocks.find((candidate) => candidate.id === "cyan-open");
lift = state.puzzle.elevators.find((candidate) => candidate.id === "elevator-intro");
assert(cyan?.x === 1 && cyan?.y === 0 && lift?.x === 1,
  `Elevator-drag E2E: lift did not carry the held block ${JSON.stringify({ cyan, lift })}`);
assert(state.selectedId === "cyan-open" && state.activePointer != null,
  "Elevator-drag E2E: platform motion lost Pointer ownership");
assert(state.dragMotion?.gridX === 1 && state.dragMotion?.gridY === 0
  && Math.abs(state.dragMotion.visualX - 1) < 0.03
  && Math.abs(state.dragMotion.visualY) < 0.03,
`Elevator-drag E2E: visual/model poses diverged on the lift ${JSON.stringify(state.dragMotion)}`);
assert(state.puzzle.moves === movesBeforeHold,
  `Elevator-drag E2E: automatic lift motion counted a move (${state.puzzle.moves})`);
assert(state.puzzle.remainingSeconds < timeBeforeHold,
  "Elevator-drag E2E: holding on the lift paused the timer");

// The next sample is purely downward from the stationary finger. It must move
// down immediately at the lift's new X, never jump back toward the old X.
const downPoint = { x: heldPoint.x, y: heldPoint.y + state.board.cell };
await page.mouse.move(downPoint.x, downPoint.y);
state = await debug();
cyan = state.puzzle.blocks.find((candidate) => candidate.id === "cyan-open");
assert(cyan?.x === 1 && cyan?.y === 1,
  `Elevator-drag E2E: post-lift drag jumped or stalled ${JSON.stringify(cyan)}`);
assert(Math.abs(state.dragMotion.visualX - 1) < 0.03 && Math.abs(state.dragMotion.visualY - 1) < 0.03,
  `Elevator-drag E2E: post-lift visual pose jumped ${JSON.stringify(state.dragMotion)}`);
assert(state.puzzle.moves === movesBeforeHold, "Elevator-drag E2E: held movement committed before release");
await page.mouse.up();
await page.waitForTimeout(100);
state = await debug();
cyan = state.puzzle.blocks.find((candidate) => candidate.id === "cyan-open");
assert(cyan?.x === 1 && cyan?.y === 1 && state.puzzle.moves === movesBeforeHold + 1,
  `Elevator-drag E2E: post-lift gesture did not commit once ${JSON.stringify({ cyan, moves: state.puzzle.moves })}`);
assert(state.selectedId == null && state.activePointer == null,
  "Elevator-drag E2E: release retained Pointer ownership");

await page.close();
await browser.close();
if (errors.length) throw new Error(`Elevator-drag browser errors:\n${errors.join("\n")}`);
console.log("Elevator drag sync passed: carried visual/model pose, live timer, immediate continuation, and one-step commit.");
