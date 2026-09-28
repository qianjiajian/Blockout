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

let state = await debug();
let lift = state.puzzle.elevators[0];
assert(lift, "Elevator-drag E2E: Lv50 has no elevator");
let carried = state.puzzle.blocks.find((candidate) => candidate.id === lift.blockId);
assert(carried?.x === lift.x && carried?.y === lift.y,
  `Elevator-drag E2E: authored payload is not aligned with the lift ${JSON.stringify({ carried, lift })}`);
const liftTarget = { x: lift.toX, y: lift.toY };
const starter = await page.evaluate(async (payloadId) => {
  const [{ getLevel }, { PuzzleModel }] = await Promise.all([
    import("/src/core/levels.ts"),
    import("/src/core/PuzzleModel.ts"),
  ]);
  const level = getLevel(50);
  const elevator = level.elevators?.[0];
  if (!elevator) throw new Error("Elevator-drag E2E: Lv50 source has no elevator");
  const reserved = new Set();
  for (let y = elevator.toY; y < elevator.toY + elevator.height; y += 1) {
    for (let x = elevator.toX; x < elevator.toX + elevator.width; x += 1) reserved.add(`${x},${y}`);
  }
  for (const authored of level.blocks) {
    if (authored.id === payloadId) continue;
    for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
      const model = new PuzzleModel(level);
      const block = model.getBlock(authored.id);
      if (!block || !model.isBlockActive(block) || model.possibleExitSides(block).length > 0) continue;
      const x = block.x + dx;
      const y = block.y + dy;
      if (!model.moveBlockStep(block.id, x, y)) continue;
      const moved = model.getBlock(block.id);
      if (!moved || model.possibleExitSides(moved).length > 0
        || model.blockCells(moved).some(([cellX, cellY]) => reserved.has(`${cellX},${cellY}`))) continue;
      return { blockId: block.id, x, y };
    }
  }
  throw new Error("Elevator-drag E2E: Lv50 has no safe timer-start parking move");
}, carried.id);
await drag(starter.blockId, [[starter.x, starter.y]]);
state = await debug();
lift = state.puzzle.elevators.find((candidate) => candidate.id === lift.id);
carried = state.puzzle.blocks.find((candidate) => candidate.id === carried.id);
assert(carried?.x === lift?.x && carried?.y === lift?.y,
  `Elevator-drag E2E: timer-start move disturbed the payload ${JSON.stringify({ carried, lift, starter })}`);
const movesBeforeHold = state.puzzle.moves;
const timeBeforeHold = state.puzzle.remainingSeconds;
const heldPoint = pointFor(state, carried);
await page.mouse.move(heldPoint.x, heldPoint.y);
await page.mouse.down();

await page.waitForFunction(({ elevatorId, x, y }) => {
  const current = window.__COLOR_ESCAPE__.getDebugState();
  const elevator = current.puzzle.elevators.find((item) => item.id === elevatorId);
  return elevator?.x === x && elevator?.y === y;
}, { elevatorId: lift.id, ...liftTarget }, { timeout: 2_500 });
state = await debug();
carried = state.puzzle.blocks.find((candidate) => candidate.id === carried.id);
lift = state.puzzle.elevators.find((candidate) => candidate.id === lift.id);
assert(carried?.x === liftTarget.x && carried?.y === liftTarget.y
  && lift?.x === liftTarget.x && lift?.y === liftTarget.y,
  `Elevator-drag E2E: lift did not carry the held block ${JSON.stringify({ carried, lift })}`);
assert(state.selectedId === carried.id && state.activePointer != null,
  "Elevator-drag E2E: platform motion lost Pointer ownership");
assert(state.dragMotion?.gridX === liftTarget.x && state.dragMotion?.gridY === liftTarget.y
  && Math.abs(state.dragMotion.visualX - liftTarget.x) < 0.03
  && Math.abs(state.dragMotion.visualY - liftTarget.y) < 0.03,
`Elevator-drag E2E: visual/model poses diverged on the lift ${JSON.stringify(state.dragMotion)}`);
assert(state.puzzle.moves === movesBeforeHold,
  `Elevator-drag E2E: automatic lift motion counted a move (${state.puzzle.moves})`);
assert(state.puzzle.remainingSeconds < timeBeforeHold,
  "Elevator-drag E2E: holding on the lift paused the timer");

await page.mouse.up();
await page.waitForTimeout(100);
state = await debug();
carried = state.puzzle.blocks.find((candidate) => candidate.id === carried.id);
assert(!carried && state.puzzle.moves === movesBeforeHold + 1,
  `Elevator-drag E2E: release at the matching edge did not commit exactly one exit ${JSON.stringify({ carried, moves: state.puzzle.moves })}`);
assert(state.selectedId == null && state.activePointer == null,
  "Elevator-drag E2E: release retained Pointer ownership");

await page.close();
await browser.close();
if (errors.length) throw new Error(`Elevator-drag browser errors:\n${errors.join("\n")}`);
console.log("Elevator drag sync passed: authored payload alignment, held visual/model carry, live timer, zero automatic move cost, and one release-to-exit commit.");
