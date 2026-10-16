import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createServer} from 'vite';
import {chromium} from 'playwright';
import sharp from 'sharp';

// Isolated synthetic league accounts. The result and intro screens are explicit
// UI fixtures; no puzzle completion or real player storage is claimed.
const names=['bronze','silver','gold','platinum','emerald','diamond','master','glory'];
const output=resolve(`playtest-results/league-rank-badges-v2-20261009-${Date.now()}`);
await mkdir(output,{recursive:true});
const sha=v=>createHash('sha256').update(v).digest('hex');
const paths=['src/game/ColorEscapeGame.ts','src/game/artManifest.ts','src/game/leagueUi.ts','src/game/leagueIntroUi.ts','src/core/league.ts','tools/playtest-league-rank-badges-v2.mjs',...names.map(n=>`public/assets/art/ui/league-rank-badges-v2/${n}.png`)];
const hashes=async()=>Object.fromEntries(await Promise.all(paths.map(async p=>[p,sha(await readFile(p))])));
const report={status:'RUNNING',scope:'Synthetic MemoryHost accounts, real Pointer league entry/rules/preview. Result/intro presentation fixtures do not solve or settle a puzzle. Persistent browser storage is blocked.',sources:await hashes(),cases:[],errors:[]};
function html(tier,pending=false){return `<!doctype html><meta charset="utf-8"><link rel="icon" href="data:,"><style>html,body{margin:0;overflow:hidden}canvas{display:block;width:100vw;height:100vh;touch-action:none}</style><script type="module">
import {ColorEscapeGame} from '/src/game/ColorEscapeGame.ts';import {WebHost} from '/src/platform/WebHost.ts';import {createLeague,advanceLeague,LEAGUE_PERIOD_MS} from '/src/core/league.ts';import {LEAGUE_VIDEO_ART} from '/src/game/artManifest.ts';
const now=Date.now(),tier=${tier},pending=${pending};let league=createLeague(now-(pending?LEAGUE_PERIOD_MS:0),1519,tier);if(pending){league.season.score=20;league.season.cleared=[1];league.season.scoreHistory=[{atMs:league.season.joinedMs,score:20}];league=advanceLeague(league,now);}
const initial={schemaVersion:1,currentLevel:21,highestLevel:21,coins:1000,language:'zh-CN',sound:false,music:false,haptic:false,reducedMotion:true,
featureSeen:['basics','ice-door','ice-block','layer','shutter','generator','axis','key-lock','lift','star','bomb','flip-door','color-floor'],boosterUnlockSeen:['time','rocket','pulse'],boosterUsageSeen:['time','rocket','pulse'],boosters:{time:2,rocket:2,pulse:2},
bestStars:{1:3,2:2,3:1},rewardedLevels:Array.from({length:20},(_,i)=>i+1),league,leagueIntroSeen:true,selectedJourneyEpisode:1,
journeyProgress:{claimedMilestoneLevels:[10,15],seenEpisodeUnlockLevels:[11,21]},collectionIntroPending:false,collectionIntroShown:true,
featureGuideProgress:{version:1,pending:[],seen:['leaderboard','supply','levels','dailyChallenge','league']},lifeState:{lives:5,nextLifeAtMs:0,unlimitedLivesUntilMs:0},playerProfile:{id:'7654321',name:'图标验证',avatar:0,frame:0,joinedAt:now}};
const key='color-escape-save-v1',audit={phase:'startup',writes:[],loads:[],draws:[],pointers:[]},images=new WeakMap(),seen=new Set();let game;
class MemoryHost extends WebHost{
data=new Map([[key,structuredClone(initial)]]);storageRead(k){return this.data.has(k)?{status:'ok',value:structuredClone(this.data.get(k))}:{status:'missing'};}storageGet(k,f){const r=this.storageRead(k);return r.status==='ok'?r.value:f;}storageSet(k,v){audit.writes.push({phase:audit.phase,coins:v.coins,league:structuredClone(v.league)});this.data.set(k,structuredClone(v));return true;}music(){}sound(){}vibrate(){}
async createImage(src){const image=await super.createImage(src);audit.loads.push({src,width:image.naturalWidth,height:image.naturalHeight});images.set(image,src);return image;}}
const host=new MemoryHost();game=new ColorEscapeGame(host);const draw=host.context.drawImage;
host.context.drawImage=function(img,...args){const src=images.get(img);if(src?.includes('/league-rank-badges-v2/')){const row={phase:audit.phase,screen:game.screen,src,args,width:img.naturalWidth,height:img.naturalHeight,alpha:this.globalAlpha},id=JSON.stringify(row);if(!seen.has(id)){seen.add(id);audit.draws.push(row);}}return draw.call(this,img,...args);};
for(const type of ['pointerdown','pointerup'])host.canvas.addEventListener(type,e=>audit.pointers.push({type,x:e.clientX,y:e.clientY,phase:audit.phase}),true);
window.__COLOR_ESCAPE__=game;window.__BADGE__={game,host,audit,paths:LEAGUE_VIDEO_ART,initial};game.start();</script>`;}
const server=await createServer({configFile:false,optimizeDeps:{noDiscovery:true,entries:[]},server:{host:'127.0.0.1',port:0,hmr:false,watch:null},logLevel:'error'});await server.listen();
const origin=`http://127.0.0.1:${server.httpServer.address().port}`,browser=await chromium.launch({headless:true});
const state=p=>p.evaluate(()=>window.__COLOR_ESCAPE__.getDebugState());
async function click(p,key){const s=await state(p),r=(s.interactionTargets.targets??s.interactionTargets)[key]?.hit;assert(r,`Missing Pointer target ${key}`);const t=s.viewportTransform;await p.mouse.click(t.offsetX+(r.x+r.width/2)*t.scale,t.offsetY+(r.y+r.height/2)*t.scale,{delay:30});}
async function phase(p,value){await p.evaluate(v=>{const x=window.__BADGE__;x.audit.phase=v;x.game.dirty=true;x.game.scheduleFrame();},value);}
async function open(p,tier,pending=false){await p.goto(`${origin}/__badge_fixture__?tier=${tier}&pending=${Number(pending)}`,{waitUntil:'domcontentloaded'});await p.waitForFunction(()=>{const g=window.__COLOR_ESCAPE__;return g?.artReady&&g.homeProfileArt&&g.screen==='home'&&!g.journeyPresentation&&!g.collectionIntro&&!g.featureUnlockGuide;},null,{timeout:60000});await click(p,'homeLeague');await p.waitForFunction(()=>{const g=window.__COLOR_ESCAPE__;return g.screen==='league'&&g.leagueArtStore?.art&&g.leagueAvatarArtStore?.art;},null,{timeout:30000});assert.equal((await state(p)).league.unlocked,true);}
async function shot(p,row,label){await phase(p,label);await p.waitForFunction(label=>window.__BADGE__.audit.draws.some(d=>d.phase===label),label,{polling:'raf'});const file=resolve(output,`${row.name}-${label}.png`);await p.screenshot({path:file});row.images.push({file,sha256:sha(await readFile(file))});return file;}
async function validate(p,row,expectedPhase,expectedTier){const result=await p.evaluate(()=>({audit:structuredClone(window.__BADGE__.audit),storage:window.__STORAGE_VIOLATIONS__,save:structuredClone(window.__BADGE__.host.data.get('color-escape-save-v1'))}));assert.deepEqual(result.storage,[]);assert.equal(result.save.coins,1000);const all=result.audit.draws;assert(all.length>0);assert(all.some(d=>d.phase===expectedPhase&&d.src.endsWith('/'+expectedTier+'.png')&&d.alpha===1));for(const d of all){const args=d.args;assert.equal(args.length,4,'Badge has a direct contained target rectangle');assert(Math.abs(args[2]/args[3]-d.width/d.height)<1e-5,`${d.phase} distorted ${d.src}`);}assert.equal(result.audit.loads.filter(l=>l.src.includes('/league-rank-badges-v2/')).length,8);assert(!result.audit.loads.some(l=>/league-video-v1\/(bronze|silver|gold|platinum|emerald|diamond|master|glory)\.png$/.test(l.src)));row.audits.push(result);}
try{
for(const viewport of [{width:320,height:568},{width:496,height:1078}]){
 const row={name:`${viewport.width}x${viewport.height}`,status:'RUNNING',images:[],audits:[]},tiles=[];report.cases.push(row);
 const context=await browser.newContext({viewport,deviceScaleFactor:1});await context.addInitScript(()=>{window.__STORAGE_VIOLATIONS__=[];for(const n of ['getItem','setItem','removeItem','clear'])Storage.prototype[n]=function(){window.__STORAGE_VIOLATIONS__.push(n);throw Error('Persistent storage forbidden');};for(const n of ['open','deleteDatabase'])indexedDB[n]=function(){window.__STORAGE_VIOLATIONS__.push(n);throw Error('IndexedDB forbidden');};});const p=await context.newPage();p.on('pageerror',e=>report.errors.push(`${row.name}: ${e.message}`));p.on('console',e=>{if(e.type()==='error')report.errors.push(`${row.name}: ${e.text()}`);});await p.route('**/__badge_fixture__*',r=>{const q=new URL(r.request().url()).searchParams;return r.fulfill({contentType:'text/html',body:html(Number(q.get('tier')||0),q.get('pending')==='1')});});
 for(let tier=0;tier<8;tier++){
  await open(p,tier);assert.equal((await state(p)).league.rows.length,50);const label=`tier${tier}-${names[tier]}`,file=await shot(p,row,label),t=(await state(p)).viewportTransform;
  const crop={left:Math.floor(t.offsetX+118*t.scale),top:Math.floor(t.offsetY+155*t.scale),width:Math.ceil(260*t.scale),height:Math.ceil(290*t.scale)};tiles.push({input:await sharp(file).extract(crop).resize(260,290).png().toBuffer(),left:(tier%4)*260,top:Math.floor(tier/4)*290});
  if(tier===0||tier===7){await click(p,'league.info');await shot(p,row,`${names[tier]}-rules`);await click(p,'league.dismiss');
   if(tier===7){await p.evaluate(()=>{const g=window.__COLOR_ESCAPE__;g.leagueIntroPage=0;g.dirty=true;g.scheduleFrame();});await shot(p,row,'intro-page0-fixture');await click(p,'league.introContinue');await shot(p,row,'intro-page1-fixture');await click(p,'league.introContinue');}
   await p.evaluate(()=>{const g=window.__COLOR_ESCAPE__;g.leagueRunResult={points:0,status:'credited',persistence:'committed'};g.leagueResultAnimationAge=5;g.screen='leagueResult';g.dirty=true;g.scheduleFrame();});await shot(p,row,`${names[tier]}-run-result-fixture`);
  }
  await validate(p,row,label,names[tier]);
 }
 const gallery=resolve(output,`${row.name}-eight-tiers.png`);await sharp({create:{width:1040,height:580,channels:4,background:'#08271e'}}).composite(tiles).png().toFile(gallery);row.gallery=gallery;
 for(const tier of [0,7]){await open(p,tier,true);assert((await state(p)).league.hasState);const label=`${names[tier]}-season-settlement`;await shot(p,row,label);await validate(p,row,label,names[tier]);}
 row.status='PASS';await context.close();
}
assert.deepEqual(report.errors,[]);report.sourceAfter=await hashes();report.sourceChanges=paths.filter(p=>report.sources[p]!==report.sourceAfter[p]);assert.deepEqual(report.sourceChanges,[],'Bound source changed during playtest');report.status='PASS';
}catch(error){report.status='FAIL';report.failure=error.stack;process.exitCode=1;}
finally{await browser.close();await server.close();await writeFile(resolve(output,'report.json'),JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({status:report.status,cases:report.cases.map(r=>({name:r.name,status:r.status})),failure:report.failure,output},null,2));
