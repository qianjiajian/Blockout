import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createServer } from 'vite';
import { chromium } from 'playwright';

const output=resolve(`playtest-results/leaderboard-no-coins-20261010-${Date.now()}`);
await mkdir(output,{recursive:true});
const sha=value=>createHash('sha256').update(value).digest('hex');
const manifest=JSON.parse(await readFile('docs/rules/manifest.json','utf8'));
const files=['src/game/ColorEscapeGame.ts','src/core/metaLeaderboard.ts','src/game/formalPageLayout.ts',
 'tools/playtest-leaderboard-no-coins.mjs','docs/rules/manifest.json',manifest.versions.find(v=>v.version===manifest.activeVersion).document];
const hashes=async()=>Object.fromEntries(await Promise.all(files.map(async file=>[file,sha(await readFile(file))])));
const report={status:'RUNNING',activeVersion:manifest.activeVersion,sources:await hashes(),tabs:[],errors:[],
 scope:'Synthetic MemoryHost, native Storage/IndexedDB forbidden; real Game, Pointer and Canvas. Single496x1078 zh-CN screen, three actual tabs. No real player save or WeChat build.'};
const html=`<!doctype html><meta charset="utf-8"><link rel="icon" href="data:,"><style>html,body{margin:0;overflow:hidden}canvas{display:block;width:100vw;height:100vh;touch-action:none}</style><script type="module">
import {ColorEscapeGame} from '/src/game/ColorEscapeGame.ts';import {WebHost} from '/src/platform/WebHost.ts';
const initial={schemaVersion:1,currentLevel:21,highestLevel:21,coins:456789,language:'zh-CN',sound:false,music:false,haptic:false,reducedMotion:false,
 featureSeen:['basics'],boosterUnlockSeen:['time','rocket','pulse'],boosterUsageSeen:['time','rocket','pulse'],collectionIntroShown:true,collectionIntroPending:false,
 bestStars:{1:3,2:2,3:1},rewardedLevels:Array.from({length:20},(_,i)=>i+1),journeyProgress:{claimedMilestoneLevels:[5,10,15,20],seenEpisodeUnlockLevels:[11,21]},
 featureGuideProgress:{version:1,pending:[],seen:['leaderboard','supply','levels','dailyChallenge','league']},lifeState:{lives:5,nextLifeAtMs:0,unlimitedLivesUntilMs:0},
 playerProfile:{id:'1482757',name:'玩家小橙',avatar:1,frame:0,joinedAt:Date.now(),firstTryWins:0,longestStreak:0,currentStreak:0,attempts:{},lastAttemptWon:false}};
const key='color-escape-save-v1',audit={frames:[],pointers:[]};let frame;
class MemoryHost extends WebHost{data=new Map([[key,structuredClone(initial)]]);storageRead(k){return this.data.has(k)?{status:'ok',value:structuredClone(this.data.get(k))}:{status:'missing'}}storageGet(k,f){const r=this.storageRead(k);return r.status==='ok'?r.value:f}storageSet(k,v){this.data.set(k,structuredClone(v));return true}sound(){}music(){}vibrate(){}}
const host=new MemoryHost(),game=new ColorEscapeGame(host),board=game.drawLeaderboard,image=host.context.drawImage,fill=host.context.fillText;
game.drawLeaderboard=function(...args){const art=this.formalPageArtFor('leaderboard');frame={mode:this.leaderboardMode,images:[],labels:[],coinDraws:0,panelDraws:0,playerRowDraws:0,rowDraws:0};try{return board.apply(this,args)}finally{if(this.screen==='leaderboard'&&this.formalPageReady('leaderboard')){frame.snapshot=structuredClone(this.leaderboardSnapshot());frame.displayCount=this.leaderboardEntries().length;audit.frames.push(frame);if(audit.frames.length>8)audit.frames.shift()}frame=undefined}};
host.context.drawImage=function(img,...args){if(frame){const art=game.formalPageArtFor('leaderboard');frame.images.push(img.src);if(img===game.art.homeUi?.coinIcon)frame.coinDraws++;if(img===game.art.homeUi?.resourcePanel)frame.panelDraws++;if(img===art?.playerRow)frame.playerRowDraws++;if(img===art?.row)frame.rowDraws++}return image.call(this,img,...args)};
host.context.fillText=function(text,x,y,...args){if(frame)frame.labels.push({text:String(text),x,y});return fill.call(this,text,x,y,...args)};
for(const type of ['pointerdown','pointerup'])host.canvas.addEventListener(type,e=>audit.pointers.push({type,x:e.clientX,y:e.clientY}),true);
window.__COLOR_ESCAPE__=game;window.__RANK_NO_COINS__={audit,host};game.start();</script>`;
const server=await createServer({configFile:false,optimizeDeps:{noDiscovery:true,entries:[]},server:{host:'127.0.0.1',port:0,hmr:false,watch:null},logLevel:'error'});
await server.listen();const origin=`http://127.0.0.1:${server.httpServer.address().port}`;
const browser=await chromium.launch({headless:true}),context=await browser.newContext({viewport:{width:496,height:1078},deviceScaleFactor:1}),page=await context.newPage();
async function click(key){const d=await page.evaluate(()=>window.__COLOR_ESCAPE__.getDebugState()),r=d.interactionTargets.targets[key]?.hit;assert(r,`Missing ${key}`);const b=await page.locator('canvas').boundingBox(),t=d.viewportTransform;await page.mouse.click(b.x+t.offsetX+(r.x+r.width/2)*t.scale,b.y+t.offsetY+(r.y+r.height/2)*t.scale,{delay:20});}
try {
 page.on('pageerror',error=>report.errors.push(error.message));
 await page.addInitScript(()=>{window.__STORAGE_VIOLATIONS__=[];for(const n of ['getItem','setItem','removeItem','clear'])Storage.prototype[n]=function(){window.__STORAGE_VIOLATIONS__.push(n);throw Error('Native Storage forbidden')};for(const n of ['open','deleteDatabase'])indexedDB[n]=function(){window.__STORAGE_VIOLATIONS__.push(n);throw Error('IndexedDB forbidden')}});
 await page.route('**/__leaderboard_no_coins__',route=>route.fulfill({contentType:'text/html',body:html}));await page.goto(origin+'/__leaderboard_no_coins__');
 await page.waitForFunction(()=>{const g=window.__COLOR_ESCAPE__;return g?.artReady&&g.screen==='home'&&!g.navigationTransition&&!g.journeyPresentation&&!g.collectionIntro});
 report.coinsBefore=await page.evaluate(()=>window.__COLOR_ESCAPE__.save.coins);await click('navigation.1');
 await page.waitForFunction(()=>{const g=window.__COLOR_ESCAPE__;return g.screen==='leaderboard'&&!g.navigationTransition&&g.formalPageReady('leaderboard')});
 for(const [mode,key] of [['weekly','leaderboardWeekly'],['world','leaderboardWorld'],['country','leaderboardCountry']]) {
  await click(key);await page.waitForFunction(mode=>window.__RANK_NO_COINS__.audit.frames.at(-1)?.mode===mode,mode);
  const frame=await page.evaluate(()=>structuredClone(window.__RANK_NO_COINS__.audit.frames.at(-1)));
  assert.equal(frame.coinDraws,0);assert.equal(frame.panelDraws,0);assert(!frame.labels.some(l=>l.text.includes('456789')));
  assert.equal(frame.displayCount,100);assert.equal(frame.snapshot.entries.length,99);assert.equal(frame.playerRowDraws,1);assert(frame.rowDraws>0);
  assert(frame.labels.some(l=>l.text===frame.snapshot.player.name));assert(frame.labels.some(l=>l.text==='排行榜'));
  const targets=await page.evaluate(()=>Object.keys(window.__COLOR_ESCAPE__.getDebugState().interactionTargets.targets));
  for(let i=0;i<5;i++)assert(targets.includes('navigation.'+i));
  report.tabs.push({mode,status:'PASS',frame});
  if(mode==='world'){const file=resolve(output,'496-zh-CN-world-no-coins.png');await page.screenshot({path:file});report.image={file,sha256:sha(await readFile(file))}}
 }
 await click('navigation.2');await page.waitForFunction(()=>window.__COLOR_ESCAPE__.screen==='home'&&!window.__COLOR_ESCAPE__.navigationTransition);
 report.coinsAfter=await page.evaluate(()=>window.__COLOR_ESCAPE__.save.coins);assert.equal(report.coinsAfter,report.coinsBefore);
 report.pointerEvents=await page.evaluate(()=>window.__RANK_NO_COINS__.audit.pointers);assert(report.pointerEvents.length>=10);
 report.storageViolations=await page.evaluate(()=>window.__STORAGE_VIOLATIONS__);assert.deepEqual(report.storageViolations,[]);assert.deepEqual(report.errors,[]);
 report.sourcesAfter=await hashes();assert.deepEqual(report.sourcesAfter,report.sources,'Sources changed during run');report.status='PASS';
}catch(error){report.status='FAIL';report.failure=error.stack;process.exitCode=1;}
finally{await browser.close();await server.close();await writeFile(resolve(output,'report.json'),JSON.stringify(report,null,2)+'\n')}
console.log(JSON.stringify({status:report.status,tabs:report.tabs.map(t=>t.mode),output,failure:report.failure},null,2));
