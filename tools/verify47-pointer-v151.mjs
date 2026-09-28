import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
import {createServer} from 'vite';
import {loadApi} from './native-block-repair-v143.mjs';
import {digest} from './revised-preview-validation-v160.mjs';
import {observeFormalModelTiming,replayObservedModelTiming} from './revised-model-timing-observer.mjs';
import {verifyObservedUnitPaths} from './remake41to50-pointer-path-v146.mjs';

const candidateFile=process.argv[2]??'deliverables/remake41-47-v151-20260925/candidate47-competitor-regenerated-v151-l11-u15-decisions.json';
const candidate=JSON.parse(fs.readFileSync(candidateFile));
assert.equal(candidate.level.id,47);
const formal=process.env.FORMAL==='1';
const level=candidate.level,drags=candidate.drags;
const baseline=JSON.parse(fs.readFileSync('deliverables/remake41-50-v146-20260924/baseline.json'));
const {api}=await loadApi();
const out=path.resolve('deliverables/remake41-47-v151-20260925/pointer-v151-47-'+Date.now());
fs.mkdirSync(out,{recursive:true});
const viewport={width:496,height:1078};
const report={candidate:path.resolve(candidateFile),candidateSha256:digest(fs.readFileSync(candidateFile)),levelSha256:digest(level),routeSha256:digest(drags),ruleVersion:'1.51.0',scope:[47],candidateInjected:!formal,formalDataValidated:formal,formalAdopted:formal,naturalClock:true,clockFrozen:false,pointerReplayValidated:false,humanBlindTested:false,releaseApproved:false,viewport,rows:[],errors:[]};
const server=await createServer({root:process.cwd(),configFile:false,optimizeDeps:{noDiscovery:true,entries:[]},server:{host:'127.0.0.1',port:0,hmr:false,watch:null},logLevel:'error'});
await server.listen();
const origin=`http://127.0.0.1:${server.httpServer.address().port}`;
const browser=await chromium.launch({headless:true});
let page;
const spatial=s=>JSON.parse(JSON.stringify(Object.fromEntries(['blocks','gates','shutters','generators','queuedBlocks','cleared','complete','failed','timeFreezeSeconds'].map(k=>[k,s[k]]))));
try{
 page=await browser.newPage({viewport});
 page.on('pageerror',e=>report.errors.push(e.message));
 await page.addInitScript(()=>{window.__STORAGE_VIOLATIONS__=[];for(const m of ['getItem','setItem','removeItem','clear'])Storage.prototype[m]=function(){window.__STORAGE_VIOLATIONS__.push(m);throw Error('Persistent storage forbidden');};for(const m of ['open','deleteDatabase'])indexedDB[m]=function(){window.__STORAGE_VIOLATIONS__.push(m);throw Error('Persistent database forbidden');};});
 await page.goto(`${origin}/tools/remake41to50.html`,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__COLOR_ESCAPE__?.artReady&&window.__COLOR_ESCAPE__?.storageBaselineReady,undefined,{timeout:60000});
 const entry=await page.evaluate(({level,observe,formal})=>{const e=window.__REMAKE_FORMAL__.load(level.id,formal?undefined:level);const initial=(0,eval)('('+observe+')')();window.__COLOR_ESCAPE__.model.freezeTime=()=>{throw Error('No time booster in verification');};return {...e,initial};},{level,observe:observeFormalModelTiming.toString(),formal});
 assert.deepEqual(entry.level,level);assert.equal(entry.candidateOverlay,!formal);assert.equal(entry.formalObjectIdentity,true);
 await page.evaluate(()=>{const game=window.__COLOR_ESCAPE__,original=game.drawFormalWholeBlockAt.bind(game);window.__NATIVE_DRAW_AUDIT__={calls:0,rotated:0,canvasRotationCalls:0,shapes:[]};game.drawFormalWholeBlockAt=function(image,match,...args){const a=window.__NATIVE_DRAW_AUDIT__;a.calls++;if(match.quarterTurns!==0)a.rotated++;if(!a.shapes.includes(match.shapeId))a.shapes.push(match.shapeId);const rotate=game.ctx.rotate;game.ctx.rotate=function(angle){if(angle!==0)a.canvasRotationCalls++;return rotate.call(this,angle);};try{return original(image,match,...args);}finally{game.ctx.rotate=rotate;};};});
 const state=()=>page.evaluate(()=>window.__COLOR_ESCAPE__.getDebugState());
 const stable=()=>page.waitForFunction(()=>{const g=window.__COLOR_ESCAPE__,d=g?.getDebugState();return d?.puzzle?.started&&!g.revisedArtLoading&&d.art.formalGameplay.requestedBlockSignature==null&&d.art.formalGameplay.missingWholeBlockIds.length===0&&!g.hasInitialRevisedRegionPresentation()&&!g.hasActiveMechanicMotion()&&!d.exitAnimations.length&&!d.revisedMechanismAnimations.length&&!d.generatorSpawnAnimations.length;},undefined,{timeout:30000});
 await stable();
 const initial=await state();assert.deepEqual(initial.starTargets,baseline.levels[46].starTargets);assert.deepEqual(initial.art.formalGameplay.missingWholeBlockIds,[]);
 const row={id:47,status:'running',steps:[],opening:initial.puzzle,levelSha256:digest(level),routeSha256:digest(drags)};report.rows.push(row);
 const probeBefore=initial.puzzle.remainingSeconds;await page.waitForTimeout(220);const probeAfter=(await state()).puzzle.remainingSeconds;assert(probeAfter<probeBefore);row.naturalClockProbe={before:probeBefore,after:probeAfter};
 for(const [index,drag]of drags.entries()){
  await stable();const s=await state(),before=s.puzzle,b=before.blocks.find(b=>b.id===drag.blockId);assert(b&&!before.failed,`step ${index+1}`);
  const rect=await page.locator('canvas').boundingBox(),[gx,gy]=b.shape[0],t=s.viewportTransform;
  const move=async(x,y)=>page.mouse.move(rect.x+t.offsetX+(s.board.innerX+x*s.board.cell)*t.scale,rect.y+t.offsetY+(s.board.innerY+y*s.board.cell)*t.scale,{steps:1});
  await move(b.x+gx+.5,b.y+gy+.5);await page.mouse.down();
  for(const [x,y]of drag.path)await move(x+gx+.5,y+gy+.5);
  if(drag.exitSide){const [x,y]=drag.path.at(-1)??[b.x,b.y],[dx,dy]={left:[-.8,0],right:[.8,0],top:[0,-.8],bottom:[0,.8]}[drag.exitSide];await move(x+gx+.5+dx,y+gy+.5+dy);}
  await page.mouse.up();await stable();const after=(await state()).puzzle;
  const expected=api.replayRevisedRoute(level,drags.slice(0,index+1));assert(expected.valid,expected.error);assert.deepEqual(spatial(after),spatial(JSON.parse(expected.finalStateKey)),`Pointer step ${index+1}`);assert.equal(after.moves,before.moves+1);assert(after.remainingSeconds<=before.remainingSeconds);
  row.steps.push({step:index+1,blockId:drag.blockId,clears:after.cleared-before.cleared,moves:after.moves,remainingSeconds:after.remainingSeconds});
 }
 const final=(await state()).puzzle;assert(final.complete&&!final.failed&&final.remainingSeconds>0);
 const timing=await page.evaluate(()=>window.__FORMAL_MODEL_TIMING__.read());
 row.naturalTimingReplay=replayObservedModelTiming(level,timing,api);fs.writeFileSync(path.join(out,'lv47-observed-timing.json'),JSON.stringify(timing,null,2));
 row.pointerPath=verifyObservedUnitPaths(drags,timing);row.final=final;row.nonClearingDrags=row.steps.filter(s=>s.clears===0).length;row.nativeDrawAudit=await page.evaluate(()=>window.__NATIVE_DRAW_AUDIT__);assert(row.nativeDrawAudit.calls>0);assert.equal(row.nativeDrawAudit.rotated,0);assert.equal(row.nativeDrawAudit.canvasRotationCalls,0);assert.deepEqual(await page.evaluate(()=>window.__STORAGE_VIOLATIONS__),[]);row.status='PASS';
 report.status='PASS';report.pointerReplayValidated=true;report.rows[0]=row;
}catch(error){report.status='FAIL';report.error=String(error.stack??error);if(page)report.lastState=await page.evaluate(()=>window.__COLOR_ESCAPE__?.getDebugState()).catch(()=>null);process.exitCode=1;}
finally{report.output=out;fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));await browser.close();await server.close();}
console.log(JSON.stringify({output:out,status:report.status,error:report.error,rows:report.rows.map(r=>({id:r.id,status:r.status,drags:r.final?.moves,nonClearingDrags:r.nonClearingDrags,remainingSeconds:r.final?.remainingSeconds,naturalTiming:r.naturalTimingReplay?.passed,pointer:r.pointerPath?.passed}))}));
