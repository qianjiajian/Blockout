import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createServer} from 'vite';
import {chromium} from 'playwright';
const output=resolve(`playtest-results/ranking-profile-avatars-20261008-${Date.now()}`);await mkdir(output,{recursive:true});
const sha=b=>createHash('sha256').update(b).digest('hex');
const files=['src/game/ColorEscapeGame.ts','src/game/playerProfileUi.ts','src/game/ProfileAvatarArtStore.ts','src/game/leagueUi.ts','src/game/leagueIntroUi.ts','src/core/metaLeaderboard.ts','tools/playtest-ranking-profile-avatars.mjs'];
const hashes=async()=>Object.fromEntries(await Promise.all(files.map(async p=>[p,sha(await readFile(p))])));
const report={status:'RUNNING',scope:'Isolated MemoryHost; real Pointer profile selections/save/cancel/reject, three ranking tabs and list scrolling, league entry/challenge. League result and intro display use explicitly synthetic UI fixtures, not a completed puzzle. Faults injected only in image loader.',sources:await hashes(),cases:[],errors:[]};
const html=`<!doctype html><meta charset="utf-8"><link rel="icon" href="data:,"><style>html,body{margin:0;overflow:hidden}canvas{display:block;width:100vw;height:100vh;touch-action:none}</style><script type="module">
import {ColorEscapeGame} from '/src/game/ColorEscapeGame.ts';import {WebHost} from '/src/platform/WebHost.ts';import {createLeague} from '/src/core/league.ts';
const now=Date.now(),league=createLeague(now,1519,0);league.season.bots.forEach((b,i)=>b.avatar=i%32);
const initial={schemaVersion:1,currentLevel:21,highestLevel:21,coins:1000,language:'zh-CN',sound:false,music:false,haptic:false,reducedMotion:true,
 featureSeen:['basics','ice-door','ice-block','layer','shutter','generator','axis','key-lock','lift','star','bomb','flip-door','color-floor'],boosterUnlockSeen:['time','rocket','pulse'],boosterUsageSeen:['time','rocket','pulse'],
 collectionIntroShown:true,collectionIntroPending:false,leagueIntroSeen:true,league,selectedJourneyEpisode:1,bestStars:{1:3,2:2,3:1},rewardedLevels:Array.from({length:20},(_,i)=>i+1),
 journeyProgress:{claimedMilestoneLevels:[5,10,15,20],seenEpisodeUnlockLevels:[11,21]},featureGuideProgress:{version:1,pending:[],seen:['leaderboard','supply','levels','dailyChallenge','league']},
 lifeState:{lives:5,nextLifeAtMs:0,unlimitedLivesUntilMs:0},playerProfile:{id:'1482757',name:'Player#148221',avatar:1,frame:7,joinedAt:1785542400000,firstTryWins:3,longestStreak:3,currentStreak:0,attempts:{},lastAttemptWon:true}};
const key='color-escape-save-v1',audit={phase:'startup',writes:[],loads:[],released:[],avatars:[]},control={saveMode:'commit',imageMode:'ok',held:[]};let activeDraw;const seen=new Set();
class MemoryHost extends WebHost{
 data=new Map([[key,structuredClone(initial)]]);
 storageRead(k){return this.data.has(k)?{status:'ok',value:structuredClone(this.data.get(k))}:{status:'missing'};}
 storageGet(k,f){const r=this.storageRead(k);return r.status==='ok'?r.value:f;}
 storageSet(k,v){audit.writes.push({phase:audit.phase,key:k,value:structuredClone(v),mode:control.saveMode});if(control.saveMode==='reject')return false;this.data.set(k,structuredClone(v));return true;}
 music(){}sound(){}vibrate(){}
 async createImage(src){const row={src,phase:audit.phase,mode:control.imageMode};audit.loads.push(row);if(src.includes('profile-reference-v1/avatar-')){if(control.imageMode==='fail'&&src.endsWith('avatar-14.png')){row.failed=true;throw Error('Synthetic portrait load failure');}if(control.imageMode==='hold'){row.held=true;await new Promise(resolve=>control.held.push(resolve));}}const image=await super.createImage(src);row.ready=true;return image;}
 releaseImage(img){audit.released.push({phase:audit.phase,src:img.src});super.releaseImage(img);}
}
const host=new MemoryHost(),game=new ColorEscapeGame(host),draw=host.context.drawImage,rank=game.drawRankingAvatar.bind(game),leagueDraw=game.drawLeagueRankingAvatar.bind(game);let leaguePlayer;
game.drawLeagueRankingAvatar=function(a,p,r){leaguePlayer={rawAvatar:a,player:p};try{return leagueDraw(a,p,r);}finally{leaguePlayer=undefined;}};
game.drawRankingAvatar=function(art,avatar,frame,rect){const row={phase:audit.phase,screen:game.screen,avatar,frame,rect:{...rect},league:leaguePlayer?{...leaguePlayer}:null,images:[]};activeDraw=row;try{return rank(art,avatar,frame,rect);}finally{activeDraw=undefined;const id=JSON.stringify(row);if(!seen.has(id)){seen.add(id);audit.avatars.push(row);}}};
host.context.drawImage=function(img,...args){if(activeDraw)activeDraw.images.push(img.src);return draw.call(this,img,...args);};
window.__COLOR_ESCAPE__=game;window.__RANK_AVATAR__={game,host,audit,control,initial};game.start();</script>`;
const server=await createServer({configFile:false,optimizeDeps:{noDiscovery:true,entries:[]},server:{host:'127.0.0.1',port:0,hmr:false,watch:null},logLevel:'error'});await server.listen();
const origin=`http://127.0.0.1:${server.httpServer.address().port}`,browser=await chromium.launch({headless:true});
const state=p=>p.evaluate(()=>window.__COLOR_ESCAPE__.getDebugState());
const profile=p=>p.evaluate(()=>({live:structuredClone(window.__COLOR_ESCAPE__.save.playerProfile),stored:structuredClone(window.__RANK_AVATAR__.host.data.get('color-escape-save-v1').playerProfile)}));
async function phase(p,value){await p.evaluate(v=>{const t=window.__RANK_AVATAR__;t.audit.phase=v;t.game.dirty=true;t.game.scheduleFrame();},value);}
async function point(p,x,y){const s=await state(p),b=await p.locator('canvas').boundingBox(),t=s.viewportTransform;return{x:b.x+t.offsetX+x*t.scale,y:b.y+t.offsetY+y*t.scale};}
async function click(p,key){const s=await state(p),r=s.interactionTargets.targets[key]?.hit;assert(r,`Missing ${key}`);const c=await point(p,r.x+r.width/2,r.y+r.height/2);await p.mouse.click(c.x,c.y,{delay:30});}
async function home(p){await click(p,'navigation.2');await p.waitForFunction(()=>{const g=window.__COLOR_ESCAPE__;return g.screen==='home'&&!g.navigationTransition;});}
async function shot(p,row,label){const file=resolve(output,`${row.name}-${label}.png`);await p.screenshot({path:file});row.images.push({file,sha256:sha(await readFile(file))});}
async function select(p,avatar,frame,action='save'){
 await click(p,'homeProfile');await p.waitForFunction(()=>Boolean(window.__COLOR_ESCAPE__.profileArt));await click(p,'profile.edit');await click(p,`profile.select.${avatar}`);await click(p,'profile.frameTab');await click(p,`profile.select.${frame}`);
 if(action==='cancel'){await click(p,'profile.close');return;}
 if(action==='reject')await p.evaluate(()=>window.__RANK_AVATAR__.control.saveMode='reject');
 await click(p,'profile.save');if(action==='reject')await p.evaluate(()=>window.__RANK_AVATAR__.control.saveMode='commit');
 await click(p,'profile.close');await p.waitForFunction(()=>!window.__COLOR_ESCAPE__.profilePage);
}
async function openMeta(p){await click(p,'navigation.1');await p.waitForFunction(()=>{const g=window.__COLOR_ESCAPE__;return g.screen==='leaderboard'&&!g.navigationTransition&&g.formalPageReady('leaderboard');},null,{timeout:30000});}
async function checkDraws(p,phaseName,avatar,frame,league=false){
 await p.waitForFunction(({name,a,f})=>window.__RANK_AVATAR__.audit.avatars.some(r=>r.phase===name&&r.avatar===a&&r.frame===f&&r.images.length===2),{name:phaseName,a:avatar,f:frame});
 const rows=await p.evaluate(name=>window.__RANK_AVATAR__.audit.avatars.filter(r=>r.phase===name&&r.images.length),phaseName);assert(rows.length>1);
 for(const r of rows){assert(r.avatar>=0&&r.avatar<15);assert(r.frame>=0&&r.frame<9);assert(r.images.every(src=>src.includes('/profile-reference-v1/')));assert(r.images[0].endsWith(`frame-${r.frame}.png`));assert(r.images[1].endsWith(`avatar-${r.avatar}.png`));if(league&&!r.league?.player){assert.equal(r.frame,0);assert.equal(r.avatar,r.league.rawAvatar%15);}}
 assert(rows.some(r=>r.avatar===avatar&&r.frame===frame&&(!league||r.league?.player)));return rows;
}
async function tabs(p,row,avatar,frame,label){
 const arts=[];await p.evaluate(()=>window.__RANK_AVATAR__.tabArt=window.__COLOR_ESCAPE__.formalPageArtFor('leaderboard'));
 for(const [mode,key] of [['weekly','leaderboardWeekly'],['world','leaderboardWorld'],['country','leaderboardCountry']]){
  const name=`${label}-${mode}`;await phase(p,name);await click(p,key);await p.waitForFunction(m=>window.__COLOR_ESCAPE__.leaderboardMode===m,mode);
  const s=await state(p);assert.equal(s.leaderboard.player.avatar,avatar);assert.equal(s.leaderboard.player.frame,frame);
  row.renderChecks.push({name,draws:await checkDraws(p,name,avatar,frame)});arts.push(await p.evaluate(()=>window.__RANK_AVATAR__.tabArt===window.__COLOR_ESCAPE__.formalPageArtFor('leaderboard')));await shot(p,row,name);
 }
 assert(arts.every(Boolean),'All three modes reuse the same loaded portrait art');
 const s=await state(p),v=s.leaderboard.viewport,start=await point(p,v.x+v.width*.65,v.y+v.height*.85),end=await point(p,v.x+v.width*.65,v.y+v.height*.15);await phase(p,`${label}-scroll`);
 await p.mouse.move(start.x,start.y);await p.mouse.down();await p.mouse.move(end.x,end.y,{steps:10});await p.mouse.up();await p.waitForFunction(()=>window.__COLOR_ESCAPE__.getDebugState().leaderboard.scrollOffset>0);
 row.renderChecks.push({name:`${label}-scroll`,draws:await checkDraws(p,`${label}-scroll`,avatar,frame)});await shot(p,row,`${label}-scroll`);
}
async function openLeague(p){await click(p,'homeLeague');await p.waitForFunction(()=>{const g=window.__COLOR_ESCAPE__;return g.screen==='league'&&g.leagueArtStore?.art&&g.leagueAvatarArtStore?.art;},null,{timeout:30000});}
try{for(const viewport of [{width:320,height:568},{width:496,height:1078}]){
 const row={name:`${viewport.width}x${viewport.height}`,viewport,status:'RUNNING',images:[],renderChecks:[]};report.cases.push(row);const context=await browser.newContext({viewport,deviceScaleFactor:1});
 await context.addInitScript(()=>{window.__STORAGE_VIOLATIONS__=[];for(const n of ['getItem','setItem','removeItem','clear'])Storage.prototype[n]=function(){window.__STORAGE_VIOLATIONS__.push(n);throw Error('Persistent storage forbidden');};for(const n of ['open','deleteDatabase'])indexedDB[n]=function(){window.__STORAGE_VIOLATIONS__.push(n);throw Error('IndexedDB forbidden');};});
 const p=await context.newPage();p.on('pageerror',e=>report.errors.push(`${row.name}: ${e.message}`));p.on('console',e=>{if(e.type()==='error')report.errors.push(`${row.name}: ${e.text()}`);});await p.route('**/__ranking_avatars__',route=>route.fulfill({contentType:'text/html',body:html}));await p.goto(`${origin}/__ranking_avatars__`,{waitUntil:'domcontentloaded'});
 await p.waitForFunction(()=>{const g=window.__COLOR_ESCAPE__;return g?.artReady&&g.homeProfileArt&&g.screen==='home'&&!g.journeyPresentation&&!g.collectionIntro;});
 await phase(p,'save13-4');await select(p,13,4);let selected=await profile(p);assert.equal(selected.live.avatar,13);assert.equal(selected.stored.frame,4);
 await openMeta(p);await tabs(p,row,13,4,'appearance13-4');await home(p);
 await phase(p,'save2-8');await select(p,2,8);selected=await profile(p);assert.equal(selected.live.avatar,2);assert.equal(selected.stored.frame,8);
 await openMeta(p);await tabs(p,row,2,8,'appearance2-8');await home(p);
 const committed=await profile(p);await phase(p,'cancel');await select(p,5,1,'cancel');assert.deepEqual(await profile(p),committed);await phase(p,'reject');await select(p,6,2,'reject');assert.deepEqual(await profile(p),committed);
 await openMeta(p);await phase(p,'after-cancel-reject');row.renderChecks.push({name:'after-cancel-reject',draws:await checkDraws(p,'after-cancel-reject',2,8)});await home(p);
 await openLeague(p);await phase(p,'league');row.renderChecks.push({name:'league',draws:await checkDraws(p,'league',2,8,true)});await shot(p,row,'league');
 const bots=await p.evaluate(()=>window.__COLOR_ESCAPE__.save.league.season.bots.map(b=>b.avatar));assert.deepEqual(bots,Array.from({length:49},(_,i)=>i%32));row.legacyBotValuesUnchanged=true;
 await phase(p,'league-intro-fixture');await p.evaluate(()=>{const g=window.__COLOR_ESCAPE__;g.leagueIntroPage=0;g.dirty=true;g.scheduleFrame();});row.renderChecks.push({name:'league-intro-fixture',draws:await checkDraws(p,'league-intro-fixture',2,8,true)});await shot(p,row,'league-intro-fixture');await p.evaluate(()=>{window.__COLOR_ESCAPE__.leagueIntroPage=undefined;window.__COLOR_ESCAPE__.dirty=true;});
 await click(p,'league.challenge');await click(p,'league.start');await p.waitForFunction(()=>window.__COLOR_ESCAPE__.screen==='playing');assert(await p.evaluate(()=>Boolean(window.__COLOR_ESCAPE__.leagueAvatarArtStore?.art)&&!window.__COLOR_ESCAPE__.formalPageArtFor('leaderboard')));
 await phase(p,'league-result-fixture');await p.evaluate(()=>{const g=window.__COLOR_ESCAPE__;g.leagueRunResult={points:20,status:'credited',persistence:'committed'};g.leagueResultAnimationAge=5;g.screen='leagueResult';g.dirty=true;g.scheduleFrame();});
 row.renderChecks.push({name:'league-result-fixture',draws:await checkDraws(p,'league-result-fixture',2,8,true)});await shot(p,row,'league-result-fixture');
 await p.evaluate(()=>window.__COLOR_ESCAPE__.returnFromLeaguePrototype());await p.waitForFunction(()=>window.__COLOR_ESCAPE__.screen==='league');await click(p,'league.back');assert(await p.evaluate(()=>!window.__COLOR_ESCAPE__.leagueAvatarArtStore?.art));
 if(viewport.width===496){
  await phase(p,'portrait-failure');await p.evaluate(()=>window.__RANK_AVATAR__.control.imageMode='fail');await click(p,'homeLeague');await p.waitForFunction(()=>window.__COLOR_ESCAPE__.leagueAvatarArtStore?.error===true);await shot(p,row,'portrait-failure');
  const failedOffset=(await state(p)).league.scrollOffset,start=await point(p,260,830),end=await point(p,260,550);
  await p.mouse.move(start.x,start.y);await p.mouse.down();await p.mouse.move(end.x,end.y,{steps:6});await p.mouse.up();assert.equal((await state(p)).league.scrollOffset,failedOffset,'Invisible list cannot drag while portraits failed');
  await p.evaluate(()=>window.__RANK_AVATAR__.control.imageMode='ok');await phase(p,'portrait-retry');const retryTop=await point(p,248,944);await p.mouse.click(retryTop.x,retryTop.y,{delay:30});await p.waitForFunction(()=>Boolean(window.__COLOR_ESCAPE__.leagueAvatarArtStore?.art));row.retryUpperEdge={logicalX:248,logicalY:944,passed:true};row.renderChecks.push({name:'portrait-retry',draws:await checkDraws(p,'portrait-retry',2,8,true)});await shot(p,row,'portrait-retry');await click(p,'league.back');
  await phase(p,'portrait-late');await p.evaluate(()=>window.__RANK_AVATAR__.control.imageMode='hold');await click(p,'homeLeague');await p.waitForFunction(()=>window.__RANK_AVATAR__.control.held.length>0);await click(p,'league.back');
  await p.evaluate(()=>{const c=window.__RANK_AVATAR__.control;c.imageMode='ok';for(const resolve of c.held.splice(0))resolve();});
  await p.waitForFunction(()=>window.__RANK_AVATAR__.audit.released.filter(r=>r.phase==='portrait-late'&&/profile-reference-v1\/(avatar|frame)-/.test(r.src)).length>=24);
  assert(await p.evaluate(()=>window.__COLOR_ESCAPE__.screen==='home'&&!window.__COLOR_ESCAPE__.leagueAvatarArtStore?.art));row.imageFailureRetryAndLateRelease='PASS';
 }
 row.audit=await p.evaluate(()=>structuredClone(window.__RANK_AVATAR__.audit));row.finalProfile=await profile(p);assert.equal(row.finalProfile.stored.avatar,2);assert.equal(row.finalProfile.stored.frame,8);
 row.storageViolations=await p.evaluate(()=>window.__STORAGE_VIOLATIONS__);assert.deepEqual(row.storageViolations,[]);row.status='PASS';await context.close();
}
assert.deepEqual(report.errors,[]);report.sourceAfter=await hashes();report.sourceChanges=files.filter(p=>report.sources[p]!==report.sourceAfter[p]);assert.deepEqual(report.sourceChanges,[]);report.status='PASS';
}catch(error){report.status='FAIL';report.failure=error.stack;process.exitCode=1;}
finally{await browser.close();await server.close();await writeFile(resolve(output,'report.json'),JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({status:report.status,cases:report.cases.map(r=>({name:r.name,status:r.status})),failure:report.failure,output},null,2));
