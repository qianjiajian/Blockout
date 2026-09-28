import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";

const output = fileURLToPath(new URL("../playtest-results/save-resilience/", import.meta.url));
const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
const saveKey = "color-escape-save-v1";
await mkdir(output, { recursive: true });

const browser = await chromium.launch({ headless: true });
const errors = [];
const attachErrors = (page) => {
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("pageerror", (error) => errors.push(error.message));
};
const debug = (page) => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const waitForReady = (page) => page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().art.ready);
const seedRaw = async (page, raw) => {
  await page.goto(playtestUrl, { waitUntil: "networkidle" });
  await page.evaluate(({ key, value }) => localStorage.setItem(key, value), { key: saveKey, value: raw });
  await page.reload({ waitUntil: "networkidle" });
  await waitForReady(page);
};
const persisted = (page) => page.evaluate((key) => JSON.parse(localStorage.getItem(key)), saveKey);

const malformed = await browser.newPage({ viewport: { width: 496, height: 1078 } });
attachErrors(malformed);
await seedRaw(malformed, "{ definitely-not-json");
let state = await debug(malformed);
let stored = await persisted(malformed);
if (state.screen !== "home" || state.level.id !== 1 || state.progression.highestLevel !== 1
  || state.economy.coins !== 1000 || stored.schemaVersion !== 1) {
  throw new Error("Save resilience E2E: malformed JSON did not recover to a persisted default save");
}
await malformed.screenshot({ path: resolve(output, "01-malformed-json-recovered.png") });
await malformed.close();

const primitive = await browser.newPage({ viewport: { width: 496, height: 1078 } });
attachErrors(primitive);
await seedRaw(primitive, JSON.stringify("valid JSON, invalid save shape"));
state = await debug(primitive);
if (state.screen !== "home" || state.progression.highestLevel !== 1 || state.settings.sound !== true
  || state.settings.haptic !== true || state.settings.reducedMotion !== false) {
  throw new Error("Save resilience E2E: a primitive JSON save escaped the object guard");
}
await primitive.close();

const poisoned = await browser.newPage({ viewport: { width: 720, height: 1584 } });
attachErrors(poisoned);
const oversizedFeatureSeen = ["basics", "basics", null, 5, "x".repeat(65), "valid", ...Array.from({ length: 80 }, (_, index) => `feature-${index}`)];
await seedRaw(poisoned, JSON.stringify({
  schemaVersion: 1,
  currentLevel: "-20",
  highestLevel: "999",
  coins: "-500",
  sound: "yes",
  haptic: false,
  reducedMotion: "false",
  featureSeen: oversizedFeatureSeen,
  boosterUnlockSeen: ["time", "invalid", null, "time"],
  boosters: { time: -4, rocket: 120, pulse: "4" },
  bestStars: { "1": "3", "2": 99, "3": 0, "101": 2, bad: 2 },
  bestMoves: { "1": "8", "2": -5, "3": "1000000", "0": 5, "101": 5 },
  rewardedLevels: [1, 1, 100, 101, -1, 2.5, "2"],
  dailyStreak: "10000",
  lastDailyCompletedDay: "2026-99-99",
  lastSeenUpdate: "u".repeat(200),
  activeRun: "not-an-object",
  unknownInjectedField: { large: true },
}));
state = await debug(poisoned);
stored = await persisted(poisoned);
if (state.level.id !== 1 || state.progression.highestLevel !== 100 || state.economy.coins !== 0
  || state.settings.sound !== true || state.settings.haptic !== false || state.settings.reducedMotion !== false) {
  throw new Error(`Save resilience E2E: scalar normalization drifted ${JSON.stringify(state)}`);
}
if (JSON.stringify(state.economy.boosters) !== JSON.stringify({ time: 0, rocket: 9, pulse: 4 })
  || JSON.stringify(state.progression.bestStars) !== JSON.stringify({ "1": 3, "2": 3 })
  || JSON.stringify(state.progression.bestMoves) !== JSON.stringify({ "1": 8, "3": 99999 })) {
  throw new Error("Save resilience E2E: inventory or level records were not bounded");
}
if (stored.featureSeen.length !== 64 || stored.featureSeen[0] !== "basics" || stored.featureSeen[1] !== "valid"
  || JSON.stringify(stored.boosterUnlockSeen) !== JSON.stringify(["time"])
  || JSON.stringify(stored.rewardedLevels) !== JSON.stringify([1, 100])
  || stored.dailyStreak !== 999 || stored.lastDailyCompletedDay !== "" || stored.lastSeenUpdate.length !== 64
  || JSON.stringify(stored.metaDiscovery) !== JSON.stringify({ collectionViewedThroughLevel: 100, dailyUnlockSeen: true })
  || "activeRun" in stored || "unknownInjectedField" in stored) {
  throw new Error(`Save resilience E2E: collection/date/whitelist cleanup drifted ${JSON.stringify(stored)}`);
}
await poisoned.screenshot({ path: resolve(output, "02-poisoned-fields-sanitized-720x1584.png") });
await poisoned.close();

const interrupted = await browser.newPage({ viewport: { width: 496, height: 1078 } });
attachErrors(interrupted);
await seedRaw(interrupted, JSON.stringify({
  schemaVersion: 1,
  currentLevel: 9,
  highestLevel: 10,
  coins: 800,
  sound: false,
  haptic: false,
  reducedMotion: false,
  featureSeen: ["basics"],
  boosterUnlockSeen: ["time", "rocket", "pulse"],
  boosters: { time: 8, rocket: 4, pulse: 0 },
  bestStars: {},
  bestMoves: {},
  rewardedLevels: [1, 2, 3],
  dailyStreak: 0,
  lastDailyCompletedDay: "",
  lastSeenUpdate: "2026-09-05-r95",
  activeRun: {
    levelId: 999,
    returnLevelId: 4,
    daily: true,
    dailyDayKey: "2026-09-04",
    boosterSpent: { time: 99, rocket: 99, pulse: 99 },
  },
}));
state = await debug(interrupted);
stored = await persisted(interrupted);
if (state.screen !== "home" || state.level.id !== 4 || state.activeRun
  || JSON.stringify(state.economy.boosters) !== JSON.stringify({ time: 9, rocket: 9, pulse: 9 })
  || JSON.stringify(state.discovery.state) !== JSON.stringify({ collectionViewedThroughLevel: 6, dailyUnlockSeen: true })
  || "activeRun" in stored) {
  throw new Error("Save resilience E2E: legacy Daily interrupted-run refund escaped stock-safe recovery");
}
await interrupted.close();

const unavailable = await browser.newPage({ viewport: { width: 320, height: 568 } });
attachErrors(unavailable);
await unavailable.addInitScript((key) => {
  const originalGet = Storage.prototype.getItem;
  const originalSet = Storage.prototype.setItem;
  Storage.prototype.getItem = function getItem(name) {
    if (name === key) throw new DOMException("storage read denied", "SecurityError");
    return originalGet.call(this, name);
  };
  Storage.prototype.setItem = function setItem(name, value) {
    if (name === key) throw new DOMException("storage write denied", "QuotaExceededError");
    return originalSet.call(this, name, value);
  };
}, saveKey);
await unavailable.goto(playtestUrl, { waitUntil: "networkidle" });
await waitForReady(unavailable);
state = await debug(unavailable);
if (state.screen !== "home" || state.progression.highestLevel !== 1
  || state.storage.status !== "unavailable" || state.storage.baselineReady !== false) {
  throw new Error("Save resilience E2E: unavailable browser storage did not enter protected startup");
}
const scale = Math.min(320 / 496, 568 / 1078);
const offsetX = (320 - 496 * scale) / 2;
const offsetY = (568 - 1078 * scale) / 2;
await unavailable.mouse.click(offsetX + 248 * scale, offsetY + 812 * scale);
state = await debug(unavailable);
if (state.screen !== "home" || state.storage.baselineReady !== false) {
  throw new Error("Save resilience E2E: protected startup allowed gameplay without a trusted baseline");
}
await unavailable.screenshot({ path: resolve(output, "03-storage-unavailable-protected-320x568.png") });
await unavailable.close();

const transient = await browser.newPage({ viewport: { width: 496, height: 1078 } });
attachErrors(transient);
await transient.goto(playtestUrl, { waitUntil: "networkidle" });
const durableSave = {
  schemaVersion: 1,
  currentLevel: 47,
  highestLevel: 80,
  coins: 5000,
  sound: false,
  haptic: false,
  reducedMotion: true,
  featureSeen: ["basics", "ice"],
  boosterUnlockSeen: ["time", "rocket", "pulse"],
  boosters: { time: 7, rocket: 5, pulse: 3 },
  bestStars: { "3": 3, "47": 2 },
  bestMoves: { "3": 13, "47": 18 },
  rewardedLevels: [1, 2, 3, 10, 47],
  dailyStreak: 12,
  lastDailyCompletedDay: "2026-09-04",
  lastSeenUpdate: "2026-09-05-r102",
};
const seededRaw = JSON.stringify(durableSave);
await transient.evaluate(({ key, raw }) => localStorage.setItem(key, raw), { key: saveKey, raw: seededRaw });
await transient.addInitScript((key) => {
  const originalGet = Storage.prototype.getItem;
  const originalSet = Storage.prototype.setItem;
  let failNextRead = true;
  window.__SAVE_WRITE_COUNT__ = 0;
  Storage.prototype.getItem = function getItem(name) {
    if (name === key && failNextRead) {
      failNextRead = false;
      throw new DOMException("one-shot storage read failure", "SecurityError");
    }
    return originalGet.call(this, name);
  };
  Storage.prototype.setItem = function setItem(name, value) {
    if (name === key) window.__SAVE_WRITE_COUNT__ += 1;
    return originalSet.call(this, name, value);
  };
}, saveKey);
await transient.reload({ waitUntil: "networkidle" });
await waitForReady(transient);
state = await debug(transient);
const protectedSnapshot = await transient.evaluate((key) => ({
  raw: localStorage.getItem(key),
  writes: window.__SAVE_WRITE_COUNT__,
}), saveKey);
if (state.storage.status !== "unavailable" || state.storage.baselineReady !== false
  || protectedSnapshot.writes !== 0 || protectedSnapshot.raw !== seededRaw) {
  throw new Error(`Save resilience E2E: one-shot read failure touched the durable save ${JSON.stringify({ state: state.storage, protectedSnapshot })}`);
}
await transient.screenshot({ path: resolve(output, "04-one-shot-read-failure-protected.png") });
await transient.mouse.click(248, 755);
await transient.waitForFunction(() => window.__COLOR_ESCAPE__.getDebugState().storage.baselineReady === true);
state = await debug(transient);
stored = await persisted(transient);
if (state.screen !== "home" || state.level.id !== 47 || state.progression.highestLevel !== 80
  || state.economy.coins !== 5000 || JSON.stringify(state.economy.boosters) !== JSON.stringify(durableSave.boosters)
  || JSON.stringify(state.economy.rewardedLevels) !== JSON.stringify(durableSave.rewardedLevels)
  || stored.currentLevel !== 47 || stored.highestLevel !== 80
  || JSON.stringify(state.discovery.state) !== JSON.stringify({ collectionViewedThroughLevel: 51, dailyUnlockSeen: true })
  || stored.lastDailyCompletedDay !== "2026-09-04") {
  throw new Error("Save resilience E2E: retry did not restore the complete durable baseline");
}
await transient.screenshot({ path: resolve(output, "05-one-shot-read-recovered.png") });
await transient.close();

await browser.close();
if (errors.length) throw new Error(`Save resilience browser errors:\n${errors.join("\n")}`);
console.log("Malformed JSON, primitive saves, poisoned fields, interrupted-run recovery, protected unavailable storage, and one-shot read recovery passed.");
