import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createServer} from 'vite';
import {chromium} from 'playwright';

// Synthetic saved accounts only. Native-storage object representations are
// simulated at MemoryHost.storageRead; all gameplay entry uses real Pointer.
const output=resolve(`playtest-results/daily-storage-compat-${Date.now()}`);
await mkdir(output,{recursive:true});
const sha=value=>createHash('sha256').update(value).digest('hex');
const sourcePaths=['src/core/dailyChallenge.ts','src/core/clonePlainData.ts','src/core/formalDailyChallenge300Data.ts','src/core/dailyChallengeFormal300.ts','src/game/ColorEscapeGame.ts','src/platform/WechatHost.ts','tools/playtest-daily-storage-compat.mjs'];
const hashes=async()=>Object.fromEntries(await Promise.all(sourcePaths.map(async p=>[p,sha(await readFile(p))])));
const report={status:'RUNNING',scope:'Isolated MemoryHost; synthetic highest/current 16 with levels 1–15 rewarded. Real Pointer opens menu and starts each difficulty from its unchanged saved selection. Foreign-realm JSON and enumerable-getter storage values; no real player storage; roundRect unavailable; natural RAF. No completion/solvability claim.',sources:await hashes(),cases:[],errors:[]};
function html(mode){return `<!doctype html><meta charset="utf-8"><link rel="icon" href="data:,"><style>html,body{margin:0;overflow:hidden;background:#201953}canvas{display:block;width:100vw;height:100vh;touch-action:none}</style><script type="module">
import {ColorEscapeGame} from '/src/game/ColorEscapeGame.ts';
import {WebHost} from '/src/platform/WebHost.ts';
import {createDailyChallengeState,dailyChallengeDayKey,getDailyChallengeAssignment,cloneDailyChallengeLevel} from '/src/core/dailyChallenge.ts';
import {clonePlainData} from '/src/core/clonePlainData.ts';
const mode=${JSON.stringify(mode)},key='color-escape-save-v1',now=Date.now();
const initial={schemaVersion:1,currentLevel:16,highestLevel:16,coins:765,language:'zh-CN',sound:false,music:false,haptic:false,reducedMotion:false,
 featureSeen:['basics','ice-door','ice-block','layer','shutter','generator','axis','key-lock','lift','star','bomb','flip-door','color-floor'],
 boosterUnlockSeen:['time','rocket','pulse'],boosterUsageSeen:['time','rocket','pulse'],boosters:{time:3,rocket:3,pulse:3},leagueIntroSeen:true,
 bestStars:Object.fromEntries(Array.from({length:15},(_,i)=>[String(i+1),3])),bestMoves:Object.fromEntries(Array.from({length:15},(_,i)=>[String(i+1),50])),rewardedLevels:Array.from({length:15},(_,i)=>i+1),
 selectedJourneyEpisode:1,journeyProgress:{claimedMilestoneLevels:[5,10,15],seenEpisodeUnlockLevels:[11]},collectionIntroPending:false,collectionIntroShown:true,
 featureGuideProgress:{version:1,pending:[],seen:['leaderboard','supply','levels','dailyChallenge','league']},lifeState:{lives:5,nextLifeAtMs:0,unlimitedLivesUntilMs:0},
 dailyChallenge:createDailyChallengeState(dailyChallengeDayKey(),16,undefined,160015),playerProfile:{id:'7654321',name:'每日挑战验证',avatar:0,frame:0,joinedAt:now}};
const audit={phase:'startup',reads:[],writes:[],pointers:[],texts:[],ads:[]};let game;
const frame=document.createElement('iframe');frame.hidden=true;document.body.append(frame);
const accessorCopy=value=>{if(value===null||typeof value!=='object')return value;const out=Array.isArray(value)?new Array(value.length):{};for(const k of Object.keys(value)){const item=accessorCopy(value[k]);Object.defineProperty(out,k,{enumerable:true,configurable:true,get:()=>item});}return out;};
const hostValue=value=>mode==='foreign-realm'?frame.contentWindow.JSON.parse(JSON.stringify(value)):accessorCopy(value);
// Prove the simulation actually reaches the incompatibility, rather than
// merely tagging a normal same-realm object with a host name.
const sample=hostValue(initial);let plainCloneRejection;try{clonePlainData(sample.dailyChallenge.pools[1]);}catch(error){plainCloneRejection=error.message;}
const simulation={mode,plainCloneRejection,foreignPrototype:Object.getPrototypeOf(sample.dailyChallenge.pools[1][0])!==Object.prototype,accessor:!!Object.getOwnPropertyDescriptor(sample.dailyChallenge.pools[1][0],'id').get};
class MemoryHost extends WebHost {
 data=new Map([[key,JSON.parse(JSON.stringify(initial))]]);
 storageRead(k){if(!this.data.has(k))return {status:'missing'};const value=hostValue(this.data.get(k));audit.reads.push({key:k,phase:audit.phase,foreign:Object.getPrototypeOf(value)!==Object.prototype,accessor:!!Object.getOwnPropertyDescriptor(value,'dailyChallenge')?.get});return {status:'ok',value};}
 storageGet(k,f){const r=this.storageRead(k);return r.status==='ok'?r.value:f;}
 storageSet(k,v){const copy=JSON.parse(JSON.stringify(v));audit.writes.push({key:k,value:copy,phase:audit.phase});this.data.set(k,copy);return true;}
 music(){}sound(){}vibrate(){}
 async showRewardedAd(...args){audit.ads.push(args);return false;}
}
const host=new MemoryHost();game=new ColorEscapeGame(host);const seen=new Set(),fill=host.context.fillText;host.context.fillText=function(value,...args){const text=String(value),id=audit.phase+'|'+text;if(!seen.has(id)){seen.add(id);audit.texts.push({text,phase:audit.phase});}return fill.call(this,value,...args);};
for(const type of ['pointerdown','pointerup'])host.canvas.addEventListener(type,e=>audit.pointers.push({type,x:e.clientX,y:e.clientY,phase:audit.phase}),true);
const expected=Object.fromEntries([1,2,3].map(d=>{const assignment=getDailyChallengeAssignment(initial.dailyChallenge,d);return [d,{assignment,level:cloneDailyChallengeLevel(assignment)}];}));
window.__COLOR_ESCAPE__=game;window.__DAILY_STORAGE__={game,host,audit,initial,expected,simulation};game.start();
</script>`;}
const server=await createServer({configFile:false,optimizeDeps:{noDiscovery:true,entries:[]},server:{host:'127.0.0.1',port:0,hmr:false,watch:null},logLevel:'error'});
await server.listen();
const origin=`http://127.0.0.1:${server.httpServer.address().port}`,browser=await chromium.launch({headless:true});
const state=p=>p.evaluate(()=>{const x=window.__DAILY_STORAGE__,d=x.game.getDebugState();return {debug:d,save:JSON.parse(JSON.stringify(x.game.save)),stored:JSON.parse(JSON.stringify(x.host.data.get('color-escape-save-v1'))),initial:x.initial,expected:x.expected,simulation:x.simulation,roundRect:typeof x.host.context.roundRect};});
async function click(p,key){const {debug:d}=await state(p),r=(d.interactionTargets.targets??d.interactionTargets)[key]?.hit;assert(r,`Missing actual Pointer target ${key}`);const box=await p.locator('canvas').boundingBox(),t=d.viewportTransform;await p.mouse.click(box.x+t.offsetX+(r.x+r.width/2)*t.scale,box.y+t.offsetY+(r.y+r.height/2)*t.scale,{delay:35});}
const economy=s=>Object.fromEntries(['currentLevel','highestLevel','coins','boosters','lifeState','bestStars','bestMoves','bestTimes','rewardedLevels','collectionProgress','journeyProgress'].filter(k=>s[k]!==undefined).map(k=>[k,s[k]]));
async function shot(p,row,label){const path=resolve(output,`${row.name}-${label}.png`);await p.screenshot({path});row.images.push({label,path,sha256:sha(await readFile(path))});}
try{
 for(const viewport of [{width:320,height:568},{width:496,height:1078}])for(const mode of ['foreign-realm','enumerable-getter']){
  const row={name:`${viewport.width}x${viewport.height}-${mode}`,status:'RUNNING',images:[],runs:[]};report.cases.push(row);
  const context=await browser.newContext({viewport,deviceScaleFactor:1});
  await context.addInitScript(()=>{window.__STORAGE_VIOLATIONS__=[];for(const k of ['getItem','setItem','removeItem','clear'])Storage.prototype[k]=function(){window.__STORAGE_VIOLATIONS__.push(k);throw Error('Persistent Storage forbidden');};for(const k of ['open','deleteDatabase'])indexedDB[k]=function(){window.__STORAGE_VIOLATIONS__.push(k);throw Error('IndexedDB forbidden');};CanvasRenderingContext2D.prototype.roundRect=undefined;});
  const p=await context.newPage();p.on('pageerror',e=>report.errors.push(`${row.name}: ${e.message}`));
  await p.route('**/__daily_storage_fixture__*',r=>r.fulfill({contentType:'text/html',body:html(mode)}));
  for(const difficulty of [1,2,3]){
   // Fresh navigation creates only a new synthetic account, never mutates an
   // active model or runtime assignments to make a difficulty accessible.
   await p.goto(`${origin}/__daily_storage_fixture__?difficulty=${difficulty}`,{waitUntil:'domcontentloaded'});
   await p.waitForFunction(()=>{const g=window.__COLOR_ESCAPE__;return g?.artReady&&g.storageBaselineReady&&g.screen==='home'&&!g.navigationTransition&&!g.featureUnlockGuide&&!g.journeyPresentation&&!g.collectionIntro;},null,{timeout:60000});
   const home=await state(p);assert(home.simulation.plainCloneRejection,'Host simulation must be rejected by old clone helper');assert.equal(home.roundRect,'undefined');assert.equal(mode==='foreign-realm'?home.simulation.foreignPrototype:home.simulation.accessor,true);
   assert.deepEqual(home.save.dailyChallenge,home.initial.dailyChallenge,'Startup must preserve all saved daily fields');
   await p.evaluate(()=>window.__DAILY_STORAGE__.audit.phase='menu');await click(p,'homeDailyChallenge');
   await p.waitForFunction(()=>{const g=window.__COLOR_ESCAPE__,d=g.getDebugState(),targets=d.interactionTargets.targets??d.interactionTargets;return g.screen==='dailyChallenge'&&g.dailyChallengeArt&&!g.navigationTransition&&[1,2,3].every(n=>targets['dailyChallenge.'+n]);},null,{timeout:30000});
   const menu=await state(p);assert.deepEqual(menu.save.dailyChallenge,home.initial.dailyChallenge);assert.equal(menu.save.dailyChallenge.attemptsRemaining,5);
   for(const d of [1,2,3]){assert.equal(menu.debug.dailyChallenge.rows[d-1].assignmentId,menu.expected[d].assignment.id);assert((menu.debug.interactionTargets.targets??menu.debug.interactionTargets)[`dailyChallenge.${d}`]);}
   if(difficulty===1)await shot(p,row,'menu');
   await p.evaluate(()=>window.__DAILY_STORAGE__.audit.phase='start');await click(p,`dailyChallenge.${difficulty}`);
   await p.waitForFunction(()=>window.__COLOR_ESCAPE__.screen==='playing',null,{timeout:10000});
   const started=await state(p),expected=started.expected[difficulty];assert.equal(started.save.dailyChallenge.attemptsRemaining,4);assert.equal(started.stored.dailyChallenge.attemptsRemaining,4);
   assert.equal(started.save.activeRun.dailyChallengeDifficulty,difficulty);assert.deepEqual(started.save.activeRun.dailyChallengeOwner.assignment,expected.assignment);
   assert.deepEqual(started.debug.level,expected.level,'Pointer must load exact assigned certified layout');
   assert.deepEqual(economy(started.save),economy(menu.save),'Challenge entry must preserve mainline, inventory and economy');
   const unchangedDaily=({attemptsRemaining,lastAttemptAtMs,...rest})=>rest;assert.deepEqual(unchangedDaily(started.save.dailyChallenge),unchangedDaily(menu.save.dailyChallenge));
   await p.waitForTimeout(1150);const after=await state(p);assert.equal(after.save.dailyChallenge.attemptsRemaining,4);assert.deepEqual(economy(after.save),economy(menu.save));assert(after.debug.puzzle.remainingSeconds<started.debug.puzzle.remainingSeconds,'Natural game clock advances');
   if(difficulty===1)await shot(p,row,'playing');
   const audit=await p.evaluate(()=>({audit:window.__DAILY_STORAGE__.audit,violations:window.__STORAGE_VIOLATIONS__}));assert.deepEqual(audit.violations,[]);assert.deepEqual(audit.audit.ads,[]);assert(!audit.audit.texts.some(t=>t.text==='当前阶段暂无可用关卡'));
   const counts=audit.audit.writes.map(w=>w.value.dailyChallenge?.attemptsRemaining).filter(n=>n!==undefined);assert(counts.every(n=>n===5||n===4));let transitions=0;for(let i=1;i<counts.length;i++)if(counts[i]!==counts[i-1]){assert.equal(counts[i-1],5);assert.equal(counts[i],4);transitions++;}assert.equal(transitions,1,'Exactly one persisted 5 to 4 transition');
   row.runs.push({difficulty,simulation:home.simulation,assignmentId:expected.assignment.id,layoutSha256:expected.assignment.layoutSha256,modelJsonSha256:sha(JSON.stringify(started.debug.level)),expectedJsonSha256:sha(JSON.stringify(expected.level)),selected:after.save.dailyChallenge.selected,attemptsBefore:menu.save.dailyChallenge.attemptsRemaining,attemptsAfter:after.save.dailyChallenge.attemptsRemaining,consumptionTransitions:transitions,economyBefore:economy(menu.save),economyAfter:economy(after.save),clockBefore:started.debug.puzzle.remainingSeconds,clockAfter:after.debug.puzzle.remainingSeconds,audit});
   console.log(JSON.stringify({case:row.name,difficulty,status:'PASS'}));
  }
  row.status='PASS';await context.close();
 }
 assert.deepEqual(report.errors,[]);report.sourceAfter=await hashes();report.sourceChanges=sourcePaths.filter(p=>report.sources[p]!==report.sourceAfter[p]);assert.deepEqual(report.sourceChanges,[],'Source changed during QA; rerun against stable source');report.status='PASS';
}catch(error){report.status='FAIL';report.failure=error.stack;process.exitCode=1;}
finally{await browser.close();await server.close();await writeFile(resolve(output,'report.json'),JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({status:report.status,output,failure:report.failure},null,2));
