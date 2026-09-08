import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const output = fileURLToPath(new URL("../playtest-results/", import.meta.url));
const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
await mkdir(output, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 720, height: 1584 } });
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

const audit = await page.evaluate(async () => {
  const [{ LEVELS }, { classifyIceEligibleShape }] = await Promise.all([
    import("/src/core/levels.ts"),
    import("/src/core/blockShape.ts"),
  ]);
  const frozen = LEVELS.flatMap((level) => level.blocks
    .filter((block) => (block.frozen ?? 0) > 0)
    .map((block) => ({
      levelId: level.id,
      blockId: block.id,
      kind: classifyIceEligibleShape(block.shape),
    })));
  return {
    levels: LEVELS.length,
    frozen: frozen.length,
    bars: frozen.filter(({ kind }) => kind === "bar").length,
    rectangles: frozen.filter(({ kind }) => kind === "rectangle").length,
    violations: frozen.filter(({ kind }) => !kind),
  };
});

if (audit.levels !== 100 || audit.frozen !== 123 || audit.violations.length) {
  throw new Error(`Frozen-shape browser audit failed: ${JSON.stringify(audit)}`);
}

for (const levelId of [6, 15, 21, 55]) {
  await page.evaluate((id) => window.__COLOR_ESCAPE__.loadLevel(id, true), levelId);
  await page.waitForTimeout(300);
  const state = await page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
  if (state.level.id !== levelId || state.screen !== "playing") {
    throw new Error(`Frozen-shape E2E: Lv${levelId} did not reach the playing screen`);
  }
  await page.screenshot({
    path: resolve(output, `round114-frozen-shapes-level-${String(levelId).padStart(3, "0")}-720x1584.png`),
  });
}

await page.setViewportSize({ width: 320, height: 568 });
await page.evaluate(() => window.__COLOR_ESCAPE__.loadLevel(6, true));
await page.waitForTimeout(300);
await page.screenshot({ path: resolve(output, "round114-frozen-shapes-level-006-320x568.png") });

await browser.close();
if (errors.length) throw new Error(`Frozen-shape browser errors:\n${errors.join("\n")}`);
console.log(
  `Frozen-shape visual E2E passed: ${audit.frozen} blocks = ${audit.bars} bars + ${audit.rectangles} rectangles, 0 irregular.`,
);
