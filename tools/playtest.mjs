import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";

const root = new URL("../playtest-results/", import.meta.url);
const rootPath = fileURLToPath(root);
const shot = (name) => resolve(rootPath, name);
const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
await mkdir(rootPath, { recursive: true });

const browser = await chromium.launch({
  headless: true,
});

const context = await browser.newContext({
  viewport: { width: 496, height: 1078 },
  recordVideo: { dir: rootPath, size: { width: 496, height: 1078 } },
});
const page = await context.newPage();
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(error.message));
await page.goto(playtestUrl, { waitUntil: "networkidle" });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(1200);
await page.screenshot({ path: shot("round2-home-imagegen.png") });

await page.mouse.click(248, 852);
await page.waitForTimeout(150);
await page.screenshot({ path: shot("round2-level01-start.png") });

const debug = () => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const clickInteractionTarget = async (name) => {
  const state = await debug();
  const hit = state.interactionTargets?.targets?.[name]?.hit;
  const canvas = await page.locator("canvas").boundingBox();
  if (!hit || !canvas) throw new Error(`Pointer E2E: missing ${name} target or canvas bounds`);
  await page.mouse.click(
    canvas.x + state.viewportTransform.offsetX + (hit.x + hit.width / 2) * state.viewportTransform.scale,
    canvas.y + state.viewportTransform.offsetY + (hit.y + hit.height / 2) * state.viewportTransform.scale,
  );
};
const waitForDebugState = async (predicate, timeout = 8000) => {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const state = await debug();
    if (predicate(state)) return state;
    await page.waitForTimeout(20);
  }
  const state = await debug();
  throw new Error(`Pointer E2E: timed out at ${state.screen}, Lv${state.level.id}`);
};
const levelOneRoute = await page.evaluate(async () => {
  const [{ getLevel }, { solveLevelForValidation }] = await Promise.all([
    import("/src/core/levels.ts"),
    import("/src/core/levelSolver.ts"),
  ]);
  const level = getLevel(1);
  return { solution: solveLevelForValidation(level), reward: 20 };
});
if (!levelOneRoute.solution.solved || !levelOneRoute.solution.drags.length) {
  throw new Error("Pointer E2E: current level 1 has no verified pointer route");
}

const cellPoint = (board, x, y) => ({
  x: board.innerX + (x + 0.5) * board.cell,
  y: board.innerY + (y + 0.5) * board.cell,
});
const screenPoint = (state, canvas, point) => ({
  x: canvas.x + state.viewportTransform.offsetX + point.x * state.viewportTransform.scale,
  y: canvas.y + state.viewportTransform.offsetY + point.y * state.viewportTransform.scale,
});
const performDrag = async (drag, options = {}) => {
  const state = await debug();
  const block = state.puzzle.blocks.find((candidate) => candidate.id === drag.blockId);
  if (!block) throw new Error(`Pointer E2E: missing route block ${drag.blockId}`);
  const canvas = await page.locator("canvas").boundingBox();
  if (!canvas) throw new Error("Pointer E2E: missing canvas bounds for routed drag");
  const directExit = drag.path.length === 0 && Boolean(drag.exitSide);
  const [anchorX, anchorY] = directExit
    ? [
      block.shape.reduce((sum, [x]) => sum + x, 0) / block.shape.length,
      block.shape.reduce((sum, [, y]) => sum + y, 0) / block.shape.length,
    ]
    : block.shape[0];
  const start = screenPoint(state, canvas, cellPoint(state.board, block.x + anchorX, block.y + anchorY));
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  if (options.captureSelected) {
    await page.waitForTimeout(80);
    const selected = await debug();
    if (selected.selectedId !== drag.blockId) {
      throw new Error(`Pointer E2E: pointer did not select the routed block (${JSON.stringify({
        expected: drag.blockId,
        drag,
        selected: selected.selectedId,
        activePointer: selected.activePointer,
        buttonPress: selected.buttonPress,
        dragMotion: selected.dragMotion,
        pendingCelebration: selected.pendingCelebration,
        mechanicPulses: selected.mechanicPulses,
        screen: selected.screen,
        start,
        canvas,
        viewportTransform: state.viewportTransform,
        board: state.board,
        block,
      })})`);
    }
    await page.screenshot({ path: shot("round2-drag-selected.png") });
  }
  for (const [x, y] of drag.path) {
    const target = screenPoint(state, canvas, cellPoint(state.board, x + anchorX, y + anchorY));
    await page.mouse.move(target.x, target.y, { steps: 3 });
  }
  if (drag.exitSide) {
    const latest = await debug();
    const remaining = latest.puzzle.blocks.find((candidate) => candidate.id === drag.blockId);
    const expectedLayers = Math.max(0, block.layers.length - 1);
    if (latest.selectedId || latest.activePointer !== undefined) {
      throw new Error(`Pointer E2E: ${drag.blockId} remained grabbed after held alignment`);
    }
    if ((expectedLayers === 0 && remaining)
      || (expectedLayers > 0 && (!remaining || remaining.layers.length !== expectedLayers))) {
      throw new Error(`Pointer E2E: ${drag.blockId} did not resolve its active layer on held alignment`);
    }
  }
  await page.mouse.up();
  if (options.captureExit) {
    await page.waitForTimeout(20);
    const feedback = await debug();
    if (feedback.exitGhosts < 1 && feedback.exitPulses.length < 1) {
      throw new Error("Pointer E2E: successful exit had no visible gate feedback");
    }
    await page.screenshot({ path: shot("round2-exit-tween.png") });
  }
  await page.waitForTimeout(options.postDelay ?? (drag.exitSide ? 340 : 35));
};
const performLevelOne = async (capture = false) => {
  let capturedExit = false;
  const heldCaptureIndex = levelOneRoute.solution.drags.findIndex(
    (drag) => drag.path.length > 0 || !drag.exitSide,
  );
  for (let index = 0; index < levelOneRoute.solution.drags.length; index += 1) {
    const drag = levelOneRoute.solution.drags[index];
    const captureExit = capture && !capturedExit && Boolean(drag.exitSide);
    await performDrag(drag, {
      captureSelected: capture && index === heldCaptureIndex,
      captureExit,
      postDelay: index === levelOneRoute.solution.drags.length - 1 ? 20 : undefined,
    });
    if (captureExit) capturedExit = true;
  }
  if (capture && !capturedExit) throw new Error("Pointer E2E: level 1 route never exercised an exit");
};

await performLevelOne(true);
const result = await waitForDebugState(
  (candidate) => candidate.screen === "playing"
    && candidate.level.id === 1
    && candidate.completionFlow?.directTransition?.fromLevel === 1
    && candidate.completionFlow.directTransition.toLevel === 2,
);
if (result.settlement.status !== "committed" || result.settlement.rewardPresented
  || result.settlement.coinReward !== levelOneRoute.reward) {
  throw new Error("Pointer E2E: Lv1 direct transition did not expose its committed reward truthfully");
}
if (!(result.progression.bestStars["1"] >= 1) || result.progression.bestMoves["1"] !== levelOneRoute.solution.minimumDrags) {
  throw new Error("First-clear star or move record was not saved from the current route");
}
const rewardedCoins = 1000 + levelOneRoute.reward;
if (result.economy.coins !== rewardedCoins || !result.economy.rewardedLevels.includes(1)) throw new Error("First-clear reward was not recorded exactly once");
await page.screenshot({ path: shot("round149-direct-transition-level-001.png") });
await page.waitForTimeout(700);
const heldResult = await debug();
if (heldResult.screen !== "playing" || heldResult.level.id !== 2
  || heldResult.completionFlow?.directTransition || heldResult.economy.coins !== rewardedCoins) {
  throw new Error(`Pointer E2E: Lv1 did not finish its direct transition into Lv2 (${heldResult.screen}, Lv${heldResult.level.id})`);
}
const won = heldResult;
if (won.puzzle.moves !== 0 || won.activeRun?.levelId !== 2) {
  throw new Error(`Pointer E2E: direct transition did not begin clean level 2 (${won.screen}, Lv${won.level.id})`);
}
await page.screenshot({ path: shot("round41-quick-flow-level-002.png") });
await page.setViewportSize({ width: 320, height: 568 });
await page.waitForTimeout(120);
await page.screenshot({ path: shot("round41-quick-flow-level-002-320x568.png") });
await page.setViewportSize({ width: 496, height: 1078 });
await page.waitForTimeout(120);

// Replaying a completed level grants no base coins while preserving a
// single first-clear progression marker.
await page.evaluate(() => window.__COLOR_ESCAPE__.loadLevel(1, true));
await page.waitForTimeout(80);
await performLevelOne();
const replay = await waitForDebugState(
  (candidate) => candidate.completionFlow?.directTransition?.fromLevel === 1,
);
if (replay.screen !== "playing" || replay.settlement.status !== "committed"
  || replay.settlement.rewardPresented || replay.settlement.coinReward !== 0
  || replay.economy.coins !== rewardedCoins
  || replay.economy.rewardedLevels.filter((id) => id === 1).length !== 1) {
  throw new Error("Replay direct transition paid coins or changed the first-clear progression marker");
}

// An outer notch is real collision. The block may park next to it, but cannot
// occupy or auto-route through a void; there are no internal fixed wall cells.
const notchFixture = await (async () => {
  for (let levelId = 1; levelId <= 100; levelId += 1) {
    await page.evaluate((id) => window.__COLOR_ESCAPE__.loadLevel(id, true), levelId);
    const candidate = await page.evaluate(async () => {
      const state = window.__COLOR_ESCAPE__.getDebugState();
      const [{ getLevel }, { PuzzleModel }] = await Promise.all([
        import("/src/core/levels.ts"),
        import("/src/core/PuzzleModel.ts"),
      ]);
      const fixtureModel = new PuzzleModel(getLevel(state.level.id));
      const fixtureSnapshot = fixtureModel.snapshot();
      const playable = new Set(state.puzzle.playable.map(([x, y]) => `${x},${y}`));
      const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      for (const block of state.puzzle.blocks) {
        const fixtureBlock = fixtureModel.getBlock(block.id);
        if (!fixtureBlock
          || !fixtureModel.isBlockActive(fixtureBlock)
          || fixtureModel.possibleExitSides(fixtureBlock).length > 0) continue;
        const occupied = new Set(fixtureSnapshot.blocked.map(([x, y]) => `${x},${y}`));
        for (const other of fixtureSnapshot.blocks) {
          if (other.id === block.id) continue;
          const hiddenBehindShutter = other.shutterId
            ? fixtureSnapshot.shutters.some((shutter) => shutter.id === other.shutterId && shutter.count > 0)
            : false;
          if (hiddenBehindShutter) continue;
          for (const [cellX, cellY] of other.shape) occupied.add(`${other.x + cellX},${other.y + cellY}`);
        }
        for (const shutter of fixtureSnapshot.shutters) {
          if (shutter.count <= 0) continue;
          for (let y = shutter.y; y < shutter.y + shutter.height; y += 1) {
            for (let x = shutter.x; x < shutter.x + shutter.width; x += 1) occupied.add(`${x},${y}`);
          }
        }
        for (const [dx, dy] of directions) {
          let step = 1;
          let lastLegal = null;
          while (step <= Math.max(state.puzzle.width, state.puzzle.height)) {
            const x = block.x + dx * step;
            const y = block.y + dy * step;
            const cells = block.shape.map(([cellX, cellY]) => [x + cellX, y + cellY]);
            const within = cells.every(([cellX, cellY]) => cellX >= 0 && cellY >= 0 && cellX < state.puzzle.width && cellY < state.puzzle.height);
            const hitsVoid = cells.some(([cellX, cellY]) => within && !playable.has(`${cellX},${cellY}`));
            const blocked = cells.some(([cellX, cellY]) => occupied.has(`${cellX},${cellY}`));
            // Only accept a notch whose entire approach is legal in the real
            // model. Hand-counting blocks alone misses closed shutters and can
            // make the fixture expect motion through an unrelated obstacle.
            const placeable = within && fixtureModel.canPlace(fixtureBlock, x, y);
            if (!placeable) {
              if (lastLegal && hitsVoid && !blocked) {
                return {
                  board: state.board,
                  blockId: block.id,
                  anchor: block.shape[0],
                  start: [block.x, block.y],
                  lastLegal,
                  invalid: [x, y],
                };
              }
              break;
            }
            lastLegal = [x, y];
            step += 1;
          }
        }
      }
      return null;
    });
    if (candidate) return { ...candidate, levelId };
  }
  throw new Error("Pointer E2E: no straight outer-notch collision fixture exists in the frozen 100-level campaign");
})();
const canyon = notchFixture.board;
const notchState = await debug();
const notchCanvas = await page.locator("canvas").boundingBox();
if (!notchCanvas) throw new Error("Pointer E2E: missing canvas bounds for outer-notch drag");
const canyonPoint = (x, y) => screenPoint(notchState, notchCanvas, {
  x: canyon.innerX + (x + 0.5) * canyon.cell,
  y: canyon.innerY + (y + 0.5) * canyon.cell,
});
const notchStart = canyonPoint(notchFixture.start[0] + notchFixture.anchor[0], notchFixture.start[1] + notchFixture.anchor[1]);
const notchInvalid = canyonPoint(notchFixture.invalid[0] + notchFixture.anchor[0], notchFixture.invalid[1] + notchFixture.anchor[1]);
await page.mouse.move(notchStart.x, notchStart.y);
await page.mouse.down();
await page.mouse.move(notchInvalid.x, notchInvalid.y, { steps: 8 });
let routed = await page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
let routedKey = routed.puzzle.blocks.find((block) => block.id === notchFixture.blockId);
if (!routedKey) {
  throw new Error(`Pointer E2E: outer-notch fixture ${notchFixture.blockId} exited before collision validation`);
}
if (routedKey.x !== notchFixture.lastLegal[0] || routedKey.y !== notchFixture.lastLegal[1]) {
  throw new Error(`Pointer E2E: outer notch collision stopped at ${routedKey.x},${routedKey.y}, expected ${notchFixture.lastLegal}`);
}
await page.mouse.move(notchInvalid.x, notchInvalid.y, { steps: 4 });
await page.mouse.up();
routed = await page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
routedKey = routed.puzzle.blocks.find((block) => block.id === notchFixture.blockId);
if (!routedKey) {
  throw new Error(`Pointer E2E: outer-notch fixture ${notchFixture.blockId} exited during collision validation`);
}
if (routedKey.x !== notchFixture.lastLegal[0] || routedKey.y !== notchFixture.lastLegal[1]) {
  throw new Error(`Pointer E2E: block entered the outer void at ${routedKey.x},${routedKey.y}`);
}
await page.screenshot({ path: shot("round3-collision-stop.png") });

await page.evaluate(() => window.__COLOR_ESCAPE__.loadLevel(5, true));
await page.waitForTimeout(120);
await clickInteractionTarget("pause");
let paused = await page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
if (paused.screen !== "paused") throw new Error("Pause button did not open the pause overlay");
const initialSound = paused.settings.sound;
await clickInteractionTarget("pause.sound");
paused = await page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
if (paused.settings.sound === initialSound) throw new Error("Sound toggle did not change");
await page.screenshot({ path: shot("round2-pause.png") });

const video = page.video();
await context.close();
if (video) await video.saveAs(shot("challenge-loop-round3.webm"));

for (const [width, height] of [[320, 568], [375, 812], [390, 844], [430, 932]]) {
  const mobile = await browser.newPage({ viewport: { width, height } });
  await mobile.goto(playtestUrl, { waitUntil: "networkidle" });
  await mobile.evaluate(() => window.__COLOR_ESCAPE__.loadLevel(100, true));
  await mobile.waitForTimeout(150);
  await mobile.screenshot({ path: shot(`round2-mobile-${width}x${height}.png`) });
  await mobile.close();
}

const safePage = await browser.newPage({ viewport: { width: 390, height: 844 } });
const safeUrl = new URL(playtestUrl);
safeUrl.searchParams.set("safeTop", "44");
safeUrl.searchParams.set("safeBottom", "34");
await safePage.goto(safeUrl.href, { waitUntil: "networkidle" });
await safePage.waitForTimeout(800);
await safePage.screenshot({ path: shot("round3-safearea-home-44-34.png") });
await safePage.evaluate(() => window.__COLOR_ESCAPE__.loadLevel(100, true));
await safePage.waitForTimeout(120);
await safePage.screenshot({ path: shot("round3-safearea-level-44-34.png") });
await safePage.close();

await browser.close();
if (errors.length) throw new Error(`Browser errors:\n${errors.join("\n")}`);
console.log("Pointer E2E, Lv1 direct transition, responsive screenshots, and video capture passed.");
