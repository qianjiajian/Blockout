import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";

const output = fileURLToPath(new URL("../playtest-results/blocker-focus/", import.meta.url));
const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
await mkdir(output, { recursive: true });

const save = (levelId, reducedMotion = false) => ({
  schemaVersion: 1,
  currentLevel: levelId,
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

const browser = await chromium.launch({ headless: true });
const errors = [];
const debug = (page) => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const screenPoint = (page, logical) => {
  const viewport = page.viewportSize();
  const scale = Math.min(viewport.width / 496, viewport.height / 1078);
  return {
    x: (viewport.width - 496 * scale) / 2 + logical.x * scale,
    y: (viewport.height - 1078 * scale) / 2 + logical.y * scale,
  };
};

const seed = async (page, levelId, reducedMotion) => {
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(playtestUrl, { waitUntil: "networkidle" });
  await page.evaluate((value) => localStorage.setItem("color-escape-save-v1", JSON.stringify(value)), save(levelId, reducedMotion));
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().art.ready === true);
  await page.evaluate((id) => window.__COLOR_ESCAPE__.loadLevel(id, true), levelId);
  await page.waitForTimeout(120);
};

const findFixture = (page, levelId) => page.evaluate(async (id) => {
  const [{ getLevel }, { PuzzleModel }, { blockingBlockAtPose }] = await Promise.all([
    import("/src/core/levels.ts"),
    import("/src/core/PuzzleModel.ts"),
    import("/src/game/blockingFocus.ts"),
  ]);
  const level = getLevel(id);
  const model = new PuzzleModel(level);
  const snapshot = model.snapshot();
  const directions = [[1, 0], [0, 1], [-1, 0], [0, -1]];
  for (const block of snapshot.blocks) {
    if (!model.isBlockActive(block)) continue;
    for (const [dx, dy] of directions) {
      const blockerId = blockingBlockAtPose(snapshot, block.id, {
        x: block.x + dx * 0.12,
        y: block.y + dy * 0.12,
      });
      if (blockerId) return { levelId: id, blockId: block.id, blockerId, dx, dy };
    }
  }
  throw new Error(`Blocker-focus E2E: Lv${id} has no adjacent movable-block fixture`);
}, levelId);

const exercise = async ({ levelId, viewport, reducedMotion, fileName }) => {
  const page = await browser.newPage({ viewport, deviceScaleFactor: viewport.width === 360 ? 2 : 1 });
  await seed(page, levelId, reducedMotion);
  const fixture = await findFixture(page, levelId);
  let state = await debug(page);
  const block = state.puzzle.blocks.find((candidate) => candidate.id === fixture.blockId);
  if (!block) throw new Error(`Blocker-focus E2E: missing ${fixture.blockId}`);
  const [shapeX, shapeY] = block.shape[0];
  const start = screenPoint(page, {
    x: state.board.innerX + (block.x + shapeX + 0.5) * state.board.cell,
    y: state.board.innerY + (block.y + shapeY + 0.5) * state.board.cell,
  });
  const target = screenPoint(page, {
    x: state.board.innerX + (block.x + shapeX + 0.5 + fixture.dx * 0.8) * state.board.cell,
    y: state.board.innerY + (block.y + shapeY + 0.5 + fixture.dy * 0.8) * state.board.cell,
  });
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(target.x, target.y, { steps: 4 });
  state = await debug(page);
  if (state.selectionFeedback?.mode !== "blocked"
    || state.blockerFocus?.blockId !== fixture.blockerId
    || state.blockerFocus?.artReady !== true) {
    throw new Error(`Blocker-focus E2E: collision did not expose the real blocker (${JSON.stringify({ fixture, selectionFeedback: state.selectionFeedback, blockerFocus: state.blockerFocus })})`);
  }
  await page.screenshot({ path: resolve(output, fileName) });
  await page.mouse.up();
  await page.waitForTimeout(reducedMotion ? 80 : 120);
  state = await debug(page);
  if (state.selectedId || state.blockerFocus?.blockId !== fixture.blockerId) {
    throw new Error("Blocker-focus E2E: focus did not linger briefly after release");
  }
  await page.waitForTimeout(reducedMotion ? 360 : 620);
  state = await debug(page);
  if (state.blockerFocus) throw new Error("Blocker-focus E2E: focus did not expire");
  await page.close();
  return fixture;
};

const samples = [
  await exercise({ levelId: 58, viewport: { width: 360, height: 792 }, reducedMotion: false, fileName: "level-058-contact-720x1584.png" }),
  await exercise({ levelId: 60, viewport: { width: 360, height: 792 }, reducedMotion: false, fileName: "level-060-contact-720x1584.png" }),
  await exercise({ levelId: 60, viewport: { width: 320, height: 568 }, reducedMotion: true, fileName: "level-060-contact-320x568.png" }),
];

await writeFile(resolve(output, "blocker-focus-report.json"), `${JSON.stringify({
  method: "Real Pointer collision against a dynamically discovered adjacent movable block; no authored solution or route is used.",
  samples,
  standardDurationSeconds: 0.62,
  reducedMotionDurationSeconds: 0.34,
  browserErrors: errors,
}, null, 2)}\n`, "utf8");
await browser.close();
if (errors.length) throw new Error(`Blocker-focus browser errors:\n${errors.join("\n")}`);
console.log("Lv58/Lv60 real-block collision focus, release linger, expiry, DPR2, reduced motion, and 320x568 passed.");
