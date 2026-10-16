import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { mkdir, readFile, realpath, stat, writeFile } from "node:fs/promises";
import { extname, isAbsolute, relative, resolve, sep } from "node:path";
import { chromium } from "playwright";

// Browser viewport/capability regression, NOT Android or named-device testing.
// Use fresh storage, actual CDP touch input, and only a built asset directory.
const assetsArg = process.argv.slice(2).find(value => value.startsWith("--assets="))?.slice(9);
if (!assetsArg) throw new Error("Pass --assets=<built Web asset directory>");
const assetRoot = await realpath(resolve(assetsArg));
const output = resolve("playtest-results/android-device-matrix-20261015", new Date().toISOString().replace(/[:.]/g, "-"));
await mkdir(output, { recursive: true });
const sha256 = bytes => createHash("sha256").update(bytes).digest("hex");
const html = await readFile(resolve(assetRoot, "index.html"));
const scriptPaths = [...html.toString().matchAll(/(?:src|href)="([^"?#]+\.js)"/g)].map(match => match[1]);
const report = {
  startedAt: new Date().toISOString(), assetRoot, indexSha256: sha256(html),
  scripts: await Promise.all(scriptPaths.map(async path => ({ path, sha256: sha256(await readFile(resolve(assetRoot, path.replace(/^\//, "")))) }))),
  status: "RUNNING", cases: [],
  limitation: "Desktop Chromium viewport, DPR, touch, CPU throttling and missing-API simulations. Not Android hardware, OEM WebView, GPU, memory-pressure, system-bars, or all mainstream model validation. No manufacturer user-agent spoofing.",
  isolatedStorage: "Fresh non-persistent context per case; no real player profile, save, or storageState loaded.",
  input: "CDP Input.dispatchTouchEvent with touchStart/touchMove/touchEnd; no puzzle mutation or progress fixtures.",
  apiAudit: "Production ES2020 syntax requires WebView 80+. Object.fromEntries 73, flat/flatMap 69, Promise.allSettled 76, AbortController 66. Event-listener signal cleanup support begins at 90; earlier Chromium ignores the signal option. Removing optional APIs is not full old-engine emulation.",
};
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml", ".mp3": "audio/mpeg", ".ogg": "audio/ogg", ".woff": "font/woff", ".woff2": "font/woff2" };
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, "http://127.0.0.1").pathname);
    const path = resolve(assetRoot, `.${pathname === "/" ? "/index.html" : pathname}`);
    const rel = relative(assetRoot, path);
    if (rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel)) { response.writeHead(403).end(); return; }
    if (!(await stat(path)).isFile()) throw new Error("Not a file");
    response.writeHead(200, { "Content-Type": types[extname(path)] ?? "application/octet-stream", "Cache-Control": "no-store" });
    response.end(await readFile(path));
  } catch { response.writeHead(404).end("Not found"); }
});
await new Promise(done => server.listen(0, "127.0.0.1", done));
const url = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch({ headless: true });
report.browserVersion = browser.version();
report.url = url;
const debug = page => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const compact = state => ({ screen: state.screen, levelId: state.level.id, artReady: state.art.ready, basicsSeen: state.onboarding.basicsSeen,
  moves: state.puzzle.moves, started: state.puzzle.started, blockCount: state.puzzle.blocks.length,
  activePointer: state.activePointer ?? null, selectedId: state.selectedId ?? null,
  firstLevelBestMoves: state.progression.bestMoves[1] ?? null, firstLevelBestStars: state.progression.bestStars[1] ?? null,
  viewportTransform: state.viewportTransform, storage: state.storage });
async function ready(page) {
  await page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().art.ready, null, { timeout: 45000 });
  await page.locator("#startup-status").waitFor({ state: "hidden", timeout: 10000 });
}
async function pagePoint(page, point, state = undefined) {
  state ??= await debug(page);
  const bounds = await page.locator("canvas").boundingBox();
  assert(bounds, "Canvas must have bounds");
  return { x: bounds.x + state.viewportTransform.offsetX + point.x * state.viewportTransform.scale,
    y: bounds.y + state.viewportTransform.offsetY + point.y * state.viewportTransform.scale };
}
async function touchDrag(page, cdp, start, destinations) {
  const point = location => ({ ...location, id: 1, radiusX: 1, radiusY: 1, force: 1 });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [point(start)] });
  let previous = start;
  for (const destination of destinations) {
    for (let step = 1; step <= 5; step++) {
      const location = { x: previous.x + (destination.x - previous.x) * step / 5, y: previous.y + (destination.y - previous.y) * step / 5 };
      await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [point(location)] });
      await page.waitForTimeout(16);
    }
    previous = destination;
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
}
async function dragOrigins(page, cdp, blockId, origins) {
  const state = await debug(page), block = state.puzzle.blocks.find(value => value.id === blockId);
  assert(block, `Missing block ${blockId}`);
  const [anchorX, anchorY] = block.shape[0];
  const point = (x, y) => pagePoint(page, { x: state.board.innerX + (x + anchorX + 0.5) * state.board.cell,
    y: state.board.innerY + (y + anchorY + 0.5) * state.board.cell }, state);
  await touchDrag(page, cdp, await point(block.x, block.y), await Promise.all(origins.map(([x, y]) => point(x, y))));
}
async function optionalApiRemoval(context, noAudio = false) {
  await context.addInitScript(({ noAudio }) => {
    delete Array.prototype.at;
    delete Array.prototype.toSorted;
    delete Object.hasOwn;
    delete window.structuredClone;
    delete CanvasRenderingContext2D.prototype.roundRect;
    if (noAudio) for (const name of ["AudioContext", "webkitAudioContext", "OfflineAudioContext", "webkitOfflineAudioContext"]) Object.defineProperty(window, name, { value: undefined, configurable: true });
  }, { noAudio });
}
function captureErrors(page, result) {
  page.on("pageerror", error => result.pageErrors.push({ message: error.message, stack: error.stack }));
  page.on("console", message => { if (message.type() === "error") result.consoleErrors.push(message.text()); });
  page.on("requestfailed", request => result.failedRequests.push({ url: request.url(), error: request.failure()?.errorText }));
  page.on("response", response => { if (response.status() >= 400) result.httpErrors.push({ url: response.url(), status: response.status() }); });
}
const definitions = [
  { name: "small-portrait", width: 320, height: 568, dpr: 2 },
  { name: "narrow-portrait", width: 360, height: 720, dpr: 3 },
  { name: "medium-portrait", width: 393, height: 818, dpr: 2.75 },
  { name: "tall-portrait", width: 412, height: 915, dpr: 2.625 },
  { name: "large-portrait", width: 432, height: 960, dpr: 3 },
  { name: "foldable-size", width: 768, height: 1024, dpr: 2 },
  { name: "tablet-size", width: 800, height: 1280, dpr: 2 },
  { name: "landscape-size", width: 915, height: 412, dpr: 2.625 },
  { name: "audio-unavailable", width: 393, height: 818, dpr: 2.75, noAudio: true },
  { name: "cpu-throttle-4x", width: 393, height: 818, dpr: 2.75, cpu: 4 },
];
async function runCase(definition, failure = undefined) {
  const result = { ...definition, category: failure ? "expected-startup-failure" : "touch-gameplay", status: "RUNNING",
    pageErrors: [], consoleErrors: [], failedRequests: [], httpErrors: [], screenshots: [] };
  report.cases.push(result);
  const context = await browser.newContext({ viewport: { width: definition.width, height: definition.height }, deviceScaleFactor: definition.dpr, isMobile: true, hasTouch: true, locale: "zh-CN" });
  if (!failure) await optionalApiRemoval(context, definition.noAudio);
  if (failure && failure !== "module-load") await context.addInitScript(kind => {
    if (kind === "fromEntries") delete Object.fromEntries;
    if (kind === "allSettled") delete Promise.allSettled;
    if (kind === "PointerEvent") Object.defineProperty(window, "PointerEvent", { value: undefined, configurable: true });
  }, failure);
  const page = await context.newPage();
  captureErrors(page, result);
  const cdp = await context.newCDPSession(page);
  if (definition.cpu) await cdp.send("Emulation.setCPUThrottlingRate", { rate: definition.cpu });
  if (failure === "module-load") await page.route("**/assets/game-*.js", route => route.abort("failed"));
  const screenshot = async label => {
    const name = `${definition.name}-${label}.png`;
    await page.screenshot({ path: resolve(output, name) }); result.screenshots.push(name);
  };
  try {
    const start = Date.now();
    await page.goto(url, { waitUntil: "networkidle" });
    result.userAgent = await page.evaluate(() => navigator.userAgent);
    if (failure) {
      await page.locator('#startup-status[role="alert"]').waitFor({ state: "visible", timeout: 10000 });
      assert(await page.locator("#startup-retry").isVisible(), "Failure must expose a retry action");
      result.failureMessage = await page.locator("#startup-message").textContent();
      result.failureDetails = await page.locator("#startup-details").textContent();
      assert(result.failureDetails?.length > 10, "Failure details must exist");
      assert.equal(await page.evaluate(() => Boolean(window.__COLOR_ESCAPE__)), false);
      await page.locator("#startup-diagnostics summary").tap();
      assert(await page.locator("#startup-details").isVisible(), "Player must be able to inspect diagnostic details");
      await screenshot("visible-failure");
      if (failure === "module-load") await page.unroute("**/assets/game-*.js");
      const navigation = page.waitForNavigation({ waitUntil: "networkidle" });
      await page.locator("#startup-retry").tap(); await navigation;
      if (failure === "module-load") { await ready(page); result.recovery = "PASS: retry loaded game after removing injected request failure"; }
      else { await page.locator('#startup-status[role="alert"]').waitFor({ state: "visible" }); result.recovery = "PASS: retry navigated and continued to explain deliberately missing browser capability"; }
      await screenshot("after-retry");
      result.status = "EXPECTED_FAILURE_VISIBLE_AND_RETRY_VERIFIED";
      return;
    }
    await ready(page);
    result.startupElapsedMs = Date.now() - start;
    result.capabilities = await page.evaluate(() => ({ at: typeof Array.prototype.at, toSorted: typeof Array.prototype.toSorted,
      hasOwn: typeof Object.hasOwn, structuredClone: typeof window.structuredClone, roundRect: typeof CanvasRenderingContext2D.prototype.roundRect,
      audioContext: typeof window.AudioContext, pointerEvent: typeof window.PointerEvent, maxTouchPoints: navigator.maxTouchPoints, pixelRatio: devicePixelRatio }));
    for (const name of ["at", "toSorted", "hasOwn", "structuredClone", "roundRect"]) assert.equal(result.capabilities[name], "undefined");
    if (definition.noAudio) assert.equal(result.capabilities.audioContext, "undefined");
    assert(result.capabilities.maxTouchPoints > 0);
    let state = await debug(page);
    assert.equal(state.level.id, 1); assert.equal(state.screen, "playing"); assert.equal(state.puzzle.moves, 0);
    assert.equal(state.onboarding.basicsSeen, false); assert.equal(state.puzzle.started, false);
    const guide = state.onboarding.guide;
    assert(guide?.points?.length >= 2); assert.equal(guide.blockId, "cc-001-b1-01");
    result.startup = compact(state); await screenshot("startup");
    const firstStart = await pagePoint(page, guide.start, state);
    await touchDrag(page, cdp, firstStart, await Promise.all(guide.points.slice(1).map(point => pagePoint(page, point, state))));
    await page.waitForFunction(() => window.__COLOR_ESCAPE__.getDebugState().puzzle.moves === 1);
    state = await debug(page);
    assert.equal(state.puzzle.blocks.length, 2); assert.equal(state.onboarding.basicsSeen, true); assert(!state.onboarding.guide);
    assert(state.activePointer == null && state.selectedId == null);
    result.afterFirstTouchDrag = compact(state);
    await page.waitForTimeout(400);
    await dragOrigins(page, cdp, "cc-001-b1-02", [[0, 2], [0, 1], [0, 0]]);
    state = await debug(page); assert.equal(state.puzzle.moves, 2); assert.equal(state.puzzle.blocks.length, 1);
    await page.waitForTimeout(400);
    await dragOrigins(page, cdp, "cc-001-b1-03", [[2, 3], [1, 3]]);
    state = await debug(page); assert.equal(state.puzzle.moves, 3); assert.equal(state.puzzle.blocks.length, 0);
    result.afterThreeTouchDrags = compact(state);
    await page.waitForFunction(() => { const s = window.__COLOR_ESCAPE__.getDebugState(); return s.level.id === 2 && s.screen === "playing" && s.art.ready && !s.completionFlow?.directTransition; }, null, { timeout: 15000 });
    state = await debug(page); assert.equal(state.progression.bestMoves[1], 3); assert.equal(state.progression.bestStars[1], 3);
    result.afterAutomaticNextLevel = compact(state); await screenshot("level-two");
    await page.reload({ waitUntil: "networkidle" }); await ready(page); state = await debug(page);
    assert.equal(state.onboarding.basicsSeen, true); assert(!state.onboarding.guide);
    assert.equal(state.progression.bestMoves[1], 3); assert.equal(state.progression.bestStars[1], 3);
    result.afterReload = compact(state); await screenshot("reload");
    assert.deepEqual(result.pageErrors, []); assert.deepEqual(result.consoleErrors, []); assert.deepEqual(result.failedRequests, []); assert.deepEqual(result.httpErrors, []);
    result.status = "PASS";
  } catch (error) {
    result.status = "FAIL"; result.error = error.stack ?? String(error); await screenshot("failure").catch(() => {});
  } finally { await context.close(); console.log(JSON.stringify({ name: result.name, status: result.status, error: result.error?.split("\n")[0] })); }
}
try {
  for (const definition of definitions) await runCase(definition);
  for (const failure of ["fromEntries", "allSettled", "PointerEvent", "module-load"]) await runCase({ name: `injected-${failure}`, width: 393, height: 818, dpr: 2.75 }, failure);
  report.status = report.cases.some(result => result.status === "FAIL") ? "FAIL" : "PASS";
  report.assetConsistency = {
    indexUnchanged: sha256(await readFile(resolve(assetRoot, "index.html"))) === report.indexSha256,
    scriptsUnchanged: (await Promise.all(report.scripts.map(async script => sha256(await readFile(resolve(assetRoot, script.path.replace(/^\//, ""))))) )).every((hash, index) => hash === report.scripts[index].sha256),
  };
  if (!report.assetConsistency.indexUnchanged || !report.assetConsistency.scriptsUnchanged) {
    report.status = "FAIL"; report.assetError = "Built assets changed during test execution; this run cannot certify a single asset set.";
  }
  if (report.status === "FAIL") process.exitCode = 1;
} catch (error) { report.status = "FAIL"; report.error = error.stack ?? String(error); process.exitCode = 1;
} finally {
  await browser.close(); await new Promise(done => server.close(done));
  report.finishedAt = new Date().toISOString();
  await writeFile(resolve(output, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ status: report.status, report: resolve(output, "report.json"), gameplayPass: report.cases.filter(x => x.status === "PASS").length,
    expectedFailuresVerified: report.cases.filter(x => x.status === "EXPECTED_FAILURE_VISIBLE_AND_RETRY_VERIFIED").length }, null, 2));
}
