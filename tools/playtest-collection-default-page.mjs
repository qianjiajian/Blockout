import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { chromium } from "playwright";

const output = resolve("playtest-results/collection-default-page-2026-09-22");
const url = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
const saveKey = "color-escape-save-v1";
const boundaryCases = [0, 1, 9, 10, 18, 19, 24, 198, 199, 200].map(completed => ({
  name: `completed-${completed}`, rewarded: Array.from({ length: completed }, (_, i) => i + 1),
  highest: Math.min(200, completed + 1), expectedPage: Math.max(0, Math.floor((completed - 1) / 9)),
}));
const cases = [...boundaryCases,
  { name: "unordered-duplicates", rewarded: [10, 1, 9, 10, 2, 1], highest: 11, expectedPage: 1 },
  { name: "sparse-completions", rewarded: [3, 24, 8], highest: 25, expectedPage: 2 },
  { name: "unlocked-200-completed-9", rewarded: [9, 2, 1], highest: 200, expectedPage: 0 },
];
const makeSave = fixture => ({
  schemaVersion: 1, currentLevel: fixture.highest, highestLevel: fixture.highest, coins: 2000,
  sound: false, haptic: false, reducedMotion: fixture.name !== "completed-24", language: "zh-CN",
  featureSeen: ["basics"], boosterUnlockSeen: ["time", "rocket", "pulse"],
  boosters: { time: 3, rocket: 3, pulse: 3 },
  bestStars: Object.fromEntries(fixture.rewarded.map(id => [String(id), id % 3 + 1])),
  bestMoves: {}, rewardedLevels: fixture.rewarded,
  collectionProgress: { version: 1, inspiration: 1000, restoredMasterpieceIds: [], seenItemIds: [], claimedMilestoneIds: [] },
  metaDiscovery: { collectionViewedThroughLevel: fixture.highest, dailyUnlockSeen: true },
});
const debug = page => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const snapshot = state => ({ tab: state.collectionAlbum.tab, page: state.collectionAlbum.pageIndex,
  ids: state.collectionAlbum.visibleItems.map(item => item.id) });
const progress = page => page.evaluate(() => { const save = window.__COLOR_ESCAPE__.save; return {
  rewardedLevels: [...save.rewardedLevels], bestStars: { ...save.bestStars }, highestLevel: save.highestLevel,
  currentLevel: save.currentLevel, coins: save.coins,
}; });
const hashes = async paths => Object.fromEntries(await Promise.all(paths.map(async path =>
  [path, createHash("sha256").update(await readFile(path)).digest("hex")])));
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const errors = [], reports = [];
const inputHashes = await hashes(["src/game/ColorEscapeGame.ts", "src/game/collectionAlbumLayout.ts", "src/game/artManifest.ts"]);

async function click(page, key, events) {
  const before = await debug(page), target = before.interactionTargets.targets[key];
  assert.ok(target, `missing real pointer target ${key}`);
  const box = await page.locator("canvas").boundingBox(), rect = target.hit;
  const x = box.x + before.viewportTransform.offsetX + (rect.x + rect.width / 2) * before.viewportTransform.scale;
  const y = box.y + before.viewportTransform.offsetY + (rect.y + rect.height / 2) * before.viewportTransform.scale;
  await page.mouse.click(x, y); await page.waitForTimeout(35);
  const after = await debug(page);
  events.push({ target: key, pointerCss: { x, y }, before: { screen: before.screen, ...snapshot(before) },
    after: { screen: after.screen, ...snapshot(after), detailId: after.collectionAlbum.detailId } });
}
async function settled(page, screen = "records") {
  await page.waitForFunction(expected => { const s = window.__COLOR_ESCAPE__.getDebugState();
    return s.screen === expected && !s.navigation.transition
      && (expected !== "records" || (s.collectionAlbum.art.ready && s.collectionAlbum.art.artworkReady
        && s.collectionAlbum.art.currentAtlasIndexes.every(index => s.collectionAlbum.art.loadedAtlasIndexes.includes(index))));
  }, screen);
}
async function assertDefault(page, fixture) {
  await settled(page); const state = await debug(page);
  const chromeCount = await page.evaluate(async () => Object.keys((await import("/src/game/artManifest.ts")).GAME_ART.ui.collectionAlbum).length);
  assert.equal(state.collectionAlbum.art.loadedImages, chromeCount + state.collectionAlbum.art.loadedAtlasIndexes.length);
  assert.ok(state.collectionAlbum.art.loadedImages <= state.collectionAlbum.art.splitAssetCount);
  assert.equal(state.collectionAlbum.tab, "levels", `${fixture.name}: external entry selects level cards`);
  assert.equal(state.collectionAlbum.pageIndex, fixture.expectedPage, `${fixture.name}: highest completed level's page`);
  assert.equal(state.collectionAlbum.pageCount, 23);
  const first = fixture.expectedPage * 9 + 1;
  const expectedIds = Array.from({ length: Math.min(9, 201 - first) }, (_, i) => `level-${String(first + i).padStart(3, "0")}`);
  assert.deepEqual(state.collectionAlbum.visibleItems.map(item => item.id), expectedIds);
  const completed = Math.max(0, ...fixture.rewarded);
  if (completed) assert.ok(state.collectionAlbum.visibleItems.some(item => item.id === `level-${String(completed).padStart(3, "0")}` && item.collected), "highest completed card is owned and visible");
  const labels = await page.evaluate(() => { const game = window.__COLOR_ESCAPE__, ctx = game.ctx, original = ctx.fillText, labels = [];
    ctx.fillText = function(text, ...args) { labels.push(String(text)); return original.call(this, text, ...args); };
    try { game.render(); } finally { ctx.fillText = original; } return labels; });
  assert.ok(labels.includes(`${fixture.expectedPage + 1}/23`), "actual Canvas page indicator matches the destination");
  return snapshot(state);
}
async function manualPage(page, fixture, events) {
  await click(page, fixture.expectedPage === 22 ? "collectionAlbumPrevious" : "collectionAlbumNext", events);
  await settled(page);
  const state = await debug(page), expected = fixture.expectedPage + (fixture.expectedPage === 22 ? -1 : 1);
  assert.equal(state.collectionAlbum.pageIndex, expected); return snapshot(state);
}
async function modalRoundTrips(page, events) {
  await settled(page);
  const before = snapshot(await debug(page)), firstId = before.ids[0];
  await click(page, `collectionAlbumCard.${firstId}`, events);
  assert.equal((await debug(page)).collectionAlbum.detailId, firstId);
  await click(page, "collectionAlbumDetailClose", events);
  assert.deepEqual(snapshot(await debug(page)), before, "detail close preserves the player's manual page");
  await click(page, "collectionAlbumGuide", events);
  await page.waitForFunction(() => { const s = window.__COLOR_ESCAPE__.getDebugState(); return s.screen === "mechanismGuide" && s.collection.artReady; });
  assert.deepEqual(snapshot(await debug(page)), before);
  await click(page, "mechanismGuideClose", events);
  await settled(page); assert.deepEqual(snapshot(await debug(page)), before, "guide close preserves the player's manual page");
}
try {
  for (const viewport of [{ width: 720, height: 1584 }, { width: 320, height: 568 }]) {
    for (const fixture of cases) {
      const name = `${fixture.name}-${viewport.width}x${viewport.height}`, events = [];
      const context = await browser.newContext({ viewport, locale: "zh-CN" }), page = await context.newPage();
      page.on("pageerror", error => errors.push(`${name}: ${error.message}`));
      page.on("console", message => { if (message.type() === "error" && !message.text().includes("navigator.vibrate")) errors.push(`${name}: ${message.text()}`); });
      await page.goto(url, { waitUntil: "networkidle" });
      await page.waitForFunction(() => window.__COLOR_ESCAPE__?.storageBaselineReady && window.__COLOR_ESCAPE__?.artReady);
      await page.evaluate(({ key, save }) => { save.lastSeenUpdate = window.__COLOR_ESCAPE__.getDebugState().updateNotice.id;
        localStorage.setItem(key, JSON.stringify(save)); }, { key: saveKey, save: makeSave(fixture) });
      await page.reload({ waitUntil: "networkidle" });
      await page.waitForFunction(() => window.__COLOR_ESCAPE__?.storageBaselineReady && window.__COLOR_ESCAPE__?.artReady);
      const baselineProgress = await progress(page);
      await click(page, "navigation.4", events); const entry = await assertDefault(page, fixture);
      assert.ok((await debug(page)).collectionAlbum.art.loadedAtlasIndexes.length < 10, "cold entry does not load the whole catalogue");
      const screenshot = `${name}.png`; await page.screenshot({ path: resolve(output, screenshot) });
      const manual = await manualPage(page, fixture, events);
      await click(page, "navigation.4", events);
      assert.deepEqual(snapshot(await debug(page)), manual, "clicking current Collection bottom tab must not reset manual page");
      await modalRoundTrips(page, events);
      await click(page, "collectionAlbumTab.masterpieces", events);
      assert.equal((await debug(page)).collectionAlbum.tab, "masterpieces");
      await click(page, "collectionAlbumNext", events);
      const masterpiecePage = snapshot(await debug(page));
      await click(page, "navigation.4", events);
      assert.deepEqual(snapshot(await debug(page)), masterpiecePage, "current bottom tab preserves painting category and manual page");
      await modalRoundTrips(page, events);
      await click(page, "collectionAlbumTab.levels", events); await assertDefault(page, fixture);
      for (const [index, screen] of [[0, "supply"], [1, "leaderboard"], [2, "home"], [3, "levels"]]) {
        await manualPage(page, fixture, events);
        await click(page, `navigation.${index}`, events); await settled(page, screen);
        await click(page, "navigation.4", events); await assertDefault(page, fixture);
      }
      await click(page, "collectionAlbumTab.masterpieces", events); await click(page, "collectionAlbumNext", events);
      await click(page, "navigation.2", events); await settled(page, "home");
      await click(page, "navigation.4", events); await assertDefault(page, fixture);
      if (fixture.name === "completed-24") {
        await manualPage(page, fixture, events);
        await click(page, "navigation.0", events);
        await click(page, "navigation.1", events);
        await click(page, "navigation.4", events);
        await assertDefault(page, fixture);
        await page.screenshot({ path: resolve(output, `rapid-tabs-${viewport.width}x${viewport.height}.png`) });
      }
      assert.deepEqual(await progress(page), baselineProgress, "navigation never grants completion or changes saved gameplay progress");
      reports.push({ name, fixture, entry, manual, screenshot, status: "pass", events });
      await context.close();
    }
  }
  assert.deepEqual(await hashes(Object.keys(inputHashes)), inputHashes, "runtime/layout/art inputs stayed stable for the full run");
  assert.deepEqual(errors, []);
  await writeFile(resolve(output, "report.json"), JSON.stringify({ status: "pass", isolatedContexts: true,
    inputHashes, cases: cases.length, viewports: 2, reports, errors }, null, 2));
  console.log("Collection default page PASS: 26 isolated real-pointer scenarios, highest completed (not unlocked) card, exact page boundaries, manual/modal/category behavior, all external tab entries and unchanged gameplay progress.");
} finally { await browser.close(); }
