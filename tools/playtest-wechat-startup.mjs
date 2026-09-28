import { createServer } from "node:http";
import { readFile, mkdir, writeFile, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { chromium } from "playwright";

// This is a Chromium compatibility harness, not a WeChat device test. It runs
// the unchanged production bundle and real packaged images through a wx shim.
const packageRoot = path.resolve(process.env.WECHAT_PACKAGE_DIR ?? "dist-wechat");
const output = path.resolve(process.env.WECHAT_STARTUP_OUTPUT ?? "playtest-results/wechat-startup");
const viewport = { width: 496, height: 1078 };
const faultFile = "daily-tasks-entry.png";
const legacyPath = "assets/art/ui/home-v3/daily-tasks-entry.webp";
const legacySource = path.resolve("tests/fixtures/daily-tasks-entry-legacy.webp");
const legacyImage = await readFile(legacySource);
if (legacyImage.toString("ascii", 0, 4) !== "RIFF" || legacyImage.toString("ascii", 8, 12) !== "WEBP") {
  throw new Error("Legacy compatibility fixture is not an actual WebP asset");
}
const httpRequests = [];
const failureCounts = new Map();
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const mime = { ".js": "application/javascript", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".mp3": "audio/mpeg", ".wav": "audio/wav" };
const html = '<!doctype html><meta charset="utf-8"><link rel="icon" href="data:,"><style>html,body{margin:0;overflow:hidden;background:#211f5e}canvas{display:block;width:100vw;height:100vh;touch-action:none}</style><body><script src="game.js"></script><script>window.__wechatHarness.show()</script></body>';
const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? "/", "http://localhost");
    const [, scenario, ...parts] = decodeURIComponent(url.pathname).split("/");
    if (!["legacy-webp", "clean", "retry"].includes(scenario)) { response.writeHead(404).end(); return; }
    const relative = parts.join("/");
    if (!relative) { response.writeHead(200, { "Content-Type": "text/html", "Cache-Control": "no-store" }).end(html); return; }
    const file = path.resolve(packageRoot, relative);
    if (!file.startsWith(packageRoot + path.sep)) { response.writeHead(403).end(); return; }
    const entry = { scenario, path: relative, status: 200, at: Date.now() };
    httpRequests.push(entry);
    if (/\.webp$/i.test(relative)) {
      entry.status = 415;
      if (relative === legacyPath) entry.legacySource = legacySource;
      response.writeHead(415).end("Harness rejects WebP to model a PNG/JPEG-only decoder");
      return;
    }
    if (scenario === "retry" && relative.endsWith(faultFile)) {
      const attempt = (failureCounts.get(relative) ?? 0) + 1;
      failureCounts.set(relative, attempt);
      if (attempt === 1) { entry.status = 503; response.writeHead(503).end("Injected first image failure"); return; }
    }
    try {
      let data = await readFile(file);
      // Restore only the old daily-entry manifest path in this isolated HTTP
      // response. The on-disk production bundle is never edited.
      if (scenario === "legacy-webp" && relative === "game.js") {
        const currentPath = legacyPath.replace(/\.webp$/, ".png");
        const code = data.toString("utf8");
        assert(code.split(currentPath).length === 2, "Expected exactly one daily-entry path for legacy fault injection");
        data = Buffer.from(code.replace(currentPath, legacyPath));
      }
      response.writeHead(200, { "Content-Type": mime[path.extname(file)] ?? "application/octet-stream", "Cache-Control": "no-store" }).end(data);
    } catch {
      entry.status = 404;
      response.writeHead(404).end("Packaged resource not found");
    }
  } catch (error) { response.writeHead(500).end(String(error)); }
});

const installWechatShim = () => {
  const showCallbacks = [];
  const hideCallbacks = [];
  const storage = new Map();
  const touchCallbacks = { down: [], move: [], up: [], cancel: [] };
  const images = [];
  const imageEvents = [];
  const packageEvents = [];
  const pointerEvents = [];
  const loadedPackages = new Set();
  const pendingImages = new Set();
  let mainCanvas;
  let lastFrameTexts = [];
  let drawImageCount = 0;
  let frameCount = 0;
  const nativeImageSrc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, "src");
  const createImage = () => {
    const image = new Image();
    const id = images.length;
    const record = { id, image, source: "", state: "idle", released: false };
    images.push(record);
    const settle = (state) => {
      if (!pendingImages.has(id)) return;
      pendingImages.delete(id);
      record.state = state;
      imageEvents.push({ id, source: record.source, state });
    };
    image.addEventListener("load", () => settle("loaded"));
    image.addEventListener("error", () => settle("failed"));
    Object.defineProperty(image, "src", {
      configurable: true,
      get() { return nativeImageSrc.get.call(image); },
      set(source) {
        if (!source) {
          record.released = true;
          pendingImages.delete(id);
          image.removeAttribute("src");
          return;
        }
        record.source = String(source);
        record.state = "pending";
        record.released = false;
        pendingImages.add(id);
        imageEvents.push({ id, source: String(source), state: "requested" });
        const root = String(source).split("/")[0];
        if (["meta-ui", "gameplay-art", "journey-themes", "collection-art"].includes(root) && !loadedPackages.has(root)) {
          throw new Error(`Image accessed before package completed: ${source}`);
        }
        nativeImageSrc.set.call(image, source);
      },
    });
    return image;
  };
  const createCanvas = () => {
    const canvas = document.createElement("canvas");
    if (!mainCanvas) {
      mainCanvas = canvas;
      document.body.append(canvas);
      const context = canvas.getContext("2d");
      const fillRect = context.fillRect.bind(context);
      const fillText = context.fillText.bind(context);
      const drawImage = context.drawImage.bind(context);
      context.fillRect = (...args) => {
        if (args[0] === 0 && args[1] === 0 && args[2] === canvas.width && args[3] === canvas.height && context.fillStyle === "#090622") {
          lastFrameTexts = [];
          frameCount += 1;
        }
        return fillRect(...args);
      };
      context.fillText = (text, ...args) => { lastFrameTexts.push(String(text)); return fillText(text, ...args); };
      context.drawImage = (...args) => { drawImageCount += 1; return drawImage(...args); };
      const dispatch = (kind, event) => {
        const touch = { identifier: event.pointerId, clientX: event.clientX, clientY: event.clientY };
        pointerEvents.push({ kind, x: touch.clientX, y: touch.clientY });
        const payload = { changedTouches: [touch], touches: kind === "up" || kind === "cancel" ? [] : [touch] };
        touchCallbacks[kind].forEach((callback) => callback(payload));
      };
      canvas.addEventListener("pointerdown", (event) => { canvas.setPointerCapture(event.pointerId); dispatch("down", event); });
      canvas.addEventListener("pointermove", (event) => { if (event.buttons) dispatch("move", event); });
      canvas.addEventListener("pointerup", (event) => dispatch("up", event));
      canvas.addEventListener("pointercancel", (event) => dispatch("cancel", event));
    }
    canvas.requestAnimationFrame = window.requestAnimationFrame.bind(window);
    canvas.createImage = createImage;
    return canvas;
  };
  window.wx = {
    onShow: (callback) => showCallbacks.push(callback),
    onHide: (callback) => hideCallbacks.push(callback),
    onWindowResize: () => {},
    onTouchStart: (callback) => touchCallbacks.down.push(callback),
    onTouchMove: (callback) => touchCallbacks.move.push(callback),
    onTouchEnd: (callback) => touchCallbacks.up.push(callback),
    onTouchCancel: (callback) => touchCallbacks.cancel.push(callback),
    getWindowInfo: () => ({ screenWidth: innerWidth, screenHeight: innerHeight, pixelRatio: 1, safeArea: { top: 0, bottom: innerHeight } }),
    getAppBaseInfo: () => ({ language: "zh_CN" }),
    createCanvas,
    createImage,
    getStorageSync: (key) => storage.has(key) ? structuredClone(storage.get(key)) : "",
    setStorageSync: (key, value) => storage.set(key, structuredClone(value)),
    vibrateShort: () => {},
    loadSubpackage: ({ name, success, fail }) => {
      packageEvents.push({ name, state: "requested" });
      fetch(`${name}/game.js`).then(async (response) => {
        if (!response.ok) throw new Error(`${name}/game.js returned ${response.status}`);
        (0, eval)(await response.text());
        loadedPackages.add(name);
        packageEvents.push({ name, state: "loaded" });
        success?.({ errMsg: "loadSubpackage:ok" });
      }).catch((error) => {
        packageEvents.push({ name, state: "failed", error: String(error) });
        fail?.({ errMsg: String(error) });
      });
      return { onProgressUpdate() {} };
    },
  };
  window.__wechatHarness = {
    show: () => [...showCallbacks].forEach((callback) => callback()),
    snapshot: () => {
      const context = mainCanvas?.getContext("2d");
      const colors = new Set();
      if (context && mainCanvas.width) {
        const pixels = context.getImageData(0, 0, mainCanvas.width, mainCanvas.height).data;
        for (let i = 0; i < pixels.length; i += 4 * 149) colors.add(`${pixels[i]},${pixels[i + 1]},${pixels[i + 2]}`);
      }
      return {
        pendingImages: pendingImages.size,
        imageCount: images.length,
        loadedImages: images.filter((item) => item.state === "loaded" && !item.released).length,
        releasedImages: images.filter((item) => item.released).length,
        unreleasedFailedImages: images.filter((item) => item.state === "failed" && !item.released).length,
        settledImagesWithHandlers: images.filter((item) => item.state !== "pending" && (item.image.onload || item.image.onerror)).length,
        imageEvents, packageEvents, pointerEvents, loadedPackages: [...loadedPackages],
        lastFrameTexts, drawImageCount, frameCount, sampledColors: colors.size,
      };
    },
  };
};

await mkdir(output, { recursive: true });
const bundle = await readFile(path.join(packageRoot, "game.js"));
const bundleStamp = await stat(path.join(packageRoot, "game.js"));
const report = {
  harness: "Chromium with wx shim; unchanged dist-wechat/game.js and packaged files; NOT a WeChat native-device validation",
  bundleSha256: createHash("sha256").update(bundle).digest("hex").toUpperCase(),
  bundleModifiedAt: bundleStamp.mtime.toISOString(),
  packageRoot,
  legacyInjection: {
    source: legacySource,
    format: legacyImage.toString("ascii", 8, 12),
    sha256: createHash("sha256").update(legacyImage).digest("hex").toUpperCase(),
    description: "Only legacy-webp restores the former daily-entry manifest path in the served script, then simulates an unsupported decoder with HTTP 415; clean/retry run the unchanged production bundle",
  },
  conditions: ["All WebP requests rejected", "Real subpackage game.js fetched before package success", "Native browser image decoding", "Real browser Pointer dispatched through wx touch callbacks"],
  scenarios: [],
  failures: [],
};
let browser;
try {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ headless: true });
  for (const scenario of ["legacy-webp", "clean", "retry"]) {
    const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
    const page = await context.newPage();
    const consoleErrors = [];
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.on("console", async (message) => {
      if (message.type() !== "error") return;
      const args = await Promise.all(message.args().map((arg) => arg.jsonValue().catch(() => undefined)));
      consoleErrors.push({ text: message.text(), args });
    });
    await page.addInitScript(installWechatShim);
    try {
      await page.goto(`${baseUrl}/${scenario}/`, { waitUntil: "load" });
      if (scenario === "legacy-webp") {
        await page.waitForFunction(() => window.__wechatHarness.snapshot().lastFrameTexts.some((text) => text.includes("资源加载失败")));
        await page.waitForFunction(() => window.__wechatHarness.snapshot().pendingImages === 0);
        await page.mouse.click(248, 548);
        await page.waitForFunction(() => {
          const state = window.__wechatHarness.snapshot();
          return state.imageEvents.filter((event) => event.state === "failed" && event.source.endsWith("daily-tasks-entry.webp")).length === 2
            && state.pendingImages === 0 && state.lastFrameTexts.some((text) => text.includes("资源加载失败"));
        });
        const before = await page.evaluate(() => window.__wechatHarness.snapshot());
        assert(before.loadedImages === 0 && before.unreleasedFailedImages === 0 && before.settledImagesWithHandlers === 0, "Legacy retry leaked failed shell images or callbacks");
        assert(pageErrors.length === 0, `Legacy reproduction had unrelated script errors: ${pageErrors.join("; ")}`);
        assert(httpRequests.filter((entry) => entry.scenario === scenario && entry.path === legacyPath && entry.status === 415).length === 2, "Legacy WebP rejection did not repeat on retry");
        await page.screenshot({ path: path.join(output, "legacy-webp-failed-after-retry.png") });
        report.scenarios.push({ scenario, status: "PASS", expectedResult: "Resource failure persists after retry when the legacy WebP decoder is unavailable", ...before, consoleErrors, pageErrors });
        console.log("PASS legacy-webp: reproduced persistent startup failure after real Pointer retry");
        continue;
      }
      if (scenario === "retry") {
        await page.waitForFunction(() => window.__wechatHarness.snapshot().lastFrameTexts.some((text) => text.includes("资源加载失败")), undefined, { timeout: 30_000 });
        await page.waitForFunction(() => window.__wechatHarness.snapshot().pendingImages === 0);
        const failed = await page.evaluate(() => window.__wechatHarness.snapshot());
        assert(failed.loadedImages === 0, "Failed shell must release every image from its failed batch");
        assert(failed.unreleasedFailedImages === 0, "Failed image must be released before retry");
        assert(failed.settledImagesWithHandlers === 0, "Failed shell must detach all settled image callbacks");
        await page.screenshot({ path: path.join(output, "retry-before.png") });
        for (let click = 0; click < 3; click += 1) await page.mouse.click(248, 548);
      }
      await page.waitForFunction(() => {
        const state = window.__wechatHarness.snapshot();
        return state.loadedImages > 100 && state.pendingImages === 0
          && state.lastFrameTexts.some((text) => text === "开始")
          && !state.lastFrameTexts.some((text) => /资源加载失败|正在准备游戏/.test(text));
      }, undefined, { timeout: 60_000 });
      await page.waitForTimeout(400);
      const final = await page.evaluate(() => window.__wechatHarness.snapshot());
      assert(final.pendingImages === 0, "Pending image requests leaked after startup");
      assert(final.unreleasedFailedImages === 0, "Failed image was retained");
      assert(final.settledImagesWithHandlers === 0, "Settled image callbacks were retained");
      assert(final.sampledColors > 100 && final.drawImageCount > 30, "Home did not render real image pixels");
      assert(final.loadedPackages.includes("meta-ui") && final.loadedPackages.includes("gameplay-art"), "Shell and deferred subpackages were not both exercised");
      assert(pageErrors.length === 0, `Uncaught browser errors: ${pageErrors.join("; ")}`);
      const scenarioRequests = httpRequests.filter((item) => item.scenario === scenario);
      assert(!scenarioRequests.some((item) => /\.webp$/i.test(item.path)), "Production bundle still requested WebP");
      assert(!scenarioRequests.some((item) => item.status >= 400 && !(scenario === "retry" && item.path.endsWith(faultFile) && item.status === 503)), "Unexpected packaged-resource request failure");
      if (scenario === "retry") {
        const attempts = scenarioRequests.filter((item) => item.path.endsWith(faultFile));
        assert(attempts.length === 2 && attempts[1].status === 200, "Retry did not perform exactly one successful replacement image load");
        assert(final.pointerEvents.filter((event) => event.kind === "down").length === 3, "Retry clicks did not traverse native Pointer events");
        assert(consoleErrors.some((entry) => entry.text.includes("[wechat-assets]") && JSON.stringify(entry.args).includes(faultFile)), "Image failure log did not identify the failing path");
      } else assert(consoleErrors.length === 0, `Unexpected console errors: ${JSON.stringify(consoleErrors)}`);
      await page.screenshot({ path: path.join(output, `${scenario}-home.png`) });
      report.scenarios.push({ scenario, status: "PASS", ...final, consoleErrors, pageErrors });
      console.log(`PASS ${scenario}: ${final.loadedImages} retained images, ${final.loadedPackages.join(", ")}, ${final.sampledColors} sampled colors`);
    } catch (error) {
      report.failures.push({ scenario, error: String(error) });
      const snapshot = await page.evaluate(() => window.__wechatHarness?.snapshot()).catch(() => undefined);
      report.scenarios.push({ scenario, status: "FAIL", snapshot, consoleErrors, pageErrors });
      await page.screenshot({ path: path.join(output, `${scenario}-failure.png`) }).catch(() => {});
      console.error(`FAIL ${scenario}: ${error}`);
    } finally { await context.close(); }
  }
  const finalBundle = await readFile(path.join(packageRoot, "game.js"));
  assert(createHash("sha256").update(finalBundle).digest("hex").toUpperCase() === report.bundleSha256, "Production bundle drifted during the test");
} catch (error) { report.failures.push({ scenario: "harness", error: String(error) }); }
finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
  report.httpRequests = httpRequests;
  report.status = report.failures.length ? "FAIL" : "PASS";
  await writeFile(path.join(output, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
  if (report.failures.length) process.exitCode = 1;
}
