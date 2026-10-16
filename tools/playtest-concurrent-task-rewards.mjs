import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';
import { build } from 'esbuild';
import { chromium } from 'playwright';

// Real production Canvas/Pointer/RAF against synthetic progress in MemoryHost.
// This fixture never opens the running app or reads persistent player storage.
const root = process.cwd();
const output = resolve('playtest-results', `concurrent-task-rewards-20261013-${Date.now()}`);
await mkdir(output, { recursive: true });
const script = `
import {ColorEscapeGame} from './src/game/ColorEscapeGame.ts';
import {WebHost} from './src/platform/WebHost.ts';
import {createDailyTaskProgress, localDayKey, DAILY_TASK_DEFINITIONS} from './src/core/dailyTasks.ts';
const progress=createDailyTaskProgress(localDayKey(),21);
progress.tasks=progress.tasks.map(t=>({...t,progress:DAILY_TASK_DEFINITIONS[t.id].target}));
const initial={schemaVersion:1,currentLevel:21,highestLevel:21,coins:240,language:'zh-CN',sound:false,music:false,haptic:false,reducedMotion:false,
 collectionIntroShown:true,collectionIntroPending:false,featureSeen:['basics'],boosterUnlockSeen:['time','rocket','pulse'],
 rewardedLevels:Array.from({length:20},(_,i)=>i+1),bestStars:{},dailyTaskProgress:progress,
 collectionProgress:{version:1,inspiration:500,restoredMasterpieceIds:[],seenItemIds:[],claimedMilestoneIds:[]}};
const writes=[],frames=[],ids=new WeakMap();let nextId=1,currentFrame;
const idFor=f=>{if(!ids.has(f))ids.set(f,nextId++);return ids.get(f)};
class MemoryHost extends WebHost {
 data=structuredClone(initial);
 storageRead(){return {status:'ok',value:structuredClone(this.data)}}
 storageGet(k,f){return this.data??f}
 storageSet(k,v){this.data=structuredClone(v);writes.push({at:performance.now(),value:structuredClone(v)});return true}
 sound(){}music(){}vibrate(){}
 resolveLeaderboardProvince(){return Promise.resolve(undefined)}
}
const host=new MemoryHost(),game=new ColorEscapeGame(host);window.__COLOR_ESCAPE__=game;
const originalDrawFlight=game.drawRewardFlight;
game.drawRewardFlight=function(flight){
 const ctx=this.ctx,originalImage=ctx.drawImage;
 const entry={id:idFor(flight),kind:flight.kind,age:flight.age,landed:flight.landedCount,images:[]};
 ctx.drawImage=function(image,...params){
  const t=this.getTransform();let x,y,w,h;
  if(params.length===8)[x,y,w,h]=params.slice(4);
  else if(params.length===4)[x,y,w,h]=params;
  else [x,y,w,h]=[params[0],params[1],image.width,image.height];
  const cx=t.a*(x+w/2)+t.c*(y+h/2)+t.e,cy=t.b*(x+w/2)+t.d*(y+h/2)+t.f;
  entry.images.push({cx,cy,width:Math.hypot(t.a*w,t.b*w),height:Math.hypot(t.c*h,t.d*h),alpha:this.globalAlpha,
   visible:cx>=0&&cy>=0&&cx<ctx.canvas.width&&cy<ctx.canvas.height&&this.globalAlpha>0&&w>0&&h>0});
  return originalImage.call(this,image,...params);
 };
 try{return originalDrawFlight.call(this,flight)}finally{ctx.drawImage=originalImage;currentFrame?.flights.push(entry)}
};
const originalDrawFlights=game.drawHomeCoinFlight;
game.drawHomeCoinFlight=function(){
 currentFrame={at:performance.now(),flights:[],visualCoins:this.displayedHomeCoins(),visualInspiration:this.displayedRewardBalance('inspiration',this.save.collectionProgress.inspiration)};
 try{return originalDrawFlights.call(this)}finally{frames.push(currentFrame);currentFrame=undefined}
};
window.__REWARDS__={host,writes,frames,prepare(){
 game.screen='home';game.profilePage=undefined;game.collectionIntro=undefined;game.featureUnlockGuide=undefined;game.journeyPresentation=undefined;
 game.navigationTransition=undefined;game.navigationPendingTarget=undefined;game.homeCoinFlight=undefined;game.updateToastVisible=false;
 game.openDailyTasks();return game.getDebugState();
},state(){return {debug:game.getDebugState(),save:structuredClone(game.save),stored:structuredClone(host.data),writes:structuredClone(writes),frames:structuredClone(frames),
 flights:game.homeCoinFlights.map(f=>({id:idFor(f),...game.homeCoinFlightEvidence(f)})),
 visualInspiration:game.displayedRewardBalance('inspiration',game.save.collectionProgress.inspiration)}}};
game.start();`;
const bundle = await build({stdin:{contents:script,resolveDir:root,sourcefile:'isolated-concurrent-task-rewards.ts',loader:'ts'},bundle:true,write:false,format:'esm',platform:'browser',target:'es2022',metafile:true});
const html='<!doctype html><meta charset="utf-8"><link rel="icon" href="data:,"><style>html,body{margin:0;overflow:hidden}canvas{width:100vw;height:100vh;display:block;touch-action:none}</style><script type="module" src="/fixture.js"></script>';
const sha=data=>createHash('sha256').update(data).digest('hex');
const inputs=[...Object.keys(bundle.metafile.inputs).filter(f=>f!=='isolated-concurrent-task-rewards.ts'),'tools/playtest-concurrent-task-rewards.mjs'];
const bindings=async()=>Object.fromEntries(await Promise.all(inputs.map(async f=>[f,sha(await readFile(f))])));
const report={status:'RUNNING',scope:'Synthetic completed daily tasks in isolated MemoryHost; real Pointer and natural RAF; no actual puzzle completion, persistent player storage or WeChat device validation.',sources:await bindings(),cases:[],errors:[],failedRequests:[]};
const server=createServer(async(req,res)=>{
 try{
  if(req.url==='/fixture'){res.setHeader('Content-Type','text/html');res.end(html);return}
  if(req.url==='/fixture.js'){res.setHeader('Content-Type','text/javascript');res.end(bundle.outputFiles[0].contents);return}
  const path=resolve('public','.'+decodeURIComponent((req.url??'').split('?')[0]));
  if(!path.startsWith(resolve('public')+sep)){res.statusCode=403;res.end();return}
  res.setHeader('Content-Type',({'.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.mp3':'audio/mpeg','.wav':'audio/wav'})[extname(path)]??'application/octet-stream');res.end(await readFile(path));
 }catch(error){res.statusCode=404;res.end();report.failedRequests.push({url:req.url,error:error.message})}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true});
const origin='http://127.0.0.1:'+server.address().port;
const checkpoint=()=>writeFile(resolve(output,'report.json'),JSON.stringify(report,null,2)+'\n');
const state=p=>p.evaluate(()=>window.__REWARDS__.state());
async function targetPoint(p,key){
 const d=await p.evaluate(()=>window.__COLOR_ESCAPE__.getDebugState()),r=d.interactionTargets.targets[key]?.hit;
 assert(r,'missing Pointer target '+key);const box=await p.locator('canvas').boundingBox(),t=d.viewportTransform;
 return {x:box.x+t.offsetX+(r.x+r.width/2)*t.scale,y:box.y+t.offsetY+(r.y+r.height/2)*t.scale};
}
async function click(p,point){await p.mouse.click(point.x,point.y,{delay:12})}
try{
 for(const viewport of [{width:320,height:568},{width:496,height:1078}]){
  const context=await browser.newContext({viewport,deviceScaleFactor:1,timezoneId:'Asia/Shanghai'}),page=await context.newPage();
  page.on('pageerror',e=>report.errors.push(e.message));
  await page.addInitScript(()=>{window.__storageCalls=[];for(const m of ['getItem','setItem','removeItem','clear'])Storage.prototype[m]=function(){window.__storageCalls.push(m);throw Error('native storage forbidden')};for(const m of ['open','deleteDatabase'])indexedDB[m]=function(){window.__storageCalls.push(m);throw Error('native storage forbidden')}});
  await page.goto(origin+'/fixture');await page.waitForFunction(()=>window.__COLOR_ESCAPE__?.artReady,undefined,{timeout:30000});
  await page.evaluate(()=>window.__REWARDS__.prepare());
  await page.waitForFunction(()=>{const g=window.__COLOR_ESCAPE__;return g.dailyTaskArt&&!g.popupEntrance.active},undefined,{timeout:30000});
  const before=await state(page),row={name:viewport.width+'x'+viewport.height,status:'RUNNING',before:{coins:before.save.coins,inspiration:before.save.collectionProgress.inspiration,writes:before.writes.length},clicks:[],images:[]};report.cases.push(row);
  assert.equal(before.debug.dailyTasks.completedCount,3);assert.equal(before.debug.dailyTasks.claimedCount,0);
  const points=[];
  for(const task of before.debug.dailyTasks.entries){
   const point=await targetPoint(page,'dailyTaskClaim.'+task.id);points.push(point);await click(page,point);await page.waitForTimeout(150);
   const s=await state(page);row.clicks.push({id:task.id,flights:s.flights,at:s.frames.at(-1)?.at,coins:s.save.coins,visualCoins:s.debug.economy.visualCoins});
   assert.equal(s.debug.dailyTasks.claimedCount,row.clicks.length);assert.equal(s.flights.length,row.clicks.length);
   assert(s.flights[0].age>0);if(row.clicks.length>1){assert.equal(s.flights[0].id,row.clicks[0].flights[0].id);assert(s.flights[0].age>row.clicks.at(-2).flights[0].age,'earliest age must advance through new claims')}
  }
  const bonusPoint=await targetPoint(page,'dailyTaskBonus');points.push(bonusPoint);await click(page,bonusPoint);
  await page.waitForFunction(()=>window.__REWARDS__.frames.some(f=>f.flights.filter(x=>x.images.some(i=>i.visible)).length>=4),undefined,{timeout:5000});
  const overlap=await state(page);row.overlap={flights:overlap.flights,lastFrame:overlap.frames.at(-1),coins:overlap.save.coins,inspiration:overlap.save.collectionProgress.inspiration};
  assert.equal(overlap.flights.length,4);assert.equal(overlap.flights.filter(f=>f.kind==='coins').length,3);assert.equal(overlap.flights.filter(f=>f.kind==='inspiration').length,1);
  assert(overlap.flights[0].age>row.clicks[2].flights[0].age,'bonus must not reset earliest flight');
  const shot=resolve(output,row.name+'-overlap.png');await page.screenshot({path:shot});row.images.push({path:shot,sha256:sha(await readFile(shot))});
  await page.waitForFunction(()=>window.__COLOR_ESCAPE__.homeCoinFlights.length===0,undefined,{timeout:10000});
  const ended=await state(page),expectedCoins=before.save.coins+before.debug.dailyTasks.entries.reduce((n,t)=>n+t.rewardCoins,0),expectedInspiration=before.save.collectionProgress.inspiration+before.debug.dailyTasks.bonusRewardInspiration;
  assert.equal(ended.save.coins,expectedCoins);assert.equal(ended.save.collectionProgress.inspiration,expectedInspiration);
  assert.equal(ended.debug.economy.visualCoins,expectedCoins);assert.equal(ended.visualInspiration,expectedInspiration);assert.deepEqual(ended.save,ended.stored);
  assert.equal(ended.writes.length-before.writes.length,4,'each accepted reward saves once');
  for(const point of points)await click(page,point);
  const repeated=await state(page);assert.equal(repeated.writes.length,ended.writes.length);assert.deepEqual(repeated.save,ended.save);
  const frameGroups=new Map();for(const frame of ended.frames)for(const flight of frame.flights){if(!frameGroups.has(flight.id))frameGroups.set(flight.id,[]);frameGroups.get(flight.id).push(flight)}
  assert.equal(frameGroups.size,4);
  for(const [id,flights] of frameGroups){for(let i=1;i<flights.length;i++)assert(flights[i].age>=flights[i-1].age,'flight '+id+' age reset');assert(flights.some(f=>f.images.some(i=>i.visible)),'flight '+id+' never visibly rendered')}
  const visibleCounts=ended.frames.map(f=>f.flights.filter(x=>x.images.some(i=>i.visible)).length);
  assert(Math.max(...visibleCounts)>=4,'all four batches must render together');
  assert(ended.frames.some(f=>new Set(f.flights.filter(x=>x.images.some(i=>i.visible)).map(x=>x.kind)).size===2),'coins and inspiration must render together');
  for(let i=1;i<ended.frames.length;i++){assert(ended.frames[i].visualCoins>=ended.frames[i-1].visualCoins,'coin presentation decreased');assert(ended.frames[i].visualInspiration>=ended.frames[i-1].visualInspiration,'inspiration presentation decreased')}
  row.frames=ended.frames;row.after={coins:ended.save.coins,inspiration:ended.save.collectionProgress.inspiration,visualCoins:ended.debug.economy.visualCoins,visualInspiration:ended.visualInspiration,claimedCount:ended.debug.dailyTasks.claimedCount,bonusClaimed:ended.debug.dailyTasks.bonusClaimed,writes:ended.writes.length,duplicateClickWrites:repeated.writes.length-ended.writes.length};
  row.maxSimultaneouslyDrawn=Math.max(...visibleCounts);row.storageCalls=await page.evaluate(()=>window.__storageCalls);assert.deepEqual(row.storageCalls,[]);
  const finalShot=resolve(output,row.name+'-ended.png');await page.screenshot({path:finalShot});row.images.push({path:finalShot,sha256:sha(await readFile(finalShot))});row.status='PASS';await checkpoint();await context.close();
 }
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.failedRequests,[]);report.sourcesAfter=await bindings();assert.deepEqual(report.sourcesAfter,report.sources,'source changed during capture');report.status='PASS';await checkpoint();console.log(JSON.stringify({status:report.status,cases:report.cases.length,output}));
}catch(error){report.status='FAIL';report.error=error.stack;await checkpoint();console.log(output);throw error}
finally{await browser.close();await new Promise(r=>server.close(r))}
