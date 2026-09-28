import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";

const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
const output = fileURLToPath(new URL("../playtest-results/hud-description-hidden/", import.meta.url));
const viewports = [
  { name: "phone", width: 423, height: 923 },
  { name: "reference", width: 720, height: 1584 },
];

await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const reports = [];

for (const viewport of viewports) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  const browserErrors = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(message.text());
  });

  await page.addInitScript(() => {
    localStorage.setItem("color-escape-save-v1", JSON.stringify({
      schemaVersion: 1,
      currentLevel: 8,
      highestLevel: 100,
      coins: 1340,
      sound: false,
      haptic: false,
      reducedMotion: true,
      featureSeen: ["basics", "ice-door", "ice-block", "layer", "shutter", "generator", "elevator", "conveyor", "star"],
      boosterUnlockSeen: ["time", "rocket", "pulse"],
      boosters: { time: 3, rocket: 3, pulse: 3 },
      bestStars: {},
      bestMoves: {},
      rewardedLevels: [],
      lifeState: { lives: 5, nextLifeAtMs: 0, unlimitedLivesUntilMs: 0 },
      dailyStreak: 0,
      lastDailyCompletedDay: "",
    }));

    const records = [];
    globalThis.__HUD_TEXT_AUDIT__ = records;
    globalThis.__resetHudTextAudit = () => { records.length = 0; };
    for (const method of ["strokeText", "fillText"]) {
      const original = CanvasRenderingContext2D.prototype[method];
      CanvasRenderingContext2D.prototype[method] = function auditedHudText(text, x, y, ...args) {
        records.push({ method, text: String(text), x: Number(x), y: Number(y) });
        return original.call(this, text, x, y, ...args);
      };
    }
  });

  await page.goto(playtestUrl, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().art.ready, undefined, { timeout: 15_000 });
  await page.evaluate(() => window.__COLOR_ESCAPE__.loadLevel(8, true));
  await page.waitForFunction(() => {
    const state = window.__COLOR_ESCAPE__?.getDebugState();
    return state?.screen === "playing"
      && state.level.id === 8
      && state.art.formalGameplay.uiReady
      && !state.art.formalGameplay.requestedBlockSignature;
  }, undefined, { timeout: 15_000 });
  await page.evaluate(() => {
    globalThis.__resetHudTextAudit();
    window.dispatchEvent(new Event("resize"));
  });
  await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));

  const records = await page.evaluate(() => structuredClone(globalThis.__HUD_TEXT_AUDIT__));
  const visibleText = records.filter(({ method }) => method === "fillText").map(({ text }) => text);
  const hiddenDescription = visibleText.filter((text) => /(?:经典关卡|困难关卡|超级困难|步数|三星)/.test(text));
  if (hiddenDescription.length) {
    throw new Error(`HUD description is still visible at ${viewport.name}: ${JSON.stringify(hiddenDescription)}`);
  }
  if (!visibleText.includes("LEVEL 8") || !visibleText.some((text) => /^\d{2}:\d{2}$/.test(text))) {
    throw new Error(`HUD control text was not rendered at ${viewport.name}: ${JSON.stringify(visibleText)}`);
  }
  if (browserErrors.length) {
    throw new Error(`Browser errors at ${viewport.name}:\n${browserErrors.join("\n")}`);
  }

  const screenshot = `level-008-${viewport.name}-${viewport.width}x${viewport.height}.png`;
  await page.screenshot({ path: resolve(output, screenshot) });
  reports.push({ viewport, screenshot, descriptionHidden: true, levelAndTimerRetained: true });
  await page.close();
}

await browser.close();
await writeFile(resolve(output, "hud-description-hidden-report.json"), `${JSON.stringify({
  playtestUrl,
  levelId: 8,
  reports,
}, null, 2)}\n`);

console.log(`HUD description hidden PASS: Lv8 at ${viewports.map(({ width, height }) => `${width}x${height}`).join(" and ")}.`);
