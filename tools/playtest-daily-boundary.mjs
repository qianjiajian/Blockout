import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";

const output = fileURLToPath(new URL("../playtest-results/", import.meta.url));
const shot = (name) => resolve(output, name);
const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
const saveKey = "color-escape-save-v1";
const dayA = "2026-09-01";
const dayB = "2026-09-02";
const beforeMidnight = "2026-09-01T23:59:50+08:00";
const afterMidnight = "2026-09-02T00:00:10+08:00";

await mkdir(output, { recursive: true });

const assert = (condition, message) => {
  if (!condition) throw new Error(`Daily boundary E2E: ${message}`);
};

const baseSave = (overrides = {}) => ({
  schemaVersion: 1,
  currentLevel: 4,
  highestLevel: 11,
  coins: 2000,
  sound: false,
  haptic: false,
  reducedMotion: true,
  featureSeen: ["basics", "ice-door", "ice-block", "layer", "shutter"],
  boosterUnlockSeen: ["time", "rocket", "pulse"],
  boosters: { time: 3, rocket: 3, pulse: 3 },
  bestStars: Object.fromEntries(Array.from({ length: 10 }, (_, index) => [String(index + 1), 3])),
  bestMoves: Object.fromEntries(Array.from({ length: 10 }, (_, index) => [String(index + 1), 20])),
  rewardedLevels: Array.from({ length: 10 }, (_, index) => index + 1),
  dailyStreak: 0,
  lastDailyCompletedDay: "",
  lastSeenUpdate: "2026-09-05-r99",
  ...overrides,
});

const browser = await chromium.launch({ headless: true });
const browserErrors = [];

const createScenario = async (seed) => {
  const context = await browser.newContext({
    viewport: { width: 496, height: 1078 },
    timezoneId: "Asia/Shanghai",
  });
  await context.addInitScript(({ initialIso }) => {
    const NativeDate = Date;
    const nativeParse = NativeDate.parse.bind(NativeDate);
    const clockStorageKey = "color-escape-daily-boundary-now";
    let persistedIso;
    try {
      persistedIso = globalThis.sessionStorage?.getItem(clockStorageKey) ?? undefined;
    } catch {
      // The first about:blank document can deny storage; the target origin will not.
    }
    let controlledNow = nativeParse(persistedIso ?? initialIso);
    const ControlledDate = new Proxy(NativeDate, {
      apply(target) {
        return new target(controlledNow).toString();
      },
      construct(target, argumentsList) {
        return Reflect.construct(target, argumentsList.length ? argumentsList : [controlledNow], target);
      },
    });
    Object.defineProperty(ControlledDate, "now", {
      configurable: true,
      value: () => controlledNow,
    });
    Object.defineProperty(globalThis, "Date", {
      configurable: true,
      writable: true,
      value: ControlledDate,
    });
    Object.defineProperty(globalThis, "__setDailyBoundaryNow", {
      configurable: true,
      value: (nextIso) => {
        const next = nativeParse(nextIso);
        if (!Number.isFinite(next)) throw new Error(`Invalid controlled date: ${nextIso}`);
        controlledNow = next;
        try {
          globalThis.sessionStorage?.setItem(clockStorageKey, nextIso);
        } catch {
          // The in-memory clock remains authoritative if storage is unavailable.
        }
      },
    });
  }, { initialIso: beforeMidnight });

  const page = await context.newPage();
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(message.text());
  });
  page.on("pageerror", (error) => browserErrors.push(error.message));
  await page.goto(playtestUrl, { waitUntil: "networkidle" });
  const currentUpdateId = await page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState().updateNotice.id);
  await page.evaluate(({ key, value, updateId }) => {
    localStorage.clear();
    localStorage.setItem(key, JSON.stringify({ ...value, lastSeenUpdate: updateId }));
  }, { key: saveKey, value: seed, updateId: currentUpdateId });
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().art?.ready === true, undefined, { timeout: 15_000 });
  return { context, page };
};

const debug = (page) => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const storedSave = (page) => page.evaluate((key) => JSON.parse(localStorage.getItem(key)), saveKey);

const setNow = async (page, iso) => {
  await page.evaluate((nextIso) => globalThis.__setDailyBoundaryNow(nextIso), iso);
  const state = await debug(page);
  assert(state.daily.today === dayB, `controlled clock did not cross into ${dayB}: ${JSON.stringify(state.daily)}`);
};

const assertRunDay = async (page, expected, phase) => {
  const [state, stored] = await Promise.all([debug(page), storedSave(page)]);
  assert(state.daily.mode === true, `${phase} lost daily mode`);
  assert(state.daily.challengeDayKey === expected, `${phase} in-memory challenge day is ${state.daily.challengeDayKey}, expected ${expected}`);
  assert(state.activeRun?.dailyDayKey === expected, `${phase} in-memory journal day is ${state.activeRun?.dailyDayKey}, expected ${expected}`);
  assert(stored.activeRun?.dailyDayKey === expected, `${phase} persisted journal day is ${stored.activeRun?.dailyDayKey}, expected ${expected}`);
};

const startDaily = async (page, expectedDay) => {
  await page.mouse.click(248, 933);
  await page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().screen === "playing");
  await assertRunDay(page, expectedDay, `start on ${expectedDay}`);
};

const solveCurrentLevelWithPointer = async (page) => {
  const initial = await debug(page);
  const solution = await page.evaluate(async (levelId) => {
    const [{ LEVELS }, { solveLevelForValidation }] = await Promise.all([
      import("/src/core/levels.ts"),
      import("/src/core/levelSolver.ts"),
    ]);
    return solveLevelForValidation(LEVELS[levelId - 1]);
  }, initial.level.id);
  assert(solution.solved, `level ${initial.level.id} has no validation route`);

  for (const drag of solution.drags) {
    const state = await debug(page);
    const block = state.puzzle.blocks.find((item) => item.id === drag.blockId);
    assert(block, `route references missing block ${drag.blockId}`);
    const [anchorX, anchorY] = block.shape[0];
    const point = (x, y) => ({
      x: state.board.innerX + (x + anchorX + 0.5) * state.board.cell,
      y: state.board.innerY + (y + anchorY + 0.5) * state.board.cell,
    });
    const start = point(block.x, block.y);
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    for (const [x, y] of drag.path) {
      const target = point(x, y);
      await page.mouse.move(target.x, target.y, { steps: 2 });
    }
    await page.mouse.up();
    await page.waitForTimeout(drag.exitSide ? 330 : 25);
  }

  await page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().screen === "win", undefined, { timeout: 10_000 });
};

const forceTimeout = async (page) => {
  await page.evaluate(() => {
    const game = window.__COLOR_ESCAPE__;
    game.model.started = true;
    game.model.remainingSeconds = 0.001;
  });
  await page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().screen === "failed", undefined, { timeout: 3_000 });
};

try {
  // 1. A challenge begun on A and first-cleared on B settles A only; B remains available.
  {
    const { context, page } = await createScenario(baseSave({
      dailyStreak: 4,
      lastDailyCompletedDay: "2026-08-31",
    }));
    await startDaily(page, dayA);
    let state = await debug(page);
    assert(state.activeRun.levelId === 6, `A selected level ${state.activeRun.levelId}, expected 6`);
    await setNow(page, afterMidnight);
    await assertRunDay(page, dayA, "first clear after midnight");
    await solveCurrentLevelWithPointer(page);

    state = await debug(page);
    let stored = await storedSave(page);
    assert(state.daily.reward === 80, `cross-midnight first clear reward is ${state.daily.reward}, expected 80`);
    assert(state.economy.coins === 2080, `cross-midnight first clear coins are ${state.economy.coins}, expected 2080`);
    assert(state.daily.streak === 5 && state.daily.lastCompletedDay === dayA, `first clear settled the wrong day/streak: ${JSON.stringify(state.daily)}`);
    assert(state.daily.completedToday === false, "settling A incorrectly occupied B");
    assert(state.activeRun === undefined && stored.activeRun === undefined, "settled first clear left an active run journal");
    assert(stored.lastDailyCompletedDay === dayA && stored.dailyStreak === 5 && stored.coins === 2080 && stored.currentLevel === 4, `first-clear persistence is incorrect: ${JSON.stringify(stored)}`);
    await page.screenshot({ path: shot("round100-daily-boundary-first-clear.png") });

    // Simulate killing or refreshing the game on the result screen: the normal
    // journey position must survive even though the daily board was level 6.
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().art?.ready === true, undefined, { timeout: 15_000 });
    await page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().screen === "home");
    state = await debug(page);
    stored = await storedSave(page);
    assert(state.level.id === 4, `result-screen refresh lost the normal return level: ${state.level.id}`);
    assert(state.daily.today === dayB && state.daily.completedToday === false && state.daily.selectedLevel === 5, `B was not available with its own selected level after settling A: ${JSON.stringify(state.daily)}`);
    assert(state.daily.reward === 0 && state.economy.coins === 2080, `result-screen refresh repeated or lost the reward: ${JSON.stringify(state.daily)}`);
    assert(state.daily.streak === 5 && state.daily.lastCompletedDay === dayA, `result-screen refresh changed daily progress: ${JSON.stringify(state.daily)}`);
    assert(state.activeRun === undefined && stored.activeRun === undefined, "result-screen refresh resurrected a settled run journal");
    assert(stored.coins === 2080 && stored.dailyStreak === 5 && stored.lastDailyCompletedDay === dayA && stored.currentLevel === 4, `result-screen refresh corrupted persistence: ${JSON.stringify(stored)}`);
    await startDaily(page, dayB);
    state = await debug(page);
    assert(state.activeRun.levelId === 5, `B selected level ${state.activeRun.levelId}, expected 5`);
    await context.close();
  }

  // 2. Replaying an already-completed A challenge across midnight cannot claim B's reward.
  {
    const { context, page } = await createScenario(baseSave({
      dailyStreak: 5,
      lastDailyCompletedDay: dayA,
    }));
    let state = await debug(page);
    assert(state.daily.completedToday === true, "completed A replay did not begin from an already-claimed state");
    await startDaily(page, dayA);
    await setNow(page, afterMidnight);
    await assertRunDay(page, dayA, "already-claimed replay after midnight");
    await solveCurrentLevelWithPointer(page);

    state = await debug(page);
    let stored = await storedSave(page);
    assert(state.daily.reward === 0, `already-claimed replay granted ${state.daily.reward} coins`);
    assert(state.economy.coins === 2000, `already-claimed replay changed coins to ${state.economy.coins}`);
    assert(state.daily.streak === 5 && state.daily.lastCompletedDay === dayA, `already-claimed replay changed daily progress: ${JSON.stringify(state.daily)}`);
    assert(state.daily.completedToday === false, "already-claimed A replay incorrectly occupied B");
    assert(stored.lastDailyCompletedDay === dayA && stored.dailyStreak === 5 && stored.coins === 2000, `already-claimed replay persisted an incorrect reward: ${JSON.stringify(stored)}`);
    await page.screenshot({ path: shot("round100-daily-boundary-replay.png") });

    await page.mouse.click(248, 754);
    await page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().screen === "home");
    await startDaily(page, dayB);
    stored = await storedSave(page);
    assert(stored.activeRun?.dailyDayKey === dayB, "new B run did not persist B ownership after the replay");
    await context.close();
  }

  // 3. Restart and timeout retry preserve A; abandoning the run lets a fresh B run own B.
  {
    const { context, page } = await createScenario(baseSave({
      dailyStreak: 2,
      lastDailyCompletedDay: "2026-08-31",
    }));
    await startDaily(page, dayA);
    await setNow(page, afterMidnight);

    await page.mouse.click(443, 140);
    await page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().screen === "paused");
    await assertRunDay(page, dayA, "pause after midnight");
    await page.mouse.click(176, 805);
    await page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().screen === "playing");
    await assertRunDay(page, dayA, "restart after midnight");

    await forceTimeout(page);
    await assertRunDay(page, dayA, "timeout after midnight");
    await page.mouse.click(248, 754);
    await page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().screen === "playing");
    await assertRunDay(page, dayA, "timeout retry after midnight");

    await forceTimeout(page);
    await page.mouse.click(248, 833);
    await page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().screen === "home");
    let state = await debug(page);
    let stored = await storedSave(page);
    assert(state.daily.mode === false && state.activeRun === undefined && stored.activeRun === undefined, "abandoning timed-out A did not clear its run journal");
    assert(state.daily.today === dayB && state.daily.completedToday === false, "abandoning A did not expose B as available");
    assert(state.level.id === 4 && stored.currentLevel === 4, "abandoning A did not restore the normal journey level");
    assert(state.daily.lastCompletedDay === "2026-08-31" && state.daily.streak === 2 && state.economy.coins === 2000, "restart/timeout path changed daily rewards or streak");

    await startDaily(page, dayB);
    state = await debug(page);
    stored = await storedSave(page);
    assert(state.daily.challengeDayKey === dayB && stored.activeRun?.dailyDayKey === dayB, "fresh run after abandoning A did not take B ownership");
    await page.screenshot({ path: shot("round100-daily-boundary-restart-timeout.png") });
    await context.close();
  }

  // 4. A missing or non-empty invalid run day in memory and storage must fail
  // closed instead of consuming the device's current day as a fallback.
  for (const corruptedDayKey of ["", "2026-02-31"]) {
    const { context, page } = await createScenario(baseSave({
      dailyStreak: 3,
      lastDailyCompletedDay: "2026-08-31",
    }));
    await startDaily(page, dayA);
    await page.evaluate(({ key, dayKey }) => {
      const game = window.__COLOR_ESCAPE__;
      game.save.activeRun.dailyDayKey = dayKey;
      const stored = JSON.parse(localStorage.getItem(key));
      stored.activeRun.dailyDayKey = dayKey;
      localStorage.setItem(key, JSON.stringify(stored));
    }, { key: saveKey, dayKey: corruptedDayKey });
    await setNow(page, afterMidnight);
    await solveCurrentLevelWithPointer(page);
    const state = await debug(page);
    const stored = await storedSave(page);
    assert(state.daily.settlementUnavailable === true, `damaged day key ${JSON.stringify(corruptedDayKey)} did not surface a failed-closed settlement`);
    assert(state.daily.reward === 0 && state.economy.coins === 2000, `damaged day key ${JSON.stringify(corruptedDayKey)} granted coins`);
    assert(state.daily.lastCompletedDay === "2026-08-31" && state.daily.streak === 3, `damaged day key ${JSON.stringify(corruptedDayKey)} changed daily progress`);
    assert(stored.lastDailyCompletedDay === "2026-08-31" && stored.dailyStreak === 3 && stored.coins === 2000, `damaged day key ${JSON.stringify(corruptedDayKey)} persisted a fallback settlement`);
    await context.close();
  }

  // 5. A cold start with an invalid persisted daily journal is sanitized,
  // abandoned safely, and refunds only its recorded booster spend.
  {
    const { context, page } = await createScenario(baseSave({
      boosters: { time: 1, rocket: 3, pulse: 3 },
      dailyStreak: 3,
      lastDailyCompletedDay: "2026-08-31",
      activeRun: {
        levelId: 6,
        returnLevelId: 4,
        daily: true,
        dailyDayKey: "2026-02-31",
        boosterSpent: { time: 1, rocket: 0, pulse: 0 },
      },
    }));
    const state = await debug(page);
    const stored = await storedSave(page);
    assert(state.screen === "home" && state.daily.mode === false && state.level.id === 4, "invalid persisted journal did not recover to the normal home level");
    assert(state.activeRun === undefined && stored.activeRun === undefined, "invalid persisted journal survived cold-start recovery");
    assert(state.economy.boosters.time === 2 && stored.boosters.time === 2, "cold-start recovery did not refund the recorded booster exactly once");
    assert(state.economy.coins === 2000 && state.daily.streak === 3 && state.daily.lastCompletedDay === "2026-08-31", "cold-start recovery changed reward progress");
    assert(stored.coins === 2000 && stored.dailyStreak === 3 && stored.lastDailyCompletedDay === "2026-08-31" && stored.currentLevel === 4, `cold-start recovery persistence is incorrect: ${JSON.stringify(stored)}`);
    await context.close();
  }

  if (browserErrors.length) throw new Error(`Browser errors:\n${browserErrors.join("\n")}`);
  console.log("Daily cross-midnight settlement, B-time result recovery, replay idempotency, restart, timeout retry, abandonment, fail-closed corruption, cold-start recovery, and next-day availability passed.");
} finally {
  await browser.close();
}
