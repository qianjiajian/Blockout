import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";

const output = fileURLToPath(new URL("../playtest-results/mechanic-causality/", import.meta.url));
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
  boosters: { time: 3, rocket: 3, pulse: 3 },
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
const screenPoint = (logical) => {
  const viewport = page.viewportSize();
  const scale = Math.min(viewport.width / 496, viewport.height / 1078);
  return {
    x: (viewport.width - 496 * scale) / 2 + logical.x * scale,
    y: (viewport.height - 1078 * scale) / 2 + logical.y * scale,
  };
};
const cellPoint = (board, x, y) => ({
  x: board.innerX + (x + 0.5) * board.cell,
  y: board.innerY + (y + 0.5) * board.cell,
});
const seed = async (reducedMotion = false) => {
  await page.goto(playtestUrl, { waitUntil: "networkidle" });
  await page.evaluate((value) => localStorage.setItem("color-escape-save-v1", JSON.stringify(value)), save(reducedMotion));
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForFunction(() => Boolean(window.__COLOR_ESCAPE__?.getDebugState().art?.ready));
};
const openLevel = async (levelId) => {
  await page.evaluate((id) => window.__COLOR_ESCAPE__.loadLevel(id, true), levelId);
  await page.waitForTimeout(90);
  const state = await debug();
  if (state.screen !== "playing" || state.level.id !== levelId) {
    throw new Error(`Mechanic causality E2E: expected playing Lv${levelId}`);
  }
};
const beginSolverDrag = async (drag) => {
  const state = await debug();
  const block = state.puzzle.blocks.find((candidate) => candidate.id === drag.blockId);
  if (!block) throw new Error(`Mechanic causality E2E: missing route block ${drag.blockId}`);
  const [anchorX, anchorY] = block.shape[0];
  const start = screenPoint(cellPoint(state.board, block.x + anchorX, block.y + anchorY));
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  for (const [x, y] of drag.path) {
    const target = screenPoint(cellPoint(state.board, x + anchorX, y + anchorY));
    await page.mouse.move(target.x, target.y, { steps: 3 });
  }
};
const replayPrefixToHeldEvent = async (prefix) => {
  if (!prefix.length || !prefix.at(-1).exitSide) throw new Error("Mechanic causality E2E: event prefix lacks an exit");
  for (let index = 0; index < prefix.length - 1; index += 1) {
    await beginSolverDrag(prefix[index]);
    await page.mouse.up();
    await page.waitForTimeout(prefix[index].exitSide ? 760 : 190);
  }
  await beginSolverDrag(prefix.at(-1));
};
const pulse = (state, kind, targetId) => state.mechanicPulses.find((candidate) => (
  candidate.kind === kind && (!targetId || candidate.targetId === targetId)
));

await seed(false);
const routes = await page.evaluate(async () => {
  const [{ getLevel }, { solveLevelForValidation }, { PuzzleModel }, { detectMechanicEvents }] = await Promise.all([
    import("/src/core/levels.ts"),
    import("/src/core/levelSolver.ts"),
    import("/src/core/PuzzleModel.ts"),
    import("/src/core/mechanicEvents.ts"),
  ]);
  const routeUntil = (levelId, kind) => {
    const level = getLevel(levelId);
    const solution = solveLevelForValidation(level);
    if (!solution.solved) throw new Error(`Mechanic causality E2E: no validation route for Lv${levelId}`);
    const model = new PuzzleModel(level);
    const prefix = [];
    for (const drag of solution.drags) {
      const before = model.snapshot();
      model.beginAction();
      for (const [x, y] of drag.path) model.moveBlock(drag.blockId, x, y);
      if (drag.exitSide) model.tryExit(drag.blockId, drag.exitSide);
      model.commitAction();
      const after = model.snapshot();
      prefix.push(drag);
      const event = detectMechanicEvents(before, after).find((candidate) => (
        kind === "generator"
          ? candidate.kind === "shutter" && candidate.skin === "generator" && candidate.unlocked
          : candidate.kind === kind
      ));
      if (event) return { prefix, event };
    }
    throw new Error(`Mechanic causality E2E: ${kind} event absent from Lv${levelId}`);
  };
  return {
    generator: routeUntil(35, "generator"),
    conveyor: routeUntil(70, "conveyor"),
  };
});

await openLevel(35);
await replayPrefixToHeldEvent(routes.generator.prefix);
await page.waitForTimeout(70);
let state = await debug();
let eventPulse = pulse(state, "shutter", routes.generator.event.id);
const generatorRelayQueued = eventPulse?.phase === "queued" && eventPulse.relay?.visible
  && eventPulse.relay.progress > 0 && eventPulse.relay.progress < 1;
const generatorRelayCompleted = eventPulse?.phase === "visible" && eventPulse.relay?.progress === 1;
if (!eventPulse || eventPulse.shutterSkin !== "generator" || eventPulse.label !== "载荷放出"
  || !eventPulse.relay?.artReady || (!generatorRelayQueued && !generatorRelayCompleted)) {
  throw new Error(`Mechanic causality E2E: generator relay contract failed ${JSON.stringify(eventPulse)}`);
}
await page.screenshot({ path: resolve(output, "01-lv35-generator-relay-720x1584.png") });
await page.mouse.up();
await page.waitForTimeout(220);
state = await debug();
eventPulse = pulse(state, "shutter", routes.generator.event.id);
if (!eventPulse || eventPulse.phase !== "visible" || eventPulse.label !== "载荷放出") {
  throw new Error("Mechanic causality E2E: generator target response did not follow its relay");
}
await page.screenshot({ path: resolve(output, "02-lv35-generator-open-720x1584.png") });

await page.waitForTimeout(720);
await openLevel(70);
await replayPrefixToHeldEvent(routes.conveyor.prefix);
await page.waitForTimeout(70);
state = await debug();
eventPulse = pulse(state, "conveyor", routes.conveyor.event.id);
const conveyorRelayQueued = eventPulse?.phase === "queued" && eventPulse.relay?.visible
  && eventPulse.relay.progress > 0 && eventPulse.relay.progress < 1 && eventPulse.motion?.progress === 0;
const conveyorRelayCompleted = eventPulse?.phase === "visible" && eventPulse.relay?.progress === 1
  && (eventPulse.motion?.progress ?? 0) > 0 && (eventPulse.motion?.progress ?? 1) < 1;
if (!eventPulse || eventPulse.label !== "传送推进" || !eventPulse.relay?.artReady
  || (!conveyorRelayQueued && !conveyorRelayCompleted)) {
  throw new Error(`Mechanic causality E2E: conveyor queued contract failed ${JSON.stringify(eventPulse)}`);
}
await page.screenshot({ path: resolve(output, "03-lv70-conveyor-relay-720x1584.png") });
await page.mouse.up();
await page.waitForTimeout(720);
await openLevel(70);
await replayPrefixToHeldEvent(routes.conveyor.prefix);
await page.waitForTimeout(40);
state = await debug();
let movedBlock = state.puzzle.blocks.find((candidate) => candidate.id === routes.conveyor.event.id);
if (!movedBlock || movedBlock.x !== routes.conveyor.event.to[0] || movedBlock.y !== routes.conveyor.event.to[1]) {
  throw new Error("Mechanic causality E2E: conveyor model destination was not committed before feedback");
}
const [movedCellX, movedCellY] = movedBlock.shape[0];
const movedPoint = screenPoint(cellPoint(state.board, movedBlock.x + movedCellX, movedBlock.y + movedCellY));
await page.mouse.up();
await page.mouse.move(movedPoint.x, movedPoint.y);
let observedLiveConveyorMotion = false;
try {
  await page.waitForFunction((targetId) => {
    const active = window.__COLOR_ESCAPE__.getDebugState().mechanicPulses.find((candidate) => (
      candidate.kind === "conveyor" && candidate.targetId === targetId
    ));
    return active?.motion?.progress > 0 && active.motion.progress < 1;
  }, routes.conveyor.event.id, { timeout: 500 });
  observedLiveConveyorMotion = true;
} catch (error) {
  if (error?.name !== "TimeoutError") throw error;
}
if (observedLiveConveyorMotion) {
  await page.mouse.down();
  state = await debug();
  eventPulse = pulse(state, "conveyor", routes.conveyor.event.id);
  const conveyorStillMoving = Boolean(eventPulse && (eventPulse.motion?.progress ?? 1) < 1);
  if (conveyorStillMoving && state.activePointer != null) {
    throw new Error(`Mechanic causality E2E: input reached the model while the payload was visually in transit ${JSON.stringify(eventPulse)}`);
  }
  await page.mouse.up();
}
state = await debug();
eventPulse = pulse(state, "conveyor", routes.conveyor.event.id);
if (eventPulse && eventPulse.phase !== "visible") {
  throw new Error(`Mechanic causality E2E: conveyor target response disappeared after the relay ${JSON.stringify(eventPulse)}`);
}
movedBlock = state.puzzle.blocks.find((candidate) => candidate.id === routes.conveyor.event.id);
if (!movedBlock || movedBlock.x !== routes.conveyor.event.to[0] || movedBlock.y !== routes.conveyor.event.to[1]) {
  throw new Error("Mechanic causality E2E: conveyor visual did not correspond to the authoritative model destination");
}
await page.screenshot({ path: resolve(output, "04-lv70-conveyor-motion-720x1584.png") });
await page.waitForFunction((targetId) => {
  const active = window.__COLOR_ESCAPE__.getDebugState().mechanicPulses.find((candidate) => (
    candidate.kind === "conveyor" && candidate.targetId === targetId
  ));
  return !active || active.motion?.progress === 1;
}, routes.conveyor.event.id, { timeout: 500 });
state = await debug();
eventPulse = pulse(state, "conveyor", routes.conveyor.event.id);
if (eventPulse && eventPulse.motion?.progress !== 1) throw new Error("Mechanic causality E2E: conveyor motion did not settle at the model pose");
await page.mouse.move(movedPoint.x, movedPoint.y);
await page.mouse.down();
if ((await debug()).activePointer == null) throw new Error("Mechanic causality E2E: payload remained input-locked after its motion settled");
await page.mouse.up();

await page.setViewportSize({ width: 320, height: 568 });
await seed(true);
await openLevel(70);
await replayPrefixToHeldEvent(routes.conveyor.prefix);
await page.waitForTimeout(55);
state = await debug();
eventPulse = pulse(state, "conveyor", routes.conveyor.event.id);
if (!eventPulse || eventPulse.relay?.visible || ![0, 1].includes(eventPulse.motion?.progress)
  || state.boardShakeTime !== 0) {
  throw new Error(`Mechanic causality E2E: reduced motion did not suppress traveling feedback ${JSON.stringify(eventPulse)}`);
}
await page.screenshot({ path: resolve(output, "05-lv70-reduced-no-travel-320x568.png") });
await page.mouse.up();
await page.waitForFunction((targetId) => {
  const active = window.__COLOR_ESCAPE__.getDebugState().mechanicPulses.find((candidate) => (
    candidate.kind === "conveyor" && candidate.targetId === targetId
  ));
  return active?.phase === "visible" && active.motion?.progress === 1;
}, routes.conveyor.event.id, { timeout: 500 });
state = await debug();
eventPulse = pulse(state, "conveyor", routes.conveyor.event.id);
if (!eventPulse || eventPulse.phase !== "visible" || eventPulse.motion?.progress !== 1 || state.boardShakeTime !== 0) {
  throw new Error("Mechanic causality E2E: reduced motion did not settle directly into a static target response");
}
await page.screenshot({ path: resolve(output, "06-lv70-reduced-target-320x568.png") });

const report = {
  method: "Authoritative validation route replayed through real Pointer input; assertions inspect only already-triggered generator and conveyor events.",
  generator: routes.generator.event,
  conveyor: routes.conveyor.event,
  relayAsset: "assets/art/fx/mechanic-relay-mote-v1.png",
  standardRelay: true,
  reducedMotionRelay: false,
  browserErrors: errors,
};
await writeFile(resolve(output, "mechanic-causality-report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");

await context.close();
await browser.close();
if (errors.length) throw new Error(`Mechanic causality browser errors:\n${errors.join("\n")}`);
console.log("Generator naming, exit-to-target relay, conveyor glide, input lock, reduced motion, DPR2, and 320x568 passed.");
