import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";

const output = fileURLToPath(new URL("../playtest-results/locked-target-hierarchy/", import.meta.url));
const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
await mkdir(output, { recursive: true });

const save = {
  schemaVersion: 1,
  currentLevel: 19,
  highestLevel: 100,
  coins: 1000,
  sound: false,
  haptic: false,
  reducedMotion: true,
  featureSeen: ["basics", "ice-door", "ice-block", "layer", "shutter", "generator", "elevator", "conveyor", "star"],
  boosterUnlockSeen: ["time", "rocket", "pulse"],
  boosters: { time: 0, rocket: 0, pulse: 0 },
  bestStars: {},
  bestMoves: {},
  rewardedLevels: [],
  dailyStreak: 0,
  lastDailyCompletedDay: "",
  lastSeenUpdate: "2026-09-05-r88",
};

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 360, height: 792 }, deviceScaleFactor: 2 });
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(error.stack ?? error.message));
await page.goto(playtestUrl, { waitUntil: "networkidle" });
await page.evaluate((value) => localStorage.setItem("color-escape-save-v1", JSON.stringify(value)), save);
await page.reload({ waitUntil: "networkidle" });
await page.waitForFunction(() => Boolean(window.__COLOR_ESCAPE__?.getDebugState().art?.ready));
await page.evaluate(() => window.__COLOR_ESCAPE__.loadLevel(19, true));
await page.waitForTimeout(300);

const audit = await page.evaluate(async () => {
  const state = window.__COLOR_ESCAPE__.getDebugState();
  const visuals = await import("/src/game/availabilityVisuals.ts");
  return {
    levelId: state.level.id,
    frozenGates: state.puzzle.gates.filter((gate) => gate.frozen > 0).length,
    openGates: state.puzzle.gates.filter((gate) => gate.frozen === 0).length,
    frozenBlocks: state.puzzle.blocks.filter((block) => block.frozen > 0).length,
    gateVisual: visuals.gateAvailabilityVisual(3),
    blockVisual: visuals.blockAvailabilityVisual(1),
  };
});
if (audit.levelId !== 19 || audit.frozenGates !== 2 || audit.openGates !== 4 || audit.frozenBlocks !== 3) {
  throw new Error(`Locked-target hierarchy fixture drifted: ${JSON.stringify(audit)}`);
}
if (audit.gateVisual.baseAlpha >= audit.blockVisual.baseAlpha || audit.gateVisual.overlayAlpha >= audit.blockVisual.overlayAlpha) {
  throw new Error(`Frozen exits are not visually quieter than frozen blocks: ${JSON.stringify(audit)}`);
}
await page.screenshot({ path: resolve(output, "level-019-360x792.png") });
await page.setViewportSize({ width: 320, height: 568 });
await page.waitForTimeout(180);
await page.screenshot({ path: resolve(output, "level-019-320x568.png") });

await page.close();
await browser.close();
if (errors.length) throw new Error(`Locked-target hierarchy browser errors:\n${errors.join("\n")}`);
console.log("Lv19 frozen targets are visually de-emphasized while four open exits and all counters remain readable at 360x792 and 320x568.");
