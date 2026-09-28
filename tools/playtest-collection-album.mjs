import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";

const output = fileURLToPath(new URL("../playtest-results/collection-default-page-2026-09-22/album/", import.meta.url));
const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
await mkdir(output, { recursive: true });

const makeLegacySave = ({ completed = 18 } = {}) => ({
  schemaVersion: 1,
  currentLevel: Math.max(1, completed),
  highestLevel: Math.min(200, completed + 1),
  coins: 1000,
  sound: true,
  haptic: true,
  reducedMotion: false,
  language: "zh-CN",
  featureSeen: ["basics"],
  boosterUnlockSeen: ["time", "rocket", "pulse"],
  metaDiscovery: { collectionViewedItemIds: [] },
  boosters: { time: 3, rocket: 3, pulse: 3 },
  bestStars: Object.fromEntries(Array.from({ length: completed }, (_, index) => [`${index + 1}`, 3])),
  bestMoves: {},
  rewardedLevels: Array.from({ length: completed }, (_, index) => index + 1),
  journeyProgress: { claimedMilestoneLevels: [], seenEpisodeUnlockLevels: [] },
  achievementProgress: { claimedIds: [] },
  selectedJourneyEpisode: 1,
  dailyStreak: 0,
  lastDailyCompletedDay: "",
  lastSeenUpdate: "2026-09-10-r118",
});

const browser = await chromium.launch({ headless: true });
const errors = [];
const debug = (page) => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const waitForAlbumArt = async (page) => {
  await page.waitForFunction(() => {
    const state = window.__COLOR_ESCAPE__?.getDebugState?.();
    const art = state?.collectionAlbum?.art;
    return state?.screen === "records"
      && art?.ready === true
      && art?.artworkReady === true
      && art?.requested === false
      && !art?.error
      && !art?.artworkError
      && art.currentAtlasIndexes.every((index) => art.loadedAtlasIndexes.includes(index));
  }, undefined, { timeout: 15_000 });
};
const logicalPoint = async (page, rect) => {
  const state = await debug(page);
  const canvas = await page.locator("canvas").boundingBox();
  if (!canvas || !rect) throw new Error("Collection Album E2E: missing canvas or target rect");
  return {
    x: canvas.x + state.viewportTransform.offsetX + (rect.x + rect.width / 2) * state.viewportTransform.scale,
    y: canvas.y + state.viewportTransform.offsetY + (rect.y + rect.height / 2) * state.viewportTransform.scale,
  };
};
const clickTarget = async (page, key) => {
  const state = await debug(page);
  const target = state.interactionTargets?.targets?.[key];
  if (!target) throw new Error(`Collection Album E2E: missing ${key}`);
  const point = await logicalPoint(page, target.hit);
  await page.mouse.click(point.x, point.y);
  await page.waitForTimeout(80);
};
const seed = async (page, save) => {
  await page.goto(playtestUrl, { waitUntil: "networkidle" });
  await page.evaluate((value) => localStorage.setItem("color-escape-save-v1", JSON.stringify(value)), save);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(450);
};
const attachErrors = (page) => {
  page.on("console", (message) => {
    if (message.type() === "error" && !message.text().includes("navigator.vibrate")) errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.stack ?? error.message));
};

const page = await browser.newPage({ viewport: { width: 496, height: 1078 } });
attachErrors(page);
await seed(page, makeLegacySave());
const collectionAlbumResourceCount = await page.evaluate(async () => {
  const { GAME_ART } = await import("/src/game/artManifest.ts");
  return Object.keys(GAME_ART.ui.collectionAlbum).length + GAME_ART.ui.collectionCardAtlases.levels.length + GAME_ART.ui.collectionCardAtlases.masterpieces.length;
});
const collectionAlbumChromeCount = await page.evaluate(async () => {
  const { GAME_ART } = await import("/src/game/artManifest.ts");
  return Object.keys(GAME_ART.ui.collectionAlbum).length;
});
const albumArtComplete = (art) => art.ready && art.artworkReady
  && art.currentAtlasIndexes.every((index) => art.loadedAtlasIndexes.includes(index))
  && art.loadedImages === collectionAlbumChromeCount + art.loadedAtlasIndexes.length
  && art.loadedImages <= collectionAlbumResourceCount;

let state = await debug(page);
const homeEntry = state.interactionTargets.targets["navigation.4"];
if (!homeEntry || homeEntry.cssWidth < 44 || homeEntry.cssHeight < 44
  || state.interactionTargets.targets.homeCollectionAlbum) {
  throw new Error("Collection Album E2E: bottom Collection target is missing or obsolete duplicate Home entry remains");
}
if (state.collection.allTotal !== 15 || state.collection.hasCategoryTabs || state.collection.hasPagination) {
  throw new Error("Collection Album E2E: existing mechanism guide contract changed");
}
if (state.collectionAlbum.art.ready
  || state.collectionAlbum.art.requested || state.collectionAlbum.art.loadedImages !== 0) {
  throw new Error("Collection Album E2E: Home entry or lazy formal-art lifecycle is incorrect");
}
await page.screenshot({ path: resolve(output, "home-bottom-collection-entry.png") });

await clickTarget(page, "navigation.4");
await waitForAlbumArt(page);
state = await debug(page);
if (state.screen !== "records" || !state.collectionAlbum.open || state.collectionAlbum.tab !== "levels") {
  throw new Error("Collection Album E2E: bottom Collection did not open the main album page");
}
if (state.collectionAlbum.art.splitAssetCount !== collectionAlbumResourceCount
  || !albumArtComplete(state.collectionAlbum.art)
  || state.collectionAlbum.art.artworkAtlasCount !== state.collectionAlbum.art.loadedAtlasIndexes.length
  || state.collectionAlbum.art.loadedAtlasIndexes.length >= 10
  || state.collectionAlbum.art.artworkIllustrationCount !== 240) {
  throw new Error("Collection Album E2E: current-page artwork is incomplete or cold entry loaded the entire catalogue");
}
await clickTarget(page, "collectionAlbumTab.levels");
state = await debug(page);
if (state.collectionAlbum.levelCardCount !== 200 || state.collectionAlbum.visibleItems.length !== 9
  || state.collectionAlbum.pageCount !== 23) {
  throw new Error("Collection Album E2E: dynamic 200-card catalog or 3x3 default page missing");
}
if (state.collectionAlbum.visibleItems.some((item) => !item.collected || item.unseen)) {
  throw new Error("Collection Album E2E: legacy earned cards were not migrated as collected and already viewed");
}
await page.screenshot({ path: resolve(output, "level-collection-page.png") });

await clickTarget(page, "collectionAlbumTab.masterpieces");
await waitForAlbumArt(page);
state = await debug(page);
if (state.collectionAlbum.tab !== "masterpieces" || state.collectionAlbum.masterpieceCount !== 40) {
  throw new Error("Collection Album E2E: masterpiece tab or 40-item catalog missing");
}
const firstMasterpiece = state.collectionAlbum.visibleItems.find(({ id }) => id === "masterpiece-01");
if (!firstMasterpiece?.blueprintUnlocked || firstMasterpiece.collected || firstMasterpiece.cost !== 0) {
  throw new Error("Collection Album E2E: first free restoration blueprint state is incorrect");
}
await page.screenshot({ path: resolve(output, "masterpiece-collection-page.png") });

await clickTarget(page, "collectionAlbumCard.masterpiece-01");
state = await debug(page);
if (state.collectionAlbum.detailId !== "masterpiece-01") {
  throw new Error("Collection Album E2E: masterpiece detail did not open");
}
await page.screenshot({ path: resolve(output, "masterpiece-detail.png") });
await clickTarget(page, "collectionAlbumDetailPrimary");
state = await debug(page);
if (state.collectionAlbum.restoredMasterpieceCount !== 1
  || !state.collectionAlbum.restoredMasterpieceIds.includes("masterpiece-01")
  || !state.collectionAlbum.seenItemIds.includes("masterpiece-01")) {
  throw new Error("Collection Album E2E: restoration was not atomically restored and marked seen");
}

await clickTarget(page, "collectionAlbumDetailClose");
await clickTarget(page, "collectionAlbumCard.masterpiece-02");
await page.evaluate(() => {
  globalThis.__COLLECTION_SET_ITEM__ = Storage.prototype.setItem;
  Storage.prototype.setItem = function setItem(key, value) {
    if (key === "color-escape-save-v1") throw new Error("intentional collection write rejection");
    return globalThis.__COLLECTION_SET_ITEM__.call(this, key, value);
  };
});
await clickTarget(page, "collectionAlbumDetailPrimary");
state = await debug(page);
if (state.collectionAlbum.restoredMasterpieceIds.includes("masterpiece-02")) {
  throw new Error("Collection Album E2E: rejected write still restored a masterpiece");
}
await page.evaluate(() => { Storage.prototype.setItem = globalThis.__COLLECTION_SET_ITEM__; });
await clickTarget(page, "collectionAlbumDetailPrimary");
state = await debug(page);
if (!state.collectionAlbum.restoredMasterpieceIds.includes("masterpiece-02")) {
  throw new Error("Collection Album E2E: retry after rejected write did not restore exactly once");
}

await clickTarget(page, "collectionAlbumDetailClose");
await clickTarget(page, "collectionAlbumCard.masterpiece-03");
state = await debug(page);
const thirdMasterpiece = state.collectionAlbum.visibleItems.find(({ id }) => id === "masterpiece-03");
const inspirationBeforeUnknown = state.collectionAlbum.inspiration;
if (!thirdMasterpiece?.blueprintUnlocked || thirdMasterpiece.collected) {
  throw new Error("Collection Album E2E: unknown-write fixture is not restorable");
}
await page.evaluate(() => {
  globalThis.__COLLECTION_UNKNOWN_SET_ITEM__ = Storage.prototype.setItem;
  globalThis.__COLLECTION_UNKNOWN_GET_ITEM__ = Storage.prototype.getItem;
  Storage.prototype.setItem = function setItem(key, value) {
    if (key === "color-escape-save-v1") {
      globalThis.__COLLECTION_UNKNOWN_SET_ITEM__.call(this, key, value);
      throw new Error("intentional collection acknowledgement loss");
    }
    return globalThis.__COLLECTION_UNKNOWN_SET_ITEM__.call(this, key, value);
  };
  Storage.prototype.getItem = function getItem(key) {
    if (key === "color-escape-save-v1") throw new Error("intentional collection readback outage");
    return globalThis.__COLLECTION_UNKNOWN_GET_ITEM__.call(this, key);
  };
});
await clickTarget(page, "collectionAlbumDetailPrimary");
state = await debug(page);
if (state.collectionAlbum.pendingRestorationId !== "masterpiece-03"
  || state.collectionAlbum.restoredMasterpieceIds.includes("masterpiece-03")
  || state.collectionAlbum.inspiration !== inspirationBeforeUnknown) {
  throw new Error("Collection Album E2E: ambiguous write did not preserve one immutable pending restoration");
}
await page.evaluate(() => {
  Storage.prototype.setItem = globalThis.__COLLECTION_UNKNOWN_SET_ITEM__;
  Storage.prototype.getItem = globalThis.__COLLECTION_UNKNOWN_GET_ITEM__;
});
await clickTarget(page, "collectionAlbumDetailPrimary");
state = await debug(page);
if (state.collectionAlbum.pendingRestorationId
  || !state.collectionAlbum.restoredMasterpieceIds.includes("masterpiece-03")
  || state.collectionAlbum.inspiration !== inspirationBeforeUnknown - thirdMasterpiece.cost) {
  throw new Error("Collection Album E2E: ambiguous restoration retry was not committed exactly once");
}

await clickTarget(page, "collectionAlbumDetailClose");
await clickTarget(page, "navigation.2");
await page.waitForFunction(() => window.__COLOR_ESCAPE__.getDebugState().screen === "home"
  && !window.__COLOR_ESCAPE__.getDebugState().navigation.transition);
state = await debug(page);
if (state.collectionAlbum.art.ready || state.collectionAlbum.art.requested
  || state.collectionAlbum.art.loadedImages !== 0) {
  throw new Error("Collection Album E2E: formal resources were not released after closing");
}
await clickTarget(page, "navigation.4");
await waitForAlbumArt(page);
state = await debug(page);
if (state.screen !== "records" || state.collectionAlbum.levelCardCount !== 200
  || state.collectionAlbum.masterpieceCount !== 40) {
  throw new Error("Collection Album E2E: bottom Collection did not restore the dual catalog page");
}
await page.screenshot({ path: resolve(output, "bottom-collection-album.png") });

await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(300);
state = await debug(page);
if (!state.collectionAlbum.restoredMasterpieceIds.includes("masterpiece-01")
  || !state.collectionAlbum.restoredMasterpieceIds.includes("masterpiece-02")) {
  throw new Error("Collection Album E2E: restored masterpieces did not survive reload");
}
await page.close();

const small = await browser.newPage({ viewport: { width: 320, height: 568 } });
attachErrors(small);
await seed(small, makeLegacySave({ completed: 30 }));
await clickTarget(small, "navigation.4");
await waitForAlbumArt(small);
await clickTarget(small, "collectionAlbumTab.levels");
state = await debug(small);
if (state.collectionAlbum.pageIndex !== 3) {
  throw new Error("Collection Album E2E: highest cleared Lv30 should open page 4 (28–36)");
}
for (const key of [
  "navigation.2",
  "collectionAlbumTab.levels",
  "collectionAlbumTab.masterpieces",
  "collectionAlbumGuide",
  "collectionAlbumNext",
  "collectionAlbumCard.level-028",
]) {
  const target = state.interactionTargets.targets[key];
  if (!target || target.cssWidth < 44 || target.cssHeight < 44) {
    throw new Error(`Collection Album E2E: ${key} is below the 44 CSS px target on 320x568`);
  }
}
await small.screenshot({ path: resolve(output, "collection-album-320x568.png") });
await small.waitForFunction(() => window.__COLOR_ESCAPE__.getDebugState().collectionAlbum.art.pendingAtlasIndexes.length === 0);
state = await debug(small);
const beforeGuide = { tab: state.collectionAlbum.tab, pageIndex: state.collectionAlbum.pageIndex,
  loadedImages: state.collectionAlbum.art.loadedImages };
await clickTarget(small, "collectionAlbumGuide");
await small.waitForFunction(() => window.__COLOR_ESCAPE__.getDebugState().collection.artReady);
state = await debug(small);
if (state.screen !== "mechanismGuide" || state.collection.allTotal !== 15
  || !state.collectionAlbum.open || !state.collectionAlbum.guideOpen
  || !albumArtComplete(state.collectionAlbum.art) || state.collectionAlbum.art.loadedImages !== beforeGuide.loadedImages) {
  throw new Error("Collection Album E2E: guide is not a modal over the retained album page");
}
await clickTarget(small, "mechanismGuideClose");
state = await debug(small);
if (state.screen !== "records" || state.collectionAlbum.guideOpen
  || state.collectionAlbum.tab !== beforeGuide.tab || state.collectionAlbum.pageIndex !== beforeGuide.pageIndex
  || state.collectionAlbum.art.loadedImages !== beforeGuide.loadedImages) {
  throw new Error("Collection Album E2E: guide close lost the parent album page");
}
await small.close();

await browser.close();
if (errors.length) throw new Error(`Collection Album browser errors:\n${errors.join("\n")}`);
console.log("Bottom Collection main page, dual catalogs, 3x3 pagination, migration, restoration transaction, persistence, small-screen targets, and mechanism-guide modal return passed.");
