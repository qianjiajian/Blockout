import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";

const output = fileURLToPath(new URL("../playtest-results/feature-intros/", import.meta.url));
const shot = (name) => resolve(output, name);
const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
await mkdir(output, { recursive: true });

const browser = await chromium.launch({ headless: true });
const errors = [];
const cases = [
  { level: 6, kind: "ice-block", name: "ice-block" },
  { level: 7, kind: "ice-door", name: "ice-door" },
  { level: 8, kind: "layer", name: "layer" },
  { level: 35, kind: "generator", name: "generator" },
  { level: 50, kind: "elevator", name: "elevator" },
  { level: 70, kind: "conveyor", name: "conveyor" },
  { level: 91, kind: "star", name: "star" },
];

const save = () => ({
  schemaVersion: 1,
  currentLevel: 6,
  highestLevel: 100,
  coins: 1000,
  sound: false,
  haptic: false,
  featureSeen: ["basics"],
  boosters: { time: 3, rocket: 3, pulse: 3 },
  bestStars: {},
  bestMoves: {},
  rewardedLevels: [],
  dailyStreak: 0,
  lastDailyCompletedDay: "",
});

const runCases = async (page, suffix, width, height) => {
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(playtestUrl, { waitUntil: "networkidle" });
  await page.evaluate((value) => localStorage.setItem("color-escape-save-v1", JSON.stringify(value)), save());
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForFunction(
    () => window.__COLOR_ESCAPE__?.getDebugState().art.ready === true,
    undefined,
    { timeout: 15_000 },
  );

  const scale = Math.min(width / 496, height / 1078);
  const offsetX = (width - 496 * scale) / 2;
  const offsetY = (height - 1078 * scale) / 2;
  const clickLogical = (x, y) => page.mouse.click(offsetX + x * scale, offsetY + y * scale);
  const debug = () => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());

  for (const feature of cases) {
    await page.evaluate((id) => {
      const game = window.__COLOR_ESCAPE__;
      game.loadLevel(id, false);
      game.beginSelectedChallenge();
    }, feature.level);
    await page.waitForTimeout(60);
    let state = await debug();
    if (state.screen !== "feature" || state.level.featureIntro?.kind !== feature.kind) {
      throw new Error(`Feature intro E2E: ${feature.kind} did not open`);
    }
    if ((feature.kind === "ice-door" || feature.kind === "ice-block" || feature.kind === "shutter" || feature.kind === "generator" || feature.kind === "conveyor") && state.featureVisual.counter < 1) {
      throw new Error(`Feature intro E2E: ${feature.kind} did not bind its live countdown`);
    }
    if ((feature.kind === "ice-block" || feature.kind === "layer") && !state.featureVisual.outerColor) {
      throw new Error(`Feature intro E2E: ${feature.kind} did not bind its live outer color`);
    }
    if (feature.kind === "layer" && !state.featureVisual.innerColor) {
      throw new Error("Feature intro E2E: layer did not bind its live inner color");
    }
    await page.screenshot({ path: shot(`round110-feature-${feature.name}${suffix}.png`) });
    await clickLogical(248, 755);
    await page.waitForTimeout(80);
    state = await debug();
    if (state.screen !== "playing") throw new Error(`Feature intro E2E: ${feature.kind} confirmation did not enter play`);

    // The acknowledged feature must not interrupt this level a second time.
    await page.evaluate((id) => {
      const game = window.__COLOR_ESCAPE__;
      game.loadLevel(id, false);
      game.beginSelectedChallenge();
    }, feature.level);
    await page.waitForTimeout(70);
    state = await debug();
    if (state.screen !== "playing") throw new Error(`Feature intro E2E: ${feature.kind} was not one-shot`);
  }
};

const standard = await browser.newPage({ viewport: { width: 496, height: 1078 } });
await runCases(standard, "", 496, 1078);
await standard.close();

const small = await browser.newPage({ viewport: { width: 320, height: 568 } });
await runCases(small, "-320x568", 320, 568);
await small.close();

await browser.close();
if (errors.length) throw new Error(`Feature intro browser errors:\n${errors.join("\n")}`);
console.log("Seven document-aligned one-shot feature intros and 320x568 visuals passed.");
