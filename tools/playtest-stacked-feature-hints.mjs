import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';
import { build } from 'esbuild';
import { chromium } from 'playwright';

// Actual production Canvas / Pointer / RAF against synthetic MemoryHost data.
// Existing application tabs and persistent player storage are never opened.
const root = process.cwd();
const output = resolve('playtest-results', `stacked-feature-hints-20261013-${Date.now()}`);
await mkdir(output, { recursive: true });
const script = `
import {ColorEscapeGame} from './src/game/ColorEscapeGame.ts';
import {WebHost} from './src/platform/WebHost.ts';
const initial={schemaVersion:1,currentLevel:1,highestLevel:1,coins:240,language:'zh-CN',sound:false,music:false,haptic:false,reducedMotion:false,
 collectionIntroShown:true,collectionIntroPending:false,featureSeen:['basics'],boosterUnlockSeen:['time','rocket','pulse'],rewardedLevels:[],bestStars:{}};
const writes=[],frames=[],claims=[],ids=new WeakMap();let nextId=1;
const idFor=item=>{if(!ids.has(item))ids.set(item,nextId++);return ids.get(item)};
class MemoryHost extends WebHost {
 data=structuredClone(initial);
 storageRead(){return {status:'ok',value:structuredClone(this.data)}}
 storageGet(k,f){return this.data??f}
 storageSet(k,v){this.data=structuredClone(v);writes.push(structuredClone(v));return true}
 sound(){}music(){}vibrate(){}
 resolveLeaderboardProvince(){return Promise.resolve(undefined)}
}
const host=new MemoryHost(),game=new ColorEscapeGame(host);window.__COLOR_ESCAPE__=game;
const entries=()=>game.featureLockFeedbacks.map(entry=>({id:idFor(entry),...entry}));
const originalRequire=game.requireFeature;
game.requireFeature=function(feature){const before=entries(),result=originalRequire.call(this,feature);claims.push({at:performance.now(),feature,before,after:entries()});return result};
const originalDraw=game.drawFeatureLockFeedback;
game.drawFeatureLockFeedback=function(){
 const ctx=this.ctx,originalImage=ctx.drawImage,originalLabel=this.label;
 const frame={at:performance.now(),entries:entries(),debug:this.getDebugState().featureLockFeedbacks,images:[],labels:[]};
 ctx.drawImage=function(image,...params){
  const rect=params.length===8?params.slice(4):params.length===4?params:[params[0],params[1],image.width,image.height];
  const t=this.getTransform();frame.images.push({src:image.src,rect,width:image.width,height:image.height,alpha:this.globalAlpha,transform:[t.a,t.d,t.e,t.f]});
  return originalImage.call(this,image,...params);
 };
 this.label=function(text,x,y,size,fill,align,...rest){frame.labels.push({text,x,y,size,fill,align,alpha:this.ctx.globalAlpha});return originalLabel.call(this,text,x,y,size,fill,align,...rest)};
 try{return originalDraw.call(this)}finally{ctx.drawImage=originalImage;this.label=originalLabel;frames.push(frame)}
};
window.__HINT__={host,frames,claims,prepare(){
 game.screen='home';game.startupEntryPending=false;game.profilePage=undefined;game.collectionIntro=undefined;
 game.collectionRestorationGuide=undefined;game.featureUnlockGuide=undefined;game.boosterUnlockGuide=undefined;game.boosterUnlockToast=undefined;
 game.journeyPresentation=undefined;game.navigationTransition=undefined;game.navigationPendingTarget=undefined;game.homeCoinFlight=undefined;
 game.updateToastVisible=false;game.featureLockFeedback=undefined;game.dirty=true;game.scheduleFrame();return game.getDebugState();
},state(){return {debug:game.getDebugState(),save:structuredClone(game.save),writes:structuredClone(writes),frames:structuredClone(frames),claims:structuredClone(claims),entries:entries()}}};game.start();`;
const bundle=await build({stdin:{contents:script,resolveDir:root,sourcefile:'isolated-stacked-feature-hints.ts',loader:'ts'},bundle:true,write:false,format:'esm',platform:'browser',target:'es2022',metafile:true});
const sha=data=>createHash('sha256').update(data).digest('hex');
const inputs=[...Object.keys(bundle.metafile.inputs).filter(f=>f!=='isolated-stacked-feature-hints.ts'),'tools/playtest-stacked-feature-hints.mjs'];
const bindings=async()=>Object.fromEntries(await Promise.all(inputs.map(async f=>[f,sha(await readFile(f))])));
const h=392*57/478,pitch=h*36/34,gap=h*8/34,speed=h*120/34,anchor=431.2;
const report={status:'RUNNING',scope:'Synthetic locked Lv1 progress in isolated MemoryHost; actual Pointer and natural RAF; no real player storage, gameplay completion or WeChat device validation.',geometry:{h,pitch,gap,speed,anchor},sources:await bindings(),cases:[],errors:[],failedRequests:[]};
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
const near=(actual,expected,message,tolerance=0.02)=>assert(Math.abs(actual-expected)<=tolerance,message+': '+actual+' vs '+expected);
try{
 for(const viewport of [{width:320,height:568},{width:496,height:1078}]){
  const context=await browser.newContext({viewport,deviceScaleFactor:1,timezoneId:'Asia/Shanghai',recordVideo:{dir:output,size:viewport}}),page=await context.newPage();
  page.on('pageerror',e=>report.errors.push(e.message));
  await page.addInitScript(()=>{window.__storageCalls=[];for(const m of ['getItem','setItem','removeItem','clear'])Storage.prototype[m]=function(){window.__storageCalls.push(m);throw Error('native storage forbidden')};for(const m of ['open','deleteDatabase'])indexedDB[m]=function(){window.__storageCalls.push(m);throw Error('native storage forbidden')}});
  await page.goto(origin+'/fixture');await page.waitForFunction(()=>window.__COLOR_ESCAPE__?.artReady,undefined,{timeout:30000});
  await page.evaluate(()=>window.__HINT__.prepare());await page.waitForTimeout(250);
  const before=await state(page),row={name:viewport.width+'x'+viewport.height,status:'RUNNING',screenshots:[]};report.cases.push(row);assert.equal(before.debug.screen,'home');
  const box=await page.locator('canvas').boundingBox(),t=before.debug.viewportTransform;
  const point=key=>{const r=before.debug.interactionTargets.targets[key]?.hit;assert(r,'missing Pointer target '+key);return{x:box.x+t.offsetX+(r.x+r.width/2)*t.scale,y:box.y+t.offsetY+(r.y+r.height/2)*t.scale}};
  const points=[point('navigation.3'),point('navigation.3'),point('navigation.3'),point('navigation.0')],started=Date.now();row.pointer=points;
  for(let i=0;i<points.length;i++){
   await page.waitForTimeout(Math.max(0,started+i*620-Date.now()));await page.mouse.click(points[i].x,points[i].y,{delay:12});
   await page.waitForFunction(n=>window.__HINT__.claims.length>=n,i+1,{timeout:3000});
   if(i===2){await page.waitForTimeout(30);const path=resolve(output,row.name+'-three-entering.png');await page.screenshot({path});row.screenshots.push(path)}
  }
  await page.waitForTimeout(160);const entering=resolve(output,row.name+'-mixed-entering.png');await page.screenshot({path:entering});row.screenshots.push(entering);
  await page.waitForFunction(()=>window.__HINT__.state().entries.length===0,undefined,{timeout:6000});
  const after=await state(page);row.claims=after.claims;row.frames=after.frames;assert.equal(after.claims.length,4);assert.deepEqual(after.claims.map(c=>c.feature),['levels','levels','levels','supply']);
  const expected=new Map();
  for(const [index,claim]of after.claims.entries()){
   const added=claim.after.filter(item=>!claim.before.some(previous=>previous.id===item.id));assert.equal(added.length,1,'each Pointer click appends one independent hint');
   const entry=added[0];expected.set(entry.id,{feature:claim.feature,born:claim.at});near(entry.age,0,'new hint age');near(entry.offsetY,index===0?0:pitch+gap,'birth offset includes approach gap');
   for(const previous of claim.before){const retained=claim.after.find(item=>item.id===previous.id);assert(retained,'older hint was replaced');near(retained.age,previous.age,'adding hint must not reset age');near(retained.offsetY,previous.offsetY,'new hint must not teleport old hint');near(retained.settledAge,previous.settledAge,'adding hint must not reset dwell')}
  }
  const histories=new Map();let maxVisible=0;
  for(const frame of after.frames){
   assert.equal(frame.entries.length,frame.images.length,'each active hint draws one supplied whole panel');assert.equal(frame.labels.length,frame.entries.length,'each active hint draws its own text');assert.equal(frame.debug.length,frame.entries.length);
   maxVisible=Math.max(maxVisible,frame.entries.length);
   for(let i=0;i<frame.entries.length;i++){
    const entry=frame.entries[i],image=frame.images[i],label=frame.labels[i],[x,y,w,height]=image.rect;
    assert(image.src.endsWith('/assets/art/ui/formal-pages/supplied-popups-v1/scene/locked-hint-panel.png'));near(x,52,'horizontal position');near(w,392,'width');near(height,h,'height');near(y+h/2,anchor+entry.offsetY,'entry vertical position');
    near(label.x,x+w/2,'horizontal text center');near(label.y,y+h/2,'vertical text center');near(label.alpha,1,'text must stay fully opaque');assert.equal(label.align,'center');assert.equal(label.text,entry.feature==='levels'?'通关第10关解锁':'通关第8关解锁');
    assert(image.alpha>=0&&image.alpha<=1);if(entry.settledAge<1.49)near(image.alpha,1,'background hold');
    if(!histories.has(entry.id))histories.set(entry.id,[]);histories.get(entry.id).push({at:frame.at,...entry,imageAlpha:image.alpha,y});
   }
  }
  assert(maxVisible>=3,'repeated and mixed hints must be simultaneously visible');assert.equal(histories.size,4,'all hints must draw');row.maxVisible=maxVisible;
  for(const[id,history]of histories){
   for(let i=1;i<history.length;i++){assert(history[i].age>=history[i-1].age,'age reset for hint '+id);assert(history[i].offsetY<=history[i-1].offsetY+0.01,'hint moved downward');assert(history[i].settledAge>=history[i-1].settledAge,'dwell reset')}
   assert(history.some(item=>item.imageAlpha<0.98),'hint must fade its panel independently');assert(history.some(item=>item.settledAge>=1.8),'hint must retain independent dwell');
   if(id!==after.claims[0].after[0].id){assert(history.some(item=>item.offsetY>pitch),'arrival must retain visible approach gap');assert(history.some(item=>item.offsetY<=0.01),'new hint must reach anchor')}
  }
  // Before the second hint touches the stack the first stays at the anchor;
  // once it contacts, both move upward at the declared constant speed.
  const firstId=after.claims[0].after[0].id,secondId=after.claims[1].after.at(-1).id;
  const approach=after.frames.filter(frame=>{const second=frame.entries.find(e=>e.id===secondId);return second&&second.offsetY>pitch+0.1});assert(approach.length,'record approach phase');
  for(const frame of approach)near(frame.entries.find(e=>e.id===firstId).offsetY,0,'old row waits until contact');
  const pushed=after.frames.find(frame=>{const second=frame.entries.find(e=>e.id===secondId),first=frame.entries.find(e=>e.id===firstId);return second&&first&&second.offsetY>0.1&&second.offsetY<pitch-0.1&&first.offsetY<0});assert(pushed,'record contact push phase');
  near(pushed.entries.find(e=>e.id===secondId).offsetY-pushed.entries.find(e=>e.id===firstId).offsetY,pitch,'contact pitch');
  const secondHistory=histories.get(secondId);for(let i=1;i<secondHistory.length;i++){const a=secondHistory[i-1],b=secondHistory[i];if(a.offsetY>0&&b.offsetY>0&&b.age>a.age)near((a.offsetY-b.offsetY)/(b.age-a.age),speed,'constant arrival speed',0.05)}
  assert.equal(after.debug.screen,'home');assert.deepEqual(after.save,before.save);assert.equal(after.writes.length,before.writes.length);row.storageCalls=await page.evaluate(()=>window.__storageCalls);assert.deepEqual(row.storageCalls,[]);
  const ended=resolve(output,row.name+'-ended.png');await page.screenshot({path:ended});row.screenshots.push(ended);row.status='PASS';await context.close();row.video=await page.video().path();await checkpoint();
 }
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.failedRequests,[]);report.sourcesAfter=await bindings();assert.deepEqual(report.sourcesAfter,report.sources,'source changed during capture');report.status='PASS';await checkpoint();console.log(JSON.stringify({status:report.status,cases:report.cases.length,output}));
}catch(error){report.status='FAIL';report.error=error.stack;await checkpoint();console.log(output);throw error}
finally{await browser.close();await new Promise(r=>server.close(r))}
