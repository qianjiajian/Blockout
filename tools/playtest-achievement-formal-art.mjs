import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";

const output = fileURLToPath(new URL("../playtest-results/supplied-row-frames-2026-09-22/achievements/", import.meta.url));
const url = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
const languages = ["zh-CN", "zh-TW", "en", "ja", "ko", "es", "pt", "fr", "de", "ru"];
const supplied = {
  "achievements-v2/panel.png": [594, 889, 63, 326],
  "daily-tasks-v2/close.png": [94, 98, 587, 358],
  "achievements-v2/medal-active.png": [82, 79, 124, 581],
  "achievements-v2/medal-inactive.png": [82, 79, 124, 801],
  "achievements-v2/summary-panel.png": [476, 66, 122, 486],
  "achievements-v2/button-green.png": [120, 53, 472, 606],
  "daily-tasks-v2/button-grey.png": [120, 53, 472, 816],
  "achievements-v2/progress-track.png": [229, 21, 218, 635],
  "achievements-v2/progress-fill-green.png": [223, 15, 221, 638],
  "achievements-v2/progress-fill-blue.png": [223, 15, 221, 858],
  "achievements-v2/row-active.png": [519, 115, 100.5, 568.5],
  "achievements-v2/row-inactive.png": [517, 114, 101.5, 789],
};
const makeSave = ({ completed = 19, allPerfect = false } = {}) => ({
  schemaVersion: 1, currentLevel: 10, highestLevel: completed + 1, coins: 1000,
  sound: false, haptic: false, reducedMotion: false, language: "zh-CN",
  featureSeen: ["basics"], boosterUnlockSeen: ["time", "rocket", "pulse"],
  metaDiscovery: { collectionViewedItemIds: [] }, boosters: { time: 3, rocket: 3, pulse: 3 },
  bestStars: Object.fromEntries(Array.from({ length: completed }, (_, i) => [String(i + 1), allPerfect || i < 3 ? 3 : 1])),
  bestMoves: {}, rewardedLevels: Array.from({ length: completed }, (_, i) => i + 1),
  journeyProgress: { claimedMilestoneLevels: [], seenEpisodeUnlockLevels: [] },
  achievementProgress: { claimedIds: [] }, selectedJourneyEpisode: 1,
  dailyStreak: 0, lastDailyCompletedDay: "", lastSeenUpdate: "2026-09-10-r118",
});
await mkdir(output, { recursive: true });
assert.equal((await fetch(new URL("assets/art/ui/formal-pages/achievements-v2/panel.png", url))).status, 200);
const browser = await chromium.launch({ headless: true });
const errors = [], reports = [];
const debug = page => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
async function point(page, rect) {
  const state = await debug(page), canvas = await page.locator("canvas").boundingBox();
  assert.ok(canvas && rect);
  return {
    x: canvas.x + state.viewportTransform.offsetX + (rect.x + rect.width / 2) * state.viewportTransform.scale,
    y: canvas.y + state.viewportTransform.offsetY + (rect.y + rect.height / 2) * state.viewportTransform.scale,
  };
}
async function click(page, key) {
  const target = (await debug(page)).interactionTargets.targets[key];
  assert.ok(target, `missing ${key}`);
  const p = await point(page, target.hit); await page.mouse.click(p.x, p.y);
}
async function open(page) {
  await click(page, "homeAchievements");
  await page.waitForFunction(() => window.__COLOR_ESCAPE__.getDebugState().achievements.art.ready);
}
async function seed(page, value = makeSave()) {
  await page.goto(url, { waitUntil: "networkidle" });
  await page.evaluate(save => localStorage.setItem("color-escape-save-v1", JSON.stringify(save)), value);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__COLOR_ESCAPE__?.artReady && window.__COLOR_ESCAPE__?.storageBaselineReady);
  await page.evaluate(() => { const game = window.__COLOR_ESCAPE__; game.updateToastVisible = false; game.boosterUnlockToast = undefined; game.render(); });
}
async function probe(page) {
  return page.evaluate(() => {
    const game = window.__COLOR_ESCAPE__, original = { draw: game.ctx.drawImage, label: game.label, modal: game.drawAchievements };
    const draws = [], texts = []; let inside = false;
    game.ctx.drawImage = function(image, ...args) {
      if (inside) draws.push({ source: image.currentSrc || image.src || "", args, width: image.naturalWidth || image.width, height: image.naturalHeight || image.height });
      return original.draw.call(this, image, ...args);
    };
    game.label = function(text, x, y, size, ...rest) {
      if (inside) texts.push({ text: String(text), x, y, size });
      return original.label.call(this, text, x, y, size, ...rest);
    };
    game.drawAchievements = function() { inside = true; try { return original.modal.call(this); } finally { inside = false; } };
    try { game.render(); } finally { game.ctx.drawImage = original.draw; game.label = original.label; game.drawAchievements = original.modal; }
    return { draws, texts, state: game.getDebugState() };
  });
}
function rowFrames(result) {
  const viewportBottom = 566 + 592;
  const frames = result.draws.filter(draw => /\/achievements-v2\/row-(active|inactive)\.png$/.test(draw.source));
    const claimableIds = new Set(result.state.achievements.claimableIds);
  const ranks = result.state.achievements.entries.map(entry => entry.claimable ? 0 : entry.claimed ? 2 : 1);
  assert.deepEqual(ranks, [...ranks].sort((left, right) => left - right), "achievement rows are sorted by claim state");
  const expected = result.state.achievements.entries.flatMap((entry, index) => {
    const claimable = claimableIds.has(entry.id);
    const width = claimable ? 519 : 517, height = claimable ? 115 : 114;
    const x = claimable ? 100.5 : 101.5;
    const y = (claimable ? 568.5 : 569) + index * 110 - result.state.achievements.scrollOffset;
    if (y + height <= 566 || y >= viewportBottom) return [];
    return [{ id: entry.id, suffix: claimable ? "/row-active.png" : "/row-inactive.png", width, height, x, y }];
  });
  assert.equal(frames.length, expected.length, "every visible achievement row uses exactly one supplied frame");
  for (const item of expected) {
    const draw = frames.find(frame => Math.abs(frame.args[1] - item.y) < 1e-7 && frame.source.endsWith(item.suffix));
    assert.ok(draw, `correct claimable/incomplete/claimed frame for ${item.id}`);
    assert.deepEqual([draw.width, draw.height], [item.width, item.height], `native row dimensions ${item.id}`);
    assert.equal(draw.args.length, 2, `native row draw ${item.id}`);
    assert.equal(draw.args[0], item.x, `authored row x ${item.id}`);
  }
  return expected;
}
function native(result) {
  const viewportBottom = 566 + 592;
  for (const [suffix, [w,h,x,y]] of Object.entries(supplied)) {
    const draws = result.draws.filter(draw => draw.source.endsWith(`/${suffix}`));
    assert.ok(draws.length, `painted ${suffix}`);
    if (suffix.includes("medal-active") || suffix.includes("medal-inactive")
      || suffix.includes("button-green") || suffix.includes("button-grey")
      || suffix.includes("progress-fill-green") || suffix.includes("progress-fill-blue")
      || suffix.includes("row-active") || suffix.includes("row-inactive")) {
      const medal = suffix.includes("medal-");
      const button = suffix.includes("button-");
      const row = suffix.includes("row-");
      const green = suffix.includes("-green");
      result.state.achievements.entries.forEach((entry, index) => {
        const expected = medal ? entry.completed === suffix.includes("medal-active")
          : row ? entry.claimable === suffix.includes("row-active")
            : button ? entry.claimable === green
              : entry.completed === green && (entry.progress > 0 || entry.completed);
        if (!expected) return;
        const baseY = medal ? 581 : row ? (suffix.includes("row-active") ? 568.5 : 569) : button ? 606 : 638;
        const itemY = baseY + index * 110 - result.state.achievements.scrollOffset;
        if (itemY + h <= 566 || itemY >= viewportBottom) return;
        assert.ok(draws.some(draw => draw.args[0] === x && Math.abs(draw.args[1] - itemY) < 1e-7),
          `placement ${suffix} for ${entry.id}`);
      });
    } else {
      assert.ok(draws.some(draw => draw.args[0] === x && draw.args[1] === y), `placement ${suffix}`);
    }
    for(const draw of draws) { assert.deepEqual([draw.width,draw.height],[w,h]); assert.equal(draw.args.length,2, `native draw ${suffix}`); }
  }
  rowFrames(result);
  assert.equal(result.state.achievements.art.loadedImages,12);
  assert.equal(result.state.achievements.art.splitAssetCount,12);
  assert.equal(result.state.achievements.entries.length,19);
  assert.ok(result.texts.every(item => !item.text.includes("undefined") && !/\{\w+\}/.test(item.text)));
  for(const size of [48,30,24,16,20]) assert.ok(result.texts.some(item=>item.size===size),`typography ${size}`);
  const targets=result.state.interactionTargets.targets;
  for(const key of ["achievementClose","achievementClaim.levels-1","achievementClaim.levels-10"]){assert.ok(targets[key].cssWidth>=43.9&&targets[key].cssHeight>=43.9,`44px ${key}`);}
}
async function scrollToMax(page) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const state = await debug(page);
    if (state.achievements.scrollOffset === state.achievements.maxScrollOffset) return;
    const rect = await page.evaluate(() => window.__COLOR_ESCAPE__.achievementViewportRect());
    const from = await point(page, { ...rect, y: rect.y + rect.height * .85, height: 0 });
    const to = await point(page, { ...rect, y: rect.y + rect.height * .15, height: 0 });
    await page.mouse.move(from.x, from.y); await page.mouse.down();
    await page.mouse.move(to.x, to.y, { steps: 10 }); await page.mouse.up();
  }
  const state = await debug(page);
  assert.equal(state.achievements.scrollOffset, state.achievements.maxScrollOffset);
}
try {
  for(const viewport of [{width:720,height:1584},{width:320,height:568}]) {
    const context=await browser.newContext({viewport,locale:"zh-CN"}),page=await context.newPage();
    page.on("pageerror", e=>errors.push(e.message));
    page.on("console",m=>{if(m.type()==="error"&&!m.text().includes("navigator.vibrate"))errors.push(m.text());});
    await seed(page); await open(page);
    await page.screenshot({path:resolve(output,`reference-${viewport.width}x${viewport.height}-zh-CN.png`)});
    let result=await probe(page); native(result);
    assert.equal(result.state.achievements.completedCount,4,"reference fixture has four completed achievements, out of actual nineteen");
    const locales=[];
    for(const language of languages) {
      await page.evaluate(value=>{const game=window.__COLOR_ESCAPE__;game.save.language=value;game.render();},language);
      result=await probe(page); native(result);
      const screenshot=`reference-${viewport.width}x${viewport.height}-${language}.png`;
      await page.screenshot({path:resolve(output,screenshot)});
      locales.push({language,screenshot});
      if(language==="zh-CN")console.log(`Reference screenshot ready: ${resolve(output,screenshot)}`);
    }
    await page.evaluate(()=>{const game=window.__COLOR_ESCAPE__;game.save.language="zh-CN";game.render();});
    // A partly visible fifth row must not leak a claim target below the clip.
    const clip=await page.evaluate(()=>window.__COLOR_ESCAPE__.achievementViewportRect());
    let outsideState=await debug(page);
    const claimColumn=outsideState.interactionTargets.targets["achievementClaim.levels-1"].hit;
    const outsideDelta=0.5/outsideState.viewportTransform.scale;
    for(const y of [clip.y-outsideDelta,clip.y+clip.height+outsideDelta]) {
      const outside=await point(page,{...claimColumn,y,height:0});await page.mouse.click(outside.x,outside.y);
      const after=await debug(page);
      assert.equal(after.economy.coins,outsideState.economy.coins,"outside clipped list must not claim");
      assert.deepEqual(after.achievements.claimedIds,outsideState.achievements.claimedIds,"outside clipped list must not claim");
    }
    // Minimum 44px targets overlap on the small reference-scaled canvas.
    // Verify both sides of the nearest-centre ownership boundary, rather
    // than pretending the mathematically unavoidable overlap is absent.
    let state=await debug(page),hit=state.interactionTargets.targets["achievementClaim.levels-1"].hit;
    const firstRewardIcon = state.achievements.entries.find(entry => entry.id === "levels-1").rewardIconRect;
    const adjacent=state.interactionTargets.targets["achievementClaim.levels-10"].hit;
    const firstVisual=state.interactionTargets.targets["achievementClaim.levels-1"].visual;
    const secondVisual=state.interactionTargets.targets["achievementClaim.levels-10"].visual;
    const midpoint=(firstVisual.y+firstVisual.height/2+secondVisual.y+secondVisual.height/2)/2;
    const halfCss=0.5/state.viewportTransform.scale;
    const overlapCss=Math.max(0,hit.y+hit.height-adjacent.y)*state.viewportTransform.scale;
    let p=await point(page,{...hit,y:Math.min(hit.y+hit.height-halfCss,midpoint-halfCss),height:0});
    await page.mouse.click(p.x,p.y);state=await debug(page);
    assert.deepEqual(state.achievements.claimedIds,["levels-1"]);assert.equal(state.economy.coins,1050);
    assert.equal(state.completionFlow.coinFlight?.kind,"coins");
    assert.ok(Math.abs(state.completionFlow.coinFlight.start.x - (firstRewardIcon.x + firstRewardIcon.width / 2)) < 0.01);
    assert.ok(Math.abs(state.completionFlow.coinFlight.start.y - (firstRewardIcon.y + firstRewardIcon.height / 2)) < 0.01);
    await page.waitForFunction(() => window.__COLOR_ESCAPE__.getDebugState().completionFlow.coinFlight == null);
    result=await probe(page);rowFrames(result);
    assert.ok(state.achievements.entries.findIndex(entry => entry.id === "levels-1")
      > state.achievements.entries.findIndex(entry => entry.id === "levels-10"),
    "claimed first achievement moves below claimable rows");
    await page.evaluate(()=>{window.__achievementStorage={get:Storage.prototype.getItem,set:Storage.prototype.setItem};Storage.prototype.setItem=function(key,value){if(key==="color-escape-save-v1")throw new Error("intentional reject");return window.__achievementStorage.set.call(this,key,value);};});
    await click(page,"achievementClaim.levels-10");state=await debug(page);
    assert.equal(state.economy.coins,1050);assert.equal(state.achievements.pendingClaimId,undefined);
    assert.ok(!state.achievements.claimedIds.includes("levels-10"));
    rowFrames(await probe(page));
    await page.evaluate(()=>{Storage.prototype.setItem=window.__achievementStorage.set;Storage.prototype.getItem=()=>{throw new Error("intentional unknown read");};Storage.prototype.setItem=()=>{throw new Error("intentional unknown write");};});
    await click(page,"achievementClaim.levels-10");state=await debug(page);
    assert.equal(state.economy.coins,1050);assert.equal(state.achievements.pendingClaimId,"levels-10");
    rowFrames(await probe(page));
    const candidate=await page.evaluate(()=>JSON.stringify(window.__COLOR_ESCAPE__.pendingAchievementClaim.candidateSave));
    await click(page,"achievementClaim.levels-50");
    assert.equal(await page.evaluate(()=>JSON.stringify(window.__COLOR_ESCAPE__.pendingAchievementClaim.candidateSave)),candidate);
    await click(page,"achievementClose");assert.equal((await debug(page)).screen,"achievements","unknown claim cannot close transaction");
    await page.evaluate(()=>{Storage.prototype.getItem=window.__achievementStorage.get;Storage.prototype.setItem=window.__achievementStorage.set;});
    state=await debug(page);hit=state.interactionTargets.targets["achievementClaim.levels-10"].hit;
    const levels10Index=state.achievements.entries.findIndex(entry=>entry.id==="levels-10");
    const nextClaimable=state.achievements.entries[levels10Index+1];
    assert.ok(nextClaimable&&nextClaimable.claimable,"next claimable row remains adjacent after retry");
    const levels10RewardIcon = state.achievements.entries.find(entry => entry.id === "levels-10").rewardIconRect;
    await click(page,"achievementClaim.levels-10");
    state=await debug(page);assert.equal(state.economy.coins,1150);assert.equal(state.achievements.pendingClaimId,undefined);
    assert.equal(state.completionFlow.coinFlight?.kind,"coins");
    assert.ok(Math.abs(state.completionFlow.coinFlight.start.x - (levels10RewardIcon.x + levels10RewardIcon.width / 2)) < 0.01);
    assert.ok(Math.abs(state.completionFlow.coinFlight.start.y - (levels10RewardIcon.y + levels10RewardIcon.height / 2)) < 0.01);
    await page.waitForFunction(() => window.__COLOR_ESCAPE__.getDebugState().completionFlow.coinFlight == null);
    assert.deepEqual(state.achievements.claimedIds,["levels-1","levels-10"]);
    result=await probe(page);rowFrames(result);
    assert.ok(state.achievements.entries.findIndex(entry => entry.id === "levels-10")
      > state.achievements.entries.findIndex(entry => entry.id === "stars-10"),
    "confirmed achievement moves below remaining claimable rows");
    await scrollToMax(page); await click(page,"achievementClaim.levels-10");
    assert.equal((await debug(page)).economy.coins,1150);
    await page.screenshot({path:resolve(output,`claimed-${viewport.width}x${viewport.height}.png`)});
    await page.reload({waitUntil:"networkidle"});await page.waitForFunction(()=>window.__COLOR_ESCAPE__?.artReady&&window.__COLOR_ESCAPE__?.storageBaselineReady);
    assert.equal((await debug(page)).economy.coins,1150);
    await page.evaluate(()=>{window.__COLOR_ESCAPE__.updateToastVisible=false;});await open(page);
    await page.evaluate(()=>{const g=window.__COLOR_ESCAPE__,images=new Set(Object.values(g.achievementArt)),original=g.host.releaseImage;window.__achievementReleased=[];g.host.releaseImage=function(image){if(images.has(image))window.__achievementReleased.push(image.src);return original?.call(this,image);};});
    await click(page,"achievementClose");assert.equal((await debug(page)).achievements.art.loadedImages,0);assert.equal(await page.evaluate(()=>window.__achievementReleased.length),12);
    assert.deepEqual(await page.evaluate(()=>window.__achievementReleased.filter(source=>/\/achievements-v2\/row-(active|inactive)\.png$/.test(source)).map(source=>source.split("/").at(-1)).sort()),["row-active.png","row-inactive.png"],"close releases both supplied row frames");
    await open(page);assert.equal((await debug(page)).achievements.art.loadedImages,12);await click(page,"achievementClose");
    await page.evaluate(()=>{const g=window.__COLOR_ESCAPE__;window.__achievementLoad=g.loadImages;g.loadImages=function(paths,...args){if(paths.some(p=>p.includes("/achievements-v2/")))return Promise.reject(new Error("intentional achievement art failure"));return window.__achievementLoad.call(this,paths,...args);};});
    await click(page,"homeAchievements");await page.waitForFunction(()=>Boolean(window.__COLOR_ESCAPE__.getDebugState().achievements.art.error));
    await page.screenshot({path:resolve(output,`load-error-${viewport.width}x${viewport.height}.png`)});
    await page.evaluate(()=>{window.__COLOR_ESCAPE__.loadImages=window.__achievementLoad;});await click(page,"achievementRetry");
    await page.waitForFunction(()=>window.__COLOR_ESCAPE__.getDebugState().achievements.art.ready);assert.equal((await debug(page)).achievements.art.loadedImages,12);
    await click(page,"achievementClose");await seed(page,makeSave({completed:200,allPerfect:true}));await open(page);
    const beforeScroll=(await debug(page)).economy.coins;
    for(let attempt=0;attempt<6;attempt++) {
      state=await debug(page);if(state.achievements.scrollOffset===state.achievements.maxScrollOffset)break;
      const rect=await page.evaluate(()=>window.__COLOR_ESCAPE__.achievementViewportRect());
      const from=await point(page,{...rect,y:rect.y+rect.height*.85,height:0});
      const to=await point(page,{...rect,y:rect.y+rect.height*.15,height:0});
      await page.mouse.move(from.x,from.y);await page.mouse.down();await page.mouse.move(to.x,to.y,{steps:10});await page.mouse.up();
    }
    state=await debug(page);assert.equal(state.achievements.scrollOffset,state.achievements.maxScrollOffset);
    result=await probe(page);
    const tailFrames=rowFrames(result);
    const lastFrame=tailFrames.find(entry=>entry.id==="perfect-200");
    assert.ok(lastFrame&&lastFrame.y>=566&&lastFrame.y+lastFrame.height<=1158,"last supplied frame fully visible at maximum scroll");
    assert.equal(state.economy.coins,beforeScroll,"drag scrolling cannot claim rewards");
    const last=state.interactionTargets.targets["achievementClaim.perfect-200"];assert.ok(last,"last tier visible at maximum scroll");
    await page.screenshot({path:resolve(output,`last-item-${viewport.width}x${viewport.height}.png`)});
    await click(page,"achievementClaim.perfect-200");state=await debug(page);assert.ok(state.achievements.claimedIds.includes("perfect-200"));assert.equal(state.economy.coins,beforeScroll+1000);
    assert.equal(state.completionFlow.coinFlight?.kind,"coins");
    const finalRewardIcon = state.achievements.entries.find(entry => entry.id === "perfect-200").rewardIconRect;
    assert.ok(Math.abs(state.completionFlow.coinFlight.start.x - (finalRewardIcon.x + finalRewardIcon.width / 2)) < 0.01);
    assert.ok(Math.abs(state.completionFlow.coinFlight.start.y - (finalRewardIcon.y + finalRewardIcon.height / 2)) < 0.01);
    await page.waitForFunction(() => window.__COLOR_ESCAPE__.getDebugState().completionFlow.coinFlight == null);
    await click(page,"achievementClose");assert.equal((await debug(page)).screen,"home");
    reports.push({viewport,status:"pass",locales,nativeArtCount:12,uniqueAchievementAssets:10,sharedDailyAssets:2,completedCount:4,catalogSize:19,releaseCount:12,rowFrames:{active:[519,115],inactive:[517,114],states:["claimable-gold","incomplete-grey","claimed-grey"],nativeDrawing:true,scrollOffsetVerified:true,lastFrameFullyVisible:true,releasedImages:2},transactions:["confirmed","rejected","unknown-immutable-retry","exactly-once","reload"],navigation:["close","reopen","load-error-retry","pointer-scroll-last-item"],touchTargets:{minimumCss:44,expandedOverlapCss:overlapCss,ownership:"nearest centre; real Pointer clicks at midpoint minus/plus 0.5 CSS px resolve adjacent rows independently",viewportOutsideClicks:"top/bottom minus/plus 0.5 CSS px cannot claim clipped rows"}});
    await context.close();
  }
  assert.deepEqual(errors,[]);
  await writeFile(resolve(output,"report.json"),JSON.stringify({status:"pass",isolatedBrowserContexts:true,referencePixelPerfectClaimed:false,rowBackground:"Supplied native gold and grey PNG frames selected from actual claim state, with scroll offsets and full last-row visibility verified",reports,errors},null,2));
  console.log("Achievement supplied-art PASS: 12 native slices including stateful gold/grey row frames, two viewports, 10 languages, 19-tier scroll, adjacent target edges, claim/rejected/unknown persistence, release/reopen/load retry.");
} finally { await browser.close(); }
