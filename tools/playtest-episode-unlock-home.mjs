import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = fileURLToPath(new URL("../", import.meta.url));
const url = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
const output = resolve(root, process.env.PLAYTEST_OUTPUT ?? `playtest-results/episode-unlock-home-${new Date().toISOString().replace(/[:.]/g, "-")}`);
const saveKey = "color-escape-save-v1";
const inputs = ["src/game/ColorEscapeGame.ts", "src/game/formalPageLayout.ts", "src/core/journeyProgress.ts",
  "tools/playtest-episode-unlock-home.mjs", "tools/playtest-journey-leaderboard.mjs"];
const hashes = async () => Object.fromEntries(await Promise.all(inputs.map(async (path) => [path,
  createHash("sha256").update(await readFile(resolve(root, path))).digest("hex"),
])));
await mkdir(output, { recursive: true });
const before = await hashes();
const browser = await chromium.launch({ headless: true });
const errors = [];
const reports = [];
const trackRoute = "**/assets/art/ui/formal-pages/journey/track.png";
const seed = (pending = false) => ({
  schemaVersion: 1, currentLevel: pending ? 21 : 20, highestLevel: pending ? 21 : 20,
  coins: 1000, sound: false, haptic: false, reducedMotion: false, language: "en",
  featureSeen: ["basics", "ice-door", "ice-block", "layer", "shutter", "generator", "key-lock", "arrow-block", "lift", "star"],
  boosterUnlockSeen: ["time", "rocket", "pulse"], boosters: { time: 3, rocket: 3, pulse: 3 },
  bestStars: Object.fromEntries(Array.from({ length: pending ? 20 : 19 }, (_, i) => [String(i + 1), 3])),
  bestMoves: Object.fromEntries(Array.from({ length: pending ? 20 : 19 }, (_, i) => [String(i + 1), 20])),
  rewardedLevels: Array.from({ length: pending ? 20 : 19 }, (_, i) => i + 1),
  journeyProgress: { claimedMilestoneLevels: [10, 15], seenEpisodeUnlockLevels: [11] },
  lifeState: { lives: 5, nextLifeAtMs: 0, unlimitedLivesUntilMs: 0 },
  metaDiscovery: { collectionViewedThroughLevel: 21, dailyUnlockSeen: true },
  dailyStreak: 0, lastDailyCompletedDay: "",
});
const debug = (page) => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const stored = (page) => page.evaluate((key) => JSON.parse(localStorage.getItem(key)), saveKey);
const snap = async (page, name) => page.screenshot({ path: resolve(output, `${name}.png`) });
const targetPoint = async (page, name) => {
  const state = await debug(page), bounds = await page.locator("canvas").boundingBox();
  const hit = state.interactionTargets.targets[name]?.hit;
  assert.ok(hit && bounds, `Missing Pointer target ${name}`);
  return { x: bounds.x + state.viewportTransform.offsetX + (hit.x + hit.width / 2) * state.viewportTransform.scale,
    y: bounds.y + state.viewportTransform.offsetY + (hit.y + hit.height / 2) * state.viewportTransform.scale };
};
const down = async (page, name) => {
  const point = await targetPoint(page, name);
  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
  await page.waitForTimeout(70);
};
const click = async (page, name) => { await down(page, name); await page.mouse.up(); };
const waitOverlay = async (page) => {
  await page.waitForFunction(() => {
    const state = window.__COLOR_ESCAPE__.getDebugState();
    return state.screen === "home" && state.journey.presentation?.phase === "overlay"
      && state.journey.presentation.event.type === "episode_unlock";
  }, undefined, { timeout: 15_000 });
  return debug(page);
};
const trace = (page) => page.evaluate(() => [...globalThis.__EPISODE_TRACE__]);
const assertNoMap = async (page) => {
  const events = await trace(page);
  assert.equal(events.some((entry) => entry.screen === "levels"), false, "Automatic episode flow must never enter Journey/map");
  for (const event of events.filter((entry) => entry.type === "render" && entry.presentation)) {
    assert.equal(event.screen, "home", "Every episode presentation frame is Home-backed");
    assert.equal(event.coinFlight, false, "Episode waits for Home coin arrival");
  }
  return events;
};

async function fresh(name, viewport, pending = false) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push({ scenario: name, message: e.message }));
  page.on("console", (m) => { if (m.type() === "error") errors.push({ scenario: name, message: m.text() }); });
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().art.ready, undefined, { timeout: 15_000 });
  const updateId = (await debug(page)).updateNotice.id;
  await page.evaluate(({ value, updateId, saveKey }) => localStorage.setItem(saveKey, JSON.stringify({ ...value, lastSeenUpdate: updateId })),
    { value: seed(pending), updateId, saveKey });
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().art.ready, undefined, { timeout: 15_000 });
  await page.evaluate(() => {
    const game = window.__COLOR_ESCAPE__;
    const events = globalThis.__EPISODE_TRACE__ = [];
    let screen = game.screen;
    Object.defineProperty(game, "screen", {
      configurable: true, get: () => screen,
      set(value) { screen = value; events.push({ type: "screen", screen: value, at: performance.now() }); },
    });
    const render = game.render;
    game.render = function tracedRender(...args) {
      events.push({ type: "render", at: performance.now(), screen: this.screen,
        coinFlight: Boolean(this.homeCoinFlight),
        presentation: this.journeyPresentation ? { phase: this.journeyPresentation.phase,
          age: this.journeyPresentation.age, event: this.journeyPresentation.event.type } : null });
      return render.apply(this, args);
    };
  });
  return { context, page };
}

async function winFixture(page) {
  await page.evaluate(() => window.__COLOR_ESCAPE__.loadLevel(20, true));
  await page.waitForTimeout(100);
  assert.equal((await debug(page)).journey.presentation, undefined, "No chapter overlay while playing");
  assert.equal(await page.evaluate(() => window.__COLOR_ESCAPE__.beginPendingJourneyPresentation()), false);
  // This is a controlled result fixture, not a claimed Lv20 playthrough. It
  // exercises the real settlement and all subsequent UI/actions/persistence.
  await page.evaluate(() => window.__COLOR_ESCAPE__.beginCelebration());
  await page.waitForFunction(() => {
    const state = window.__COLOR_ESCAPE__.getDebugState();
    return state.screen === "win" && state.art.win.ready;
  }, undefined, { timeout: 15_000 });
  const win = await debug(page);
  assert.equal(win.journey.presentation, undefined, "No episode overlay on the result page");
  assert.equal(win.journey.pendingEvent?.level, 21);
  assert.equal(await page.evaluate(() => window.__COLOR_ESCAPE__.beginPendingJourneyPresentation()), false,
    "A direct pending-hook call cannot interrupt the result");
  return win;
}

async function returnFromWin(page, target, name) {
  await down(page, target);
  assert.equal((await debug(page)).screen, "win", "Return action does not fire before Pointer release");
  await page.mouse.up();
  await page.waitForFunction(() => window.__COLOR_ESCAPE__.screen === "home", undefined, { timeout: 5_000 });
  await snap(page, `${name}-home`);
}

async function acknowledge(page, target, name) {
  const before = await stored(page);
  assert.equal(before.journeyProgress.seenEpisodeUnlockLevels.includes(21), false);
  await down(page, target);
  assert.equal((await debug(page)).journey.presentation.phase, "overlay");
  assert.equal((await stored(page)).journeyProgress.seenEpisodeUnlockLevels.includes(21), false,
    "Acknowledgement cannot persist on Pointer down");
  await page.mouse.up();
  await page.waitForFunction(() => !window.__COLOR_ESCAPE__.getDebugState().journey.presentation, undefined, { timeout: 6_000 });
  assert.ok((await stored(page)).journeyProgress.seenEpisodeUnlockLevels.includes(21));
  assert.equal((await debug(page)).journey.pendingEvent, undefined);
  await snap(page, `${name}-acknowledged-home`);
  const events = await assertNoMap(page);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().art.ready, undefined, { timeout: 15_000 });
  assert.equal((await debug(page)).journey.presentation, undefined);
  assert.equal((await debug(page)).journey.pendingEvent, undefined);
  assert.equal(await page.evaluate(() => window.__COLOR_ESCAPE__.beginPendingJourneyPresentation()), false);
  return events;
}

async function scenario(name, viewport, run, pending = false) {
  const { context, page } = await fresh(name, viewport, pending);
  try { await run(page); }
  catch (error) {
    await snap(page, `failure-${name}`);
    await writeFile(resolve(output, `failure-${name}.json`), JSON.stringify({ error: String(error), state: await debug(page), events: await trace(page) }, null, 2));
    throw error;
  } finally { await context.close(); }
}

try {
  for (const [target, acknowledgeTarget, viewport] of [
    ["modalPrimary", "journeyPresentation", { width: 496, height: 1078 }],
    ["modalSecondary", "journeyPresentationClose", { width: 320, height: 568 }],
  ]) {
    const name = target === "modalPrimary" ? "win-primary" : "win-close";
    await scenario(name, viewport, async (page) => {
      await winFixture(page);
      await snap(page, `${name}-win-no-episode`);
      await returnFromWin(page, target, name);
      await waitOverlay(page);
      await snap(page, `${name}-episode-overlay`);
      const events = await acknowledge(page, acknowledgeTarget, name);
      reports.push({ name, viewport, resultFixture: "real beginCelebration with seeded pre-Lv20 progress; not a full playthrough",
        input: target === "modalPrimary" ? "winPrimary" : "winClose", acknowledgedBy: acknowledgeTarget, events,
        noMapDetour: true, persistentAndOneShot: true });
    });
  }

  await scenario("retry", { width: 496, height: 1078 }, async (page) => {
    let attempts = 0;
    await page.route(trackRoute, async (route) => {
      attempts += 1;
      if (attempts === 1) await route.fulfill({ status: 200, contentType: "image/png", body: "intentional-invalid-episode-resource" });
      else await route.continue();
    });
    await winFixture(page);
    await returnFromWin(page, "modalPrimary", "retry");
    await page.waitForFunction(() => Boolean(window.__COLOR_ESCAPE__.getDebugState().art.formalPage.error), undefined, { timeout: 15_000 });
    let state = await debug(page);
    assert.equal(state.screen, "home");
    assert.equal(state.journey.presentation.phase, "progress");
    assert.ok(state.interactionTargets.targets.formalPageRetry);
    assert.ok(state.interactionTargets.targets.journeyPresentationLater);
    await snap(page, "retry-error-on-home");
    await down(page, "formalPageRetry");
    assert.equal(attempts, 1, "No retry until Pointer release");
    await page.mouse.up();
    state = await waitOverlay(page);
    assert.equal(attempts, 2);
    assert.equal(state.journey.presentation.event.level, 21);
    await snap(page, "retry-restored-overlay");
    const events = await acknowledge(page, "journeyPresentation", "retry");
    reports.push({ name: "retry", injectedFailures: 1, attempts, events, noMapDetour: true, eventPreserved: true });
  });

  await scenario("later", { width: 383, height: 585 }, async (page) => {
    await page.route(trackRoute, (route) => route.fulfill({ status: 200, contentType: "image/png", body: "intentional-persistent-episode-resource-error" }));
    await winFixture(page);
    await returnFromWin(page, "modalSecondary", "later");
    await page.waitForFunction(() => Boolean(window.__COLOR_ESCAPE__.getDebugState().art.formalPage.error), undefined, { timeout: 15_000 });
    await snap(page, "later-error-on-home");
    await down(page, "journeyPresentationLater");
    assert.equal((await debug(page)).journey.presentation.phase, "progress");
    await page.mouse.up();
    await page.waitForFunction(() => !window.__COLOR_ESCAPE__.getDebugState().journey.presentation);
    let state = await debug(page);
    assert.equal(state.screen, "home");
    assert.equal(state.journey.pendingEvent?.level, 21);
    assert.equal((await stored(page)).journeyProgress.seenEpisodeUnlockLevels.includes(21), false);
    const deferredEvents = await assertNoMap(page);
    await page.unroute(trackRoute);
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().art.ready, undefined, { timeout: 15_000 });
    state = await debug(page);
    assert.equal(state.journey.pendingEvent?.level, 21, "Later does not swallow the event across reload");
    assert.equal(state.journey.presentation, undefined, "Reload alone does not interrupt Home with a deferred popup");
    assert.equal(await page.evaluate(() => window.__COLOR_ESCAPE__.beginPendingJourneyPresentation()), true,
      "Recovered pending event can be resumed by its post-win hook");
    await waitOverlay(page);
    await snap(page, "later-resumed-overlay");
    await click(page, "journeyPresentationClose");
    await page.waitForFunction(() => !window.__COLOR_ESCAPE__.getDebugState().journey.presentation);
    assert.ok((await stored(page)).journeyProgress.seenEpisodeUnlockLevels.includes(21));
    reports.push({ name: "later", deferredEvents, pendingSurvivedReload: true, recoveryVia: "explicit post-win hook on Home", acknowledgedAfterRecovery: true });
  });

  await scenario("entry-guard", { width: 496, height: 1078 }, async (page) => {
    const results = await page.evaluate(() => {
      const game = window.__COLOR_ESCAPE__, results = [];
      for (const screen of ["playing", "win", "failed"]) {
        game.screen = screen;
        results.push({ screen, started: game.beginPendingJourneyPresentation(), presentation: Boolean(game.journeyPresentation) });
      }
      game.screen = "home";
      return results;
    });
    for (const result of results) {
      assert.equal(result.started, false, `${result.screen} must reject pending-popup entry`);
      assert.equal(result.presentation, false);
    }
    reports.push({ name: "entry-guard", fixture: "pending event with controlled non-Home screens", results });
  }, true);

  await scenario("background-progress", { width: 496, height: 1078 }, async (page) => {
    const started = await page.evaluate(() => {
      const game = window.__COLOR_ESCAPE__;
      const started = game.beginPendingJourneyPresentation();
      game.appVisible = false;
      return started;
    });
    assert.equal(started, true);
    await page.waitForFunction(() => window.__COLOR_ESCAPE__.getDebugState().art.formalPage.loaded === "levels", undefined, { timeout: 15_000 });
    await page.waitForTimeout(450);
    let state = await debug(page);
    assert.equal(state.screen, "home");
    assert.equal(state.journey.presentation.phase, "progress");
    assert.equal(state.journey.presentation.age, 0, "Background does not consume Home introduction delay");
    assert.equal((await stored(page)).journeyProgress.seenEpisodeUnlockLevels.includes(21), false);
    await page.evaluate(() => {
      const game = window.__COLOR_ESCAPE__;
      game.appVisible = true;
      game.lastFrame = 0;
      game.dirty = true;
      game.scheduleFrame();
    });
    state = await waitOverlay(page);
    assert.equal((await stored(page)).journeyProgress.seenEpisodeUnlockLevels.includes(21), false);
    await snap(page, "background-resumed-overlay");
    reports.push({ name: "background-progress", controlledVisibilityFixture: true, noAdvanceWhileHidden: true,
      unacknowledgedUntilPointer: true, events: await assertNoMap(page) });
  }, true);

  assert.deepEqual(errors, []);
  const after = await hashes();
  assert.deepEqual(after, before, "Production and E2E inputs changed during the run");
  await writeFile(resolve(output, "report.json"), JSON.stringify({ pass: true, isolatedContexts: true,
    coverage: "Actual result actions use real Pointer; settlement is a controlled beginCelebration fixture, not a level-completion proof",
    sources: after, reports, errors }, null, 2));
  console.log(JSON.stringify({ pass: true, scenarios: reports.length, output }));
} finally { await browser.close(); }
