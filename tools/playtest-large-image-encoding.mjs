import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import sharp from "sharp";
import { LARGE_IMAGE_POLICIES } from "./large-image-encoding.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const mode = process.argv[2];
assert.ok(["before", "after"].includes(mode), "Usage: node tools/playtest-large-image-encoding.mjs before|after");
const outputRoot = resolve(root, ".codex-temp/large-image-browser-qa-2026-09-23");
const output = resolve(outputRoot, mode);
await mkdir(output, { recursive: true });
const url = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(new URL(url).hostname), "Local server only");
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const formal = "assets/art/ui/formal-pages/";
const targets = [
  `${formal}journey/background.png`, `${formal}shop/reference.png`,
  `${formal}journey/presentation-panel.png`, `${formal}overlays/win/panel.png`,
  `${formal}journey/destination.png`, `${formal}overlays/win/glow.png`,
  `${formal}journey/title-journey-rewards.png`, "assets/art/ui/home-v3/background.jpg",
  ...Array.from({ length: 9 }, (_, i) => `${formal}journey/home-${String(i + 2).padStart(2, "0")}.jpg`),
];
const canonicalPath = path => path.replace(/journey\/background\.jpg$/, "journey/background.png");
const browserPath = path => mode === "after" && path.endsWith("/journey/background.png")
  ? path.replace(/\.png$/, ".jpg") : path;
const baseline = mode === "after" ? JSON.parse(await readFile(resolve(outputRoot, "before/report.json"), "utf8")) : null;
const existingBeforeAssets = mode === "before" ? await readFile(resolve(output, "assets.json"), "utf8")
  .then(text => JSON.parse(text)).catch(error => { if (error.code === "ENOENT") return null; throw error; }) : null;
const report = { mode, startedAt: new Date().toISOString(), viewport: { width: 720, height: 1584 },
  storage: "New isolated nonpersistent browser context, no real user storage/profile accessed", assets: [], views: [], errors: [], requests: [],
  limitations: "Browser loading/rendering and image regression only; not WeChat real-device certification or subjective lossless equivalence." };
function alphaSummary(data) {
  const alpha = Buffer.alloc(data.length / 4);
  let transparentPixels = 0, nonOpaquePixels = 0;
  for (let i = 3, p = 0; i < data.length; i += 4, p++) {
    alpha[p] = data[i]; transparentPixels += data[i] === 0; nonOpaquePixels += data[i] < 255;
  }
  return { alphaSha256: hash(alpha), transparentPixels, nonOpaquePixels };
}
for (const oldPath of targets) {
  const path = browserPath(oldPath), absolute = resolve(root, "public", path);
  const bytes = await readFile(absolute);
  if (existingBeforeAssets) {
    assert.equal(hash(bytes), existingBeforeAssets.find(a => a.path === path)?.sha256,
      `Refusing to overwrite original QA baseline after asset changes: ${path}`);
  }
  const { data, info } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const selected = LARGE_IMAGE_POLICIES.some(p => `assets/art/${p.previousRuntime || p.runtime}` === oldPath);
  const asset = { path, canonical: oldPath, selectedForOptimization: selected, bytes: bytes.length, sha256: hash(bytes), width: info.width, height: info.height, ...alphaSummary(data) };
  if (mode === "before") {
    const backup = resolve(output, "originals", oldPath);
    await mkdir(dirname(backup), { recursive: true });
    await copyFile(absolute, backup);
  } else {
    const original = baseline.assets.find(a => a.path === oldPath);
    assert.ok(original, `Missing baseline for ${oldPath}`);
    if (!selected) assert.equal(asset.sha256, original.sha256, `Unselected comparison image changed: ${path}`);
    else assert.ok(asset.bytes < original.bytes, `Selected encoding did not reduce runtime image bytes: ${path}`);
    assert.deepEqual([asset.width, asset.height], [original.width, original.height], `Native dimensions changed: ${path}`);
    assert.equal(asset.alphaSha256, original.alphaSha256, `Alpha changed: ${path}`);
    const oldRgba = await sharp(resolve(outputRoot, "before/originals", oldPath)).ensureAlpha().raw().toBuffer();
    let absoluteDifference = 0, maxDifference = 0, visiblePixels = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] === 0) continue;
      visiblePixels++;
      for (let c = 0; c < 3; c++) { const diff = Math.abs(data[i + c] - oldRgba[i + c]); absoluteDifference += diff; maxDifference = Math.max(maxDifference, diff); }
    }
    asset.comparison = { sizeDelta: asset.bytes - original.bytes, nativeDimensionsPreserved: true, alphaExactlyPreserved: true,
      visibleRgbMeanAbsoluteError: absoluteDifference / visiblePixels / 3, visibleRgbMaximumError: maxDifference };
  }
  report.assets.push(asset);
}
await writeFile(resolve(output, "assets.json"), JSON.stringify(report.assets, null, 2));

const browser = await chromium.launch({ headless: true, args: ["--mute-audio"] });
const context = await browser.newContext({ viewport: report.viewport, deviceScaleFactor: 1 });
const page = await context.newPage();
page.on("pageerror", e => report.errors.push(`pageerror: ${e.message}`));
page.on("console", m => { if (m.type() === "error") report.errors.push(`console: ${m.text()}`); });
page.on("response", r => { if (/\.(png|jpe?g|webp)(\?|$)/.test(r.url())) report.requests.push({ path: new URL(r.url()).pathname, status: r.status() }); });
const state = () => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
async function clickTarget(key, expected) {
  const s = await state(), canvas = await page.locator("canvas").boundingBox();
  const hit = s.interactionTargets.targets[key]?.hit;
  assert.ok(hit && canvas, `Missing target ${key}`);
  await page.mouse.click(canvas.x + s.viewportTransform.offsetX + (hit.x + hit.width / 2) * s.viewportTransform.scale,
    canvas.y + s.viewportTransform.offsetY + (hit.y + hit.height / 2) * s.viewportTransform.scale);
  await page.waitForFunction(expected => { const d = window.__COLOR_ESCAPE__.getDebugState(); return d.screen === expected && !d.navigation.transition; }, expected);
  await page.waitForTimeout(150);
}
async function capture(name) {
  const snapshot = await page.evaluate(() => {
    const g = window.__COLOR_ESCAPE__, original = g.ctx.drawImage, draws = [];
    g.ctx.drawImage = function(image, ...args) {
      const m = this.getTransform();
      draws.push({ path: image.src ? new URL(image.src, location.href).pathname.slice(1) : "canvas",
        width: image.naturalWidth || image.width, height: image.naturalHeight || image.height, args,
        alpha: this.globalAlpha, transform: { a: m.a, b: m.b, c: m.c, d: m.d, e: m.e, f: m.f } });
      return original.call(this, image, ...args);
    };
    try { g.render(); } finally { g.ctx.drawImage = original; }
    const d = g.getDebugState();
    return { screen: d.screen, draws, viewportTransform: d.viewportTransform,
      dataUrl: document.querySelector("canvas").toDataURL("image/png") };
  });
  const bytes = Buffer.from(snapshot.dataUrl.split(",")[1], "base64");
  delete snapshot.dataUrl;
  await writeFile(resolve(output, `${name}.png`), bytes);
  const item = { name, ...snapshot, screenshot: `${name}.png`, screenshotSha256: hash(bytes) };
  if (baseline) {
    const prior = baseline.views.find(v => v.name === name);
    assert.ok(prior, `Missing screenshot baseline ${name}`);
    const normalized = draws => draws.filter(d => targets.includes(canonicalPath(d.path))).map(d => ({ ...d, path: canonicalPath(d.path) }));
    assert.deepEqual(normalized(item.draws), normalized(prior.draws), `Selected image drawing geometry changed: ${name}`);
    assert.deepEqual(item.viewportTransform, prior.viewportTransform, `Viewport geometry changed: ${name}`);
    const old = await sharp(resolve(outputRoot, "before", prior.screenshot)).raw().toBuffer();
    const current = await sharp(bytes).raw().toBuffer();
    assert.equal(current.length, old.length);
    let sum = 0, largeDifferences = 0;
    for (let i = 0; i < current.length; i++) { const d = Math.abs(current[i] - old[i]); sum += d; largeDifferences += d > 16; }
    item.comparison = { selectedImageGeometryPreserved: true, screenshotMeanAbsoluteError: sum / current.length,
      screenshotLargeChannelDifferenceFraction: largeDifferences / current.length };
  }
  report.views.push(item);
}
try {
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__COLOR_ESCAPE__?.artReady && window.__COLOR_ESCAPE__?.storageBaselineReady);
  const updateId = (await state()).updateNotice.id;
  await page.evaluate(updateId => {
    const save = { schemaVersion: 1, currentLevel: 24, highestLevel: 25, coins: 1000,
      sound: false, haptic: false, reducedMotion: true, language: "en", lastSeenUpdate: updateId,
      featureSeen: ["basics"], boosterUnlockSeen: ["time", "rocket", "pulse"], boosters: { time: 3, rocket: 3, pulse: 3 },
      bestStars: Object.fromEntries(Array.from({ length: 24 }, (_, i) => [String(i + 1), i % 3 + 1])), bestMoves: {},
      rewardedLevels: Array.from({ length: 24 }, (_, i) => i + 1), selectedJourneyEpisode: 1,
      journeyProgress: { claimedMilestoneLevels: [10, 15], seenEpisodeUnlockLevels: [11, 21] },
      lifeState: { lives: 5, nextLifeAtMs: 0, unlimitedLivesUntilMs: 0 }, metaDiscovery: { collectionViewedThroughLevel: 24, dailyUnlockSeen: true },
      dailyStreak: 0, lastDailyCompletedDay: "" };
    localStorage.setItem("color-escape-save-v1", JSON.stringify(save));
  }, updateId);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => { const g = window.__COLOR_ESCAPE__; return g?.artReady && g?.storageBaselineReady && !g.getDebugState().navigation.transition; });
  await page.evaluate(() => { const g = window.__COLOR_ESCAPE__; g.updateToastVisible = false; g.boosterUnlockToast = undefined; });
  await capture("home-01");
  await clickTarget("navigation.0", "supply");
  await page.waitForFunction(() => { const p = window.__COLOR_ESCAPE__.getDebugState().art.formalPage; return p.loaded === "supply" && !p.error; });
  await capture("shop");
  await clickTarget("navigation.3", "levels");
  await page.waitForFunction(() => { const p = window.__COLOR_ESCAPE__.getDebugState().art.formalPage; return p.loaded === "levels" && !p.error; });
  await capture("journey");
  await clickTarget("navigation.2", "home");
  await page.evaluate(() => { window.__COLOR_ESCAPE__.save.highestLevel = 100; });
  for (let episode = 2; episode <= 10; episode++) {
    await page.evaluate(async episode => { const g = window.__COLOR_ESCAPE__; g.save.selectedJourneyEpisode = episode; await g.requestJourneyHomeThemeArt(episode); }, episode);
    await page.waitForFunction(episode => window.__COLOR_ESCAPE__.journeyHomeThemeIndex === episode && !window.__COLOR_ESCAPE__.journeyHomeThemeLoading, episode);
    await capture(`home-${String(episode).padStart(2, "0")}`);
  }
  report.browserDecoding = await page.evaluate(async assets => {
    const results = [];
    for (const asset of assets) {
      const image = new Image(); image.src = `/${asset.path}`; await image.decode();
      const canvas = document.createElement("canvas"); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
      const ctx = canvas.getContext("2d", { willReadFrequently: true }); ctx.drawImage(image, 0, 0);
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let transparentPixels = 0, nonOpaquePixels = 0;
      for (let i = 3; i < pixels.length; i += 4) { transparentPixels += pixels[i] === 0; nonOpaquePixels += pixels[i] < 255; }
      results.push({ path: asset.path, width: image.naturalWidth, height: image.naturalHeight, transparentPixels, nonOpaquePixels });
    }
    return results;
  }, report.assets);
  for (const decoded of report.browserDecoding) {
    const asset = report.assets.find(a => a.path === decoded.path);
    assert.deepEqual([decoded.width, decoded.height], [asset.width, asset.height], `Browser native decode ${asset.path}`);
    assert.equal(decoded.transparentPixels, asset.transparentPixels, `Browser transparency ${asset.path}`);
    assert.equal(decoded.nonOpaquePixels, asset.nonOpaquePixels, `Browser alpha ${asset.path}`);
  }
  if (mode === "after") {
    const comparisonPage = await context.newPage();
    report.comparisonPreviews = [];
    for (const asset of report.assets.filter(a => a.selectedForOptimization)) {
      const original = await readFile(resolve(outputRoot, "before/originals", asset.canonical));
      const encoded = await readFile(resolve(root, "public", asset.path));
      const mime = path => /\.jpe?g$/.test(path) ? "image/jpeg" : "image/png";
      await comparisonPage.setContent(`<html><head><style>body{margin:0;background:#1d1d2b;color:white;font:16px sans-serif}.pair{display:flex;width:720px}.image{width:360px;background:repeating-conic-gradient(#777 0% 25%,#aaa 0% 50%) 50% / 20px 20px}.image img{width:360px;height:auto;display:block}h4{height:24px;margin:0;padding:8px;box-sizing:content-box;background:#222}</style></head><body><div class="pair"><div class="image"><h4>Before</h4><img src="data:${mime(asset.canonical)};base64,${original.toString("base64")}"></div><div class="image"><h4>After</h4><img src="data:${mime(asset.path)};base64,${encoded.toString("base64")}"></div></div></body></html>`);
      await comparisonPage.locator("img").evaluateAll(images => Promise.all(images.map(image => image.decode())));
      const filename = `compare-${asset.canonical.replaceAll("/", "_").replace(/\.[^.]+$/, "")}.png`;
      await comparisonPage.locator(".pair").screenshot({ path: resolve(output, filename) });
      report.comparisonPreviews.push({ path: asset.path, screenshot: filename, displayScale: 360 / asset.width });
    }
    await comparisonPage.close();
  }
  assert.deepEqual(report.errors, [], "No page/console errors");
  assert.ok(report.requests.every(r => r.status === 200 || r.status === 304), "No missing image requests");
  report.status = mode === "before" ? "baseline-recorded" : "passed-browser-not-wechat-device";
} catch (error) {
  report.status = "failed"; report.failure = error.stack; process.exitCode = 1;
} finally {
  report.finishedAt = new Date().toISOString();
  await writeFile(resolve(output, "report.json"), JSON.stringify(report, null, 2));
  await context.close(); await browser.close();
}
console.log(JSON.stringify({ status: report.status, assets: report.assets.length, views: report.views.length, errors: report.errors, failure: report.failure, output }, null, 2));
