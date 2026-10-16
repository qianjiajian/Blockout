import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";
import { createServer } from "vite";

// Isolated browser storage. Boundary injection shortens setup only; Date,
// performance, rAF and animation deltas are never replaced or accelerated.
const output = resolve("playtest-results/countdown-warning", new Date().toISOString().replaceAll(":", "-"));
// This repository contains large parallel proof snapshots. An isolated Vite
// instance avoids scanning/watching those trees and changing the user's server.
const server = process.env.PLAYTEST_URL ? undefined : await createServer({
  configFile: false, root: resolve("."), logLevel: "error",
  optimizeDeps: { noDiscovery: true, include: [] },
  server: { host: "127.0.0.1", port: 5181, strictPort: true, watch: null, hmr: false },
});
await server?.listen();
const url = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5181/";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
const errors = [];
let page;
const state = () => page.evaluate(() => {
  const g = window.__COLOR_ESCAPE__, d = g.getDebugState();
  return { screen: d.screen, warning: d.countdownWarning, remaining: d.puzzle.remainingSeconds,
    freeze: d.puzzle.timeFreezeSeconds, started: d.puzzle.started, failed: d.puzzle.failed,
    complete: d.puzzle.complete, visible: g.appVisible, elapsed: g.runElapsedSeconds,
    transform: d.viewportTransform, targets: d.interactionTargets.targets };
});
async function saveResult(name, evidence) {
  results.push({ name, status: "PASS", ...evidence });
  console.log(`PASS ${name}`);
}
async function click(key) {
  const s = await state(), r = s.targets[key]?.hit;
  const canvas = await page.locator("canvas").boundingBox();
  assert.ok(r && canvas, `Missing Pointer target ${key}`);
  await page.mouse.click(canvas.x + s.transform.offsetX + (r.x + r.width / 2) * s.transform.scale,
    canvas.y + s.transform.offsetY + (r.y + r.height / 2) * s.transform.scale);
}
async function fixture(remaining = 30.05, level = 4) {
  await page.evaluate(({ remaining, level }) => {
    const g = window.__COLOR_ESCAPE__;
    g.loadLevel(level, true);
    g.save.boosters.time = 9;
    g.save.reducedMotion = false;
    g.model.startCountdown();
    g.model.remainingSeconds = remaining;
    g.dirty = true;
    g.scheduleFrame();
  }, { remaining, level });
  await page.waitForFunction(() => {
    const g = window.__COLOR_ESCAPE__;
    return g.screen === "playing" && !g.revisedArtLoading && !g.directLevelTransition;
  });
}
async function waitStage(stage) {
  await page.waitForFunction(stage => window.__COLOR_ESCAPE__.getDebugState().countdownWarning.stage === stage, stage);
}
const stoppedValues = s => ({ remaining: s.remaining, phase: s.warning.phaseSeconds, punch: s.warning.punchSeconds });
const resetValues = s => ({ stage: s.warning.stage, phase: s.warning.phaseSeconds, punch: s.warning.punchSeconds,
  warning: s.warning.warningTriggered, critical: s.warning.criticalTriggered,
  pendingWarning: s.warning.pendingWarning, pendingCritical: s.warning.pendingCritical, alpha: s.warning.panelAlpha });
const resetExpected = { stage: "normal", phase: 0, punch: null, warning: false, critical: false,
  pendingWarning: false, pendingCritical: false, alpha: 0 };
async function hold(milliseconds = 300) {
  const before = await state();
  await page.waitForTimeout(milliseconds);
  const after = await state();
  assert.deepEqual(stoppedValues(after), stoppedValues(before));
  return { before, after };
}
async function visibility(hidden) {
  await page.evaluate(hidden => {
    if (hidden) Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
    else delete document.hidden;
    document.dispatchEvent(new Event("visibilitychange"));
  }, hidden);
}
async function recordCritical() {
  await page.evaluate(() => {
    window.__countdownFrames = [];
    const end = performance.now() + 2600;
    const sample = () => {
      const d = window.__COLOR_ESCAPE__.getDebugState();
      window.__countdownFrames.push({ at: performance.now(), remaining: d.puzzle.remainingSeconds, ...d.countdownWarning });
      if (performance.now() < end) requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
}
try {
  for (const viewport of [{ width: 496, height: 1078 }, { width: 320, height: 568 }]) {
    const tag = `${viewport.width}x${viewport.height}`;
    const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
    await context.addInitScript(() => localStorage.setItem("color-escape-save-v1", JSON.stringify({
      schemaVersion: 1, currentLevel: 4, highestLevel: 200, coins: 2000,
      sound: false, haptic: false, reducedMotion: false,
      featureSeen: ["basics", "ice-door", "ice-block", "layer", "shutter", "flip-door", "star-gate", "axis", "key", "bomb", "generator", "colored-grid", "lift"],
      boosterUnlockSeen: ["time", "rocket", "pulse"], boosters: { time: 9, rocket: 9, pulse: 9 },
      bestStars: {}, bestMoves: {}, rewardedLevels: [],
    })));
    page = await context.newPage();
    page.setDefaultTimeout(15000);
    page.on("pageerror", e => errors.push(e.message));
    page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForFunction(() => Boolean(window.__COLOR_ESCAPE__?.getDebugState().countdownWarning));
    await fixture();
    await waitStage("warning");
    const low = await state();
    await page.waitForFunction(() => window.__COLOR_ESCAPE__.getDebugState().countdownWarning.panelAlpha > .54);
    const high = await state();
    assert.equal(high.warning.panelColor, "#ff6337");
    assert.ok(high.warning.panelAlpha > low.warning.panelAlpha + .15);
    assert.equal(high.warning.digitScale, 1);
    await page.screenshot({ path: resolve(output, `${tag}-30s-breath.png`) });
    await saveResult(`${tag}-30s-breath`, { low, high });

    if (viewport.width === 496) {
      await click("pause");
      assert.equal((await state()).screen, "paused");
      const paused = await hold();
      await click("pauseResume");
      await page.waitForTimeout(150);
      const resumed = await state();
      assert.notEqual(resumed.warning.phaseSeconds, paused.after.warning.phaseSeconds);
      assert.equal(resumed.warning.warningTriggered, true);
      await saveResult("pause-holds-breath-resume-continues", { paused, resumed });

      await click("booster.time");
      assert.ok((await state()).freeze > 9);
      const frozen = await hold();
      await visibility(true);
      const hidden = await hold();
      assert.equal(hidden.after.visible, false);
      assert.equal(hidden.after.freeze, hidden.before.freeze);
      await visibility(false);
      await click("pauseResume");
      await page.waitForFunction(() => window.__COLOR_ESCAPE__.model.snapshot().timeFreezeSeconds === 0, undefined, { timeout: 15000 });
      await page.waitForTimeout(180);
      const thawed = await state();
      assert.ok(thawed.remaining < frozen.before.remaining);
      assert.notEqual(thawed.warning.phaseSeconds, frozen.before.warning.phaseSeconds);
      assert.equal(thawed.warning.criticalTriggered, false);
      await saveResult("natural-10s-freeze-and-background-hold-warning", { frozen, hidden, thawed });
    }

    await fixture(10.05);
    await recordCritical();
    await page.waitForFunction(() => window.__COLOR_ESCAPE__.getDebugState().countdownWarning.digitScale > 1.15);
    const peak = await state();
    assert.equal(peak.warning.stage, "critical");
    assert.ok(peak.warning.digitOffsetY < -3);
    await page.screenshot({ path: resolve(output, `${tag}-10s-punch.png`) });
    await page.waitForTimeout(2700);
    const settled = await state();
    const frames = await page.evaluate(() => window.__countdownFrames);
    assert.equal(settled.warning.punchSeconds, null);
    assert.equal(settled.warning.digitScale, 1);
    assert.equal(settled.warning.criticalTriggered, true);
    const burstFrames = frames.filter((frame, index) => frame.punchSeconds !== null
      && (index === 0 || frames[index - 1].punchSeconds === null));
    const bursts = burstFrames.map(frame => ({ second: Math.ceil(frame.remaining), at: frame.at, lastPunchedSecond: frame.lastPunchedSecond }));
    assert.deepEqual(bursts.map(b => b.second), [10, 9, 8], "Each displayed second triggers exactly one punch");
    assert.deepEqual(bursts.map(b => b.lastPunchedSecond), [10, 9, 8]);
    for (let index = 1; index < bursts.length; index += 1) {
      assert.ok(bursts[index].at - bursts[index - 1].at >= 850, "No repeated punch within a displayed second");
    }
    const criticalFrames = frames.filter(frame => frame.stage === "critical");
    const alphaRange = [Math.min(...criticalFrames.map(f => f.panelAlpha)), Math.max(...criticalFrames.map(f => f.panelAlpha))];
    assert.ok(alphaRange[0] >= .219 && alphaRange[1] <= .581);
    assert.ok(alphaRange[1] - alphaRange[0] > .3, "Critical timer panel continues breathing");
    await page.screenshot({ path: resolve(output, `${tag}-10s-settled.png`) });
    await saveResult(`${tag}-critical-per-second-punch-and-breath`, { peak, settled, bursts, alphaRange, frames });

    if (viewport.width === 496) {
      await fixture(10.05);
      await page.waitForFunction(() => {
        const w = window.__COLOR_ESCAPE__.getDebugState().countdownWarning;
        return w.punchSeconds !== null && w.punchSeconds >= .04 && w.punchSeconds < .15;
      });
      await click("pause");
      const pausedPunch = await hold();
      assert.notEqual(pausedPunch.before.warning.punchSeconds, null);
      await click("pauseResume");
      await page.waitForTimeout(500);
      assert.equal((await state()).warning.punchSeconds, null);
      await saveResult("pause-holds-active-punch-without-replay", pausedPunch);

      // Real WebHost onHide charges its input-event slice before pausing. A
      // tiny remaining-time boundary ensures that slice crosses 10 naturally.
      await fixture(40, 21);
      await page.waitForTimeout(200);
      const pending = await page.evaluate(() => {
        const g = window.__COLOR_ESCAPE__;
        g.model.remainingSeconds = 10 + Number.EPSILON * 16;
        Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
        document.dispatchEvent(new Event("visibilitychange"));
        return g.getDebugState().countdownWarning;
      });
      assert.equal(pending.pendingCritical, true);
      assert.equal(pending.criticalTriggered, false);
      const pendingHeld = await hold();
      await visibility(false);
      assert.equal((await state()).screen, "paused");
      await click("pauseResume");
      await waitStage("critical");
      await page.waitForTimeout(600);
      const pendingConsumed = await state();
      assert.equal(pendingConsumed.warning.pendingCritical, false);
      assert.equal(pendingConsumed.warning.criticalTriggered, true);
      assert.equal(pendingConsumed.warning.punchSeconds, null);
      await saveResult("input-tick-crosses-10-before-hide-consumed-on-resume", { pending, pendingHeld, pendingConsumed });

      await click("pause");
      await click("pauseRestart");
      assert.deepEqual(resetValues(await state()), resetExpected);
      await saveResult("restart-clears-all-warning-state", { restarted: await state() });

      await fixture(10.05);
      await waitStage("critical");
      await page.evaluate(() => { window.__COLOR_ESCAPE__.model.remainingSeconds = .001; });
      await page.waitForFunction(() => window.__COLOR_ESCAPE__.getDebugState().screen === "failed");
      assert.deepEqual(resetValues(await state()), resetExpected);
      await saveResult("natural-final-tick-clears-on-failure", { failed: await state() });

      await fixture(10.05);
      await waitStage("critical");
      await page.evaluate(() => { window.__COLOR_ESCAPE__.model.complete = true; });
      await page.waitForTimeout(80);
      assert.deepEqual(resetValues(await state()), resetExpected);
      await saveResult("complete-model-lifecycle-clears-warning", { completed: await state(), fixture: "Direct complete state; not official level completion evidence" });
    }
    await context.close();
  }
  assert.deepEqual(errors, []);
  await writeFile(resolve(output, "report.json"), JSON.stringify({ status: "PASS", results, errors,
    limits: ["Fresh isolated contexts only; no existing browser profile or save accessed.",
      "Remaining-time boundary injections shorten waiting; natural rAF, Date and performance are unchanged.",
      "Background uses document.hidden visibilitychange through real WebHost, not a real OS background test.",
      "Complete cleanup uses an explicitly labelled model-state lifecycle fixture, not level-solve or score evidence."] }, null, 2));
  console.log(`Report: ${output}`);
} catch (error) {
  await page?.screenshot({ path: resolve(output, "failure.png") }).catch(() => {});
  await writeFile(resolve(output, "failure.json"), JSON.stringify({ error: String(error.stack ?? error), results, errors,
    state: await state().catch(() => null) }, null, 2));
  throw error;
} finally { await browser.close(); await server?.close(); }
