import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const output = fileURLToPath(new URL("../playtest-results/collection-default-page-2026-09-22/navigation/", import.meta.url));
const url = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
const saveKey = "color-escape-save-v1";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const errors = [], reports = [];
const debug = page => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const save = {
  schemaVersion: 1, currentLevel: 30, highestLevel: 101, coins: 2000,
  sound: false, haptic: false, reducedMotion: false, language: "zh-CN",
  featureSeen: ["basics"], boosterUnlockSeen: ["time", "rocket", "pulse"],
  boosters: { time: 3, rocket: 3, pulse: 3 },
  bestStars: Object.fromEntries(Array.from({ length: 100 }, (_, index) => [String(index + 1), 3])),
  bestMoves: {}, rewardedLevels: Array.from({ length: 100 }, (_, index) => index + 1),
  metaDiscovery: { collectionViewedItemIds: [] },
  achievementProgress: { claimedIds: [] },
  journeyProgress: { claimedMilestoneLevels: [], seenEpisodeUnlockLevels: [] },
  selectedJourneyEpisode: 1, dailyStreak: 0, lastDailyCompletedDay: "",
};
async function point(page, rect) {
  const state = await debug(page), canvas = await page.locator("canvas").boundingBox();
  assert.ok(canvas && rect);
  return { x: canvas.x + state.viewportTransform.offsetX + (rect.x + rect.width / 2) * state.viewportTransform.scale,
    y: canvas.y + state.viewportTransform.offsetY + (rect.y + rect.height / 2) * state.viewportTransform.scale };
}
async function clickRect(page, rect) { const p=await point(page,rect);await page.mouse.click(p.x,p.y); }
async function click(page, key) {
  const target=(await debug(page)).interactionTargets.targets[key];assert.ok(target,`missing ${key}`);
  await clickRect(page,target.hit);await page.waitForTimeout(60);
}
async function settled(page, screen) {
  await page.waitForFunction(expected=>{
    const state=window.__COLOR_ESCAPE__.getDebugState();
    return state.screen===expected&&!state.navigation.transition;
  },screen);
}
async function album(page) {
  await settled(page,"records");
  await page.waitForFunction(()=>{const a=window.__COLOR_ESCAPE__.getDebugState().collectionAlbum.art;return a.ready&&a.artworkReady&&!a.requested
    &&a.currentAtlasIndexes.every(index=>a.loadedAtlasIndexes.includes(index));});
}
async function guide(page) {
  await click(page,"collectionAlbumGuide");
  await page.waitForFunction(()=>{const s=window.__COLOR_ESCAPE__.getDebugState();return s.screen==="mechanismGuide"&&s.collection.artReady;});
}
function snapshot(state) {return {tab:state.collectionAlbum.tab,pageIndex:state.collectionAlbum.pageIndex,visibleIds:state.collectionAlbum.visibleItems.map(i=>i.id)};}
async function renderProbe(page) {
  return page.evaluate(()=>{
    const g=window.__COLOR_ESCAPE__,ctx=g.ctx,original=ctx.drawImage,draws=[];
    ctx.drawImage=function(image,...args){draws.push({source:image.currentSrc||image.src||"",args});return original.call(this,image,...args);};
    try{g.render();}finally{ctx.drawImage=original;}return draws;
  });
}
async function swipe(page) {
  const r=(await debug(page)).collection.layout.listViewportRect;
  const from=await point(page,{...r,y:r.y+r.height*.8,height:0}),to=await point(page,{...r,y:r.y+r.height*.2,height:0});
  await page.mouse.move(from.x,from.y);await page.mouse.down();await page.mouse.move(to.x,to.y,{steps:8});await page.mouse.up();
}

try {
  for(const scenario of [
    {label:"720x1584",viewport:{width:720,height:1584}},
    {label:"320x568",viewport:{width:320,height:568}},
    {label:"safe-720x1584",viewport:{width:720,height:1584},safe:true},
  ]) {
    const context=await browser.newContext({viewport:scenario.viewport,locale:"zh-CN"}),page=await context.newPage();
    page.on("pageerror",e=>errors.push(`${scenario.label}: ${e.message}`));
    page.on("console",m=>{if(m.type()==="error"&&!m.text().includes("navigator.vibrate"))errors.push(`${scenario.label}: ${m.text()}`);});
    const scenarioUrl=new URL(url);if(scenario.safe){scenarioUrl.searchParams.set("safeTop","80");scenarioUrl.searchParams.set("safeBottom","50");}
    await page.goto(scenarioUrl.toString(),{waitUntil:"networkidle"});
    await page.evaluate(({value,key})=>{const id=window.__COLOR_ESCAPE__.getDebugState().updateNotice.id;localStorage.setItem(key,JSON.stringify({...value,lastSeenUpdate:id}));},{value:save,key:saveKey});
    await page.reload({waitUntil:"networkidle"});
    await page.waitForFunction(()=>window.__COLOR_ESCAPE__?.artReady&&window.__COLOR_ESCAPE__?.storageBaselineReady);
    let state=await debug(page);
    const collectionResourceCount=await page.evaluate(async()=>{const {GAME_ART}=await import("/src/game/artManifest.ts");return Object.keys(GAME_ART.ui.collectionAlbum).length+GAME_ART.ui.collectionCardAtlases.levels.length+GAME_ART.ui.collectionCardAtlases.masterpieces.length;});
    const chromeCount=await page.evaluate(async()=>{const {GAME_ART}=await import("/src/game/artManifest.ts");return Object.keys(GAME_ART.ui.collectionAlbum).length;});
    const assertAlbumArt=state=>{const art=state.collectionAlbum.art;assert.ok(art.ready&&art.artworkReady);assert.ok(art.currentAtlasIndexes.every(index=>art.loadedAtlasIndexes.includes(index)));assert.equal(art.loadedImages,chromeCount+art.loadedAtlasIndexes.length);assert.ok(art.loadedImages<=collectionResourceCount);};
    assert.ok(!state.interactionTargets.targets.homeCollectionAlbum,"removed duplicate Home entry cannot be clicked");
    const homeDraws=await renderProbe(page);
    assert.ok(!homeDraws.some(d=>d.source.endsWith("/home-v3/collection-album-entry.png")),"removed duplicate Home entry cannot be painted");
    const unseenBefore=state.discovery.collection.pendingItemIds;
    await click(page,"navigation.4");await album(page);state=await debug(page);
    assert.equal(state.navigation.selected,"records");assert.equal(state.collectionAlbum.open,true);
    assert.equal(state.collectionAlbum.tab,"levels");assert.equal(state.collectionAlbum.visibleItems.length,9);assert.equal(state.collectionAlbum.pageCount,23);
    assert.equal(state.collectionAlbum.pageIndex,11,"highest completed Lv100 belongs to page12, not unlocked Lv101");
    assert.ok(!state.interactionTargets.targets.collectionAlbumClose,"main page has navigation, not modal close");
    assertAlbumArt(state);assert.ok(state.collectionAlbum.art.loadedAtlasIndexes.length<10,"cold entry loads only nearby atlases");assert.equal(state.collectionAlbum.levelCardCount,200);assert.equal(state.collectionAlbum.masterpieceCount,40);
    assert.deepEqual(state.discovery.collection.pendingItemIds,unseenBefore,"opening album does not mark mechanism guide items read");
    await page.screenshot({path:resolve(output,`album-${scenario.label}.png`)});

    const tabs=[];
    for(const tab of ["levels","masterpieces"]) {
      await click(page,`collectionAlbumTab.${tab}`);await click(page,"collectionAlbumNext");await click(page,"collectionAlbumNext");
      await album(page);await page.waitForFunction(()=>window.__COLOR_ESCAPE__.getDebugState().collectionAlbum.art.pendingAtlasIndexes.length===0);
      state=await debug(page);const before=snapshot(state);
      const albumImagesBeforeGuide=state.collectionAlbum.art.loadedImages;
      assert.equal(state.collectionAlbum.pageCount,tab==="levels"?23:5);assert.equal(state.collectionAlbum.visibleItems.length,9);
      assert.equal(before.pageIndex,tab==="levels"?13:2);
      const blockedRects=[state.interactionTargets.targets["navigation.2"].hit,state.interactionTargets.targets.collectionAlbumNext.hit];
      await guide(page);state=await debug(page);
      assert.equal(state.collectionAlbum.guideOpen,true);assert.equal(state.collectionAlbum.open,true);assert.equal(state.navigation.selected,"records");
      assert.deepEqual(snapshot(state),before);assertAlbumArt(state);assert.equal(state.collectionAlbum.art.loadedImages,albumImagesBeforeGuide);
      assert.equal(state.collection.allTotal,15);
      const draws=await renderProbe(page);
      assert.ok(draws.some(d=>d.source.includes("/collection-album-v3/card-")),"modal retains painted official album underlay");
      assert.ok(draws.some(d=>d.source.includes("/formal-pages/mechanism-guide-v2/panel.png")),"modal paints official mechanism guide");
      const resolved=await page.evaluate(rects=>rects.map(rect=>window.__COLOR_ESCAPE__.buttonReleaseTargetAt({id:1,x:rect.x+rect.width/2,y:rect.y+rect.height/2})?.key),blockedRects);
      assert.ok(resolved.every(key=>!key?.startsWith("navigation.")&&key!=="collectionAlbumNext"),"modal does not resolve underlying controls");
      const close=state.interactionTargets.targets.mechanismGuideClose;assert.ok(close&&close.cssWidth>=43.9&&close.cssHeight>=43.9,"modal close44px");
      if(tab==="levels")await page.screenshot({path:resolve(output,`guide-initial-${scenario.label}.png`)});
      for(const rect of blockedRects){await clickRect(page,rect);assert.equal((await debug(page)).screen,"mechanismGuide");assert.deepEqual(snapshot(await debug(page)),before);}
      await swipe(page);assert.ok((await debug(page)).collection.scrollOffset>0,"guide pointer scroll");
      const itemKey=Object.keys((await debug(page)).interactionTargets.targets).find(key=>key.startsWith("collection."));
      assert.ok(itemKey);await click(page,itemKey);assert.equal((await debug(page)).collection.selectedId,itemKey.slice("collection.".length));
      await page.screenshot({path:resolve(output,`guide-${tab}-${scenario.label}.png`)});
      await click(page,"mechanismGuideClose");state=await debug(page);
      assert.equal(state.screen,"records");assert.equal(state.collectionAlbum.guideOpen,false);assert.deepEqual(snapshot(state),before);assertAlbumArt(state);assert.equal(state.collectionAlbum.art.loadedImages,albumImagesBeforeGuide);
      await page.screenshot({path:resolve(output,`returned-${tab}-${scenario.label}.png`)});
      tabs.push(before);
    }

    // Detail blocks all parent controls; unknown restoration additionally
    // blocks its own close until the exact immutable candidate is retried.
    await click(page,"collectionAlbumTab.levels");await click(page,"collectionAlbumTab.masterpieces");
    await album(page);
    state=await debug(page);const parentRects=[state.interactionTargets.targets["navigation.2"].hit,state.interactionTargets.targets.collectionAlbumGuide.hit];
    await click(page,"collectionAlbumCard.masterpiece-01");state=await debug(page);assert.equal(state.collectionAlbum.detailId,"masterpiece-01");
    const detailParentTargets=await page.evaluate(rects=>rects.map(rect=>window.__COLOR_ESCAPE__.buttonReleaseTargetAt({id:1,x:rect.x+rect.width/2,y:rect.y+rect.height/2})?.key),parentRects);
    assert.ok(detailParentTargets.every(key=>!key?.startsWith("navigation.")&&key!=="collectionAlbumGuide"));
    await clickRect(page,parentRects[0]);assert.equal((await debug(page)).collectionAlbum.detailId,"masterpiece-01");assert.equal((await debug(page)).screen,"records");
    await page.evaluate(()=>{window.__navStorage={get:Storage.prototype.getItem,set:Storage.prototype.setItem};Storage.prototype.getItem=()=>{throw new Error("intentional unknown read");};Storage.prototype.setItem=()=>{throw new Error("intentional unknown write");};});
    await click(page,"collectionAlbumDetailPrimary");state=await debug(page);assert.equal(state.collectionAlbum.pendingRestorationId,"masterpiece-01");
    const candidate=await page.evaluate(()=>JSON.stringify(window.__COLOR_ESCAPE__.pendingCollectionRestoration.candidateSave));
    await click(page,"collectionAlbumDetailClose");
    for(const rect of parentRects)await clickRect(page,rect);
    state=await debug(page);assert.equal(state.screen,"records");assert.equal(state.collectionAlbum.detailId,"masterpiece-01");assert.equal(state.collectionAlbum.pendingRestorationId,"masterpiece-01");
    assert.equal(await page.evaluate(()=>JSON.stringify(window.__COLOR_ESCAPE__.pendingCollectionRestoration.candidateSave)),candidate);
    await page.evaluate(()=>{Storage.prototype.getItem=window.__navStorage.get;Storage.prototype.setItem=window.__navStorage.set;});
    await click(page,"collectionAlbumDetailPrimary");assert.equal((await debug(page)).collectionAlbum.pendingRestorationId,undefined);
    await click(page,"collectionAlbumDetailClose");

    await page.waitForFunction(()=>window.__COLOR_ESCAPE__.getDebugState().collectionAlbum.art.pendingAtlasIndexes.length===0);
    const albumImagesBeforeExit=(await debug(page)).collectionAlbum.art.loadedImages;
    await page.evaluate(()=>{const g=window.__COLOR_ESCAPE__,images=new Set([...Object.values(g.collectionAlbumArt),...g.collectionAlbumArtwork.images]),release=g.host.releaseImage;window.__albumReleased=[];g.host.releaseImage=function(image){if(images.has(image))window.__albumReleased.push(image.src);return release?.call(this,image);};});
    await click(page,"navigation.2");await settled(page,"home");state=await debug(page);
    assert.equal(state.collectionAlbum.art.loadedImages,0);assert.equal(await page.evaluate(()=>window.__albumReleased.length),albumImagesBeforeExit);
    for(const [index,screen] of [[0,"supply"],[1,"leaderboard"],[3,"levels"],[4,"records"],[2,"home"],[4,"records"]]){
      await click(page,`navigation.${index}`);await settled(page,screen);if(screen==="records"){await album(page);assert.equal((await debug(page)).collectionAlbum.tab,"levels");assert.equal((await debug(page)).collectionAlbum.pageIndex,11);}assert.equal((await debug(page)).navigation.selected,screen);
    }
    reports.push({scenario:scenario.label,status:"pass",tabReturns:tabs,guideCount:15,albumResourceCapacity:collectionResourceCount,removedHomeDuplicate:true,mainNavigation:true,modalUnderlayPainted:true,underlyingClicksBlocked:true,unknownRestorationEscapeBlocked:true,resourcesReleasedOnMainExit:albumImagesBeforeExit});
    await context.close();
  }
  {
    const context=await browser.newContext({viewport:{width:720,height:1584},locale:"zh-CN"});
    const page=await context.newPage();let releaseLoad;let intercepted=0;
    const delayed=new Promise(resolveDelay=>{releaseLoad=resolveDelay;});
    page.on("pageerror",e=>errors.push(`late-guide: ${e.message}`));
    await page.goto(url,{waitUntil:"networkidle"});
    await page.waitForFunction(()=>window.__COLOR_ESCAPE__?.artReady&&window.__COLOR_ESCAPE__?.storageBaselineReady);
    await page.evaluate(()=>{window.__COLOR_ESCAPE__.updateToastVisible=false;});
    await click(page,"navigation.4");await album(page);
    // Delay the guide-only panel after the prerequisite album is ready.
    const guidePanel=await page.evaluate(async()=>{const {GAME_ART}=await import("/src/game/artManifest.ts");return GAME_ART.ui.formalPages.collection.panel;});
    await page.route(`**/${guidePanel}`,async route=>{intercepted++;await delayed;await route.continue();});
    await click(page,"collectionAlbumTab.levels");await click(page,"collectionAlbumNext");
    const before=snapshot(await debug(page));
    await click(page,"collectionAlbumGuide");
    await page.waitForFunction(()=>window.__COLOR_ESCAPE__.getDebugState().screen==="mechanismGuide");
    assert.equal((await debug(page)).collection.artReady,false,"delayed guide art must show loading");
    await page.screenshot({path:resolve(output,"guide-loading-close-race.png")});
    await click(page,"mechanismGuideClose");assert.equal((await debug(page)).screen,"records");
    releaseLoad();await page.waitForTimeout(600);
    assert.ok(intercepted>0,"guide request actually delayed");
    assert.equal((await debug(page)).screen,"records","late guide image cannot reopen modal");assert.deepEqual(snapshot(await debug(page)),before);
    await guide(page);await click(page,"mechanismGuideClose");assert.deepEqual(snapshot(await debug(page)),before);
    reports.push({scenario:"late-guide-art-close",status:"pass",intercepted,lateResponseReopenedModal:false,parentPagePreserved:true});
    await context.close();
  }
  assert.deepEqual(errors,[]);
  await writeFile(resolve(output,"report.json"),JSON.stringify({status:"pass",isolatedContexts:true,reports,errors},null,2));
  console.log("Collection main-page and guide-modal navigation PASS: 3 viewports, preserved tabs/pages, blocked underlay, transaction isolation, removed duplicate entry, current-manifest image lifecycle, five tabs.");
} finally {await browser.close();}
