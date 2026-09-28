import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { COLLECTION_CARD_ATLAS_SIZE, COLLECTION_CARD_ATLAS_JPEG_OPTIONS } from './collection-card-atlas-jpeg.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const output=resolve(root,'playtest-results/collection-lazy-art-20260927');
const url=new URL('/__collection_lazy_art_fixture__',process.env.PLAYTEST_URL??'http://127.0.0.1:5180/').href;
await mkdir(output,{recursive:true});
const hash=buffer=>createHash('sha256').update(buffer).digest('hex');
const sourceFiles=['src/game/ColorEscapeGame.ts','src/game/CollectionArtworkStore.ts','src/game/artManifest.ts','tools/collection-card-atlas-jpeg.mjs'];
const sourceHashes=async()=>Object.fromEntries(await Promise.all(sourceFiles.map(async path=>[path,hash(await readFile(resolve(root,path)))])));
const atlasPaths=[...new Set((await readFile(resolve(root,'src/game/artManifest.ts'),'utf8')).match(/assets\/art\/ui\/formal-pages\/collection-card-atlases-v1\/[^"\s]+\.jpg/g))];
assert.equal(atlasPaths.length,10);assert.equal(COLLECTION_CARD_ATLAS_SIZE,1000);assert.equal(COLLECTION_CARD_ATLAS_JPEG_OPTIONS.quality,60);
function jpegSize(buffer){for(let i=2;i<buffer.length;){if(buffer[i]!==255){i++;continue;}const marker=buffer[i+1];if(marker===0xd9||marker===0xda)break;const length=buffer.readUInt16BE(i+2);if([0xc0,0xc1,0xc2].includes(marker))return{width:buffer.readUInt16BE(i+7),height:buffer.readUInt16BE(i+5)};i+=length+2;}throw new Error('JPEG has no supported size marker');}
const assetHashes=async()=>Object.fromEntries(await Promise.all(atlasPaths.map(async path=>{const bytes=await readFile(resolve(root,'public',path)),size=jpegSize(bytes);assert.deepEqual(size,{width:1000,height:1000});return[path,{sha256:hash(bytes),bytes:bytes.length,...size}];})));
const report={scope:'Isolated MemoryHost and real Pointer interactions. No native Storage, no production mutation. Artificial atlas delay/failure exercises scheduling and lifecycle, not WeChat download speed. Existing ten 1000px/q60 JPEG resources are fingerprinted unchanged.',sourceBefore:await sourceHashes(),assetsBefore:await assetHashes(),cases:[]};

function html(options){return`<!doctype html><meta charset="utf-8"><style>html,body{margin:0;overflow:hidden;background:#201953}canvas{display:block;width:100vw;height:100vh;touch-action:none}</style><script type="module">
import {ColorEscapeGame} from '/src/game/ColorEscapeGame.ts';import {WebHost} from '/src/platform/WebHost.ts';import {GAME_ART} from '/src/game/artManifest.ts';
const options=${JSON.stringify(options)};
const paths=[...GAME_ART.ui.collectionCardAtlases.levels,...GAME_ART.ui.collectionCardAtlases.masterpieces],chrome=new Set(Object.values(GAME_ART.ui.collectionAlbum));
const profile={images:[],draws:[],marks:[],phase:'startup',active:0};const controls={delayMs:options.delayMs??0,failIndexes:[]};window.__PROFILE__=profile;window.__CONTROLS__=controls;
const records=new WeakMap();let drawingItem;
const draw=CanvasRenderingContext2D.prototype.drawImage;
CanvasRenderingContext2D.prototype.drawImage=function(image,...args){if(drawingItem){const record=records.get(image);profile.draws.push({...drawingItem,at:performance.now(),phase:profile.phase,actualIndex:record?.atlasIndex??-1,src:record?.src??image.src,args,width:image.naturalWidth,height:image.naturalHeight});}return draw.call(this,image,...args);};
class MemoryHost extends WebHost{
 data=new Map();storageRead(k){return this.data.has(k)?{status:'ok',value:structuredClone(this.data.get(k))}:{status:'missing'};}storageGet(k,f){const r=this.storageRead(k);return r.status==='ok'?r.value:f;}storageSet(k,v){this.data.set(k,structuredClone(v));return true;}music(){}sound(){}vibrate(){}
 async createImage(src){const atlasIndex=paths.indexOf(src);const item={imageId:profile.images.length+1,src,atlasIndex,group:atlasIndex>=0?'atlas':chrome.has(src)?'chrome':'other',phase:profile.phase,start:performance.now()};profile.images.push(item);profile.active++;try{if(atlasIndex>=0&&controls.delayMs)await new Promise(r=>setTimeout(r,controls.delayMs));const failure=controls.failIndexes.indexOf(atlasIndex);if(atlasIndex>=0&&failure>=0){controls.failIndexes.splice(failure,1);throw new Error('Synthetic collection atlas failure '+atlasIndex);}const image=await super.createImage(src);records.set(image,item);item.width=image.naturalWidth;item.height=image.naturalHeight;return image;}catch(e){item.error=String(e);throw e;}finally{item.end=performance.now();profile.active--;}}
 releaseImage(image){const item=records.get(image);if(item)item.released=performance.now();super.releaseImage(image);}
}
const highestLevel=options.highestLevel??1;
const save={schemaVersion:1,currentLevel:1,highestLevel,coins:1000,sound:false,haptic:false,reducedMotion:options.reducedMotion??true,language:'zh-CN',featureSeen:['basics','ice-door','ice-block','layer','shutter','generator','elevator','conveyor','star'],boosterUnlockSeen:['time','rocket','pulse'],boosters:{time:1,rocket:1,pulse:1},bestStars:Object.fromEntries(Array.from({length:highestLevel-1},(_,i)=>[i+1,1])),bestMoves:{},rewardedLevels:Array.from({length:highestLevel-1},(_,i)=>i+1),journeyProgress:{claimedMilestoneLevels:[],seenEpisodeUnlockLevels:[]},achievementProgress:{claimedIds:[]},selectedJourneyEpisode:1,collectionProgress:{version:1,inspiration:options.inspiration??0,restoredMasterpieceIds:options.restored??[],seenItemIds:[],claimedMilestoneIds:[]},dailyStreak:0,lastDailyCompletedDay:''};
const host=new MemoryHost();host.data.set('color-escape-save-v1',save);const game=new ColorEscapeGame(host);window.__TEST__={game,host,paths,artworkImageIds:()=>game.collectionAlbumArtwork?.images.map(image=>records.get(image)?.imageId)??[]};
const original=game.drawCollectionAlbumArtwork;game.drawCollectionAlbumArtwork=function(item,...args){const cell=(item.category==='level'?item.levelId:item.catalogNumber)-1;drawingItem={id:item.id,category:item.category,cell:cell%25,expectedIndex:(item.category==='level'?0:8)+Math.floor(cell/25),detail:!args[2]};try{return original.call(this,item,...args);}finally{drawingItem=undefined;}};
game.start();
</script>`;}
const browser=await chromium.launch({headless:true});
const debug=page=>page.evaluate(()=>window.__TEST__.game.getDebugState());
const mark=(page,phase)=>page.evaluate(phase=>{window.__PROFILE__.phase=phase;window.__PROFILE__.marks.push({phase,at:performance.now()});},phase);
const controls=(page,update)=>page.evaluate(update=>Object.assign(window.__CONTROLS__,update),update);
async function click(page,key){const p=await page.evaluate(key=>{const g=window.__TEST__.game,s=g.getDebugState(),r=s.interactionTargets.targets[key]?.hit;if(!r)throw new Error('Missing target '+key);const b=g.host.canvas.getBoundingClientRect(),t=s.viewportTransform;return{x:b.x+t.offsetX+(r.x+r.width/2)*t.scale,y:b.y+t.offsetY+(r.y+r.height/2)*t.scale};},key);await page.mouse.click(p.x,p.y,{delay:25});}
async function frames(page){await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));}
async function ready(page){await page.waitForFunction(()=>{const g=window.__TEST__.game,s=g.getDebugState();return g.screen==='records'&&!g.navigationTransition&&s.collectionAlbum.art.ready&&s.collectionAlbum.art.artworkReady;},undefined,{timeout:15000});await frames(page);}
async function idle(page){await page.waitForFunction(()=>window.__PROFILE__.active===0,undefined,{timeout:15000});await frames(page);}
async function enter(page,phase='entry'){await mark(page,phase);await click(page,'navigation.4');await ready(page);await idle(page);}
async function leave(page){await mark(page,'leave');await click(page,'navigation.2');await page.waitForFunction(()=>window.__TEST__.game.screen==='home'&&!window.__TEST__.game.navigationTransition);await frames(page);}
async function pageTo(page,index,{wait=true}={}){for(let i=0;i<30;i++){const state=await debug(page),current=state.collectionAlbum.pageIndex;if(current===index){if(wait){await ready(page);await idle(page);}return;}await click(page,index>current?'collectionAlbumNext':'collectionAlbumPrevious');await page.waitForFunction(old=>window.__TEST__.game.getDebugState().collectionAlbum.pageIndex!==old,current);if(wait)await ready(page);}throw new Error('Could not navigate to album page '+index);}
async function tab(page,name,{wait=true}={}){await click(page,'collectionAlbumTab.'+name);await page.waitForFunction(name=>window.__TEST__.game.getDebugState().collectionAlbum.tab===name,name);if(wait){await ready(page);await idle(page);}}
const atlasRequests=page=>page.evaluate(()=>window.__PROFILE__.images.filter(i=>i.group==='atlas'));
function checkDraw(draw){assert.equal(draw.actualIndex,draw.expectedIndex,`Correct atlas for ${draw.id}`);assert.equal(draw.width,1000);assert.equal(draw.height,1000);assert.equal(draw.args.length,8);const [x,y,w,h]=draw.args,col=draw.cell%5,row=Math.floor(draw.cell/5);assert.ok(x>=col*200&&y>=row*200&&x+w<=(col+1)*200+0.001&&y+h<=(row+1)*200+0.001,`Crop stays within ${draw.id}'s atlas cell`);}
async function checkReadyDraws(page){await frames(page);const data=await page.evaluate(()=>{const g=window.__TEST__.game,s=g.getDebugState(),phase=window.__PROFILE__.phase;return{state:s,draws:window.__PROFILE__.draws.filter(d=>d.phase===phase),visible:s.collectionAlbum.visibleItems.map(i=>i.id)};});for(const id of data.visible){const draw=data.draws.findLast(d=>d.id===id&&!d.detail&&d.actualIndex>=0);assert.ok(draw,'Visible card draws its own image '+id);checkDraw(draw);}return data.state;}
async function checkReleased(page){await idle(page);const live=await page.evaluate(()=>window.__PROFILE__.images.filter(i=>['atlas','chrome'].includes(i.group)&&i.end&&!i.error&&!i.released));assert.deepEqual(live,[],'Collection images released after leaving');}
async function run(name,options,action){const context=await browser.newContext({viewport:options.viewport??{width:496,height:1078},deviceScaleFactor:1,locale:'zh-CN'});const result={name,options,passed:false,errors:[]};report.cases.push(result);await context.addInitScript(()=>{window.__NATIVE_STORAGE_CALLS__=[];for(const name of ['getItem','setItem','removeItem','clear']){const old=Storage.prototype[name];Storage.prototype[name]=function(...args){window.__NATIVE_STORAGE_CALLS__.push(name);return old.apply(this,args);};}});const page=await context.newPage();page.on('pageerror',e=>result.errors.push(e.message));await page.route(url,r=>r.fulfill({contentType:'text/html',body:html(options)}));try{await page.goto(url,{waitUntil:'commit'});await page.waitForFunction(()=>window.__TEST__?.game.artReady&&window.__TEST__.game.storageBaselineReady,undefined,{timeout:60000});await page.evaluate(()=>{const g=window.__TEST__.game;g.updateToastVisible=false;g.boosterUnlockToast=undefined;g.dirty=true;g.scheduleFrame();});await action(page,result);result.profile=await page.evaluate(()=>window.__PROFILE__);result.storageCalls=await page.evaluate(()=>window.__NATIVE_STORAGE_CALLS__);assert.deepEqual(result.storageCalls,[]);assert.deepEqual(result.errors,[]);result.passed=true;console.log('PASS '+name);}catch(error){result.error=String(error.stack??error);result.state=await debug(page).catch(()=>undefined);result.profile=await page.evaluate(()=>window.__PROFILE__).catch(()=>undefined);await page.screenshot({path:resolve(output,name+'-failed.png')}).catch(()=>{});throw error;}finally{await writeFile(resolve(output,name+'.json'),JSON.stringify(result,null,2));await context.close();}}

try{
 for(const viewport of [{width:496,height:1078},{width:320,height:568}])await run('paging-'+viewport.width,{viewport,delayMs:150},async(page,result)=>{
  await enter(page);let state=await checkReadyDraws(page);assert.equal(state.collectionAlbum.pageIndex,0);assert.deepEqual(state.collectionAlbum.art.currentAtlasIndexes,[0]);
  assert.deepEqual((await atlasRequests(page)).map(i=>i.atlasIndex),[0],'First page and neighbor share a single level atlas');
  result.firstEntry={art:state.collectionAlbum.art,requestedAtlasIndexes:[0],encodedBytes:report.assetsBefore[atlasPaths[0]].bytes};await page.screenshot({path:resolve(output,result.name+'-first.png')});
  await mark(page,'level-page-1');await pageTo(page,1);assert.deepEqual((await atlasRequests(page)).map(i=>i.atlasIndex).sort((a,b)=>a-b),[0,1],'Adjacent page prefetch crosses atlas boundary');
  await mark(page,'level-page-2');await pageTo(page,2);state=await checkReadyDraws(page);assert.deepEqual(state.collectionAlbum.art.currentAtlasIndexes,[0,1]);
  const item=state.collectionAlbum.visibleItems.find(i=>i.id.includes('026')||i.id.includes('26'))??state.collectionAlbum.visibleItems[8];
  await mark(page,'level-boundary-detail');await click(page,'collectionAlbumCard.'+item.id);await ready(page);await frames(page);
  const detailDraw=await page.evaluate(id=>window.__PROFILE__.draws.findLast(d=>d.id===id&&d.detail&&d.actualIndex>=0),item.id);assert.ok(detailDraw);checkDraw(detailDraw);assert.equal(detailDraw.actualIndex,1);result.levelDetail=detailDraw;
  await page.screenshot({path:resolve(output,result.name+'-level-detail.png')});await click(page,'collectionAlbumDetailClose');
  await pageTo(page,3);await pageTo(page,0);assert.equal((await atlasRequests(page)).length,2,'Page return reuses loaded atlases');assert.equal((await atlasRequests(page)).filter(i=>i.atlasIndex>=8).length,0,'Unvisited Masterpieces do not load');
  await mark(page,'masterpiece-entry');await tab(page,'masterpieces');state=await checkReadyDraws(page);assert.deepEqual(state.collectionAlbum.art.currentAtlasIndexes,[8]);assert.equal((await atlasRequests(page)).filter(i=>i.atlasIndex===9).length,0,'First Masterpiece page does not preload distant atlas');
  await pageTo(page,1);assert.equal((await atlasRequests(page)).filter(i=>i.atlasIndex===9).length,1,'Adjacent Masterpiece boundary prefetches second atlas');
  await mark(page,'masterpiece-boundary');await pageTo(page,2);state=await checkReadyDraws(page);assert.deepEqual(state.collectionAlbum.art.currentAtlasIndexes,[8,9]);await page.screenshot({path:resolve(output,result.name+'-masterpiece-boundary.png')});
  await pageTo(page,0);const images=await atlasRequests(page);assert.deepEqual(images.map(i=>i.atlasIndex).sort((a,b)=>a-b),[0,1,8,9]);assert.ok(images.every(i=>i.width===1000&&i.height===1000));
  await leave(page);await checkReleased(page);await enter(page,'reentry');state=await debug(page);assert.deepEqual(state.collectionAlbum.art.loadedAtlasIndexes,[0]);result.reentry=state.collectionAlbum.art;
 });
 await run('high-progress-guide-lifecycle',{highestLevel:151,reducedMotion:false,delayMs:150},async(page,result)=>{
  await enter(page);let state=await checkReadyDraws(page);assert.equal(state.collectionAlbum.pageIndex,16);assert.deepEqual(state.collectionAlbum.art.currentAtlasIndexes,[5,6]);assert.deepEqual((await atlasRequests(page)).map(i=>i.atlasIndex).sort((a,b)=>a-b),[5,6],'Default latest page resolves before requesting images');
  result.beforeGuideIds=await page.evaluate(()=>window.__TEST__.artworkImageIds());await page.screenshot({path:resolve(output,'high-progress-latest-page.png')});
  await mark(page,'guide');await click(page,'collectionAlbumGuide');await page.waitForFunction(()=>window.__TEST__.game.screen==='mechanismGuide'&&window.__TEST__.game.formalPageReady('records'));await idle(page);
  result.duringGuideIds=await page.evaluate(()=>window.__TEST__.artworkImageIds());assert.deepEqual(result.duringGuideIds,result.beforeGuideIds,'Guide keeps the same loaded atlas objects');
  await click(page,'mechanismGuideClose');await ready(page);state=await debug(page);assert.equal(state.collectionAlbum.pageIndex,16);assert.deepEqual(await page.evaluate(()=>window.__TEST__.artworkImageIds()),result.beforeGuideIds);assert.equal((await atlasRequests(page)).length,2,'Guide close reuses collection image objects');
  await leave(page);await checkReleased(page);await enter(page,'latest-reentry');state=await checkReadyDraws(page);assert.equal(state.collectionAlbum.pageIndex,16);assert.deepEqual(state.collectionAlbum.art.loadedAtlasIndexes,[5,6]);result.reentryIds=await page.evaluate(()=>window.__TEST__.artworkImageIds());assert.ok(result.reentryIds.every(id=>!result.beforeGuideIds.includes(id)),'Full page exit creates fresh atlas objects on return');
  assert.deepEqual((await atlasRequests(page)).map(i=>i.atlasIndex).sort((a,b)=>a-b),[5,5,6,6]);await leave(page);await checkReleased(page);
 });
 await run('restoration-and-red-dot',{highestLevel:11,inspiration:14,restored:['masterpiece-01']},async(page,result)=>{
  await enter(page);await mark(page,'masterpiece-restore');await tab(page,'masterpieces');let state=await checkReadyDraws(page);assert.equal(state.collectionAlbum.masterpieceTabNotificationVisible,true);
  await click(page,'collectionAlbumCard.masterpiece-02');await ready(page);const before=(await debug(page)).collectionAlbum.inspiration;
  await page.screenshot({path:resolve(output,'restoration-before.png')});await click(page,'collectionAlbumDetailPrimary');await page.waitForFunction(()=>window.__TEST__.game.save.collectionProgress.restoredMasterpieceIds.includes('masterpiece-02'));
  state=await debug(page);assert.equal(before,14);assert.equal(state.collectionAlbum.inspiration,0);assert.equal(state.collectionAlbum.masterpieceTabNotificationVisible,false);assert.equal(state.collectionAlbum.feedback,undefined);
  const detailDraw=await page.evaluate(()=>window.__PROFILE__.draws.findLast(d=>d.id==='masterpiece-02'&&d.detail&&d.actualIndex>=0));assert.ok(detailDraw);checkDraw(detailDraw);result.restoration={before,after:state.collectionAlbum.inspiration,restored:state.collectionAlbum.restoredMasterpieceIds,notification:state.collectionAlbum.masterpieceTabNotificationVisible};await page.screenshot({path:resolve(output,'restoration-after.png')});
 });
 await run('current-atlas-failure',{delayMs:30},async(page,result)=>{
  await controls(page,{failIndexes:[0]});await mark(page,'entry-failure');await click(page,'navigation.4');await page.waitForFunction(()=>window.__TEST__.game.getDebugState().collectionAlbum.art.failedAtlasIndexes.includes(0));await page.waitForFunction(()=>window.__TEST__.game.getDebugState().collectionAlbum.art.ready&&!window.__TEST__.game.navigationTransition);
  const count=(await atlasRequests(page)).length;await page.waitForTimeout(250);assert.equal((await atlasRequests(page)).length,count,'Failed image does not retry each render');assert.equal((await debug(page)).collectionAlbum.art.artworkReady,false);
  await page.screenshot({path:resolve(output,'current-atlas-failure.png')});const failedCard=(await debug(page)).collectionAlbum.visibleItems.find(i=>!i.artworkReady);assert.ok(failedCard);await click(page,'collectionAlbumCard.'+failedCard.id);await ready(page);await idle(page);await checkReadyDraws(page);assert.equal((await atlasRequests(page)).filter(i=>i.atlasIndex===0).length,2);assert.equal((await debug(page)).collectionAlbum.detailId,undefined,'Clicking failed card retries without opening or acknowledging it');
  result.afterRetry=(await debug(page)).collectionAlbum.art;await leave(page);await checkReleased(page);
 });
 await run('prefetch-failure',{delayMs:30},async(page,result)=>{
  await enter(page);await controls(page,{failIndexes:[1]});await mark(page,'prefetch-failure');await pageTo(page,1);await page.waitForFunction(()=>window.__TEST__.game.getDebugState().collectionAlbum.art.failedAtlasIndexes.includes(1));assert.equal((await debug(page)).collectionAlbum.art.artworkReady,true,'Offscreen prefetch failure leaves current page ready');
  await pageTo(page,2,{wait:false});await page.waitForTimeout(100);assert.equal((await debug(page)).collectionAlbum.art.artworkReady,false);assert.equal((await atlasRequests(page)).filter(i=>i.atlasIndex===1).length,1,'Navigation into failure waits for explicit retry');
  const failedCard=(await debug(page)).collectionAlbum.visibleItems.find(i=>!i.artworkReady);assert.ok(failedCard);await click(page,'collectionAlbumCard.'+failedCard.id);await ready(page);await idle(page);await checkReadyDraws(page);result.afterRetry=(await debug(page)).collectionAlbum.art;
 });
 await run('detail-atlas-failure',{delayMs:700},async(page,result)=>{
  await controls(page,{failIndexes:[0]});await mark(page,'detail-failure');await click(page,'navigation.4');await page.waitForFunction(()=>window.__TEST__.game.getDebugState().collectionAlbum.art.ready&&!window.__TEST__.game.navigationTransition);
  const item=(await debug(page)).collectionAlbum.visibleItems[0];await click(page,'collectionAlbumCard.'+item.id);await page.waitForFunction(()=>!!window.__TEST__.game.collectionAlbumDetailId);await page.waitForFunction(()=>window.__TEST__.game.getDebugState().collectionAlbum.art.failedAtlasIndexes.includes(0));
  assert.equal((await debug(page)).collectionAlbum.art.artworkReady,false);await page.screenshot({path:resolve(output,'detail-atlas-failure.png')});await controls(page,{delayMs:0});await click(page,'collectionAlbumArtworkRetry');await ready(page);await idle(page);await frames(page);
  const draw=await page.evaluate(id=>window.__PROFILE__.draws.findLast(d=>d.id===id&&d.detail&&d.actualIndex>=0),item.id);assert.ok(draw);checkDraw(draw);result.detail=draw;await click(page,'collectionAlbumDetailClose');await leave(page);await checkReleased(page);
 });
 await run('rapid-navigation-and-late-release',{},async(page,result)=>{
  await enter(page);await controls(page,{delayMs:500});await mark(page,'rapid');await tab(page,'masterpieces',{wait:false});await pageTo(page,2,{wait:false});await tab(page,'levels',{wait:false});await pageTo(page,2,{wait:false});await tab(page,'masterpieces',{wait:false});await ready(page);await idle(page);await checkReadyDraws(page);
  const requested=await atlasRequests(page);assert.equal(new Set(requested.map(i=>i.atlasIndex)).size,requested.length,'Rapid flips share requests');result.rapidIndexes=requested.map(i=>i.atlasIndex);
  await controls(page,{delayMs:900});await tab(page,'levels',{wait:false});await pageTo(page,5,{wait:false});const pending=await page.evaluate(()=>window.__PROFILE__.images.filter(i=>i.group==='atlas'&&!i.end));assert.ok(pending.length,'Late-release case must have pending atlas requests');
  await leave(page);await checkReleased(page);const leaveAt=await page.evaluate(()=>window.__PROFILE__.marks.find(m=>m.phase==='leave').at);result.lateImages=(await atlasRequests(page)).filter(i=>i.end>leaveAt);assert.ok(result.lateImages.length>0);assert.ok(result.lateImages.every(i=>i.released));
  await controls(page,{delayMs:0});await enter(page,'reentry');assert.deepEqual((await debug(page)).collectionAlbum.art.loadedAtlasIndexes,[0]);await checkReadyDraws(page);
 });
 report.sourceAfter=await sourceHashes();report.assetsAfter=await assetHashes();assert.deepEqual(report.sourceBefore,report.sourceAfter);assert.deepEqual(report.assetsBefore,report.assetsAfter);report.sourceUnchanged=true;report.assetsUnchanged=true;report.passed=true;
}catch(error){report.passed=false;report.error=String(error.stack??error);process.exitCode=1;}finally{await writeFile(resolve(output,'report.json'),JSON.stringify(report,null,2));await browser.close();}
