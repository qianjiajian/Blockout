import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";

const phase = process.argv.find(arg => arg.startsWith("--phase="))?.split("=")[1] ?? "before";
const only = process.argv.find(arg => arg.startsWith("--only="))?.split("=")[1];
const url = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
const output = resolve(`playtest-results/music-output-20261007/${phase}`);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [], errors = [];

function instrumentAudio({ sound, highestLevel, selectedMusicTrack }) {
  localStorage.setItem("color-escape-save-v1", JSON.stringify({ schemaVersion: 1, currentLevel: 6, highestLevel,
    coins: 265, sound, music: true, selectedMusicTrack, mutedMusicTracks: [], haptic: false, reducedMotion: true,
    featureSeen: ["basics", "ice-door", "ice-block", "layer"], boosterUnlockSeen: ["time", "rocket", "pulse"],
    boosters: { time: 2, rocket: 0, pulse: 0 }, bestStars: {}, bestMoves: {}, rewardedLevels: [1, 2, 3, 4, 5],
    leagueIntroSeen: true, collectionIntroSeen: true, metaDiscovery: { collectionViewedThroughLevel: 6 } }));
  const contexts = [], sources = [], events = [], nodes = new WeakMap(), buffers = new WeakMap(), bufferUrls = new WeakMap(), contextProbes = new WeakMap();
  let nextNode = 1, nextBuffer = 1;
  const nodeId = node => { if (!nodes.has(node)) nodes.set(node, nextNode++); return nodes.get(node); };
  const describeBuffer = buffer => {
    if (!buffer) return undefined;
    if (!buffers.has(buffer)) buffers.set(buffer, { id: nextBuffer++, duration: buffer.duration, sampleRate: buffer.sampleRate, channels: buffer.numberOfChannels, url: undefined });
    return buffers.get(buffer);
  };
  const stamp = () => performance.now();
  const originalArrayBuffer = Response.prototype.arrayBuffer;
  Response.prototype.arrayBuffer = function (...args) {
    const sourceUrl = this.url;
    return originalArrayBuffer.apply(this, args).then(buffer => { bufferUrls.set(buffer, sourceUrl); return buffer; });
  };
  const connect = AudioNode.prototype.connect, disconnect = AudioNode.prototype.disconnect;
  AudioNode.prototype.connect = function (destination, ...args) {
    events.push({ type: "connect", atMs: stamp(), from: nodeId(this), to: nodeId(destination), fromType: this.constructor.name, toType: destination.constructor.name });
    const probe = contextProbes.get(this.context);
    if (probe && destination === this.context.destination && this !== probe.analyser) {
      // A transparent analyser inserted just before the destination measures the
      // actual graph signal. It adds no gain, generated audio, or extra output.
      return connect.call(this, probe.analyser, ...args);
    }
    return connect.call(this, destination, ...args);
  };
  AudioNode.prototype.disconnect = function (...args) {
    events.push({ type: "disconnect", atMs: stamp(), node: nodeId(this) });
    return disconnect.apply(this, args);
  };
  const NativeContext = window.AudioContext;
  window.AudioContext = new Proxy(NativeContext, {
    construct(Target, args) {
      const context = new Target(...args), id = contexts.length + 1, analyser = context.createAnalyser();
      analyser.fftSize = 2048;
      connect.call(analyser, context.destination);
      contextProbes.set(context, { analyser });
      contexts.push({ context, id, createdAtMs: stamp(), analyser });
      events.push({ type: "context-created", id, atMs: stamp(), sampleRate: context.sampleRate });
      context.addEventListener("statechange", () => events.push({ type: "context-state", id, state: context.state, atMs: stamp() }));
      const createSource = context.createBufferSource.bind(context);
      context.createBufferSource = (...createArgs) => {
        const source = createSource(...createArgs), record = { id: nodeId(source), contextId: id, createdAtMs: stamp(), started: false, ended: false, stops: [], buffer: undefined };
        sources.push(record);
        const start = source.start.bind(source), stop = source.stop.bind(source);
        source.start = (...startArgs) => {
          record.buffer = describeBuffer(source.buffer);
          record.started = true;
          record.startAtMs = stamp();
          record.startContextTime = context.currentTime;
          record.startArgs = startArgs;
          record.loop = source.loop;
          events.push({ type: "source-start", id: record.id, atMs: stamp(), buffer: record.buffer, args: startArgs, loop: source.loop });
          return start(...startArgs);
        };
        source.stop = (...stopArgs) => {
          record.stops.push({ atMs: stamp(), contextTime: context.currentTime, args: stopArgs });
          events.push({ type: "source-stop", id: record.id, atMs: stamp(), args: stopArgs });
          return stop(...stopArgs);
        };
        source.addEventListener("ended", () => { record.ended = true; record.endedAtMs = stamp(); events.push({ type: "source-ended", id: record.id, atMs: stamp() }); });
        return source;
      };
      const decode = context.decodeAudioData.bind(context);
      context.decodeAudioData = (arrayBuffer, ...decodeArgs) => {
        const sourceUrl = bufferUrls.get(arrayBuffer);
        const result = decode(arrayBuffer, ...decodeArgs);
        if (result?.then) return result.then(buffer => { describeBuffer(buffer).url = sourceUrl; return buffer; });
        return result;
      };
      return context;
    },
  });
  const mediaPlay = HTMLMediaElement.prototype.play, mediaPause = HTMLMediaElement.prototype.pause;
  HTMLMediaElement.prototype.play = function (...args) { events.push({ type: "media-play", url: this.currentSrc || this.src, atMs: stamp() }); return mediaPlay.apply(this, args); };
  HTMLMediaElement.prototype.pause = function (...args) { events.push({ type: "media-pause", url: this.currentSrc || this.src, atMs: stamp() }); return mediaPause.apply(this, args); };
  window.__audioProbeSnapshot = () => {
    const output = contexts.map(({ id, context, analyser, createdAtMs }) => {
      const data = new Float32Array(analyser.fftSize);
      analyser.getFloatTimeDomainData(data);
      return { id, createdAtMs, state: context.state, time: context.currentTime, rms: Math.sqrt(data.reduce((sum, value) => sum + value * value, 0) / data.length) };
    });
    return { contexts: output, sources, events, atMs: stamp(), media: [...document.querySelectorAll("audio,video")].map(item => ({ url: item.currentSrc || item.src, paused: item.paused, volume: item.volume })) };
  };
}

async function runScenario(name, { sound = true, delayAudioMs = 0, highestLevel = 6, selectedMusicTrack = "menu" } = {}, action) {
  if (only && only !== name) return;
  const context = await browser.newContext({ viewport: { width: 496, height: 1078 }, deviceScaleFactor: 1, timezoneId: "Asia/Shanghai" });
  await context.addInitScript(instrumentAudio, { sound, highestLevel, selectedMusicTrack });
  if (delayAudioMs) await context.route("**/assets/audio/*.mp3", async route => {
    if (/happy-(carnival|foods)\.mp3/.test(route.request().url())) await new Promise(resolve => setTimeout(resolve, delayAudioMs));
    await route.continue();
  });
  const page = await context.newPage(), checkpoints = [], checks = [];
  page.on("pageerror", error => errors.push({ name, message: error.message }));
  const response = await page.goto(url, { waitUntil: "domcontentloaded" });
  const buildHtml = await response.text();
  await page.waitForFunction(() => window.__COLOR_ESCAPE__?.artReady, undefined, { timeout: 60000 });
  await page.evaluate(() => { const g = window.__COLOR_ESCAPE__; g.updateToastVisible = false; g.dirty = true; g.scheduleFrame(); });
  async function click(name) {
    const target = await page.evaluate(name => {
      const d = window.__COLOR_ESCAPE__.getDebugState(), hit = d.interactionTargets.targets[name]?.hit;
      if (!hit) throw new Error(`Missing target ${name}`);
      return { x: d.viewportTransform.offsetX + (hit.x + hit.width / 2) * d.viewportTransform.scale,
        y: d.viewportTransform.offsetY + (hit.y + hit.height / 2) * d.viewportTransform.scale };
    }, name);
    const box = await page.locator("canvas").boundingBox();
    await page.mouse.click(box.x + target.x, box.y + target.y);
  }
  async function checkpoint(label, waitMs = 1000) {
    await page.waitForTimeout(waitMs);
    const samples = [];
    for (let i = 0; i < 8; i++) {
      samples.push(await page.evaluate(() => window.__audioProbeSnapshot().contexts));
      await page.waitForTimeout(50);
    }
    const snapshot = await page.evaluate(() => {
      const g = window.__COLOR_ESCAPE__;
      return { audio: window.__audioProbeSnapshot(), screen: g.screen, musicEnabled: g.save.music, effectsEnabled: g.save.sound,
        transport: g.host.musicTransport(), hostScene: g.host.musicScene, hostSelected: g.host.selectedMusicTrack };
    });
    const activeMusic = snapshot.audio.sources.filter(source => source.started && !source.ended && source.stops.length === 0 && source.buffer?.duration > 30);
    const maxRms = Math.max(0, ...samples.flat().map(sample => sample.rms));
    const entry = { label, ...snapshot, activeMusic, maxRms, samples };
    checkpoints.push(entry);
    await page.screenshot({ path: resolve(output, `${name}-${label}.png`) });
    return entry;
  }
  function check(label, passed, detail) { checks.push({ label, passed: Boolean(passed), detail }); }
  const functions = { page, click, checkpoint, check };
  try { await action(functions); }
  catch (error) { checks.push({ label: "scenario execution", passed: false, detail: String(error) }); }
  const trace = await page.evaluate(() => window.__audioProbeSnapshot());
  results.push({ name, sound, delayAudioMs, buildHtml, checkpoints, checks, trace });
  await writeFile(resolve(output, `${name}.json`), JSON.stringify(results.at(-1), null, 2));
  await context.close();
}

const isMenu = checkpoint => checkpoint.activeMusic.length === 1 && checkpoint.activeMusic[0].buffer.url?.includes("happy-carnival.mp3");
const isChallenge = checkpoint => checkpoint.activeMusic.length === 1 && checkpoint.activeMusic[0].buffer.url?.includes("happy-foods.mp3");
const isSilent = checkpoint => checkpoint.activeMusic.length === 0 && checkpoint.maxRms < 0.000001;
try {
  await runScenario("cold-effects-off", { sound: false }, async ({ click, checkpoint, check }) => {
    await click("homeSettings");
    const enabled = await checkpoint("music-enabled");
    check("Music starts independently of disabled effects", isMenu(enabled) && enabled.maxRms > 0.00001, { contexts: enabled.audio.contexts.length, activeMusic: enabled.activeMusic, rms: enabled.maxRms });
    await click("settings.sound");
    const off = await checkpoint("music-disabled");
    check("Music off is silent", isSilent(off));
    await click("settings.sound");
    const on = await checkpoint("music-reenabled");
    check("Music re-enable starts with effects still off", isMenu(on) && on.maxRms > 0.00001);
  });
  await runScenario("normal-campaign", {}, async ({ click, checkpoint, check }) => {
    await click("homeSettings");
    const menu = await checkpoint("home-menu");
    check("Menu emits one recorded source", isMenu(menu) && menu.maxRms > 0.00001);
    await click("settings.sound");
    const off = await checkpoint("music-off");
    check("Music off stops menu source and becomes silent after effects", isSilent(off));
    await click("settings.sound");
    const on = await checkpoint("music-on");
    check("Music on restores one menu source", isMenu(on));
    await click("menuBack"); await click("homePlay");
    const play = await checkpoint("campaign-playing");
    check("Campaign uses challenge source only", play.screen === "playing" && isChallenge(play) && play.maxRms > 0.00001);
    check("Prior menu source received stop", on.activeMusic.every(previous => play.audio.sources.find(source => source.id === previous.id)?.stops.length > 0));
    await click("pause");
    const paused = await checkpoint("campaign-paused");
    check("Pause preserves challenge music", paused.screen === "paused" && isChallenge(paused) && paused.maxRms > 0.00001);
  });
  await runScenario("muted-scene-change", {}, async ({ click, checkpoint, check }) => {
    await click("homeSettings"); await checkpoint("menu-started");
    await click("settings.sound"); await checkpoint("music-off");
    await click("menuBack"); await click("homePlay");
    const disabled = await checkpoint("campaign-muted");
    check("Muted campaign remains silent", isSilent(disabled));
    await click("pause"); await click("pause.sound");
    const restored = await checkpoint("challenge-reenabled");
    check("Re-enable after muted scene switch plays challenge, not stale menu", isChallenge(restored) && restored.maxRms > 0.00001, { active: restored.activeMusic, transport: restored.transport });
  });
  await runScenario("daily-challenge", {}, async ({ click, checkpoint, check, page }) => {
    await click("homeSettings"); const menu = await checkpoint("menu-started"); await click("menuBack");
    await click("homeDailyChallenge");
    await page.waitForFunction(() => Boolean(window.__COLOR_ESCAPE__.dailyChallengeArt), undefined, { timeout: 30000 });
    await click("dailyChallenge.3");
    const playing = await checkpoint("daily-playing");
    check("Daily challenge switches to challenge audio", playing.screen === "playing" && isChallenge(playing) && playing.maxRms > 0.00001);
    check("Daily entry stops menu source", menu.activeMusic.every(previous => playing.audio.sources.find(source => source.id === previous.id)?.stops.length > 0));
    await click("pause"); const paused = await checkpoint("daily-paused");
    check("Daily pause retains music", isChallenge(paused) && paused.maxRms > 0.00001);
  });
  await runScenario("delayed-load-rapid-toggle", { delayAudioMs: 1600 }, async ({ click, checkpoint, check }) => {
    await click("homeSettings");
    for (let i = 0; i < 5; i++) await click("settings.sound");
    const off = await checkpoint("late-load-disabled", 2300);
    check("Late decode cannot start disabled music", isSilent(off));
    await click("settings.sound");
    const menu = await checkpoint("music-restored"); check("Restored music has one source", isMenu(menu));
    await click("settings.sound"); await click("menuBack"); await click("homePlay");
    await click("pause"); await click("pause.sound");
    const playing = await checkpoint("late-challenge-load", 2300);
    check("Late challenge decode never revives menu source", isChallenge(playing) && playing.maxRms > 0.00001);
    check("Exactly one AudioContext", playing.audio.contexts.length === 1);
  });
  await runScenario("favorites-playlist", { sound: false, highestLevel: 30 }, async ({ click, checkpoint, check, page }) => {
    await click("homeSettings");
    const menu = await checkpoint("multiple-favorites-menu");
    const playlist = await page.evaluate(() => window.__COLOR_ESCAPE__.host.musicPlaylist);
    check("Legacy favorites do not create a runtime queue or override the menu", playlist.length === 0 && isMenu(menu), { playlist });
    await click("settings.sound");
    const off = await checkpoint("favorites-muted");
    check("Favorite playlist is silent with music off", isSilent(off));
    await click("menuBack"); await click("homePlay");
    await click("pause"); await click("pause.sound");
    const challenge = await checkpoint("favorites-challenge-restored");
    check("Restoring from favorites in challenge plays only challenge", isChallenge(challenge) && challenge.maxRms > 0.00001);
    const challengePlaylist = await page.evaluate(() => window.__COLOR_ESCAPE__.host.musicPlaylist);
    check("Challenge has no menu favorites queue", challengePlaylist.length === 0, { challengePlaylist });
    await click("pauseHome");
    const home = await checkpoint("favorites-home-restored");
    check("Returning home restores one menu favorite", home.screen === "home" && isMenu(home) && home.maxRms > 0.00001);
    check("Only one AudioContext across all transitions", home.audio.contexts.length === 1);
  });
  await runScenario("legacy-selection", { sound: false, highestLevel: 30, selectedMusicTrack: "challenge" }, async ({ click, checkpoint, check, page }) => {
    await click("homeSettings");
    const menu = await checkpoint("legacy-menu");
    check("Deleted music selection cannot override the home theme", isMenu(menu) && menu.maxRms > 0.00001, { active: menu.activeMusic, transport: menu.transport });
    await click("settings.sound");
    const off = await checkpoint("legacy-music-off");
    check("Legacy selected music still obeys music switch", isSilent(off));
    await click("settings.sound");
    const restored = await checkpoint("legacy-music-restored");
    check("Enabling music restores the home theme", isMenu(restored) && restored.maxRms > 0.00001);
    await click("menuBack"); await click("homePlay");
    const challenge = await checkpoint("legacy-campaign");
    check("Campaign plays dedicated challenge theme", isChallenge(challenge) && challenge.maxRms > 0.00001);
    check("Entering campaign replaces the old home source", restored.activeMusic.every(previous => challenge.audio.sources.find(source => source.id === previous.id)?.stops.length > 0));
    const savedTrack = await page.evaluate(() => window.__COLOR_ESCAPE__.save.selectedMusicTrack);
    check("Legacy preference is left intact instead of resetting player storage", savedTrack === "challenge", { savedTrack });
    check("One audio context for legacy save", challenge.audio.contexts.length === 1);
  });
  const failures = results.flatMap(result => result.checks.filter(check => !check.passed).map(check => ({ scenario: result.name, ...check })));
  const report = { status: failures.length ? "REGRESSION_REPRODUCED" : "PASS", phase, url,
    scope: "Isolated synthetic storage; real Pointer actions; native AudioContext/BufferSource lifecycle and actual analyser RMS; not OS speaker capture", results, errors, failures };
  await writeFile(resolve(output, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ status: report.status, output, failures, errors }, null, 2));
  if (!phase.startsWith("before")) { assert.deepEqual(errors, []); assert.equal(failures.length, 0, "Audio output regressions remain"); }
} finally { await browser.close(); }
