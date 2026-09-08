import { chromium } from "playwright";

const baseUrl = process.env.PLAYTEST_URL ?? process.env.BASE_URL ?? "http://127.0.0.1:5173/";
const viewport = { width: 496, height: 1078 };
const levelId = 5;
const blockId = "drag-continuity-moving";
const blockerId = "drag-continuity-blocker";
const fixtureX = 4;
const failures = [];
const browserErrors = [];

const save = {
  schemaVersion: 1,
  currentLevel: levelId,
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

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const near = (actual, expected, tolerance = 0.03) => (
  typeof actual === "number" && Math.abs(actual - expected) <= tolerance
);

const blockFrom = (state) => state.puzzle.blocks.find((candidate) => candidate.id === blockId);
const debug = (page) => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());

const screenPoint = (page, logical) => {
  const size = page.viewportSize();
  const scale = Math.min(size.width / 496, size.height / 1078);
  return {
    x: (size.width - 496 * scale) / 2 + logical.x * scale,
    y: (size.height - 1078 * scale) / 2 + logical.y * scale,
  };
};

const anchorPoint = (page, state, x, y) => screenPoint(page, {
  x: state.board.innerX + (x + 0.5) * state.board.cell,
  y: state.board.innerY + (y + 0.5) * state.board.cell,
});

const installPointerTrace = (page) => page.evaluate(() => {
  const canvas = document.querySelector("canvas");
  if (!canvas) throw new Error("Drag-continuity E2E: canvas is missing");
  globalThis.__DRAG_CONTINUITY_POINTER_TRACE__ = [];
  for (const type of ["pointerdown", "pointermove", "pointerup", "pointercancel"]) {
    canvas.addEventListener(type, (event) => {
      globalThis.__DRAG_CONTINUITY_POINTER_TRACE__.push({
        type,
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        buttons: event.buttons,
      });
    }, true);
  }
});

const clearPointerTrace = (page) => page.evaluate(() => {
  globalThis.__DRAG_CONTINUITY_POINTER_TRACE__ = [];
});

const pointerTrace = (page) => page.evaluate(() => (
  globalThis.__DRAG_CONTINUITY_POINTER_TRACE__ ?? []
));

const nativePointer = (session) => ({
  hover: (point) => session.send("Input.dispatchMouseEvent", {
    type: "mouseMoved",
    x: point.x,
    y: point.y,
    button: "none",
    buttons: 0,
    pointerType: "mouse",
  }),
  down: (point) => session.send("Input.dispatchMouseEvent", {
    type: "mousePressed",
    x: point.x,
    y: point.y,
    button: "left",
    buttons: 1,
    clickCount: 1,
    pointerType: "mouse",
  }),
  move: (point) => session.send("Input.dispatchMouseEvent", {
    type: "mouseMoved",
    x: point.x,
    y: point.y,
    button: "left",
    buttons: 1,
    pointerType: "mouse",
  }),
  up: (point) => session.send("Input.dispatchMouseEvent", {
    type: "mouseReleased",
    x: point.x,
    y: point.y,
    button: "left",
    buttons: 0,
    clickCount: 1,
    pointerType: "mouse",
  }),
});

const createPage = async (browser, label) => {
  const page = await browser.newPage({ viewport });
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(`[${label}] ${message.text()}`);
  });
  page.on("pageerror", (error) => browserErrors.push(`[${label}] ${error.message}`));
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.evaluate((value) => {
    localStorage.setItem("color-escape-save-v1", JSON.stringify(value));
  }, save);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState != null);
  await installPointerTrace(page);
  return page;
};

const loadFixture = async (page) => {
  await page.evaluate((id) => window.__COLOR_ESCAPE__.loadLevel(id, true), levelId);
  await page.waitForFunction((id) => {
    const state = window.__COLOR_ESCAPE__?.getDebugState();
    return state?.screen === "playing" && state?.puzzle?.levelId === id;
  }, levelId);
  await page.evaluate(({ movingId, collisionId }) => {
    const game = window.__COLOR_ESCAPE__;
    if (!game?.model) throw new Error("Drag-continuity E2E: game model is missing");

    // Keep this input-runtime regression independent from authored campaign
    // counters. The real Lv5 board supplies the playable geometry, while the
    // two unfrozen, differently colored blocks recreate the collision corner
    // that this suite exercises.
    game.model.blocks = [
      {
        id: movingId,
        x: 4,
        y: 5,
        shape: [[0, 0], [0, 1]],
        color: "blue",
        layers: ["blue"],
        frozen: 0,
      },
      {
        id: collisionId,
        x: 3,
        y: 4,
        shape: [[0, 0], [0, 1], [0, 2]],
        color: "green",
        layers: ["green"],
        frozen: 0,
      },
    ];
    game.model.history = [];
    game.model.pendingHistory = undefined;
    game.model.pendingActionMutated = false;
    game.selectedId = undefined;
    game.activePointer = undefined;
    game.dragVisual = undefined;
    game.blockerFocusBlockId = undefined;
    game.blockerFocusTime = 0;
    game.dirty = true;
  }, { movingId: blockId, collisionId: blockerId });
  await page.waitForTimeout(80);
  const state = await debug(page);
  const block = blockFrom(state);
  const blocker = state.puzzle.blocks.find((candidate) => candidate.id === blockerId);
  assert(state.level.name === "轻装复盘", `Drag-continuity E2E: Lv5 name drifted to ${state.level.name}`);
  assert(block && block.x === fixtureX && block.y === 5 && block.frozen === 0,
    `Drag-continuity E2E: ${blockId} fixture moved ${JSON.stringify(block)}`);
  assert(JSON.stringify(block.shape) === JSON.stringify([[0, 0], [0, 1]]),
    `Drag-continuity E2E: ${blockId} is no longer a vertical two-cell block`);
  assert(blocker && blocker.x === 3 && blocker.y === 4 && blocker.frozen === 0,
    `Drag-continuity E2E: ${blockerId} fixture moved ${JSON.stringify(blocker)}`);
  assert(state.puzzle.moves === 0 && state.puzzle.started === false,
    `Drag-continuity E2E: fresh Lv5 was not pristine ${JSON.stringify({ moves: state.puzzle.moves, started: state.puzzle.started })}`);
  return {
    state,
    start: anchorPoint(page, state, fixtureX, 5),
    collision: anchorPoint(page, state, 1, 5),
    turn: anchorPoint(page, state, 1, 6),
    directDown: anchorPoint(page, state, fixtureX, 6),
  };
};

const beginNativeGesture = async (page, input, start) => {
  await input.hover(start);
  await clearPointerTrace(page);
  await input.down(start);
};

const assertBlocked = (state, expectedY, expectedMoves) => {
  const block = blockFrom(state);
  assert(block && block.x === fixtureX && block.y === expectedY,
    `Drag-continuity E2E: collision changed the grid pose ${JSON.stringify(block)}`);
  assert(state.selectedId === blockId && state.activePointer != null,
    `Drag-continuity E2E: collision lost pointer ownership ${JSON.stringify({ selectedId: state.selectedId, activePointer: state.activePointer })}`);
  assert(state.dragMotion?.blockId === blockId && state.dragMotion.state === "dragging"
    && state.dragMotion.gridX === fixtureX && state.dragMotion.gridY === expectedY
    && near(state.dragMotion.visualX, fixtureX) && near(state.dragMotion.visualY, expectedY),
  `Drag-continuity E2E: collision left an invalid floating pose ${JSON.stringify(state.dragMotion)}`);
  assert(state.selectionFeedback?.mode === "blocked",
    `Drag-continuity E2E: collision lacked blocked feedback ${JSON.stringify(state.selectionFeedback)}`);
  assert(state.blockerFocus?.blockId === blockerId,
    `Drag-continuity E2E: collision did not identify ${blockerId} ${JSON.stringify(state.blockerFocus)}`);
  assert(state.puzzle.moves === expectedMoves,
    `Drag-continuity E2E: collision counted a move (${state.puzzle.moves} !== ${expectedMoves})`);
};

const assertReleasedAt = (state, x, y, moves, label) => {
  const block = blockFrom(state);
  assert(block && block.x === x && block.y === y,
    `Drag-continuity E2E: ${label} ended at ${JSON.stringify(block)} instead of (${x},${y})`);
  assert(state.puzzle.moves === moves,
    `Drag-continuity E2E: ${label} counted ${state.puzzle.moves} moves instead of ${moves}`);
  assert(state.selectedId == null && state.activePointer == null,
    `Drag-continuity E2E: ${label} retained pointer ownership ${JSON.stringify({ selectedId: state.selectedId, activePointer: state.activePointer })}`);
};

const assertTimerAdvanced = (before, after, label) => {
  assert(typeof before === "number" && typeof after === "number" && before - after >= 0.35,
    `Drag-continuity E2E: ${label} paused the running timer ${before} -> ${after}`);
};

const assertTraceTypes = (trace, expected, label) => {
  const actual = trace.map(({ type }) => type);
  assert(JSON.stringify(actual) === JSON.stringify(expected),
    `Drag-continuity E2E: ${label} emitted ${JSON.stringify(actual)} instead of ${JSON.stringify(expected)}`);
  assert(new Set(trace.map(({ id }) => id)).size === 1,
    `Drag-continuity E2E: ${label} changed pointer ownership in the native event stream`);
};

const startRunningTimer = async (page, input, fixture) => {
  await beginNativeGesture(page, input, fixture.start);
  await input.move(fixture.directDown);
  await input.up(fixture.directDown);
  await page.waitForTimeout(80);
  const state = await debug(page);
  assertReleasedAt(state, fixtureX, 6, 1, "timer priming drag");
  assert(state.puzzle.started === true, "Drag-continuity E2E: legal priming drag did not start the timer");
  return state;
};

const browser = await chromium.launch({ headless: true });

const runCase = async (name, test) => {
  let page;
  try {
    page = await createPage(browser, name);
    const session = await page.context().newCDPSession(page);
    await test(page, nativePointer(session));
    console.log(`PASS ${name}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    failures.push(`${name}: ${message}`);
    console.error(`FAIL ${name}: ${message}`);
  } finally {
    await page?.close();
  }
};

await runCase("Lv5 collision turn keeps one pointer", async (page, input) => {
  const fixture = await loadFixture(page);
  await beginNativeGesture(page, input, fixture.start);
  await input.move(fixture.collision);
  let state = await debug(page);
  assertBlocked(state, 5, 0);
  const owner = state.activePointer;
  const collisionFrame = await page.screenshot({ type: "png" });
  assert(collisionFrame.byteLength > 1_000, "Drag-continuity E2E: collision screenshot was empty");

  await input.move(fixture.turn);
  state = await debug(page);
  const turned = blockFrom(state);
  assert(turned && turned.x === fixtureX && turned.y === 6,
    `Drag-continuity E2E: held orthogonal turn stayed stuck ${JSON.stringify(turned)}`);
  assert(state.selectedId === blockId && state.activePointer === owner,
    `Drag-continuity E2E: held orthogonal turn required a re-grab ${JSON.stringify({ selectedId: state.selectedId, activePointer: state.activePointer, owner })}`);
  assert(state.dragMotion?.gridX === fixtureX && state.dragMotion.gridY === 6
    && near(state.dragMotion.visualX, fixtureX) && near(state.dragMotion.visualY, 6),
  `Drag-continuity E2E: held orthogonal turn visual/grid poses diverged ${JSON.stringify(state.dragMotion)}`);
  assert(state.puzzle.moves === 0, "Drag-continuity E2E: held turn committed before release");
  const turnFrame = await page.screenshot({ type: "png" });
  assert(turnFrame.byteLength > 1_000, "Drag-continuity E2E: turn screenshot was empty");

  await input.up(fixture.turn);
  await page.waitForTimeout(100);
  state = await debug(page);
  assertReleasedAt(state, fixtureX, 6, 1, "held orthogonal turn");
  assertTraceTypes(await pointerTrace(page), ["pointerdown", "pointermove", "pointermove", "pointerup"], "held orthogonal turn");
});

await runCase("running timer ignores a stationary cross-frame hold", async (page, input) => {
  const fixture = await loadFixture(page);
  let state = await startRunningTimer(page, input, fixture);
  const point = anchorPoint(page, state, fixtureX, 6);
  const before = state.puzzle.remainingSeconds;

  await beginNativeGesture(page, input, point);
  await page.waitForTimeout(850);
  state = await debug(page);
  assertTimerAdvanced(before, state.puzzle.remainingSeconds, "stationary held pointer");
  assert(blockFrom(state)?.x === fixtureX && blockFrom(state)?.y === 6 && state.puzzle.moves === 1,
    `Drag-continuity E2E: stationary hold mutated the puzzle ${JSON.stringify({ block: blockFrom(state), moves: state.puzzle.moves })}`);
  assert(state.selectedId === blockId && state.activePointer != null,
    "Drag-continuity E2E: stationary hold lost pointer ownership across frames");

  await input.up(point);
  await page.waitForTimeout(60);
  state = await debug(page);
  assertReleasedAt(state, fixtureX, 6, 1, "stationary cross-frame hold");
  assertTraceTypes(await pointerTrace(page), ["pointerdown", "pointerup"], "stationary cross-frame hold");
});

await runCase("running timer ignores a cross-frame wall hold", async (page, input) => {
  const fixture = await loadFixture(page);
  let state = await startRunningTimer(page, input, fixture);
  const point = anchorPoint(page, state, fixtureX, 6);
  const collision = anchorPoint(page, state, 1, 6);

  await beginNativeGesture(page, input, point);
  await input.move(collision);
  state = await debug(page);
  assertBlocked(state, 6, 1);
  const before = state.puzzle.remainingSeconds;
  await page.waitForTimeout(850);
  state = await debug(page);
  assertTimerAdvanced(before, state.puzzle.remainingSeconds, "blocked held pointer");
  assert(blockFrom(state)?.x === fixtureX && blockFrom(state)?.y === 6 && state.puzzle.moves === 1,
    `Drag-continuity E2E: wall hold mutated the puzzle ${JSON.stringify({ block: blockFrom(state), moves: state.puzzle.moves })}`);

  await input.up(collision);
  await page.waitForTimeout(60);
  state = await debug(page);
  assertReleasedAt(state, fixtureX, 6, 1, "cross-frame wall hold");
  assertTraceTypes(await pointerTrace(page), ["pointerdown", "pointermove", "pointerup"], "cross-frame wall hold");
});

await runCase("pointerup supplies the final orthogonal sample", async (page, input) => {
  const fixture = await loadFixture(page);
  await beginNativeGesture(page, input, fixture.start);
  await input.move(fixture.collision);
  let state = await debug(page);
  assertBlocked(state, 5, 0);

  // Deliberately omit a pointermove at fixture.turn. A real Chromium pointerup
  // carries the only final coordinate sample, matching a sparse/coalesced input
  // stream rather than synthesizing a DOM PointerEvent in page JavaScript.
  await input.up(fixture.turn);
  await page.waitForTimeout(100);
  const trace = await pointerTrace(page);
  assertTraceTypes(trace, ["pointerdown", "pointermove", "pointerup"], "pointerup final sample");
  assert(near(trace[1]?.x, fixture.collision.x, 0.1) && near(trace[1]?.y, fixture.collision.y, 0.1),
    `Drag-continuity E2E: collision move coordinates drifted ${JSON.stringify(trace[1])}`);
  assert(near(trace[2]?.x, fixture.turn.x, 0.1) && near(trace[2]?.y, fixture.turn.y, 0.1),
    `Drag-continuity E2E: pointerup did not carry the final coordinate ${JSON.stringify(trace[2])}`);

  state = await debug(page);
  assertReleasedAt(state, fixtureX, 6, 1, "pointerup final sample");
});

await browser.close();

if (browserErrors.length) failures.push(`browser errors:\n${browserErrors.join("\n")}`);
if (failures.length) {
  throw new Error(`Drag-continuity E2E failed:\n${failures.join("\n")}`);
}

console.log("Drag continuity passed: Lv5 collision turn, pointerup final sample, and cross-frame no-op/wall timing.");
