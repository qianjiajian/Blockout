import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";

const SAVE_KEY = "color-escape-save-v1";
const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
const output = fileURLToPath(new URL("../playtest-results/journey-video-parity/", import.meta.url));
const viewport = { width: 720, height: 1584 };
const FORMAL_TO_LOGICAL_SCALE = 496 / 720;
const expectedRewardLevels = [10, 15, 25, 30, 35, 45, 50, 60, 65, 75, 80, 90, 95];
const expectedEpisodeUnlocks = [1, 11, 21, 31, 41, 51, 61, 71, 81, 91];
const expectedJourneySupplementArt = [
  "episode-action-button.png",
  "episode-locked-shade.png",
  "episode-range-panel.png",
  "episode-selected-button.png",
];
const expectedHomeThemeByEpisode = {
  1: "home-v3/background.jpg",
  2: "home-02.jpg",
  3: "home-03.jpg",
  4: "home-04.jpg",
  5: "home-05.jpg",
  6: "home-06.jpg",
  7: "home-07.jpg",
  8: "home-08.jpg",
  9: "home-09.jpg",
  10: "home-10.jpg",
};
await mkdir(output, { recursive: true });

const assert = (condition, message) => {
  if (!condition) throw new Error(`Journey video-parity E2E: ${message}`);
};

const report = {
  generatedAt: new Date().toISOString(),
  playtestUrl,
  viewport,
  passed: false,
  continuousMap: {},
  kineticScroll: {},
  rebound: {},
  navigationRetention: {},
  episodeUnlockGates: [],
  episodeThemes: [],
  themeSelectionCancel: {},
  inFlightThemeSelectionCancel: {},
  mobileThemeSelection: {},
  mobileRewardInspection: {},
  sparseRewards: {},
  screenshots: [],
  episodeArtRequests: [],
  supplementArtRequests: [],
  homeThemeRequests: [],
  browserErrors: [],
};

const debug = (page) => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const storedSave = (page) => page.evaluate((key) => {
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : null;
}, SAVE_KEY);

const completedStars = Object.fromEntries(
  Array.from({ length: 100 }, (_, index) => [String(index + 1), 1 + index % 3]),
);
const completedMoves = Object.fromEntries(
  Array.from({ length: 100 }, (_, index) => [String(index + 1), 12 + index % 7]),
);

const makeSave = ({ highestLevel = 100, reducedMotion = false, selectedJourneyEpisode = 1 } = {}) => ({
  schemaVersion: 1,
  currentLevel: highestLevel,
  highestLevel,
  coins: 3000,
  sound: false,
  haptic: false,
  reducedMotion,
  featureSeen: ["basics", "ice-door", "ice-block", "layer", "shutter", "generator", "elevator", "conveyor", "star"],
  boosterUnlockSeen: ["time", "rocket", "pulse"],
  boosters: { time: 2, rocket: 3, pulse: 2 },
  bestStars: completedStars,
  bestMoves: completedMoves,
  rewardedLevels: Array.from({ length: Math.max(0, highestLevel - 1) }, (_, index) => index + 1),
  selectedJourneyEpisode,
  journeyProgress: {
    claimedMilestoneLevels: expectedRewardLevels.filter((level) => level < highestLevel),
    seenEpisodeUnlockLevels: expectedEpisodeUnlocks.slice(1).filter((level) => level <= highestLevel),
  },
  lifeState: {
    lives: 3,
    nextLifeAtMs: Date.now() + 30 * 60 * 1000,
    unlimitedLivesUntilMs: 0,
  },
  metaDiscovery: { collectionViewedThroughLevel: highestLevel, dailyUnlockSeen: true },
  dailyStreak: 3,
  lastDailyCompletedDay: "",
});

const attachPageEvidence = (page, label, episodeRequests, supplementRequests, homeThemeResponses) => {
  page.on("console", (message) => {
    if (message.type() === "error") report.browserErrors.push(`${label}: ${message.text()}`);
  });
  page.on("pageerror", (error) => report.browserErrors.push(`${label}: ${error.message}`));
  page.on("response", (response) => {
    const url = response.url();
    if (/\/formal-pages\/journey\/episode-\d{2}\.png(?:\?|$)/.test(url)) {
      episodeRequests.add(url.split("/").at(-1).split("?")[0]);
    }
    const pathname = new URL(url).pathname.replaceAll("\\", "/");
    const journeyFile = pathname.split("/").at(-1);
    if ([...expectedJourneySupplementArt, "locked-frame.png"].includes(journeyFile)) {
      supplementRequests.add(journeyFile);
    }
    const file = pathname.endsWith("/ui/home-v3/background.jpg")
      ? "home-v3/background.jpg"
      : /\/formal-pages\/journey\/home-\d{2}\.jpg$/.test(pathname)
        ? pathname.split("/").at(-1)
        : undefined;
    if (file) {
      const responses = homeThemeResponses.get(file) ?? [];
      responses.push({ label, status: response.status(), ok: response.ok(), url });
      homeThemeResponses.set(file, responses);
    }
  });
};

const createSeededPage = async (
  browser,
  label,
  save,
  episodeRequests,
  supplementRequests,
  homeThemeResponses,
  pageViewport = viewport,
) => {
  const context = await browser.newContext({ viewport: pageViewport, deviceScaleFactor: 1 });
  const page = await context.newPage();
  attachPageEvidence(page, label, episodeRequests, supplementRequests, homeThemeResponses);
  await page.goto(playtestUrl, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().art.ready, undefined, { timeout: 15_000 });
  const updateId = (await debug(page)).updateNotice.id;
  await page.evaluate(({ key, value, lastSeenUpdate }) => {
    localStorage.clear();
    localStorage.setItem(key, JSON.stringify({ ...value, lastSeenUpdate }));
  }, { key: SAVE_KEY, value: save, lastSeenUpdate: updateId });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => {
    const state = window.__COLOR_ESCAPE__?.getDebugState();
    return state?.art.ready
      && state?.storage.status === "ready"
      && state?.screen === "home"
      && !state?.navigation.transition;
  }, undefined, { timeout: 15_000 });
  return { context, page };
};

const targetPoint = async (page, targetName) => {
  const state = await debug(page);
  const hit = state.interactionTargets?.targets?.[targetName]?.hit;
  const bounds = await page.locator("canvas").boundingBox();
  assert(hit && bounds, `missing interaction target ${targetName}`);
  return {
    logical: { x: hit.x + hit.width / 2, y: hit.y + hit.height / 2 },
    client: {
      x: bounds.x + state.viewportTransform.offsetX
        + (hit.x + hit.width / 2) * state.viewportTransform.scale,
      y: bounds.y + state.viewportTransform.offsetY
        + (hit.y + hit.height / 2) * state.viewportTransform.scale,
    },
    hit,
  };
};

const clickTarget = async (page, targetName) => {
  const point = await targetPoint(page, targetName);
  await page.mouse.move(point.client.x, point.client.y);
  await page.mouse.down();
  await page.waitForTimeout(55);
  await page.mouse.up();
  await page.waitForTimeout(45);
  return { point, state: await debug(page) };
};

const waitForScreen = async (page, screen) => {
  await page.waitForFunction((expected) => {
    const state = window.__COLOR_ESCAPE__?.getDebugState();
    if (state?.screen !== expected || state?.navigation.transition) return false;
    return expected !== "levels"
      || (state.art.formalPage.loaded === "levels" && !state.art.formalPage.error);
  }, screen, { timeout: 15_000 });
  return debug(page);
};

const enterJourney = async (page) => {
  await clickTarget(page, "navigation.3");
  const state = await waitForScreen(page, "levels");
  assert(!state.journey.presentation, "seeded Journey unexpectedly opened a reward presentation");
  return state;
};

const capture = async (page, name) => {
  report.screenshots.push(name);
  await page.screenshot({ path: resolve(output, name) });
};

const journeyGesture = async (page, {
  direction,
  ratio,
  steps = 10,
  stepDelayMs = 14,
  heldScreenshot,
} = {}) => {
  const before = await debug(page);
  const bounds = await page.locator("canvas").boundingBox();
  const journeyViewport = before.journey?.viewport;
  assert(before.screen === "levels" && bounds && journeyViewport, "Journey gesture viewport is unavailable");
  assert(direction === "up" || direction === "down", `unsupported Journey gesture direction ${direction}`);
  const logicalStart = {
    x: journeyViewport.x + journeyViewport.width * 0.5,
    y: journeyViewport.y + journeyViewport.height * (direction === "up" ? 0.76 : 0.24),
  };
  const logicalEnd = {
    x: logicalStart.x,
    y: logicalStart.y + journeyViewport.height * ratio * (direction === "up" ? -1 : 1),
  };
  const toClient = ({ x, y }) => ({
    x: bounds.x + before.viewportTransform.offsetX + x * before.viewportTransform.scale,
    y: bounds.y + before.viewportTransform.offsetY + y * before.viewportTransform.scale,
  });
  const clientStart = toClient(logicalStart);
  const clientEnd = toClient(logicalEnd);

  await page.mouse.move(clientStart.x, clientStart.y);
  await page.mouse.down();
  for (let index = 1; index <= steps; index += 1) {
    const progress = index / steps;
    await page.mouse.move(
      clientStart.x + (clientEnd.x - clientStart.x) * progress,
      clientStart.y + (clientEnd.y - clientStart.y) * progress,
    );
    await page.waitForTimeout(stepDelayMs);
  }
  const held = await debug(page);
  assert(held.journey.scrolling, "Journey did not retain the pointer during a drag");
  assert(!held.buttonPress, "Journey drag was misclassified as a button press");
  if (heldScreenshot) await capture(page, heldScreenshot);
  await page.mouse.up();
  const released = await debug(page);
  await page.waitForTimeout(45);
  const after = await debug(page);
  assert(!after.journey.scrolling, "Journey remained in pointer-drag state after release");
  return {
    points: { logicalStart, logicalEnd, clientStart, clientEnd },
    before,
    held,
    released,
    after,
  };
};

const waitForJourneyMotionToSettle = async (page) => {
  await page.waitForFunction(() => {
    const journey = window.__COLOR_ESCAPE__?.getDebugState().journey;
    return journey
      && !journey.scrolling
      && Math.abs(journey.velocity) < 4
      && journey.scrollOffset >= journey.minScrollOffset - 0.7
      && journey.scrollOffset <= journey.maxScrollOffset + 0.7;
  }, undefined, { timeout: 8_000 });
  await page.waitForTimeout(70);
  return debug(page);
};

const summarizeJourney = (state) => ({
  scrollOffset: state.journey.scrollOffset,
  minScrollOffset: state.journey.minScrollOffset,
  maxScrollOffset: state.journey.maxScrollOffset,
  velocity: state.journey.velocity,
  scrolling: state.journey.scrolling,
  visibleRewardLevels: state.journey.displayedLevels,
  visibleEpisodes: state.journey.visibleEpisodes,
  selectedEpisode: state.journey.selectedEpisode,
  contentOffset: state.journey.contentOffset,
});

const sampleVisibleContent = (state, rewardLevels, episodes) => {
  state.journey.displayedLevels.forEach((level) => rewardLevels.add(level));
  state.journey.visibleEpisodes.forEach((episode) => episodes.add(episode));
};

const episodeTargetIsUsable = (state, index) => {
  const hit = state.interactionTargets?.targets?.[`journeyEpisode.${index}`]?.hit;
  return Boolean(hit
    && Math.abs(hit.width / FORMAL_TO_LOGICAL_SCALE - 157) < 0.01
    && Math.abs(hit.height / FORMAL_TO_LOGICAL_SCALE - 58) < 0.01
    && hit.width * state.viewportTransform.scale >= 44
    && hit.height * state.viewportTransform.scale >= 44);
};

const browser = await chromium.launch({ headless: true });
const episodeRequests = new Set();
const supplementRequests = new Set();
const homeThemeResponses = new Map();
let failure;

try {
  // Normal-motion pass: measure the same drag, inertia, elastic edge and
  // leave/return behavior exercised by the reference video.
  {
    const { context, page } = await createSeededPage(
      browser,
      "kinetic",
      makeSave({ reducedMotion: false }),
      episodeRequests,
      supplementRequests,
      homeThemeResponses,
    );
    let state = await enterJourney(page);
    assert(Math.abs(state.journey.scrollOffset - state.journey.minScrollOffset) < 0.7,
      `Lv100 Journey did not open at the upper map edge: ${state.journey.scrollOffset}`);
    const targetNames = Object.keys(state.interactionTargets.targets);
    assert(!targetNames.some((name) => /(?:journey|levels)(?:Prev|Next)/i.test(name)),
      "Journey still exposes obsolete previous/next controls");
    assert(state.journey.maxScrollOffset > state.journey.viewport.height * 2,
      "Journey map is not tall enough to behave as one continuous route");
    assert(Math.abs(state.journey.contentOffset + state.journey.scrollOffset) < 0.001,
      "Journey content and scroll offsets are not synchronized");
    await capture(page, "01-continuous-map-top-720x1584.png");
    report.continuousMap = {
      initial: summarizeJourney(state),
      viewportTransform: state.viewportTransform,
      previousNextTargetsPresent: false,
      contentMovesAsOneScene: true,
    };

    const reboundGesture = await journeyGesture(page, {
      direction: "down",
      ratio: 0.35,
      steps: 12,
      stepDelayMs: 15,
      heldScreenshot: "02-upper-edge-rubber-band-held-720x1584.png",
    });
    assert(reboundGesture.held.journey.scrollOffset < reboundGesture.held.journey.minScrollOffset - 1,
      "upper edge did not expose elastic overscroll while held");
    const reboundSettled = await waitForJourneyMotionToSettle(page);
    assert(reboundSettled.journey.scrollOffset >= reboundSettled.journey.minScrollOffset - 0.7
      && reboundSettled.journey.scrollOffset <= reboundSettled.journey.maxScrollOffset + 0.7,
    "upper-edge overscroll did not spring back into the legal map range");
    await capture(page, "03-upper-edge-rebounded-720x1584.png");
    report.rebound = {
      beforeOffset: reboundGesture.before.journey.scrollOffset,
      heldOverscrollOffset: reboundGesture.held.journey.scrollOffset,
      releasedVelocity: reboundGesture.released.journey.velocity,
      settledOffset: reboundSettled.journey.scrollOffset,
      bound: reboundSettled.journey.minScrollOffset,
      points: reboundGesture.points,
    };

    const inertiaGesture = await journeyGesture(page, {
      direction: "up",
      ratio: 0.18,
      steps: 9,
      stepDelayMs: 12,
    });
    assert(inertiaGesture.released.journey.velocity > 4,
      `upward fling did not retain positive release velocity: ${inertiaGesture.released.journey.velocity}`);
    await page.waitForTimeout(110);
    const inertiaMoving = await debug(page);
    assert(inertiaMoving.journey.scrollOffset > inertiaGesture.released.journey.scrollOffset + 1,
      "Journey did not continue moving after the pointer was released");
    await capture(page, "04-inertia-after-release-720x1584.png");
    const inertiaSettled = await waitForJourneyMotionToSettle(page);
    assert(inertiaSettled.journey.scrollOffset > inertiaGesture.held.journey.scrollOffset + 1,
      "inertial travel did not extend beyond the held drag position");
    await capture(page, "05-inertia-settled-720x1584.png");
    report.kineticScroll = {
      points: inertiaGesture.points,
      before: summarizeJourney(inertiaGesture.before),
      held: summarizeJourney(inertiaGesture.held),
      released: summarizeJourney(inertiaGesture.released),
      movingAfter110Ms: summarizeJourney(inertiaMoving),
      settled: summarizeJourney(inertiaSettled),
      postReleaseTravel: inertiaSettled.journey.scrollOffset - inertiaGesture.released.journey.scrollOffset,
    };

    const retainedOffset = inertiaSettled.journey.scrollOffset;
    await clickTarget(page, "navigation.2");
    state = await waitForScreen(page, "home");
    await capture(page, "06-home-between-journey-visits-720x1584.png");
    await clickTarget(page, "navigation.3");
    state = await waitForScreen(page, "levels");
    assert(Math.abs(state.journey.scrollOffset - retainedOffset) < 0.7,
      `Journey lost its position after Home round trip: ${retainedOffset} -> ${state.journey.scrollOffset}`);
    await capture(page, "07-journey-return-position-preserved-720x1584.png");
    report.navigationRetention = {
      normalMotion: true,
      beforeLeavingOffset: retainedOffset,
      afterReturningOffset: state.journey.scrollOffset,
      delta: state.journey.scrollOffset - retainedOffset,
    };
    await context.close();
  }

  // Deterministic reduced-motion pass: visit every part of the long map in
  // small pointer increments so no sparse reward or episode can be skipped.
  {
    const { context, page } = await createSeededPage(
      browser,
      "themes-and-route",
      makeSave({ reducedMotion: true, selectedJourneyEpisode: 1 }),
      episodeRequests,
      supplementRequests,
      homeThemeResponses,
    );
    let state = await enterJourney(page);
    const rewardLevels = new Set();
    const episodes = new Set();
    const selectionOrder = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
    let nextSelection = 0;
    let scrollSteps = 0;
    sampleVisibleContent(state, rewardLevels, episodes);

    while (scrollSteps < 120) {
      state = await debug(page);
      sampleVisibleContent(state, rewardLevels, episodes);
      const episodeIndex = selectionOrder[nextSelection];
      if (episodeIndex && episodeTargetIsUsable(state, episodeIndex)) {
        const beforeOffset = state.journey.scrollOffset;
        const selectedBeforeUse = state.journey.selectedEpisode;
        const persistedBeforeUse = await storedSave(page);
        const homeThemeBeforeUse = { ...state.journey.homeTheme };
        const homeThemeAsset = expectedHomeThemeByEpisode[episodeIndex];
        const themeResponsesBeforeUse = homeThemeResponses.get(homeThemeAsset)?.length ?? 0;
        const click = await clickTarget(page, `journeyEpisode.${episodeIndex}`);
        state = click.state;
        assert(Math.abs(click.point.hit.width / FORMAL_TO_LOGICAL_SCALE - 157) < 0.01
          && Math.abs(click.point.hit.height / FORMAL_TO_LOGICAL_SCALE - 58) < 0.01,
          `episode ${episodeIndex} action hit area drifted from 157x58: ${JSON.stringify(click.point.hit)}`);
        assert(state.screen === "levels"
          && state.journey.presentation?.intent === "theme_selection"
          && state.journey.presentation?.phase === "overlay"
          && state.journey.presentation?.event?.type === "episode_unlock"
          && state.journey.presentation?.event?.episode?.index === episodeIndex,
        `Use release did not open the episode ${episodeIndex} selection overlay on Journey`);
        assert(state.art.formalPage.loaded === "levels",
          `episode ${episodeIndex} selection overlay released its Journey art early`);
        assert(state.journey.selectedEpisode === selectedBeforeUse,
          `Use release selected episode ${episodeIndex} before confirmation`);
        const persistedAfterUse = await storedSave(page);
        assert(JSON.stringify(persistedAfterUse) === JSON.stringify(persistedBeforeUse),
          `Use release changed the save before episode ${episodeIndex} confirmation`);
        assert(state.journey.homeTheme.selectedEpisode === homeThemeBeforeUse.selectedEpisode
          && state.journey.homeTheme.loadedEpisode === homeThemeBeforeUse.loadedEpisode
          && state.journey.homeTheme.loading === homeThemeBeforeUse.loading,
        `Use release changed the Home theme before episode ${episodeIndex} confirmation`);
        assert((homeThemeResponses.get(homeThemeAsset)?.length ?? 0) === themeResponsesBeforeUse,
          `Use release requested ${homeThemeAsset} before confirmation`);
        await capture(page, `theme-${episodeIndex}-selection-overlay-720x1584.png`);

        if (nextSelection === 0) {
          const close = await clickTarget(page, "journeyPresentationClose");
          state = close.state;
          await page.waitForFunction((expectedEpisode) => {
            const current = window.__COLOR_ESCAPE__?.getDebugState();
            return current?.screen === "levels"
              && !current.journey.presentation
              && current.journey.homeTheme.selectedEpisode === expectedEpisode
              && current.journey.homeTheme.loadedEpisode === expectedEpisode
              && !current.journey.homeTheme.loading;
          }, selectedBeforeUse, { timeout: 15_000 });
          state = await debug(page);
          const persistedAfterCancel = await storedSave(page);
          assert(state.journey.selectedEpisode === selectedBeforeUse
            && JSON.stringify(persistedAfterCancel) === JSON.stringify(persistedBeforeUse),
          `closing episode ${episodeIndex} selection changed the selected or persisted theme`);
          assert(Math.abs(state.journey.scrollOffset - beforeOffset) < 0.7,
            `closing episode ${episodeIndex} selection lost the Journey scroll position`);
          assert((homeThemeResponses.get(homeThemeAsset)?.length ?? 0) === themeResponsesBeforeUse,
            `closing episode ${episodeIndex} selection requested the unconfirmed theme`);
          report.themeSelectionCancel = {
            episode: episodeIndex,
            stayedOnJourney: true,
            selectedEpisode: state.journey.selectedEpisode,
            persistedEpisode: persistedAfterCancel.selectedJourneyEpisode,
            offsetBefore: beforeOffset,
            offsetAfter: state.journey.scrollOffset,
          };

          const reopened = await clickTarget(page, `journeyEpisode.${episodeIndex}`);
          state = reopened.state;
          assert(state.screen === "levels"
            && state.journey.presentation?.intent === "theme_selection"
            && state.journey.presentation?.phase === "overlay"
            && state.journey.presentation?.event?.episode?.index === episodeIndex,
          `episode ${episodeIndex} selection overlay did not reopen after cancellation`);
        }

        await clickTarget(page, "journeyPresentation");
        await page.waitForFunction((expectedEpisode) => {
          const current = window.__COLOR_ESCAPE__?.getDebugState();
          const theme = current?.journey.homeTheme;
          return current?.screen === "home"
            && !current.navigation.transition
            && !current.journey.presentation
            && !current.art.formalPage.loaded
            && theme.selectedEpisode === expectedEpisode
            && theme.loadedEpisode === expectedEpisode
            && !theme.loading;
        }, episodeIndex, { timeout: 15_000 });
        state = await debug(page);
        const persisted = await storedSave(page);
        assert(persisted.selectedJourneyEpisode === episodeIndex,
          `episode ${episodeIndex} selection was not persisted`);
        const successfulThemeResponse = homeThemeResponses.get(homeThemeAsset)?.find((response) => response.ok);
        assert(successfulThemeResponse,
          `episode ${episodeIndex} Home theme did not return a successful ${homeThemeAsset} response`);
        assert(state.journey.selectedEpisode === persisted.selectedJourneyEpisode
          && state.journey.homeTheme.selectedEpisode === persisted.selectedJourneyEpisode
          && state.journey.homeTheme.loadedEpisode === persisted.selectedJourneyEpisode,
        `Home debug theme did not match persisted episode ${persisted.selectedJourneyEpisode}`);
        await capture(page, `theme-${episodeIndex}-home-720x1584.png`);
        await clickTarget(page, "navigation.3");
        state = await waitForScreen(page, "levels");
        assert(Math.abs(state.journey.scrollOffset - beforeOffset) < 0.7,
          `episode ${episodeIndex} Home round trip lost Journey scroll position`);
        report.episodeThemes.push({
          episode: episodeIndex,
          releaseActivated: true,
          twoStepConfirmed: true,
          selectedAfterRelease: state.journey.selectedEpisode,
          persistedSelection: persisted.selectedJourneyEpisode,
          homeThemeLoaded: episodeIndex,
          homeThemeAsset,
          homeThemeResponseStatus: successfulThemeResponse.status,
          homeThemeResponseOk: successfulThemeResponse.ok,
          offsetBeforeRoundTrip: beforeOffset,
          offsetAfterRoundTrip: state.journey.scrollOffset,
        });
        nextSelection += 1;
        sampleVisibleContent(state, rewardLevels, episodes);
      }

      if (state.journey.scrollOffset >= state.journey.maxScrollOffset - 0.7) break;
      const gesture = await journeyGesture(page, {
        direction: "up",
        ratio: 0.10,
        steps: 8,
        stepDelayMs: 12,
      });
      sampleVisibleContent(gesture.held, rewardLevels, episodes);
      sampleVisibleContent(gesture.after, rewardLevels, episodes);
      scrollSteps += 1;
    }

    state = await waitForJourneyMotionToSettle(page);
    sampleVisibleContent(state, rewardLevels, episodes);
    assert(Math.abs(state.journey.scrollOffset - state.journey.maxScrollOffset) < 0.7,
      `full Journey traversal did not reach the lower bound: ${state.journey.scrollOffset}/${state.journey.maxScrollOffset}`);
    assert(nextSelection === selectionOrder.length,
      `not all ten Journey themes exposed a usable Use action: ${nextSelection}/${selectionOrder.length}`);
    const encounteredRewards = [...rewardLevels].sort((left, right) => left - right);
    const encounteredEpisodes = [...episodes].sort((left, right) => left - right);
    assert(JSON.stringify(encounteredRewards) === JSON.stringify(expectedRewardLevels),
      `sparse Journey rewards drifted: ${JSON.stringify(encounteredRewards)}`);
    assert(JSON.stringify(encounteredEpisodes) === JSON.stringify(
      Array.from({ length: 10 }, (_, index) => index + 1),
    ),
      `Journey episode cards drifted: ${JSON.stringify(encounteredEpisodes)}`);
    await capture(page, "08-continuous-map-bottom-720x1584.png");

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().art.ready, undefined, { timeout: 15_000 });
    state = await debug(page);
    assert(state.journey.selectedEpisode === 1,
      "final Journey theme selection did not survive a real reload");
    report.sparseRewards = {
      expectedLevels: expectedRewardLevels,
      encounteredLevels: encounteredRewards,
      count: encounteredRewards.length,
      scrollSteps,
      lowerBoundReached: true,
    };
    report.continuousMap.encounteredEpisodes = encounteredEpisodes;
    report.continuousMap.lowerBound = state.journey.maxScrollOffset;
    await context.close();
  }

  // A selection image may finish after the player closes the modal. Hold the
  // candidate request in flight, cancel with the real X target, then release
  // the response and prove that the late image cannot replace the old theme.
  {
    const selectedEpisode = 2;
    const candidateEpisode = 10;
    const { context, page } = await createSeededPage(
      browser,
      "in-flight-cancel",
      makeSave({ reducedMotion: true, selectedJourneyEpisode: selectedEpisode }),
      episodeRequests,
      supplementRequests,
      homeThemeResponses,
    );
    await page.waitForFunction((expectedEpisode) => {
      const state = window.__COLOR_ESCAPE__?.getDebugState();
      return state?.journey.homeTheme.loadedEpisode === expectedEpisode
        && !state.journey.homeTheme.loading;
    }, selectedEpisode, { timeout: 15_000 });

    let markCandidateRequestStarted;
    const candidateRequestStarted = new Promise((resolveStarted) => {
      markCandidateRequestStarted = resolveStarted;
    });
    let releaseCandidateRequest;
    const candidateRequestGate = new Promise((resolveGate) => {
      releaseCandidateRequest = resolveGate;
    });
    await page.route("**/formal-pages/journey/home-10.jpg", async (route) => {
      markCandidateRequestStarted();
      await candidateRequestGate;
      await route.continue();
    });

    let state = await enterJourney(page);
    assert(state.interactionTargets.targets[`journeyEpisode.${candidateEpisode}`],
      `episode ${candidateEpisode} Use target is unavailable for in-flight cancellation`);
    await clickTarget(page, `journeyEpisode.${candidateEpisode}`);
    state = await debug(page);
    assert(state.journey.presentation?.intent === "theme_selection"
      && state.journey.presentation.event?.episode?.index === candidateEpisode,
    "in-flight cancellation did not open the expected selection overlay");

    await clickTarget(page, "journeyPresentation");
    await Promise.race([
      candidateRequestStarted,
      page.waitForTimeout(5_000).then(() => {
        throw new Error("candidate Home theme request did not start");
      }),
    ]);
    state = await debug(page);
    assert(state.screen === "levels"
      && state.journey.presentation?.intent === "theme_selection"
      && state.journey.presentation.themeApplying
      && state.journey.homeTheme.loading,
    "selection overlay did not remain cancellable while its candidate image was loading");

    await clickTarget(page, "journeyPresentationClose");
    state = await debug(page);
    assert(state.screen === "levels" && !state.journey.presentation,
      "X did not close the selection overlay during candidate loading");
    assert(state.journey.selectedEpisode === selectedEpisode
      && state.journey.homeTheme.loadedEpisode === selectedEpisode
      && !state.journey.homeTheme.loading,
    "X did not immediately preserve the committed Journey theme");

    const lateResponse = page.waitForResponse((response) =>
      response.url().includes("/formal-pages/journey/home-10.jpg"), { timeout: 15_000 });
    releaseCandidateRequest();
    await lateResponse;
    await page.waitForTimeout(120);
    state = await debug(page);
    const persisted = await storedSave(page);
    assert(state.screen === "levels"
      && !state.journey.presentation
      && state.journey.selectedEpisode === selectedEpisode
      && state.journey.homeTheme.selectedEpisode === selectedEpisode
      && state.journey.homeTheme.loadedEpisode === selectedEpisode
      && !state.journey.homeTheme.loading
      && persisted.selectedJourneyEpisode === selectedEpisode,
    "late candidate image installed after X cancelled the selection");
    await capture(page, "09-in-flight-theme-cancelled-720x1584.png");
    report.inFlightThemeSelectionCancel = {
      candidateEpisode,
      selectedEpisode,
      lateResponseStatus: (await lateResponse).status(),
      stayedOnJourney: true,
      candidateDiscarded: true,
      persistedEpisode: persisted.selectedJourneyEpisode,
      loadedEpisode: state.journey.homeTheme.loadedEpisode,
    };
    await context.close();
  }

  // Exercise the exact two-step flow at the smallest supported viewport with
  // real Pointer input. Adaptive hit expansion must keep Use and Continue at
  // least 44 CSS pixels without moving either action off screen.
  {
    const mobileViewport = { width: 320, height: 568 };
    const candidateEpisode = 10;
    const { context, page } = await createSeededPage(
      browser,
      "mobile-theme-selection",
      makeSave({ reducedMotion: true, selectedJourneyEpisode: 1 }),
      episodeRequests,
      supplementRequests,
      homeThemeResponses,
      mobileViewport,
    );
    let state = await enterJourney(page);
    const usePoint = await targetPoint(page, `journeyEpisode.${candidateEpisode}`);
    assert(usePoint.hit.width * state.viewportTransform.scale >= 44
      && usePoint.hit.height * state.viewportTransform.scale >= 44,
    `320x568 Use target is smaller than 44 CSS px: ${JSON.stringify(usePoint.hit)}`);
    assert(usePoint.client.x >= 0 && usePoint.client.x <= mobileViewport.width
      && usePoint.client.y >= 0 && usePoint.client.y <= mobileViewport.height,
    `320x568 Use center is outside the viewport: ${JSON.stringify(usePoint.client)}`);

    await clickTarget(page, `journeyEpisode.${candidateEpisode}`);
    state = await debug(page);
    assert(state.screen === "levels"
      && state.journey.presentation?.intent === "theme_selection"
      && state.journey.presentation.event?.episode?.index === candidateEpisode
      && state.journey.selectedEpisode === 1,
    "320x568 Use release did not open the uncommitted selection overlay");
    const continuePoint = await targetPoint(page, "journeyPresentation");
    assert(continuePoint.hit.width * state.viewportTransform.scale >= 44
      && continuePoint.hit.height * state.viewportTransform.scale >= 44,
    `320x568 Continue target is smaller than 44 CSS px: ${JSON.stringify(continuePoint.hit)}`);
    assert(continuePoint.client.x >= 0 && continuePoint.client.x <= mobileViewport.width
      && continuePoint.client.y >= 0 && continuePoint.client.y <= mobileViewport.height,
    `320x568 Continue center is outside the viewport: ${JSON.stringify(continuePoint.client)}`);
    await capture(page, "10-theme-selection-overlay-320x568.png");

    await clickTarget(page, "journeyPresentation");
    await page.waitForFunction((expectedEpisode) => {
      const state = window.__COLOR_ESCAPE__?.getDebugState();
      return state?.screen === "home"
        && !state.navigation.transition
        && !state.journey.presentation
        && state.journey.selectedEpisode === expectedEpisode
        && state.journey.homeTheme.loadedEpisode === expectedEpisode
        && !state.journey.homeTheme.loading;
    }, candidateEpisode, { timeout: 15_000 });
    state = await debug(page);
    const persisted = await storedSave(page);
    assert(persisted.selectedJourneyEpisode === candidateEpisode,
      "320x568 Continue did not persist the selected Journey theme");
    await capture(page, "11-theme-home-320x568.png");
    report.mobileThemeSelection = {
      viewport: mobileViewport,
      episode: candidateEpisode,
      useCenter: usePoint.client,
      useHitCss: {
        width: usePoint.hit.width * state.viewportTransform.scale,
        height: usePoint.hit.height * state.viewportTransform.scale,
      },
      continueCenter: continuePoint.client,
      continueHitCss: {
        width: continuePoint.hit.width * state.viewportTransform.scale,
        height: continuePoint.hit.height * state.viewportTransform.scale,
      },
      persistedEpisode: persisted.selectedJourneyEpisode,
      loadedEpisode: state.journey.homeTheme.loadedEpisode,
    };
    await context.close();
  }

  // At 320x568 the independent reward card and the modal controls must remain
  // real Pointer targets of at least 44 CSS px. Capture both the unclaimed and
  // persisted claimed states so the button-to-text replacement is reviewable.
  {
    const mobileViewport = { width: 320, height: 568 };
    const rewardSave = makeSave({ highestLevel: 26, reducedMotion: true, selectedJourneyEpisode: 1 });
    rewardSave.journeyProgress = {
      claimedMilestoneLevels: [10, 15],
      seenEpisodeUnlockLevels: [11, 21],
    };
    const { context, page } = await createSeededPage(
      browser,
      "mobile-reward-inspection",
      rewardSave,
      episodeRequests,
      supplementRequests,
      homeThemeResponses,
      mobileViewport,
    );
    await page.evaluate(() => {
      const originalFillText = CanvasRenderingContext2D.prototype.fillText;
      const originalDrawImage = CanvasRenderingContext2D.prototype.drawImage;
      globalThis.__journeyRewardCanvasText = [];
      globalThis.__journeyRewardCanvasImages = [];
      CanvasRenderingContext2D.prototype.fillText = function fillText(text, ...args) {
        globalThis.__journeyRewardCanvasText.push(String(text));
        if (globalThis.__journeyRewardCanvasText.length > 2_000) globalThis.__journeyRewardCanvasText.shift();
        return originalFillText.call(this, text, ...args);
      };
      CanvasRenderingContext2D.prototype.drawImage = function drawImage(image, ...args) {
        const source = typeof image?.src === "string" ? image.src.split("/").at(-1)?.split("?")[0] : "";
        if (source) {
          globalThis.__journeyRewardCanvasImages.push(source);
          if (globalThis.__journeyRewardCanvasImages.length > 2_000) globalThis.__journeyRewardCanvasImages.shift();
        }
        return originalDrawImage.call(this, image, ...args);
      };
    });

    let state = await enterJourney(page);
    const rewardPoint = await targetPoint(page, "journeyReward.25");
    const rewardHitCss = {
      width: rewardPoint.hit.width * state.viewportTransform.scale,
      height: rewardPoint.hit.height * state.viewportTransform.scale,
    };
    assert(rewardHitCss.width >= 44 && rewardHitCss.height >= 44,
      `320x568 reward-card target is smaller than 44 CSS px: ${JSON.stringify(rewardHitCss)}`);
    assert(rewardPoint.client.x >= 0 && rewardPoint.client.x <= mobileViewport.width
      && rewardPoint.client.y >= 0 && rewardPoint.client.y <= mobileViewport.height,
    `320x568 reward-card center is outside the viewport: ${JSON.stringify(rewardPoint.client)}`);

    await page.evaluate(() => {
      globalThis.__journeyRewardCanvasText.length = 0;
      globalThis.__journeyRewardCanvasImages.length = 0;
    });
    const opened = await clickTarget(page, "journeyReward.25");
    state = opened.state;
    assert(state.screen === "levels"
      && state.journey.presentation?.intent === "reward_inspection"
      && state.journey.presentation.event?.level === 25
      && state.journey.presentation.primaryAction === "claim"
      && !state.journey.presentation.claimed,
    "320x568 reward card did not open the unclaimed Lv25 inspection");
    const claimPoint = await targetPoint(page, "journeyPresentation");
    const closePoint = await targetPoint(page, "journeyPresentationClose");
    const claimHitCss = {
      width: claimPoint.hit.width * state.viewportTransform.scale,
      height: claimPoint.hit.height * state.viewportTransform.scale,
    };
    const closeHitCss = {
      width: closePoint.hit.width * state.viewportTransform.scale,
      height: closePoint.hit.height * state.viewportTransform.scale,
    };
    assert(claimHitCss.width >= 44 && claimHitCss.height >= 44,
      `320x568 Tap to Claim target is smaller than 44 CSS px: ${JSON.stringify(claimHitCss)}`);
    assert(closeHitCss.width >= 44 && closeHitCss.height >= 44,
      `320x568 reward close target is smaller than 44 CSS px: ${JSON.stringify(closeHitCss)}`);
    assert(claimPoint.client.x >= 0 && claimPoint.client.x <= mobileViewport.width
      && claimPoint.client.y >= 0 && claimPoint.client.y <= mobileViewport.height,
    `320x568 Tap to Claim center is outside the viewport: ${JSON.stringify(claimPoint.client)}`);
    assert(closePoint.client.x >= 0 && closePoint.client.x <= mobileViewport.width
      && closePoint.client.y >= 0 && closePoint.client.y <= mobileViewport.height,
    `320x568 reward close center is outside the viewport: ${JSON.stringify(closePoint.client)}`);
    await page.waitForFunction(() => {
      const text = globalThis.__journeyRewardCanvasText;
      const images = globalThis.__journeyRewardCanvasImages;
      return text?.includes("Level 25")
        && text.includes("Unlimited Lives 1h")
        && text.includes("Tap to Claim")
        && images?.includes("presentation-reward-heart.png");
    });
    await capture(page, "12-reward-unclaimed-overlay-320x568.png");

    await clickTarget(page, "journeyPresentation");
    await page.waitForFunction(() => {
      const state = window.__COLOR_ESCAPE__?.getDebugState();
      return state?.screen === "levels" && !state.journey.presentation;
    }, undefined, { timeout: 15_000 });
    state = await debug(page);
    const claimedStored = await storedSave(page);
    assert(state.journey.progress.claimedMilestoneLevels.filter((level) => level === 25).length === 1
      && claimedStored.journeyProgress.claimedMilestoneLevels.filter((level) => level === 25).length === 1,
    "320x568 Lv25 claim was not stored exactly once");

    const claimedRewardPoint = await targetPoint(page, "journeyReward.25");
    await page.evaluate(() => {
      globalThis.__journeyRewardCanvasText.length = 0;
      globalThis.__journeyRewardCanvasImages.length = 0;
    });
    const claimedOpened = await clickTarget(page, "journeyReward.25");
    state = claimedOpened.state;
    assert(state.screen === "levels"
      && state.journey.presentation?.intent === "reward_inspection"
      && state.journey.presentation.event?.level === 25
      && state.journey.presentation.claimed === true
      && state.journey.presentation.primaryAction === null,
    "320x568 claimed Lv25 card did not open its read-only inspection");
    assert(!state.interactionTargets.targets.journeyPresentation,
      "320x568 claimed reward retained a primary hit target");
    const claimedClosePoint = await targetPoint(page, "journeyPresentationClose");
    const claimedRewardHitCss = {
      width: claimedRewardPoint.hit.width * state.viewportTransform.scale,
      height: claimedRewardPoint.hit.height * state.viewportTransform.scale,
    };
    const claimedCloseHitCss = {
      width: claimedClosePoint.hit.width * state.viewportTransform.scale,
      height: claimedClosePoint.hit.height * state.viewportTransform.scale,
    };
    assert(claimedRewardHitCss.width >= 44 && claimedRewardHitCss.height >= 44,
      `320x568 claimed reward-card target is smaller than 44 CSS px: ${JSON.stringify(claimedRewardHitCss)}`);
    assert(claimedCloseHitCss.width >= 44 && claimedCloseHitCss.height >= 44,
      `320x568 claimed reward close target is smaller than 44 CSS px: ${JSON.stringify(claimedCloseHitCss)}`);
    await page.waitForFunction(() => {
      const text = globalThis.__journeyRewardCanvasText;
      const images = globalThis.__journeyRewardCanvasImages;
      return text?.includes("Level 25")
        && text.includes("Unlimited Lives 1h")
        && text.includes("已领取")
        && images?.includes("presentation-reward-heart.png");
    });
    await capture(page, "13-reward-claimed-overlay-320x568.png");

    report.mobileRewardInspection = {
      viewport: mobileViewport,
      level: 25,
      rewardCenter: rewardPoint.client,
      rewardHitCss,
      claimCenter: claimPoint.client,
      claimHitCss,
      closeCenter: closePoint.client,
      closeHitCss,
      claimedRewardHitCss,
      claimedCloseHitCss,
      unclaimedTextDrawn: ["Level 25", "Unlimited Lives 1h", "Tap to Claim"],
      claimedTextDrawn: ["Level 25", "Unlimited Lives 1h", "已领取"],
      rewardImageDrawnInBothStates: "presentation-reward-heart.png",
      claimedPrimaryTargetPresent: false,
      persistedExactlyOnce: true,
    };
    await context.close();
  }

  // Persisted theme indices are clamped to the latest unlocked episode at all
  // ten thresholds; this is the save-data counterpart of the ten Use cards.
  for (const gate of [
    { highestLevel: 10, expectedEpisode: 1 },
    { highestLevel: 11, expectedEpisode: 2 },
    { highestLevel: 21, expectedEpisode: 3 },
    { highestLevel: 31, expectedEpisode: 4 },
    { highestLevel: 41, expectedEpisode: 5 },
    { highestLevel: 51, expectedEpisode: 6 },
    { highestLevel: 61, expectedEpisode: 7 },
    { highestLevel: 71, expectedEpisode: 8 },
    { highestLevel: 81, expectedEpisode: 9 },
    { highestLevel: 91, expectedEpisode: 10 },
  ]) {
    const { context, page } = await createSeededPage(
      browser,
      `unlock-lv${gate.highestLevel}`,
      makeSave({ highestLevel: gate.highestLevel, reducedMotion: true, selectedJourneyEpisode: 10 }),
      episodeRequests,
      supplementRequests,
      homeThemeResponses,
    );
    const state = await debug(page);
    assert(state.journey.selectedEpisode === gate.expectedEpisode,
      `Lv${gate.highestLevel} accepted locked episode ${state.journey.selectedEpisode}`);
    report.episodeUnlockGates.push({
      highestLevel: gate.highestLevel,
      requestedEpisode: 10,
      selectedEpisode: state.journey.selectedEpisode,
      expectedEpisode: gate.expectedEpisode,
    });
    await context.close();
  }

  report.episodeArtRequests = [...episodeRequests].sort();
  const expectedEpisodeArtRequests = Array.from(
    { length: 10 },
    (_, index) => `episode-${String(index + 1).padStart(2, "0")}.png`,
  );
  assert(JSON.stringify(report.episodeArtRequests) === JSON.stringify(expectedEpisodeArtRequests),
    `not all Journey episode art was requested: ${JSON.stringify(report.episodeArtRequests)}`);
  report.supplementArtRequests = [...supplementRequests].sort();
  assert(JSON.stringify(report.supplementArtRequests) === JSON.stringify(expectedJourneySupplementArt),
    `Journey supplement art requests drifted or retained locked-frame: ${JSON.stringify(report.supplementArtRequests)}`);
  report.homeThemeRequests = Object.values(expectedHomeThemeByEpisode).map((file) => ({
    file,
    responses: homeThemeResponses.get(file) ?? [],
    successful: homeThemeResponses.get(file)?.some((response) => response.ok) === true,
  }));
  assert(report.homeThemeRequests.every((entry) => entry.successful),
    `not all Journey Home theme JPEGs loaded successfully: ${JSON.stringify(report.homeThemeRequests)}`);
  assert(report.browserErrors.length === 0,
    `browser emitted errors:\n${report.browserErrors.join("\n")}`);
  report.passed = true;
} catch (error) {
  failure = error;
  report.failure = error instanceof Error ? { message: error.message, stack: error.stack } : String(error);
} finally {
  report.episodeArtRequests = [...episodeRequests].sort();
  report.supplementArtRequests = [...supplementRequests].sort();
  report.homeThemeRequests = Object.values(expectedHomeThemeByEpisode).map((file) => ({
    file,
    responses: homeThemeResponses.get(file) ?? [],
    successful: homeThemeResponses.get(file)?.some((response) => response.ok) === true,
  }));
  await writeFile(resolve(output, "journey-video-parity-report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await browser.close();
}

if (failure) throw failure;
console.log(`Journey video-parity E2E passed; evidence: ${resolve(output, "journey-video-parity-report.json")}`);
