import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createServer} from 'vite';
import {chromium} from 'playwright';

// Read-only profile statistics. Synthetic MemoryHost, three screenshot cases.
const output=resolve(`playtest-results/profile-stats-20261009-${Date.now()}`);await mkdir(output,{recursive:true});
const sha=b=>createHash('sha256').update(b).digest('hex');
const files=['src/game/ColorEscapeGame.ts','src/game/playerProfileUi.ts','src/core/playerProfile.ts','src/core/metaLeaderboard.ts','src/core/league.ts','src/core/featureUnlocks.ts','tools/playtest-profile-stats.mjs'];
const hashes=async()=>Object.fromEntries(await Promise.all(files.map(async p=>[p,sha(await readFile(p))])));
const cases=[{name:'320-zh-locked',viewport:{width:320,height:568},language:'zh-CN',kind:'locked',progress:6,highest:5,stars:10,rank:null},
 {name:'496-zh-unlocked-before-league',viewport:{width:496,height:1078},language:'zh-CN',kind:'early',progress:7,highest:6,stars:12,rank:66},
 {name:'320-en-global-despite-league',viewport:{width:320,height:568},language:'en',kind:'pending',progress:41,highest:40,stars:79,rank:17}];
const report={status:'RUNNING',scope:'Three current-production profile screens with isolated MemoryHost saves. Real Pointer open/close and ranking tabs, actual Canvas labels/icons. English case injects an explicit source adapter returning world17/weekly3/country29 to distinguish the fixed global source; league pending rank49 must not be displayed. No player storage or production ranking rules modified.',sources:await hashes(),cases:[],errors:[]};
function fixture(options){return `<!doctype html><meta charset="utf-8"><link rel="icon" href="data:,"><style>html,body{margin:0;overflow:hidden}canvas{display:block;width:100vw;height:100vh;touch-action:none}</style><script type="module">
import {ColorEscapeGame} from '/src/game/ColorEscapeGame.ts';import {WebHost} from '/src/platform/WebHost.ts';import {createLeague,advanceLeague,LEAGUE_PERIOD_MS,parseLeague} from '/src/core/league.ts';
import {PLACEHOLDER_META_LEADERBOARD_SOURCE} from '/src/core/metaLeaderboard.ts';
const options=${JSON.stringify(options)},key='color-escape-save-v1',now=Date.now(),audit={phase:'startup',reads:0,writes:[],texts:[],images:[]},seen=new Set();
let league;if(options.kind==='pending'){
 league=createLeague(options.kind==='pending'?now-LEAGUE_PERIOD_MS:now,5481,4);league.lastNowMs=now;
 league.season.score=100;league.season.cleared=[1];league.season.scoreHistory=[{atMs:league.season.joinedMs,score:100}];
 const ahead=options.kind==='pending'?48:12;
 league.season.bots.forEach((b,i)=>{b.score=i<ahead?200:i===ahead?100:50;});
 if(options.kind==='pending')league=advanceLeague(league,now);
 league=parseLeague(league);
}
const rewarded=Array.from({length:options.progress-1},(_,i)=>i+1),bestStars=Object.fromEntries(rewarded.map((n,i)=>[n,i%3+1]));
if(options.kind==='locked')Object.assign(bestStars,{1:3,2:1,3:2,4:3,5:1});
const initial={schemaVersion:1,currentLevel:6,highestLevel:options.progress,coins:1000,language:options.language,sound:false,music:false,haptic:false,reducedMotion:true,
 collectionIntroShown:true,collectionIntroPending:false,leagueIntroSeen:true,featureSeen:['basics'],boosterUnlockSeen:['time','rocket','pulse'],bestStars,rewardedLevels:rewarded,
 lifeState:{lives:5,nextLifeAtMs:0,unlimitedLivesUntilMs:0},selectedJourneyEpisode:1,
 journeyProgress:{claimedMilestoneLevels:[5,10,15,20,25,30,35,40],seenEpisodeUnlockLevels:[11,21,31,41]},
 featureGuideProgress:{version:1,pending:[],seen:['leaderboard','supply','levels','dailyChallenge','league']},league,
 playerProfile:{id:'1482757',name:'Player#148221',avatar:1,frame:7,joinedAt:1785542400000,firstTryWins:137,longestStreak:181,currentStreak:4,attempts:{1:2},lastAttemptWon:true}};
class MemoryHost extends WebHost{
 data=new Map([[key,structuredClone(initial)]]);
 storageRead(k){audit.reads++;return this.data.has(k)?{status:'ok',value:structuredClone(this.data.get(k))}:{status:'missing'};}
 storageGet(k,f){const r=this.storageRead(k);return r.status==='ok'?r.value:f;}
 storageSet(k,v){audit.writes.push({phase:audit.phase,key:k,value:structuredClone(v)});this.data.set(k,structuredClone(v));return true;}
 music(){}sound(){}vibrate(){}
}
const source=options.kind==='pending'?{id:'test-mode-specific-ranks',getSnapshot(mode,player){const base=PLACEHOLDER_META_LEADERBOARD_SOURCE.getSnapshot(mode,player);return{...base,source:this.id,player:{...base.player,rank:{world:17,weekly:3,country:29}[mode]}};}}:undefined;
const host=new MemoryHost(),game=new ColorEscapeGame(host,source),fill=host.context.fillText,draw=host.context.drawImage;
host.context.fillText=function(value,...args){if(game.profilePage==='stats'){const text=String(value),id=JSON.stringify([audit.phase,text,args]);if(!seen.has(id)){seen.add(id);audit.texts.push({phase:audit.phase,text,args,font:this.font,measuredWidth:this.measureText(text).width,alpha:this.globalAlpha});}}return fill.call(this,value,...args);};
host.context.drawImage=function(img,...args){if(game.profilePage==='stats'){const source=img.src??'',id=JSON.stringify([audit.phase,source,args]);if(!seen.has(id)){seen.add(id);audit.images.push({phase:audit.phase,source,args});}}return draw.call(this,img,...args);};
window.__COLOR_ESCAPE__=game;window.__PROFILE_STATS__={game,host,audit,initial};game.start();
</script>`;}
const server=await createServer({configFile:false,optimizeDeps:{noDiscovery:true,entries:[]},server:{host:'127.0.0.1',port:0,hmr:false,watch:null},logLevel:'error'});
await server.listen();const origin=`http://127.0.0.1:${server.httpServer.address().port}`,browser=await chromium.launch({headless:true});
async function snapshot(page){return page.evaluate(()=>{const {game:g,host,audit}=window.__PROFILE_STATS__;return{save:structuredClone(g.save),stored:structuredClone(host.data.get('color-escape-save-v1')),reads:audit.reads,writes:audit.writes.length,view:structuredClone(g.profileView())};});}
async function click(page,key){const s=await page.evaluate(()=>window.__COLOR_ESCAPE__.getDebugState()),rect=s.interactionTargets.targets[key]?.hit;assert(rect,key);const box=await page.locator('canvas').boundingBox(),t=s.viewportTransform;await page.mouse.click(box.x+t.offsetX+(rect.x+rect.width/2)*t.scale,box.y+t.offsetY+(rect.y+rect.height/2)*t.scale,{delay:35});}
try{for(const options of cases){
 const row={...options,status:'RUNNING'};report.cases.push(row);const context=await browser.newContext({viewport:options.viewport,deviceScaleFactor:1});
 await context.addInitScript(()=>{window.__STORAGE_VIOLATIONS__=[];for(const n of ['getItem','setItem','removeItem','clear'])Storage.prototype[n]=function(){window.__STORAGE_VIOLATIONS__.push(n);throw Error('Persistent storage forbidden');};for(const n of ['open','deleteDatabase'])indexedDB[n]=function(){window.__STORAGE_VIOLATIONS__.push(n);throw Error('IndexedDB forbidden');};});
 const page=await context.newPage();page.on('pageerror',e=>report.errors.push(`${row.name}: ${e.message}`));page.on('console',e=>{if(e.type()==='error')report.errors.push(`${row.name}: ${e.text()}`);});
 await page.route('**/__profile_stats__',route=>route.fulfill({contentType:'text/html',body:fixture(options)}));await page.goto(`${origin}/__profile_stats__`,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>{const g=window.__COLOR_ESCAPE__;return g?.artReady&&g.homeProfileArt&&g.screen==='home'&&!g.journeyPresentation&&!g.featureGuide&&!g.collectionIntro;},null,{timeout:30000});
 if(options.kind==='pending'){
  row.modeVisits=[];await click(page,'navigation.1');await page.waitForFunction(()=>{const g=window.__COLOR_ESCAPE__;return g.screen==='leaderboard'&&!g.navigationTransition&&g.formalPageReady('leaderboard');},null,{timeout:30000});
  for(const [mode,key,expectedRank] of [['world','leaderboardWorld',17],['weekly','leaderboardWeekly',3],['country','leaderboardCountry',29]]){
   await click(page,key);await page.waitForFunction(m=>window.__COLOR_ESCAPE__.leaderboardMode===m,mode);
   const ranks=await page.evaluate(()=>{const g=window.__COLOR_ESCAPE__;return{mode:g.leaderboardMode,selectedRank:g.leaderboardSnapshot().player.rank,profileRank:g.profileView().levelRank,leaguePendingRank:g.save.league.pending.rank};});
   assert.equal(ranks.selectedRank,expectedRank);assert.equal(ranks.profileRank,17);assert.equal(ranks.leaguePendingRank,49);row.modeVisits.push(ranks);
  }
  await click(page,'navigation.2');await page.waitForFunction(()=>{const g=window.__COLOR_ESCAPE__;return g.screen==='home'&&!g.navigationTransition;});
 }
 row.before=await snapshot(page);await page.evaluate(()=>window.__PROFILE_STATS__.audit.phase='stats');await click(page,'homeProfile');
 await page.waitForFunction(()=>window.__COLOR_ESCAPE__.profilePage==='stats'&&window.__COLOR_ESCAPE__.profileArt,null,{timeout:30000});
 const required=options.language==='en'?['Highest','Level','Total','Stars','Rank']:['最高关卡','总星级','关卡排名'];
 await page.waitForFunction(labels=>labels.every(text=>window.__PROFILE_STATS__.audit.texts.some(t=>t.text===text)),required);
 row.open=await snapshot(page);assert.equal(row.open.view.highest,options.highest);assert.equal(row.open.view.totalStars,options.stars);assert.equal(row.open.view.levelRank,options.rank);assert(!('leagueRank' in row.open.view));
 if(options.kind==='early')assert.equal(row.open.save.league,undefined,'Mainline ranking works before league unlock without enrolling');
 row.audit=await page.evaluate(()=>structuredClone(window.__PROFILE_STATS__.audit));
 const cells=[options.highest,options.stars,options.rank??'—'].map(String),positions=[91,194,297];
 for(let i=0;i<3;i++)assert(row.audit.texts.some(t=>t.text===cells[i]&&t.args[0]===positions[i]&&t.args[1]===458),`Actual number ${cells[i]} rendered in column ${i}`);
 const oldLabels=['首次尝试','通关','最长','连胜','First Try','Wins','Longest','Streak','荣耀联赛','Glory League'];
 assert(!row.audit.texts.some(t=>oldLabels.includes(t.text)&&t.args[1]>=480&&t.args[1]<=498),'Old statistic labels are absent');
 for(const icon of ['stat-1.png','star-center.png','leaderboard-icon.png'])assert(row.audit.images.some(image=>image.source.endsWith(icon)&&image.args[1]>380&&image.args[1]<440),`Actual statistic icon ${icon}`);
 assert.deepEqual(row.open.save,row.before.save);assert.deepEqual(row.open.stored,row.before.stored);assert.equal(row.open.reads,row.before.reads);assert.equal(row.open.writes,row.before.writes);
 row.image=resolve(output,row.name+'.png');await page.screenshot({path:row.image});row.imageSha256=sha(await readFile(row.image));
 row.withoutLeagueProjection=await page.evaluate(()=>{const {game:g,host,audit}=window.__PROFILE_STATS__,receiver=Object.create(g);receiver.save={...g.save,league:undefined};const reads=audit.reads,writes=audit.writes.length,save=JSON.stringify(g.save),stored=JSON.stringify(host.data.get('color-escape-save-v1'));const view=receiver.profileView();return{rank:view.levelRank,reads:audit.reads-reads,writes:audit.writes.length-writes,saveUnchanged:JSON.stringify(g.save)===save,storedUnchanged:JSON.stringify(host.data.get('color-escape-save-v1'))===stored};});
 assert.deepEqual(row.withoutLeagueProjection,{rank:options.rank,reads:0,writes:0,saveUnchanged:true,storedUnchanged:true});
 await click(page,'profile.close');await page.waitForFunction(()=>!window.__COLOR_ESCAPE__.profilePage);row.after=await snapshot(page);
 assert.deepEqual(row.after.save,row.before.save);assert.deepEqual(row.after.stored,row.before.stored);assert.equal(row.after.reads,row.before.reads);assert.equal(row.after.writes,row.before.writes);
 row.storageViolations=await page.evaluate(()=>window.__STORAGE_VIOLATIONS__);assert.deepEqual(row.storageViolations,[]);row.status='PASS';await context.close();
 }
 assert.deepEqual(report.errors,[]);report.sourceAfter=await hashes();report.sourceChanges=files.filter(p=>report.sources[p]!==report.sourceAfter[p]);assert.deepEqual(report.sourceChanges,[]);report.status='PASS';
}catch(error){report.status='FAIL';report.failure=error.stack;process.exitCode=1;}
finally{await browser.close();await server.close();await writeFile(resolve(output,'report.json'),JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({status:report.status,cases:report.cases.map(r=>({name:r.name,status:r.status})),failure:report.failure,output},null,2));
