import { chromium } from "playwright";

const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 496, height: 1078 } });
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(error.message));

await page.addInitScript(() => {
  localStorage.setItem("color-escape-save-v1", JSON.stringify({
    schemaVersion: 1,
    currentLevel: 1,
    highestLevel: 100,
    coins: 1_000,
    sound: true,
    haptic: false,
    reducedMotion: false,
    featureSeen: ["basics", "ice-door", "ice-block", "layer", "shutter", "elevator", "conveyor", "star-gate"],
    boosterUnlockSeen: ["time", "rocket", "pulse"],
    boosters: { time: 3, rocket: 3, pulse: 3 },
    bestStars: {},
    bestMoves: {},
    rewardedLevels: [],
    dailyStreak: 0,
    lastDailyCompletedDay: "",
    lastSeenUpdate: "2026-09-05-r95",
  }));
  const probe = { contexts: 0, tones: [], fetches: [], decoded: [], sources: [], suspends: 0, resumes: 0 };
  window.__AUDIO_PROBE__ = probe;
  const audioDataUrls = new WeakMap();
  const nativeFetch = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const response = await nativeFetch(input, init);
    const requestUrl = input instanceof Request
      ? input.url
      : new URL(String(input), window.location.href).href;
    if (!new URL(requestUrl).pathname.includes("/assets/audio/")) return response;
    probe.fetches.push(requestUrl);
    return new Proxy(response, {
      get(target, property) {
        if (property === "arrayBuffer") {
          return async () => {
            const data = await target.arrayBuffer();
            audioDataUrls.set(data, requestUrl);
            return data;
          };
        }
        const value = Reflect.get(target, property, target);
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
  };
  class FakeParam {
    value = 0;
    cancelScheduledValues() {}
    setValueAtTime(value) { this.value = value; }
    exponentialRampToValueAtTime(value) { this.value = value; }
  }
  class FakeOscillator {
    type = "sine";
    frequency = new FakeParam();
    detune = new FakeParam();
    connect(node) { return node; }
    start(time) { probe.tones.push({ frequency: this.frequency.value, type: this.type, time }); }
    stop() {}
  }
  class FakeGain {
    gain = new FakeParam();
    connect(node) { return node; }
  }
  class FakeBufferSource {
    buffer = null;
    loop = false;
    loopStart = 0;
    loopEnd = 0;
    onended = null;
    connect(node) { return node; }
    record = null;
    start(time) {
      this.record = {
        id: probe.sources.length + 1,
        url: this.buffer?.url ?? "unknown",
        loop: this.loop,
        loopStart: this.loopStart,
        loopEnd: this.loopEnd,
        duration: this.buffer?.duration ?? 0,
        startTime: time ?? 0,
        stopCalls: 0,
      };
      probe.sources.push(this.record);
    }
    stop() { if (this.record) this.record.stopCalls += 1; }
  }
  class FakeAudioContext {
    state = "running";
    currentTime = 0;
    destination = {};
    constructor() { probe.contexts += 1; }
    createOscillator() { return new FakeOscillator(); }
    createGain() { return new FakeGain(); }
    createBufferSource() { return new FakeBufferSource(); }
    decodeAudioData(data) {
      const url = audioDataUrls.get(data) ?? "unknown";
      const pathname = url === "unknown" ? "" : new URL(url).pathname;
      const duration = pathname.endsWith("/happy-carnival.mp3")
        ? 148.178145833
        : pathname.endsWith("/happy-foods.mp3")
          ? 126.016
          : Math.max(0.05, data.byteLength / 24_000);
      probe.decoded.push({ url, bytes: data.byteLength, duration });
      return Promise.resolve({ duration, url });
    }
    resume() { this.state = "running"; probe.resumes += 1; return Promise.resolve(); }
    suspend() { this.state = "suspended"; probe.suspends += 1; return Promise.resolve(); }
  }
  Object.defineProperty(window, "AudioContext", { configurable: true, value: FakeAudioContext });
});

await page.goto(playtestUrl, { waitUntil: "networkidle" });
await page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().art.ready);
const debug = () => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const probe = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__AUDIO_PROBE__)));
const clickTarget = async (name) => {
  const state = await debug();
  const hit = state.interactionTargets?.targets?.[name]?.hit;
  const canvas = await page.locator("canvas").boundingBox();
  if (!hit || !canvas) throw new Error(`Audio E2E: missing ${name} target`);
  await page.mouse.click(
    canvas.x + state.viewportTransform.offsetX + (hit.x + hit.width / 2) * state.viewportTransform.scale,
    canvas.y + state.viewportTransform.offsetY + (hit.y + hit.height / 2) * state.viewportTransform.scale,
  );
};
const HAPPY_CARNIVAL_PATH = "/assets/audio/happy-carnival.mp3";
const HAPPY_FOODS_PATH = "/assets/audio/happy-foods.mp3";
const HAPPY_FOODS_DURATION_SECONDS = 126.016;
const pathOf = (url) => {
  try { return new URL(url).pathname; } catch { return String(url); }
};
const loopsForPath = (audioProbe, path) => audioProbe.sources
  .filter((source) => source.loop && pathOf(source.url) === path);
const fetchedCountForPath = (audioProbe, path) => audioProbe.fetches
  .filter((url) => pathOf(url) === path).length;
const decodedCountForPath = (audioProbe, path) => audioProbe.decoded
  .filter(({ url }) => pathOf(url) === path).length;
const waitForNavigation = async (screen) => page.waitForFunction((expected) => {
  const current = window.__COLOR_ESCAPE__?.getDebugState();
  return current?.screen === expected && !current.navigation.transition;
}, screen);

let state = await debug();
let audioProbe = await probe();
if (state.audio.scene !== "menu" || !state.audio.enabled || audioProbe.contexts !== 0) {
  throw new Error(`Audio E2E: menu must be armed without violating autoplay ${JSON.stringify({ audio: state.audio, audioProbe })}`);
}

// Stay outside a level for the first gesture so autoplay unlocking proves the
// supplied menu recording itself, rather than merely decoding it in advance.
await clickTarget("navigation.0");
await waitForNavigation("supply");
await page.waitForFunction((expectedPath) => window.__AUDIO_PROBE__.sources
  .some((source) => source.loop && new URL(source.url).pathname === expectedPath), HAPPY_CARNIVAL_PATH);
await page.waitForFunction(() => window.__AUDIO_PROBE__.decoded.length >= 16);
await page.waitForTimeout(30);
state = await debug();
audioProbe = await probe();
const firstHappySources = loopsForPath(audioProbe, HAPPY_CARNIVAL_PATH);
const fetchedPaths = audioProbe.fetches.map(pathOf);
if (state.screen !== "supply" || state.audio.scene !== "menu" || audioProbe.contexts !== 1
  || firstHappySources.length !== 1 || firstHappySources[0].stopCalls !== 0
  || Math.abs(firstHappySources[0].loopStart) > 1e-8
  || Math.abs(firstHappySources[0].loopEnd - 148.178145833) > 1e-5
  || fetchedCountForPath(audioProbe, HAPPY_CARNIVAL_PATH) !== 1
  || fetchedCountForPath(audioProbe, HAPPY_FOODS_PATH) !== 0
  || decodedCountForPath(audioProbe, HAPPY_CARNIVAL_PATH) !== 1
  || decodedCountForPath(audioProbe, HAPPY_FOODS_PATH) !== 0
  || fetchedPaths.some((path) => path.endsWith("/crown-of-color.mp3"))) {
  throw new Error(`Audio E2E: first out-of-level gesture did not start Happy Carnival ${JSON.stringify({ screen: state.screen, audio: state.audio, audioProbe })}`);
}
if (audioProbe.decoded.some(({ bytes }) => bytes < 500)
  || audioProbe.decoded.filter(({ bytes }) => bytes < 10_000).length !== 1) {
  throw new Error(`Audio E2E: recorded assets did not all decode ${JSON.stringify(audioProbe)}`);
}

// All five main-navigation surfaces share one uninterrupted menu source.
for (const [tab, expectedScreen] of [
  [1, "leaderboard"],
  [2, "home"],
  [3, "levels"],
  [4, "records"],
  [2, "home"],
]) {
  await clickTarget(`navigation.${tab}`);
  await waitForNavigation(expectedScreen);
  state = await debug();
  audioProbe = await probe();
  const happySources = loopsForPath(audioProbe, HAPPY_CARNIVAL_PATH);
  if (state.audio.scene !== "menu" || audioProbe.contexts !== 1
    || happySources.length !== 1 || happySources[0].id !== firstHappySources[0].id
    || happySources[0].stopCalls !== 0 || loopsForPath(audioProbe, HAPPY_FOODS_PATH).length !== 0
    || fetchedCountForPath(audioProbe, HAPPY_CARNIVAL_PATH) !== 1
    || fetchedCountForPath(audioProbe, HAPPY_FOODS_PATH) !== 0) {
    throw new Error(`Audio E2E: ${expectedScreen} did not reuse the shared Happy Carnival source ${JSON.stringify({ screen: state.screen, audio: state.audio, audioProbe })}`);
  }
}

await clickTarget("homePlay");
await page.waitForFunction((expectedPath) => {
  const current = window.__COLOR_ESCAPE__?.getDebugState();
  return current?.screen === "playing" && window.__AUDIO_PROBE__.sources
    .some((source) => source.loop && new URL(source.url).pathname === expectedPath);
}, HAPPY_FOODS_PATH);
await page.waitForTimeout(30);
state = await debug();
audioProbe = await probe();
const happyAtChallenge = loopsForPath(audioProbe, HAPPY_CARNIVAL_PATH);
const happyFoodsAtChallenge = loopsForPath(audioProbe, HAPPY_FOODS_PATH);
if (state.audio.scene !== "gameplay" || audioProbe.contexts !== 1
  || happyAtChallenge.length !== 1 || happyAtChallenge[0].stopCalls !== 1
  || happyFoodsAtChallenge.length !== 1 || happyFoodsAtChallenge[0].stopCalls !== 0
  || Math.abs(happyFoodsAtChallenge[0].duration - HAPPY_FOODS_DURATION_SECONDS) > 1e-5
  || Math.abs(happyFoodsAtChallenge[0].loopStart) > 1e-8
  || Math.abs(happyFoodsAtChallenge[0].loopEnd - HAPPY_FOODS_DURATION_SECONDS) > 1e-5
  || fetchedCountForPath(audioProbe, HAPPY_CARNIVAL_PATH) !== 1
  || fetchedCountForPath(audioProbe, HAPPY_FOODS_PATH) !== 1
  || decodedCountForPath(audioProbe, HAPPY_CARNIVAL_PATH) !== 1
  || decodedCountForPath(audioProbe, HAPPY_FOODS_PATH) !== 1) {
  throw new Error(`Audio E2E: entering playing did not switch from Happy Carnival to Happy Foods ${JSON.stringify({ screen: state.screen, audio: state.audio, audioProbe })}`);
}
const providedExitCount = () => page.evaluate(() => window.__AUDIO_PROBE__.sources
  .filter((source) => !source.loop && source.duration > 1.28 && source.duration < 1.29).length);
const exitsBefore = await providedExitCount();
await page.evaluate(() => window.__COLOR_ESCAPE__.playSound("exit"));
await page.waitForTimeout(30);
if (await providedExitCount() !== exitsBefore + 1) {
  throw new Error(`Audio E2E: user-provided elimination MP3 was not used ${JSON.stringify(await probe())}`);
}
const providedPutdownCount = () => page.evaluate(() => window.__AUDIO_PROBE__.sources
  .filter((source) => !source.loop && source.duration > 0.62 && source.duration < 0.64).length);
const putdownsBefore = await providedPutdownCount();
await page.evaluate(() => window.__COLOR_ESCAPE__.playSound("putdown"));
await page.waitForTimeout(30);
if (await providedPutdownCount() !== putdownsBefore + 1) {
  throw new Error(`Audio E2E: user-provided putdown MP3 was not used ${JSON.stringify(await probe())}`);
}
const providedThawCount = () => page.evaluate(() => window.__AUDIO_PROBE__.sources
  .filter((source) => !source.loop && new URL(source.url).pathname.endsWith("/thaw.mp3")).length);
const triggerThawFixture = async (levelId, target) => {
  const beforeCount = await providedThawCount();
  const unlocked = await page.evaluate(({ fixtureLevelId, fixtureTarget }) => {
    const game = window.__COLOR_ESCAPE__;
    game.loadLevel(fixtureLevelId, true);
    const before = game.model.snapshot();
    game.model.beginAction();
    if (!game.model.thawAll(99)) return false;
    const after = game.model.snapshot();
    const reachedZero = fixtureTarget === "gate"
      ? before.gates.some((item) => item.frozen > 0
        && after.gates.find((candidate) => candidate.id === item.id)?.frozen === 0)
      : before.blocks.some((item) => item.frozen > 0
        && after.blocks.find((candidate) => candidate.id === item.id)?.frozen === 0);
    game.emitMechanicFeedback(before, after);
    game.model.cancelAction();
    return reachedZero;
  }, { fixtureLevelId: levelId, fixtureTarget: target });
  await page.waitForTimeout(30);
  if (!unlocked || await providedThawCount() !== beforeCount + 1) {
    throw new Error(`Audio E2E: ${target} unlock did not use the provided thaw MP3 ${JSON.stringify(await probe())}`);
  }
};
await triggerThawFixture(6, "gate");
await triggerThawFixture(10, "block");
await page.evaluate(() => window.__COLOR_ESCAPE__.loadLevel(1, true));

await page.evaluate(() => {
  const game = window.__COLOR_ESCAPE__;
  const state = game.getDebugState();
  game.model.start();
  game.model.tick(Math.max(0, state.puzzle.remainingSeconds - 19));
});
await page.waitForTimeout(80);
state = await debug();
audioProbe = await probe();
const happyFoodsAtDanger = loopsForPath(audioProbe, HAPPY_FOODS_PATH);
if (state.audio.scene !== "danger" || happyFoodsAtDanger.length !== 1
  || happyFoodsAtDanger[0].id !== happyFoodsAtChallenge[0].id || happyFoodsAtDanger[0].stopCalls !== 0) {
  throw new Error(`Audio E2E: countdown did not reuse Happy Foods for danger music ${JSON.stringify({ audio: state.audio, audioProbe })}`);
}

await clickTarget("pause");
await page.waitForTimeout(50);
state = await debug();
audioProbe = await probe();
const happyAtPause = loopsForPath(audioProbe, HAPPY_CARNIVAL_PATH);
const happyFoodsAtPause = loopsForPath(audioProbe, HAPPY_FOODS_PATH);
if (state.screen !== "paused" || state.audio.scene !== "silent"
  || happyAtPause.length !== 1 || happyAtPause[0].id !== firstHappySources[0].id
  || happyAtPause[0].stopCalls !== 1
  || happyFoodsAtPause.length !== 1 || happyFoodsAtPause[0].id !== happyFoodsAtChallenge[0].id
  || happyFoodsAtPause[0].stopCalls !== 0
  || fetchedCountForPath(audioProbe, HAPPY_CARNIVAL_PATH) !== 1
  || fetchedCountForPath(audioProbe, HAPPY_FOODS_PATH) !== 1
  || decodedCountForPath(audioProbe, HAPPY_CARNIVAL_PATH) !== 1
  || decodedCountForPath(audioProbe, HAPPY_FOODS_PATH) !== 1) {
  throw new Error(`Audio E2E: pause did not silence music without starting another track ${JSON.stringify({ screen: state.screen, audio: state.audio, audioProbe })}`);
}
if (!audioProbe.sources.some((source) => !source.loop && source.duration === 0.05)) {
  throw new Error(`Audio E2E: user-provided MP3 button sound was not used ${JSON.stringify(audioProbe.sources)}`);
}

await clickTarget("pause.sound");
await page.waitForTimeout(50);
state = await debug();
audioProbe = await probe();
const mutedToneCount = audioProbe.tones.length;
if (state.audio.enabled || state.settings.sound) {
  throw new Error(`Audio E2E: sound setting did not mute both music and effects ${JSON.stringify({ audio: state.audio, settings: state.settings })}`);
}
await page.waitForTimeout(450);
if ((await probe()).tones.length !== mutedToneCount) throw new Error("Audio E2E: muted music continued scheduling tones");

await clickTarget("pause.sound");
await page.waitForTimeout(40);
state = await debug();
if (!state.audio.enabled || !state.settings.sound || (await probe()).contexts !== 1) {
  throw new Error(`Audio E2E: unmute failed or created a second context ${JSON.stringify({ audio: state.audio, settings: state.settings, audioProbe: await probe() })}`);
}

await clickTarget("pauseResume");
await page.waitForTimeout(50);
state = await debug();
audioProbe = await probe();
const happyFoodsAfterResume = loopsForPath(audioProbe, HAPPY_FOODS_PATH);
if (state.screen !== "playing" || state.audio.scene !== "danger" || happyFoodsAfterResume.length !== 1
  || happyFoodsAfterResume[0].id !== happyFoodsAtChallenge[0].id || happyFoodsAfterResume[0].stopCalls !== 0
  || fetchedCountForPath(audioProbe, HAPPY_CARNIVAL_PATH) !== 1
  || fetchedCountForPath(audioProbe, HAPPY_FOODS_PATH) !== 1
  || decodedCountForPath(audioProbe, HAPPY_CARNIVAL_PATH) !== 1
  || decodedCountForPath(audioProbe, HAPPY_FOODS_PATH) !== 1) {
  throw new Error(`Audio E2E: gameplay music did not resume the same Happy Foods source ${JSON.stringify({ screen: state.screen, audio: state.audio, audioProbe })}`);
}

await clickTarget("pause");
await page.waitForTimeout(40);
await clickTarget("pauseHome");
await page.waitForTimeout(60);
state = await debug();
audioProbe = await probe();
const happyAfterHome = loopsForPath(audioProbe, HAPPY_CARNIVAL_PATH);
const happyFoodsAfterHome = loopsForPath(audioProbe, HAPPY_FOODS_PATH);
if (state.screen !== "home" || state.audio.scene !== "menu" || audioProbe.contexts !== 1
  || happyAfterHome.length !== 2 || happyAfterHome[0].stopCalls !== 1 || happyAfterHome[1].stopCalls !== 0
  || happyFoodsAfterHome.length !== 1 || happyFoodsAfterHome[0].stopCalls !== 1
  || fetchedCountForPath(audioProbe, HAPPY_CARNIVAL_PATH) !== 2
  || fetchedCountForPath(audioProbe, HAPPY_FOODS_PATH) !== 1
  || decodedCountForPath(audioProbe, HAPPY_CARNIVAL_PATH) !== 2
  || decodedCountForPath(audioProbe, HAPPY_FOODS_PATH) !== 1) {
  throw new Error(`Audio E2E: returning home did not stop Happy Foods and restart Happy Carnival ${JSON.stringify({ screen: state.screen, audio: state.audio, audioProbe })}`);
}

const buttonSourceCount = () => page.evaluate(() => window.__AUDIO_PROBE__.sources
  .filter((source) => !source.loop && source.duration === 0.05).length);
let arrowClickCount = await buttonSourceCount();
await clickTarget("homeNext");
await page.waitForTimeout(40);
state = await debug();
if (state.puzzle.levelId !== 2 || await buttonSourceCount() !== arrowClickCount + 1) {
  throw new Error(`Audio E2E: next-level arrow did not use the provided button sound ${JSON.stringify({ levelId: state.puzzle.levelId, before: arrowClickCount, after: await buttonSourceCount() })}`);
}
arrowClickCount = await buttonSourceCount();
await clickTarget("homePrev");
await page.waitForTimeout(40);
state = await debug();
if (state.puzzle.levelId !== 1 || await buttonSourceCount() !== arrowClickCount + 1) {
  throw new Error(`Audio E2E: previous-level arrow did not use the provided button sound ${JSON.stringify({ levelId: state.puzzle.levelId, before: arrowClickCount, after: await buttonSourceCount() })}`);
}

let navigationClickCount = await buttonSourceCount();
await clickTarget("navigation.0");
await page.waitForTimeout(240);
state = await debug();
if (state.screen !== "supply" || await buttonSourceCount() !== navigationClickCount + 1) {
  throw new Error(`Audio E2E: bottom navigation did not use the provided button sound ${JSON.stringify({ screen: state.screen, before: navigationClickCount, after: await buttonSourceCount() })}`);
}
navigationClickCount = await buttonSourceCount();
await clickTarget("navigation.2");
await page.waitForTimeout(240);
state = await debug();
if (state.screen !== "home" || await buttonSourceCount() !== navigationClickCount + 1) {
  throw new Error(`Audio E2E: home navigation tab did not use the provided button sound ${JSON.stringify({ screen: state.screen, before: navigationClickCount, after: await buttonSourceCount() })}`);
}

await browser.close();
if (errors.length) throw new Error(`Audio E2E browser errors:\n${errors.join("\n")}`);
console.log("Audio playtest passed: shared Happy Carnival menu loop, preserved Happy Foods challenge loop, pause/mute/context reuse, and provided interaction MP3s.");
