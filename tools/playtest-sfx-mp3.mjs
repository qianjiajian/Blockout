import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";

export const SFX_KINDS = [
  "blocked", "exit", "ice", "thaw", "win", "button", "putdown", "fail",
  "reward", "booster", "unlock", "time", "rocket", "pulse", "mechanic", "shell", "shutter",
];
export const CONVERTED_KINDS = SFX_KINDS.filter((kind) => !["exit", "thaw", "button", "putdown", "shell", "shutter"].includes(kind));

// Technical regression checks, not a substitute for listening or WeChat-device QA.
// Absolute 0.01 amplitude keeps MP3 pre-echo/near-zero noise out of the onset measure.
export function measurePcm(channels, sampleRate) {
  if (!channels.length || !channels[0].length || !(sampleRate > 0)) throw new Error("Empty/invalid PCM");
  const frames = channels[0].length;
  let peak = 0;
  let square = 0;
  let stereoSquare = 0;
  let onsetFrame = -1;
  for (let frame = 0; frame < frames; frame += 1) {
    for (const channel of channels) {
      if (channel.length !== frames || !Number.isFinite(channel[frame])) throw new Error("Invalid PCM channel/sample");
      const sample = channel[frame];
      peak = Math.max(peak, Math.abs(sample));
      square += sample * sample;
      if (onsetFrame < 0 && Math.abs(sample) >= 0.01) onsetFrame = frame;
    }
    if (channels.length === 2) stereoSquare += (channels[0][frame] - channels[1][frame]) ** 2;
  }
  return {
    channels: channels.length, sampleRate, frames, durationSeconds: frames / sampleRate,
    peak, rms: Math.sqrt(square / frames / channels.length),
    stereoDifferenceRms: Math.sqrt(stereoSquare / frames),
    onsetSeconds: onsetFrame < 0 ? null : onsetFrame / sampleRate,
  };
}

export function assertConversionMetrics(source, encoded) {
  assert.equal(source.channels, 2, "WAV source must remain stereo");
  assert.equal(encoded.channels, 2, "MP3 must remain stereo");
  assert.equal(source.sampleRate, 44100);
  assert.equal(encoded.sampleRate, source.sampleRate);
  assert.ok(Math.abs(encoded.frames - source.frames) <= 2, "Gapless-decoded length drift exceeds two samples");
  assert.ok(source.onsetSeconds !== null && encoded.onsetSeconds !== null, "A sound became silent");
  const onsetDeltaSeconds = encoded.onsetSeconds - source.onsetSeconds;
  const rmsRatio = encoded.rms / source.rms;
  assert.ok(Math.abs(onsetDeltaSeconds) <= 0.005, `Attack shift exceeds 5 ms: ${onsetDeltaSeconds}`);
  assert.ok(rmsRatio >= 0.8 && rmsRatio <= 1.2, `Unexpected level change: ${rmsRatio}`);
  assert.ok(encoded.peak > 0.01 && encoded.peak <= 1, "Decoded audio is silent or clipped");
  assert.ok(source.stereoDifferenceRms > 1e-6 && encoded.stereoDifferenceRms > 1e-6, "Stereo collapsed to mono");
  return { onsetDeltaSeconds, rmsRatio, frameDelta: encoded.frames - source.frames };
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

async function clickTarget(page, name) {
  const state = await page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
  const hit = state.interactionTargets?.targets?.[name]?.hit;
  const canvas = await page.locator("canvas").boundingBox();
  assert.ok(hit && canvas, `Missing UI target: ${name}`);
  await page.mouse.click(
    canvas.x + state.viewportTransform.offsetX + (hit.x + hit.width / 2) * state.viewportTransform.scale,
    canvas.y + state.viewportTransform.offsetY + (hit.y + hit.height / 2) * state.viewportTransform.scale,
  );
}

export async function runSfxMp3Playtest({ url = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/" } = {}) {
  const parsedUrl = new URL(url);
  assert.ok(["127.0.0.1", "localhost", "[::1]"].includes(parsedUrl.hostname), "Only a local development server is supported");
  const origin = parsedUrl.origin;
  const output = resolve(root, "playtest-results", `sfx-mp3-${new Date().toISOString().replace(/[:.]/g, "-")}`);
  await mkdir(output, { recursive: false });
  const artifacts = [];
  for (const kind of SFX_KINDS) {
    const path = `public/assets/audio/sfx/${kind}.mp3`;
    const bytes = await readFile(resolve(root, path));
    artifacts.push({ kind, path, bytes: bytes.length, sha256: sha256(bytes) });
  }
  const sourceBytes = new Map();
  for (const kind of CONVERTED_KINDS) {
    const path = `art-source/audio/sfx/${kind}.wav`;
    const bytes = await readFile(resolve(root, path));
    sourceBytes.set(kind, bytes);
    artifacts.push({ kind, path, bytes: bytes.length, sha256: sha256(bytes) });
  }
  const report = {
    status: "running", url, artifacts, errors: [],
    limits: "Muted headless Chromium, real browser decoders and WebHost. Not a listening or WeChat real-device certification.",
  };
  const browser = await chromium.launch({ headless: true, args: ["--mute-audio", "--autoplay-policy=no-user-gesture-required"] });
  const context = await browser.newContext({ viewport: { width: 496, height: 1078 } });
  const newPage = async () => {
    const page = await context.newPage();
    page.on("pageerror", (error) => report.errors.push(error.message));
    return page;
  };
  await context.route(`${origin}/__sfx-test/blank`, (route) => route.fulfill({
    contentType: "text/html", body: '<!doctype html><html><head><base href="/"></head><body></body></html>',
  }));
  await context.route(`${origin}/__sfx-test/metrics.js`, (route) => route.fulfill({
    contentType: "application/javascript", body: `export ${measurePcm.toString()}`,
  }));
  await context.route(`${origin}/__sfx-test/source/*.wav`, async (route) => {
    const kind = new URL(route.request().url()).pathname.split("/").at(-1).replace(/\.wav$/, "");
    const bytes = sourceBytes.get(kind);
    assert.ok(bytes, `Unexpected archived source request: ${kind}`);
    await route.fulfill({ contentType: "audio/wav", body: bytes });
  });
  try {
    const decodePage = await newPage();
    await decodePage.goto(`${origin}/__sfx-test/blank`);
    report.decoding = await decodePage.evaluate(async ({ sounds, converted }) => {
      const { measurePcm: measure } = await import("/__sfx-test/metrics.js");
      const decoder = new OfflineAudioContext(2, 44100, 44100);
      const decode = async (path) => {
        const response = await fetch(path);
        if (!response.ok) throw new Error(`Audio fetch failed: ${response.status} ${path}`);
        const buffer = await decoder.decodeAudioData(await response.arrayBuffer());
        const channels = Array.from({ length: buffer.numberOfChannels }, (_, channel) => buffer.getChannelData(channel));
        return { buffer, channels, metrics: measure(channels, buffer.sampleRate) };
      };
      const results = [];
      for (const kind of sounds) {
        const mp3 = await decode(`/assets/audio/sfx/${kind}.mp3`);
        let source;
        if (converted.includes(kind)) source = await decode(`/__sfx-test/source/${kind}.wav`);
        results.push({ kind, mp3: mp3.metrics, ...(source ? { source: source.metrics } : {}) });
      }
      return results;
    }, { sounds: SFX_KINDS, converted: CONVERTED_KINDS });
    assert.equal(report.decoding.length, SFX_KINDS.length);
    for (const row of report.decoding) {
      assert.ok(row.mp3.durationSeconds > 0 && row.mp3.peak > 0.01, `Invalid decoded sound: ${row.kind}`);
      if (row.source) row.comparison = assertConversionMetrics(row.source, row.mp3);
    }
    await decodePage.close();

    const hostPage = await newPage();
    const requests = [];
    hostPage.on("request", (request) => { if (/\/sfx\//.test(request.url())) requests.push(request.url()); });
    await hostPage.goto(`${origin}/__sfx-test/blank`);
    report.hostPlayback = await hostPage.evaluate(async (kinds) => {
      const { WebHost } = await import("/src/platform/WebHost.ts");
      const host = new WebHost();
      host.music("silent", false);
      host.sound("button");
      await host.effectsAssetsLoading;
      const loaded = Object.keys(host.soundscape.soundBuffers).sort();
      const sources = [];
      let oscillators = 0;
      const createBufferSource = host.audio.createBufferSource.bind(host.audio);
      const createOscillator = host.audio.createOscillator.bind(host.audio);
      host.audio.createBufferSource = () => {
        const source = createBufferSource();
        const start = source.start.bind(source);
        source.start = (...args) => { sources.push({ source, start: args[0], ended: false }); start(...args); };
        source.addEventListener("ended", () => { const entry = sources.find((value) => value.source === source); if (entry) entry.ended = true; });
        return source;
      };
      host.audio.createOscillator = () => { oscillators += 1; return createOscillator(); };
      for (const kind of kinds) host.sound(kind);
      // Thirty rapid repeated calls must create independent recorded voices, not reload or swallow calls.
      for (let repeat = 0; repeat < 30; repeat += 1) host.sound("button");
      const started = sources.length;
      const timeoutAt = performance.now() + 10000;
      while (sources.some((source) => !source.ended) && performance.now() < timeoutAt) {
        await new Promise((done) => setTimeout(done, 25));
      }
      const ended = sources.filter((source) => source.ended).length;
      await host.audio.close();
      return { loaded, started, ended, oscillators, schedules: sources.map(({ start }) => start) };
    }, SFX_KINDS);
    assert.deepEqual(report.hostPlayback.loaded, [...SFX_KINDS].sort());
    assert.equal(report.hostPlayback.started, SFX_KINDS.length + 30);
    assert.equal(report.hostPlayback.ended, SFX_KINDS.length + 30);
    assert.equal(report.hostPlayback.oscillators, 0);
    assert.equal(requests.length, SFX_KINDS.length, "Repeated sounds must not reload the assets");
    assert.ok(requests.every((path) => path.endsWith(".mp3")));
    report.hostPlayback.requests = requests;
    await hostPage.close();

    const fallbackPage = await newPage();
    await fallbackPage.route(`${origin}/assets/audio/sfx/blocked.mp3`, (route) => route.fulfill({
      contentType: "audio/mpeg", body: "intentional invalid MP3 for fallback regression",
    }));
    await fallbackPage.goto(`${origin}/__sfx-test/blank`);
    report.decodeFailureFallback = await fallbackPage.evaluate(async () => {
      const { WebHost } = await import("/src/platform/WebHost.ts");
      const host = new WebHost();
      host.music("silent", false);
      host.sound("button");
      await host.effectsAssetsLoading;
      const loaded = Object.keys(host.soundscape.soundBuffers).sort();
      let oscillators = 0;
      let buffers = 0;
      const createOscillator = host.audio.createOscillator.bind(host.audio);
      const createBufferSource = host.audio.createBufferSource.bind(host.audio);
      host.audio.createOscillator = () => { oscillators += 1; return createOscillator(); };
      host.audio.createBufferSource = () => { buffers += 1; return createBufferSource(); };
      host.sound("blocked");
      const failedSound = { oscillators, buffers };
      host.sound("button");
      const healthySound = { oscillators: oscillators - failedSound.oscillators, buffers: buffers - failedSound.buffers };
      await host.audio.close();
      return { loaded, failedSound, healthySound };
    });
    assert.deepEqual(report.decodeFailureFallback.loaded, SFX_KINDS.filter((kind) => kind !== "blocked").sort());
    assert.ok(report.decodeFailureFallback.failedSound.oscillators > 0);
    assert.equal(report.decodeFailureFallback.failedSound.buffers, 0);
    assert.deepEqual(report.decodeFailureFallback.healthySound, { oscillators: 0, buffers: 1 });
    await fallbackPage.close();

    const gamePage = await newPage();
    await gamePage.addInitScript(() => localStorage.setItem("color-escape-save-v1", JSON.stringify({
      schemaVersion: 1, currentLevel: 12, highestLevel: 12, coins: 1000,
      sound: true, haptic: false, reducedMotion: false,
      featureSeen: ["basics", "ice-door", "ice-block", "layer"],
      boosters: { time: 3, rocket: 3, pulse: 3 }, bestStars: {}, bestMoves: {},
      rewardedLevels: Array.from({ length: 11 }, (_, index) => index + 1), dailyStreak: 0, lastDailyCompletedDay: "",
    })));
    await gamePage.goto(url, { waitUntil: "networkidle" });
    await gamePage.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().screen === "home");
    await gamePage.evaluate(() => {
      const host = window.__COLOR_ESCAPE__.host;
      const sound = host.sound.bind(host);
      window.__SFX_CALLS__ = [];
      host.sound = (kind) => { window.__SFX_CALLS__.push(kind); sound(kind); };
    });
    await clickTarget(gamePage, "homeSettings");
    await clickTarget(gamePage, "settings.sound");
    const disabled = await gamePage.evaluate(() => {
      window.__SFX_CALLS__.length = 0;
      window.__COLOR_ESCAPE__.playSound("ice");
      return { enabled: window.__COLOR_ESCAPE__.getDebugState().settings.sound, calls: [...window.__SFX_CALLS__] };
    });
    assert.deepEqual(disabled, { enabled: false, calls: [] });
    await clickTarget(gamePage, "settings.sound");
    const enabled = await gamePage.evaluate(async () => {
      const game = window.__COLOR_ESCAPE__;
      window.__SFX_CALLS__.length = 0;
      game.playSound("ice");
      await game.host.effectsAssetsLoading;
      return { enabled: game.getDebugState().settings.sound, calls: [...window.__SFX_CALLS__], loaded: Object.keys(game.host.soundscape.soundBuffers).length };
    });
    assert.deepEqual(enabled, { enabled: true, calls: ["ice"], loaded: SFX_KINDS.length });
    report.settingsToggle = { disabled, enabled, storage: "Fresh isolated browser context only; no user's browser profile/save accessed" };
    await gamePage.close();
    assert.deepEqual(report.errors, []);
    for (const artifact of artifacts) assert.equal(sha256(await readFile(resolve(root, artifact.path))), artifact.sha256, `Source changed during regression: ${artifact.path}`);
    report.status = "passed-browser-not-wechat-device";
  } catch (error) {
    report.status = "failed";
    report.failure = error.stack ?? String(error);
    throw error;
  } finally {
    await context.close();
    await browser.close();
    await writeFile(resolve(output, "report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
    console.log(`SFX MP3 browser regression: ${report.status}; ${resolve(output, "report.json")}`);
  }
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await runSfxMp3Playtest();
