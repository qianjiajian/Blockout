import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createServer} from 'vite';
import {chromium} from 'playwright';

// Synthetic progress has cleared Lv12. The actual coin reward is Lv10 (+50),
// not Lv12. All entry/open/claim input is real Pointer and no completion is injected.
const output=resolve(`playtest-results/journey-coin-flight-20261009-${Date.now()}`);
await mkdir(output,{recursive:true});
const sha=v=>createHash('sha256').update(v).digest('hex');
const paths=['src/game/ColorEscapeGame.ts','src/game/completionFlow.ts','src/game/formalPageLayout.ts',
  'src/core/journeyProgress.ts','tools/playtest-journey-coin-flight.mjs'];
const hashes=async()=>Object.fromEntries(await Promise.all(paths.map(async p=>[p,sha(await readFile(p))])));
const report={status:'RUNNING',scope:'Synthetic MemoryHost progress through Lv12; current formal Lv10 coin milestone +50. Real Pointer navigation/open/claim, natural RAF. No puzzle completion or persistent player storage.',sources:await hashes(),cases:[],errors:[]};
function html(reduced=false){
 const seed={schemaVersion:1,currentLevel:13,highestLevel:13,coins:1000,language:'zh-CN',sound:false,music:false,haptic:false,reducedMotion:reduced,
  playerProfile:{id:'7654321',name:'旅途验证',avatar:0,frame:0,joinedAt:Date.now()},
  featureSeen:['basics','ice-door','ice-block','layer','shutter','generator','axis','key-lock','lift','star','bomb','flip-door','color-floor'],
  boosterUnlockSeen:['time','rocket','pulse'],boosterUsageSeen:['time','rocket','pulse'],boosters:{time:2,rocket:2,pulse:2},
  bestStars:Object.fromEntries(Array.from({length:12},(_,i)=>[String(i+1),3])),bestMoves:{},rewardedLevels:Array.from({length:12},(_,i)=>i+1),
  journeyProgress:{claimedMilestoneLevels:[],seenEpisodeUnlockLevels:[11]},selectedJourneyEpisode:2,
  featureGuideProgress:{version:1,pending:[],seen:['leaderboard','supply','levels','dailyChallenge','league']},
  collectionIntroPending:false,collectionIntroShown:true,lifeState:{lives:5,nextLifeAtMs:0,unlimitedLivesUntilMs:0}};
 return `<!doctype html><meta charset="utf-8"><link rel="icon" href="data:,"><style>html,body{margin:0;overflow:hidden}canvas{display:block;width:100vw;height:100vh;touch-action:none}</style><script type="module">
import {ColorEscapeGame} from '/src/game/ColorEscapeGame.ts';import {WebHost} from '/src/platform/WebHost.ts';
const key='color-escape-save-v1',initial=${JSON.stringify(seed)},audit={writes:[],frames:[],pointers:[]};let game,frame;
class MemoryHost extends WebHost{
 data=new Map([[key,structuredClone(initial)]]);hidden=[];shown=[];
 storageRead(k){return this.data.has(k)?{status:'ok',value:structuredClone(this.data.get(k))}:{status:'missing'};}
 storageGet(k,f){const r=this.storageRead(k);return r.status==='ok'?r.value:f;}
 storageSet(k,v){const copy=structuredClone(v);audit.writes.push({at:performance.now(),coins:copy.coins,claims:copy.journeyProgress?.claimedMilestoneLevels,screen:game?.screen});this.data.set(k,copy);return true;}
 onHide(f){super.onHide(f);this.hidden.push(f);}onShow(f){super.onShow(f);this.shown.push(f);}music(){}sound(){}vibrate(){}
}
const host=new MemoryHost();game=new ColorEscapeGame(host);
const render=game.render;game.render=function(...args){const f=this.homeCoinFlight;frame={at:performance.now(),screen:this.screen,visible:this.appVisible,scroll:this.journeyScrollOffset,phase:this.journeyPresentation?.phase,flight:f?{age:f.age,landed:f.landedCount,start:f.start,startCoins:f.startCoins,endCoins:f.endCoins,reduced:f.reducedMotion}:null,title:0,titlePanel:0,wallet:0,coinIcon:0};audit.frames.push(frame);return render.apply(this,args);};
const draw=host.context.drawImage;host.context.drawImage=function(img,...args){if(frame&&game.screen==='levels'){const a=game.formalPageArtFor('levels');if(img===a?.title)frame.title++;if(img===a?.titlePanel)frame.titlePanel++;if(img===game.art.homeUi?.resourcePanel)frame.wallet++;if(img===game.art.homeUi?.coinIcon)frame.coinIcon++;}return draw.call(this,img,...args);};
for(const type of ['pointerdown','pointerup'])host.canvas.addEventListener(type,e=>audit.pointers.push({type,x:e.clientX,y:e.clientY,at:performance.now()}),true);
window.__COLOR_ESCAPE__=game;window.__JCF__={game,host,audit};game.start();
</script>`;
}
const server=await createServer({configFile:false,optimizeDeps:{noDiscovery:true,entries:[]},server:{host:'127.0.0.1',port:0,hmr:false,watch:null},logLevel:'error'});
await server.listen();const origin=`http://127.0.0.1:${server.httpServer.address().port}`;
const browser=await chromium.launch({headless:true});
const state=page=>page.evaluate(()=>{const g=window.__COLOR_ESCAPE__,d=g.getDebugState();return{screen:d.screen,transform:d.viewportTransform,targets:d.interactionTargets.targets??d.interactionTargets,journey:d.journey,flight:d.completionFlow.coinFlight,coins:g.save.coins,boosters:structuredClone(g.save.boosters)};});
async function click(page,key){const s=await state(page),b=s.targets[key]?.hit;assert(b,`Missing target ${key}`);await page.mouse.click(s.transform.offsetX+(b.x+b.width/2)*s.transform.scale,s.transform.offsetY+(b.y+b.height/2)*s.transform.scale,{delay:35});}
async function ready(page,reduced=false){await page.goto(`${origin}/__jcf_fixture__?reduced=${Number(reduced)}`,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>{const g=window.__COLOR_ESCAPE__;return g?.artReady&&g.storageBaselineReady&&g.screen==='home'&&!g.journeyHomeThemeLoading&&!g.journeyPresentation&&!g.featureUnlockGuide;},null,{timeout:60000});}
async function openClaim(page){
 await click(page,'navigation.3');await page.waitForFunction(()=>{const g=window.__COLOR_ESCAPE__;return g.screen==='levels'&&g.formalPageReady('levels')&&!g.navigationTransition;},null,{timeout:30000});
 const map=await state(page);assert(map.journey.visibleRewards.some(r=>r.level===10&&r.claimable));
 await click(page,'journeyReward.10');await page.waitForFunction(()=>window.__COLOR_ESCAPE__.getDebugState().journey.presentation?.primaryAction==='claim',null,{timeout:30000});
 const preview=await state(page);assert.equal(preview.journey.presentation.event.reward.amount,50);assert.equal(preview.coins,1000);
 await click(page,'journeyPresentation');const claimed=await state(page);assert.equal(claimed.coins,1050);assert.equal(claimed.screen,'levels');assert.equal(claimed.journey.presentation.phase,'claiming');assert(claimed.flight);
 assert.equal(claimed.flight.startCoins,1000);assert.equal(claimed.flight.endCoins,1050);assert.equal(claimed.flight.reward,50);
 assert.equal(claimed.flight.coinCount,claimed.flight.reducedMotion?1:5);assert.equal(claimed.journey.scrollOffset,map.journey.scrollOffset);
 return{map:{screen:map.screen,scroll:map.journey.scrollOffset,coins:map.coins},preview:{phase:preview.journey.presentation.phase,event:preview.journey.presentation.event},claimed};
}
async function snap(page,row,name,age){if(age!==undefined)await page.waitForFunction(age=>window.__COLOR_ESCAPE__.homeCoinFlight?.age>=age,age,{polling:'raf',timeout:10000});const before=await state(page),file=resolve(output,`${row.name}-${name}.png`);await page.screenshot({path:file});const after=await state(page);row.images.push({file,sha256:sha(await readFile(file)),beforeAge:before.flight?.age,afterAge:after.flight?.age,landed:before.flight?.landedCount,displayed:before.flight?.displayedCoins});}
async function finish(page,row){
 await page.waitForFunction(()=>!window.__COLOR_ESCAPE__.homeCoinFlight&&!window.__COLOR_ESCAPE__.journeyPresentation,null,{polling:'raf'});
 row.finished=await state(page);assert.equal(row.finished.screen,'levels');assert.equal(row.finished.journey.scrollOffset,row.claim.map.scroll);assert.equal(row.finished.coins,1050);assert.deepEqual(row.finished.boosters,{time:2,rocket:2,pulse:2});
 await snap(page,row,'finished');
 row.audit=await page.evaluate(()=>({audit:structuredClone(window.__JCF__.audit),storage:window.__STORAGE_VIOLATIONS__,stored:structuredClone(window.__JCF__.host.data.get('color-escape-save-v1'))}));
 assert.deepEqual(row.audit.storage,[]);assert.equal(row.audit.stored.coins,1050);assert.equal(row.audit.stored.journeyProgress.claimedMilestoneLevels.filter(n=>n===10).length,1);
 const grantWrites=row.audit.audit.writes.filter(w=>w.coins===1050);assert.equal(grantWrites.length,1,'One claim write only');
 const flightFrames=row.audit.audit.frames.filter(f=>f.flight);assert(flightFrames.length>0);assert(flightFrames.every(f=>f.screen==='levels'&&f.scroll===row.claim.map.scroll));assert(flightFrames.every(f=>f.title===0&&f.titlePanel===0&&f.wallet===1&&f.coinIcon===1),'Wallet replaces title throughout flight');
 assert(row.audit.audit.frames.some(f=>!f.flight&&f.screen==='levels'&&f.title===1&&f.wallet===0),'Title restored');
 await click(page,'journeyReward.10');await page.waitForFunction(()=>window.__COLOR_ESCAPE__.journeyPresentation?.phase==='overlay');
 row.reopen=await state(page);assert.equal(row.reopen.coins,1050);assert.equal(row.reopen.journey.presentation.claimed,true);assert.equal(row.reopen.journey.presentation.primaryAction,null);
}
try{
 for(const viewport of [{width:320,height:568},{width:496,height:1078}]){
  const context=await browser.newContext({viewport,deviceScaleFactor:1});await context.addInitScript(()=>{window.__STORAGE_VIOLATIONS__=[];for(const n of ['getItem','setItem','removeItem','clear'])Storage.prototype[n]=function(){window.__STORAGE_VIOLATIONS__.push(n);throw Error('Persistent storage forbidden');};for(const n of ['open','deleteDatabase'])indexedDB[n]=function(){window.__STORAGE_VIOLATIONS__.push(n);throw Error('IndexedDB forbidden');};});
  const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));page.on('console',e=>{if(e.type()==='error')report.errors.push(e.text());});await page.route('**/__jcf_fixture__*',r=>r.fulfill({contentType:'text/html',body:html(new URL(r.request().url()).searchParams.get('reduced')==='1')}));
  const row={name:`${viewport.width}x${viewport.height}`,status:'RUNNING',images:[]};report.cases.push(row);await ready(page);row.claim=await openClaim(page);
  for(const[age,name]of [[.22,'takeoff'],[.7,'flight'],[1.12,'landing'],[1.45,'all-landed']])await snap(page,row,name,age);await finish(page,row);
  await ready(page);const pauseClaim=await openClaim(page);await page.waitForFunction(()=>window.__COLOR_ESCAPE__.homeCoinFlight?.age>.4,null,{polling:'raf'});
  const hidden=await page.evaluate(()=>{window.__JCF__.host.hidden.forEach(f=>f());return window.__COLOR_ESCAPE__.homeCoinFlight.age;});await page.waitForTimeout(600);const still=await page.evaluate(()=>window.__COLOR_ESCAPE__.homeCoinFlight.age);assert.equal(still,hidden);
  await page.evaluate(()=>window.__JCF__.host.shown.forEach(f=>f()));await page.waitForFunction(age=>window.__COLOR_ESCAPE__.homeCoinFlight?.age>age+.1,hidden,{polling:'raf'});row.background={hidden,still,resumed:(await state(page)).flight.age};
  await page.waitForFunction(()=>!window.__COLOR_ESCAPE__.homeCoinFlight&&!window.__COLOR_ESCAPE__.journeyPresentation,null,{polling:'raf'});assert.equal((await state(page)).journey.scrollOffset,pauseClaim.map.scroll);row.status='PASS';
  const reduced={name:`${viewport.width}x${viewport.height}-reduced`,status:'RUNNING',images:[]};report.cases.push(reduced);await ready(page,true);reduced.claim=await openClaim(page);await snap(page,reduced,'flight',.09);await finish(page,reduced);reduced.status='PASS';await context.close();
 }
 assert.deepEqual(report.errors,[]);report.sourceAfter=await hashes();report.sourceChanges=paths.filter(p=>report.sources[p]!==report.sourceAfter[p]);assert.deepEqual(report.sourceChanges,[],'Bound source changed during playtest');report.status='PASS';
}catch(error){report.status='FAIL';report.failure=error.stack;process.exitCode=1;}
finally{await browser.close();await server.close();await writeFile(resolve(output,'report.json'),JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({status:report.status,cases:report.cases.map(c=>({name:c.name,status:c.status})),failure:report.failure,output},null,2));
