import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";

const SAVE_KEY = "color-escape-save-v1";
const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
const PRESSED_SCALE = 0.95;
const output = fileURLToPath(new URL("../playtest-results/journey-leaderboard/", import.meta.url));
const viewport = { width: 720, height: 1584 };
await mkdir(output, { recursive: true });

const assert = (condition, message) => {
  if (!condition) throw new Error(`Journey/Leaderboard E2E: ${message}`);
};

const errors = [];
const attachErrors = (page, label) => {
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`${label}: ${message.text()}`);
  });
  page.on("pageerror", (error) => errors.push(`${label}: ${error.message}`));
};

const debug = (page) => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const readStoredSave = (page) => page.evaluate((key) => {
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : null;
}, SAVE_KEY);

const completeBestStars = Object.fromEntries(
  Array.from({ length: 100 }, (_, index) => [String(index + 1), 1 + index % 3]),
);
const completeBestMoves = Object.fromEntries(
  Array.from({ length: 100 }, (_, index) => [String(index + 1), 10 + index % 9]),
);

const journeyMilestoneLevels = [10, 15, 25, 30, 35, 45, 50, 60, 65, 75, 80, 90, 95];
const milestoneLevelsThrough = (level) => journeyMilestoneLevels.filter((milestone) => milestone <= level);

const journeyEpisodeUnlockLevels = [11, 21, 31, 41, 51, 61, 71, 81, 91];
const episodeUnlockLevelsThrough = (level) => journeyEpisodeUnlockLevels
  .filter((unlockLevel) => unlockLevel <= level);

const handledJourneyProgress = (level) => ({
  claimedMilestoneLevels: milestoneLevelsThrough(level),
  seenEpisodeUnlockLevels: episodeUnlockLevelsThrough(level),
});

const makeSave = (overrides = {}) => ({
  schemaVersion: 1,
  currentLevel: 58,
  highestLevel: 58,
  coins: 1640,
  sound: false,
  haptic: false,
  reducedMotion: false,
  language: "en",
  featureSeen: ["basics", "ice-door", "ice-block", "layer", "shutter", "generator", "elevator", "conveyor", "star"],
  boosterUnlockSeen: ["time", "rocket", "pulse"],
  boosters: { time: 2, rocket: 4, pulse: 1 },
  bestStars: completeBestStars,
  bestMoves: completeBestMoves,
  rewardedLevels: Array.from({ length: 57 }, (_, index) => index + 1),
  journeyProgress: handledJourneyProgress(58),
  lifeState: { lives: 3, nextLifeAtMs: Date.now() + 30 * 60 * 1000, unlimitedLivesUntilMs: 0 },
  metaDiscovery: { collectionViewedThroughLevel: 58, dailyUnlockSeen: true },
  dailyStreak: 3,
  lastDailyCompletedDay: "",
  ...overrides,
});

const stallImageUntilReleased = (page, sourceFragment) => page.addInitScript((fragment) => {
  const descriptor = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, "src");
  if (!descriptor?.get || !descriptor.set) throw new Error("HTMLImageElement.src descriptor is unavailable");
  let active = true;
  Object.defineProperty(HTMLImageElement.prototype, "src", {
    configurable: descriptor.configurable,
    enumerable: descriptor.enumerable,
    get() { return descriptor.get.call(this); },
    set(value) {
      if (active && String(value).includes(fragment)) return;
      descriptor.set.call(this, value);
    },
  });
  globalThis.__releaseStalledJourneyImage = () => { active = false; };
}, sourceFragment);

const installLeaderboardAvatarProbe = (page) => page.addInitScript(() => {
  const originalDrawImage = CanvasRenderingContext2D.prototype.drawImage;
  globalThis.__leaderboardAvatarDraws = [];
  globalThis.__leaderboardFixedDraws = [];
  CanvasRenderingContext2D.prototype.drawImage = function drawImage(image, ...args) {
    const source = typeof image?.src === "string" ? image.src : "";
    const avatarAsset = /\/leaderboard\/avatar-(?:fox|raccoon|panda|rabbit|cat)\.png(?:\?|$)/.test(source);
    const fixedAsset = /\/leaderboard\/(?:player-row|player-level-pill)\.png(?:\?|$)/.test(source);
    if (avatarAsset || fixedAsset) {
      let destination;
      if (args.length === 2) {
        destination = [args[0], args[1], image.naturalWidth || image.width, image.naturalHeight || image.height];
      } else if (args.length === 4) {
        destination = args;
      } else if (args.length === 8) {
        destination = args.slice(4);
      }
      if (destination) {
        const draw = {
          file: source.split("/").at(-1)?.split("?")[0],
          naturalWidth: image.naturalWidth || image.width,
          naturalHeight: image.naturalHeight || image.height,
          x: destination[0],
          y: destination[1],
          width: destination[2],
          height: destination[3],
        };
        const draws = avatarAsset ? globalThis.__leaderboardAvatarDraws : globalThis.__leaderboardFixedDraws;
        draws.push(draw);
        if (draws.length > 2_000) {
          draws.shift();
        }
      }
    }
    return originalDrawImage.call(this, image, ...args);
  };
});

const createSeededPage = async (browser, label, save, stalledImageFragment) => {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const page = await context.newPage();
  await installLeaderboardAvatarProbe(page);
  if (stalledImageFragment) await stallImageUntilReleased(page, stalledImageFragment);
  attachErrors(page, label);
  await page.goto(playtestUrl, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().art.ready);
  const updateId = (await debug(page)).updateNotice.id;
  await page.evaluate(({ key, value, lastSeenUpdate }) => {
    localStorage.clear();
    localStorage.setItem(key, JSON.stringify({ ...value, lastSeenUpdate }));
  }, { key: SAVE_KEY, value: save, lastSeenUpdate: updateId });
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForFunction(() => {
    const state = window.__COLOR_ESCAPE__?.getDebugState();
    return state?.art.ready && state?.storage.status === "ready" && state?.screen === "home";
  });
  return { context, page };
};

const targetPoint = async (page, name) => {
  const state = await debug(page);
  const hit = state.interactionTargets?.targets?.[name]?.hit;
  const bounds = await page.locator("canvas").boundingBox();
  assert(hit && bounds, `missing interaction target ${name}`);
  return {
    x: bounds.x + state.viewportTransform.offsetX + (hit.x + hit.width / 2) * state.viewportTransform.scale,
    y: bounds.y + state.viewportTransform.offsetY + (hit.y + hit.height / 2) * state.viewportTransform.scale,
  };
};

const pressTarget = async (page, name) => {
  const point = await targetPoint(page, name);
  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
  await page.waitForTimeout(80);
  const state = await debug(page);
  assert(state.buttonPress?.key === name, `${name} did not own the held pointer`);
  assert(Math.abs(state.buttonPress.visualScale - PRESSED_SCALE) < 0.001, `${name} press feedback was not 5%`);
  assert(Math.abs(state.buttonPress.renderedScale - PRESSED_SCALE) < 0.001, `${name} press feedback was not rendered`);
  return { point, state };
};

const releasePressedTarget = async (page, waitMs = 60) => {
  await page.mouse.up();
  if (waitMs) await page.waitForTimeout(waitMs);
  return debug(page);
};

const clickTarget = async (page, name, waitMs = 60) => {
  await pressTarget(page, name);
  return releasePressedTarget(page, waitMs);
};

const swipeLeaderboard = async (page, direction = "up", distanceRatio = 0.76) => {
  const before = await debug(page);
  const listViewport = before.leaderboard?.viewport;
  const bounds = await page.locator("canvas").boundingBox();
  assert(before.screen === "leaderboard" && listViewport && bounds, "leaderboard scroll viewport is unavailable");
  assert(direction === "up" || direction === "down", `unsupported leaderboard swipe direction ${direction}`);

  const startRatio = direction === "up" ? 0.88 : 0.12;
  const signedDistance = (direction === "up" ? -1 : 1) * listViewport.height * distanceRatio;
  const logicalX = listViewport.x + listViewport.width * 0.5;
  const logicalStartY = listViewport.y + listViewport.height * startRatio;
  const logicalEndY = logicalStartY + signedDistance;
  const toClient = (logicalPoint) => ({
    x: bounds.x + before.viewportTransform.offsetX + logicalPoint.x * before.viewportTransform.scale,
    y: bounds.y + before.viewportTransform.offsetY + logicalPoint.y * before.viewportTransform.scale,
  });
  const start = toClient({ x: logicalX, y: logicalStartY });
  const end = toClient({ x: logicalX, y: logicalEndY });

  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 8 });
  await page.waitForTimeout(30);
  const held = await debug(page);
  assert(held.leaderboard.scrolling, "leaderboard did not retain pointer ownership while swiping");
  assert(!held.buttonPress, "leaderboard swipe was misclassified as a button press");
  if (direction === "up") {
    assert(held.leaderboard.scrollOffset > before.leaderboard.scrollOffset, "upward swipe did not reveal later ranks");
  } else {
    assert(held.leaderboard.scrollOffset < before.leaderboard.scrollOffset, "downward swipe did not reveal earlier ranks");
  }

  await page.mouse.up();
  await page.waitForTimeout(40);
  const after = await debug(page);
  assert(!after.leaderboard.scrolling, "leaderboard remained in its scrolling state after release");
  return { before, held, after };
};

const swipeJourney = async (page, direction = "up", distanceRatio = 0.32, startTarget) => {
  const before = await debug(page);
  const scrollViewport = before.journey?.viewport;
  const bounds = await page.locator("canvas").boundingBox();
  assert(before.screen === "levels" && scrollViewport && bounds, "Journey scroll viewport is unavailable");
  assert(direction === "up" || direction === "down", `unsupported Journey swipe direction ${direction}`);

  const logicalX = scrollViewport.x + scrollViewport.width * 0.5;
  const logicalStartY = scrollViewport.y + scrollViewport.height * (direction === "up" ? 0.72 : 0.28);
  const signedDistance = (direction === "up" ? -1 : 1) * scrollViewport.height * distanceRatio;
  const toClient = (logicalPoint) => ({
    x: bounds.x + before.viewportTransform.offsetX + logicalPoint.x * before.viewportTransform.scale,
    y: bounds.y + before.viewportTransform.offsetY + logicalPoint.y * before.viewportTransform.scale,
  });
  const start = startTarget
    ? await targetPoint(page, startTarget)
    : toClient({ x: logicalX, y: logicalStartY });
  const end = {
    x: start.x,
    y: start.y + signedDistance * before.viewportTransform.scale,
  };

  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 8 });
  await page.waitForTimeout(30);
  const held = await debug(page);
  assert(held.journey.scrolling, "Journey did not retain pointer ownership while swiping");
  assert(!held.buttonPress, "Journey swipe was misclassified as a button press");
  assert(held.screen === "levels" && held.level.id === before.level.id,
    "Journey entered a level while the swipe was held");
  if (direction === "up") {
    assert(held.journey.scrollOffset > before.journey.scrollOffset, "upward Journey swipe did not reveal lower level rewards");
  } else {
    assert(held.journey.scrollOffset < before.journey.scrollOffset, "downward Journey swipe did not reveal higher level rewards");
  }

  await page.mouse.up();
  await page.waitForTimeout(40);
  const after = await debug(page);
  assert(!after.journey.scrolling, "Journey remained in its scrolling state after release");
  assert(after.screen === "levels" && after.level.id === before.level.id,
    "Journey swipe release was misclassified as level selection");
  return { before, held, after };
};

const waitFormalPage = async (page, screen, imageCount) => {
  await page.waitForFunction(({ expectedScreen, expectedImages }) => {
    const state = window.__COLOR_ESCAPE__?.getDebugState();
    return state?.screen === expectedScreen
      && !state.navigation.transition
      && state.art.formalPage.loaded === expectedScreen
      && state.art.formalPage.loadedImages === expectedImages
      && !state.art.formalPage.error;
  }, { expectedScreen: screen, expectedImages: imageCount }, { timeout: 15_000 });
  return debug(page);
};

const waitFormalPageReady = async (page, screen) => {
  await page.waitForFunction((expectedScreen) => {
    const state = window.__COLOR_ESCAPE__?.getDebugState();
    return state?.screen === expectedScreen
      && !state.navigation.transition
      && state.art.formalPage.loaded === expectedScreen
      && state.art.formalPage.loadedImages > 0
      && !state.art.formalPage.error;
  }, screen, { timeout: 15_000 });
  return debug(page);
};

const waitJourneyProgress = async (page) => {
  await page.waitForFunction(() => {
    const state = window.__COLOR_ESCAPE__?.getDebugState();
    return state?.screen === "levels"
      && !state.navigation.transition
      && state.art.formalPage.loaded === "levels"
      && state.journey.presentation?.phase === "progress";
  }, undefined, { timeout: 15_000 });
  return debug(page);
};

const waitJourneyOverlay = async (page) => {
  await page.waitForFunction(() => {
    const state = window.__COLOR_ESCAPE__?.getDebugState();
    return state?.screen === "home" && state.journey.presentation?.phase === "overlay";
  }, undefined, { timeout: 15_000 });
  return debug(page);
};

const waitJourneyPresentationFinished = async (page) => {
  await page.waitForFunction(() => !window.__COLOR_ESCAPE__?.getDebugState().journey.presentation, undefined, {
    timeout: 15_000,
  });
  return debug(page);
};

const waitJourneyEvent = async (page, phase, type, level) => {
  await page.waitForFunction(({ expectedPhase, expectedType, expectedLevel }) => {
    const presentation = window.__COLOR_ESCAPE__?.getDebugState().journey.presentation;
    return presentation?.phase === expectedPhase
      && presentation.event.type === expectedType
      && presentation.event.level === expectedLevel;
  }, {
    expectedPhase: phase,
    expectedType: type,
    expectedLevel: level,
  }, { timeout: 15_000 });
  return debug(page);
};

const leaderboardSnapshot = (state) => state.leaderboard.entries.map((entry) => ({ ...entry }));

const enterJourney = async (page) => {
  await clickTarget(page, "navigation.3", 20);
  const state = await waitFormalPageReady(page, "levels");
  assert(!state.journey.presentation, "ordinary Journey navigation unexpectedly auto-opened a pending event");
  return state;
};

// Seeded saves bypass a real level settlement. Invoke the same post-win hook
// that the result actions call, while keeping every user-facing modal action on
// real Pointer down/up input.
const triggerPostWinJourneyEvent = async (page) => {
  const started = await page.evaluate(() => window.__COLOR_ESCAPE__.beginPendingJourneyPresentation());
  assert(started, "post-win Journey hook did not start the pending event");
};

const beginPostWinJourneyEvent = async (page, expectedType, expectedLevel, progressScreenshot) => {
  await triggerPostWinJourneyEvent(page);
  let state = expectedType === "episode_unlock" ? await debug(page) : await waitJourneyProgress(page);
  assert(state.journey.presentation.event.type === expectedType, `expected ${expectedType} presentation`);
  assert(state.journey.presentation.event.level === expectedLevel, `expected Journey event at Lv${expectedLevel}`);
  if (expectedType === "episode_unlock") {
    assert(state.screen === "home", "Episode unlock must stay on Home, without opening Journey");
  } else {
    await page.waitForFunction(() => {
      const presentation = window.__COLOR_ESCAPE__?.getDebugState().journey.presentation;
      return presentation?.phase === "progress" && presentation.age >= 0.2;
    });
  }
  await page.screenshot({ path: resolve(output, progressScreenshot) });
  state = await waitJourneyOverlay(page);
  return state;
};

const rawPointerClick = async (page, point, waitMs = 60) => {
  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
  await page.waitForTimeout(40);
  await page.mouse.up();
  if (waitMs) await page.waitForTimeout(waitMs);
  return debug(page);
};

const installRejectedWriteOnce = (page) => page.evaluate((key) => {
  const originalSet = Storage.prototype.setItem;
  const originalGet = Storage.prototype.getItem;
  globalThis.__journeyStorageFault = {
    blockedWritesRemaining: 1,
    writes: [],
    originalGet,
  };
  Storage.prototype.setItem = function setItem(name, value) {
    const probe = globalThis.__journeyStorageFault;
    if (name === key) {
      probe.writes.push(JSON.parse(value));
      if (probe.blockedWritesRemaining > 0) {
        probe.blockedWritesRemaining -= 1;
        throw new DOMException("Journey reward storage full", "QuotaExceededError");
      }
    }
    return originalSet.call(this, name, value);
  };
}, SAVE_KEY);

const storageFaultProbe = (page) => page.evaluate(() => ({
  blockedWritesRemaining: globalThis.__journeyStorageFault.blockedWritesRemaining,
  writes: globalThis.__journeyStorageFault.writes,
}));

const installAmbiguousWriteOnce = (page) => page.evaluate((key) => {
  const originalSet = Storage.prototype.setItem;
  const originalGet = Storage.prototype.getItem;
  let transactionStarted = false;
  globalThis.__journeyAmbiguousStorage = {
    writes: [],
    restore() {
      Storage.prototype.setItem = originalSet;
      Storage.prototype.getItem = originalGet;
    },
  };
  Storage.prototype.setItem = function setItem(name, value) {
    if (name === key) {
      originalSet.call(this, name, value);
      globalThis.__journeyAmbiguousStorage.writes.push(JSON.parse(value));
      transactionStarted = true;
      throw new DOMException("Journey bridge acknowledgement lost", "UnknownError");
    }
    return originalSet.call(this, name, value);
  };
  Storage.prototype.getItem = function getItem(name) {
    if (name === key && transactionStarted) {
      throw new DOMException("Journey bridge read-back unavailable", "UnknownError");
    }
    return originalGet.call(this, name);
  };
}, SAVE_KEY);

const restoreAmbiguousStorage = (page) => page.evaluate(() => {
  globalThis.__journeyAmbiguousStorage.restore();
});

const browser = await chromium.launch({ headless: true });
const screenshots = [];
let journeyClaimButtonPoint;
const report = {
  generatedAt: new Date().toISOString(),
  playtestUrl,
  nativeArtboard: viewport,
  leaderboard: {},
  journeyEpisodeUnlock: {},
  journeyLv25Reward: {},
  lockedJourneyReward: {},
  journeyRewardDrag: {},
  fullInventoryReward: {},
  formalPageResourceRecovery: {},
  formalPageCallbackTimeoutRecovery: {},
  consecutiveJourneyEvents: {},
  journeyVerticalScroll: {},
  journeyEndgameNodes: {},
  persistenceRecovery: {},
  ambiguousPersistenceRecovery: {},
  screenshots,
  browserErrors: errors,
};

try {
  // The reference leaderboard uses three player scopes backed by the same
  // replaceable snapshot contract. Placeholder rivals scroll behind a pinned
  // green row that always represents the signed-in player.
  {
    const { context, page } = await createSeededPage(browser, "leaderboard", makeSave());
    await clickTarget(page, "navigation.1", 20);
    let state = await waitFormalPage(page, "leaderboard", 27);
    assert(state.leaderboard.mode === "world", "World must be the default leaderboard");
    assert(state.leaderboard.source === "placeholder-v1", "leaderboard must identify its temporary data source");
    assert(state.leaderboard.totalEntries === 99 && state.leaderboard.totalPlayers === 100
      && state.leaderboard.firstRank === 1,
    "World must begin with 99 placeholder rivals at rank 1 plus one pinned player");
    assert(state.leaderboard.player?.rank === 66 && state.leaderboard.player?.name === "Klip"
      && state.leaderboard.player?.avatar === "cat" && state.leaderboard.player?.totalStars === 115
      && state.leaderboard.player?.isPlayer,
    `pinned player record is incorrect: ${JSON.stringify(state.leaderboard.player)}`);
    assert(state.leaderboard.scrollOffset === 0 && state.leaderboard.maxScrollOffset > 0
      && !state.leaderboard.canScrollUp && state.leaderboard.canScrollDown,
    "World scroll bounds are invalid at the top");
    assert(!state.interactionTargets.targets.leaderboardPrev && !state.interactionTargets.targets.leaderboardNext,
      "Leaderboard still exposes Prev/Next interaction targets");
    const avatarDraws = await page.evaluate(() => globalThis.__leaderboardAvatarDraws ?? []);
    const uniqueAvatarDraws = [...new Map(avatarDraws.map((draw) => [
      [draw.file, draw.x, draw.y, draw.width, draw.height].map((value) => (
        typeof value === "number" ? value.toFixed(3) : value
      )).join(":"),
      draw,
    ])).values()];
    const podiumAvatarDraws = uniqueAvatarDraws.filter((draw) => draw.y < 599);
    const rowAvatarDraws = uniqueAvatarDraws.filter((draw) => draw.y >= 599 && draw.y < 1340);
    const playerAvatarDraws = uniqueAvatarDraws.filter((draw) => Math.abs(draw.y - 1356) < 0.001);
    assert(podiumAvatarDraws.length === 3, `expected 3 podium avatar placements, received ${podiumAvatarDraws.length}`);
    assert(rowAvatarDraws.length >= 6, `expected all 6 visible row avatar placements, received ${rowAvatarDraws.length}`);
    assert(playerAvatarDraws.some((draw) => draw.file === "avatar-cat.png"
      && Math.abs(draw.x - 110) < 0.001 && Math.abs(draw.width - 80) < 0.001
      && Math.abs(draw.height - 79) < 0.001),
    `pinned player avatar did not use the reference slot: ${JSON.stringify(playerAvatarDraws)}`);
    assert(podiumAvatarDraws.every((draw) => (
      Math.abs(draw.width - draw.naturalWidth) < 0.001
      && Math.abs(draw.height - draw.naturalHeight) < 0.001
    )), "podium avatars no longer preserve their supplied natural sizes");
    assert(rowAvatarDraws.every((draw) => (
      draw.width >= 79 && draw.width <= 81
      && draw.height >= 77 && draw.height <= 81
      && Math.abs(draw.width / draw.height - draw.naturalWidth / draw.naturalHeight) < 0.0001
    )), `row avatars were not uniformly contained without distortion: ${JSON.stringify(rowAvatarDraws)}`);
    const fixedDraws = await page.evaluate(() => globalThis.__leaderboardFixedDraws ?? []);
    assert(fixedDraws.some((draw) => draw.file === "player-row.png"
      && draw.x === 32 && draw.y === 1340 && draw.width === 655 && draw.height === 121),
    `green player row was not drawn at its fixed reference placement: ${JSON.stringify(fixedDraws)}`);
    assert(fixedDraws.some((draw) => draw.file === "player-level-pill.png"
      && draw.x === 450 && draw.y === 1366 && draw.width === 210 && draw.height === 56),
    `green player metric pill was not drawn at its fixed reference placement: ${JSON.stringify(fixedDraws)}`);
    const worldMaxScrollOffset = state.leaderboard.maxScrollOffset;
    const worldAtTop = leaderboardSnapshot(state);
    assert(worldAtTop.every((entry) => typeof entry.name === "string"
      && Number.isInteger(entry.totalStars) && !entry.isPlayer),
    "World rows are not player-name/total-star placeholder records");
    assert(worldAtTop.slice(0, 3).map((entry) => entry.name).join(",") === "Mia,Hed,Kai",
      `podium players differ from the reference order: ${JSON.stringify(worldAtTop.slice(0, 3))}`);
    screenshots.push("01-leaderboard-world-720x1584.png");
    await page.screenshot({ path: resolve(output, screenshots.at(-1)) });

    ({ state } = await pressTarget(page, "leaderboardWeekly"));
    assert(state.leaderboard.mode === "world", "Weekly changed before pointer release");
    screenshots.push("02-leaderboard-weekly-pressed-720x1584.png");
    await page.screenshot({ path: resolve(output, screenshots.at(-1)) });
    state = await releasePressedTarget(page);
    assert(state.leaderboard.mode === "weekly", "Weekly did not activate on release");
    assert(state.leaderboard.totalEntries === 99 && state.leaderboard.firstRank === 1,
      "Weekly omitted placeholder players or did not start at rank 1");
    assert(state.leaderboard.scrollOffset === 0 && state.leaderboard.maxScrollOffset > 0
      && !state.leaderboard.canScrollUp && state.leaderboard.canScrollDown,
    "Weekly scroll bounds are invalid at the top");
    const weeklyAtTop = leaderboardSnapshot(state);
    screenshots.push("03-leaderboard-weekly-720x1584.png");
    await page.screenshot({ path: resolve(output, screenshots.at(-1)) });

    const weeklySwipe = await swipeLeaderboard(page);
    state = weeklySwipe.after;
    assert(state.leaderboard.firstRank > 1 && state.leaderboard.canScrollUp,
      "Weekly swipe did not advance its visible rank window");
    const weeklyOffset = state.leaderboard.scrollOffset;
    const weeklyAfterSwipe = leaderboardSnapshot(state);
    assert(state.leaderboard.player.rank === 66 && state.leaderboard.player.name === "Klip",
      "scrolling changed the pinned player's record");
    screenshots.push("03b-leaderboard-weekly-scrolled-720x1584.png");
    await page.screenshot({ path: resolve(output, screenshots.at(-1)) });

    ({ state } = await pressTarget(page, "leaderboardCountry"));
    assert(state.leaderboard.mode === "weekly", "Country changed before pointer release");
    state = await releasePressedTarget(page);
    assert(state.leaderboard.mode === "country", "Country did not activate on release");
    assert(state.leaderboard.totalEntries === 99 && state.leaderboard.firstRank === 1,
      "Country omitted placeholder players or inherited another tab's position");
    assert(state.leaderboard.scrollOffset === 0 && state.leaderboard.maxScrollOffset > 0,
      "Country did not start at its own scroll origin");
    const countryAtTop = leaderboardSnapshot(state);
    screenshots.push("04-leaderboard-country-720x1584.png");
    await page.screenshot({ path: resolve(output, screenshots.at(-1)) });

    const countrySwipe = await swipeLeaderboard(page, "up", 0.42);
    state = countrySwipe.after;
    assert(state.leaderboard.firstRank > 1 && state.leaderboard.lastRank < 100,
      "Country swipe did not advance its visible rank window");
    const countryOffset = state.leaderboard.scrollOffset;
    const countryAfterSwipe = leaderboardSnapshot(state);

    state = await clickTarget(page, "leaderboardWorld");
    assert(state.leaderboard.mode === "world", "World did not reactivate");
    assert(state.leaderboard.scrollOffset === 0 && state.leaderboard.firstRank === 1,
      "World inherited another tab's scroll position");
    const worldAgain = leaderboardSnapshot(state);
    state = await clickTarget(page, "leaderboardWeekly");
    assert(Math.abs(state.leaderboard.scrollOffset - weeklyOffset) < 0.001,
      "Weekly did not preserve its vertical scroll position");
    assert(JSON.stringify(worldAgain) === JSON.stringify(worldAtTop),
      "World placeholder records changed after a round trip");
    assert(JSON.stringify(leaderboardSnapshot(state)) === JSON.stringify(weeklyAfterSwipe),
      "Weekly visible records changed after a round trip");
    state = await clickTarget(page, "leaderboardCountry");
    assert(Math.abs(state.leaderboard.scrollOffset - countryOffset) < 0.001,
      "Country did not preserve its vertical scroll position");
    assert(JSON.stringify(leaderboardSnapshot(state)) === JSON.stringify(countryAfterSwipe),
      "Country visible records changed after a round trip");

    report.leaderboard = {
      releaseActivation: true,
      pressedScale: PRESSED_SCALE,
      source: state.leaderboard.source,
      placeholderRivals: 99,
      player: state.leaderboard.player,
      playerRowFixed: true,
      metric: "totalStars",
      stableAfterRoundTrip: true,
      datasets: {
        World: { total: 99, maxScrollOffset: worldMaxScrollOffset, visibleAtTop: worldAtTop },
        Weekly: { total: 99, visibleAtTop: weeklyAtTop, visibleAfterSwipe: weeklyAfterSwipe, scrollOffset: weeklyOffset },
        Country: { total: 99, visibleAtTop: countryAtTop, visibleAfterSwipe: countryAfterSwipe, scrollOffset: countryOffset },
      },
      prevNextTargetsPresent: false,
      continuousVerticalScroll: true,
      perTabOffsetPreserved: true,
      avatarGeometry: {
        podium: podiumAvatarDraws,
        rows: rowAvatarDraws,
        player: playerAvatarDraws,
        rowRange: { minWidth: 79, maxWidth: 81, minHeight: 77, maxHeight: 81 },
        aspectRatiosPreserved: true,
      },
      fixedAssets: fixedDraws,
    };
    await context.close();
  }

  // Lv21 follows the video sequence: Journey progress first, then a Home-backed
  // full-screen Episode Unlocked overlay with no close target. Acknowledgement
  // is durable only after the player's pointer is released.
  {
    const episodeSave = makeSave({
      currentLevel: 21,
      highestLevel: 21,
      rewardedLevels: Array.from({ length: 20 }, (_, index) => index + 1),
      journeyProgress: {
        claimedMilestoneLevels: [10, 15],
        seenEpisodeUnlockLevels: [11],
      },
      metaDiscovery: { collectionViewedThroughLevel: 21, dailyUnlockSeen: true },
    });
    const { context, page } = await createSeededPage(browser, "journey-episode", episodeSave);
    let state = await beginPostWinJourneyEvent(page, "episode_unlock", 21, "05-journey-lv21-progress-720x1584.png");
    screenshots.push("05-journey-lv21-progress-720x1584.png");
    const targetNames = Object.keys(state.interactionTargets.targets);
    assert(targetNames.includes("journeyPresentation"), "Episode overlay is not a release target");
    assert(targetNames.includes("journeyPresentationClose"), "Episode overlay close art is not an interaction target");
    screenshots.push("06-episode-unlocked-overlay-720x1584.png");
    await page.screenshot({ path: resolve(output, screenshots.at(-1)) });

    const beforeStored = await readStoredSave(page);
    ({ state } = await pressTarget(page, "journeyPresentation"));
    assert(state.journey.presentation.phase === "overlay", "Episode overlay advanced before release");
    assert(JSON.stringify((await readStoredSave(page)).journeyProgress) === JSON.stringify(beforeStored.journeyProgress), "Episode acknowledgement persisted on pointer down");
    state = await releasePressedTarget(page, 20);
    assert(state.journey.presentation.phase === "claiming", "Episode acknowledgement did not begin its completion motion");
    assert(state.journey.progress.seenEpisodeUnlockLevels.includes(21), "Lv21 episode was not acknowledged in memory");
    const committed = await readStoredSave(page);
    assert(committed.journeyProgress.seenEpisodeUnlockLevels.includes(21), "Lv21 episode acknowledgement was not persisted");
    state = await waitJourneyPresentationFinished(page);
    assert(!state.journey.pendingEvent, "acknowledged Lv21 episode remained pending");

    await page.reload({ waitUntil: "networkidle" });
    await page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().art.ready);
    state = await debug(page);
    assert(state.journey.progress.seenEpisodeUnlockLevels.includes(21), "Lv21 acknowledgement did not survive reload");
    assert(!state.journey.pendingEvent, "Lv21 episode returned after reload");
    report.journeyEpisodeUnlock = {
      sequence: ["progress", "overlay", "claiming", "complete"],
      event: "episode_unlock",
      level: 21,
      overlayAction: "Tap to Continue",
      closeTargetPresent: true,
      releaseActivation: true,
      persistedAfterReload: true,
    };
    await context.close();
  }

  // The right-hand reward card is independent of the left-hand level card.
  // Inspecting it is non-destructive, closing keeps it pending, and only a real
  // Pointer release on Tap to Claim may persist the one-hour Lv25 reward.
  {
    const rewardSave = makeSave({
      currentLevel: 26,
      highestLevel: 26,
      coins: 1500,
      boosters: { time: 2, rocket: 4, pulse: 1 },
      lifeState: { lives: 2, nextLifeAtMs: Date.now() + 30 * 60 * 1000, unlimitedLivesUntilMs: 0 },
      rewardedLevels: Array.from({ length: 25 }, (_, index) => index + 1),
      journeyProgress: {
        claimedMilestoneLevels: [10, 15],
        seenEpisodeUnlockLevels: [11, 21],
      },
      metaDiscovery: { collectionViewedThroughLevel: 25, dailyUnlockSeen: true },
    });
    const { context, page } = await createSeededPage(browser, "journey-lv25-reward", rewardSave);
    let state = await enterJourney(page);
    assert(state.journey.pendingEvent?.type === "milestone_reward" && state.journey.pendingEvent.level === 25,
      "seeded Lv25 reward was not pending on Journey entry");
    assert(state.journey.visibleRewards.some((reward) => reward.level === 25
      && reward.unlocked && !reward.claimed && reward.targetKey === "journeyReward.25"),
    "Lv25 right reward card was not exposed as an unclaimed target");

    const beforeDragStored = await readStoredSave(page);
    const draggedReward = await swipeJourney(page, "up", 0.10, "journeyReward.25");
    state = draggedReward.after;
    assert(!state.journey.presentation, "dragging from the Lv25 reward card opened its overlay");
    assert(state.journey.pendingEvent?.level === 25, "dragging from the Lv25 reward card consumed the reward");
    assert(JSON.stringify(await readStoredSave(page)) === JSON.stringify(beforeDragStored),
      "dragging from the Lv25 reward card mutated durable state");
    report.journeyRewardDrag = {
      level: 25,
      startsOnRightRewardCard: true,
      pointerOwnershipTransferredToScroll: true,
      overlayOpened: false,
      durableStateChanged: false,
    };
    screenshots.push("07-journey-lv25-unclaimed-map-720x1584.png");
    await page.screenshot({ path: resolve(output, screenshots.at(-1)) });

    ({ state } = await pressTarget(page, "journeyReward.25"));
    assert(!state.journey.presentation, "Lv25 reward inspection opened before pointer release");
    state = await releasePressedTarget(page, 40);
    assert(state.screen === "levels" && state.journey.presentation?.phase === "overlay",
      "Lv25 reward card did not open its Journey-backed overlay on release");
    assert(state.journey.presentation.intent === "reward_inspection"
      && state.journey.presentation.event.type === "milestone_reward"
      && state.journey.presentation.event.level === 25,
    "Lv25 reward inspection opened the wrong event");
    assert(state.journey.presentation.primaryAction === "claim" && !state.journey.presentation.claimed,
      "unclaimed Lv25 inspection did not expose its claim action");
    assert(state.journey.presentation.event.reward.kind === "unlimited_lives", "Lv25 reward kind must be unlimited_lives");
    assert(state.journey.presentation.event.reward.amount === 3600, "Lv25 reward must last exactly 3600 seconds");
    screenshots.push("08-journey-lv25-reward-overlay-720x1584.png");
    await page.screenshot({ path: resolve(output, screenshots.at(-1)) });

    const beforeStored = await readStoredSave(page);
    const claimPoint = await targetPoint(page, "journeyPresentation");
    journeyClaimButtonPoint = claimPoint;
    ({ state } = await pressTarget(page, "journeyPresentationClose"));
    assert(state.journey.presentation?.phase === "overlay", "Lv25 close dismissed before pointer release");
    assert(JSON.stringify(await readStoredSave(page)) === JSON.stringify(beforeStored),
      "Lv25 close mutated durable state on pointer down");
    state = await releasePressedTarget(page, 40);
    assert(state.screen === "levels" && !state.journey.presentation,
      "closing Lv25 inspection did not return to Journey");
    assert(state.journey.pendingEvent?.level === 25
      && !state.journey.progress.claimedMilestoneLevels.includes(25),
    "closing Lv25 inspection consumed the reward");
    assert(JSON.stringify(await readStoredSave(page)) === JSON.stringify(beforeStored),
      "closing Lv25 inspection mutated durable state");

    state = await clickTarget(page, "journeyReward.25", 40);
    assert(state.screen === "levels" && state.journey.presentation?.intent === "reward_inspection"
      && state.journey.presentation.event.level === 25,
    "Lv25 reward card did not reopen after a non-destructive close");
    ({ state } = await pressTarget(page, "journeyPresentation"));
    assert(state.lives.unlimitedRemainingMs === 0, "Lv25 unlimited lives began before release");
    assert((await readStoredSave(page)).lifeState.unlimitedLivesUntilMs === beforeStored.lifeState.unlimitedLivesUntilMs, "Lv25 expiry persisted on pointer down");
    const releasedAtMs = Date.now();
    state = await releasePressedTarget(page, 20);
    assert(state.journey.presentation.phase === "claiming", "Lv25 reward did not enter claim flight");
    assert(state.lives.unlimitedRemainingMs > 3_590_000 && state.lives.unlimitedRemainingMs <= 3_600_000, "Lv25 did not grant a fresh one-hour unlimited-lives window");
    assert(state.lives.unlimitedLivesUntilMs >= releasedAtMs + 3_599_000, "Lv25 expiry was shorter than 3600 seconds");
    assert(state.journey.progress.claimedMilestoneLevels.includes(25), "Lv25 claim was not recorded in memory");
    screenshots.push("09-journey-lv25-reward-flight-720x1584.png");
    await page.screenshot({ path: resolve(output, screenshots.at(-1)) });
    const committed = await readStoredSave(page);
    assert(committed.lifeState.unlimitedLivesUntilMs === state.lives.unlimitedLivesUntilMs, "Lv25 unlimited-lives expiry was not written exactly once");
    assert(committed.journeyProgress.claimedMilestoneLevels.filter((level) => level === 25).length === 1,
      "Lv25 claim ledger was not written exactly once");
    state = await waitJourneyPresentationFinished(page);
    assert(state.screen === "levels", "manual Lv25 claim did not remain on Journey");

    await page.reload({ waitUntil: "networkidle" });
    await page.waitForFunction(() => {
      const current = window.__COLOR_ESCAPE__?.getDebugState();
      return current?.art.ready && current?.storage.status === "ready" && current?.screen === "home";
    });
    state = await debug(page);
    assert(state.lives.unlimitedRemainingMs > 3_580_000, "Lv25 unlimited lives did not survive reload");
    assert(state.lives.unlimitedLivesUntilMs === committed.lifeState.unlimitedLivesUntilMs, "Lv25 expiry changed across reload");
    assert(state.journey.progress.claimedMilestoneLevels.filter((level) => level === 25).length === 1,
      "Lv25 claim ledger did not survive reload exactly once");
    assert(!state.journey.pendingEvent, "claimed Lv25 reward returned after reload");

    state = await enterJourney(page);
    state = await clickTarget(page, "journeyReward.25", 40);
    assert(state.screen === "levels" && state.journey.presentation?.intent === "reward_inspection"
      && state.journey.presentation.event.level === 25,
    "claimed Lv25 reward card did not reopen the same inspection overlay");
    assert(state.journey.presentation.claimed === true
      && state.journey.presentation.locked === false
      && state.journey.presentation.primaryAction === null,
    "claimed Lv25 overlay was not read-only");
    assert(!state.interactionTargets.targets.journeyPresentation,
      "claimed Lv25 overlay retained a primary button hit target");
    assert(state.interactionTargets.targets.journeyPresentationClose,
      "claimed Lv25 overlay lost its close hit target");
    screenshots.push("09b-journey-lv25-claimed-overlay-720x1584.png");
    await page.screenshot({ path: resolve(output, screenshots.at(-1)) });

    const beforeInertClick = await readStoredSave(page);
    state = await rawPointerClick(page, claimPoint, 80);
    const afterInertClick = await readStoredSave(page);
    assert(state.journey.presentation?.claimed === true && state.journey.presentation.primaryAction === null,
      "old Lv25 claim-button coordinate changed the claimed inspection overlay");
    assert(state.lives.unlimitedLivesUntilMs === committed.lifeState.unlimitedLivesUntilMs,
      "old Lv25 claim-button coordinate extended the live expiry");
    assert(afterInertClick.lifeState.unlimitedLivesUntilMs === beforeInertClick.lifeState.unlimitedLivesUntilMs,
      "old Lv25 claim-button coordinate extended the durable expiry");
    assert(afterInertClick.journeyProgress.claimedMilestoneLevels.filter((level) => level === 25).length === 1,
      "old Lv25 claim-button coordinate duplicated the durable claim");
    report.journeyLv25Reward = {
      level: 25,
      reward: { kind: "unlimited_lives", amount: 3600 },
      unlimitedRemainingBeforeMs: 0,
      unlimitedRemainingAfterReleaseMs: state.lives.unlimitedRemainingMs,
      persistedExpiryMs: committed.lifeState.unlimitedLivesUntilMs,
      openedFromRightRewardCard: true,
      closeWithoutClaim: true,
      reopenedAfterClose: true,
      releaseActivation: true,
      claimedLedgerPersisted: true,
      expiryPersistedAfterReload: true,
      claimedOverlayReadOnly: true,
      stalePrimaryCoordinateInert: true,
    };
    await context.close();
  }

  // Locked rewards remain inspectable: the same popup explains the exact
  // unlock level, but it has no primary action and its former button area is
  // inert. Closing the read-only view returns to Journey without a grant.
  {
    const lockedSave = makeSave({
      currentLevel: 90,
      highestLevel: 90,
      rewardedLevels: Array.from({ length: 89 }, (_, index) => index + 1),
      journeyProgress: handledJourneyProgress(89),
      metaDiscovery: { collectionViewedThroughLevel: 89, dailyUnlockSeen: true },
    });
    const { context, page } = await createSeededPage(browser, "journey-locked-reward", lockedSave);
    await page.evaluate(() => {
      const originalFillText = CanvasRenderingContext2D.prototype.fillText;
      globalThis.__journeyCanvasText = [];
      CanvasRenderingContext2D.prototype.fillText = function fillText(text, ...args) {
        globalThis.__journeyCanvasText.push(String(text));
        if (globalThis.__journeyCanvasText.length > 2_000) globalThis.__journeyCanvasText.shift();
        return originalFillText.call(this, text, ...args);
      };
    });
    let state = await enterJourney(page);
    const lockedReward = state.journey.visibleRewards.find((reward) => reward.level === 90);
    assert(lockedReward && !lockedReward.unlocked && !lockedReward.claimed
      && lockedReward.targetKey === "journeyReward.90",
    "locked Lv90 right reward card was not exposed for inspection");
    const beforeStored = await readStoredSave(page);

    ({ state } = await pressTarget(page, "journeyReward.90"));
    assert(!state.journey.presentation, "locked Lv90 inspection opened before pointer release");
    state = await releasePressedTarget(page, 60);
    assert(state.screen === "levels" && state.journey.presentation?.phase === "overlay"
      && state.journey.presentation.intent === "reward_inspection",
    "locked Lv90 reward did not open a Journey-backed inspection overlay");
    assert(state.journey.presentation.event.type === "milestone_reward"
      && state.journey.presentation.event.level === 90,
    "locked reward inspection opened the wrong event");
    assert(state.journey.presentation.locked === true
      && state.journey.presentation.claimed === false
      && state.journey.presentation.primaryAction === null,
    "locked Lv90 overlay was not read-only");
    assert(!state.interactionTargets.targets.journeyPresentation,
      "locked Lv90 overlay retained a primary action hit target");
    assert(state.interactionTargets.targets.journeyPresentationClose,
      "locked Lv90 overlay lost its close hit target");
    await page.waitForFunction(() => globalThis.__journeyCanvasText?.includes("Claim after completing Level 90"));
    const renderedText = await page.evaluate(() => [...globalThis.__journeyCanvasText]);
    assert(renderedText.includes("Claim after completing Level 90"),
      "locked Lv90 overlay did not draw its exact dynamic unlock text");
    screenshots.push("09c-journey-lv90-locked-overlay-720x1584.png");
    await page.screenshot({ path: resolve(output, screenshots.at(-1)) });

    assert(journeyClaimButtonPoint, "canonical Journey claim-button coordinate was not captured");
    state = await rawPointerClick(page, journeyClaimButtonPoint, 80);
    const afterInertClick = await readStoredSave(page);
    assert(state.journey.presentation?.locked === true && state.journey.presentation.primaryAction === null,
      "old claim-button coordinate changed the locked Lv90 overlay");
    assert(!state.journey.progress.claimedMilestoneLevels.includes(90),
      "old claim-button coordinate granted the locked Lv90 reward in memory");
    assert(!afterInertClick.journeyProgress.claimedMilestoneLevels.includes(90)
      && JSON.stringify(afterInertClick) === JSON.stringify(beforeStored),
    "old claim-button coordinate mutated durable state for locked Lv90");

    ({ state } = await pressTarget(page, "journeyPresentationClose"));
    assert(state.journey.presentation?.locked === true, "locked Lv90 close fired before pointer release");
    state = await releasePressedTarget(page, 60);
    assert(state.screen === "levels" && !state.journey.presentation,
      "locked Lv90 close did not return to Journey");
    assert(!state.journey.progress.claimedMilestoneLevels.includes(90)
      && JSON.stringify(await readStoredSave(page)) === JSON.stringify(beforeStored),
    "closing locked Lv90 inspection granted or persisted a reward");
    report.lockedJourneyReward = {
      level: 90,
      openedFromRightRewardCard: true,
      text: "Claim after completing Level 90",
      primaryTargetPresent: false,
      stalePrimaryCoordinateInert: true,
      closeReturnsToJourney: true,
      durableStateChanged: false,
    };
    await context.close();
  }

  // A definite rejected write keeps the immutable baseline live and durable.
  // The same full-screen action can be released again after storage recovers.
  {
    const faultSave = makeSave({
      currentLevel: 26,
      highestLevel: 26,
      coins: 1500,
      boosters: { time: 2, rocket: 4, pulse: 1 },
      lifeState: { lives: 2, nextLifeAtMs: Date.now() + 30 * 60 * 1000, unlimitedLivesUntilMs: 0 },
      rewardedLevels: Array.from({ length: 25 }, (_, index) => index + 1),
      journeyProgress: {
        claimedMilestoneLevels: [10, 15],
        seenEpisodeUnlockLevels: [11, 21],
      },
      metaDiscovery: { collectionViewedThroughLevel: 25, dailyUnlockSeen: true },
    });
    const { context, page } = await createSeededPage(browser, "journey-storage-recovery", faultSave);
    let state = await enterJourney(page);
    state = await clickTarget(page, "journeyReward.25", 40);
    assert(state.journey.presentation?.intent === "reward_inspection"
      && state.journey.presentation.event.level === 25,
    "storage-recovery fixture did not open Lv25 from its reward card");
    screenshots.push("10-journey-retry-progress-720x1584.png");
    await page.screenshot({ path: resolve(output, screenshots.at(-1)) });
    await installRejectedWriteOnce(page);
    state = await clickTarget(page, "journeyPresentation", 80);
    assert(state.journey.presentation.phase === "overlay", "failed claim left the retryable overlay");
    assert(state.journey.presentation.error === "Claim failed. Please retry.", "failed claim did not explain retry");
    assert(state.lives.unlimitedRemainingMs === 0, "failed claim incorrectly started unlimited lives");
    assert(!state.journey.progress.claimedMilestoneLevels.includes(25), "failed claim incorrectly changed the live ledger");
    const rejectedStored = await readStoredSave(page);
    assert(rejectedStored.lifeState.unlimitedLivesUntilMs === 0, "failed claim incorrectly changed the durable expiry");
    assert(!rejectedStored.journeyProgress.claimedMilestoneLevels.includes(25), "failed claim incorrectly changed the durable ledger");
    assert(rejectedStored.coins === 1500 && rejectedStored.boosters.rocket === 4 && rejectedStored.boosters.pulse === 1, "failed claim modified an unrelated reward balance");
    screenshots.push("11-journey-reward-save-error-720x1584.png");
    await page.screenshot({ path: resolve(output, screenshots.at(-1)) });
    const fault = await storageFaultProbe(page);
    assert(fault.blockedWritesRemaining === 0 && fault.writes.length === 1, "storage fault did not reject exactly one candidate write");

    state = await clickTarget(page, "journeyPresentation", 20);
    assert(state.journey.presentation.phase === "claiming", "retry did not resume the reward flight");
    assert(state.lives.unlimitedRemainingMs > 3_590_000 && state.lives.unlimitedRemainingMs <= 3_600_000, "retry did not grant unlimited lives exactly once");
    assert(state.journey.progress.claimedMilestoneLevels.filter((level) => level === 25).length === 1, "retry did not record exactly one Lv25 claim");
    await waitJourneyPresentationFinished(page);
    const recoveredStored = await readStoredSave(page);
    assert(recoveredStored.lifeState.unlimitedLivesUntilMs > Date.now() + 3_580_000, "retried unlimited-lives expiry was not persisted");
    assert(recoveredStored.journeyProgress.claimedMilestoneLevels.filter((level) => level === 25).length === 1, "retried ledger did not persist exactly once");

    await page.reload({ waitUntil: "networkidle" });
    await page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().art.ready);
    state = await debug(page);
    assert(state.lives.unlimitedLivesUntilMs === recoveredStored.lifeState.unlimitedLivesUntilMs, "recovered expiry changed across reload");
    assert(state.lives.unlimitedRemainingMs > 3_570_000, "recovered unlimited lives did not survive reload");
    assert(!state.journey.pendingEvent, "recovered reward returned after reload");
    report.persistenceRecovery = {
      rejectedWrites: 1,
      falseRewardOnFailure: false,
      retryAvailable: true,
      unlimitedRemainingAfterFailureMs: 0,
      persistedExpiryAfterRetryMs: recoveredStored.lifeState.unlimitedLivesUntilMs,
      exactlyOnceClaim: true,
      persistedAfterReload: true,
    };
    await context.close();
  }

  // If a bridge writes the reward and then loses both its acknowledgement and
  // immediate read-back, the live state remains unchanged until confirmation.
  // Confirmation must replay the exact immutable candidate, including the
  // original unlimited-lives deadline, rather than issue a second grant.
  {
    const faultSave = makeSave({
      currentLevel: 26,
      highestLevel: 26,
      coins: 1500,
      boosters: { time: 2, rocket: 4, pulse: 1 },
      lifeState: { lives: 2, nextLifeAtMs: Date.now() + 30 * 60 * 1000, unlimitedLivesUntilMs: 0 },
      rewardedLevels: Array.from({ length: 25 }, (_, index) => index + 1),
      journeyProgress: {
        claimedMilestoneLevels: [10, 15],
        seenEpisodeUnlockLevels: [11, 21],
      },
      metaDiscovery: { collectionViewedThroughLevel: 25, dailyUnlockSeen: true },
    });
    const { context, page } = await createSeededPage(browser, "journey-ambiguous-storage", faultSave);
    let state = await enterJourney(page);
    state = await clickTarget(page, "journeyReward.25", 40);
    assert(state.journey.presentation?.intent === "reward_inspection"
      && state.journey.presentation.event.level === 25,
    "ambiguous-storage fixture did not open Lv25 from its reward card");
    screenshots.push("10b-journey-ambiguous-progress-720x1584.png");
    await page.screenshot({ path: resolve(output, screenshots.at(-1)) });
    await installAmbiguousWriteOnce(page);
    state = await clickTarget(page, "journeyPresentation", 80);
    assert(state.journey.presentation.phase === "overlay", "ambiguous claim left the confirmation overlay");
    assert(state.journey.presentation.persistencePending === true, "ambiguous claim did not retain its immutable candidate");
    assert(state.journey.presentation.error === "Save status unknown. Retry claiming.", "ambiguous claim did not request explicit confirmation");
    assert(state.lives.unlimitedRemainingMs === 0, "ambiguous claim changed live assets before confirmation");
    assert(!state.journey.progress.claimedMilestoneLevels.includes(25), "ambiguous claim changed the live ledger before confirmation");

    ({ state } = await pressTarget(page, "journeyPresentationClose"));
    assert(state.journey.presentation.persistencePending === true,
      "ambiguous claim close discarded its pending transaction on pointer down");
    state = await releasePressedTarget(page, 60);
    assert(state.journey.presentation?.phase === "overlay"
      && state.journey.presentation.persistencePending === true
      && state.journey.presentation.error === "Save status unknown. Retry claiming.",
    "ambiguous claim was dismissible while its durable outcome was unknown");

    await restoreAmbiguousStorage(page);
    const firstCandidate = await readStoredSave(page);
    assert(firstCandidate.journeyProgress.claimedMilestoneLevels.filter((level) => level === 25).length === 1,
      "ambiguity fixture did not durably write exactly one Lv25 claim");
    assert(firstCandidate.lifeState.unlimitedLivesUntilMs > Date.now() + 3_590_000,
      "ambiguity fixture did not durably write the first unlimited-lives deadline");
    await page.waitForTimeout(1_100);
    state = await clickTarget(page, "journeyPresentation", 20);
    assert(state.journey.presentation.phase === "claiming", "ambiguous claim did not recover after confirmation");
    assert(state.journey.presentation.persistencePending === false, "confirmed claim retained obsolete pending state");
    assert(state.lives.unlimitedLivesUntilMs === firstCandidate.lifeState.unlimitedLivesUntilMs,
      "confirmation recalculated or extended the unlimited-lives deadline");
    assert(state.journey.progress.claimedMilestoneLevels.filter((level) => level === 25).length === 1,
      "confirmation recorded the Lv25 claim more than once");
    await waitJourneyPresentationFinished(page);
    const confirmed = await readStoredSave(page);
    assert(confirmed.lifeState.unlimitedLivesUntilMs === firstCandidate.lifeState.unlimitedLivesUntilMs,
      "confirmed durable deadline diverged from the first candidate");
    assert(confirmed.journeyProgress.claimedMilestoneLevels.filter((level) => level === 25).length === 1,
      "confirmed durable ledger contains a duplicate claim");
    report.ambiguousPersistenceRecovery = {
      writeReachedStorageBeforeError: true,
      readBackUnavailable: true,
      runtimeGrantBeforeConfirmation: false,
      closeBlockedWhileUnknown: true,
      exactCandidateReplayed: true,
      deadlineExtendedOnRetry: false,
      exactlyOnceClaim: true,
    };
    await context.close();
  }

  // A capped Pulse reward stays unclaimed and therefore remains recoverable.
  // The first release explains the block; the second release only dismisses the
  // explanation and must not consume the milestone ledger entry.
  {
    const fullStockSave = makeSave({
      currentLevel: 31,
      highestLevel: 31,
      reducedMotion: false,
      boosters: { time: 2, rocket: 4, pulse: 9 },
      rewardedLevels: Array.from({ length: 30 }, (_, index) => index + 1),
      journeyProgress: {
        claimedMilestoneLevels: [10, 15, 25],
        seenEpisodeUnlockLevels: [11, 21, 31],
      },
      metaDiscovery: { collectionViewedThroughLevel: 30, dailyUnlockSeen: true },
    });
    const { context, page } = await createSeededPage(browser, "journey-full-stock", fullStockSave);
    let state = await enterJourney(page);
    state = await clickTarget(page, "journeyReward.30", 40);
    assert(state.journey.presentation?.intent === "reward_inspection"
      && state.journey.presentation.event.level === 30,
    "full-stock fixture did not open Lv30 from its reward card");
    screenshots.push("12-journey-lv30-full-stock-progress-720x1584.png");
    await page.screenshot({ path: resolve(output, screenshots.at(-1)) });
    assert(state.journey.presentation.event.reward.kind === "pulse", "Lv30 must exercise the capped Pulse reward");
    assert(state.journey.presentation.event.reward.amount === 1, "Lv30 Pulse reward amount drifted");
    const beforeStored = await readStoredSave(page);

    ({ state } = await pressTarget(page, "journeyPresentation"));
    assert(!state.journey.presentation.blockedGrant, "full-stock reward reacted before pointer release");
    state = await releasePressedTarget(page, 60);
    assert(state.journey.presentation.phase === "overlay", "full-stock reward left its explanatory overlay");
    assert(state.journey.presentation.blockedGrant === true, "full-stock reward was not marked as deferred");
    assert(state.journey.presentation.error?.includes("stock is full"), "full-stock reward did not explain why it was deferred");
    assert(state.economy.boosters.pulse === 9, "full-stock reward exceeded the inventory cap");
    assert(!state.journey.progress.claimedMilestoneLevels.includes(30), "full-stock reward was swallowed by the live claim ledger");
    let stored = await readStoredSave(page);
    assert(stored.boosters.pulse === beforeStored.boosters.pulse, "full-stock reward changed durable inventory");
    assert(!stored.journeyProgress.claimedMilestoneLevels.includes(30), "full-stock reward was swallowed by the durable claim ledger");
    screenshots.push("13-journey-lv30-full-stock-deferred-720x1584.png");
    await page.screenshot({ path: resolve(output, screenshots.at(-1)) });

    ({ state } = await pressTarget(page, "journeyPresentation"));
    assert(state.journey.presentation.blockedGrant === true, "deferred reward dismissed before release");
    state = await releasePressedTarget(page, 80);
    assert(!state.journey.presentation, "deferred reward explanation did not dismiss on release");
    assert(state.journey.pendingEvent?.level === 30, "dismissed full-stock reward no longer remained pending");
    stored = await readStoredSave(page);
    assert(!stored.journeyProgress.claimedMilestoneLevels.includes(30), "dismissal consumed the full-stock reward");

    await page.reload({ waitUntil: "networkidle" });
    await page.waitForFunction(() => {
      const current = window.__COLOR_ESCAPE__?.getDebugState();
      return current?.art.ready && current?.storage.status === "ready";
    });
    state = await debug(page);
    assert(state.journey.pendingEvent?.level === 30, "full-stock reward did not survive reload as pending");
    state = await enterJourney(page);
    state = await clickTarget(page, "journeyReward.30", 40);
    assert(state.journey.presentation?.intent === "reward_inspection"
      && state.journey.presentation.event.level === 30,
    "full-stock reward card was not reopenable after reload");
    screenshots.push("14-journey-lv30-full-stock-reopened-720x1584.png");
    await page.screenshot({ path: resolve(output, screenshots.at(-1)) });
    assert(state.journey.presentation.event.reward.kind === "pulse", "reopened full-stock reward changed identity");
    report.fullInventoryReward = {
      level: 30,
      kind: "pulse",
      stockAtCap: 9,
      claimLedgerChanged: false,
      releaseActivatedExplanation: true,
      pendingAfterDismiss: true,
      pendingAfterReload: true,
      reopenable: true,
    };
    await context.close();
  }

  // Fail one decoded Journey bitmap, then prove the retry button itself is
  // release-activated and reconstructs the complete lazy asset group.
  {
    const resourceSave = makeSave({
      journeyProgress: handledJourneyProgress(58),
      reducedMotion: true,
    });
    const { context, page } = await createSeededPage(browser, "journey-resource-retry", resourceSave);
    let trackRequests = 0;
    await page.route("**/assets/art/ui/formal-pages/journey/track.png", async (route) => {
      trackRequests += 1;
      if (trackRequests === 1) {
        await route.fulfill({ status: 200, contentType: "image/png", body: "invalid-image-payload" });
      } else {
        await route.continue();
      }
    });
    await clickTarget(page, "navigation.3", 20);
    await page.waitForFunction(() => {
      const current = window.__COLOR_ESCAPE__?.getDebugState();
      return current?.screen === "levels" && Boolean(current.art.formalPage.error);
    }, undefined, { timeout: 15_000 });
    let state = await debug(page);
    const firstError = state.art.formalPage.error;
    assert(trackRequests === 1, "Journey track failure was not injected exactly once");
    assert(Object.keys(state.interactionTargets.targets).includes("formalPageRetry"), "failed Journey art did not expose a retry target");
    ({ state } = await pressTarget(page, "formalPageRetry"));
    assert(trackRequests === 1, "Journey resources retried before pointer release");
    assert(state.art.formalPage.error === firstError, "Journey resource error cleared before pointer release");
    await releasePressedTarget(page, 20);
    state = await waitFormalPageReady(page, "levels");
    assert(trackRequests === 2, "Journey track was not requested exactly once on retry");
    assert(!state.art.formalPage.error, "Journey resource error remained after a successful retry");
    assert(state.art.formalPage.loadedImages > 0, "Journey retry did not reconstruct its image group");
    screenshots.push("15-journey-resource-retry-recovered-720x1584.png");
    await page.screenshot({ path: resolve(output, screenshots.at(-1)) });
    report.formalPageResourceRecovery = {
      failedAsset: "assets/art/ui/formal-pages/journey/track.png",
      injectedFailures: 1,
      totalTrackRequests: trackRequests,
      releaseActivation: true,
      recovered: true,
      loadedImagesAfterRetry: state.art.formalPage.loadedImages,
    };
    await page.unroute("**/assets/art/ui/formal-pages/journey/track.png");
    await context.close();
  }

  // A permanently failing Journey group must never trap the player in the
  // progress presentation. "Later" exits safely without claiming the event;
  // after resources recover, the same milestone remains reopenable.
  {
    const pendingSave = makeSave({
      currentLevel: 31,
      highestLevel: 31,
      reducedMotion: true,
      rewardedLevels: Array.from({ length: 30 }, (_, index) => index + 1),
      journeyProgress: {
        claimedMilestoneLevels: [10, 15, 25],
        seenEpisodeUnlockLevels: [11, 21, 31],
      },
    });
    const { context, page } = await createSeededPage(browser, "journey-resource-defer", pendingSave);
    const failedTrack = "**/assets/art/ui/formal-pages/journey/track.png";
    await page.route(failedTrack, (route) => route.fulfill({
      status: 200,
      contentType: "image/png",
      body: "permanently-invalid-image-payload",
    }));
    await triggerPostWinJourneyEvent(page);
    await page.waitForFunction(() => {
      const current = window.__COLOR_ESCAPE__?.getDebugState();
      return current?.screen === "levels"
        && current.journey.presentation?.phase === "progress"
        && current.journey.presentation?.event?.level === 30
        && Boolean(current.art.formalPage.error);
    }, undefined, { timeout: 15_000 });
    let state = await debug(page);
    assert(Object.keys(state.interactionTargets.targets).includes("journeyPresentationLater"),
      "permanent Journey failure did not expose a safe Later action");
    ({ state } = await pressTarget(page, "journeyPresentationLater"));
    assert(state.screen === "levels" && state.journey.presentation?.event?.level === 30,
      "Journey Later action fired before release");
    state = await releasePressedTarget(page, 80);
    assert(state.screen === "home" && !state.journey.presentation,
      "Journey Later action did not return safely to Home");
    assert(state.journey.pendingEvent?.level === 30,
      "Journey Later action consumed the pending milestone");
    const stored = await readStoredSave(page);
    assert(!stored.journeyProgress.claimedMilestoneLevels.includes(30),
      "Journey Later action wrote a false durable claim");

    await page.unroute(failedTrack);
    await triggerPostWinJourneyEvent(page);
    await waitJourneyEvent(page, "progress", "milestone_reward", 30);
    state = await waitFormalPageReady(page, "levels");
    assert(state.art.formalPage.loaded === "levels" && !state.art.formalPage.error,
      "deferred Journey event did not recover after resources returned");
    report.formalPagePermanentFailureEscape = {
      eventLevel: 30,
      releaseActivated: true,
      returnedHome: true,
      durableClaimChanged: false,
      reopenableAfterRecovery: true,
    };
    await context.close();
  }

  // A missing browser/WeChat image callback is distinct from an explicit
  // decode error. It must time out into the same Retry/Later UI so Journey
  // progress can never become a permanent input lock.
  {
    const pendingSave = makeSave({
      currentLevel: 31,
      highestLevel: 31,
      reducedMotion: true,
      rewardedLevels: Array.from({ length: 30 }, (_, index) => index + 1),
      journeyProgress: {
        claimedMilestoneLevels: [10, 15, 25],
        seenEpisodeUnlockLevels: [11, 21, 31],
      },
    });
    const { context, page } = await createSeededPage(
      browser,
      "journey-resource-callback-timeout",
      pendingSave,
      "formal-pages/journey/track.png",
    );
    await triggerPostWinJourneyEvent(page);
    await page.waitForFunction(() => {
      const current = window.__COLOR_ESCAPE__?.getDebugState();
      return current?.screen === "levels"
        && current.journey.presentation?.phase === "progress"
        && current.art.formalPage.errorScreen === "levels"
        && String(current.art.formalPage.error).includes("Timed out loading image after 5000ms");
    }, undefined, { timeout: 7_000 });
    let state = await debug(page);
    assert(Object.keys(state.interactionTargets.targets).includes("formalPageRetry"),
      "hung Journey callback did not expose Retry after timeout");
    assert(Object.keys(state.interactionTargets.targets).includes("journeyPresentationLater"),
      "hung Journey callback did not expose Later after timeout");
    ({ state } = await pressTarget(page, "journeyPresentationLater"));
    assert(state.screen === "levels", "hung Journey Later action fired before release");
    state = await releasePressedTarget(page, 80);
    assert(state.screen === "home" && !state.journey.presentation,
      "hung Journey Later action did not release the progress lock");
    assert(state.journey.pendingEvent?.level === 30,
      "hung Journey Later action consumed the pending event");
    await page.evaluate(() => globalThis.__releaseStalledJourneyImage());
    await triggerPostWinJourneyEvent(page);
    await waitJourneyEvent(page, "progress", "milestone_reward", 30);
    state = await waitFormalPageReady(page, "levels");
    assert(state.art.formalPage.loaded === "levels" && !state.art.formalPage.error,
      "hung Journey resources did not recover after callbacks returned");
    report.formalPageCallbackTimeoutRecovery = {
      timeoutMs: 5_000,
      retryTargetPresent: true,
      laterTargetPresent: true,
      releaseActivatedEscape: true,
      durableClaimChanged: false,
      recoveredWithoutRestart: true,
    };
    await context.close();
  }

  // One post-win Journey hook can drain consecutive earned events. Lv21's
  // unseen episode is followed automatically by the reached Lv25 milestone;
  // no ordinary Journey navigation is involved.
  {
    const consecutiveSave = makeSave({
      currentLevel: 26,
      highestLevel: 26,
      reducedMotion: false,
      rewardedLevels: Array.from({ length: 25 }, (_, index) => index + 1),
      journeyProgress: {
        claimedMilestoneLevels: [10, 15],
        seenEpisodeUnlockLevels: [11],
      },
      lifeState: { lives: 2, nextLifeAtMs: Date.now() + 30 * 60 * 1000, unlimitedLivesUntilMs: 0 },
      metaDiscovery: { collectionViewedThroughLevel: 25, dailyUnlockSeen: true },
    });
    const { context, page } = await createSeededPage(browser, "journey-consecutive-events", consecutiveSave);
    let state = await beginPostWinJourneyEvent(page, "episode_unlock", 21, "16-journey-consecutive-episode-progress-720x1584.png");
    screenshots.push("16-journey-consecutive-episode-progress-720x1584.png");
    state = await clickTarget(page, "journeyPresentation", 20);
    assert(state.journey.presentation.phase === "claiming", "first consecutive event did not begin completion");
    state = await waitJourneyEvent(page, "progress", "milestone_reward", 25);
    assert(state.screen === "levels", "second consecutive event did not return to Journey progress");
    screenshots.push("17-journey-consecutive-reward-progress-720x1584.png");
    await page.screenshot({ path: resolve(output, screenshots.at(-1)) });
    state = await waitJourneyEvent(page, "overlay", "milestone_reward", 25);
    assert(state.screen === "home", "second consecutive event did not reach its reward overlay");
    state = await clickTarget(page, "journeyPresentation", 20);
    assert(state.journey.presentation.phase === "claiming", "second consecutive event did not claim on release");
    state = await waitJourneyPresentationFinished(page);
    assert(!state.journey.pendingEvent, "consecutive Journey queue did not drain");
    assert(state.journey.progress.seenEpisodeUnlockLevels.includes(21), "consecutive episode acknowledgement was lost");
    assert(state.journey.progress.claimedMilestoneLevels.includes(25), "consecutive milestone claim was lost");
    const stored = await readStoredSave(page);
    assert(stored.journeyProgress.seenEpisodeUnlockLevels.includes(21), "consecutive episode was not persisted");
    assert(stored.journeyProgress.claimedMilestoneLevels.includes(25), "consecutive milestone was not persisted");
    report.consecutiveJourneyEvents = {
      postWinHooks: 1,
      navigationTaps: 0,
      order: ["episode_unlock:21", "milestone_reward:25"],
      intermediateProgressPhase: true,
      queueDrained: true,
      persisted: true,
    };
    await context.close();
  }

  // Journey has no left/right paging. One continuous Pointer gesture can begin
  // on a level/reward row, cancel its tap, and vertically reveal the full route.
  {
    const scrollSave = makeSave({
      currentLevel: 58,
      highestLevel: 100,
      reducedMotion: true,
      rewardedLevels: Array.from({ length: 100 }, (_, index) => index + 1),
      journeyProgress: handledJourneyProgress(100),
      metaDiscovery: { collectionViewedThroughLevel: 100, dailyUnlockSeen: true },
    });
    const { context, page } = await createSeededPage(browser, "journey-vertical-scroll", scrollSave);
    await clickTarget(page, "navigation.3", 20);
    let state = await waitFormalPageReady(page, "levels");
    assert(state.journey.visibleLevels.includes(100)
      && JSON.stringify(state.journey.displayedLevels) === JSON.stringify([95, 90])
      && JSON.stringify(state.journey.visibleEpisodes) === JSON.stringify([10]),
    `Journey upper route composition drifted (${JSON.stringify({
      visibleLevels: state.journey.visibleLevels,
      displayedLevels: state.journey.displayedLevels,
      visibleEpisodes: state.journey.visibleEpisodes,
      scrollOffset: state.journey.scrollOffset,
      minScrollOffset: state.journey.minScrollOffset,
    })})`);
    assert(!state.interactionTargets.targets.journeyPrev && !state.interactionTargets.targets.journeyNext,
      "Journey still exposes left/right arrow interaction targets");
    assert(Math.abs(state.journey.scrollOffset - state.journey.minScrollOffset) < 1
      && !state.journey.canScrollDown && state.journey.canScrollUp,
    "Journey upper scroll boundary is invalid");
    screenshots.push("18-journey-scroll-upper-boundary-720x1584.png");
    await page.screenshot({ path: resolve(output, screenshots.at(-1)) });

    const reachableRewardLevels = new Set();
    const reachableEpisodes = new Set();
    const recordViewport = () => {
      state.journey.displayedLevels.forEach((levelId) => reachableRewardLevels.add(levelId));
      state.journey.visibleEpisodes.forEach((episode) => reachableEpisodes.add(episode));
    };
    let upwardSwipes = 0;
    recordViewport();
    while (state.journey.canScrollUp) {
      const swipe = await swipeJourney(page, "up", 0.10, upwardSwipes === 0 ? "journeyNode.0" : undefined);
      swipe.held.journey.displayedLevels.forEach((levelId) => reachableRewardLevels.add(levelId));
      swipe.held.journey.visibleEpisodes.forEach((episode) => reachableEpisodes.add(episode));
      state = swipe.after;
      upwardSwipes += 1;
      assert(upwardSwipes <= 80, "Journey never reached its lower scroll boundary");
      recordViewport();
    }
    assert(Math.abs(state.journey.scrollOffset - state.journey.maxScrollOffset) < 1
      && !state.journey.canScrollUp && state.journey.canScrollDown,
    "Journey lower scroll boundary is invalid");
    assert(state.journey.displayedLevels.includes(10) && state.journey.visibleEpisodes.includes(1),
      "Journey lower boundary omitted its first episode/reward");
    const expectedRewards = [10, 15, 25, 30, 35, 45, 50, 60, 65, 75, 80, 90, 95];
    assert(JSON.stringify([...reachableRewardLevels].sort((left, right) => left - right)) === JSON.stringify(expectedRewards)
      && JSON.stringify([...reachableEpisodes].sort((left, right) => left - right)) === JSON.stringify(
        Array.from({ length: 10 }, (_, index) => index + 1),
      ),
    `Journey vertical scroll skipped sparse content (${JSON.stringify({
      rewards: [...reachableRewardLevels],
      episodes: [...reachableEpisodes],
    })})`);
    screenshots.push("19-journey-scroll-lower-boundary-720x1584.png");
    await page.screenshot({ path: resolve(output, screenshots.at(-1)) });

    ({ state } = await pressTarget(page, "journeyNode.0"));
    assert(state.screen === "levels" && state.level.id === 58,
      "Journey row selected a level before pointer release");
    state = await releasePressedTarget(page);
    assert(state.screen === "home" && state.level.id === 10,
      "Journey row was not selectable on release after scrolling");
    report.journeyVerticalScroll = {
      upperRewardLevels: [95, 90],
      arrowPaging: false,
      pointerDragStartsOnRewardRow: true,
      dragDoesNotSelectLevel: true,
      rewardLevelsCovered: reachableRewardLevels.size,
      episodesCovered: reachableEpisodes.size,
      finaleLevel: 100,
      lowerBoundaryRewardLevels: state.journey?.displayedLevels,
      upwardSwipes,
      downwardSwipes: 0,
      releaseSelectionLevel: 10,
    };
    report.journeyEndgameNodes = {
      finaleLevel: 100,
      sparseRewardLevels: expectedRewards,
      episodeCount: 10,
      topToBottomOrderVerified: true,
    };
    await context.close();
  }

  assert(errors.length === 0, `browser errors:\n${errors.join("\n")}`);
  report.browserErrors = [...errors];
  await writeFile(resolve(output, "journey-leaderboard-report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
} finally {
  await browser.close();
}

console.log("Vertically scrollable sparse Journey rewards/episodes, release-only selection, capped-inventory/resource retry, consecutive events, and vertically scrollable three-tab Leaderboard passed at 720×1584.");
