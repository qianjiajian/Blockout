import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";

const output = fileURLToPath(new URL(`../playtest-results/boosters-time-freeze-${new Date().toISOString().replaceAll(":", "-")}/`, import.meta.url));
const shot = (name) => resolve(output, name);
const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
await mkdir(output, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 496, height: 1078 } });
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(error.message));
const debug = () => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const blockPoint = (state, id) => {
  const block = state.puzzle.blocks.find((candidate) => candidate.id === id);
  if (!block) throw new Error(`Booster E2E: missing block ${id}`);
  const [anchorX, anchorY] = block.shape[0];
  return {
    x: state.board.innerX + (block.x + anchorX + 0.5) * state.board.cell,
    y: state.board.innerY + (block.y + anchorY + 0.5) * state.board.cell,
  };
};

await page.goto(playtestUrl, { waitUntil: "networkidle" });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: "networkidle" });
await page.evaluate(() => {
  const save = JSON.parse(localStorage.getItem("color-escape-save-v1"));
  save.highestLevel = 100;
  localStorage.setItem("color-escape-save-v1", JSON.stringify(save));
});
await page.reload({ waitUntil: "networkidle" });
const fixtures = await page.evaluate(async () => {
  const { LEVELS } = await import("/src/core/levels.ts");
  const frozenBlockLevel = LEVELS.find((level) => level.blocks.some((block) => (block.frozen ?? 0) > 0));
  const frozenBlock = frozenBlockLevel?.blocks.find((block) => (block.frozen ?? 0) > 0);
  const frozenGateLevel = LEVELS.find((level) => level.gates.some((gate) => (gate.frozen ?? 0) > 0));
  if (!frozenBlockLevel || !frozenBlock || !frozenGateLevel) throw new Error("Booster fixtures are missing");
  return { frozenBlock: { levelId: frozenBlockLevel.id, blockId: frozenBlock.id }, frozenGateLevelId: frozenGateLevel.id };
});
await page.evaluate(() => window.__COLOR_ESCAPE__.loadLevel(1, true));
await page.waitForTimeout(120);

// Time is immediate, visible, costs no puzzle move, and undo refunds it atomically.
await page.mouse.click(132, 990);
let state = await debug();
if (state.economy.boosters.time !== 2 || state.puzzle.remainingSeconds !== 180 || state.puzzle.timeFreezeSeconds <= 9 || state.puzzle.timeFreezeSeconds > 10 || state.puzzle.moves !== 0) {
  throw new Error("Booster E2E: time booster settlement is incorrect");
}
if (state.boosterFeedback?.text !== "时间冻结10秒") throw new Error("Booster E2E: time feedback missing");
await page.screenshot({ path: shot("round18-booster-time.png") });
await page.mouse.click(54, 140);
state = await debug();
if (state.economy.boosters.time !== 3 || state.puzzle.remainingSeconds !== 180 || state.puzzle.timeFreezeSeconds !== 0 || state.puzzle.moves !== 0) {
  throw new Error("Booster E2E: time undo did not refund effect and inventory");
}
if (state.boosterFeedback?.text !== "已返还冻结") throw new Error("Booster E2E: time refund feedback missing");

// An irrelevant pulse must not consume inventory or create undo history.
await page.mouse.click(364, 990);
state = await debug();
if (state.economy.boosters.pulse !== 3 || state.undoActions.length !== 0 || state.boosterFeedback?.text !== "当前没有机关") {
  throw new Error("Booster E2E: irrelevant pulse was not safely rejected");
}
await page.screenshot({ path: shot("round18-booster-no-mechanism.png") });

// Rocket target mode is explicit; choosing another booster cancels the target mode.
await page.mouse.click(248, 990);
state = await debug();
if (state.boosterTarget !== "rocket" || state.economy.boosters.rocket !== 3) {
  throw new Error("Booster E2E: rocket target mode did not arm without spending inventory");
}
await page.screenshot({ path: shot("round18-booster-rocket-target.png") });
await page.mouse.click(132, 990);
state = await debug();
if (state.boosterTarget || state.economy.boosters.time !== 2) {
  throw new Error("Booster E2E: switching boosters left a stale rocket target");
}
await page.mouse.click(54, 140);

// A frozen target is rejected with a reason, keeps targeting active, and costs nothing.
await page.evaluate((levelId) => window.__COLOR_ESCAPE__.loadLevel(levelId, true), fixtures.frozenBlock.levelId);
await page.waitForFunction(() => {
  const g = window.__COLOR_ESCAPE__, d = g.getDebugState();
  return !g.revisedArtLoading && d.art.formalGameplay.requestedBlockSignature == null
    && d.art.formalGameplay.missingWholeBlockIds.length === 0;
});
await page.mouse.click(248, 990);
state = await debug();
const frozenPoint = blockPoint(state, fixtures.frozenBlock.blockId);
await page.mouse.click(frozenPoint.x, frozenPoint.y);
state = await debug();
if (state.boosterTarget !== "rocket" || state.economy.boosters.rocket !== 3 || state.boosterFeedback?.text !== "方块仍冰封") {
  throw new Error(`Booster E2E: frozen rocket target handling is incorrect (${JSON.stringify({ screen: state.screen, target: state.boosterTarget, stock: state.economy.boosters.rocket, feedback: state.boosterFeedback, block: state.puzzle.blocks.find(b => b.id === fixtures.frozenBlock.blockId) })})`);
}
await page.screenshot({ path: shot("round18-booster-frozen-target.png") });

// A successful rocket and pulse both undo with inventory refunds and no move penalty.
await page.evaluate(() => window.__COLOR_ESCAPE__.loadLevel(1, true));
await page.waitForTimeout(80);
await page.mouse.click(248, 990);
state = await debug();
const rocketTargetId = state.puzzle.blocks.find((block) => (block.frozen ?? 0) === 0)?.id;
if (!rocketTargetId) throw new Error("Booster E2E: current Lv1 has no legal rocket target");
const rocketPoint = blockPoint(state, rocketTargetId);
await page.mouse.click(rocketPoint.x, rocketPoint.y);
state = await debug();
if (state.economy.boosters.rocket !== 2 || state.puzzle.blocks.some((block) => block.id === rocketTargetId) || state.puzzle.moves !== 0) {
  throw new Error("Booster E2E: rocket success settlement is incorrect");
}
await page.screenshot({ path: shot("round18-booster-rocket-fired.png") });
await page.mouse.click(54, 140);
state = await debug();
if (state.economy.boosters.rocket !== 3 || !state.puzzle.blocks.some((block) => block.id === rocketTargetId) || state.puzzle.moves !== 0) {
  throw new Error("Booster E2E: rocket undo did not refund effect and inventory");
}
if (state.particles !== 0 || state.exitGhosts !== 0 || state.boosterFeedback?.text !== "已返还火箭") {
  throw new Error("Booster E2E: rocket undo left stale feedback");
}
await page.screenshot({ path: shot("round18-booster-rocket-refund.png") });

await page.evaluate((levelId) => window.__COLOR_ESCAPE__.loadLevel(levelId, true), fixtures.frozenGateLevelId);
await page.waitForTimeout(80);
const frozenBefore = (await debug()).puzzle.gates.map((gate) => gate.frozen);
await page.mouse.click(364, 990);
state = await debug();
if (state.economy.boosters.pulse !== 2 || state.puzzle.moves !== 0 || state.boosterFeedback?.text !== "机关进度 -2") {
  throw new Error("Booster E2E: pulse success settlement is incorrect");
}
await page.mouse.click(54, 140);
state = await debug();
if (state.economy.boosters.pulse !== 3 || state.puzzle.moves !== 0 || state.boosterFeedback?.text !== "已返还脉冲") {
  throw new Error("Booster E2E: pulse undo did not refund inventory");
}
if (JSON.stringify(state.puzzle.gates.map((gate) => gate.frozen)) !== JSON.stringify(frozenBefore)) {
  throw new Error("Booster E2E: pulse undo did not restore mechanism counters");
}

await page.close();

// An active freeze rejects repeated real Pointer uses atomically.
const timeCapContext = await browser.newContext({ viewport: { width: 496, height: 1078 } });
const timeCapPage = await timeCapContext.newPage();
timeCapPage.on("console", (message) => { if (message.type() === "error") errors.push(`[time-cap] ${message.text()}`); });
timeCapPage.on("pageerror", (error) => errors.push(`[time-cap] ${error.message}`));
await timeCapPage.goto(playtestUrl, { waitUntil: "networkidle" });
await timeCapPage.evaluate(() => localStorage.clear());
await timeCapPage.reload({ waitUntil: "networkidle" });
await timeCapPage.evaluate(() => {
  const save = JSON.parse(localStorage.getItem("color-escape-save-v1"));
  save.highestLevel = 100;
  save.sound = false;
  save.haptic = false;
  save.boosterUnlockSeen = ["time", "rocket", "pulse"];
  save.boosters.time = 9;
  localStorage.setItem("color-escape-save-v1", JSON.stringify(save));
});
await timeCapPage.reload({ waitUntil: "networkidle" });
await timeCapPage.evaluate(() => window.__COLOR_ESCAPE__.loadLevel(1, true));
await timeCapPage.waitForTimeout(100);

for (let use = 0; use < 4; use += 1) {
  await timeCapPage.mouse.click(132, 990);
  await timeCapPage.waitForTimeout(20);
}
let timeCapState = await timeCapPage.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const maximumTime = timeCapState.level.timeSeconds;
if (timeCapState.puzzle.remainingSeconds !== maximumTime
  || timeCapState.puzzle.timeFreezeSeconds <= 8
  || timeCapState.economy.boosters.time !== 8
  || timeCapState.undoActions.length !== 1) {
  throw new Error(`Booster E2E: repeated active freeze uses were not rejected atomically (${JSON.stringify({
    remainingSeconds: timeCapState.puzzle.remainingSeconds,
    maximumTime,
    stock: timeCapState.economy.boosters.time,
    undoActions: timeCapState.undoActions.length,
  })})`);
}
const stockAtCap = timeCapState.economy.boosters.time;
const undoActionsAtCap = timeCapState.undoActions.length;

await timeCapPage.mouse.click(132, 990);
await timeCapPage.waitForTimeout(20);
timeCapState = await timeCapPage.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
if (timeCapState.puzzle.remainingSeconds !== maximumTime
  || timeCapState.economy.boosters.time !== stockAtCap
  || timeCapState.undoActions.length !== undoActionsAtCap
  || timeCapState.boosterFeedback?.text !== "冻结中") {
  throw new Error(`Booster E2E: an active freeze use was not rejected atomically (${JSON.stringify({
    remainingSeconds: timeCapState.puzzle.remainingSeconds,
    maximumTime,
    stock: timeCapState.economy.boosters.time,
    expectedStock: stockAtCap,
    undoActions: timeCapState.undoActions.length,
    expectedUndoActions: undoActionsAtCap,
    feedback: timeCapState.boosterFeedback?.text,
  })})`);
}
await timeCapPage.screenshot({ path: shot("booster-active-freeze-rejected.png") });
await timeCapContext.close();

// The persistent rocket target prompt must remain legible at the minimum viewport.
const small = await browser.newPage({ viewport: { width: 320, height: 568 } });
await small.goto(playtestUrl, { waitUntil: "networkidle" });
await small.evaluate(() => localStorage.clear());
await small.reload({ waitUntil: "networkidle" });
await small.evaluate(() => {
  const save = JSON.parse(localStorage.getItem("color-escape-save-v1"));
  save.highestLevel = 100;
  localStorage.setItem("color-escape-save-v1", JSON.stringify(save));
});
await small.reload({ waitUntil: "networkidle" });
await small.evaluate(() => window.__COLOR_ESCAPE__.loadLevel(1, true));
await small.waitForTimeout(100);
const scale = Math.min(320 / 496, 568 / 1078);
const offsetX = (320 - 496 * scale) / 2;
await small.mouse.click(offsetX + 248 * scale, 990 * scale);
const smallState = await small.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
if (smallState.boosterTarget !== "rocket") throw new Error("Booster E2E: 320x568 rocket target did not arm");
await small.screenshot({ path: shot("round18-booster-rocket-target-320x568.png") });
await small.close();

await browser.close();
if (errors.length) throw new Error(`Booster browser errors:\n${errors.join("\n")}`);
console.log(`Booster prompts, active-freeze rejection, invalid-use protection, move neutrality, atomic undo refunds, and 320x568 passed. ${output}`);
