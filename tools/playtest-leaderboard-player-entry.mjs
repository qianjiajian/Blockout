import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createServer } from 'vite';
import { chromium } from 'playwright';

const output = resolve(`playtest-results/leaderboard-player-entry-20261009-${Date.now()}`);
await mkdir(output, { recursive: true });
const files = ['src/game/ColorEscapeGame.ts', 'src/core/metaLeaderboard.ts', 'src/game/formalPageLayout.ts'];
const hashes = async () => Object.fromEntries(await Promise.all(files.map(async p => [p, createHash('sha256').update(await readFile(p)).digest('hex')])));
const report = { status: 'RUNNING', sourceBindings: await hashes(), cases: [], errors: [],
  scope: 'Synthetic MemoryHost profiles and star counts, unchanged real leaderboard source/sorting, real Pointer entry/tabs/scrolling, actual Canvas name/avatar/frame observers. Native Storage forbidden; no real player data.' };
const html = `<!doctype html><meta charset="utf-8"><link rel="icon" href="data:,"><style>html,body{margin:0;overflow:hidden}canvas{width:100vw;height:100vh;display:block;touch-action:none}</style><script type="module">
import {ColorEscapeGame} from '/src/game/ColorEscapeGame.ts';import {WebHost} from '/src/platform/WebHost.ts';
import {buildMetaLeaderboard} from '/src/core/metaLeaderboard.ts';
const stars=n=>Object.fromEntries(Array.from({length:Math.ceil(n/3)},(_,i)=>[i+1,Math.min(3,n-i*3)]));
const now=Date.now(),initial={schemaVersion:1,currentLevel:26,highestLevel:200,coins:777,language:'zh-CN',sound:false,music:false,haptic:false,reducedMotion:true,
 featureSeen:['basics'],boosterUnlockSeen:['time','rocket','pulse'],boosterUsageSeen:['time','rocket','pulse'],boosters:{time:3,rocket:3,pulse:3},
 collectionIntroShown:true,collectionIntroPending:false,leagueIntroSeen:true,bestStars:stars(50),rewardedLevels:Array.from({length:25},(_,i)=>i+1),
 selectedJourneyEpisode:1,journeyProgress:{claimedMilestoneLevels:[5,10,15,20,25],seenEpisodeUnlockLevels:[11,21]},
 featureGuideProgress:{version:1,pending:[],seen:['leaderboard','supply','levels','dailyChallenge','league']},
 lifeState:{lives:5,nextLifeAtMs:0,unlimitedLivesUntilMs:0},playerProfile:{id:'1482757',name:'玩家小橙',avatar:13,frame:4,joinedAt:now,firstTryWins:0,longestStreak:0,currentStreak:0,attempts:{},lastAttemptWon:false}};
const audit={writes:[],frames:[],pointer:[]};let frame,avatar;
class MemoryHost extends WebHost{data=structuredClone(initial);storageRead(){return{status:'ok',value:structuredClone(this.data)}}storageGet(k,f){return structuredClone(this.data)}storageSet(k,v){this.data=structuredClone(v);audit.writes.push(structuredClone(v));return true}music(){}sound(){}vibrate(){}}
const host=new MemoryHost(),game=new ColorEscapeGame(host),drawBoard=game.drawLeaderboard,drawAvatar=game.drawRankingAvatar,fill=host.context.fillText,image=host.context.drawImage;
game.drawLeaderboard=function(...args){const snapshot=this.leaderboardSnapshot();frame={mode:this.leaderboardMode,player:{...snapshot.player},sourceCount:snapshot.entries.length,all:this.leaderboardEntries().map(e=>({...e})),visible:this.leaderboardScrollView().entries.map(e=>({...e})),avatars:[],labels:[]};
 try{return drawBoard.apply(this,args)}finally{if(this.screen==='leaderboard'&&this.formalPageReady('leaderboard')){audit.frames.push(frame);if(audit.frames.length>3)audit.frames.shift();}frame=undefined;}};
game.drawRankingAvatar=function(art,a,f,rect){const row={avatar:a,frame:f,rect:{...rect},images:[]};avatar=row;try{return drawAvatar.call(this,art,a,f,rect)}finally{if(frame)frame.avatars.push(row);avatar=undefined}};
host.context.drawImage=function(img,...args){if(avatar)avatar.images.push(img.src);return image.call(this,img,...args)};
host.context.fillText=function(text,x,y,...args){if(frame)frame.labels.push({text:String(text),x,y});return fill.call(this,text,x,y,...args)};
for(const type of ['pointerdown','pointerup'])host.canvas.addEventListener(type,e=>audit.pointer.push({type,x:e.clientX,y:e.clientY}),true);
window.__COLOR_ESCAPE__=game;window.__PLAYER_RANK_TEST__={host,audit,initial,setRank(desired){
 const options=Array.from({length:61},(_,score)=>{const snapshot=buildMetaLeaderboard('world',{highestLevel:200,bestStars:stars(score),playerId:initial.playerProfile.id,playerName:initial.playerProfile.name,playerAvatar:13,playerFrame:4,nowMs:now,groupCreatedAtMs:now});return{score,rank:snapshot.player.rank}});
 const selected=options.find(o=>o.rank===desired)||(desired>3?options.find(o=>o.rank>=10&&o.rank<=18):undefined);if(!selected)throw Error('No real score fixture for requested rank');
 game.save.bestStars=stars(selected.score);game.leaderboardSnapshotCache=undefined;game.dirty=true;game.scheduleFrame();return selected;
}};game.start();</script>`;
const server = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true, entries: [] }, server: { host: '127.0.0.1', port: 0, hmr: false, watch: null }, logLevel: 'error' });
await server.listen();const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
const browser = await chromium.launch({ headless: true });let activePage;
const state = p => p.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const latest = p => p.evaluate(() => window.__PLAYER_RANK_TEST__.audit.frames.at(-1));
async function point(p, x, y) {const d=await state(p),b=await p.locator('canvas').boundingBox(),t=d.viewportTransform;return{x:b.x+t.offsetX+x*t.scale,y:b.y+t.offsetY+y*t.scale};}
async function click(p,key){const d=await state(p),r=(d.interactionTargets.targets??d.interactionTargets)[key]?.hit;assert.ok(r,`Real target ${key}`);const c=await point(p,r.x+r.width/2,r.y+r.height/2);await p.mouse.click(c.x,c.y);}
async function ready(p, mode, score) {await p.waitForFunction(({mode,score})=>{const g=window.__COLOR_ESCAPE__,f=window.__PLAYER_RANK_TEST__.audit.frames.at(-1);return g.screen==='leaderboard'&&!g.navigationTransition&&g.formalPageReady('leaderboard')&&f?.mode===mode&&f.player.totalStars===score;},{mode,score});}
function check(f, expectedRank, inList=true) {
  assert.equal(f.player.rank,expectedRank);assert.equal(f.sourceCount,99,'The real source retains 99 bots');assert.equal(f.all.length,100);
  assert.equal(new Set(f.all.map(e=>e.id)).size,100);assert.deepEqual(f.all.map(e=>e.rank),Array.from({length:100},(_,i)=>i+1));
  assert.equal(f.all.filter(e=>e.isPlayer).length,1);assert.deepEqual(f.all[expectedRank-1],f.player);
  const playerArt=f.avatars.filter(a=>a.avatar===13&&a.frame===4),expectedArt=1+Number(expectedRank<=3)+Number(inList);
  assert.equal(playerArt.length,expectedArt,'Exactly one player portrait per visible presentation region');
  for(const a of playerArt){assert.ok(a.images.some(src=>src.endsWith('/frame-4.png')));assert.ok(a.images.some(src=>src.endsWith('/avatar-13.png')));}
  assert.equal(f.labels.filter(l=>l.text===f.player.name).length,expectedArt,'Podium/list/pinned player names agree');
  if(expectedRank<=3){const podiumArt=playerArt.find(a=>a.rect.y<560);assert.ok(podiumArt);const expectedX=[309,158,462][expectedRank-1];assert.equal(podiumArt.rect.x,expectedX,'Correct podium slot');}
  assert.equal(f.visible.filter(e=>e.isPlayer).length,Number(inList));
  return {player:f.player,sourceCount:f.sourceCount,displayCount:f.all.length,playerArt,visibleRanks:f.visible.map(e=>e.rank),labels:f.labels.filter(l=>l.text===f.player.name||l.text===String(f.player.totalStars))};
}
async function shot(p,row,label){const file=resolve(output,`${row.name}-${label}.png`);await p.screenshot({path:file});row.images.push(file);}
async function scrollUntilPlayer(p){
  let drags=0;
  while(!(await state(p)).leaderboard.entries.some(e=>e.isPlayer)&&drags<8){const s=await state(p),v=s.leaderboard.viewport,a=await point(p,v.x+v.width*.65,v.y+v.height*.86),b=await point(p,v.x+v.width*.65,v.y+v.height*.15);
   await p.mouse.move(a.x,a.y);await p.mouse.down();await p.mouse.move(b.x,b.y,{steps:6});await p.mouse.up();drags++;}
  assert.ok(drags>0);await p.waitForFunction(()=>window.__PLAYER_RANK_TEST__.audit.frames.at(-1)?.visible.some(e=>e.isPlayer));return drags;
}
try {
 for(const viewport of [{width:320,height:568},{width:496,height:1078}]){
  const row={name:`${viewport.width}`,images:[],checks:[]};report.cases.push(row);const context=await browser.newContext({viewport,deviceScaleFactor:1}),p=await context.newPage();activePage=p;
  p.on('pageerror',e=>report.errors.push(e.message));p.on('console',m=>{if(m.type()==='error')report.errors.push(m.text())});
  await p.addInitScript(()=>{window.__STORAGE_VIOLATIONS__=[];for(const key of ['getItem','setItem','clear','removeItem'])Storage.prototype[key]=function(){window.__STORAGE_VIOLATIONS__.push(key);throw Error('Native Storage forbidden')}});
  await p.route('**/__player_rank_fixture__',r=>r.fulfill({contentType:'text/html',body:html}));await p.goto(origin+'/__player_rank_fixture__');
  await p.waitForFunction(()=>{const g=window.__COLOR_ESCAPE__;return g?.artReady&&g.screen==='home'&&!g.navigationTransition&&!g.journeyPresentation&&!g.collectionIntro});
  await click(p,'navigation.1');await ready(p,'world',50);
  for(const [mode,key] of [['weekly','leaderboardWeekly'],['world','leaderboardWorld'],['country','leaderboardCountry']]){await click(p,key);await ready(p,mode,50);const f=await latest(p);row.checks.push({mode,score:50,...check(f,1)});}
  await shot(p,row,'50-stars-champion');await click(p,'leaderboardWorld');await ready(p,'world',50);
  for(const rank of [2,3,12]){
   const chosen=await p.evaluate(r=>window.__PLAYER_RANK_TEST__.setRank(r),rank);await ready(p,'world',chosen.score);const initial=await latest(p);
   if(rank<=3){row.checks.push({fixture:chosen,...check(initial,rank)});if(rank===3&&viewport.width===496)await shot(p,row,'third-place');}
   else{check(initial,chosen.rank,false);const drags=await scrollUntilPlayer(p);const f=await latest(p);row.checks.push({fixture:chosen,drags,...check(f,chosen.rank)});if(viewport.width===496)await shot(p,row,'scrolled-player');}
  }
  assert.deepEqual(await p.evaluate(()=>window.__STORAGE_VIOLATIONS__),[]);row.status='PASS';await context.close();
 }
 assert.deepEqual(report.errors,[]);report.status='PASS';
} catch(error) {report.status='FAIL';report.failure=error.stack??String(error);process.exitCode=1;if(activePage&&!activePage.isClosed()){report.lastState=await state(activePage).catch(()=>null);report.lastFrame=await latest(activePage).catch(()=>null);await activePage.screenshot({path:resolve(output,'failure.png')}).catch(()=>{});}}
finally{report.finalSourceBindings=await hashes();report.changedSources=files.filter(file=>report.sourceBindings[file]!==report.finalSourceBindings[file]);report.sourceStable=!report.changedSources.length;
 if(!report.sourceStable){report.status='FAIL_SOURCE_CHANGED';process.exitCode=1;}await browser.close();await server.close();report.resourcesClosed=true;await writeFile(resolve(output,'report.json'),JSON.stringify(report,null,2));}
console.log(JSON.stringify({status:report.status,cases:report.cases.length,errors:report.errors.length,sourceStable:report.sourceStable,resourcesClosed:report.resourcesClosed,failure:report.failure,output},null,2));
