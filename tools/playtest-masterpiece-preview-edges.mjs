import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createServer} from 'vite';
import {chromium} from 'playwright';

// Supplement only: preserve the original 18-case harness and report byte-for-byte.
const output=resolve(`playtest-results/masterpiece-preview-edges-20261010-${Date.now()}`);
await mkdir(output,{recursive:true});
const hash=b=>createHash('sha256').update(b).digest('hex');
const sourceFiles=['src/game/ColorEscapeGame.ts','src/game/collectionRewardProgress.ts','src/core/masterpieceUnlockProgress.ts','src/game/CollectionArtworkStore.ts','tools/playtest-masterpiece-preview-edges.mjs'];
const bindings=async()=>Object.fromEntries(await Promise.all(sourceFiles.map(async f=>[f,hash(await readFile(f))])));
const report={status:'RUNNING',scope:'Isolated MemoryHost and completed-run fixture, real Pointer and native RAF. Supplemental quick continue/X, image rejection/retry/close and lifecycle pause. No persistent Storage or puzzle-route claim.',sources:await bindings(),cases:[],errors:[]};
const initial={schemaVersion:1,currentLevel:10,highestLevel:10,coins:240,language:'zh-CN',sound:false,music:false,haptic:false,reducedMotion:false,collectionIntroShown:true,collectionIntroPending:false,
 featureSeen:['basics','ice-door','ice-block','layer','shutter','generator','axis','key-lock','lift','star','bomb','flip-door','color-floor'],boosterUnlockSeen:['time','rocket','pulse'],boosterUsageSeen:['time','rocket','pulse'],featureGuideProgress:{version:1,pending:[],seen:['leaderboard','supply','levels','dailyChallenge','league']},
 rewardedLevels:Array.from({length:9},(_,i)=>i+1),bestStars:{},collectionProgress:{version:1,inspiration:150,restoredMasterpieceIds:[],seenItemIds:[],claimedMilestoneIds:[]}};
const fixture=`<!doctype html><meta charset="utf-8"><link rel="icon" href="data:,"><style>html,body{margin:0;overflow:hidden}canvas{display:block;width:100vw;height:100vh;touch-action:none}</style><script type="module">
import {ColorEscapeGame} from '/src/game/ColorEscapeGame.ts';import {WebHost} from '/src/platform/WebHost.ts';
let game;const key='color-escape-save-v1',writes=[],rejections=[],hide=[],show=[];let failPreview=false;
class MemoryHost extends WebHost{data=new Map([[key,${JSON.stringify(initial)}]]);storageRead(k){return this.data.has(k)?{status:'ok',value:structuredClone(this.data.get(k))}:{status:'missing'}}storageGet(k,f){const r=this.storageRead(k);return r.status==='ok'?r.value:f}storageSet(k,v){writes.push(structuredClone(v));this.data.set(k,structuredClone(v));return true}sound(){}music(){}vibrate(){}onHide(f){super.onHide(f);hide.push(f)}onShow(f){super.onShow(f);show.push(f)}async createImage(src){if(failPreview&&game?.collectionIntro?.unlockPreview){rejections.push(src);throw Error('Injected preview image failure')}return super.createImage(src)}}
const host=new MemoryHost();game=new ColorEscapeGame(host);window.__COLOR_ESCAPE__=game;
window.__EDGES__={writes,rejections,host,setFail(v){failPreview=v},hide(){hide.forEach(f=>f())},show(){show.forEach(f=>f())},settle(fail=false){failPreview=fail;game.featureUnlockGuide=undefined;game.journeyPresentation=undefined;game.navigationTransition=undefined;game.homeCoinFlight=undefined;game.loadLevel(10,false);game.screen='playing';game.save.activeRun={levelId:10,returnLevelId:10,lifeStarted:true,daily:false,boosterSpent:{time:0,rocket:0,pulse:0}};game.completionMetrics={moves:1,elapsedSeconds:1};game.runElapsedSeconds=1;host.data.set(key,structuredClone(game.save));writes.length=0;game.beginCelebration();game.dirty=true;game.scheduleFrame()},state(){const d=game.getDebugState();return{screen:game.screen,save:structuredClone(game.save),stored:structuredClone(host.data.get(key)),writes:structuredClone(writes),intro:game.collectionIntro?structuredClone(game.collectionIntro):null,progress:game.masterpieceUnlockPresentation?structuredClone(game.masterpieceUnlockPresentation):null,active:game.popupEntrance.active,targets:d.interactionTargets.targets??d.interactionTargets,transform:d.viewportTransform,rejections:[...rejections],artLoaded:!!game.collectionAlbumArtwork?.images.length,artPending:game.collectionAlbumArtwork?.pendingIndexes??[]}}};game.start();</script>`;
const server=await createServer({configFile:false,optimizeDeps:{noDiscovery:true,entries:[]},plugins:[{name:'preview-edge-fixture',configureServer(s){s.middlewares.use((req,res,next)=>{if(req.url?.startsWith('/preview-edge-fixture')){res.setHeader('Content-Type','text/html');res.end(fixture)}else next()})}}],server:{host:'127.0.0.1',port:0,hmr:false,watch:null},logLevel:'error'});
await server.listen();const origin=`http://127.0.0.1:${server.httpServer.address().port}`,browser=await chromium.launch({headless:true});
const state=p=>p.evaluate(()=>window.__EDGES__.state());
async function ready(p,key){await p.waitForFunction(key=>{const g=window.__COLOR_ESCAPE__;return !g.popupEntrance.active&&g.popupEntrance.snapshot().some(s=>s.key===key&&s.phase==='idle')},key,{timeout:30000})}
async function click(p,key){const s=await state(p),r=s.targets[key]?.hit;assert(r,`Missing target ${key}`);const b=await p.locator('canvas').boundingBox(),t=s.transform;await p.mouse.click(b.x+t.offsetX+(r.x+r.width/2)*t.scale,b.y+t.offsetY+(r.y+r.height/2)*t.scale,{delay:12})}
async function picture(p,row,label){const file=resolve(output,`${row.name}-${label}.png`);await p.screenshot({path:file});row.images.push({label,file,sha256:hash(await readFile(file))})}
async function checkpoint(){await writeFile(resolve(output,'report.json'),JSON.stringify(report,null,2)+'\n')}
try{
 for(const viewport of [{width:320,height:568},{width:496,height:1078}])for(const scenario of ['quick-continue','quick-close','hidden-preview','failed-preview-retry','failed-preview-close']){
  const row={name:`${viewport.width}-${scenario}`,status:'RUNNING',images:[]};report.cases.push(row);
  const context=await browser.newContext({viewport,deviceScaleFactor:1}),p=await context.newPage();p.on('pageerror',e=>report.errors.push(e.message));
  await p.addInitScript(()=>{window.__storageCalls=[];for(const k of ['getItem','setItem','removeItem','clear'])Storage.prototype[k]=()=>{window.__storageCalls.push(k);throw Error('Persistent storage forbidden')};for(const k of ['open','deleteDatabase'])indexedDB[k]=()=>{window.__storageCalls.push(k);throw Error('Persistent storage forbidden')}});
  await p.goto(origin+'/preview-edge-fixture');await p.waitForFunction(()=>window.__COLOR_ESCAPE__?.artReady);await p.evaluate(fail=>window.__EDGES__.settle(fail),scenario.startsWith('failed'));
  if(scenario.startsWith('quick')){await ready(p,'win');row.before=await state(p);assert(row.before.progress.age<1.25&&!row.before.intro,'Genuine Pointer arrives before automatic preview');await click(p,scenario==='quick-continue'?'modalPrimary':'modalSecondary');await p.waitForFunction(()=>window.__COLOR_ESCAPE__.collectionIntro?.unlockPreview);const entered=await state(p);assert.equal(entered.screen,'win');assert(entered.progress.revealShown);}
  else await p.waitForFunction(()=>window.__COLOR_ESCAPE__.collectionIntro?.unlockPreview);
  if(scenario==='hidden-preview'){
   await p.waitForFunction(()=>window.__COLOR_ESCAPE__.collectionIntro?.age>.12);await p.evaluate(()=>window.__EDGES__.hide());const hidden=await state(p);await p.waitForTimeout(450);const paused=await state(p);assert.equal(paused.intro.age,hidden.intro.age);assert.equal(paused.progress.age,hidden.progress.age);assert.equal(paused.writes.length,hidden.writes.length);row.hidden={before:hidden.intro.age,after:paused.intro.age};await p.evaluate(()=>window.__EDGES__.show());
  }
  if(scenario.startsWith('failed')){
   await p.waitForFunction(()=>window.__EDGES__.state().targets.collectionIntroRetry);await ready(p,'collectionIntro');row.failed=await state(p);assert(row.failed.rejections.length>0);assert.equal(row.failed.intro.age,0);assert(!row.failed.targets.collectionIntroPrimary);await p.waitForTimeout(300);assert.equal((await state(p)).intro.age,0);await picture(p,row,'failed');
   if(scenario==='failed-preview-retry'){await p.evaluate(()=>window.__EDGES__.setFail(false));await click(p,'collectionIntroRetry');}
  }
  if(scenario!=='failed-preview-close'){await p.waitForFunction(()=>window.__COLOR_ESCAPE__.collectionIntroReady());await ready(p,'collectionIntro');await picture(p,row,'ready');}
  const beforeClose=await state(p);assert.equal(beforeClose.screen,'win');assert.equal(beforeClose.writes.length,1);assert.deepEqual(beforeClose.save.collectionProgress.restoredMasterpieceIds,[]);assert.deepEqual(beforeClose.save.collectionProgress.seenItemIds,[]);
  await click(p,scenario==='failed-preview-close'?'collectionIntroLater':'collectionIntroPrimary');await p.waitForFunction(()=>!window.__COLOR_ESCAPE__.collectionIntro);await ready(p,'win');await p.waitForTimeout(300);row.after=await state(p);
  assert.equal(row.after.screen,'win');assert(!row.after.intro);assert(!row.after.artLoaded);assert.deepEqual(row.after.artPending,[]);assert.deepEqual(row.after.save,beforeClose.save);assert.equal(row.after.writes.length,beforeClose.writes.length);assert(row.after.progress.revealShown);assert.deepEqual(await p.evaluate(()=>window.__storageCalls),[]);await picture(p,row,'returned');row.status='PASS';await checkpoint();await context.close();
 }
 assert.deepEqual(report.errors,[]);report.sourcesAfter=await bindings();assert.deepEqual(report.sourcesAfter,report.sources);report.status='PASS';await checkpoint();console.log(`PASS ${report.cases.length} supplemental cases: ${output}`);
}catch(error){report.status='FAIL';report.error=error.stack;await checkpoint();console.log(output);throw error}
finally{await browser.close();await server.close()}
