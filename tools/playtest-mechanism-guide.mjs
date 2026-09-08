import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";

const output = fileURLToPath(new URL("../playtest-results/mechanism-guide/", import.meta.url));
const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
const saveKey = "color-escape-save-v1";
await mkdir(output, { recursive: true });

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
  featureSeen: ["basics", "ice-block", "ice-door", "layer", "generator", "elevator", "conveyor", "star"],
  boosterUnlockSeen: ["time", "rocket", "pulse"],
  boosters: { time: 3, rocket: 3, pulse: 3 },
  bestStars: {},
  bestMoves: {},
  rewardedLevels: Array.from({ length: rewardedThrough }, (_, index) => index + 1),
  dailyStreak: 0,
  lastDailyCompletedDay: "",
  metaDiscovery: { collectionViewedThroughLevel, dailyUnlockSeen: true },
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
  if (state.screen !== "records") throw new Error(`Mechanism guide E2E: ${label} did not open Collection`);
  return { context, page, state, beforeOpen };
};

const assertLayout = (state, label) => {
  const layout = state.collection.layout;
  const categoryBottom = Math.max(...Object.values(layout.categoryRects).map((rect) => rect.y + rect.height));
  if (categoryBottom > layout.firstCardRect.y
    || layout.lastCardRect.y + layout.lastCardRect.height > layout.detailRect.y
    || layout.detailRect.y + layout.detailRect.height > layout.navigationTop) {
    throw new Error(`Mechanism guide E2E: ${label} layout overlaps (${JSON.stringify(layout)})`);
  }
  if (layout.categoryRects.colors.y < 102 + state.navigation.headerOffset + 4) {
    throw new Error(`Mechanism guide E2E: ${label} categories overlap the safe-area-shifted header`);
  }
  const relevantTargets = Object.entries(state.interactionTargets.targets)
    .filter(([name]) => name.startsWith("collection"));
  for (const [name, target] of relevantTargets) {
    if (target.cssWidth + 0.01 < 44 || target.cssHeight + 0.01 < 44) {
      throw new Error(`Mechanism guide E2E: ${label} ${name} is below 44 CSS px (${target.cssWidth}x${target.cssHeight})`);
    }
  }
  const intersectionArea = (left, right) => Math.max(0, Math.min(left.x + left.width, right.x + right.width) - Math.max(left.x, right.x))
    * Math.max(0, Math.min(left.y + left.height, right.y + right.height) - Math.max(left.y, right.y));
  for (let leftIndex = 0; leftIndex < relevantTargets.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < relevantTargets.length; rightIndex += 1) {
      const [leftName, left] = relevantTargets[leftIndex];
      const [rightName, right] = relevantTargets[rightIndex];
      if (intersectionArea(left.hit, right.hit) > 0) {
        throw new Error(`Mechanism guide E2E: ${label} ${leftName} overlaps ${rightName}`);
      }
    }
  }
};

const expectedIds = [
  "color-exit",
  "irregular-board",
  "irregular-block",
  "numeric-ice",
  "frozen-exit",
  "multilayer-shell",
  "generator",
  "elevator",
  "shutter",
  "conveyor",
  "star",
];

for (const viewport of [
  { label: "720x1584", width: 720, height: 1584, query: {} },
  { label: "320x568", width: 320, height: 568, query: {} },
  { label: "safe-720x1584", width: 720, height: 1584, query: { safeTop: 80, safeBottom: 50 } },
]) {
  const { context, page, beforeOpen } = await createScenario(
    `complete-${viewport.label}`,
    { width: viewport.width, height: viewport.height },
    fixtureSave(100, 100, 91),
    viewport.query,
  );
  if (beforeOpen.discovery.collection.pending) {
    throw new Error(`Mechanism guide E2E: ${viewport.label} emitted a false Lv100 discovery after the final Lv91 guide unlock`);
  }
  let state = await debug(page);
  if (state.collection.category !== "colors" || state.collection.total !== 8
    || state.collection.unlocked !== 8 || state.collection.allTotal !== 19) {
    throw new Error(`Mechanism guide E2E: ${viewport.label} color catalogue is incomplete (${JSON.stringify(state.collection)})`);
  }
  state = await clickTarget(page, "collectionCategory.mechanisms");
  if (state.collection.category !== "mechanisms" || state.collection.total !== 11
    || state.collection.unlocked !== 11 || state.collection.allTotal !== 19
    || JSON.stringify(state.collection.visibleItemIds) !== JSON.stringify(expectedIds)
    || !state.collection.artReady) {
    throw new Error(`Mechanism guide E2E: ${viewport.label} mechanism catalogue is incomplete (${JSON.stringify(state.collection)})`);
  }
  assertLayout(state, viewport.label);
  await page.screenshot({ path: resolve(output, `01-mechanisms-${viewport.label}.png`) });

  const entries = [];
  for (let index = 0; index < expectedIds.length; index += 1) {
    state = await clickTarget(page, `collection.${index}`, 35);
    if (state.collection.selected !== index || state.collection.selectedId !== expectedIds[index]
      || !state.collection.selectedTitle || !state.collection.selectedDetail) {
      throw new Error(`Mechanism guide E2E: ${viewport.label} card ${index} is not inspectable (${JSON.stringify(state.collection)})`);
    }
    entries.push({
      id: state.collection.selectedId,
      title: state.collection.selectedTitle,
      effect: state.collection.selectedDetail,
    });
  }
  state = await clickTarget(page, "collection.9");
  await page.screenshot({ path: resolve(output, `02-conveyor-detail-${viewport.label}.png`) });
  results.push({ viewport: viewport.label, unlocked: state.collection.unlocked, entries });
  await context.close();
}

{
  const { context, page } = await createScenario(
    "reached-lv6",
    { width: 720, height: 1584 },
    fixtureSave(6, 5),
  );
  let state = await clickTarget(page, "collectionCategory.mechanisms");
  if (state.collection.unlocked !== 6) {
    throw new Error(`Mechanism guide E2E: reaching Lv6 should unlock six guide entries (${JSON.stringify(state.collection)})`);
  }
  for (const [index, id] of [[3, "numeric-ice"], [4, "frozen-exit"], [5, "multilayer-shell"]]) {
    state = await clickTarget(page, `collection.${index}`);
    if (state.collection.selectedId !== id || !state.collection.selectedUnlocked) {
      throw new Error(`Mechanism guide E2E: the Lv6 ${id} rule was not available on arrival`);
    }
  }
  state = await clickTarget(page, "collection.6");
  if (state.collection.selectedId !== "generator" || state.collection.unlocked !== 6
    || state.collection.selectedUnlocked || state.collection.selectedDetail
    || state.collection.displayedDetail !== "到达第 35 关后解锁") {
    throw new Error("Mechanism guide E2E: locked future rules were not inspectable without unlocking");
  }
  await page.screenshot({ path: resolve(output, "03-lv6-future-rule-locked-720x1584.png") });
  await context.close();
}

await browser.close();
if (errors.length) throw new Error(`Mechanism guide browser errors:\n${errors.join("\n")}`);

const report = {
  schemaVersion: 1,
  mechanicCount: expectedIds.length,
  colorCount: 8,
  totalEntries: 19,
  reachedLevel6UnlockedMechanics: 6,
  viewports: results,
  browserErrors: errors,
};
await writeFile(resolve(output, "mechanism-guide-report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log("Complete 11-mechanic guide, arrival unlocks, 44px targets, 720x1584 and 320x568 visuals passed.");
