import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { mkdir, readFile, realpath, stat, writeFile } from "node:fs/promises";
import { extname, isAbsolute, relative, resolve, sep } from "node:path";
import { chromium } from "playwright";

// Reproduce the missing API in older Android WebViews without changing the
// application or visiting a developer preview with an existing player save.
// Usage: node tools/playtest-android-compat.mjs --assets=dist
//        node tools/playtest-android-compat.mjs --assets=android/app/src/main/assets --expect-startup-error
const args = process.argv.slice(2);
const assetsArg = args.find((argument) => argument.startsWith("--assets="))?.slice(9);
if (!assetsArg) throw new Error("Pass --assets=<built Web asset directory>");
const expectedStartupError = args.includes("--expect-startup-error");
const assetRoot = await realpath(resolve(assetsArg));
const runId = `${expectedStartupError ? "red" : "green"}-${new Date().toISOString().replace(/[:.]/g, "-")}`;
const output = resolve("playtest-results/android-compat-20261015", runId);
await mkdir(output, { recursive: true });
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const html = await readFile(resolve(assetRoot, "index.html"));
const scriptPaths = [...html.toString().matchAll(/(?:src|href)="([^"]+\.js)"/g)].map((match) => match[1]);
const scripts = await Promise.all(scriptPaths.map(async (path) => ({
  path, sha256: hash(await readFile(resolve(assetRoot, path))),
})));
const report = {
  startedAt: new Date().toISOString(), mode: expectedStartupError ? "expected-startup-error" : "compatibility",
  assetRoot, indexSha256: hash(html), scripts, removedApis: ["Array.prototype.at"],
  isolatedStorage: "Fresh non-persistent browser context per viewport; no player profile or storageState loaded",
  limitation: "Desktop Chromium with Array.prototype.at removed; not an Android device or full old-WebView emulation",
  viewports: [], status: "RUNNING",
};
const types = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp",
  ".svg": "image/svg+xml", ".mp3": "audio/mpeg", ".ogg": "audio/ogg", ".wav": "audio/wav",
  ".woff": "font/woff", ".woff2": "font/woff2",
};
const server = createServer(async (request, response) => {
  try {
    const path = decodeURIComponent(new URL(request.url, "http://127.0.0.1").pathname);
    const file = resolve(assetRoot, `.${path === "/" ? "/index.html" : path}`);
    const rel = relative(assetRoot, file);
    if (rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel)) {
      response.writeHead(403).end();
      return;
    }
    if (!(await stat(file)).isFile()) throw new Error("Not a file");
    response.writeHead(200, { "Content-Type": types[extname(file)] ?? "application/octet-stream", "Cache-Control": "no-store" });
    response.end(await readFile(file));
  } catch {
    response.writeHead(404).end("Not found");
  }
});
await new Promise((done) => server.listen(0, "127.0.0.1", done));
const url = `http://127.0.0.1:${server.address().port}/`;
report.url = url;
const browser = await chromium.launch({ headless: true });
report.browserVersion = browser.version();

const debug = (page) => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const compact = (state) => ({
  screen: state.screen, levelId: state.level.id, artReady: state.art.ready,
  basicsSeen: state.onboarding.basicsSeen, guide: state.onboarding.guide ?? null,
  moves: state.puzzle.moves, started: state.puzzle.started, blocks: state.puzzle.blocks,
  activePointer: state.activePointer ?? null, selectedId: state.selectedId ?? null,
  storage: state.storage, progression: state.progression,
});
async function logicalToPage(page, point) {
  const state = await debug(page);
  const canvas = await page.locator("canvas").boundingBox();
  assert(canvas, "Canvas bounds must exist");
  return {
    x: canvas.x + state.viewportTransform.offsetX + point.x * state.viewportTransform.scale,
    y: canvas.y + state.viewportTransform.offsetY + point.y * state.viewportTransform.scale,
  };
}
async function dragOrigins(page, blockId, origins) {
  const state = await debug(page);
  const block = state.puzzle.blocks.find((candidate) => candidate.id === blockId);
  assert(block, `Missing ${blockId}`);
  const [anchorX, anchorY] = block.shape[0];
  const point = async (x, y) => logicalToPage(page, {
    x: state.board.innerX + (x + anchorX + 0.5) * state.board.cell,
    y: state.board.innerY + (y + anchorY + 0.5) * state.board.cell,
  });
  const start = await point(block.x, block.y);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  for (const [x, y] of origins) {
    const next = await point(x, y);
    await page.mouse.move(next.x, next.y, { steps: 4 });
  }
  await page.mouse.up();
}
async function waitReady(page) {
  await page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().art.ready, null, { timeout: 30000 });
}

try {
  for (const viewport of [{ width: 393, height: 818 }, { width: 320, height: 568 }]) {
    const result = { viewport, status: "RUNNING", pageErrors: [], consoleErrors: [], failedRequests: [], httpErrors: [], screenshots: [] };
    report.viewports.push(result);
    const context = await browser.newContext({ viewport, locale: "zh-CN" });
    await context.addInitScript(() => { delete Array.prototype.at; });
    const page = await context.newPage();
    page.on("pageerror", (error) => result.pageErrors.push({ message: error.message, stack: error.stack }));
    page.on("console", (message) => { if (message.type() === "error") result.consoleErrors.push(message.text()); });
    page.on("requestfailed", (request) => result.failedRequests.push({ url: request.url(), error: request.failure()?.errorText }));
    page.on("response", (response) => { if (response.status() >= 400) result.httpErrors.push({ url: response.url(), status: response.status() }); });
    const screenshot = async (label) => {
      const name = `${viewport.width}x${viewport.height}-${label}.png`;
      await page.screenshot({ path: resolve(output, name) });
      result.screenshots.push(name);
    };
    try {
      await page.goto(url, { waitUntil: "networkidle" });
      assert.equal(await page.evaluate(() => typeof Array.prototype.at), "undefined", "Application must run without at or a polyfill");
      if (expectedStartupError) {
        // Capture the exact missing-API failure observed on the Xiaomi phone.
        assert(result.pageErrors.some((error) => /filter\([^]*\.at is not a function/.test(error.message)), "Expected filter(...).at startup error was not reproduced");
        result.debugApiAvailable = await page.evaluate(() => Boolean(window.__COLOR_ESCAPE__));
        assert.equal(result.debugApiAvailable, false, "Startup should fail before the game API is created");
        await screenshot("expected-black-screen");
        result.status = "EXPECTED_STARTUP_ERROR_REPRODUCED";
        continue;
      }
      await waitReady(page);
      let state = await debug(page);
      assert.equal(state.screen, "playing");
      assert.equal(state.level.id, 1);
      assert.equal(state.onboarding.basicsSeen, false);
      assert.equal(state.puzzle.started, false);
      assert.equal(state.puzzle.moves, 0);
      const guide = state.onboarding.guide;
      assert(guide?.points?.length >= 2, "Fresh first level must expose the real tutorial path");
      assert.equal(guide.blockId, "cc-001-b1-01");
      const initialCount = state.puzzle.blocks.length;
      result.startup = compact(state);
      await screenshot("startup-ready");
      const start = await logicalToPage(page, guide.start);
      await page.mouse.move(start.x, start.y);
      await page.mouse.down();
      for (const point of guide.points.slice(1)) {
        const destination = await logicalToPage(page, point);
        await page.mouse.move(destination.x, destination.y, { steps: 4 });
      }
      await page.mouse.up();
      await page.waitForFunction(() => window.__COLOR_ESCAPE__.getDebugState().puzzle.moves === 1);
      state = await debug(page);
      assert.equal(state.puzzle.blocks.length, initialCount - 1);
      assert(!state.puzzle.blocks.some((block) => block.id === guide.blockId));
      assert.equal(state.onboarding.basicsSeen, true);
      assert(!state.onboarding.guide);
      assert(state.activePointer == null && state.selectedId == null);
      result.afterFirstPointerDrag = compact(state);
      await page.waitForTimeout(400);
      await screenshot("after-first-drag");

      // Lv1 hides pause/home until Lv5 by design. Finish the two remaining
      // blocks with real input and verify the normal automatic Lv2 transition.
      const topGate = state.level.gates.find((gate) => gate.color === "purple");
      const bottomGate = state.level.gates.find((gate) => gate.color === "pink");
      assert.equal(topGate.side, "top");
      assert.equal(bottomGate.side, "bottom");
      assert.equal(topGate.offset, 0);
      assert.equal(bottomGate.offset, 0);
      await dragOrigins(page, "cc-001-b1-02", [[0, 2], [0, 1], [0, 0]]);
      state = await debug(page);
      assert.equal(state.puzzle.moves, 2);
      assert.equal(state.puzzle.blocks.length, 1);
      await page.waitForTimeout(400);
      await dragOrigins(page, "cc-001-b1-03", [[2, 3], [1, 3]]);
      state = await debug(page);
      assert.equal(state.puzzle.moves, 3);
      assert.equal(state.puzzle.blocks.length, 0);
      result.afterThreePointerDrags = compact(state);
      await screenshot("first-level-cleared");
      await page.waitForFunction(() => {
        const current = window.__COLOR_ESCAPE__.getDebugState();
        return current.level.id === 2 && current.screen === "playing" && current.art.ready
          && !current.completionFlow?.directTransition;
      });
      state = await debug(page);
      assert.equal(state.progression.bestMoves[1], 3);
      assert.equal(state.progression.bestStars[1], 3);
      result.afterAutomaticNextLevel = compact(state);
      await screenshot("automatic-level-two");

      await page.reload({ waitUntil: "networkidle" });
      await waitReady(page);
      state = await debug(page);
      assert.equal(state.onboarding.basicsSeen, true, "Tutorial completion must survive reload");
      assert(!state.onboarding.guide);
      result.afterReload = compact(state);
      await screenshot("after-reload");
      assert.equal(state.progression.bestMoves[1], 3);
      assert.equal(state.progression.bestStars[1], 3);
      result.homeNavigation = "Not exercised: normal pause/home remains locked until Lv5; no progress fixture injected";
      assert.equal(await page.evaluate(() => typeof Array.prototype.at), "undefined");
      assert.deepEqual(result.pageErrors, []);
      assert.deepEqual(result.consoleErrors, []);
      assert.deepEqual(result.failedRequests, []);
      assert.deepEqual(result.httpErrors, []);
      result.status = "PASS";
    } catch (error) {
      result.status = "FAIL";
      result.error = error.stack ?? String(error);
      await screenshot("failure").catch(() => {});
      throw error;
    } finally {
      await context.close();
    }
  }
  report.status = expectedStartupError ? "EXPECTED_STARTUP_ERROR_REPRODUCED" : "PASS";
} catch (error) {
  report.status = "FAIL";
  report.error = error.stack ?? String(error);
  process.exitCode = 1;
} finally {
  await browser.close();
  await new Promise((done) => server.close(done));
  report.finishedAt = new Date().toISOString();
  await writeFile(resolve(output, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ status: report.status, report: resolve(output, "report.json"), viewports: report.viewports.map((result) => ({ ...result.viewport, status: result.status })) }, null, 2));
}
