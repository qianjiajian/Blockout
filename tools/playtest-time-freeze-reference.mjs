import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { chromium } from "playwright";

// Isolated synthetic profiles only. No Date/rAF acceleration or direct FX trigger.
// Start a preview separately; this tool never builds/replaces the application.
const url = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5198/";
const output = resolve(process.env.TIME_FREEZE_OUTPUT ?? `playtest-results/time-freeze-animation-20261008-${Date.now()}`);
await mkdir(output, { recursive: true });
const html = await readFile("dist/index.html", "utf8");
const bundle = html.match(/assets\/(game-[^\s"'/?]+\.js)/)?.[1];
assert.ok(bundle, "Current Web bundle exists");
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const report = { status: "RUNNING", url, bundle, naturalClock: true, isolatedSyntheticSavesOnly: true,
  bundleSha256: sha256(await readFile(resolve("dist/assets", bundle))),
  setup: "Official Lv4; short-clock case clones its exact layout with timeSeconds=9, for warning UI only.",
  visibilityCoverage: "Synthetic document.hidden/visibilitychange through the production WebHost; not an OS background test.",
  sourceSha256: createHash("sha256").update(await readFile("src/game/ColorEscapeGame.ts")).digest("hex"),
  animationSourceSha256: createHash("sha256").update(await readFile("src/game/timeFreezeAnimation.ts")).digest("hex"),
  scenarios: [], errors: [] };
const browser = await chromium.launch({ headless: true });
const viewports = [{ width: 320, height: 568 }, { width: 496, height: 1078 }];
let activePage;
const state = (page) => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const snapshot = (s) => ({ screen: s.screen, levelId: s.level.id, stock: s.economy.boosters.time,
  lives: s.lives.lives, clock: s.puzzle.remainingSeconds, freeze: s.puzzle.timeFreezeSeconds,
  started: s.puzzle.started, moves: s.puzzle.moves, fx: s.timeFreezeAnimation, warning: s.countdownWarning });
const logicalPoint = async (page, point) => {
  const d = await state(page), box = await page.locator("canvas").boundingBox();
  assert.ok(box, "canvas exists");
  return { x: box.x + d.viewportTransform.offsetX + point.x * d.viewportTransform.scale,
    y: box.y + d.viewportTransform.offsetY + point.y * d.viewportTransform.scale };
};
const click = async (page, key) => {
  const d = await state(page), targets = d.interactionTargets.targets ?? d.interactionTargets;
  const r = targets[key]?.hit;
  assert.ok(r, `real Pointer target ${key} exists`);
  const point = await logicalPoint(page, { x: r.x + r.width / 2, y: r.y + r.height / 2 });
  await page.mouse.click(point.x, point.y);
};
const idleFx = (s) => {
  assert.equal(s.puzzle.timeFreezeSeconds, 0);
  assert.equal(s.timeFreezeAnimation.visible, false);
};
const spatial = (s) => JSON.stringify(Object.fromEntries(["blocks", "gates", "shutters", "generators", "flipDoors", "coloredGrids"]
  .map((key) => [key, s.puzzle[key]])));
async function prepare(viewport, reducedMotion = false) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  await context.addInitScript(({ reducedMotion }) => {
    // This is a new temporary browser profile, not the user's app profile.
    if (!localStorage.getItem("color-escape-save-v1")) localStorage.setItem("color-escape-save-v1", JSON.stringify({
      schemaVersion: 1, currentLevel: 4, highestLevel: 21, coins: 777,
      sound: false, music: false, haptic: false, reducedMotion, language: "zh-CN",
      featureSeen: ["basics", "ice-door", "ice-block", "layer", "shutter"],
      boosterUnlockSeen: ["time", "rocket", "pulse"], boosterUsageSeen: ["time", "rocket", "pulse"],
      boosters: { time: 9, rocket: 3, pulse: 3 }, bestStars: {}, bestMoves: {},
      rewardedLevels: Array.from({ length: 20 }, (_, i) => i + 1),
      collectionIntroPending: false, collectionIntroShown: true, leagueIntroSeen: true,
      journeyProgress: { claimedMilestoneLevels: [5, 10, 15, 20], seenEpisodeUnlockLevels: [1, 11, 21] },
    }));
    window.__timerDrawAudit = [];
    const proto = CanvasRenderingContext2D.prototype;
    const fill = proto.fill, fillText = proto.fillText;
    proto.fill = function (...args) {
      if (["#e52c41", "#ff6337"].includes(this.fillStyle)) {
        const d = window.__COLOR_ESCAPE__?.getDebugState();
        if (d) window.__timerDrawAudit.push({ kind: "warningFill", color: this.fillStyle,
          freeze: d.puzzle.timeFreezeSeconds, phase: d.timeFreezeAnimation?.phase,
          fxVisible: d.timeFreezeAnimation?.visible, at: performance.now() });
      }
      return fill.apply(this, args);
    };
    proto.fillText = function (text, ...args) {
      if (/^\d{2}:\d{2}$/.test(String(text))) {
        const d = window.__COLOR_ESCAPE__?.getDebugState();
        if (d) window.__timerDrawAudit.push({ kind: "timerText", color: this.fillStyle,
          freeze: d.puzzle.timeFreezeSeconds, phase: d.timeFreezeAnimation?.phase,
          fxVisible: d.timeFreezeAnimation?.visible, at: performance.now() });
      }
      return fillText.call(this, text, ...args);
    };
  }, { reducedMotion });
  const page = await context.newPage();
  activePage = page;
  page.on("pageerror", (e) => report.errors.push({ viewport, message: e.message }));
  page.on("console", (m) => { if (m.type() === "error") report.errors.push({ viewport, message: m.text() }); });
  await page.goto(url, { waitUntil: "domcontentloaded" });
  const scripts = await page.locator("script[src]").evaluateAll((nodes) => nodes.map((node) => node.src));
  assert.ok(scripts.some((src) => src.endsWith(bundle)), "Exact latest build loaded");
  await page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().art.ready);
  // Public debug level loader prepares a real level; only Pointer events use boosters.
  await page.evaluate(() => window.__COLOR_ESCAPE__.loadLevel(4, true));
  await page.waitForFunction(() => {
    const s = window.__COLOR_ESCAPE__.getDebugState();
    return s.screen === "playing" && s.level.id === 4 && s.art.formalGameplay.missingWholeBlockIds.length === 0;
  });
  assert.equal((await state(page)).economy.boosters.time, 9);
  idleFx(await state(page));
  return { context, page };
}
async function hide(page, hidden) {
  await page.evaluate((hidden) => {
    if (hidden) Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
    else delete document.hidden;
    document.dispatchEvent(new Event("visibilitychange"));
  }, hidden);
}
async function verifyHold(page, label) {
  const before = await state(page);
  await page.waitForTimeout(650);
  const after = await state(page);
  assert.equal(after.puzzle.timeFreezeSeconds, before.puzzle.timeFreezeSeconds, `${label} holds effect balance`);
  assert.equal(after.puzzle.remainingSeconds, before.puzzle.remainingSeconds, `${label} holds main clock`);
  assert.equal(after.timeFreezeAnimation.age, before.timeFreezeAnimation.age, `${label} holds animation age`);
  return { before: snapshot(before), after: snapshot(after) };
}
try {
  for (const viewport of viewports) {
    const { context, page } = await prepare(viewport), name = `natural-ten-seconds-${viewport.width}`;
    const before = await state(page);
    await click(page, "booster.time");
    const used = await state(page);
    // Anchor to the real observed FX age, excluding Pointer target lookup time.
    // This only schedules observations; neither browser nor model time is changed.
    const startMs = Date.now() - used.timeFreezeAnimation.age * 1000;
    assert.equal(used.economy.boosters.time, 8);
    assert.ok(used.puzzle.timeFreezeSeconds > 9.5 && used.puzzle.timeFreezeSeconds <= 10);
    assert.equal(used.puzzle.moves, before.puzzle.moves);
    assert.equal(spatial(used), spatial(before));
    const frames = [];
    for (const seconds of [0.2, 0.75, 1.3, 1.7, 2.1, 3, 9.5, 10.4]) {
      await page.waitForTimeout(Math.max(0, seconds * 1000 - (Date.now() - startMs)));
      const current = await state(page);
      if (seconds <= 9.5) {
        assert.ok(current.puzzle.timeFreezeSeconds > 0);
        assert.equal(current.puzzle.remainingSeconds, used.puzzle.remainingSeconds);
      }
      const file = `${name}-${String(seconds).replace(".", "p")}s.png`;
      const screenshotStartSeconds = (Date.now() - startMs) / 1000;
      await page.screenshot({ path: resolve(output, file) });
      const afterScreenshot = await state(page);
      frames.push({ requestedSeconds: seconds, actualWallSeconds: (Date.now() - startMs) / 1000,
        screenshotStartSeconds, file, state: snapshot(current), afterScreenshot: snapshot(afterScreenshot) });
    }
    await page.waitForFunction(() => {
      const s = window.__COLOR_ESCAPE__.getDebugState();
      return s.puzzle.timeFreezeSeconds === 0 && !s.timeFreezeAnimation.visible;
    });
    const ended = await state(page);
    assert.equal(ended.economy.boosters.time, 8);
    assert.ok(ended.puzzle.remainingSeconds < used.puzzle.remainingSeconds);
    report.scenarios.push({ name, status: "PASS", before: snapshot(before), used: snapshot(used), frames, ended: snapshot(ended) });
    await context.close();
  }

  for (const viewport of viewports) {
    const { context, page } = await prepare(viewport), name = `lifecycle-${viewport.width}`;
    await click(page, "booster.time");
    await page.waitForTimeout(750);
    const beforeRepeat = await state(page);
    await click(page, "booster.time");
    const repeated = await state(page);
    assert.equal(repeated.economy.boosters.time, 8);
    assert.ok(repeated.timeFreezeAnimation.age >= beforeRepeat.timeFreezeAnimation.age, "Repeated click cannot restart the animation");
    assert.ok(repeated.puzzle.timeFreezeSeconds <= beforeRepeat.puzzle.timeFreezeSeconds);
    await click(page, "pause");
    assert.equal((await state(page)).screen, "paused");
    const paused = await verifyHold(page, "pause");
    await click(page, "pauseResume");
    await page.waitForTimeout(150);
    assert.ok((await state(page)).timeFreezeAnimation.age > paused.after.fx.age);
    await hide(page, true);
    const hidden = await verifyHold(page, "visibility hide");
    await hide(page, false);
    assert.equal((await state(page)).screen, "paused");
    await click(page, "pauseResume");
    await page.waitForTimeout(150);
    const resumed = await state(page);
    assert.ok(resumed.timeFreezeAnimation.age > hidden.after.fx.age);
    await click(page, "undo");
    const undone = await state(page);
    idleFx(undone);
    assert.equal(undone.economy.boosters.time, 9);
    await click(page, "booster.time");
    await page.waitForTimeout(200);
    await page.evaluate(() => window.__COLOR_ESCAPE__.loadLevel(5, true));
    const changed = await state(page);
    assert.equal(changed.level.id, 5);
    idleFx(changed);
    report.scenarios.push({ name, status: "PASS", beforeRepeat: snapshot(beforeRepeat), repeated: snapshot(repeated),
      paused, hidden, resumed: snapshot(resumed), undone: snapshot(undone), changed: snapshot(changed) });
    await context.close();
  }

  for (const viewport of viewports) {
    const { context, page } = await prepare(viewport, true), name = `reduced-motion-${viewport.width}`;
    await click(page, "booster.time");
    const frames = [];
    for (const milliseconds of [200, 550, 700]) {
      await page.waitForTimeout(milliseconds);
      const current = await state(page);
      assert.equal(current.economy.boosters.time, 8);
      assert.ok(current.puzzle.timeFreezeSeconds > 0);
      assert.equal(current.timeFreezeAnimation.visible, true);
      assert.equal(current.timeFreezeAnimation.reducedMotion, true);
      assert.equal(current.timeFreezeAnimation.phase, "frozen", "Reduced motion skips launch, hover, flight and burst");
      frames.push(snapshot(current));
    }
    await page.screenshot({ path: resolve(output, `${name}.png`) });
    report.scenarios.push({ name, status: "PASS", frames });
    await context.close();
  }

  for (const viewport of viewports) {
    const { context, page } = await prepare(viewport), name = `critical-warning-${viewport.width}`;
    // Explicit UI-only fixture, identical official geometry/blocks with a 9s clock.
    await page.evaluate(() => {
      const g = window.__COLOR_ESCAPE__, spec = { ...g.getDebugState().level, timeSeconds: 9 };
      g.loadLevel(4, true, false, spec);
    });
    const initial = await state(page);
    const id = await page.evaluate(() => {
      const g = window.__COLOR_ESCAPE__;
      return g.model.snapshot().blocks.find((block) => g.model.possibleExitSides(block).length > 0)?.id;
    });
    assert.ok(id, "Named short-clock fixture has a real direct-exit start action");
    const block = initial.puzzle.blocks.find((candidate) => candidate.id === id), [x, y] = block.shape[0];
    const point = await logicalPoint(page, { x: initial.board.innerX + (block.x + x + 0.5) * initial.board.cell,
      y: initial.board.innerY + (block.y + y + 0.5) * initial.board.cell });
    await page.mouse.click(point.x, point.y);
    await page.waitForFunction(() => window.__COLOR_ESCAPE__.getDebugState().countdownWarning.stage === "critical");
    const warning = await state(page);
    await page.screenshot({ path: resolve(output, `${name}-before.png`) });
    await click(page, "booster.time");
    await page.waitForTimeout(2400);
    const frozen = await state(page);
    assert.equal(frozen.economy.boosters.time, 8);
    assert.ok(frozen.puzzle.timeFreezeSeconds > 0);
    await page.screenshot({ path: resolve(output, `${name}-frozen.png`) });
    await page.waitForFunction(() => window.__COLOR_ESCAPE__.getDebugState().timeFreezeAnimation.phase === "ending");
    const ending = await state(page);
    await page.screenshot({ path: resolve(output, `${name}-ending.png`) });
    await page.waitForFunction(() => !window.__COLOR_ESCAPE__.getDebugState().timeFreezeAnimation.visible);
    await page.waitForTimeout(150);
    const thawed = await state(page), audit = await page.evaluate(() => window.__timerDrawAudit);
    idleFx(thawed);
    assert.ok(audit.some((entry) => entry.phase === "ending"), "Natural fade-out was actually rendered");
    assert.ok(audit.some((entry) => entry.kind === "warningFill" && entry.freeze === 0), "Control: warning was really drawn before freezing");
    assert.equal(audit.filter((entry) => entry.kind === "warningFill" && entry.fxVisible).length, 0,
      "No warning red/orange fill is drawn over active or fading blue freeze UI");
    const frozenDigits = audit.filter((entry) => entry.kind === "timerText" && entry.fxVisible);
    assert.ok(frozenDigits.length > 10);
    assert.ok(frozenDigits.every((entry) => entry.color === "#eeffff"));
    const lastFadeAt = Math.max(...audit.filter((entry) => entry.phase === "ending").map((entry) => entry.at));
    assert.ok(audit.some((entry) => entry.at > lastFadeAt && entry.kind === "warningFill" && !entry.fxVisible),
      "Critical warning resumes after the frost completely fades");
    await page.screenshot({ path: resolve(output, `${name}-thawed.png`) });
    report.scenarios.push({ name, status: "PASS", namedFixture: "Lv4 official layout / 9 second timer", warning: snapshot(warning),
      frozen: snapshot(frozen), ending: snapshot(ending), thawed: snapshot(thawed), audit });
    await context.close();
  }
  assert.deepEqual(report.errors, []);
  report.status = "PASS";
} catch (error) {
  report.status = "FAIL";
  report.failure = error.stack ?? String(error);
  if (activePage && !activePage.isClosed()) {
    const lastState = await state(activePage).catch(() => undefined);
    if (lastState) report.lastState = snapshot(lastState);
    await activePage.screenshot({ path: resolve(output, "failure.png") }).catch(() => {});
  }
  process.exitCode = 1;
} finally {
  report.finalSourceSha256 = sha256(await readFile("src/game/ColorEscapeGame.ts"));
  report.finalAnimationSourceSha256 = sha256(await readFile("src/game/timeFreezeAnimation.ts"));
  report.finalBundle = (await readFile("dist/index.html", "utf8")).match(/assets\/(game-[^\s"'/?]+\.js)/)?.[1];
  report.finalBundleSha256 = report.finalBundle ? sha256(await readFile(resolve("dist/assets", report.finalBundle))) : null;
  report.bundleStable = report.finalBundle === report.bundle && report.finalBundleSha256 === report.bundleSha256;
  report.sourceStable = report.finalSourceSha256 === report.sourceSha256
    && report.finalAnimationSourceSha256 === report.animationSourceSha256;
  if (!report.bundleStable) {
    report.status = "FAIL_BUILD_CHANGED";
    report.failure = "Build changed during validation; scenarios do not certify a single final build.";
    process.exitCode = 1;
  } else if (!report.sourceStable) {
    report.sourceDriftWarning = "Browser scenarios certify only the recorded built bundle; newer source requires a fresh build and validation.";
  }
  await writeFile(resolve(output, "report.json"), JSON.stringify(report, null, 2));
  await browser.close();
}
console.log(JSON.stringify({ status: report.status, scenarios: report.scenarios.length,
  report: resolve(output, "report.json"), errors: report.errors.length, failure: report.failure }, null, 2));
