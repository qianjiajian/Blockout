import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {createServer} from 'vite';
import {chromium} from 'playwright';

const output=resolve('playtest-results/level10-pulse-stock-20261009');
await mkdir(output,{recursive:true});
const sourceSha=createHash('sha256').update(await readFile('src/game/ColorEscapeGame.ts')).digest('hex');
const fixture=`<!doctype html><meta charset="utf-8"><link rel="icon" href="data:,"><style>html,body{margin:0;overflow:hidden}canvas{width:100vw;height:100vh;display:block;touch-action:none}</style><script type="module">
import {ColorEscapeGame} from '/src/game/ColorEscapeGame.ts';
import {WebHost} from '/src/platform/WebHost.ts';
const initial={schemaVersion:1,currentLevel:10,highestLevel:10,coins:1000,language:'zh-CN',sound:false,music:false,haptic:false,reducedMotion:true,
 collectionIntroShown:true,featureSeen:['basics'],boosterUnlockSeen:['time','rocket','pulse'],boosterUsageSeen:['time','rocket','pulse'],
 lifeState:{lives:5,nextLifeAtMs:0,unlimitedLivesUntilMs:0},boosters:{time:3,rocket:3,pulse:3},rewardedLevels:[1,2,3,4,5,6,7,8,9]};
class MemoryHost extends WebHost {data=structuredClone(initial);storageRead(){return{status:'ok',value:structuredClone(this.data)}}storageGet(k,f){return this.data??f}storageSet(k,v){this.data=structuredClone(v);return true}music(){}sound(){}vibrate(){}}
const host=new MemoryHost(),game=new ColorEscapeGame(host);window.__COLOR_ESCAPE__=game;window.__TEST__={host,counts:{}};
const draw=game.drawBooster;game.drawBooster=function(rect,index,count,active,kind){window.__TEST__.counts[kind]=count;return draw.call(this,rect,index,count,active,kind)};
game.start();</script>`;
const server=await createServer({configFile:false,optimizeDeps:{noDiscovery:true,entries:[]},plugins:[{name:'pulse-fixture',configureServer(s){s.middlewares.use((req,res,next)=>{if(req.url==='/pulse-fixture'){res.setHeader('Content-Type','text/html');res.end(fixture)}else next()})}}],server:{host:'127.0.0.1',port:0,hmr:false,watch:null},logLevel:'error'});
await server.listen();
const browser=await chromium.launch({headless:true}),rows=[],errors=[];
const state=p=>p.evaluate(()=>({stock:window.__COLOR_ESCAPE__.save.boosters.pulse,stored:window.__TEST__.host.data.boosters.pulse,reserved:window.__COLOR_ESCAPE__.save.activeRun?.boosterSpent.pulse??0,displayed:window.__TEST__.counts.pulse,screen:window.__COLOR_ESCAPE__.screen}));
async function click(p,key){const s=await p.evaluate(()=>window.__COLOR_ESCAPE__.getDebugState()),r=s.interactionTargets.targets[key]?.hit;assert(r,key);const b=await p.locator('canvas').boundingBox();await p.mouse.click(b.x+s.viewportTransform.offsetX+(r.x+r.width/2)*s.viewportTransform.scale,b.y+s.viewportTransform.offsetY+(r.y+r.height/2)*s.viewportTransform.scale);}
async function enter(p,atOne=false){await p.evaluate(one=>{const g=window.__COLOR_ESCAPE__;g.loadLevel(10,true);g.model.startCountdown();if(one)g.model.thawAll(24);g.dirty=true;g.scheduleFrame()},atOne);await p.waitForFunction(()=>window.__COLOR_ESCAPE__.screen==='playing'&&window.__TEST__.counts.pulse===3);}
try {
 for(const width of [320,496]){
  const context=await browser.newContext({viewport:{width,height:width===320?568:1078}}),p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));
  await p.addInitScript(()=>{Storage.prototype.getItem=()=>{throw Error('No persistent storage in fixture')};Storage.prototype.setItem=()=>{throw Error('No persistent storage in fixture')}});
  await p.goto('http://127.0.0.1:'+server.httpServer.address().port+'/pulse-fixture');await p.waitForFunction(()=>window.__COLOR_ESCAPE__?.artReady);
  await enter(p,true);await p.screenshot({path:resolve(output,'before-'+width+'.png')});
  await click(p,'booster.pulse');await p.waitForFunction(()=>window.__TEST__.counts.pulse===2);
  const after=await state(p);assert.equal(after.stock,3);assert.equal(after.stored,3);assert.equal(after.reserved,1);
  await p.screenshot({path:resolve(output,'after-'+width+'.png')});
  // Explicit synthetic completion fixture; this does not claim a solved route.
  const settlement=await p.evaluate(()=>{const g=window.__COLOR_ESCAPE__;while(!g.model.snapshot().complete){const b=g.model.snapshot().blocks.find(b=>g.model.isBlockActive(b));if(!b)throw Error('No active completion fixture block');g.model.beginAction();g.model.removeBlockWithBooster(b.id);g.model.commitAction()}return{first:g.createPendingSettlement().candidateSave.boosters.pulse,second:g.createPendingSettlement().candidateSave.boosters.pulse,baseline:g.save.boosters.pulse}});
  assert.deepEqual(settlement,{first:2,second:2,baseline:3});
  await enter(p);assert.equal((await state(p)).reserved,0);
  for(let n=2;n>=0;n--){await click(p,'booster.pulse');await p.waitForFunction(n=>window.__TEST__.counts.pulse===n,n)}
  const depleted=await state(p);assert.equal(depleted.stock,3);assert.equal(depleted.reserved,3);
  await p.screenshot({path:resolve(output,'depleted-'+width+'.png')});await click(p,'booster.pulse');await p.waitForFunction(()=>window.__COLOR_ESCAPE__.screen==='boosterPurchase');assert.equal((await state(p)).reserved,3);
  rows.push({width,status:'PASS',after,settlement,depleted,emptyOpensPurchase:true});await context.close();
 }
 assert.deepEqual(errors,[]);
 await writeFile(resolve(output,'report.json'),JSON.stringify({status:'PASS',sourceSha,scope:'Isolated MemoryHost; real Pointer clicks; synthetic frozen-one and completion fixtures; no real player save',rows,errors},null,2));
 console.log('PASS Lv10 pulse stock: dual viewport, 3→2→0, restart, no overuse, settlement once');
}catch(e){await writeFile(resolve(output,'report.json'),JSON.stringify({status:'FAIL',sourceSha,rows,errors,error:String(e)},null,2));throw e}finally{await browser.close();await server.close()}
