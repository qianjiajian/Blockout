import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";

const output = fileURLToPath(new URL("../playtest-results/", import.meta.url));
const shot = (name) => resolve(output, name);
const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
await mkdir(output, { recursive: true });

const browser = await chromium.launch({
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 496, height: 1078 } });
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
await page.goto(playtestUrl, { waitUntil: "networkidle" });

const stars = Object.fromEntries(Array.from({ length: 100 }, (_, index) => [String(index + 1), index < 40 ? 3 : index < 75 ? 2 : index < 99 ? 1 : 0]));
const moves = Object.fromEntries(Array.from({ length: 99 }, (_, index) => [String(index + 1), 3 + index % 7]));
await page.evaluate(({ stars, moves }) => {
  localStorage.setItem("color-escape-save-v1", JSON.stringify({
    schemaVersion: 1,
    currentLevel: 100,
    highestLevel: 100,
    coins: 2480,
    sound: false,
    haptic: false,
    featureSeen: ["ice-door", "ice-block", "layer", "shutter"],
    boosters: { time: 3, rocket: 3, pulse: 3 },
    bestStars: stars,
    bestMoves: moves,
    rewardedLevels: Array.from({ length: 99 }, (_, index) => index + 1),
  }));
}, { stars, moves });
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(1000);
let state = await page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
if (state.level.id !== 100 || state.progression.highestLevel !== 100) throw new Error("Progression save did not restore level 100");
await page.screenshot({ path: shot("round35-home-level100.png") });

await page.mouse.click(347, 1008);
await page.waitForTimeout(260);
state = await page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
if (state.screen !== "levels") throw new Error("Level-select navigation did not open");
if (state.levelPage !== 9) throw new Error("Journey did not open on the current level's ten-level segment");
await page.screenshot({ path: shot("round35-level-select-81-100.png") });

// Level 93: third node on the 91-100 journey segment.
await page.mouse.click(213, 691);
state = await page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
if (state.screen !== "home" || state.level.id !== 93) throw new Error("Level-select did not choose level 93");

await page.mouse.click(446, 1008);
await page.waitForTimeout(260);
state = await page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
if (state.screen !== "records") throw new Error("Achievement navigation did not open");
await page.waitForTimeout(100);
await page.screenshot({ path: shot("round4-achievements.png") });

await page.mouse.click(248, 1008);
await page.waitForTimeout(260);
state = await page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
if (state.screen !== "home") throw new Error("Collection Home tab did not return to the hub");

await page.evaluate(() => window.__COLOR_ESCAPE__.loadLevel(100, true));
await page.waitForTimeout(120);
await page.screenshot({ path: shot("round35-level100-gameplay.png") });

await page.evaluate(() => window.__COLOR_ESCAPE__.loadLevel(100, false));
await page.mouse.click(347, 1008);
await page.waitForTimeout(260);
await page.setViewportSize({ width: 320, height: 568 });
await page.waitForTimeout(120);
await page.screenshot({ path: shot("round4-mobile-level-select-320x568.png") });
await page.setViewportSize({ width: 496, height: 1078 });
await page.mouse.click(248, 1008);
await page.waitForTimeout(260);
await page.mouse.click(446, 1008);
await page.waitForTimeout(260);
await page.setViewportSize({ width: 320, height: 568 });
await page.waitForTimeout(120);
await page.screenshot({ path: shot("round4-mobile-achievements-320x568.png") });

await page.close();
await browser.close();
if (errors.length) throw new Error(errors.join("\n"));
console.log("Progression restore, paged level selection, achievements, and level-100 visual checks passed.");
