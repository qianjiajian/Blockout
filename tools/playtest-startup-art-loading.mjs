import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";

const output = fileURLToPath(new URL("../playtest-results/startup-art-loading/", import.meta.url));
const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
await mkdir(output, { recursive: true });

const SHELL_ASSETS = new Set([
  "loading-background.jpg",
  "background.jpg",
  "top-header.png",
  "resource-panel.png",
  "coin-icon.png",
  "heart-icon.png",
  "add-button.png",
  "settings-icon.png",
  "level-plate.png",
  "arrow-left.png",
  "arrow-right.png",
  "star-left.png",
  "star-center.png",
  "star-right.png",
  "star-empty-left.png",
  "star-empty-center.png",
  "star-empty-right.png",
  "start-button.png",
  "navigation-bar.png",
  "navigation-selected.png",
  "navigation-divider.png",
  "shop-icon.png",
  "leaderboard-icon.png",
  "home-icon.png",
  "journey-icon.png",
  "collection-icon.png",
  "collection-album-entry.png",
  "daily-tasks-entry.png",
  "achievements-entry.png",
  "onboarding-daily-icons-v1.png",
  "universal-panel-v2.png",
]);
// Shop/Leaderboard/Journey/Collection and settlement art live in lazy groups.
// A fresh, isolated Lv1 session measured 202 image requests after the unused
// resource cleanup (2026-10-17): 184 shared game/UI images plus the formal
// loading background and three exact
// whole-block images. None of the lazy page/settlement
// images are requested. The formal board contract now loads 58 direction-
// authored rim/gate images (six neutral rails, four corners, and 48 gates)
// plus six direction-authored ice strips; every straight family provides
// native 1/2/3-cell slices and never relies on a stretched two-cell bitmap.
const TOTAL_ART_ASSETS = 202;
const RETIRED_ART_FILES = new Set([
  "five-tab-icons-atlas-v1.png",
  "irregular-cell-v1.png",
  "mechanism-guide-icons-atlas-v1.png",
  "victory-halo-v1.png",
  "block-blocked-halo-v1.png",
  "perfect-title.png",
  "locked-frame.png",
]);

const browser = await chromium.launch({ headless: true });
const pageErrors = [];
const retiredArtRequests = [];
const auditPage = (page) => {
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("request", (request) => {
    const pathname = new URL(request.url()).pathname;
    if (!pathname.includes("/assets/art/")) return;
    if (RETIRED_ART_FILES.has(pathname.split("/").at(-1))
      || (pathname.includes("/formal-border-v1/") && !pathname.endsWith("/direction-arrow.png"))) {
      retiredArtRequests.push(pathname);
    }
  });
};
const delayed = await browser.newPage({ viewport: { width: 720, height: 1584 }, deviceScaleFactor: 1 });
auditPage(delayed);

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
await delayed.route("**/block-grab-halo-v1.png", async (route) => {
  await new Promise((resolveDelay) => setTimeout(resolveDelay, 1_600));
  await route.continue();
});

const debug = (page) => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const stallImageUntilReleased = (page, sourceFragment) => page.addInitScript((fragment) => {
  const descriptor = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, "src");
  if (!descriptor?.get || !descriptor.set) throw new Error("HTMLImageElement.src descriptor is unavailable");
  let active = true;
  Object.defineProperty(HTMLImageElement.prototype, "src", {
    configurable: descriptor.configurable,
    enumerable: descriptor.enumerable,
    get() { return descriptor.get.call(this); },
    set(value) {
      if (active && String(value).includes(fragment)) return;
      descriptor.set.call(this, value);
    },
  });
  globalThis.__releaseStalledStartupImage = () => { active = false; };
}, sourceFragment);
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
const clickTarget = async (page, name) => {
  const state = await debug(page);
  const target = state.interactionTargets?.targets?.[name]?.hit;
  const bounds = await page.locator("canvas").boundingBox();
  if (!target || !bounds) throw new Error(`Startup art E2E: missing ${name} target or canvas bounds`);
  return page.mouse.click(
    bounds.x + state.viewportTransform.offsetX + (target.x + target.width / 2) * state.viewportTransform.scale,
    bounds.y + state.viewportTransform.offsetY + (target.y + target.height / 2) * state.viewportTransform.scale,
  );
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
// Episode 1 deliberately reuses the Home background and may enqueue that
// request while the six-worker shell batch is completing, so request order is
// not a stable shell boundary. shellReady is authoritative; verify that every
// required shell filename has appeared by this snapshot.
const requestedShellNames = new Set(artRequests.map((entry) => entry.name));
for (const name of SHELL_ASSETS) {
  if (!requestedShellNames.has(name)) throw new Error(`Startup art E2E: missing shell asset ${name}`);
}
const shellColorSamples = await colorfulSampleCount(delayed);
if (shellColorSamples < 300) throw new Error(`Startup art E2E: shell stayed visually blank (${shellColorSamples} colorful samples)`);
await delayed.screenshot({ path: resolve(output, "01-shell-visible-while-deferred.png") });

await clickTarget(delayed, "homePlay");
if ((await debug(delayed)).screen !== "home") {
  throw new Error("Startup art E2E: input escaped the loading guard before gameplay art was ready");
}
await delayed.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().art.ready, undefined, { timeout: 5_000 });
// Optional star/generator overlays start after critical art.ready; wait for
// their requests to settle before checking the measured full startup count.
await delayed.waitForLoadState("networkidle");
const readyState = await debug(delayed);
if (readyState.art.loadedImages !== TOTAL_ART_ASSETS || readyState.art.loadError || readyState.art.fullLoadMs < 1_500) {
  throw new Error(`Startup art E2E: invalid fully-ready state ${JSON.stringify(readyState.art)}`);
}
if (artRequests.length !== TOTAL_ART_ASSETS || maxConcurrentArtRequests > 8) {
  throw new Error(`Startup art E2E: expected ${TOTAL_ART_ASSETS} requests capped at 8, got ${artRequests.length} / ${maxConcurrentArtRequests}`);
}
await clickTarget(delayed, "homePlay");
if ((await debug(delayed)).screen !== "playing") {
  throw new Error("Startup art E2E: start did not unlock after all art became ready");
}
await delayed.screenshot({ path: resolve(output, "02-gameplay-after-deferred.png") });

const failed = await browser.newPage({ viewport: { width: 720, height: 1584 }, deviceScaleFactor: 1 });
auditPage(failed);
let deferredTailRequests = 0;
await failed.route("**/block-grab-halo-v1.png", (route) => {
  deferredTailRequests += 1;
  if (deferredTailRequests === 1) return route.abort("failed");
  return route.continue();
});
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
await clickTarget(failed, "homePlay");
if ((await debug(failed)).screen !== "home") {
  throw new Error("Startup art E2E: failed deferred art still allowed gameplay entry");
}
await failed.screenshot({ path: resolve(output, "03-deferred-failure-contained.png") });
if (!failureState.interactionTargets.targets.startupRetry) {
  throw new Error("Startup art E2E: deferred failure did not expose an in-app retry target");
}
await clickTarget(failed, "startupRetry");
await failed.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().art.ready, undefined, { timeout: 5_000 });
await failed.waitForLoadState("networkidle");
const deferredRecoveredState = await debug(failed);
if (deferredTailRequests !== 2 || deferredRecoveredState.art.loadError
  || deferredRecoveredState.art.loadedImages < TOTAL_ART_ASSETS) {
  throw new Error(`Startup art E2E: deferred failure did not recover in-app ${JSON.stringify(deferredRecoveredState.art)}`);
}
await failed.screenshot({ path: resolve(output, "04-deferred-retry-recovered.png") });

const shellFailed = await browser.newPage({ viewport: { width: 720, height: 1584 }, deviceScaleFactor: 1 });
auditPage(shellFailed);
let shellBackgroundRequests = 0;
await shellFailed.route("**/home-v3/background.jpg", (route) => {
  shellBackgroundRequests += 1;
  if (shellBackgroundRequests === 1) return route.abort("failed");
  return route.continue();
});
await shellFailed.goto(playtestUrl, { waitUntil: "domcontentloaded" });
await shellFailed.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().art.loadFailurePhase === "shell", undefined, { timeout: 2_000 });
await shellFailed.waitForTimeout(35);
const shellFailureState = await debug(shellFailed);
if (shellFailureState.art.shellReady || shellFailureState.art.ready || shellFailureState.screen !== "home"
  || !shellFailureState.art.loadError || await colorfulSampleCount(shellFailed) < 10) {
  throw new Error(`Startup art E2E: shell failure did not expose a readable emergency state ${JSON.stringify(shellFailureState.art)}`);
}
if (!shellFailureState.interactionTargets.targets.startupRetry) {
  throw new Error("Startup art E2E: shell failure did not expose an emergency retry target");
}
await shellFailed.screenshot({ path: resolve(output, "05-shell-failure-explained.png") });
await clickTarget(shellFailed, "startupRetry");
await shellFailed.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().art.ready, undefined, { timeout: 5_000 });
await shellFailed.waitForLoadState("networkidle");
const shellRecoveredState = await debug(shellFailed);
if (shellBackgroundRequests !== 2 || shellRecoveredState.art.loadError
  || shellRecoveredState.art.loadedImages < TOTAL_ART_ASSETS) {
  throw new Error(`Startup art E2E: shell failure did not recover in-app ${JSON.stringify(shellRecoveredState.art)}`);
}
await shellFailed.screenshot({ path: resolve(output, "06-shell-retry-recovered.png") });

// A platform callback can disappear without an error event. The runtime must
// convert that hung image into the same recoverable failure UI, cancel the old
// request, and accept a later retry without restarting the app.
const callbackHung = await browser.newPage({ viewport: { width: 720, height: 1584 }, deviceScaleFactor: 1 });
auditPage(callbackHung);
await stallImageUntilReleased(callbackHung, "block-grab-halo-v1.png");
await callbackHung.goto(playtestUrl, { waitUntil: "domcontentloaded" });
await callbackHung.waitForFunction(() => (
  window.__COLOR_ESCAPE__?.getDebugState().art.loadFailurePhase === "deferred"
), undefined, { timeout: 7_000 });
let callbackHungState = await debug(callbackHung);
if (callbackHungState.art.ready || !callbackHungState.art.loadError
  || !callbackHungState.interactionTargets.targets.startupRetry
  || !String(callbackHungState.art.loadError).includes("Timed out loading image after 5000ms")) {
  throw new Error(`Startup art E2E: a missing image callback did not become recoverable ${JSON.stringify(callbackHungState.art)}`);
}
await callbackHung.evaluate(() => globalThis.__releaseStalledStartupImage());
await clickTarget(callbackHung, "startupRetry");
await callbackHung.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().art.ready, undefined, { timeout: 5_000 });
await callbackHung.waitForLoadState("networkidle");
callbackHungState = await debug(callbackHung);
if (callbackHungState.art.loadError || !callbackHungState.art.ready) {
  throw new Error(`Startup art E2E: missing-callback retry did not recover ${JSON.stringify(callbackHungState.art)}`);
}
await callbackHung.screenshot({ path: resolve(output, "07-callback-timeout-recovered.png") });

const normal = await browser.newPage({ viewport: { width: 720, height: 1584 }, deviceScaleFactor: 1 });
auditPage(normal);
await normal.goto(playtestUrl, { waitUntil: "networkidle" });
await normal.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().art.ready, undefined, { timeout: 5_000 });
const normalState = await debug(normal);
if (!normalState.art.shellReady || !normalState.art.ready || normalState.art.loadedImages !== TOTAL_ART_ASSETS
  || normalState.art.shellLoadMs <= 0 || normalState.art.fullLoadMs < normalState.art.shellLoadMs) {
  throw new Error(`Startup art E2E: invalid normal-load state ${JSON.stringify(normalState.art)}`);
}

if (retiredArtRequests.length) {
  throw new Error(`Startup art E2E: requested retired art ${JSON.stringify(retiredArtRequests)}`);
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
  deferredInAppRetryRecovered: deferredRecoveredState.art.ready,
  shellInAppRetryRecovered: shellRecoveredState.art.ready,
  deferredTailRequests,
  shellBackgroundRequests,
  missingCallbackTimedOut: true,
  missingCallbackRetryRecovered: callbackHungState.art.ready,
  normalShellLoadMs: normalState.art.shellLoadMs,
  normalFullLoadMs: normalState.art.fullLoadMs,
  inputBlockedBeforeReady: true,
  inputUnlockedAfterReady: true,
  pageErrors,
  retiredArtRequests,
};
await writeFile(resolve(output, "startup-art-loading-report.json"), `${JSON.stringify(report, null, 2)}\n`);

await browser.close();
if (pageErrors.length) throw new Error(`Startup art E2E page errors:\n${pageErrors.join("\n")}`);
console.log(`Startup shell visible with ${SHELL_ASSETS.size}/${TOTAL_ART_ASSETS} assets, concurrency ${maxConcurrentArtRequests}/8, delayed/failure containment and in-app retries passed.`);
