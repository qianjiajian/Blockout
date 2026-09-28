import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";

const output = fileURLToPath(new URL("../playtest-results/", import.meta.url));
const shot = (name) => resolve(output, name);
const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
const saveKey = "color-escape-save-v1";
await mkdir(output, { recursive: true });

const assert = (condition, message) => {
  if (!condition) throw new Error(`Settlement transaction E2E: ${message}`);
};

const makeSave = (overrides = {}) => ({
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
  lastSeenUpdate: "2026-09-05-r100",
  ...overrides,
});

const browser = await chromium.launch({ headless: true });
const errors = [];

const createScenario = async (seed, viewport = { width: 496, height: 1078 }) => {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(playtestUrl, { waitUntil: "domcontentloaded" });
  const currentUpdateId = await page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState().updateNotice.id);
  await page.evaluate(({ key, value, updateId }) => {
    localStorage.clear();
    localStorage.setItem(key, JSON.stringify({ ...value, lastSeenUpdate: updateId }));
  }, { key: saveKey, value: seed, updateId: currentUpdateId });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().art?.ready === true, undefined, { timeout: 15_000 });
  return { context, page };
};

const debug = (page) => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const stored = (page) => page.evaluate((key) => JSON.parse(localStorage.getItem(key)), saveKey);

const startNormal = async (page, levelId) => {
  await page.evaluate((id) => window.__COLOR_ESCAPE__.loadLevel(id, true), levelId);
  const state = await debug(page);
  assert(state.screen === "playing" && state.level.id === levelId && state.activeRun?.levelId === levelId,
    `could not start normal level ${levelId}`);
};

const solutionFor = (page, levelId) => page.evaluate(async (id) => {
  const [{ getLevel }, { solveLevelForValidation }] = await Promise.all([
    import("/src/core/levels.ts"),
    import("/src/core/levelSolver.ts"),
  ]);
  return solveLevelForValidation(getLevel(id));
}, levelId);

const performDrag = async (page, drag, postDelay) => {
  const state = await debug(page);
  const canvasBounds = await page.locator("canvas").boundingBox();
  assert(canvasBounds, "game canvas has no browser bounds");
  const block = state.puzzle.blocks.find((candidate) => candidate.id === drag.blockId);
  assert(block, `verified route references missing block ${drag.blockId}`);
  const directExit = drag.path.length === 0 && Boolean(drag.exitSide);
  const [anchorX, anchorY] = directExit
    ? [
      block.shape.reduce((sum, [x]) => sum + x, 0) / block.shape.length,
      block.shape.reduce((sum, [, y]) => sum + y, 0) / block.shape.length,
    ]
    : block.shape[0];
  const point = (x, y) => {
    const logicalX = state.board.innerX + (x + anchorX + 0.5) * state.board.cell;
    const logicalY = state.board.innerY + (y + anchorY + 0.5) * state.board.cell;
    return {
      x: canvasBounds.x + state.viewportTransform.offsetX + logicalX * state.viewportTransform.scale,
      y: canvasBounds.y + state.viewportTransform.offsetY + logicalY * state.viewportTransform.scale,
    };
  };
  const start = point(block.x, block.y);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  for (const [x, y] of drag.path) {
    const target = point(x, y);
    await page.mouse.move(target.x, target.y, { steps: 2 });
  }
  await page.mouse.up();
  await page.waitForFunction(() => {
    const state = window.__COLOR_ESCAPE__?.getDebugState();
    return state && state.activePointer == null && !state.dragMotion;
  }, undefined, { timeout: 2_000 });
  await page.waitForTimeout(postDelay ?? (drag.exitSide ? 330 : 10));
};

const prepareFinalDrag = async (page) => {
  const state = await debug(page);
  const solution = await solutionFor(page, state.level.id);
  assert(solution.solved && solution.drags.length > 0, `level ${state.level.id} has no verified pointer route`);
  for (const drag of solution.drags.slice(0, -1)) await performDrag(page, drag);
  return { finalDrag: solution.drags.at(-1), minimumDrags: solution.minimumDrags };
};

const installWriteFault = (page) => page.evaluate((key) => {
  const originalSet = Storage.prototype.setItem;
  const originalGet = Storage.prototype.getItem;
  globalThis.__settlementStorageFault = { mode: "blocked", writes: [], reads: [], readFailuresRemaining: 0 };
  Storage.prototype.setItem = function setItem(name, value) {
    if (name === key) {
      let payload;
      try { payload = JSON.parse(value); } catch { payload = value; }
      globalThis.__settlementStorageFault.writes.push({
        mode: globalThis.__settlementStorageFault.mode,
        blocked: globalThis.__settlementStorageFault.mode === "blocked",
        payload,
      });
      if (globalThis.__settlementStorageFault.mode === "blocked") {
        throw new DOMException("settlement storage full", "QuotaExceededError");
      }
      if (globalThis.__settlementStorageFault.mode === "write-then-throw") {
        originalSet.call(this, name, value);
        throw new DOMException("storage bridge lost acknowledgement", "UnknownError");
      }
    }
    return originalSet.call(this, name, value);
  };
  Storage.prototype.getItem = function getItem(name) {
    if (name === key) {
      const blocked = globalThis.__settlementStorageFault.readFailuresRemaining > 0;
      globalThis.__settlementStorageFault.reads.push({ blocked });
      if (blocked) {
        globalThis.__settlementStorageFault.readFailuresRemaining -= 1;
        throw new DOMException("storage bridge read temporarily unavailable", "UnknownError");
      }
    }
    return originalGet.call(this, name);
  };
}, saveKey);

const setWriteBlocked = (page, blocked) => page.evaluate((next) => {
  globalThis.__settlementStorageFault.mode = next ? "blocked" : "open";
}, blocked);

const setWriteFaultMode = (page, mode) => page.evaluate((next) => {
  globalThis.__settlementStorageFault.mode = next;
}, mode);

const failNextStorageReads = (page, count = 1) => page.evaluate((next) => {
  globalThis.__settlementStorageFault.readFailuresRemaining = next;
}, count);

const faultProbe = (page) => page.evaluate(() => globalThis.__settlementStorageFault);

const clickLogical = async (page, x, y, options) => {
  const transform = (await debug(page)).viewportTransform;
  const canvasBounds = await page.locator("canvas").boundingBox();
  assert(canvasBounds, "game canvas has no browser bounds");
  await page.mouse.click(
    canvasBounds.x + transform.offsetX + x * transform.scale,
    canvasBounds.y + transform.offsetY + y * transform.scale,
    options,
  );
};

const clickInteractionTarget = async (page, name) => {
  const state = await debug(page);
  const hit = state.interactionTargets?.targets?.[name]?.hit;
  const transform = state.viewportTransform;
  const canvasBounds = await page.locator("canvas").boundingBox();
  assert(hit && transform && canvasBounds, `missing ${name} target or canvas bounds`);
  await page.mouse.click(
    canvasBounds.x + transform.offsetX + (hit.x + hit.width / 2) * transform.scale,
    canvasBounds.y + transform.offsetY + (hit.y + hit.height / 2) * transform.scale,
  );
};

const waitForScreen = async (page, screen, timeout = 10_000) => {
  try {
    await page.waitForFunction(
      (expected) => window.__COLOR_ESCAPE__?.getDebugState().screen === expected,
      screen,
      { timeout },
    );
  } catch (error) {
    const state = await debug(page);
    throw new Error(`Timed out waiting for ${screen}; current state ${JSON.stringify({
      screen: state.screen,
      level: state.level.id,
      complete: state.puzzle.complete,
      blocks: state.puzzle.blocks.map((block) => block.id),
      settlement: state.settlement,
    })}`, { cause: error });
  }
};

const waitForDirectTransition = async (page, fromLevel, toLevel, timeout = 3_000) => {
  await page.waitForFunction(
    ({ from, to }) => {
      const transition = window.__COLOR_ESCAPE__?.getDebugState().completionFlow?.directTransition;
      return transition?.fromLevel === from && transition?.toLevel === to;
    },
    { from: fromLevel, to: toLevel },
    { timeout },
  );
};

const expectFailedSettlement = async (page, baseline, levelId, expectedCoinDelta, label) => {
  await waitForScreen(page, "settlementFailed");
  const [state, disk, probe] = await Promise.all([debug(page), stored(page), faultProbe(page)]);
  assert(state.level.id === levelId && state.puzzle.complete, `${label} did not retain the completed board`);
  assert(state.settlement.status === "failed" && state.settlement.attempts === 1
    && state.settlement.persistence === "rejected"
    && state.settlement.retryAvailable && state.settlement.rewardPresented === false
    && state.settlement.message?.includes("尚未")
    && state.settlement.actions?.primary === "重试保存"
    && state.settlement.actions?.secondary === "放弃并返回",
  `${label} did not expose a truthful retry state: ${JSON.stringify(state.settlement)}`);
  assert(state.settlement.pendingCoinDelta === expectedCoinDelta,
    `${label} pending coin delta is ${state.settlement.pendingCoinDelta}, expected ${expectedCoinDelta}`);
  assert(state.economy.coins === baseline.coins
    && JSON.stringify(state.economy.rewardedLevels) === JSON.stringify(baseline.rewardedLevels)
    && state.progression.highestLevel === baseline.highestLevel
    && JSON.stringify(state.progression.bestStars) === JSON.stringify(baseline.bestStars)
    && JSON.stringify(state.progression.bestMoves) === JSON.stringify(baseline.bestMoves),
  `${label} committed runtime rewards or records before storage succeeded`);
  assert(JSON.stringify(disk) === JSON.stringify(baseline), `${label} changed the persisted save after a failed write`);
  assert(state.activeRun?.levelId === levelId && disk.activeRun?.levelId === levelId,
    `${label} discarded the retry journal after a failed write`);
  assert(probe.writes.length === 1 && probe.writes[0].blocked === true,
    `${label} did not record exactly one blocked settlement payload`);
  if (levelId === 3) {
    assert(state.discovery.collection.pending === false
      && state.discovery.collection.newestUnseenLevel == null,
    `${label} exposed the Lv3 collection discovery before its save committed`);
  }
  const attempted = probe.writes[0].payload;
  assert(attempted.coins === baseline.coins + expectedCoinDelta
    && attempted.activeRun === undefined
    && attempted.rewardedLevels.includes(levelId),
  `${label} attempted payload does not contain the expected atomic result`);
  return { state, disk, probe };
};

const retryWithDoubleClick = async (page, label, presentationScreen, directFromLevel) => {
  await setWriteBlocked(page, false);
  await page.mouse.click(248, 754, { clickCount: 2, delay: 12 });
  if (directFromLevel == null) await waitForScreen(page, presentationScreen, 3_000);
  else await waitForDirectTransition(page, directFromLevel, directFromLevel + 1);
  const [state, probe] = await Promise.all([debug(page), faultProbe(page)]);
  assert(state.settlement.status === "committed" && state.settlement.attempts === 2
    && state.settlement.rewardPresented === (directFromLevel == null) && !state.settlement.retryAvailable,
  `${label} did not commit on retry: ${JSON.stringify(state.settlement)}`);
  const journalWrites = probe.writes.slice(2);
  const expectedNextRun = directFromLevel == null
    ? journalWrites.length === 0
    : journalWrites.length <= 1
      && journalWrites.every((write) => write.blocked === false
        && write.payload?.activeRun?.levelId === directFromLevel + 1);
  assert(probe.writes.length >= 2 && probe.writes[0].blocked === true && probe.writes[1].blocked === false
    && expectedNextRun,
    `${label} double retry caused an unexpected number of settlement writes: ${JSON.stringify(probe.writes.map((write) => ({
      blocked: write.blocked,
      level: write.payload?.currentLevel,
      activeRun: write.payload?.activeRun?.levelId,
      daily: write.payload?.dailyTaskProgress,
    })))}`);
  assert(JSON.stringify(probe.writes[0].payload) === JSON.stringify(probe.writes[1].payload),
    `${label} retry did not persist the exact candidate that originally failed`);
  return state;
};

try {
  // Lv3: a failed first-clear write must block progression. A successful retry
  // commits once, then resumes the Lv1-4 direct transition into Lv4.
  {
    const seed = makeSave({
      currentLevel: 3,
      highestLevel: 3,
      rewardedLevels: [1, 2],
      bestStars: { "1": 3, "2": 3 },
      bestMoves: { "1": 8, "2": 10 },
      metaDiscovery: { collectionViewedThroughLevel: 3 },
    });
    const { context, page } = await createScenario(seed);
    await startNormal(page, 3);
    const { finalDrag, minimumDrags } = await prepareFinalDrag(page);
    const baseline = await stored(page);
    const before = await debug(page);
    const reward = 20;
    await installWriteFault(page);
    await performDrag(page, finalDrag, 20);
    const failed = await expectFailedSettlement(page, baseline, 3, reward, "Lv3 formal clear");
    const expectedStars = failed.state.settlement.starConditions?.earnedStars;
    assert(expectedStars >= 1 && expectedStars <= 3,
      `Lv3 failed settlement did not expose concrete star conditions: ${JSON.stringify(failed.state.settlement)}`);
    await page.screenshot({ path: shot("round101-settlement-lv3-save-failed.png") });

    await page.waitForTimeout(900);
    let state = await debug(page);
    assert(state.screen === "settlementFailed" && state.level.id === 3,
      "Lv3 advanced while its settlement was still unsaved");

    state = await retryWithDoubleClick(page, "Lv3 direct clear", "playing", 3);
    assert(state.economy.coins === baseline.coins + reward
      && state.economy.rewardedLevels.filter((id) => id === 3).length === 1
      && state.progression.bestStars["3"] === expectedStars
      && state.progression.bestMoves["3"] === minimumDrags,
    `Lv3 retry did not commit its reward and records exactly once: ${JSON.stringify({
      baselineCoins: baseline.coins,
      reward,
      minimumDrags,
      expectedStars,
      economy: state.economy,
      progression: state.progression,
    })}`);
    assert(state.discovery.collection.pending === false
      && state.discovery.collection.newestUnseenLevel == null,
    "Lv3 committed retry replayed an already-viewed collection discovery");
    let disk = await stored(page);
    assert(disk.coins === baseline.coins + reward && disk.rewardedLevels.filter((id) => id === 3).length === 1
      && disk.currentLevel === 4,
    "Lv3 retry did not persist its single reward during direct transition");
    await page.screenshot({ path: shot("round149-settlement-lv3-recovered-direct.png") });

    await page.waitForFunction(
      () => {
        const current = window.__COLOR_ESCAPE__?.getDebugState();
        return current?.screen === "playing" && current.level.id === 4
          && !current.completionFlow?.directTransition;
      },
      undefined,
      { timeout: 4_000 },
    );
    state = await debug(page);
    assert(state.level.id === 4 && state.puzzle.moves === 0 && state.activeRun?.levelId === 4,
      "Lv3 direct transition did not enter a clean Lv4 run");
    disk = await stored(page);
    assert(disk.coins === baseline.coins + reward && disk.rewardedLevels.filter((id) => id === 3).length === 1
      && disk.currentLevel === 4 && disk.activeRun?.levelId === 4,
    "Lv3 direct transition did not retain the single reward and journal Lv4");
    await page.screenshot({ path: shot("round149-settlement-lv3-direct-lv4.png") });

    await page.reload({ waitUntil: "networkidle" });
    await page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().art?.ready === true, undefined, { timeout: 15_000 });
    state = await debug(page);
    disk = await stored(page);
    assert(state.screen === "home" && state.level.id === 4 && !state.activeRun
      && state.economy.coins === baseline.coins + reward
      && state.economy.rewardedLevels.filter((id) => id === 3).length === 1
      && disk.coins === baseline.coins + reward && disk.rewardedLevels.filter((id) => id === 3).length === 1
      && state.discovery.collection.pending === false
      && state.discovery.collection.newestUnseenLevel == null,
    "Lv3 committed reward did not survive refresh exactly once");
    await context.close();
  }

  // Lv4: a successful retry resumes the last early direct transition only
  // after the first-clear transaction is durably committed.
  {
    const seed = makeSave({
      currentLevel: 4,
      highestLevel: 4,
      rewardedLevels: [1, 2, 3],
      bestStars: { "1": 3, "2": 3, "3": 3 },
      bestMoves: { "1": 8, "2": 10, "3": 12 },
    });
    const { context, page } = await createScenario(seed);
    await startNormal(page, 4);
    const { finalDrag, minimumDrags } = await prepareFinalDrag(page);
    const baseline = await stored(page);
    const before = await debug(page);
    const reward = 20;
    await installWriteFault(page);
    await performDrag(page, finalDrag, 20);
    const failed = await expectFailedSettlement(page, baseline, 4, reward, "Lv4 standard clear");
    const expectedStars = failed.state.settlement.starConditions?.earnedStars;
    assert(expectedStars >= 1 && expectedStars <= 3,
      `Lv4 failed settlement did not expose concrete star conditions: ${JSON.stringify(failed.state.settlement)}`);
    await page.screenshot({ path: shot("round101-settlement-lv4-save-failed.png") });

    let state = await retryWithDoubleClick(page, "Lv4 direct clear", "playing", 4);
    assert(state.economy.coins === baseline.coins + reward
      && state.economy.rewardedLevels.filter((id) => id === 4).length === 1
      && state.progression.bestStars["4"] === expectedStars
      && state.progression.bestMoves["4"] === minimumDrags,
    "Lv4 retry did not commit its reward and records exactly once");
    let disk = await stored(page);
    assert(state.settlement.status === "committed" && state.screen === "playing"
      && state.completionFlow?.directTransition?.fromLevel === 4
      && state.settlement.rewardPresented === false,
    "Lv4 retry did not resolve to the direct-transition result");
    assert(disk.coins === baseline.coins + reward
      && disk.rewardedLevels.filter((id) => id === 4).length === 1
      && disk.highestLevel === 5 && disk.currentLevel === 5,
    "Lv4 direct result was not fully persisted");
    await page.screenshot({ path: shot("round149-settlement-lv4-recovered-direct.png") });

    await page.waitForFunction(() => {
      const current = window.__COLOR_ESCAPE__?.getDebugState();
      return current?.screen === "playing" && current.level.id === 5
        && !current.completionFlow?.directTransition;
    }, undefined, { timeout: 3_000 });
    state = await debug(page);
    disk = await stored(page);
    assert(state.level.id === 5 && disk.currentLevel === 5 && disk.highestLevel === 5
      && state.activeRun?.levelId === 5 && disk.activeRun?.levelId === 5,
    "Lv4 direct transition did not start the newly unlocked Lv5");
    await page.screenshot({ path: shot("round149-settlement-lv4-direct-lv5.png") });

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().art?.ready === true, undefined, { timeout: 15_000 });
    state = await debug(page);
    disk = await stored(page);
    assert(state.screen === "home" && state.level.id === 5 && state.economy.coins === baseline.coins + reward
      && state.economy.rewardedLevels.filter((id) => id === 4).length === 1
      && state.progression.bestStars["4"] === expectedStars && state.progression.bestMoves["4"] === minimumDrags
      && disk.currentLevel === 5 && disk.highestLevel === 5
      && disk.coins === baseline.coins + reward && disk.rewardedLevels.filter((id) => id === 4).length === 1,
    "Lv4 standard settlement did not survive refresh exactly once");
    await context.close();
  }

  // A bridge may persist the payload and still lose its acknowledgement. The
  // exact read-back must be treated as success, otherwise "abandon" could
  // overwrite a reward that already reached storage.
  {
    const seed = makeSave({
      currentLevel: 4,
      highestLevel: 4,
      rewardedLevels: [1, 2, 3],
      bestStars: { "1": 3, "2": 3, "3": 3 },
      bestMoves: { "1": 8, "2": 10, "3": 12 },
    });
    const { context, page } = await createScenario(seed);
    await startNormal(page, 4);
    const { finalDrag, minimumDrags } = await prepareFinalDrag(page);
    const baseline = await stored(page);
    const reward = 20;
    await installWriteFault(page);
    await setWriteFaultMode(page, "write-then-throw");
    await performDrag(page, finalDrag, 20);
    await waitForDirectTransition(page, 4, 5);
    await setWriteFaultMode(page, "open");

    let state = await debug(page);
    let disk = await stored(page);
    const probe = await faultProbe(page);
    assert(state.settlement.status === "committed" && state.settlement.attempts === 1
      && state.settlement.rewardPresented === false && state.screen === "playing"
      && state.completionFlow?.directTransition?.fromLevel === 4,
    `lost write acknowledgement was not reconciled: ${JSON.stringify(state.settlement)}`);
    assert(probe.writes.length === 1 && probe.writes[0].mode === "write-then-throw",
      `lost-ack scenario made ${probe.writes.length} writes instead of one`);
    assert(state.economy.coins === baseline.coins + reward
      && disk.coins === baseline.coins + reward
      && state.economy.rewardedLevels.filter((id) => id === 4).length === 1
      && disk.rewardedLevels.filter((id) => id === 4).length === 1
      && state.progression.bestMoves["4"] === minimumDrags
      && disk.bestMoves["4"] === minimumDrags
      && disk.currentLevel === 5 && disk.highestLevel === 5
      && !state.activeRun && disk.activeRun === undefined,
    "lost write acknowledgement did not retain the exact completed result");

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().art?.ready === true, undefined, { timeout: 15_000 });
    state = await debug(page);
    disk = await stored(page);
    assert(state.screen === "home" && state.level.id === 5 && state.economy.coins === baseline.coins + reward
      && state.economy.rewardedLevels.filter((id) => id === 4).length === 1
      && disk.coins === baseline.coins + reward
      && disk.currentLevel === 5 && disk.highestLevel === 5
      && disk.rewardedLevels.filter((id) => id === 4).length === 1,
    "lost-ack settlement was not refresh-safe and idempotent");
    await context.close();
  }

  // A write can reach disk while both its acknowledgement and the immediate
  // verification read are lost. That outcome is ambiguous: the player may
  // retry the exact frozen candidate, but must never be offered a reverse
  // "abandon" write that could erase the already-durable reward.
  {
    const seed = makeSave({
      currentLevel: 4,
      highestLevel: 4,
      rewardedLevels: [1, 2, 3],
      bestStars: { "1": 3, "2": 3, "3": 3 },
      bestMoves: { "1": 8, "2": 10, "3": 12 },
    });
    const { context, page } = await createScenario(seed);
    await startNormal(page, 4);
    const { finalDrag, minimumDrags } = await prepareFinalDrag(page);
    const baseline = await stored(page);
    const reward = 20;
    await installWriteFault(page);
    await setWriteFaultMode(page, "write-then-throw");
    await failNextStorageReads(page);
    await performDrag(page, finalDrag, 20);
    await waitForScreen(page, "settlementFailed", 3_000);

    let state = await debug(page);
    let disk = await stored(page);
    let probe = await faultProbe(page);
    assert(state.settlement.status === "failed" && state.settlement.persistence === "unknown"
      && state.settlement.actions?.primary === "重试保存"
      && state.settlement.actions?.secondary === undefined
      && state.settlement.message?.includes("待确认"),
    `ambiguous settlement exposed unsafe recovery actions: ${JSON.stringify(state.settlement)}`);
    assert(state.economy.coins === baseline.coins && state.activeRun?.levelId === 4,
      "ambiguous settlement committed unverified data to runtime memory");
    assert(disk.coins === baseline.coins + reward
      && disk.rewardedLevels.filter((id) => id === 4).length === 1
      && disk.bestMoves["4"] === minimumDrags
      && disk.currentLevel === 5 && disk.highestLevel === 5
      && disk.activeRun === undefined,
    "ambiguous settlement did not create the expected durable completed candidate");
    assert(probe.writes.length === 1 && probe.writes[0].mode === "write-then-throw"
      && probe.reads.some((read) => read.blocked),
    "ambiguous settlement fault did not lose both acknowledgement and verification read");
    await page.screenshot({ path: shot("round103-settlement-unknown-protected.png") });

    // Clicking where the hidden secondary action used to be must be inert.
    await clickLogical(page, 248, 833);
    await page.waitForTimeout(120);
    state = await debug(page);
    disk = await stored(page);
    probe = await faultProbe(page);
    assert(state.screen === "settlementFailed" && state.settlement.persistence === "unknown"
      && probe.writes.length === 1 && disk.coins === baseline.coins + reward
      && disk.rewardedLevels.filter((id) => id === 4).length === 1,
    "hidden abandon target reversed an ambiguously committed settlement");

    await setWriteFaultMode(page, "open");
    await clickInteractionTarget(page, "modalPrimary");
    await waitForDirectTransition(page, 4, 5);
    state = await debug(page);
    probe = await faultProbe(page);
    assert(state.settlement.status === "committed" && state.settlement.attempts === 2
      && state.economy.coins === baseline.coins + reward
      && state.economy.rewardedLevels.filter((id) => id === 4).length === 1,
    "ambiguous settlement did not reconcile on exact-candidate retry");
    const followupJournal = probe.writes.slice(2);
    assert(probe.writes.length >= 2
      && followupJournal.length <= 1
      && followupJournal.every((write) => write.blocked === false && write.payload?.activeRun?.levelId === 5)
      && JSON.stringify(probe.writes[0].payload) === JSON.stringify(probe.writes[1].payload),
    "ambiguous settlement retry did not reuse the exact immutable candidate");
    await page.screenshot({ path: shot("round149-settlement-unknown-recovered-direct.png") });

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().art?.ready === true, undefined, { timeout: 15_000 });
    state = await debug(page);
    disk = await stored(page);
    assert(state.screen === "home" && state.level.id === 5 && state.economy.coins === baseline.coins + reward
      && state.economy.rewardedLevels.filter((id) => id === 4).length === 1
      && disk.coins === baseline.coins + reward
      && disk.currentLevel === 5 && disk.highestLevel === 5
      && disk.rewardedLevels.filter((id) => id === 4).length === 1,
    "ambiguous settlement recovery was not refresh-safe and exactly-once");
    await context.close();
  }

  // A player may abandon an unsaved result. Any booster recorded in the active
  // journal must be refunded before the run is cleared and the home screen opens.
  {
    const seed = makeSave({
      currentLevel: 4,
      highestLevel: 4,
      rewardedLevels: [1, 2, 3],
      bestStars: { "1": 3, "2": 3, "3": 3 },
      bestMoves: { "1": 8, "2": 10, "3": 12 },
    });
    const { context, page } = await createScenario(seed);
    await startNormal(page, 4);
    await page.mouse.click(132, 990);
    let state = await debug(page);
    let disk = await stored(page);
    assert(state.economy.boosters.time === 2 && state.activeRun?.boosterSpent.time === 1
      && disk.boosters.time === 2 && disk.activeRun?.boosterSpent.time === 1,
    "time booster was not durably recorded before the abandon test");
    const { finalDrag } = await prepareFinalDrag(page);
    const baseline = await stored(page);
    const reward = 20;
    await installWriteFault(page);
    await performDrag(page, finalDrag, 20);
    await expectFailedSettlement(page, baseline, 4, reward, "abandoned Lv4 clear");
    await setWriteBlocked(page, false);
    await page.mouse.click(248, 833);
    await waitForScreen(page, "home", 3_000);
    state = await debug(page);
    disk = await stored(page);
    assert(state.level.id === 4 && !state.activeRun && disk.activeRun === undefined
      && state.economy.boosters.time === 3 && disk.boosters.time === 3
      && state.economy.coins === seed.coins && disk.coins === seed.coins
      && !state.economy.rewardedLevels.includes(4) && !disk.rewardedLevels.includes(4)
      && state.progression.bestStars["4"] === undefined && state.progression.bestMoves["4"] === undefined,
    "abandoning the unsaved result did not refund the booster or discarded rewards incorrectly");
    await page.screenshot({ path: shot("round101-settlement-abandon-refunded.png") });
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().art?.ready === true, undefined, { timeout: 15_000 });
    state = await debug(page);
    assert(state.screen === "home" && state.economy.boosters.time === 3
      && state.economy.coins === seed.coins && !state.economy.rewardedLevels.includes(4) && !state.activeRun,
    "abandon refund did not survive refresh");
    await context.close();
  }

  // Once the player chooses to abandon, that refund candidate becomes the
  // frozen transaction. If its write reaches disk but cannot be confirmed,
  // retry must finish the same abandon operation instead of reviving the clear.
  {
    const seed = makeSave({
      currentLevel: 4,
      highestLevel: 4,
      rewardedLevels: [1, 2, 3],
      bestStars: { "1": 3, "2": 3, "3": 3 },
      bestMoves: { "1": 8, "2": 10, "3": 12 },
    });
    const { context, page } = await createScenario(seed);
    await startNormal(page, 4);
    await clickLogical(page, 132, 990);
    let state = await debug(page);
    assert(state.economy.boosters.time === 2 && state.activeRun?.boosterSpent.time === 1,
      "ambiguous abandon setup did not record the spent time booster");
    const { finalDrag } = await prepareFinalDrag(page);
    const baseline = await stored(page);
    const reward = 20;
    await installWriteFault(page);
    await performDrag(page, finalDrag, 20);
    await expectFailedSettlement(page, baseline, 4, reward, "ambiguous abandon setup");

    await setWriteFaultMode(page, "write-then-throw");
    await failNextStorageReads(page);
    await clickLogical(page, 248, 833);
    await page.waitForTimeout(120);
    state = await debug(page);
    let disk = await stored(page);
    let probe = await faultProbe(page);
    assert(state.screen === "settlementFailed" && state.settlement.persistence === "unknown"
      && state.settlement.operation === "abandon"
      && state.settlement.actions?.primary === "重试返回"
      && state.settlement.actions?.secondary === undefined
      && state.settlement.message?.includes("道具返还结果待确认"),
    `ambiguous abandon did not freeze its recovery action: ${JSON.stringify(state.settlement)}`);
    assert(state.economy.boosters.time === 2 && state.activeRun?.boosterSpent.time === 1,
      "ambiguous abandon prematurely changed runtime inventory");
    assert(disk.boosters.time === 3 && disk.activeRun === undefined
      && disk.coins === seed.coins && !disk.rewardedLevels.includes(4)
      && disk.bestStars["4"] === undefined && disk.bestMoves["4"] === undefined,
    "ambiguous abandon did not leave the exact refund candidate on disk");
    assert(probe.writes.length === 2
      && probe.writes[0].mode === "blocked"
      && probe.writes[1].mode === "write-then-throw"
      && probe.reads.some((read) => read.blocked),
    "ambiguous abandon did not exercise the lost acknowledgement/read path");
    await page.screenshot({ path: shot("round103-settlement-abandon-unknown-protected.png") });

    // The removed secondary target stays inert while the abandon write is
    // unknown, so the player cannot switch the pending transaction.
    await clickLogical(page, 248, 833);
    await page.waitForTimeout(120);
    state = await debug(page);
    probe = await faultProbe(page);
    assert(state.screen === "settlementFailed" && state.settlement.operation === "abandon"
      && probe.writes.length === 2,
    "ambiguous abandon allowed its frozen operation to be replaced");

    await setWriteFaultMode(page, "open");
    await clickLogical(page, 248, 754);
    await waitForScreen(page, "home", 3_000);
    state = await debug(page);
    disk = await stored(page);
    probe = await faultProbe(page);
    assert(probe.writes.length === 4
      && JSON.stringify(probe.writes[1].payload) === JSON.stringify(probe.writes[2].payload)
      && JSON.stringify(probe.writes[2].payload) === JSON.stringify(probe.writes[3].payload),
    "ambiguous abandon retry did not reuse the exact immutable refund candidate");
    assert(state.level.id === 4 && !state.activeRun && disk.activeRun === undefined
      && state.economy.boosters.time === 3 && disk.boosters.time === 3
      && state.economy.coins === seed.coins && disk.coins === seed.coins
      && !state.economy.rewardedLevels.includes(4) && !disk.rewardedLevels.includes(4)
      && state.progression.bestStars["4"] === undefined && state.progression.bestMoves["4"] === undefined,
    "ambiguous abandon retry reversed the player's refund choice");
    await page.screenshot({ path: shot("round103-settlement-abandon-unknown-recovered.png") });

    await page.reload({ waitUntil: "networkidle" });
    await page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().art?.ready === true, undefined, { timeout: 15_000 });
    state = await debug(page);
    assert(state.screen === "home" && state.economy.boosters.time === 3
      && state.economy.coins === seed.coins && !state.economy.rewardedLevels.includes(4) && !state.activeRun,
    "ambiguous abandon refund did not survive refresh");
    await context.close();
  }

  // The final campaign result cannot expose the season-complete state until
  // the level-200 reward, stars, and 600-star total are durably committed.
  {
    const finalLevelId = 200;
    const completed = Array.from({ length: finalLevelId - 1 }, (_, index) => index + 1);
    const seed = makeSave({
      currentLevel: finalLevelId,
      highestLevel: finalLevelId,
      coins: 5000,
      rewardedLevels: completed,
      bestStars: Object.fromEntries(completed.map((levelId) => [String(levelId), 3])),
      bestMoves: Object.fromEntries(completed.map((levelId) => [String(levelId), 20])),
    });
    const { context, page } = await createScenario(seed);
    await startNormal(page, finalLevelId);
    const baseline = await stored(page);
    const reward = 20;
    await installWriteFault(page);
    // Lv200 intentionally has no generic validation-solver route while its
    // authored proof is being certified. This scenario tests the persistence
    // boundary itself, so complete the in-memory model and enter the same
    // settlement method the final exit animation calls.
    await page.evaluate(() => {
      const game = window.__COLOR_ESCAPE__;
      const snapshot = game.model.snapshot();
      game.model.restore({
        ...snapshot,
        blocks: [],
        queuedBlocks: [],
        moves: 0,
        complete: true,
        failed: false,
      });
      game.beginCelebration();
    });
    await expectFailedSettlement(page, baseline, finalLevelId, reward, `Lv${finalLevelId} season clear`);
    let state = await debug(page);
    assert(state.screen === "settlementFailed"
      && state.settlement.message === "赛季完成状态尚未保存"
      && state.settlement.rewardPresented === false,
    `Lv${finalLevelId} exposed a completed season before its save succeeded`);
    await page.screenshot({ path: shot(`round101-settlement-lv${finalLevelId}-save-failed.png`) });

    state = await retryWithDoubleClick(page, `Lv${finalLevelId} season clear`, "win");
    assert(state.economy.coins === baseline.coins + reward
      && state.economy.rewardedLevels.filter((id) => id === finalLevelId).length === 1
      && state.progression.bestStars[String(finalLevelId)] === 3,
    `Lv${finalLevelId} retry did not commit its final reward and stars exactly once`);
    await waitForScreen(page, "win", 4_000);
    state = await debug(page);
    const disk = await stored(page);
    const starTotal = Object.values(state.progression.bestStars).reduce((sum, stars) => sum + stars, 0);
    assert(state.winAction === "返回主页" && state.winSecondaryAction === "关闭" && starTotal === finalLevelId * 3
      && disk.coins === baseline.coins + reward
      && disk.rewardedLevels.filter((id) => id === finalLevelId).length === 1
      && disk.bestStars[String(finalLevelId)] === 3
      && disk.currentLevel === finalLevelId && disk.highestLevel === finalLevelId
      && disk.activeRun === undefined,
    `Lv${finalLevelId} durable retry did not unlock the single final result`);
    await page.screenshot({ path: shot(`round101-settlement-lv${finalLevelId}-recovered-win.png`) });
    await clickInteractionTarget(page, "modalPrimary");
    await waitForScreen(page, "home", 3_000);
    state = await debug(page);
    assert(state.level.id === finalLevelId && state.progression.highestLevel === finalLevelId && !state.activeRun
      && state.completionFlow?.coinFlight?.endCoins === baseline.coins + reward,
    `Lv${finalLevelId} primary action did not return to the final campaign Home coin flight`);
    await context.close();
  }

  // Both recovery actions remain reachable after portrait down-scaling. A
  // blocked retry stays on the modal; abandoning once writes recover refunds
  // no reward and returns to the same level home.
  {
    const seed = makeSave({
      currentLevel: 4,
      highestLevel: 4,
      rewardedLevels: [1, 2, 3],
      bestStars: { "1": 3, "2": 3, "3": 3 },
      bestMoves: { "1": 8, "2": 10, "3": 12 },
    });
    const { context, page } = await createScenario(seed, { width: 320, height: 568 });
    await startNormal(page, 4);
    const { finalDrag } = await prepareFinalDrag(page);
    const baseline = await stored(page);
    const reward = 20;
    await installWriteFault(page);
    await performDrag(page, finalDrag, 20);
    await expectFailedSettlement(page, baseline, 4, reward, "320x568 Lv4 clear");
    await page.screenshot({ path: shot("round101-settlement-save-failed-320x568.png") });

    await clickLogical(page, 248, 754);
    let state = await debug(page);
    assert(state.screen === "settlementFailed" && state.settlement.attempts === 2,
      "320x568 retry target missed or escaped after another blocked write");
    await setWriteBlocked(page, false);
    await clickLogical(page, 248, 833);
    await waitForScreen(page, "home", 3_000);
    state = await debug(page);
    const disk = await stored(page);
    assert(state.level.id === 4 && state.economy.coins === seed.coins
      && !state.economy.rewardedLevels.includes(4) && !state.activeRun
      && disk.coins === seed.coins && !disk.rewardedLevels.includes(4) && disk.activeRun === undefined,
    "320x568 abandon target missed or committed an unsaved reward");
    await context.close();
  }

  if (errors.length) throw new Error(`Browser errors:\n${errors.join("\n")}`);
  console.log("Transactional Lv3/Lv4 direct-transition recovery, lost-write acknowledgement recovery, ambiguous settlement/abandon protection, Lv200 Home coin-flight result, retry idempotency, refresh persistence, abandon refund, and 320x568 actions passed.");
} finally {
  await browser.close();
}
