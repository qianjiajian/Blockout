import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";

const output = fileURLToPath(new URL("../playtest-results/", import.meta.url));
const shot = (name) => resolve(output, name);
const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
const saveKey = "color-escape-save-v1";
const oldDay = "2026-09-01";
const newDay = "2026-09-02";
const beforeMidnight = "2026-09-01T23:59:59.650+08:00";
const afterMidnight = "2026-09-02T00:00:00.150+08:00";

await mkdir(output, { recursive: true });

const assert = (condition, message) => {
  if (!condition) throw new Error(`Daily foreground rollover E2E: ${message}`);
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
  dailyStreak: 4,
  lastDailyCompletedDay: oldDay,
  ...overrides,
});

const browser = await chromium.launch({ headless: true });
const browserErrors = [];

const createScenario = async (viewport, seed) => {
  const context = await browser.newContext({
    viewport,
    timezoneId: "Asia/Shanghai",
  });
  await context.addInitScript(({ initialIso }) => {
    const NativeDate = Date;
    const nativeParse = NativeDate.parse.bind(NativeDate);
    let controlledNow = nativeParse(initialIso);
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

    const documentToken = `${Math.random()}-${performance.timeOrigin}`;
    let visibilityChanges = 0;
    document.addEventListener("visibilitychange", () => { visibilityChanges += 1; });
    Object.defineProperty(globalThis, "__dailyForegroundTest", {
      configurable: true,
      value: {
        setNow(nextIso) {
          const next = nativeParse(nextIso);
          if (!Number.isFinite(next)) throw new Error(`Invalid controlled date: ${nextIso}`);
          controlledNow = next;
        },
        probe() {
          return {
            documentToken,
            visibilityChanges,
            visibilityState: document.visibilityState,
            now: new NativeDate(controlledNow).toISOString(),
          };
        },
      },
    });
  }, { initialIso: beforeMidnight });

  const page = await context.newPage();
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(`[${viewport.width}x${viewport.height}] ${message.text()}`);
  });
  page.on("pageerror", (error) => browserErrors.push(`[${viewport.width}x${viewport.height}] ${error.message}`));
  await page.goto(playtestUrl, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState != null);
  const currentUpdateId = await page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState().updateNotice.id);
  await page.evaluate(({ key, value, updateId }) => {
    localStorage.clear();
    localStorage.setItem(key, JSON.stringify({ ...value, lastSeenUpdate: updateId }));
  }, { key: saveKey, value: seed, updateId: currentUpdateId });
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().art?.ready === true, undefined, { timeout: 15_000 });
  await page.waitForFunction((day) => {
    const state = window.__COLOR_ESCAPE__?.getDebugState();
    return state?.screen === "home" && state.daily?.homeRenderedDay === day;
  }, oldDay, { timeout: 5_000 });
  return { context, page };
};

const debug = (page) => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const storedSave = (page) => page.evaluate((key) => JSON.parse(localStorage.getItem(key)), saveKey);
const foregroundProbe = (page) => page.evaluate(() => globalThis.__dailyForegroundTest.probe());

const setNow = (page, iso) => page.evaluate((nextIso) => {
  globalThis.__dailyForegroundTest.setNow(nextIso);
}, iso);

const clickTarget = async (page, name) => {
  const state = await debug(page);
  const target = state.interactionTargets?.targets?.[name]?.hit;
  assert(target, `missing interaction target ${name}`);
  const bounds = await page.locator("canvas").boundingBox();
  assert(bounds, `canvas bounds unavailable for ${name}`);
  const x = bounds.x + state.viewportTransform.offsetX + (target.x + target.width / 2) * state.viewportTransform.scale;
  const y = bounds.y + state.viewportTransform.offsetY + (target.y + target.height / 2) * state.viewportTransform.scale;
  await page.mouse.click(x, y);
};

const waitForForegroundRollover = async (page) => {
  await setNow(page, afterMidnight);
  await page.waitForFunction((day) => {
    const state = window.__COLOR_ESCAPE__?.getDebugState();
    return state?.daily?.today === day && state.daily.rolloverWatchDay === day;
  }, newDay, { timeout: 3_000 });
};

const assertSameForegroundDocument = async (page, initialProbe, phase) => {
  const probe = await foregroundProbe(page);
  assert(probe.documentToken === initialProbe.documentToken, `${phase} replaced or reloaded the document`);
  assert(probe.visibilityState === "visible", `${phase} document is ${probe.visibilityState}, expected visible`);
  assert(probe.visibilityChanges === initialProbe.visibilityChanges, `${phase} emitted ${probe.visibilityChanges - initialProbe.visibilityChanges} visibilitychange event(s)`);
};

const runHomeRollover = async (viewport) => {
  const suffix = `${viewport.width}x${viewport.height}`;
  const { context, page } = await createScenario(viewport, baseSave());
  try {
    const initialProbe = await foregroundProbe(page);
    let state = await debug(page);
    const oldSelectedLevel = state.daily.selectedLevel;
    assert(state.daily.today === oldDay, `${suffix} home began on ${state.daily.today}, expected ${oldDay}`);
    assert(state.daily.completedToday === true, `${suffix} old-day completion was not visible before midnight`);
    assert(state.daily.homeRenderedDay === oldDay, `${suffix} home was not actually rendered for ${oldDay}`);
    assert(state.daily.rolloverWatchScheduled === true, `${suffix} foreground rollover watch was not scheduled`);
    await page.screenshot({ path: shot(`round102-daily-foreground-home-old-${suffix}.png`) });

    await waitForForegroundRollover(page);
    await page.waitForFunction((day) => window.__COLOR_ESCAPE__.getDebugState().daily.homeRenderedDay === day, newDay, { timeout: 3_000 });
    state = await debug(page);
    assert(state.screen === "home", `${suffix} rollover changed the home screen to ${state.screen}`);
    assert(state.daily.completedToday === false, `${suffix} new day inherited the old day's completed state`);
    assert(state.daily.homeRenderedDay === newDay, `${suffix} home state changed but canvas did not redraw for ${newDay}`);
    assert(state.daily.selectedLevel !== oldSelectedLevel, `${suffix} fixture did not expose a changed daily selection (${oldSelectedLevel})`);
    await assertSameForegroundDocument(page, initialProbe, `${suffix} home rollover`);
    await page.screenshot({ path: shot(`round102-daily-foreground-home-new-${suffix}.png`) });

    const expectedLevel = state.daily.selectedLevel;
    await clickTarget(page, "homeDaily");
    await page.waitForFunction(() => window.__COLOR_ESCAPE__.getDebugState().screen === "playing");
    state = await debug(page);
    const stored = await storedSave(page);
    assert(state.daily.mode === true, `${suffix} new-day card did not enter daily mode`);
    assert(state.level.id === expectedLevel, `${suffix} entered Lv${state.level.id}, expected new-day Lv${expectedLevel}`);
    assert(state.daily.challengeDayKey === newDay, `${suffix} challenge owns ${state.daily.challengeDayKey}, expected ${newDay}`);
    assert(state.activeRun?.dailyDayKey === newDay, `${suffix} run journal owns ${state.activeRun?.dailyDayKey}, expected ${newDay}`);
    assert(stored.activeRun?.dailyDayKey === newDay, `${suffix} persisted run journal does not own ${newDay}`);
    await assertSameForegroundDocument(page, initialProbe, `${suffix} new-day entry`);
  } finally {
    await context.close();
  }
};

const runActiveChallengeRollover = async (viewport) => {
  const suffix = `${viewport.width}x${viewport.height}`;
  const { context, page } = await createScenario(viewport, baseSave({
    dailyStreak: 3,
    lastDailyCompletedDay: "2026-08-31",
  }));
  try {
    const initialProbe = await foregroundProbe(page);
    let state = await debug(page);
    const normalReturnLevel = state.level.id;
    await clickTarget(page, "homeDaily");
    await page.waitForFunction(() => window.__COLOR_ESCAPE__.getDebugState().screen === "playing");
    state = await debug(page);
    const challengeLevel = state.level.id;
    const puzzleBefore = JSON.stringify(state.puzzle);
    assert(state.daily.challengeDayKey === oldDay && state.activeRun?.dailyDayKey === oldDay, `${suffix} old-day run did not start with immutable ownership`);
    assert(state.puzzle.started === false, `${suffix} untouched challenge unexpectedly started its timer`);

    await waitForForegroundRollover(page);
    state = await debug(page);
    let stored = await storedSave(page);
    assert(state.screen === "playing" && state.daily.mode === true, `${suffix} midnight interrupted the active challenge`);
    assert(state.level.id === challengeLevel, `${suffix} midnight replaced active Lv${challengeLevel} with Lv${state.level.id}`);
    assert(JSON.stringify(state.puzzle) === puzzleBefore, `${suffix} midnight mutated or rebuilt the active puzzle model`);
    assert(state.daily.challengeDayKey === oldDay, `${suffix} in-memory challenge ownership changed to ${state.daily.challengeDayKey}`);
    assert(state.activeRun?.dailyDayKey === oldDay, `${suffix} in-memory run journal changed to ${state.activeRun?.dailyDayKey}`);
    assert(stored.activeRun?.dailyDayKey === oldDay, `${suffix} persisted run journal changed to ${stored.activeRun?.dailyDayKey}`);
    await assertSameForegroundDocument(page, initialProbe, `${suffix} active-run rollover`);
    await page.screenshot({ path: shot(`round102-daily-foreground-active-old-run-${suffix}.png`) });

    await clickTarget(page, "pause");
    await page.waitForFunction(() => window.__COLOR_ESCAPE__.getDebugState().screen === "paused");
    await clickTarget(page, "pauseHome");
    await page.waitForFunction((day) => {
      const current = window.__COLOR_ESCAPE__.getDebugState();
      return current.screen === "home" && current.daily.homeRenderedDay === day;
    }, newDay, { timeout: 3_000 });
    state = await debug(page);
    stored = await storedSave(page);
    assert(state.daily.mode === false, `${suffix} return home retained daily mode`);
    assert(state.level.id === normalReturnLevel, `${suffix} return home restored Lv${state.level.id}, expected Lv${normalReturnLevel}`);
    assert(state.daily.today === newDay && state.daily.homeRenderedDay === newDay, `${suffix} return home did not present ${newDay}`);
    assert(state.daily.completedToday === false, `${suffix} abandoned old-day run incorrectly completed ${newDay}`);
    assert(state.activeRun === undefined && stored.activeRun === undefined, `${suffix} return home left an old-day run journal`);
    assert(state.daily.lastCompletedDay === "2026-08-31" && state.daily.streak === 3, `${suffix} rollover/abandon changed daily rewards or streak`);
    await assertSameForegroundDocument(page, initialProbe, `${suffix} return home`);
    await page.screenshot({ path: shot(`round102-daily-foreground-return-new-${suffix}.png`) });
  } finally {
    await context.close();
  }
};

try {
  for (const viewport of [{ width: 496, height: 1078 }, { width: 320, height: 568 }]) {
    await runHomeRollover(viewport);
    await runActiveChallengeRollover(viewport);
  }
  if (browserErrors.length) throw new Error(`Browser errors:\n${browserErrors.join("\n")}`);
  console.log("Always-foreground home rollover, new-day entry, active-run day/model immutability, new-day return, and 320x568 targets passed without reload or visibility changes.");
} finally {
  await browser.close();
}
