import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,readFile,readdir,writeFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {isDeepStrictEqual} from 'node:util';
import {build} from 'esbuild';
import {createServer} from 'vite';
import {chromium} from 'playwright';

// Current-source, isolated MemoryHost E2E. No real profile, completion injection,
// accelerated clock, guide-method dispatch or native-device validation.
const output=resolve(process.env.FEATURE_GUIDE_OUTPUT??`playtest-results/feature-guides-20261008-${Date.now()}`);
const caseFilter=process.env.FEATURE_GUIDE_CASE?new RegExp(process.env.FEATURE_GUIDE_CASE):undefined;
const sha=value=>createHash('sha256').update(value).digest('hex');
const clean=value=>JSON.parse(JSON.stringify(value));
const features=[
 {id:'leaderboard',level:6,entry:'navigation.1',screen:'leaderboard'},
 {id:'supply',level:8,entry:'navigation.0',screen:'supply'},
 {id:'levels',level:11,entry:'navigation.3',screen:'levels'},
 {id:'dailyChallenge',level:15,entry:'homeDailyChallenge',screen:'dailyChallenge'},
 {id:'league',level:20,entry:'homeLeague',screen:'league'},
];
const routeFiles={
 11:'deliverables/lv11-remake-20260927/design-structured-1790489811659/route-7681.json',
 15:'deliverables/lv15-remake-20260927/design-search-1790492591676/route-2.json',
 20:'deliverables/lv20-remake-20260927/design-v187-1790503452295/candidate-120.json',
};
const compiled=await build({stdin:{contents:"export {LEVELS} from './src/core/levels.ts';export {replayRevisedRoute} from './src/core/revisedLevelSearch.ts';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'});
const api=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
const routes={};
for(const[id,file]of Object.entries(routeFiles)){
 const packet=JSON.parse(await readFile(file,'utf8')),level=clean(api.LEVELS[Number(id)-1]),drags=packet.drags??packet.route,replay=api.replayRevisedRoute(level,drags);
 assert(replay.valid&&replay.complete,`Historical drag sequence must freshly replay the exact current formal Lv${id}: ${replay.error}`);
 routes[id]={file,level,drags,levelSha256:sha(JSON.stringify(level)),routeSha256:sha(JSON.stringify(drags)),routePacketLevelMatchesCurrent:isDeepStrictEqual(clean(packet.level),level)};
}
const manifest=JSON.parse(await readFile('docs/rules/manifest.json','utf8'));
assert.equal(manifest.activeVersion,'1.159.0','Re-read rules before adopting another contract');
const files=['tools/playtest-feature-unlock-guides.mjs','docs/rules/manifest.json','docs/rules/mechanism-rules-v1.159.0.md',...Object.values(routeFiles)];
async function tree(dir){for(const e of await readdir(dir,{withFileTypes:true})){const p=dir+'/'+e.name;if(e.isDirectory())await tree(p);else files.push(p);}}
await tree('src');const bindings=async()=>Object.fromEntries(await Promise.all(files.map(async p=>[p,sha(await readFile(p))])));
const sources=await bindings();await mkdir(output,{recursive:true});
// Serve an immutable copy so another task editing shared UI cannot mix source
// versions between the 30 browser contexts. The final current-source audit is
// still retained separately and must disclose any drift.
const snapshotRoot=resolve(output,'source-snapshot');
for(const[file,hash]of Object.entries(sources)){
 const bytes=await readFile(file);assert.equal(sha(bytes),hash,`Source changed while freezing ${file}`);
 const target=resolve(snapshotRoot,file);await mkdir(dirname(target),{recursive:true});await writeFile(target,bytes,{flag:'wx'});
}

function seed(highest,{pending=[],legacy=false,reduced=false,scene=false,collection=false}={}){
 const chapter=Math.floor((highest-1)/10)+1;
 return {schemaVersion:1,currentLevel:highest,highestLevel:highest,coins:777,sound:false,music:false,haptic:false,reducedMotion:reduced,language:'zh-CN',
  featureSeen:['basics','ice-door','ice-block','layer','shutter','generator','key-lock','arrow-block','lift','star'],boosterUnlockSeen:['time','rocket','pulse'],boosters:{time:3,rocket:3,pulse:3},leagueIntroSeen:false,
  bestStars:Object.fromEntries(Array.from({length:highest-1},(_,i)=>[String(i+1),3])),bestMoves:Object.fromEntries(Array.from({length:highest-1},(_,i)=>[String(i+1),50])),rewardedLevels:Array.from({length:highest-1},(_,i)=>i+1),
  selectedJourneyEpisode:chapter,journeyProgress:{claimedMilestoneLevels:Array.from({length:40},(_,i)=>(i+1)*5),seenEpisodeUnlockLevels:Array.from({length:chapter-1},(_,i)=>(i+1)*10+1).filter(n=>!scene||n!==highest)},
  collectionIntroPending:collection,collectionIntroShown:!collection,lifeState:{lives:5,nextLifeAtMs:0,unlimitedLivesUntilMs:0},metaDiscovery:{collectionViewedThroughLevel:highest,dailyUnlockSeen:true},dailyStreak:0,lastDailyCompletedDay:'',
  ...(legacy?{}:{featureGuideProgress:{version:1,pending,seen:features.filter(f=>highest>f.level&&!pending.includes(f.id)).map(f=>f.id)}}),
 };
}
function fixture(initial,options){return `<!doctype html><meta charset="utf-8"><link rel="icon" href="data:,"><style>html,body{margin:0;overflow:hidden;background:#201953}canvas{display:block;width:100vw;height:100vh;touch-action:none}</style><script type="module">
import {ColorEscapeGame} from '/src/game/ColorEscapeGame.ts';import {WebHost} from '/src/platform/WebHost.ts';
const initial=${JSON.stringify(initial)},options=${JSON.stringify(options)},key='color-escape-save-v1';
const audit={writes:[],reads:[],frames:[],texts:[],images:[],draws:[],pointers:[],overlaps:[]};let game,mode='commit',releaseTheme;
const imageNames=new WeakMap(),identities=new WeakMap(),frameKeys=new Set(),textKeys=new Set(),drawKeys=new Set();let nextIdentity=1;
const themeWait=new Promise(resolve=>{releaseTheme=resolve;});
class MemoryHost extends WebHost{
 data=new Map([[key,structuredClone(initial)]]);
 storageRead(k){const unavailable=mode.startsWith('unknown');audit.reads.push({at:performance.now(),mode,key:k,unavailable});return unavailable?{status:'unavailable'}:this.data.has(k)?{status:'ok',value:structuredClone(this.data.get(k))}:{status:'missing'};}
 storageGet(k,f){const r=this.storageRead(k);return r.status==='ok'?r.value:f;}
 storageSet(k,v){if(!identities.has(v))identities.set(v,nextIdentity++);const value=structuredClone(v),stored=mode==='commit'||mode==='unknown-written';audit.writes.push({at:performance.now(),key:k,value,mode,identity:identities.get(v),stored,screen:game?.screen});if(stored)this.data.set(k,value);return mode==='commit';}
 music(){}sound(){}vibrate(){}
 async createImage(src){const row={src,start:performance.now()};audit.images.push(row);try{if(options.holdTheme&&src.endsWith(options.holdTheme))await themeWait;const image=await super.createImage(src);row.end=performance.now();imageNames.set(image,src);return image;}catch(e){row.error=String(e);throw e;}}
}
const host=new MemoryHost();game=new ColorEscapeGame(host);window.__COLOR_ESCAPE__=game;window.__GUIDE_TEST__={host,audit,controls:{mode:m=>{mode=m;},releaseTheme:()=>releaseTheme()}};
const render=game.render;game.render=function(...args){const d=this.getDebugState(),g=d.featureUnlockGuide,active=!!g?.feature,coin=!!this.homeCoinFlight,collection=!!this.collectionIntro,journey=!!this.journeyPresentation;
 if(active&&(coin||collection||journey))audit.overlaps.push({at:performance.now(),screen:this.screen,guide:structuredClone(g),coin,collection,journey});
 const sample={screen:this.screen,level:this.model.level.id,guide:g?structuredClone(g):null,coin,collection,journey:this.journeyPresentation?{phase:this.journeyPresentation.phase,sceneReveal:this.journeyPresentation.sceneReveal}:null};
 const stamp=JSON.stringify({...sample,guide:g?{...g,age:Math.floor((g.age??0)*20)/20}:null});if(!frameKeys.has(stamp)){frameKeys.add(stamp);audit.frames.push({at:performance.now(),...sample});}return render.apply(this,args);};
const fill=host.context.fillText;host.context.fillText=function(value,...args){const g=game.featureUnlockGuide;if(g?.feature){const text=String(value),id=g.phase+'|'+text;if(!textKeys.has(id)){textKeys.add(id);audit.texts.push({text,args,alpha:this.globalAlpha,phase:g.phase,feature:g.feature,at:performance.now()});}}return fill.call(this,value,...args);};
const draw=host.context.drawImage;host.context.drawImage=function(image,...args){const g=game.featureUnlockGuide;if(g?.feature){const t=this.getTransform(),row={src:imageNames.get(image),args,matrix:[t.a,t.b,t.c,t.d,t.e,t.f],alpha:this.globalAlpha,feature:g.feature,phase:g.phase},id=JSON.stringify(row);if(!drawKeys.has(id)){drawKeys.add(id);audit.draws.push({at:performance.now(),...row});}}return draw.call(this,image,...args);};
for(const type of ['pointerdown','pointerup'])host.canvas.addEventListener(type,e=>audit.pointers.push({type,x:e.clientX,y:e.clientY,at:performance.now()}),true);game.start();
</script>`;}
const report={status:'RUNNING',completeSuite:!caseFilter,caseFilter:caseFilter?.source,scope:'Five synthetic completed/pending guide cases per viewport plus real current-formal Lv11/15/20 clears. Explicit synthetic pending queue and storage-fault cases. Isolated MemoryHost; no persistent profile, injected completion or native-device claim.',snapshotRoot,sources,routeBindings:Object.fromEntries(Object.entries(routes).map(([id,r])=>[id,{...r,level:undefined,drags:r.drags.length}])),cases:[],errors:[]};
const server=await createServer({root:snapshotRoot,publicDir:resolve('public'),configFile:false,optimizeDeps:{noDiscovery:true,entries:[]},server:{host:'127.0.0.1',port:0,hmr:false,watch:null},logLevel:'error'});await server.listen();
const origin=`http://127.0.0.1:${server.httpServer.address().port}`,browser=await chromium.launch({headless:true});
const state=p=>p.evaluate(()=>window.__COLOR_ESCAPE__.getDebugState());
const saved=p=>p.evaluate(()=>structuredClone(window.__GUIDE_TEST__.host.data.get('color-escape-save-v1')));
const audit=p=>p.evaluate(()=>structuredClone(window.__GUIDE_TEST__.audit));
const targets=s=>s.interactionTargets.targets??s.interactionTargets;
async function point(p,s,x,y){const r=await p.locator('canvas').boundingBox(),t=s.viewportTransform;return{x:r.x+t.offsetX+x*t.scale,y:r.y+t.offsetY+y*t.scale};}
async function click(p,key){const s=await state(p),r=targets(s)[key]?.hit;assert(r,`Actual target ${key}`);const q=await point(p,s,r.x+r.width/2,r.y+r.height/2);await p.mouse.click(q.x,q.y,{delay:35});}
async function snap(p,row,label){const file=resolve(output,`${row.name}-${label}.png`);await p.screenshot({path:file});row.images.push({file,sha256:sha(await readFile(file))});}
const ready=p=>p.waitForFunction(()=>{const g=window.__COLOR_ESCAPE__;return g?.artReady&&g.storageBaselineReady;},undefined,{timeout:60000});
const guideReady=(p,phase='reveal')=>p.waitForFunction(phase=>{const g=window.__COLOR_ESCAPE__.getDebugState().featureUnlockGuide;return g?.feature&&g.phase===phase&&g.ready;},phase,{timeout:20000});
const stable=p=>p.waitForFunction(()=>{const g=window.__COLOR_ESCAPE__,s=g.getDebugState();return s.art.formalGameplay.missingWholeBlockIds.length===0&&!g.revisedArtLoading&&!g.hasInitialRevisedRegionPresentation()&&!g.hasActiveMechanicMotion()&&!s.exitAnimations.length&&!s.revisedMechanismAnimations.length&&!s.generatorSpawnAnimations.length;},undefined,{timeout:20000});
const spatial=s=>clean(Object.fromEntries(['blocks','gates','shutters','generators','queuedBlocks','cleared','complete','failed','timeFreezeSeconds'].map(k=>[k,s[k]])));
const economy=s=>clean({coins:s.coins,boosters:s.boosters,lives:s.lifeState,highestLevel:s.highestLevel,currentLevel:s.currentLevel,rewardedLevels:s.rewardedLevels,dailyAttempts:s.dailyChallenge?.attemptsRemaining,dailyCompleted:s.dailyChallenge?.completed,dailyRewarded:s.dailyChallenge?.rewarded});
async function enterReady(p,feature){await p.waitForFunction(feature=>{const g=window.__COLOR_ESCAPE__,s=g.getDebugState();if(s.screen!==feature.screen||g.navigationTransition)return false;return ['levels','supply','leaderboard'].includes(s.screen)?g.formalPageReady(s.screen):s.screen==='league'?s.league.artReady:s.dailyChallenge.art.ready;},feature,{timeout:25000});}
async function assertGuide(p,row,feature,{action='entry',fault}={}){
 await guideReady(p);row.reveal=await state(p);row.beforeConfirmation=await saved(p);assert.equal(row.reveal.screen,'home');assert.equal(row.reveal.featureUnlockGuide.feature,feature.id);
 assert(row.beforeConfirmation.featureGuideProgress.pending.includes(feature.id));assert(!row.beforeConfirmation.featureGuideProgress.seen.includes(feature.id));
 await snap(p,row,'reveal');
 const frames=(await audit(p)).frames.filter(f=>f.guide?.feature===feature.id);assert(frames.every(f=>f.screen==='home'&&!f.coin&&!f.collection&&!f.journey));
 if(!row.beforeConfirmation.reducedMotion){assert(frames.some(f=>f.guide.phase==='reveal'&&f.guide.age<.7&&!f.guide.ready),'A real timed reveal precedes readiness');assert(frames.filter(f=>f.guide.age<.74).every(f=>!f.guide.ready),'No early reveal confirmation');}
 if(action==='entry'){
  await click(p,'featureGuide.look');await guideReady(p,'focus');row.focus=await state(p);
  const target=row.focus.featureUnlockGuide.targetRect;assert(target&&target.width>0&&target.height>0);
  const entry=targets(row.focus)['featureGuide.entry']?.hit;assert(entry&&entry.width>0&&entry.height>0);
  assert.equal(row.focus.screen,'home');assert.deepEqual(economy(await saved(p)),economy(row.beforeConfirmation));
  await snap(p,row,'focus');
  // Real pointer away from the highlighted icon must leave the guide in focus.
  const q=await point(p,row.focus,248,420);await p.mouse.click(q.x,q.y);await p.waitForTimeout(60);
  assert.equal((await state(p)).screen,'home');assert.equal((await state(p)).featureUnlockGuide.phase,'focus');
 }
 const confirm=action==='entry'?'featureGuide.entry':'featureGuide.later';
 const writesBefore=(await audit(p)).writes.length;
 if(fault)await p.evaluate(m=>window.__GUIDE_TEST__.controls.mode(m),fault);
 await click(p,confirm);
 if(fault){
  await p.waitForFunction(()=>!!window.__COLOR_ESCAPE__.getDebugState().featureUnlockGuide?.persistence);
  row.failedAcknowledgement=await state(p);assert.equal(row.failedAcknowledgement.screen,'home');
  assert.equal(row.failedAcknowledgement.featureUnlockGuide.persistence,fault==='reject'?'rejected':'unknown');await snap(p,row,'acknowledgement-failure');
  assert.deepEqual(economy(await saved(p)),economy(row.beforeConfirmation));
  await p.evaluate(()=>window.__GUIDE_TEST__.controls.mode('commit'));await click(p,'featureGuide.retry');
 }
 await p.waitForFunction(()=>!window.__COLOR_ESCAPE__.getDebugState().featureUnlockGuide?.feature,undefined,{timeout:20000});
 if(action==='entry')await enterReady(p,feature);else assert.equal((await state(p)).screen,'home');
 row.after=await state(p);row.afterSave=await saved(p);assert(!row.afterSave.featureGuideProgress.pending.includes(feature.id));assert(row.afterSave.featureGuideProgress.seen.includes(feature.id));
 assert.deepEqual(economy(row.afterSave),economy(row.beforeConfirmation),'Guide entry/later cannot spend, claim or start a level');
 if(fault){const writes=(await audit(p)).writes.slice(writesBefore);assert(writes.length>0);assert.equal(new Set(writes.map(w=>JSON.stringify(w.value))).size,1,'Retry preserves the exact acknowledgement candidate');if(fault.startsWith('unknown'))assert.equal(new Set(writes.map(w=>w.identity)).size,1,'Unknown retry retains the same candidate object');row.retryWrites=writes;}
 await snap(p,row,action==='entry'?'entered':'later');
}
async function complete(p,row,id){
 const route=routes[id];await click(p,'homePlay');
 if((await state(p)).screen==='feature'){await p.waitForFunction(()=>!!window.__COLOR_ESCAPE__.featureIntroIconArt.image);await click(p,'featurePrimary');}
 await p.waitForFunction(()=>window.__COLOR_ESCAPE__.screen==='playing');await stable(p);row.opening=await state(p);assert.deepEqual(clean(row.opening.level),route.level);await snap(p,row,'opening');
 const before=row.opening.puzzle.remainingSeconds;await p.waitForTimeout(300);assert((await state(p)).puzzle.remainingSeconds<before);row.steps=[];
 for(const[index,drag]of route.drags.entries()){
  await stable(p);const s=await state(p),b=s.puzzle.blocks.find(b=>b.id===drag.blockId);assert(b&&!b.frozen&&!s.puzzle.failed);const[gx,gy]=b.shape[0];
  const move=async(x,y)=>{const q=await point(p,s,s.board.innerX+(x+gx+.5)*s.board.cell,s.board.innerY+(y+gy+.5)*s.board.cell);await p.mouse.move(q.x,q.y,{steps:3});};
  await move(b.x,b.y);await p.mouse.down();for(const[x,y]of drag.path)await move(x,y);if(drag.exitSide){const[x,y]=drag.path.at(-1)??[b.x,b.y],[dx,dy]={left:[-.8,0],right:[.8,0],top:[0,-.8],bottom:[0,.8]}[drag.exitSide];await move(x+dx,y+dy);}await p.mouse.up();await stable(p);
  const actual=(await state(p)).puzzle,expected=api.replayRevisedRoute(route.level,route.drags.slice(0,index+1));assert(expected.valid);assert.deepEqual(spatial(actual),spatial(JSON.parse(expected.finalStateKey)));assert.equal(actual.moves,s.puzzle.moves+1);assert(!actual.failed);row.steps.push({index:index+1,blockId:drag.blockId,moves:actual.moves,clearDelta:actual.cleared-s.puzzle.cleared,remainingSeconds:actual.remainingSeconds});
 }
 await p.waitForFunction(()=>{const g=window.__COLOR_ESCAPE__;return g.screen==='win'&&!g.pendingSettlement&&g.winArt;},undefined,{timeout:30000});row.win=await state(p);row.winSave=await saved(p);
 assert.equal(row.winSave.highestLevel,id+1);assert.equal(row.winSave.coins,817);assert(row.win.puzzle.complete);assert(!row.win.featureUnlockGuide?.feature,'No guide on result screen');
 const feature=features.find(f=>f.level===id);assert(row.winSave.featureGuideProgress.pending.includes(feature.id));
 const writes=(await audit(p)).writes.filter(w=>w.value.highestLevel===id+1);assert(writes.length>0&&writes.every(w=>w.value.featureGuideProgress.pending.includes(feature.id)),'Guide is queued in the same completion save');await snap(p,row,'win');
 await click(p,'modalPrimary');await p.waitForFunction(()=>window.__COLOR_ESCAPE__.screen==='home');
 if(id===20){
  await p.waitForFunction(()=>window.__COLOR_ESCAPE__.getDebugState().journey.sceneReveal?.ready,undefined,{timeout:20000});row.scene=await state(p);assert(!row.scene.featureUnlockGuide?.feature);await snap(p,row,'scene-before-guide');await click(p,'journeySceneConfirm');
 }
 await assertGuide(p,row,feature);
 const timeline=(await audit(p)).frames;const firstGuide=timeline.find(f=>f.guide?.feature===feature.id);assert(firstGuide);assert(timeline.some(f=>f.coin&&f.at<firstGuide.at),'Coin animation precedes guide');
 if(id===20)assert(timeline.some(f=>f.journey?.sceneReveal&&f.at<firstGuide.at));
}
async function run(name,viewport,initial,options,body){
 if(caseFilter&&!caseFilter.test(`${viewport.width}-${name}`))return;
 const row={name:`${viewport.width}-${name}`,viewport,syntheticPending:!!initial.featureGuideProgress?.pending.length,status:'RUNNING',images:[]};report.cases.push(row);
 const context=await browser.newContext({viewport}),p=await context.newPage();let currentSeed=initial,currentOptions=options;
 p.on('pageerror',e=>report.errors.push({case:row.name,type:'pageerror',message:e.message}));p.on('console',m=>{if(m.type()==='error')report.errors.push({case:row.name,type:'console',message:m.text()});});
 await p.addInitScript(()=>{window.__STORAGE_VIOLATIONS__=[];for(const k of ['getItem','setItem','removeItem','clear'])Storage.prototype[k]=function(){window.__STORAGE_VIOLATIONS__.push(k);throw Error('Persistent storage forbidden');};for(const k of ['open','deleteDatabase'])indexedDB[k]=function(){window.__STORAGE_VIOLATIONS__.push(k);throw Error('Persistent database forbidden');};});
 await p.route('**/__feature_guide_fixture__',r=>r.fulfill({contentType:'text/html',body:fixture(currentSeed,currentOptions)}));
 const reload=async()=>{row.beforeReloadAudit=await audit(p);assert.deepEqual(row.beforeReloadAudit.overlaps,[]);currentSeed=await saved(p);currentOptions={};await p.reload({waitUntil:'domcontentloaded'});await ready(p);await p.waitForTimeout(900);row.reloaded=await state(p);row.reloadedSave=await saved(p);assert.equal(row.reloaded.screen,'home');assert(!row.reloaded.featureUnlockGuide?.feature,'Confirmed guides cannot replay on reload');await snap(p,row,'reload');};
 try{
  await p.goto(origin+'/__feature_guide_fixture__',{waitUntil:'domcontentloaded'});await ready(p);row.initial=await state(p);row.initialSave=await saved(p);await body(p,row,reload);
  row.audit=await audit(p);assert.deepEqual(row.audit.overlaps,[]);row.storageViolations=await p.evaluate(()=>window.__STORAGE_VIOLATIONS__);assert.deepEqual(row.storageViolations,[]);row.finalSave=await saved(p);row.status='PASS';
 }catch(error){row.status='FAIL';row.error=String(error.stack??error);row.lastState=await state(p).catch(()=>null);row.lastSave=await saved(p).catch(()=>null);row.audit=await audit(p).catch(()=>null);await snap(p,row,'failure').catch(()=>{});throw error;}
 finally{await context.close();}
}
try{
 for(const viewport of [{width:320,height:568},{width:496,height:1078}]){
  for(const feature of features)await run(`pending-${feature.id}`,viewport,seed(feature.level+1,{pending:[feature.id]}),{},async(p,row,reload)=>{await assertGuide(p,row,feature);await reload();});
  for(const id of [11,15,20])await run(`formal${id}`,viewport,seed(id),{},async(p,row,reload)=>{row.realFormalCompletion=true;await complete(p,row,id);await reload();});
  await run('legacy-high',viewport,{...seed(100,{legacy:true}),currentLevel:3},{},async(p,row,reload)=>{await p.waitForTimeout(1100);const s=await state(p),save=await saved(p);assert.equal(s.screen,'home');assert(!s.featureUnlockGuide?.feature);assert.deepEqual([...save.featureGuideProgress.seen].sort(),features.map(f=>f.id).sort());assert.deepEqual(save.featureGuideProgress.pending,[]);assert.equal(save.coins,777);await snap(p,row,'no-catchup');await reload();});
  await run('tasks-achievements-no-guide',viewport,seed(6),{},async(p,row,reload)=>{await p.waitForTimeout(1000);const s=await state(p);assert(!s.featureUnlockGuide?.feature);assert.equal(s.featureUnlocks.dailyTasks.guide,false);assert.equal(s.featureUnlocks.achievements.guide,false);assert.deepEqual((await saved(p)).featureGuideProgress.pending,[]);for(const[entry,screen,close]of[['homeMissions','dailyTasks','dailyTaskClose'],['homeAchievements','achievements','achievementClose']]){await click(p,entry);await p.waitForFunction(screen=>window.__COLOR_ESCAPE__.screen===screen,screen);assert(!((await state(p)).featureUnlockGuide?.feature));await click(p,close);}await reload();});
  const daily=features.find(f=>f.id==='dailyChallenge');await run('reduced-motion',viewport,seed(16,{pending:['dailyChallenge'],reduced:true}),{},async(p,row,reload)=>{await assertGuide(p,row,daily,{action:'later'});assert.equal(row.after.screen,'home');await reload();});
 }
 for(const[fault,index]of ['reject','unknown-written','unknown-unwritten'].map((x,i)=>[x,i]))for(const action of ['entry','later']){
  const viewport=index%2?{width:496,height:1078}:{width:320,height:568},daily=features.find(f=>f.id==='dailyChallenge');
  await run(`${fault}-${action}`,viewport,seed(16,{pending:['dailyChallenge']}),{},async(p,row,reload)=>{await assertGuide(p,row,daily,{action,fault});await reload();});
 }
 await run('collection-scene-queue',{width:320,height:568},seed(21,{pending:['league'],scene:true,collection:true}),{holdTheme:'assets/art/ui/formal-pages/journey/home-03.jpg'},async(p,row,reload)=>{
  await p.waitForFunction(()=>window.__COLOR_ESCAPE__.getDebugState().collectionIntro.active,undefined,{timeout:20000});row.collection=await state(p);assert(!row.collection.featureUnlockGuide?.feature&&!row.collection.journey.presentation);await snap(p,row,'collection-first');await click(p,'collectionIntroLater');
  await p.waitForFunction(()=>window.__COLOR_ESCAPE__.getDebugState().journey.presentation?.sceneReveal);row.waiting=await state(p);assert(!row.waiting.featureUnlockGuide?.feature);assert.equal(row.waiting.journey.sceneReveal.ready,false);await snap(p,row,'scene-waits-for-image');await p.evaluate(()=>window.__GUIDE_TEST__.controls.releaseTheme());
  await p.waitForFunction(()=>window.__COLOR_ESCAPE__.getDebugState().journey.sceneReveal?.ready);await click(p,'journeySceneConfirm');await assertGuide(p,row,features.find(f=>f.id==='league'),{action:'later'});await reload();
 });
 await run('scene-later-then-guide',{width:496,height:1078},seed(21,{pending:['league'],scene:true}),{holdTheme:'assets/art/ui/formal-pages/journey/home-03.jpg'},async(p,row,reload)=>{
  await p.waitForFunction(()=>window.__COLOR_ESCAPE__.getDebugState().journey.presentation?.sceneReveal,undefined,{timeout:20000});
  row.waiting=await state(p);assert.equal(row.waiting.journey.sceneReveal.ready,false);assert(!row.waiting.featureUnlockGuide?.feature);
  await snap(p,row,'scene-waiting');await click(p,'journeySceneLater');
  await assertGuide(p,row,features.find(f=>f.id==='league'),{action:'later'});await p.waitForTimeout(1200);
  row.afterDeferral=await state(p);assert(!row.afterDeferral.journey.presentation,'Deferred scene cannot immediately reopen after guide Later');assert(!row.afterDeferral.featureUnlockGuide.feature);
  assert(!(await saved(p)).journeyProgress.seenEpisodeUnlockLevels.includes(21),'Scene Later cannot acknowledge an unseen scene');
  await snap(p,row,'no-immediate-scene-repeat');await reload();
  row.sceneAfterReload=await state(p);assert(!row.sceneAfterReload.featureUnlockGuide.feature);assert(!(await saved(p)).journeyProgress.seenEpisodeUnlockLevels.includes(21),'Deferred scene remains unacknowledged after reload; no claim that launch must immediately show it');await snap(p,row,'scene-unacknowledged-next-launch');
 });
 if(!caseFilter)assert.equal(report.cases.length,30);
 assert.deepEqual(report.errors,[]);assert.deepEqual(await bindings(),sources,'Sources/route inputs must stay unchanged during the full run');report.status='PASS';
}catch(error){report.status='FAIL';report.error=String(error.stack??error);process.exitCode=1;}
finally{await browser.close();await server.close();await writeFile(resolve(output,'report.json'),JSON.stringify(report,null,2));}
console.log(JSON.stringify({status:report.status,output,cases:report.cases.length,error:report.error}));
