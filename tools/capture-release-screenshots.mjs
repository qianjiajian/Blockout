import { access, copyFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const output = resolve(projectRoot, "release-assets", "screenshots");
const archive = resolve(output, "archive", "2026-08-31");
const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
const releaseNames = [
  "01-home.png",
  "02-gameplay.png",
  "03-level-select.png",
  "03-levels.png",
  "04-achievements.png",
  "05-result.png",
  "06-onboarding.png",
  "07-daily-challenge.png",
  "08-mechanic-ice.png",
  "09-mechanic-layer.png",
  "10-mechanic-shutter.png",
];
const updateId = "2026-09-04-r76";

await mkdir(archive, { recursive: true });
for (const name of releaseNames) {
  const source = resolve(output, name);
  const destination = resolve(archive, name);
  try {
    await access(destination);
  } catch {
    await copyFile(source, destination);
  }
}

const completed = (count) => Array.from({ length: count }, (_, index) => index + 1);
const stars = (count) => Object.fromEntries(completed(count).map((id) => [String(id), 3]));
const moves = (count) => Object.fromEntries(completed(count).map((id) => [String(id), 8 + (id % 9)]));
const makeSave = ({ currentLevel = 1, highestLevel = currentLevel, completedCount = Math.max(0, highestLevel - 1), coins = 6440, featureSeen } = {}) => ({
  schemaVersion: 1,
  currentLevel,
  highestLevel,
  coins,
  sound: false,
  haptic: false,
  reducedMotion: true,
  featureSeen: featureSeen ?? ["basics", "ice-door", "ice-block", "layer", "shutter", "generator", "elevator", "conveyor", "star"],
  boosters: { time: 3, rocket: 3, pulse: 3 },
  bestStars: stars(completedCount),
  bestMoves: moves(completedCount),
  rewardedLevels: completed(completedCount),
  dailyStreak: 4,
  lastDailyCompletedDay: "",
  lastSeenUpdate: updateId,
});

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 720, height: 1584 } });
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(error.message));
const state = () => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const scale = Math.min(720 / 496, 1584 / 1078);
const offsetX = (720 - 496 * scale) / 2;
const offsetY = (1584 - 1078 * scale) / 2;
const toPage = ({ x, y }) => ({ x: offsetX + x * scale, y: offsetY + y * scale });
const click = async (x, y) => {
  const point = toPage({ x, y });
  await page.mouse.click(point.x, point.y);
};
const openWithSave = async (save) => {
  await page.goto(playtestUrl, { waitUntil: "networkidle" });
  await page.evaluate((value) => localStorage.setItem("color-escape-save-v1", JSON.stringify(value)), save);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().art.ready, undefined, { timeout: 5_000 });
  await page.waitForTimeout(40);
};
const capture = async (name) => page.screenshot({ path: resolve(output, name) });

// 01: clean first-session home, with current ImageGen main-screen composition.
await openWithSave(makeSave({ currentLevel: 1, highestLevel: 1, completedCount: 0, coins: 1000, featureSeen: [] }));
await capture("01-home.png");

// 02: a representative high-density irregular board with live mechanics.
await openWithSave(makeSave({ currentLevel: 58, highestLevel: 58, completedCount: 57 }));
await page.evaluate(() => window.__COLOR_ESCAPE__.loadLevel(58, true));
await page.waitForTimeout(220);
await capture("02-gameplay.png");

// 03/04: fully unlocked season pages demonstrate 100 levels and 300 stars.
await openWithSave(makeSave({ currentLevel: 100, highestLevel: 100, completedCount: 100 }));
await click(347, 1035);
if ((await state()).screen !== "levels") throw new Error("Release capture: level select did not open");
await capture("03-level-select.png");
await openWithSave(makeSave({ currentLevel: 100, highestLevel: 100, completedCount: 100 }));
await click(446, 1035);
if ((await state()).screen !== "records") throw new Error("Release capture: achievements did not open");
await capture("04-achievements.png");

// 05: naturally solve Level 5 so the store result shows fair stars/reward copy.
await openWithSave(makeSave({ currentLevel: 5, highestLevel: 5, completedCount: 4 }));
await page.evaluate(() => window.__COLOR_ESCAPE__.loadLevel(5, true));
const route = await page.evaluate(async () => {
  const [{ getLevel }, { solveLevelForValidation }] = await Promise.all([
    import("/src/core/levels.ts"),
    import("/src/core/levelSolver.ts"),
  ]);
  return solveLevelForValidation(getLevel(5));
});
for (const drag of route.drags) {
  const current = await state();
  const block = current.puzzle.blocks.find((candidate) => candidate.id === drag.blockId);
  if (!block) throw new Error(`Release capture: missing ${drag.blockId}`);
  const [anchorX, anchorY] = block.shape[0];
  const logicalStart = {
    x: current.board.innerX + (block.x + anchorX + 0.5) * current.board.cell,
    y: current.board.innerY + (block.y + anchorY + 0.5) * current.board.cell,
  };
  const start = toPage(logicalStart);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  for (const [x, y] of drag.path) {
    const target = toPage({
      x: current.board.innerX + (x + anchorX + 0.5) * current.board.cell,
      y: current.board.innerY + (y + anchorY + 0.5) * current.board.cell,
    });
    await page.mouse.move(target.x, target.y, { steps: 3 });
  }
  if (drag.exitSide) {
    const held = await state();
    const remaining = held.puzzle.blocks.find((candidate) => candidate.id === drag.blockId);
    const expectedLayers = Math.max(0, block.layers.length - 1);
    if (held.selectedId || held.activePointer !== undefined
      || (expectedLayers === 0 && remaining)
      || (expectedLayers > 0 && (!remaining || remaining.layers.length !== expectedLayers))) {
      throw new Error(`Release capture: ${drag.blockId} did not resolve while the pointer stayed down`);
    }
  }
  await page.mouse.up();
  await page.waitForTimeout(120);
}
await page.waitForTimeout(1500);
if ((await state()).screen !== "win") throw new Error("Release capture: Level 5 result did not settle");
await capture("05-result.png");

// 06: current route-synchronized first-move hand.
await openWithSave(makeSave({ currentLevel: 1, highestLevel: 1, completedCount: 0, coins: 1000, featureSeen: [] }));
await click(248, 812);
await page.waitForTimeout(260);
if (!(await state()).onboarding.guide) throw new Error("Release capture: onboarding guide is missing");
await capture("06-onboarding.png");

// 07: unlocked daily challenge entrance with live selected level and streak.
await openWithSave(makeSave({ currentLevel: 22, highestLevel: 22, completedCount: 21 }));
await capture("07-daily-challenge.png");

const captureFeature = async (levelId, name) => {
  const level = await page.evaluate(async (id) => {
    const { getLevel } = await import("/src/core/levels.ts");
    return getLevel(id);
  }, levelId);
  if (!level.featureIntro) throw new Error(`Release capture: Level ${levelId} has no feature intro`);
  const seen = ["basics", "ice-door", "ice-block", "layer", "shutter", "generator", "elevator", "conveyor", "star"]
    .filter((kind) => kind !== level.featureIntro.kind);
  await openWithSave(makeSave({ currentLevel: levelId, highestLevel: levelId, completedCount: levelId - 1, featureSeen: seen }));
  await click(248, 812);
  await page.waitForTimeout(180);
  const current = await state();
  if (current.screen !== "feature" || current.level.featureIntro.kind !== level.featureIntro.kind) {
    throw new Error(`Release capture: Level ${levelId} feature modal did not open`);
  }
  await capture(name);
};

await captureFeature(6, "08-mechanic-ice.png");
await captureFeature(8, "09-mechanic-layer.png");
await captureFeature(35, "10-mechanic-generator.png");

await page.close();
await browser.close();
if (errors.length) throw new Error(`Release capture browser errors:\n${errors.join("\n")}`);
console.log("Captured 10 current 720x1584 release screenshots and preserved the previous set.");
