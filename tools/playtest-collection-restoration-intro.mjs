import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { preview } from "vite";
import { chromium } from "playwright";

// Isolated browser profiles only: never read or modify a player's save.
const buildHtml = await readFile(resolve("dist/index.html"), "utf8");
const EXPECTED_BUNDLE = buildHtml.match(/assets\/(game-[^\s"'/?]+\.js)/)?.[1];
assert.ok(EXPECTED_BUNDLE, "dist/index.html has no game bundle to verify");
const output = resolve(`playtest-results/collection-restoration-intro-20261007-${Date.now()}`);
await mkdir(output, { recursive: true });
const server = await preview({ configFile: false, logLevel: "error",
  preview: { host: "127.0.0.1", port: 5198, strictPort: true } });
const browser = await chromium.launch({ headless: true });
const report = { status: "RUNNING", syntheticSavesOnly: true, scenarios: [], errors: [] };
const FIRST_MASTERPIECE_ATLAS = "**/collection-card-atlases-v1/masterpiece-01.jpg";
const seedSyntheticSave = async (context, reducedMotion) => context.addInitScript(({ reducedMotion }) => {
  const key = "color-escape-save-v1";
  if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({
    schemaVersion: 1, currentLevel: 6, highestLevel: 6,
    coins: 100, sound: false, music: false, haptic: false, reducedMotion, language: "zh-CN",
    rewardedLevels: [1, 2, 3, 4, 5], bestStars: { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1 },
    collectionIntroPending: true, collectionIntroShown: false,
    collectionProgress: { version: 1, inspiration: 0, restoredMasterpieceIds: [], seenItemIds: [], claimedMilestoneIds: [] },
  }));
  window.__introAgeSamples = [];
  // Observe natural frame progression only; never alter age or invoke an update.
  setInterval(() => {
    const g = window.__COLOR_ESCAPE__;
    if (!g?.collectionIntro || window.__introAgeSamples.length >= 250) return;
    const samples = window.__introAgeSamples;
    const last = samples[samples.length - 1];
    const ready = g.collectionIntroReady();
    if (last?.age === g.collectionIntro.age && last?.ready === ready) return;
    samples.push({ elapsedMs: performance.now(), age: g.collectionIntro.age, ready, screen: g.screen });
  }, 20);
}, { reducedMotion });

const pointerTools = page => {
  const debug = () => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
  const clickLogical = async (x, y) => {
    const d = await debug();
    const box = await page.locator("canvas").boundingBox();
    const t = d.viewportTransform;
    await page.mouse.click(box.x + t.offsetX + x * t.scale, box.y + t.offsetY + y * t.scale);
  };
  const click = async key => {
    const d = await debug();
    const targets = d.interactionTargets.targets ?? d.interactionTargets;
    const rect = targets[key]?.hit;
    assert.ok(rect, `missing pointer target ${key}`);
    await clickLogical(rect.x + rect.width / 2, rect.y + rect.height / 2);
  };
  return { debug, click, clickLogical };
};

const startHomeIntro = async page => {
  await page.goto("http://127.0.0.1:5198/", { waitUntil: "domcontentloaded" });
  const scripts = await page.locator("script[src]").evaluateAll(nodes => nodes.map(node => node.src));
  assert.ok(scripts.some(src => src.endsWith(EXPECTED_BUNDLE)), `unexpected build: ${scripts.join(", ")}`);
  await page.waitForFunction(() => window.__COLOR_ESCAPE__?.artReady, undefined, { timeout: 30000 });
  await page.evaluate(() => {
    const g = window.__COLOR_ESCAPE__;
    g.updateToastVisible = false;
    window.__restorationHandDraws = 0;
    const draw = g.drawTapGuideHand.bind(g);
    g.drawTapGuideHand = (geometry, ...args) => {
      if (geometry.blockId === "masterpiece-01") window.__restorationHandDraws++;
      return draw(geometry, ...args);
    };
    g.beginPendingHomePresentation();
  });
  await page.waitForFunction(() => window.__COLOR_ESCAPE__.getDebugState().collectionIntro.active);
};

const captureReadyReveal = async (page, tag, reducedMotion) => {
  if (!reducedMotion) {
    await page.waitForFunction(() => {
      const intro = window.__COLOR_ESCAPE__.getDebugState().collectionIntro;
      return intro.active && intro.age > 0.3 && intro.age < 1.7;
    });
    await page.screenshot({ path: resolve(output, `${tag}-reveal-animation.png`) });
  }
  await page.waitForFunction(() => window.__COLOR_ESCAPE__.getDebugState().collectionIntro.ready,
    undefined, { timeout: 20000 });
  await page.waitForFunction(() => window.__introAgeSamples.some(sample => sample.age === 1.8 && sample.ready));
  await page.screenshot({ path: resolve(output, `${tag}-new-masterpiece.png`) });
  const samples = await page.evaluate(() => window.__introAgeSamples);
  assert.ok(samples.some(sample => sample.age === 0 && !sample.ready), "missing observed loading/age-zero state");
  assert.ok(samples.some(sample => sample.age === 1.8 && sample.ready), "missing observed ready/final state");
  for (let index = 1; index < samples.length; index++) assert.ok(samples[index].age >= samples[index - 1].age);
  if (!reducedMotion) {
    assert.ok(samples.filter(sample => sample.age > 0 && sample.age < 1.8).length >= 10,
      "normal animation must show multiple naturally elapsed intermediate frames");
    const ready = samples.find(sample => sample.ready);
    assert.ok(ready.elapsedMs - samples[0].elapsedMs >= 1500, "animation was skipped instead of naturally elapsed");
  }
  return { reducedMotion, samples };
};
try {
  for (const viewport of [{ width: 320, height: 568 }, { width: 496, height: 1078 }]) {
    const tag = `${viewport.width}x${viewport.height}`;
    const reducedMotion = viewport.width === 320;
    const context = await browser.newContext({ viewport,
      ...(reducedMotion ? {} : { recordVideo: { dir: output, size: viewport } }) });
    await seedSyntheticSave(context, reducedMotion);
    let releaseArtwork;
    const artworkGate = new Promise(resolveGate => { releaseArtwork = resolveGate; });
    await context.route(FIRST_MASTERPIECE_ATLAS, async route => {
      await artworkGate;
      await route.continue();
    });
    const page = await context.newPage();
    page.on("pageerror", error => report.errors.push({ tag, message: error.message }));
    const { debug, click, clickLogical } = pointerTools(page);
    await startHomeIntro(page);
    assert.equal((await debug()).collectionIntro.active, true);
    await page.waitForFunction(() => window.__introAgeSamples.some(sample => sample.age === 0));
    await clickLogical(248, 823);
    const loading = await debug();
    assert.equal(loading.screen, "home");
    assert.equal(loading.collectionIntro.age, 0);
    assert.equal(loading.collectionIntro.ready, false);
    assert.equal(loading.collectionIntro.shown, false);
    releaseArtwork();
    const reveal = await captureReadyReveal(page, tag, reducedMotion);
    await click("collectionIntroPrimary");
    await page.waitForFunction(() => {
      const g = window.__COLOR_ESCAPE__;
      return g.collectionRestorationGuideEligible() && g.art.tutorialHand && window.__restorationHandDraws > 0;
    }, undefined, { timeout: 20000 });
    const before = await debug();
    assert.equal(before.collectionAlbum.tab, "masterpieces");
    assert.equal(before.collectionAlbum.pageIndex, 0);
    assert.equal(before.collectionAlbum.detailId, "masterpiece-01");
    assert.equal(before.collectionAlbum.inspiration, 0);
    assert.deepEqual(before.collectionAlbum.restoredMasterpieceIds, []);
    assert.equal(before.collectionIntro.shown, true);
    assert.equal(before.collectionIntro.restorationGuide.visible, true);
    assert.equal(before.collectionIntro.restorationGuide.itemId, "masterpiece-01");
    await page.screenshot({ path: resolve(output, `${tag}-restore-guide.png`) });
    // Reject/unknown storage must keep both the guide and ordinary retry path.
    await page.evaluate(mode => {
      const g = window.__COLOR_ESCAPE__, host = g.host;
      window.__restoreHostWrites = { set: host.storageSet.bind(host), read: host.storageRead.bind(host) };
      host.storageSet = (key, value) => {
        if (mode === "unknown") window.__restoreHostWrites.set(key, value);
        return false;
      };
      if (mode === "unknown") host.storageRead = () => ({ status: "unavailable" });
    }, viewport.width === 320 ? "reject" : "unknown");
    await click("collectionAlbumDetailPrimary");
    const failed = await debug();
    assert.deepEqual(failed.collectionAlbum.restoredMasterpieceIds, []);
    assert.equal(failed.collectionIntro.restorationGuide.visible, true);
    assert.ok(failed.collectionAlbum.feedback);
    await page.evaluate(() => {
      const host = window.__COLOR_ESCAPE__.host;
      host.storageSet = window.__restoreHostWrites.set;
      host.storageRead = window.__restoreHostWrites.read;
    });
    await click("collectionAlbumDetailPrimary");
    await page.waitForFunction(() => window.__COLOR_ESCAPE__.save.collectionProgress.restoredMasterpieceIds.includes("masterpiece-01"));
    const after = await debug();
    assert.equal(after.collectionIntro.restorationGuide, undefined);
    assert.equal(after.collectionAlbum.inspiration, 0);
    assert.deepEqual(after.collectionAlbum.restoredMasterpieceIds, ["masterpiece-01"]);
    assert.equal(after.collectionAlbum.detailId, "masterpiece-01");
    assert.equal(after.collectionAlbum.feedback, undefined);
    assert.equal((after.interactionTargets.targets ?? after.interactionTargets).collectionAlbumDetailPrimary, undefined);
    await page.screenshot({ path: resolve(output, `${tag}-restored.png`) });
    await click("collectionAlbumDetailClose");
    await click("navigation.2");
    await page.waitForFunction(() => window.__COLOR_ESCAPE__.screen === "home" && !window.__COLOR_ESCAPE__.navigationTransition);
    await click("navigation.4");
    await page.waitForFunction(() => window.__COLOR_ESCAPE__.screen === "records" && !window.__COLOR_ESCAPE__.navigationTransition);
    assert.equal((await debug()).collectionAlbum.detailId, undefined);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.__COLOR_ESCAPE__?.artReady);
    const restored = await page.evaluate(() => {
      const g = window.__COLOR_ESCAPE__;
      return { startsAgain: g.beginPendingHomePresentation(), shown: g.save.collectionIntroShown,
        restored: g.save.collectionProgress.restoredMasterpieceIds, coins: g.save.coins, highestLevel: g.save.highestLevel };
    });
    assert.equal(restored.startsAgain, false);
    assert.equal(restored.shown, true);
    assert.deepEqual(restored.restored, ["masterpiece-01"]);
    assert.equal(restored.coins, 100);
    assert.equal(restored.highestLevel, 6);
    const video = page.video();
    report.scenarios.push({ tag, bundle: EXPECTED_BUNDLE, reveal,
      persistenceFailure: viewport.width === 320 ? "reject" : "unknown",
      before: { tab: before.collectionAlbum.tab, detail: before.collectionAlbum.detailId, guide: before.collectionIntro.restorationGuide },
      restored, video: video ? await video.path() : undefined,
      pointerFlow: "slow artwork -> blocked early click -> natural reveal -> masterpiece detail -> save failure -> retry restore -> close -> home -> ordinary collection -> reload" });
    await context.close();
  }

  {
    const tag = "320x568-retry-normal-motion";
    const context = await browser.newContext({ viewport: { width: 320, height: 568 } });
    await seedSyntheticSave(context, false);
    let requestCount = 0;
    let releaseRetry;
    const retryGate = new Promise(resolveGate => { releaseRetry = resolveGate; });
    await context.route(FIRST_MASTERPIECE_ATLAS, async route => {
      requestCount++;
      if (requestCount === 1) return route.abort("failed");
      await retryGate;
      return route.continue();
    });
    const page = await context.newPage();
    page.on("pageerror", error => report.errors.push({ tag, message: error.message }));
    const { debug, click, clickLogical } = pointerTools(page);
    await startHomeIntro(page);
    await page.waitForFunction(() => {
      const d = window.__COLOR_ESCAPE__.getDebugState();
      const targets = d.interactionTargets.targets ?? d.interactionTargets;
      return Boolean(targets.collectionIntroRetry);
    });
    await page.screenshot({ path: resolve(output, `${tag}-artwork-failed.png`) });
    await clickLogical(248, 823);
    assert.equal((await debug()).screen, "home");
    assert.equal((await debug()).collectionIntro.age, 0);
    // Click the visible retry caption, not just the large artwork hit target.
    await clickLogical(248, 718);
    await page.waitForFunction(() => window.__COLOR_ESCAPE__.collectionAlbumArtwork?.pendingIndexes.length > 0);
    assert.equal(requestCount, 2);
    await clickLogical(248, 823);
    assert.equal((await debug()).collectionIntro.shown, false);
    releaseRetry();
    const reveal = await captureReadyReveal(page, tag, false);
    await page.evaluate(() => { window.__closedIntroArtwork = window.__COLOR_ESCAPE__.collectionAlbumArtwork; });
    await click("collectionIntroLater");
    const closed = await page.evaluate(() => {
      const g = window.__COLOR_ESCAPE__;
      return { screen: g.screen, active: Boolean(g.collectionIntro), shown: g.save.collectionIntroShown,
        detail: g.collectionAlbumDetailId, guide: g.collectionRestorationGuide,
        storeRetained: Boolean(g.collectionAlbumArtwork), uiRetained: Boolean(g.collectionAlbumArt),
        disposedImages: window.__closedIntroArtwork.images.length,
        disposedPending: window.__closedIntroArtwork.pendingIndexes.length,
        restored: g.save.collectionProgress.restoredMasterpieceIds, coins: g.save.coins };
    });
    assert.equal(closed.screen, "home");
    assert.equal(closed.active, false);
    assert.equal(closed.shown, true);
    assert.equal(closed.detail, undefined);
    assert.equal(closed.guide, undefined);
    assert.equal(closed.storeRetained, false);
    assert.equal(closed.uiRetained, false);
    assert.equal(closed.disposedImages, 0);
    assert.equal(closed.disposedPending, 0);
    assert.deepEqual(closed.restored, []);
    assert.equal(closed.coins, 100);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.__COLOR_ESCAPE__?.artReady);
    const reload = await page.evaluate(() => {
      const g = window.__COLOR_ESCAPE__;
      return { startsAgain: g.beginPendingHomePresentation(), active: Boolean(g.collectionIntro), shown: g.save.collectionIntroShown };
    });
    assert.deepEqual(reload, { startsAgain: false, active: false, shown: true });
    report.scenarios.push({ tag, bundle: EXPECTED_BUNDLE, reveal, requestCount, closed, reload,
      pointerFlow: "failed artwork -> blocked continue -> retry slow artwork -> natural reveal -> close and release -> reload without replay" });
    await context.close();
  }
  assert.deepEqual(report.errors, []);
  report.status = "PASS";
} catch (error) {
  report.status = "FAIL";
  report.error = String(error.stack ?? error);
  process.exitCode = 1;
} finally {
  await writeFile(resolve(output, "report.json"), JSON.stringify(report, null, 2));
  await browser.close();
  await new Promise(resolveClose => server.httpServer.close(resolveClose));
  console.log(JSON.stringify({ status: report.status, output, error: report.error }));
}
