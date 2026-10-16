import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {createServer} from 'vite';
import {chromium} from 'playwright';
const output=resolve('playtest-results/daily-success-supplied-20261009-'+Date.now());
await mkdir(output,{recursive:true});
const sha=v=>createHash('sha256').update(v).digest('hex');
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

const server=await createServer({configFile:false,optimizeDeps:{noDiscovery:true,entries:[]},server:{host:'127.0.0.1',port:0,hmr:false,watch:null},logLevel:'error'});
await server.listen();const origin='http://127.0.0.1:'+server.httpServer.address().port;
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

const report={status:'RUNNING',cases:[],errors:[],scope:'MemoryHost synthetic daily result fixture; real rendering and Pointer, not a solved challenge.'};
try{
 for(const viewport of [{width:320,height:568},{width:496,height:1078}])for(const difficulty of [1,2,3]){
  const row={name:viewport.width+'-d'+difficulty,images:[]};report.cases.push(row);
  const context=await browser.newContext({viewport}),page=await context.newPage();
  page.on('pageerror',e=>report.errors.push(e.message));
  await page.addInitScript(()=>{for(const k of ['getItem','setItem','clear','removeItem'])Storage.prototype[k]=()=>{throw Error('Real storage forbidden');};});
  await page.route('**/__success_fixture__',r=>r.fulfill({contentType:'text/html',body:fixture(makeSeed(26),{})}));
  await page.goto(origin+'/__success_fixture__',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__COLOR_ESCAPE__?.artReady&&window.__COLOR_ESCAPE__.storageBaselineReady,undefined,{timeout:60000});await waitHome(page);
  await page.evaluate(d=>{const g=window.__COLOR_ESCAPE__;g.releaseWinArt();g.dailyChallengeWin={difficulty:d,coins:[0,50,100,200][d],inspiration:[0,20,50,100][d]};g.winCoinReward=0;g.screen='win';g.requestWinArt();g.dirty=true;g.scheduleFrame();},difficulty);
  await page.waitForFunction(()=>!!window.__COLOR_ESCAPE__.winArt);await page.waitForTimeout(100);
  row.paths=await page.evaluate(()=>{const a=window.__COLOR_ESCAPE__.winArt;return {panel:a.panel.src,button:a.continueButton.src,card:a.dailyRewards.card.src,inspiration:a.dailyRewards.inspiration.src,coins:a.dailyRewards.coins.src};});
  assert(row.paths.panel.includes('daily-success-supplied-v1'));assert(row.paths.button.includes('daily-success-supplied-v1'));assert(row.paths.card.includes('daily-challenge-supplied-v1'));assert(row.paths.inspiration.includes('daily-challenge-supplied-v1'));assert(row.paths.coins.includes('daily-challenge-supplied-v1'));
  await snap(page,row,'success');const before=await saved(page);
  await click(page,difficulty===2?'modalSecondary':'modalPrimary');await page.waitForFunction(()=>window.__COLOR_ESCAPE__.screen==='dailyChallenge');
  const after=await saved(page);assert.equal(after.coins,before.coins);assert.deepEqual(after.boosters,before.boosters);assert.equal(after.highestLevel,before.highestLevel);
  row.status='PASS';await context.close();
 }
 assert.deepEqual(report.errors,[]);report.status='PASS';
}catch(e){report.status='FAIL';report.error=String(e.stack);process.exitCode=1;}
finally{await browser.close();await server.close();await writeFile(resolve(output,'report.json'),JSON.stringify(report,null,2));}
console.log(JSON.stringify({status:report.status,error:report.error,output}));
