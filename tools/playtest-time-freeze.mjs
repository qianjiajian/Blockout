import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";

// Fresh isolated save, real Pointer controls and natural rAF except the explicitly
// labelled failure-boundary tick. Wrappers below only observe production calls.
const root = fileURLToPath(new URL("../", import.meta.url));
const output = resolve(root, process.env.PLAYTEST_OUTPUT ?? `playtest-results/time-freeze-${new Date().toISOString().replaceAll(":", "-")}`);
const url = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
const profile = "revised-2026-09-23-v1.4";
const files = ["src/core/PuzzleModel.ts", "src/core/types.ts", "src/core/mechanismRules.ts", "src/core/supply.ts", "src/core/levels.ts", "src/core/revisedContinuationLevels.ts", "src/game/ColorEscapeGame.ts", "src/game/localization.ts", "tools/playtest-time-freeze.mjs"];
const hashes = async () => Object.fromEntries(await Promise.all(files.map(async p => [p, createHash("sha256").update(await readFile(resolve(root, p))).digest("hex")])));
const beforeHashes = await hashes();
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
await context.addInitScript(() => localStorage.setItem("color-escape-save-v1", JSON.stringify({
  schemaVersion: 1, currentLevel: 150, highestLevel: 200, coins: 1000,
  sound: false, haptic: false, reducedMotion: false,
  featureSeen: ["basics", "ice-door", "ice-block", "layer", "shutter", "flip-door", "star-gate", "axis", "key", "bomb", "generator", "colored-grid", "lift"],
  boosterUnlockSeen: ["time", "rocket", "pulse"], boosters: { time: 9, rocket: 9, pulse: 9 },
  bestStars: {}, bestMoves: {}, rewardedLevels: [], dailyStreak: 0, lastDailyCompletedDay: "",
})));
const page = await context.newPage();
const results = [], errors = [];
page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", error => errors.push(error.message));
const state = () => page.evaluate(() => {
  const g = window.__COLOR_ESCAPE__, d = g.getDebugState();
  return { screen: d.screen, puzzle: d.puzzle, level: d.level, board: d.board,
    transform: d.viewportTransform, targets: d.interactionTargets.targets,
    boosters: d.economy.boosters, feedback: d.boosterFeedback,
    undoActions: d.undoActions, exitAnimations: d.exitAnimations, appVisible: g.appVisible };
});
const ready = () => page.waitForFunction(() => {
  const g = window.__COLOR_ESCAPE__, d = g?.getDebugState();
  return d?.screen === "playing" && !g.revisedArtLoading && d.art.formalGameplay.requestedBlockSignature == null
    && d.art.formalGameplay.missingWholeBlockIds.length === 0
    && !g.hasActiveMechanicMotion() && !g.hasInitialRevisedRegionPresentation();
}, undefined, { timeout: 15000 });
const cssPoint = (s, x, y) => ({ x: x * s.transform.scale + s.transform.offsetX, y: y * s.transform.scale + s.transform.offsetY });
const blockPoint = (s, b, x = b.x, y = b.y) => cssPoint(s, s.board.innerX + (x + b.shape[0][0] + .5) * s.board.cell, s.board.innerY + (y + b.shape[0][1] + .5) * s.board.cell);
async function click(key) {
  const s = await state(), r = s.targets[key]?.hit;
  assert.ok(r, `Missing real Pointer target ${key}`);
  const p = cssPoint(s, r.x + r.width / 2, r.y + r.height / 2);
  await page.mouse.click(p.x, p.y);
}
async function drag(id, x, y) {
  const s = await state(), b = s.puzzle.blocks.find(b => b.id === id);
  assert.ok(b, `Missing draggable block ${id}`);
  const p = blockPoint(s, b), q = blockPoint(s, b, x, y);
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.mouse.move(q.x, q.y, { steps: 2 });
  await page.mouse.up();
}
const trace = () => page.evaluate(() => structuredClone(window.__timeFreezeEvidence));
const clocks = s => ({ remaining: s.puzzle.remainingSeconds, bombs: Object.fromEntries(s.puzzle.blocks.filter(b => b.timedBombSeconds !== undefined).map(b => [b.id, b.timedBombSeconds])) });
const doors = s => Object.fromEntries(s.flipDoors.map(d => [d.id, d.open]));
const finish = async (name, evidence) => {
  results.push({ name, status: "PASS", ...evidence });
  await writeFile(resolve(output, `${String(results.length).padStart(2, "0")}-${name}.json`), JSON.stringify(evidence, null, 2));
  console.log(`PASS ${name}`);
};

async function fixture({ lastBlock = false } = {}) {
  await page.mouse.up();
  await page.evaluate(async ({ profile, lastBlock }) => {
    window.__stopTimeFreezeRecorder?.();
    const { PuzzleModel } = await import("/src/core/PuzzleModel.ts");
    const g = window.__COLOR_ESCAPE__;
    g.loadLevel(150, true);
    g.save.boosters.time = 9;
    g.model = new PuzzleModel({ id: 150, name: "Time-freeze Pointer fixture", difficulty: "normal", timeSeconds: 180,
      reward: 0, parMoves: 20, width: 6, height: 6, mechanismRules: profile,
      gates: [{ id: "blue-fixed", color: "blue", side: "right", offset: 3, size: 1 }],
      flipDoors: [
        { id: "red-flip", color: "red", side: "left", offset: 1, size: 1, initiallyOpen: true },
        { id: "yellow-flip", color: "yellow", side: "right", offset: 5, size: 1, initiallyOpen: false },
      ],
      blocks: [
        { id: "red-exit", color: "red", x: 1, y: 1, shape: [[0, 0]] },
        ...(!lastBlock ? [
          { id: "active-bomb", color: "blue", x: 3, y: 3, shape: [[0, 0]], timedBombSeconds: 30 },
          { id: "ice-bomb", color: "yellow", x: 4, y: 5, shape: [[0, 0]], frozen: 1, timedBombSeconds: 30 },
        ] : []),
      ],
    }, { deferExitCompletion: true });
    for (const key of ["selectedId", "activePointer", "dragVisual", "pendingButtonPress"]) g[key] = undefined;
    for (const key of ["undoActions", "exitGhosts", "exitPulses", "particles", "revisedTransitions", "mechanicPulses"]) g[key] = [];
    g.pendingCelebration = 0; g.runElapsedSeconds = 0;
    g.ensureRevisedMechanismArt(); g.dirty = true; g.render();
    const model = g.model, log = { frames: [], freezes: [], releases: [], completions: [] };
    window.__timeFreezeEvidence = log;
    const sample = () => {
      const s = model.snapshot();
      return { at: performance.now(), screen: g.screen, visible: g.appVisible, sameModel: g.model === model,
        freeze: s.timeFreezeSeconds, remaining: s.remainingSeconds, failed: s.failed, complete: s.complete,
        bombs: Object.fromEntries(s.blocks.filter(b => b.timedBombSeconds !== undefined).map(b => [b.id, b.timedBombSeconds])),
        doors: Object.fromEntries(s.flipDoors.map(d => [d.id, d.open])), pending: s.pendingExitAnimations ?? [] };
    };
    for (const [method, key] of [["freezeTime", "freezes"], ["tryExit", "releases"], ["completeExitAnimation", "completions"]]) {
      const original = model[method].bind(model);
      model[method] = (...args) => { const before = sample(), result = original(...args), after = sample(); log[key].push({ args, result: structuredClone(result), before, after }); return result; };
    }
    let running = true;
    const record = () => { if (!running) return; log.frames.push(sample()); requestAnimationFrame(record); };
    requestAnimationFrame(record);
    window.__stopTimeFreezeRecorder = () => { running = false; };
  }, { profile, lastBlock });
  await ready();
}

try {
  await page.goto(url, { waitUntil: "networkidle" });
  await fixture();
  // Establish real running clocks with a legal non-clearing Pointer move.
  await drag("active-bomb", 4, 3);
  const beforeRun = await state();
  assert.equal(beforeRun.puzzle.blocks.find(b => b.id === "active-bomb").x, 4);
  await page.waitForTimeout(250);
  const beforeUse = await state();
  assert.ok(beforeUse.puzzle.remainingSeconds < beforeRun.puzzle.remainingSeconds);
  assert.ok(clocks(beforeUse).bombs["active-bomb"] < clocks(beforeRun).bombs["active-bomb"]);
  await click("booster.time");
  let frozen = await state(), log = await trace();
  const use = log.freezes.at(-1);
  assert.equal(use.result, true); assert.deepEqual(use.args, [10]);
  assert.equal(use.after.freeze, 10); assert.equal(use.after.remaining, use.before.remaining);
  assert.deepEqual(use.after.bombs, use.before.bombs);
  assert.equal(frozen.boosters.time, 8); assert.ok(frozen.puzzle.timeFreezeSeconds > 9);
  await page.screenshot({ path: resolve(output, "phone-390x844-time-frozen.png") });
  const historyCount = frozen.undoActions.length;
  await click("booster.time");
  frozen = await state(); log = await trace();
  assert.equal(frozen.boosters.time, 8); assert.equal(frozen.undoActions.length, historyCount);
  assert.equal(log.freezes.length, 1, "UI rejects an active freeze before a second model mutation");
  await finish("real-pointer-freeze-and-repeat-rejected", { beforeUse, frozen, use });

  await drag("active-bomb", 3, 3);
  assert.equal((await state()).puzzle.blocks.find(b => b.id === "active-bomb").x, 3);
  await drag("red-exit", 0, 1);
  log = await trace();
  const release = log.releases.filter(r => r.result.ok).at(-1);
  assert.ok(release?.result.exitAnimationId);
  assert.deepEqual(release.after.doors, release.before.doors, "Door stays unchanged when removal starts");
  assert.ok(release.after.freeze > 0);
  await page.waitForFunction(() => window.__timeFreezeEvidence.completions.some(c => c.result), undefined, { timeout: 3000 });
  const afterExit = await state(); log = await trace();
  assert.ok(!afterExit.puzzle.blocks.some(b => b.id === "red-exit"));
  assert.equal(afterExit.puzzle.blocks.find(b => b.id === "ice-bomb").frozen, 0);
  assert.equal(clocks(afterExit).bombs["ice-bomb"], 30);
  assert.deepEqual(clocks(afterExit).bombs, use.after.bombs);
  assert.equal(afterExit.puzzle.remainingSeconds, use.after.remaining);
  const completion = log.completions.find(c => c.result);
  assert.ok(completion.before.at > release.after.at);
  assert.deepEqual(completion.after.doors, { "red-flip": false, "yellow-flip": true });
  await finish("drag-clear-new-bomb-and-delayed-flip-during-freeze", { release, completion, afterExit });

  await click("pause");
  const paused = await state(); assert.equal(paused.screen, "paused");
  await page.waitForTimeout(350);
  const pausedLater = await state();
  assert.equal(pausedLater.puzzle.timeFreezeSeconds, paused.puzzle.timeFreezeSeconds);
  assert.deepEqual(clocks(pausedLater), clocks(paused));
  await click("pauseResume");
  await page.waitForTimeout(100);
  assert.ok((await state()).puzzle.timeFreezeSeconds < paused.puzzle.timeFreezeSeconds);
  // Chromium headless tabs do not become hidden reliably; route an explicit
  // visibilitychange through the real WebHost lifecycle without changing time.
  await page.evaluate(() => { Object.defineProperty(document, "hidden", { configurable: true, get: () => true }); document.dispatchEvent(new Event("visibilitychange")); });
  const hidden = await state(); assert.equal(hidden.appVisible, false); assert.equal(hidden.screen, "paused");
  await page.waitForTimeout(350);
  const hiddenLater = await state();
  assert.equal(hiddenLater.puzzle.timeFreezeSeconds, hidden.puzzle.timeFreezeSeconds);
  assert.deepEqual(clocks(hiddenLater), clocks(hidden));
  await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event("visibilitychange")); });
  await click("pauseResume");
  await finish("pause-and-webhost-visibility-preserve-freeze", { paused, pausedLater, hidden, hiddenLater, visibilityMethod: "Synthetic document.hidden event through production WebHost; not a real OS background test" });

  await page.waitForFunction(() => window.__COLOR_ESCAPE__.model.snapshot().timeFreezeSeconds === 0, undefined, { timeout: 14000 });
  await page.waitForTimeout(300);
  const resumed = await state(); log = await trace();
  assert.ok(resumed.puzzle.remainingSeconds < use.after.remaining - .15);
  for (const [id, value] of Object.entries(use.after.bombs)) assert.ok(clocks(resumed).bombs[id] < value - .15);
  const frozenFrames = log.frames.filter(f => f.at >= use.after.at && f.freeze > 0);
  assert.ok(frozenFrames.length > 100);
  for (const frame of frozenFrames) {
    assert.equal(frame.remaining, use.after.remaining);
    assert.deepEqual(frame.bombs, use.after.bombs);
  }
  const expiredFrame = log.frames.find(f => f.at > use.after.at && f.freeze === 0);
  assert.ok(expiredFrame.at - use.after.at >= 9900, "Ten-second freeze runs on natural browser time");
  await page.screenshot({ path: resolve(output, "phone-390x844-time-resumed.png") });
  await finish("natural-ten-second-expiry-resumes-both-clocks", { elapsedWallMs: expiredFrame.at - use.after.at, frozenFrameCount: frozenFrames.length, resumed, trace: log });

  await fixture(); await click("booster.time");
  await page.waitForTimeout(200);
  await click("undo");
  const undone = await state();
  assert.equal(undone.puzzle.timeFreezeSeconds, 0); assert.equal(undone.boosters.time, 9);
  await finish("undo-freeze-refunds-and-cancels", { undone });

  await fixture(); await click("booster.time");
  await click("pause"); await click("pauseRestart"); await ready();
  const restarted = await state(); assert.equal(restarted.puzzle.timeFreezeSeconds, 0);
  await click("booster.time");
  await page.evaluate(() => window.__COLOR_ESCAPE__.loadLevel(151, true)); await ready();
  const next = await state(); assert.equal(next.puzzle.timeFreezeSeconds, 0); assert.equal(next.level.id, 151);
  await finish("restart-and-new-level-clear-freeze", { restarted, next });

  await fixture({ lastBlock: true }); await click("booster.time");
  await drag("red-exit", 0, 1);
  const wonModel = await state();
  assert.equal(wonModel.puzzle.complete, true); assert.equal(wonModel.puzzle.timeFreezeSeconds, 0);
  await page.waitForFunction(() => window.__timeFreezeEvidence.completions.some(c => c.result), undefined, { timeout: 3000 });
  await page.waitForFunction(() => window.__COLOR_ESCAPE__.getDebugState().screen !== "playing", undefined, { timeout: 6000 });
  await finish("final-clear-cancels-freeze-and-completes-flip", { wonModel, finalScreen: (await state()).screen, trace: await trace() });

  await fixture(); await click("booster.time");
  const failureTick = await page.evaluate(() => {
    const g = window.__COLOR_ESCAPE__, before = g.model.snapshot();
    const delta = before.timeFreezeSeconds + before.remainingSeconds + .1;
    g.model.tick(delta);
    return { mode: "Explicit deterministic model.tick lifecycle fixture; not natural elapsed time", delta, before, after: g.model.snapshot() };
  });
  assert.equal(failureTick.after.failed, true); assert.equal(failureTick.after.timeFreezeSeconds, 0);
  await page.waitForFunction(() => window.__COLOR_ESCAPE__.getDebugState().screen !== "playing", undefined, { timeout: 3000 });
  await page.evaluate(() => window.__COLOR_ESCAPE__.loadLevel(4, true)); await ready();
  const legacyBefore = await state();
  assert.ok(!legacyBefore.level.mechanismRules || legacyBefore.level.mechanismRules === "legacy");
  await click("booster.time"); await page.waitForTimeout(250);
  const legacyAfter = await state();
  assert.ok(legacyAfter.puzzle.timeFreezeSeconds > 9 && legacyAfter.puzzle.timeFreezeSeconds < 10);
  assert.equal(legacyAfter.puzzle.remainingSeconds, legacyBefore.puzzle.remainingSeconds);
  for (const key of ["blocks", "gates", "flipDoors", "coloredGrids", "generators", "shutters", "elevators"]) assert.deepEqual(legacyAfter.puzzle[key], legacyBefore.puzzle[key], `Legacy Lv4 ${key} remains unchanged`);
  await page.screenshot({ path: resolve(output, "phone-390x844-legacy-lv4-freeze.png") });
  await finish("failure-clears-and-legacy-lv4-freezes-with-same-layout", { failureTick, legacyBefore, legacyAfter });

  await fixture();
  await page.evaluate(() => { const g = window.__COLOR_ESCAPE__; g.save.language = "en"; g.dirty = true; });
  await click("booster.time");
  const english = await state();
  assert.equal(english.feedback.text, "Clocks frozen: 10s");
  const feedbackWidth = await page.evaluate(() => {
    const g = window.__COLOR_ESCAPE__, ctx = g.ctx;
    ctx.save(); ctx.font = '900 18px "Microsoft YaHei", "PingFang SC", Arial, sans-serif';
    const width = ctx.measureText(g.boosterFeedback.text).width; ctx.restore(); return width;
  });
  assert.ok(feedbackWidth < 224, "English feedback fits within the 244px pill with margins");
  await page.screenshot({ path: resolve(output, "phone-390x844-time-frozen-en.png") });
  await finish("english-phone-hud-and-feedback-fit", { english, feedbackWidth, pillWidth: 244 });

  assert.deepEqual(errors, []);
  const afterHashes = await hashes(); assert.deepEqual(afterHashes, beforeHashes, "Source files changed during the proof run");
  const report = { status: "PASS", profile, output, cases: results.length, sources: afterHashes, results: results.map(({ name, status }) => ({ name, status })),
    limits: ["Named model fixtures are not claims of solving official revised levels.", "One natural rAF ten-second freeze plus real Pointer controls; failure alone uses a labelled deterministic model tick.", "Background coverage is a synthetic visibility event through the production WebHost.", "Cross-boundary delta arithmetic belongs to model unit tests."], errors };
  await writeFile(resolve(output, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  await page.screenshot({ path: resolve(output, "failure.png") }).catch(() => {});
  await writeFile(resolve(output, "failure.json"), JSON.stringify({ error: String(error.stack ?? error), results: results.map(r => ({ name: r.name, status: r.status })), state: await state().catch(() => null), trace: await trace().catch(() => null), errors }, null, 2));
  throw error;
} finally { await browser.close(); }
