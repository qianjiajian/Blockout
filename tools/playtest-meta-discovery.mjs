import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";

const output = fileURLToPath(new URL("../playtest-results/meta-discovery/", import.meta.url));
const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
const SAVE_KEY = "color-escape-save-v1";
await mkdir(output, { recursive: true });

const browser = await chromium.launch({ headless: true });
const errors = [];
const results = [];

const attachErrors = (page, label) => {
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`${label}: ${message.text()}`);
  });
  page.on("pageerror", (error) => errors.push(`${label}: ${error.message}`));
};

const debug = (page) => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());

const waitFor = async (page, predicate, description, timeout = 15_000, forbiddenScreens = []) => {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const state = await debug(page);
    if (forbiddenScreens.includes(state.screen)) {
      throw new Error(`Meta discovery: ${description} unexpectedly visited ${state.screen}`);
    }
    if (predicate(state)) return state;
    await page.waitForTimeout(20);
  }
  const state = await debug(page);
  throw new Error(`Meta discovery: timeout waiting for ${description}; got ${state.screen} Lv${state.level.id}`);
};

const mapLogical = async (page, x, y) => {
  const state = await debug(page);
  const canvas = await page.locator("canvas").boundingBox();
  if (!canvas) throw new Error("Meta discovery: canvas has no bounds");
  return {
    x: canvas.x + state.viewportTransform.offsetX + x * state.viewportTransform.scale,
    y: canvas.y + state.viewportTransform.offsetY + y * state.viewportTransform.scale,
  };
};

const clickLogical = async (page, x, y) => {
  const point = await mapLogical(page, x, y);
  await page.mouse.click(point.x, point.y);
};

const clickTarget = async (page, name) => {
  const state = await debug(page);
  const rect = state.interactionTargets?.targets?.[name]?.hit;
  if (!rect) throw new Error(`Meta discovery: missing interaction target ${name}`);
  await clickLogical(page, rect.x + rect.width / 2, rect.y + rect.height / 2);
};

const solveLevel = (page, levelId) => page.evaluate(async (id) => {
  const [{ getLevel }, { solveLevelForValidation }] = await Promise.all([
    import("/src/core/levels.ts"),
    import("/src/core/levelSolver.ts"),
  ]);
  return solveLevelForValidation(getLevel(id));
}, levelId);

const performDrag = async (page, drag) => {
  const state = await debug(page);
  const block = state.puzzle.blocks.find((candidate) => candidate.id === drag.blockId);
  if (!block) throw new Error(`Meta discovery: missing route block ${drag.blockId} in Lv${state.level.id}`);
  const [anchorX, anchorY] = block.shape[0];
  const logicalPoint = (x, y) => ({
    x: state.board.innerX + (x + anchorX + 0.5) * state.board.cell,
    y: state.board.innerY + (y + anchorY + 0.5) * state.board.cell,
  });
  const startLogical = logicalPoint(block.x, block.y);
  const start = await mapLogical(page, startLogical.x, startLogical.y);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  for (const [x, y] of drag.path) {
    const logical = logicalPoint(x, y);
    const target = await mapLogical(page, logical.x, logical.y);
    await page.mouse.move(target.x, target.y, { steps: 3 });
  }
  await page.mouse.up();
  await waitFor(
    page,
    (candidate) => candidate.activePointer == null && !candidate.dragMotion,
    `Lv${state.level.id} ${drag.blockId} pointer release`,
    2_000,
  );
  await page.waitForTimeout(drag.exitSide ? 430 : 35);
};

const solveCurrentLevel = async (page, levelId) => {
  const solution = await solveLevel(page, levelId);
  if (!solution.solved || !solution.drags.length) {
    throw new Error(`Meta discovery: Lv${levelId} has no verified route`);
  }
  for (const drag of solution.drags) await performDrag(page, drag);
  return solution;
};

const readStoredSave = (page) => page.evaluate((key) => JSON.parse(localStorage.getItem(key)), SAVE_KEY);

const readStoredSaveBypassingFault = (page) => page.evaluate((key) => {
  const probe = globalThis.__metaDiscoveryStorageFault;
  const raw = probe?.originalGet
    ? probe.originalGet.call(localStorage, key)
    : localStorage.getItem(key);
  return JSON.parse(raw);
}, SAVE_KEY);

const expectDiscovery = (state, collection, daily, context) => {
  if (state.discovery.collection.pending !== collection || state.discovery.daily.pending !== daily) {
    throw new Error(`Meta discovery: ${context} expected ${collection}/${daily}, got ${JSON.stringify(state.discovery)}`);
  }
  if (!state.discovery.artReady) throw new Error(`Meta discovery: ${context} badge art is not ready`);
};

const expectBadgeInsideEntry = (badge, entry, context) => {
  const centerX = badge.x + badge.width / 2;
  const centerY = badge.y + badge.height / 2;
  if (centerX < entry.x || centerX > entry.x + entry.width || centerY < entry.y || centerY > entry.y + entry.height) {
    throw new Error(`Meta discovery: ${context} badge center escaped its existing entry hit area`);
  }
};

const makeSeedSave = (overrides = {}) => ({
  schemaVersion: 1,
  currentLevel: 1,
  highestLevel: 1,
  coins: 1000,
  sound: false,
  haptic: false,
  reducedMotion: true,
  featureSeen: ["basics", "ice-door", "ice-block", "layer", "shutter"],
  boosterUnlockSeen: ["time", "rocket", "pulse"],
  boosters: { time: 3, rocket: 3, pulse: 3 },
  bestStars: {},
  bestMoves: {},
  rewardedLevels: [],
  dailyStreak: 0,
  lastDailyCompletedDay: "",
  metaDiscovery: { collectionViewedThroughLevel: 1, dailyUnlockSeen: false },
  ...overrides,
});

const createSeededScenario = async (label, save, viewport = { width: 496, height: 1078 }) => {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  attachErrors(page, label);
  await page.goto(playtestUrl, { waitUntil: "domcontentloaded" });
  const updateId = (await debug(page)).updateNotice.id;
  await page.evaluate(({ key, value, lastSeenUpdate }) => {
    localStorage.clear();
    localStorage.setItem(key, JSON.stringify({ ...value, lastSeenUpdate }));
  }, { key: SAVE_KEY, value: save, lastSeenUpdate: updateId });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => {
    const state = window.__COLOR_ESCAPE__?.getDebugState();
    return state?.art.ready && state?.discovery.artReady;
  }, undefined, { timeout: 15_000 });
  return { context, page };
};

const installStorageFaultPlan = (page, mode) => page.evaluate(({ key, nextMode }) => {
  const originalSet = Storage.prototype.setItem;
  const originalGet = Storage.prototype.getItem;
  globalThis.__metaDiscoveryStorageFault = {
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
    const probe = globalThis.__metaDiscoveryStorageFault;
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
        throw new DOMException(`meta discovery ${activeMode}`, activeMode === "rejected" ? "QuotaExceededError" : "UnknownError");
      }
    }
    return originalSet.call(this, name, value);
  };
  Storage.prototype.getItem = function getItem(name) {
    const probe = globalThis.__metaDiscoveryStorageFault;
    if (name === key && probe.failReadsRemaining > 0) {
      probe.failReadsRemaining -= 1;
      probe.reads.push({ blocked: true });
      throw new DOMException("meta discovery verification unavailable", "UnknownError");
    }
    if (name === key) probe.reads.push({ blocked: false });
    return originalGet.call(this, name);
  };
}, { key: SAVE_KEY, nextMode: mode });

const storageFaultProbe = (page) => page.evaluate(() => {
  const { mode, writes, reads, faultWritesRemaining, failReadsRemaining } = globalThis.__metaDiscoveryStorageFault;
  return { mode, writes, reads, faultWritesRemaining, failReadsRemaining };
});

const expectedVerificationReads = (mode) => {
  if (mode === "rejected" || mode === "write-then-throw") return [false];
  if (mode === "unresolved" || mode === "write-then-unresolved") return [true, true];
  return [true];
};

const verificationOutcome = (mode) => {
  if (mode === "rejected") return "rejected";
  if (mode === "unresolved" || mode === "write-then-unresolved") return "unknown";
  return "committed";
};

const runCollectionFaultScenario = async (mode) => {
  const label = `collection-${mode}`;
  const { context, page } = await createSeededScenario(label, makeSeedSave({
    currentLevel: 4,
    highestLevel: 4,
    rewardedLevels: [1, 2, 3],
    bestStars: { "1": 3, "2": 3, "3": 3 },
    bestMoves: { "1": 2, "2": 10, "3": 12 },
  }));
  let state = await debug(page);
  expectDiscovery(state, true, false, `${label} baseline`);
  await installStorageFaultPlan(page, mode);
  await clickTarget(page, "navigation.4");
  state = await waitFor(page, (candidate) => candidate.screen === "records" && !candidate.navigation.transition, `${label} navigation`);
  const runtimeAcknowledged = mode !== "rejected";
  const durableAcknowledged = runtimeAcknowledged && mode !== "unresolved";
  expectDiscovery(state, !runtimeAcknowledged, false, `${label} runtime result`);
  let stored = await readStoredSaveBypassingFault(page);
  if (stored.metaDiscovery.collectionViewedThroughLevel !== (durableAcknowledged ? 3 : 1)) {
    throw new Error(`Meta discovery: ${label} persisted the wrong acknowledgement result`);
  }
  const probe = await storageFaultProbe(page);
  const retriedUnknown = mode === "unknown" || mode === "write-then-unknown"
    || mode === "unresolved" || mode === "write-then-unresolved";
  const expectedWrites = retriedUnknown ? 2 : 1;
  const expectedSecondMode = mode === "unresolved" || mode === "write-then-unresolved" ? mode : "open";
  if (probe.writes.length !== expectedWrites
    || probe.writes[0].payload.metaDiscovery.collectionViewedThroughLevel !== 3
    || (expectedWrites === 2 && (probe.writes[1].mode !== expectedSecondMode
      || JSON.stringify(probe.writes[1].payload) !== JSON.stringify(probe.writes[0].payload)))
    || JSON.stringify(probe.reads.map((read) => read.blocked)) !== JSON.stringify(expectedVerificationReads(mode))) {
    throw new Error(`Meta discovery: ${label} did not exercise its intended storage boundary`);
  }
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().discovery?.artReady === true, undefined, { timeout: 15_000 });
  state = await debug(page);
  expectDiscovery(state, !durableAcknowledged, false, `${label} reload`);
  stored = await readStoredSave(page);
  if (stored.metaDiscovery.collectionViewedThroughLevel !== (durableAcknowledged ? 3 : 1)) {
    throw new Error(`Meta discovery: ${label} reload changed the durable outcome`);
  }
  results.push({
    label,
    verificationOutcome: verificationOutcome(mode),
    durableAcknowledged,
    runtimeAcknowledged,
    pendingAfterReload: state.discovery.collection.pending,
  });
  await context.close();
};

const runDailyFaultScenario = async (mode) => {
  const label = `daily-${mode}`;
  const { context, page } = await createSeededScenario(label, makeSeedSave({
    currentLevel: 6,
    highestLevel: 6,
    rewardedLevels: [1, 2, 3, 4, 5],
    bestStars: { "1": 3, "2": 3, "3": 3, "4": 3, "5": 3 },
    bestMoves: { "1": 2, "2": 10, "3": 12, "4": 11, "5": 12 },
    metaDiscovery: { collectionViewedThroughLevel: 3, dailyUnlockSeen: false },
  }));
  let state = await debug(page);
  expectDiscovery(state, true, true, `${label} baseline`);
  await installStorageFaultPlan(page, mode);
  await clickTarget(page, "homeDaily");
  state = await waitFor(page, (candidate) => candidate.screen === "playing" && candidate.daily.mode, `${label} daily start`);
  const committed = mode !== "rejected";
  expectDiscovery(state, true, !committed, `${label} runtime result`);
  let stored = await readStoredSaveBypassingFault(page);
  if (stored.metaDiscovery.dailyUnlockSeen !== committed || !stored.activeRun?.daily) {
    throw new Error(`Meta discovery: ${label} did not preserve both the acknowledgement outcome and daily journal`);
  }
  const probe = await storageFaultProbe(page);
  const retriedUnknown = mode === "unknown" || mode === "write-then-unknown"
    || mode === "unresolved" || mode === "write-then-unresolved";
  const expectedWrites = retriedUnknown ? 3 : 2;
  if (probe.writes.length !== expectedWrites
    || probe.writes[0].payload.metaDiscovery.dailyUnlockSeen !== true
    || (retriedUnknown && (probe.writes[0].payload.activeRun != null
      || probe.writes[1].payload.activeRun != null
      || JSON.stringify(probe.writes[1].payload) !== JSON.stringify(probe.writes[0].payload)))
    || probe.writes.at(-1).mode !== "open"
    || probe.writes.at(-1).payload.metaDiscovery.dailyUnlockSeen !== committed
    || !probe.writes.at(-1).payload.activeRun?.daily
    || JSON.stringify(probe.reads.map((read) => read.blocked)) !== JSON.stringify(expectedVerificationReads(mode))) {
    throw new Error(`Meta discovery: ${label} did not exercise its intended storage boundary`);
  }
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().discovery?.artReady === true, undefined, { timeout: 15_000 });
  state = await debug(page);
  if (state.screen !== "home" || state.level.id !== 6 || state.daily.mode || state.activeRun) {
    throw new Error(`Meta discovery: ${label} did not recover the interrupted daily run safely`);
  }
  expectDiscovery(state, true, !committed, `${label} reload`);
  stored = await readStoredSave(page);
  if (stored.metaDiscovery.dailyUnlockSeen !== committed || stored.activeRun) {
    throw new Error(`Meta discovery: ${label} reload changed the durable outcome`);
  }
  results.push({
    label,
    verificationOutcome: verificationOutcome(mode),
    durableAcknowledged: committed,
    pendingAfterReload: state.discovery.daily.pending,
  });
  await context.close();
};

const runScenario = async (label, viewport) => {
  const context = await browser.newContext({ viewport });
  const pristine = await context.storageState();
  if (pristine.origins.length !== 0) throw new Error(`Meta discovery: ${label} context was not clean`);
  const page = await context.newPage();
  attachErrors(page, label);
  await page.goto(playtestUrl, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => {
    const state = window.__COLOR_ESCAPE__?.getDebugState();
    return state?.art.ready && state?.discovery.artReady;
  }, undefined, { timeout: 15_000 });

  let state = await debug(page);
  let stored;
  if (state.screen !== "home" || state.level.id !== 1 || state.progression.highestLevel !== 1
    || state.economy.rewardedLevels.length !== 0 || state.activeRun
    || JSON.stringify(state.discovery.state) !== JSON.stringify({ collectionViewedThroughLevel: 1, dailyUnlockSeen: false })) {
    throw new Error(`Meta discovery: ${label} did not start from a genuine fresh save`);
  }
  expectDiscovery(state, false, false, `${label} fresh home`);
  const featureIntroMilestones = await page.evaluate(async () => {
    const { getLevel } = await import("/src/core/levels.ts");
    return [6, 7, 8].map((levelId) => [levelId, getLevel(levelId).featureIntro?.kind ?? null]);
  });
  if (JSON.stringify(featureIntroMilestones) !== JSON.stringify([
    [6, "ice-block"],
    [7, "ice-door"],
    [8, "layer"],
  ])) {
    throw new Error(`Meta discovery: ${label} Lv6/Lv7/Lv8 feature intro milestones drifted: ${JSON.stringify(featureIntroMilestones)}`);
  }

  await clickTarget(page, "homePlay");
  state = await waitFor(page, (candidate) => candidate.screen === "playing" && candidate.level.id === 1, `${label} Lv1 start`);
  if (state.activeRun?.levelId !== 1 || state.activeRun.daily) {
    throw new Error(`Meta discovery: ${label} visible start did not open a journaled ordinary Lv1 run`);
  }
  for (const levelId of [1, 2, 3]) {
    if (state.level.id !== levelId || state.screen !== "playing") {
      throw new Error(`Meta discovery: ${label} expected playing Lv${levelId}`);
    }
    await solveCurrentLevel(page, levelId);
    state = await waitFor(
      page,
      (candidate) => candidate.screen === "playing" && candidate.level.id === levelId + 1,
      `${label} Lv${levelId} automatic continuation`,
      15_000,
      ["win"],
    );
    if (levelId === 1) {
      expectDiscovery(state, true, false, `${label} after Lv1`);
      if (state.discovery.collection.newestUnseenLevel !== 2
        || state.discovery.state.collectionViewedThroughLevel !== 1) {
        throw new Error(`Meta discovery: ${label} mechanism milestone did not unlock at Lv2`);
      }
    }
    if (levelId === 2) {
      expectDiscovery(state, true, false, `${label} after Lv2`);
      if (state.discovery.collection.newestUnseenLevel !== 2
        || state.discovery.state.collectionViewedThroughLevel !== 1) {
        throw new Error(`Meta discovery: ${label} Lv2 mechanism milestone was not retained`);
      }
    }
  }

  expectDiscovery(state, true, false, `${label} after Lv3`);
  if (state.discovery.collection.newestUnseenLevel !== 3
    || state.discovery.state.collectionViewedThroughLevel !== 1) {
    throw new Error(`Meta discovery: ${label} Lv3 color milestone did not supersede the Lv2 mechanism milestone`);
  }

  // Return through the visible pause menu, not a debug level switch, then view
  // the real Collection tab to acknowledge the milestone.
  await clickTarget(page, "pause");
  await waitFor(page, (candidate) => candidate.screen === "paused", `${label} pause`);
  await clickTarget(page, "pauseHome");
  state = await waitFor(page, (candidate) => candidate.screen === "home" && candidate.level.id === 4, `${label} Lv4 home`);
  state = await waitFor(
    page,
    (candidate) => candidate.boosterUnlock.seen.includes("time") || candidate.boosterUnlock.pending?.visible,
    `${label} time-booster unlock prompt`,
  );
  if (state.boosterUnlock.pending?.visible) {
    await clickTarget(page, "boosterUnlockToast");
  }
  state = await waitFor(
    page,
    (candidate) => candidate.boosterUnlock.seen.includes("time") && !candidate.boosterUnlock.pending,
    `${label} time-booster toast acknowledgement`,
  );
  stored = await readStoredSave(page);
  if (!stored.boosterUnlockSeen?.includes("time")) {
    throw new Error(`Meta discovery: ${label} time-booster acknowledgement was not persisted`);
  }
  expectDiscovery(state, true, false, `${label} collection home badge`);
  expectBadgeInsideEntry(
    state.discovery.collection.badgeRect,
    state.interactionTargets.targets["navigation.4"].hit,
    `${label} collection`,
  );
  await page.screenshot({ path: resolve(output, `${label}-01-collection-badge.png`) });

  await clickTarget(page, "navigation.4");
  state = await waitFor(
    page,
    (candidate) => candidate.screen === "records" && !candidate.navigation.transition,
    `${label} collection navigation`,
  );
  expectDiscovery(state, false, false, `${label} viewed collection`);
  await clickTarget(page, "collection.3");
  state = await debug(page);
  if (state.collection.selected !== 3 || state.collection.unlocked !== 4) {
    throw new Error(`Meta discovery: ${label} newly unlocked yellow collection card is not usable`);
  }
  stored = await readStoredSave(page);
  if (stored.metaDiscovery?.collectionViewedThroughLevel !== 3) {
    throw new Error(`Meta discovery: ${label} collection acknowledgement was not persisted`);
  }
  await page.screenshot({ path: resolve(output, `${label}-02-collection-open.png`) });

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => {
    const state = window.__COLOR_ESCAPE__?.getDebugState();
    return state?.art.ready && state?.discovery.artReady;
  }, undefined, { timeout: 15_000 });
  state = await debug(page);
  if (state.screen !== "home" || state.level.id !== 4) throw new Error(`Meta discovery: ${label} collection reload did not return home`);
  expectDiscovery(state, false, false, `${label} collection reload`);
  stored = await readStoredSave(page);
  if (JSON.stringify(stored.metaDiscovery) !== JSON.stringify({ collectionViewedThroughLevel: 3, dailyUnlockSeen: false })) {
    throw new Error(`Meta discovery: ${label} collection reload changed the persisted discovery state`);
  }

  await clickTarget(page, "homePlay");
  await waitFor(page, (candidate) => candidate.screen === "playing" && candidate.level.id === 4, `${label} Lv4 restart`);
  await solveCurrentLevel(page, 4);
  state = await waitFor(page, (candidate) => candidate.screen === "win" && candidate.level.id === 4, `${label} Lv4 win`);
  if (state.winAction !== "下一关" || state.winSecondaryAction !== "返回主页") {
    throw new Error(`Meta discovery: ${label} Lv4 result actions drifted`);
  }
  await clickTarget(page, "modalPrimary");
  state = await waitFor(
    page,
    (candidate) => candidate.level.id === 5 && (candidate.screen === "feature" || candidate.screen === "playing"),
    `${label} Lv5 entry`,
  );
  if (state.screen === "feature") {
    await clickTarget(page, "modalPrimary");
    await waitFor(page, (candidate) => candidate.screen === "playing" && candidate.level.id === 5, `${label} Lv5 feature intro`);
  }
  await solveCurrentLevel(page, 5);
  state = await waitFor(page, (candidate) => candidate.screen === "win" && candidate.level.id === 5, `${label} Lv5 win`);
  if (state.winAction !== "下一关" || state.winSecondaryAction !== "返回主页") {
    throw new Error(`Meta discovery: ${label} Lv5 result actions drifted`);
  }
  expectDiscovery(state, true, true, `${label} after Lv5 settlement`);
  if (state.discovery.collection.newestUnseenLevel !== 6) {
    throw new Error(`Meta discovery: ${label} Lv5 settlement did not expose the coalesced Lv6 mechanism milestone`);
  }
  if (state.progression.highestLevel !== 6 || state.progression.highestLevel !== state.level.id + 1) {
    throw new Error(`Meta discovery: ${label} Lv5 did not advance the journey to Lv6`);
  }
  await clickTarget(page, "modalSecondary");
  state = await waitFor(page, (candidate) => candidate.screen === "home" && candidate.level.id === 6, `${label} Lv6 home`);
  expectDiscovery(state, true, true, `${label} Lv6 collection and daily home badges`);
  if (state.discovery.collection.newestUnseenLevel !== 6) {
    throw new Error(`Meta discovery: ${label} three-mechanic Lv6 milestone was not coalesced at Lv6`);
  }
  expectBadgeInsideEntry(
    state.discovery.daily.badgeRect,
    state.interactionTargets.targets.homeDaily.hit,
    `${label} daily`,
  );
  await page.screenshot({ path: resolve(output, `${label}-03-daily-badge.png`) });

  // Numeric ice, frozen exits and multilayer shells now unlock together at
  // Lv6. Opening Collection acknowledges the one coalesced milestone while
  // leaving the independent daily-discovery badge pending.
  await clickTarget(page, "navigation.4");
  state = await waitFor(
    page,
    (candidate) => candidate.screen === "records" && !candidate.navigation.transition,
    `${label} Lv6 collection navigation`,
  );
  expectDiscovery(state, false, true, `${label} viewed Lv6 collection milestone`);
  await clickTarget(page, "collectionCategory.mechanisms");
  state = await debug(page);
  const lv6MechanismIds = ["numeric-ice", "frozen-exit", "multilayer-shell"];
  if (state.collection.category !== "mechanisms" || state.collection.unlocked !== 6
    || !lv6MechanismIds.every((id) => state.collection.visibleItemIds.includes(id))) {
    throw new Error(`Meta discovery: ${label} Lv6 Collection did not expose all three new mechanisms`);
  }
  for (const [index, id] of lv6MechanismIds.entries()) {
    await clickTarget(page, `collection.${index + 3}`);
    state = await debug(page);
    if (state.collection.selectedId !== id || !state.collection.selectedUnlocked || !state.collection.selectedDetail) {
      throw new Error(`Meta discovery: ${label} Lv6 mechanism card ${id} is not visibly usable`);
    }
  }
  stored = await readStoredSave(page);
  if (stored.metaDiscovery?.collectionViewedThroughLevel !== 6) {
    throw new Error(`Meta discovery: ${label} Lv6 mechanism acknowledgement was not persisted`);
  }
  await page.screenshot({ path: resolve(output, `${label}-04-lv6-mechanisms-open.png`) });
  await clickTarget(page, "navigation.2");
  state = await waitFor(
    page,
    (candidate) => candidate.screen === "home" && !candidate.navigation.transition,
    `${label} return home after Lv6 collection`,
  );
  expectDiscovery(state, false, true, `${label} independent daily badge after Lv6 collection`);

  const dailyBeforeStart = { levelId: state.daily.selectedLevel, today: state.daily.today };
  await clickTarget(page, "homeDaily");
  state = await waitFor(page, (candidate) => candidate.screen === "playing" && candidate.daily.mode, `${label} daily start`);
  if (!state.economy.rewardedLevels.includes(state.level.id)
    || !state.activeRun?.daily || state.activeRun.returnLevelId !== 6
    || state.activeRun.dailyDayKey !== state.daily.challengeDayKey
    || (dailyBeforeStart.today === state.daily.today && state.level.id !== dailyBeforeStart.levelId)) {
    throw new Error(`Meta discovery: ${label} daily badge did not lead to the real daily run`);
  }
  const playedDailyLevel = state.level.id;
  expectDiscovery(state, false, false, `${label} daily acknowledged`);
  stored = await readStoredSave(page);
  if (stored.metaDiscovery?.dailyUnlockSeen !== true) {
    throw new Error(`Meta discovery: ${label} daily acknowledgement was not persisted`);
  }
  await page.screenshot({ path: resolve(output, `${label}-05-daily-open.png`) });

  const progressionSnapshot = {
    coins: state.economy.coins,
    highestLevel: state.progression.highestLevel,
    rewardedLevels: [...state.economy.rewardedLevels].sort((left, right) => left - right),
    bestStars: state.progression.bestStars,
    bestMoves: state.progression.bestMoves,
    lastCompletedDay: state.daily.lastCompletedDay,
    streak: state.daily.streak,
  };
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => {
    const state = window.__COLOR_ESCAPE__?.getDebugState();
    return state?.art.ready && state?.discovery.artReady;
  }, undefined, { timeout: 15_000 });
  state = await debug(page);
  expectDiscovery(state, false, false, `${label} final reload`);
  stored = await readStoredSave(page);
  if (state.screen !== "home" || state.level.id !== 6 || state.daily.mode || state.activeRun
    || !state.daily.unlocked || state.daily.completedToday
    || state.economy.coins !== progressionSnapshot.coins
    || state.progression.highestLevel !== progressionSnapshot.highestLevel
    || JSON.stringify([...state.economy.rewardedLevels].sort((left, right) => left - right)) !== JSON.stringify([1, 2, 3, 4, 5])
    || JSON.stringify(state.progression.bestStars) !== JSON.stringify(progressionSnapshot.bestStars)
    || JSON.stringify(state.progression.bestMoves) !== JSON.stringify(progressionSnapshot.bestMoves)
    || state.daily.lastCompletedDay !== progressionSnapshot.lastCompletedDay
    || state.daily.streak !== progressionSnapshot.streak
    || JSON.stringify(stored.metaDiscovery) !== JSON.stringify({ collectionViewedThroughLevel: 6, dailyUnlockSeen: true })) {
    throw new Error(`Meta discovery: ${label} final reload changed settled progression`);
  }
  await page.screenshot({ path: resolve(output, `${label}-06-final-reload.png`) });

  results.push({
    label,
    viewport,
    finalLevel: state.level.id,
    finalCoins: state.economy.coins,
    rewardedLevels: state.economy.rewardedLevels,
    metaDiscovery: state.discovery.state,
    dailyLevel: playedDailyLevel,
  });
  await context.close();
};

try {
  await runScenario("720x1584", { width: 720, height: 1584 });
  await runScenario("320x568", { width: 320, height: 568 });
  for (const mode of ["rejected", "write-then-throw", "unknown", "write-then-unknown", "unresolved", "write-then-unresolved"]) {
    await runCollectionFaultScenario(mode);
    await runDailyFaultScenario(mode);
  }
  await writeFile(resolve(output, "meta-discovery-report.json"), `${JSON.stringify({ results, errors }, null, 2)}\n`, "utf8");
  if (errors.length) throw new Error(`Meta discovery browser errors:\n${errors.join("\n")}`);
  console.log("Clean-storage Lv1–5 discovery, coalesced Lv6 mechanism cards, split Lv6/Lv7/Lv8 feature metadata, and all storage acknowledgement fault outcomes passed at 720x1584/320x568.");
} finally {
  await browser.close();
}
