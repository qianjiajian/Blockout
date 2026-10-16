import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createServer } from 'vite';
import { chromium } from 'playwright';

// Synthetic unlocked progress and an explicitly controlled ad stub. This does
// not display a real ad, use player saves, or claim WeChat-device validation.
const output = resolve(process.env.WELFARE_OUTPUT ?? `playtest-results/welfare-station-20261010/run-${Date.now()}`);
const sha = value => createHash('sha256').update(value).digest('hex');
const manifest = JSON.parse(await readFile('docs/rules/manifest.json', 'utf8'));
const files = ['src/game/ColorEscapeGame.ts', 'src/game/welfareStationUi.ts', 'src/game/welfareLocalization.ts',
  'src/core/welfareRewards.ts', 'src/platform/Host.ts', 'tools/playtest-welfare-station.mjs',
  'docs/rules/manifest.json', 'docs/rules/mechanism-rules-v1.184.0.md',
  manifest.versions.find(v => v.version === manifest.activeVersion).document];
const bindings = async () => Object.fromEntries(await Promise.all(files.map(async f => [f, sha(await readFile(f))])));
await mkdir(output, { recursive: true });
const report = { status: 'RUNNING', activeVersion: manifest.activeVersion,
  scope: 'Isolated MemoryHost; native Storage/IndexedDB forbidden. Synthetic unlocked progress, explicit test-only ad completion/cancellation, real Game, native RAF and actual Pointer. No real ad, WeChat device, real save, or complete puzzle-route claim.',
  sources: await bindings(), cases: [], errors: [] };
const chainLives = process.env.WELFARE_CHAIN_LIVES === '1';
const initial = {
  schemaVersion: 1, currentLevel: 21, highestLevel: 21, coins: 240, language: 'zh-CN',
  sound: true, music: false, haptic: false, reducedMotion: false,
  lifeState: { lives: 2, nextLifeAtMs: 0, unlimitedLivesUntilMs: 0 },
  boosters: { time: 3, rocket: 3, pulse: 3 },
  collectionIntroShown: true, collectionIntroPending: false,
  featureSeen: ['basics','ice-door','ice-block','layer','shutter','generator','axis','key-lock','lift','star','bomb','flip-door','color-floor'],
  boosterUnlockSeen: ['time','rocket','pulse'], boosterUsageSeen: ['time','rocket','pulse'],
  featureGuideProgress: { version: 1, pending: [], seen: ['leaderboard','supply','levels','dailyChallenge','league'] },
  journeyProgress: { claimedMilestoneLevels: Array.from({ length: 40 }, (_, i) => (i + 1) * 5), seenEpisodeUnlockLevels: Array.from({ length: 20 }, (_, i) => i * 10 + 1) },
  rewardedLevels: Array.from({ length: 20 }, (_, i) => i + 1), bestStars: {},
  collectionProgress: { version: 1, inspiration: 40, restoredMasterpieceIds: [], seenItemIds: [], claimedMilestoneIds: [] },
};
const fixture = `<!doctype html><meta charset="utf-8"><link rel="icon" href="data:,"><style>html,body{margin:0;overflow:hidden}canvas{display:block;width:100vw;height:100vh;touch-action:none}</style><script type="module">
import { ColorEscapeGame } from '/src/game/ColorEscapeGame.ts';
import { WebHost } from '/src/platform/WebHost.ts';
const options=window.__WELFARE_OPTIONS,initial=${JSON.stringify(initial)},key='color-escape-save-v1';
initial.language=options.language??'zh-CN';initial.lifeState.lives=options.initialLives??initial.lifeState.lives;initial.lifeState.nextLifeAtMs=Date.now()+1800000;
if(options.boosterCount!==undefined)initial.boosters.pulse=options.boosterCount;
const audit={writes:[],ads:[],sounds:[],captures:[],frames:[]},identities=new WeakMap();let identity=0,writeMode='commit',resolveAd;
const copy=value=>value===undefined?null:structuredClone(value);
class MemoryHost extends WebHost {
 data=new Map([[key,copy(initial)]]);
 storageRead(k){return writeMode==='unknown-written'?{status:'unavailable'}:this.data.has(k)?{status:'ok',value:copy(this.data.get(k))}:{status:'missing'}}
 storageGet(k,f){const r=this.storageRead(k);return r.status==='ok'?r.value:f}
 storageSet(k,v){if(!identities.has(v))identities.set(v,++identity);audit.writes.push({identity:identities.get(v),mode:writeMode,value:copy(v),at:performance.now()});const rejected=writeMode==='reject'||writeMode==='reject-reward'&&v.boosters.pulse>initial.boosters.pulse;if(!rejected)this.data.set(k,copy(v));return !rejected&&writeMode!=='unknown-written'}
 sound(kind){audit.sounds.push({kind,at:performance.now()})}music(){}vibrate(){}
}
const host=new MemoryHost();
if(options.ads){host.isRewardedAdAvailable=()=>!resolveAd;host.showRewardedAd=requestId=>{audit.ads.push({requestId,at:performance.now(),status:'pending'});return new Promise(resolve=>{resolveAd=status=>{audit.ads[audit.ads.length-1].status=status;resolveAd=undefined;resolve({requestId,status})}})}}
const game=new ColorEscapeGame(host);window.__COLOR_ESCAPE__=game;
let paintingSupply=false,topResources=[];
const drawImage=host.context.drawImage.bind(host.context);
host.context.drawImage=function(...args){if(paintingSupply&&args.length===5&&args[2]<150&&args[3]<=100&&args[4]<=100){
 const [image,x,y,w,h]=args,m=this.getTransform();topResources.push({source:image.src??'',x:m.a*x+m.e,y:m.d*y+m.f,width:m.a*w,height:m.d*h});
}return drawImage(...args)};
const original=game.render;
game.render=function(...args){paintingSupply=game.screen==='supply';topResources=[];const result=original.apply(this,args);paintingSupply=false;if(game.screen==='supply'){
 const flight=game.homeCoinFlight,entry={at:performance.now(),popup:copy(game.popupEntrance.snapshot()),flight:copy(flight),celebration:copy(game.welfareCelebration),particles:game.particles.length};
 audit.frames.push(entry);if(flight?.age>=.65&&!audit.captures.some(c=>c.stage==='reward-flight'))audit.captures.push({stage:'reward-flight',state:entry,data:host.canvas.toDataURL('image/png')});
}return result};
window.__WELFARE__={audit,mode(value){writeMode=value},resolveAd(status){if(!resolveAd)throw Error('No pending mock ad');resolveAd(status)},
 state(){const d=game.getDebugState();return {screen:game.screen,save:copy(game.save),stored:copy(host.data.get(key)),welfare:copy(d.welfare),targets:copy(d.interactionTargets.targets??d.interactionTargets),transform:copy(d.viewportTransform),popup:copy(game.popupEntrance.snapshot()),flight:copy(game.homeCoinFlight),celebration:copy(game.welfareCelebration),pending:copy(game.pendingWelfareSave?{stage:game.pendingWelfareSave.stage}:undefined),adCalls:copy(audit.ads),sounds:copy(audit.sounds),writes:copy(audit.writes),topResources:copy(topResources),collectionDetailId:game.collectionAlbumDetailId??null,collectionIntro:copy(game.collectionIntro)}}};
game.start();</script>`;
const server = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true, entries: [] },
  plugins: [{ name: 'welfare-fixture', configureServer(s) { s.middlewares.use((req,res,next) => {
    if (req.url?.startsWith('/welfare-fixture')) { res.setHeader('Content-Type','text/html'); res.end(fixture); } else next();
  }); } }], server: { host: '127.0.0.1', port: 0, hmr: false, watch: null }, logLevel: 'error' });
await server.listen();
const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
const browser = await chromium.launch({ headless: true });
const state = page => page.evaluate(() => window.__WELFARE__.state());
const economy = s => ({ coins:s.save.coins, inspiration:s.save.collectionProgress.inspiration,
  lives:s.save.lifeState.lives, boosters:{...s.save.boosters}, restored:[...s.save.collectionProgress.restoredMasterpieceIds],
  rewarded:s.save.rewardedLevels, highest:s.save.highestLevel });
const gold = s => s.sounds.filter(sound => sound.kind === 'gold').length;
async function click(page, key) {
  const s=await state(page),hit=s.targets[key]?.hit;
  assert(hit,`Missing genuine target ${key}; available=${Object.keys(s.targets)}`);
  const canvas=await page.locator('canvas').boundingBox(),t=s.transform;
  const point={x:canvas.x+t.offsetX+(hit.x+hit.width/2)*t.scale,y:canvas.y+t.offsetY+(hit.y+hit.height/2)*t.scale};
  await page.mouse.click(point.x,point.y,{delay:12});return point;
}
async function scroll(page, direction=1) {
  const canvas=await page.locator('canvas').boundingBox();
  const x=canvas.x+canvas.width*.55,from=canvas.y+canvas.height*(direction>0?.72:.34),to=canvas.y+canvas.height*(direction>0?.34:.72);
  await page.mouse.move(x,from);await page.mouse.down();await page.mouse.move(x,to,{steps:16});await page.mouse.up();await page.waitForTimeout(100);
}
async function screenshot(page,row,stage) {
  const file=resolve(output,`${row.name}-${stage}.png`);await page.screenshot({path:file});row.images.push({stage,file,sha256:sha(await readFile(file))});
}
async function collect(page,row) {
  const audit=await page.evaluate(()=>structuredClone(window.__WELFARE__.audit));
  row.frames=audit.frames;
  for(const capture of audit.captures){const file=resolve(output,`${row.name}-${capture.stage}.png`);await writeFile(file,Buffer.from(capture.data.split(',')[1],'base64'));row.images.push({stage:capture.stage,file,state:capture.state,sha256:sha(await readFile(file))})}
}
const checkpoint = () => writeFile(resolve(output,'report.json'),JSON.stringify(report,null,2)+'\n');
const scenarios = ['unavailable','cancelled','inspiration','coins','lives','booster'];
try {
 for(const viewport of [{width:320,height:568},{width:496,height:1078}]) {
  for(const scenario of [...scenarios,...(viewport.width===496?['unknown-written']:['booster-retry-scroll'])]) {
   if(process.env.WELFARE_CASE && process.env.WELFARE_CASE!==scenario)continue;
   if(process.env.WELFARE_WIDTH && +process.env.WELFARE_WIDTH!==viewport.width)continue;
   const row={name:`${viewport.width}-${scenario}`,scenario,viewport,status:'RUNNING',images:[]};report.cases.push(row);
   const context=await browser.newContext({viewport,deviceScaleFactor:1}),page=await context.newPage();
   page.on('pageerror',error=>report.errors.push({case:row.name,error:error.message}));
   await page.addInitScript(options=>{
    window.__WELFARE_OPTIONS=options;window.__persistentStorageCalls=[];
    for(const method of ['getItem','setItem','removeItem','clear'])Storage.prototype[method]=function(){window.__persistentStorageCalls.push(method);throw Error('Persistent storage forbidden')};
    for(const method of ['open','deleteDatabase'])indexedDB[method]=function(){window.__persistentStorageCalls.push(method);throw Error('Persistent storage forbidden')};
   },{ads:scenario!=='unavailable',initialLives:process.env.WELFARE_LIVES===undefined?undefined:Number(process.env.WELFARE_LIVES),boosterCount:scenario==='booster-retry-scroll'?8:undefined});
   try {
    row.safeArea=viewport.width===320?{top:24,bottom:20}:{top:0,bottom:0};
    await page.goto(origin+'/welfare-fixture?safeTop='+row.safeArea.top+'&safeBottom='+row.safeArea.bottom);await page.waitForFunction(()=>window.__COLOR_ESCAPE__?.artReady&&window.__COLOR_ESCAPE__.screen==='home');
    await click(page,'navigation.0');await page.waitForFunction(()=>{const g=window.__COLOR_ESCAPE__;return g.screen==='supply'&&!g.navigationTransition&&g.formalPageArtFor('supply')?.screen==='supply'});
    await page.waitForTimeout(180);row.before=await state(page);
    assert.equal(row.before.screen,'supply');assert(!row.before.popup.length,'Fullscreen supply entered popup controller');
    assert.equal(row.before.topResources.length,3,'Missing actual top resource icons');
    assert(row.before.topResources.every(r=>r.y>=row.safeArea.top-1),'Top resources overlap safe area');
    assert.equal(row.before.welfare.cards.inspiration.remaining,2);
    await screenshot(page,row,'top');
    if(scenario==='unavailable') {
     assert.equal(row.before.welfare.cards.inspiration.state,'unavailable');assert.deepEqual(row.before.adCalls,[]);
     await click(page,'welfare.claim.inspiration');const unavailable=await state(page);assert.deepEqual(economy(unavailable),economy(row.before));assert.deepEqual(unavailable.adCalls,[]);assert.equal(unavailable.writes.length,row.before.writes.length);
     await scroll(page);const bottom=await state(page);assert(bottom.welfare.scroll>=row.before.welfare.scroll,'Drag moved content backwards');
     assert.deepEqual(economy(bottom),economy(row.before));assert.deepEqual(bottom.adCalls,[]);await screenshot(page,row,'bottom');
     await click(page,'navigation.2');await page.waitForFunction(()=>window.__COLOR_ESCAPE__.screen==='home'&&!window.__COLOR_ESCAPE__.navigationTransition);
     row.after=await state(page);assert.deepEqual(economy(row.after),economy(row.before));
    } else {
     const kind=['cancelled','unknown-written'].includes(scenario)?'inspiration':scenario==='booster-retry-scroll'?'booster':scenario;
     if(kind==='booster') {
      await scroll(page);await click(page,'welfare.select.pulse');const selected=await state(page);
      assert.equal(selected.welfare.selectedBooster,'pulse');assert.deepEqual(economy(selected),economy(row.before));await screenshot(page,row,'selected-pulse');
     }
     if(kind==='lives')await scroll(page);
     const point=await click(page,`welfare.claim.${kind}`);await page.waitForFunction(()=>window.__WELFARE__.audit.ads.length===1);
     const watching=await state(page);assert.deepEqual(economy(watching),economy(row.before));assert.equal(gold(watching),gold(row.before));
     await page.mouse.click(point.x,point.y);await page.mouse.click(point.x,point.y);
     const repeated=await state(page);assert.equal(repeated.adCalls.length,1);assert.equal(repeated.writes.length,watching.writes.length);assert.deepEqual(repeated.save,watching.save);
     await screenshot(page,row,'ad-pending');
     if(scenario==='cancelled') {
      await page.evaluate(()=>window.__WELFARE__.resolveAd('cancelled'));await page.waitForFunction(()=>!window.__COLOR_ESCAPE__.welfareAdRequestId&&!window.__COLOR_ESCAPE__.pendingWelfareSave);
      row.after=await state(page);assert.deepEqual(economy(row.after),economy(row.before));assert.equal(row.after.welfare.cards.inspiration.remaining,2);assert.equal(gold(row.after),gold(row.before));await screenshot(page,row,'cancelled');
     } else {
      if(scenario==='unknown-written')await page.evaluate(()=>window.__WELFARE__.mode('unknown-written'));
      if(scenario==='booster-retry-scroll')await page.evaluate(()=>window.__WELFARE__.mode('reject-reward'));
      await page.evaluate(()=>window.__WELFARE__.resolveAd('completed'));
      if(scenario==='booster-retry-scroll') {
       await page.waitForFunction(()=>window.__COLOR_ESCAPE__.pendingWelfareSave?.stage==='reward');row.rejected=await state(page);
       assert.deepEqual(economy(row.rejected),economy(row.before));assert.equal(gold(row.rejected),gold(row.before));
       assert.equal(row.rejected.stored.welfareRewards.pending.phase,'completed');assert.equal(row.rejected.stored.boosters.pulse,8);
       row.fixtureNote='After genuine ad completion and rejected reward save, only welfareScroll was reset to0 to simulate viewport reset; this case does not claim a real process reload. Actual Pointer drag and click reach retry; compact layouts can expose the button without scrolling.';
       await page.evaluate(()=>{const g=window.__COLOR_ESCAPE__;g.welfareScroll=0;g.dirty=true;g.scheduleFrame()});await page.waitForTimeout(60);
       row.retryAtTop=await state(page);assert.equal(row.retryAtTop.welfare.scroll,0);
       const retryAlreadyVisible=Boolean(row.retryAtTop.targets['welfare.claim.booster']);
       await screenshot(page,row,retryAlreadyVisible?'retry-at-top':'retry-offscreen');
       await scroll(page);row.retryScrolled=await state(page);
       if(!retryAlreadyVisible)assert(row.retryScrolled.welfare.scroll>0,'Pending reward blocked genuine scrolling');
       assert(row.retryScrolled.targets['welfare.claim.booster'],'Genuine scroll did not reveal retry');
       assert.deepEqual(economy(row.retryScrolled),economy(row.before));assert.equal(row.retryScrolled.adCalls.length,1);
       await screenshot(page,row,'retry-visible');await page.evaluate(()=>window.__WELFARE__.mode('commit'));await click(page,'welfare.claim.booster');
      }
      if(scenario==='unknown-written') {
       await page.waitForFunction(()=>!!window.__COLOR_ESCAPE__.pendingWelfareSave);row.unknown=await state(page);
       assert.deepEqual(economy(row.unknown),economy(row.before));assert.equal(gold(row.unknown),gold(row.before));await screenshot(page,row,'save-unknown');
       await page.evaluate(()=>window.__WELFARE__.mode('commit'));await click(page,`welfare.claim.${kind}`);
      }
      await page.waitForFunction(()=>!window.__COLOR_ESCAPE__.pendingWelfareSave&&!window.__COLOR_ESCAPE__.welfareAdRequestId);
      await page.waitForFunction(before=>window.__WELFARE__.audit.sounds.filter(s=>s.kind==='gold').length===before+1,gold(row.before));
      const rewarded=await state(page),expected=economy(row.before);if(kind==='coins')expected.coins+=100;if(kind==='inspiration')expected.inspiration+=10;if(kind==='lives')expected.lives+=1;if(kind==='booster')expected.boosters.pulse+=1;
      assert.deepEqual(economy(rewarded),expected);assert.equal(rewarded.welfare.cards[kind].remaining,1);assert.equal(rewarded.adCalls.length,1);assert.equal(gold(rewarded),gold(row.before)+1);
      assert.equal(rewarded.welfare.ledger.completedRequestIds.length,1);assert.deepEqual(rewarded.save,rewarded.stored);
      if(scenario==='unknown-written') {
       const uncertain=row.unknown.writes.findLast(write=>write.mode==='unknown-written');
       assert(rewarded.writes.some(write=>write.mode==='commit'&&write.identity===uncertain.identity),'Retry did not preserve the uncertain candidate identity');
      }
      if(scenario==='booster-retry-scroll') {
       const rejected=row.rejected.writes.findLast(write=>write.mode==='reject-reward'&&write.value.boosters.pulse===9);
       assert(rejected);assert(rewarded.writes.some(write=>write.mode==='commit'&&write.identity===rejected.identity),'Scrolled retry changed the rejected reward candidate');
      }
      await page.waitForFunction(()=>!window.__COLOR_ESCAPE__.homeCoinFlight&&!window.__COLOR_ESCAPE__.welfareCelebration);
      row.after=await state(page);assert.deepEqual(economy(row.after),expected);assert.equal(gold(row.after),gold(row.before)+1);await screenshot(page,row,'rewarded');
      if(scenario==='lives'&&chainLives) {
       assert.equal(row.before.save.lifeState.lives,5,'Chain scenario requires WELFARE_LIVES=5');
       assert.equal(row.after.save.lifeState.lives,6);assert.equal(row.after.welfare.livesLabel,'6/5');
       assert.equal(row.after.welfare.cards.lives.state,'available');
       assert.equal(row.after.welfare.ledger.cooldownUntilMs,0);
       assert(Object.values(row.after.welfare.cards).every(card=>card.state!=='cooldown'&&card.cooldownSeconds===0));
       row.chainLives={first:row.after,note:'Two genuine Pointer ad requests with explicit mock completion, native clock/RAF only; no time advancement or cooldown bypass.'};
       await click(page,'welfare.claim.lives');await page.waitForFunction(()=>window.__WELFARE__.audit.ads.length===2);
       const secondWatching=await state(page);assert.deepEqual(economy(secondWatching),expected);assert.equal(gold(secondWatching),gold(row.before)+1);
       row.chainLives.requestGapMs=secondWatching.adCalls[1].at-secondWatching.adCalls[0].at;
       assert(row.chainLives.requestGapMs<60000,'Second request waited for the historical60s cooldown');
       await page.evaluate(()=>window.__WELFARE__.resolveAd('completed'));
       await page.waitForFunction(before=>!window.__COLOR_ESCAPE__.pendingWelfareSave&&!window.__COLOR_ESCAPE__.welfareAdRequestId&&window.__WELFARE__.audit.sounds.filter(s=>s.kind==='gold').length===before+2,gold(row.before));
       await page.waitForFunction(()=>!window.__COLOR_ESCAPE__.homeCoinFlight&&!window.__COLOR_ESCAPE__.welfareCelebration);
       const second=await state(page),secondExpected={...expected,lives:7};
       assert.deepEqual(economy(second),secondExpected);assert.equal(second.welfare.livesLabel,'7/5');
       assert.equal(second.welfare.cards.lives.remaining,0);assert.equal(second.welfare.cards.lives.state,'limit');
       assert.equal(second.welfare.ledger.completedRequestIds.length,2);assert.equal(second.welfare.ledger.cooldownUntilMs,0);
       assert(Object.values(second.welfare.cards).every(card=>card.state!=='cooldown'&&card.cooldownSeconds===0));
       assert.deepEqual(second.save,second.stored);row.chainLives.second=second;await screenshot(page,row,'second-reward-no-cooldown');
       await click(page,'welfare.claim.lives');row.chainLives.thirdAttempt=await state(page);
       assert.deepEqual(row.chainLives.thirdAttempt.save,second.save);assert.deepEqual(row.chainLives.thirdAttempt.adCalls,second.adCalls);
       assert.equal(row.chainLives.thirdAttempt.writes.length,second.writes.length);assert.equal(gold(row.chainLives.thirdAttempt),gold(row.before)+2);
       assert.equal(row.chainLives.thirdAttempt.welfare.cards.lives.state,'limit');
       await screenshot(page,row,'third-daily-limit');row.after=row.chainLives.thirdAttempt;
      }
      if(scenario==='inspiration'&&viewport.width===496) {
       await page.waitForTimeout(4000);row.afterToast=await state(page);
       assert(!row.afterToast.welfare.feedback,'Reward feedback did not expire');
       assert.deepEqual(row.afterToast.save,row.after.save);assert.deepEqual(row.afterToast.adCalls,row.after.adCalls);
       assert.equal(row.afterToast.writes.length,row.after.writes.length);assert.equal(gold(row.afterToast),gold(row.after));
       await screenshot(page,row,'toast-cleared');
      }
      if(scenario==='inspiration') {
       assert(row.after.welfare.canOpenCollection);await click(page,'welfare.collection');
       await page.waitForFunction(()=>window.__COLOR_ESCAPE__.screen==='records'&&!window.__COLOR_ESCAPE__.navigationTransition);
       await page.waitForFunction(()=>window.__COLOR_ESCAPE__.collectionAlbumArtworkReady());await page.waitForTimeout(350);
       row.collection=await state(page);assert.deepEqual(economy(row.collection),expected);assert(!row.collection.collectionIntro,'Opening collection restored artwork automatically');await screenshot(page,row,'collection-no-auto-charge');
      }
     }
    }
    await collect(page,row);
    if(['inspiration','coins','unknown-written'].includes(scenario))assert(row.images.some(image=>image.stage==='reward-flight'),'No naturally rendered reward-flight frame captured');
    assert.deepEqual(await page.evaluate(()=>window.__persistentStorageCalls),[]);row.status='PASS';await checkpoint();
    console.log(`PASS ${row.name}`);
   } catch(error) {row.status='FAIL';row.error=error.stack;row.failedState=await state(page).catch(()=>undefined);await screenshot(page,row,'failed').catch(()=>{});await checkpoint();throw error}
   finally {await context.close()}
  }
 }
 assert.deepEqual(report.errors,[]);report.sourcesAfter=await bindings();assert.deepEqual(report.sourcesAfter,report.sources,'Sources changed during run');report.status='PASS';await checkpoint();console.log(`PASS ${report.cases.length} cases: ${output}`);
} catch(error) {report.status='FAIL';report.error=error.stack;await checkpoint();console.error(output);throw error}
finally {await browser.close();await server.close()}
