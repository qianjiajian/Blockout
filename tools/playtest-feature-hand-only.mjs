import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {createServer} from 'vite';
import {chromium} from 'playwright';

const output=resolve(process.env.FEATURE_HAND_OUTPUT??`playtest-results/feature-hand-only-20261009-${Date.now()}`);
await mkdir(output,{recursive:true});
const features=['leaderboard','supply','levels','dailyChallenge','league'],rows=[],errors=[];
const fixture=(feature,reduced)=>`<!doctype html><meta charset="utf-8"><link rel="icon" href="data:,"><style>html,body{margin:0;overflow:hidden}canvas{width:100vw;height:100vh;display:block;touch-action:none}</style><script type="module">
import {ColorEscapeGame} from '/src/game/ColorEscapeGame.ts';import {WebHost} from '/src/platform/WebHost.ts';
const features=${JSON.stringify(features)},feature=${JSON.stringify(feature)};let mode='commit';const writes=[],audit={labels:[],panels:0,hands:0};
const initial={schemaVersion:1,currentLevel:21,highestLevel:21,coins:777,language:'zh-CN',sound:false,music:false,haptic:false,reducedMotion:${reduced},
 collectionIntroShown:true,collectionIntroPending:false,boosterUnlockSeen:['time','rocket','pulse'],featureSeen:['basics'],
 rewardedLevels:Array.from({length:20},(_,i)=>i+1),bestStars:{},selectedJourneyEpisode:3,
 journeyProgress:{claimedMilestoneLevels:Array.from({length:40},(_,i)=>(i+1)*5),seenEpisodeUnlockLevels:Array.from({length:20},(_,i)=>i*10+1)},
 featureGuideProgress:{version:1,pending:[feature],seen:features.filter(f=>f!==feature)}};
class MemoryHost extends WebHost {data=structuredClone(initial);
 storageRead(){return mode.startsWith('unknown')?{status:'unavailable'}:{status:'ok',value:structuredClone(this.data)}}
 storageGet(k,f){return this.data??f}storageSet(k,v){writes.push({value:structuredClone(v),object:v,mode});if(mode==='commit'||mode==='unknown-written')this.data=structuredClone(v);return mode==='commit'}
 sound(){}music(){}vibrate(){}
}
const host=new MemoryHost(),game=new ColorEscapeGame(host);window.__COLOR_ESCAPE__=game;window.__HAND_TEST__={host,writes,audit,mode:m=>mode=m};
let drawingGuide=false;const draw=game.drawFeatureUnlockGuide;game.drawFeatureUnlockGuide=function(){drawingGuide=true;try{return draw.call(this)}finally{drawingGuide=false}};
for(const name of ['label','wrapText','drawChromePanel','drawTapGuideHand']){const method=game[name];game[name]=function(...args){if(drawingGuide){if(name==='drawChromePanel')audit.panels++;else if(name==='drawTapGuideHand')audit.hands++;else audit.labels.push(String(args[0]));}return method.apply(this,args)}}
game.start();</script>`;
const server=await createServer({configFile:false,optimizeDeps:{noDiscovery:true,entries:[]},plugins:[{name:'hand-only-fixture',configureServer(s){s.middlewares.use((req,res,next)=>{
 if(req.url?.startsWith('/hand-fixture')){const q=new URL(req.url,'http://fixture').searchParams;res.setHeader('Content-Type','text/html');res.end(fixture(q.get('feature'),q.get('reduced')==='true'));}else next();
})}}],server:{host:'127.0.0.1',port:0,hmr:false,watch:null},logLevel:'error'});
await server.listen();const browser=await chromium.launch({headless:true}),origin=`http://127.0.0.1:${server.httpServer.address().port}`;
const state=p=>p.evaluate(()=>{const g=window.__COLOR_ESCAPE__,t=window.__HAND_TEST__,d=g.getDebugState();return {screen:g.screen,guide:d.featureUnlockGuide,
 targets:d.interactionTargets.targets??d.interactionTargets,transform:d.viewportTransform,audit:structuredClone(t.audit),save:structuredClone(g.save),stored:structuredClone(t.host.data),writes:t.writes.length}});
async function point(p,x,y){const s=await state(p),b=await p.locator('canvas').boundingBox(),t=s.transform;await p.mouse.click(b.x+t.offsetX+x*t.scale,b.y+t.offsetY+y*t.scale)}
async function click(p,key){const s=await state(p),r=s.targets[key]?.hit;assert(r,`Missing ${key}`);await point(p,r.x+r.width/2,r.y+r.height/2)}
const economy=s=>JSON.stringify({coins:s.coins,boosters:s.boosters,highest:s.highestLevel,rewards:s.rewardedLevels,inspiration:s.collectionProgress.inspiration,daily:s.dailyChallenge});
try{
 for(const width of [320,496])for(const feature of features.filter(f=>!process.env.FEATURE_HAND_CASE||f===process.env.FEATURE_HAND_CASE)){
  const height=width===320?568:1078,reduced=width===496&&feature==='league';
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1}),p=await context.newPage();
  p.on('pageerror',e=>errors.push(e.message));
  await p.addInitScript(()=>{Storage.prototype.getItem=()=>{throw Error('Persistent storage forbidden')};Storage.prototype.setItem=()=>{throw Error('Persistent storage forbidden')}});
  await p.goto(origin+`/hand-fixture?feature=${feature}&reduced=${reduced}`);
  await p.waitForFunction(()=>{const g=window.__COLOR_ESCAPE__;return g?.featureUnlockGuideReady()&&g.art.tutorialHand&&window.__HAND_TEST__.audit.hands>0});
  const before=await state(p);assert.equal(before.guide.phase,'focus');assert.deepEqual(Object.keys(before.targets).filter(k=>k.startsWith('featureGuide.')),['featureGuide.entry']);
  assert.equal(before.audit.panels,0);assert.deepEqual(before.audit.labels,[]);assert(before.audit.hands>0);
  // The former explanation panel and Later button are inert.
  await point(p,248,700);await point(p,248,820);let s=await state(p);assert.equal(s.writes,before.writes);assert(s.guide.active);
  await p.screenshot({path:resolve(output,`${width}-${feature}-hand.png`)});
  if(width===496&&feature==='dailyChallenge'){
   await p.evaluate(()=>window.__HAND_TEST__.mode('reject'));await click(p,'featureGuide.entry');s=await state(p);
   assert.equal(s.guide.persistence,'rejected');assert.deepEqual(Object.keys(s.targets).filter(k=>k.startsWith('featureGuide.')),['featureGuide.retry']);assert.deepEqual(s.targets['featureGuide.retry'].hit,before.targets['featureGuide.entry'].hit);
   await p.evaluate(()=>window.__HAND_TEST__.mode('unknown-written'));await click(p,'featureGuide.retry');s=await state(p);assert.equal(s.guide.persistence,'unknown');assert.equal(s.screen,'home');
   assert.equal(s.audit.panels,0);assert.deepEqual(s.audit.labels,[]);assert.equal(economy(s.save),economy(before.save));
   await p.screenshot({path:resolve(output,`${width}-${feature}-retry-hand.png`)});
   await p.evaluate(()=>window.__HAND_TEST__.mode('commit'));await click(p,'featureGuide.retry');
  }else await click(p,'featureGuide.entry');
  await p.waitForFunction(()=>!window.__COLOR_ESCAPE__.featureUnlockGuide&&!window.__COLOR_ESCAPE__.navigationTransition);
  s=await state(p);assert.equal(s.screen,feature);assert(s.stored.featureGuideProgress.seen.includes(feature));assert(!s.stored.featureGuideProgress.pending.includes(feature));
  assert.equal(economy(s.save),economy(before.save));assert.equal(s.audit.panels,0);assert.deepEqual(s.audit.labels,[]);
  await p.screenshot({path:resolve(output,`${width}-${feature}-opened.png`)});
  rows.push({width,height,feature,reduced,status:'PASS',audit:s.audit,screen:s.screen,retry:width===496&&feature==='dailyChallenge'});await context.close();
 }
 assert.deepEqual(errors,[]);await writeFile(resolve(output,'report.json'),JSON.stringify({status:'PASS',scope:'Synthetic pending guides, isolated MemoryHost, real mouse Pointer; no persistent player storage',sourceSha:createHash('sha256').update(await readFile('src/game/ColorEscapeGame.ts')).digest('hex'),rows,errors},null,2));
 console.log(`PASS hand-only guides: ${output}`);
}catch(error){await writeFile(resolve(output,'report.json'),JSON.stringify({status:'FAIL',rows,errors,error:String(error)},null,2));console.log(output);throw error}
finally{await browser.close();await server.close()}
