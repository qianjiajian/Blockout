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
  dailyStreak: 0,
  lastDailyCompletedDay: "",
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
  await page.goto(playtestUrl, { waitUntil: "networkidle" });
  const currentUpdateId = await page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState().updateNotice.id);
  await page.evaluate(({ key, value, updateId }) => {
    localStorage.clear();
    localStorage.setItem(key, JSON.stringify({ ...value, lastSeenUpdate: updateId }));
  }, { key: saveKey, value: seed, updateId: currentUpdateId });
  await page.reload({ waitUntil: "networkidle" });
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

const performDrag = async (page, drag) => {
  const state = await debug(page);
  const canvasBounds = await page.locator("canvas").boundingBox();
  assert(canvasBounds, "game canvas has no browser bounds");
  const block = state.puzzle.blocks.find((candidate) => candidate.id === drag.blockId);
  assert(block, `verified route references missing block ${drag.blockId}`);
  const [anchorX, anchorY] = block.shape[0];
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
  await page.waitForTimeout(drag.exitSide ? 330 : 10);
};

const prepareFinalDrag = async (page) => {
  const state = await debug(page);
  const solution = await solutionFor(page, state.level.id);
  assert(solution.solved && solution.drags.length > 0, `level ${state.level.id} has no verified pointer route`);
  for (const drag of solution.drags.slice(0, -1)) await performDrag(page, drag);
  return { finalDrag: solution.drags.at(-1), minimumDrags: solution.minimumDrags };
};

const solveCurrentLevel = async (page) => {
  const { finalDrag } = await prepareFinalDrag(page);
  await performDrag(page, finalDrag);
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

const retryWithDoubleClick = async (page, label) => {
  await setWriteBlocked(page, false);
  await page.mouse.click(248, 754, { clickCount: 2, delay: 12 });
  await waitForScreen(page, "celebrating", 3_000);
  const [state, probe] = await Promise.all([debug(page), faultProbe(page)]);
  assert(state.settlement.status === "committed" && state.settlement.attempts === 2
    && state.settlement.rewardPresented === true && !state.settlement.retryAvailable,
  `${label} did not commit on retry: ${JSON.stringify(state.settlement)}`);
  assert(probe.writes.length === 2 && probe.writes[0].blocked === true && probe.writes[1].blocked === false,
    `${label} double retry caused an unexpected number of settlement writes: ${probe.writes.length}`);
  assert(JSON.stringify(probe.writes[0].payload) === JSON.stringify(probe.writes[1].payload),
    `${label} retry did not persist the exact candidate that originally failed`);
  return state;
};

const waitForQuickAdvance = async (page, nextLevelId) => {
  const screens = [];
  const deadline = Date.now() + 3_000;
  while (Date.now() < deadline) {
    const state = await debug(page);
    screens.push(state.screen);
    if (state.screen === "playing" && state.level.id === nextLevelId) return { state, screens };
    await page.waitForTimeout(20);
  }
  const state = await debug(page);
  throw new Error(`Settlement transaction E2E: quick clear stopped at ${state.screen} Lv${state.level.id}`);
};

try {
  // Lv3: a failed first-clear write must stop the fast lane; a successful retry
  // commits once and resumes the existing Lv1-Lv3 automatic continuation rule.
  {
    const seed = makeSave({
      currentLevel: 3,
      highestLevel: 3,
      rewardedLevels: [1, 2],
      bestStars: { "1": 3, "2": 3 },
      bestMoves: { "1": 8, "2": 10 },
    });
    const { context, page } = await createScenario(seed);
    await startNormal(page, 3);
    const { finalDrag, minimumDrags } = await prepareFinalDrag(page);
    const baseline = await stored(page);
    const before = await debug(page);
    const reward = before.level.reward;
    await installWriteFault(page);
    await performDrag(page, finalDrag);
    await expectFailedSettlement(page, baseline, 3, reward, "Lv3 quick clear");
    await page.screenshot({ path: shot("round101-settlement-lv3-save-failed.png") });

    await page.waitForTimeout(900);
    let state = await debug(page);
    assert(state.screen === "settlementFailed" && state.level.id === 3,
      "Lv3 advanced while its settlement was still unsaved");

    state = await retryWithDoubleClick(page, "Lv3 quick clear");
    assert(state.economy.coins === baseline.coins + reward
      && state.economy.rewardedLevels.filter((id) => id === 3).length === 1
      && state.progression.bestStars["3"] === 3
      && state.progression.bestMoves["3"] === minimumDrags,
    "Lv3 retry did not commit its reward and records exactly once");
    assert(state.discovery.collection.pending === true
      && state.discovery.collection.newestUnseenLevel === 3,
    "Lv3 committed retry did not expose the collection discovery");
    const advanced = await waitForQuickAdvance(page, 4);
    assert(!advanced.screens.includes("win"), "Lv3 retry incorrectly showed the standard win modal");
    assert(advanced.state.puzzle.moves === 0 && advanced.state.activeRun?.levelId === 4,
      "Lv3 retry did not enter a clean Lv4 run");
    let disk = await stored(page);
    assert(disk.coins === baseline.coins + reward && disk.rewardedLevels.filter((id) => id === 3).length === 1
      && disk.currentLevel === 4 && disk.activeRun?.levelId === 4,
    "Lv3 retry did not persist its single reward and Lv4 continuation");
    await page.screenshot({ path: shot("round101-settlement-lv3-recovered-lv4.png") });

    await page.reload({ waitUntil: "networkidle" });
    await page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().art?.ready === true, undefined, { timeout: 15_000 });
    state = await debug(page);
    disk = await stored(page);
    assert(state.screen === "home" && state.level.id === 4 && !state.activeRun
      && state.economy.coins === baseline.coins + reward
      && state.economy.rewardedLevels.filter((id) => id === 3).length === 1
      && disk.coins === baseline.coins + reward && disk.rewardedLevels.filter((id) => id === 3).length === 1
      && state.discovery.collection.pending === true
      && state.discovery.collection.newestUnseenLevel === 3,
    "Lv3 committed reward did not survive refresh exactly once");
    await context.close();
  }

  // Lv4: the standard result modal must appear only after its first-clear save succeeds.
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
    const reward = (await debug(page)).level.reward;
    await installWriteFault(page);
    await performDrag(page, finalDrag);
    await expectFailedSettlement(page, baseline, 4, reward, "Lv4 standard clear");
    await page.screenshot({ path: shot("round101-settlement-lv4-save-failed.png") });

    let state = await retryWithDoubleClick(page, "Lv4 standard clear");
    assert(state.economy.coins === baseline.coins + reward
      && state.economy.rewardedLevels.filter((id) => id === 4).length === 1
      && state.progression.bestStars["4"] === 3
      && state.progression.bestMoves["4"] === minimumDrags,
    "Lv4 retry did not commit its reward and records exactly once");
    await waitForScreen(page, "win", 4_000);
    state = await debug(page);
    let disk = await stored(page);
    assert(state.settlement.status === "committed" && state.winAction === "下一关"
      && state.winSecondaryAction === "返回主页" && !state.quickClear,
    "Lv4 retry did not resolve to the standard win result");
    assert(!state.activeRun && disk.activeRun === undefined && disk.coins === baseline.coins + reward
      && disk.rewardedLevels.filter((id) => id === 4).length === 1
      && disk.highestLevel === 5 && disk.currentLevel === 5,
    "Lv4 standard result was not fully persisted");
    await page.screenshot({ path: shot("round101-settlement-lv4-recovered-win.png") });

    await clickLogical(page, 248, 833);
    await waitForScreen(page, "home", 3_000);
    state = await debug(page);
    disk = await stored(page);
    assert(state.level.id === 5 && disk.currentLevel === 5 && disk.highestLevel === 5 && !state.activeRun,
      "Lv4 first-clear home action did not select the newly unlocked Lv5");
    await page.screenshot({ path: shot("round107-settlement-lv4-home-next.png") });

    await page.reload({ waitUntil: "networkidle" });
    await page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().art?.ready === true, undefined, { timeout: 15_000 });
    state = await debug(page);
    disk = await stored(page);
    assert(state.screen === "home" && state.level.id === 5 && state.economy.coins === baseline.coins + reward
      && state.economy.rewardedLevels.filter((id) => id === 4).length === 1
      && state.progression.bestStars["4"] === 3 && state.progression.bestMoves["4"] === minimumDrags
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
    const reward = (await debug(page)).level.reward;
    await installWriteFault(page);
    await setWriteFaultMode(page, "write-then-throw");
    await performDrag(page, finalDrag);
    await waitForScreen(page, "celebrating", 3_000);
    await setWriteFaultMode(page, "open");

    let state = await debug(page);
    let disk = await stored(page);
    const probe = await faultProbe(page);
    assert(state.settlement.status === "committed" && state.settlement.attempts === 1
      && state.settlement.rewardPresented === true && state.screen !== "settlementFailed",
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

    await waitForScreen(page, "win", 4_000);
    await page.reload({ waitUntil: "networkidle" });
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
    const reward = (await debug(page)).level.reward;
    await installWriteFault(page);
    await setWriteFaultMode(page, "write-then-throw");
    await failNextStorageReads(page);
    await performDrag(page, finalDrag);
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
    await clickLogical(page, 248, 754);
    await waitForScreen(page, "celebrating", 3_000);
    state = await debug(page);
    probe = await faultProbe(page);
    assert(state.settlement.status === "committed" && state.settlement.attempts === 2
      && state.economy.coins === baseline.coins + reward
      && state.economy.rewardedLevels.filter((id) => id === 4).length === 1,
    "ambiguous settlement did not reconcile on exact-candidate retry");
    assert(probe.writes.length === 2
      && JSON.stringify(probe.writes[0].payload) === JSON.stringify(probe.writes[1].payload),
    "ambiguous settlement retry did not reuse the exact immutable candidate");
    await waitForScreen(page, "win", 4_000);
    await page.screenshot({ path: shot("round103-settlement-unknown-recovered.png") });

    await page.reload({ waitUntil: "networkidle" });
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

  // Daily: neither the date nor the streak nor the coins may move until the
  // same frozen daily candidate is durably stored.
  {
    const seed = makeSave({
      currentLevel: 4,
      highestLevel: 6,
      coins: 2000,
      rewardedLevels: [1],
      bestStars: { "1": 3 },
      bestMoves: { "1": 8 },
    });
    const { context, page } = await createScenario(seed);
    const ready = await debug(page);
    const dailyDay = ready.daily.today;
    await page.mouse.click(248, 933);
    await waitForScreen(page, "playing");
    let state = await debug(page);
    assert(state.daily.mode && state.level.id === 1 && state.activeRun?.dailyDayKey === dailyDay,
      "daily run did not start with a frozen day key");
    const { finalDrag } = await prepareFinalDrag(page);
    const baseline = await stored(page);
    await installWriteFault(page);
    await performDrag(page, finalDrag);
    await expectFailedSettlement(page, baseline, 1, 80, "daily first clear");
    state = await debug(page);
    assert(state.daily.mode && state.activeRun?.dailyDayKey === dailyDay
      && state.daily.reward === 0 && state.daily.streak === 0 && state.daily.lastCompletedDay === "",
    "daily failure changed its reward, streak, date, or day ownership");
    await page.screenshot({ path: shot("round101-settlement-daily-save-failed.png") });

    state = await retryWithDoubleClick(page, "daily first clear");
    assert(state.daily.mode && state.daily.reward === 80 && state.daily.streak === 1
      && state.daily.lastCompletedDay === dailyDay && state.economy.coins === 2080,
    "daily retry did not commit its reward/date/streak exactly once");
    await waitForScreen(page, "win", 4_000);
    state = await debug(page);
    let disk = await stored(page);
    assert(state.winAction === "返回主页" && state.settlement.kind === "daily"
      && disk.coins === 2080 && disk.dailyStreak === 1
      && disk.lastDailyCompletedDay === dailyDay
      && disk.currentLevel === 4 && disk.highestLevel === 6 && disk.activeRun === undefined,
    "daily successful retry did not persist its result or ordinary return level");
    await page.screenshot({ path: shot("round101-settlement-daily-recovered-win.png") });

    await page.reload({ waitUntil: "networkidle" });
    await page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().art?.ready === true, undefined, { timeout: 15_000 });
    state = await debug(page);
    disk = await stored(page);
    assert(state.screen === "home" && state.level.id === 4 && state.daily.completedToday
      && state.daily.streak === 1 && state.daily.lastCompletedDay === dailyDay
      && state.progression.highestLevel === 6
      && state.economy.coins === 2080 && !state.activeRun
      && disk.coins === 2080 && disk.dailyStreak === 1 && disk.lastDailyCompletedDay === dailyDay
      && disk.currentLevel === 4 && disk.highestLevel === 6,
    "daily settlement did not survive refresh exactly once");

    // Replaying the completed daily challenge is the strongest end-to-end
    // proof that the persisted idempotency marker cannot pay again.
    await page.mouse.click(248, 933);
    await waitForScreen(page, "playing");
    await solveCurrentLevel(page);
    await waitForScreen(page, "win", 10_000);
    state = await debug(page);
    disk = await stored(page);
    assert(state.daily.reward === 0 && state.daily.streak === 1 && state.economy.coins === 2080
      && disk.coins === 2080 && disk.dailyStreak === 1 && disk.lastDailyCompletedDay === dailyDay
      && disk.currentLevel === 4 && disk.highestLevel === 6,
    "daily replay duplicated the committed reward or streak");
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
    const reward = (await debug(page)).level.reward;
    await installWriteFault(page);
    await performDrag(page, finalDrag);
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
    const reward = (await debug(page)).level.reward;
    await installWriteFault(page);
    await performDrag(page, finalDrag);
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
  // the level-100 reward, stars, and 300-star total are durably committed.
  {
    const completed = Array.from({ length: 99 }, (_, index) => index + 1);
    const seed = makeSave({
      currentLevel: 100,
      highestLevel: 100,
      coins: 5000,
      rewardedLevels: completed,
      bestStars: Object.fromEntries(completed.map((levelId) => [String(levelId), 3])),
      bestMoves: Object.fromEntries(completed.map((levelId) => [String(levelId), 20])),
    });
    const { context, page } = await createScenario(seed);
    await startNormal(page, 100);
    const { finalDrag } = await prepareFinalDrag(page);
    const baseline = await stored(page);
    const reward = (await debug(page)).level.reward;
    await installWriteFault(page);
    await performDrag(page, finalDrag);
    await expectFailedSettlement(page, baseline, 100, reward, "Lv100 season clear");
    let state = await debug(page);
    assert(state.screen === "settlementFailed"
      && state.settlement.message === "赛季完成状态尚未保存"
      && state.settlement.rewardPresented === false,
    "Lv100 exposed a completed season before its save succeeded");
    await page.screenshot({ path: shot("round101-settlement-lv100-save-failed.png") });

    state = await retryWithDoubleClick(page, "Lv100 season clear");
    assert(state.economy.coins === baseline.coins + reward
      && state.economy.rewardedLevels.filter((id) => id === 100).length === 1
      && state.progression.bestStars["100"] === 3,
    "Lv100 retry did not commit its final reward and stars exactly once");
    await waitForScreen(page, "win", 4_000);
    state = await debug(page);
    const disk = await stored(page);
    const starTotal = Object.values(state.progression.bestStars).reduce((sum, stars) => sum + stars, 0);
    assert(state.winAction === "赛季完成" && starTotal === 300
      && disk.coins === baseline.coins + reward
      && disk.rewardedLevels.filter((id) => id === 100).length === 1
      && disk.bestStars["100"] === 3
      && disk.currentLevel === 100 && disk.highestLevel === 100
      && disk.activeRun === undefined,
    "Lv100 durable retry did not unlock the single final result");
    await page.screenshot({ path: shot("round101-settlement-lv100-recovered-win.png") });
    await clickLogical(page, 248, 754);
    await waitForScreen(page, "home", 3_000);
    state = await debug(page);
    assert(state.level.id === 100 && state.progression.highestLevel === 100 && !state.activeRun,
      "Lv100 season-complete action did not return to the final campaign home state");
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
    const reward = (await debug(page)).level.reward;
    await installWriteFault(page);
    await performDrag(page, finalDrag);
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
  console.log("Transactional Lv3 quick clear, Lv4 standard result, lost-write acknowledgement recovery, ambiguous settlement/abandon protection, daily reward, Lv100 season result, retry idempotency, refresh persistence, abandon refund, and 320x568 actions passed.");
} finally {
  await browser.close();
}
