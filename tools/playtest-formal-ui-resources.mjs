import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir, readFile, readdir, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createServer} from 'vite';
import {chromium} from 'playwright';

// Current Web source, real Pointer controls, synthetic MemoryHost profiles.
// Settlement-only cases explicitly inject completion metrics: these are visual
// and account-flow checks, not a claim of solving the underlying puzzle.
const output = resolve(process.env.FORMAL_UI_OUTPUT ?? `playtest-results/formal-ui-resources-20261012/run-${Date.now()}`);
const prefix = '/assets/art/ui/formal-pages/supplied-popups-v1/';
const sha = value => createHash('sha256').update(value).digest('hex');
const prices = {time: 300, rocket: 400, pulse: 400};
const names = {time: '冻结', rocket: '火箭', pulse: '脉冲'};
const readSources = async () => {
  const files = ['tools/playtest-formal-ui-resources.mjs', 'docs/rules/manifest.json'];
  async function visit(dir) {
    for (const entry of await readdir(dir, {withFileTypes: true})) {
      const file = `${dir}/${entry.name}`;
      if (entry.isDirectory()) await visit(file); else files.push(file);
    }
  }
  await visit('src');
  return Object.fromEntries(await Promise.all(files.map(async file => [file, sha(await readFile(file))])));
};
function seed(scenario, language = 'zh-CN') {
  const level = scenario === 'settlement-rank' ? 7 : scenario === 'masterpiece-preview' ? 10 : scenario === 'scene' ? 11
    : scenario === 'masterpiece-intro' ? 6 : 12;
  return {
    schemaVersion: 1, currentLevel: level, highestLevel: level, coins: 2000, language,
    sound: false, music: false, haptic: false, reducedMotion: false,
    playerProfile: {id: '7654321', name: '素材验证', avatar: 13, frame: 4, joinedAt: Date.now(),
      firstTryWins: 0, longestStreak: 0, currentStreak: 0, attempts: {}, lastAttemptWon: false},
    featureSeen: ['basics', 'ice-door', 'ice-block', 'layer', 'shutter', 'generator', 'axis', 'key-lock', 'lift', 'star', 'bomb', 'flip-door', 'color-floor'],
    boosterUnlockSeen: ['time', 'rocket', 'pulse'], boosterUsageSeen: ['time', 'rocket', 'pulse'],
    boosters: {time: 0, rocket: 0, pulse: 0},
    bestStars: Object.fromEntries(Array.from({length: level - 1}, (_, i) => [String(i + 1), 3])), bestMoves: {},
    rewardedLevels: Array.from({length: level - 1}, (_, i) => i + 1),
    featureGuideProgress: {version: 1, pending: [], seen: ['leaderboard', 'supply', 'levels', 'dailyChallenge', 'league']},
    leagueIntroSeen: true, collectionIntroPending: scenario === 'masterpiece-intro', collectionIntroShown: scenario !== 'masterpiece-intro',
    collectionProgress: {version: 1, inspiration: 50, restoredMasterpieceIds: [], seenItemIds: [], claimedMilestoneIds: []},
    lifeState: {lives: 5, nextLifeAtMs: 0, unlimitedLivesUntilMs: 0},
    selectedJourneyEpisode: 1,
    journeyProgress: {claimedMilestoneLevels: [5, 10], seenEpisodeUnlockLevels: scenario === 'scene' ? [] : [11]},
  };
}
function fixture(initial) {
  return `<!doctype html><meta charset="utf-8"><link rel="icon" href="data:,"><style>html,body{margin:0;overflow:hidden;background:#201953}canvas{display:block;width:100vw;height:100vh;touch-action:none}</style><script type="module">
import {ColorEscapeGame} from '/src/game/ColorEscapeGame.ts';
import {WebHost} from '/src/platform/WebHost.ts';
import {getLevelStrict} from '/src/core/levels.ts';
const key='color-escape-save-v1',initial=${JSON.stringify(initial)};
const audit={phase:'startup',images:[],writes:[],pointers:[],injections:[],frame:{draws:[],texts:[]},history:[]};
class MemoryHost extends WebHost {
  data=new Map([[key,structuredClone(initial)]]);
  storageRead(k){return this.data.has(k)?{status:'ok',value:structuredClone(this.data.get(k))}:{status:'missing'};}
  storageGet(k,f){const r=this.storageRead(k);return r.status==='ok'?r.value:f;}
  storageSet(k,v){audit.writes.push({key:k,phase:audit.phase,value:structuredClone(v)});this.data.set(k,structuredClone(v));return true;}
  music(){} sound(){} vibrate(){} unlockAudio(){}
  async resolveLeaderboardProvince(){return {province:'广东',source:'random'};}
  async createImage(src){const row={src,phase:audit.phase};audit.images.push(row);try{const image=await super.createImage(src);row.ready=true;row.width=image.naturalWidth;row.height=image.naturalHeight;return image;}catch(e){row.error=String(e);throw e;}}
}
const host=new MemoryHost(),game=new ColorEscapeGame(host),ctx=host.context;
const draw=ctx.drawImage.bind(ctx),fillText=ctx.fillText.bind(ctx),render=game.render.bind(game);
ctx.drawImage=function(image,...args){if(image instanceof HTMLImageElement){const src=new URL(image.currentSrc||image.src,location.href).pathname;
 const row={src,args,alpha:this.globalAlpha};audit.frame.draws.push(row);if(!audit.history.includes(src))audit.history.push(src);}return draw(image,...args);};
ctx.fillText=function(text,...args){audit.frame.texts.push(String(text));return fillText(text,...args);};
game.render=function(...args){audit.frame={draws:[],texts:[]};return render(...args);};
for(const type of ['pointerdown','pointermove','pointerup'])host.canvas.addEventListener(type,e=>audit.pointers.push({type,x:e.clientX,y:e.clientY,phase:audit.phase}),true);
window.__COLOR_ESCAPE__=game;
window.__FORMAL_UI__={host,audit,snapshot(){return {state:game.getDebugState(),saved:structuredClone(host.data.get(key)),audit:structuredClone(audit),storageViolations:window.__STORAGE_VIOLATIONS__};},
 complete(){const level=game.model.level.id;if(game.model.level!==getLevelStrict(level))throw Error('Not the exact formal level');
 audit.injections.push({kind:'completion-metrics-only',level,modelComplete:game.model.snapshot().complete,moves:1,elapsedSeconds:1});
 game.completionMetrics={moves:1,elapsedSeconds:1};game.pendingCelebration=0;game.beginCelebration();game.dirty=true;game.scheduleFrame();}};
game.start();
</script>`;
}
const economy = save => structuredClone({coins: save.coins, boosters: save.boosters, stars: save.bestStars, rewarded: save.rewardedLevels,
  inspiration: save.collectionProgress.inspiration, restored: save.collectionProgress.restoredMasterpieceIds});
const snapshot = page => page.evaluate(() => window.__FORMAL_UI__.snapshot());
const phase = (page, value) => page.evaluate(value => window.__FORMAL_UI__.audit.phase = value, value);
async function target(page, key) {
  await page.waitForFunction(key=>{const s=window.__COLOR_ESCAPE__?.getDebugState();return Boolean(s&&(s.interactionTargets.targets??s.interactionTargets)[key]?.hit);},key,{timeout:15000});
  const {state} = await snapshot(page), rect = (state.interactionTargets.targets ?? state.interactionTargets)[key]?.hit;
  assert(rect, `Missing actual Pointer target ${key}`);
  const box = await page.locator('canvas').boundingBox(), t = state.viewportTransform;
  return {x: box.x + t.offsetX + (rect.x + rect.width / 2) * t.scale,
    y: box.y + t.offsetY + (rect.y + rect.height / 2) * t.scale};
}
async function down(page, key) {
  const p = await target(page, key);
  await page.mouse.move(p.x, p.y); await page.mouse.down(); await page.waitForTimeout(90);
}
async function click(page, key) { await down(page, key); await page.mouse.up(); }
async function settle(page) { await page.waitForTimeout(450); }
async function shot(page, row, name, group) {
  if (group) await page.waitForFunction(expected => window.__FORMAL_UI__.audit.frame.draws.some(d => d.src.startsWith(expected) && d.alpha > .9),
    prefix + group + '/', {timeout: 20000});
  const s = await snapshot(page), file = resolve(output, `${row.name}-${name}.png`);
  await page.screenshot({path: file});
  const draws = s.audit.frame.draws.filter(d => d.src.startsWith(prefix) && d.alpha > .9);
  if (group) assert(draws.some(d => d.src.startsWith(prefix + group + '/')), `No actual new ${group} image drawn for ${name}`);
  row.screenshots.push({file,sha256:sha(await readFile(file)),draws,texts:s.audit.frame.texts,state:s.state});
  return s;
}
async function readyHome(page, allowPresentation = false) {
  await page.waitForFunction(allow => {const g=window.__COLOR_ESCAPE__,s=g?.getDebugState();return g?.artReady&&g.storageBaselineReady&&s.screen==='home'
    &&(allow||(!g.featureUnlockGuide&&!g.journeyPresentation&&!g.collectionIntro));},allowPresentation,{timeout:60000});
}
async function readyPlay(page) {
  await page.waitForFunction(()=>{const g=window.__COLOR_ESCAPE__,s=g?.getDebugState();return s?.screen==='playing'&&!g.revisedArtLoading
    &&!g.boosterUnlockGuide&&!g.hasInitialRevisedRegionPresentation()&&!g.hasActiveMechanicMotion()
    &&s.art.formalGameplay.missingWholeBlockIds.length===0;},undefined,{timeout:30000});
}
async function openPurchase(page, kind) {
  await click(page, `booster.${kind}`);
  await page.waitForFunction(kind=>{const s=window.__COLOR_ESCAPE__.getDebugState();return s.screen==='boosterPurchase'
    &&s.boosterPurchase?.kind===kind&&s.boosterPurchase.artReady;},kind,{timeout:20000});
  await settle(page);
}
async function purchase(page, row, kind) {
  await readyHome(page); await click(page,'homePlay'); await readyPlay(page);
  await phase(page,kind+'-open');await openPurchase(page,kind);
  const before=await shot(page,row,'open','booster');
  assert.equal(before.state.boosterPurchase.price,prices[kind]);assert.equal(before.state.boosterPurchase.quantity,1);
  for(const text of [names[kind],String(prices[kind]),'×1'])assert(before.audit.frame.texts.includes(text),`Missing ${text}`);
  await phase(page,kind+'-buy-pressed');await down(page,'boosterPurchase.buy');
  assert.deepEqual(economy((await snapshot(page)).saved),economy(before.saved),'Pointerdown charged the account');
  assert((await snapshot(page)).state.buttonPress?.renderedScale<1);
  await shot(page,row,'buy-pressed','booster');
  await page.mouse.move(1,1,{steps:3});await page.mouse.up();await settle(page);
  assert.deepEqual(economy((await snapshot(page)).saved),economy(before.saved),'Drag-out charged the account');
  await down(page,'boosterPurchase.close');assert.equal((await snapshot(page)).state.screen,'boosterPurchase');
  await page.mouse.up();await readyPlay(page);assert.deepEqual(economy((await snapshot(page)).saved),economy(before.saved));
  await openPurchase(page,kind);await phase(page,kind+'-purchase');await click(page,'boosterPurchase.buy');await readyPlay(page);
  const purchased=await snapshot(page),expected=economy(before.saved);expected.coins-=prices[kind];expected.boosters[kind]+=1;
  assert.deepEqual(economy(purchased.saved),expected,'Purchase must debit one price and grant exactly one item');
  await settle(page);assert.deepEqual(economy((await snapshot(page)).saved),expected,'Post-purchase animation granted twice');
  assert.equal(purchased.state.puzzle.timeFreezeSeconds,0,'Purchase activated the item');
  row.transaction={before:economy(before.saved),after:economy(purchased.saved),price:prices[kind],quantity:1};
  await shot(page,row,'purchased-board');
}
async function startSettlement(page,row) {
  await readyHome(page);await click(page,'homePlay');await readyPlay(page);
  const before=await snapshot(page);await phase(page,'settlement-fixture');
  await page.evaluate(()=>window.__FORMAL_UI__.complete());
  await page.waitForFunction(()=>{const s=window.__COLOR_ESCAPE__.getDebugState();return s.screen==='win'&&s.art.win.ready;},undefined,{timeout:20000});
  const after=await snapshot(page);assert.equal(after.saved.coins,before.saved.coins+40);
  assert.equal(after.saved.bestStars[String(before.state.level.id)],3);
  row.settlement={before:economy(before.saved),after:economy(after.saved),injections:after.audit.injections};
  return after;
}
async function settlement(page,row) {
  const result=await startSettlement(page,row);
  await page.waitForFunction(()=>{const r=window.__COLOR_ESCAPE__.getDebugState().settlement.rankChange;return r&&r.age>=.35&&r.age<1.7;},undefined,{timeout:10000});
  const rank=await shot(page,row,'rank-rise','rank');assert(rank.state.settlement.rankChange.beforeRank>rank.state.settlement.rankChange.afterRank);
  await page.waitForFunction(()=>!window.__COLOR_ESCAPE__.getDebugState().settlement.rankChange);
  await settle(page);await shot(page,row,'win','settlement');
  await down(page,'modalPrimary');assert.equal((await snapshot(page)).state.screen,'win');
  assert.deepEqual(economy((await snapshot(page)).saved),economy(result.saved));await shot(page,row,'continue-pressed','settlement');
  await page.mouse.up();await page.waitForFunction(()=>window.__COLOR_ESCAPE__.screen!=='win');await settle(page);
  assert.deepEqual(economy((await snapshot(page)).saved),economy(result.saved),'Continue paid a second settlement reward');
  row.rank=rank.state.settlement.rankChange;
}
async function masterpiece(page,row,preview) {
  const settled=preview?await startSettlement(page,row):undefined;
  if(!preview)await readyHome(page,true);
  await page.waitForFunction(()=>window.__COLOR_ESCAPE__.getDebugState().collectionIntro.ready,undefined,{timeout:20000});
  await settle(page);const before=await shot(page,row,'new-masterpiece','painting');
  assert.equal(before.state.collectionIntro.unlockPreview,preview);
  assert.equal(before.saved.collectionProgress.inspiration,settled?.saved.collectionProgress.inspiration??50);
  assert.deepEqual(before.saved.collectionProgress.restoredMasterpieceIds,[],'Unlock preview must not grant ownership');
  const key=preview?'collectionIntroLater':'collectionIntroPrimary';
  await down(page,key);assert.equal((await snapshot(page)).state.collectionIntro.active,true);
  assert.deepEqual(economy((await snapshot(page)).saved),economy(before.saved));await shot(page,row,'pressed','painting');
  await page.mouse.up();await page.waitForFunction(()=>!window.__COLOR_ESCAPE__.getDebugState().collectionIntro.active);await settle(page);
  const after=await snapshot(page);assert.deepEqual(economy(after.saved),economy(before.saved),'Preview dismissal/restoration entry charged or granted an item');
  if(preview)assert.equal(after.state.screen,'win');else {assert.equal(after.state.screen,'records');assert.equal(after.saved.collectionIntroShown,true);}
  row.presentation={before:before.state.collectionIntro,after:after.state.collectionIntro,saveEconomyUnchanged:true};
  await shot(page,row,'dismissed');
  if(!preview){
    await page.waitForFunction(()=>{const s=window.__COLOR_ESCAPE__.getDebugState();return s.collectionAlbum.art.ready
      &&Boolean((s.interactionTargets.targets??s.interactionTargets).collectionAlbumDetailPrimary);},undefined,{timeout:20000});
    const restorePoint=await target(page,'collectionAlbumDetailPrimary');
    await down(page,'collectionAlbumDetailPrimary');assert.deepEqual(economy((await snapshot(page)).saved),economy(after.saved));
    await page.mouse.up();
    await page.waitForFunction(()=>{const c=window.__COLOR_ESCAPE__.getDebugState().collectionIntro;return c.restoration&&c.ready;},undefined,{timeout:20000});
    await settle(page);const restored=await shot(page,row,'restoration-granted','painting');
    const expected=economy(after.saved);expected.inspiration=0;expected.restored=['masterpiece-01'];
    assert.deepEqual(economy(restored.saved),expected,'Restoration must cost exactly 50 inspiration and grant one painting');
    assert(restored.audit.frame.draws.some(d=>d.src.includes('collection-card-atlases-v1/masterpiece-')),'Actual masterpiece atlas was not drawn');
    await click(page,'collectionIntroPrimary');await page.waitForFunction(()=>!window.__COLOR_ESCAPE__.getDebugState().collectionIntro.active);await settle(page);
    await page.mouse.click(restorePoint.x,restorePoint.y,{delay:35});await settle(page);
    assert.deepEqual(economy((await snapshot(page)).saved),expected,'Repeated restoration position charged/granted again');
    row.restoration={cost:50,granted:'masterpiece-01',repeatedPositionDidNotGrant:true};
  }
}
async function scene(page,row) {
  await startSettlement(page,row);
  await click(page,'modalSecondary');
  await readyHome(page,true);
  await page.waitForFunction(()=>window.__COLOR_ESCAPE__.getDebugState().journey.sceneReveal?.ready,undefined,{timeout:20000});
  await settle(page);const before=await shot(page,row,'scene-unlocked','scene');
  assert(before.saved.rewardedLevels.includes(11));assert.equal(before.state.journey.presentation.event.level,11);
  assert(!before.saved.journeyProgress.seenEpisodeUnlockLevels.includes(11));
  await down(page,'journeySceneConfirm');assert((await snapshot(page)).state.journey.presentation);
  assert(!((await snapshot(page)).saved.journeyProgress.seenEpisodeUnlockLevels.includes(11)));
  await shot(page,row,'confirm-pressed','scene');await page.mouse.up();
  await page.waitForFunction(()=>!window.__COLOR_ESCAPE__.getDebugState().journey.presentation);await settle(page);
  const after=await snapshot(page);assert(after.saved.journeyProgress.seenEpisodeUnlockLevels.includes(11));
  assert.deepEqual(economy(after.saved),economy(before.saved),'Scene acknowledgement paid a reward');
  assert.equal(after.state.screen,'home');row.scene={name:before.state.journey.sceneReveal.name,acknowledged:true};
  await shot(page,row,'acknowledged-home');
  await click(page,'navigation.3');
  await page.waitForFunction(()=>window.__COLOR_ESCAPE__.screen==='levels');
  await page.waitForFunction(()=>window.__FORMAL_UI__.audit.frame.draws.some(d=>d.src.endsWith('/supplied-popups-v1/scene/locked-hint-panel.png')),undefined,{timeout:20000});
  await settle(page);const locked=await shot(page,row,'journey-locked21','scene');
  assert(locked.state.journey.visibleEpisodes.includes(3),'Journey did not show locked episode 21');
  assert(!locked.saved.rewardedLevels.includes(21),'Locked scene fixture already cleared 21');
  assert(locked.audit.frame.texts.some(text=>text.includes('21')),'Actual locked requirement label missing');
  assert.deepEqual(economy(locked.saved),economy(after.saved),'Opening Journey changed rewards');
  row.scene.lockedHintDrawn=true;
}

await mkdir(output,{recursive:true});
const report={status:'RUNNING',scope:'Current Web source + real Pointer in Chromium; synthetic MemoryHost only. Settlement cases inject metrics into the real settlement path, not a solved-puzzle or native-device claim.',
  sources:await readSources(),cases:[],errors:[],resourceHashes:{}};
const server=await createServer({configFile:false,optimizeDeps:{noDiscovery:true,entries:[]},server:{host:'127.0.0.1',port:0,hmr:false,watch:null},logLevel:'error'});
await server.listen();const origin=`http://127.0.0.1:${server.httpServer.address().port}`;
const browser=await chromium.launch({headless:true});
try {
  const scenarios=process.env.FORMAL_UI_SCENARIOS?.split(',')??['purchase-time','purchase-rocket','purchase-pulse','settlement-rank','masterpiece-intro','masterpiece-preview','scene','settlement-rank-en','masterpiece-preview-en'];
  for(const viewport of [{width:320,height:568},{width:496,height:1078}])for(const scenario of scenarios){
    if(scenario.endsWith('-en')&&viewport.width!==320)continue;
    const language=scenario.endsWith('-en')?'en':'zh-CN',baseScenario=scenario.replace(/-en$/,'');
    const row={name:`${viewport.width}-${scenario}`,scenario,language,viewport,status:'RUNNING',screenshots:[]};report.cases.push(row);
    const context=await browser.newContext({viewport,deviceScaleFactor:1});
    await context.addInitScript(()=>{window.__STORAGE_VIOLATIONS__=[];for(const n of ['getItem','setItem','removeItem','clear'])Storage.prototype[n]=function(){window.__STORAGE_VIOLATIONS__.push(n);throw Error('Persistent storage forbidden');};for(const n of ['open','deleteDatabase'])indexedDB[n]=function(){window.__STORAGE_VIOLATIONS__.push(n);throw Error('IndexedDB forbidden');};});
    const page=await context.newPage();const errors=[];
    page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
    await page.route('**/*',route=>{const u=route.request().url();if(u===origin+'/__formal_ui_fixture__')return route.fulfill({contentType:'text/html',body:fixture(seed(baseScenario,language))});return u.startsWith(origin+'/')||u.startsWith('data:')?route.continue():route.abort();});
    try {
      await page.goto(origin+'/__formal_ui_fixture__',{waitUntil:'domcontentloaded'});
      if(baseScenario.startsWith('purchase-'))await purchase(page,row,baseScenario.slice(9));
      else if(baseScenario==='settlement-rank')await settlement(page,row);
      else if(baseScenario.startsWith('masterpiece-'))await masterpiece(page,row,baseScenario==='masterpiece-preview');
      else if(baseScenario==='scene')await scene(page,row);else throw Error(`Unknown scenario ${scenario}`);
      const final=await snapshot(page);assert.deepEqual(final.storageViolations,[]);assert.deepEqual(errors,[]);
      assert(!final.audit.images.some(i=>i.error),'Image load failed');
      row.audit=final.audit;row.saved=final.saved;row.storageViolations=final.storageViolations;
      for(const src of final.audit.history.filter(src=>src.startsWith('/assets/'))){const file='public'+src,digest=sha(await readFile(file));
        assert(!report.resourceHashes[file]||report.resourceHashes[file]===digest,`Resource changed during QA ${file}`);report.resourceHashes[file]=digest;}
      row.newResourcesLoaded=final.audit.images.filter(i=>i.src.includes('supplied-popups-v1/'));
      row.newResourcesDrawn=final.audit.history.filter(src=>src.startsWith(prefix));row.status='PASS';console.log(`PASS ${row.name}`);
    }catch(error){row.status='FAIL';row.failure=String(error.stack??error);row.snapshot=await snapshot(page).catch(()=>undefined);
      await page.screenshot({path:resolve(output,`${row.name}-failure.png`)}).catch(()=>{});report.errors.push({case:row.name,error:row.failure});console.error(`FAIL ${row.name}: ${error}`);
    }finally{row.browserErrors=errors;await context.close();}
  }
  report.sourceAfter=await readSources();assert.deepEqual(report.sourceAfter,report.sources,'Source changed during acceptance');
  for(const [file,digest] of Object.entries(report.resourceHashes))assert.equal(sha(await readFile(file)),digest,`Asset changed during acceptance ${file}`);
  report.inputsUnchanged=true;
}catch(error){report.errors.push({case:'harness',error:String(error.stack??error)});}
finally {await browser.close();await server.close();report.status=report.errors.length?'FAIL':'PASS';await writeFile(resolve(output,'report.json'),JSON.stringify(report,null,2)+'\n');if(report.errors.length)process.exitCode=1;console.log(JSON.stringify({status:report.status,output}));}
