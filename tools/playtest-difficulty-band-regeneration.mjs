import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = resolve(root, "playtest-results/difficulty-band-regeneration");
const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
const regeneratedIds = [5, 11, 13, 15, 16, 17, 21, 22, 24, 25, 26, 28, 30, 34, 65, 70];
const rampTargets = { 6: 70, 7: 72, 8: 74, 9: 75.5, 10: 77 };
const rampIds = Object.keys(rampTargets).map(Number);
const captures = [
  { levelId: 21, width: 496, height: 1078, suffix: "desktop" },
  { levelId: 70, width: 496, height: 1078, suffix: "desktop" },
  { levelId: 5, width: 320, height: 568, suffix: "mobile" },
  { levelId: 26, width: 320, height: 568, suffix: "mobile" },
  { levelId: 6, width: 496, height: 1078, suffix: "desktop" },
  { levelId: 10, width: 496, height: 1078, suffix: "desktop" },
  { levelId: 6, width: 320, height: 568, suffix: "mobile" },
  { levelId: 10, width: 320, height: 568, suffix: "mobile" },
];

await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 496, height: 1078 } });
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
  featureSeen: ["basics", "ice-door", "ice-block", "layer", "shutter", "generator", "elevator", "conveyor", "star"],
  boosters: { time: 3, rocket: 3, pulse: 3 },
  bestStars: {},
  bestMoves: {},
  rewardedLevels: [],
  dailyStreak: 0,
  lastDailyCompletedDay: "",
})));
await page.reload({ waitUntil: "networkidle" });

const scores = await page.evaluate(async (ids) => {
  const [{ LEVELS }, difficulty] = await Promise.all([
    import("/src/core/levels.ts"),
    import("/src/core/blockOutDifficulty.ts"),
  ]);
  return ids.map((levelId) => {
    const level = LEVELS[levelId - 1];
    const scored = difficulty.scoreBlockOutLevel(level);
    const calibrated = difficulty.calibratedBlockOutDifficulty(scored.score);
    return {
      levelId,
      difficulty: level.difficulty,
      timeSeconds: level.timeSeconds,
      calibrated,
      band: difficulty.blockOutDifficultyBand(calibrated)?.id ?? null,
      playableCells: level.playable?.length ?? level.width * level.height,
      frozenGates: level.gates.filter((gate) => (gate.frozen ?? 0) > 0)
        .map((gate) => ({ id: gate.id, count: gate.frozen })),
      frozenBlocks: level.blocks.filter((block) => (block.frozen ?? 0) > 0)
        .map((block) => ({ id: block.id, count: block.frozen })),
      layeredBlocks: level.blocks.filter((block) => (block.layers?.length ?? 1) > 1)
        .map((block) => ({ id: block.id, layers: block.layers })),
    };
  });
}, [...regeneratedIds, ...rampIds]);

const entryScores = scores.filter(({ levelId }) => regeneratedIds.includes(levelId));
const rampScores = scores.filter(({ levelId }) => rampIds.includes(levelId));
const invalidScores = entryScores.filter(({ calibrated, band }) => calibrated < 45 || calibrated >= 50 || band !== "entry");
if (invalidScores.length) throw new Error(`Difficulty-band E2E: invalid scores ${JSON.stringify(invalidScores)}`);
const invalidRamp = rampScores.filter(({ levelId, calibrated, band, difficulty, timeSeconds }) => {
  const target = rampTargets[levelId];
  return calibrated < target || calibrated >= target + 0.25 || band !== "hard" || difficulty !== "hard" || timeSeconds !== 150;
});
if (invalidRamp.length) throw new Error(`Difficulty-band E2E: invalid Lv6–10 ramp ${JSON.stringify(invalidRamp)}`);

for (const capture of captures) {
  await page.setViewportSize({ width: capture.width, height: capture.height });
  await page.evaluate((levelId) => window.__COLOR_ESCAPE__.loadLevel(levelId, true), capture.levelId);
  await page.waitForTimeout(240);
  const state = await page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
  if (state.screen !== "playing" || state.level.id !== capture.levelId || !state.art.ready || !state.art.plainBlocksReady) {
    throw new Error(`Difficulty-band E2E: Lv${capture.levelId} did not render into a ready play state`);
  }
  if (state.board.innerX < 0 || state.board.innerY < 0 || state.board.cell <= 0) {
    throw new Error(`Difficulty-band E2E: Lv${capture.levelId} has invalid board bounds`);
  }
  await page.screenshot({
    path: resolve(output, `level-${String(capture.levelId).padStart(3, "0")}-${capture.suffix}.png`),
  });
}

await writeFile(resolve(output, "report.json"), `${JSON.stringify({
  levelsPassed: scores.length,
  entryLevelsPassed: entryScores.length,
  rampLevelsPassed: rampScores.length,
  scoreRange: {
    min: Math.min(...scores.map(({ calibrated }) => calibrated)),
    max: Math.max(...scores.map(({ calibrated }) => calibrated)),
  },
  captures,
  levels: scores,
}, null, 2)}\n`, "utf8");

await browser.close();
if (errors.length) throw new Error(`Difficulty-band browser errors:\n${errors.join("\n")}`);
console.log(`Difficulty-band visual E2E passed ${scores.length}/${regeneratedIds.length + rampIds.length} levels with ${captures.length} screenshots.`);
