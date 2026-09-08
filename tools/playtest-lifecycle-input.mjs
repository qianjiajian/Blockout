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

// A document can be hidden before the game is constructed (for example when a
// background tab restores on browser launch). It must not arm a rollover timer
// until the first real foreground transition.
const hiddenContext = await browser.newContext({ viewport: { width: 496, height: 1078 } });
await hiddenContext.addInitScript(() => {
  let hidden = true;
  Object.defineProperty(document, "hidden", { configurable: true, get: () => hidden });
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => hidden ? "hidden" : "visible",
  });
  Object.defineProperty(globalThis, "__lifecycleInitialVisibility", {
    configurable: true,
    value: {
      show() {
        hidden = false;
        document.dispatchEvent(new Event("visibilitychange"));
      },
    },
  });
});
const hiddenPage = await hiddenContext.newPage();
hiddenPage.on("console", (message) => { if (message.type() === "error") errors.push(`[hidden-start] ${message.text()}`); });
hiddenPage.on("pageerror", (error) => errors.push(`[hidden-start] ${error.message}`));
await hiddenPage.goto(playtestUrl, { waitUntil: "networkidle" });
await hiddenPage.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState != null);
let hiddenStartState = await hiddenPage.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
if (hiddenStartState.daily.rolloverWatchScheduled !== false) {
  throw new Error("Lifecycle E2E: hidden initial load armed the daily rollover watch");
}
await hiddenPage.evaluate(() => globalThis.__lifecycleInitialVisibility.show());
await hiddenPage.waitForFunction(() => window.__COLOR_ESCAPE__.getDebugState().daily.rolloverWatchScheduled === true);
hiddenStartState = await hiddenPage.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
if (hiddenStartState.daily.rolloverWatchScheduled !== true) {
  throw new Error("Lifecycle E2E: first foreground transition did not arm the daily rollover watch");
}
await hiddenContext.close();

const page = await browser.newPage({ viewport: { width: 496, height: 1078 } });
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(error.message));

await page.goto(playtestUrl, { waitUntil: "networkidle" });
await page.evaluate(() => localStorage.setItem("color-escape-save-v1", JSON.stringify({
  schemaVersion: 1,
  currentLevel: 1,
  highestLevel: 30,
  coins: 1000,
  sound: false,
  haptic: false,
  featureSeen: ["basics", "ice-door", "ice-block", "layer", "shutter"],
  boosters: { time: 3, rocket: 3, pulse: 3 },
  bestStars: {},
  bestMoves: {},
  rewardedLevels: [],
  dailyStreak: 0,
  lastDailyCompletedDay: "",
})));
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(400);

const debug = () => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const point = (board, x, y) => ({ x: board.innerX + (x + 0.5) * board.cell, y: board.innerY + (y + 0.5) * board.cell });
const dispatchPointer = (type, pointerId, position, buttons = 0) => page.evaluate(({ type, pointerId, position, buttons }) => {
  const canvas = document.querySelector("canvas");
  if (!canvas) throw new Error("Lifecycle E2E: canvas is missing");
  const originalCapture = canvas.setPointerCapture;
  canvas.setPointerCapture = () => {};
  try {
    canvas.dispatchEvent(new PointerEvent(type, {
      pointerId,
      pointerType: "touch",
      clientX: position.x,
      clientY: position.y,
      buttons,
      bubbles: true,
      cancelable: true,
    }));
  } finally {
    canvas.setPointerCapture = originalCapture;
  }
}, { type, pointerId, position, buttons });

const setVisibility = (hidden) => page.evaluate((nextHidden) => {
  Object.defineProperty(document, "hidden", { configurable: true, value: nextHidden });
  Object.defineProperty(document, "visibilityState", { configurable: true, value: nextHidden ? "hidden" : "visible" });
  document.dispatchEvent(new Event("visibilitychange"));
}, hidden);

// Lv1 is intentionally a two-drag direct-clear tutorial. Lifecycle ownership
// needs a parking move that remains active after its first grid step, so use a
// real non-exit drag from Lv2 instead of adding artificial friction to Lv1.
const openingDrag = await page.evaluate(async () => {
  const [{ LEVELS }, { solveLevelForValidation }] = await Promise.all([
    import("/src/core/levels.ts"),
    import("/src/core/levelSolver.ts"),
  ]);
  return solveLevelForValidation(LEVELS[1]).drags.find((drag) => !drag.exitSide && drag.path.length > 0);
});
if (!openingDrag?.path.length) throw new Error("Lifecycle E2E: level 2 has no parking drag");

const blockPoint = (state, block, x = block.x, y = block.y) => {
  const [anchorX, anchorY] = block.shape[0];
  return point(state.board, x + anchorX, y + anchorY);
};
const completePointerDrag = async (pointerId, drag) => {
  const initial = await debug();
  const initialBlock = initial.puzzle.blocks.find((item) => item.id === drag.blockId);
  if (!initialBlock) throw new Error(`Lifecycle E2E: missing ${drag.blockId} before drag continuation`);
  for (const [x, y] of drag.path.slice(1)) {
    const live = await debug();
    const block = live.puzzle.blocks.find((item) => item.id === drag.blockId);
    if (!block) throw new Error(`Lifecycle E2E: missing ${drag.blockId} during drag`);
    await dispatchPointer("pointermove", pointerId, blockPoint(live, block, x, y), 1);
  }
  let live = await debug();
  const block = live.puzzle.blocks.find((item) => item.id === drag.blockId);
  let release = block ? blockPoint(live, block) : blockPoint(initial, initialBlock, ...(drag.path.at(-1) ?? [initialBlock.x, initialBlock.y]));
  if (drag.exitSide) {
    const expectedLayers = Math.max(0, initialBlock.layers.length - 1);
    if (live.selectedId || live.activePointer !== undefined
      || (expectedLayers === 0 && block)
      || (expectedLayers > 0 && (!block || block.layers.length !== expectedLayers))) {
      throw new Error(`Lifecycle E2E: ${drag.blockId} did not resolve while pointer ${pointerId} stayed down`);
    }
  } else if (!block) {
    throw new Error(`Lifecycle E2E: ${drag.blockId} left during a parking drag`);
  }
  await dispatchPointer("pointerup", pointerId, release, 0);
};

// A platform pointer cancellation must roll back the partial drag and leave no move or undo history.
await page.evaluate(() => window.__COLOR_ESCAPE__.loadLevel(2, true));
let state = await debug();
let board = state.board;
let openingBlock = state.puzzle.blocks.find((block) => block.id === openingDrag.blockId);
if (!openingBlock) throw new Error(`Lifecycle E2E: missing opening block ${openingDrag.blockId}`);
const openingOrigin = { x: openingBlock.x, y: openingBlock.y };
const firstCell = openingDrag.path[0];
await dispatchPointer("pointerdown", 7, blockPoint(state, openingBlock), 1);
await dispatchPointer("pointermove", 7, blockPoint(state, openingBlock, firstCell[0], firstCell[1]), 1);
state = await debug();
if (state.puzzle.blocks.find((block) => block.id === openingDrag.blockId)?.x !== firstCell[0]
  || state.puzzle.blocks.find((block) => block.id === openingDrag.blockId)?.y !== firstCell[1]
  || state.activePointer !== 7) {
  throw new Error("Lifecycle E2E: partial pointer drag did not begin");
}
await dispatchPointer("pointercancel", 7, blockPoint(state, openingBlock, firstCell[0], firstCell[1]), 0);
state = await debug();
const cancelledBlock = state.puzzle.blocks.find((block) => block.id === openingDrag.blockId);
if (!cancelledBlock || cancelledBlock.x !== openingOrigin.x || cancelledBlock.y !== openingOrigin.y
  || state.puzzle.moves !== 0 || state.selectedId || state.activePointer != null) {
  throw new Error("Lifecycle E2E: pointercancel did not restore the pre-drag snapshot");
}
await page.screenshot({ path: shot("round12-pointer-cancel-restored.png") });

// A second finger cannot steal the selected block or mutate another block while the first drag owns input.
await page.evaluate(() => window.__COLOR_ESCAPE__.loadLevel(2, true));
state = await debug();
board = state.board;
openingBlock = state.puzzle.blocks.find((block) => block.id === openingDrag.blockId);
const guardedBlock = state.puzzle.blocks.find((block) => block.id !== openingDrag.blockId && !block.shutterId);
if (!openingBlock || !guardedBlock) throw new Error("Lifecycle E2E: level 2 needs two visible blocks for ownership coverage");
const guardedOrigin = { x: guardedBlock.x, y: guardedBlock.y };
await dispatchPointer("pointerdown", 11, blockPoint(state, openingBlock), 1);
await dispatchPointer("pointermove", 11, blockPoint(state, openingBlock, firstCell[0], firstCell[1]), 1);
await dispatchPointer("pointerdown", 12, blockPoint(state, guardedBlock), 1);
await dispatchPointer("pointermove", 12, { x: blockPoint(state, guardedBlock).x + board.cell, y: blockPoint(state, guardedBlock).y }, 1);
await dispatchPointer("pointerup", 12, blockPoint(state, guardedBlock), 0);
state = await debug();
const guardedAfter = state.puzzle.blocks.find((block) => block.id === guardedBlock.id);
if (state.selectedId !== openingDrag.blockId || state.activePointer !== 11 || !guardedAfter
  || guardedAfter.x !== guardedOrigin.x || guardedAfter.y !== guardedOrigin.y) {
  throw new Error("Lifecycle E2E: a second pointer stole or changed the active drag");
}
await dispatchPointer("pointermove", 11, blockPoint(state, openingBlock, firstCell[0], firstCell[1]), 1);
state = await debug();
const ownerAfterForeignPointer = state.puzzle.blocks.find((block) => block.id === openingDrag.blockId);
if (!ownerAfterForeignPointer || ownerAfterForeignPointer.x !== firstCell[0] || ownerAfterForeignPointer.y !== firstCell[1]
  || !state.dragMotion
  || Math.abs(state.dragMotion.visualX - firstCell[0]) > 0.03
  || Math.abs(state.dragMotion.visualY - firstCell[1]) > 0.03) {
  throw new Error("Lifecycle E2E: a foreign pointer polluted the owner's next movement delta");
}
await completePointerDrag(11, openingDrag);
await page.waitForTimeout(40);
state = await debug();
if (state.puzzle.moves !== 1) {
  throw new Error("Lifecycle E2E: original pointer could not finish after the second pointer was ignored");
}
await page.screenshot({ path: shot("round12-multitouch-owner-preserved.png") });

// Hiding the app during a drag must roll back, pause, and resume with a clean undo stack.
await page.evaluate(() => window.__COLOR_ESCAPE__.loadLevel(2, true));
state = await debug();
board = state.board;
openingBlock = state.puzzle.blocks.find((block) => block.id === openingDrag.blockId);
if (!openingBlock) throw new Error(`Lifecycle E2E: missing opening block ${openingDrag.blockId}`);
await dispatchPointer("pointerdown", 21, blockPoint(state, openingBlock), 1);
await dispatchPointer("pointermove", 21, blockPoint(state, openingBlock, firstCell[0], firstCell[1]), 1);
await setVisibility(true);
await page.waitForTimeout(30);
state = await debug();
const hiddenBlock = state.puzzle.blocks.find((block) => block.id === openingDrag.blockId);
if (state.screen !== "paused" || !hiddenBlock || hiddenBlock.x !== openingOrigin.x || hiddenBlock.y !== openingOrigin.y
  || state.puzzle.moves !== 0 || state.selectedId || state.activePointer != null
  || state.daily.rolloverWatchScheduled !== false) {
  throw new Error("Lifecycle E2E: hiding during drag did not roll back and pause safely");
}
await page.screenshot({ path: shot("round12-hide-during-drag-paused.png") });

await setVisibility(false);
await page.mouse.click(248, 755);
await page.waitForTimeout(30);
state = await debug();
if (state.screen !== "playing"
  || state.puzzle.blocks.find((block) => block.id === openingDrag.blockId)?.x !== openingOrigin.x
  || state.puzzle.blocks.find((block) => block.id === openingDrag.blockId)?.y !== openingOrigin.y
  || state.daily.rolloverWatchScheduled !== true) {
  throw new Error("Lifecycle E2E: resume did not preserve the rolled-back board");
}

board = state.board;
openingBlock = state.puzzle.blocks.find((block) => block.id === openingDrag.blockId);
await dispatchPointer("pointerdown", 22, blockPoint(state, openingBlock), 1);
await dispatchPointer("pointermove", 22, blockPoint(state, openingBlock, firstCell[0], firstCell[1]), 1);
await completePointerDrag(22, openingDrag);
await page.waitForTimeout(340);
await page.mouse.click(54, 140);
await page.waitForTimeout(30);
state = await debug();
const undoneBlock = state.puzzle.blocks.find((block) => block.id === openingDrag.blockId);
if (!undoneBlock || undoneBlock.x !== openingOrigin.x || undoneBlock.y !== openingOrigin.y || state.puzzle.moves !== 0
  || state.particles !== 0 || state.exitGhosts !== 0 || state.exitPulses.length !== 0
  || state.mechanicPulses.length !== 0 || state.boardShakeTime !== 0) {
  throw new Error("Lifecycle E2E: interrupted drag poisoned the next action's undo history");
}
await page.screenshot({ path: shot("round12-resume-undo-clean.png") });

await page.close();
await browser.close();
if (errors.length) throw new Error(`Browser errors:\n${errors.join("\n")}`);
console.log("Hidden initial load, Pointer cancel rollback, multi-touch ownership, hide/resume, and clean undo history passed.");
