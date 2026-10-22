import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";
const url = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5198/";
const output = resolve(`.codex-temp/google-play-sdk-20261019/privacy-options-${Date.now()}`);
await mkdir(output, { recursive: true });
const report = { status: "RUNNING", limitations: "Real browser touch with mock native privacy options response, no actual UMP form or Android device.", errors: [] };
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 320, height: 568 }, hasTouch: true, isMobile: true, locale: "en" });
  await context.route("**/*", route => route.request().url().startsWith(url) ? route.continue() : route.abort());
  await context.addInitScript(() => {
    const fixture = { schemaVersion: 1, currentLevel: 6, highestLevel: 12, coins: 4321, sound: false, haptic: false, reducedMotion: true,
      language: "en", featureSeen: ["basics", "ice-door", "ice-block", "layer"],
      featureGuideProgress: { version: 1, pending: [], seen: ["levels", "leaderboard", "supply", "dailyTasks", "dailyChallenge", "achievements", "league"] },
      collectionIntroShown: true, leagueIntroSeen: true, boosterUnlockSeen: ["time", "rocket", "pulse"], boosters: { time: 3, rocket: 3, pulse: 3 },
      bestStars: { "1": 3 }, bestMoves: { "1": 3 }, rewardedLevels: Array.from({ length: 11 }, (_, i) => i + 1), lastSeenUpdate: "2026-09-10-r118" };
    const memory = new Map([["color-escape-save-v1", JSON.stringify(fixture)]]);
    const storage = map => ({ getItem: key => map.get(String(key)) ?? null, setItem: (key, value) => map.set(String(key), String(value)), removeItem: key => map.delete(String(key)), clear: () => map.clear(), key: i => [...map.keys()][i] ?? null, get length() { return map.size; } });
    Object.defineProperty(window, "localStorage", { value: storage(memory) });
    Object.defineProperty(window, "sessionStorage", { value: storage(new Map()) });
    window.__gpPrivacyTest = { requests: [], snapshot: () => Array.from(memory.entries()) };
    for (const method of ["getItem", "setItem", "clear", "removeItem"]) Storage.prototype[method] = () => { throw Error("Real storage denied"); };
    window.SlideJamNative = { onmessage: null, postMessage(raw) {
      const request = JSON.parse(raw); window.__gpPrivacyTest.requests.push(request);
      queueMicrotask(() => window.SlideJamNative.onmessage?.({ data: JSON.stringify({ id: request.id, type: "result", ok: true,
        status: "privacy-updated", state: { consentReady: true, privacyOptionsRequired: true, rewardedReady: false, analyticsEnabled: false } }) }));
    } };
  });
  const page = await context.newPage(); page.on("pageerror", error => report.errors.push(error.message));
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().art.ready, undefined, { timeout: 60_000 });
  const state = await page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
  const hit = state.interactionTargets.targets.homeSettings.hit;
  const bounds = await page.locator("canvas").boundingBox();
  await page.touchscreen.tap(bounds.x + state.viewportTransform.offsetX + (hit.x + hit.width / 2) * state.viewportTransform.scale,
    bounds.y + state.viewportTransform.offsetY + (hit.y + hit.height / 2) * state.viewportTransform.scale);
  await page.waitForTimeout(500);
  await page.locator("#google-play-privacy-button").tap();
  const before = await page.evaluate(() => window.__gpPrivacyTest.snapshot());
  const choices = page.locator("#google-play-ad-privacy-options");
  await choices.scrollIntoViewIfNeeded(); await choices.tap();
  await page.waitForFunction(() => window.__gpPrivacyTest.requests.some(request => request.type === "privacyOptions"));
  await page.waitForTimeout(400);
  const requests = await page.evaluate(() => window.__gpPrivacyTest.requests);
  assert.equal(requests.filter(request => request.type === "privacyOptions").length, 1);
  assert.equal(await choices.isEnabled(), true);
  assert.equal(await page.locator("#google-play-ad-privacy-message").isVisible(), false);
  assert.deepEqual(await page.evaluate(() => window.__gpPrivacyTest.snapshot()), before);
  const content = await page.locator(".gp-privacy-content").innerText();
  assert.match(content, /official test ads/); assert.match(content, /remain disabled/);
  await page.screenshot({ path: resolve(output, "privacy-options.png") });
  assert.deepEqual(report.errors, []); report.status = "PASS"; report.requestTypes = requests.map(r => r.type);
  await context.close();
} catch (error) { report.status = "FAIL"; report.failure = error.stack; process.exitCode = 1; }
finally { await browser.close(); await writeFile(resolve(output, "report.json"), JSON.stringify(report, null, 2)); console.log(JSON.stringify({ status: report.status, output, failure: report.failure })); }
