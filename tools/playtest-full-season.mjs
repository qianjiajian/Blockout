import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";
import { CHAPTER_FOUR_PROOF_ROUTES } from "./chapter-four-proof-routes.mjs";

const output = fileURLToPath(new URL("../playtest-results/", import.meta.url));
const shot = (name) => resolve(output, name);
const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
await mkdir(output, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 496, height: 1078 } });
page.setDefaultTimeout(300_000);
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(error.message));

await page.goto(playtestUrl, { waitUntil: "networkidle" });
await page.evaluate(() => localStorage.setItem("color-escape-save-v1", JSON.stringify({
  schemaVersion: 1,
  currentLevel: 1,
  highestLevel: 100,
  coins: 1000,
  sound: false,
  haptic: false,
  reducedMotion: true,
  featureSeen: ["basics", "ice-door", "ice-block", "layer", "shutter"],
  boosters: { time: 3, rocket: 3, pulse: 3 },
  bestStars: {},
  bestMoves: {},
  rewardedLevels: [],
  dailyStreak: 0,
  lastDailyCompletedDay: "",
})));
await page.reload({ waitUntil: "networkidle" });
await page.waitForFunction(
  () => window.__COLOR_ESCAPE__?.getDebugState().art.ready === true,
  undefined,
  { timeout: 15_000 },
);

// This answer source is deliberately independent from STANDARD_SOLUTIONS.
// Static levels get a complete route up front. Elevator levels are solved from
// live snapshots in a Web Worker while the game clock and device keep moving.
const requestedLevel = Number(process.env.PLAYTEST_LEVEL_ID);
const requestedFrom = Number(process.env.PLAYTEST_LEVEL_FROM);
const requestedTo = Number(process.env.PLAYTEST_LEVEL_TO);
const campaign = await page.evaluate(async ({ onlyLevel, fromLevel, toLevel, certifiedRoutes }) => {
  const [{ LEVELS }, { solveLevelForValidation }] = await Promise.all([
    import("/src/core/levels.ts"),
    import("/src/core/levelSolver.ts"),
  ]);
  return LEVELS.filter((level) => (
    onlyLevel ? level.id === onlyLevel : level.id >= fromLevel && level.id <= toLevel
  )).map((level) => {
    const hasWallClockElevator = (level.elevators?.length ?? 0) > 0;
    const certifiedRoute = certifiedRoutes[String(level.id)];
    return {
      levelId: level.id,
      name: level.name,
      difficulty: level.difficulty,
      parMoves: level.parMoves,
      clearLoad: level.blocks.reduce((sum, block) => sum + (block.layers?.length ?? 1), 0),
      hasWallClockElevator,
      solution: hasWallClockElevator
        ? undefined
        : certifiedRoute
          ? {
              solved: true,
              drags: certifiedRoute,
              minimumDrags: certifiedRoute.length,
              exploredStates: 0,
              termination: "permanent_chapter_four_certificate",
            }
          : solveLevelForValidation(level),
    };
  });
}, {
  onlyLevel: Number.isInteger(requestedLevel) && requestedLevel >= 1 ? requestedLevel : 0,
  fromLevel: Number.isInteger(requestedFrom) && requestedFrom >= 1 ? requestedFrom : 1,
  toLevel: Number.isInteger(requestedTo) && requestedTo <= 100 ? requestedTo : 100,
  certifiedRoutes: CHAPTER_FOUR_PROOF_ROUTES,
});

const isFullCampaign = (!Number.isInteger(requestedLevel) || requestedLevel < 1)
  && (!Number.isInteger(requestedFrom) || requestedFrom < 1)
  && (!Number.isInteger(requestedTo) || requestedTo > 100);
if (isFullCampaign && campaign.length !== 100) {
  throw new Error(`Full-season E2E: expected 100 levels, got ${campaign.length}`);
}
for (const level of campaign) {
  if (!level.hasWallClockElevator && !level.solution?.solved) {
    throw new Error(`Full-season E2E: validation route missing on level ${level.levelId}`);
  }
}

const debug = () => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const clickInteractionTarget = async (name) => {
  const state = await debug();
  const rect = state.interactionTargets?.targets?.[name]?.hit;
  const canvas = await page.locator("canvas").boundingBox();
  if (!rect || !canvas) throw new Error(`Full-season E2E: missing interaction target ${name}`);
  await page.mouse.click(
    canvas.x + state.viewportTransform.offsetX + (rect.x + rect.width / 2) * state.viewportTransform.scale,
    canvas.y + state.viewportTransform.offsetY + (rect.y + rect.height / 2) * state.viewportTransform.scale,
  );
};
const waitForScreen = async (screen) => {
  await page.waitForFunction(
    (expected) => window.__COLOR_ESCAPE__?.getDebugState().screen === expected,
    screen,
    { timeout: 3_000 },
  );
};
const logicalPoint = (board, blockX, blockY, anchorX, anchorY) => ({
  x: board.innerX + (blockX + anchorX + 0.5) * board.cell,
  y: board.innerY + (blockY + anchorY + 0.5) * board.cell,
});

// A certified route may encode an exit as an empty path when the block already
// occupies its matching edge cell. Press the cell furthest inside the board so
// the real pointer does not land under the rim/gate artwork; handleDown then
// resolves the already-aligned exit through the normal gameplay path.
const emptyExitAnchor = (shape, side) => shape.reduce((best, cell) => {
  if (side === "top") return cell[1] > best[1] ? cell : best;
  if (side === "bottom") return cell[1] < best[1] ? cell : best;
  if (side === "left") return cell[0] > best[0] ? cell : best;
  return cell[0] < best[0] ? cell : best;
}, shape[0]);

const isBlockActive = (block, snapshot) => {
  if (block.frozen > 0) return false;
  if (!block.shutterId) return true;
  const shutter = snapshot.shutters.find((item) => item.id === block.shutterId);
  return !shutter || shutter.count <= 0;
};

const puzzleSignature = (snapshot) => [
  snapshot.blocks.map((block) => `${block.id}@${block.x},${block.y}:${block.layers.join(",")}:${block.frozen}`).sort().join("|"),
  snapshot.gates.map((gate) => `${gate.id}:${gate.frozen}`).sort().join("|"),
  snapshot.shutters.map((shutter) => `${shutter.id}:${shutter.count}`).sort().join("|"),
].join(";");

const elevatorSignature = (snapshot) => snapshot.elevators
  .map((elevator) => `${elevator.id}@${elevator.x},${elevator.y}:${elevator.direction}`)
  .sort()
  .join("|");

const waitForInput = async () => {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const state = await debug();
    const conveyorInTransit = state.mechanicPulses.some((pulse) => (
      pulse.kind === "conveyor" && pulse.motion?.progress < 1
    ));
    if (state.exitGhosts === 0 && state.pendingCelebration <= 0 && !state.dragMotion && !conveyorInTransit) return state;
    await page.waitForTimeout(20);
  }
  throw new Error("Full-season E2E: input lock did not clear within 1.2 seconds");
};

let pointerGestures = 0;
let pointerGridSteps = 0;
let pointerTurns = 0;
const levelResults = [];
const visualCheckpoints = new Set([6, 10, 11, 16, 20, 21, 30, 40, 50, 60, 70, 80, 90, 100]);

const countTurns = (path) => {
  let turns = 0;
  let previousDirection;
  for (let index = 1; index < path.length; index += 1) {
    const direction = `${Math.sign(path[index][0] - path[index - 1][0])},${Math.sign(path[index][1] - path[index - 1][1])}`;
    if (previousDirection && direction !== previousDirection) turns += 1;
    previousDirection = direction;
  }
  return turns;
};

const solveLiveContinuation = () => page.evaluate(async () => {
  const state = window.__COLOR_ESCAPE__.getDebugState();
  const snapshot = state.puzzle;
  const continuation = {
    ...state.level,
    id: state.level.id + 100_000,
    name: `${state.level.name}-live-continuation`,
    parMoves: undefined,
    playable: snapshot.playable,
    blocked: snapshot.blocked,
    gates: snapshot.gates,
    blocks: snapshot.blocks,
    shutters: snapshot.shutters,
    // Elevators advance on wall-clock time. Re-plan from their current carried
    // block positions after every gesture instead of pretending they are static.
    elevators: [],
    conveyors: snapshot.conveyors,
  };
  if (!window.__BLOCK_OUT_SOLVER_WORKER__) {
    const source = `
      self.onmessage = async ({ data }) => {
        const startedAt = performance.now();
        try {
          const { solveLevelForValidation } = await import(data.solverUrl);
          const solution = solveLevelForValidation(data.level);
          self.postMessage({ id: data.id, solution, durationMs: performance.now() - startedAt });
        } catch (error) {
          self.postMessage({ id: data.id, error: error instanceof Error ? error.message : String(error) });
        }
      };
    `;
    const workerUrl = URL.createObjectURL(new Blob([source], { type: "text/javascript" }));
    const worker = new Worker(workerUrl, { type: "module" });
    const pending = new Map();
    let nextId = 1;
    worker.onmessage = ({ data }) => {
      const request = pending.get(data.id);
      if (!request) return;
      pending.delete(data.id);
      if (data.error) request.reject(new Error(data.error));
      else request.resolve(data);
    };
    worker.onerror = (event) => {
      for (const request of pending.values()) request.reject(new Error(event.message));
      pending.clear();
    };
    window.__BLOCK_OUT_SOLVER_WORKER__ = {
      solve(level) {
        const id = nextId++;
        return new Promise((resolve, reject) => {
          pending.set(id, { resolve, reject });
          worker.postMessage({ id, level, solverUrl: new URL("/src/core/levelSolver.ts", location.href).href });
        });
      },
    };
  }
  const { solution, durationMs } = await window.__BLOCK_OUT_SOLVER_WORKER__.solve(continuation);
  const first = solution.drags[0];
  const block = first ? snapshot.blocks.find((item) => item.id === first.blockId) : undefined;
  return {
    solved: solution.solved,
    exploredStates: solution.exploredStates,
    drag: first,
    start: block ? [block.x, block.y] : undefined,
    signature: [
      snapshot.blocks.map((item) => `${item.id}@${item.x},${item.y}:${item.layers.join(",")}:${item.frozen}`).sort().join("|"),
      snapshot.gates.map((item) => `${item.id}:${item.frozen}`).sort().join("|"),
      snapshot.shutters.map((item) => `${item.id}:${item.count}`).sort().join("|"),
    ].join(";"),
    durationMs,
    complete: snapshot.complete,
  };
});

const solvePausedLiveContinuation = async () => {
  const ready = await waitForInput();
  if (ready.puzzle.complete) return { complete: true };
  if (ready.puzzle.failed) throw new Error(`Full-season E2E: level ${ready.level.id} timed out before elevator planning`);
  await clickInteractionTarget("pause");
  await waitForScreen("paused");
  const live = await solveLiveContinuation();
  await clickInteractionTarget("pauseResume");
  await waitForScreen("playing");
  return live;
};

const waitForPlannedState = async (signature) => {
  for (let attempt = 0; attempt < 1000; attempt += 1) {
    const state = await debug();
    if (state.puzzle.failed) throw new Error(`Full-season E2E: level ${state.level.id} timed out while waiting for its elevator phase`);
    if (puzzleSignature(state.puzzle) === signature) return true;
    await page.waitForTimeout(20);
  }
  return false;
};

const performDrag = async (drag, {
  allowReplan = false,
  expectedStart,
  expectedSignature,
  routeIndex,
} = {}) => {
  // Shutter batches can become logically active before their reveal pulse has
  // finished painting. A human cannot press an unseen just-released piece in
  // that same frame, so give empty-path edge exits one short perception beat.
  if (drag.exitSide && drag.path.length === 0) await page.waitForTimeout(250);
  const state = await waitForInput();
  if (expectedSignature && puzzleSignature(state.puzzle) !== expectedSignature) {
    if (allowReplan) return false;
    throw new Error(`Full-season E2E: live board changed before ${drag.blockId} could be pressed`);
  }
  const beforeBlock = state.puzzle.blocks.find((item) => item.id === drag.blockId);
  if (!beforeBlock) throw new Error(`Full-season E2E: cannot drag missing ${drag.blockId}`);
  if (!isBlockActive(beforeBlock, state.puzzle)) throw new Error(`Full-season E2E: ${drag.blockId} is still locked`);
  if (expectedStart && (beforeBlock.x !== expectedStart[0] || beforeBlock.y !== expectedStart[1])) {
    if (allowReplan) return false;
    throw new Error(`Full-season E2E: ${drag.blockId} moved before the drag began`);
  }

  const [anchorX, anchorY] = drag.exitSide && drag.path.length === 0
    ? emptyExitAnchor(beforeBlock.shape, drag.exitSide)
    : beforeBlock.shape[0];
  const elevatorAtPress = elevatorSignature(state.puzzle);
  const start = logicalPoint(state.board, beforeBlock.x, beforeBlock.y, anchorX, anchorY);
  const coveringTargets = Object.entries(state.interactionTargets?.targets ?? {})
    .filter(([, target]) => target?.hit
      && start.x >= target.hit.x && start.x <= target.hit.x + target.hit.width
      && start.y >= target.hit.y && start.y <= target.hit.y + target.hit.height)
    .map(([key]) => key);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  for (const [x, y] of drag.path) {
    const point = logicalPoint(state.board, x, y, anchorX, anchorY);
    await page.mouse.move(point.x, point.y, { steps: 2 });
  }
  pointerGridSteps += drag.path.length;
  pointerTurns += countTurns([[beforeBlock.x, beforeBlock.y], ...drag.path]);

  const aligned = await debug();
  const alignedBlock = aligned.puzzle.blocks.find((item) => item.id === drag.blockId);
  const finalCell = drag.path.at(-1) ?? [beforeBlock.x, beforeBlock.y];
  if (!drag.exitSide && (!alignedBlock || alignedBlock.x !== finalCell[0] || alignedBlock.y !== finalCell[1])) {
    await page.mouse.up();
    pointerGestures += 1;
    const afterRelease = await debug();
    if (allowReplan && elevatorSignature(afterRelease.puzzle) !== elevatorAtPress) return false;
    throw new Error(`Full-season E2E: Lv${aligned.level.id} ${drag.blockId} stopped at ${alignedBlock ? `${alignedBlock.x},${alignedBlock.y}` : "outside"}; expected ${finalCell}; path=${JSON.stringify(drag.path)}; drag=${JSON.stringify(aligned.dragMotion)}`);
  }

  if (drag.exitSide) {
    const layerResolved = beforeBlock.layers.length > 1
      ? Boolean(alignedBlock && alignedBlock.layers.length === beforeBlock.layers.length - 1)
      : !alignedBlock;
    if (!layerResolved || aligned.selectedId || aligned.activePointer !== undefined) {
      await page.mouse.up();
      pointerGestures += 1;
      const afterRelease = await debug();
      if (allowReplan && elevatorSignature(afterRelease.puzzle) !== elevatorAtPress) return false;
      throw new Error(`Full-season E2E: ${drag.blockId} did not resolve while the pointer was still held at ${drag.exitSide}; routeIndex=${routeIndex ?? "unknown"}; drag=${JSON.stringify(drag)}; before=${JSON.stringify(beforeBlock)}; after=${JSON.stringify(alignedBlock)}; start=${JSON.stringify(start)}; screen=${aligned.screen}; coveringTargets=${JSON.stringify(coveringTargets)}; boosterTarget=${aligned.boosterTarget}; buttonPress=${JSON.stringify(aligned.buttonPress)}; selectionAssist=${JSON.stringify(aligned.selectionAssist)}; board=${JSON.stringify(aligned.board)}; viewport=${JSON.stringify(aligned.viewportTransform)}; blocks=${JSON.stringify(aligned.puzzle.blocks.map(({ id, x, y, frozen, shutterId }) => ({ id, x, y, frozen, shutterId })))}; shutters=${JSON.stringify(aligned.puzzle.shutters)}; gates=${JSON.stringify(aligned.puzzle.gates)}; selected=${aligned.selectedId}; pointer=${aligned.activePointer}`);
    }
  }
  await page.mouse.up();
  pointerGestures += 1;

  const after = await debug();
  const afterBlock = after.puzzle.blocks.find((item) => item.id === drag.blockId);
  if (!drag.exitSide) {
    if (!afterBlock || afterBlock.x !== finalCell[0] || afterBlock.y !== finalCell[1]) {
      if (allowReplan && elevatorSignature(after.puzzle) !== elevatorAtPress) return false;
      throw new Error(`Full-season E2E: parking drag for ${drag.blockId} was not committed`);
    }
  } else if (beforeBlock.layers.length > 1) {
    if (!afterBlock || afterBlock.layers.length !== beforeBlock.layers.length - 1) {
      if (allowReplan && elevatorSignature(after.puzzle) !== elevatorAtPress) return false;
      throw new Error(`Full-season E2E: ${drag.blockId} did not peel one layer through ${drag.exitSide}`);
    }
  } else if (afterBlock) {
    if (allowReplan && elevatorSignature(after.puzzle) !== elevatorAtPress) return false;
    throw new Error(`Full-season E2E: ${drag.blockId} did not exit through ${drag.exitSide}`);
  }
  return true;
};

for (const authored of campaign) {
  const startedAt = Date.now();
  const gesturesBefore = pointerGestures;
  const gridStepsBefore = pointerGridSteps;
  const turnsBefore = pointerTurns;
  await writeFile(shot("round54-pointer-progress.json"), `${JSON.stringify({
    activeLevel: authored.levelId,
    passedLevels: levelResults.map((level) => level.levelId),
    updatedAt: new Date().toISOString(),
  }, null, 2)}\n`, "utf8");
  console.log(`START Lv${authored.levelId} ${authored.name}`);
  await page.evaluate((id) => window.__COLOR_ESCAPE__.loadLevel(id, true), authored.levelId);
  await page.waitForTimeout(100);
  const cleanStart = await debug();
  if (cleanStart.particles !== 0 || cleanStart.exitGhosts !== 0 || cleanStart.exitPulses.length !== 0
    || cleanStart.mechanicPulses.length !== 0 || cleanStart.boardShakeTime !== 0) {
    throw new Error(`Full-season E2E: level ${authored.levelId} inherited transient effects`);
  }
  if (visualCheckpoints.has(authored.levelId)) {
    await page.screenshot({ path: shot(`round54-level-${String(authored.levelId).padStart(3, "0")}-start.png`) });
  }

  const hasWallClockElevator = cleanStart.puzzle.elevators.length > 0;
  let replanCount = 0;
  let replanExploredStates = 0;
  let replanDurationMs = 0;
  let maxReplanStates = 0;
  let maxReplanDurationMs = 0;
  let staleReplans = 0;
  if (hasWallClockElevator) {
    for (let attempt = 0; attempt < 200; attempt += 1) {
      // Search is an offline validation cost, not player input. Pause through the
      // real UI while the worker plans so slow CI hardware cannot consume the
      // level countdown or move an elevator before the route is returned. The
      // board resumes before every real Pointer drag, so wall-clock motion and
      // stale-plan recovery are still exercised during actual interaction.
      const live = await solvePausedLiveContinuation();
      if (live.complete) break;
      replanCount += 1;
      replanExploredStates += live.exploredStates;
      replanDurationMs += live.durationMs;
      maxReplanStates = Math.max(maxReplanStates, live.exploredStates);
      maxReplanDurationMs = Math.max(maxReplanDurationMs, live.durationMs);
      if (live.complete) break;
      if (!live.solved || !live.drag) {
        throw new Error(`Full-season E2E: live continuation missing on level ${authored.levelId} after ${live.exploredStates} states`);
      }
      if (!await waitForPlannedState(live.signature)) {
        staleReplans += 1;
        continue;
      }
      const performed = await performDrag(live.drag, {
        allowReplan: true,
        expectedStart: live.start,
        expectedSignature: live.signature,
      });
      if (!performed) staleReplans += 1;
      if ((await debug()).puzzle.complete) break;
      if (attempt === 199) throw new Error(`Full-season E2E: dynamic re-plan limit reached on level ${authored.levelId}`);
    }
  } else {
    for (const [routeIndex, drag] of authored.solution.drags.entries()) {
      await performDrag(drag, { routeIndex });
    }
  }

  const completed = await debug();
  if (!completed.puzzle.complete || completed.puzzle.blocks.length !== 0 || completed.puzzle.failed
    || completed.puzzle.remainingSeconds <= 0) {
    throw new Error(`Full-season E2E: level ${authored.levelId} did not complete through pointer input`);
  }
  if ((!hasWallClockElevator && completed.puzzle.moves !== authored.solution.minimumDrags)
    || completed.puzzle.cleared !== authored.clearLoad) {
    throw new Error(`Full-season E2E: level ${authored.levelId} accounting mismatch (${completed.puzzle.moves}/${completed.puzzle.cleared})`);
  }
  const actualGestures = pointerGestures - gesturesBefore;
  levelResults.push({
    levelId: authored.levelId,
    name: authored.name,
    difficulty: authored.difficulty,
    gestures: actualGestures,
    committedMoves: completed.puzzle.moves,
    clearLoad: completed.puzzle.cleared,
    repositionOverhead: completed.puzzle.moves - completed.puzzle.cleared,
    gridSteps: pointerGridSteps - gridStepsBefore,
    turns: pointerTurns - turnsBefore,
    exploredStates: hasWallClockElevator ? replanExploredStates : authored.solution.exploredStates,
    parMoves: authored.parMoves,
    dynamicReplanning: hasWallClockElevator,
    abortedGestures: actualGestures - completed.puzzle.moves,
    replanCount,
    staleReplans,
    replanExploredStates,
    replanDurationMs: Math.round(replanDurationMs * 100) / 100,
    maxReplanStates,
    maxReplanDurationMs: Math.round(maxReplanDurationMs * 100) / 100,
    remainingSeconds: Math.round(completed.puzzle.remainingSeconds * 100) / 100,
    testWallClockDurationMs: Date.now() - startedAt,
  });
  await writeFile(shot("round54-pointer-checkpoint.json"), `${JSON.stringify({
    method: "incremental real-pointer checkpoint; final report is written only after the requested range completes",
    requestedLevels: campaign.map((level) => level.levelId),
    levelsPassed: levelResults.length,
    pointerGestures,
    pointerGridSteps,
    levels: levelResults,
  }, null, 2)}\n`, "utf8");
  console.log(`PASS Lv${authored.levelId} moves=${completed.puzzle.moves} remaining=${completed.puzzle.remainingSeconds.toFixed(2)}s`);
  if (authored.levelId === 100) await page.screenshot({ path: shot("round54-level-100-cleared.png") });
}

const report = {
  method: "clear-first validation search followed by authoritative real Playwright pointer replay; elevator replanning uses the real pause/resume UI so offline search does not consume player time, while wall-clock motion remains active during Pointer input; not an optimality proof",
  levelsPassed: levelResults.length,
  pointerGestures,
  pointerGridSteps,
  totalTestWallClockDurationMs: levelResults.reduce((sum, level) => sum + level.testWallClockDurationMs, 0),
  maxLevelTestWallClockDurationMs: Math.max(...levelResults.map((level) => level.testWallClockDurationMs)),
  levels: levelResults,
};
const reportNames = isFullCampaign
  ? ["latest-100-level-pointer-report.json", "round54-100-level-pointer-report.json"]
  : [`round54-pointer-levels-${campaign[0]?.levelId ?? "none"}-${campaign.at(-1)?.levelId ?? "none"}.json`];
for (const reportName of reportNames) await writeFile(shot(reportName), `${JSON.stringify(report, null, 2)}\n`, "utf8");

await page.close();
await browser.close();
if (errors.length) throw new Error(`Browser errors:\n${errors.join("\n")}`);
console.log(`All ${report.levelsPassed} levels passed via ${pointerGestures} real pointer gestures and ${pointerGridSteps} grid steps.`);
