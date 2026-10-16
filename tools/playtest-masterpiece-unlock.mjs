import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createServer} from 'vite';
import {chromium} from 'playwright';

// A completed-run UI fixture, not a puzzle solution or a real-player save.
const output=resolve(`playtest-results/masterpiece-unlock-20261010-${Date.now()}`);
await mkdir(output,{recursive:true});
const sha=b=>createHash('sha256').update(b).digest('hex');
const manifest=JSON.parse(await readFile('docs/rules/manifest.json','utf8'));
const files=['src/game/ColorEscapeGame.ts','src/core/masterpieceUnlockProgress.ts','src/game/collectionRewardProgress.ts','src/core/collectionCatalog.ts','src/game/popupEntrance.ts','tools/playtest-masterpiece-unlock.mjs',manifest.versions.find(v=>v.version===manifest.activeVersion).document];
const bindings=async()=>Object.fromEntries(await Promise.all(files.map(async f=>[f,sha(await readFile(f))])));
const report={status:'RUNNING',activeVersion:manifest.activeVersion,scope:'Isolated MemoryHost, native Storage/IndexedDB forbidden; real Game settlement and save verification with synthetic completed-run metrics, actual Canvas/native RAF and genuine Pointer restoration. No full puzzle route or WeChat device claim.',sources:await bindings(),cases:[],errors:[]};
const initial={schemaVersion:1,currentLevel:10,highestLevel:10,coins:240,language:'zh-CN',sound:false,music:false,haptic:false,reducedMotion:false,
 collectionIntroShown:true,collectionIntroPending:false,featureSeen:['basics','ice-door','ice-block','layer','shutter','generator','axis','key-lock','lift','star','bomb','flip-door','color-floor'],boosterUnlockSeen:['time','rocket','pulse'],boosterUsageSeen:['time','rocket','pulse'],
 featureGuideProgress:{version:1,pending:[],seen:['leaderboard','supply','levels','dailyChallenge','league']},journeyProgress:{claimedMilestoneLevels:Array.from({length:40},(_,i)=>(i+1)*5),seenEpisodeUnlockLevels:Array.from({length:20},(_,i)=>i*10+1)},
 rewardedLevels:Array.from({length:9},(_,i)=>i+1),bestStars:{},collectionProgress:{version:1,inspiration:150,restoredMasterpieceIds:[],seenItemIds:[],claimedMilestoneIds:[]}};
const fixture=`<!doctype html><meta charset="utf-8"><link rel="icon" href="data:,"><style>html,body{margin:0;overflow:hidden}canvas{display:block;width:100vw;height:100vh;touch-action:none}</style><script type="module">
import {ColorEscapeGame} from '/src/game/ColorEscapeGame.ts';import {WebHost} from '/src/platform/WebHost.ts';import {PopupEntranceController} from '/src/game/popupEntrance.ts';import {MASTERPIECE_COLLECTION_CATALOG} from '/src/core/collectionCatalog.ts';
const initial=${JSON.stringify(initial)},key='color-escape-save-v1',audit={writes:[],samples:[],captures:[]};let mode='commit',armed=false;const identities=new WeakMap();let identity=0;
class MemoryHost extends WebHost{data=new Map([[key,structuredClone(initial)]]);storageRead(k){return mode==='unknown-written'?{status:'unavailable'}:this.data.has(k)?{status:'ok',value:structuredClone(this.data.get(k))}:{status:'missing'}}storageGet(k,f){const r=this.storageRead(k);return r.status==='ok'?r.value:f}storageSet(k,v){if(!identities.has(v))identities.set(v,++identity);audit.writes.push({identity:identities.get(v),value:structuredClone(v),mode});if(mode!=='reject')this.data.set(k,structuredClone(v));return mode==='commit'}sound(){}music(){}vibrate(){}}
const host=new MemoryHost(),game=new ColorEscapeGame(host);window.__COLOR_ESCAPE__=game;
const copy=x=>x===undefined?null:structuredClone(x),originalRender=game.render;
game.render=function(...args){const result=originalRender.apply(this,args);if(armed){const p=game.masterpieceUnlockPresentation,intro=game.collectionIntro,s={screen:game.screen,level:game.model.level.id,progress:copy(p),intro:copy(intro),popup:copy(game.popupEntrance.snapshot()),at:performance.now()};audit.samples.push(s);let stage;
 if(p&&game.screen==='win'&&!intro&&p.age>=.4&&p.age<.92)stage='filling';if(p&&game.screen==='win'&&!intro&&p.age>=.92)stage='filled';
 if(intro?.unlockPreview&&intro.age>.4&&intro.age<.85)stage='preview-turn';if(intro?.unlockPreview&&game.collectionIntroReady())stage='preview-front';
 if(stage&&!audit.captures.some(c=>c.stage===stage))audit.captures.push({stage,state:s,data:host.canvas.toDataURL('image/png')});}return result};
window.__MASTERPIECE__={host,audit,mode:m=>mode=m,prepare(options){armed=false;mode='commit';game.popupEntrance=new PopupEntranceController();
 game.collectionIntro=undefined;game.featureUnlockGuide=undefined;game.journeyPresentation=undefined;game.homeCoinFlight=undefined;game.navigationTransition=undefined;game.navigationPendingTarget=undefined;game.directLevelTransition=undefined;game.dailyChallengeWin=undefined;game.leagueRun=undefined;game.temporaryLevelTestSession=undefined;game.profilePage=undefined;
 const level=options.level,count=options.replay?level:level-1;
 game.save=game.sanitizeSave({...structuredClone(initial),currentLevel:level,highestLevel:options.replay?Math.min(200,level+1):level,rewardedLevels:Array.from({length:count},(_,i)=>i+1),bestStars:options.replay?{[level]:3}:{},reducedMotion:!!options.reduced,collectionIntroShown:level!==5});
 game.loadLevel(level,false);game.screen='playing';game.featureUnlockGuide=undefined;game.journeyPresentation=undefined;
 game.save.activeRun={levelId:level,returnLevelId:level,lifeStarted:true,daily:false,boosterSpent:{time:0,rocket:0,pulse:0}};
 game.completionMetrics={moves:1,elapsedSeconds:1};game.runElapsedSeconds=1;host.data.set(key,copy(game.save));audit.writes.length=0;audit.samples.length=0;audit.captures.length=0;game.dirty=true;game.scheduleFrame();return copy(game.save)},
 settle(m='commit'){mode=m;armed=true;game.beginCelebration();game.dirty=true;game.scheduleFrame();return copy(game.save)},
 detail(level){armed=false;mode='commit';game.collectionIntro=undefined;game.releaseWinArt();game.screen='records';game.collectionAlbumTab='masterpieces';game.collectionAlbumPage.masterpieces=0;game.collectionAlbumDetailId=MASTERPIECE_COLLECTION_CATALOG.find(i=>i.unlockLevel===level).id;game.setFormalPageIntent('records');game.requestCollectionAlbumArtwork();game.dirty=true;game.scheduleFrame()},
 state(){const d=game.getDebugState();return {screen:game.screen,level:game.model.level.id,save:copy(game.save),stored:copy(host.data.get(key)),writes:copy(audit.writes),progress:copy(game.masterpieceUnlockPresentation),intro:copy(game.collectionIntro),introReady:game.collectionIntroReady(),popup:copy(game.popupEntrance.snapshot()),active:game.popupEntrance.active,targets:d.interactionTargets.targets??d.interactionTargets,transform:d.viewportTransform}}};game.start();</script>`;
const server=await createServer({configFile:false,optimizeDeps:{noDiscovery:true,entries:[]},plugins:[{name:'masterpiece-fixture',configureServer(s){s.middlewares.use((req,res,next)=>{if(req.url?.startsWith('/masterpiece-fixture')){res.setHeader('Content-Type','text/html');res.end(fixture)}else next()})}}],server:{host:'127.0.0.1',port:0,hmr:false,watch:null},logLevel:'error'});
await server.listen();const origin=`http://127.0.0.1:${server.httpServer.address().port}`,browser=await chromium.launch({headless:true});
const state=p=>p.evaluate(()=>window.__MASTERPIECE__.state());
async function ready(p,key){await p.waitForFunction(key=>{const g=window.__COLOR_ESCAPE__;return !g.popupEntrance.active&&(!key||g.popupEntrance.snapshot().some(s=>s.key===key&&s.phase==='idle'))},key,{timeout:30000})}
async function click(p,key){const s=await state(p),r=s.targets[key]?.hit;assert(r,`Missing actual target ${key}`);const b=await p.locator('canvas').boundingBox(),t=s.transform;await p.mouse.click(b.x+t.offsetX+(r.x+r.width/2)*t.scale,b.y+t.offsetY+(r.y+r.height/2)*t.scale,{delay:12})}
async function screenshot(p,row,stage){const file=resolve(output,`${row.name}-${stage}.png`);await p.screenshot({path:file});row.images.push({stage,file,sha256:sha(await readFile(file))})}
async function collect(p,row){const a=await p.evaluate(()=>structuredClone(window.__MASTERPIECE__.audit));row.samples=a.samples;for(const c of a.captures){const file=resolve(output,`${row.name}-${c.stage}.png`);await writeFile(file,Buffer.from(c.data.split(',')[1],'base64'));row.images.push({stage:c.stage,file,state:c.state,sha256:sha(await readFile(file))})}}
async function checkpoint(){await writeFile(resolve(output,'report.json'),JSON.stringify(report,null,2)+'\n')}
try{
 for(const viewport of [{width:320,height:568},{width:496,height:1078}]){
  const context=await browser.newContext({viewport,deviceScaleFactor:1}),p=await context.newPage();p.on('pageerror',e=>report.errors.push(e.message));
  await p.addInitScript(()=>{window.__persistentStorageCalls=[];for(const method of ['getItem','setItem','removeItem','clear'])Storage.prototype[method]=function(){window.__persistentStorageCalls.push(method);throw Error('Persistent storage forbidden')};for(const method of ['open','deleteDatabase'])indexedDB[method]=function(){window.__persistentStorageCalls.push(method);throw Error('Persistent storage forbidden')}});
  await p.goto(origin+'/masterpiece-fixture');await p.waitForFunction(()=>window.__COLOR_ESCAPE__?.artReady);
  for(const options of [{level:4},{level:5},{level:9},{level:10},{level:11},{level:10,replay:true},{level:200,replay:true},{level:10,reduced:true}]){
   const row={name:`${viewport.width}-level${options.level}${options.replay?'-replay':''}${options.reduced?'-reduced':''}`,options,status:'RUNNING',images:[]};report.cases.push(row);
   row.before=await p.evaluate(o=>window.__MASTERPIECE__.prepare(o),options);await p.evaluate(()=>window.__MASTERPIECE__.settle());
   if(options.level===4){await p.waitForFunction(()=>window.__COLOR_ESCAPE__.model.level.id===5);row.after=await state(p);assert.equal(row.after.screen,'playing');assert(!row.after.progress);await screenshot(p,row,'direct-next')}
   else if(options.level===5){row.after=await state(p);assert.equal(row.after.screen,'home');assert(!row.after.progress);assert(row.after.save.collectionIntroPending);await screenshot(p,row,'home-reward')}
   else{
    await p.waitForFunction(()=>{const g=window.__COLOR_ESCAPE__;return g.masterpieceUnlockPresentation?.age>=1.25});
    const threshold=options.level===10&&!options.replay;
    if(threshold){
     await p.waitForFunction(()=>window.__COLOR_ESCAPE__.collectionIntroReady());await ready(p,'collectionIntro');const shown=await state(p);
     assert(shown.intro.unlockPreview&&!shown.intro.restoration);assert.equal(shown.screen,'win');assert.equal(shown.progress.progress.current,5);assert.equal(shown.progress.progress.previous,4);assert(shown.progress.revealShown);
     assert.deepEqual(shown.save.collectionProgress.restoredMasterpieceIds,[]);assert.deepEqual(shown.save.collectionProgress.seenItemIds,[]);assert.equal(shown.writes.length,1);assert.deepEqual(shown.save,shown.stored);
     await screenshot(p,row,'preview-ready');await click(p,'collectionIntroPrimary');await p.waitForFunction(()=>!window.__COLOR_ESCAPE__.collectionIntro);await ready(p,'win');await p.waitForTimeout(400);
     row.after=await state(p);assert.equal(row.after.screen,'win');assert(!row.after.intro);assert.deepEqual(row.after.save,shown.save);assert.equal(row.after.writes.length,shown.writes.length);await screenshot(p,row,'full-after-preview');
     if(!options.reduced){
      const economic=structuredClone(row.after.save.collectionProgress),writeCount=row.after.writes.length;
      await p.evaluate(()=>window.__MASTERPIECE__.detail(10));await p.waitForFunction(()=>{const g=window.__COLOR_ESCAPE__;return g.collectionAlbumArt&&g.collectionAlbumArtworkReady()});await ready(p,'collection.detail');
      await click(p,'collectionAlbumDetailPrimary');await p.waitForFunction(()=>window.__COLOR_ESCAPE__.collectionIntroReady());await ready(p,'collectionIntro');const restored=await state(p);
      assert(restored.intro.restoration&&!restored.intro.unlockPreview);assert.equal(restored.save.collectionProgress.inspiration,economic.inspiration-50);assert.equal(restored.save.collectionProgress.restoredMasterpieceIds.length,1);assert.equal(restored.writes.length,writeCount+1);await screenshot(p,row,'paid-restoration-flip');
      await click(p,'collectionIntroPrimary');await p.waitForFunction(()=>!window.__COLOR_ESCAPE__.collectionIntro);const dismissed=await state(p);assert.equal(dismissed.screen,'records');assert.equal(dismissed.writes.length,restored.writes.length);row.restoration={before:economic,after:dismissed.save.collectionProgress,writes:1};
     }
    }else{await ready(p,'win');row.after=await state(p);assert(!row.after.intro);assert(!row.after.progress.progress.justUnlocked);assert.equal(row.after.writes.length,1);await screenshot(p,row,'progress');}
    if(options.replay){assert.equal(row.after.save.collectionProgress.inspiration,row.before.collectionProgress.inspiration);assert.equal(row.after.progress.progress.previous,row.after.progress.progress.current)}
    if(options.level===200)assert(row.after.progress.progress.allUnlocked&&!row.after.progress.progress.targetId);
   }
   await collect(p,row);assert.deepEqual(await p.evaluate(()=>window.__persistentStorageCalls),[]);row.status='PASS';await checkpoint();
  }
  if(viewport.width===496)for(const mode of ['reject','unknown-written']){
   const row={name:`496-${mode}`,status:'RUNNING',images:[]};report.cases.push(row);row.before=await p.evaluate(()=>window.__MASTERPIECE__.prepare({level:10}));await p.evaluate(mode=>window.__MASTERPIECE__.settle(mode),mode);await ready(p,'settlementFailed');
   const failed=await state(p);assert.equal(failed.screen,'settlementFailed');assert(!failed.progress&&!failed.intro);assert.deepEqual(failed.save,row.before);
   await p.evaluate(()=>window.__MASTERPIECE__.mode('commit'));await click(p,'modalPrimary');await p.waitForFunction(()=>window.__COLOR_ESCAPE__.collectionIntroReady());await ready(p,'collectionIntro');row.after=await state(p);
   assert(row.after.intro.unlockPreview);assert.equal(row.after.writes.length,2);assert(row.after.writes.every(w=>w.identity===row.after.writes[0].identity));assert.deepEqual(row.after.save,row.after.writes[0].value);await screenshot(p,row,'confirmed-preview');await collect(p,row);row.status='PASS';await checkpoint();
  }
  await context.close();
 }
 assert.deepEqual(report.errors,[]);report.sourcesAfter=await bindings();assert.deepEqual(report.sourcesAfter,report.sources,'Source changed during capture');report.status='PASS';await checkpoint();console.log(`PASS ${report.cases.length} isolated cases: ${output}`);
}catch(error){report.status='FAIL';report.error=error.stack;await checkpoint();console.log(output);throw error}
finally{await browser.close();await server.close()}
