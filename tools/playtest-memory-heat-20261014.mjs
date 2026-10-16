import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {dirname, extname, resolve, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {chromium} from 'playwright';

// Isolated production-Canvas performance measurements. The before variant uses
// saved source inputs in esbuild; it never replaces the production source files.
const root=fileURLToPath(new URL('../',import.meta.url));
const variant=process.env.PERF_VARIANT??'after';
assert(['before','after'].includes(variant));
const output=resolve(root,process.env.PERF_OUTPUT??`playtest-results/memory-heat-20261014/${variant}-${Date.now()}`);
const sha=value=>createHash('sha256').update(value).digest('hex');
const overrides=variant==='before'?{
 'src/game/ColorEscapeGame.ts':'.codex-temp/perf-memory-20261014/ColorEscapeGame.before.ts',
 'src/audio/ProceduralSoundscape.ts':'.codex-temp/perf-memory-20261014/ProceduralSoundscape.before.ts',
 'src/game/revisedMechanismArt.ts':'.codex-temp/perf-memory-20261014/revisedMechanismArt.before.ts',
 'src/game/CollectionArtworkStore.ts':'.codex-temp/perf-memory-20261014/CollectionArtworkStore.before.ts',
}:{};
const sources={};
const fixture=`
import {ColorEscapeGame} from './src/game/ColorEscapeGame.ts';
import {WebHost} from './src/platform/WebHost.ts';
import {requiredMechanismArtPaths,ACTIVE_REVISED_MECHANISM_ART_PATHS} from './src/game/revisedMechanismArt.ts';
import {LEAGUE_LIST} from './src/game/leagueScroll.ts';
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
const audit={phase:'startup',renders:0,drawImages:0,frameCallbacks:0,images:[],pointers:[],writes:0,renderMs:0,frameAtlasPaths:[]};
const records=new WeakMap(),mechanismPaths=new Set(ACTIVE_REVISED_MECHANISM_ART_PATHS);
let holding=false,pending=[];
class MemoryHost extends WebHost{
 data=new Map([[key,structuredClone(initial)]]);
 storageRead(k){return this.data.has(k)?{status:'ok',value:structuredClone(this.data.get(k))}:{status:'missing'};}
 storageGet(k,f){const r=this.storageRead(k);return r.status==='ok'?r.value:f;}
 storageSet(k,v){audit.writes++;this.data.set(k,structuredClone(v));return true;}
 music(){}sound(){}vibrate(){}unlockAudio(){}
 async resolveLeaderboardProvince(){return {province:'广东',source:'random'};}
 requestFrame(callback){return super.requestFrame(time=>{audit.frameCallbacks++;callback(time);});}
 async createImage(src){const record={src,phase:audit.phase,mechanism:mechanismPaths.has(src)};audit.images.push(record);
  try{const image=await super.createImage(src);record.width=image.naturalWidth;record.height=image.naturalHeight;records.set(image,record);
   if(holding&&record.mechanism)await new Promise(done=>pending.push(done));return image;
  }catch(e){record.error=String(e);throw e;}}
 releaseImage(image){const record=records.get(image);if(record)record.released=true;super.releaseImage(image);}
}
const host=new MemoryHost(),game=new ColorEscapeGame(host),render=game.render.bind(game),draw=host.context.drawImage.bind(host.context);
game.render=function(...args){audit.renders++;audit.frameAtlasPaths=[];const start=performance.now();try{return render(...args);}finally{audit.renderMs+=performance.now()-start;}};
host.context.drawImage=function(...args){audit.drawImages++;const src=records.get(args[0])?.src;if(src?.includes('collection-card-atlases-v1')&&!audit.frameAtlasPaths.includes(src))audit.frameAtlasPaths.push(src);return draw(...args);};
for(const type of ['pointerdown','pointermove','pointerup'])host.canvas.addEventListener(type,()=>audit.pointers.push(type),true);
function snapshot(){const mechanism=[...game.revisedArt].map(([src,image])=>({src,width:image.naturalWidth,height:image.naturalHeight}));
 return {screen:game.screen,appVisible:game.appVisible,level:game.model.level.id,renders:audit.renders,drawImages:audit.drawImages,frameCallbacks:audit.frameCallbacks,renderMs:audit.renderMs,
  elapsed:game.elapsed,feedbackAge:game.hudFeedback?.age??null,remainingSeconds:game.model.snapshot().remainingSeconds,
  leagueOffset:game.leagueScroll.offset,leagueVelocity:game.leagueScroll.velocity,required:requiredMechanismArtPaths(game.model.level),mechanism,
  mechanismCount:mechanism.length,mechanismRgbaBytes:mechanism.reduce((n,image)=>n+image.width*image.height*4,0),
  liveImageCount:audit.images.filter(image=>image.width&&!image.released).length,
  liveImageRgbaBytes:audit.images.filter(image=>image.width&&!image.released).reduce((n,image)=>n+image.width*image.height*4,0),
  pointerEvents:audit.pointers.length,storageViolations:window.__STORAGE_VIOLATIONS__};}
window.__PERF__={host,game,audit,snapshot,list:LEAGUE_LIST,
 album(){const state=game.getDebugState().collectionAlbum,images=(game.collectionAlbumArtwork?.images??[]).map(image=>({src:records.get(image)?.src,width:image.naturalWidth,height:image.naturalHeight}));return{tab:state.tab,pageIndex:state.pageIndex,pageCount:state.pageCount,visibleItems:state.visibleItems,art:state.art,images,count:images.length,rgbaBytes:images.reduce((n,i)=>n+i.width*i.height*4,0),drawn:[...audit.frameAtlasPaths]};},
 hold(){holding=true;},pending(){return pending.length;},release(){holding=false;const callbacks=pending;pending=[];callbacks.forEach(done=>done());},
 hide(){window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true}));},
 show(){window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));}};
game.start();
`;
await mkdir(output,{recursive:true});
const bundle=await build({stdin:{contents:fixture,resolveDir:root,sourcefile:'memory-heat-fixture.ts',loader:'ts'},bundle:true,write:false,format:'esm',platform:'browser',target:'es2022',logLevel:'silent',
 plugins:[{name:'capture-effective-inputs',setup(builder){builder.onLoad({filter:/\.ts$/},async args=>{
  const relative=args.path.slice(root.length).replaceAll('\\','/').replace(/^\//,'');
  const effective=resolve(root,overrides[relative]??relative),contents=await readFile(effective,'utf8');
  sources[relative]={file:effective,sha256:sha(contents)};
  return {contents,loader:'ts',resolveDir:dirname(args.path)};
 });}}]});
const script=bundle.outputFiles[0].text;
const html='<!doctype html><meta charset="utf-8"><link rel="icon" href="data:,"><style>html,body{margin:0;overflow:hidden;background:#201953}canvas{display:block;width:100vw;height:100vh;touch-action:none}</style><script type="module" src="/fixture.js"></script>';
const publicRoot=resolve(root,'public');
const mime={'.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml'};
const assets={};
const server=createServer(async(req,res)=>{try{
 const path=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
 if(path==='/'){res.writeHead(200,{'Content-Type':'text/html'}).end(html);return;}
 if(path==='/fixture.js'){res.writeHead(200,{'Content-Type':'application/javascript'}).end(script);return;}
 assert(path.startsWith('/assets/'));const file=resolve(publicRoot,'.'+path);assert(file.startsWith(publicRoot+sep));
 const bytes=await readFile(file);assets[file]=sha(bytes);res.writeHead(200,{'Content-Type':mime[extname(file)]??'application/octet-stream'}).end(bytes);
}catch(error){res.writeHead(404).end(String(error));}});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true});
const report={status:'RUNNING',variant,scope:'Production Canvas in isolated Chromium MemoryHost, natural browser RAF and wall time. Mouse Pointer league interaction. Direct formal-level loading only tests image lifecycle, not puzzle completion. Synthetic persisted pagehide/pageshow dispatches the real host lifecycle while browser RAF remains active; not an OS backgrounding test. RGBA byte estimates describe retained image handles, not whole-process/GPU/physical memory or temperature.',bundleSha256:sha(script),sources,rows:[],errors:[]};
const snap=p=>p.evaluate(()=>window.__PERF__.snapshot());
const delta=(a,b)=>Object.fromEntries(['renders','drawImages','frameCallbacks','renderMs','elapsed','remainingSeconds'].map(k=>[k,b[k]-a[k]]));
async function click(page,key){const point=await page.evaluate(key=>{const g=window.__PERF__.game,s=g.getDebugState(),r=s.interactionTargets.targets[key]?.hit;if(!r)throw Error('Missing '+key);const b=g.host.canvas.getBoundingClientRect(),t=s.viewportTransform;return{x:b.x+t.offsetX+(r.x+r.width/2)*t.scale,y:b.y+t.offsetY+(r.y+r.height/2)*t.scale};},key);await page.mouse.click(point.x,point.y,{delay:35});}
async function loaded(page){await page.waitForFunction(()=>{const t=window.__PERF__,g=t?.game;return g?.artReady&&g.storageBaselineReady&&!g.revisedArtLoading;},undefined,{timeout:30000});await page.waitForTimeout(600);}
async function albumReady(page){await page.waitForFunction(()=>{const g=window.__PERF__.game;return g.screen==='records'&&!g.navigationTransition&&g.collectionAlbumArt&&g.collectionAlbumArtworkReady()&&g.collectionAlbumArtwork.pendingIndexes.length===0;},undefined,{timeout:30000});await page.waitForTimeout(80);}
async function albumSample(page){await albumReady(page);const value=await page.evaluate(()=>window.__PERF__.album());assert(value.visibleItems.every(i=>i.artworkReady),'All visible cards retain their artwork');assert(value.drawn.length>0,'Production Canvas actually drew an album atlas');assert(value.art.currentAtlasIndexes.every(i=>value.art.loadedAtlasIndexes.includes(i)));if(variant==='after')assert(value.count<=3,'Adjacent-page album cache remains bounded');return value;}
async function openContext(width){const context=await browser.newContext({viewport:{width,height:width===320?568:1078},deviceScaleFactor:1});
 await context.addInitScript(()=>{window.__STORAGE_VIOLATIONS__=[];for(const n of ['getItem','setItem','removeItem','clear'])Storage.prototype[n]=function(){window.__STORAGE_VIOLATIONS__.push(n);throw Error('Persistent storage forbidden');};for(const n of ['open','deleteDatabase'])indexedDB[n]=function(){window.__STORAGE_VIOLATIONS__.push(n);throw Error('IndexedDB forbidden');};});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
 await page.route('**/*',route=>route.request().url().startsWith(origin+'/')||route.request().url().startsWith('data:')?route.continue():route.abort());
 await page.goto(origin,{waitUntil:'domcontentloaded'});await loaded(page);return {context,page,errors};}
try{
 for(const width of (process.env.PERF_WIDTHS??'320,496').split(',').map(Number)){
  const row={width,status:'RUNNING',mechanismLevels:[]};report.rows.push(row);const {context,page,errors}=await openContext(width);
  try{
   await click(page,'homeLeague');await page.waitForFunction(()=>{const g=window.__PERF__.game;return g.screen==='league'&&g.leagueArtStore?.art&&g.leagueAvatarArtStore?.art;},undefined,{timeout:30000});
   await page.waitForTimeout(900);let a=await snap(page);await page.waitForTimeout(2200);let b=await snap(page);row.leagueIdle={durationMs:2200,...delta(a,b)};
   if(variant==='after'){assert(row.leagueIdle.renders<=5,'Idle league must only repaint its seconds timer');assert(row.leagueIdle.frameCallbacks<=6,'Idle league must not continuously request RAF');}
   const coords=await page.evaluate(()=>{const t=window.__PERF__,s=t.game.getDebugState(),r=t.list,v=s.viewportTransform,b=t.host.canvas.getBoundingClientRect();return{x:b.x+v.offsetX+(r.x+r.width/2)*v.scale,y1:b.y+v.offsetY+(r.y+r.height*.8)*v.scale,y2:b.y+v.offsetY+(r.y+r.height*.2)*v.scale};});
   a=await snap(page);await page.mouse.move(coords.x,coords.y1);await page.mouse.down();await page.mouse.move(coords.x,coords.y2,{steps:12});await page.mouse.up();await page.waitForTimeout(1200);b=await snap(page);
   row.leagueScroll={...delta(a,b),from:a.leagueOffset,to:b.leagueOffset,pointerEvents:b.pointerEvents-a.pointerEvents};assert(b.leagueOffset>a.leagueOffset);assert(row.leagueScroll.renders>3);assert(row.leagueScroll.pointerEvents>=3);
   await page.screenshot({path:resolve(output,`${width}-league.png`)});
   await page.evaluate(()=>{const t=window.__PERF__;t.game.hudFeedback={text:'visibility lifecycle fixture',color:'#ffffff',age:0,duration:5};t.game.dirty=true;t.game.scheduleFrame();t.hide();});
   a=await snap(page);await page.waitForTimeout(850);await page.evaluate(()=>{const g=window.__PERF__.game;g.dirty=true;g.scheduleFrame();});await page.waitForTimeout(250);b=await snap(page);
   row.hidden={durationMs:1100,...delta(a,b),feedbackAgeBefore:a.feedbackAge,feedbackAgeAfter:b.feedbackAge,appVisible:b.appVisible};assert.equal(b.appVisible,false);
   if(variant==='after'){assert.equal(row.hidden.renders,0);assert.equal(row.hidden.elapsed,0);assert.equal(b.feedbackAge,a.feedbackAge);}
   await page.evaluate(()=>window.__PERF__.show());await page.waitForTimeout(250);const restored=await snap(page);row.show={...delta(b,restored),feedbackAge:restored.feedbackAge,appVisible:restored.appVisible};assert.equal(restored.appVisible,true);assert(restored.renders>b.renders);assert(restored.feedbackAge>b.feedbackAge);
   await page.evaluate(()=>{window.__PERF__.game.hudFeedback=undefined;});await click(page,'league.back');await page.waitForTimeout(450);
   await click(page,'navigation.4');row.collection=[await albumSample(page)];
   while(row.collection.at(-1).pageIndex>0){await click(page,'collectionAlbumPrevious');row.collection.push(await albumSample(page));}
   await click(page,'collectionAlbumTab.masterpieces');row.collection.push(await albumSample(page));
   while(row.collection.at(-1).pageIndex<row.collection.at(-1).pageCount-1){await click(page,'collectionAlbumNext');row.collection.push(await albumSample(page));}
   await page.screenshot({path:resolve(output,`${width}-masterpieces.png`)});
   await click(page,'collectionAlbumTab.levels');row.collection.push(await albumSample(page));
   await click(page,'collectionAlbumPrevious');row.collection.push(await albumSample(page));
   await page.screenshot({path:resolve(output,`${width}-album-return.png`)});await click(page,'navigation.2');await page.waitForTimeout(450);
   for(const level of [20,65,100,150,200,1]){
    await page.evaluate(level=>{const t=window.__PERF__;t.audit.phase='level-'+level;t.game.loadLevel(level,true);},level);await loaded(page);
    const state=await snap(page);assert.equal(state.level,level);assert.equal(state.screen,'playing');assert(state.required.every(path=>state.mechanism.some(image=>image.src===path)));
    if(variant==='after')assert.deepEqual(state.mechanism.map(image=>image.src).sort(),[...state.required].sort(),'Only current level mechanism images retained');
    row.mechanismLevels.push(state);if([20,150,200].includes(level))await page.screenshot({path:resolve(output,`${width}-level-${level}.png`)});
   }
   const final=await snap(page);assert.deepEqual(final.storageViolations,[]);assert.deepEqual(errors,[]);row.imageAudit=await page.evaluate(()=>window.__PERF__.audit.images);assert(!row.imageAudit.some(i=>i.error));row.status='PASS';
  }catch(error){row.status='FAIL';row.error=String(error.stack??error);row.snapshot=await snap(page).catch(()=>null);report.errors.push(row.error);await page.screenshot({path:resolve(output,`${width}-failure.png`)}).catch(()=>{});}finally{row.browserErrors=errors;await context.close();}
 }
 // Fresh page ensures a genuine in-flight mechanism batch even in the baseline.
 const row={case:'late-mechanism-result',status:'RUNNING'};report.rows.push(row);const {context,page,errors}=await openContext(320);
 try{
  await page.evaluate(()=>{const t=window.__PERF__;t.hold();t.game.loadLevel(200,true);});await page.waitForFunction(()=>window.__PERF__.pending()>0,undefined,{timeout:10000});
  row.pending=await page.evaluate(()=>window.__PERF__.pending());await page.evaluate(()=>{const t=window.__PERF__;t.game.loadLevel(1,true);t.release();});await loaded(page);row.after=await snap(page);
  if(variant==='after')assert.deepEqual(row.after.mechanism,[],'Late images from old level must be released');assert.deepEqual(row.after.storageViolations,[]);assert.deepEqual(errors,[]);row.status='PASS';
 }catch(error){row.status='FAIL';row.error=String(error.stack??error);report.errors.push(row.error);}finally{await context.close();}
 report.sourceDrift=[];for(const [name,s] of Object.entries(sources))if(sha(await readFile(s.file,'utf8'))!==s.sha256)report.sourceDrift.push(name);
 if(report.sourceDrift.length)report.errors.push('Effective inputs changed during QA: '+report.sourceDrift.join(', '));
 for(const [file,digest] of Object.entries(assets))assert.equal(sha(await readFile(file)),digest,`Asset changed: ${file}`);report.assetHashes=assets;
}catch(error){report.errors.push(String(error.stack??error));}
finally{
 await browser.close();await new Promise(done=>server.close(done));report.status=report.errors.length?'FAIL':'PASS';await writeFile(resolve(output,'report.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({status:report.status,variant,output,summary:report.rows.map(row=>({width:row.width,case:row.case,status:row.status,idle:row.leagueIdle,hidden:row.hidden,levels:row.mechanismLevels?.map(s=>({level:s.level,count:s.mechanismCount,rgbaBytes:s.mechanismRgbaBytes})),collection:row.collection?.map(s=>({tab:s.tab,page:s.pageIndex,count:s.count,rgbaBytes:s.rgbaBytes})),error:row.error}))},null,2));if(report.status!=='PASS')process.exitCode=1;
}
