import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";

const output = fileURLToPath(new URL("../playtest-results/", import.meta.url));
const shot = (name) => resolve(output, name);
const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
await mkdir(output, { recursive: true });

const save = (reducedMotion = false, basicsSeen = true) => ({
  schemaVersion: 1,
  currentLevel: 3,
  highestLevel: 100,
  coins: 1000,
  sound: false,
  haptic: false,
  reducedMotion,
  featureSeen: basicsSeen
    ? ["basics", "ice-door", "ice-block", "layer", "shutter", "generator", "elevator", "conveyor", "star"]
    : [],
  boosters: { time: 3, rocket: 3, pulse: 3 },
  bestStars: {},
  bestMoves: {},
  rewardedLevels: [],
  dailyStreak: 0,
  lastDailyCompletedDay: "",
});

const browser = await chromium.launch({ headless: true });
const errors = [];
const attachErrors = (page) => {
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.endsWith("/assets/art/fx/block-blocked-halo-v1.png")) {
      errors.push("Selection-feedback E2E requested the retired blocked-halo bitmap");
    }
  });
};
const installFeedbackDrawAudit = (page) => page.addInitScript(() => {
  const original = CanvasRenderingContext2D.prototype.drawImage;
  globalThis.__SELECTION_FEEDBACK_DRAW_AUDIT__ = [];
  globalThis.__SELECTION_FEEDBACK_DRAW_COUNT__ = 0;
  globalThis.__clearSelectionFeedbackDrawAudit = () => {
    globalThis.__SELECTION_FEEDBACK_DRAW_AUDIT__.length = 0;
    globalThis.__SELECTION_FEEDBACK_DRAW_COUNT__ = 0;
  };
  CanvasRenderingContext2D.prototype.drawImage = function drawImageWithSelectionFeedbackAudit(image, ...args) {
    globalThis.__SELECTION_FEEDBACK_DRAW_COUNT__ += 1;
    const src = String(image?.currentSrc || image?.src || "");
    const category = src.includes("/assets/art/fx/formal-gameplay-v1/selection-frame.png")
      ? "selection-frame"
      : src.includes("/assets/art/fx/block-grab-halo-v1.png")
        ? "grab-halo"
        : src.includes("/assets/art/fx/block-blocked-halo-v1.png") ? "blocked-halo" : undefined;
    if (category) {
      globalThis.__SELECTION_FEEDBACK_DRAW_AUDIT__.push({
        category,
        path: (() => {
          try { return new URL(src, location.href).pathname; } catch { return src; }
        })(),
      });
    }
    return original.call(this, image, ...args);
  };
});
const clearFeedbackDraws = (page) => page.evaluate(() => globalThis.__clearSelectionFeedbackDrawAudit());
const feedbackDraws = (page) => page.evaluate(() => [...globalThis.__SELECTION_FEEDBACK_DRAW_AUDIT__]);
const feedbackDrawCount = (page) => page.evaluate(() => globalThis.__SELECTION_FEEDBACK_DRAW_COUNT__);
const assertNoBlockedHaloDraws = async (page, label) => {
  const records = await feedbackDraws(page);
  const blockedHalos = records.filter((record) => record.category === "blocked-halo");
  if (blockedHalos.length) {
    throw new Error(`Selection-feedback E2E: ${label} drew the removed gold blocked halo ${JSON.stringify(blockedHalos)}`);
  }
  return records;
};
const assertSelectionDecorationDraws = async (page, label) => {
  const records = await assertNoBlockedHaloDraws(page, label);
  if (!records.some((record) => record.category === "selection-frame" || record.category === "grab-halo")) {
    throw new Error(`Selection-feedback E2E: ${label} lost both the formal selection frame and blue grab-halo fallback`);
  }
  return records;
};
const debug = (page) => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const screenPoint = (page, logical) => {
  const viewport = page.viewportSize();
  const scale = Math.min(viewport.width / 496, viewport.height / 1078);
  return {
    x: (viewport.width - 496 * scale) / 2 + logical.x * scale,
    y: (viewport.height - 1078 * scale) / 2 + logical.y * scale,
  };
};
const cellPoint = (page, state, block, shapeIndex = 0) => {
  const [dx, dy] = block.shape[shapeIndex];
  return screenPoint(page, {
    x: state.board.innerX + (block.x + dx + 0.5) * state.board.cell,
    y: state.board.innerY + (block.y + dy + 0.5) * state.board.cell,
  });
};
const performGuideGesture = async (page, guide) => {
  const start = screenPoint(page, guide.start);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  for (const point of guide.points?.slice(1) ?? []) {
    const destination = screenPoint(page, point);
    await page.mouse.move(destination.x, destination.y, { steps: 3 });
  }
  await page.mouse.up();
};
const seed = async (page, nextSave = save()) => {
  await page.goto(playtestUrl, { waitUntil: "networkidle" });
  await page.evaluate((value) => localStorage.setItem("color-escape-save-v1", JSON.stringify(value)), nextSave);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(180);
};
const openLevel = async (page, levelId) => {
  await page.evaluate((id) => window.__COLOR_ESCAPE__.loadLevel(id, true), levelId);
  await page.waitForTimeout(160);
  const state = await debug(page);
  if (state.screen !== "playing" || state.level.id !== levelId) {
    throw new Error(`Selection-feedback E2E: expected playing Lv${levelId}`);
  }
  return state;
};

const page = await browser.newPage({ viewport: { width: 496, height: 1078 } });
attachErrors(page);
await installFeedbackDrawAudit(page);
await seed(page);
const selectionFixtures = await page.evaluate(async () => {
  const [{ getLevel }, { PuzzleModel }] = await Promise.all([
    import("/src/core/levels.ts"),
    import("/src/core/PuzzleModel.ts"),
  ]);
  const directions = [[1, 0], [0, 1], [-1, 0], [0, -1]];
  for (let levelId = 1; levelId <= 100; levelId += 1) {
    const level = getLevel(levelId);
    let movable;
    let blocked;
    for (const authored of level.blocks) {
      const activeCheck = new PuzzleModel(level);
      const activeBlock = activeCheck.getBlock(authored.id);
      if (!activeBlock || !activeCheck.isBlockActive(activeBlock)
        || activeCheck.possibleExitSides(activeBlock).length > 0) continue;
      for (const [dx, dy] of directions) {
        const model = new PuzzleModel(level);
        const block = model.getBlock(authored.id);
        if (!block) continue;
        const targetX = block.x + dx;
        const targetY = block.y + dy;
        const inside = block.shape.every(([shapeX, shapeY]) => (
          targetX + shapeX >= 0 && targetY + shapeY >= 0
          && targetX + shapeX < level.width && targetY + shapeY < level.height
        ));
        const moved = model.moveBlockStep(block.id, targetX, targetY);
        const movedBlock = model.getBlock(block.id);
        if (moved && movedBlock && model.possibleExitSides(movedBlock).length === 0 && !movable) {
          movable = { blockId: block.id, dx, dy };
        }
        if (!moved && inside && !blocked) blocked = { blockId: block.id, dx, dy };
      }
    }
    if (movable && blocked) return { levelId, movable, blocked };
  }
  throw new Error("Selection-feedback E2E: no dynamic movable/blocked fixtures in the frozen campaign");
});
const failedExitFixture = {
  levelId: 1,
  blockId: "selection-failed-exit",
  side: "top",
  status: "wrong-color",
};

let state = await openLevel(page, selectionFixtures.levelId);
await page.screenshot({ path: shot("round42-selection-dynamic-idle.png") });

let block = state.puzzle.blocks.find((candidate) => candidate.id === selectionFixtures.movable.blockId);
if (!block) throw new Error("Selection-feedback E2E: dynamic movable block missing");
let start = cellPoint(page, state, block);
await clearFeedbackDraws(page);
await page.mouse.move(start.x, start.y);
await page.mouse.down();
await page.waitForTimeout(150);
state = await debug(page);
if (state.selectedId !== block.id || state.selectionFeedback?.mode !== "grabbed"
  || state.activePointer == null || state.dragMotion?.blockId !== block.id
  || !state.selectionFeedback.grabHaloReady || "blockedHaloReady" in state.selectionFeedback) {
  throw new Error("Selection-feedback E2E: pointer/selection state or feedback asset readiness was not exposed");
}
await assertSelectionDecorationDraws(page, "pointer selection");
await page.screenshot({ path: shot("round42-selection-dynamic-grabbed.png") });

const dragTarget = screenPoint(page, {
  x: state.board.innerX + (block.x + block.shape[0][0] + selectionFixtures.movable.dx + 0.5) * state.board.cell,
  y: state.board.innerY + (block.y + block.shape[0][1] + selectionFixtures.movable.dy + 0.5) * state.board.cell,
});
await clearFeedbackDraws(page);
await page.mouse.move(dragTarget.x, dragTarget.y, { steps: 5 });
await page.waitForTimeout(50);
state = await debug(page);
if (state.selectedId !== block.id || state.activePointer == null
  || state.dragMotion?.blockId !== block.id || state.dragMotion.state !== "dragging"
  || state.selectionFeedback?.mode !== "grabbed") {
  throw new Error("Selection-feedback E2E: pointer/selection state did not persist through a live drag");
}
await assertSelectionDecorationDraws(page, "live drag");
await page.screenshot({ path: shot("round42-selection-dynamic-mid-drag.png") });
await page.mouse.up();

state = await openLevel(page, selectionFixtures.levelId);
block = state.puzzle.blocks.find((candidate) => candidate.id === selectionFixtures.blocked.blockId);
if (!block) throw new Error("Selection-feedback E2E: dynamic blocked block missing");
start = cellPoint(page, state, block);
const blockedOrigin = { x: block.x, y: block.y, moves: state.puzzle.moves };
await page.mouse.move(start.x, start.y);
await page.mouse.down();
await page.waitForFunction((blockId) => window.__COLOR_ESCAPE__?.getDebugState().selectedId === blockId, block.id, { timeout: 2_000 });
await clearFeedbackDraws(page);
const blockedTarget = screenPoint(page, {
  x: state.board.innerX + (block.x + block.shape[0][0] + selectionFixtures.blocked.dx + 0.5) * state.board.cell,
  y: state.board.innerY + (block.y + block.shape[0][1] + selectionFixtures.blocked.dy + 0.5) * state.board.cell,
});
await page.mouse.move(blockedTarget.x, blockedTarget.y, { steps: 4 });
state = await debug(page);
const blockedBlock = state.puzzle.blocks.find((candidate) => candidate.id === block.id);
if (state.selectedId !== block.id || state.activePointer == null
  || state.dragMotion?.blockId !== block.id || state.dragMotion.state !== "dragging"
  || state.selectionFeedback?.mode !== "blocked" || state.blockerFocus
  || blockedBlock?.x !== blockedOrigin.x || blockedBlock.y !== blockedOrigin.y
  || state.puzzle.moves !== blockedOrigin.moves) {
  throw new Error(
    `Selection-feedback E2E: collision lost its non-visual blocked semantics; `
    + `fixture=${JSON.stringify(selectionFixtures.blocked)} state=${JSON.stringify({
      selectedId: state.selectedId,
      activePointer: state.activePointer,
      dragMotion: state.dragMotion,
      selectionFeedback: state.selectionFeedback,
      blockerFocus: state.blockerFocus,
      block: blockedBlock,
      moves: state.puzzle.moves,
    })}`,
  );
}
await page.evaluate(() => window.__COLOR_ESCAPE__.render());
await assertSelectionDecorationDraws(page, "held collision");
if (await feedbackDrawCount(page) <= 0) {
  throw new Error("Selection-feedback E2E: held-collision draw audit was empty");
}
await page.screenshot({ path: shot("round42-selection-dynamic-blocked-without-gold-halo.png") });
await clearFeedbackDraws(page);
await page.mouse.up();
await page.evaluate(() => window.__COLOR_ESCAPE__.render());
state = await debug(page);
if (state.selectedId || state.activePointer != null || state.puzzle.moves !== blockedOrigin.moves) {
  throw new Error(`Selection-feedback E2E: collision release semantics drifted ${JSON.stringify({
    selectedId: state.selectedId,
    activePointer: state.activePointer,
    moves: state.puzzle.moves,
  })}`);
}
await assertNoBlockedHaloDraws(page, "collision release");
if (await feedbackDrawCount(page) <= 0) {
  throw new Error("Selection-feedback E2E: collision-release draw audit was empty");
}
await page.screenshot({ path: shot("round42-selection-dynamic-blocked-released-without-gold-halo.png") });

await openLevel(page, failedExitFixture.levelId);
await page.evaluate(async ({ blockId }) => {
  const { PuzzleModel } = await import("/src/core/PuzzleModel.ts");
  const game = window.__COLOR_ESCAPE__;
  const playable = Array.from({ length: 5 }, (_, y) => (
    Array.from({ length: 5 }, (__, x) => [x, y])
  )).flat();
  game.model = new PuzzleModel({
    id: 997,
    name: "Selection failed-exit fixture",
    difficulty: "normal",
    timeSeconds: 180,
    reward: 0,
    parMoves: 1,
    width: 5,
    height: 5,
    playable,
    blocked: [],
    gates: [{ id: "blue-top", side: "top", offset: 2, size: 1, color: "blue" }],
    blocks: [
      { id: blockId, x: 2, y: 0, shape: [[0, 0]], color: "red" },
      { id: "selection-failed-exit-control", x: 4, y: 4, shape: [[0, 0]], color: "blue" },
    ],
  });
  game.selectedId = undefined;
  game.activePointer = undefined;
  game.selectionAssist = undefined;
  game.dragVisual = undefined;
  game.strategyNudgeDrag = undefined;
  game.blockedBlockId = undefined;
  game.blockedFeedbackTime = 0;
  game.blockerFocusBlockId = undefined;
  game.blockerFocusTime = 0;
  game.grabFeedbackTime = 0;
  game.exitFailure = undefined;
  game.particles = [];
  game.exitGhosts = [];
  game.exitPulses = [];
  game.mechanicPulses = [];
  game.boardShakeTime = 0;
  game.pendingCelebration = 0;
  game.dirty = true;
  game.render();
}, { blockId: failedExitFixture.blockId });
state = await debug(page);
block = state.puzzle.blocks.find((candidate) => candidate.id === failedExitFixture.blockId);
if (!block) throw new Error("Selection-feedback E2E: failed-exit block missing");
start = cellPoint(page, state, block);
const failedExitOrigin = {
  x: block.x,
  y: block.y,
  moves: state.puzzle.moves,
  particles: state.particles,
  exitPulses: state.exitPulses.length,
};
const failedExitTarget = screenPoint(page, {
  x: state.board.innerX + (block.x + 0.5) * state.board.cell,
  y: state.board.innerY - 12,
});
await page.mouse.move(start.x, start.y);
await page.mouse.down();
state = await debug(page);
if (state.selectedId !== block.id || state.activePointer == null) {
  throw new Error(`Selection-feedback E2E: failed-exit fixture was not selected ${JSON.stringify({
    selectedId: state.selectedId,
    activePointer: state.activePointer,
  })}`);
}
const failedExitPointer = state.activePointer;
await clearFeedbackDraws(page);
await page.mouse.move(failedExitTarget.x, failedExitTarget.y);
state = await debug(page);
const failedExitBlock = state.puzzle.blocks.find((candidate) => candidate.id === block.id);
if (state.selectedId !== block.id || state.activePointer !== failedExitPointer
  || state.dragMotion?.blockId !== block.id || state.dragMotion.state !== "dragging"
  || state.selectionFeedback?.mode !== "blocked"
  || state.exitFailure?.status !== failedExitFixture.status
  || failedExitBlock?.x !== failedExitOrigin.x || failedExitBlock.y !== failedExitOrigin.y
  || state.puzzle.moves !== failedExitOrigin.moves
  || state.exitPulses.length !== failedExitOrigin.exitPulses
  || state.particles <= failedExitOrigin.particles) {
  throw new Error(`Selection-feedback E2E: failed exit lost its non-visual feedback semantics ${JSON.stringify({
    fixture: failedExitFixture,
    selectedId: state.selectedId,
    activePointer: state.activePointer,
    dragMotion: state.dragMotion,
    selectionFeedback: state.selectionFeedback,
    exitFailure: state.exitFailure,
    block: failedExitBlock,
    moves: state.puzzle.moves,
    particles: state.particles,
    exitPulses: state.exitPulses,
  })}`);
}
await page.evaluate(() => window.__COLOR_ESCAPE__.render());
await assertSelectionDecorationDraws(page, "held failed exit");
if (await feedbackDrawCount(page) <= 0) {
  throw new Error("Selection-feedback E2E: held failed-exit draw audit was empty");
}
await page.screenshot({ path: shot(`round42-selection-failed-exit-${failedExitFixture.status}-without-gold-halo.png`) });
await clearFeedbackDraws(page);
await page.mouse.up();
await page.evaluate(() => window.__COLOR_ESCAPE__.render());
state = await debug(page);
if (state.selectedId || state.activePointer != null
  || state.exitFailure?.status !== failedExitFixture.status
  || !state.puzzle.blocks.some((candidate) => candidate.id === block.id)
  || state.puzzle.moves !== failedExitOrigin.moves
  || state.exitPulses.length !== failedExitOrigin.exitPulses) {
  throw new Error(`Selection-feedback E2E: failed-exit release semantics drifted ${JSON.stringify({
    fixture: failedExitFixture,
    selectedId: state.selectedId,
    activePointer: state.activePointer,
    exitFailure: state.exitFailure,
    moves: state.puzzle.moves,
    exitPulses: state.exitPulses,
  })}`);
}
await assertNoBlockedHaloDraws(page, "failed-exit release");
if (await feedbackDrawCount(page) <= 0) {
  throw new Error("Selection-feedback E2E: failed-exit-release draw audit was empty");
}
await page.screenshot({ path: shot(`round42-selection-failed-exit-${failedExitFixture.status}-released-without-gold-halo.png`) });

state = await openLevel(page, 15);
block = state.puzzle.blocks.find((candidate) => candidate.layers.length > 1);
if (!block) throw new Error("Selection-feedback E2E: layered block missing");
start = cellPoint(page, state, block);
await clearFeedbackDraws(page);
await page.mouse.move(start.x, start.y);
await page.mouse.down();
await page.waitForTimeout(100);
state = await debug(page);
if (state.selectedId !== block.id || state.activePointer == null
  || state.dragMotion?.blockId !== block.id || state.selectionFeedback?.mode !== "grabbed") {
  throw new Error("Selection-feedback E2E: layered block lost pointer/selection state");
}
await assertSelectionDecorationDraws(page, "layered selection");
await page.screenshot({ path: shot("round42-selection-layered-level-015.png") });
await page.mouse.up();

state = await openLevel(page, 10);
block = state.puzzle.blocks.find((candidate) => candidate.frozen > 0);
if (!block) throw new Error("Selection-feedback E2E: frozen block missing");
start = cellPoint(page, state, block);
await page.mouse.click(start.x, start.y);
await page.waitForTimeout(60);
state = await debug(page);
if (state.selectedId || state.selectionFeedback) {
  throw new Error("Selection-feedback E2E: inactive frozen block falsely showed a grab halo");
}
await page.screenshot({ path: shot("round42-selection-frozen-level-010.png") });
await page.close();

const onboarding = await browser.newPage({ viewport: { width: 496, height: 1078 } });
attachErrors(onboarding);
await seed(onboarding, save(false, false));
state = await openLevel(onboarding, 1);
block = state.puzzle.blocks.find((candidate) => candidate.id === state.level.onboardingHint?.blockId);
if (!block) throw new Error("Selection-feedback E2E: onboarding hint block missing");
if (!state.onboarding.guide) throw new Error("Selection-feedback E2E: onboarding guide missing");
const onboardingBlockCount = state.puzzle.blocks.length;
await performGuideGesture(onboarding, state.onboarding.guide);
await onboarding.waitForTimeout(100);
state = await debug(onboarding);
const tutorialDirectExit = state.onboarding.basicsSeen
  && !state.onboarding.guide
  && !state.selectedId
  && !state.selectionFeedback
  && !state.puzzle.blocks.some((candidate) => candidate.id === block.id)
  && state.puzzle.blocks.length === onboardingBlockCount - 1
  && state.puzzle.moves === 1;
if (!tutorialDirectExit) {
  const onboardingAudit = {
    onboarding: state.onboarding,
    selectedId: state.selectedId,
    selectionFeedback: state.selectionFeedback,
    blocks: state.puzzle.blocks.map((candidate) => candidate.id),
    moves: state.puzzle.moves,
  };
  throw new Error(`Selection-feedback E2E: tutorial interaction state drifted: ${JSON.stringify(onboardingAudit)}`);
}
await onboarding.screenshot({ path: shot("round42-selection-onboarding-level-001.png") });
await onboarding.mouse.up();
await onboarding.close();

const mobile = await browser.newPage({ viewport: { width: 320, height: 568 } });
attachErrors(mobile);
await installFeedbackDrawAudit(mobile);
await seed(mobile, save(true, true));
state = await openLevel(mobile, 100);
block = state.puzzle.blocks.find((candidate) => (
  candidate.frozen <= 0
  && (!candidate.shutterId || (state.puzzle.shutters.find((shutter) => shutter.id === candidate.shutterId)?.count ?? 0) <= 0)
));
if (!block) throw new Error("Selection-feedback E2E: no active Lv100 block for reduced-motion fixture");
start = cellPoint(mobile, state, block);
await clearFeedbackDraws(mobile);
await mobile.mouse.move(start.x, start.y);
await mobile.mouse.down();
await mobile.waitForTimeout(100);
state = await debug(mobile);
if (state.selectedId !== block.id || state.activePointer == null
  || state.dragMotion?.blockId !== block.id || state.selectionFeedback?.mode !== "grabbed") {
  throw new Error("Selection-feedback E2E: reduced-motion 320x568 lost pointer/selection state");
}
await assertSelectionDecorationDraws(mobile, "reduced-motion 320x568 selection");
await mobile.screenshot({ path: shot("round42-selection-level-100-320x568.png") });
await mobile.mouse.up();
await mobile.close();

await browser.close();
if (errors.length) throw new Error(`Selection-feedback browser errors:\n${errors.join("\n")}`);
console.log("Formal selection/blue fallback feedback remained intact; collision and failed-exit hold/release kept blocked semantics without drawing the gold blocked halo; layered/frozen, onboarding, reduced motion, and 320x568 passed.");
