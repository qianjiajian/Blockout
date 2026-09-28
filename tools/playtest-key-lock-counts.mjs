import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const output = fileURLToPath(new URL("../playtest-results/key-lock-counts/", import.meta.url));
const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
const KEY_LOCK_MARKER_VERTICAL_OFFSET_CELLS = -0.12;
const KEY_LOCK_COUNT_VERTICAL_OFFSET_PX = -9;
const KEY_LOCK_COUNT_VERTICAL_OFFSET_CELLS = 0.08;
const viewports = [
  { width: 496, height: 1078, label: "standard" },
  { width: 320, height: 568, label: "small" },
];
await mkdir(output, { recursive: true });

const browser = await chromium.launch({ headless: true });
const results = [];
const errors = [];

for (const viewport of viewports) {
  const page = await browser.newPage({ viewport });
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`[${viewport.label}] ${message.text()}`);
  });
  page.on("pageerror", (error) => errors.push(`[${viewport.label}] ${error.message}`));
  await page.addInitScript(() => {
    window.__KEY_LOCK_TEXT_CALLS__ = [];
    const original = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function fillText(text, x, y, maxWidth) {
      window.__KEY_LOCK_TEXT_CALLS__.push({
        text: String(text),
        x,
        y,
        font: this.font,
        fillStyle: String(this.fillStyle),
        strokeStyle: String(this.strokeStyle),
        lineWidth: this.lineWidth,
      });
      if (maxWidth === undefined) return original.call(this, text, x, y);
      return original.call(this, text, x, y, maxWidth);
    };
  });

  await page.goto(playtestUrl, { waitUntil: "networkidle" });
  await page.evaluate(() => {
    localStorage.setItem("color-escape-save-v1", JSON.stringify({
      schemaVersion: 1,
      currentLevel: 86,
      highestLevel: 100,
      coins: 9999,
      sound: false,
      haptic: false,
      reducedMotion: true,
      featureSeen: [
        "basics", "ice-door", "ice-block", "layer", "shutter", "generator",
        "arrow-block", "key-lock", "lift", "timed-generator", "staged-frame", "star-gate",
      ],
      boosterUnlockSeen: ["time", "rocket", "pulse"],
      boosters: { time: 3, rocket: 3, pulse: 3 },
      bestStars: {},
      bestMoves: {},
      rewardedLevels: [],
      journeyProgress: { claimedMilestoneLevels: [], seenEpisodeUnlockLevels: [] },
      selectedJourneyEpisode: 1,
      dailyStreak: 0,
      lastDailyCompletedDay: "",
      lastSeenUpdate: "",
    }));
  });
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForFunction(
    () => window.__COLOR_ESCAPE__?.getDebugState().art.ready === true,
    undefined,
    { timeout: 20_000 },
  );
  await page.evaluate(() => {
    window.__KEY_LOCK_TEXT_CALLS__ = [];
    window.__COLOR_ESCAPE__.loadLevel(86, true);
  });
  await page.waitForFunction(() => {
    const state = window.__COLOR_ESCAPE__?.getDebugState();
    return state?.screen === "playing" && state.level.id === 86 && state.art.ready;
  }, undefined, { timeout: 10_000 });
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));

  const audit = await page.evaluate(({ verticalOffsetCells, countOffsetCells, countOffsetPx }) => {
    const state = window.__COLOR_ESCAPE__.getDebugState();
    const board = state.board;
    const locks = state.puzzle.blocks.filter((block) => block.lockedBy).map((block) => {
      const cells = block.shape.map(([dx, dy]) => [block.x + dx, block.y + dy]);
      const xs = cells.map(([x]) => x);
      const ys = cells.map(([, y]) => y);
      return {
        id: block.id,
        remaining: block.lockCount ?? 1,
        x: board.innerX + (Math.min(...xs) + Math.max(...xs) + 1) * board.cell / 2,
        y: board.innerY + (Math.min(...ys) + Math.max(...ys) + 1) * board.cell / 2
          + board.cell * (0.17 + verticalOffsetCells + countOffsetCells) + countOffsetPx,
      };
    });
    const calls = window.__KEY_LOCK_TEXT_CALLS__;
    return {
      locks,
      matches: locks.map((lock) => {
        const candidates = calls.filter((call) => call.text === String(lock.remaining));
        const nearest = candidates.sort((left, right) => (
          Math.hypot(left.x - lock.x, left.y - lock.y) - Math.hypot(right.x - lock.x, right.y - lock.y)
        ))[0];
        return {
          ...lock,
          call: nearest,
          distance: nearest ? Math.hypot(nearest.x - lock.x, nearest.y - lock.y) : null,
        };
      }),
    };
  }, {
    verticalOffsetCells: KEY_LOCK_MARKER_VERTICAL_OFFSET_CELLS,
    countOffsetCells: KEY_LOCK_COUNT_VERTICAL_OFFSET_CELLS,
    countOffsetPx: KEY_LOCK_COUNT_VERTICAL_OFFSET_PX,
  });

  if (audit.locks.length !== 2 || audit.matches.some((match) => match.call == null || match.distance > 0.01)) {
    throw new Error(`Lv86 ${viewport.label}: lock counter text mismatch ${JSON.stringify(audit)}`);
  }
  const screenshot = `${output}/lv86-${viewport.label}.png`;
  await page.screenshot({ path: screenshot });
  results.push({ viewport, ...audit, screenshot });
  await page.close();
}

await browser.close();
if (errors.length) throw new Error(`Key-lock count E2E browser errors:\n${errors.join("\n")}`);
await writeFile(`${output}/report.json`, `${JSON.stringify({ level: 86, results }, null, 2)}\n`, "utf8");
console.log(`Key-lock count labels passed: ${results.map((result) => `${result.viewport.label}=${result.matches.map((match) => match.remaining).join(",")}`).join("; ")}`);
