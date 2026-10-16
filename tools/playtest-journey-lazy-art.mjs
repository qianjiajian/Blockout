import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = resolve(root, process.env.PLAYTEST_OUTPUT ?? "playtest-results/journey-lazy-art-20260927");
const origin = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5180/";
const fixtureUrl = new URL("/__journey_lazy_art_fixture__", origin).href;
const sourceHash = async () => createHash("sha256")
  .update(await readFile(resolve(root, "src/game/ColorEscapeGame.ts"))).digest("hex");
const deferredSourceHash = async () => createHash("sha256")
  .update(await readFile(resolve(root, "src/game/JourneyDeferredArt.ts"))).digest("hex");
await mkdir(output, { recursive: true });
const report = {
  scope: "Isolated MemoryHost, real Pointer navigation/scroll/claim inputs; no native player storage access. Desktop Chromium, not WeChat/device certification. Synthetic per-image delay is not a network-speed claim.",
  revision: "Final suite adds pending-popup reuse and Home failure dismissal; first-paint image counts include Journey groups only, excluding unrelated startup image requests. Initial 12-case raw evidence is retained in report-initial.json.",
  generatedAt: new Date().toISOString(), sourceBefore: await sourceHash(), deferredSourceBefore: await deferredSourceHash(), cases: [],
};

function fixture(options) {
  return `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;overflow:hidden;background:#201953}canvas{display:block;width:100vw;height:100vh;touch-action:none}</style><script type="module">
import {ColorEscapeGame} from '/src/game/ColorEscapeGame.ts';
import {WebHost} from '/src/platform/WebHost.ts';
import {GAME_ART} from '/src/game/artManifest.ts';
const options=${JSON.stringify(options)};
const paths=GAME_ART.ui.formalPages.journey;
const presentations=new Set(Object.values(paths.presentation).flatMap(v=>typeof v==='string'?[v]:Object.values(v)));
const profile={images:[],marks:[],draws:[],phase:'startup',failures:0};
const controls={delayMs:options.delayMs??0,presentationDelayMs:0,episodeDelayMs:0,failPresentation:0,failEpisode:0,failBase:0};
window.__PROFILE__=profile;window.__CONTROLS__=controls;
const records=new WeakMap();
class MemoryHost extends WebHost {
 data=new Map();
 storageRead(k){return this.data.has(k)?{status:'ok',value:structuredClone(this.data.get(k))}:{status:'missing'};}
 storageGet(k,f){const r=this.storageRead(k);return r.status==='ok'?r.value:f;}
 storageSet(k,v){this.data.set(k,structuredClone(v));return true;}
 music(){}sound(){}vibrate(){}
 async createImage(src){
  const journey=src.includes('/formal-pages/journey/');
  const group=presentations.has(src)?'presentation':paths.episodes.includes(src)?'episode':paths.homeThemes.includes(src)?'home':journey?'base':'other';
  const item={src,group,start:performance.now(),phase:profile.phase};profile.images.push(item);
  try{
   const delay=journey?(group==='presentation'?controls.presentationDelayMs:group==='episode'?controls.episodeDelayMs:0)||controls.delayMs:0;
   if(delay)await new Promise(r=>setTimeout(r,delay));
   const failKey=group==='presentation'?'failPresentation':group==='episode'?'failEpisode':group==='base'?'failBase':undefined;
   if(failKey&&controls[failKey]>0){controls[failKey]--;profile.failures++;throw new Error('Synthetic '+group+' load failure');}
   const image=await super.createImage(src);records.set(image,item);item.width=image.naturalWidth;item.height=image.naturalHeight;return image;
  }catch(error){item.error=String(error);throw error;}finally{item.end=performance.now();}
 }
 releaseImage(image){const item=records.get(image);if(item)item.released=performance.now();super.releaseImage(image);}
}
const highestLevel=options.highestLevel??1;
const save={schemaVersion:1,currentLevel:1,highestLevel,coins:1000,sound:false,haptic:false,reducedMotion:options.reducedMotion??true,language:'zh-CN',featureSeen:['basics','ice-door','ice-block','layer','shutter','generator','elevator','conveyor','star'],boosterUnlockSeen:['time','rocket','pulse'],boosters:{time:1,rocket:1,pulse:1},bestStars:{},bestMoves:{},rewardedLevels:Array.from({length:Math.max(0,highestLevel-1)},(_,i)=>i+1),journeyProgress:{claimedMilestoneLevels:options.claimedMilestoneLevels??[],seenEpisodeUnlockLevels:[]},achievementProgress:{claimedIds:[]},selectedJourneyEpisode:1,collectionProgress:{version:1,inspiration:0,restoredMasterpieceIds:[],seenItemIds:[],claimedMilestoneIds:[]},dailyStreak:0,lastDailyCompletedDay:''};
const host=new MemoryHost();host.data.set('color-escape-save-v1',save);const game=new ColorEscapeGame(host);window.__TEST__={game,host,paths};
const original=game.drawLevels;game.drawLevels=function(...args){
 const start=performance.now();const ready=game.formalPageReady('levels');
 try{return original.apply(this,args);}finally{profile.draws.push({start,end:performance.now(),ready,transition:!!game.navigationTransition,phase:profile.phase,visibleEpisodes:game.journeyScrollView().episodeRows.map(r=>r.episode.index)});}
};
game.start();
</script>`;
}

const browser = await chromium.launch({ headless: true });
const debug = page => page.evaluate(() => window.__TEST__.game.getDebugState());
const mark = (page, phase) => page.evaluate(value => {
  window.__PROFILE__.phase = value;
  window.__PROFILE__.marks.push({ name: value, at: performance.now() });
}, phase);
const controls = (page, updates) => page.evaluate(value => Object.assign(window.__CONTROLS__, value), updates);
async function click(page, key) {
  const target = await page.evaluate(value => {
    const game = window.__TEST__.game, state = game.getDebugState();
    const rect = state.interactionTargets.targets[value]?.hit;
    if (!rect) throw new Error('Missing interaction target ' + value);
    const box = game.host.canvas.getBoundingClientRect(), t = state.viewportTransform;
    return { x: box.x+t.offsetX+(rect.x+rect.width/2)*t.scale, y: box.y+t.offsetY+(rect.y+rect.height/2)*t.scale };
  }, key);
  await page.mouse.click(target.x, target.y, { delay: 35 });
}
async function waitScreen(page, screen) {
  await page.waitForFunction(value => {
    const g = window.__TEST__.game;
    return g.screen === value && !g.navigationTransition && (value !== 'levels' || g.formalPageReady('levels'));
  }, screen, { timeout: 15000 });
  await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
}
async function enter(page, phase = 'first-entry') {
  await mark(page, phase); await click(page, 'navigation.3'); await waitScreen(page, 'levels');
}
async function leave(page) {
  await mark(page, 'leave'); await click(page, 'navigation.2'); await waitScreen(page, 'home');
}
async function gesture(page, logicalDelta) {
  const state = await debug(page), v = state.journey.viewport;
  const box = await page.locator('canvas').boundingBox(), t = state.viewportTransform;
  const delta = Math.sign(logicalDelta)*Math.min(Math.abs(logicalDelta), v.height*0.48);
  const x = box.x+t.offsetX+(v.x+v.width*0.5)*t.scale;
  const start = box.y+t.offsetY+(v.y+v.height*(delta>0?0.24:0.76))*t.scale;
  await page.mouse.move(x,start); await page.mouse.down();
  for(let n=1;n<=10;n++){await page.mouse.move(x,start+delta*t.scale*n/10);await page.waitForTimeout(16);}
  assert.equal((await debug(page)).journey.scrolling,true,'Pointer drag must reach Journey scroll handler');
  await page.mouse.up(); await page.waitForTimeout(60);
}
async function seek(page, kind, id) {
  const key = kind==='episode'?`journeyEpisode.${id}`:`journeyReward.${id}`;
  for(let attempt=0;attempt<40;attempt++) {
    const state = await debug(page);
    const target = state.interactionTargets.targets[key]?.hit, v=state.journey.viewport;
    if(target && target.y>=v.y+12 && target.y+target.height<=v.y+v.height-12) return key;
    const delta = await page.evaluate(({kind,id})=>{
      const g=window.__TEST__.game;
      const source=g.journeyContentModel().entries.find(e=>e.kind===kind&&(kind==='episode'?e.episode.index:e.levelId)===id);
      if(!source)throw new Error('Missing Journey entry '+kind+' '+id);
      const viewport=g.journeyContentViewportArt();
      const row={...source,y:viewport.y+source.contentY-g.journeyScrollOffset};
      const rect=kind==='episode'?g.journeyEpisodeButtonRect(row):g.journeyRewardRectForRow(row);
      const v=g.getDebugState().journey.viewport;
      return v.y+v.height/2-(rect.y+rect.height/2);
    },{kind,id});
    await gesture(page,delta);
  }
  throw new Error('Could not reach '+key+' by Pointer scroll');
}
async function presentationReady(page) {
  await page.waitForFunction(()=>{
    const g=window.__TEST__.game;
    return g.journeyPresentation?.phase==='overlay' && g.journeyPresentationArtReady();
  },undefined,{timeout:15000});
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
}
async function runCase(name, options, action) {
  const context = await browser.newContext({ viewport: options.viewport??{width:496,height:1078}, deviceScaleFactor:1,locale:'zh-CN' });
  const result={name,options,passed:false,errors:[]};report.cases.push(result);
  await context.addInitScript(()=>{
    window.__NATIVE_STORAGE_CALLS__=[];
    for(const name of ['getItem','setItem','removeItem','clear']){
      const old=Storage.prototype[name];Storage.prototype[name]=function(...args){window.__NATIVE_STORAGE_CALLS__.push(name);return old.apply(this,args);};
    }
  });
  const page=await context.newPage();page.on('pageerror',error=>result.errors.push(error.message));
  await page.route(fixtureUrl,route=>route.fulfill({contentType:'text/html',body:fixture(options)}));
  try {
    await page.goto(fixtureUrl,{waitUntil:'commit'});
    await page.waitForFunction(()=>window.__TEST__?.game.artReady&&window.__TEST__.game.storageBaselineReady,undefined,{timeout:60000});
    await page.evaluate(()=>{const g=window.__TEST__.game;g.updateToastVisible=false;g.boosterUnlockToast=undefined;g.dirty=true;g.scheduleFrame();});
    await action(page,result);
    result.profile=await page.evaluate(()=>window.__PROFILE__);
    result.nativeStorageCalls=await page.evaluate(()=>window.__NATIVE_STORAGE_CALLS__);
    assert.deepEqual(result.nativeStorageCalls,[],'Must never access native player storage');
    assert.deepEqual(result.errors,[],'Must not produce runtime errors');
    result.passed=true;console.log(`PASS ${name}`);
  } catch(error) {
    result.error=String(error.stack??error);
    result.state=await debug(page).catch(()=>undefined);
    result.profile=await page.evaluate(()=>window.__PROFILE__).catch(()=>undefined);
    await page.screenshot({path:resolve(output,`${name}-failure.png`)}).catch(()=>{});
    throw error;
  } finally {
    await writeFile(resolve(output,`${name}.json`),JSON.stringify(result,null,2));await context.close();
  }
}

try {
  for(const viewport of [{width:496,height:1078},{width:320,height:568}]) {
    for(const delayMs of [0,150]) {
      await runCase(`cold-${viewport.width}-${delayMs}`,{viewport,delayMs,reducedMotion:false},async(page,result)=>{
        await enter(page);
        const data=await page.evaluate(()=>({profile:window.__PROFILE__,state:window.__TEST__.game.getDebugState()}));
        const first=data.profile.draws.find(d=>d.phase==='first-entry'&&d.ready);
        assert.ok(first,'Journey must render ready content');
        const requests=data.profile.images.filter(i=>i.phase==='first-entry'&&i.start<=first.start&&['base','episode','presentation'].includes(i.group));
        assert.equal(requests.filter(i=>i.group==='base').length,20,'Only 20 base images are required');
        assert.equal(requests.filter(i=>i.group==='presentation').length,0,'Popups must not block map first paint');
        assert.equal(requests.filter(i=>i.group==='episode').length,0,'Chapter images must not block the first map-shell paint');
        const episodes=data.profile.images.filter(i=>i.phase==='first-entry'&&i.group==='episode'&&i.start<=first.end);
        assert.ok(episodes.length>0&&episodes.length<10,'Only nearby chapter art should start during the first map-shell paint');
        assert.equal(requests.length,20,'First paint waits only for the 20 map-shell images');
        for(const episode of first.visibleEpisodes)assert.ok(episodes.some(i=>i.src.endsWith(`episode-${String(episode).padStart(2,'0')}.webp`)),`Visible episode ${episode} is required`);
        const encodedAssetBytes=(await Promise.all(requests.map(i=>stat(resolve(root,'public',i.src))))).reduce((total,file)=>total+file.size,0);
        result.measurement={imageCount:requests.length,baseCount:20,episodeCount:0,deferredEpisodeCount:episodes.length,presentationCount:0,encodedAssetBytes,visibleEpisodes:first.visibleEpisodes,firstReadyDrawMs:first.start-data.profile.marks.find(m=>m.name==='first-entry').at};
        await page.screenshot({path:resolve(output,`${result.name}-ready.png`)});
        const initialEpisodes=new Set(episodes.map(i=>i.src));
        await mark(page,'scroll-new-chapter');await seek(page,'episode',3);
        await page.waitForFunction(()=>window.__PROFILE__.images.some(i=>i.src.endsWith('episode-03.webp')&&i.end&&!i.error));
        const after=await page.evaluate(()=>window.__PROFILE__.images.filter(i=>i.group==='episode').map(i=>i.src));
        assert.ok(after.some(src=>!initialEpisodes.has(src)),'Pointer scrolling must request new chapter art');
        assert.equal((await page.evaluate(()=>window.__PROFILE__.images.filter(i=>i.group==='presentation').length)),0,'Scrolling must not preload popup art');
        result.scrollLoadedEpisodes=after;
        await page.screenshot({path:resolve(output,`${result.name}-scrolled.png`)});
        await leave(page);await page.waitForTimeout(delayMs*4+100);
        result.residentJourneyImages=await page.evaluate(()=>window.__PROFILE__.images.filter(i=>['base','episode','presentation'].includes(i.group)&&i.end&&!i.error&&!i.released));
        assert.deepEqual(result.residentJourneyImages,[],'Leaving Journey releases all map/page images');
      });
    }
  }
  await runCase('high-progress-initial-151',{highestLevel:151},async(page,result)=>{
    await enter(page);
    const data=await page.evaluate(()=>({profile:window.__PROFILE__,state:window.__TEST__.game.getDebugState()}));
    const episodes=data.profile.images.filter(i=>i.group==='episode');
    assert.ok(episodes.length>0&&episodes.length<10,'High-progress entry remains lazy');
    for(const episode of data.state.journey.visibleEpisodes){
      const theme=(episode-1)%10+1;
      assert.ok(episodes.some(i=>i.src.endsWith(`episode-${String(theme).padStart(2,'0')}.webp`)),`Chapter ${episode} loads its reused theme ${theme}`);
    }
    assert.equal(data.profile.images.filter(i=>i.group==='presentation').length,0);
    result.visibleEpisodes=data.state.journey.visibleEpisodes;result.episodePaths=episodes.map(i=>i.src);
    await page.screenshot({path:resolve(output,'high-progress-initial-151-ready.png')});
  });
  await runCase('reward-and-theme',{highestLevel:21},async(page,result)=>{
    await enter(page);await click(page,await seek(page,'reward',10));await presentationReady(page);
    let state=await debug(page);assert.equal(state.journey.presentation.event.level,10);
    assert.equal(state.journey.presentation.primaryAction,'claim');
    const before=await page.evaluate(()=>structuredClone(window.__TEST__.game.save));
    await page.screenshot({path:resolve(output,'reward-ready.png')});
    await click(page,'journeyPresentation');
    await page.waitForFunction(()=>!window.__TEST__.game.journeyPresentation);
    state=await debug(page);assert.ok(state.journey.progress.claimedMilestoneLevels.includes(10),'Claim persists');
    const after=await page.evaluate(()=>structuredClone(window.__TEST__.game.save));
    result.rewardDelta={coins:after.coins-before.coins,boosters:Object.fromEntries(Object.keys(after.boosters).map(k=>[k,after.boosters[k]-before.boosters[k]]))};
    assert.equal(result.rewardDelta.coins,50,'Lv10 reward grants exactly its configured 50 coins');
    assert.deepEqual(result.rewardDelta.boosters,{time:0,rocket:0,pulse:0});
    await click(page,await seek(page,'reward',10));await presentationReady(page);
    assert.equal((await debug(page)).journey.presentation.primaryAction,null,'Claimed reward cannot grant again');
    await click(page,'journeyPresentationClose');
    await click(page,await seek(page,'episode',2));await presentationReady(page);
    assert.equal((await debug(page)).journey.presentation.intent,'theme_selection');
    await page.screenshot({path:resolve(output,'theme-ready.png')});await click(page,'journeyPresentation');
    await page.waitForFunction(()=>!window.__TEST__.game.journeyPresentation&&window.__TEST__.game.save.selectedJourneyEpisode===2);
    result.selectedEpisode=(await debug(page)).journey.selectedEpisode;
    const requests=await page.evaluate(()=>window.__PROFILE__.images.filter(i=>i.group==='presentation'));
    assert.equal(requests.length,11,'Popup batch is loaded once and reused within Journey');
  });
  await runCase('popup-failure-retry',{highestLevel:11},async(page,result)=>{
    await enter(page);await controls(page,{failPresentation:1});
    await click(page,await seek(page,'reward',10));
    await page.waitForFunction(()=>window.__TEST__.game.journeyPresentationArtFailed());
    result.failureState=await debug(page);await page.screenshot({path:resolve(output,'popup-load-failure.png')});
    await click(page,'journeyPresentationArtRetry');await presentationReady(page);
    assert.equal((await debug(page)).journey.presentation.primaryAction,'claim');
    await click(page,'journeyPresentationClose');
    assert.equal((await debug(page)).journey.presentation,undefined,'Popup can close after retry');
    assert.deepEqual((await debug(page)).journey.progress.claimedMilestoneLevels,[],'Retry and close cannot grant rewards');
  });
  await runCase('base-failure-retry',{highestLevel:1},async(page,result)=>{
    await controls(page,{failBase:1});await mark(page,'first-entry');await click(page,'navigation.3');
    await page.waitForFunction(()=>window.__TEST__.game.formalPageFailed('levels')&&!window.__TEST__.game.navigationTransition);
    result.failureState=await debug(page);
    await page.screenshot({path:resolve(output,'base-load-failure.png')});
    await click(page,'formalPageRetry');await waitScreen(page,'levels');
    assert.equal((await page.evaluate(()=>window.__PROFILE__.images.filter(i=>i.group==='presentation').length)),0);
    await leave(page);await page.waitForTimeout(100);
    result.resident=await page.evaluate(()=>window.__PROFILE__.images.filter(i=>['base','episode','presentation'].includes(i.group)&&i.end&&!i.error&&!i.released));
    assert.deepEqual(result.resident,[],'Base retry releases its failed batch and eventual successful page');
  });
  await runCase('late-popup-release',{highestLevel:11},async(page,result)=>{
    await enter(page);await controls(page,{presentationDelayMs:300});
    await click(page,await seek(page,'reward',10));
    await page.waitForFunction(()=>window.__PROFILE__.images.some(i=>i.group==='presentation'&&!i.end));
    await click(page,'journeyPresentationClose');await leave(page);
    await page.waitForTimeout(1200);
    const images=await page.evaluate(()=>window.__PROFILE__.images.filter(i=>['base','episode','presentation'].includes(i.group)));
    const leftAt=await page.evaluate(()=>window.__PROFILE__.marks.find(m=>m.name==='leave').at);
    assert.ok(images.some(i=>i.group==='presentation'&&i.end>leftAt),'Scenario must include popup results arriving after leaving');
    result.resident=images.filter(i=>i.end&&!i.error&&!i.released);
    assert.deepEqual(result.resident,[],'Late popup results must release rather than resurrect the page');
    await controls(page,{presentationDelayMs:0});await enter(page,'reentry');
    assert.equal((await debug(page)).journey.presentation,undefined);
  });
  await runCase('late-chapter-release',{highestLevel:1},async(page,result)=>{
    await enter(page);await controls(page,{episodeDelayMs:500});await mark(page,'late-episode');
    await seek(page,'episode',3);
    const pending=await page.evaluate(()=>window.__PROFILE__.images.filter(i=>i.group==='episode'&&!i.end));
    assert.ok(pending.length>0,'Scenario must actually have outstanding chapter requests');
    await leave(page);await page.waitForTimeout(1000);
    result.lateImages=await page.evaluate(()=>window.__PROFILE__.images.filter(i=>i.phase==='late-episode'&&i.group==='episode'));
    assert.ok(result.lateImages.every(i=>i.error||i.released),'Late chapter requests must be released');
  });
  await runCase('popup-close-reopen-pending',{highestLevel:11},async(page,result)=>{
    await enter(page);await controls(page,{presentationDelayMs:400});
    const rewardKey=await seek(page,'reward',10);await click(page,rewardKey);
    await page.waitForFunction(()=>window.__PROFILE__.images.some(i=>i.group==='presentation'&&!i.end));
    await click(page,'journeyPresentationClose');
    assert.equal((await debug(page)).journey.presentation,undefined);
    const pending=await page.evaluate(()=>window.__PROFILE__.images.filter(i=>i.group==='presentation'&&!i.end).length);
    assert.ok(pending>0,'Reopen scenario must retain an unfinished popup batch');
    await click(page,rewardKey);await presentationReady(page);
    result.presentationRequests=await page.evaluate(()=>window.__PROFILE__.images.filter(i=>i.group==='presentation'));
    assert.equal(result.presentationRequests.length,11,'Reopening reuses pending entries without duplicate image requests');
    assert.equal(new Set(result.presentationRequests.map(i=>i.src)).size,11);
    assert.deepEqual((await debug(page)).journey.progress.claimedMilestoneLevels,[]);
    await click(page,'journeyPresentationClose');await leave(page);
  });
  for(const fail of [false,true]){
    await runCase(`home-chapter-unlock-${fail?'failure':'ready'}`,{highestLevel:11,claimedMilestoneLevels:[10]},async(page,result)=>{
      await controls(page,{failPresentation:fail?1:0,presentationDelayMs:100});
      await mark(page,'home-unlock-trigger');
      result.trigger='Explicit fixture invocation of existing pending chapter flow; not a simulated level win.';
      assert.equal(await page.evaluate(()=>window.__TEST__.game.beginPendingJourneyPresentation()),true);
      if(fail){
        await page.waitForFunction(()=>window.__TEST__.game.journeyPresentationArtFailed());
        result.failureState=await debug(page);
        await page.screenshot({path:resolve(output,'home-chapter-unlock-load-failure.png')});
        await click(page,'journeyPresentationArtRetry');
      }
      await presentationReady(page);
      let state=await debug(page);
      assert.equal(state.screen,'home','Chapter unlock stays on Home');
      assert.equal(state.journey.presentation.event.type,'episode_unlock');
      assert.equal(state.journey.presentation.event.episode.index,2);
      assert.equal(await page.evaluate(()=>window.__PROFILE__.draws.length),0,'Home chapter path cannot rely on drawLevels');
      await page.screenshot({path:resolve(output,`${result.name}-ready.png`)});
      await click(page,'journeyPresentationClose');
      await page.waitForFunction(()=>!window.__TEST__.game.journeyPresentation);
      state=await debug(page);assert.ok(state.journey.progress.seenEpisodeUnlockLevels.includes(11));
      assert.equal(state.screen,'home');assert.equal(state.economy.coins,1000);
      await page.waitForTimeout(200);
      result.resident=await page.evaluate(()=>window.__PROFILE__.images.filter(i=>['base','episode','presentation'].includes(i.group)&&i.end&&!i.error&&!i.released));
      assert.deepEqual(result.resident,[],'Closing the Home unlock releases Journey art');
    });
  }
  await runCase('home-chapter-failure-dismiss',{highestLevel:11,claimedMilestoneLevels:[10]},async(page,result)=>{
    await controls(page,{failPresentation:1,presentationDelayMs:100});
    result.trigger='Explicit fixture invocation of existing pending chapter flow; not a simulated level win.';
    assert.equal(await page.evaluate(()=>window.__TEST__.game.beginPendingJourneyPresentation()),true);
    await page.waitForFunction(()=>window.__TEST__.game.journeyPresentation?.phase==='overlay'&&window.__TEST__.game.journeyPresentationArtFailed());
    await click(page,'journeyPresentationClose');
    await page.waitForFunction(()=>!window.__TEST__.game.journeyPresentation);
    let state=await debug(page);assert.equal(state.screen,'home');
    assert.deepEqual(state.journey.progress.seenEpisodeUnlockLevels,[],'Dismissing failed chapter popup must not acknowledge the introduction');
    await enter(page,'after-dismiss-navigation');
    state=await debug(page);assert.equal(state.screen,'levels');assert.equal(state.journey.presentation,undefined);
    assert.deepEqual(state.journey.progress.seenEpisodeUnlockLevels,[],'User can leave without consuming pending introduction');
    result.progress=state.journey.progress;await leave(page);
  });
  try {
    const baseline=JSON.parse(await readFile(resolve(root,'playtest-results/journey-cold-profile-20260927/report.json'),'utf8'));
    report.priorBaseline={sourceHash:baseline.sourceBefore,note:'Previously measured eager loader on same desktop setup; not a simultaneous device benchmark.',runs:baseline.runs.map(r=>({delayMs:r.summary.delayMs,...r.summary['first-entry']}))};
  } catch {}
  report.sourceAfter=await sourceHash();report.sourceUnchanged=report.sourceBefore===report.sourceAfter;
  report.deferredSourceAfter=await deferredSourceHash();
  assert.equal(report.deferredSourceBefore,report.deferredSourceAfter,'Deferred loader must remain unchanged during verification');
  assert.equal(report.sourceUnchanged,true,'UI source must remain unchanged during verification');
  report.passed=true;
} catch(error) {
  report.passed=false;report.error=String(error.stack??error);process.exitCode=1;
} finally {
  await writeFile(resolve(output,'report.json'),JSON.stringify(report,null,2));await browser.close();
}
