import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';
import { build } from 'esbuild';
import { chromium } from 'playwright';

// Isolated MemoryHost; production draw/Pointer/RAF without persistent saves.
const root = process.cwd();
const output = resolve('playtest-results', `feature-lock-hint-20261013-${Date.now()}`);
await mkdir(output, { recursive: true });
const script = `
import {ColorEscapeGame} from './src/game/ColorEscapeGame.ts';
import {WebHost} from './src/platform/WebHost.ts';
const initial={schemaVersion:1,currentLevel:1,highestLevel:1,coins:240,language:'zh-CN',sound:false,music:false,haptic:false,reducedMotion:false,
 collectionIntroShown:true,collectionIntroPending:false,featureSeen:['basics'],boosterUnlockSeen:['time','rocket','pulse'],rewardedLevels:[],bestStars:{}};
const writes=[],frames=[];
class MemoryHost extends WebHost {
 data=structuredClone(initial);
 storageRead(){return {status:'ok',value:structuredClone(this.data)}}
 storageGet(k,f){return this.data??f}
 storageSet(k,v){this.data=structuredClone(v);writes.push(structuredClone(v));return true}
 sound(){}music(){}vibrate(){}
 resolveLeaderboardProvince(){return Promise.resolve(undefined)}
}
const host=new MemoryHost(),game=new ColorEscapeGame(host);window.__COLOR_ESCAPE__=game;
const originalDraw=game.drawFeatureLockFeedback;
game.drawFeatureLockFeedback=function(){
 const ctx=this.ctx,originalImage=ctx.drawImage,originalLabel=this.label;
 const frame={at:performance.now(),age:this.featureLockFeedback?.age,images:[],labels:[]};
 ctx.drawImage=function(image,...params){
  const rect=params.length===8?params.slice(4):params.length===4?params:[params[0],params[1],image.width,image.height];
  frame.images.push({src:image.src,rect,width:image.width,height:image.height,alpha:this.globalAlpha,transform:Array.from([this.getTransform().a,this.getTransform().d,this.getTransform().e,this.getTransform().f])});
  return originalImage.call(this,image,...params);
 };
 this.label=function(text,x,y,size,fill,align,...rest){frame.labels.push({text,x,y,size,fill,align});return originalLabel.call(this,text,x,y,size,fill,align,...rest)};
 try{return originalDraw.call(this)}finally{ctx.drawImage=originalImage;this.label=originalLabel;frames.push(frame)}
};
window.__HINT__={host,frames,prepare(){
 game.screen='home';game.startupEntryPending=false;game.profilePage=undefined;game.collectionIntro=undefined;
 game.collectionRestorationGuide=undefined;game.featureUnlockGuide=undefined;game.boosterUnlockGuide=undefined;game.boosterUnlockToast=undefined;
 game.journeyPresentation=undefined;game.navigationTransition=undefined;game.navigationPendingTarget=undefined;game.homeCoinFlight=undefined;
 game.updateToastVisible=false;game.featureLockFeedback=undefined;game.dirty=true;game.scheduleFrame();
 return game.getDebugState();
},state(){return {debug:game.getDebugState(),save:structuredClone(game.save),writes:structuredClone(writes),frames:structuredClone(frames)}}};game.start();`;
const bundle=await build({stdin:{contents:script,resolveDir:root,sourcefile:'isolated-feature-lock-hint.ts',loader:'ts'},bundle:true,write:false,format:'esm',platform:'browser',target:'es2022',metafile:true});
const sha=data=>createHash('sha256').update(data).digest('hex');
const inputs=[...Object.keys(bundle.metafile.inputs).filter(f=>f!=='isolated-feature-lock-hint.ts'),'tools/playtest-feature-lock-hint.mjs'];
const bindings=async()=>Object.fromEntries(await Promise.all(inputs.map(async f=>[f,sha(await readFile(f))])));
const report={status:'RUNNING',scope:'Synthetic locked Lv1 progress in MemoryHost; actual Pointer and natural RAF; no real player storage, gameplay completion or WeChat device validation.',sources:await bindings(),cases:[],errors:[],failedRequests:[]};
const html='<!doctype html><meta charset="utf-8"><link rel="icon" href="data:,"><style>html,body{margin:0;overflow:hidden}canvas{width:100vw;height:100vh;display:block;touch-action:none}</style><script type="module" src="/fixture.js"></script>';
const server=createServer(async(req,res)=>{
 try{
  if(req.url==='/fixture'){res.setHeader('Content-Type','text/html');res.end(html);return}
  if(req.url==='/fixture.js'){res.setHeader('Content-Type','text/javascript');res.end(bundle.outputFiles[0].contents);return}
  const path=resolve('public','.'+decodeURIComponent((req.url??'').split('?')[0]));
  if(!path.startsWith(resolve('public')+sep)){res.statusCode=403;res.end();return}
  res.setHeader('Content-Type',({'.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.mp3':'audio/mpeg','.wav':'audio/wav'})[extname(path)]??'application/octet-stream');res.end(await readFile(path));
 }catch(error){res.statusCode=404;res.end();report.failedRequests.push({url:req.url,error:error.message})}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true}),origin='http://127.0.0.1:'+server.address().port;
const checkpoint=()=>writeFile(resolve(output,'report.json'),JSON.stringify(report,null,2)+'\n');
const state=page=>page.evaluate(()=>window.__HINT__.state());
try{
 for(const viewport of [{width:320,height:568},{width:496,height:1078}]){
  const context=await browser.newContext({viewport,deviceScaleFactor:1,timezoneId:'Asia/Shanghai'}),page=await context.newPage();
  page.on('pageerror',e=>report.errors.push(e.message));
  await page.addInitScript(()=>{window.__storageCalls=[];for(const m of ['getItem','setItem','removeItem','clear'])Storage.prototype[m]=function(){window.__storageCalls.push(m);throw Error('native storage forbidden')};for(const m of ['open','deleteDatabase'])indexedDB[m]=function(){window.__storageCalls.push(m);throw Error('native storage forbidden')}});
  await page.goto(origin+'/fixture');await page.waitForFunction(()=>window.__COLOR_ESCAPE__?.artReady,undefined,{timeout:30000});
  await page.evaluate(()=>window.__HINT__.prepare());await page.waitForTimeout(300);
  const before=await state(page),row={name:viewport.width+'x'+viewport.height,status:'RUNNING'};report.cases.push(row);
  assert.equal(before.debug.screen,'home');
  const target=before.debug.interactionTargets.targets['navigation.3']?.hit;assert(target,'missing Journey Pointer target');
  const box=await page.locator('canvas').boundingBox(),t=before.debug.viewportTransform;
  row.pointer={x:box.x+t.offsetX+(target.x+target.width/2)*t.scale,y:box.y+t.offsetY+(target.y+target.height/2)*t.scale};
  await page.mouse.click(row.pointer.x,row.pointer.y,{delay:12});
  await page.waitForFunction(()=>window.__HINT__.frames.some(f=>f.images.length&&f.labels.length),undefined,{timeout:5000});
  const shown=await state(page);row.frame=shown.frames.at(-1);row.feature=shown.debug.featureLockFeedback;
  assert.equal(row.feature?.feature,'levels');assert.equal(row.frame.images.length,1,'must draw one whole supplied hint image');
  const image=row.frame.images[0],label=row.frame.labels[0],[x,y,w,h]=image.rect;
  assert(image.src.endsWith('/assets/art/ui/formal-pages/supplied-popups-v1/scene/locked-hint-panel.png'),'must draw supplied formal panel');
  assert.equal(image.width,478);assert.equal(image.height,57);assert(Math.abs(w/h-478/57)<1e-6,'must preserve supplied aspect ratio');
  assert.equal(label.text,'通关第10关解锁');assert.equal(label.align,'center');
  assert(Math.abs(label.x-(x+w/2))<0.1,'text must be horizontally centered');assert(Math.abs(label.y-(y+h/2))<0.1,'text must be vertically centered');
  row.screenshot=resolve(output,row.name+'-hint.png');await page.screenshot({path:row.screenshot});row.screenshotSha256=sha(await readFile(row.screenshot));
  await page.waitForFunction(()=>!window.__COLOR_ESCAPE__.featureLockFeedback,undefined,{timeout:4000});
  const after=await state(page);assert.equal(after.debug.screen,'home');assert.deepEqual(after.save,before.save);assert.equal(after.writes.length,before.writes.length);
  row.storageCalls=await page.evaluate(()=>window.__storageCalls);assert.deepEqual(row.storageCalls,[]);row.status='PASS';await checkpoint();await context.close();
 }
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.failedRequests,[]);report.sourcesAfter=await bindings();assert.deepEqual(report.sourcesAfter,report.sources,'source changed during capture');report.status='PASS';await checkpoint();console.log(JSON.stringify({status:report.status,cases:report.cases.length,output}));
}catch(error){report.status='FAIL';report.error=error.stack;await checkpoint();console.log(output);throw error}
finally{await browser.close();await new Promise(r=>server.close(r))}
