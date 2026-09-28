import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = resolve(root, process.env.PLAYTEST_OUTPUT ?? `playtest-results/mechanism-guide-unlock-order-${new Date().toISOString().replace(/[:.]/g, "-")}`);
const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
const saveKey = "color-escape-save-v1";
await mkdir(output, { recursive: true });
const sourceFiles = ["src/core/mechanismCatalog.ts", "src/game/ColorEscapeGame.ts", "tools/playtest-mechanism-guide.mjs"];
const sourceHashes = async () => Object.fromEntries(await Promise.all(sourceFiles.map(async path => [path,
  createHash("sha256").update(await readFile(resolve(root, path))).digest("hex"),
])));
const sourcesBefore = await sourceHashes();

const browser = await chromium.launch({ headless: true });
const errors = [];
const results = [];

const debug = (page) => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());

const logicalPoint = async (page, x, y) => {
  const state = await debug(page);
  const bounds = await page.locator("canvas").boundingBox();
  if (!bounds) throw new Error("Mechanism guide E2E: canvas bounds are unavailable");
  return {
    x: bounds.x + state.viewportTransform.offsetX + x * state.viewportTransform.scale,
    y: bounds.y + state.viewportTransform.offsetY + y * state.viewportTransform.scale,
  };
};

const clickTarget = async (page, name, waitMs = 80) => {
  const state = await debug(page);
  const rect = state.interactionTargets?.targets?.[name]?.hit;
  if (!rect) throw new Error(`Mechanism guide E2E: missing interaction target ${name}`);
  const point = await logicalPoint(page, rect.x + rect.width / 2, rect.y + rect.height / 2);
  await page.mouse.click(point.x, point.y);
  await page.waitForTimeout(waitMs);
  return debug(page);
};

const fixtureSave = (highestLevel, rewardedThrough, collectionViewedThroughLevel = highestLevel) => ({
  schemaVersion: 1,
  currentLevel: highestLevel,
  highestLevel,
  coins: 2000,
  sound: false,
  haptic: false,
  reducedMotion: true,
  featureSeen: ["basics", "ice-door", "ice-block", "layer", "shutter", "generator", "arrow-block", "key-lock", "lift", "timed-generator", "staged-frame", "star"],
  boosterUnlockSeen: ["time", "rocket", "pulse"],
  boosters: { time: 3, rocket: 3, pulse: 3 },
  bestStars: {},
  bestMoves: {},
  rewardedLevels: Array.from({ length: rewardedThrough }, (_, index) => index + 1),
  dailyStreak: 0,
  lastDailyCompletedDay: "",
  metaDiscovery: { collectionViewedThroughLevel, dailyUnlockSeen: true,
    collectionViewedItemIds: [...legacyIds, ...mechanismIds.filter(id => unlockLevels[id] <= collectionViewedThroughLevel)] },
});

const createScenario = async (label, viewport, save, query = {}) => {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`${label}: ${message.text()}`);
  });
  page.on("pageerror", (error) => errors.push(`${label}: ${error.message}`));
  const scenarioUrl = new URL(playtestUrl);
  Object.entries(query).forEach(([name, value]) => scenarioUrl.searchParams.set(name, String(value)));
  await page.goto(scenarioUrl.toString(), { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState);
  const updateId = (await debug(page)).updateNotice.id;
  await page.evaluate(({ key, value, lastSeenUpdate }) => {
    localStorage.clear();
    localStorage.setItem(key, JSON.stringify({ ...value, lastSeenUpdate }));
  }, { key: saveKey, value: save, lastSeenUpdate: updateId });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().art.ready === true, undefined, { timeout: 15_000 });
  const beforeOpen = await debug(page);
  let state = await clickTarget(page, "navigation.4", 280);
  await page.waitForFunction(() => {
    const state = window.__COLOR_ESCAPE__.getDebugState();
    return state.screen === "records" && state.collectionAlbum.art.ready
      && state.collectionAlbum.art.artworkReady && !state.navigation.transition;
  });
  state = await clickTarget(page, "collectionAlbumGuide", 280);
  await page.waitForFunction(() => window.__COLOR_ESCAPE__.getDebugState().collection.artReady);
  state = await debug(page);
  if (state.screen !== "mechanismGuide" || !state.collectionAlbum.guideOpen) {
    throw new Error(`Mechanism guide E2E: ${label} did not open the guide modal from Collection`);
  }
  return { context, page, state, beforeOpen };
};

const mechanismIds = ["color-exit", "irregular-block", "frozen-exit", "irregular-board", "numeric-ice", "multilayer-shell", "shutter", "generator", "axis-block", "key-lock", "layered-lift", "star", "bomb", "flip-door", "colored-grid"];
const unlockLevels = Object.fromEntries(mechanismIds.map((id, index) => [id, [1, 5, 6, 8, 10, 15, 20, 35, 50, 59, 65, 100, 120, 150, 200][index]]));
const legacyIds = ["color-block", "timed-generator", "staged-frame"];

const assertLayout = (state, label) => {
  const layout = state.collection.layout;
  if (layout.titlePanelRect.y < state.navigation.safe.top + 4
    || layout.titlePanelRect.y + layout.titlePanelRect.height > layout.listViewportRect.y
    || layout.listViewportRect.y + layout.listViewportRect.height > layout.detailRect.y
    || layout.detailRect.y + layout.detailRect.height > layout.navigationTop) {
    throw new Error(`Mechanism guide E2E: ${label} fixed regions overlap (${JSON.stringify(layout)})`);
  }
  if (state.collection.hasCategoryTabs || state.collection.hasPagination) {
    throw new Error(`Mechanism guide E2E: ${label} retained category or pagination UI`);
  }
  const targetNames = Object.keys(state.interactionTargets.targets);
  for (const legacy of ["collectionCategory.colors", "collectionCategory.mechanisms", "collectionPrevious", "collectionNext"]) {
    if (targetNames.includes(legacy)) throw new Error(`Mechanism guide E2E: ${label} retained ${legacy}`);
  }
  const relevantTargets = Object.entries(state.interactionTargets.targets)
    .filter(([name]) => name.startsWith("collection."));
  for (const [name, target] of relevantTargets) {
    if (target.cssWidth + 0.01 < 44 || target.cssHeight + 0.01 < 44) {
      throw new Error(`Mechanism guide E2E: ${label} ${name} is below 44 CSS px (${target.cssWidth}x${target.cssHeight})`);
    }
    const { visual } = target;
    const viewport = layout.listViewportRect;
    if (visual.x < viewport.x - 0.01 || visual.y < viewport.y - 0.01
      || visual.x + visual.width > viewport.x + viewport.width + 0.01
      || visual.y + visual.height > viewport.y + viewport.height + 0.01) {
      throw new Error(`Mechanism guide E2E: ${label} ${name} escaped the list viewport`);
    }
  }
};

const assertCatalogue = (state, highestLevel, label) => {
  const expectedUnlocked = mechanismIds.filter(id => unlockLevels[id] <= highestLevel);
  if (JSON.stringify(state.collection.orderedItemIds) !== JSON.stringify(mechanismIds)
    || JSON.stringify(state.collection.unlockedItemIds) !== JSON.stringify(expectedUnlocked)
    || state.collection.unlocked !== expectedUnlocked.length
    || state.collection.total !== 15 || state.collection.allTotal !== 15) {
    throw new Error("Mechanism guide E2E: " + label + " ascending unlock catalogue or unlock boundaries drifted: " + JSON.stringify(state.collection));
  }
  if (legacyIds.some(id => state.collection.orderedItemIds.includes(id))
    || legacyIds.some(id => !state.discovery.state.collectionViewedItemIds.includes(id))) {
    throw new Error("Mechanism guide E2E: " + label + " legacy display removal lost stored read IDs");
  }
};

const swipeCollection = async (page, toward) => {
  const state = await debug(page);
  const rect = state.collection.layout.listViewportRect;
  const fromRatio = toward === "later" ? 0.78 : 0.22;
  const toRatio = toward === "later" ? 0.22 : 0.78;
  const start = await logicalPoint(page, rect.x + rect.width / 2, rect.y + rect.height * fromRatio);
  const end = await logicalPoint(page, rect.x + rect.width / 2, rect.y + rect.height * toRatio);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 7 });
  await page.mouse.up();
  await page.waitForTimeout(60);
  return debug(page);
};

const revealCollectionItem = async (page, id) => {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const state = await debug(page);
    if (state.interactionTargets.targets[`collection.${id}`]) return state;
    const targetIndex = state.collection.orderedItemIds.indexOf(id);
    const interactiveIndices = Object.keys(state.interactionTargets.targets)
      .filter((name) => name.startsWith("collection."))
      .map((name) => state.collection.orderedItemIds.indexOf(name.slice("collection.".length)))
      .filter((index) => index >= 0);
    if (targetIndex < 0 || interactiveIndices.length === 0) {
      throw new Error(`Mechanism guide E2E: cannot locate ${id}`);
    }
    const toward = targetIndex > Math.max(...interactiveIndices) ? "later" : "earlier";
    const before = state.collection.scrollOffset;
    const next = await swipeCollection(page, toward);
    if (Math.abs(next.collection.scrollOffset - before) < 0.01) {
      throw new Error(`Mechanism guide E2E: ${id} is unreachable at the ${toward} boundary`);
    }
  }
  throw new Error(`Mechanism guide E2E: ${id} was not revealed after repeated swipes`);
};

const clickCollectionItem = async (page, id, waitMs = 35) => {
  await revealCollectionItem(page, id);
  return clickTarget(page, `collection.${id}`, waitMs);
};

for (const viewport of [
  { label: "720x1584", width: 720, height: 1584, query: {} },
  { label: "320x568", width: 320, height: 568, query: {} },
  { label: "safe-720x1584", width: 720, height: 1584, query: { safeTop: 80, safeBottom: 50 } },
]) {
  const { context, page, beforeOpen } = await createScenario(
    "complete-" + viewport.label, { width: viewport.width, height: viewport.height },
    fixtureSave(200, 200, 200), viewport.query,
  );
  if (beforeOpen.discovery.collection.pending) throw new Error("Guide emitted false discovery for an entirely read Lv200 catalogue");
  let state = await debug(page);
  assertCatalogue(state, 200, viewport.label);
  if (!state.collection.maxScrollOffset || state.collection.canScrollUp || !state.collection.canScrollDown
    || !state.collection.artReady || state.collection.selectedId !== "color-exit") {
    throw new Error("Guide must initially show the earliest unlock row and select color-exit");
  }
  assertLayout(state, viewport.label);
  await page.screenshot({ path: resolve(output, "01-mechanisms-" + viewport.label + ".png") });
  const selectionBeforeSwipe = state.collection.selectedId;
  state = await swipeCollection(page, "later");
  if (state.collection.selectedId !== selectionBeforeSwipe || state.collection.scrollOffset <= 0) {
    throw new Error("Guide swipe selected a card or failed to move");
  }
  const entries = [];
  for (const id of mechanismIds) {
    state = await clickCollectionItem(page, id);
    if (state.collection.selectedId !== id || !state.collection.selectedTitle || !state.collection.selectedDetail
      || state.collection.displayedDetail.length < 8 || state.collection.displayedDetail.startsWith("机制效果：")) {
      throw new Error("Guide " + id + " is not inspectable with its complete rule");
    }
    entries.push({ id, title: state.collection.selectedTitle, effect: state.collection.selectedDetail, unlockLevel: unlockLevels[id] });
    if (["flip-door", "colored-grid", "bomb"].includes(id)) {
      await page.screenshot({ path: resolve(output, "02-" + id + "-detail-" + viewport.label + ".png") });
    }
  }
  while (state.collection.canScrollDown) state = await swipeCollection(page, "later");
  if (Math.abs(state.collection.scrollOffset - state.collection.maxScrollOffset) > .01
    || !state.collection.visibleItemIds.includes("colored-grid")) throw new Error("Guide did not reach the latest-unlocking item");
  const bottomOffset = state.collection.scrollOffset;
  state = await swipeCollection(page, "later");
  if (Math.abs(state.collection.scrollOffset - bottomOffset) > .01) throw new Error("Guide overscrolled below the list");
  while (state.collection.canScrollUp) state = await swipeCollection(page, "earlier");
  if (state.collection.scrollOffset !== 0 || !state.collection.visibleItemIds.includes("color-exit")) throw new Error("Guide did not return to the earliest unlock row");
  assertCatalogue(state, 200, viewport.label);
  results.push({ viewport: viewport.label, unlocked: state.collection.unlocked, entries });
  state = await clickTarget(page, "mechanismGuideClose");
  if (state.screen !== "records" || state.collectionAlbum.guideOpen || !state.collectionAlbum.art.ready) throw new Error("Guide close lost the underlying Collection page");
  await clickTarget(page, "collectionAlbumGuide");
  await page.waitForFunction(() => window.__COLOR_ESCAPE__.getDebugState().collection.artReady);
  if ((await debug(page)).collection.selectedId !== "colored-grid") throw new Error("Reopening guide lost the player's selected item");
  await context.close();
}

{
  const legacySave = fixtureSave(200, 199);
  legacySave.metaDiscovery.collectionViewedItemIds = [...legacyIds];
  const { context, page, beforeOpen } = await createScenario("legacy-read-ids", { width: 320, height: 568 }, legacySave);
  const addedIds = ["flip-door", "colored-grid", "bomb"];
  if (addedIds.some(id => !beforeOpen.discovery.collection.pendingItemIds.includes(id))) {
    throw new Error("Legacy read IDs must not silently mark new workbook mechanisms as read");
  }
  for (const id of addedIds) {
    const state = await clickCollectionItem(page, id);
    if (!state.discovery.state.collectionViewedItemIds.includes(id)
      || legacyIds.some(legacy => !state.discovery.state.collectionViewedItemIds.includes(legacy))) {
      throw new Error("Reading a new mechanism must retain all historical read IDs");
    }
  }
  await context.close();
}

const boundaries = [];
for (const highest of [...new Set(Object.values(unlockLevels))].sort((a, b) => a - b)) {
  const label = "reached-lv" + highest;
  const { context, page } = await createScenario(label, { width: 720, height: 1584 }, fixtureSave(highest, highest - 1));
  let state = await debug(page);
  assertCatalogue(state, highest, label);
  if (state.collection.selectedId !== "color-exit" || state.collection.scrollOffset !== 0) {
    throw new Error("New guide must open at row one and select the earliest unlock");
  }
  if (!state.collection.selectedUnlocked || !state.collection.selectedDetail) {
    throw new Error("The first color-exit item must be unlocked at every valid level");
  }
  for (const id of mechanismIds.filter(id => unlockLevels[id] === highest)) {
    state = await clickCollectionItem(page, id);
    if (!state.collection.selectedUnlocked || !state.collection.selectedDetail) throw new Error(id + " did not unlock on arrival at Lv" + highest);
  }
  const nextLocked = mechanismIds.filter(id => unlockLevels[id] > highest).sort((a,b) => unlockLevels[a] - unlockLevels[b])[0];
  if (nextLocked) {
    state = await clickCollectionItem(page, nextLocked);
    if (state.collection.selectedUnlocked || state.collection.selectedDetail
      || state.collection.displayedDetail !== "到达第 " + unlockLevels[nextLocked] + " 关后解锁") throw new Error(nextLocked + " unlocked early");
  }
  assertCatalogue(state, highest, label);
  await page.screenshot({ path: resolve(output, "boundary-" + highest + "-720x1584.png") });
  boundaries.push({ highestLevel: highest, unlocked: state.collection.unlocked, nextLocked });
  await context.close();
}
await browser.close();
if (errors.length) throw new Error("Mechanism guide browser errors:\n" + errors.join("\n"));
const sourcesAfter = await sourceHashes();
if (JSON.stringify(sourcesBefore) !== JSON.stringify(sourcesAfter)) throw new Error("Mechanism guide sources changed during the E2E; rerun on a stable snapshot");
const report = { schemaVersion: 5, status: "pass", isolatedContexts: true, mechanicCount: 15, totalEntries: 15,
  ascendingUnlockOrder: mechanismIds, unlockLevels, legacyStoredReadIdsPreserved: legacyIds, boundaries, viewports: results,
  sourcesBefore, sourcesAfter, browserErrors: errors };
await writeFile(resolve(output, "mechanism-guide-report.json"), JSON.stringify(report, null, 2) + "\n", "utf8");
console.log("Mechanism catalogue PASS: exact 15 ascending-unlock entries, every real unlock boundary, legacy read-ID preservation, pointer selection/scrolling, 44px targets and three viewports. " + output);
