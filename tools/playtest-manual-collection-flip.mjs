import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { createServer } from 'vite';
import { chromium } from 'playwright';

const output = resolve(`playtest-results/manual-collection-flip-20261009-${Date.now()}`);
await mkdir(output, { recursive: true });
const errors = [], rows = [];
const fixture = `<!doctype html><meta charset="utf-8"><link rel="icon" href="data:,"><style>html,body{margin:0;overflow:hidden}canvas{width:100vw;height:100vh;display:block;touch-action:none}</style><script type="module">
import {ColorEscapeGame} from '/src/game/ColorEscapeGame.ts';
import {WebHost} from '/src/platform/WebHost.ts';
import {MASTERPIECE_COLLECTION_CATALOG, COLLECTION_PAGE_SIZE} from '/src/core/collectionCatalog.ts';
let mode='commit';const writes=[],samples=[];
const initial={schemaVersion:1,currentLevel:131,highestLevel:131,coins:240,language:'zh-CN',sound:false,music:false,haptic:false,reducedMotion:false,
 collectionIntroShown:true,collectionIntroPending:false,featureSeen:['basics'],boosterUnlockSeen:['time','rocket','pulse'],
 rewardedLevels:Array.from({length:130},(_,i)=>i+1),bestStars:{},collectionProgress:{version:1,inspiration:500,restoredMasterpieceIds:[],seenItemIds:[],claimedMilestoneIds:[]}};
class MemoryHost extends WebHost {data=structuredClone(initial);
 storageRead(){return mode.startsWith('unknown')?{status:'unavailable'}:{status:'ok',value:structuredClone(this.data)}}
 storageGet(k,f){return this.data??f}storageSet(k,v){writes.push({value:structuredClone(v),object:v,mode});if(mode==='commit'||mode==='unknown-written')this.data=structuredClone(v);return mode==='commit'}
 sound(){}music(){}vibrate(){}
}
const host=new MemoryHost(),game=new ColorEscapeGame(host);window.__COLOR_ESCAPE__=game;
window.__FLIP_TEST__={host,writes,samples,mode:m=>mode=m,prepare(index){
 const item=MASTERPIECE_COLLECTION_CATALOG[index];
 game.screen='records';game.profilePage=undefined;game.collectionIntro=undefined;game.featureUnlockGuide=undefined;game.journeyPresentation=undefined;
 game.navigationTransition=undefined;game.navigationPendingTarget=undefined;game.homeCoinFlight=undefined;game.updateToastVisible=false;
 game.collectionAlbumTab='masterpieces';game.collectionAlbumPage.masterpieces=Math.floor(index/COLLECTION_PAGE_SIZE);game.collectionAlbumDetailId=item.id;
 game.collectionAlbumFeedback=undefined;game.setFormalPageIntent('records');game.requestCollectionAlbumArtwork();game.dirty=true;game.scheduleFrame();return item;
}};
setInterval(()=>{if(game.collectionIntro?.restoration)samples.push({age:game.collectionIntro.age,ready:game.collectionIntroReady(),screen:game.screen,time:performance.now()})},20);
game.start();</script>`;
const server = await createServer({configFile:false,optimizeDeps:{noDiscovery:true,entries:[]},plugins:[{name:'collection-flip-fixture',configureServer(s){s.middlewares.use((req,res,next)=>{
 if(req.url?.startsWith('/flip-fixture')){res.setHeader('Content-Type','text/html');res.end(fixture)}else next();
})}}],server:{host:'127.0.0.1',port:0,hmr:false,watch:null},logLevel:'error'});
await server.listen();
const browser = await chromium.launch({headless:true});
const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
const state = p => p.evaluate(()=>{const g=window.__COLOR_ESCAPE__,t=window.__FLIP_TEST__,targets=g.getDebugState().interactionTargets;return {
 intro:g.getDebugState().collectionIntro,screen:g.screen,detail:g.collectionAlbumDetailId,page:g.collectionAlbumPage.masterpieces,
 inspiration:g.save.collectionProgress.inspiration,stored:structuredClone(t.host.data.collectionProgress),writes:t.writes.length,
 pending:!!g.pendingCollectionRestoration,flags:[g.save.collectionIntroPending,g.save.collectionIntroShown],
 targets:Object.keys(targets.targets??targets),samples:structuredClone(t.samples),
 }});
async function click(p,key){
 const d=await p.evaluate(()=>window.__COLOR_ESCAPE__.getDebugState()),r=(d.interactionTargets.targets??d.interactionTargets)[key]?.hit;
 assert(r,`Missing target ${key}`);const b=await p.locator('canvas').boundingBox(),t=d.viewportTransform;
 await p.mouse.click(b.x+t.offsetX+(r.x+r.width/2)*t.scale,b.y+t.offsetY+(r.y+r.height/2)*t.scale);
}
async function prepare(p,index){
 const item=await p.evaluate(i=>window.__FLIP_TEST__.prepare(i),index);
 try { await p.waitForFunction(()=>{const g=window.__COLOR_ESCAPE__;return g.collectionAlbumArt&&g.collectionAlbumArtworkReady()}); }
 catch(error) { console.log(await p.evaluate(()=>window.__COLOR_ESCAPE__.getDebugState().collectionAlbum)); throw error; }
 return item;
}
try {
 for(const [width,height,index] of [[320,568,1],[496,1078,25]]){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1}),p=await context.newPage();
  p.on('pageerror',e=>errors.push(e.message));
  await p.addInitScript(()=>{Storage.prototype.getItem=()=>{throw Error('Persistent storage forbidden')};Storage.prototype.setItem=()=>{throw Error('Persistent storage forbidden')}});
  await p.goto(origin+'/flip-fixture');await p.waitForFunction(()=>window.__COLOR_ESCAPE__?.artReady);
  const item=await prepare(p,index),before=await state(p);
  await p.screenshot({path:resolve(output,`${width}-before.png`)});
  if(width===496){
   await p.evaluate(()=>window.__FLIP_TEST__.mode('reject'));await click(p,'collectionAlbumDetailPrimary');
   let s=await state(p);assert(!s.intro.active);assert.equal(s.inspiration,before.inspiration);assert(!s.pending);
   await p.evaluate(()=>window.__FLIP_TEST__.mode('unknown-written'));await click(p,'collectionAlbumDetailPrimary');
   s=await state(p);assert(s.pending);assert(!s.intro.active);assert.equal(s.inspiration,before.inspiration);
   await p.evaluate(()=>window.__FLIP_TEST__.mode('commit'));
  }
  await click(p,'collectionAlbumDetailPrimary');let s=await state(p);
  assert(s.intro.active&&s.intro.restoration);assert.equal(s.intro.itemId,item.id);assert.equal(s.screen,'records');
  assert.equal(s.inspiration,before.inspiration-item.inspirationCost);assert(s.stored.restoredMasterpieceIds.includes(item.id));
  assert(!s.targets.includes('collectionAlbumDetailPrimary'));assert.deepEqual(s.flags,before.flags);
  await p.screenshot({path:resolve(output,`${width}-card-back.png`)});
  await p.waitForFunction(()=>window.__COLOR_ESCAPE__.collectionIntro.age>=0.6);
  await p.screenshot({path:resolve(output,`${width}-turning.png`)});
  await p.waitForFunction(()=>window.__COLOR_ESCAPE__.collectionIntroReady());
  await p.screenshot({path:resolve(output,`${width}-revealed.png`)});
  const revealed=await state(p);
  assert(revealed.samples.some(x=>x.age<0.36));assert(revealed.samples.some(x=>x.age>0.36&&x.age<0.88));
  assert.equal(revealed.intro.age,1.8);assert(revealed.samples.every(x=>x.screen==='records'));
  await click(p,width===320?'collectionIntroPrimary':'collectionIntroLater');s=await state(p);
  assert(!s.intro.active);assert.equal(s.screen,'records');assert.equal(s.detail,item.id);assert.equal(s.page,before.page);
  assert.equal(s.writes,revealed.writes);assert.equal(s.inspiration,revealed.inspiration);assert.deepEqual(s.flags,before.flags);
  assert(!s.targets.includes('collectionAlbumDetailPrimary'));await p.screenshot({path:resolve(output,`${width}-detail-after.png`)});
  rows.push({width,height,itemId:item.id,cost:item.inspirationCost,before:before.inspiration,after:s.inspiration,unknownRetry:width===496,
   naturalAgeSamples:revealed.samples,status:'PASS'});
  await context.close();
 }
 assert.deepEqual(errors,[]);
 await writeFile(resolve(output,'report.json'),JSON.stringify({status:'PASS',sourceSha:createHash('sha256').update(await readFile('src/game/ColorEscapeGame.ts')).digest('hex'),
  scope:'Synthetic MemoryHost; real mouse Pointer and natural frame time; no persistent player storage',rows,errors},null,2));
 console.log(`PASS manual collection flip: ${output}`);
}catch(e){await writeFile(resolve(output,'report.json'),JSON.stringify({status:'FAIL',rows,errors,error:String(e)},null,2));console.log(output);throw e}
finally{await browser.close();await server.close()}
