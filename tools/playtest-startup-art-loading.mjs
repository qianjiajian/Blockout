import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";

const output = fileURLToPath(new URL("../playtest-results/startup-art-loading/", import.meta.url));
const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
await mkdir(output, { recursive: true });

const SHELL_ASSETS = new Set([
  "home-lab-v2.jpg",
  "coin-icon.png",
  "coin-panel.png",
  "settings-button.png",
  "level-card.png",
  "level-pill.png",
  "arrow-left.png",
  "arrow-right.png",
  "start-button.png",
  "daily-ribbon.png",
  "daily-calendar.png",
  "five-tab-icons-atlas-v1.png",
  "five-tab-bar-v1.png",
  "five-tab-selected-v1.png",
  "onboarding-daily-icons-v1.png",
  "universal-panel-v2.png",
]);
const TOTAL_ART_ASSETS = 77;

const browser = await chromium.launch({ headless: true });
const pageErrors = [];
const delayed = await browser.newPage({ viewport: { width: 720, height: 1584 }, deviceScaleFactor: 1 });
delayed.on("pageerror", (error) => pageErrors.push(error.message));

const requestStart = new Map();
const artRequests = [];
let activeArtRequests = 0;
let maxConcurrentArtRequests = 0;
delayed.on("request", (request) => {
  if (!request.url().includes("/assets/art/")) return;
  activeArtRequests += 1;
  maxConcurrentArtRequests = Math.max(maxConcurrentArtRequests, activeArtRequests);
  requestStart.set(request, Date.now());
  artRequests.push({
    name: new URL(request.url()).pathname.split("/").at(-1),
    startedAt: Date.now(),
  });
});
const settleRequest = (request) => {
  if (!requestStart.has(request)) return;
  requestStart.delete(request);
  activeArtRequests -= 1;
};
delayed.on("requestfinished", settleRequest);
delayed.on("requestfailed", settleRequest);
await delayed.route("**/victory-halo-v1.png", async (route) => {
  await new Promise((resolveDelay) => setTimeout(resolveDelay, 1_600));
  await route.continue();
});

const debug = (page) => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const colorfulSampleCount = (page) => page.evaluate(() => {
  const canvas = document.querySelector("canvas");
  const context = canvas?.getContext("2d");
  if (!canvas || !context) return 0;
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  let count = 0;
  const pixelStep = Math.max(1, Math.floor((canvas.width * canvas.height) / 20_000));
  for (let pixel = 0; pixel < canvas.width * canvas.height; pixel += pixelStep) {
    const offset = pixel * 4;
    const r = pixels[offset];
    const g = pixels[offset + 1];
    const b = pixels[offset + 2];
    if (Math.max(r, g, b) - Math.min(r, g, b) > 24 && Math.max(r, g, b) > 70) count += 1;
  }
  return count;
});
const clickLogical = (page, x, y) => {
  const scale = Math.min(720 / 496, 1584 / 1078);
  const offsetX = (720 - 496 * scale) / 2;
  const offsetY = (1584 - 1078 * scale) / 2;
  return page.mouse.click(offsetX + x * scale, offsetY + y * scale);
};

await delayed.goto(playtestUrl, { waitUntil: "domcontentloaded" });
await delayed.waitForFunction(() => {
  const art = window.__COLOR_ESCAPE__?.getDebugState().art;
  return art?.shellReady && !art.ready;
}, undefined, { timeout: 1_200 });
await delayed.waitForTimeout(35);
const shellState = await debug(delayed);
if (!shellState.art.shellReady || shellState.art.ready || shellState.art.loadedImages < SHELL_ASSETS.size) {
  throw new Error(`Startup art E2E: invalid shell state ${JSON.stringify(shellState.art)}`);
}
const requestedShellNames = new Set(artRequests.slice(0, SHELL_ASSETS.size).map((entry) => entry.name));
for (const name of SHELL_ASSETS) {
  if (!requestedShellNames.has(name)) throw new Error(`Startup art E2E: missing shell asset ${name}`);
}
const shellColorSamples = await colorfulSampleCount(delayed);
if (shellColorSamples < 300) throw new Error(`Startup art E2E: shell stayed visually blank (${shellColorSamples} colorful samples)`);
await delayed.screenshot({ path: resolve(output, "01-shell-visible-while-deferred.png") });

await clickLogical(delayed, 248, 810);
if ((await debug(delayed)).screen !== "home") {
  throw new Error("Startup art E2E: input escaped the loading guard before gameplay art was ready");
}
await delayed.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().art.ready, undefined, { timeout: 5_000 });
const readyState = await debug(delayed);
if (readyState.art.loadedImages !== TOTAL_ART_ASSETS || readyState.art.loadError || readyState.art.fullLoadMs < 1_500) {
  throw new Error(`Startup art E2E: invalid fully-ready state ${JSON.stringify(readyState.art)}`);
}
if (artRequests.length !== TOTAL_ART_ASSETS || maxConcurrentArtRequests > 6) {
  throw new Error(`Startup art E2E: expected ${TOTAL_ART_ASSETS} requests capped at 6, got ${artRequests.length} / ${maxConcurrentArtRequests}`);
}
await clickLogical(delayed, 248, 810);
if ((await debug(delayed)).screen !== "playing") {
  throw new Error("Startup art E2E: start did not unlock after all art became ready");
}
await delayed.screenshot({ path: resolve(output, "02-gameplay-after-deferred.png") });

const failed = await browser.newPage({ viewport: { width: 720, height: 1584 }, deviceScaleFactor: 1 });
failed.on("pageerror", (error) => pageErrors.push(error.message));
await failed.route("**/victory-halo-v1.png", (route) => route.abort("failed"));
await failed.goto(playtestUrl, { waitUntil: "domcontentloaded" });
await failed.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().art.loadFailurePhase === "deferred", undefined, { timeout: 3_000 });
await failed.waitForTimeout(35);
const failureState = await debug(failed);
if (!failureState.art.shellReady || failureState.art.ready || failureState.screen !== "home" || !failureState.art.loadError) {
  throw new Error(`Startup art E2E: deferred failure was not contained ${JSON.stringify(failureState.art)}`);
}
const failureColorSamples = await colorfulSampleCount(failed);
if (failureColorSamples < 300) {
  throw new Error(`Startup art E2E: deferred failure replaced the home shell with a blank screen (${failureColorSamples})`);
}
await clickLogical(failed, 248, 810);
if ((await debug(failed)).screen !== "home") {
  throw new Error("Startup art E2E: failed deferred art still allowed gameplay entry");
}
await failed.screenshot({ path: resolve(output, "03-deferred-failure-contained.png") });

const shellFailed = await browser.newPage({ viewport: { width: 720, height: 1584 }, deviceScaleFactor: 1 });
shellFailed.on("pageerror", (error) => pageErrors.push(error.message));
await shellFailed.route("**/home-lab-v2.jpg", (route) => route.abort("failed"));
await shellFailed.goto(playtestUrl, { waitUntil: "domcontentloaded" });
await shellFailed.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().art.loadFailurePhase === "shell", undefined, { timeout: 2_000 });
await shellFailed.waitForTimeout(35);
const shellFailureState = await debug(shellFailed);
if (shellFailureState.art.shellReady || shellFailureState.art.ready || shellFailureState.screen !== "home"
  || !shellFailureState.art.loadError || await colorfulSampleCount(shellFailed) < 10) {
  throw new Error(`Startup art E2E: shell failure did not expose a readable emergency state ${JSON.stringify(shellFailureState.art)}`);
}
await shellFailed.screenshot({ path: resolve(output, "04-shell-failure-explained.png") });

const normal = await browser.newPage({ viewport: { width: 720, height: 1584 }, deviceScaleFactor: 1 });
normal.on("pageerror", (error) => pageErrors.push(error.message));
await normal.goto(playtestUrl, { waitUntil: "networkidle" });
await normal.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().art.ready, undefined, { timeout: 5_000 });
const normalState = await debug(normal);
if (!normalState.art.shellReady || !normalState.art.ready || normalState.art.loadedImages !== TOTAL_ART_ASSETS
  || normalState.art.shellLoadMs <= 0 || normalState.art.fullLoadMs < normalState.art.shellLoadMs) {
  throw new Error(`Startup art E2E: invalid normal-load state ${JSON.stringify(normalState.art)}`);
}

const report = {
  shellAssetCount: SHELL_ASSETS.size,
  totalArtRequests: artRequests.length,
  maxConcurrentArtRequests,
  shellLoadedImagesWhenObserved: shellState.art.loadedImages,
  shellLoadMs: shellState.art.shellLoadMs,
  fullLoadMsWith1600msTail: readyState.art.fullLoadMs,
  shellColorSamples,
  failureColorSamples,
  failurePhase: failureState.art.loadFailurePhase,
  shellFailurePhase: shellFailureState.art.loadFailurePhase,
  normalShellLoadMs: normalState.art.shellLoadMs,
  normalFullLoadMs: normalState.art.fullLoadMs,
  inputBlockedBeforeReady: true,
  inputUnlockedAfterReady: true,
  pageErrors,
};
await writeFile(resolve(output, "startup-art-loading-report.json"), `${JSON.stringify(report, null, 2)}\n`);

await browser.close();
if (pageErrors.length) throw new Error(`Startup art E2E page errors:\n${pageErrors.join("\n")}`);
console.log(`Startup shell visible with ${SHELL_ASSETS.size}/${TOTAL_ART_ASSETS} assets, concurrency ${maxConcurrentArtRequests}/6, delayed and failed tail containment passed.`);
