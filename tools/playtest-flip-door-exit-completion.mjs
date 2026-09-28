import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";

// Real Pointer input and the browser's natural animation/countdown clock.
// Fixtures live in a fresh browser context. Method wrappers record calls only:
// they do not change input, results, callback timing, or animation durations.
const root = fileURLToPath(new URL("../", import.meta.url));
const output = resolve(root, process.env.PLAYTEST_OUTPUT ?? `playtest-results/flip-door-exit-completion-${new Date().toISOString().replaceAll(":", "-")}`);
const url = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
const profile = "revised-2026-09-23-v1.3";
const sourcePaths = [
  "src/core/PuzzleModel.ts", "src/core/types.ts", "src/core/mechanismRules.ts",
  "src/core/levels.ts", "src/core/revisedContinuationLevels.ts",
  "src/core/revisedContinuationLayouts.generated.ts", "src/game/ColorEscapeGame.ts",
  "tools/playtest-flip-door-exit-completion.mjs",
];
const hashes = async () => Object.fromEntries(await Promise.all(sourcePaths.map(async (p) => [
  p, createHash("sha256").update(await readFile(resolve(root, p))).digest("hex"),
])));
const sourcesBefore = await hashes();
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 496, height: 1078 }, deviceScaleFactor: 1 });
await context.addInitScript(() => localStorage.setItem("color-escape-save-v1", JSON.stringify({
  schemaVersion: 1, currentLevel: 150, highestLevel: 200, coins: 1000,
  sound: false, haptic: false, reducedMotion: false,
  featureSeen: ["basics", "ice-door", "ice-block", "layer", "shutter", "flip-door", "star-gate", "axis", "key", "bomb", "generator", "colored-grid", "lift"],
  boosters: { time: 20, rocket: 20, pulse: 20 }, bestStars: {}, bestMoves: {}, rewardedLevels: [],
  dailyStreak: 0, lastDailyCompletedDay: "",
})));
const page = await context.newPage();
const errors = [], results = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(error.message));
const state = () => page.evaluate(() => {
  const d = window.__COLOR_ESCAPE__.getDebugState();
  return { screen: d.screen, puzzle: d.puzzle, board: d.board, transform: d.viewportTransform,
    selectedId: d.selectedId, activePointer: d.activePointer, exitAnimations: d.exitAnimations,
    exitGhosts: d.exitGhosts, controls: d.controls, targets: d.interactionTargets.targets,
    pendingCelebration: window.__COLOR_ESCAPE__.pendingCelebration,
    ownedParticles: window.__COLOR_ESCAPE__.particles.filter((p) => p.exitAnimationId)
      .map((p) => ({ id: p.exitAnimationId, life: p.life })) };
});
const ready = () => page.waitForFunction(() => {
  const g = window.__COLOR_ESCAPE__, d = g?.getDebugState();
  return d?.screen === "playing" && !g.revisedArtLoading
    && d.art.formalGameplay.requestedBlockSignature == null
    && d.art.formalGameplay.missingWholeBlockIds.length === 0
    && !g.hasActiveMechanicMotion() && !g.hasInitialRevisedRegionPresentation();
}, undefined, { timeout: 15_000 });
const cssPoint = (s, x, y) => ({
  x: x * s.transform.scale + s.transform.offsetX,
  y: y * s.transform.scale + s.transform.offsetY,
});
const blockPoint = (s, block, x = block.x, y = block.y) => cssPoint(s,
  s.board.innerX + (x + block.shape[0][0] + 0.5) * s.board.cell,
  s.board.innerY + (y + block.shape[0][1] + 0.5) * s.board.cell);
const clickTarget = async (key) => {
  const s = await state(), rect = s.targets[key]?.hit;
  assert.ok(rect, `Missing Pointer target ${key}`);
  const p = cssPoint(s, rect.x + rect.width / 2, rect.y + rect.height / 2);
  await page.mouse.click(p.x, p.y);
};
const doors = (snapshot) => Object.fromEntries(snapshot.flipDoors.map((d) => [d.id, d.open]));
const pending = (snapshot) => snapshot.pendingExitAnimations ?? [];
const initialDoors = { "red-flip": true, "yellow-flip": false };
const invertedDoors = { "red-flip": false, "yellow-flip": true };
const trace = () => page.evaluate(() => structuredClone(window.__flipCompletionEvidence));

async function fixture({ layered = false, reduced = false, failureBomb = false, oldProfile = false, lastBlock = false } = {}) {
  await page.mouse.up();
  await page.evaluate(async ({ layered, reduced, failureBomb, profile, oldProfile, lastBlock }) => {
    window.__stopFlipCompletionRecorder?.();
    const { PuzzleModel } = await import("/src/core/PuzzleModel.ts");
    const game = window.__COLOR_ESCAPE__;
    game.loadLevel(150, true);
    game.save.reducedMotion = reduced;
    game.save.boosters.rocket = 20;
    game.model = new PuzzleModel({
      id: lastBlock ? 150 : 9983, name: "Exit completion flip-door Pointer fixture", difficulty: "normal",
      timeSeconds: 180, reward: 0, parMoves: 20, width: 6, height: 6,
      mechanismRules: oldProfile ? "revised-2026-09-21-v1.2" : profile,
      gates: [
        { id: "blue-fixed", color: "blue", side: "right", offset: 3, size: 1 },
        { id: "green-ice", color: "green", side: "bottom", offset: 2, size: 1, frozen: 3 },
      ],
      flipDoors: [
        { id: "red-flip", color: "red", side: "left", offset: 1, size: 1, initiallyOpen: true },
        { id: "yellow-flip", color: "yellow", side: "right", offset: 5, size: 1, initiallyOpen: false },
      ],
      blocks: [
        { id: "red-exit", color: "red", x: 1, y: 1, shape: [[0, 0]], ...(layered ? { layers: ["red", "blue"] } : {}) },
        ...(!lastBlock ? [
        { id: "blue-second", color: "blue", x: 4, y: 3, shape: [[0, 0]] },
        { id: "green-keeps-level-open", color: "green", x: 2, y: 4, shape: [[0, 0]], frozen: 3 },
        { id: "yellow-keeps-door-present", color: "yellow", x: 4, y: 5, shape: [[0, 0]],
          ...(failureBomb ? { frozen: 1, timedBombSeconds: 0.12 } : {}) },
        ] : []),
      ],
    }, { deferExitCompletion: true });
    game.selectedId = undefined;
    game.activePointer = undefined;
    game.dragVisual = undefined;
    game.pendingButtonPress = undefined;
    game.undoActions = [];
    game.exitGhosts = [];
    game.exitPulses = [];
    game.particles = [];
    game.revisedTransitions = [];
    game.mechanicPulses = [];
    game.pendingCelebration = 0;
    game.runElapsedSeconds = 0;
    game.ensureRevisedMechanismArt();
    game.dirty = true;
    game.render();
    const model = game.model;
    const log = { frames: [], releases: [], completions: [], undos: [], injectedCallbacks: [] };
    window.__flipCompletionEvidence = log;
    const sample = () => {
      const snap = model.snapshot();
      return { at: performance.now(), screen: game.screen, sameModel: game.model === model,
        doors: Object.fromEntries(snap.flipDoors.map((d) => [d.id, d.open])),
        pending: snap.pendingExitAnimations ?? [], cleared: snap.cleared,
        remainingSeconds: snap.remainingSeconds, failed: snap.failed,
        animations: game.exitGhosts.map((g) => ({ mode: g.mode, blockId: g.block.id,
          age: g.age, duration: g.duration, id: g.exitAnimationId,
          exitCompletionDuration: g.exitCompletionDuration, exitCompletionDone: g.exitCompletionDone })),
      };
    };
    for (const method of ["tryExit", "removeBlockWithBooster"]) {
      const original = model[method].bind(model);
      model[method] = (...args) => {
        const before = sample(), result = original(...args), after = sample();
        log.releases.push({ method, args, result: structuredClone(result), before, after });
        return result;
      };
    }
    if (typeof model.completeExitAnimation !== "function") throw new Error("New completion API is unavailable");
    const originalComplete = model.completeExitAnimation.bind(model);
    model.completeExitAnimation = (id) => {
      const before = sample(), result = originalComplete(id), after = sample();
      log.completions.push({ id, result, before, after });
      return result;
    };
    const originalUndo = model.undo.bind(model);
    model.undo = () => {
      const before = sample(), result = originalUndo(), after = sample();
      log.undos.push({ result, before, after });
      return result;
    };
    let active = true, handle;
    const record = () => { if (!active) return; log.frames.push(sample()); handle = requestAnimationFrame(record); };
    handle = requestAnimationFrame(record);
    window.__stopFlipCompletionRecorder = () => { active = false; cancelAnimationFrame(handle); };
  }, { layered, reduced, failureBomb, profile, oldProfile, lastBlock });
  await ready();
  const s = await state();
  assert.deepEqual(doors(s.puzzle), initialDoors);
  assert.equal(s.puzzle.failed, false);
  return s;
}

async function exitPointer(id = "red-exit", end = [0, 1]) {
  const s = await state(), b = s.puzzle.blocks.find((b) => b.id === id);
  assert.ok(b, `Pointer needs ${id}`);
  const start = blockPoint(s, b), target = blockPoint(s, b, ...end);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  const selected = await state();
  assert.equal(selected.selectedId, id, `Real Pointer must select ${id}`);
  await page.mouse.move(target.x, target.y, { steps: 2 });
  await page.mouse.up();
  const release = await page.evaluate(() => structuredClone(window.__flipCompletionEvidence.releases.filter((r) => r.result.ok).at(-1)));
  assert.equal(release?.args[0], id, `${id} must leave via normal Pointer path`);
  return release;
}

async function rocketPointer(id = "red-exit") {
  await clickTarget("booster.rocket");
  const s = await state(), b = s.puzzle.blocks.find((b) => b.id === id);
  const p = blockPoint(s, b);
  await page.mouse.click(p.x, p.y);
  const release = await page.evaluate(() => structuredClone(window.__flipCompletionEvidence.releases.filter((r) => r.result.ok).at(-1)));
  assert.equal(release?.method, "removeBlockWithBooster");
  return release;
}

// For overlapping lifecycle cases, precompute points once. Serializing a full
// debug snapshot between two gestures can exceed the short real animation.
async function rapidExitPointer(s, id, end) {
  const b = s.puzzle.blocks.find((b) => b.id === id);
  const start = blockPoint(s, b), target = blockPoint(s, b, ...end);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(target.x, target.y);
  await page.mouse.up();
}

async function rapidTarget(s, key) {
  const r = s.targets[key].hit, p = cssPoint(s, r.x + r.width / 2, r.y + r.height / 2);
  await page.mouse.click(p.x, p.y);
}

async function waitCompletions(count) {
  await page.waitForFunction((count) => window.__flipCompletionEvidence.completions.filter((c) => c.result).length >= count,
    count, { timeout: 6000 });
}

function assertOneCompletion(log, release, expectedBefore, expectedAfter) {
  const id = release.result.exitAnimationId;
  assert.ok(id, "Each clear must register a distinct completion ID");
  assert.deepEqual(release.after.doors, expectedBefore, "Clear registration must not flip a gate");
  assert.ok(release.after.pending.includes(id));
  const completions = log.completions.filter((c) => c.id === id && c.result);
  assert.equal(completions.length, 1, "One accepted completion per successful clear");
  const c = completions[0];
  assert.deepEqual(c.before.doors, expectedBefore, "Door state before completing the visual");
  assert.deepEqual(c.after.doors, expectedAfter, "All doors, including the used door, flip once");
  assert.ok(!c.after.pending.includes(id));
  const animated = log.frames.filter((f) => f.pending.includes(id)
    && f.animations.some((a) => a.id === id && a.age > 0));
  assert.ok(animated.length, "Observe at least one real animation frame before completion");
  for (const f of animated) assert.deepEqual(f.doors, expectedBefore, "Mid-animation doors keep their old state");
  const ghost = c.before.animations.find((a) => a.id === id);
  assert.ok(ghost, "Completion must belong to an actual exit animation");
  assert.ok(ghost.age + 0.000001 >= ghost.exitCompletionDuration,
    `Premature completion age=${ghost.age} expected=${ghost.exitCompletionDuration}`);
  assert.ok(c.after.at >= release.after.at, "Completion follows registration");
}

async function injectCallback(id) {
  return page.evaluate((id) => {
    const model = window.__COLOR_ESCAPE__.model;
    const before = model.snapshot(), result = model.completeExitAnimation(id), after = model.snapshot();
    window.__flipCompletionEvidence.injectedCallbacks.push({ id, result, before, after });
    return { result, before, after };
  }, id);
}

async function finish(name, extra = {}) {
  results.push({ name, ...extra, final: await state(), evidence: await trace() });
}

try {
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().art.ready);
  const official = await page.evaluate(async () => {
    const { LEVELS } = await import("/src/core/levels.ts");
    return { total: LEVELS.length, flips: LEVELS.filter((l) => l.flipDoors?.length)
      .map((l) => ({ id: l.id, profile: l.mechanismRules, doors: l.flipDoors.length })),
      earlyProfiles: LEVELS.slice(0, 20).map((l) => l.mechanismRules ?? "legacy") };
  });
  assert.equal(official.total, 200);
  assert.deepEqual(official.flips.map((l) => l.id), [150, 152, 155, 171, 178, 181]);
  assert.ok(official.flips.every((l) => l.profile === profile), "Formal flip levels opt into the new version");
  assert.ok(official.earlyProfiles.every((p) => p === "legacy"));

  for (const reduced of [false, true]) {
    for (const mode of ["ordinary", "shell", "rocket"]) {
      const name = `${mode}-${reduced ? "reduced" : "normal"}`;
      await fixture({ layered: mode === "shell" || mode === "rocket", reduced });
      const release = mode === "rocket" ? await rocketPointer() : await exitPointer();
      assert.deepEqual(release.after.doors, initialDoors);
      const during = await state();
      assert.equal(during.puzzle.gates.find((g) => g.id === "green-ice").frozen, 2,
        "Ice still decrements at release; only flip timing moves");
      if (mode === "shell") {
        assert.equal(release.result.layerRemoved, true);
        assert.deepEqual(during.puzzle.blocks.find((b) => b.id === "red-exit").layers, ["blue"]);
      } else assert.ok(!during.puzzle.blocks.some((b) => b.id === "red-exit"));
      if (mode === "ordinary" && !reduced) await page.screenshot({ path: resolve(output, "ordinary-exit-in-flight.png") });
      await waitCompletions(1);
      const log = await trace();
      assertOneCompletion(log, release, initialDoors, invertedDoors);
      const duplicate = await injectCallback(release.result.exitAnimationId);
      assert.equal(duplicate.result, false, "Duplicate animation completion is inert");
      assert.deepEqual(doors(duplicate.after), invertedDoors);
      await page.waitForTimeout(750);
      assert.deepEqual(doors((await state()).puzzle), invertedDoors, "Later particles do not flip again");
      if (mode === "ordinary" && !reduced) await page.screenshot({ path: resolve(output, "ordinary-exit-completed.png") });
      await finish(name, { release, duplicate });
    }
  }

  await fixture();
  const first = await exitPointer();
  await waitCompletions(1);
  const second = await exitPointer("blue-second", [5, 3]);
  await waitCompletions(2);
  const consecutive = await trace();
  assert.notEqual(first.result.exitAnimationId, second.result.exitAnimationId);
  assertOneCompletion(consecutive, first, initialDoors, invertedDoors);
  assertOneCompletion(consecutive, second, invertedDoors, initialDoors);
  await finish("two-consecutive-exits", { first, second });

  const overlapStart = await fixture({ layered: true });
  await rapidExitPointer(overlapStart, "red-exit", [0, 1]);
  await rapidExitPointer(overlapStart, "blue-second", [5, 3]);
  await waitCompletions(2);
  const overlap = await trace(), overlapReleases = overlap.releases.filter((r) => r.result.ok);
  assert.equal(overlapReleases.length, 2);
  assert.equal(overlapReleases[1].after.pending.length, 2, "Independent Pointer input works during the first exit");
  const overlapIds = overlapReleases.map((r) => r.result.exitAnimationId);
  assert.equal(new Set(overlapIds).size, 2);
  const overlapCalls = overlap.completions.filter((c) => c.result);
  assert.deepEqual(overlapCalls.map((c) => c.id).sort(), [...overlapIds].sort());
  for (const [i, c] of overlapCalls.entries()) {
    assert.deepEqual(c.before.doors, i === 0 ? initialDoors : invertedDoors);
    assert.deepEqual(c.after.doors, i === 0 ? invertedDoors : initialDoors);
    const ghost = c.before.animations.find((g) => g.id === c.id);
    assert.ok(ghost.age >= ghost.exitCompletionDuration);
  }
  await finish("overlapping-independent-exits-each-complete-once", { overlapReleases });

  for (const reduced of [false, true]) {
    await fixture({ reduced, lastBlock: true });
    const last = await exitPointer();
    assert.equal(last.result.complete, true);
    assert.deepEqual(last.after.doors, initialDoors);
    assert.ok(last.after.pending.includes(last.result.exitAnimationId));
    await waitCompletions(1);
    assertOneCompletion(await trace(), last, initialDoors, invertedDoors);
    await page.waitForFunction(() => window.__COLOR_ESCAPE__.getDebugState().screen === "win", undefined, { timeout: 8000 });
    assert.equal(pending((await state()).puzzle).length, 0, "Winning scene must not wait forever for its last callback");
    await finish(`last-block-${reduced ? "reduced" : "normal"}-still-completes`, { last });
  }

  await fixture({ layered: true });
  const pauseRelease = await exitPointer();
  await clickTarget("pause");
  const paused = await state();
  assert.equal(paused.screen, "paused");
  assert.ok(pending(paused.puzzle).includes(pauseRelease.result.exitAnimationId), "Pause before shell completion");
  const pausedGhost = paused.exitAnimations.find((g) => g.exitAnimationId === pauseRelease.result.exitAnimationId);
  await page.waitForTimeout(900);
  const stillPaused = await state();
  assert.deepEqual(doors(stillPaused.puzzle), initialDoors);
  assert.equal(stillPaused.puzzle.remainingSeconds, paused.puzzle.remainingSeconds);
  assert.equal(stillPaused.exitAnimations.find((g) => g.exitAnimationId === pauseRelease.result.exitAnimationId).age, pausedGhost.age);
  assert.deepEqual(stillPaused.ownedParticles, paused.ownedParticles, "Owned shell particles pause with their completion clock");
  await clickTarget("pauseResume");
  await waitCompletions(1);
  assertOneCompletion(await trace(), pauseRelease, initialDoors, invertedDoors);
  await finish("pause-freezes-and-resume-completes", { paused, stillPaused });

  // Headless Chromium does not hide the first page when another tab is brought
  // to front. Exercise the browser visibility event through the real WebHost
  // listener, explicitly labelled synthetic lifecycle input, without changing
  // any clock, animation duration, or game state directly.
  const backgroundStart = await fixture({ layered: true });
  await rapidExitPointer(backgroundStart, "red-exit", [0, 1]);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  const hidden = await state();
  assert.equal(hidden.screen, "paused");
  assert.equal(pending(hidden.puzzle).length, 1);
  await page.waitForTimeout(900);
  const stillHidden = await state();
  assert.equal(stillHidden.puzzle.remainingSeconds, hidden.puzzle.remainingSeconds);
  assert.deepEqual(doors(stillHidden.puzzle), initialDoors);
  assert.deepEqual(stillHidden.exitAnimations, hidden.exitAnimations);
  assert.deepEqual(stillHidden.ownedParticles, hidden.ownedParticles);
  await page.evaluate(() => {
    delete document.hidden;
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await clickTarget("pauseResume");
  await waitCompletions(1);
  assert.deepEqual(doors((await state()).puzzle), invertedDoors);
  await finish("visibility-lifecycle-freezes-and-restores-pending", { hidden, stillHidden,
    lifecycleInput: "Synthetic document.hidden + visibilitychange routed through production WebHost listeners; natural time unchanged" });

  await fixture({ layered: true });
  const undoRelease = await exitPointer();
  await clickTarget("undo");
  const undone = await state();
  assert.equal(undone.puzzle.cleared, 0);
  assert.deepEqual(undone.puzzle.blocks.find((b) => b.id === "red-exit").layers, ["red", "blue"]);
  assert.deepEqual(doors(undone.puzzle), initialDoors);
  assert.ok(!pending(undone.puzzle).includes(undoRelease.result.exitAnimationId));
  const staleUndo = await injectCallback(undoRelease.result.exitAnimationId);
  assert.equal(staleUndo.result, false);
  await page.waitForTimeout(900);
  assert.deepEqual(doors((await state()).puzzle), initialDoors);
  assert.equal((await trace()).completions.filter((c) => c.result).length, 0);
  await finish("undo-removes-stale-callback", { undoRelease, undone, staleUndo });

  // The first shell is still leaving when the independent second block exits.
  // Undoing only the second action must retain the first visual/token pair.
  const partialStart = await fixture({ layered: true });
  await rapidExitPointer(partialStart, "red-exit", [0, 1]);
  await rapidExitPointer(partialStart, "blue-second", [5, 3]);
  await rapidTarget(partialStart, "undo");
  const partialTrace = await trace();
  const [older, younger] = partialTrace.releases.filter((r) => r.result.ok);
  assert.ok(older && younger, "Both rapid Pointer gestures must clear");
  const partialUndo = await state();
  const partialUndoEvent = await page.evaluate(() => structuredClone(window.__flipCompletionEvidence.undos.at(-1)));
  assert.ok(partialUndo.puzzle.blocks.some((b) => b.id === "blue-second"));
  assert.ok(partialUndoEvent.after.pending.includes(older.result.exitAnimationId));
  assert.ok(!partialUndoEvent.after.pending.includes(younger.result.exitAnimationId));
  // The natural clock can finish the older animation while IPC reads the
  // post-click state. The synchronous undo sample above is authoritative for
  // its pending status; a later accepted completion proves its ghost survived.
  assert.ok(!partialUndo.exitAnimations.some((g) => g.exitAnimationId === younger.result.exitAnimationId));
  await waitCompletions(1);
  assert.deepEqual(doors((await state()).puzzle), invertedDoors);
  await page.waitForTimeout(450);
  assert.equal((await trace()).completions.filter((c) => c.result).length, 1);
  await finish("undo-newer-keeps-older-pending-exit", { older, younger, partialUndo, partialUndoEvent });

  // A previously frozen 0.12 s bomb activates at this release. This produces
  // a real clock failure while the shell is still leaving, without clock hacks.
  await fixture({ layered: true, failureBomb: true });
  const doomed = await exitPointer();
  await page.waitForFunction(() => window.__COLOR_ESCAPE__.getDebugState().screen === "failed", undefined, { timeout: 4000 });
  const failed = await state();
  assert.ok(failed.puzzle.failed);
  assert.deepEqual(doors(failed.puzzle), initialDoors);
  const staleFailure = await injectCallback(doomed.result.exitAnimationId);
  assert.equal(staleFailure.result, false);
  await page.waitForTimeout(800);
  assert.deepEqual(doors((await state()).puzzle), initialDoors);
  await finish("natural-bomb-failure-invalidates-pending-exit", { doomed, failed, staleFailure });

  await fixture({ layered: true });
  const abandoned = await exitPointer();
  await page.evaluate(() => window.__COLOR_ESCAPE__.loadLevel(155, true));
  await ready();
  const newLevel = await state();
  assert.equal(newLevel.puzzle.levelId, 155);
  assert.ok(!pending(newLevel.puzzle).includes(abandoned.result.exitAnimationId));
  const staleLevel = await injectCallback(abandoned.result.exitAnimationId);
  assert.equal(staleLevel.result, false, "Old model's token is not valid in a new level");
  await page.waitForTimeout(850);
  const afterLevelWait = await state();
  assert.deepEqual(doors(afterLevelWait.puzzle), doors(newLevel.puzzle));
  assert.ok(!afterLevelWait.exitAnimations.some((g) => g.exitAnimationId === abandoned.result.exitAnimationId));
  await finish("level-switch-drops-old-animation", { abandoned, newLevel, staleLevel });

  // Frozen old profile remains readable and retains its old immediate semantics.
  await fixture({ oldProfile: true });
  const old = await exitPointer();
  assert.equal(old.result.exitAnimationId, undefined);
  assert.deepEqual(old.after.doors, invertedDoors);
  await page.waitForTimeout(650);
  assert.deepEqual(doors((await state()).puzzle), invertedDoors);
  await finish("v1.2-compatibility-remains-immediate", { old });

  assert.deepEqual(errors, [], "Browser errors");
  const sourcesAfter = await hashes();
  assert.deepEqual(sourcesAfter, sourcesBefore, "Source changed during test; rerun on stable inputs");
  await writeFile(resolve(output, "report.json"), JSON.stringify({ pass: true, profile, official,
    naturalClock: true, isolatedStorage: true,
    input: "Real mouse Pointer exits/rocket/undo/pause; named fixtures only replace model data. Invalid/duplicate callbacks explicitly injected for negative coverage.",
    sources: sourcesAfter, results, errors }, null, 2));
  console.log(JSON.stringify({ pass: true, scenarios: results.length, output }));
} catch (error) {
  await page.screenshot({ path: resolve(output, "failure.png") }).catch(() => undefined);
  await writeFile(resolve(output, "failure.json"), JSON.stringify({ pass: false, error: String(error),
    state: await state().catch(() => undefined), trace: await trace().catch(() => undefined), results,
    sourcesBefore, sourcesAfter: await hashes(), errors }, null, 2));
  throw error;
} finally {
  await browser.close();
}
