import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";

// Actual Pointer starts/controls. Date is controlled only for life recovery and
// unlimited-window boundaries. Named board fixtures and forced timeout are
// explicit lifecycle probes, not claims of solving the official level.
const root = fileURLToPath(new URL("../", import.meta.url));
const output = resolve(root, process.env.PLAYTEST_OUTPUT ?? `playtest-results/lives-start-${new Date().toISOString().replaceAll(":", "-")}`);
const url = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
const NOW = Date.parse("2026-09-23T12:00:00.000Z"), INTERVAL = 30 * 60 * 1000;
const KEY = "color-escape-save-v1";
const files = ["src/core/lives.ts", "src/game/ColorEscapeGame.ts", "src/game/localization.ts", "docs/mechanism-rules-v1.16.0.md", "tools/playtest-lives.mjs"];
const hashes = async () => Object.fromEntries(await Promise.all(files.map(async f => [f, createHash("sha256").update(await readFile(resolve(root, f))).digest("hex")])));
const sourcesBefore = await hashes();
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [], errors = [];
let page, context, scenarioName;
const life = (lives = 5, unlimitedLivesUntilMs = 0) => ({ lives, nextLifeAtMs: lives < 5 ? NOW + INTERVAL : 0, unlimitedLivesUntilMs });
const debug = () => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const stored = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
const ready = () => page.waitForFunction(() => {
  const g = window.__COLOR_ESCAPE__, d = g?.getDebugState();
  return d?.storage?.baselineReady && d.art.ready && !g.revisedArtLoading
    && d.art.formalGameplay.requestedBlockSignature == null
    && d.art.formalGameplay.missingWholeBlockIds.length === 0;
}, undefined, { timeout: 20000 });
const screen = value => page.waitForFunction(v => window.__COLOR_ESCAPE__.getDebugState().screen === v, value, { timeout: 6000 });
const point = (d, x, y) => ({ x: d.viewportTransform.offsetX + x * d.viewportTransform.scale, y: d.viewportTransform.offsetY + y * d.viewportTransform.scale });
const blockPoint = (d, b, x = b.x, y = b.y) => point(d, d.board.innerX + (x + b.shape[0][0] + .5) * d.board.cell, d.board.innerY + (y + b.shape[0][1] + .5) * d.board.cell);
async function click(name) {
  const d = await debug(), r = d.interactionTargets.targets[name]?.hit;
  assert.ok(r, `Missing interaction target ${name}`);
  const p = point(d, r.x + r.width / 2, r.y + r.height / 2);
  await page.mouse.click(p.x, p.y);
}
async function touchBlock(id = "red-exit", { hold = false } = {}) {
  const d = await debug(), b = id ? d.puzzle.blocks.find(b => b.id === id) : d.puzzle.blocks.find(b => !b.frozen && !b.lockedBy && !b.shutterId);
  assert.ok(b, `Missing active Pointer block ${id}`);
  const p = blockPoint(d, b);
  await page.mouse.move(p.x, p.y); await page.mouse.down();
  if (!hold) await page.mouse.up();
  return b.id;
}
async function drag(id, x, y) {
  const d = await debug(), b = d.puzzle.blocks.find(b => b.id === id), p = blockPoint(d, b), q = blockPoint(d, b, x, y);
  await page.mouse.move(p.x, p.y); await page.mouse.down(); await page.mouse.move(q.x, q.y, { steps: 2 }); await page.mouse.up();
}
async function evidence(label) {
  const d = await debug();
  return { label, screen: d.screen, level: d.level.id, lives: d.lives, activeRun: d.activeRun,
    selectedId: d.selectedId, moves: d.puzzle.moves, remaining: d.puzzle.remainingSeconds,
    boosters: d.economy.boosters, coins: d.economy.coins, feedback: d.hudFeedback,
    stored: await stored(), completionFlow: d.completionFlow };
}
async function startHome() { await click("homePlay"); await screen("playing"); await ready(); }
async function fixture({ lastBlock = false, frozen = true, levelId = 1 } = {}) {
  await page.evaluate(async ({ lastBlock, frozen, levelId }) => {
    const { PuzzleModel } = await import("/src/core/PuzzleModel.ts");
    const g = window.__COLOR_ESCAPE__;
    g.model = new PuzzleModel({ id: levelId, name: "Life lifecycle Pointer fixture", difficulty: "normal", width: 6, height: 6,
      timeSeconds: 180, reward: 0, parMoves: 20,
      gates: [{ id: "red", color: "red", side: "left", offset: 1, size: 1 }, { id: "blue", color: "blue", side: "right", offset: 3, size: 1 }, { id: "green", color: "green", side: "bottom", offset: 4, size: 1, ...(frozen ? { frozen: 3 } : {}) }],
      blocks: [{ id: "red-exit", color: "red", x: 1, y: 1, shape: [[0, 0]] }, ...(!lastBlock ? [
        { id: "blue-active", color: "blue", x: 3, y: 3, shape: [[0, 0]] },
        { id: "green-frozen", color: "green", x: 4, y: 4, shape: [[0, 0]], ...(frozen ? { frozen: 3 } : {}) },
      ] : [])],
    }, { deferExitCompletion: true });
    g.ensureRevisedMechanismArt(); g.dirty = true; g.render();
  }, { lastBlock, frozen, levelId });
  await ready();
}
async function timeout() {
  // Legacy countdown may remain unstarted after a zero-distance selection or
  // its undo. Make a real legal move before forcing only the timeout boundary.
  if (!(await debug()).puzzle.started) await drag("blue-active", 2, 3);
  assert.equal((await debug()).puzzle.started, true);
  await page.evaluate(() => {
    const m = window.__COLOR_ESCAPE__.model;
    const freeze = m.snapshot().timeFreezeSeconds;
    if (freeze > 0) m.tick(freeze);
    // The run was started by real Pointer earlier; do not force started=true.
    m.remainingSeconds = .001;
  });
  await screen("failed");
}
async function setNow(value) { await page.evaluate(now => { window.__LIFE_NOW__ = now; window.__COLOR_ESCAPE__.refreshLifeState(now); }, value); }
async function setup(name, lifeState, { levelId = 1, viewport = { width: 390, height: 844 } } = {}) {
  scenarioName = name;
  context = await browser.newContext({ viewport, timezoneId: "UTC" });
  await context.addInitScript(now => {
    window.__LIFE_NOW__ = now;
    const NativeDate = Date;
    const ControlledDate = new Proxy(NativeDate, {
      apply(target) { return new target(window.__LIFE_NOW__).toString(); },
      construct(target, args) { return Reflect.construct(target, args.length ? args : [window.__LIFE_NOW__], target); },
    });
    Object.defineProperty(ControlledDate, "now", { value: () => window.__LIFE_NOW__ });
    window.Date = ControlledDate;
  }, NOW);
  page = await context.newPage();
  page.on("console", m => { if (m.type() === "error") errors.push({ scenario: name, text: m.text() }); });
  page.on("pageerror", e => errors.push({ scenario: name, text: e.message }));
  await page.goto(url, { waitUntil: "networkidle" }); await ready();
  const updateId = (await debug()).updateNotice.id;
  await page.evaluate(({ key, lifeState, updateId, levelId }) => localStorage.setItem(key, JSON.stringify({
    schemaVersion: 1, currentLevel: levelId, highestLevel: 200, coins: 2000, language: "zh-CN",
    sound: false, haptic: false, reducedMotion: true,
    featureSeen: ["basics", "ice-door", "ice-block", "layer", "shutter", "flip-door", "star-gate", "axis", "key", "bomb", "generator", "colored-grid", "lift"],
    boosterUnlockSeen: ["time", "rocket", "pulse"], boosters: { time: 9, rocket: 9, pulse: 9 },
    bestStars: { "1": 3 }, bestMoves: { "1": 20 }, rewardedLevels: [1], lifeState,
    journeyProgress: { claimedMilestoneLevels: [], seenEpisodeUnlockLevels: [11] },
    lastSeenUpdate: updateId, dailyStreak: 0, lastDailyCompletedDay: "",
  })), { key: KEY, lifeState, updateId, levelId });
  await page.reload({ waitUntil: "networkidle" }); await ready(); await screen("home");
}
async function finish(evidence) {
  const record = { name: scenarioName, status: "PASS", evidence };
  results.push(record);
  await writeFile(resolve(output, `${String(results.length).padStart(2, "0")}-${scenarioName}.json`), JSON.stringify(record, null, 2));
  await page.screenshot({ path: resolve(output, `${String(results.length).padStart(2, "0")}-${scenarioName}.png`) });
  await context.close(); context = undefined;
  console.log(`PASS ${scenarioName}`);
}

try {
  await setup("first-valid-pointer-charges-once-and-failure-does-not", life());
  await startHome(); const opened = await evidence("board-open-no-charge");
  assert.equal(opened.lives.lives, 5); assert.equal(opened.lives.attemptStarted, false);
  await fixture();
  let d = await debug(), p = point(d, d.board.innerX + 5.5 * d.board.cell, d.board.innerY + .5 * d.board.cell);
  await page.mouse.click(p.x, p.y); await touchBlock("green-frozen");
  assert.equal((await debug()).lives.lives, 5);
  await touchBlock("red-exit", { hold: true });
  const firstDown = await evidence("pointer-down-before-any-movement");
  assert.equal(firstDown.lives.lives, 4); assert.equal(firstDown.moves, 0); assert.equal(firstDown.selectedId, "red-exit");
  assert.equal(firstDown.lives.attemptStarted, true); assert.equal(firstDown.stored.activeRun.lifeStarted, true);
  assert.equal(firstDown.lives.nextLifeAtMs, NOW + INTERVAL);
  await page.mouse.up(); await touchBlock(); await click("undo");
  assert.equal((await debug()).lives.lives, 4);
  await timeout(); const failed = await evidence("failure-no-extra-charge"); assert.equal(failed.lives.lives, 4);
  await click("failedReplay"); await screen("playing"); await ready();
  assert.equal((await debug()).lives.lives, 4); assert.equal((await debug()).lives.attemptStarted, false);
  await touchBlock(null); const retry = await evidence("retry-first-pointer"); assert.equal(retry.lives.lives, 3);
  await finish({ opened, firstDown, failed, retry });

  await setup("zero-after-start-remains-playable-and-new-attempt-is-blocked", life(1));
  await startHome(); await fixture(); await touchBlock();
  assert.equal((await debug()).lives.lives, 0);
  await drag("blue-active", 2, 3); assert.equal((await debug()).puzzle.blocks.find(b => b.id === "blue-active").x, 2);
  await click("booster.time"); assert.ok((await debug()).puzzle.timeFreezeSeconds > 0);
  await click("pause"); const paused = await evidence("paid-zero-life-pause");
  await click("pauseRestart"); assert.equal((await debug()).screen, "paused");
  assert.equal((await debug()).lives.refillOpen, true); await click("lifeRefillDismiss");
  await click("pauseResume"); await touchBlock("blue-active");
  await timeout(); assert.equal((await debug()).lives.lives, 0);
  await click("failedReplay"); assert.equal((await debug()).screen, "failed");
  assert.equal((await debug()).lives.refillOpen, true); await click("lifeRefillDismiss");
  await click("failedHome"); await click("homePlay");
  const blocked = await evidence("fresh-start-blocked"); assert.equal(blocked.screen, "home"); assert.equal(blocked.activeRun, undefined);
  await finish({ paused, blocked });

  await setup("pause-restart-exit-and-reload-open-new-attempts", life());
  await startHome(); await fixture(); await touchBlock();
  await click("pause"); await click("pauseRestart"); await ready();
  assert.equal((await debug()).lives.lives, 4); assert.equal((await debug()).lives.attemptStarted, false);
  await touchBlock(null); assert.equal((await debug()).lives.lives, 3);
  await click("pause"); await click("pauseHome"); assert.equal((await debug()).lives.lives, 3);
  await startHome(); await touchBlock(null); assert.equal((await debug()).lives.lives, 2);
  await page.reload({ waitUntil: "networkidle" }); await ready();
  const recovered = await evidence("interrupted-run-no-life-refund"); assert.equal(recovered.lives.lives, 2); assert.equal(recovered.screen, "home");
  await startHome(); await touchBlock(null); assert.equal((await debug()).lives.lives, 1);
  await finish({ recovered, restarted: await evidence("new-start-after-reload") });

  for (const booster of ["time", "rocket", "pulse"]) {
    await setup(`first-${booster}-success-starts-once`, life()); await startHome(); await fixture();
    if (booster === "rocket") {
      await click("booster.rocket"); assert.equal((await debug()).lives.lives, 5);
      await touchBlock("green-frozen"); assert.equal((await debug()).lives.lives, 5);
      await touchBlock();
    } else await click(`booster.${booster}`);
    const started = await evidence("valid-booster-start"); assert.equal(started.lives.lives, 4); assert.equal(started.lives.attemptStarted, true);
    assert.equal(started.boosters[booster], 8);
    await click("undo"); assert.equal((await debug()).lives.lives, 4); assert.equal((await debug()).lives.attemptStarted, true);
    await finish({ started, undone: await evidence("undo-never-refunds-life") });
  }

  await setup("invalid-booster-does-not-start", life()); await startHome(); await fixture({ frozen: false });
  await click("booster.pulse"); assert.equal((await debug()).lives.lives, 5); assert.equal((await debug()).lives.attemptStarted, false);
  await page.evaluate(() => { window.__COLOR_ESCAPE__.save.boosters.time = 0; });
  await click("booster.time"); assert.equal((await debug()).lives.lives, 5);
  await finish({ rejected: await evidence("invalid-and-empty-use") });

  await setup("unlimited-expiry-does-not-recharge-current-run", life(2, NOW + 1000));
  await startHome(); await fixture(); await touchBlock(); assert.equal((await debug()).lives.lives, 2);
  await setNow(NOW + 2000); await touchBlock(); assert.equal((await debug()).lives.lives, 2);
  await timeout(); assert.equal((await debug()).lives.lives, 2);
  await click("failedReplay"); await ready(); await touchBlock(null); assert.equal((await debug()).lives.lives, 1);
  await finish({ restarted: await evidence("fresh-run-after-unlimited-expiry") });

  for (const [name, initialLives, unlimitedStart, unlimitedAtWin, expected] of [
    ["ordinary-win-returns-one", 1, false, false, 1],
    ["unlimited-win-returns-none", 2, true, true, 2],
    ["expired-unlimited-win-can-exceed-five", 5, true, false, 6],
    ["new-unlimited-before-win-returns-none", 2, false, true, 1],
  ]) {
    await setup(name, life(initialLives, unlimitedStart ? NOW + 1000 : 0)); await startHome(); await fixture({ lastBlock: true });
    await touchBlock();
    if (unlimitedStart && !unlimitedAtWin) await setNow(NOW + 2000);
    if (!unlimitedStart && unlimitedAtWin) await page.evaluate(now => { const g = window.__COLOR_ESCAPE__; g.save.lifeState.unlimitedLivesUntilMs = now + 60000; g.persist(); }, NOW);
    const beforeWin = await evidence("started-before-final-clear");
    await drag("red-exit", 0, 1);
    await page.waitForFunction(() => { const d = window.__COLOR_ESCAPE__.getDebugState(); return d.level.id === 2 && !d.completionFlow.directTransition; }, undefined, { timeout: 6000 });
    const next = await evidence("settled-and-continuous-next-open");
    assert.equal(next.lives.lives, expected); assert.equal(next.lives.attemptStarted, false); assert.equal(next.stored.lifeState.lives, expected);
    await touchBlock(null);
    const firstNext = await evidence("next-level-first-pointer"); assert.equal(firstNext.lives.lives, expected - (unlimitedAtWin ? 0 : 1));
    await finish({ beforeWin, next, firstNext, fixtureNote: "One-block lifecycle fixture, not official Lv1 solution" });
  }

  await setup("thirty-minute-recovery-offline-and-overcap-persistence", life(2));
  await setNow(NOW + INTERVAL - 1); assert.equal((await debug()).lives.lives, 2);
  await setNow(NOW + INTERVAL); assert.equal((await debug()).lives.lives, 3);
  await setNow(NOW + 4 * INTERVAL); assert.equal((await debug()).lives.lives, 5);
  const regenerated = await evidence("normal-recovery-stops-at-five");
  await page.evaluate(({ key, now, interval }) => {
    const save = JSON.parse(localStorage.getItem(key));
    save.lifeState = { lives: 1, nextLifeAtMs: now - interval / 2, unlimitedLivesUntilMs: 0 };
    localStorage.setItem(key, JSON.stringify(save));
  }, { key: KEY, now: NOW, interval: INTERVAL });
  await page.reload({ waitUntil: "networkidle" }); await ready();
  const offline = await evidence("reload-reconciles-missed-recovery-deadline");
  assert.equal(offline.lives.lives, 2); assert.equal(offline.lives.nextLifeAtMs, NOW + INTERVAL / 2);
  await page.evaluate(({ key, now }) => { const save = JSON.parse(localStorage.getItem(key)); save.lifeState = { lives: 7, nextLifeAtMs: 0, unlimitedLivesUntilMs: 0 }; localStorage.setItem(key, JSON.stringify(save)); }, { key: KEY, now: NOW });
  await page.reload({ waitUntil: "networkidle" }); await ready();
  const overcap = await evidence("reward-overcap-survives-reload"); assert.equal(overcap.lives.lives, 7);
  await startHome(); await touchBlock(null); assert.equal((await debug()).lives.lives, 6); assert.equal((await debug()).lives.nextLifeAtMs, 0);
  await finish({ regenerated, offline, overcap, started: await evidence("seven-to-six-does-not-start-recovery") });

  await setup("unlimited-expiry-during-direct-next-returns-home-safely", life(0, NOW + 1000));
  await startHome(); await fixture({ lastBlock: true }); await touchBlock();
  assert.equal((await debug()).lives.lives, 0);
  await page.evaluate(now => {
    const g = window.__COLOR_ESCAPE__, original = g.createPendingSettlement.bind(g);
    g.createPendingSettlement = (...args) => {
      const beforeAt = Date.now(), result = original(...args);
      window.__directLifeExpiryEvidence = { beforeAt, beforeLife: structuredClone(result.baselineSave.lifeState), candidateLife: structuredClone(result.candidateSave.lifeState) };
      // Controlled life clock boundary immediately after settlement snapshots
      // the still-active unlimited window, before the real next-level switch.
      window.__LIFE_NOW__ = now + 2000;
      return result;
    };
  }, NOW);
  await drag("red-exit", 0, 1);
  await page.waitForFunction(() => { const d = window.__COLOR_ESCAPE__.getDebugState(); return d.screen === "home" && d.level.id === 2 && !d.completionFlow.directTransition; }, undefined, { timeout: 6000 });
  const protectedNext = await evidence("expired-next-transition-returned-home");
  assert.equal(protectedNext.lives.lives, 0); assert.equal(protectedNext.lives.refillOpen, true);
  assert.equal(protectedNext.activeRun, undefined);
  const expiry = await page.evaluate(() => window.__directLifeExpiryEvidence);
  assert.equal(expiry.candidateLife.lives, 0); assert.equal(expiry.beforeAt, NOW);
  await click("lifeRefillBuy"); await click("lifeRefillDismiss");
  await startHome(); await touchBlock(null);
  const resumedNext = await evidence("refilled-next-level-first-pointer");
  assert.equal(resumedNext.level, 2); assert.equal(resumedNext.lives.lives, 4); assert.equal(resumedNext.lives.attemptStarted, true);
  await finish({ protectedNext, expiry, resumedNext });

  await setup("daily-task-go-to-play-uses-normal-charge", life());
  assert.equal((await debug()).interactionTargets.targets.homeDaily, undefined);
  await click("homeMissions"); await screen("dailyTasks");
  await page.waitForFunction(() => window.__COLOR_ESCAPE__.getDebugState().dailyTasks.art.ready);
  assert.equal((await debug()).lives.lives, 5);
  const task = (await debug()).dailyTasks.entries.find(t => !t.completed);
  assert.ok(task); await click(`dailyTaskClaim.${task.id}`); await screen("playing"); await ready();
  assert.equal((await debug()).lives.lives, 5); await touchBlock(null); assert.equal((await debug()).lives.lives, 4);
  await finish({ started: await evidence("daily-task-go-to-campaign"), note: "Independent daily challenge is removed; tests the existing daily-task Go entry" });

  for (const mode of ["rejected", "unknown"]) {
    await setup(`life-start-save-${mode}-retry-is-idempotent`, life()); await startHome(); await fixture();
    await page.evaluate(({ key, mode }) => {
      const originalSet = Storage.prototype.setItem, originalGet = Storage.prototype.getItem;
      let transactionStarted = false;
      window.__restoreLifeStorage = () => { Storage.prototype.setItem = originalSet; Storage.prototype.getItem = originalGet; };
      Storage.prototype.setItem = function(name, value) {
        if (name === key && JSON.parse(value).activeRun?.lifeStarted) {
          if (mode === "unknown") { originalSet.call(this, name, value); transactionStarted = true; }
          throw new DOMException("life-start test storage fixture", mode === "unknown" ? "UnknownError" : "QuotaExceededError");
        }
        return originalSet.call(this, name, value);
      };
      Storage.prototype.getItem = function(name) { if (name === key && mode === "unknown" && transactionStarted) throw new DOMException("readback unavailable", "UnknownError"); return originalGet.call(this, name); };
    }, { key: KEY, mode });
    await touchBlock(); let denied = await debug();
    assert.equal(denied.lives.lives, 5); assert.equal(denied.selectedId, undefined); assert.equal(denied.puzzle.moves, 0);
    assert.equal(denied.lives.startPersistence, mode === "unknown" ? "unknown" : "idle");
    await page.evaluate(() => window.__restoreLifeStorage());
    const durableBeforeRetry = await stored();
    assert.equal(durableBeforeRetry.lifeState.lives, mode === "unknown" ? 4 : 5);
    await touchBlock();
    if (!(await debug()).lives.attemptStarted) await touchBlock();
    const recovered = await evidence("storage-retry-resolved"); assert.equal(recovered.lives.lives, 4); assert.equal(recovered.lives.startPersistence, "idle");
    await touchBlock(); assert.equal((await debug()).lives.lives, 4);
    await finish({ denied: { lives: denied.lives, selectedId: denied.selectedId, feedback: denied.hudFeedback }, durableBeforeRetry, recovered });
  }

  await setup("coin-refill-charges-100-per-missing-life-and-fills-only-to-five", life(1));
  await click("homeLife"); assert.equal((await debug()).lives.refillOpen, true);
  await click("lifeRefillBuy");
  const bought = await evidence("refill-committed"); assert.equal(bought.lives.lives, 5); assert.equal(bought.coins, 1600);
  assert.equal(bought.stored.lifeState.lives, 5); assert.equal(bought.stored.coins, 1600);
  await click("homeLife"); assert.equal((await debug()).interactionTargets.targets.lifeRefillBuy, undefined);
  const full = await evidence("full-refill-unavailable"); assert.equal(full.lives.lives, 5); assert.equal(full.coins, 1600);
  await finish({ bought, full });

  await setup("coin-refill-insufficient-balance-is-atomic", life(0));
  await page.evaluate(() => { const g = window.__COLOR_ESCAPE__; g.save.coins = 359; g.persist(); });
  await click("homeLife"); await click("lifeRefillBuy");
  const insufficient = await evidence("insufficient-refill-rejected"); assert.equal(insufficient.lives.lives, 0); assert.equal(insufficient.coins, 359);
  assert.equal(insufficient.stored.coins, 359); await finish({ insufficient });

  await setup("coin-refill-unknown-write-retries-original-candidate", life(0));
  await click("homeLife");
  const refillState = await debug(), closeRect = refillState.interactionTargets.targets.lifeRefillDismiss.hit;
  const refillClosePoint = point(refillState, closeRect.x + closeRect.width / 2, closeRect.y + closeRect.height / 2);
  await page.evaluate(key => {
    const originalSet = Storage.prototype.setItem, originalGet = Storage.prototype.getItem;
    let written = false;
    window.__restoreLifeStorage = () => { Storage.prototype.setItem = originalSet; Storage.prototype.getItem = originalGet; };
    Storage.prototype.setItem = function(name, value) {
      if (name === key) { originalSet.call(this, name, value); written = true; throw new DOMException("ack lost", "UnknownError"); }
      return originalSet.call(this, name, value);
    };
    Storage.prototype.getItem = function(name) { if (name === key && written) throw new DOMException("readback unavailable", "UnknownError"); return originalGet.call(this, name); };
  }, KEY);
  await click("lifeRefillBuy");
  const pending = await debug(); assert.equal(pending.lives.refillPersistence, "unknown"); assert.equal(pending.lives.lives, 0); assert.equal(pending.economy.coins, 2000);
  assert.equal((await debug()).interactionTargets.targets.lifeRefillDismiss, undefined, "Unknown purchase disables closing");
  await page.mouse.click(refillClosePoint.x, refillClosePoint.y); assert.equal((await debug()).lives.refillOpen, true);
  await page.evaluate(() => window.__restoreLifeStorage());
  const firstWrite = await stored(); assert.equal(firstWrite.coins, 1500); assert.equal(firstWrite.lifeState.lives, 5);
  await click("lifeRefillBuy");
  const resolved = await evidence("unknown-refill-confirmed-once"); assert.equal(resolved.coins, 1500); assert.equal(resolved.lives.lives, 5);
  assert.equal(resolved.lives.refillPersistence, "idle");
  await finish({ firstWrite, resolved });

  assert.deepEqual(errors, []);
  const sourcesAfter = await hashes(); assert.deepEqual(sourcesAfter, sourcesBefore, "Life source changed during proof run");
  const report = { status: "PASS", ruleVersion: "1.46.0", cases: results.length, output, sources: sourcesAfter, results: results.map(({ name, status }) => ({ name, status })), errors,
    limits: ["Date-controlled recovery checks do not wait thirty real minutes.", "Timeout is explicitly forced after actual Pointer start.", "Short one-block win fixtures test lifecycle, not official level solvability.", "Daily challenge no longer exists; actual daily-task Go-to-campaign path is covered."] };
  await writeFile(resolve(output, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  await page?.screenshot({ path: resolve(output, "failure.png") }).catch(() => {});
  await writeFile(resolve(output, "failure.json"), JSON.stringify({ error: String(error.stack ?? error), scenario: scenarioName, passed: results.map(r => r.name), state: await debug().catch(() => null), errors }, null, 2));
  throw error;
} finally { await browser.close(); }
