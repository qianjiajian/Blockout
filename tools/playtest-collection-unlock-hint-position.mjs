import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';
import { build } from 'esbuild';
import { chromium } from 'playwright';

// Synthetic MemoryHost only; modal opening uses real Pointer input and RAF.
const root=process.cwd(),output=resolve('playtest-results',`collection-unlock-hint-position-20261014-${Date.now()}`);
await mkdir(output,{recursive:true});
const script=`
import {ColorEscapeGame} from './src/game/ColorEscapeGame.ts';import {WebHost} from './src/platform/WebHost.ts';
const initial={schemaVersion:1,currentLevel:6,highestLevel:6,coins:240,language:'zh-CN',sound:false,music:false,haptic:false,reducedMotion:false,
 collectionIntroShown:true,collectionIntroPending:false,featureSeen:['basics'],boosterUnlockSeen:['time','rocket','pulse'],
 featureGuideProgress:{version:1,pending:[],seen:['leaderboard','supply','levels','dailyChallenge','league']},
 rewardedLevels:[1,2,3,4,5],bestStars:{1:3,2:3,3:3,4:3,5:3},
 collectionProgress:{version:1,inspiration:0,restoredMasterpieceIds:['masterpiece-01'],seenItemIds:['level-001','level-002','level-003','level-004','level-005','masterpiece-01'],claimedMilestoneIds:[]}};
const writes=[];class MemoryHost extends WebHost {data=structuredClone(initial);storageRead(){return {status:'ok',value:structuredClone(this.data)}}storageGet(k,f){return this.data??f}storageSet(k,v){this.data=structuredClone(v);writes.push(structuredClone(v));return true}sound(){}music(){}vibrate(){}resolveLeaderboardProvince(){return Promise.resolve(undefined)}}
const host=new MemoryHost(),game=new ColorEscapeGame(host);window.__COLOR_ESCAPE__=game;
let latest;const original=game.drawCollectionAlbumDetail;
game.drawCollectionAlbumDetail=function(layout,item){const frame={id:item.id,category:item.category,title:this.collectionAlbumItemTitle(item),layout:structuredClone(layout.detail),scale:layout.artTransform.scale,labels:[],wraps:[]},label=this.label,wrap=this.wrapText;
 this.label=function(text,x,y,size,fill,align,...rest){frame.labels.push({text,x,y,size,fill,align});return label.call(this,text,x,y,size,fill,align,...rest)};
 this.wrapText=function(text,x,y,...rest){frame.wraps.push({text,x,y});return wrap.call(this,text,x,y,...rest)};
 try{return original.call(this,layout,item)}finally{this.label=label;this.wrapText=wrap;latest=frame}};
window.__POSITION__={prepare(){game.screen='home';game.startupEntryPending=false;game.collectionIntro=undefined;game.collectionRestorationGuide=undefined;game.featureUnlockGuide=undefined;game.journeyPresentation=undefined;game.navigationTransition=undefined;game.homeCoinFlight=undefined;game.updateToastVisible=false;game.dirty=true;game.scheduleFrame()},state(){return {debug:game.getDebugState(),save:structuredClone(game.save),writes:structuredClone(writes),detail:structuredClone(latest)}}};game.start();`;
const bundle=await build({stdin:{contents:script,resolveDir:root,sourcefile:'isolated-collection-unlock-hint-position.ts',loader:'ts'},bundle:true,write:false,format:'esm',platform:'browser',target:'es2022',metafile:true});
const sha=data=>createHash('sha256').update(data).digest('hex');
const inputs=[...Object.keys(bundle.metafile.inputs).filter(f=>f!=='isolated-collection-unlock-hint-position.ts'),'tools/playtest-collection-unlock-hint-position.mjs'];
const bindings=async()=>Object.fromEntries(await Promise.all(inputs.map(async f=>[f,sha(await readFile(f))])));
const report={status:'RUNNING',scope:'Synthetic Lv1–5 completed progress; isolated MemoryHost, real Pointer/RAF; no real player saves or WeChat-device validation.',sources:await bindings(),cases:[],errors:[],failedRequests:[]};
const html='<!doctype html><meta charset="utf-8"><link rel="icon" href="data:,"><style>html,body{margin:0;overflow:hidden}canvas{width:100vw;height:100vh;display:block;touch-action:none}</style><script type="module" src="/fixture.js"></script>';
const server=createServer(async(req,res)=>{try{if(req.url==='/fixture'){res.setHeader('Content-Type','text/html');res.end(html);return}if(req.url==='/fixture.js'){res.setHeader('Content-Type','text/javascript');res.end(bundle.outputFiles[0].contents);return}const path=resolve('public','.'+decodeURIComponent((req.url??'').split('?')[0]));if(!path.startsWith(resolve('public')+sep)){res.statusCode=403;res.end();return}res.setHeader('Content-Type',({'.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.mp3':'audio/mpeg','.wav':'audio/wav'})[extname(path)]??'application/octet-stream');res.end(await readFile(path))}catch(error){res.statusCode=404;res.end();report.failedRequests.push({url:req.url,error:error.message})}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({headless:true}),origin='http://127.0.0.1:'+server.address().port;
const checkpoint=()=>writeFile(resolve(output,'report.json'),JSON.stringify(report,null,2)+'\n');
const state=page=>page.evaluate(()=>window.__POSITION__.state());
const near=(a,b,label)=>assert(Math.abs(a-b)<.02,label+': '+a+' vs '+b);
async function click(page,key){const d=(await state(page)).debug,r=d.interactionTargets.targets[key]?.hit;assert(r,'missing Pointer target '+key);const b=await page.locator('canvas').boundingBox(),t=d.viewportTransform;await page.mouse.click(b.x+t.offsetX+(r.x+r.width/2)*t.scale,b.y+t.offsetY+(r.y+r.height/2)*t.scale,{delay:12});}
async function ready(page){await page.waitForFunction(()=>{const g=window.__COLOR_ESCAPE__,d=g.getDebugState();return d.screen==='records'&&d.collectionAlbum.art.ready&&d.collectionAlbum.art.artworkReady&&!g.navigationTransition&&!g.popupEntrance.active},undefined,{timeout:30000});}
async function detail(page,id){await click(page,'collectionAlbumCard.'+id);await page.waitForFunction(id=>{const g=window.__COLOR_ESCAPE__;return g.collectionAlbumDetailId===id&&!g.popupEntrance.active&&g.popupEntrance.snapshot().some(s=>s.key==='collection.detail'&&s.phase==='idle')&&g.getDebugState().collectionAlbum.art.artworkReady},id,{timeout:30000});}
async function close(page){await click(page,'collectionAlbumDetailClose');await page.waitForFunction(()=>!window.__COLOR_ESCAPE__.collectionAlbumDetailId&&!window.__COLOR_ESCAPE__.popupEntrance.active);}
try{
 for(const viewport of [{width:320,height:568},{width:496,height:1078}]){
  const context=await browser.newContext({viewport,deviceScaleFactor:1,timezoneId:'Asia/Shanghai'}),page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
  await page.addInitScript(()=>{window.__storageCalls=[];for(const m of ['getItem','setItem','removeItem','clear'])Storage.prototype[m]=function(){window.__storageCalls.push(m);throw Error('native storage forbidden')};for(const m of ['open','deleteDatabase'])indexedDB[m]=function(){window.__storageCalls.push(m);throw Error('native storage forbidden')}});
  await page.goto(origin+'/fixture');await page.waitForFunction(()=>window.__COLOR_ESCAPE__?.artReady,undefined,{timeout:30000});await page.evaluate(()=>window.__POSITION__.prepare());await page.waitForTimeout(200);
  await click(page,'navigation.4');await ready(page);const row={name:viewport.width+'x'+viewport.height,status:'RUNNING',details:[]};report.cases.push(row);
  for(const mode of ['unlocked-level','locked-level','locked-masterpiece','restored-masterpiece']){
   if(mode==='locked-level'){await click(page,'collectionAlbumNext');await ready(page)}
   if(mode==='locked-masterpiece'){await click(page,'collectionAlbumTab.masterpieces');await ready(page)}
   const id=mode==='unlocked-level'?'level-001':mode==='locked-level'?'level-010':mode==='locked-masterpiece'?'masterpiece-02':'masterpiece-01';
   await detail(page,id);const s=await state(page),d=s.detail,condition=d.labels.find(l=>mode.startsWith('locked')?l.text==='通关第 10 关解锁':l.text===(mode==='unlocked-level'?'最佳星级':'已收藏'));assert(condition,'missing condition for '+mode);
   near(condition.x,d.layout.body.x+d.layout.body.width/2,'condition remains horizontally centered');assert.equal(condition.align,'center');
   const expectedY=mode.startsWith('locked')?d.layout.body.y+90*d.scale:mode==='unlocked-level'?d.layout.artwork.y+368*d.scale:d.layout.body.y+83*d.scale;near(condition.y,expectedY,'condition Y');
   if(mode.startsWith('locked')){near((condition.y-d.layout.panel.y)/d.layout.panel.height,798/960,'unlock condition panel ratio');assert(!s.debug.interactionTargets.targets.collectionAlbumDetailPrimary,'locked condition must not show a primary action');}
   if(mode==='unlocked-level'){assert(d.labels.some(l=>l.text.includes('通关')));assert(d.labels.length>=5,'existing star requirements remain');}
   if(mode.includes('masterpiece')){assert(d.labels.some(l=>l.text.startsWith('作者')));assert(d.labels.some(l=>l.text.startsWith('年代')));}
   const screenshot=resolve(output,row.name+'-'+mode+'.png');await page.screenshot({path:screenshot});row.details.push({mode,...d,condition,screenshot,screenshotSha256:sha(await readFile(screenshot))});await close(page);
  }
  row.storageCalls=await page.evaluate(()=>window.__storageCalls);assert.deepEqual(row.storageCalls,[]);row.status='PASS';await checkpoint();await context.close();
 }
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.failedRequests,[]);report.sourcesAfter=await bindings();assert.deepEqual(report.sourcesAfter,report.sources,'source changed during capture');report.status='PASS';await checkpoint();console.log(JSON.stringify({status:report.status,cases:report.cases.length,output}));
}catch(error){report.status='FAIL';report.error=error.stack;await checkpoint();console.log(output);throw error}
finally{await browser.close();await new Promise(r=>server.close(r))}
