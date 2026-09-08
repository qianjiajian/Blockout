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
  featureSeen: basicsSeen ? ["basics", "ice-door", "ice-block", "layer", "shutter"] : [],
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
await seed(page);
let state = await openLevel(page, 3);
await page.screenshot({ path: shot("round42-selection-level-003-idle.png") });

const selectionFixtures = await page.evaluate(async () => {
  const [{ getLevel }, { PuzzleModel }] = await Promise.all([
    import("/src/core/levels.ts"),
    import("/src/core/PuzzleModel.ts"),
  ]);
  const level = getLevel(3);
  const directions = [[1, 0], [0, 1], [-1, 0], [0, -1]];
  let movable;
  let blocked;
  for (const authored of level.blocks) {
    const activeCheck = new PuzzleModel(level);
    const activeBlock = activeCheck.getBlock(authored.id);
    if (!activeBlock || !activeCheck.isBlockActive(activeBlock)) continue;
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
      if (moved && !movable) movable = { blockId: block.id, dx, dy };
      if (!moved && inside && !blocked) blocked = { blockId: block.id, dx, dy };
    }
  }
  if (!movable || !blocked) throw new Error("Selection-feedback E2E: no dynamic movable/blocked fixtures on Lv3");
  return { movable, blocked };
});

let block = state.puzzle.blocks.find((candidate) => candidate.id === selectionFixtures.movable.blockId);
if (!block) throw new Error("Selection-feedback E2E: dynamic movable block missing");
let start = cellPoint(page, state, block);
await page.mouse.move(start.x, start.y);
await page.mouse.down();
await page.waitForTimeout(150);
state = await debug(page);
if (state.selectedId !== block.id || state.selectionFeedback?.mode !== "grabbed"
  || !state.selectionFeedback.grabHaloReady || !state.selectionFeedback.blockedHaloReady) {
  throw new Error("Selection-feedback E2E: grab halo state or assets were not exposed");
}
await page.screenshot({ path: shot("round42-selection-level-003-grabbed.png") });

const dragTarget = screenPoint(page, {
  x: state.board.innerX + (block.x + block.shape[0][0] + selectionFixtures.movable.dx + 0.5) * state.board.cell,
  y: state.board.innerY + (block.y + block.shape[0][1] + selectionFixtures.movable.dy + 0.5) * state.board.cell,
});
await page.mouse.move(dragTarget.x, dragTarget.y, { steps: 5 });
state = await debug(page);
if (state.selectedId !== block.id || state.selectionFeedback?.mode !== "grabbed") {
  throw new Error("Selection-feedback E2E: halo did not persist through a live drag");
}
await page.screenshot({ path: shot("round42-selection-level-003-mid-drag.png") });
await page.mouse.up();

state = await openLevel(page, 3);
block = state.puzzle.blocks.find((candidate) => candidate.id === selectionFixtures.blocked.blockId);
if (!block) throw new Error("Selection-feedback E2E: dynamic blocked block missing");
start = cellPoint(page, state, block);
await page.mouse.move(start.x, start.y);
await page.mouse.down();
const blockedTarget = screenPoint(page, {
  x: state.board.innerX + (block.x + block.shape[0][0] + selectionFixtures.blocked.dx + 0.5) * state.board.cell,
  y: state.board.innerY + (block.y + block.shape[0][1] + selectionFixtures.blocked.dy + 0.5) * state.board.cell,
});
await page.mouse.move(blockedTarget.x, blockedTarget.y);
state = await debug(page);
if (state.selectedId !== block.id || state.selectionFeedback?.mode !== "blocked") {
  throw new Error("Selection-feedback E2E: collision did not replace the grab halo with the blocked halo");
}
await page.screenshot({ path: shot("round42-selection-level-003-blocked.png") });
await page.mouse.up();

state = await openLevel(page, 16);
block = state.puzzle.blocks.find((candidate) => candidate.layers.length > 1);
if (!block) throw new Error("Selection-feedback E2E: layered block missing");
start = cellPoint(page, state, block);
await page.mouse.move(start.x, start.y);
await page.mouse.down();
await page.waitForTimeout(100);
state = await debug(page);
if (state.selectedId !== block.id || state.selectionFeedback?.mode !== "grabbed") {
  throw new Error("Selection-feedback E2E: layered block lost grab feedback");
}
await page.screenshot({ path: shot("round42-selection-layered-level-016.png") });
await page.mouse.up();

state = await openLevel(page, 11);
block = state.puzzle.blocks.find((candidate) => candidate.frozen > 0);
if (!block) throw new Error("Selection-feedback E2E: frozen block missing");
start = cellPoint(page, state, block);
await page.mouse.click(start.x, start.y);
await page.waitForTimeout(60);
state = await debug(page);
if (state.selectedId || state.selectionFeedback) {
  throw new Error("Selection-feedback E2E: inactive frozen block falsely showed a grab halo");
}
await page.screenshot({ path: shot("round42-selection-frozen-level-011.png") });
await page.close();

const onboarding = await browser.newPage({ viewport: { width: 496, height: 1078 } });
attachErrors(onboarding);
await seed(onboarding, save(false, false));
state = await openLevel(onboarding, 1);
block = [...state.puzzle.blocks].sort((a, b) => b.x - a.x || a.y - b.y)[0];
start = cellPoint(onboarding, state, block);
await onboarding.mouse.move(start.x, start.y);
await onboarding.mouse.down();
await onboarding.waitForTimeout(100);
state = await debug(onboarding);
if (state.onboarding.basicsSeen || state.selectedId !== block.id || state.selectionFeedback?.mode !== "grabbed") {
  throw new Error("Selection-feedback E2E: tutorial hand and grab feedback did not coexist before the first move");
}
await onboarding.screenshot({ path: shot("round42-selection-onboarding-level-001.png") });
await onboarding.mouse.up();
await onboarding.close();

const mobile = await browser.newPage({ viewport: { width: 320, height: 568 } });
attachErrors(mobile);
await seed(mobile, save(true, true));
state = await openLevel(mobile, 100);
block = state.puzzle.blocks.find((candidate) => (
  candidate.frozen <= 0
  && (!candidate.shutterId || (state.puzzle.shutters.find((shutter) => shutter.id === candidate.shutterId)?.count ?? 0) <= 0)
));
if (!block) throw new Error("Selection-feedback E2E: no active Lv100 block for reduced-motion fixture");
start = cellPoint(mobile, state, block);
await mobile.mouse.move(start.x, start.y);
await mobile.mouse.down();
await mobile.waitForTimeout(100);
state = await debug(mobile);
if (state.selectedId !== block.id || state.selectionFeedback?.mode !== "grabbed") {
  throw new Error("Selection-feedback E2E: reduced-motion 320x568 lost its static grab halo");
}
await mobile.screenshot({ path: shot("round42-selection-level-100-320x568.png") });
await mobile.mouse.up();
await mobile.close();

await browser.close();
if (errors.length) throw new Error(`Selection-feedback browser errors:\n${errors.join("\n")}`);
console.log("ImageGen grab/blocked feedback, live drag, layered/frozen semantics, onboarding, reduced motion, and 320x568 passed.");
