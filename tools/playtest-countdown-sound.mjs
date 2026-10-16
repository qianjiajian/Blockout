import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";
import { createServer } from "vite";

// Observe the native WebAudio methods, preserving their inputs, return values,
// real decoding and actual source playback. No Date/performance/rAF mocking.
const output = resolve("playtest-results/countdown-sound", new Date().toISOString().replaceAll(":", "-"));
await mkdir(output, { recursive: true });
const server = await createServer({ configFile: false, root: resolve("."), logLevel: "error",
  optimizeDeps: { noDiscovery: true, include: [] },
  server: { host: "127.0.0.1", port: 5181, strictPort: true, watch: null, hmr: false } });
await server.listen();
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 496, height: 1078 }, deviceScaleFactor: 1 });
await context.addInitScript(() => {
  localStorage.setItem("color-escape-save-v1", JSON.stringify({ schemaVersion: 1, currentLevel: 4, highestLevel: 200,
    coins: 2000, sound: true, haptic: false, reducedMotion: false,
    featureSeen: ["basics", "ice-door", "ice-block", "layer", "shutter", "flip-door", "star-gate", "axis", "key", "bomb", "generator", "colored-grid", "lift"],
    boosterUnlockSeen: ["time", "rocket", "pulse"], boosters: { time: 9, rocket: 9, pulse: 9 }, bestStars: {}, bestMoves: {}, rewardedLevels: [] }));
  const evidence = { decoded: [], sources: [], calls: [], buffers: new WeakMap() };
  window.__countdownSound = evidence;
  const idFor = buffer => {
    if (!buffer) return null;
    if (!evidence.buffers.has(buffer)) evidence.buffers.set(buffer, evidence.buffers.size ?? evidence.decoded.length + 1);
    return evidence.buffers.get(buffer);
  };
  const decode = BaseAudioContext.prototype.decodeAudioData;
  BaseAudioContext.prototype.decodeAudioData = function (...args) {
    const result = decode.apply(this, args);
    result.then(buffer => {
      const id = evidence.decoded.length + 1;
      evidence.buffers.set(buffer, id);
      let peak = 0;
      const samples = buffer.getChannelData(0);
      for (let index = 0; index < samples.length; index += 1) peak = Math.max(peak, Math.abs(samples[index]));
      evidence.decoded.push({ id, duration: buffer.duration, sampleRate: buffer.sampleRate,
        channels: buffer.numberOfChannels, length: buffer.length, peak, at: performance.now() });
    });
    return result;
  };
  const create = BaseAudioContext.prototype.createBufferSource;
  BaseAudioContext.prototype.createBufferSource = function (...args) {
    const source = create.apply(this, args);
    const nativeStart = source.start.bind(source), nativeStop = source.stop.bind(source);
    let record;
    source.start = (...parameters) => {
      const g = window.__COLOR_ESCAPE__;
      const soundBuffers = g?.host?.soundscape?.soundBuffers ?? {};
      const kind = Object.entries(soundBuffers).find(([, buffer]) => buffer === source.buffer)?.[0] ?? "music-or-unidentified";
      const d = g?.getDebugState();
      const result = nativeStart(...parameters);
      record = { id: evidence.sources.length + 1, kind, bufferId: idFor(source.buffer), duration: source.buffer?.duration,
        at: performance.now(), audioTime: this.currentTime, contextState: this.state, parameters,
        remaining: d?.puzzle.remainingSeconds, warning: d?.countdownWarning, stops: [], endedAt: null };
      evidence.sources.push(record);
      return result;
    };
    source.stop = (...parameters) => {
      const result = nativeStop(...parameters);
      if (record) record.stops.push({ at: performance.now(), audioTime: this.currentTime, parameters });
      return result;
    };
    source.addEventListener("ended", () => { if (record) record.endedAt = performance.now(); });
    return source;
  };
});
const page = await context.newPage();
page.setDefaultTimeout(15000);
const errors = [], responses = [], results = [];
page.on("pageerror", error => errors.push(error.message));
page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
page.on("response", response => { if (response.url().includes("timeover")) responses.push({ url: response.url(), status: response.status() }); });
const state = () => page.evaluate(() => {
  const g = window.__COLOR_ESCAPE__, d = g.getDebugState();
  return { screen: d.screen, remaining: d.puzzle.remainingSeconds, freeze: d.puzzle.timeFreezeSeconds,
    sound: g.save.sound, visible: g.appVisible, warning: d.countdownWarning, transform: d.viewportTransform,
    targets: d.interactionTargets.targets, audioState: g.host.audio?.state };
});
const trace = () => page.evaluate(() => {
  const { decoded, sources, calls } = window.__countdownSound;
  return { decoded, sources: sources.filter(source => source.kind === "timeover"), calls };
});
async function click(key) {
  const s = await state(), r = s.targets[key]?.hit, bounds = await page.locator("canvas").boundingBox();
  assert.ok(r && bounds, `Missing Pointer target ${key}`);
  await page.mouse.click(bounds.x + s.transform.offsetX + (r.x + r.width / 2) * s.transform.scale,
    bounds.y + s.transform.offsetY + (r.y + r.height / 2) * s.transform.scale);
}
async function fixture(sound = true) {
  await page.evaluate(sound => {
    const g = window.__COLOR_ESCAPE__;
    g.loadLevel(4, true); g.save.sound = sound; g.save.boosters.time = 9; g.syncMusic();
    g.model.startCountdown(); g.model.remainingSeconds = 10.05;
    g.dirty = true; g.scheduleFrame();
  }, sound);
}
async function visibility(hidden) {
  await page.evaluate(hidden => {
    if (hidden) Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
    else delete document.hidden;
    document.dispatchEvent(new Event("visibilitychange"));
  }, hidden);
}
async function saveResult(name, evidence) {
  results.push({ name, status: "PASS", ...evidence });
  console.log(`PASS ${name}`);
}
async function startFreshVoice() {
  const baseline = (await trace()).sources.length;
  await fixture();
  await page.waitForFunction(baseline => window.__countdownSound.sources.filter(source => source.kind === "timeover").length > baseline, baseline);
  return (await trace()).sources.at(-1);
}
try {
  await page.goto("http://127.0.0.1:5181/", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForFunction(() => Boolean(window.__COLOR_ESCAPE__?.getDebugState().countdownWarning));
  await page.waitForFunction(() => {
    const g = window.__COLOR_ESCAPE__;
    return Boolean(g.art.gameplayUi && g.art.pauseSettings);
  });
  await page.evaluate(() => {
    const g = window.__COLOR_ESCAPE__, native = g.host.sound.bind(g.host);
    g.host.sound = kind => {
      if (kind === "timeover") {
        const d = g.getDebugState();
        window.__countdownSound.calls.push({ kind, at: performance.now(), remaining: d.puzzle.remainingSeconds, warning: d.countdownWarning });
      }
      return native(kind);
    };
    g.loadLevel(4, true);
  });
  await page.waitForTimeout(120);
  // Genuine Pointer gesture initializes/resumes WebAudio; all SFX are fetched
  // and decoded by production WebHost, not by this validation script.
  await click("pause");
  assert.equal((await state()).screen, "paused", "The initializing Pointer press opens pause");
  await page.waitForFunction(() => Boolean(window.__COLOR_ESCAPE__.host.soundscape?.soundBuffers.timeover));
  const decodedAsset = await page.evaluate(() => {
    const b = window.__COLOR_ESCAPE__.host.soundscape.soundBuffers.timeover;
    return window.__countdownSound.decoded.find(d => d.id === window.__countdownSound.buffers.get(b));
  });
  assert.ok(decodedAsset?.duration > 0 && decodedAsset.peak > .001);
  assert.ok(responses.some(response => response.status === 200));
  await saveResult("native-web-audio-fetch-and-decode", { decodedAsset, responses });
  await click("pauseResume");

  let before = await trace();
  await fixture();
  await page.waitForTimeout(2650);
  let after = await trace();
  const calls = after.calls.slice(before.calls.length), voices = after.sources.slice(before.sources.length);
  assert.deepEqual(calls.map(call => call.warning.lastPunchedSecond), [10, 9, 8]);
  assert.deepEqual(voices.map(source => source.warning.lastPunchedSecond), [10, 9, 8]);
  for (let index = 0; index < voices.length; index += 1) {
    assert.equal(Math.ceil(voices[index].remaining), calls[index].warning.lastPunchedSecond);
    assert.equal(voices[index].bufferId, decodedAsset.id);
    assert.equal(voices[index].contextState, "running");
    assert.ok(voices[index].at - calls[index].at < 30, "Sound starts in the same animation frame");
    if (index > 0) assert.ok(voices[index].at - voices[index - 1].at >= 850);
  }
  await saveResult("10-9-8-native-buffer-starts-match-punch", { calls, voices });

  before = await trace();
  await fixture(false);
  await page.waitForTimeout(2650);
  after = await trace();
  assert.equal(after.calls.length, before.calls.length);
  assert.equal(after.sources.length, before.sources.length);
  assert.equal((await state()).warning.lastPunchedSecond, 8);
  await saveResult("muted-countdown-keeps-animation-without-audio", { state: await state() });

  for (const action of ["pause", "freeze", "hide", "mute", "restart", "failure", "complete"]) {
    const voice = await startFreshVoice();
    // The recording's audible transient begins around 79 ms. Allow it to
    // start, then observe actual source cancellation (Pointer latency varies).
    await page.waitForTimeout(100);
    const beforeAction = await state();
    if (action === "pause") await click("pause");
    else if (action === "freeze") await click("booster.time");
    else if (action === "hide") await visibility(true);
    else if (action === "mute") await page.evaluate(() => window.__COLOR_ESCAPE__.toggleSetting("sound"));
    else if (action === "restart") await page.evaluate(() => window.__COLOR_ESCAPE__.loadLevel(4, true));
    else if (action === "failure") await page.evaluate(() => { window.__COLOR_ESCAPE__.model.remainingSeconds = .001; });
    else await page.evaluate(() => { window.__COLOR_ESCAPE__.model.complete = true; });
    await page.waitForTimeout(100);
    const stopped = (await trace()).sources.find(source => source.id === voice.id);
    assert.ok(stopped.stops.length > 0, `${action} stops the actual recorded source`);
    assert.ok(stopped.stops[0].at - stopped.at < decodedAsset.duration * 1000, `${action} interrupts rather than waits for the tail`);
    const heldBefore = await trace();
    await page.waitForTimeout(400);
    const heldAfter = await trace();
    assert.equal(heldAfter.sources.length, heldBefore.sources.length, `${action} must not start another countdown source`);
    if (["pause", "freeze", "hide", "mute"].includes(action)) {
      if (action === "pause") await click("pauseResume");
      if (action === "hide") { await visibility(false); await click("pauseResume"); }
      if (action === "mute") await page.evaluate(() => window.__COLOR_ESCAPE__.toggleSetting("sound"));
      if (action === "freeze") await page.waitForFunction(() => window.__COLOR_ESCAPE__.model.snapshot().timeFreezeSeconds === 0, undefined, { timeout: 15000 });
      const resumedBaseline = (await trace()).sources.length;
      await page.waitForTimeout(100);
      assert.equal((await trace()).sources.length, resumedBaseline, `${action} resume does not replay an interrupted tail`);
      await page.waitForFunction(count => window.__countdownSound.sources.filter(source => source.kind === "timeover").length > count, resumedBaseline);
      const next = (await trace()).sources.at(-1);
      assert.equal(next.warning.lastPunchedSecond, 9, `${action} next whole-second event resumes normally`);
    }
    await saveResult(`${action}-stops-native-tail-without-replay`, { beforeAction, stopped, after: await state() });
  }
  assert.deepEqual(errors, []);
  await writeFile(resolve(output, "report.json"), JSON.stringify({ status: "PASS", results, errors, trace: await trace(),
    limits: ["Observed native WebAudio decode/start/stop in headless Chromium; not a real device listening test.",
      "Boundary remainingSeconds and complete state are explicitly injected fixtures; natural browser clocks are unmodified.",
      "Background uses document.hidden visibilitychange through WebHost, not real OS backgrounding.",
      "Fresh browser context only; 5180 and the user's browser profile/storage are untouched."] }, null, 2));
  console.log(`Report: ${output}`);
} catch (error) {
  await writeFile(resolve(output, "failure.json"), JSON.stringify({ error: String(error.stack ?? error), results, errors,
    state: await state().catch(() => null), trace: await trace().catch(() => null) }, null, 2));
  throw error;
} finally { await browser.close(); await server.close(); }
