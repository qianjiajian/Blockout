import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,readFile,readdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {build} from 'esbuild';
import {createServer} from 'vite';
import {chromium} from 'playwright';

// Real Pointer navigation on current sources, with isolated synthetic saves.
// No stage completion fixture, production mutations or real storage access.
const output=resolve(process.env.FEATURE_UNLOCK_OUTPUT??`playtest-results/feature-unlocks-20261008-${Date.now()}`);
await mkdir(output,{recursive:true});
const sha=value=>createHash('sha256').update(value).digest('hex');
const manifest=JSON.parse(await readFile('docs/rules/manifest.json','utf8'));
const routeFile='deliverables/lv15-remake-20260927/design-search-1790492591676/route-2.json';
const temporaryRoute=JSON.parse(await readFile(routeFile,'utf8'));
const compiled=await build({stdin:{contents:"export {LEVELS} from './src/core/levels.ts';export {replayRevisedRoute} from './src/core/revisedLevelSearch.ts';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'});
const api=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
assert.deepEqual(JSON.parse(JSON.stringify(api.LEVELS[14])),temporaryRoute.level,'Temporary test uses the exact current formal Lv15');
const temporaryReplay=api.replayRevisedRoute(api.LEVELS[14],temporaryRoute.drags);
assert(temporaryReplay.valid&&temporaryReplay.complete);
const files=['tools/playtest-feature-unlocks.mjs','docs/rules/manifest.json',`docs/rules/mechanism-rules-v${manifest.activeVersion}.md`,routeFile];
async function tree(dir){for(const e of await readdir(dir,{withFileTypes:true})){const p=dir+'/'+e.name;if(e.isDirectory())await tree(p);else files.push(p);}}
await tree('src');
const bindings=async()=>Object.fromEntries(await Promise.all(files.map(async p=>[p,sha(await readFile(p))])));
const sourceBefore=await bindings();
const features=[
 {key:'journey',id:'levels',threshold:11,target:'navigation.3',screen:'levels',close:'navigation.2'},
 {key:'leaderboard',threshold:6,target:'navigation.1',screen:'leaderboard',close:'navigation.2'},
 {key:'shop',id:'supply',threshold:8,target:'navigation.0',screen:'supply',close:'navigation.2'},
 {key:'dailyTasks',threshold:5,target:'homeMissions',screen:'dailyTasks',close:'dailyTaskClose'},
 {key:'dailyChallenge',threshold:15,target:'homeDailyChallenge',screen:'dailyChallenge',close:'dailyChallengeClose'},
 {key:'achievements',threshold:5,target:'homeAchievements',screen:'achievements',close:'achievementClose'},
 {key:'league',threshold:20,target:'homeLeague',screen:'league',close:'league.back'},
 {key:'shop',id:'supply',threshold:8,target:'homeSupply',screen:'supply',close:'navigation.2',alternate:true},
];
const makeSeed=(highest,current=highest)=>({schemaVersion:1,currentLevel:current,highestLevel:highest,coins:777,
 sound:false,music:false,haptic:false,reducedMotion:false,language:'zh-CN',featureSeen:['basics','ice-door','ice-block','layer','shutter','generator','key-lock','arrow-block','lift','star'],
 boosterUnlockSeen:['time','rocket','pulse'],boosters:{time:3,rocket:3,pulse:3},leagueIntroSeen:true,
 bestStars:Object.fromEntries(Array.from({length:highest-1},(_,i)=>[String(i+1),3])),
 bestMoves:Object.fromEntries(Array.from({length:highest-1},(_,i)=>[String(i+1),50])),rewardedLevels:Array.from({length:highest-1},(_,i)=>i+1),
 selectedJourneyEpisode:1,journeyProgress:{claimedMilestoneLevels:Array.from({length:40},(_,i)=>(i+1)*5),seenEpisodeUnlockLevels:Array.from({length:19},(_,i)=>(i+1)*10+1).filter(n=>n<=highest)},
 collectionIntroPending:false,collectionIntroShown:true,lifeState:{lives:5,nextLifeAtMs:0,unlimitedLivesUntilMs:0},
 metaDiscovery:{collectionViewedThroughLevel:highest,dailyUnlockSeen:true},dailyStreak:0,lastDailyCompletedDay:''});
function fixture(seed,options){return `<!doctype html><meta charset="utf-8"><link rel="icon" href="data:,"><style>html,body{margin:0;overflow:hidden;background:#201953}canvas{display:block;width:100vw;height:100vh;touch-action:none}</style><script type="module">
import {ColorEscapeGame} from '/src/game/ColorEscapeGame.ts';
import {WebHost} from '/src/platform/WebHost.ts';
const options=${JSON.stringify(options)},initial=${JSON.stringify(seed)},key='color-escape-save-v1';
const audit={phase:'startup',texts:[],images:[],writes:[],pointers:[]};const textKeys=new Set();let game;
class MemoryHost extends WebHost{
 data=new Map([[key,structuredClone(initial)]]);
 storageRead(k){return this.data.has(k)?{status:'ok',value:structuredClone(this.data.get(k))}:{status:'missing'};}
 storageGet(k,f){const r=this.storageRead(k);return r.status==='ok'?r.value:f;}
 storageSet(k,v){const copy=structuredClone(v);audit.writes.push({key:k,value:copy,phase:audit.phase,at:performance.now()});this.data.set(k,copy);return true;}
 music(){}sound(){}vibrate(){}
 async createImage(src){const row={src,phase:audit.phase,start:performance.now()};audit.images.push(row);try{if(options.failImageContains&&src.includes(options.failImageContains)&&audit.phase!=='startup')throw Error('Synthetic feature-image failure');const image=await super.createImage(src);row.end=performance.now();return image;}catch(e){row.error=String(e);throw e;}}
}
const host=new MemoryHost();game=new ColorEscapeGame(host);window.__COLOR_ESCAPE__=game;window.__UNLOCK_TEST__={game,host,audit};
const fill=host.context.fillText;host.context.fillText=function(value,...args){const text=String(value),id=audit.phase+'|'+text;if(!textKeys.has(id)){textKeys.add(id);audit.texts.push({text,args,phase:audit.phase,at:performance.now(),screen:game.screen,alpha:this.globalAlpha});}return fill.call(this,value,...args);};
for(const type of ['pointerdown','pointerup'])host.canvas.addEventListener(type,e=>audit.pointers.push({type,x:e.clientX,y:e.clientY,phase:audit.phase,at:performance.now()}),true);
game.start();
</script>`;}
const report={status:'RUNNING',scope:'Synthetic boundary accounts, real Pointer entry/close on 320x568 and 496x1078, plus actual temporary Lv15 completion against saved progress5. No actual user profile, persistent storage or native-device claim.',sources:sourceBefore,features,cases:[],errors:[],temporaryRoute:{file:routeFile,levelSha256:sha(JSON.stringify(temporaryRoute.level)),routeSha256:sha(JSON.stringify(temporaryRoute.drags)),drags:temporaryRoute.drags.length}};
const server=await createServer({configFile:false,optimizeDeps:{noDiscovery:true,entries:[]},server:{host:'127.0.0.1',port:0,hmr:false,watch:null},logLevel:'error'});
await server.listen();const origin=`http://127.0.0.1:${server.httpServer.address().port}`;
const browser=await chromium.launch({headless:true});
const state=page=>page.evaluate(()=>window.__COLOR_ESCAPE__.getDebugState());
const saved=page=>page.evaluate(()=>structuredClone(window.__UNLOCK_TEST__.host.data.get('color-escape-save-v1')));
const phase=(page,value)=>page.evaluate(v=>window.__UNLOCK_TEST__.audit.phase=v,value);
const targets=s=>s.interactionTargets.targets??s.interactionTargets;
async function click(page,key){const s=await state(page),target=targets(s)[key],r=key==='homeSupply'?target?.visual:target?.hit;assert(r,`Actual target ${key}`);const box=await page.locator('canvas').boundingBox(),t=s.viewportTransform;const x=r.x+r.width*(key==='homeSupply'?174/196:.5);await page.mouse.click(box.x+t.offsetX+x*t.scale,box.y+t.offsetY+(r.y+r.height/2)*t.scale,{delay:35});}
const economy=s=>({coins:s.coins,boosters:s.boosters,lives:s.lifeState,highestLevel:s.highestLevel,currentLevel:s.currentLevel,rewardedLevels:s.rewardedLevels,dailyAttempts:s.dailyChallenge?.attemptsRemaining,dailyCompleted:s.dailyChallenge?.completed,dailyRewarded:s.dailyChallenge?.rewarded});
async function snap(page,row,label){const file=resolve(output,`${row.name}-${label}.png`);await page.screenshot({path:file});row.images.push({file,sha256:sha(await readFile(file))});}
async function waitHome(page){await page.waitForFunction(()=>{const g=window.__COLOR_ESCAPE__;return g.screen==='home'&&!g.navigationTransition;},undefined,{timeout:15000});}
async function entryReady(page,screen){await page.waitForFunction(screen=>{const g=window.__COLOR_ESCAPE__,s=g.getDebugState();if(s.screen!==screen||g.navigationTransition)return false;
 if(['supply','leaderboard','levels'].includes(screen))return g.formalPageReady(screen);
 if(screen==='league')return s.league.artReady;
 if(screen==='achievements')return s.achievements.art.ready;
 return s[screen]?.art.ready;
 },screen,{timeout:25000});}
const stable=page=>page.waitForFunction(()=>{const g=window.__COLOR_ESCAPE__,s=g?.getDebugState();return s&&s.art.formalGameplay.missingWholeBlockIds.length===0&&!g.revisedArtLoading&&!g.hasInitialRevisedRegionPresentation()&&!g.hasActiveMechanicMotion()&&!s.exitAnimations.length&&!s.revisedMechanismAnimations.length&&!s.generatorSpawnAnimations.length;},undefined,{timeout:20000});
const spatial=s=>JSON.parse(JSON.stringify(Object.fromEntries(['blocks','gates','shutters','generators','queuedBlocks','cleared','complete','failed','timeFreezeSeconds'].map(k=>[k,s[k]]))));
async function completeTemporary15(page,row){
 row.temporary={steps:[],baselineSave:await saved(page),baselineUnlocks:(await state(page)).featureUnlocks};
 await phase(page,'temporary15');await click(page,'temporaryLevel.open');
 await page.waitForFunction(()=>window.__COLOR_ESCAPE__.getDebugState().temporaryLevelTest.selectorOpen);
 await click(page,'temporaryLevel.level.15');await click(page,'temporaryLevel.start');
 if((await state(page)).screen==='feature'){
  await page.waitForFunction(()=>!!window.__COLOR_ESCAPE__.featureIntroIconArt.image);await click(page,'featurePrimary');
 }
 await page.waitForFunction(()=>window.__COLOR_ESCAPE__.screen==='playing');await stable(page);
 row.temporary.opening=await state(page);assert.equal(row.temporary.opening.level.id,15);
 assert.deepEqual(JSON.parse(JSON.stringify(row.temporary.opening.level)),temporaryRoute.level);assert(row.temporary.opening.temporaryLevelTest.active);
 assert.deepEqual(row.temporary.opening.featureUnlocks,row.temporary.baselineUnlocks);
 await snap(page,row,'temporary15-opening');
 const beforeTime=row.temporary.opening.puzzle.remainingSeconds;await page.waitForTimeout(350);
 assert((await state(page)).puzzle.remainingSeconds<beforeTime,'Temporary run also uses natural time');
 for(const[index,drag]of temporaryRoute.drags.entries()){
  await stable(page);const s=await state(page),block=s.puzzle.blocks.find(b=>b.id===drag.blockId);assert(block&&!block.frozen&&!s.puzzle.failed);
  const[gx,gy]=block.shape[0],box=await page.locator('canvas').boundingBox(),t=s.viewportTransform;
  const move=async(x,y)=>page.mouse.move(box.x+t.offsetX+(s.board.innerX+(x+gx+.5)*s.board.cell)*t.scale,box.y+t.offsetY+(s.board.innerY+(y+gy+.5)*s.board.cell)*t.scale,{steps:3});
  await move(block.x,block.y);await page.mouse.down();for(const[x,y]of drag.path)await move(x,y);
  if(drag.exitSide){const[x,y]=drag.path.at(-1)??[block.x,block.y],[dx,dy]={left:[-.8,0],right:[.8,0],top:[0,-.8],bottom:[0,.8]}[drag.exitSide];await move(x+dx,y+dy);}
  await page.mouse.up();await stable(page);const actual=(await state(page)).puzzle,expected=api.replayRevisedRoute(temporaryRoute.level,temporaryRoute.drags.slice(0,index+1));
  assert(expected.valid);assert.deepEqual(spatial(actual),spatial(JSON.parse(expected.finalStateKey)),`Temporary actual drag ${index+1}`);
  assert.equal(actual.moves,s.puzzle.moves+1);assert(actual.remainingSeconds<=s.puzzle.remainingSeconds&&!actual.failed);
  row.temporary.steps.push({index:index+1,blockId:drag.blockId,moves:actual.moves,clearDelta:actual.cleared-s.puzzle.cleared,remainingSeconds:actual.remainingSeconds});
 }
 await page.waitForFunction(()=>{const g=window.__COLOR_ESCAPE__;return g.screen==='win'&&!g.pendingSettlement&&g.winArt;},undefined,{timeout:30000});
 row.temporary.win=await state(page);assert(row.temporary.win.puzzle.complete&&row.temporary.win.puzzle.remainingSeconds>0);
 assert.equal(row.temporary.win.puzzle.moves,temporaryRoute.drags.length);
 assert.deepEqual(row.temporary.win.featureUnlocks,row.temporary.baselineUnlocks,'Temporary completion cannot authorize any saved-progress feature');
 assert.deepEqual(await saved(page),row.temporary.baselineSave,'Temporary completion cannot write the MemoryHost profile');
 await snap(page,row,'temporary15-win');await click(page,'modalPrimary');await waitHome(page);
 await page.waitForFunction(()=>!window.__COLOR_ESCAPE__.homeCoinFlight&&!window.__COLOR_ESCAPE__.journeyPresentation);
 assert.deepEqual((await state(page)).featureUnlocks,row.temporary.baselineUnlocks);
}
async function runCase(viewport,highest,list,{legacy=false,failure=false,temporary=false}={}){
 const row={name:`${viewport.width}-${legacy?'old-replay3':failure?'image-failure':temporary?'temporary15-progress5':`progress${highest}`}`,viewport,highest,legacy,failure,temporary:temporary?{}:undefined,status:'RUNNING',entries:[],images:[]};report.cases.push(row);
 const context=await browser.newContext({viewport});const page=await context.newPage();
 page.on('pageerror',e=>report.errors.push({case:row.name,type:'pageerror',message:e.message}));
 page.on('console',m=>{if(m.type()==='error')report.errors.push({case:row.name,type:'console',message:m.text()});});
 await page.addInitScript(()=>{window.__STORAGE_VIOLATIONS__=[];for(const method of ['getItem','setItem','removeItem','clear'])Storage.prototype[method]=function(){window.__STORAGE_VIOLATIONS__.push(method);throw Error('Persistent storage forbidden');};for(const method of ['open','deleteDatabase'])indexedDB[method]=function(){window.__STORAGE_VIOLATIONS__.push(method);throw Error('Persistent database forbidden');};});
 await page.route('**/__feature_unlock_fixture__',r=>r.fulfill({contentType:'text/html',body:fixture(makeSeed(highest,legacy?3:highest),failure?{failImageContains:'daily-challenge-v2'}:{})}));
 try{
  await page.goto(origin+'/__feature_unlock_fixture__',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__COLOR_ESCAPE__?.artReady&&window.__COLOR_ESCAPE__.storageBaselineReady,undefined,{timeout:60000});
  let initial=await state(page);
  if(initial.screen==='feature'){
   await page.waitForFunction(()=>!!window.__COLOR_ESCAPE__.featureIntroIconArt.image);
   await click(page,'featurePrimary');await page.waitForFunction(()=>window.__COLOR_ESCAPE__.screen==='playing');initial=await state(page);
  }
  if(initial.screen==='playing'){
   assert.equal(highest,5,'Only incomplete early campaign accounts auto-enter');
   await click(page,'pause');await page.waitForFunction(()=>window.__COLOR_ESCAPE__.screen==='paused');
   await click(page,'pauseHome');await waitHome(page);row.earlyHomeViaRealPointer=true;
  }
  await waitHome(page);await page.waitForTimeout(150);
  row.home=await state(page);row.baseline=await saved(page);await snap(page,row,'home');
  assert.equal(row.home.level.id,legacy?3:highest);
  if(temporary)await completeTemporary15(page,row);
  for(const feature of list){
   await waitHome(page);const name=feature.key+(feature.alternate?'-coin-plus':'');await phase(page,name);
   const before=await saved(page),opened=highest>feature.threshold;
   const entry={key:feature.key,target:feature.target,threshold:feature.threshold,expectedOpen:opened};row.entries.push(entry);
   entry.unlock=(await state(page)).featureUnlocks[feature.id??feature.key];
   assert.equal(entry.unlock.completedLevel,feature.threshold);assert.equal(entry.unlock.unlocked,opened);
   if(['dailyTasks','achievements'].includes(feature.key))assert.equal(entry.unlock.guide,false);
   const writeCount=await page.evaluate(()=>window.__UNLOCK_TEST__.audit.writes.length);
   await click(page,feature.target);
   if(failure){
    await page.waitForFunction(()=>window.__COLOR_ESCAPE__.getDebugState().dailyChallenge.art.error,undefined,{timeout:15000});
    entry.state=await state(page);assert.equal(entry.state.screen,'dailyChallenge');
    assert.equal(entry.state.dailyChallenge.art.ready,false);
    // Pointer against the known action area cannot spend an attempt while art is unavailable.
    await click(page,'dailyChallenge.1');await page.waitForTimeout(100);
    assert.equal((await state(page)).screen,'dailyChallenge');
   }else if(opened){
    await entryReady(page,feature.screen);entry.state=await state(page);
    if(feature.key==='league'){
     assert.equal(entry.state.league.unlocked,opened);
     assert.equal(Boolean(targets(entry.state)['league.challenge']),true,'League is playable after the confirmed completion boundary');
    }
   }
   else{
    await page.waitForTimeout(120);entry.state=await state(page);
    assert.equal(entry.state.screen,'home',`${feature.key} blocked before its completed-level boundary`);
    assert.equal(entry.state.featureLockFeedback?.feature,feature.id??feature.key);
    assert.equal(await page.evaluate(()=>window.__UNLOCK_TEST__.audit.writes.length),writeCount,'Locked entry makes no save write');
    const texts=await page.evaluate(p=>window.__UNLOCK_TEST__.audit.texts.filter(t=>t.phase===p).map(t=>t.text),name);
    entry.drawnTexts=texts;
    assert(texts.some(t=>t.includes(String(feature.threshold))&&/通关|通过|解锁/.test(t)),`${feature.key} paints the locked-level explanation`);
   }
   entry.after=await saved(page);assert.deepEqual(economy(entry.after),economy(before),'Opening/locked/error cannot charge coins, lives, attempts or alter progress');
   await snap(page,row,name+(opened?'-open':'-locked'));
   if(opened){await click(page,feature.close);await waitHome(page);}
   assert.deepEqual(economy(await saved(page)),economy(before),'Returning home cannot charge or alter progress');
  }
  if(temporary){
   await click(page,'temporaryLevel.open');await page.waitForFunction(()=>window.__COLOR_ESCAPE__.getDebugState().temporaryLevelTest.selectorOpen);
   await click(page,'temporaryLevel.exit');await waitHome(page);
   assert.equal((await state(page)).temporaryLevelTest.active,false);
   assert.deepEqual(await saved(page),row.temporary.baselineSave,'Exiting temporary mode preserves the exact durable baseline');
  }
  row.final=await state(page);row.finalSave=await saved(page);row.audit=await page.evaluate(()=>structuredClone(window.__UNLOCK_TEST__.audit));
  row.storageViolations=await page.evaluate(()=>window.__STORAGE_VIOLATIONS__);assert.deepEqual(row.storageViolations,[]);
  if(failure)assert(row.audit.images.some(i=>i.error==='Error: Synthetic feature-image failure'));
  row.status='PASS';
 }catch(error){row.status='FAIL';row.error=String(error.stack??error);row.lastState=await state(page).catch(()=>null);row.lastSave=await saved(page).catch(()=>null);row.audit=await page.evaluate(()=>structuredClone(window.__UNLOCK_TEST__?.audit)).catch(()=>null);await snap(page,row,'failure').catch(()=>{});throw error;}
 finally{await context.close();}
}
try{
 const groups=new Map();for(const f of features)for(const n of [f.threshold,f.threshold+1]){if(!groups.has(n))groups.set(n,[]);groups.get(n).push(f);}
 for(const viewport of [{width:320,height:568},{width:496,height:1078}]){
  for(const [progress,entries]of [...groups].sort((a,b)=>a[0]-b[0]))await runCase(viewport,progress,entries);
  await runCase(viewport,100,features,{legacy:true});
  await runCase(viewport,16,[features.find(f=>f.key==='dailyChallenge')],{failure:true});
  await runCase(viewport,5,features,{temporary:true});
 }
 assert.deepEqual(report.errors,[]);assert.deepEqual(await bindings(),sourceBefore,'All source inputs remain unchanged during the complete run');report.status='PASS';
}catch(error){report.status='FAIL';report.error=String(error.stack??error);process.exitCode=1;}
finally{await browser.close();await server.close();await writeFile(resolve(output,'report.json'),JSON.stringify(report,null,2));}
console.log(JSON.stringify({status:report.status,output,cases:report.cases.length,entryChecks:report.cases.reduce((n,r)=>n+r.entries.length,0),error:report.error}));
