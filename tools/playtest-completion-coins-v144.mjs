import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";

// Settlement integration, not a puzzle solution/Pointer-route certificate.
// Completed-run metrics are injected; production transaction, storage, render,
// retry buttons and return-to-home handlers are exercised in isolated contexts.
const url = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
const output = resolve("playtest-results", `completion-coins-v144-${Date.now()}`);
const saveKey = "color-escape-save-v1";
const sourceFiles = ["src/core/completionRewards.ts", "src/core/economyBalance.ts", "src/game/ColorEscapeGame.ts", "src/core/levels.ts"];
const hashes = async () => Object.fromEntries(await Promise.all(sourceFiles.map(async (file) => [file, createHash("sha256").update(await readFile(file)).digest("hex")])));
const bindings = await hashes();
await mkdir(output, { recursive: true });
const errors = [];
const results = [];
const browser = await chromium.launch({ headless: true });
const state = (page) => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const disk = (page) => page.evaluate((key) => JSON.parse(localStorage.getItem(key)), saveKey);
const loadReady = async (page) => {
  await page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().art?.ready, null, { timeout: 30_000 });
};

async function scenario(name, options = {}) {
  const level = options.level ?? 5;
  const context = await browser.newContext({ viewport: { width: 496, height: 1078 } });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(`${name}: ${error.message}`));
  page.on("console", (message) => { if (message.type() === "error") errors.push(`${name}: ${message.text()}`); });
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await loadReady(page);
  await page.evaluate(({ key, levelId, replay, legacy }) => {
    const game = window.__COLOR_ESCAPE__;
    const save = JSON.parse(JSON.stringify(game.save));
    save.coins = 1000;
    save.currentLevel = levelId;
    save.highestLevel = Math.min(200, levelId + (replay || legacy ? 1 : 0));
    save.rewardedLevels = Array.from({ length: levelId - 1 + (replay ? 1 : 0) }, (_, index) => index + 1);
    if (legacy) delete save.rewardedLevels;
    save.bestStars = replay || legacy ? { [levelId]: 1 } : {};
    save.bestMoves = {};
    save.lifeState = { lives: 4, nextLifeAtMs: Date.now() + 1800000, unlimitedLivesUntilMs: 0 };
    save.activeRun = undefined;
    save.sound = false;
    save.haptic = false;
    save.reducedMotion = true;
    save.language = "zh-CN";
    save.featureSeen = ["basics", "ice-door", "ice-block", "layer", "shutter", "generator", "axis", "key-lock", "lift", "star", "bomb", "flip-door", "color-floor"];
    save.boosterUnlockSeen = ["time", "rocket", "pulse"];
    save.lastSeenUpdate = game.getDebugState().updateNotice.id;
    localStorage.setItem(key, JSON.stringify(save));
  }, { key: saveKey, levelId: level, replay: Boolean(options.replay), legacy: Boolean(options.legacy) });
  await page.reload({ waitUntil: "domcontentloaded" });
  await loadReady(page);
  return { name, context, page, level };
}

async function begin(test, { improved = false, fault = "none" } = {}) {
  return test.page.evaluate(({ level, improved, fault, key }) => {
    const game = window.__COLOR_ESCAPE__;
    game.loadLevel(level, true);
    game.completionMetrics = improved ? { moves: 1, elapsedSeconds: 1 } : { moves: 999999, elapsedSeconds: 999999 };
    game.pendingCelebration = 0;
    const before = JSON.parse(JSON.stringify(game.save));
    const originalText = game.drawFormalWinText.bind(game);
    window.__coinText = [];
    game.drawFormalWinText = (text, ...args) => { window.__coinText.push(text); return originalText(text, ...args); };
    const storageSet = game.host.storageSet.bind(game.host);
    const storageRead = game.host.storageRead.bind(game.host);
    window.__coinFault = { mode: fault, writes: [] };
    game.host.storageSet = (name, value) => {
      if (name !== key) return storageSet(name, value);
      window.__coinFault.writes.push(JSON.parse(JSON.stringify(value)));
      if (window.__coinFault.mode === "rejected") return false;
      const success = storageSet(name, value);
      return window.__coinFault.mode === "unknown" ? false : success;
    };
    game.host.storageRead = (name) => name === key && window.__coinFault.mode === "unknown"
      ? { status: "unavailable" } : storageRead(name);
    game.beginCelebration();
    return before;
  }, { level: test.level, improved, fault, key: saveKey });
}

async function checkCommitted(test, baseline, reward, expectedStars = 1) {
  const { page, name, level } = test;
  await page.waitForFunction(() => window.__COLOR_ESCAPE__.screen === "win" && window.__COLOR_ESCAPE__.winArt, null, { timeout: 30_000 });
  await page.waitForFunction((reward) => window.__coinText.includes(`+${reward}`), reward, { timeout: 5000 });
  const current = await state(page);
  const stored = await disk(page);
  assert.equal(current.economy.coins, baseline.coins + reward, `${name} runtime award`);
  assert.equal(stored.coins, baseline.coins + reward, `${name} durable award`);
  assert.equal(current.settlement.coinReward, reward, `${name} presented award`);
  assert.equal(stored.rewardedLevels.filter((id) => id === level).length, 1, `${name} one first-clear record`);
  assert.equal(stored.bestStars[level], expectedStars, `${name} stars still update`);
  assert.equal(stored.lifeState.lives, baseline.lifeState.lives + 1, `${name} independent life return preserved`);
  assert.deepEqual(stored.journeyProgress, baseline.journeyProgress, `${name} Journey reward ledger preserved`);
  assert.deepEqual(stored.achievementProgress, baseline.achievementProgress, `${name} achievement claim ledger preserved`);
  assert.deepEqual(stored.boosters, baseline.boosters, `${name} booster inventory preserved`);
  const inspiration = await page.evaluate(async ({ before, levelId, earnedStars, firstClear }) => {
    const { collectionInspirationForResult } = await import("/src/core/collectionProgress.ts");
    return collectionInspirationForResult(levelId, before.bestStars[levelId] ?? 0, earnedStars, firstClear);
  }, { before: baseline, levelId: level, earnedStars: expectedStars, firstClear: !baseline.rewardedLevels.includes(level) });
  assert.equal(stored.collectionProgress.inspiration, baseline.collectionProgress.inspiration + inspiration, `${name} inspiration policy preserved`);
  const screenshot = `${name}.png`;
  await page.screenshot({ path: resolve(output, screenshot) });
  results.push({ name, level, reward, coins: stored.coins, earnedStars: expectedStars, inspiration, lifeReturn: 1, screenshot, status: "PASS" });
  return stored;
}

async function clickTarget(page, targetName, options = {}) {
  const current = await state(page);
  const target = current.interactionTargets.targets[targetName].hit;
  const box = await page.locator("canvas").boundingBox();
  const transform = current.viewportTransform;
  await page.mouse.click(box.x + transform.offsetX + (target.x + target.width / 2) * transform.scale,
    box.y + transform.offsetY + (target.y + target.height / 2) * transform.scale, options);
}

async function noReplayFlight(test) {
  await clickTarget(test.page, "modalPrimary");
  const current = await state(test.page);
  assert.equal(current.screen, "home", `${test.name} return home`);
  assert.equal(current.completionFlow.coinFlight, undefined, `${test.name} zero reward has no coin flight`);
}

try {
  const first = await scenario("first-clear-20");
  const firstBaseline = await begin(first);
  await checkCommitted(first, firstBaseline, 20);
  await first.page.reload({ waitUntil: "domcontentloaded" });
  await loadReady(first.page);
  assert.equal((await disk(first.page)).coins, 1020, "reload preserves awarded coins without re-award");
  first.name = "reload-repeat-0";
  const repeatBaseline = await begin(first);
  await checkCommitted(first, repeatBaseline, 0);
  await noReplayFlight(first);
  await first.context.close();

  for (const options of [
    { name: "existing-repeat-0", replay: true },
    { name: "improved-stars-0", replay: true, improved: true },
    { name: "legacy-missing-ledger-repeat-0", legacy: true },
    { name: "final-level-first-20", level: 200 },
  ]) {
    const test = await scenario(options.name, options);
    const baseline = await begin(test, options);
    const reward = options.level === 200 ? 20 : 0;
    await checkCommitted(test, baseline, reward, options.improved ? 3 : 1);
    if (reward === 0) await noReplayFlight(test);
    await test.context.close();
  }

  for (const mode of ["rejected", "unknown"]) {
    const test = await scenario(`${mode}-retry-once-20`);
    const baseline = await begin(test, { fault: mode });
    const failed = await state(test.page);
    const failedDisk = await disk(test.page);
    assert.equal(failed.screen, "settlementFailed");
    assert.equal(failed.settlement.persistence, mode);
    assert.equal(failed.settlement.pendingCoinDelta, 20);
    assert.equal(failed.economy.coins, baseline.coins, `${mode} unconfirmed runtime balance unchanged`);
    assert.equal(failedDisk.coins, baseline.coins + (mode === "unknown" ? 20 : 0), `${mode} disk state`);
    const pendingBytes = await test.page.evaluate(() => JSON.stringify(window.__COLOR_ESCAPE__.pendingSettlement.candidateSave));
    await test.page.evaluate(() => { window.__coinFault.mode = "none"; });
    await clickTarget(test.page, "modalPrimary", { clickCount: 2, delay: 12 });
    await checkCommitted(test, baseline, 20);
    const writes = await test.page.evaluate(() => window.__coinFault.writes);
    assert.equal(writes.filter((write) => JSON.stringify(write) === pendingBytes).length, 2, `${mode} retries immutable candidate`);
    assert.ok(writes.every((write) => write.coins === 1020), `${mode} retry never duplicates credit`);
    await test.context.close();
  }
  assert.deepEqual(errors, [], "browser errors");
  const afterBindings = await hashes();
  assert.deepEqual(afterBindings, bindings, "bound source files unchanged during integration run");
  await writeFile(resolve(output, "report.json"), JSON.stringify({
    status: "PASS", scope: "Production account-settlement/browser-render integration; injected completion metrics, not full puzzle routes or real-device testing",
    isolatedBrowserContexts: true, sourceBindings: bindings, results, errors,
  }, null, 2));
  console.log(JSON.stringify({ status: "PASS", cases: results.length, report: resolve(output, "report.json") }));
} catch (error) {
  await writeFile(resolve(output, "report.json"), JSON.stringify({ status: "FAIL", results, errors, failure: String(error.stack ?? error), sourceBindings: bindings }, null, 2));
  console.error(`Report: ${resolve(output, "report.json")}`);
  throw error;
} finally {
  await browser.close();
}
