import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root=fileURLToPath(new URL('../',import.meta.url));
const output=resolve(root,'playtest-results/meta-tabs-cold-profile-20260927');
const url=new URL('/__meta_tabs_cold_profile_fixture__',process.env.PLAYTEST_URL??'http://127.0.0.1:5180/').href;
await mkdir(output,{recursive:true});
const sourceFiles=['src/game/ColorEscapeGame.ts','src/game/JourneyDeferredArt.ts','src/game/artManifest.ts','src/platform/WebHost.ts','src/platform/WechatHost.ts'];
const hashes=async()=>Object.fromEntries(await Promise.all(sourceFiles.map(async path=>[path,createHash('sha256').update(await readFile(resolve(root,path))).digest('hex')])));
const report={scope:'Read-only local image-load diagnosis. Isolated MemoryHost, real Pointer navigation/tab/page clicks. No player Storage access, no production changes. Timings begin after module evaluation and exclude JS bundle download/parse. Delay=150 adds 150ms to every createImage, including cached loads; it is not WeChat subpackage/network/device timing.',sourceBefore:await hashes(),runs:[]};
const html=delay=>`<!doctype html><meta charset="utf-8"><style>html,body{margin:0;overflow:hidden;background:#201953}canvas{display:block;width:100vw;height:100vh;touch-action:none}</style><script type="module">
import {ColorEscapeGame} from '/src/game/ColorEscapeGame.ts';import {WebHost} from '/src/platform/WebHost.ts';import {GAME_ART} from '/src/game/artManifest.ts';
const flat=v=>typeof v==='string'?[v]:Array.isArray(v)?v.flatMap(flat):v&&typeof v==='object'?Object.values(v).flatMap(flat):[];
const groups={collectionUI:new Set(flat(GAME_ART.ui.collectionAlbum)),levelAtlas:new Set(GAME_ART.ui.collectionCardAtlases.levels),masterpieceAtlas:new Set(GAME_ART.ui.collectionCardAtlases.masterpieces),shop:new Set(flat(GAME_ART.ui.formalPages.shop)),leaderboard:new Set(flat(GAME_ART.ui.formalPages.leaderboard)),journey:new Set(flat(GAME_ART.ui.formalPages.journey))};
const profile={images:[],draws:[],cardDraws:[],marks:[{name:'startup',at:performance.now(),screen:'home'}],phase:'startup',active:0,maxActive:0};window.__PROFILE__=profile;
const records=new WeakMap();const originalDrawImage=CanvasRenderingContext2D.prototype.drawImage;
CanvasRenderingContext2D.prototype.drawImage=function(image,...args){const record=records.get(image);if(record){record.firstDrawAt??=performance.now();record.drawPhases??=[];if(!record.drawPhases.includes(profile.phase))record.drawPhases.push(profile.phase);}return originalDrawImage.call(this,image,...args);};
class MemoryHost extends WebHost{
 data=new Map();storageRead(k){return this.data.has(k)?{status:'ok',value:structuredClone(this.data.get(k))}:{status:'missing'};}storageGet(k,f){const r=this.storageRead(k);return r.status==='ok'?r.value:f;}storageSet(k,v){this.data.set(k,structuredClone(v));return true;}music(){}sound(){}vibrate(){}
 async createImage(src){const record={src,group:Object.keys(groups).find(g=>groups[g].has(src))??'other',phase:profile.phase,start:performance.now()};profile.images.push(record);profile.active++;profile.maxActive=Math.max(profile.maxActive,profile.active);try{if(${delay})await new Promise(r=>setTimeout(r,${delay}));const image=await super.createImage(src);record.width=image.naturalWidth;record.height=image.naturalHeight;records.set(image,record);return image;}catch(e){record.error=String(e);throw e;}finally{record.end=performance.now();profile.active--;}}
 releaseImage(image){const record=records.get(image);if(record)record.released=performance.now();super.releaseImage(image);}
}
const save={schemaVersion:1,currentLevel:1,highestLevel:11,coins:1000,sound:false,haptic:false,reducedMotion:false,language:'zh-CN',featureSeen:['basics','ice-door','ice-block','layer','shutter','generator','elevator','conveyor','star'],boosterUnlockSeen:['time','rocket','pulse'],boosters:{time:1,rocket:1,pulse:1},bestStars:{1:3},bestMoves:{},rewardedLevels:Array.from({length:10},(_,i)=>i+1),journeyProgress:{claimedMilestoneLevels:[10],seenEpisodeUnlockLevels:[11]},achievementProgress:{claimedIds:[]},selectedJourneyEpisode:1,collectionProgress:{version:1,inspiration:113,restoredMasterpieceIds:[],seenItemIds:[],claimedMilestoneIds:[]},dailyStreak:0,lastDailyCompletedDay:''};
const host=new MemoryHost();host.data.set('color-escape-save-v1',save);const game=new ColorEscapeGame(host);window.__TEST__={game,host};
for(const [method,screen] of [['drawGeneratedHome','home'],['drawSupply','supply'],['drawLeaderboard','leaderboard'],['drawLevels','levels'],['drawCollectionPage','records']]){
 const original=game[method];game[method]=function(...args){const start=performance.now();const shellReady=screen==='home'?game.shellArtReady:screen==='records'?!!game.collectionAlbumArt:game.formalPageReady(screen);const artworkReady=screen==='records'?!!game.collectionAlbumArtworkImages?.length:shellReady;try{return original.apply(this,args);}finally{profile.draws.push({phase:profile.phase,screen,start,end:performance.now(),shellReady,artworkReady,interactiveReady:game.artReady&&game.storageBaselineReady,transition:!!game.navigationTransition,tab:screen==='records'?game.collectionAlbumTab:undefined,page:screen==='records'?game.collectionAlbumPage[game.collectionAlbumTab]:undefined,atlasCount:screen==='records'?game.collectionAlbumArtworkImages?.length??0:undefined});}};
}
const originalArtwork=game.drawCollectionAlbumArtwork;game.drawCollectionAlbumArtwork=function(item,...args){profile.cardDraws.push({at:performance.now(),phase:profile.phase,id:item.id,category:item.category,atlasReady:!!game.collectionAlbumArtworkImages?.length});return originalArtwork.call(this,item,...args);};
game.start();
</script>`;
const browser=await chromium.launch({headless:true});
async function mark(page,name,screen){await page.evaluate(({name,screen})=>{window.__PROFILE__.phase=name;window.__PROFILE__.marks.push({name,screen,at:performance.now()});},{name,screen});}
async function click(page,key){const target=await page.evaluate(key=>{const g=window.__TEST__.game,s=g.getDebugState(),r=s.interactionTargets.targets[key]?.hit;if(!r)throw new Error('Missing '+key);const b=g.host.canvas.getBoundingClientRect(),t=s.viewportTransform;return{x:b.x+t.offsetX+(r.x+r.width/2)*t.scale,y:b.y+t.offsetY+(r.y+r.height/2)*t.scale};},key);await page.mouse.click(target.x,target.y,{delay:30});}
async function settle(page,screen){await page.waitForFunction(screen=>{const g=window.__TEST__?.game;return g&&g.screen===screen&&!g.navigationTransition&&(screen==='home'?g.artReady:screen==='records'?g.collectionAlbumArt&&g.collectionAlbumArtworkImages?.length:g.formalPageReady(screen));},screen,{timeout:60000});await page.waitForFunction(()=>window.__PROFILE__.active===0,undefined,{timeout:60000});await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));await page.waitForTimeout(80);}
async function navigate(page,index,name,screen){await mark(page,name,screen);await click(page,`navigation.${index}`);await settle(page,screen);}
const screenshots=[];
try{for(const delayMs of [0,150]){
 const context=await browser.newContext({viewport:{width:496,height:1078},deviceScaleFactor:1,locale:'zh-CN'});
 await context.addInitScript(()=>{window.__NATIVE_STORAGE_CALLS__=[];for(const name of ['getItem','setItem','removeItem','clear']){const old=Storage.prototype[name];Storage.prototype[name]=function(...args){window.__NATIVE_STORAGE_CALLS__.push(name);return old.apply(this,args);};}});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route(url,route=>route.fulfill({contentType:'text/html',body:html(delayMs)}));
 await page.goto(url,{waitUntil:'commit'});await settle(page,'home');
 await page.evaluate(()=>{const g=window.__TEST__.game;g.updateToastVisible=false;g.boosterUnlockToast=undefined;g.dirty=true;g.scheduleFrame();});
 const startupState=await page.evaluate(()=>window.__TEST__.game.getDebugState().art);
 for(const [index,screen,label] of [[0,'supply','shop'],[1,'leaderboard','leaderboard'],[4,'records','collection'],[3,'levels','journey']]){
   await navigate(page,index,`${label}:first`,screen);
   const shot=`delay-${delayMs}-${label}-first.png`;await page.screenshot({path:resolve(output,shot)});screenshots.push(shot);
   if(screen==='records'){
     assert.equal(await page.evaluate(()=>window.__TEST__.game.collectionAlbumTab),'levels');
     await mark(page,'collection:level-page2','records');await click(page,'collectionAlbumNext');await settle(page,'records');
     await mark(page,'collection:masterpieces','records');await click(page,'collectionAlbumTab.masterpieces');await settle(page,'records');
     const shot=`delay-${delayMs}-masterpieces-first.png`;await page.screenshot({path:resolve(output,shot)});screenshots.push(shot);
     await mark(page,'collection:masterpiece-page2','records');await click(page,'collectionAlbumNext');await settle(page,'records');
   }
   await navigate(page,2,`home:after-${label}`,'home');
   await navigate(page,index,`${label}:repeat`,screen);
   await navigate(page,2,`home:after-${label}-repeat`,'home');
 }
 const data=await page.evaluate(()=>({profile:window.__PROFILE__,storage:window.__NATIVE_STORAGE_CALLS__,state:window.__TEST__.game.getDebugState()}));
 assert.deepEqual(data.storage,[]);assert.deepEqual(errors,[]);
 for(const image of data.profile.images){try{image.encodedAssetBytes=(await stat(resolve(root,'public',image.src))).size;}catch{image.encodedAssetBytes=null;}}
 const stages=data.profile.marks.map((mark,index)=>{
  const end=data.profile.marks[index+1]?.at??Infinity;
  const images=data.profile.images.filter(i=>i.phase===mark.name),phaseDraws=data.profile.draws.filter(d=>d.phase===mark.name&&d.screen===mark.screen);
  const targetCollection=mark.screen==='records'?phaseDraws.at(-1):undefined;
  const draws=phaseDraws.filter(d=>!targetCollection||(d.tab===targetCollection.tab&&d.page===targetCollection.page));
  const shell=draws.find(d=>d.shellReady),full=draws.find(d=>d.shellReady&&d.artworkReady),stable=draws.find(d=>d.shellReady&&d.artworkReady&&!d.transition),interactive=draws.find(d=>d.interactiveReady&&d.shellReady);
  let active=0,peak=0;for(const event of images.flatMap(i=>[{at:i.start,n:1},{at:i.end,n:-1}]).sort((a,b)=>a.at-b.at||a.n-b.n)){active+=event.n;peak=Math.max(peak,active);}
  return{name:mark.name,screen:mark.screen,imageCount:images.length,byGroup:Object.fromEntries([...new Set(images.map(i=>i.group))].map(group=>[group,images.filter(i=>i.group===group).length])),encodedAssetBytes:images.reduce((n,i)=>n+(i.encodedAssetBytes??0),0),decodedRgbaEstimate:images.reduce((n,i)=>n+(i.width??0)*(i.height??0)*4,0),maxConcurrent:peak,firstShellDrawMs:shell?shell.start-mark.at:null,firstCompleteContentDrawMs:full?full.start-mark.at:null,firstInteractiveContentDrawMs:interactive?interactive.start-mark.at:null,firstStableCompleteContentDrawMs:stable?stable.start-mark.at:null,firstRealAtlasDrawMs:mark.screen==='records'?(data.profile.cardDraws.find(d=>d.phase===mark.name&&d.atlasReady&&d.at>=(full?.start??Infinity))?.at??NaN)-mark.at:null,lastImageCompleteMs:images.length?Math.max(...images.map(i=>i.end))-mark.at:0,imagesAfterShell:images.filter(i=>shell&&i.end>shell.start).length,unusedImagePaths:images.filter(i=>!i.drawPhases?.includes(mark.name)).map(i=>i.src),requestedBeforeStageButCompletedDuring:data.profile.images.filter(i=>i.start<mark.at&&i.end>=mark.at&&i.end<end).map(i=>i.src),collectionState:mark.screen==='records'?{shellAtlasCount:shell?.atlasCount,fullAtlasCount:full?.atlasCount,tab:full?.tab,page:full?.page}:undefined,groupCompletionMs:Object.fromEntries([...new Set(images.map(i=>i.group))].map(group=>[group,Math.max(...images.filter(i=>i.group===group).map(i=>i.end))-mark.at]))};
 });
 const run={delayMs,startupState,stages,errors,...data};report.runs.push(run);
 await writeFile(resolve(output,`delay-${delayMs}.json`),JSON.stringify(run,null,2));
 console.log(JSON.stringify({delayMs,stages:stages.map(({name,imageCount,byGroup,encodedAssetBytes,maxConcurrent,firstShellDrawMs,firstCompleteContentDrawMs,firstInteractiveContentDrawMs,lastImageCompleteMs,collectionState})=>({name,imageCount,byGroup,encodedAssetBytes,maxConcurrent,firstShellDrawMs,firstCompleteContentDrawMs,firstInteractiveContentDrawMs,lastImageCompleteMs,collectionState}))}));
 await context.close();
}
report.sourceAfter=await hashes();assert.deepEqual(report.sourceBefore,report.sourceAfter);report.sourceUnchanged=true;report.screenshots=screenshots;report.status='DONE';
}catch(error){report.status='FAIL';report.error=String(error.stack??error);process.exitCode=1;}finally{await writeFile(resolve(output,'report.json'),JSON.stringify(report,null,2));await browser.close();}
