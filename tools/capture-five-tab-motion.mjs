import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const output = fileURLToPath(new URL("../playtest-results/five-tab-navigation/", import.meta.url));
const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
await mkdir(output, { recursive: true });
const temporaryVideoDir = await mkdtemp(join(tmpdir(), "blockout-five-tabs-"));

const save = {
  schemaVersion: 1,
  currentLevel: 58,
  highestLevel: 58,
  coins: 1640,
  sound: false,
  haptic: false,
  reducedMotion: false,
  featureSeen: ["basics", "ice-door", "ice-block", "layer", "shutter", "generator", "elevator"],
  boosters: { time: 2, rocket: 4, pulse: 1 },
  bestStars: Object.fromEntries(Array.from({ length: 57 }, (_, index) => [String(index + 1), 1 + index % 3])),
  bestMoves: Object.fromEntries(Array.from({ length: 20 }, (_, index) => [String(index + 1), 8 + index % 7])),
  rewardedLevels: Array.from({ length: 57 }, (_, index) => index + 1),
  dailyStreak: 3,
  lastDailyCompletedDay: "",
  lastSeenUpdate: "2026-09-05-r95",
};

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 720, height: 1584 },
  recordVideo: { dir: temporaryVideoDir, size: { width: 360, height: 792 } },
});
const page = await context.newPage();
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(error.message));

await page.goto(playtestUrl, { waitUntil: "networkidle" });
await page.evaluate((value) => localStorage.setItem("color-escape-save-v1", JSON.stringify(value)), save);
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(500);

const logicalPoint = async (x, y) => {
  const state = await page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
  const bounds = await page.locator("canvas").boundingBox();
  if (!bounds) throw new Error("Five-tab capture: canvas bounds are unavailable");
  return {
    x: bounds.x + state.viewportTransform.offsetX + x * state.viewportTransform.scale,
    y: bounds.y + state.viewportTransform.offsetY + y * state.viewportTransform.scale,
  };
};
const clickLogical = async (x, y) => {
  const point = await logicalPoint(x, y);
  await page.mouse.click(point.x, point.y);
  await page.waitForTimeout(520);
};

const shopPoint = await logicalPoint(49.6, 1028);
await page.mouse.click(shopPoint.x, shopPoint.y);
await page.waitForTimeout(20);
const midpointDataUrl = await page.evaluate(() => {
  const game = window.__COLOR_ESCAPE__;
  if (!game.navigationTransition) throw new Error("Five-tab capture: transition did not start");
  // easeOutCubic reaches 50% travel at 1-cuberoot(0.5), not at half time.
  game.navigationTransition.age = game.navigationTransition.duration * (1 - Math.cbrt(0.5));
  game.render();
  return game.host.canvas.toDataURL("image/png");
});
await writeFile(
  resolve(output, "navigation-transition-midpoint-720x1584.png"),
  Buffer.from(midpointDataUrl.replace(/^data:image\/png;base64,/, ""), "base64"),
);
await page.waitForTimeout(520);

for (const x of [148.8, 248, 347.2, 446.4, 248, 49.6]) await clickLogical(x, 1028);

await clickLogical(248, 1028);
const homePoint = await logicalPoint(248, 1028);
const leaderboardPoint = await logicalPoint(148.8, 1028);
const collectionPoint = await logicalPoint(446.4, 1028);

await page.mouse.click(shopPoint.x, shopPoint.y);
await page.waitForTimeout(65);
const reverseBefore = await page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
await page.mouse.click(homePoint.x, homePoint.y);
await page.waitForTimeout(8);
const reverseAfter = await page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
await page.waitForTimeout(300);

await page.mouse.click(shopPoint.x, shopPoint.y);
await page.waitForTimeout(20);
await page.mouse.click(leaderboardPoint.x, leaderboardPoint.y);
await page.waitForTimeout(20);
await page.mouse.click(collectionPoint.x, collectionPoint.y);
await page.waitForTimeout(25);
const queued = await page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
await page.waitForTimeout(425);
const queuedSettled = await page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
await writeFile(
  resolve(output, "navigation-interruption-state.json"),
  `${JSON.stringify({ reverseBefore: reverseBefore.navigation, reverseAfter: reverseAfter.navigation, queued: queued.navigation, queuedSettled: queuedSettled.navigation }, null, 2)}\n`,
  "utf8",
);
await page.waitForTimeout(300);

const video = page.video();
await page.close();
if (!video) throw new Error("Five-tab capture: Playwright did not create a video");
await video.saveAs(resolve(output, "navigation-transition-360x792.webm"));
await context.close();
await browser.close();
await rm(temporaryVideoDir, { recursive: true, force: true });

if (errors.length) throw new Error(`Five-tab capture browser errors:\n${errors.join("\n")}`);
console.log("Captured real five-tab 200ms directional transitions, continuous reversal, and latest-target queue at 360x792.");
