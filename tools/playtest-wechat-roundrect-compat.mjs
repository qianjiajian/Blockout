import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { build } from "esbuild";
import { chromium } from "playwright";

// Unchanged release bundle + real packaged art. The only injected behavior is
// a wx host shim and an absent Canvas roundRect API; never a replacement API.
// This tests Chromium compatibility, not native WeChat/iOS/Android behavior.
const packageRoot = path.resolve(process.env.WECHAT_PACKAGE_DIR ?? "dist-wechat");
const oldBundlePath = process.env.WECHAT_ROUNDRECT_OLD_BUNDLE;
const stamp = new Date().toISOString().replaceAll(/[:.]/g, "-");
const output = path.resolve(process.env.WECHAT_ROUNDRECT_OUTPUT ?? `playtest-results/wechat-roundrect-compat-${stamp}`);
const digest = data => createHash("sha256").update(data).digest("hex");
const bundle = await readFile(path.join(packageRoot, "game.js"));
const oldBundle = oldBundlePath ? await readFile(oldBundlePath) : undefined;
const requests = [];
const boundFiles = {};
const bind = async file => {
  const sha = digest(await readFile(file));
  if (boundFiles[file]) assert.equal(sha, boundFiles[file], `Input drift: ${file}`);
  boundFiles[file] = sha;
};
const coreBuild = await build({
  stdin: { resolveDir: process.cwd(), contents: `
    export { LEVELS } from './src/core/levels.ts';
    export { replayRevisedRoute } from './src/core/revisedLevelSearch.ts';
    export { fitGameplayBoard, GAMEPLAY_ART_LAYOUT } from './src/game/gameplayArtLayout.ts';
    export { SHUTTER_NINE_SLICE_PATHS } from './src/game/shutterNineSlice.ts';
  ` }, bundle: true, write: false, platform: "node", format: "esm", metafile: true,
});
for (const file of Object.keys(coreBuild.metafile.inputs).filter(file => file !== "<stdin>")) await bind(file);
await bind("tools/playtest-wechat-roundrect-compat.mjs");
await bind("src/game/revisedMechanismDrawing.ts");
await bind("docs/rules/manifest.json");
const api = await import(`data:text/javascript;base64,${Buffer.from(coreBuild.outputFiles[0].text).toString("base64")}`);
const level = api.LEVELS.find(level => level.id === 21);
assert(level && !level.generators?.length, "This focused regression requires formal Lv21 without generator insets");
assert.deepEqual(level.shutters.map(({ id, count }) => ({ id, count })), [
  { id: "c10", count: 10 }, { id: "c17", count: 17 }, { id: "c19", count: 19 },
], "Focused Lv21 regression fixture changed; revalidate its witness route");
// Use the current formal Lv21 witness; v1.15 added non-clearing gestures.
// Stop after TEN clears, not ten total drags, to still exercise the first cover.
const witnessPath = "tests/fixtures/level21-reposition-route.json";
await bind(witnessPath);
const witness = JSON.parse(await readFile(witnessPath, "utf8"));
assert.equal(digest(JSON.stringify(level)), witness.levelSha256, "Formal Lv21 witness drift");
let clearCount = 0;
const route = [];
for (const drag of witness.drags) {
  route.push(drag);
  if (drag.exitSide && ++clearCount === 10) break;
}
assert.equal(clearCount, 10);
const expected = Array.from({ length: route.length + 1 }, (_, count) => {
  const result = api.replayRevisedRoute(level, route.slice(0, count));
  assert(result.valid, `Current formal model must accept witness prefix ${count}: ${result.error}`);
  return JSON.parse(result.finalStateKey);
});
const artScale = 496 / 720;
const board = api.fitGameplayBoard(level.width, level.height,
  (1078 - 1584 * artScale) / 2 + api.GAMEPLAY_ART_LAYOUT.boosters[0].base.y * artScale,
  { top: 0, right: 0, bottom: 0, left: 0 });
const mime = { ".js": "application/javascript", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg" };
const html = '<!doctype html><meta charset="utf-8"><link rel="icon" href="data:,"><style>html,body{margin:0;overflow:hidden}canvas{display:block;width:100vw;height:100vh;touch-action:none}</style><body><script src="game.js"></script><script>window.__wechatRoundRect.show()</script></body>';
const server = createServer(async (req, res) => {
  const [, scenario, ...parts] = decodeURIComponent(new URL(req.url ?? "/", "http://localhost").pathname).split("/");
  if (!["old-missing", "missing", "native"].includes(scenario)) { res.writeHead(404).end(); return; }
  const relative = parts.join("/");
  if (!relative) { res.writeHead(200, { "Content-Type": "text/html", "Cache-Control": "no-store" }).end(html); return; }
  const file = path.resolve(packageRoot, relative);
  if (!file.startsWith(packageRoot + path.sep)) { res.writeHead(403).end(); return; }
  const entry = { scenario, path: relative, status: 200 };
  requests.push(entry);
  try {
    const data = relative === "game.js" ? (scenario === "old-missing" ? oldBundle : bundle) : await readFile(file);
    assert(data, "Old bundle was not supplied");
    res.writeHead(200, { "Content-Type": mime[path.extname(file)] ?? "application/octet-stream", "Cache-Control": "no-store" }).end(data);
  } catch (error) { entry.status = 404; res.writeHead(404).end(String(error)); }
});

const install = ({ missing }) => {
  let roundRectCalls = 0;
  const originalRoundRect = CanvasRenderingContext2D.prototype.roundRect;
  if (missing) Object.defineProperty(CanvasRenderingContext2D.prototype, "roundRect", { configurable: true, writable: true, value: undefined });
  else CanvasRenderingContext2D.prototype.roundRect = function (...args) { roundRectCalls++; return originalRoundRect.apply(this, args); };
  const show = [], touch = { down: [], move: [], up: [], cancel: [] }, storage = new Map(), packages = [], images = [], pointers = [];
  let canvas, drawingFrame = { texts: [], counters: [], covers: [] }, lastFrame, frameNumber = 0;
  const frames = [];
  const nativeRAF = window.requestAnimationFrame.bind(window);
  const raf = callback => nativeRAF(time => {
    drawingFrame = { texts: [], counters: [], covers: [] };
    try { callback(time); } finally {
      lastFrame = { ...drawingFrame, frameNumber: ++frameNumber, time };
      if (frames.length < 6000) frames.push(lastFrame);
    }
  });
  const createImage = () => {
    const image = new Image();
    const record = { source: "", state: "created" };
    images.push(record);
    image.addEventListener("load", () => { record.source = image.src; record.state = "loaded"; });
    image.addEventListener("error", () => { record.source = image.src; record.state = "failed"; });
    return image;
  };
  const createCanvas = () => {
    const next = document.createElement("canvas");
    if (!canvas) {
      canvas = next;
      document.body.append(canvas);
      const ctx = canvas.getContext("2d");
      const fillText = ctx.fillText.bind(ctx), fillRect = ctx.fillRect.bind(ctx);
      ctx.fillText = (text, x, y, ...args) => {
        const t = ctx.getTransform();
        const entry = { text: String(text), x: t.a * x + t.c * y + t.e, y: t.b * x + t.d * y + t.f, font: ctx.font };
        drawingFrame.texts.push(entry);
        if (ctx.fillStyle === "#fffaf0" && ctx.font.startsWith("900 ") && /^\d+$/.test(String(text))) {
          drawingFrame.counters.push({ ...entry, scale: t.a });
        }
        return fillText(text, x, y, ...args);
      };
      ctx.fillRect = (x, y, width, height) => {
        if (ctx.fillStyle === "#201459") {
          const t = ctx.getTransform();
          drawingFrame.covers.push({ x: t.a * x + t.e, y: t.d * y + t.f, width: width * t.a, height: height * t.d });
        }
        return fillRect(x, y, width, height);
      };
      const dispatch = (kind, event) => {
        const point = { identifier: event.pointerId, clientX: event.clientX, clientY: event.clientY };
        pointers.push({ kind, x: point.clientX, y: point.clientY });
        touch[kind].forEach(callback => callback({ changedTouches: [point], touches: ["up", "cancel"].includes(kind) ? [] : [point] }));
      };
      canvas.addEventListener("pointerdown", event => { canvas.setPointerCapture(event.pointerId); dispatch("down", event); });
      canvas.addEventListener("pointermove", event => { if (event.buttons) dispatch("move", event); });
      canvas.addEventListener("pointerup", event => dispatch("up", event));
      canvas.addEventListener("pointercancel", event => dispatch("cancel", event));
    }
    next.requestAnimationFrame = raf;
    next.createImage = createImage;
    return next;
  };
  window.wx = {
    onShow: callback => show.push(callback), onHide: () => {}, onWindowResize: () => {},
    onTouchStart: callback => touch.down.push(callback), onTouchMove: callback => touch.move.push(callback),
    onTouchEnd: callback => touch.up.push(callback), onTouchCancel: callback => touch.cancel.push(callback),
    getWindowInfo: () => ({ screenWidth: innerWidth, screenHeight: innerHeight, pixelRatio: 1, safeArea: { top: 0, bottom: innerHeight } }),
    getAppBaseInfo: () => ({ language: "zh_CN" }), createCanvas, createImage,
    getStorageSync: key => storage.has(key) ? structuredClone(storage.get(key)) : "",
    setStorageSync: (key, value) => storage.set(key, structuredClone(value)), vibrateShort: () => {},
    loadSubpackage: ({ name, success, fail }) => {
      fetch(`${name}/game.js`).then(async response => {
        if (!response.ok) throw new Error(`subpackage ${name}: ${response.status}`);
        (0, eval)(await response.text()); packages.push(name); success?.({ errMsg: "loadSubpackage:ok" });
      }).catch(error => fail?.({ errMsg: String(error) }));
      return { onProgressUpdate() {} };
    },
  };
  window.__wechatRoundRect = {
    show: () => show.forEach(callback => callback()),
    snapshot: () => ({ lastFrame, frameNumber, roundRectCalls, roundRectType: typeof canvas?.getContext("2d").roundRect,
      packages, images, pointers, storageKeys: [...storage.keys()] }),
    framesSince: frame => frames.filter(entry => entry.frameNumber > frame),
  };
};

await mkdir(output, { recursive: true });
const report = { scope: "Chromium wx shim; unchanged WeChat release bundle; real Pointer; isolated memory storage; NOT a native-device test", output,
  bundleSha256: digest(bundle), oldBundlePath: oldBundlePath ?? null, oldBundleSha256: oldBundle ? digest(oldBundle) : null,
  formalLevelSha256: digest(JSON.stringify(level)), board, route, bindings: boundFiles, scenarios: [], errors: [] };
let browser;
try {
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  browser = await chromium.launch({ headless: true });
  for (const scenario of [...(oldBundle ? ["old-missing"] : []), "missing", "native"]) {
    const context = await browser.newContext({ viewport: { width: 496, height: 1078 }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    const pageErrors = [], consoleErrors = [];
    page.on("pageerror", error => pageErrors.push(error.message));
    page.on("console", message => { if (message.type() === "error") consoleErrors.push(message.text()); });
    const row = { scenario, status: "running", pageErrors, consoleErrors, steps: [] };
    report.scenarios.push(row);
    try {
      await page.addInitScript(install, { missing: scenario !== "native" });
      await page.goto(`http://127.0.0.1:${server.address().port}/${scenario}/`, { waitUntil: "load" });
      // Home shell can already show labels before deferred gameplay art has
      // made input ready; wait for the real startup batches, not just its text.
      await page.waitForFunction(() => {
        const state = window.__wechatRoundRect.snapshot();
        return state.images.length > 150 && state.images.every(image => image.state === "loaded")
          && state.packages.includes("meta-ui") && state.packages.includes("gameplay-art");
      }, undefined, { timeout: 60_000 });
      const clickLabel = async label => {
        await page.waitForFunction(label => window.__wechatRoundRect.snapshot().lastFrame?.texts.some(entry => entry.text === label), label);
        await page.waitForTimeout(300);
        const entry = await page.evaluate(label => window.__wechatRoundRect.snapshot().lastFrame.texts.find(entry => entry.text === label), label);
        await page.mouse.click(entry.x, entry.y, { delay: 100 });
      };
      await clickLabel("临时测试选关");
      // Paging arrows are authored PNGs, not Canvas text. This is the centre
      // of TEMPORARY_LEVEL_SELECTOR_NEXT_PAGE_RECT in the 496x1078 UI.
      await page.waitForFunction(() => window.__wechatRoundRect.snapshot().lastFrame?.texts.some(entry => entry.text === "临时测试关卡"));
      await page.mouse.click(372, 748, { delay: 100 });
      await clickLabel("21");
      await clickLabel("开始测试");
      if (scenario === "old-missing") {
        await page.waitForTimeout(1200);
        assert(pageErrors.some(message => /roundRect.*(?:function|undefined)/.test(message)), "Old bundle must reproduce the reported missing-API error");
        row.snapshot = await page.evaluate(() => window.__wechatRoundRect.snapshot());
        assert.equal(row.snapshot.roundRectType, "undefined");
        row.expectedFailureReproduced = true;
        await page.screenshot({ path: path.join(output, "old-missing-reproduced.png") });
        row.status = "PASS";
        continue;
      }
      const waitCounters = async labels => page.waitForFunction(labels => {
        const current = window.__wechatRoundRect.snapshot().lastFrame?.counters.map(entry => entry.text);
        return JSON.stringify(current) === JSON.stringify(labels);
      }, labels, { timeout: 15_000 });
      await waitCounters(["10", "17", "19"]);
      await page.waitForTimeout(500);
      row.opening = await page.evaluate(() => window.__wechatRoundRect.snapshot());
      assert.equal(row.opening.roundRectType, scenario === "missing" ? "undefined" : "function");
      assert.equal(row.opening.lastFrame.covers.length, 3);
      for (const source of api.SHUTTER_NINE_SLICE_PATHS) {
        const packaged = source.replace("assets/art/gameplay/mechanics/shutter-nine-slice-v1/", "gameplay-art/shutter-nine-slice/");
        assert(row.opening.images.some(image => image.state === "loaded" && image.source.endsWith(`/${packaged}`)),
          `Real shutter panel and all eight frame pieces must be decoded: ${packaged}`);
      }
      await page.screenshot({ path: path.join(output, `${scenario}-lv21-opening.png`) });
      const point = (x, y) => ({ x: board.innerX + x * board.cell, y: board.innerY + y * board.cell });
      const move = async (x, y) => { const p = point(x, y); await page.mouse.move(p.x, p.y, { steps: 3 }); };
      for (const [index, drag] of route.entries()) {
        const block = expected[index].blocks.find(block => block.id === drag.blockId);
        assert(block);
        const [gx, gy] = block.shape[0];
        await move(block.x + gx + .5, block.y + gy + .5);
        await page.mouse.down();
        for (const [x, y] of drag.path) await move(x + gx + .5, y + gy + .5);
        if (drag.exitSide) {
          const [x, y] = drag.path.at(-1) ?? [block.x, block.y];
          const [dx, dy] = { left: [-.8, 0], right: [.8, 0], top: [0, -.8], bottom: [0, .8] }[drag.exitSide];
          await move(x + gx + .5 + dx, y + gy + .5 + dy);
        }
        await page.mouse.up();
        const labels = expected[index + 1].shutters.filter(shutter => !shutter.revealed).map(shutter => String(shutter.count));
        await waitCounters(labels);
        await page.waitForTimeout(index === route.length - 1 ? 1200 : 420);
        const snapshot = await page.evaluate(() => window.__wechatRoundRect.snapshot());
        assert.deepEqual(snapshot.lastFrame.counters.map(entry => entry.text), labels);
        row.steps.push({ step: index + 1, blockId: drag.blockId, expectedCounters: labels, actualCounters: snapshot.lastFrame.counters, frame: snapshot.frameNumber });
        if (index === 0) await page.screenshot({ path: path.join(output, `${scenario}-lv21-count-decrement.png`) });
      }
      row.final = await page.evaluate(() => window.__wechatRoundRect.snapshot());
      const frames = await page.evaluate(frame => window.__wechatRoundRect.framesSince(frame), row.opening.frameNumber);
      const firstCover = row.opening.lastFrame.covers[0];
      row.firstShutterOpeningFrames = frames.flatMap(frame => frame.covers.filter(cover => Math.abs(cover.x - firstCover.x) < 1 && cover.height > 0 && cover.height < firstCover.height - 1).map(cover => ({ frame: frame.frameNumber, ...cover })));
      assert(row.firstShutterOpeningFrames.length > 0, "Must observe natural-time intermediate shutter retraction, not only final disappearance");
      assert.equal(row.final.lastFrame.covers.length, 2, "First shutter must disappear after ten real clears");
      assert.equal(row.final.roundRectCalls, 0, "New bundle must not call optional roundRect even where it exists");
      assert.deepEqual(pageErrors, []);
      assert.deepEqual(consoleErrors, []);
      assert(!requests.some(request => request.scenario === scenario && request.status >= 400));
      await page.screenshot({ path: path.join(output, `${scenario}-lv21-first-shutter-open.png`) });
      row.status = "PASS";
    } catch (error) {
      row.status = "FAIL";
      row.error = String(error.stack ?? error).replace(/data:text\/javascript;base64,[\w+/=]+/g, "current-core");
      row.snapshot = await page.evaluate(() => window.__wechatRoundRect?.snapshot()).catch(() => undefined);
      report.errors.push({ scenario, error: row.error });
      await page.screenshot({ path: path.join(output, `${scenario}-failure.png`) }).catch(() => {});
    } finally { await context.close(); }
    console.log(`${row.status} ${scenario}: ${row.steps.length} Pointer drags`);
  }
  for (const file of Object.keys(boundFiles)) await bind(file);
  assert.equal(digest(await readFile(path.join(packageRoot, "game.js"))), report.bundleSha256, "Release bundle changed during test");
} catch (error) { report.errors.push({ scenario: "harness", error: String(error) }); }
finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
  report.status = report.errors.length ? "FAIL" : "PASS";
  report.requests = requests;
  await writeFile(path.join(output, "report.json"), JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
  console.log(JSON.stringify({ status: report.status, output, scenarios: report.scenarios.map(({ scenario, status, error }) => ({ scenario, status, error })) }));
  if (report.errors.length) process.exitCode = 1;
}
