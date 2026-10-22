import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { mkdir, readFile, realpath, stat, writeFile } from "node:fs/promises";
import { extname, isAbsolute, relative, resolve, sep } from "node:path";
import { chromium } from "playwright";

// Layout/runtime matrix for the 0.1.3 APK's exact embedded Web assets.
// This is a desktop Chromium simulation of viewport/DPR/touch only: it is not
// a physical Android/OEM/GPU/model certification and does not spoof a vendor UA.
const assetsArg = process.argv.slice(2).find(value => value.startsWith("--assets="))?.slice(9);
if (!assetsArg) throw new Error("Pass --assets=<0.1.3 Web assets directory>");
const assetRoot = await realpath(resolve(assetsArg));
const apkPath = resolve("artifacts/android/BlockOut-0.1.3-debug.apk");
const output = resolve("playtest-results/android-device-matrix-20261016", new Date().toISOString().replace(/[:.]/g, "-"));
await mkdir(output, { recursive: true });
const sha256 = bytes => createHash("sha256").update(bytes).digest("hex");
const indexBytes = await readFile(resolve(assetRoot, "index.html"));
const indexText = indexBytes.toString();
const scriptPaths = [...indexText.matchAll(/(?:src|href)="([^"?#]+\.js)"/g)].map(match => match[1]);
const report = {
  startedAt: new Date().toISOString(), version: "0.1.3", assetRoot,
  indexSha256: sha256(indexBytes), scripts: await Promise.all(scriptPaths.map(async path => ({
    path, sha256: sha256(await readFile(resolve(assetRoot, path.replace(/^\.\//, "")))),
  }))),
  apk: { path: apkPath, sha256: sha256(await readFile(apkPath)) }, status: "RUNNING", cases: [],
  limitation: "Desktop Chromium viewport/DPR/touch simulation only. It does not test Android System WebView versions, Xiaomi/Samsung/Huawei/OPPO/Vivo GPU drivers, OEM system bars, memory pressure, thermal throttling, or physical cutouts. No manufacturer UA spoofing.",
  storage: "Fresh non-persistent context per case; no real player save or storageState loaded.",
  testMethod: "Fresh mobile+hasTouch contexts, CDP Input.dispatchTouchEvent tutorial drag, startup/error/request checks, canvas client-rect coverage and screenshots.",
};
const viewportMatrix = [
  { name: "16-9", width: 360, height: 640, dpr: 2 },
  { name: "16-9-large", width: 414, height: 736, dpr: 3 },
  { name: "19_5-9", width: 390, height: 845, dpr: 3 },
  { name: "20-9", width: 360, height: 800, dpr: 3 },
  { name: "20-9-large", width: 412, height: 915, dpr: 2.625 },
  { name: "21-9", width: 360, height: 840, dpr: 3 },
  { name: "notch-390", width: 390, height: 844, dpr: 3, safeTop: 30, safeBottom: 16 },
  { name: "punch-hole-412", width: 412, height: 915, dpr: 2.625, safeTop: 28, safeBottom: 16 },
  { name: "foldable-768", width: 768, height: 1024, dpr: 2 },
  { name: "tablet-800", width: 800, height: 1280, dpr: 2 },
  { name: "tablet-wide-1280", width: 1280, height: 800, dpr: 2 },
  { name: "landscape-915", width: 915, height: 412, dpr: 2.625 },
  { name: "landscape-1280", width: 1280, height: 720, dpr: 2 },
];
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml", ".mp3": "audio/mpeg", ".woff": "font/woff", ".woff2": "font/woff2" };
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, "http://127.0.0.1").pathname);
    const file = resolve(assetRoot, `.${pathname === "/" ? "/index.html" : pathname}`);
    const rel = relative(assetRoot, file);
    if (rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel)) { response.writeHead(403).end(); return; }
    if (!(await stat(file)).isFile()) throw new Error("not a file");
    response.writeHead(200, { "Content-Type": types[extname(file)] ?? "application/octet-stream", "Cache-Control": "no-store" }); response.end(await readFile(file));
  } catch { response.writeHead(404).end("Not found"); }
});
await new Promise(done => server.listen(0, "127.0.0.1", done));
const url = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch({ headless: true });
report.browserVersion = browser.version(); report.url = url;
const debug = page => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const canvasMetrics = page => page.evaluate(() => {
  const canvas = document.querySelector("canvas"); const rect = canvas?.getBoundingClientRect();
  if (!rect) return null;
  const epsilon = 1.5;
  return { rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }, innerWidth, innerHeight,
    coversViewport: rect.x >= -epsilon && rect.y >= -epsilon && rect.right >= innerWidth - epsilon && rect.bottom >= innerHeight - epsilon,
    noCrop: rect.x >= -epsilon && rect.y >= -epsilon && rect.right <= innerWidth + epsilon && rect.bottom <= innerHeight + epsilon,
    canvasWidth: canvas.width, canvasHeight: canvas.height, devicePixelRatio,
    overflow: { right: Math.max(0, rect.right - innerWidth), bottom: Math.max(0, rect.bottom - innerHeight) } };
});
const pagePoint = async (page, point, state) => { const bounds = await page.locator("canvas").boundingBox(); assert(bounds); return { x: bounds.x + state.viewportTransform.offsetX + point.x * state.viewportTransform.scale, y: bounds.y + state.viewportTransform.offsetY + point.y * state.viewportTransform.scale }; };
async function touchDrag(page, cdp, start, destinations) {
  const touch = p => ({ ...p, id: 1, radiusX: 1, radiusY: 1, force: 1 });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [touch(start)] }); let previous = start;
  for (const destination of destinations) { for (let i = 1; i <= 5; i++) { await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [touch({ x: previous.x + (destination.x - previous.x) * i / 5, y: previous.y + (destination.y - previous.y) * i / 5 })] }); await page.waitForTimeout(12); } previous = destination; }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
}
async function run(definition) {
  const result = { ...definition, status: "RUNNING", pageErrors: [], consoleErrors: [], failedRequests: [], httpErrors: [], screenshots: [] }; report.cases.push(result);
  const context = await browser.newContext({ viewport: { width: definition.width, height: definition.height }, deviceScaleFactor: definition.dpr, isMobile: true, hasTouch: true, locale: "zh-CN" });
  await context.addInitScript(({ safeTop, safeBottom }) => {
    // Simulate common cutout insets for safe-area CSS plumbing without claiming OEM hardware.
    const install = () => { if (!document.documentElement) { setTimeout(install, 0); return; } if (safeTop || safeBottom) { const style = document.createElement("style"); style.textContent = `:root { --color-escape-safe-top: ${safeTop || 0}px; --color-escape-safe-bottom: ${safeBottom || 0}px; }`; document.documentElement.append(style); } };
    install();
  }, definition);
  const page = await context.newPage(); const cdp = await context.newCDPSession(page);
  page.on("pageerror", error => result.pageErrors.push({ message: error.message, stack: error.stack }));
  page.on("console", message => { if (message.type() === "error") result.consoleErrors.push(message.text()); });
  page.on("requestfailed", request => result.failedRequests.push({ url: request.url(), error: request.failure()?.errorText }));
  page.on("response", response => { if (response.status() >= 400) result.httpErrors.push({ url: response.url(), status: response.status() }); });
  const screenshot = async label => { const name = `${definition.name}-${label}.png`; await page.screenshot({ path: resolve(output, name) }); result.screenshots.push(name); };
  try {
    await page.goto(url, { waitUntil: "networkidle" });
    await page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().art.ready, null, { timeout: 45000 });
    await page.locator("#startup-status").waitFor({ state: "hidden", timeout: 10000 });
    const state = await debug(page); assert.equal(state.screen, "playing"); assert.equal(state.level.id, 1); assert(state.onboarding.guide?.points?.length >= 2);
    result.canvas = await canvasMetrics(page); assert(result.canvas?.coversViewport, "Canvas must cover the full simulated WebView viewport"); assert(result.canvas?.noCrop, "Canvas must not extend beyond the simulated WebView viewport");
    result.startup = { screen: state.screen, levelId: state.level.id, artReady: state.art.ready, canvas: result.canvas, viewportTransform: state.viewportTransform, userAgent: await page.evaluate(() => navigator.userAgent) };
    await screenshot("startup");
    const guide = state.onboarding.guide; const start = await pagePoint(page, guide.start, state); const destinations = await Promise.all(guide.points.slice(1).map(point => pagePoint(page, point, state)));
    await touchDrag(page, cdp, start, destinations); await page.waitForFunction(() => window.__COLOR_ESCAPE__.getDebugState().puzzle.moves === 1);
    const after = await debug(page); assert.equal(after.puzzle.moves, 1); assert.equal(after.puzzle.blocks.length, 2); assert.equal(after.onboarding.basicsSeen, true); assert(after.activePointer == null);
    result.afterTouch = { moves: after.puzzle.moves, blocks: after.puzzle.blocks.length, basicsSeen: after.onboarding.basicsSeen, canvas: await canvasMetrics(page) }; await screenshot("after-touch");
    assert.deepEqual(result.pageErrors, []); assert.deepEqual(result.consoleErrors, []); assert.deepEqual(result.failedRequests, []); assert.deepEqual(result.httpErrors, []);
    result.status = "PASS";
  } catch (error) { result.status = "FAIL"; result.error = error.stack ?? String(error); await screenshot("failure").catch(() => {}); }
  finally { await context.close(); console.log(JSON.stringify({ name: result.name, status: result.status, canvas: result.canvas, error: result.error?.split("\n")[0] })); }
}
try { for (const definition of viewportMatrix) await run(definition); report.status = report.cases.some(result => result.status === "FAIL") ? "FAIL" : "PASS"; if (report.status === "FAIL") process.exitCode = 1; }
catch (error) { report.status = "FAIL"; report.error = error.stack ?? String(error); process.exitCode = 1; }
finally {
  const before = report.indexSha256; const after = sha256(await readFile(resolve(assetRoot, "index.html"))); report.assetConsistency = { indexUnchanged: before === after, scriptsUnchanged: (await Promise.all(report.scripts.map(async script => sha256(await readFile(resolve(assetRoot, script.path.replace(/^\.\//, ""))))))).every((value, index) => value === report.scripts[index].sha256) };
  if (!report.assetConsistency.indexUnchanged || !report.assetConsistency.scriptsUnchanged) { report.status = "FAIL"; report.assetError = "Built Web assets changed during matrix run"; process.exitCode = 1; }
  await browser.close(); await new Promise(done => server.close(done)); report.finishedAt = new Date().toISOString();
  await writeFile(resolve(output, "report.json"), `${JSON.stringify(report, null, 2)}\n`); console.log(JSON.stringify({ status: report.status, report: resolve(output, "report.json"), cases: report.cases.map(({ name, status }) => ({ name, status })) }, null, 2));
}
