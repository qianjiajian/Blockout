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

const openMechanismGuide = async (page, label) => {
  await clickTarget(page, "navigation.4");
  await waitFor(page, (state) => state.screen === "records" && !state.navigation.transition
    && state.collectionAlbum.art.ready && state.collectionAlbum.art.artworkReady,
  `${label} collection album`);
  await clickTarget(page, "collectionAlbumGuide");
  return waitFor(page, (state) => state.screen === "mechanismGuide" && state.collection.guideOpen
    && state.art.formalPage.loaded === "records" && !state.art.formalPage.error,
  `${label} mechanism guide`);
};

const closeMechanismGuide = async (page, label) => {
  await clickTarget(page, "mechanismGuideClose");
  return waitFor(page, (state) => state.screen === "records" && !state.collection.guideOpen
    && state.collectionAlbum.art.ready, `${label} guide closed to album`);
};

const swipeCollection = async (page, toward) => {
  const state = await debug(page);
  const rect = state.collection.layout.listViewportRect;
  const fromRatio = toward === "later" ? 0.78 : 0.22;
  const toRatio = toward === "later" ? 0.22 : 0.78;
  const start = await mapLogical(page, rect.x + rect.width / 2, rect.y + rect.height * fromRatio);
  const end = await mapLogical(page, rect.x + rect.width / 2, rect.y + rect.height * toRatio);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 7 });
  await page.mouse.up();
  await page.waitForTimeout(50);
};

const revealCollectionItem = async (page, id) => {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const state = await debug(page);
    const targetName = `collection.${id}`;
    if (state.interactionTargets.targets[targetName]) return targetName;
    const targetIndex = state.collection.orderedItemIds.indexOf(id);
    const visibleIndices = Object.keys(state.interactionTargets.targets)
      .filter((name) => name.startsWith("collection."))
      .map((name) => state.collection.orderedItemIds.indexOf(name.slice("collection.".length)))
      .filter((index) => index >= 0);
    if (targetIndex < 0 || visibleIndices.length === 0) throw new Error(`Meta discovery: cannot locate Collection item ${id}`);
    const toward = targetIndex > Math.max(...visibleIndices) ? "later" : "earlier";
    const before = state.collection.scrollOffset;
    await swipeCollection(page, toward);
    const after = await debug(page);
    if (Math.abs(after.collection.scrollOffset - before) < 0.01) {
      throw new Error(`Meta discovery: Collection item ${id} is unreachable at the ${toward} boundary`);
    }
  }
  throw new Error(`Meta discovery: Collection item ${id} was not revealed`);
};

const clickCollectionItem = async (page, id) => clickTarget(page, await revealCollectionItem(page, id));

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
  const directExit = drag.path.length === 0 && Boolean(drag.exitSide);
  const [anchorX, anchorY] = directExit
    ? [
      block.shape.reduce((sum, [x]) => sum + x, 0) / block.shape.length,
      block.shape.reduce((sum, [, y]) => sum + y, 0) / block.shape.length,
    ]
    : block.shape[0];
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

const expectDiscovery = (state, collection, context, expectedPendingItemIds) => {
  if (state.discovery.collection.pending !== collection) {
    throw new Error(`Meta discovery: ${context} expected Collection pending=${collection}, got ${JSON.stringify(state.discovery)}`);
  }
  const collectionTab = state.navigation.tabs.find((tab) => tab.screen === "records");
  const albumOrGuidePending = collection || state.collectionAlbum.notificationVisible;
  if (!collectionTab || collectionTab.notificationVisible !== albumOrGuidePending) {
    throw new Error(`Meta discovery: ${context} Collection navigation notification drifted`);
  }
  const navigationIsVisible = Boolean(state.navigation.selected);
  if (navigationIsVisible && albumOrGuidePending !== Boolean(collectionTab.notificationRect)) {
    throw new Error(`Meta discovery: ${context} Collection navigation notification rect drifted`);
  }
  if (expectedPendingItemIds) {
    const actual = [...state.discovery.collection.pendingItemIds].sort();
    const expected = [...expectedPendingItemIds].sort();
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(`Meta discovery: ${context} expected pending items ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
  }
  if (!state.discovery.artReady) throw new Error(`Meta discovery: ${context} badge art is not ready`);
};

const expectBadgeInsideEntry = (badge, entry, context, scale = 1) => {
  const expectedLogicalSize = 39 * 496 / 720 * scale;
  const epsilon = 0.01;
  if (Math.abs(badge.width - expectedLogicalSize) > epsilon
    || Math.abs(badge.height - expectedLogicalSize) > epsilon) {
    throw new Error(
      `Meta discovery: ${context} badge must render at the supplied 39x39 size, got ${badge.width}x${badge.height}`,
    );
  }
  const centerX = badge.x + badge.width / 2;
  const centerY = badge.y + badge.height / 2;
  if (centerX < entry.x || centerX > entry.x + entry.width || centerY < entry.y || centerY > entry.y + entry.height) {
    throw new Error(`Meta discovery: ${context} badge center escaped its existing entry hit area`);
  }
};

const expectCollectionItemNotification = async (page, id, visible, context) => {
  await revealCollectionItem(page, id);
  const state = await debug(page);
  const entry = state.collection.visibleEntries.find((candidate) => candidate.id === id);
  if (!entry || entry.notificationVisible !== visible) {
    throw new Error(`Meta discovery: ${context} expected ${id} notificationVisible=${visible}`);
  }
  if (visible) {
    if (!entry.notificationRect) throw new Error(`Meta discovery: ${context} ${id} notification rect is missing`);
    expectBadgeInsideEntry(entry.notificationRect, entry.rect, `${context} ${id}`, state.collection.modal.scale);
  } else if (entry.notificationRect) {
    throw new Error(`Meta discovery: ${context} ${id} retained a notification rect`);
  }
  return state;
};

const makeSeedSave = (overrides = {}) => ({
  schemaVersion: 1,
  currentLevel: 1,
  highestLevel: 1,
  coins: 1000,
  sound: false,
  haptic: false,
  reducedMotion: true,
  featureSeen: ["basics", "ice-door", "ice-block", "generator", "elevator", "conveyor", "star"],
  boosterUnlockSeen: ["time", "rocket", "pulse"],
  boosters: { time: 3, rocket: 3, pulse: 3 },
  bestStars: {},
  bestMoves: {},
  rewardedLevels: [],
  metaDiscovery: { collectionViewedThroughLevel: 1 },
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
  expectDiscovery(state, true, `${label} baseline`, ["irregular-block"]);
  await installStorageFaultPlan(page, mode);
  const retriedUnknown = mode === "unknown" || mode === "write-then-unknown"
    || mode === "unresolved" || mode === "write-then-unresolved";
  const expectedWrites = retriedUnknown ? 2 : 1;
  state = await openMechanismGuide(page, label);
  expectDiscovery(state, true, `${label} navigation does not acknowledge`, ["irregular-block"]);
  let probe = await storageFaultProbe(page);
  if (probe.writes.length !== 0 || probe.reads.length !== 0) {
    throw new Error(`Meta discovery: ${label} entering Collection touched acknowledgement storage`);
  }
  await expectCollectionItemNotification(page, "irregular-block", true, `${label} before card click`);
  await page.screenshot({ path: resolve(output, `${label}-01-pending.png`) });
  await clickCollectionItem(page, "irregular-block");
  await page.waitForFunction(
    (count) => globalThis.__metaDiscoveryStorageFault?.writes?.length >= count,
    expectedWrites,
    { timeout: 15_000 },
  );
  state = await debug(page);
  const runtimeAcknowledged = mode !== "rejected";
  const durableAcknowledged = runtimeAcknowledged && mode !== "unresolved";
  expectDiscovery(
    state,
    !runtimeAcknowledged,
    `${label} runtime result`,
    runtimeAcknowledged ? [] : ["irregular-block"],
  );
  await expectCollectionItemNotification(page, "irregular-block", !runtimeAcknowledged, `${label} runtime card result`);
  let stored = await readStoredSaveBypassingFault(page);
  if (stored.metaDiscovery.collectionViewedThroughLevel !== (durableAcknowledged ? 3 : 1)) {
    throw new Error(`Meta discovery: ${label} persisted the wrong acknowledgement result`);
  }
  if (durableAcknowledged
    && !stored.metaDiscovery.collectionViewedItemIds?.includes("irregular-block")) {
    throw new Error(`Meta discovery: ${label} did not persist the clicked item id`);
  }
  if (!durableAcknowledged && stored.metaDiscovery.collectionViewedItemIds != null) {
    throw new Error(`Meta discovery: ${label} unexpectedly persisted an explicit item ledger`);
  }
  probe = await storageFaultProbe(page);
  const expectedSecondMode = mode === "unresolved" || mode === "write-then-unresolved" ? mode : "open";
  if (probe.writes.length !== expectedWrites
    || probe.writes[0].payload.metaDiscovery.collectionViewedThroughLevel !== 3
    || !probe.writes[0].payload.metaDiscovery.collectionViewedItemIds?.includes("irregular-block")
    || (expectedWrites === 2 && (probe.writes[1].mode !== expectedSecondMode
      || JSON.stringify(probe.writes[1].payload) !== JSON.stringify(probe.writes[0].payload)))
    || JSON.stringify(probe.reads.map((read) => read.blocked)) !== JSON.stringify(expectedVerificationReads(mode))) {
    throw new Error(`Meta discovery: ${label} did not exercise its intended storage boundary`);
  }
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().discovery?.artReady === true, undefined, { timeout: 15_000 });
  state = await debug(page);
  expectDiscovery(
    state,
    !durableAcknowledged,
    `${label} reload`,
    durableAcknowledged ? [] : ["irregular-block"],
  );
  stored = await readStoredSave(page);
  if (stored.metaDiscovery.collectionViewedThroughLevel !== (durableAcknowledged ? 3 : 1)) {
    throw new Error(`Meta discovery: ${label} reload changed the durable outcome`);
  }
  await page.screenshot({ path: resolve(output, `${label}-02-reload.png`) });
  results.push({
    label,
    verificationOutcome: verificationOutcome(mode),
    durableAcknowledged,
    runtimeAcknowledged,
    pendingAfterReload: state.discovery.collection.pending,
  });
  await context.close();
};

const runMechanismDiscoveryScenario = async ({ label, level, previousLevel, itemIds, expectedUnlocked }) => {
  const { context, page } = await createSeededScenario(label, makeSeedSave({
    currentLevel: level,
    highestLevel: level,
    rewardedLevels: Array.from({ length: level - 1 }, (_, index) => index + 1),
    bestStars: Object.fromEntries(Array.from({ length: level - 1 }, (_, index) => [String(index + 1), 3])),
    bestMoves: Object.fromEntries(Array.from({ length: level - 1 }, (_, index) => [String(index + 1), 20])),
    metaDiscovery: { collectionViewedThroughLevel: previousLevel },
  }));
  let state = await debug(page);
  expectDiscovery(state, true, `${label} arrival`, itemIds);
  if (state.discovery.collection.newestUnseenLevel !== level
    || state.discovery.state.collectionViewedThroughLevel !== previousLevel) {
    throw new Error(`Meta discovery: ${label} did not expose the Lv${level} mechanism milestone`);
  }
  expectBadgeInsideEntry(
    state.discovery.collection.badgeRect,
    state.interactionTargets.targets["navigation.4"].hit,
    `${label} collection`,
  );

  state = await openMechanismGuide(page, label);
  expectDiscovery(state, true, `${label} navigation retains item notifications`, itemIds);
  if (state.collection.unlocked !== expectedUnlocked) {
    throw new Error(`Meta discovery: ${label} exposed ${state.collection.unlocked} entries instead of ${expectedUnlocked}`);
  }
  for (const id of itemIds) await expectCollectionItemNotification(page, id, true, `${label} initial`);
  await page.screenshot({ path: resolve(output, `${label}-01-pending.png`) });
  for (const [index, id] of itemIds.entries()) {
    await clickCollectionItem(page, id);
    state = await debug(page);
    if (state.collection.selectedId !== id || !state.collection.selectedUnlocked || !state.collection.selectedDetail) {
      throw new Error(`Meta discovery: ${label} did not expose the usable ${id} guide`);
    }
    const remainingIds = itemIds.slice(index + 1);
    expectDiscovery(state, remainingIds.length > 0, `${label} after selecting ${id}`, remainingIds);
    await expectCollectionItemNotification(page, id, false, `${label} after selecting ${id}`);
    for (const remainingId of remainingIds) {
      await expectCollectionItemNotification(page, remainingId, true, `${label} after selecting ${id}`);
    }
    await page.screenshot({ path: resolve(output, `${label}-${String(index + 2).padStart(2, "0")}-${id}-cleared.png`) });
  }
  const stored = await readStoredSave(page);
  if (stored.metaDiscovery?.collectionViewedThroughLevel !== level) {
    throw new Error(`Meta discovery: ${label} acknowledgement was not persisted through Lv${level}`);
  }
  if (!itemIds.every((id) => stored.metaDiscovery.collectionViewedItemIds?.includes(id))) {
    throw new Error(`Meta discovery: ${label} did not persist every explicitly viewed item`);
  }
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().discovery?.artReady === true, undefined, { timeout: 15_000 });
  state = await debug(page);
  expectDiscovery(state, false, `${label} reload`, []);
  const reloaded = await readStoredSave(page);
  if (!itemIds.every((id) => reloaded.metaDiscovery.collectionViewedItemIds?.includes(id))) {
    throw new Error(`Meta discovery: ${label} reload lost an explicitly viewed item`);
  }
  results.push({
    label,
    newestUnseenLevel: level,
    acknowledgedThroughLevel: reloaded.metaDiscovery.collectionViewedThroughLevel,
    acknowledgedItemIds: itemIds,
    unlockedEntries: state.collection.unlocked,
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
    || state.discovery.state.collectionViewedThroughLevel !== 1) {
    throw new Error(`Meta discovery: ${label} did not start from a genuine fresh save`);
  }
  expectDiscovery(state, false, `${label} fresh home`, []);
  const featureIntroMilestones = await page.evaluate(async () => {
    const { getLevel } = await import("/src/core/levels.ts");
    return [6, 10, 34, 35, 50, 70, 91].map((levelId) => [levelId, getLevel(levelId).featureIntro?.kind ?? null]);
  });
  if (JSON.stringify(featureIntroMilestones) !== JSON.stringify([
    [6, "ice-door"],
    [10, "ice-block"],
    [15, "layer"],
    [20, "shutter"],
    [35, "generator"],
    [50, "arrow-block"],
    [59, "key-lock"],
    [65, "lift"],
    [70, "timed-generator"],
    [73, "staged-frame"],
    [100, "star"],
  ])) {
    throw new Error(`Meta discovery: ${label} feature intro milestones drifted: ${JSON.stringify(featureIntroMilestones)}`);
  }

  await clickTarget(page, "homePlay");
  state = await waitFor(page, (candidate) => candidate.screen === "playing" && candidate.level.id === 1, `${label} Lv1 start`);
  if (state.activeRun?.levelId !== 1) {
    throw new Error(`Meta discovery: ${label} visible start did not open a journaled ordinary Lv1 run`);
  }
  for (const levelId of [1, 2, 3]) {
    if (state.level.id !== levelId || state.screen !== "playing") {
      throw new Error(`Meta discovery: ${label} expected playing Lv${levelId}`);
    }
    await solveCurrentLevel(page, levelId);
    state = await waitFor(
      page,
      (candidate) => candidate.screen === "playing" && candidate.level.id === levelId + 1
        && !candidate.completionFlow?.directTransition,
      `${label} Lv${levelId} direct advance`,
      15_000,
      ["win", "celebrating"],
    );
    if (state.activeRun?.levelId !== levelId + 1) {
      throw new Error(`Meta discovery: ${label} Lv${levelId} direct advance did not journal Lv${levelId + 1}`);
    }
    if (levelId === 1) {
      expectDiscovery(state, false, `${label} after Lv1`, []);
      if (state.discovery.collection.newestUnseenLevel != null
        || state.discovery.state.collectionViewedThroughLevel !== 1) {
        throw new Error(`Meta discovery: ${label} exposed a mechanism before its Lv3 milestone`);
      }
    }
    if (levelId === 2) {
      expectDiscovery(state, true, `${label} after Lv2`, ["irregular-block"]);
      if (state.discovery.collection.newestUnseenLevel !== 3
        || state.discovery.state.collectionViewedThroughLevel !== 1) {
        throw new Error(`Meta discovery: ${label} Lv3 mechanism milestone was not unlocked`);
      }
    }
  }

  expectDiscovery(state, true, `${label} after Lv3`, ["irregular-block"]);
  if (state.discovery.collection.newestUnseenLevel !== 3
    || state.discovery.state.collectionViewedThroughLevel !== 1) {
    throw new Error(`Meta discovery: ${label} Lv3 irregular-block milestone was not retained`);
  }

  // Return through the visible pause menu, not a debug level switch, then use
  // the real Collection card to acknowledge the milestone.
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
  expectDiscovery(state, true, `${label} collection home badge`, ["irregular-block"]);
  expectBadgeInsideEntry(
    state.discovery.collection.badgeRect,
    state.interactionTargets.targets["navigation.4"].hit,
    `${label} collection`,
  );
  await page.screenshot({ path: resolve(output, `${label}-01-collection-badge.png`) });

  state = await openMechanismGuide(page, label);
  expectDiscovery(state, true, `${label} opening Collection keeps notification`, ["irregular-block"]);
  await expectCollectionItemNotification(page, "irregular-block", true, `${label} newly unlocked card`);
  await page.screenshot({ path: resolve(output, `${label}-02-collection-open-pending.png`) });

  // Opening an already-viewed card cannot clear a different item's dot.
  await clickCollectionItem(page, "color-block");
  state = await debug(page);
  if (state.collection.selectedId !== "color-block" || state.collection.selectedTitle !== "色块"
    || state.collection.unlocked !== 3
    || state.collection.displayedDetail !== "将色块整体对齐同色出口范围，无需松手便会立即送出。") {
    throw new Error(`Meta discovery: ${label} aggregate block collection card is not usable`);
  }
  expectDiscovery(state, true, `${label} old card does not clear new card`, ["irregular-block"]);

  await clickCollectionItem(page, "irregular-block");
  state = await debug(page);
  if (state.collection.selectedId !== "irregular-block" || !state.collection.selectedUnlocked) {
    throw new Error(`Meta discovery: ${label} newly unlocked irregular-block card is not usable`);
  }
  expectDiscovery(state, false, `${label} selected Collection item`, []);
  await expectCollectionItemNotification(page, "irregular-block", false, `${label} selected Collection item`);
  stored = await readStoredSave(page);
  if (stored.metaDiscovery?.collectionViewedThroughLevel !== 3
    || !stored.metaDiscovery.collectionViewedItemIds?.includes("irregular-block")) {
    throw new Error(`Meta discovery: ${label} collection acknowledgement was not persisted`);
  }
  await page.screenshot({ path: resolve(output, `${label}-03-collection-item-cleared.png`) });

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => {
    const state = window.__COLOR_ESCAPE__?.getDebugState();
    return state?.art.ready && state?.discovery.artReady;
  }, undefined, { timeout: 15_000 });
  state = await debug(page);
  if (state.screen !== "home" || state.level.id !== 4) throw new Error(`Meta discovery: ${label} collection reload did not return home`);
  expectDiscovery(state, false, `${label} collection reload`, []);
  stored = await readStoredSave(page);
  if (stored.metaDiscovery?.collectionViewedThroughLevel !== 3
    || !stored.metaDiscovery.collectionViewedItemIds?.includes("irregular-block")) {
    throw new Error(`Meta discovery: ${label} collection reload changed the persisted discovery state`);
  }

  await clickTarget(page, "homePlay");
  await waitFor(page, (candidate) => candidate.screen === "playing" && candidate.level.id === 4, `${label} Lv4 restart`);
  await solveCurrentLevel(page, 4);
  state = await waitFor(
    page,
    (candidate) => candidate.level.id === 5
      && !candidate.completionFlow?.directTransition
      && (candidate.screen === "feature" || candidate.screen === "playing"),
    `${label} Lv4 direct entry into Lv5`,
    15_000,
    ["win", "celebrating"],
  );
  expectDiscovery(state, false, `${label} Lv5 arrival before completion`, []);
  if (state.screen === "feature") {
    await clickTarget(page, "featurePrimary");
    await waitFor(page, (candidate) => candidate.screen === "playing" && candidate.level.id === 5, `${label} Lv5 feature intro`);
  }
  await solveCurrentLevel(page, 5);
  state = await waitFor(page, (candidate) => candidate.screen === "win" && candidate.level.id === 5, `${label} Lv5 win`);
  if (state.winAction !== "返回主页" || state.winSecondaryAction !== "关闭") {
    throw new Error(`Meta discovery: ${label} Lv5 result actions drifted`);
  }
  expectDiscovery(state, true, `${label} after Lv5 settlement`, ["frozen-exit"]);
  if (state.discovery.collection.newestUnseenLevel !== 6) {
    throw new Error(`Meta discovery: ${label} Lv5 settlement did not expose the Lv6 frozen-exit milestone`);
  }
  if (state.progression.highestLevel !== 6 || state.progression.highestLevel !== state.level.id + 1) {
    throw new Error(`Meta discovery: ${label} Lv5 did not advance the journey to Lv6`);
  }
  await clickTarget(page, "modalPrimary");
  state = await waitFor(
    page,
    (candidate) => candidate.screen === "home" && candidate.level.id === 6
      && Boolean(candidate.completionFlow?.coinFlight),
    `${label} Lv6 home coin flight`,
  );
  state = await waitFor(
    page,
    (candidate) => candidate.screen === "home" && candidate.level.id === 6
      && !candidate.completionFlow?.coinFlight,
    `${label} Lv6 home after coin flight`,
  );
  expectDiscovery(state, true, `${label} Lv6 collection home badge`, ["frozen-exit"]);
  if (state.discovery.collection.newestUnseenLevel !== 6) {
    throw new Error(`Meta discovery: ${label} Lv6 frozen-exit milestone was not retained`);
  }
  expectBadgeInsideEntry(
    state.discovery.collection.badgeRect,
    state.interactionTargets.targets["navigation.4"].hit,
    `${label} Lv6 collection`,
  );
  await page.screenshot({ path: resolve(output, `${label}-03-lv6-collection-badge.png`) });

  // Frozen exits arrive at Lv6. Numeric ice, shells and shutters remain visibly
  // locked until Lv10, Lv15 and Lv34. Opening Collection must retain the dot;
  // selecting the newly unlocked card is the only acknowledgement trigger.
  state = await openMechanismGuide(page, label);
  expectDiscovery(state, true, `${label} opening Lv6 Collection`, ["frozen-exit"]);
  state = await debug(page);
  if (state.collection.unlocked !== 4
    || !state.collection.unlockedItemIds.includes("frozen-exit")) {
    throw new Error(`Meta discovery: ${label} Lv6 Collection did not expose the frozen-exit guide`);
  }
  await expectCollectionItemNotification(page, "frozen-exit", true, `${label} Lv6 card before click`);
  await page.screenshot({ path: resolve(output, `${label}-04-lv6-mechanisms-pending.png`) });
  await clickCollectionItem(page, "frozen-exit");
  state = await debug(page);
  if (state.collection.selectedId !== "frozen-exit" || !state.collection.selectedUnlocked || !state.collection.selectedDetail) {
    throw new Error(`Meta discovery: ${label} Lv6 frozen-exit guide is not visibly usable`);
  }
  expectDiscovery(state, false, `${label} selected Lv6 mechanism`, []);
  await expectCollectionItemNotification(page, "frozen-exit", false, `${label} selected Lv6 mechanism`);
  for (const [id, level] of [["numeric-ice", 10], ["multilayer-shell", 15], ["shutter", 34]]) {
    await clickCollectionItem(page, id);
    state = await debug(page);
    if (state.collection.selectedId !== id || state.collection.selectedUnlocked
      || state.collection.selectedDetail || state.collection.displayedDetail !== `到达第 ${level} 关后解锁`) {
      throw new Error(`Meta discovery: ${label} ${id} guide did not stay locked until Lv${level}`);
    }
  }
  stored = await readStoredSave(page);
  if (stored.metaDiscovery?.collectionViewedThroughLevel !== 6
    || !stored.metaDiscovery.collectionViewedItemIds?.includes("frozen-exit")) {
    throw new Error(`Meta discovery: ${label} Lv6 mechanism acknowledgement was not persisted`);
  }
  await page.screenshot({ path: resolve(output, `${label}-05-lv6-mechanisms-cleared.png`) });
  state = await closeMechanismGuide(page, label);
  expectDiscovery(state, false, `${label} guide closed without clearing album notifications`, []);
  await clickTarget(page, "navigation.2");
  state = await waitFor(
    page,
    (candidate) => candidate.screen === "home" && !candidate.navigation.transition,
    `${label} return home after early-mechanism collection`,
  );
  expectDiscovery(state, false, `${label} collection acknowledgement after mechanism collection`, []);

  const progressionSnapshot = {
    coins: state.economy.coins,
    highestLevel: state.progression.highestLevel,
    rewardedLevels: [...state.economy.rewardedLevels].sort((left, right) => left - right),
    bestStars: state.progression.bestStars,
    bestMoves: state.progression.bestMoves,
  };
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => {
    const state = window.__COLOR_ESCAPE__?.getDebugState();
    return state?.art.ready && state?.discovery.artReady;
  }, undefined, { timeout: 15_000 });
  state = await debug(page);
  expectDiscovery(state, false, `${label} final reload`, []);
  stored = await readStoredSave(page);
  if (state.screen !== "home" || state.level.id !== 6 || state.activeRun
    || state.economy.coins !== progressionSnapshot.coins
    || state.progression.highestLevel !== progressionSnapshot.highestLevel
    || JSON.stringify([...state.economy.rewardedLevels].sort((left, right) => left - right)) !== JSON.stringify(progressionSnapshot.rewardedLevels)
    || JSON.stringify(state.progression.bestStars) !== JSON.stringify(progressionSnapshot.bestStars)
    || JSON.stringify(state.progression.bestMoves) !== JSON.stringify(progressionSnapshot.bestMoves)
    || stored.metaDiscovery?.collectionViewedThroughLevel !== 6) {
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
  });
  await context.close();
};

try {
  await runScenario("720x1584", { width: 720, height: 1584 });
  await runScenario("320x568", { width: 320, height: 568 });
  await runMechanismDiscoveryScenario({
    label: "irregular-board-lv8-milestone",
    level: 8,
    previousLevel: 6,
    itemIds: ["irregular-board"],
    expectedUnlocked: 5,
  });
  await runMechanismDiscoveryScenario({
    label: "numeric-ice-lv10-milestone",
    level: 10,
    previousLevel: 8,
    itemIds: ["numeric-ice"],
    expectedUnlocked: 6,
  });
  await runMechanismDiscoveryScenario({
    label: "shell-lv15-milestone",
    level: 15,
    previousLevel: 10,
    itemIds: ["multilayer-shell"],
    expectedUnlocked: 7,
  });
  await runMechanismDiscoveryScenario({
    label: "shutter-lv34-milestone",
    level: 34,
    previousLevel: 15,
    itemIds: ["shutter"],
    expectedUnlocked: 8,
  });
  await runMechanismDiscoveryScenario({
    label: "conveyor-lv70-milestone",
    level: 70,
    previousLevel: 50,
    itemIds: ["conveyor"],
    expectedUnlocked: 11,
  });
  for (const mode of ["rejected", "write-then-throw", "unknown", "write-then-unknown", "unresolved", "write-then-unresolved"]) {
    await runCollectionFaultScenario(mode);
  }
  await writeFile(resolve(output, "meta-discovery-report.json"), `${JSON.stringify({ results, errors }, null, 2)}\n`, "utf8");
  if (errors.length) throw new Error(`Meta discovery browser errors:\n${errors.join("\n")}`);
  console.log("Per-item Collection dots, click-only acknowledgement, independent Lv34 shutter and Lv70 conveyor clearing, reload persistence, and all storage acknowledgement fault outcomes passed at 720x1584/320x568.");
} finally {
  await browser.close();
}
