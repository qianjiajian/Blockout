import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";

const output = fileURLToPath(new URL("../playtest-results/supplied-row-frames-2026-09-22/daily/", import.meta.url));
const url = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
const languages = ["zh-CN", "zh-TW", "en", "ja", "ko", "es", "pt", "fr", "de", "ru"];
const supplied = {
  "panel.png": [594, 889, 63, 326], "close.png": [94, 98, 587, 358],
  "task-booster.png": [71, 77, 140, 738], "task-trophy.png": [70, 90, 142, 595],
  "task-shield.png": [59, 68, 147, 879], "chest.png": [85, 75, 111, 1026],
  "calendar.png": [53, 54, 192, 490], "summary-panel.png": [476, 66, 122, 486],
  "button-green.png": [120, 53, 447, 633], "button-grey.png": [120, 53, 487, 1054],
  "button-yellow.png": [120, 53, 447, 893], "progress-track.png": [189, 27, 216, 667],
  "progress-fill.png": [182, 19, 220, 935], "bonus-panel.png": [524, 113, 98, 1012],
  "task-row.png": [458, 115, 130, 587],
};
await mkdir(output, { recursive: true });
const response = await fetch(new URL("assets/art/ui/formal-pages/daily-tasks-v2/panel.png", url));
assert.equal(response.status, 200, "supplied daily-task panel must be served before running the gate");

const browser = await chromium.launch({ headless: true });
const errors = [];
const reports = [];
const debug = page => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const clickRect = async (page, rect) => {
  const state = await debug(page);
  const canvas = await page.locator("canvas").boundingBox();
  assert.ok(canvas && rect, "missing canvas or pointer target");
  await page.mouse.click(
    canvas.x + state.viewportTransform.offsetX + (rect.x + rect.width / 2) * state.viewportTransform.scale,
    canvas.y + state.viewportTransform.offsetY + (rect.y + rect.height / 2) * state.viewportTransform.scale,
  );
};
const clickTarget = async (page, key) => {
  const target = (await debug(page)).interactionTargets.targets[key];
  assert.ok(target, `missing interaction target ${key}`);
  await clickRect(page, target.hit);
};
async function open(page) {
  await clickTarget(page, "homeMissions");
  await page.waitForFunction(() => window.__COLOR_ESCAPE__.getDebugState().dailyTasks.art.ready);
  assert.equal((await debug(page)).screen, "dailyTasks");
}
async function probe(page) {
  return page.evaluate(() => {
    const game = window.__COLOR_ESCAPE__;
    const drawImage = game.ctx.drawImage;
    const label = game.label;
    const drawDaily = game.drawDailyTasks;
    const draws = [];
    const texts = [];
    let insideDaily = false;
    game.ctx.drawImage = function (image, ...args) {
      if (insideDaily) draws.push({ source: image.currentSrc || image.src || "", args, width: image.naturalWidth || image.width, height: image.naturalHeight || image.height });
      return drawImage.call(this, image, ...args);
    };
    game.label = function (text, x, y, size, ...rest) {
      if (insideDaily) texts.push({ text: String(text), x, y, size, maxWidth: rest.at(-1) });
      return label.call(this, text, x, y, size, ...rest);
    };
    game.drawDailyTasks = function () {
      insideDaily = true;
      try { return drawDaily.call(this); } finally { insideDaily = false; }
    };
    try { game.render(); } finally {
      game.ctx.drawImage = drawImage;
      game.label = label;
      game.drawDailyTasks = drawDaily;
    }
    return { draws, texts, state: game.getDebugState() };
  });
}
function verifyRows(result) {
  const rows = result.draws.filter(draw => draw.source.endsWith("/daily-tasks-v2/task-row.png"));
  assert.equal(rows.length, 3, "every daily task uses its supplied row frame");
  assert.deepEqual(rows.map(draw => draw.args), [[130, 587], [130, 718], [130, 852]], "three authored row positions, without resizing");
  for (const draw of rows) assert.deepEqual([draw.width, draw.height], [458, 115], "daily row native pixels");
  assert.ok(!result.draws.some(draw => draw.source.includes("/daily-tasks-v1/task-row.webp")), "retired v1 row must not be drawn");
}
function verifyNative(result) {
  for (const [file, [width, height, x, y]] of Object.entries(supplied)) {
    const matches = result.draws.filter(draw => draw.source.endsWith(`/daily-tasks-v2/${file}`));
    if (file === "button-yellow.png" && result.state.dailyTasks.bonusClaimed) continue;
    assert.ok(matches.length > 0, `supplied ${file} was not painted`);
    for (const draw of matches) {
      assert.deepEqual([draw.width, draw.height], [width, height], `native pixels ${file}`);
      assert.equal(draw.args.length, 2, `supplied ${file} must use native-size drawImage`);
    }
    assert.ok(matches.some(draw => draw.args[0] === x && draw.args[1] === y), `authored placement ${file}`);
  }
  verifyRows(result);
  for (const task of result.state.dailyTasks.entries) {
    const target = result.state.interactionTargets.targets[`dailyTaskClaim.${task.id}`];
    assert.ok(target.cssWidth >= 43.9 && target.cssHeight >= 43.9, `minimum touch target ${task.id}`);
  }
  const close = result.state.interactionTargets.targets.dailyTaskClose;
  assert.ok(close.cssWidth >= 43.9 && close.cssHeight >= 43.9, "minimum close touch target");
  assert.ok(result.texts.some(item => item.size === 48 && item.x === 360), "title size 48");
  assert.ok(result.texts.some(item => item.size === 36), "summary size 36");
  assert.equal(result.texts.filter(item => item.size === 30).length, 4, "three task names and bonus title size 30");
  assert.ok(result.texts.filter(item => item.size === 20).length >= 9, "description/progress/action size 20");
  assert.equal(result.texts.filter(item => item.size === 18).length,
    result.state.dailyTasks.bonusClaimed ? 1 : 0,
    "countdown is only visible after the bonus is claimed");
  for (const task of result.state.dailyTasks.entries) {
    assert.ok(task.rewardCoins > 0, `coin reward amount ${task.id}`);
    assert.ok(task.rewardRect.y < task.claimRect.y, `coin reward badge is above claim button ${task.id}`);
    assert.ok(task.claimRect.y - task.rewardRect.y > 20, `coin reward badge has its own row ${task.id}`);
  }
  for (const task of result.state.dailyTasks.entries) {
    assert.ok(result.texts.some(item => item.text.includes(`+${task.rewardCoins}`)), `coin reward label ${task.id}`);
  }
  if (result.state.dailyTasks.bonusClaimed) {
    assert.ok(result.texts.some(item => item.text.includes("后刷新")), "claimed chest shows reset countdown");
    assert.ok(!result.texts.some(item => item.text.includes("+100")), "claimed chest hides inspiration reward");
    assert.ok(!result.draws.some(draw => draw.source.endsWith("/daily-tasks-v2/button-yellow.png")
      && draw.args[0] === 487 && draw.args[1] === 1054), "claimed chest hides button");
  } else {
    assert.ok(result.texts.some(item => item.text.includes("+100")), "unclaimed chest shows inspiration reward");
    assert.ok(!result.texts.some(item => item.text.includes("后刷新")), "unclaimed chest hides reset countdown");
  }
  assert.ok(result.texts.every(item => !item.text.includes("undefined") && !/\{\w+\}/.test(item.text)), "all dynamic text resolved");
}

try {
  for (const viewport of [{ width: 720, height: 1584 }, { width: 320, height: 568 }]) {
    const context = await browser.newContext({ viewport, locale: "zh-CN" });
    const page = await context.newPage();
    page.on("pageerror", error => errors.push(error.message));
    page.on("console", message => { if (message.type() === "error" && !message.text().includes("navigator.vibrate")) errors.push(message.text()); });
    await page.goto(url, { waitUntil: "networkidle" });
    await page.waitForFunction(() => window.__COLOR_ESCAPE__?.artReady && window.__COLOR_ESCAPE__.storageBaselineReady);
    await page.evaluate(() => {
      const game = window.__COLOR_ESCAPE__;
      game.updateToastVisible = false;
      game.boosterUnlockToast = undefined;
      game.save.boosterUnlockSeen = ["time", "rocket", "pulse"];
      game.save.highestLevel = 10;
      game.save.dailyTaskProgress.tasks = [
        { id: "perfect-clear", progress: 0, claimed: false },
        { id: "use-booster", progress: 0, claimed: false },
        { id: "booster-free", progress: 2, claimed: true },
      ];
      game.save.dailyTaskProgress.bonusClaimed = false;
      game.render();
    });
    await open(page);
    let result = await probe(page);
    assert.equal(result.state.dailyTasks.art.loadedImages, 15);
    assert.equal(result.state.dailyTasks.art.inspirationReady, true, "inspiration flight art must be loaded with the popup");
    assert.equal(result.state.dailyTasks.art.splitAssetCount, 16);
    assert.deepEqual(result.state.dailyTasks.entries.map(task => [task.id, task.progress, task.claimed]), [
      ["perfect-clear", 0, false], ["use-booster", 0, false], ["booster-free", 2, true],
    ]);
    verifyNative(result);
    const localeResults = [];
    for (const language of languages) {
      await page.evaluate(value => { const game = window.__COLOR_ESCAPE__; game.save.language = value; game.render(); }, language);
      result = await probe(page);
      verifyNative(result);
      const filename = `reference-${viewport.width}x${viewport.height}-${language}.png`;
      await page.screenshot({ path: resolve(output, filename) });
      localeResults.push({ language, screenshot: filename, title: result.texts.find(item => item.size === 48)?.text });
    }
    await page.evaluate(() => { const game = window.__COLOR_ESCAPE__; game.save.language = "zh-CN"; game.render(); });
    const claimedBefore = (await debug(page)).economy.coins;
    await clickTarget(page, "dailyTaskClaim.booster-free");
    assert.equal((await debug(page)).economy.coins, claimedBefore, "already-claimed button must not credit twice");
    await page.evaluate(() => {
      const game = window.__COLOR_ESCAPE__;
      const summary = game.getDebugState().dailyTasks;
      game.save.dailyTaskProgress.tasks = game.save.dailyTaskProgress.tasks.map((task, index) => ({ ...task, progress: summary.entries[index].target, claimed: false }));
      game.render();
    });
    result = await probe(page);
    verifyRows(result);
    assert.equal(result.state.dailyTasks.bonusClaimable, true);
    assert.ok(result.draws.some(draw => draw.source.endsWith("/button-green.png") && draw.args[0] === 487 && draw.args[1] === 1054));
    await page.screenshot({ path: resolve(output, `all-complete-${viewport.width}x${viewport.height}.png`) });
    const coinsBefore = result.state.economy.coins;
    const inspirationBefore = result.state.dailyTasks.inspiration;
    await clickTarget(page, "dailyTaskBonus");
    const bonusState = await debug(page);
    assert.equal(bonusState.dailyTasks.bonusClaimed, true);
    assert.equal(bonusState.economy.coins, coinsBefore, "inspiration chest must not add coins");
    assert.equal(bonusState.dailyTasks.inspiration, inspirationBefore + 100, "chest grants 100 inspiration");
    assert.equal(bonusState.completionFlow.coinFlight?.kind, "inspiration", "chest uses inspiration flight");
    assert.ok(bonusState.completionFlow.coinFlight?.target.y > 900, "inspiration flight target is near the bottom collection tab");
    result = await probe(page);
    assert.equal(result.state.dailyTasks.feedback, undefined, "successful claim must leave the reset countdown visible");
    assert.ok(result.texts.some(item => item.text.includes("后刷新")), "successful claim must render the daily reset countdown");
    assert.ok(!result.texts.some(item => item.text.includes("领取成功")), "successful claim feedback must not remain in the footer");
    assert.ok(!result.texts.some(item => item.text.includes("+100")), "successful claim hides inspiration reward");
    assert.ok(!result.draws.some(draw => draw.source.endsWith("/daily-tasks-v2/button-yellow.png")
      && draw.args[0] === 487 && draw.args[1] === 1054), "successful claim hides chest button");
    await page.waitForFunction(() => window.__COLOR_ESCAPE__.getDebugState().completionFlow.coinFlight == null);
    const repeatedBonusState = await debug(page);
    assert.equal(repeatedBonusState.economy.coins, coinsBefore, "repeated inspiration chest claim must not add coins");
    assert.equal(repeatedBonusState.dailyTasks.inspiration, inspirationBefore + 100, "repeated inspiration chest claim must not duplicate");
    result = await probe(page);
    verifyRows(result);
    assert.ok(!repeatedBonusState.interactionTargets.targets.dailyTaskBonus, "claimed chest no longer exposes a button target");
    assert.ok(!result.draws.some(draw => draw.source.endsWith("/daily-tasks-v2/button-yellow.png")
      && draw.args[0] === 487 && draw.args[1] === 1054), "claimed chest keeps button hidden");
    await page.screenshot({ path: resolve(output, `bonus-claimed-${viewport.width}x${viewport.height}.png`) });

    await page.evaluate(() => {
      const game = window.__COLOR_ESCAPE__;
      const images = new Set([...Object.values(game.dailyTaskArt), game.dailyTaskInspirationArt]);
      const original = game.host.releaseImage;
      window.__dailyReleased = [];
      game.host.releaseImage = function (image) {
        if (images.has(image)) window.__dailyReleased.push(image.currentSrc || image.src || "");
        return original?.call(this, image);
      };
    });
    await clickTarget(page, "dailyTaskClose");
    assert.equal((await debug(page)).screen, "home");
    assert.equal((await debug(page)).dailyTasks.art.loadedImages, 0);
    assert.equal(await page.evaluate(() => window.__dailyReleased.length), 16, "close releases every popup image including inspiration art");
    assert.equal(await page.evaluate(() => window.__dailyReleased.filter(source => source.endsWith("/daily-tasks-v2/task-row.png")).length), 1, "close releases the supplied daily row frame once");
    await open(page);
    assert.equal((await debug(page)).dailyTasks.art.loadedImages, 15, "reopening loads all popup images");
    assert.equal((await debug(page)).dailyTasks.art.inspirationReady, true, "reopening loads inspiration art");
    await clickTarget(page, "dailyTaskClose");

    // Inject the same rejected image-load promise consumed by the production
    // error screen; other shell images remain available for the retry action.
    await page.evaluate(() => {
      const game = window.__COLOR_ESCAPE__;
      window.__dailyOriginalLoadImages = game.loadImages;
      game.loadImages = function (paths, ...args) {
        if (paths.some(path => path.includes("/daily-tasks-v2/"))) return Promise.reject(new Error("intentional supplied daily art load failure"));
        return window.__dailyOriginalLoadImages.call(this, paths, ...args);
      };
    });
    await clickTarget(page, "homeMissions");
    await page.waitForFunction(() => Boolean(window.__COLOR_ESCAPE__.getDebugState().dailyTasks.art.error));
    assert.equal((await debug(page)).dailyTasks.art.ready, false);
    await page.screenshot({ path: resolve(output, `load-error-${viewport.width}x${viewport.height}.png`) });
    const retry = await page.evaluate(() => {
      const game = window.__COLOR_ESCAPE__;
      game.loadImages = window.__dailyOriginalLoadImages;
      return game.dailyTaskRetryRect();
    });
    await clickRect(page, retry);
    await page.waitForFunction(() => window.__COLOR_ESCAPE__.getDebugState().dailyTasks.art.ready);
    assert.equal((await debug(page)).dailyTasks.art.loadedImages, 15);
    assert.equal((await debug(page)).dailyTasks.art.inspirationReady, true);
    assert.equal((await debug(page)).dailyTasks.art.error, undefined);
    await page.screenshot({ path: resolve(output, `retry-loaded-${viewport.width}x${viewport.height}.png`) });
    await clickTarget(page, "dailyTaskClose");
    reports.push({ viewport, status: "pass", suppliedNativeAssets: 15, loadedPopupAssets: 15, inspirationAsset: "collection-album/inspiration.webp", releasedImages: 16, suppliedRowFrame: { nativeSize: [458, 115], placements: [[130, 587], [130, 718], [130, 852]], statesVerified: ["incomplete", "completed", "claimed"], releasedImages: 1 }, localeResults, states: ["incomplete-green", "claimed-yellow", "bonus-disabled-grey", "bonus-ready-green", "bonus-claimed-countdown"], lifecycle: ["close-release", "reopen", "injected-image-load-rejection", "real-pointer-retry"] });
    await context.close();
  }
  assert.deepEqual(errors, []);
  await writeFile(resolve(output, "report.json"), JSON.stringify({ status: "pass", isolatedBrowserContexts: true, referencePixelPerfectClaimed: false, taskRow: "Supplied 458x115 PNG, native drawing in all three rows and verified across task states; legacy v1 row excluded.", reports, errors }, null, 2));
  console.log("Supplied Daily Tasks art passed: 15 native slices plus inspiration flight art, two viewports, 10 languages, task/button states, unclaimed reward/button and claimed countdown states, exactly-once rewards, release/reopen, image-load rejection and Pointer retry.");
} finally {
  await browser.close();
}
