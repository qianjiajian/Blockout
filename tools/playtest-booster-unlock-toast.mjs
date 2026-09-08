import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";

const output = fileURLToPath(new URL("../playtest-results/booster-unlock-toast/", import.meta.url));
const runtimeSource = fileURLToPath(new URL("../src/game/ColorEscapeGame.ts", import.meta.url));
const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
const SAVE_KEY = "color-escape-save-v1";
await mkdir(output, { recursive: true });

const makeSave = (overrides = {}) => ({
  schemaVersion: 1,
  currentLevel: 1,
  highestLevel: 1,
  coins: 1000,
  sound: false,
  haptic: false,
  reducedMotion: false,
  featureSeen: ["basics"],
  boosterUnlockSeen: [],
  metaDiscovery: { collectionViewedThroughLevel: 1, dailyUnlockSeen: false },
  boosters: { time: 3, rocket: 3, pulse: 3 },
  bestStars: {},
  bestMoves: {},
  rewardedLevels: [],
  dailyStreak: 0,
  lastDailyCompletedDay: "",
  lastSeenUpdate: "2026-09-05-r95",
  ...overrides,
});
const debug = (page) => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const seed = async (page, save, acknowledgeUpdate = true) => {
  await page.goto(playtestUrl, { waitUntil: "networkidle" });
  const currentUpdateId = await page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState().updateNotice.id);
  await page.evaluate(({ key, value, updateId, shouldAcknowledgeUpdate }) => {
    localStorage.setItem(key, JSON.stringify({
      ...value,
      lastSeenUpdate: shouldAcknowledgeUpdate ? updateId : value.lastSeenUpdate,
    }));
  }, {
    key: SAVE_KEY,
    value: save,
    updateId: currentUpdateId,
    shouldAcknowledgeUpdate: acknowledgeUpdate,
  });
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForFunction(
    () => window.__COLOR_ESCAPE__?.getDebugState().art.ready === true,
    undefined,
    { timeout: 15_000 },
  );
  await page.waitForTimeout(40);
};
const attachErrors = (page, errors) => {
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("pageerror", (error) => errors.push(error.message));
};

const browser = await chromium.launch({ headless: true });
const errors = [];
const resilienceResults = [];

const readStoredSave = (page) => page.evaluate((key) => JSON.parse(localStorage.getItem(key)), SAVE_KEY);

const readStoredSaveBypassingFault = (page) => page.evaluate((key) => {
  const probe = globalThis.__acknowledgementStorageFault;
  const raw = probe?.originalGet
    ? probe.originalGet.call(localStorage, key)
    : localStorage.getItem(key);
  return JSON.parse(raw);
}, SAVE_KEY);

const installStorageFaultPlan = (page, mode) => page.evaluate(({ key, nextMode }) => {
  const originalSet = Storage.prototype.setItem;
  const originalGet = Storage.prototype.getItem;
  globalThis.__acknowledgementStorageFault = {
    mode: nextMode,
    writes: [],
    reads: [],
    faultWritesRemaining: nextMode === "unresolved" || nextMode === "write-then-unresolved" ? 2 : 1,
    failReadsRemaining: nextMode === "unresolved" || nextMode === "write-then-unresolved"
      ? 2
      : (nextMode === "unknown" || nextMode === "write-then-unknown" ? 1 : 0),
    originalGet,
  };
  Storage.prototype.setItem = function setItem(name, value) {
    const probe = globalThis.__acknowledgementStorageFault;
    if (name === key) {
      const activeMode = probe.mode;
      probe.writes.push({ mode: activeMode, payload: JSON.parse(value) });
      if (probe.faultWritesRemaining > 0) {
        probe.faultWritesRemaining -= 1;
        if (probe.faultWritesRemaining === 0) probe.mode = "open";
        if (activeMode === "write-then-throw" || activeMode === "write-then-unknown"
          || activeMode === "write-then-unresolved") {
          originalSet.call(this, name, value);
        }
        throw new DOMException(
          `acknowledgement ${activeMode}`,
          activeMode === "rejected" ? "QuotaExceededError" : "UnknownError",
        );
      }
    }
    return originalSet.call(this, name, value);
  };
  Storage.prototype.getItem = function getItem(name) {
    const probe = globalThis.__acknowledgementStorageFault;
    if (name === key && probe.failReadsRemaining > 0) {
      probe.failReadsRemaining -= 1;
      probe.reads.push({ blocked: true });
      throw new DOMException("acknowledgement verification unavailable", "UnknownError");
    }
    if (name === key) probe.reads.push({ blocked: false });
    return originalGet.call(this, name);
  };
}, { key: SAVE_KEY, nextMode: mode });

const storageFaultProbe = (page) => page.evaluate(() => {
  const { mode, writes, reads, faultWritesRemaining, failReadsRemaining } = globalThis.__acknowledgementStorageFault;
  return { mode, writes, reads, faultWritesRemaining, failReadsRemaining };
});

const expectedVerificationReads = (mode) => {
  if (mode === "rejected" || mode === "write-then-throw") return [false];
  if (mode === "unresolved" || mode === "write-then-unresolved") return [true, true];
  return [true];
};

const expectedDurableAcknowledgement = (mode) => !["rejected", "unresolved"].includes(mode);

const withoutField = (value, field) => {
  const copy = structuredClone(value);
  delete copy[field];
  return copy;
};

const logicalPoint = (state, x, y) => ({
  x: state.viewportTransform.offsetX + x * state.viewportTransform.scale,
  y: state.viewportTransform.offsetY + y * state.viewportTransform.scale,
});

const legacy = await browser.newPage({ viewport: { width: 496, height: 1078 } });
attachErrors(legacy, errors);
const legacySave = makeSave({ currentLevel: 10, highestLevel: 10 });
delete legacySave.boosterUnlockSeen;
await seed(legacy, legacySave);
let state = await debug(legacy);
if (state.boosterUnlock.pending || state.boosterUnlock.seen.join(",") !== "time,rocket,pulse") {
  throw new Error(`Unlock toast E2E: legacy migration replayed historical unlocks ${JSON.stringify(state.boosterUnlock)}`);
}
await legacy.close();

const standard = await browser.newPage({ viewport: { width: 720, height: 1584 } });
attachErrors(standard, errors);
await seed(standard, makeSave({ currentLevel: 4, highestLevel: 4 }));
state = await debug(standard);
if (state.boosterUnlock.pending?.kind !== "time" || !state.boosterUnlock.pending.visible
  || state.boosterUnlock.pending.duration !== 3.6 || !state.boosterUnlock.artReady) {
  throw new Error(`Unlock toast E2E: Lv4 standard prompt did not appear ${JSON.stringify(state.boosterUnlock)}`);
}
await standard.screenshot({ path: resolve(output, "01-lv4-time-standard-720x1584.png") });

await standard.evaluate(() => window.__COLOR_ESCAPE__.loadLevel(4, true));
await standard.waitForTimeout(80);
state = await debug(standard);
const block = state.puzzle.blocks[0];
const [cellX, cellY] = block.shape[0];
const transform = state.viewportTransform;
const pointer = {
  x: transform.offsetX + (state.board.innerX + (block.x + cellX + 0.5) * state.board.cell) * transform.scale,
  y: transform.offsetY + (state.board.innerY + (block.y + cellY + 0.5) * state.board.cell) * transform.scale,
};
await standard.mouse.move(pointer.x, pointer.y);
await standard.mouse.down();
state = await debug(standard);
if (state.activePointer == null || state.boosterUnlock.pending?.kind !== "time") {
  throw new Error("Unlock toast E2E: visible prompt blocked a gameplay pointer-down");
}
await standard.mouse.up();

state = await debug(standard);
const toastRect = state.boosterUnlock.pending.rect;
const toastPoint = {
  x: transform.offsetX + (toastRect.x + toastRect.width / 2) * transform.scale,
  y: transform.offsetY + (toastRect.y + toastRect.height / 2) * transform.scale,
};
await standard.mouse.click(toastPoint.x, toastPoint.y);
state = await debug(standard);
if (state.boosterUnlock.pending || state.boosterUnlock.seen.join(",") !== "time") {
  throw new Error("Unlock toast E2E: explicit dismissal did not persist the seen state");
}
await standard.reload({ waitUntil: "networkidle" });
await standard.waitForTimeout(280);
state = await debug(standard);
if (state.boosterUnlock.pending || state.boosterUnlock.seen.join(",") !== "time") {
  throw new Error("Unlock toast E2E: dismissed prompt reappeared after restart");
}
await standard.close();

const reduced = await browser.newPage({ viewport: { width: 496, height: 1078 } });
attachErrors(reduced, errors);
await seed(reduced, makeSave({ currentLevel: 7, highestLevel: 7, reducedMotion: true, boosterUnlockSeen: ["time"] }));
state = await debug(reduced);
if (state.boosterUnlock.pending?.kind !== "rocket" || state.boosterUnlock.pending.duration !== 2.4) {
  throw new Error("Unlock toast E2E: reduced-motion rocket prompt contract drifted");
}
await reduced.screenshot({ path: resolve(output, "02-lv7-rocket-reduced.png") });
await reduced.waitForTimeout(2_500);
state = await debug(reduced);
if (state.boosterUnlock.pending || state.boosterUnlock.seen.join(",") !== "time,rocket") {
  throw new Error("Unlock toast E2E: reduced-motion prompt did not auto-dismiss and persist");
}
await reduced.close();

const feature = await browser.newPage({ viewport: { width: 496, height: 1078 } });
attachErrors(feature, errors);
await seed(feature, makeSave({ currentLevel: 6, highestLevel: 6, boosterUnlockSeen: ["time"] }));
await feature.evaluate(() => {
  const game = window.__COLOR_ESCAPE__;
  game.save.highestLevel = 7;
  game.loadLevel(7, false);
  game.beginSelectedChallenge();
});
await feature.waitForTimeout(80);
state = await debug(feature);
if (state.screen !== "feature" || state.boosterUnlock.pending) {
  throw new Error("Unlock toast E2E: Lv7 rocket prompt covered the ice-door introduction");
}
await feature.mouse.click(248, 755);
await feature.waitForTimeout(80);
state = await debug(feature);
if (state.screen !== "playing" || state.boosterUnlock.pending?.kind !== "rocket" || !state.boosterUnlock.pending.visible) {
  throw new Error("Unlock toast E2E: pending rocket prompt did not wait for the Lv7 ice-door introduction");
}
await feature.screenshot({ path: resolve(output, "03-lv7-rocket-after-feature.png") });
await feature.close();

const tutorial = await browser.newPage({ viewport: { width: 496, height: 1078 } });
attachErrors(tutorial, errors);
await seed(tutorial, makeSave({ currentLevel: 1, highestLevel: 4, featureSeen: [] }));
await tutorial.evaluate(() => window.__COLOR_ESCAPE__.loadLevel(1, true));
await tutorial.waitForTimeout(80);
state = await debug(tutorial);
if (!state.onboarding.guide || state.boosterUnlock.pending?.visible) {
  throw new Error("Unlock toast E2E: pending prompt competed with the first-drag tutorial");
}
const guide = state.onboarding.guide;
await tutorial.mouse.move(guide.start.x, guide.start.y);
await tutorial.mouse.down();
await tutorial.mouse.move(guide.points[1].x, guide.points[1].y, { steps: 6 });
await tutorial.mouse.up();
await tutorial.waitForTimeout(30);
state = await debug(tutorial);
if (!state.onboarding.basicsSeen || state.boosterUnlock.pending?.kind !== "time" || !state.boosterUnlock.pending.visible) {
  throw new Error("Unlock toast E2E: prompt did not resume after the first-drag lesson");
}
await tutorial.close();

const small = await browser.newPage({ viewport: { width: 320, height: 568 } });
attachErrors(small, errors);
await seed(small, makeSave({ currentLevel: 10, highestLevel: 10, boosterUnlockSeen: ["time", "rocket"] }));
state = await debug(small);
if (state.boosterUnlock.pending?.kind !== "pulse" || !state.boosterUnlock.pending.visible) {
  throw new Error("Unlock toast E2E: 320x568 prompt was not visible");
}
await small.screenshot({ path: resolve(output, "04-lv10-pulse-320x568.png") });
await small.close();

const faultModes = [
  "rejected",
  "write-then-throw",
  "unknown",
  "write-then-unknown",
  "unresolved",
  "write-then-unresolved",
];

for (const mode of faultModes) {
  const page = await browser.newPage({ viewport: { width: 720, height: 1584 } });
  attachErrors(page, errors);
  await seed(page, makeSave({ currentLevel: 4, highestLevel: 4 }));
  const baseline = await readStoredSave(page);
  let current = await debug(page);
  if (current.boosterUnlock.pending?.kind !== "time" || current.boosterUnlock.seen.length !== 0) {
    throw new Error(`Acknowledgement resilience: booster ${mode} did not start from an unseen time prompt ${JSON.stringify(current.boosterUnlock)}`);
  }

  await installStorageFaultPlan(page, mode);
  const toast = current.boosterUnlock.pending.rect;
  const point = logicalPoint(current, toast.x + toast.width / 2, toast.y + toast.height / 2);
  await page.mouse.click(point.x, point.y);
  await page.waitForTimeout(40);
  current = await debug(page);
  if (current.boosterUnlock.pending || current.boosterUnlock.seen.join(",") !== "time") {
    throw new Error(`Acknowledgement resilience: booster ${mode} repeated inside the acknowledged session`);
  }

  const probe = await storageFaultProbe(page);
  const retried = ["unknown", "write-then-unknown", "unresolved", "write-then-unresolved"].includes(mode);
  const expectedWrites = retried ? 2 : 1;
  const expectedReads = expectedVerificationReads(mode);
  if (probe.writes.length !== expectedWrites
    || JSON.stringify(probe.reads.map((read) => read.blocked)) !== JSON.stringify(expectedReads)
    || probe.writes[0].payload.boosterUnlockSeen.join(",") !== "time"
    || (retried && JSON.stringify(probe.writes[1].payload) !== JSON.stringify(probe.writes[0].payload))) {
    throw new Error(`Acknowledgement resilience: booster ${mode} did not use the expected immutable verification path`);
  }
  if (JSON.stringify(withoutField(probe.writes[0].payload, "boosterUnlockSeen"))
    !== JSON.stringify(withoutField(baseline, "boosterUnlockSeen"))) {
    throw new Error(`Acknowledgement resilience: booster ${mode} changed unrelated save fields`);
  }

  const durableExpected = expectedDurableAcknowledgement(mode);
  let stored = await readStoredSaveBypassingFault(page);
  const durableAcknowledged = stored.boosterUnlockSeen.includes("time");
  if (durableAcknowledged !== durableExpected) {
    throw new Error(`Acknowledgement resilience: booster ${mode} durable outcome drifted`);
  }

  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(320);
  current = await debug(page);
  const pendingAfterReload = current.boosterUnlock.pending?.kind === "time";
  if (pendingAfterReload === durableExpected) {
    throw new Error(`Acknowledgement resilience: booster ${mode} reload did not follow durable storage`);
  }
  if (mode === "rejected") {
    await page.screenshot({ path: resolve(output, "05-rejected-reload-recovery-720x1584.png") });
  }

  if (!durableExpected) {
    const retryToast = current.boosterUnlock.pending.rect;
    const retryPoint = logicalPoint(current, retryToast.x + retryToast.width / 2, retryToast.y + retryToast.height / 2);
    await page.mouse.click(retryPoint.x, retryPoint.y);
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(280);
    current = await debug(page);
    stored = await readStoredSave(page);
    if (current.boosterUnlock.pending || !stored.boosterUnlockSeen.includes("time")) {
      throw new Error(`Acknowledgement resilience: booster ${mode} could not recover on the next healthy launch`);
    }
  }

  resilienceResults.push({
    case: "booster",
    mode,
    writes: probe.writes.length,
    readPattern: probe.reads.map((read) => read.blocked),
    runtimeAcknowledged: true,
    durableAcknowledged,
    pendingAfterReload,
    retryPayloadIdentical: !retried
      || JSON.stringify(probe.writes[1].payload) === JSON.stringify(probe.writes[0].payload),
    unrelatedSaveFieldsPreserved: true,
    recoveredOnHealthyLaunch: true,
  });
  await page.close();
}

const updateFault = await browser.newPage({ viewport: { width: 496, height: 1078 } });
attachErrors(updateFault, errors);
await seed(updateFault, makeSave({ lastSeenUpdate: "" }), false);
let updateState = await debug(updateFault);
if (!updateState.updateNotice.toastVisible || updateState.updateNotice.seen) {
  throw new Error("Acknowledgement resilience: update notice rejected scenario did not start unseen");
}
await updateFault.mouse.click(248, 178);
await updateFault.waitForTimeout(60);
if ((await debug(updateFault)).screen !== "updates") {
  throw new Error("Acknowledgement resilience: update notice did not open before fault injection");
}
await installStorageFaultPlan(updateFault, "rejected");
await updateFault.mouse.click(248, 755);
await updateFault.waitForTimeout(40);
updateState = await debug(updateFault);
const updateProbe = await storageFaultProbe(updateFault);
const updateStored = await readStoredSaveBypassingFault(updateFault);
if (updateState.screen !== "home" || !updateState.updateNotice.seen || updateState.updateNotice.toastVisible
  || updateStored.lastSeenUpdate !== "" || updateProbe.writes.length !== 1
  || JSON.stringify(updateProbe.reads.map((read) => read.blocked)) !== JSON.stringify([false])) {
  throw new Error("Acknowledgement resilience: rejected update acknowledgement did not stay session-only");
}
await updateFault.reload({ waitUntil: "networkidle" });
await updateFault.waitForTimeout(280);
updateState = await debug(updateFault);
if (!updateState.updateNotice.toastVisible || updateState.updateNotice.seen) {
  throw new Error("Acknowledgement resilience: rejected update acknowledgement did not replay after reload");
}
resilienceResults.push({
  case: "update-notice",
  mode: "rejected",
  writes: updateProbe.writes.length,
  readPattern: updateProbe.reads.map((read) => read.blocked),
  runtimeAcknowledged: true,
  durableAcknowledged: false,
  pendingAfterReload: true,
  retryPayloadIdentical: true,
});
await updateFault.close();

const featureFault = await browser.newPage({ viewport: { width: 496, height: 1078 } });
attachErrors(featureFault, errors);
await seed(featureFault, makeSave({
  currentLevel: 6,
  highestLevel: 6,
  featureSeen: ["basics"],
  boosterUnlockSeen: ["time", "rocket", "pulse"],
}));
await featureFault.evaluate(() => {
  const game = window.__COLOR_ESCAPE__;
  game.loadLevel(6, false);
  game.beginSelectedChallenge();
});
await featureFault.waitForTimeout(60);
if ((await debug(featureFault)).screen !== "feature") {
  throw new Error("Acknowledgement resilience: feature unresolved scenario did not open the Lv6 intro");
}
await installStorageFaultPlan(featureFault, "unresolved");
await featureFault.mouse.click(248, 755);
await featureFault.waitForTimeout(40);
let featureState = await debug(featureFault);
const featureRuntimeSeen = await featureFault.evaluate(() => [...window.__COLOR_ESCAPE__.save.featureSeen]);
const featureProbe = await storageFaultProbe(featureFault);
const featureStored = await readStoredSaveBypassingFault(featureFault);
if (featureState.screen !== "playing" || !featureRuntimeSeen.includes("ice-block")
  || featureStored.featureSeen.includes("ice-block") || featureProbe.writes.length !== 2
  || JSON.stringify(featureProbe.writes[0].payload) !== JSON.stringify(featureProbe.writes[1].payload)
  || JSON.stringify(featureProbe.reads.map((read) => read.blocked)) !== JSON.stringify([true, true])) {
  throw new Error("Acknowledgement resilience: unresolved feature acknowledgement did not preserve session progress");
}
await featureFault.reload({ waitUntil: "networkidle" });
await featureFault.waitForTimeout(280);
await featureFault.evaluate(() => {
  const game = window.__COLOR_ESCAPE__;
    game.loadLevel(6, false);
  game.beginSelectedChallenge();
});
await featureFault.waitForTimeout(60);
featureState = await debug(featureFault);
if (featureState.screen !== "feature") {
  throw new Error("Acknowledgement resilience: unresolved feature acknowledgement did not replay from durable storage");
}
resilienceResults.push({
  case: "feature-intro",
  mode: "unresolved",
  writes: featureProbe.writes.length,
  readPattern: featureProbe.reads.map((read) => read.blocked),
  runtimeAcknowledged: true,
  durableAcknowledged: false,
  pendingAfterReload: true,
  retryPayloadIdentical: true,
});
await featureFault.close();

const saturatedFeature = await browser.newPage({ viewport: { width: 496, height: 1078 } });
attachErrors(saturatedFeature, errors);
await seed(saturatedFeature, makeSave({
  currentLevel: 6,
  highestLevel: 6,
  featureSeen: Array.from({ length: 64 }, (_, index) => `legacy-token-${index}`),
  boosterUnlockSeen: ["time", "rocket", "pulse"],
}));
await saturatedFeature.evaluate(() => {
  const game = window.__COLOR_ESCAPE__;
  game.loadLevel(6, false);
  game.beginSelectedChallenge();
});
await saturatedFeature.waitForTimeout(60);
await saturatedFeature.mouse.click(248, 755);
await saturatedFeature.waitForTimeout(40);
let saturatedState = await debug(saturatedFeature);
let saturatedFeatureSeen = await saturatedFeature.evaluate(() => [...window.__COLOR_ESCAPE__.save.featureSeen]);
if (saturatedState.screen !== "playing" || saturatedFeatureSeen[0] !== "ice-block"
  || saturatedFeatureSeen.length !== 64) {
  throw new Error("Acknowledgement resilience: a saturated legacy feature list evicted the new acknowledgement");
}
await saturatedFeature.reload({ waitUntil: "networkidle" });
await saturatedFeature.waitForTimeout(280);
await saturatedFeature.evaluate(() => {
  const game = window.__COLOR_ESCAPE__;
  game.loadLevel(6, false);
  game.beginSelectedChallenge();
});
await saturatedFeature.waitForTimeout(60);
saturatedState = await debug(saturatedFeature);
saturatedFeatureSeen = await saturatedFeature.evaluate(() => [...window.__COLOR_ESCAPE__.save.featureSeen]);
if (saturatedState.screen !== "playing" || saturatedFeatureSeen[0] !== "ice-block") {
  throw new Error("Acknowledgement resilience: saturated feature acknowledgement did not survive reload");
}
resilienceResults.push({
  case: "feature-intro-saturated-legacy-list",
  mode: "committed",
  writes: 1,
  readPattern: [],
  runtimeAcknowledged: true,
  durableAcknowledged: true,
  pendingAfterReload: false,
  retryPayloadIdentical: true,
  boundedFeatureCount: saturatedFeatureSeen.length,
});
await saturatedFeature.close();

const basicsFault = await browser.newPage({ viewport: { width: 496, height: 1078 } });
attachErrors(basicsFault, errors);
await seed(basicsFault, makeSave({
  currentLevel: 1,
  highestLevel: 1,
  featureSeen: [],
  boosterUnlockSeen: ["time", "rocket", "pulse"],
}));
await basicsFault.evaluate(() => window.__COLOR_ESCAPE__.loadLevel(1, true));
await basicsFault.waitForTimeout(80);
let basicsState = await debug(basicsFault);
const basicsGuide = basicsState.onboarding.guide;
if (!basicsGuide?.points?.[1]) {
  throw new Error("Acknowledgement resilience: basics write-then-unresolved scenario has no opening guide step");
}
await installStorageFaultPlan(basicsFault, "write-then-unresolved");
await basicsFault.mouse.move(basicsGuide.start.x, basicsGuide.start.y);
await basicsFault.mouse.down();
await basicsFault.mouse.move(basicsGuide.points[1].x, basicsGuide.points[1].y, { steps: 6 });
await basicsFault.waitForTimeout(50);
basicsState = await debug(basicsFault);
const basicsProbe = await storageFaultProbe(basicsFault);
const basicsStored = await readStoredSaveBypassingFault(basicsFault);
if (!basicsState.onboarding.basicsSeen || basicsState.onboarding.guide || !basicsState.puzzle.started
  || basicsState.activePointer == null || !basicsStored.featureSeen.includes("basics")
  || basicsProbe.writes.length !== 2
  || JSON.stringify(basicsProbe.writes[0].payload) !== JSON.stringify(basicsProbe.writes[1].payload)
  || JSON.stringify(basicsProbe.reads.map((read) => read.blocked)) !== JSON.stringify([true, true])) {
  throw new Error("Acknowledgement resilience: write-then-unresolved basics acknowledgement broke the live drag");
}
await basicsFault.mouse.up();
await basicsFault.reload({ waitUntil: "networkidle" });
await basicsFault.waitForTimeout(280);
await basicsFault.evaluate(() => window.__COLOR_ESCAPE__.loadLevel(1, true));
await basicsFault.waitForTimeout(80);
basicsState = await debug(basicsFault);
if (!basicsState.onboarding.basicsSeen || basicsState.onboarding.guide) {
  throw new Error("Acknowledgement resilience: landed basics acknowledgement replayed after reload");
}
resilienceResults.push({
  case: "basic-drag-tutorial",
  mode: "write-then-unresolved",
  writes: basicsProbe.writes.length,
  readPattern: basicsProbe.reads.map((read) => read.blocked),
  runtimeAcknowledged: true,
  durableAcknowledged: true,
  pendingAfterReload: false,
  retryPayloadIdentical: true,
  livePointerPreserved: true,
});
await basicsFault.close();

const sourceSha256 = createHash("sha256").update(await readFile(runtimeSource)).digest("hex").toUpperCase();
await writeFile(resolve(output, "acknowledgement-resilience-report.json"), `${JSON.stringify({
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  playtestUrl,
  runtimeSource: {
    path: "src/game/ColorEscapeGame.ts",
    sha256: sourceSha256,
  },
  scenarioCount: resilienceResults.length,
  scenarios: resilienceResults,
}, null, 2)}\n`);

await browser.close();
if (errors.length) throw new Error(`Unlock toast browser errors:\n${errors.join("\n")}`);
console.log(`One-time prompts, ${resilienceResults.length} acknowledgement resilience scenarios, legacy migration, non-blocking input, restart persistence, reduced motion, feature/tutorial deferral, and 320x568 visuals passed.`);
