import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";

const output = fileURLToPath(new URL("../playtest-results/", import.meta.url));
const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
await mkdir(output, { recursive: true });

const save = (reducedMotion = false) => ({
  schemaVersion: 1,
  currentLevel: 3,
  highestLevel: 100,
  coins: 1000,
  sound: false,
  haptic: false,
  reducedMotion,
  featureSeen: ["basics", "ice-door", "ice-block", "layer", "shutter", "generator", "elevator", "conveyor", "star"],
  boosters: { time: 3, rocket: 3, pulse: 3 },
  bestStars: {},
  bestMoves: {},
  rewardedLevels: [],
  dailyStreak: 0,
  lastDailyCompletedDay: "",
  lastSeenUpdate: "2026-09-05-r95",
});

const debug = (page) => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const toScreen = (page, logical) => {
  const viewport = page.viewportSize();
  const scale = Math.min(viewport.width / 496, viewport.height / 1078);
  return {
    x: (viewport.width - 496 * scale) / 2 + logical.x * scale,
    y: (viewport.height - 1078 * scale) / 2 + logical.y * scale,
  };
};
const blockPoint = (page, state, block) => {
  const [dx, dy] = [...block.shape].sort((left, right) => {
    const leftX = block.x + left[0];
    const leftY = block.y + left[1];
    const rightX = block.x + right[0];
    const rightY = block.y + right[1];
    const leftInset = Math.min(leftX, leftY, state.level.width - 1 - leftX, state.level.height - 1 - leftY);
    const rightInset = Math.min(rightX, rightY, state.level.width - 1 - rightX, state.level.height - 1 - rightY);
    return rightInset - leftInset;
  })[0];
  return toScreen(page, {
    x: state.board.innerX + (block.x + dx + 0.5) * state.board.cell,
    y: state.board.innerY + (block.y + dy + 0.5) * state.board.cell,
  });
};
const expectedGateIds = (state, block) => {
  const activeColor = block.layers[0] ?? block.color;
  return state.puzzle.gates
    .filter((gate) => gate.frozen <= 0 && gate.color === activeColor && (!block.star || gate.star))
    .map((gate) => gate.id)
    .sort();
};
const seed = async (page, reducedMotion = false) => {
  await page.goto(playtestUrl, { waitUntil: "networkidle" });
  await page.evaluate((value) => localStorage.setItem("color-escape-save-v1", JSON.stringify(value)), save(reducedMotion));
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(180);
};
const openLevel = async (page, levelId) => {
  await page.evaluate((id) => window.__COLOR_ESCAPE__.loadLevel(id, true), levelId);
  await page.waitForTimeout(160);
  const state = await debug(page);
  if (state.screen !== "playing" || state.level.id !== levelId) throw new Error(`Gate-focus E2E: failed to open Lv${levelId}`);
  return state;
};
const assertFocus = (state, block, context) => {
  const expected = expectedGateIds(state, block);
  const actual = state.targetGateFocus.map((gate) => gate.id).sort();
  if (expected.length === 0 || JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`Gate-focus E2E ${context}: expected ${expected.join(",")}, received ${actual.join(",")}; selected=${state.selectedId ?? "none"}`);
  }
};
const isActive = (state, block) => block.frozen <= 0
  && (!block.shutterId || (state.puzzle.shutters.find((shutter) => shutter.id === block.shutterId)?.count ?? 0) <= 0);

const browser = await chromium.launch({ headless: true });
const errors = [];
const createPage = async (viewport, reducedMotion = false) => {
  const page = await browser.newPage({ viewport });
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("pageerror", (error) => errors.push(error.message));
  await seed(page, reducedMotion);
  return page;
};

const standard = await createPage({ width: 720, height: 1584 });
const focusFixture = await standard.evaluate(async () => {
  const [{ getLevel }, { PuzzleModel }] = await Promise.all([
    import("/src/core/levels.ts"),
    import("/src/core/PuzzleModel.ts"),
  ]);
  for (let levelId = 1; levelId <= 100; levelId += 1) {
    const model = new PuzzleModel(getLevel(levelId));
    const snapshot = model.snapshot();
    for (const candidate of snapshot.blocks) {
      if (!model.isBlockActive(candidate) || model.possibleExitSides(candidate).length > 0) continue;
      const activeColor = candidate.layers[0] ?? candidate.color;
      const hasAvailableTarget = snapshot.gates.some((gate) => (
        gate.frozen <= 0 && gate.color === activeColor && (!candidate.star || gate.star)
      ));
      if (hasAvailableTarget) return { levelId, blockId: candidate.id };
    }
  }
  throw new Error("Gate-focus E2E: frozen campaign has no non-aligned active block with an available target");
});
let state = await openLevel(standard, focusFixture.levelId);
let block = state.puzzle.blocks.find((candidate) => candidate.id === focusFixture.blockId);
if (!block) throw new Error("Gate-focus E2E: dynamic focus fixture block missing");
let point = blockPoint(standard, state, block);
await standard.mouse.move(point.x, point.y);
await standard.mouse.down();
await standard.waitForTimeout(220);
state = await debug(standard);
assertFocus(state, block, `Lv${focusFixture.levelId} held`);
await standard.screenshot({ path: resolve(output, "round65-gate-focus-dynamic-720x1584.png") });
await standard.mouse.up();
await standard.waitForTimeout(120);
state = await debug(standard);
if (state.targetGateFocus.length !== 0) throw new Error("Gate-focus E2E: focus remained after release");

state = await openLevel(standard, 100);
block = state.puzzle.blocks.find((candidate) => candidate.star && isActive(state, candidate));
if (!block) throw new Error("Gate-focus E2E: Lv100 has no active star block");
const activeColor = block.layers[0] ?? block.color;
const matchingStarGates = state.puzzle.gates.filter((gate) => gate.color === activeColor && gate.star);
if (matchingStarGates.length === 0 || matchingStarGates.some((gate) => gate.frozen > 0)) {
  throw new Error("Gate-focus E2E: Lv100 no longer provides the available star-gate fixture");
}
point = blockPoint(standard, state, block);
await standard.mouse.move(point.x, point.y);
await standard.mouse.down();
await standard.waitForTimeout(220);
state = await debug(standard);
assertFocus(state, block, "Lv100 star-only held");
await standard.screenshot({ path: resolve(output, "round65-gate-focus-star-level-100-720x1584.png") });
await standard.mouse.up();
await standard.close();

const mobile = await createPage({ width: 320, height: 568 }, true);
state = await openLevel(mobile, focusFixture.levelId);
block = state.puzzle.blocks.find((candidate) => candidate.id === focusFixture.blockId);
if (!block) throw new Error("Gate-focus E2E: reduced-motion dynamic fixture block missing");
point = blockPoint(mobile, state, block);
await mobile.mouse.move(point.x, point.y);
await mobile.mouse.down();
await mobile.waitForTimeout(120);
state = await debug(mobile);
assertFocus(state, block, "320x568 reduced-motion held");
await mobile.screenshot({ path: resolve(output, "round65-gate-focus-dynamic-320x568.png") });
await mobile.mouse.up();
await mobile.close();

await browser.close();
if (errors.length > 0) throw new Error(`Gate-focus browser errors:\n${errors.join("\n")}`);
console.log(`Selected-block target gate focus passed dynamic Lv${focusFixture.levelId}, available star-only Lv100, release cleanup, reduced motion, and 320x568.`);
