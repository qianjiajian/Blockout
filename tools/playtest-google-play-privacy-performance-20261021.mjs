import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createHash } from "node:crypto";
import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";
import { resolve, relative, extname } from "node:path";
import { chromium } from "playwright";

const root = resolve(process.env.GOOGLE_PLAY_WEB_DIR ?? ".codex-temp/google-play-performance-20261021/web");
const output = resolve(`.codex-temp/google-play-performance-20261021/privacy-regression/run-${Date.now()}`);
await mkdir(output, { recursive: true });
const report = { status: "RUNNING", root, cases: [], errors: [],
  limitations: "Desktop Chromium touch and CPU sampling, not Android/WebView/phone FPS. Isolated memory fixtures only. Served JS receives test-only call counters and measurement closures; packaged files are never modified." };
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".jpg": "image/jpeg", ".png": "image/png", ".mp3": "audio/mpeg", ".webp": "image/webp" };
const gameFile = (await readdir(resolve(root, "assets"))).find(name => /^game-.*\.js$/.test(name));
assert.ok(gameFile, "final game bundle exists");
const gameSource = await readFile(resolve(root, "assets", gameFile), "utf8");
report.bundle = { file: `assets/${gameFile}`, sha256: createHash("sha256").update(gameSource).digest("hex") };
for (const anchor of ["getGooglePlayPrivacyState(){", "getDebugState(){"]) assert.equal(gameSource.split(anchor).length, 2, `${anchor} unique`);
const instrumented = gameSource
  .replace("getGooglePlayPrivacyState(){", "getGooglePlayPrivacyState(){window.__gpPrivacyProbe.lightReads++;window.__gpPrivacyProbe.readLight=()=>this.getGooglePlayPrivacyState();")
  .replace("getDebugState(){", "getDebugState(){window.__gpPrivacyProbe.debugReads++;window.__gpPrivacyProbe.readRawDebug=()=>this.getDebugState();");
const server = createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    const path = resolve(root, `.${pathname === "/" ? "/index.html" : pathname}`);
    if (relative(root, path).startsWith("..")) throw Error("Outside build");
    const data = path === resolve(root, "assets", gameFile) ? instrumented : await readFile(path);
    res.writeHead(200, { "Content-Type": types[extname(path)] ?? "application/octet-stream" }); res.end(data);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(done => server.listen(0, "127.0.0.1", done));
const url = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch({ headless: true });
const fixture = { schemaVersion: 1, currentLevel: 12, highestLevel: 12, coins: 4321, sound: false, haptic: false, reducedMotion: true,
  featureSeen: ["basics", "ice-door", "ice-block", "layer"], featureGuideProgress: { version: 1, pending: [], seen: ["levels", "leaderboard", "supply", "dailyTasks", "dailyChallenge", "achievements", "league"] },
  collectionIntroShown: true, leagueIntroSeen: true, boosterUnlockSeen: ["time", "rocket", "pulse"], boosters: { time: 3, rocket: 3, pulse: 3 },
  bestStars: { "1": 3 }, bestMoves: { "1": 3 }, rewardedLevels: Array.from({ length: 11 }, (_, i) => i + 1), lastSeenUpdate: "2026-09-10-r118" };
const debug = page => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const counts = page => page.evaluate(() => ({ debugReads: window.__gpPrivacyProbe.debugReads, lightReads: window.__gpPrivacyProbe.lightReads }));
const resetCounts = page => page.evaluate(() => { window.__gpPrivacyProbe.debugReads = 0; window.__gpPrivacyProbe.lightReads = 0; });
async function tapTarget(page, state, key) {
  const hit = state.interactionTargets.targets[key].hit, transform = state.viewportTransform;
  const box = await page.locator("canvas").boundingBox();
  await page.touchscreen.tap(box.x + transform.offsetX + (hit.x + hit.width / 2) * transform.scale,
    box.y + transform.offsetY + (hit.y + hit.height / 2) * transform.scale);
}

try {
  for (const [width, height, language, expectedLanguage, buttonText] of [[393, 852, "zh-CN", "zh-CN", "隐私说明"], [320, 568, "en", "en", "Privacy"], [360, 840, "zh-TW", "zh-TW", "隱私說明"], [768, 1024, "ja", "en", "Privacy"]]) {
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2.75, hasTouch: true, isMobile: true, locale: language });
    await context.route("**/*", route => route.request().url().startsWith(url) ? route.continue() : route.abort());
    await context.addInitScript(save => {
      const memory = new Map([["color-escape-save-v1", JSON.stringify(save)]]);
      const storage = data => ({ getItem: key => data.get(String(key)) ?? null, setItem: (key, value) => data.set(String(key), String(value)), removeItem: key => data.delete(String(key)), clear: () => data.clear(), key: i => [...data.keys()][i] ?? null, get length() { return data.size; } });
      Object.defineProperty(window, "localStorage", { value: storage(memory) });
      Object.defineProperty(window, "sessionStorage", { value: storage(new Map()) });
      window.__gpPrivacyProbe = { debugReads: 0, lightReads: 0, realStorageReads: 0, requests: [], memory: () => [...memory.entries()] };
      for (const method of ["getItem", "setItem", "removeItem", "clear"]) Storage.prototype[method] = () => { window.__gpPrivacyProbe.realStorageReads++; throw Error("Real storage denied"); };
      if (window.indexedDB) indexedDB.open = () => { window.__gpPrivacyProbe.realStorageReads++; throw Error("IndexedDB denied"); };
      window.SlideJamNative = { onmessage: null, postMessage(raw) {
        const request = JSON.parse(raw); window.__gpPrivacyProbe.requests.push(request);
        queueMicrotask(() => window.SlideJamNative.onmessage?.({ data: JSON.stringify({ id: request.id, type: "result", ok: true, status: "privacy-updated",
          state: { consentReady: true, privacyOptionsRequired: true, rewardedReady: false, analyticsEnabled: false } }) }));
      } };
    }, { ...fixture, language });
    const page = await context.newPage(); page.on("pageerror", error => report.errors.push(error.message));
    await page.goto(url, { waitUntil: "networkidle" });
    await page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().art.ready, undefined, { timeout: 60000 });
    const state = await debug(page); assert.equal(state.screen, "home");
    const bridge = await page.evaluate(() => {
      const bridge = window.__COLOR_ESCAPE__, first = bridge.getDebugState(), original = { id: first.level.id, coins: first.economy.coins, x: first.puzzle.blocks[0].x };
      first.level.id = 999; first.economy.coins = -1; first.puzzle.blocks[0].x = 999;
      const second = bridge.getDebugState();
      return { keys: Object.keys(bridge), frozen: Object.isFrozen(bridge), unchanged: original.id === second.level.id && original.coins === second.economy.coins && original.x === second.puzzle.blocks[0].x };
    });
    assert.deepEqual(bridge, { keys: ["getDebugState"], frozen: true, unchanged: true });
    const benchmarks = await page.evaluate(() => {
      const measure = (read, iterations) => { for (let i = 0; i < 10; i++) read(); const start = performance.now(); let size; for (let i = 0; i < iterations; i++) { const state = read(); if (!i) size = JSON.stringify(state).length; } return { iterations, totalMs: performance.now() - start, serializedCharacters: size }; };
      return { fullDiagnostic: measure(window.__gpPrivacyProbe.readRawDebug, 60), isolatedDiagnostic: measure(() => window.__COLOR_ESCAPE__.getDebugState(), 60), lightPresentation: measure(window.__gpPrivacyProbe.readLight, 10000) };
    });
    assert.ok(benchmarks.fullDiagnostic.serializedCharacters > benchmarks.lightPresentation.serializedCharacters * 100);
    await resetCounts(page);
    await page.evaluate(async () => { for (let i = 0; i < 24; i++) { document.dispatchEvent(new PointerEvent("pointerup", { bubbles: true })); await new Promise(done => setTimeout(done, 5)); } });
    const interactionCounts = await counts(page); assert.equal(interactionCounts.debugReads, 0); assert.ok(interactionCounts.lightReads >= 20);
    await tapTarget(page, state, "homeSettings");
    await page.locator("#google-play-privacy-button").waitFor({ state: "visible" });
    assert.equal(await page.locator("#google-play-privacy-button").innerText(), buttonText);
    const settingsCounts = await counts(page); assert.equal(settingsCounts.debugReads, 0);
    const beforeMemory = await page.evaluate(() => window.__gpPrivacyProbe.memory());
    const buttonBounds = await page.locator("#google-play-privacy-button").boundingBox();
    assert.ok(buttonBounds.x >= 0 && buttonBounds.y >= 0 && buttonBounds.x + buttonBounds.width <= width + 1 && buttonBounds.y + buttonBounds.height <= height + 1);
    await page.locator("#google-play-privacy-button").tap();
    assert.equal(await page.locator("#google-play-privacy-dialog").getAttribute("lang"), expectedLanguage);
    assert.equal(await page.locator("canvas").getAttribute("aria-hidden"), "true");
    assert.equal(new URL(page.url()).hash, "#privacy");
    await page.screenshot({ path: resolve(output, `privacy-${width}-${language}.png`) });
    const choices = page.locator("#google-play-ad-privacy-options");
    await choices.scrollIntoViewIfNeeded(); await choices.tap();
    await page.waitForFunction(() => window.__gpPrivacyProbe.requests.some(request => request.type === "privacyOptions"));
    assert.equal(await page.locator("#google-play-ad-privacy-message").isVisible(), false);
    await page.locator("#google-play-privacy-close").tap();
    await page.waitForFunction(() => location.hash !== "#privacy");
    assert.equal(await page.locator("#google-play-privacy-overlay").isVisible(), false);
    await page.locator("#google-play-privacy-button").tap(); await page.keyboard.press("Escape");
    await page.waitForFunction(() => location.hash !== "#privacy");
    await page.locator("#google-play-privacy-button").tap(); await page.goBack();
    await page.locator("#google-play-privacy-overlay").waitFor({ state: "hidden" });
    if (width === 768) {
      await page.setViewportSize({ width: 320, height: 568 }); await page.waitForTimeout(350);
      const resized = await page.locator("#google-play-privacy-button").boundingBox();
      assert.ok(resized.x >= 0 && resized.y >= 0 && resized.x + resized.width <= 321 && resized.y + resized.height <= 569);
      await page.setViewportSize({ width, height }); await page.waitForTimeout(350);
    }
    const privacyCounts = await counts(page); assert.equal(privacyCounts.debugReads, 0);
    assert.deepEqual(await page.evaluate(() => window.__gpPrivacyProbe.memory()), beforeMemory);
    const settingsState = await debug(page); await resetCounts(page);
    await tapTarget(page, settingsState, "menuBack");
    await page.locator("#google-play-privacy-button").waitFor({ state: "hidden" });
    assert.equal((await counts(page)).debugReads, 0);
    assert.equal(await page.evaluate(() => window.__gpPrivacyProbe.readLight().screen), "home");
    assert.equal(await page.evaluate(() => window.__gpPrivacyProbe.realStorageReads), 0);
    await page.evaluate(() => window.__BLOCK_OUT_DISPOSE_WEB__());
    assert.equal(await page.locator("#google-play-privacy-button").count(), 0);
    assert.equal(await page.locator("#google-play-privacy-overlay").count(), 0);
    report.cases.push({ viewport: { width, height }, language, expectedLanguage, status: "PASS", bridge, benchmarks, interactionCounts, settingsCounts, privacyCounts,
      privacyOptions: true, closeEscapeBack: true, saveUnchanged: true, disposeClean: true, realStorageReads: 0 });
    await context.close();
  }
  assert.deepEqual(report.errors, []); report.status = "PASS";
} catch (error) { report.status = "FAIL"; report.failure = error.stack; process.exitCode = 1; }
finally { await browser.close(); await new Promise(done => server.close(done)); await writeFile(resolve(output, "report.json"), JSON.stringify(report, null, 2)); console.log(JSON.stringify({ status: report.status, cases: report.cases.length, output, failure: report.failure })); }
