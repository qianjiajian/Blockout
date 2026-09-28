import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

// Isolated saves only. Every introduction is reached through the actual
// loadLevel -> Home Play Pointer path. No LEVELS/model metadata substitutions,
// fake feature screen, synthetic clocks or pre-opening of the collection guide.
const root = fileURLToPath(new URL("../", import.meta.url));
const output = resolve(root, process.env.PLAYTEST_OUTPUT ?? `playtest-results/feature-intro-policy-${new Date().toISOString().replace(/[:.]/g, "-")}`);
const url = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
const KEY = "color-escape-save-v1", iconPrefix = "assets/art/ui/formal-pages/mechanism-guide-v2/";
const cases = [
  [6, "ice-door", "frozen-exit"], [10, "ice-block", "numeric-ice"], [15, "layer", "multilayer-shell"],
  [20, "shutter", "shutter"], [35, "generator", "generator"], [50, "arrow-block", "axis-block"],
  [60, "key-lock", "key-lock"], [65, "lift", "layered-lift"], [100, "star", "star"],
  [120, "bomb", "bomb"], [150, "flip-door", "flip-door"], [200, "colored-grid", "colored-grid"],
].map(([level, kind, guideId]) => ({ level, kind, guideId }));
const absent = [1, 5, 8, 43, 59, 70, 73, 151];
const files = ["src/game/ColorEscapeGame.ts", "src/game/featureIntroPolicy.ts", "src/game/featureIntroIcon.ts",
  "src/game/localization.ts", "src/game/artManifest.ts", "src/game/formalPageLayout.ts", "src/core/mechanismCatalog.ts",
  "src/core/levels.ts", "src/core/PuzzleModel.ts", "src/platform/WebHost.ts", "docs/rules/manifest.json", "docs/mechanism-rules-v1.16.0.md",
  "tools/playtest-feature-intro-policy.mjs", ...cases.map(({ guideId }) => `public/${iconPrefix}icon-${guideId}.png`)];
const hashes = async () => Object.fromEntries(await Promise.all(files.map(async f => [f, createHash("sha256").update(await readFile(resolve(root, f))).digest("hex")])));
const beforeHashes = await hashes();
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [], errors = [], requests = [];
let context, page, scenario = "setup";
const debug = () => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const stored = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
const ready = () => page.waitForFunction(() => {
  const g = window.__COLOR_ESCAPE__, d = g?.getDebugState();
  return d?.storage?.baselineReady && d.art.ready && !g.revisedArtLoading;
}, undefined, { timeout: 25000 });
const screen = value => page.waitForFunction(v => window.__COLOR_ESCAPE__?.getDebugState().screen === v, value, { timeout: 12000 });
async function target(name) {
  const d = await debug(), r = d.interactionTargets.targets[name]?.hit, box = await page.locator("canvas").boundingBox();
  assert.ok(r && box, `Missing Pointer target ${name}`);
  return { x: box.x + d.viewportTransform.offsetX + (r.x + r.width / 2) * d.viewportTransform.scale,
    y: box.y + d.viewportTransform.offsetY + (r.y + r.height / 2) * d.viewportTransform.scale };
}
async function click(name) { const p = await target(name); await page.mouse.click(p.x, p.y); }
async function openHome(level) {
  await page.evaluate(id => window.__COLOR_ESCAPE__.loadLevel(id, false), level);
  await screen("home"); await ready();
  assert.equal((await debug()).level.id, level);
  const unchanged = await page.evaluate(async id => {
    const { LEVELS } = await import("/src/core/levels.ts");
    return JSON.stringify(window.__COLOR_ESCAPE__.model.level) === JSON.stringify(LEVELS.find(l => l.id === id));
  }, level);
  assert.equal(unchanged, true, "The tested model must hold the unchanged formal LEVELS record");
  await page.evaluate(() => { window.__POLICY_IMAGES__ = []; window.__POLICY_TEXT__ = []; window.__POLICY_LOADS__ = []; });
}
async function installProbe() {
  await page.evaluate(() => {
    const g = window.__COLOR_ESCAPE__, original = g.drawFeature;
    g.drawFeature = function (...args) {
      window.__POLICY_IN_FEATURE__ = true;
      try { return original.apply(this, args); } finally { window.__POLICY_IN_FEATURE__ = false; }
    };
  });
}
async function setup(language = "zh-CN", viewport = { width: 390, height: 844 }, featureSeen = ["basics"]) {
  context = await browser.newContext({ viewport }); page = await context.newPage();
  page.on("pageerror", error => errors.push({ scenario, type: "pageerror", text: error.message }));
  page.on("console", m => { if (m.type() === "error") errors.push({ scenario, type: "console", text: m.text() }); });
  page.on("request", r => { const p = new URL(r.url()).pathname.replace(/^\/+/, ""); if (p.startsWith(iconPrefix)) requests.push({ scenario, path: p }); });
  await page.addInitScript(() => {
    window.__POLICY_IMAGES__ = []; window.__POLICY_TEXT__ = []; window.__POLICY_LOADS__ = [];
    const src = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, "src");
    Object.defineProperty(HTMLImageElement.prototype, "src", { ...src, set(value) {
      const p = new URL(String(value), location.href).pathname.replace(/^\/+/, "");
      if (p.startsWith("assets/art/ui/formal-pages/mechanism-guide-v2/")) window.__POLICY_LOADS__.push(p);
      return src.set.call(this, value);
    } });
    const draw = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function (image, ...args) {
      if (window.__POLICY_IN_FEATURE__) window.__POLICY_IMAGES__.push({ source: String(image?.currentSrc || image?.src || ""),
        args, width: image.naturalWidth || image.width, height: image.naturalHeight || image.height, alpha: this.globalAlpha });
      return draw.call(this, image, ...args);
    };
    const text = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (value, x, y, maxWidth) {
      if (window.__POLICY_IN_FEATURE__) {
        const m = this.measureText(value), transform = this.getTransform();
        window.__POLICY_TEXT__.push({ text: String(value), x, y, font: this.font, baseline: this.textBaseline,
          align: this.textAlign, width: m.width, maxWidth, ascent: m.actualBoundingBoxAscent, descent: m.actualBoundingBoxDescent,
          transform: { a: transform.a, d: transform.d, e: transform.e, f: transform.f } });
      }
      return maxWidth === undefined ? text.call(this, value, x, y) : text.call(this, value, x, y, maxWidth);
    };
  });
  await page.goto(url, { waitUntil: "networkidle" }); await ready();
  const updateId = (await debug()).updateNotice.id;
  await page.evaluate(({ key, language, updateId, featureSeen }) => localStorage.setItem(key, JSON.stringify({
    schemaVersion: 1, currentLevel: 1, highestLevel: 200, coins: 1000, language,
    sound: false, haptic: false, reducedMotion: true, featureSeen,
    boosters: { time: 3, rocket: 3, pulse: 3 }, boosterUnlockSeen: ["time", "rocket", "pulse"],
    bestStars: {}, bestMoves: {}, rewardedLevels: [], lastSeenUpdate: updateId,
    lifeState: { lives: 5, nextLifeAtMs: 0, unlimitedLivesUntilMs: Date.now() + 3600000 },
    dailyStreak: 0, lastDailyCompletedDay: "",
  })), { key: KEY, language, updateId, featureSeen });
  await page.reload({ waitUntil: "networkidle" }); await ready(); await screen("home");
  assert.deepEqual(await page.evaluate(() => window.__POLICY_LOADS__), [], "Home must not preload the guide");
  await installProbe();
}
async function runIntro(item, language, viewport, checkRepeat = true, quick = false) {
  scenario = `${language}-${viewport.width}x${viewport.height}-lv${item.level}-${item.kind}`;
  await openHome(item.level);
  const seenBefore = (await stored()).featureSeen;
  assert.equal(seenBefore.includes(item.kind), false);
  const expected = await page.evaluate(async ({ guideId, kind, language }) => {
    const { MECHANISM_GUIDE } = await import("/src/core/mechanismCatalog.ts");
    const { GAME_ART } = await import("/src/game/artManifest.ts");
    const { featureIntroIconPath } = await import("/src/game/featureIntroIcon.ts");
    const { translate } = await import("/src/game/localization.ts");
    const { STATUS_OVERLAY_LAYOUT } = await import("/src/game/formalPageLayout.ts");
    return { path: GAME_ART.ui.formalPages.collection.itemImages[MECHANISM_GUIDE.find(g => g.id === guideId).atlasIndex],
      actualPath: featureIntroIconPath(kind), description: translate(language, `collection.mechanism.${guideId}.effect`),
      layout: STATUS_OVERLAY_LAYOUT.feature };
  }, { ...item, language });
  assert.equal(expected.actualPath, expected.path);
  await click("homePlay"); await screen("feature");
  await page.waitForFunction(path => window.__POLICY_IMAGES__.some(i => new URL(i.source, location.href).pathname.replace(/^\/+/, "") === path), expected.path);
  const before = await debug(), wallStart = Date.now();
  assert.equal(before.puzzle.started, false); assert.equal(before.puzzle.remainingSeconds, before.level.timeSeconds);
  await page.waitForTimeout(quick ? 20 : 420);
  const paused = await debug();
  assert.equal(paused.screen, "feature"); assert.equal(paused.puzzle.remainingSeconds, before.puzzle.remainingSeconds);
  assert.deepEqual(paused.puzzle.blocks, before.puzzle.blocks, "Bomb/ice state must remain unchanged under the modal");
  const pausedWallMs = Date.now() - wallStart;
  let visibilityEvidence;
  if (item.kind === "bomb" && language === "zh-CN" && viewport.width === 390) {
    // Explicit lifecycle probe: synthetic document visibility through the real
    // WebHost; no OS-background or phone claim and no fake model clock.
    await page.evaluate(() => { Object.defineProperty(document, "hidden", { configurable: true, get: () => true }); document.dispatchEvent(new Event("visibilitychange")); });
    const hidden = await debug(); await page.waitForTimeout(260); const later = await debug();
    assert.equal(await page.evaluate(() => window.__COLOR_ESCAPE__.appVisible), false); assert.equal(later.screen, "feature");
    assert.equal(later.puzzle.remainingSeconds, before.puzzle.remainingSeconds);
    assert.deepEqual(later.puzzle.blocks, before.puzzle.blocks);
    await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event("visibilitychange")); });
    await screen("feature"); visibilityEvidence = "Synthetic document.hidden event through production WebHost; clocks unchanged";
  }
  const probe = await page.evaluate(() => ({ images: window.__POLICY_IMAGES__, text: window.__POLICY_TEXT__, loads: window.__POLICY_LOADS__ }));
  const icons = probe.images.filter(i => new URL(i.source, url).pathname.replace(/^\/+/, "") === expected.path);
  assert.ok(icons.length > 0); assert.deepEqual(probe.loads, [expected.path]);
  for (const icon of icons) {
    assert.equal(icon.args.length, 4); assert.equal(icon.alpha, 1);
    const [x, y, width, height] = icon.args, scale = Math.min(190 / icon.width, 190 / icon.height);
    for (const [actual, value] of [[width, icon.width * scale], [height, icon.height * scale], [x + width / 2, 352], [y + height / 2, 622]]) assert.ok(Math.abs(actual - value) < .001);
  }
  const lines = [...new Map(probe.text.filter(t => t.align === "left" && Math.abs(t.x - expected.layout.description.x) < 1).map(t => [`${t.x}:${t.y}:${t.text}`, t])).values()].sort((a, b) => a.y - b.y);
  assert.ok(lines.length > 0, "Description must actually be drawn");
  const normalize = s => s.replace(/\s/g, "");
  assert.equal(normalize(lines.map(t => t.text).join("")), normalize(expected.description), "Complete localized guide explanation, not a truncated/key string");
  assert.equal(probe.text.some(t => /(?:collection\.mechanism\.|feature\.description\.)/.test(t.text)), false);
  for (const line of lines) {
    assert.ok(Math.min(line.width, line.maxWidth ?? Infinity) <= expected.layout.description.maxWidth + 1, `Description line overflows horizontally: ${line.text}`);
    assert.ok(line.y + line.descent < expected.layout.button.y - 8, `Description overlaps button: ${JSON.stringify(line)}`);
  }
  await page.screenshot({ path: resolve(output, `${scenario}.png`) });
  const p = await target("featurePrimary"); await page.mouse.move(p.x, p.y); await page.mouse.down();
  if (!quick) await page.waitForTimeout(100);
  assert.equal((await debug()).screen, "feature"); assert.equal((await debug()).puzzle.remainingSeconds, before.puzzle.remainingSeconds);
  await page.mouse.up(); await screen("playing"); await ready();
  await page.waitForFunction(() => window.__COLOR_ESCAPE__.getDebugState().puzzle.started);
  assert.equal((await stored()).featureSeen.filter(k => k === item.kind).length, 1);
  for (const prior of seenBefore) assert.ok((await stored()).featureSeen.includes(prior));
  if (!quick) {
    const running = (await debug()).puzzle.remainingSeconds; await page.waitForTimeout(220);
    assert.ok((await debug()).puzzle.remainingSeconds < running, "Natural clock resumes after confirmation");
  }
  if (checkRepeat) { await openHome(item.level); await click("homePlay"); await screen("playing"); await ready(); assert.equal((await stored()).featureSeen.filter(k => k === item.kind).length, 1); }
  results.push({ scenario, status: "PASS", ...item, language, viewport, expectedPath: expected.path,
    description: expected.description, lines, minimumLogicalFont: Math.min(...lines.map(l => Number(/([\d.]+)px/.exec(l.font)?.[1]))),
    icon: icons.at(-1), pausedWallMs, remainingBefore: before.puzzle.remainingSeconds, visibilityEvidence,
    coverage: quick ? "Actual Home Pointer + full-text and layout, no sustained clock sample" : "Actual Home Pointer + natural modal clock + acknowledgement" });
  console.log(`PASS ${scenario}`);
}
async function runAbsent(level, reason = "not-scheduled") {
  scenario = `${reason}-lv${level}`; await openHome(level); await click("homePlay"); await screen("playing"); await ready();
  assert.deepEqual(await page.evaluate(() => window.__POLICY_IMAGES__), []);
  assert.deepEqual(await page.evaluate(() => window.__POLICY_LOADS__), []);
  results.push({ scenario, status: "PASS", level, reason }); console.log(`PASS ${scenario}`);
}
async function runDirectLifecycle(fromLevel, toLevel, kind) {
  scenario = `direct-lifecycle-fixture-${fromLevel}-to-${toLevel}`;
  await openHome(fromLevel); await click("homePlay"); await screen("playing"); await ready();
  await page.evaluate(({ fromLevel, toLevel }) => {
    const g = window.__COLOR_ESCAPE__;
    // State preparation only, not a claimed real completion or campaign path.
    // Production natural frames own the switch, loadLevel and popup decision.
    g.directLevelTransition = { fromLevel, toLevel, age: 0, reducedMotion: g.save.reducedMotion, switched: false };
    g.dirty = true; g.scheduleFrame();
  }, { fromLevel, toLevel });
  await page.waitForFunction(({ level, kind }) => {
    const d = window.__COLOR_ESCAPE__.getDebugState();
    return d.level.id === level && !d.completionFlow.directTransition && d.screen === (kind ? "feature" : "playing");
  }, { level: toLevel, kind });
  if (kind) {
    await page.waitForFunction(() => window.__POLICY_IMAGES__.some(i => i.source.includes("icon-bomb.png")));
    const before = await debug(); assert.equal(before.puzzle.started, false);
    await page.waitForTimeout(240); assert.equal((await debug()).puzzle.remainingSeconds, before.puzzle.remainingSeconds);
    await page.screenshot({ path: resolve(output, `${scenario}.png`) });
    await click("featurePrimary"); await screen("playing"); await ready();
    assert.ok((await stored()).featureSeen.includes(kind));
    await page.reload({ waitUntil: "networkidle" }); await ready(); await installProbe();
    await openHome(toLevel); await click("homePlay"); await screen("playing");
  } else assert.deepEqual(await page.evaluate(() => window.__POLICY_IMAGES__), []);
  results.push({ scenario, status: "PASS", fromLevel, toLevel, kind,
    coverage: "Explicit direct-transition lifecycle fixture, not a solved/ordinary reachable campaign transition; natural production frames and real confirmation Pointer" });
  console.log(`PASS ${scenario}`);
}
try {
  const viewport = { width: 390, height: 844 };
  await setup("zh-CN", viewport);
  for (const item of cases) await runIntro(item, "zh-CN", viewport);
  for (const level of absent) await runAbsent(level);
  await page.reload({ waitUntil: "networkidle" }); await ready(); await installProbe();
  for (const level of [60, 120, 150, 200]) await runAbsent(level, "seen-after-reload");
  await context.close(); context = undefined;
  await setup("zh-CN", viewport, ["basics", "key-lock"]); await runAbsent(60, "legacy-seen-key-lock");
  assert.deepEqual((await stored()).featureSeen.sort(), ["basics", "key-lock"]); await context.close(); context = undefined;
  await setup("zh-CN", viewport);
  await runDirectLifecycle(119, 120, "bomb"); await runDirectLifecycle(58, 59);
  await context.close(); context = undefined;
  for (const language of ["zh-CN", "en", "zh-TW", "ja", "ko", "es", "pt", "fr", "de", "ru"]) {
    const narrow = { width: 320, height: 568 }; await setup(language, narrow);
    for (const item of cases.slice(-3)) await runIntro(item, language, narrow, false);
    for (const item of cases.slice(0, -3)) await runIntro(item, language, narrow, false, true);
    await context.close(); context = undefined;
  }
  assert.deepEqual(errors, []);
  const afterHashes = await hashes(); assert.deepEqual(afterHashes, beforeHashes, "Bound source/art/policy changed during test");
  await writeFile(resolve(output, "report.json"), JSON.stringify({ status: "PASS", isolatedStorage: true,
    actualHomePointerTrigger: true, modelMetadataUntouched: true, sources: afterHashes, results, errors, requests,
    worstFont: results.filter(r => r.minimumLogicalFont).sort((a, b) => a.minimumLogicalFont - b.minimumLogicalFont).slice(0, 10).map(({ scenario, minimumLogicalFont }) => ({ scenario, minimumLogicalFont })) }, null, 2));
  console.log(JSON.stringify({ status: "PASS", scenarios: results.length, output }));
} catch (error) {
  if (page && !page.isClosed()) await page.screenshot({ path: resolve(output, "failure.png") }).catch(() => {});
  await writeFile(resolve(output, "report.json"), JSON.stringify({ status: "FAIL", scenario, error: String(error), stack: error.stack,
    sourcesBefore: beforeHashes, sourcesAfter: await hashes().catch(() => null), results, errors,
    state: page && !page.isClosed() ? await debug().catch(() => null) : null }, null, 2));
  console.error(JSON.stringify({ status: "FAIL", scenario, error: String(error), output })); process.exitCode = 1;
} finally { await context?.close(); await browser.close(); }
