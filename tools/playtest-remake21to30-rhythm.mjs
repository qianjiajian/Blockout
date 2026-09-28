import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
import {createServer} from 'vite';
import {loadApi,BASELINE,OUTPUT,checkCandidate,ruleGate,VERSION} from './remake21to30-rhythm.mjs';

import {digest} from './revised-preview-validation-v160.mjs';
import {observeFormalModelTiming,replayObservedModelTiming} from './revised-model-timing-observer.mjs';

ruleGate();
const files=process.argv.slice(2);assert(files.length,'Provide reviewed candidate JSON files');
const baseline=JSON.parse(fs.readFileSync(BASELINE)),{api,inputs}=await loadApi();
const candidates=files.map(file=>({file,data:JSON.parse(fs.readFileSync(file))}));
for(const {data}of candidates){checkCandidate(data,baseline,api);assert.deepEqual(api.LEVELS[data.level.id-1],data.level,'Formal data must already equal the reviewed candidate');}
const bindings={};
const bind=p=>bindings[p]=digest(fs.readFileSync(p));
const tree=dir=>{for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())tree(p);else bind(p);}};
tree('src');tree('public/assets/art');
for(const p of [...inputs,...files,BASELINE,'docs/rules/manifest.json','docs/mechanism-rules-v1.27.0.md','tools/remake21to30-browser.mjs','tools/remake21to30.html','tools/playtest-remake21to30-rhythm.mjs','tools/remake21to30-rhythm.mjs','tools/remake21to30-mask-floor.mjs','tools/adopt-remake21to30-rhythm.mjs','tools/revised-model-timing-observer.mjs','tools/remake21to30-adoption.mjs','tools/remake21to30-v120.mjs','tools/remake21to30-proof.mjs','tools/remake21to30-freeze-bound.mjs','tools/level21-reposition-floor.mjs','tools/revised-hidden-coverage.mjs','tools/remake21to30-counter-reference.mjs','tools/revised-opening-coverage.mjs','tools/revised-gate-span-limits.mjs'])bind(p);
const output=path.resolve(OUTPUT,`pointer-${Date.now()}`);fs.mkdirSync(output,{recursive:true});
const report={ruleVersion:'1.27.0',status:'running',bindings,rows:[],errors:[],naturalClock:true,clockFrozen:false,playerSaveTouched:false,humanBlindTested:false,releaseApproved:false};
const server=await createServer({configFile:false,optimizeDeps:{noDiscovery:true,entries:[]},server:{host:'127.0.0.1',port:0,watch:{ignored:['**/deliverables/**','**/.codex-temp/**','**/playtest-results/**']}},logLevel:'error'});
await server.listen();const origin=`http://127.0.0.1:${server.httpServer.address().port}`;
const browser=await chromium.launch({headless:true});let page;
const spatial=s=>JSON.parse(JSON.stringify(Object.fromEntries(['blocks','gates','shutters','cleared','complete','failed','timeFreezeSeconds'].map(k=>[k,s[k]]))));
try{
 for(const {file,data}of candidates){
  const {level,drags}=data,id=level.id;
  page=await browser.newPage({viewport:{width:496,height:1078}});
  page.on('pageerror',e=>report.errors.push({id,message:e.message}));
  await page.addInitScript(()=>{window.__STORAGE_VIOLATIONS__=[];for(const m of ['getItem','setItem','removeItem','clear'])Storage.prototype[m]=function(){window.__STORAGE_VIOLATIONS__.push(m);throw Error('Persistent storage forbidden');};for(const m of ['open','deleteDatabase'])indexedDB[m]=function(){window.__STORAGE_VIOLATIONS__.push(m);throw Error('Persistent database forbidden');};});
  await page.goto(`${origin}/tools/remake21to30.html`,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__COLOR_ESCAPE__?.artReady&&window.__COLOR_ESCAPE__?.storageBaselineReady,undefined,{timeout:60000});
  const entry=await page.evaluate(({id,observe})=>{const e=window.__REMAKE_FORMAL__.load(id);const initial=(0,eval)('('+observe+')')();window.__COLOR_ESCAPE__.model.freezeTime=()=>{throw Error('No time booster in verification');};return {...e,initial};},{id,observe:observeFormalModelTiming.toString()});
  assert.deepEqual(entry.level,level);assert(entry.formalObjectIdentity);
  const state=()=>page.evaluate(()=>window.__COLOR_ESCAPE__.getDebugState());
  const stable=()=>page.waitForFunction(()=>{const g=window.__COLOR_ESCAPE__,d=g?.getDebugState();return d?.puzzle?.started&&!g.revisedArtLoading&&d.art.formalGameplay.requestedBlockSignature==null&&d.art.formalGameplay.missingWholeBlockIds.length===0&&!g.hasInitialRevisedRegionPresentation()&&!g.hasActiveMechanicMotion()&&!d.exitAnimations.length&&!d.revisedMechanismAnimations.length&&!d.generatorSpawnAnimations.length;},undefined,{timeout:20000});
  await stable();const initial=await state();
  assert.deepEqual(initial.starTargets,baseline.levels[id-1].starTargets);
  assert.deepEqual(initial.art.formalGameplay.missingWholeBlockIds,[]);
  const row={id,candidate:file,levelSha256:digest(level),routeSha256:digest(drags),formalObjectIdentity:true,oldStarTargetsPreserved:true,status:'running',steps:[],opening:initial.puzzle};report.rows.push(row);
  await page.screenshot({path:path.join(output,`lv${id}-opening.png`)});
  const probeBefore=(await state()).puzzle.remainingSeconds;await page.waitForTimeout(180);const probeAfter=(await state()).puzzle.remainingSeconds;assert(probeAfter<probeBefore);row.naturalClockProbe={before:probeBefore,after:probeAfter};
  for(const [index,drag]of drags.entries()){
   await stable();const s=await state(),before=s.puzzle,b=before.blocks.find(b=>b.id===drag.blockId);assert(b&&!before.failed,`Lv${id} step ${index+1} block/time`);
   const rect=await page.locator('canvas').boundingBox(),[gx,gy]=b.shape[0],t=s.viewportTransform;
   const move=async(x,y)=>page.mouse.move(rect.x+t.offsetX+(s.board.innerX+x*s.board.cell)*t.scale,rect.y+t.offsetY+(s.board.innerY+y*s.board.cell)*t.scale,{steps:3});
   await move(b.x+gx+.5,b.y+gy+.5);await page.mouse.down();
   for(const [x,y]of drag.path)await move(x+gx+.5,y+gy+.5);
   if(drag.exitSide){const [x,y]=drag.path.at(-1)??[b.x,b.y],[dx,dy]={left:[-.8,0],right:[.8,0],top:[0,-.8],bottom:[0,.8]}[drag.exitSide];await move(x+gx+.5+dx,y+gy+.5+dy);}
   await page.mouse.up();await stable();const after=(await state()).puzzle;
   const expected=api.replayRevisedRoute(level,drags.slice(0,index+1));assert(expected.valid,expected.error);
   assert.deepEqual(spatial(after),spatial(JSON.parse(expected.finalStateKey)),`Lv${id} actual Pointer step ${index+1}`);
   assert.equal(after.moves,before.moves+1);assert(after.remainingSeconds<=before.remainingSeconds);
   row.steps.push({step:index+1,blockId:drag.blockId,clears:after.cleared-before.cleared,moves:after.moves,remainingSeconds:after.remainingSeconds});
  }
  const final=(await state()).puzzle;assert(final.complete&&!final.failed&&final.remainingSeconds>0);
  const timing=await page.evaluate(()=>window.__FORMAL_MODEL_TIMING__.read());
  row.naturalTimingReplay=replayObservedModelTiming(level,timing,api);
  fs.writeFileSync(path.join(output,`lv${id}-observed-timing.json`),JSON.stringify(timing));
  assert.deepEqual(await page.evaluate(()=>window.__STORAGE_VIOLATIONS__),[]);
  row.final=final;row.nonClearingDrags=row.steps.filter(s=>s.clears===0).length;row.storage=await page.evaluate(()=>window.__REMAKE_FORMAL__.storage());row.status='PASS';
  await page.screenshot({path:path.join(output,`lv${id}-complete.png`)});
  console.log(JSON.stringify({id,status:row.status,drags:final.moves,remainingSeconds:final.remainingSeconds,nonClearingDrags:row.nonClearingDrags}));
  await page.close();page=null;
 }
 assert.deepEqual(report.errors,[]);report.drift=Object.entries(bindings).filter(([p,h])=>digest(fs.readFileSync(p))!==h);assert.deepEqual(report.drift,[]);report.status='PASS';
}catch(error){report.status='FAIL';report.error=String(error.stack??error);if(page){report.lastState=await page.evaluate(()=>window.__COLOR_ESCAPE__?.getDebugState()).catch(()=>null);await page.screenshot({path:path.join(output,'failure.png')}).catch(()=>{});}process.exitCode=1;}
finally{await browser.close();await server.close();fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2));}
console.log(JSON.stringify({output,status:report.status,error:report.error}));
