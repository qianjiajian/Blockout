import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";

const output = fileURLToPath(new URL("../playtest-results/mechanism-guide-catalogue-2026-09-22/five-tab/", import.meta.url));
const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
await mkdir(output, { recursive: true });

const browser = await chromium.launch({ headless: true });
const errors = [];
const attachErrors = (page, sink = errors) => {
  page.on("console", (message) => { if (message.type() === "error") sink.push(message.text()); });
  page.on("pageerror", (error) => sink.push(error.message));
};
const installNavigationCanvasProbe = (page) => page.addInitScript(() => {
  const navigationFiles = new Set([
    "navigation-bar.png", "navigation-selected.png", "shop-icon.png",
    "leaderboard-icon.png", "home-icon.png", "journey-icon.png", "collection-icon.png",
  ]);
  const navigationLabels = new Set(["SHOP", "LEADERBOARD", "HOME", "JOURNEY", "COLLECTION"]);
  const originalDrawImage = CanvasRenderingContext2D.prototype.drawImage;
  const originalFillText = CanvasRenderingContext2D.prototype.fillText;
  window.__navigationCanvasProbe = { images: [], labels: [] };
  window.__resetNavigationCanvasProbe = () => {
    window.__navigationCanvasProbe.images.length = 0;
    window.__navigationCanvasProbe.labels.length = 0;
  };
  CanvasRenderingContext2D.prototype.drawImage = function drawImage(image, ...args) {
    const source = typeof image?.src === "string" ? image.src : "";
    const file = source.split("/").at(-1)?.split("?")[0] ?? "";
    if (navigationFiles.has(file) && (!file.endsWith("-icon.png")
      || (args.length === 2 && args[0] === 0 && args[1] === 0))) {
      const transform = this.getTransform();
      window.__navigationCanvasProbe.images.push({
        file,
        a: transform.a,
        b: transform.b,
        c: transform.c,
        d: transform.d,
      });
    }
    return originalDrawImage.call(this, image, ...args);
  };
  CanvasRenderingContext2D.prototype.fillText = function fillText(text, x, y, ...args) {
    if (navigationLabels.has(String(text)) && Math.abs(y - 1567) < 0.01) {
      window.__navigationCanvasProbe.labels.push(String(text));
    }
    return originalFillText.call(this, text, x, y, ...args);
  };
});

const bestStars = Object.fromEntries(Array.from({ length: 57 }, (_, index) => [String(index + 1), 1 + index % 3]));
const bestMoves = Object.fromEntries(Array.from({ length: 20 }, (_, index) => [String(index + 1), 8 + index % 7]));
const baseSave = {
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
  bestStars,
  bestMoves,
  rewardedLevels: Array.from({ length: 57 }, (_, index) => index + 1),
  journeyProgress: {
    claimedMilestoneLevels: Array.from({ length: 11 }, (_, index) => (index + 1) * 5),
    seenEpisodeUnlockLevels: [11, 21, 31, 41, 51],
  },
  dailyStreak: 3,
  lastDailyCompletedDay: "",
};

const debug = (page) => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const writeSave = async (page, partial = {}, url = playtestUrl) => {
  await page.goto(url, { waitUntil: "networkidle" });
  const updateId = await page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState().updateNotice.id);
  await page.evaluate((save) => localStorage.setItem("color-escape-save-v1", JSON.stringify(save)), {
    ...baseSave,
    ...partial,
    lastSeenUpdate: updateId,
  });
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().art.ready);
};
const targetPoint = async (page, name) => {
  const state = await debug(page);
  const hit = state.interactionTargets?.targets?.[name]?.hit;
  const bounds = await page.locator("canvas").boundingBox();
  if (!hit || !bounds) throw new Error(`Five-tab E2E: missing ${name} target or canvas bounds`);
  return {
    x: bounds.x + state.viewportTransform.offsetX + (hit.x + hit.width / 2) * state.viewportTransform.scale,
    y: bounds.y + state.viewportTransform.offsetY + (hit.y + hit.height / 2) * state.viewportTransform.scale,
  };
};
const clickTarget = async (page, name, waitMs = 40) => {
  const point = await targetPoint(page, name);
  await page.mouse.click(point.x, point.y);
  if (waitMs) await page.waitForTimeout(waitMs);
  return debug(page);
};
const swipeLeaderboard = async (page, direction = "up", distanceRatio = 0.76) => {
  const before = await debug(page);
  const listViewport = before.leaderboard?.viewport;
  const bounds = await page.locator("canvas").boundingBox();
  if (before.screen !== "leaderboard" || !listViewport || !bounds) {
    throw new Error(`Five-tab E2E: leaderboard scroll viewport is unavailable (${JSON.stringify(before.leaderboard)})`);
  }
  if (direction !== "up" && direction !== "down") {
    throw new Error(`Five-tab E2E: unsupported leaderboard swipe direction ${direction}`);
  }

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
  const movedInExpectedDirection = direction === "up"
    ? held.leaderboard.scrollOffset > before.leaderboard.scrollOffset
    : held.leaderboard.scrollOffset < before.leaderboard.scrollOffset;
  if (!held.leaderboard.scrolling || held.buttonPress || !movedInExpectedDirection) {
    throw new Error(`Five-tab E2E: leaderboard swipe did not own/move the pointer (${JSON.stringify({
      direction,
      before: before.leaderboard,
      held: held.leaderboard,
      buttonPress: held.buttonPress,
    })})`);
  }

  await page.mouse.up();
  await page.waitForTimeout(40);
  const after = await debug(page);
  if (after.leaderboard.scrolling) {
    throw new Error(`Five-tab E2E: leaderboard remained in its scrolling state after release (${JSON.stringify(after.leaderboard)})`);
  }
  return { before, held, after };
};
const swipeJourney = async (page, direction = "up", distanceRatio = 0.32, startTarget) => {
  const before = await debug(page);
  const scrollViewport = before.journey?.viewport;
  const bounds = await page.locator("canvas").boundingBox();
  if (before.screen !== "levels" || !scrollViewport || !bounds) {
    throw new Error(`Five-tab E2E: Journey scroll viewport is unavailable (${JSON.stringify(before.journey)})`);
  }
  if (direction !== "up" && direction !== "down") {
    throw new Error(`Five-tab E2E: unsupported Journey swipe direction ${direction}`);
  }

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
  const movedInExpectedDirection = direction === "up"
    ? held.journey.scrollOffset > before.journey.scrollOffset
    : held.journey.scrollOffset < before.journey.scrollOffset;
  if (!held.journey.scrolling || held.buttonPress || !movedInExpectedDirection
    || held.screen !== "levels" || held.level.id !== before.level.id) {
    throw new Error(`Five-tab E2E: Journey swipe did not own/move the pointer safely (${JSON.stringify({
      direction,
      before: before.journey,
      held: held.journey,
      screen: held.screen,
      level: held.level.id,
      buttonPress: held.buttonPress,
    })})`);
  }

  await page.mouse.up();
  await page.waitForTimeout(40);
  const after = await debug(page);
  if (after.journey.scrolling || after.screen !== "levels" || after.level.id !== before.level.id) {
    throw new Error(`Five-tab E2E: Journey swipe released into a level (${JSON.stringify({
      screen: after.screen,
      level: after.level.id,
      journey: after.journey,
    })})`);
  }
  return { before, held, after };
};
const waitSettled = async (page, screen) => {
  await page.waitForFunction((expected) => {
    const state = window.__COLOR_ESCAPE__?.getDebugState();
    return state?.screen === expected && !state.navigation.transition;
  }, screen);
  if (["supply", "leaderboard", "levels"].includes(screen)) {
    await page.waitForFunction((expected) => {
      const state = window.__COLOR_ESCAPE__?.getDebugState();
      return state?.art.formalPage.loaded === expected && !state.art.formalPage.error;
    }, screen);
  } else if (screen === "records") {
    await page.waitForFunction(() => {
      const album = window.__COLOR_ESCAPE__?.getDebugState().collectionAlbum;
      return album?.open && !album.guideOpen && album.art.ready && album.art.artworkReady
        && !album.art.requested && !album.art.error && !album.art.artworkError
        && album.art.currentAtlasIndexes.every(index => album.art.loadedAtlasIndexes.includes(index));
    });
  }
  return debug(page);
};
const waitJourneyMotionToSettle = async (page) => {
  await page.waitForFunction(() => {
    const journey = window.__COLOR_ESCAPE__?.getDebugState().journey;
    return journey && !journey.scrolling && Math.abs(journey.velocity) < 0.5
      && journey.scrollOffset >= journey.minScrollOffset - 0.5
      && journey.scrollOffset <= journey.maxScrollOffset + 0.5;
  }, undefined, { timeout: 5_000 });
  return debug(page);
};
const expectedNavigationVisuals = {
  supply: { label: "SHOP", selectedIcon: "shop-icon.png", scales: [1.5, 1, 0.6, 1, 1] },
  leaderboard: { label: "LEADERBOARD", selectedIcon: "leaderboard-icon.png", scales: [1, 1.4, 0.6, 1, 1] },
  home: { label: "HOME", selectedIcon: "home-icon.png", scales: [1, 1, 1, 1, 1] },
  levels: { label: "JOURNEY", selectedIcon: "journey-icon.png", scales: [1, 1, 0.6, 1.46, 1] },
  records: { label: "COLLECTION", selectedIcon: "collection-icon.png", scales: [1, 1, 0.6, 1, 1.46] },
};
const assertRenderedSelectedTab = async (page, expected, context) => {
  await page.evaluate(() => {
    window.__resetNavigationCanvasProbe();
    window.dispatchEvent(new Event("resize"));
  });
  await page.waitForTimeout(50);
  const probe = await page.evaluate(() => structuredClone(window.__navigationCanvasProbe));
  const contract = expectedNavigationVisuals[expected];
  const base = probe.images.find(({ file }) => file === "navigation-bar.png");
  const selectedBackdrops = probe.images.filter(({ file }) => file === "navigation-selected.png");
  const iconFiles = ["shop-icon.png", "leaderboard-icon.png", "home-icon.png", "journey-icon.png", "collection-icon.png"];
  if (!base || selectedBackdrops.length !== 1
    || JSON.stringify(probe.labels) !== JSON.stringify([contract.label])) {
    throw new Error(`Five-tab E2E: ${context} Canvas selected backdrop/label drifted (${JSON.stringify(probe)})`);
  }
  const baseScale = Math.hypot(base.a, base.b);
  iconFiles.forEach((file, index) => {
    const rendered = probe.images.find((entry) => entry.file === file);
    if (!rendered) throw new Error(`Five-tab E2E: ${context} Canvas omitted ${file}`);
    const ratio = Math.hypot(rendered.a, rendered.b) / baseScale;
    if (Math.abs(ratio - contract.scales[index]) > 0.001) {
      throw new Error(`Five-tab E2E: ${context} Canvas scale for ${file} is ${ratio}, expected ${contract.scales[index]}`);
    }
  });
  const selectedIcon = probe.images.find(({ file }) => file === contract.selectedIcon);
  if (!selectedIcon) throw new Error(`Five-tab E2E: ${context} Canvas omitted its selected icon`);
};
const expectSelectedTab = async (page, state, expected, context) => {
  const tabs = state.navigation.tabs;
  const selectedTabs = tabs.filter((tab) => tab.selected);
  if (state.navigation.selected !== expected || selectedTabs.length !== 1 || selectedTabs[0].screen !== expected) {
    throw new Error(`Five-tab E2E: ${context} selected-tab identity drifted (${JSON.stringify(state.navigation)})`);
  }
  for (const tab of tabs) {
    const selected = tab.screen === expected;
    if (tab.labelVisible !== selected || tab.iconScale !== (selected ? tab.selectedScale : tab.unselectedScale)) {
      throw new Error(`Five-tab E2E: ${context} icon/label state is inconsistent (${JSON.stringify(tab)})`);
    }
  }
  await assertRenderedSelectedTab(page, expected, context);
};

const page = await browser.newPage({ viewport: { width: 720, height: 1584 }, deviceScaleFactor: 1 });
attachErrors(page);
await installNavigationCanvasProbe(page);
await writeSave(page);
const collectionAlbumResourceCount = await page.evaluate(async () => {
  const { GAME_ART } = await import("/src/game/artManifest.ts");
  return Object.keys(GAME_ART.ui.collectionAlbum).length + GAME_ART.ui.collectionCardAtlases.levels.length + GAME_ART.ui.collectionCardAtlases.masterpieces.length;
});
const collectionAlbumChromeCount = await page.evaluate(async () => {
  const { GAME_ART } = await import("/src/game/artManifest.ts");
  return Object.keys(GAME_ART.ui.collectionAlbum).length;
});
const albumArtComplete = art => art.ready && art.artworkReady
  && art.currentAtlasIndexes.every(index => art.loadedAtlasIndexes.includes(index))
  && art.loadedImages === collectionAlbumChromeCount + art.loadedAtlasIndexes.length
  && art.loadedImages <= collectionAlbumResourceCount;
let state = await debug(page);
if (state.screen !== "home" || !state.navigation.artReady || state.navigation.tabs.length !== 5) {
  throw new Error(`Five-tab E2E: Home navigation did not initialize (${JSON.stringify(state.navigation)})`);
}
if (state.interactionTargets.targets.homeCollectionAlbum) {
  throw new Error("Five-tab E2E: obsolete duplicate Home collection entry is still exposed");
}
await expectSelectedTab(page, state, "home", "Home");
await page.screenshot({ path: resolve(output, "01-home-720x1584.png") });

// The navigation keeps its measured 200 ms slide while the destination art is
// loaded on demand. During a formal-to-formal slide the outgoing group remains
// alive until the last transition frame, then is released deterministically.
await clickTarget(page, "navigation.0", 20);
state = await debug(page);
if (state.screen !== "supply" || state.navigation.transition?.from !== "home"
  || state.navigation.transition?.to !== "supply" || state.navigation.transition.direction !== -1
  || Math.abs(state.navigation.transition.duration - 0.2) > 0.001) {
  throw new Error(`Five-tab E2E: Shop transition drifted (${JSON.stringify(state.navigation.transition)})`);
}
state = await waitSettled(page, "supply");
await expectSelectedTab(page, state, "supply", "Shop");
if (state.supply.items.length !== 3 || state.art.formalPage.loadedImages !== 7) {
  throw new Error(`Five-tab E2E: Shop formal page or inventory is incomplete (${JSON.stringify(state.art.formalPage)})`);
}
await page.screenshot({ path: resolve(output, "02-shop-720x1584.png") });

await clickTarget(page, "navigation.1", 20);
state = await debug(page);
if (state.navigation.transition?.from !== "supply" || state.navigation.transition?.to !== "leaderboard"
  || !state.art.formalPage.retained.includes("supply")) {
  throw new Error(`Five-tab E2E: formal transition released its outgoing Shop art early (${JSON.stringify({
    transition: state.navigation.transition,
    art: state.art.formalPage,
  })})`);
}
state = await waitSettled(page, "leaderboard");
await expectSelectedTab(page, state, "leaderboard", "Leaderboard");
if (state.leaderboard.mode !== "world" || state.leaderboard.totalEntries !== 99
  || state.art.formalPage.loaded !== "leaderboard" || state.art.formalPage.loadedImages !== 27
  || state.art.formalPage.retained.length !== 0 || state.leaderboard.source !== "placeholder-v1"
  || state.leaderboard.totalPlayers !== 100
  || state.leaderboard.player?.rank !== 66 || state.leaderboard.player?.isPlayer !== true
  || state.leaderboard.player?.name !== "Klip" || state.leaderboard.player?.totalStars !== 114
  || state.leaderboard.entries.some((entry) => entry.isPlayer || !Number.isInteger(entry.totalStars))
  || state.leaderboard.firstRank !== 1 || state.leaderboard.scrollOffset !== 0
  || state.leaderboard.maxScrollOffset <= 0 || state.leaderboard.canScrollUp || !state.leaderboard.canScrollDown) {
  throw new Error(`Five-tab E2E: World leaderboard did not open its placeholder player records (${JSON.stringify(state.leaderboard)})`);
}
if (state.interactionTargets.targets.leaderboardPrev || state.interactionTargets.targets.leaderboardNext) {
  throw new Error("Five-tab E2E: Leaderboard still exposes Prev/Next interaction targets");
}
const fixedPlayer = JSON.stringify(state.leaderboard.player);
await page.screenshot({ path: resolve(output, "03-leaderboard-world-720x1584.png") });

state = await clickTarget(page, "leaderboardWeekly");
if (state.leaderboard.mode !== "weekly" || state.leaderboard.totalEntries !== 99
  || state.leaderboard.firstRank !== 1 || state.leaderboard.scrollOffset !== 0
  || state.leaderboard.maxScrollOffset <= 0 || state.leaderboard.canScrollUp || !state.leaderboard.canScrollDown) {
  throw new Error(`Five-tab E2E: Weekly tab did not expose all placeholder opponents (${JSON.stringify(state.leaderboard)})`);
}
await page.screenshot({ path: resolve(output, "04-leaderboard-weekly-720x1584.png") });
const weeklySwipe = await swipeLeaderboard(page);
state = weeklySwipe.after;
if (state.leaderboard.scrollOffset <= 0 || state.leaderboard.firstRank <= 1
  || !state.leaderboard.canScrollUp || JSON.stringify(state.leaderboard.player) !== fixedPlayer
  || state.leaderboard.entries.some((entry) => entry.rank === 66 || entry.isPlayer || !Number.isInteger(entry.totalStars))) {
  throw new Error(`Five-tab E2E: Weekly swipe did not scroll opponents independently of the fixed player (${JSON.stringify(state.leaderboard)})`);
}
const weeklyScrollOffset = state.leaderboard.scrollOffset;
const weeklyVisibleEntries = JSON.stringify(state.leaderboard.entries);
await page.screenshot({ path: resolve(output, "04b-leaderboard-weekly-scrolled-720x1584.png") });

state = await clickTarget(page, "leaderboardCountry");
if (state.leaderboard.mode !== "country" || state.leaderboard.totalEntries !== 99
  || JSON.stringify(state.leaderboard.player) !== fixedPlayer
  || state.leaderboard.firstRank !== 1 || state.leaderboard.scrollOffset !== 0) {
  throw new Error(`Five-tab E2E: Country tab did not expose its independent placeholder ranking (${JSON.stringify(state.leaderboard)})`);
}
await page.screenshot({ path: resolve(output, "05-leaderboard-country-720x1584.png") });
state = await clickTarget(page, "leaderboardWorld");
if (state.leaderboard.mode !== "world" || state.leaderboard.scrollOffset !== 0 || state.leaderboard.firstRank !== 1) {
  throw new Error("Five-tab E2E: World tab did not restore its own scroll origin");
}
state = await clickTarget(page, "leaderboardWeekly");
if (Math.abs(state.leaderboard.scrollOffset - weeklyScrollOffset) >= 0.001
  || JSON.stringify(state.leaderboard.entries) !== weeklyVisibleEntries
  || JSON.stringify(state.leaderboard.player) !== fixedPlayer) {
  throw new Error(`Five-tab E2E: Weekly did not preserve its per-tab scroll position and fixed player (${JSON.stringify(state.leaderboard)})`);
}
state = await clickTarget(page, "leaderboardWorld");
if (state.leaderboard.mode !== "world") throw new Error("Five-tab E2E: World tab did not reactivate");

await clickTarget(page, "navigation.2");
state = await waitSettled(page, "home");
await expectSelectedTab(page, state, "home", "restored Home");
if (state.art.formalPage.loaded) throw new Error("Five-tab E2E: formal page art remained resident on Home");

await clickTarget(page, "navigation.3");
state = await waitSettled(page, "levels");
await expectSelectedTab(page, state, "levels", "Journey");
if (JSON.stringify(state.journey.displayedLevels) !== JSON.stringify([60, 50])
  || JSON.stringify(state.journey.unlocked) !== JSON.stringify([false, true])
  || JSON.stringify(state.journey.visibleEpisodes) !== JSON.stringify([7, 6])
  || !state.journey.art.baseReady
  || state.journey.art.presentationLoading
  || state.journey.art.presentationReady
  || ![5, 6].every((index) => state.journey.art.loadedEpisodeIndexes.includes(index))
  || state.art.formalPage.loadedImages !== 23 + state.journey.art.loadedEpisodeIndexes.length) {
  throw new Error(`Five-tab E2E: Journey level window/current level are wrong (${JSON.stringify(state.journey)})`);
}
if (state.interactionTargets.targets.journeyPrev || state.interactionTargets.targets.journeyNext) {
  throw new Error("Five-tab E2E: Journey still exposes left/right arrow interaction targets");
}
await page.screenshot({ path: resolve(output, "06-journey-720x1584.png") });
state = await clickTarget(page, "journeyNode.0");
if (state.screen !== "levels" || state.level.id !== 58) throw new Error("Five-tab E2E: locked Journey level was selectable");
state = await clickTarget(page, "journeyNode.1");
if (state.screen !== "home" || state.level.id !== 50 || state.art.formalPage.loaded) {
  throw new Error("Five-tab E2E: unlocked sparse Journey reward row did not select its level");
}

// Every visible unlocked sparse reward row is a real selector, not a decorative card.
const unlockedJourneyPage = await browser.newPage({ viewport: { width: 496, height: 1078 }, deviceScaleFactor: 1 });
attachErrors(unlockedJourneyPage);
await writeSave(unlockedJourneyPage, {
  currentLevel: 193,
  highestLevel: 200,
  journeyProgress: {
    claimedMilestoneLevels: Array.from({ length: 40 }, (_, index) => (index + 1) * 5),
    seenEpisodeUnlockLevels: Array.from({ length: 19 }, (_, index) => (index + 1) * 10 + 1),
  },
});
await clickTarget(unlockedJourneyPage, "navigation.3");
state = await waitSettled(unlockedJourneyPage, "levels");
if (JSON.stringify(state.journey.displayedLevels) !== JSON.stringify([195, 190])
  || JSON.stringify(state.journey.unlocked) !== JSON.stringify([true, true])
  || JSON.stringify(state.journey.visibleEpisodes) !== JSON.stringify([20])) {
  throw new Error(`Five-tab E2E: unlocked Journey level window drifted (${JSON.stringify(state.journey)})`);
}
state = await clickTarget(unlockedJourneyPage, "journeyNode.0");
if (state.screen !== "home" || state.level.id !== 195) throw new Error("Five-tab E2E: unlocked Lv195 reward row was not selectable");
await unlockedJourneyPage.close();

// Direct vertical Pointer drags move the complete Journey route and expose all
// twenty episode cards and their sparse reward rows without arrow paging.
const fullJourneyPage = await browser.newPage({ viewport: { width: 496, height: 1078 }, deviceScaleFactor: 1 });
attachErrors(fullJourneyPage);
await writeSave(fullJourneyPage, {
  currentLevel: 200,
  highestLevel: 200,
  reducedMotion: true,
  rewardedLevels: Array.from({ length: 200 }, (_, index) => index + 1),
  journeyProgress: {
    claimedMilestoneLevels: Array.from({ length: 40 }, (_, index) => (index + 1) * 5),
    seenEpisodeUnlockLevels: Array.from({ length: 19 }, (_, index) => (index + 1) * 10 + 1),
  },
});
await clickTarget(fullJourneyPage, "navigation.3");
state = await waitSettled(fullJourneyPage, "levels");
const reachableJourneyLevels = new Set();
const reachableSegments = new Set();
let upwardSwipes = 0;
let downwardSwipes = 0;
const recordJourneyViewport = () => {
  state.journey.displayedLevels.forEach((levelId, index) => {
    const hasTarget = Boolean(state.interactionTargets.targets[`journeyNode.${index}`]);
    if (!state.journey.unlocked[index]
      || hasTarget !== state.journey.interactiveLevels.includes(levelId)) {
      throw new Error(`Five-tab E2E: Lv${levelId} visual/interactive Journey row drifted`);
    }
    if (hasTarget) reachableJourneyLevels.add(levelId);
  });
  reachableSegments.add(state.journey.segment.index);
};
if (JSON.stringify(state.journey.displayedLevels) !== JSON.stringify([195, 190])
  || JSON.stringify(state.journey.visibleEpisodes) !== JSON.stringify([20])
  || state.journey.scrollOffset - state.journey.minScrollOffset > 1.01
  || !state.journey.canScrollUp) {
  throw new Error(`Five-tab E2E: completed Journey did not start at its upper boundary (${JSON.stringify(state.journey)})`);
}
if (state.interactionTargets.targets.journeyPrev || state.interactionTargets.targets.journeyNext) {
  throw new Error("Five-tab E2E: Journey arrow targets survived the vertical-scroll replacement");
}
while (state.journey.canScrollDown) {
  ({ after: state } = await swipeJourney(fullJourneyPage, "down", 0.32));
  downwardSwipes += 1;
  if (downwardSwipes > 2) throw new Error("Five-tab E2E: completed Journey did not settle at its upper boundary");
}
recordJourneyViewport();
while (state.journey.canScrollUp) {
  ({ after: state } = await swipeJourney(
    fullJourneyPage,
    "up",
    0.32,
    upwardSwipes === 0 ? "journeyNode.0" : undefined,
  ));
  upwardSwipes += 1;
  if (upwardSwipes > 80) throw new Error("Five-tab E2E: Journey never reached its lower scroll boundary");
  recordJourneyViewport();
}
state = await waitJourneyMotionToSettle(fullJourneyPage);
if (state.journey.scrollOffset < state.journey.maxScrollOffset - 1
  || state.journey.canScrollUp || !state.journey.canScrollDown
  || JSON.stringify(state.journey.displayedLevels) !== JSON.stringify([10])
  || !state.journey.visibleEpisodes.includes(1)) {
  throw new Error(`Five-tab E2E: Journey did not reach its lower boundary (${JSON.stringify(state.journey)})`);
}
await fullJourneyPage.screenshot({ path: resolve(output, "06b-journey-scrolled-to-lv1-496x1078.png") });
while (state.journey.canScrollDown) {
  ({ after: state } = await swipeJourney(fullJourneyPage, "down", 0.72));
  downwardSwipes += 1;
  if (downwardSwipes > 40) throw new Error("Five-tab E2E: Journey never returned to its upper scroll boundary");
}
state = await waitJourneyMotionToSettle(fullJourneyPage);
if (state.journey.scrollOffset > state.journey.minScrollOffset + 1
  || state.journey.canScrollDown || !state.journey.canScrollUp
  || JSON.stringify(state.journey.displayedLevels) !== JSON.stringify([195, 190])) {
  throw new Error(`Five-tab E2E: Journey did not return to its upper boundary (${JSON.stringify(state.journey)})`);
}
if (reachableJourneyLevels.size !== 26 || reachableSegments.size !== 20) {
  throw new Error(`Five-tab E2E: full Journey scroll coverage drifted (${JSON.stringify({
    levels: reachableJourneyLevels.size,
    segments: reachableSegments.size,
    upwardSwipes,
  })})`);
}
state = await clickTarget(fullJourneyPage, "journeyNode.0");
if (state.screen !== "home" || state.level.id !== 195) {
  throw new Error("Five-tab E2E: Journey reward row was not selectable on release after scrolling");
}
await fullJourneyPage.close();

// Page content is inert until its slide has settled, so an impatient tap cannot
// buy a booster while Shop is still moving into place.
const coinsBeforeTransitionTap = state.economy.coins;
const movingShopTabPoint = await targetPoint(page, "navigation.0");
const movingShopBuyPoint = await targetPoint(page, "supply.time");
// Resolve both coordinates before the gesture pair. Looking up the second
// debug target after starting a 200 ms slide can itself consume the transition
// on a slow CI worker and turn this into a settled-page purchase test.
await page.mouse.click(movingShopTabPoint.x, movingShopTabPoint.y);
await page.mouse.click(movingShopBuyPoint.x, movingShopBuyPoint.y);
state = await debug(page);
if (state.economy.coins !== coinsBeforeTransitionTap || !state.navigation.transition) {
  throw new Error(`Five-tab E2E: moving Shop accepted a purchase or the fixture missed the slide (${JSON.stringify(state.navigation.transition)})`);
}
await waitSettled(page, "supply");
await clickTarget(page, "navigation.2");
await waitSettled(page, "home");

await clickTarget(page, "navigation.4");
state = await waitSettled(page, "records");
await expectSelectedTab(page, state, "records", "Collection");
if (!albumArtComplete(state.collectionAlbum.art) || state.collectionAlbum.art.loadedAtlasIndexes.length >= 10 || state.art.formalPage.loaded
  || state.collectionAlbum.levelCardCount !== 200 || state.collectionAlbum.masterpieceCount !== 40
  || state.collectionAlbum.tab !== "levels" || state.collectionAlbum.pageCount !== 23 || state.collectionAlbum.visibleItems.length !== 9
  || state.interactionTargets.targets.collectionAlbumClose
  || !state.interactionTargets.targets["collectionAlbumTab.levels"]) {
  throw new Error(`Five-tab E2E: Collection did not open with its current-page artwork and bounded lazy residency (${JSON.stringify(state.collectionAlbum)})`);
}
await clickTarget(page, "collectionAlbumTab.masterpieces");
state = await clickTarget(page, "collectionAlbumNext");
if (state.collectionAlbum.tab !== "masterpieces" || state.collectionAlbum.pageIndex !== 1
  || state.collectionAlbum.pageCount !== 5 || state.collectionAlbum.visibleItems.length !== 9) {
  throw new Error("Five-tab E2E: Collection tab/page controls are unavailable");
}
await waitSettled(page, "records");
await page.waitForFunction(() => window.__COLOR_ESCAPE__.getDebugState().collectionAlbum.art.pendingAtlasIndexes.length === 0);
state = await debug(page);
const albumImagesBeforeGuide = state.collectionAlbum.art.loadedImages;
const albumBeforeGuide = {
  tab: state.collectionAlbum.tab,
  pageIndex: state.collectionAlbum.pageIndex,
  items: state.collectionAlbum.visibleItems.map(({ id }) => id),
};
await page.screenshot({ path: resolve(output, "07-collection-720x1584.png") });
const underlyingHomeTabPoint = await targetPoint(page, "navigation.2");
await clickTarget(page, "collectionAlbumGuide");
await page.waitForFunction(() => {
  const current = window.__COLOR_ESCAPE__?.getDebugState();
  return current?.screen === "mechanismGuide" && current.collectionAlbum.guideOpen
    && current.art.formalPage.loaded === "records" && !current.art.formalPage.error;
});
state = await debug(page);
if (!state.collectionAlbum.open || !albumArtComplete(state.collectionAlbum.art)
  || state.collectionAlbum.art.loadedImages !== albumImagesBeforeGuide
  || state.navigation.selected !== "records" || !state.interactionTargets.targets.mechanismGuideClose) {
  throw new Error("Five-tab E2E: mechanism guide did not open over the retained Collection album");
}
if (state.collection.total !== 15 || state.collection.allTotal !== 15
  || state.collection.orderedItemIds.length !== 15
  || state.collection.hasCategoryTabs || state.collection.hasPagination
  || state.collection.canScrollUp || !state.collection.canScrollDown
  || state.collection.maxScrollOffset <= 0) {
  throw new Error(`Five-tab E2E: Collection progress is wrong (${JSON.stringify(state.collection)})`);
}
const workbookCollectionIds = ["generator", "axis-block", "key-lock", "star", "flip-door", "colored-grid", "bomb", "shutter", "layered-lift", "color-exit", "irregular-block", "irregular-board", "frozen-exit", "numeric-ice", "multilayer-shell"];
if (JSON.stringify(state.collection.orderedItemIds) !== JSON.stringify(workbookCollectionIds)
  || state.collection.selectedId !== "generator") {
  throw new Error(`Five-tab E2E: guide does not retain the fixed workbook order and first-row selection (${JSON.stringify(state.collection.orderedItemIds)})`);
}
const collectionLayout = state.collection.layout;
if (collectionLayout.titlePanelRect.y + collectionLayout.titlePanelRect.height > collectionLayout.listViewportRect.y
  || collectionLayout.listViewportRect.y + collectionLayout.listViewportRect.height > collectionLayout.detailRect.y
  || collectionLayout.detailRect.y + collectionLayout.detailRect.height > collectionLayout.navigationTop) {
  throw new Error(`Five-tab E2E: Collection scroll layout overlaps (${JSON.stringify(collectionLayout)})`);
}
// Locked and unlocked entries intentionally retain workbook order.
for (const legacyTarget of ["collectionCategory.colors", "collectionCategory.mechanisms", "collectionPrevious", "collectionNext"]) {
  if (state.interactionTargets.targets[legacyTarget]) {
    throw new Error(`Five-tab E2E: Collection retained legacy target ${legacyTarget}`);
  }
}
const guideResourceCount = await page.evaluate(async () => {
  const { GAME_ART } = await import("/src/game/artManifest.ts");
  const { itemImages, retiredItemImages, background, topHeader, titlePanel, ...chrome } = GAME_ART.ui.formalPages.collection;
  return Object.keys(chrome).length + itemImages.length;
});
if (state.art.formalPage.loaded !== "records" || state.art.formalPage.loadedImages !== guideResourceCount) {
  throw new Error(`Five-tab E2E: Collection formal art is incomplete (${JSON.stringify(state.art.formalPage)})`);
}
await page.screenshot({ path: resolve(output, "07b-mechanism-guide-720x1584.png") });
await page.mouse.click(underlyingHomeTabPoint.x, underlyingHomeTabPoint.y);
state = await debug(page);
if (state.screen !== "mechanismGuide") {
  throw new Error("Five-tab E2E: mechanism guide allowed clicks through to bottom navigation");
}
await clickTarget(page, "mechanismGuideClose");
state = await waitSettled(page, "records");
if (state.art.formalPage.loaded || !albumArtComplete(state.collectionAlbum.art)
  || state.collectionAlbum.art.loadedImages !== albumImagesBeforeGuide
  || JSON.stringify({
    tab: state.collectionAlbum.tab,
    pageIndex: state.collectionAlbum.pageIndex,
    items: state.collectionAlbum.visibleItems.map(({ id }) => id),
  }) !== JSON.stringify(albumBeforeGuide)) {
  throw new Error("Five-tab E2E: closing mechanism guide lost the album tab/page or retained guide art");
}
await expectSelectedTab(page, state, "records", "Collection restored after guide");

// Rapid retargeting keeps only the latest requested destination and must not
// resurrect an outgoing page's released formal asset group.
await clickTarget(page, "navigation.0", 20);
await clickTarget(page, "navigation.1", 15);
await clickTarget(page, "navigation.3", 20);
state = await debug(page);
if (!state.navigation.transition
  || (state.navigation.transition.to !== "levels" && state.navigation.transition.pendingTarget !== "levels")) {
  throw new Error(`Five-tab E2E: latest-target queue drifted (${JSON.stringify(state.navigation.transition)})`);
}
state = await waitSettled(page, "levels");
if (state.art.formalPage.loaded !== "levels"
  || state.art.formalPage.loadedImages !== 23 + state.journey.art.loadedEpisodeIndexes.length) {
  throw new Error(`Five-tab E2E: queued Journey did not own the final lazy group (${JSON.stringify(state.art.formalPage)})`);
}
if (state.collectionAlbum.open || state.collectionAlbum.art.loadedImages !== 0
  || state.collectionAlbum.art.requested) {
  throw new Error("Five-tab E2E: leaving Collection retained its album assets");
}

// Responsive targets use semantic hit rectangles, never stale pixel guesses.
await page.setViewportSize({ width: 320, height: 568 });
for (const [index, expected] of ["supply", "leaderboard", "home", "levels", "records"].entries()) {
  await clickTarget(page, `navigation.${index}`);
  state = await waitSettled(page, expected);
  await expectSelectedTab(page, state, expected, `320×568 ${expected}`);
  if (expected === "leaderboard") {
    state = await clickTarget(page, "leaderboardCountry");
    if (state.leaderboard.mode !== "country") throw new Error("Five-tab E2E: narrow Country tab missed");
  }
  if (expected === "levels"
    && !(state.journey.segment.startLevel <= 58 && state.journey.segment.endLevel >= 58)) {
    throw new Error("Five-tab E2E: narrow Journey lost the current episode context");
  }
}
await page.screenshot({ path: resolve(output, "08-five-tabs-320x568.png") });

// Safe-area smoke test for formal pages and the bottom Collection album.
const safeUrl = new URL(playtestUrl);
safeUrl.searchParams.set("safeTop", "44");
safeUrl.searchParams.set("safeBottom", "34");
const safePage = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
attachErrors(safePage);
await writeSave(safePage, {}, safeUrl.href);
for (const [index, expected, file] of [
  [0, "supply", "09-shop-safearea-390x844.png"],
  [1, "leaderboard", "10-leaderboard-safearea-390x844.png"],
  [3, "levels", "11-journey-safearea-390x844.png"],
  [4, "records", "11b-collection-safearea-390x844.png"],
]) {
  await clickTarget(safePage, `navigation.${index}`);
  state = await waitSettled(safePage, expected);
  if (state.navigation.safe.top <= 0 || state.navigation.safe.bottom <= 0
    || state.navigation.bar.y + state.navigation.bar.height > 1078.01) {
    throw new Error(`Five-tab E2E: ${expected} safe-area geometry escaped (${JSON.stringify(state.navigation)})`);
  }
  await safePage.screenshot({ path: resolve(output, file) });
}
await safePage.close();

// A slow formal group must leave page actions inert after the slide itself has
// settled. A failed group stays failed until the user explicitly releases the
// retry button; successful partial images are released by the loader.
const loadingPage = await browser.newPage({ viewport: { width: 496, height: 1078 }, deviceScaleFactor: 1 });
attachErrors(loadingPage);
const delayedAsset = "**/assets/art/ui/formal-pages/shop/time.png";
const delayHandler = async (route) => {
  await new Promise((resolveDelay) => setTimeout(resolveDelay, 650));
  await route.continue();
};
await loadingPage.route(delayedAsset, delayHandler);
await writeSave(loadingPage);
const coinsBeforeSlowLoad = (await debug(loadingPage)).economy.coins;
await clickTarget(loadingPage, "navigation.0");
await loadingPage.waitForFunction(() => {
  const current = window.__COLOR_ESCAPE__?.getDebugState();
  return current?.screen === "supply" && !current.navigation.transition && current.art.formalPage.requested === "supply";
});
await clickTarget(loadingPage, "supply.time", 0);
state = await debug(loadingPage);
if (state.economy.coins !== coinsBeforeSlowLoad || state.supply.items[0].stock !== 2) {
  throw new Error("Five-tab E2E: slow-loading Shop accepted a purchase before its formal art was ready");
}
await waitSettled(loadingPage, "supply");
await loadingPage.unroute(delayedAsset, delayHandler);
await loadingPage.close();

const failurePage = await browser.newPage({ viewport: { width: 496, height: 1078 }, deviceScaleFactor: 1 });
const expectedFailurePageErrors = [];
attachErrors(failurePage, expectedFailurePageErrors);
let abortOnce = true;
const failedAsset = "**/assets/art/ui/formal-pages/leaderboard/star.png";
const failureHandler = async (route) => {
  if (abortOnce) {
    abortOnce = false;
    await route.abort("failed");
  } else {
    await route.continue();
  }
};
await failurePage.route(failedAsset, failureHandler);
await writeSave(failurePage);
await clickTarget(failurePage, "navigation.1");
await failurePage.waitForFunction(() => {
  const current = window.__COLOR_ESCAPE__?.getDebugState();
  return current?.screen === "leaderboard" && !current.navigation.transition
    && Boolean(current.art.formalPage.error) && !current.art.formalPage.requested;
});
await failurePage.waitForTimeout(120);
state = await debug(failurePage);
if (!state.art.formalPage.error || state.art.formalPage.requested) {
  throw new Error(`Five-tab E2E: failed formal group auto-retried (${JSON.stringify(state.art.formalPage)})`);
}
await failurePage.unroute(failedAsset, failureHandler);
await clickTarget(failurePage, "formalPageRetry");
state = await waitSettled(failurePage, "leaderboard");
if (state.art.formalPage.loadedImages !== 27 || state.art.formalPage.error) {
  throw new Error(`Five-tab E2E: explicit formal page retry did not recover (${JSON.stringify(state.art.formalPage)})`);
}
await failurePage.close();
errors.push(...expectedFailurePageErrors.filter((message) => !message.includes("Failed to load resource: net::ERR_FAILED")));

// Reduced motion removes the slide but not the on-demand formal art.
const reducedPage = await browser.newPage({ viewport: { width: 496, height: 1078 }, deviceScaleFactor: 1 });
attachErrors(reducedPage);
await writeSave(reducedPage, { reducedMotion: true });
state = await clickTarget(reducedPage, "navigation.0");
if (state.screen !== "supply" || state.navigation.transition) {
  throw new Error("Five-tab E2E: reduced motion did not switch pages immediately");
}
await waitSettled(reducedPage, "supply");
await reducedPage.screenshot({ path: resolve(output, "12-reduced-motion-immediate-shop.png") });
await reducedPage.close();

await writeFile(resolve(output, "formal-meta-pages-report.json"), `${JSON.stringify({
  nativeArtboard: { width: 720, height: 1584 },
  pages: {
    shop: { items: 3, functionalPurchaseCoveredBy: "playtest-supply.mjs", lazyImages: 7 },
    leaderboard: {
      tabs: ["Weekly", "World", "Country"],
      default: "World",
      dataSource: "placeholder-v1",
      opponents: 99,
      fixedPlayerRank: 66,
      metric: "totalStars",
      verticalScroll: true,
      perTabOffsetPreserved: true,
      lazyImages: 27,
    },
    journey: {
      displayedLevels: [60, 50],
      lockedLevels: [60],
      verticalScroll: true,
      arrowPaging: false,
      selectableRewardLevelsCovered: 26,
      segments: 20,
      upwardSwipes,
      downwardSwipes,
      lazyImages: 44,
    },
    collection: {
      mainPage: "album",
      levelCards: 200,
      masterpieces: 40,
      categoryTabs: true,
      arrowPaging: true,
      imageCapacity: collectionAlbumResourceCount,
      mechanismGuide: {
        modal: true,
        unifiedEntries: 15,
        unlockedFirst: true,
        verticalScroll: true,
        categoryTabs: false,
        arrowPaging: false,
        lazyImages: guideResourceCount,
        blocksBackgroundNavigation: true,
        albumTabAndPagePreservedOnClose: true,
      },
    },
  },
  responsiveViewports: ["720x1584", "320x568", "390x844+safe-area"],
  lazyLoading: { actionsLockedUntilReady: true, manualRetryAfterFailure: true, partialLoadsReleased: true },
  browserErrors: errors,
}, null, 2)}\n`, "utf8");

await page.close();
await browser.close();
if (errors.length) throw new Error(`Five-tab browser errors:\n${errors.join("\n")}`);
console.log("Formal Shop, vertically scrollable placeholder Leaderboard with a fixed player row, 200-level Journey, bottom Collection album with a modal mechanism guide, native 720×1584 art, lazy loading, and responsive/safe-area targets passed.");
