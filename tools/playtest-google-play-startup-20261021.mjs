import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { resolve, relative, extname } from "node:path";
import { chromium } from "playwright";

// Test the delivered bundles, with fresh contexts and memory-only persistence.
// The instrumentation observes real drawing and guard calls; it does not set
// game state, advance clocks, release image callbacks, or invoke game actions.
const roots = {
  baseline: resolve(".codex-temp/google-play-crash-20261020/web"),
  fixed: resolve(".codex-temp/google-play-startup-20261021/web"),
};
const output = resolve(`.codex-temp/google-play-startup-20261021/browser-regression/run-${Date.now()}`);
await mkdir(output, { recursive: true });
const report = {
  status: "RUNNING", output, rulesVersion: "1.198.0", browserOnly: true,
  limitations: "Chromium against final packaged web assets; no physical Android, OEM WebView, native splash, or real ads verification.",
  persistence: "New isolated contexts, empty memory-only localStorage/sessionStorage; native Storage access throws.",
  network: "Only the loopback asset server is allowed; external requests aborted.",
  scenarios: [],
};
const mime = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".jpg": "image/jpeg", ".png": "image/png", ".svg": "image/svg+xml", ".mp3": "audio/mpeg" };
const server = createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    const [, mode, ...segments] = path.split("/");
    if (!roots[mode]) { res.writeHead(404).end(); return; }
    const file = resolve(roots[mode], segments.join("/") || "index.html");
    const inside = relative(roots[mode], file);
    if (inside.startsWith("..") || inside.includes(":")) { res.writeHead(403).end(); return; }
    if (!(await stat(file)).isFile()) { res.writeHead(404).end(); return; }
    const data = await readFile(file);
    res.writeHead(200, { "Content-Type": mime[extname(file)] ?? "application/octet-stream", "Cache-Control": "no-store" });
    res.end(data);
  } catch { res.writeHead(404).end(); }
});
await new Promise(resolveListen => server.listen(0, "127.0.0.1", resolveListen));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true });
const sleep = ms => new Promise(done => setTimeout(done, ms));

async function setup(mode, name, size = { width: 393, height: 852 }, behavior = {}) {
  const context = await browser.newContext({ viewport: size, deviceScaleFactor: 1, locale: "zh-CN", hasTouch: true, isMobile: true, serviceWorkers: "block" });
  const result = { name, mode, viewport: size, errors: [], externalBlocked: [], requests: {}, snapshots: {} };
  report.scenarios.push(result);
  const url = `${origin}/${mode}/`;
  await context.route("**/*", async route => {
    const request = route.request();
    if (new URL(request.url()).origin !== origin) { result.externalBlocked.push(request.url()); await route.abort(); return; }
    const pathname = new URL(request.url()).pathname;
    const key = pathname.split("/").at(-1);
    result.requests[key] = (result.requests[key] ?? 0) + 1;
    if (behavior.moduleDelay && request.resourceType() === "script" && key.startsWith("game-")) await sleep(behavior.moduleDelay);
    if (behavior.shellDelay && key === "resource-panel.png") await sleep(behavior.shellDelay);
    if (behavior.failOnce && key === behavior.failOnce && result.requests[key] === 1) { await route.abort("failed"); return; }
    if (behavior.moduleFailure && request.resourceType() === "script" && key.startsWith("game-") && result.requests[key] === 1) { await route.abort("failed"); return; }
    await route.continue();
  });
  await context.addInitScript(() => {
    const memory = new Map();
    const storage = map => ({ getItem: key => map.get(String(key)) ?? null, setItem: (key, value) => map.set(String(key), String(value)), removeItem: key => map.delete(String(key)), clear: () => map.clear(), key: i => [...map.keys()][i] ?? null, get length() { return map.size; } });
    Object.defineProperty(window, "localStorage", { value: storage(memory) });
    Object.defineProperty(window, "sessionStorage", { value: storage(new Map()) });
    for (const method of ["getItem", "setItem", "removeItem", "clear", "key"]) Storage.prototype[method] = () => { throw Error("Real storage forbidden in startup regression"); };
    const audit = window.__gpStartupAudit = { draws: [], anyImageDraws: 0, guardCalls: [], releases: [], snapshots: [], memoryEntries: () => [...memory.entries()] };
    const originalDraw = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function (image, ...args) {
      const value = originalDraw.call(this, image, ...args);
      audit.anyImageDraws += 1;
      if (String(image?.src ?? "").includes("loading-background.jpg")) audit.draws.push({ at: performance.now(), naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight, args });
      return value;
    };
    const src = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, "src");
    Object.defineProperty(HTMLImageElement.prototype, "src", { ...src, set(value) {
      const before = src.get.call(this);
      if (String(before).includes("loading-background.jpg") && !String(value).includes("loading-background.jpg")) audit.releases.push({ at: performance.now(), before, after: String(value) });
      return src.set.call(this, value);
    } });
    let guard;
    Object.defineProperty(window, "__BLOCK_OUT_STARTUP__", { configurable: true, get: () => guard, set(value) {
      const original = value.ready;
      value.ready = function (...args) {
        audit.guardCalls.push({ at: performance.now(), backgroundDraws: audit.draws.length, anyImageDraws: audit.anyImageDraws, art: window.__COLOR_ESCAPE__?.getDebugState().art ?? null });
        return original.apply(this, args);
      };
      guard = value;
    } });
  });
  if (behavior.holdFrames) await context.addInitScript(() => {
    const raf = window.requestAnimationFrame.bind(window);
    const cancel = window.cancelAnimationFrame.bind(window);
    const pending = new Map();
    let held = true, sequence = 1000000;
    window.requestAnimationFrame = callback => {
      if (!held) return raf(callback);
      const id = ++sequence;
      pending.set(id, callback);
      return id;
    };
    window.cancelAnimationFrame = id => pending.delete(id) || cancel(id);
    window.__releaseHeldAnimationFrames = () => {
      held = false;
      for (const callback of pending.values()) raf(callback);
      pending.clear();
    };
  });
  const page = await context.newPage();
  page.on("pageerror", error => result.errors.push(error.message));
  return { page, context, result, url };
}

async function snap(test, label) {
  const value = await test.page.evaluate(() => {
    const panel = document.getElementById("startup-status");
    const section = panel?.querySelector("section");
    const game = window.__COLOR_ESCAPE__?.getDebugState();
    const audit = window.__gpStartupAudit;
    const canvas = document.querySelector("canvas");
    const pixels = canvas?.getContext("2d")?.getImageData(0, 0, canvas.width, canvas.height).data;
    const colors = new Set();
    if (pixels) for (let i = 0; i < pixels.length; i += 4 * Math.max(1, Math.floor(pixels.length / 4 / 20000))) colors.add(`${pixels[i] >> 3},${pixels[i + 1] >> 3},${pixels[i + 2] >> 3}`);
    return { art: game?.art ?? null, screen: game?.screen ?? null, canvas: canvas && { width: canvas.width, height: canvas.height, uniqueQuantizedColors: colors.size }, guard: { hidden: panel?.hidden, role: panel?.getAttribute("role"), sectionVisible: Boolean(section && getComputedStyle(section).display !== "none" && !panel.hidden), artworkPresent: Boolean(panel?.querySelector(".gp-boot-art image")), title: document.getElementById("startup-title")?.textContent, retryVisible: Boolean(document.getElementById("startup-retry") && !document.getElementById("startup-retry").hidden && !panel.hidden) }, backgroundDraws: audit.draws, guardCalls: audit.guardCalls, backgroundReleases: audit.releases, memoryKeys: audit.memoryEntries().map(([key]) => key) };
  });
  test.result.snapshots[label] = value;
  await test.page.screenshot({ path: resolve(output, `${test.result.name}-${label}.png`) });
  return value;
}

async function ready(test) {
  await test.page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().art.ready, undefined, { timeout: 15000 });
  await test.page.waitForTimeout(80);
}
async function tapRetry(test) {
  const point = await test.page.evaluate(() => {
    const state = window.__COLOR_ESCAPE__.getDebugState();
    const target = state.interactionTargets?.targets?.startupRetry?.hit;
    const canvas = document.querySelector("canvas")?.getBoundingClientRect();
    if (!target || !canvas) throw Error("Missing actual startupRetry interaction target");
    const view = state.viewportTransform;
    return { x: canvas.x + view.offsetX + (target.x + target.width / 2) * view.scale, y: canvas.y + view.offsetY + (target.y + target.height / 2) * view.scale };
  });
  await test.page.touchscreen.tap(point.x, point.y);
  test.result.actualRetryTouch = point;
}
function validFixed(value) {
  assert.equal(value.guard.hidden, true, "DOM guard should release to painted canvas");
  assert.equal(value.art.startupBackgroundReady, true);
  assert.ok(value.backgroundDraws.length > 0, "Must actually draw formal loading image");
  assert.equal(value.backgroundReleases.length, 0, "Owned loading image must never be released by another failed batch");
  assert.ok(value.guardCalls.every(call => call.backgroundDraws > 0 || call.art?.loadError), "Guard must never hide on an unpainted, non-error frame");
}

try {
  for (const [mode, dir] of Object.entries(roots)) {
    const html = await readFile(resolve(dir, "index.html"));
    report[mode] = { path: dir, indexSha256: createHash("sha256").update(html).digest("hex"), marker: JSON.parse(await readFile(resolve(dir, "google-play-build.json"), "utf8")) };
  }
  assert.equal(report.fixed.marker.versionName, "0.1.12");
  assert.equal(report.fixed.marker.versionCode, 13);

  for (const mode of ["baseline", "fixed"]) {
    const test = await setup(mode, `${mode}-module-delay`, undefined, { moduleDelay: 1500 });
    await test.page.goto(test.url, { waitUntil: "commit" });
    await test.page.waitForSelector("#startup-status", { state: "visible" });
    await test.page.waitForTimeout(180);
    const initial = await snap(test, "initial");
    assert.equal(initial.guard.hidden, false);
    assert.equal(initial.guard.sectionVisible, mode === "baseline");
    assert.equal(initial.guard.artworkPresent, mode === "fixed");
    if (mode === "baseline") assert.match(initial.guard.title, /正在启动/);
    await ready(test);
    const final = await snap(test, "ready");
    if (mode === "fixed") validFixed(final);
    assert.deepEqual(test.result.errors, []);
    test.result.status = "PASS";
    await test.context.close();
  }

  for (const mode of ["baseline", "fixed"]) {
    const test = await setup(mode, `${mode}-shell-delay`, undefined, { shellDelay: 1800 });
    await test.page.goto(test.url, { waitUntil: "domcontentloaded" });
    await test.page.waitForFunction(() => {
      const art = window.__COLOR_ESCAPE__?.getDebugState().art;
      return art && !art.shellReady && art.startupProgress.value > 0.05;
    }, undefined, { timeout: 5000 });
    await test.page.waitForTimeout(100);
    const loading = await snap(test, "loading");
    assert.equal(loading.art.shellReady, false);
    assert.equal(loading.art.ready, false);
    assert.ok(loading.art.startupProgress.value < 0.38);
    if (mode === "baseline") assert.equal(loading.backgroundDraws.length, 0, "Reproduce missing background before shell batch completes");
    else validFixed(loading);
    await ready(test);
    const final = await snap(test, "ready");
    if (mode === "fixed") validFixed(final);
    assert.deepEqual(test.result.errors, []);
    test.result.status = "PASS";
    await test.context.close();
  }

  for (const viewport of [{ width: 320, height: 568 }, { width: 393, height: 852 }]) {
    const test = await setup("fixed", `fixed-normal-${viewport.width}x${viewport.height}`, viewport);
    await test.page.goto(test.url, { waitUntil: "domcontentloaded" });
    await ready(test);
    const final = await snap(test, "ready");
    validFixed(final);
    assert.ok(!final.art.loadError);
    assert.deepEqual(test.result.errors, []);
    test.result.status = "PASS";
    await test.context.close();
  }

  {
    const test = await setup("fixed", "fixed-module-failure", undefined, { moduleFailure: true });
    await test.page.goto(test.url, { waitUntil: "domcontentloaded" });
    await test.page.waitForSelector('#startup-status[role="alert"]', { state: "visible" });
    const failed = await snap(test, "diagnostic");
    assert.equal(failed.guard.sectionVisible, true);
    assert.equal(failed.guard.retryVisible, true);
    await test.page.locator("#startup-retry").tap();
    await ready(test);
    validFixed(await snap(test, "recovered"));
    test.result.status = "PASS";
    await test.context.close();
  }

  for (const asset of ["loading-background.jpg", "resource-panel.png"]) {
    const test = await setup("fixed", `fixed-fail-${asset.split(".")[0]}`, undefined, { failOnce: asset });
    await test.page.goto(test.url, { waitUntil: "domcontentloaded" });
    await test.page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().art.loadError, undefined, { timeout: 10000 });
    await test.page.waitForTimeout(100);
    const failed = await snap(test, "failed");
    assert.equal(failed.art.ready, false);
    if (asset !== "loading-background.jpg") validFixed(failed);
    await tapRetry(test);
    await ready(test);
    const recovered = await snap(test, "recovered");
    validFixed(recovered);
    assert.ok(!recovered.art.loadError);
    assert.equal(test.result.requests[asset], 2, "A genuine failed asset request must be retried");
    if (asset !== "loading-background.jpg") assert.equal(test.result.requests["loading-background.jpg"], 1, "Already owned background should survive retry without reload");
    assert.deepEqual(test.result.errors, []);
    test.result.status = "PASS";
    await test.context.close();
  }
  {
    const test = await setup("fixed", "fixed-first-frame-after-ready", undefined, { holdFrames: true });
    await test.page.goto(test.url, { waitUntil: "domcontentloaded" });
    await test.page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().art.ready, undefined, { timeout: 15000, polling: 100 });
    // A paused browser compositor can finish I/O before its first frame.
    const before = await snap(test, "before-first-frame");
    assert.equal(before.art.ready, true);
    assert.equal(before.guard.hidden, false);
    await test.page.evaluate(() => window.__releaseHeldAnimationFrames());
    await test.page.waitForFunction(() => document.getElementById("startup-status").hidden, undefined, { timeout: 3000, polling: 100 });
    const after = await snap(test, "first-frame-shown");
    assert.equal(after.guard.hidden, true);
    assert.ok(after.guardCalls.length > 0);
    assert.ok(after.guardCalls.every(call => call.anyImageDraws > 0));
    assert.deepEqual(test.result.errors, []);
    test.result.status = "PASS";
    await test.context.close();
  }
  report.status = "PASS";
} catch (error) {
  report.status = "FAIL";
  report.failure = { message: error.message, stack: error.stack };
  process.exitCode = 1;
} finally {
  await browser.close();
  await new Promise(done => server.close(done));
  await writeFile(resolve(output, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ status: report.status, output, scenarios: report.scenarios.map(({ name, status }) => ({ name, status })), failure: report.failure }));
}
