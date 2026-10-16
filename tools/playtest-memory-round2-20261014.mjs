import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {dirname, extname, resolve, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {chromium} from 'playwright';

const root=fileURLToPath(new URL('../',import.meta.url)),variant=process.env.PERF_VARIANT??'after';
assert(['before','after'].includes(variant));
const output=resolve(root,process.env.PERF_OUTPUT??`playtest-results/memory-round2-20261014/${variant}-${Date.now()}`);
const sha=value=>createHash('sha256').update(value).digest('hex');
const changedInputs=['src/game/ColorEscapeGame.ts','src/core/PuzzleModel.ts','src/game/formalBlockShapes.ts'];
const overrides=variant==='before'?Object.fromEntries(changedInputs.map(path=>[path,`.codex-temp/perf-memory-round2-20261014/${path.split('/').at(-1).replace('.ts','.before.ts')}`])):{};
const reference=process.env.PERF_REFERENCE?JSON.parse(await readFile(resolve(root,process.env.PERF_REFERENCE),'utf8')):undefined;
const sources={},isolatedOverrides=[];
function isolateParallelDailyTaskEdits(contents){
 const start=contents.indexOf('  private ensureDailyTaskCycle('),end=contents.indexOf('\n  private ',start+1);
 assert(start>=0&&end>start,'Daily-task method boundaries must exist');let method=contents.slice(start,end);
 const concurrentPrefix='if (this.pendingSettlement || this.pendingSettlementAbandon || this.welfareTransactionActive()';
 assert.equal(method.split(concurrentPrefix).length,2,'Expected exactly one concurrent daily-task guard');
 method=method.replace(concurrentPrefix,'if (this.welfareTransactionActive()');
 assert.equal(method.split('this.featureUnlocked("dailyTasks")').length,2,'Expected exactly one concurrent daily-task gate');
 method=method.replace('this.featureUnlocked("dailyTasks")','isFeatureUnlocked("dailyTasks", this.save)');
 contents=contents.slice(0,start)+method+contents.slice(end);
 const concurrentSettlement='const dailyTasksWereUnlocked = this.featureUnlocked("dailyTasks");';
 assert.equal(contents.split(concurrentSettlement).length,2,'Expected exactly one concurrent settlement gate');
 return contents.replace(concurrentSettlement,'const dailyTasksWereUnlocked = isFeatureUnlocked("dailyTasks", this.save);');
}
const fixture=`
import {ColorEscapeGame} from './src/game/ColorEscapeGame.ts';
import {PuzzleModel} from './src/core/PuzzleModel.ts';
import {WebHost} from './src/platform/WebHost.ts';
const key='color-escape-save-v1';
const initial={schemaVersion:1,currentLevel:1,highestLevel:200,coins:2000,language:'zh-CN',sound:false,music:false,haptic:false,reducedMotion:false,
 playerProfile:{id:'7654321',name:'性能验收',avatar:1,frame:0,joinedAt:1785542400000,firstTryWins:0,longestStreak:0,currentStreak:0,attempts:{},lastAttemptWon:false},
 featureSeen:['basics','ice-door','ice-block','layer','shutter','generator','axis','key-lock','lift','star','bomb','flip-door','color-floor'],
 boosterUnlockSeen:['time','rocket','pulse'],boosterUsageSeen:['time','rocket','pulse'],boosters:{time:0,rocket:0,pulse:0},
 bestStars:Object.fromEntries(Array.from({length:200},(_,i)=>[String(i+1),3])),bestMoves:{},rewardedLevels:Array.from({length:200},(_,i)=>i+1),
 featureGuideProgress:{version:1,pending:[],seen:['leaderboard','supply','levels','dailyChallenge','league']},leagueIntroSeen:true,
 collectionIntroShown:true,collectionIntroPending:false,collectionProgress:{version:1,inspiration:0,restoredMasterpieceIds:[],seenItemIds:[],claimedMilestoneIds:[]},
 lifeState:{lives:5,nextLifeAtMs:0,unlimitedLivesUntilMs:0},selectedJourneyEpisode:1,
 journeyProgress:{claimedMilestoneLevels:[],seenEpisodeUnlockLevels:Array.from({length:19},(_,i)=>11+i*10)}};
const audit={images:[],pointers:[],writes:0,phase:'startup',windows:[],callers:{}};
let frameRecord,activeWindow,diagnostic=false;
const originalSnapshot=PuzzleModel.prototype.snapshot;
PuzzleModel.prototype.snapshot=function(...args){const start=frameRecord?performance.now():0;const result=originalSnapshot.apply(this,args);
 if(frameRecord){frameRecord.snapshotCalls++;frameRecord.snapshotMs+=performance.now()-start;if(diagnostic){const caller=(new Error().stack??'').split('\\n').slice(2,4).join(' / ');audit.callers[caller]=(audit.callers[caller]??0)+1;}}return result;};
class MemoryHost extends WebHost{
 data=new Map([[key,structuredClone(initial)]]);
 storageRead(k){return this.data.has(k)?{status:'ok',value:structuredClone(this.data.get(k))}:{status:'missing'};}
 storageGet(k,f){const r=this.storageRead(k);return r.status==='ok'?r.value:f;}
 storageSet(k,v){audit.writes++;this.data.set(k,structuredClone(v));return true;}
 music(){}sound(){}vibrate(){}unlockAudio(){}
 async resolveLeaderboardProvince(){return {province:'广东',source:'random'};}
 async createImage(src){const record={src};audit.images.push(record);try{const image=await super.createImage(src);record.width=image.naturalWidth;record.height=image.naturalHeight;return image;}catch(e){record.error=String(e);throw e;}}
}
const host=new MemoryHost(),game=new ColorEscapeGame(host),frame=game.frame.bind(game);
function scalar(){const s=originalSnapshot.call(game.model);return{level:s.levelId,screen:game.screen,started:s.started,remainingSeconds:s.remainingSeconds,moves:s.moves,cleared:s.cleared,failed:s.failed,complete:s.complete,blockCount:s.blocks.length,queuedCount:s.queuedBlocks.length,runElapsedSeconds:game.runElapsedSeconds};}
function graphObjects(value,seen=new Set()){if(!value||typeof value!=='object'||seen.has(value))return 0;seen.add(value);return 1+Object.values(value).reduce((n,v)=>n+graphObjects(v,seen),0);}
game.frame=function(...args){if(!activeWindow&&!diagnostic)return frame(...args);frameRecord={at:performance.now(),snapshotCalls:0,snapshotMs:0,renderCalls:0,renderMs:0,drawBoardCalls:0,drawBoardMs:0,boardLayoutCalls:0,boardLayoutMs:0,frameMs:0};const row=frameRecord,start=performance.now();
 try{return frame(...args);}finally{row.frameMs=performance.now()-start;frameRecord=undefined;if(activeWindow)activeWindow.frames.push(row);diagnostic=false;}};
for(const name of ['render','drawBoard','boardLayout']){const old=game[name].bind(game);game[name]=function(...args){const r=frameRecord;if(!r)return old(...args);const start=performance.now();r[name+'Calls']++;try{return old(...args);}finally{r[name+'Ms']+=performance.now()-start;}};}
for(const type of ['pointerdown','pointermove','pointerup'])host.canvas.addEventListener(type,event=>audit.pointers.push({type,x:event.clientX,y:event.clientY,level:game.model.level.id,at:performance.now()}),true);
window.__PERF2__={game,host,audit,scalar,
 begin(name){if(activeWindow)throw Error('Measurement already active');const s=originalSnapshot.call(game.model);activeWindow={name,startedAt:performance.now(),before:scalar(),snapshotGraphObjects:graphObjects(s),frames:[]};},
 end(){if(!activeWindow)throw Error('No measurement');const value=activeWindow;activeWindow=undefined;value.endedAt=performance.now();value.after=scalar();audit.windows.push(value);return value;},
 profile(){audit.callers={};diagnostic=true;game.dirty=true;game.scheduleFrame();},
 pointerPlan(){const model=game.model,s=originalSnapshot.call(model),board=game.boardLayout(),v=game.getDebugState().viewportTransform,b=host.canvas.getBoundingClientRect();
  const blocks=s.blocks.filter(block=>model.isBlockActive(block)&&!block.frozen&&!block.lockedBy);let action;
  for(const block of blocks){for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){if(block.movementAxis==='horizontal'&&dy||block.movementAxis==='vertical'&&dx)continue;if(model.canTranslate(block,block.x+dx,block.y+dy)){action={kind:'move',block,dx,dy};break;}}if(action)break;}
  if(!action)for(const block of blocks){for(const side of ['top','right','bottom','left'])if(model.exitAttemptStatus(block.id,side)==='ok'){const [dx,dy]={top:[0,-1],right:[1,0],bottom:[0,1],left:[-1,0]}[side];action={kind:'exit',block,dx,dy,side};break;}if(action)break;}
  if(!action)return;const cell=action.block.shape[0],distance=action.kind==='exit'?Math.max(s.width,s.height)+1:1;
  const xy=(dx,dy)=>({x:b.x+v.offsetX+(board.innerX+(action.block.x+cell[0]+.5+dx)*board.cell)*v.scale,y:b.y+v.offsetY+(board.innerY+(action.block.y+cell[1]+.5+dy)*board.cell)*v.scale});
  return {...action,from:xy(0,0),to:xy(action.dx*distance,action.dy*distance)};},
 actionResult(id){const s=originalSnapshot.call(game.model);return{state:scalar(),block:s.blocks.find(b=>b.id===id)??null};}};
window.__COLOR_ESCAPE__=game;game.start();
`;
await mkdir(output,{recursive:true});
await writeFile(resolve(output,'fixture-source.ts'),fixture);
const bundle=await build({stdin:{contents:fixture,resolveDir:root,sourcefile:'round2-fixture.ts',loader:'ts'},bundle:true,write:false,format:'esm',platform:'browser',target:'es2022',logLevel:'silent',
 plugins:[{name:'archive-effective-inputs',setup(builder){builder.onLoad({filter:/\.ts$/},async args=>{
  const name=args.path.slice(root.length).replaceAll('\\','/').replace(/^\//,'');
  const frozen=reference&&!changedInputs.includes(name)?reference.sources[name]?.archive:undefined;
  const input=frozen??resolve(root,overrides[name]??name),raw=await readFile(input,'utf8'),archive=resolve(output,'effective-sources',name);
  let contents=raw;
  if(variant==='after'&&name==='src/game/ColorEscapeGame.ts'&&process.env.PERF_ISOLATE_OTHER_CHAT==='1'){
   contents=isolateParallelDailyTaskEdits(raw);const originalArchive=resolve(output,'original-current-sources',name);
   await mkdir(dirname(originalArchive),{recursive:true});await writeFile(originalArchive,raw);
   isolatedOverrides.push({name,originalArchive,originalSha256:sha(raw),effectiveSha256:sha(contents),scope:'Only three parallel daily-task semantics edits reverted in this test bundle: ensureDailyTaskCycle pending-settlement guard, reconciliation unlock gate, finishLevel pre-win unlock gate. Production source is untouched.'});
  }
  await mkdir(dirname(archive),{recursive:true});await writeFile(archive,contents);
  sources[name]={input,archive,sha256:sha(contents),originalSha256:sha(raw),frozenFromReference:Boolean(frozen)};
  return{contents,loader:'ts',resolveDir:dirname(args.path)};
 });}}]});
const script=bundle.outputFiles[0].text;
const html='<!doctype html><meta charset="utf-8"><link rel="icon" href="data:,"><style>html,body{margin:0;overflow:hidden;background:#201953}canvas{display:block;width:100vw;height:100vh;touch-action:none}</style><script type="module" src="/fixture.js"></script>';
const publicRoot=resolve(root,'public'),assets={},mime={'.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml'};
const server=createServer(async(req,res)=>{try{const path=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
 if(path==='/'){res.writeHead(200,{'Content-Type':'text/html'}).end(html);return;}if(path==='/fixture.js'){res.writeHead(200,{'Content-Type':'application/javascript'}).end(script);return;}
 assert(path.startsWith('/assets/'));const file=resolve(publicRoot,'.'+path);assert(file.startsWith(publicRoot+sep));const bytes=await readFile(file);assets[file]=sha(bytes);res.writeHead(200,{'Content-Type':mime[extname(file)]??'application/octet-stream'}).end(bytes);
}catch(error){res.writeHead(404).end(String(error));}});
await new Promise(done=>server.listen(0,'127.0.0.1',done));const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true});
const report={status:'RUNNING',variant,scope:'Isolated Chromium production Canvas with synthetic MemoryHost, natural RAF/wall time, real mouse Pointer move/exit and pause/resume. Direct official-level loading is not a complete puzzle solution. snapshotGraphObjects is one reachable-object graph count at the start of each static window multiplied by in-frame snapshot call count; it is an allocation proxy, not measured heap bytes or device temperature. Timing includes identical light instrumentation. Effective source texts are archived and can pin unrelated dependencies in after comparison.',referenceReport:process.env.PERF_REFERENCE??null,isolatedOverrides,bundleSha256:sha(script),fixtureSha256:sha(fixture),toolSha256:sha(await readFile(fileURLToPath(import.meta.url))),sources,rows:[],errors:[]};
const scalar=page=>page.evaluate(()=>window.__PERF2__.scalar());
function distribution(values){const sorted=[...values].sort((a,b)=>a-b),sum=sorted.reduce((a,b)=>a+b,0);return{count:sorted.length,total:sum,mean:sum/Math.max(1,sorted.length),p50:sorted[Math.floor(sorted.length*.5)]??0,p95:sorted[Math.min(sorted.length-1,Math.floor(sorted.length*.95))]??0,max:sorted.at(-1)??0};}
function summarize(window){const metrics=Object.fromEntries(['snapshotCalls','snapshotMs','renderCalls','renderMs','drawBoardCalls','drawBoardMs','boardLayoutCalls','boardLayoutMs','frameMs'].map(key=>[key,distribution(window.frames.map(frame=>frame[key]))]));return{...window,metrics,objectCopyProxy:window.snapshotGraphObjects*metrics.snapshotCalls.total,objectCopyProxyPerFrame:window.snapshotGraphObjects*metrics.snapshotCalls.mean,durationMs:window.endedAt-window.startedAt};}
async function measure(page,name,ms=1600){await page.evaluate(name=>window.__PERF2__.begin(name),name);await page.waitForTimeout(ms);return summarize(await page.evaluate(()=>window.__PERF2__.end()));}
async function click(page,key){const point=await page.evaluate(key=>{const g=window.__PERF2__.game,s=g.getDebugState(),r=s.interactionTargets.targets[key]?.hit;if(!r)throw Error('Missing '+key);const b=g.host.canvas.getBoundingClientRect(),t=s.viewportTransform;return{x:b.x+t.offsetX+(r.x+r.width/2)*t.scale,y:b.y+t.offsetY+(r.y+r.height/2)*t.scale};},key);await page.mouse.click(point.x,point.y,{delay:35});}
async function ready(page){await page.waitForFunction(()=>{const g=window.__PERF2__?.game;return g?.artReady&&g.storageBaselineReady&&g.screen==='playing'&&!g.revisedArtLoading&&!g.formalBlockArtRequestSignature&&!g.formalIceArtRequestSignature&&g.formalBlockAssetPlan().signature===g.formalBlockArtSignature&&g.formalIceAssetPlan().signature===g.formalIceArtSignature&&!g.boosterUnlockGuide&&!g.hasInitialRevisedRegionPresentation()&&!g.hasActiveMechanicMotion();},undefined,{timeout:30000});await page.waitForTimeout(350);}
try{
 for(const width of (process.env.PERF_WIDTHS??'320,496').split(',').map(Number)){
  const context=await browser.newContext({viewport:{width,height:width===320?568:1078},deviceScaleFactor:1});
  await context.addInitScript(()=>{window.__STORAGE_VIOLATIONS__=[];for(const n of ['getItem','setItem','removeItem','clear'])Storage.prototype[n]=function(){window.__STORAGE_VIOLATIONS__.push(n);throw Error('Persistent storage forbidden');};for(const n of ['open','deleteDatabase'])indexedDB[n]=function(){window.__STORAGE_VIOLATIONS__.push(n);throw Error('IndexedDB forbidden');};});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
  await page.route('**/*',route=>route.request().url().startsWith(origin+'/')||route.request().url().startsWith('data:')?route.continue():route.abort());
  try{
   await page.goto(origin,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.__PERF2__?.game.artReady,undefined,{timeout:30000});
   for(const level of (process.env.PERF_LEVELS??'21,70,150,171').split(',').map(Number)){
    const row={width,level,status:'RUNNING'};report.rows.push(row);
    try{
     await page.evaluate(level=>window.__PERF2__.game.loadLevel(level,true),level);await ready(page);row.initial=await scalar(page);assert.equal(row.initial.level,level);
     row.readyEvidence=await page.evaluate(()=>{const g=window.__PERF2__.game,s=g.getDebugState();return{blockExpected:g.formalBlockAssetPlan().signature,blockLoaded:g.formalBlockArtSignature,blockRequested:g.formalBlockArtRequestSignature??null,iceExpected:g.formalIceAssetPlan().signature,iceLoaded:g.formalIceArtSignature,iceRequested:g.formalIceArtRequestSignature??null,mechanisms:s.art.revisedMechanisms,formalGameplay:s.art.formalGameplay};});
     await page.evaluate(()=>window.__PERF2__.profile());await page.waitForTimeout(60);row.snapshotCallers=await page.evaluate(()=>window.__PERF2__.audit.callers);
     row.opening=await measure(page,'opening');assert(row.opening.frames.length>=20);await page.screenshot({path:resolve(output,`${width}-${level}-opening.png`)});
     row.action=await page.evaluate(()=>window.__PERF2__.pointerPlan());assert(row.action,'Official opening must have a legal Pointer move or exit');
     await page.mouse.move(row.action.from.x,row.action.from.y);await page.mouse.down();await page.mouse.move(row.action.to.x,row.action.to.y,{steps:18});await page.mouse.up();await page.waitForTimeout(450);
     row.actionResult=await page.evaluate(id=>window.__PERF2__.actionResult(id),row.action.block.id);const block=row.actionResult.block;
     if(row.action.kind==='move')assert(block&&(block.x!==row.action.block.x||block.y!==row.action.block.y),'Pointer move must update authoritative anchor');else assert(!block||block.layers.length<row.action.block.layers.length,'Pointer exit must remove block or shell');
     assert(row.actionResult.state.moves>row.initial.moves);row.playing=await measure(page,'after-pointer');assert(row.playing.before.started);assert(row.playing.before.remainingSeconds>row.playing.after.remainingSeconds,'Natural active clock advances');
     await page.screenshot({path:resolve(output,`${width}-${level}-after-pointer.png`)});
     await click(page,'pause');await page.waitForFunction(()=>window.__PERF2__.game.screen==='paused');await page.waitForTimeout(400);row.paused=await measure(page,'paused',750);assert.equal(row.paused.before.remainingSeconds,row.paused.after.remainingSeconds,'Pause preserves countdown');
     await click(page,'pauseResume');await page.waitForFunction(()=>window.__PERF2__.game.screen==='playing');await page.waitForTimeout(400);row.resumed=await measure(page,'resumed',1100);assert(row.resumed.before.remainingSeconds>row.resumed.after.remainingSeconds,'Resume continues natural clock');assert(row.resumed.frames.length>=20);
     row.storageViolations=await page.evaluate(()=>window.__STORAGE_VIOLATIONS__);assert.deepEqual(row.storageViolations,[]);assert.deepEqual(errors,[]);row.status='PASS';
    }catch(error){row.status='FAIL';row.error=String(error.stack??error);report.errors.push(row.error);await page.screenshot({path:resolve(output,`${width}-${level}-failure.png`)}).catch(()=>{});break;}
   }
   report.browserErrors??=[];report.browserErrors.push(...errors);const audit=await page.evaluate(()=>window.__PERF2__.audit);report.imageErrors??=[];report.imageErrors.push(...audit.images.filter(i=>i.error));report.pointerEventCounts??={};report.pointerEventCounts[width]=audit.pointers.length;
  }finally{await context.close();}
 }
 report.workspaceDrift=[];for(const [name,s] of Object.entries(sources)){assert.equal(sha(await readFile(s.archive,'utf8')),s.sha256,`Archived effective source changed: ${name}`);if(sha(await readFile(s.input,'utf8'))!==(s.originalSha256??s.sha256))report.workspaceDrift.push(name);}
 for(const [file,digest]of Object.entries(assets))assert.equal(sha(await readFile(file)),digest,`Asset changed during QA: ${file}`);report.assetHashes=assets;
 assert.deepEqual(report.browserErrors,[]);assert.deepEqual(report.imageErrors,[]);
}catch(error){report.errors.push(String(error.stack??error));}
finally{
 await browser.close();await new Promise(done=>server.close(done));report.status=report.errors.length?'FAIL':'PASS';await writeFile(resolve(output,'report.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({status:report.status,variant,output,workspaceDrift:report.workspaceDrift,summary:report.rows.map(r=>({width:r.width,level:r.level,status:r.status,opening:r.opening&&{frames:r.opening.frames.length,snapshotPerFrame:r.opening.metrics.snapshotCalls.mean,objectProxyPerFrame:r.opening.objectCopyProxyPerFrame,drawBoard:r.opening.metrics.drawBoardMs,render:r.opening.metrics.renderMs,frame:r.opening.metrics.frameMs},error:r.error}))},null,2));if(report.status!=='PASS')process.exitCode=1;
}
