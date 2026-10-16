import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createServer} from 'vite';
import {chromium} from 'playwright';

const output=resolve(`playtest-results/mainline-roster-consistency-20261010/run-${Date.now()}`);
await mkdir(output,{recursive:true});
const sha=value=>createHash('sha256').update(value).digest('hex');
const manifest=JSON.parse(await readFile('docs/rules/manifest.json','utf8'));
const files=['src/game/ColorEscapeGame.ts','src/core/metaLeaderboard.ts','src/core/mainlineOpponents.ts',
 'src/core/mainlineRankingProgress.ts','src/core/rankingProvince.ts','src/game/localization.ts',
 'src/game/formalPageLayout.ts','tools/playtest-mainline-roster-consistency.mjs','docs/rules/manifest.json',
 manifest.versions.find(v=>v.version===manifest.activeVersion).document];
const hashes=async()=>Object.fromEntries(await Promise.all(files.map(async path=>[path,sha(await readFile(path))])));
const report={status:'RUNNING',activeVersion:manifest.activeVersion,sources:await hashes(),cases:[],errors:[],
 scope:'Synthetic MemoryHost only, first-entry controlled IP resolver confirming province 44. Fixed simulated wall-clock date with natural elapsed time; natural RAF and real Pointer navigation/scroll. No native Storage/IndexedDB, real player data, network province lookup, complete puzzle solution or WeChat validation.'};
const fixture=`<!doctype html><meta charset="utf-8"><link rel="icon" href="data:,"><style>html,body{margin:0;overflow:hidden}canvas{display:block;width:100vw;height:100vh;touch-action:none}</style><script type="module">
import {ColorEscapeGame} from '/src/game/ColorEscapeGame.ts';import {WebHost} from '/src/platform/WebHost.ts';import {normalizeMainlineRankingProgress} from '/src/core/mainlineRankingProgress.ts';
const realNow=Date.now.bind(Date),start=realNow(),now=Date.parse('2026-10-11T04:30:00Z'),joined=Date.parse('2026-10-10T00:00:00Z');Date.now=()=>now+realNow()-start;
const key='color-escape-save-v1',audit={writes:[],pointers:[],boards:0,last:null,phase:'startup',provinceCalls:0};
const initial={schemaVersion:1,currentLevel:21,highestLevel:21,coins:1234,language:'zh-CN',sound:false,music:false,haptic:false,reducedMotion:false,
 featureSeen:['basics'],boosterUnlockSeen:['time','rocket','pulse'],boosterUsageSeen:['time','rocket','pulse'],collectionIntroShown:true,collectionIntroPending:false,
 bestStars:Object.fromEntries(Array.from({length:16},(_,i)=>[i+1,i===15?1:3])),rewardedLevels:Array.from({length:20},(_,i)=>i+1),
 journeyProgress:{claimedMilestoneLevels:[5,10,15,20],seenEpisodeUnlockLevels:[11,21]},featureGuideProgress:{version:1,pending:[],seen:['leaderboard','supply','levels','dailyChallenge','league']},
 lifeState:{lives:5,nextLifeAtMs:0,unlimitedLivesUntilMs:0},playerProfile:{id:'1482757',name:'省榜核对',avatar:2,frame:3,joinedAt:joined},
 mainlineRanking:normalizeMainlineRankingProgress(undefined,now,joined)};
class MemoryHost extends WebHost{data=new Map([[key,structuredClone(initial)]]);storageRead(k){return this.data.has(k)?{status:'ok',value:structuredClone(this.data.get(k))}:{status:'missing'}}storageGet(k,f){const r=this.storageRead(k);return r.status==='ok'?r.value:f}storageSet(k,v){audit.writes.push({phase:audit.phase,save:structuredClone(v)});this.data.set(k,structuredClone(v));return true}sound(){}music(){}vibrate(){}async resolveLeaderboardProvince(){audit.provinceCalls++;return {province:'44',source:'ip'}}}
const host=new MemoryHost(),game=new ColorEscapeGame(host),draw=game.drawLeaderboard,fill=host.context.fillText;let frame;
game.drawLeaderboard=function(...args){frame={mode:this.leaderboardMode,phase:audit.phase,texts:[]};try{return draw.apply(this,args)}finally{if(this.screen==='leaderboard'&&this.formalPageReady('leaderboard')){frame.snapshot=structuredClone(this.leaderboardSnapshot());frame.visible=structuredClone(this.leaderboardScrollView());audit.last=frame;audit.boards++}frame=undefined}};
host.context.fillText=function(text,x,y,...args){if(frame)frame.texts.push({text:String(text),x,y});return fill.call(this,text,x,y,...args)};
for(const type of ['pointerdown','pointerup'])host.canvas.addEventListener(type,e=>audit.pointers.push({type,x:e.clientX,y:e.clientY,phase:audit.phase}),true);
window.__COLOR_ESCAPE__=game;window.__ROSTER_CHECK__={game,host,audit};game.start();</script>`;
const server=await createServer({configFile:false,optimizeDeps:{noDiscovery:true,entries:[]},server:{host:'127.0.0.1',port:0,hmr:false,watch:null},logLevel:'error'});await server.listen();
const origin=`http://127.0.0.1:${server.httpServer.address().port}`,browser=await chromium.launch({headless:true});let lastPage;
const state=p=>p.evaluate(()=>{const x=window.__ROSTER_CHECK__,g=x.game;return {screen:g.screen,save:structuredClone(g.save),mode:g.leaderboardMode,
 snapshot:structuredClone(g.leaderboardSnapshot()),targets:g.interactionTargetEvidence().targets??{},transform:g.viewportTransform(),view:g.leaderboardScrollView(),
 frame:structuredClone(x.audit.last),writes:x.audit.writes.length,provinceCalls:x.audit.provinceCalls}});
async function click(p,key){await p.waitForFunction(key=>Boolean(window.__COLOR_ESCAPE__?.interactionTargetEvidence().targets?.[key]),key);const s=await state(p),r=s.targets[key].hit,t=s.transform;await p.mouse.click(t.offsetX+(r.x+r.width/2)*t.scale,t.offsetY+(r.y+r.height/2)*t.scale,{delay:20});}
async function select(p,mode){await click(p,mode==='country'?'leaderboardCountry':'leaderboardWorld');await p.waitForFunction(mode=>window.__ROSTER_CHECK__.audit.last?.mode===mode,mode);return state(p);}
async function shot(p,row,label){await p.evaluate(label=>{const x=window.__ROSTER_CHECK__;x.audit.phase=label;x.game.dirty=true;x.game.scheduleFrame()},label);await p.waitForFunction(label=>window.__ROSTER_CHECK__.audit.last?.phase===label,label);const path=resolve(output,`${row.name}-${label}.png`);await p.screenshot({path});row.images.push({label,path,sha256:sha(await readFile(path))});}
function validate(s){assert.equal(s.totalPlayers,100);assert.equal(s.entries.length,99);const all=[...s.entries,s.player].sort((a,b)=>a.rank-b.rank);assert.equal(new Set(all.map(x=>x.id)).size,100);assert.deepEqual(all.map(x=>x.rank),Array.from({length:100},(_,i)=>i+1));for(let i=1;i<all.length;i++)assert(all[i-1].totalStars>=all[i].totalStars);assert.equal(s.player.rank,1+s.entries.filter(x=>x.totalStars>s.player.totalStars).length);}
async function drag(p,up=true){const s=await state(p),r=s.view.viewport,t=s.transform,x=t.offsetX+(r.x+r.width*.5)*t.scale,top=t.offsetY+(r.y+15)*t.scale,bottom=t.offsetY+(r.y+r.height-15)*t.scale;await p.mouse.move(x,up?bottom:top);await p.mouse.down();await p.mouse.move(x,up?top:bottom,{steps:6});await p.mouse.up();}
try{for(const viewport of [{width:320,height:568},{width:496,height:1078}]){
 const row={name:`${viewport.width}x${viewport.height}`,status:'RUNNING',images:[]};report.cases.push(row);const context=await browser.newContext({viewport,deviceScaleFactor:1});
 await context.addInitScript(()=>{window.__STORAGE_VIOLATIONS__=[];for(const n of ['getItem','setItem','removeItem','clear'])Storage.prototype[n]=function(){window.__STORAGE_VIOLATIONS__.push(n);throw Error('Native Storage forbidden')};for(const n of ['open','deleteDatabase'])indexedDB[n]=function(){window.__STORAGE_VIOLATIONS__.push(n);throw Error('IndexedDB forbidden')}});
 const p=await context.newPage();lastPage=p;p.on('pageerror',e=>report.errors.push(`${row.name}: ${e.stack??e.message}`));await p.route('**/__roster_consistency__',r=>r.fulfill({contentType:'text/html',body:fixture}));await p.goto(origin+'/__roster_consistency__');
 await p.waitForFunction(()=>{const g=window.__COLOR_ESCAPE__;return g?.artReady&&g.screen==='home'&&!g.navigationTransition&&!g.journeyPresentation&&!g.collectionIntro&&!g.featureUnlockGuide&&g.homeProfileArt});
 await click(p,'navigation.1');await p.waitForFunction(()=>{const g=window.__COLOR_ESCAPE__;return g.screen==='leaderboard'&&!g.navigationTransition&&g.formalPageReady('leaderboard')&&g.save.mainlineRanking?.province==='44'});
 const province=await select(p,'country');validate(province.snapshot);row.province=province;const leader=province.snapshot.entries.find(x=>x.rank===1);assert(leader&&leader.id.startsWith('meta-province-44-'),'Fixture must expose the formerly omitted local province leader');assert.equal(province.snapshot.player.totalStars,46);await shot(p,row,'province-leader');
 const national=await select(p,'world');validate(national.snapshot);row.national=national;const same=national.snapshot.entries.find(x=>x.id===leader.id);assert(same,'Province local leader must exist in national top 99 opponents');for(const k of ['id','name','avatar','frame','province','cleared','totalStars','lifetimeStars','weeklyStars'])assert.equal(same[k],leader[k],`Same identity must preserve ${k}`);
 assert(leader.rank<=same.rank);assert(province.snapshot.player.rank<=national.snapshot.player.rank,'Player provincial rank must not be below national rank');for(const e of province.snapshot.entries){const other=national.snapshot.entries.find(x=>x.id===e.id);if(other){assert(e.rank<=other.rank,`${e.id} ranks must be nested`);assert.equal(e.totalStars,other.totalStars);assert.equal(e.name,other.name);assert.equal(e.avatar,other.avatar);}}
 row.linked={province:leader,national:same};await shot(p,row,'national-includes-local');let s=await state(p);for(let i=0;i<70&&s.view.canScrollDown;i++){await drag(p);s=await state(p);}assert.equal(s.view.lastRank,100);assert.equal(s.view.canScrollDown,false);await shot(p,row,'national-rank-100');row.bottom=s;
 for(let i=0;i<70&&!s.view.entries.some(x=>x.id===leader.id);i++){await drag(p,false);s=await state(p);}assert(s.view.entries.some(x=>x.id===leader.id),'Real scrolling must locate the same local leader in the national rows');await shot(p,row,'national-local-located');row.located=await state(p);assert(row.located.frame.texts.some(x=>x.text===leader.name),'Located row is painted with the same name');
 const again=await select(p,'country');assert.deepEqual(again.snapshot,province.snapshot);assert.equal(again.writes,province.writes,'Tab switches and scrolling do not write ranking state');assert.equal(again.provinceCalls,1,'First-entry province lookup happens exactly once');for(const key of ['coins','bestStars','highestLevel','currentLevel','rewardedLevels','playerProfile','mainlineRanking'])assert.deepEqual(again.save[key],province.save[key]);
 row.audit=await p.evaluate(()=>({pointers:window.__ROSTER_CHECK__.audit.pointers,boards:window.__ROSTER_CHECK__.audit.boards,storageViolations:window.__STORAGE_VIOLATIONS__}));assert.deepEqual(row.audit.storageViolations,[]);row.status='PASS';await context.close();
}assert.deepEqual(report.errors,[]);report.sourcesAfter=await hashes();assert.deepEqual(report.sourcesAfter,report.sources,'Bound sources changed during test');report.status='PASS';}
catch(error){report.status='FAIL';report.failure=error.stack;process.exitCode=1;if(lastPage&&!lastPage.isClosed())try{report.failureState=await state(lastPage);await lastPage.screenshot({path:resolve(output,'failure.png')});}catch(diagnostic){report.diagnosticError=diagnostic.message;}}
finally{await browser.close();await server.close();await writeFile(resolve(output,'report.json'),JSON.stringify(report,null,2)+'\n')}
console.log(JSON.stringify({status:report.status,cases:report.cases.map(x=>({name:x.name,status:x.status})),output,failure:report.failure},null,2));
