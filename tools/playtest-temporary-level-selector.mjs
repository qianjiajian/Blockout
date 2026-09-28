import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";

const output = fileURLToPath(new URL("../playtest-results/temporary-level-selector/", import.meta.url));
const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
const SAVE_KEY = "color-escape-save-v1";
const ORIGINAL_LEVEL = 2;
const TEST_LEVEL = 114;
const NEXT_PAGE_CLICKS = 5;

await mkdir(output, { recursive: true });

const browser = await chromium.launch({ headless: true });
const browserErrors = [];
const results = [];

const fail = (label, message, detail) => {
  const suffix = detail === undefined ? "" : `: ${JSON.stringify(detail)}`;
  throw new Error(`Temporary-level-selector E2E (${label}): ${message}${suffix}`);
};

const runViewport = async ({ label, width, height }) => {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.stack ?? error.message));

  const debug = () => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
  const storageBytes = () => page.evaluate((key) => localStorage.getItem(key), SAVE_KEY);
  const canvasPoint = async ({ x, y }) => {
    const state = await debug();
    const bounds = await page.locator("canvas").boundingBox();
    if (!bounds) fail(label, "canvas bounds are unavailable");
    return {
      x: bounds.x + state.viewportTransform.offsetX + x * state.viewportTransform.scale,
      y: bounds.y + state.viewportTransform.offsetY + y * state.viewportTransform.scale,
    };
  };
  const targetPoint = async (name) => {
    const state = await debug();
    const hit = state.interactionTargets?.targets?.[name]?.hit;
    if (!hit) fail(label, `missing interaction target ${name}`, state.temporaryLevelTest);
    return canvasPoint({ x: hit.x + hit.width / 2, y: hit.y + hit.height / 2 });
  };
  const clickTarget = async (name) => {
    const point = await targetPoint(name);
    await page.mouse.click(point.x, point.y);
  };
  const pressTarget = async (name) => {
    const point = await targetPoint(name);
    await page.mouse.move(point.x, point.y);
    await page.mouse.down();
    await page.waitForFunction((key) => (
      window.__COLOR_ESCAPE__?.getDebugState().buttonPress?.key === key
    ), name);
    return point;
  };
  const waitForState = (predicate, argument) => page.waitForFunction(predicate, argument, { timeout: 8_000 });
  const expectStorage = async (expected, phase) => {
    const actual = await storageBytes();
    if (actual !== expected) {
      fail(label, `storage bytes changed during ${phase}`, {
        expectedLength: expected?.length,
        actualLength: actual?.length,
      });
    }
    return actual;
  };

  try {
    await page.goto(playtestUrl, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState);
    const updateId = await page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState().updateNotice.id);
    await page.evaluate(({ key, lastSeenUpdate, currentLevel }) => {
      localStorage.setItem(key, JSON.stringify({
        schemaVersion: 1,
        currentLevel,
        highestLevel: 30,
        coins: 10_000,
        sound: false,
        haptic: false,
        reducedMotion: true,
        language: "zh-CN",
        featureSeen: [
          "basics", "ice-door", "ice-block", "layer", "shutter",
          "generator", "elevator", "conveyor", "star",
        ],
        boosterUnlockSeen: ["time", "rocket", "pulse"],
        metaDiscovery: { collectionViewedThroughLevel: 30, dailyUnlockSeen: true },
        boosters: { time: 3, rocket: 3, pulse: 3 },
        bestStars: {},
        bestMoves: {},
        rewardedLevels: [1],
        journeyProgress: { claimedMilestoneLevels: [], seenEpisodeUnlockLevels: [] },
        achievementProgress: { claimedIds: [] },
        collectionProgress: {
          restoredMasterpieceIds: [],
          seenItemIds: [],
          claimedMilestoneIds: [],
        },
        selectedJourneyEpisode: 1,
        lifeState: { lives: 5, nextLifeAtMs: 0, unlimitedLivesUntilMs: 0 },
        dailyStreak: 0,
        lastDailyCompletedDay: "",
        lastSeenUpdate,
      }));
    }, { key: SAVE_KEY, lastSeenUpdate: updateId, currentLevel: ORIGINAL_LEVEL });
    await page.reload({ waitUntil: "domcontentloaded" });
    await waitForState(() => {
      const state = window.__COLOR_ESCAPE__?.getDebugState();
      return state?.art.ready && state.storage.baselineReady && !state.storage.normalizationPending;
    });
    await page.waitForTimeout(80);

    let state = await debug();
    if (state.screen !== "home" || state.level.id !== ORIGINAL_LEVEL || state.temporaryLevelTest.active) {
      fail(label, "invalid baseline state", {
        screen: state.screen,
        levelId: state.level.id,
        temporaryLevelTest: state.temporaryLevelTest,
      });
    }
    const baselineStorage = await storageBytes();
    if (typeof baselineStorage !== "string" || baselineStorage.length === 0) {
      fail(label, "normalized baseline save is missing");
    }

    // The Home entry follows the release contract: down only arms it, and a
    // drag outside its hit rectangle cancels the action on release.
    await pressTarget("temporaryLevel.open");
    state = await debug();
    if (state.temporaryLevelTest.selectorOpen || state.screen !== "home") {
      fail(label, "Home entry activated on pointerdown", state.temporaryLevelTest);
    }
    const neutral = await canvasPoint({ x: 248, y: 380 });
    await page.mouse.move(neutral.x, neutral.y, { steps: 4 });
    await waitForState(() => window.__COLOR_ESCAPE__?.getDebugState().buttonPress?.inside === false);
    await page.mouse.up();
    await waitForState(() => !window.__COLOR_ESCAPE__?.getDebugState().buttonPress);
    state = await debug();
    if (state.temporaryLevelTest.selectorOpen || state.level.id !== ORIGINAL_LEVEL) {
      fail(label, "dragging out of the Home entry did not cancel", state.temporaryLevelTest);
    }
    await expectStorage(baselineStorage, "cancelled Home-entry press");

    await clickTarget("temporaryLevel.open");
    await waitForState(() => window.__COLOR_ESCAPE__?.getDebugState().temporaryLevelTest.selectorOpen === true);
    state = await debug();
    if (state.temporaryLevelTest.page !== 0 || state.temporaryLevelTest.selectedLevel !== ORIGINAL_LEVEL) {
      fail(label, "selector did not open on the baseline page", state.temporaryLevelTest);
    }

    // The modal must consume the whole interaction stream. The underlying
    // START center intentionally falls in blank modal space between actions.
    const underlyingPlay = await targetPoint("homePlay");
    await page.mouse.click(underlyingPlay.x, underlyingPlay.y);
    await page.waitForTimeout(50);
    state = await debug();
    if (state.screen !== "home" || !state.temporaryLevelTest.selectorOpen || state.temporaryLevelTest.active) {
      fail(label, "selector modal allowed the underlying Home START action", {
        screen: state.screen,
        temporaryLevelTest: state.temporaryLevelTest,
      });
    }

    // Page 0 covers Lv1-20; five genuine Canvas clicks reach page 5, which
    // covers Lv101-120. Verify the first click also waits for pointerup.
    await pressTarget("temporaryLevel.next");
    state = await debug();
    if (state.temporaryLevelTest.page !== 0) {
      fail(label, "next page activated on pointerdown", state.temporaryLevelTest);
    }
    await page.mouse.up();
    await waitForState((pageNumber) => (
      window.__COLOR_ESCAPE__?.getDebugState().temporaryLevelTest.page === pageNumber
    ), 1);
    for (let pageNumber = 2; pageNumber <= NEXT_PAGE_CLICKS; pageNumber += 1) {
      await clickTarget("temporaryLevel.next");
      await waitForState((expectedPage) => (
        window.__COLOR_ESCAPE__?.getDebugState().temporaryLevelTest.page === expectedPage
      ), pageNumber);
    }
    state = await debug();
    if (state.temporaryLevelTest.page !== 5 || state.temporaryLevelTest.selectedLevel !== 101) {
      fail(label, "five next-page clicks did not reach the Lv101-120 page", state.temporaryLevelTest);
    }

    await clickTarget(`temporaryLevel.level.${TEST_LEVEL}`);
    await waitForState((levelId) => (
      window.__COLOR_ESCAPE__?.getDebugState().temporaryLevelTest.selectedLevel === levelId
    ), TEST_LEVEL);
    await page.screenshot({ path: resolve(output, `01-${label}-lv114-selected-${width}x${height}.png`) });

    const beforeStartStorage = await expectStorage(baselineStorage, "selector navigation before START TEST");
    await pressTarget("temporaryLevel.start");
    state = await debug();
    if (state.screen !== "home" || state.level.id !== ORIGINAL_LEVEL
      || state.temporaryLevelTest.active || !state.temporaryLevelTest.selectorOpen) {
      fail(label, "START TEST activated on pointerdown", {
        screen: state.screen,
        levelId: state.level.id,
        temporaryLevelTest: state.temporaryLevelTest,
      });
    }
    await page.mouse.up();
    await waitForState((levelId) => {
      const current = window.__COLOR_ESCAPE__?.getDebugState();
      return current?.screen === "playing"
        && current.level.id === levelId
        && current.temporaryLevelTest.active
        && current.temporaryLevelTest.storageSuppressed;
    }, TEST_LEVEL);
    state = await debug();
    if (state.temporaryLevelTest.baselineLevelId !== ORIGINAL_LEVEL || state.temporaryLevelTest.selectorOpen) {
      fail(label, "temporary session baseline or selector state is wrong", state.temporaryLevelTest);
    }
    const afterStartStorage = await expectStorage(baselineStorage, "active Lv114 test");
    await page.screenshot({ path: resolve(output, `02-${label}-lv114-playing-${width}x${height}.png`) });

    await clickTarget("pause");
    await waitForState(() => window.__COLOR_ESCAPE__?.getDebugState().screen === "paused");
    await clickTarget("pauseHome");
    await waitForState((levelId) => {
      const current = window.__COLOR_ESCAPE__?.getDebugState();
      return current?.screen === "home"
        && current.level.id === levelId
        && current.temporaryLevelTest.active
        && current.temporaryLevelTest.storageSuppressed;
    }, TEST_LEVEL);
    await expectStorage(baselineStorage, "pause-to-Home inside temporary test");

    await clickTarget("temporaryLevel.open");
    await waitForState(() => window.__COLOR_ESCAPE__?.getDebugState().temporaryLevelTest.selectorOpen === true);
    state = await debug();
    if (state.temporaryLevelTest.page !== 5 || state.temporaryLevelTest.selectedLevel !== TEST_LEVEL
      || !state.interactionTargets.targets["temporaryLevel.exit"]) {
      fail(label, "active test selector did not expose EXIT TEST on the Lv114 page", state.temporaryLevelTest);
    }
    await page.screenshot({ path: resolve(output, `03-${label}-active-test-exit-${width}x${height}.png`) });

    await clickTarget("temporaryLevel.exit");
    await waitForState((levelId) => {
      const current = window.__COLOR_ESCAPE__?.getDebugState();
      return current?.screen === "home"
        && current.level.id === levelId
        && !current.temporaryLevelTest.active
        && !current.temporaryLevelTest.selectorOpen
        && !current.temporaryLevelTest.storageSuppressed;
    }, ORIGINAL_LEVEL);
    const afterExitStorage = await expectStorage(baselineStorage, "EXIT TEST restoration");
    await page.screenshot({ path: resolve(output, `04-${label}-restored-lv2-${width}x${height}.png`) });

    results.push({
      label,
      viewport: { width, height },
      baselineLevelId: ORIGINAL_LEVEL,
      testedLevelId: TEST_LEVEL,
      nextPageClicks: NEXT_PAGE_CLICKS,
      pointerContract: {
        activation: "pointerup",
        dragOutsideCancels: true,
        modalBlocksUnderlyingHomePlay: true,
      },
      temporarySession: {
        activeAtLevel114: true,
        storageSuppressedAtLevel114: true,
        pauseHomeRetainsSession: true,
        exitRestoresBaseline: true,
      },
      storage: {
        byteLength: baselineStorage.length,
        unchangedBeforeStart: beforeStartStorage === baselineStorage,
        unchangedAfterStart: afterStartStorage === baselineStorage,
        unchangedAfterExit: afterExitStorage === baselineStorage,
      },
      browserErrors: errors,
    });
  } finally {
    browserErrors.push(...errors.map((message) => `[${label}] ${message}`));
    await context.close();
  }
};

try {
  await runViewport({ label: "desktop", width: 496, height: 1078 });
  await runViewport({ label: "phone", width: 320, height: 568 });
  await writeFile(resolve(output, "temporary-level-selector-report.json"), `${JSON.stringify({
    verified: browserErrors.length === 0,
    results,
    browserErrors,
  }, null, 2)}\n`, "utf8");
} finally {
  await browser.close();
}

if (browserErrors.length) {
  throw new Error(`Temporary-level-selector browser errors:\n${browserErrors.join("\n")}`);
}
console.log("Temporary level selector passed at 496x1078 and 320x568 with real Canvas pointer input and byte-stable storage.");
