import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { chromium } from "playwright";
import { build } from "esbuild";

// Always use a fresh, isolated browser context: no user browser or real save is opened.
// Run against a separately started preview of the current dist, not a stale live dev tab.
const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5198/";
const output = resolve(process.env.FIRST_LAUNCH_OUTPUT ?? `playtest-results/early-campaign-entry-20261008-${Date.now()}`);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const report = { status: "RUNNING", playtestUrl, sourceSha256: createHash("sha256").update(await readFile("src/game/ColorEscapeGame.ts")).digest("hex"),
  isolatedContexts: true, naturalClock: true, syntheticOrAbsentSaveOnly: true, scenarios: [], warnings: [], errors: [] };
const state = (page) => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const ready = (page) => page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().art.ready);
const pagePoint = async (page, logical) => {
  const current = await state(page), bounds = await page.locator("canvas").boundingBox();
  assert.ok(bounds, "canvas bounds exist");
  return { x: bounds.x + current.viewportTransform.offsetX + logical.x * current.viewportTransform.scale,
    y: bounds.y + current.viewportTransform.offsetY + logical.y * current.viewportTransform.scale };
};
const clickTarget = async (page, name) => {
  const current = await state(page), targets = current.interactionTargets?.targets ?? current.interactionTargets;
  const rect = targets?.[name]?.hit;
  assert.ok(rect, `real interaction target exists: ${name}`);
  const point = await pagePoint(page, { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 });
  await page.mouse.click(point.x, point.y);
};
const assertFreshIdle = (current) => {
  assert.equal(current.screen, "playing");
  assert.equal(current.level.id, 1);
  assert.equal(current.puzzle.started, false);
  assert.equal(current.puzzle.moves, 0);
  assert.equal(current.lives.lives, 5);
  assert.equal(current.lives.attemptStarted, false);
  assert.equal(current.onboarding.basicsSeen, false);
  assert.equal(current.art.ready, true);
  assert.equal(current.storage.baselineReady, true);
  assert.deepEqual(current.art.formalGameplay.missingWholeBlockIds, []);
};
const openingPoint = (current, scenario) => {
  if (current.onboarding.guide?.start) return current.onboarding.guide.start;
  // Keep a defensive fallback for a build that does not expose the authored
  // onboarding guide; do not patch the level just to make this entry test pass.
  report.warnings.push({ scenario, code: "EXISTING_LEVEL_1_GUIDE_MISSING",
    levelHasOnboardingHint: Boolean(current.level.onboardingHint), guideVisible: false });
  // Exercise a real ordinary block already touching its matching open gate.
  const block = current.puzzle.blocks.find((candidate) => current.puzzle.gates.some((gate) => {
    if (gate.color !== candidate.color || gate.frozen > 0 || candidate.frozen > 0) return false;
    const cells = candidate.shape.map(([x, y]) => [candidate.x + x, candidate.y + y]);
    return gate.side === "right" && Math.max(...cells.map(([x]) => x)) === current.puzzle.width - 1
      && cells.every(([, y]) => y >= gate.offset && y < gate.offset + gate.size);
  }));
  assert.ok(block, "Level 1 has an existing direct-exit block for real input verification");
  const [x, y] = block.shape[0];
  return { x: current.board.innerX + (block.x + x + 0.5) * current.board.cell,
    y: current.board.innerY + (block.y + y + 0.5) * current.board.cell };
};
const performOpeningGesture = async (page, current, scenario) => {
  const guide = current.onboarding.guide;
  if (!guide?.points?.[1]) {
    const point = await pagePoint(page, openingPoint(current, scenario));
    await page.mouse.click(point.x, point.y);
    return;
  }
  const start = await pagePoint(page, guide.start);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  for (const point of guide.points.slice(1)) {
    const pagePointValue = await pagePoint(page, point);
    await page.mouse.move(pagePointValue.x, pagePointValue.y, { steps: 3 });
  }
  await page.mouse.up();
};
const snapshot = (current) => ({ screen: current.screen, level: current.level.id, puzzle: {
  started: current.puzzle.started, moves: current.puzzle.moves, blocks: current.puzzle.blocks.length,
  remainingSeconds: current.puzzle.remainingSeconds }, lives: current.lives, onboarding: current.onboarding,
  storage: current.storage, progression: current.progression, art: current.art.formalGameplay,
  collectionIntro: current.collectionIntro, boosterUnlock: current.boosterUnlock });
const attachErrors = (page, scenario, expectedUrl) => {
  page.on("pageerror", (error) => report.errors.push({ scenario, type: "pageerror", message: error.message }));
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const url = message.location().url;
    if (expectedUrl && url?.endsWith(expectedUrl) && message.text().includes("503")) return;
    report.errors.push({ scenario, type: "console", message: message.text(), url });
  });
};
const syntheticSave = (level) => ({ schemaVersion: 1, currentLevel: level, highestLevel: level,
  coins: 777, sound: false, music: false, haptic: false, reducedMotion: true, language: "zh-CN",
  featureSeen: [], boosterUnlockSeen: [], boosters: { time: 3, rocket: 3, pulse: 3 },
  bestStars: {}, bestMoves: {}, rewardedLevels: Array.from({ length: level - 1 }, (_, index) => index + 1) });
const viewports = [{ width: 320, height: 568 }, { width: 496, height: 1078 }];
const enterable = (page, level) => page.waitForFunction((id) => {
  const s = window.__COLOR_ESCAPE__?.getDebugState();
  return s?.art.ready && s.level.id === id && ["playing", "feature"].includes(s.screen)
    && !s.completionFlow.directTransition && s.art.formalGameplay.missingWholeBlockIds.length === 0;
}, level);
const acknowledgeIntroductions = async (page) => {
  const current = await state(page);
  if (current.screen === "feature") {
    await page.waitForFunction(() => !!window.__COLOR_ESCAPE__.featureIntroIconArt.image);
    await clickTarget(page, "featurePrimary");
    await page.waitForFunction(() => window.__COLOR_ESCAPE__.getDebugState().screen === "playing");
  }
  const next = await state(page);
  if (next.boosterUnlock.guide?.visible) {
    await clickTarget(page, "boosterUnlockGuideClose");
    await page.waitForFunction(() => !window.__COLOR_ESCAPE__.getDebugState().boosterUnlock.guide?.visible);
  }
};
const performDrag = async (page, drag) => {
  const before = await state(page), block = before.puzzle.blocks.find((candidate) => candidate.id === drag.blockId);
  assert.ok(block, `route block exists: ${drag.blockId}`);
  const [anchorX, anchorY] = block.shape[0];
  const point = (x, y) => pagePoint(page, { x: before.board.innerX + (x + anchorX + 0.5) * before.board.cell,
    y: before.board.innerY + (y + anchorY + 0.5) * before.board.cell });
  const start = await point(block.x, block.y);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  for (const [x, y] of drag.path) {
    const to = await point(x, y);
    await page.mouse.move(to.x, to.y, { steps: 3 });
  }
  await page.mouse.up();
  const [x, y] = drag.path.at(-1) ?? [block.x, block.y];
  await page.waitForFunction(({ id, exit, x, y, level }) => {
    const s = window.__COLOR_ESCAPE__.getDebugState(), b = s.puzzle.blocks.find((candidate) => candidate.id === id);
    return s.level.id !== level || ((exit ? !b : b?.x === x && b?.y === y)
      && s.activePointer === undefined && !s.selectedId && !s.exitGhosts);
  }, { id: drag.blockId, exit: Boolean(drag.exitSide), x, y, level: before.level.id });
};

try {
  if (process.env.FIRST_LAUNCH_PENDING_ONLY !== "1") {
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport }), page = await context.newPage();
    const name = `fresh-${viewport.width}`;
    attachErrors(page, name);
    await page.goto(playtestUrl, { waitUntil: "domcontentloaded" });
    await ready(page);
    await page.waitForFunction(() => window.__COLOR_ESCAPE__.getDebugState().screen === "playing");
    const idle = await state(page);
    assertFreshIdle(idle);
    // Merely entering and viewing the tutorial must not spend a life or start the clock.
    await page.waitForTimeout(1150);
    const stillIdle = await state(page);
    assertFreshIdle(stillIdle);
    assert.equal(stillIdle.puzzle.remainingSeconds, idle.puzzle.remainingSeconds);
    await page.screenshot({ path: resolve(output, `${name}-idle.png`) });
    await performOpeningGesture(page, idle, name);
    await page.waitForFunction(() => window.__COLOR_ESCAPE__.getDebugState().puzzle.moves === 1);
    const after = await state(page);
    assert.equal(after.puzzle.started, true);
    assert.equal(after.puzzle.blocks.length, idle.puzzle.blocks.length - 1);
    assert.equal(after.lives.lives, 4);
    assert.equal(after.lives.attemptStarted, true);
    assert.equal(after.onboarding.basicsSeen, true);
    assert.equal(after.onboarding.guide, undefined);
    assert.equal(after.activePointer, undefined);
    await page.screenshot({ path: resolve(output, `${name}-first-action.png`) });
    await page.reload({ waitUntil: "domcontentloaded" });
    await ready(page);
    const returned = await state(page);
    assert.equal(returned.screen, "playing");
    assert.equal(returned.level.id, 1);
    assert.equal(returned.onboarding.basicsSeen, true);
    assert.equal(returned.onboarding.guide, undefined);
    const restarted = await state(page);
    assert.equal(restarted.onboarding.basicsSeen, true);
    assert.equal(restarted.onboarding.guide, undefined);
    assert.equal(restarted.puzzle.started, false);
    assert.equal(restarted.lives.lives, 4);
    await page.screenshot({ path: resolve(output, `${name}-returning.png`) });
    report.scenarios.push({ name, viewport, status: "PASS", idle: snapshot(idle), firstAction: snapshot(after),
      reloaded: snapshot(returned), restarted: snapshot(restarted) });
    await context.close();
  }

  for (const viewport of viewports) for (const level of [1, 2, 3, 4, 5]) {
    const context = await browser.newContext({ viewport }), page = await context.newPage();
    const name = `not-cleared-five-current-${level}-${viewport.width}`;
    attachErrors(page, name);
    await page.addInitScript((save) => localStorage.setItem("color-escape-save-v1", JSON.stringify(save)), syntheticSave(level));
    await page.goto(playtestUrl, { waitUntil: "domcontentloaded" });
    await ready(page);
    await enterable(page, level);
    const current = await state(page);
    assert.ok(["playing", "feature"].includes(current.screen));
    assert.equal(current.level.id, level);
    assert.equal(current.progression.highestLevel, level);
    assert.equal(current.lives.lives, 5);
    assert.equal(current.puzzle.moves, 0);
    assert.equal(current.lives.attemptStarted, false);
    await page.screenshot({ path: resolve(output, `${name}.png`) });
    report.scenarios.push({ name, viewport, status: "PASS", state: snapshot(current) });
    await context.close();
  }

  for (const viewport of viewports) for (const entry of [
    { name: "completed-five", save: syntheticSave(6), current: 6, highest: 6 },
    { name: "old-high-level", save: syntheticSave(43), current: 43, highest: 43 },
    { name: "replay-one-high-progress", save: { ...syntheticSave(43), currentLevel: 1 }, current: 1, highest: 43 },
  ]) {
    const context = await browser.newContext({ viewport }), page = await context.newPage();
    const name = `${entry.name}-${viewport.width}`;
    attachErrors(page, name);
    await page.addInitScript((save) => localStorage.setItem("color-escape-save-v1", JSON.stringify(save)), entry.save);
    await page.goto(playtestUrl, { waitUntil: "domcontentloaded" });
    await ready(page);
    const current = await state(page);
    assert.equal(current.screen, "home");
    assert.equal(current.level.id, entry.current);
    assert.equal(current.progression.highestLevel, entry.highest);
    assert.equal(current.lives.lives, 5);
    await page.screenshot({ path: resolve(output, `${name}.png`) });
    report.scenarios.push({ name, viewport, status: "PASS", state: snapshot(current) });
    await context.close();
  }

  // A saved but unfinished early campaign still enters its current level on reload.
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport }), page = await context.newPage();
    const name = `reload-before-first-action-${viewport.width}`;
    attachErrors(page, name);
    await page.goto(playtestUrl, { waitUntil: "domcontentloaded" });
    await ready(page);
    assertFreshIdle(await state(page));
    await page.reload({ waitUntil: "domcontentloaded" });
    await ready(page);
    const returned = await state(page);
    assert.equal(returned.screen, "playing");
    assert.equal(returned.onboarding.basicsSeen, false);
    assert.equal(returned.lives.lives, 5);
    assertFreshIdle(returned);
    report.scenarios.push({ name, viewport, status: "PASS", reloaded: snapshot(returned) });
    await context.close();
  }

  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport }), page = await context.newPage();
    const name = `fresh-image-failure-retry-${viewport.width}`, failedPath = "/assets/art/ui/home-v3/background.jpg";
    let failedRequests = 0, shouldFail = true;
    attachErrors(page, name, failedPath);
    await page.route(`**${failedPath}`, async (route) => {
      if (shouldFail) { failedRequests += 1; await route.fulfill({ status: 503, contentType: "text/plain", body: "Synthetic image failure" }); }
      else await route.continue();
    });
    await page.goto(playtestUrl, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().art.loadError);
    const failed = await state(page);
    assert.equal(failed.art.ready, false);
    assert.equal(failed.puzzle.started, false);
    assert.equal(failed.lives.lives, 5);
    assert.ok(failedRequests > 0);
    await page.screenshot({ path: resolve(output, `${name}-failure.png`) });
    shouldFail = false;
    await clickTarget(page, "startupRetry");
    await ready(page);
    await page.waitForFunction(() => window.__COLOR_ESCAPE__.getDebugState().screen === "playing");
    const recovered = await state(page);
    assertFreshIdle(recovered);
    await page.screenshot({ path: resolve(output, `${name}-recovered.png`) });
    report.scenarios.push({ name, status: "PASS", expected503Requests: failedRequests, beforeRetry: snapshot(failed), recovered: snapshot(recovered) });
    await context.close();
  }

  // Read-only route planning in a separate Node module; the game is advanced ONLY
  // with mouse Pointer events. No model, timer, progress or completion injection.
  const compiled = await build({ entryPoints: ["src/core/levelSolver.ts"], bundle: true, write: false, platform: "node", format: "esm" });
  const { solveLevelForValidation } = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`);
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport }), page = await context.newPage();
    const name = `full-first-five-pointer-${viewport.width}`, levels = [];
    attachErrors(page, name);
    await page.addInitScript(() => {
      window.__entryScreenTimeline = [];
      setInterval(() => {
        const s = window.__COLOR_ESCAPE__?.getDebugState();
        if (!s?.art.ready) return;
        const prior = window.__entryScreenTimeline.at(-1);
        if (prior?.screen === s.screen && prior?.level === s.level.id) return;
        window.__entryScreenTimeline.push({ screen: s.screen, level: s.level.id });
      }, 30);
    });
    await page.goto(playtestUrl, { waitUntil: "domcontentloaded" });
    for (let id = 1; id <= 5; id++) {
      await enterable(page, id);
      const entry = await state(page);
      await page.screenshot({ path: resolve(output, `${name}-level-${id}-entry.png`) });
      await acknowledgeIntroductions(page);
      const current = await state(page);
      const result = solveLevelForValidation(current.level, 10000);
      assert.equal(result.solved, true, `read-only Lv${id} route is solved within the existing limit`);
      await writeFile(resolve(output, `${name}-level-${id}-route.json`), JSON.stringify({ level: current.level, result }, null, 2));
      for (const drag of result.drags) await performDrag(page, drag);
      levels.push({ level: id, entryScreen: entry.screen, moves: result.drags.length, exploredStates: result.exploredStates });
    }
    await page.waitForFunction(() => window.__COLOR_ESCAPE__.getDebugState().collectionIntro.ready);
    const home = await state(page);
    assert.equal(home.screen, "home");
    assert.equal(home.progression.highestLevel, 6);
    assert.equal(home.collectionIntro.active, true);
    const timeline = await page.evaluate(() => window.__entryScreenTimeline);
    assert.ok(!timeline.some((entry) => entry.screen === "win"), "first five use direct progression, without result-screen interruption");
    assert.ok(!timeline.some((entry) => entry.screen === "home" && entry.level < 5), "levels 1–4 do not return Home between clears");
    await page.screenshot({ path: resolve(output, `${name}-collection-reveal.png`) });
    await clickTarget(page, "collectionIntroPrimary");
    await page.waitForFunction(() => window.__COLOR_ESCAPE__.getDebugState().collectionIntro.restorationGuide?.visible);
    const collection = await state(page);
    assert.equal(collection.collectionAlbum.tab, "masterpieces");
    assert.equal(collection.collectionAlbum.detailId, "masterpiece-01");
    await page.screenshot({ path: resolve(output, `${name}-collection-restore-guide.png`) });
    await clickTarget(page, "collectionAlbumDetailPrimary");
    await page.waitForFunction(() => window.__COLOR_ESCAPE__.getDebugState().collectionAlbum.restoredMasterpieceIds.includes("masterpiece-01"));
    const restored = await state(page);
    assert.equal(restored.collectionIntro.restorationGuide, undefined);
    await page.reload({ waitUntil: "domcontentloaded" });
    await ready(page);
    const returned = await state(page);
    assert.equal(returned.screen, "home");
    assert.equal(returned.collectionIntro.active, false);
    report.scenarios.push({ name, viewport, status: "PASS", levels, timeline,
      homeReveal: snapshot(home), collection: { detail: collection.collectionAlbum.detailId,
        guide: collection.collectionIntro.restorationGuide }, restored: restored.collectionAlbum.restoredMasterpieceIds,
      reloaded: snapshot(returned) });
    await context.close();
  }

  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport }), page = await context.newPage();
    const name = `returning-player-replay-five-${viewport.width}`;
    attachErrors(page, name);
    await page.addInitScript((save) => localStorage.setItem("color-escape-save-v1", JSON.stringify(save)),
      { ...syntheticSave(6), currentLevel: 5, collectionIntroShown: true });
    await page.goto(playtestUrl, { waitUntil: "domcontentloaded" });
    await ready(page);
    assert.equal((await state(page)).screen, "home");
    await clickTarget(page, "homePlay");
    await enterable(page, 5);
    await acknowledgeIntroductions(page);
    const result = solveLevelForValidation((await state(page)).level, 10000);
    assert.equal(result.solved, true);
    for (const drag of result.drags) await performDrag(page, drag);
    await page.waitForFunction(() => {
      const s = window.__COLOR_ESCAPE__.getDebugState();
      return s.screen === "win" && s.art.win.ready;
    });
    const won = await state(page);
    assert.equal(won.level.id, 5);
    assert.equal(won.settlement.coinReward, 0);
    await page.screenshot({ path: resolve(output, `${name}-result.png`) });
    await clickTarget(page, "modalPrimary");
    await page.waitForFunction(() => window.__COLOR_ESCAPE__.getDebugState().screen === "home");
    const returned = await state(page);
    assert.equal(returned.collectionIntro.active, false);
    report.scenarios.push({ name, viewport, status: "PASS", moves: result.drags.length,
      result: snapshot(won), returned: snapshot(returned) });
    await context.close();
  }
  }
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport }), page = await context.newPage();
    const name = `post-five-pending-collection-${viewport.width}`;
    attachErrors(page, name);
    await page.addInitScript((save) => {
      if (!localStorage.getItem("color-escape-save-v1")) localStorage.setItem("color-escape-save-v1", JSON.stringify(save));
    }, { ...syntheticSave(6), collectionIntroPending: true, collectionIntroShown: false });
    await page.goto(playtestUrl, { waitUntil: "domcontentloaded" });
    await ready(page);
    await page.waitForFunction(() => window.__COLOR_ESCAPE__.getDebugState().collectionIntro.ready);
    const first = await state(page);
    assert.equal(first.screen, "home");
    assert.equal(first.level.id, 6);
    assert.equal(first.collectionIntro.active, true);
    assert.equal(first.collectionIntro.shown, false);
    await page.screenshot({ path: resolve(output, `${name}-first-reveal.png`) });
    // Do not acknowledge the introduction; its pending state must survive restart.
    await page.reload({ waitUntil: "domcontentloaded" });
    await ready(page);
    await page.waitForFunction(() => window.__COLOR_ESCAPE__.getDebugState().collectionIntro.ready);
    const returned = await state(page);
    assert.equal(returned.screen, "home");
    assert.equal(returned.level.id, 6);
    assert.equal(returned.collectionIntro.active, true);
    assert.equal(returned.collectionIntro.shown, false);
    await page.screenshot({ path: resolve(output, `${name}-reload-reveal.png`) });
    report.scenarios.push({ name, viewport, status: "PASS", first: snapshot(first), reloaded: snapshot(returned) });
    await context.close();
  }
  assert.deepEqual(report.errors, []);
  report.status = report.warnings.length ? "ENTRY_PASS_WITH_EXISTING_GUIDE_WARNING" : "PASS";
} catch (error) {
  report.status = "FAIL";
  report.failure = error.stack ?? String(error);
  process.exitCode = 1;
} finally {
  await writeFile(resolve(output, "report.json"), JSON.stringify(report, null, 2));
  await browser.close();
}
console.log(JSON.stringify({ status: report.status, scenarios: report.scenarios.length, errors: report.errors.length,
  report: resolve(output, "report.json"), failure: report.failure }, null, 2));
