import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";

const url = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5197/";
const output = resolve(process.env.PLAYTEST_OUTPUT ?? `.codex-temp/google-play-sdk-20261019/lifecycle-${Date.now()}`);
await mkdir(output, { recursive: true });
const report = { status: "RUNNING", url, cases: [], errors: [], limitations: "Desktop Chromium actual touch. Native WebMessage transport and consent/ads are test doubles; no real SDK/network callback or backend event is asserted. In-memory save fixtures only." };
const browser = await chromium.launch({ headless: true });
const debug = page => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
async function create(fixture) {
  const context = await browser.newContext({ viewport: { width: 393, height: 818 }, hasTouch: true, isMobile: true, locale: "en" });
  await context.route("**/*", route => {
    if (!route.request().url().startsWith(url) && /^https?:/.test(route.request().url())) return route.abort();
    return route.continue();
  });
  await context.addInitScript(fixture => {
    const memory = new Map(fixture ? [["color-escape-save-v1", JSON.stringify(fixture)]] : []);
    const storage = map => ({ getItem: key => map.get(String(key)) ?? null, setItem: (key, value) => map.set(String(key), String(value)), removeItem: key => map.delete(String(key)), clear: () => map.clear(), key: index => [...map.keys()][index] ?? null, get length() { return map.size; } });
    Object.defineProperty(window, "localStorage", { value: storage(memory) });
    Object.defineProperty(window, "sessionStorage", { value: storage(new Map()) });
    window.__gpTest = { requests: [], realStorageCalls: 0 };
    for (const method of ["getItem", "setItem", "clear", "removeItem"]) Storage.prototype[method] = () => { window.__gpTest.realStorageCalls++; throw Error("Real storage denied"); };
    window.SlideJamNative = { onmessage: null, postMessage(raw) {
      const request = JSON.parse(raw);
      window.__gpTest.requests.push({ ...request, at: performance.now(), ready: window.__COLOR_ESCAPE__?.getDebugState().art.ready ?? false });
      queueMicrotask(() => window.SlideJamNative.onmessage?.({ data: JSON.stringify({ type: "result", id: request.id, ok: true,
        status: request.type === "levelStart" || request.type === "levelEnd" ? "analytics-disabled" : "skipped",
        state: { consentReady: true, rewardedReady: false, privacyOptionsRequired: true, analyticsEnabled: false } }) }));
    } };
  }, fixture);
  const page = await context.newPage();
  page.on("pageerror", error => report.errors.push(error.message));
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().art.ready, undefined, { timeout: 90_000 });
  return { context, page, cdp: await context.newCDPSession(page) };
}
async function point(page, logical, state) {
  state ??= await debug(page); const bounds = await page.locator("canvas").boundingBox();
  return { x: bounds.x + state.viewportTransform.offsetX + logical.x * state.viewportTransform.scale,
    y: bounds.y + state.viewportTransform.offsetY + logical.y * state.viewportTransform.scale };
}
async function drag(cdp, start, points, page) {
  const touch = p => ({ ...p, id: 1, radiusX: 1, radiusY: 1, force: 1 });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [touch(start)] });
  let previous = start;
  for (const target of points) {
    for (let step = 1; step <= 5; step++) {
      await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [touch({ x: previous.x + (target.x - previous.x) * step / 5, y: previous.y + (target.y - previous.y) * step / 5 })] });
      await page.waitForTimeout(16);
    }
    previous = target;
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
}
async function origins(page, cdp, id, positions) {
  const state = await debug(page), block = state.puzzle.blocks.find(block => block.id === id), [ax, ay] = block.shape[0];
  const q = (x, y) => point(page, { x: state.board.innerX + (x + ax + .5) * state.board.cell, y: state.board.innerY + (y + ay + .5) * state.board.cell }, state);
  await drag(cdp, await q(block.x, block.y), await Promise.all(positions.map(([x, y]) => q(x, y))), page);
}
async function tapTarget(page, cdp, key) {
  const state = await debug(page), hit = state.interactionTargets.targets[key]?.hit;
  assert.ok(hit, `Missing target ${key}; screen=${state.screen}`);
  const p = await point(page, { x: hit.x + hit.width / 2, y: hit.y + hit.height / 2 }, state);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ ...p, id: 1 }] });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await page.waitForTimeout(500);
}
try {
  const { context, page, cdp } = await create();
  await page.waitForFunction(() => window.__gpTest.requests.some(r => r.type === "levelStart"), undefined, { timeout: 30_000 });
  const guide = (await debug(page)).onboarding.guide;
  await drag(cdp, await point(page, guide.start), await Promise.all(guide.points.slice(1).map(p => point(page, p))), page);
  await page.waitForFunction(() => window.__COLOR_ESCAPE__.getDebugState().puzzle.moves === 1);
  await page.waitForTimeout(400);
  await origins(page, cdp, "cc-001-b1-02", [[0, 2], [0, 1], [0, 0]]);
  await page.waitForTimeout(400);
  await origins(page, cdp, "cc-001-b1-03", [[2, 3], [1, 3]]);
  await page.waitForFunction(() => window.__gpTest.requests.filter(r => r.type === "levelStart").some(r => r.payload.levelId === 2), undefined, { timeout: 30_000 });
  const first = await page.evaluate(() => window.__gpTest);
  const starts = first.requests.filter(r => r.type === "levelStart");
  const ends = first.requests.filter(r => r.type === "levelEnd");
  assert.deepEqual(starts.map(r => r.payload.levelId), [1, 2]);
  assert.equal(ends.length, 1); assert.equal(ends[0].payload.result, "success");
  assert.equal(ends[0].payload.attemptId, starts[0].payload.attemptId);
  assert.ok(ends[0].payload.duration > 0);
  assert.equal(first.requests.filter(r => r.type === "settlement").length, 0);
  const mainReady = first.requests.filter(r => r.type === "gameReady");
  assert.equal(mainReady.length, 1); assert.equal(mainReady[0].ready, true);
  assert.equal(first.realStorageCalls, 0);
  const state = await debug(page); assert.equal(state.progression.bestStars[1], 3); assert.equal(state.progression.bestMoves[1], 3);
  await page.screenshot({ path: resolve(output, "first-clear.png") });
  report.cases.push({ name: "first-player-touch-3-moves-3-stars-direct-next", status: "PASS", requests: first.requests });
  await context.close();

  const fixture = { schemaVersion: 1, currentLevel: 6, highestLevel: 12, coins: 4321, sound: false, haptic: false, reducedMotion: true,
    language: "en", featureSeen: ["basics", "ice-door", "ice-block", "layer"],
    featureGuideProgress: { version: 1, pending: [], seen: ["levels", "leaderboard", "supply", "dailyTasks", "dailyChallenge", "achievements", "league"] },
    collectionIntroShown: true, leagueIntroSeen: true, boosterUnlockSeen: ["time", "rocket", "pulse"], boosters: { time: 3, rocket: 3, pulse: 3 },
    bestStars: { "1": 3 }, bestMoves: { "1": 3 }, rewardedLevels: Array.from({ length: 11 }, (_, i) => i + 1), lastSeenUpdate: "2026-09-10-r118" };
  const second = await create(fixture);
  assert.equal((await debug(second.page)).screen, "home");
  await tapTarget(second.page, second.cdp, "homePlay");
  await second.page.waitForFunction(() => window.__gpTest.requests.some(r => r.type === "levelStart"), undefined, { timeout: 30_000 });
  await tapTarget(second.page, second.cdp, "pause");
  await tapTarget(second.page, second.cdp, "pauseRestart");
  await second.page.waitForFunction(() => window.__gpTest.requests.filter(r => r.type === "levelStart").length === 2, undefined, { timeout: 30_000 });
  const restart = await second.page.evaluate(() => window.__gpTest);
  const sequence = restart.requests.filter(r => r.type === "levelStart" || r.type === "levelEnd");
  assert.deepEqual(sequence.map(r => r.type), ["levelStart", "levelEnd", "levelStart"]);
  assert.equal(sequence[1].payload.result, "fail"); assert.ok(sequence[1].payload.duration > 0);
  assert.equal(sequence[0].payload.attemptId, sequence[1].payload.attemptId);
  assert.notEqual(sequence[0].payload.attemptId, sequence[2].payload.attemptId);
  assert.equal(restart.requests.filter(r => r.type === "settlement").length, 0);
  assert.equal(restart.requests.filter(r => r.type === "gameReady").length, 1);
  assert.equal(restart.realStorageCalls, 0);
  report.cases.push({ name: "level-six-real-touch-pause-restart", status: "PASS", requests: restart.requests });
  let waiting = await debug(second.page);
  let timerStartPointerActions = 0;
  // Legacy boards start their countdown on a real mutation. Find one through
  // actual touch gestures; never advance/fake the clock or call game methods.
  if (!waiting.puzzle.started) {
    const initialBlocks = waiting.puzzle.blocks;
    outer: for (const block of initialBlocks) {
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        await origins(second.page, second.cdp, block.id, [[block.x + dx * 8, block.y + dy * 8]]);
        timerStartPointerActions++;
        await second.page.waitForTimeout(400);
        waiting = await debug(second.page);
        if (waiting.puzzle.started) break outer;
      }
    }
  }
  console.log(JSON.stringify({ stage: "natural-level-six-timeout", started: waiting.puzzle.started, remainingSeconds: waiting.puzzle.remainingSeconds }));
  assert.equal(waiting.puzzle.started, true);
  await second.page.waitForFunction(() => window.__gpTest.requests.some(r => r.type === "settlement"), undefined,
    { timeout: Math.ceil(waiting.puzzle.remainingSeconds * 1000) + 45_000 });
  await second.page.waitForTimeout(700);
  const failed = await second.page.evaluate(() => window.__gpTest);
  const failedState = await debug(second.page);
  const settlements = failed.requests.filter(r => r.type === "settlement");
  const failures = failed.requests.filter(r => r.type === "levelEnd");
  assert.equal(failedState.screen, "failed");
  assert.equal(settlements.length, 1); assert.equal(failures.length, 2);
  assert.equal(failures[1].payload.result, "fail");
  assert.equal(settlements[0].payload.attemptId, sequence[2].payload.attemptId);
  assert.equal(failures[1].payload.attemptId, sequence[2].payload.attemptId);
  assert.equal(settlements[0].payload.levelId, 6);
  assert.equal(failed.realStorageCalls, 0);
  await second.page.screenshot({ path: resolve(output, "level-six-timeout-settlement.png") });
  report.cases.push({ name: "level-six-natural-timeout-settlement-once", status: "PASS", timerStartPointerActions, requests: failed.requests });
  await second.context.close();
  assert.deepEqual(report.errors, []); report.status = "PASS";
} catch (error) { report.status = "FAIL"; report.failure = error.stack; process.exitCode = 1; }
finally {
  await browser.close(); await writeFile(resolve(output, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ status: report.status, output, cases: report.cases.length, failure: report.failure }));
}
