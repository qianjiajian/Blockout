import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import {chromium} from 'playwright';
import {createServer} from 'vite';
import {verifyRulesLock} from '../../verify-rules-lock.mjs';
const OUTPUT='deliverables/continue221-230-20260930/formal-adoption';
const ruleGate=()=>{const r=verifyRulesLock();assert(r.ok,r.errors.join('\n'));return r;};
import {loadApi,replay} from '../../remake191-200/replay.mjs';
const VERSION=ruleGate().activeVersion;
const bombSpatialApi=api=>({replayRevisedRoute:(l,d)=>replay(l,d,api)});

import {digest} from '../../revised-preview-validation-v160.mjs';
import {observe as observeFormalModelTiming,replayTiming as replayObservedModelTiming} from '../../remake191-200/observed-timing.mjs';

import {inspectDisjoint211to220Data} from '../../continue201-210/pointer/disjoint-data-audit.mjs';
import {loadRegistry} from './registry.mjs';

ruleGate();
const candidateOnly=false;
const requiredStars=3;
if(requiredStars!==null)assert([1,2,3].includes(requiredStars));
const fixtureFile='tests/fixtures/continuation221-230-qualified.json';
const fixture=JSON.parse(fs.readFileSync(fixtureFile));
const selectedIds=process.argv.slice(2).map(Number);
assert(selectedIds.every(id=>Number.isInteger(id)&&id>=221&&id<=230));
const selected=selectedIds.length?selectedIds:Array.from({length:10},(_,i)=>221+i);
const records=selected.map(id=>{const row=fixture.find(item=>item.evidence.id===id);assert(row,'Missing reviewed route '+id);return row;});
const files=records.map(row=>row.evidence.headlessPacket);
const viewport={width:Number(process.env.REMAKE_VIEWPORT_WIDTH??496),height:Number(process.env.REMAKE_VIEWPORT_HEIGHT??1078)};
assert(Number.isInteger(viewport.width)&&viewport.width>=300&&viewport.width<=1200);
assert(Number.isInteger(viewport.height)&&viewport.height>=500&&viewport.height<=2000);
const {api,inputs}=await loadApi(),registry=await loadRegistry();
assert.equal(api.LEVELS.length,200);
const candidates=records.map(record=>{
 const file=record.evidence.headlessPacket,packet=JSON.parse(fs.readFileSync(file));
 const level=registry.api.getFormal221to230LevelStrict(record.evidence.id);
 assert.deepEqual(level,packet.level,'Formal registry object differs from reviewed packet');
 assert.deepEqual(record.drags,packet.drags,'Reviewed fixture route differs from packet');
 assert.equal(digest(level),record.evidence.levelSha256);
 assert.equal(digest(record.drags),record.evidence.routeSha256);
 const formalEvidence=registry.api.FORMAL_221_230_EVIDENCE.find(row=>row.id===level.id);
 assert(formalEvidence);assert.equal(formalEvidence.levelSha256,digest(level));assert.equal(formalEvidence.routeSha256,digest(record.drags));
 return {file,data:{level,drags:record.drags},reviewedEvidence:record.evidence,formalEvidence};
});
const requestedIds=candidates.map(c=>c.data.level.id);
assert.equal(new Set(requestedIds).size,requestedIds.length,'Duplicate levels do not count as separate validations');
const fullBatch=!candidateOnly&&requestedIds.length===10&&[...requestedIds].sort((a,b)=>a-b).every((id,i)=>id===221+i);
const sourceBindings={},sourceFiles=[],preflight=[];
for(const {data,reviewedEvidence,formalEvidence}of candidates){
 const route=replay(data.level,data.drags,api,{complete:true,requirePointerCompatible:true});
 assert(route.valid&&route.complete,route.error);assert.equal(route.nonClearingDrags,formalEvidence.U);
 preflight.push({id:data.level.id,route,reviewedEvidence,formalEvidence,formalRegistryObjectIdentity:registry.api.getFormal221to230LevelStrict(data.level.id)===data.level,
  lowerBoundRecomputed:false,scope:'Fresh complete route; unchanged lower-bound and source qualification are bound by the formal adoption audit.'});
}
const bindings={};
function bind(file){
 const absolute=path.resolve(file),p=path.relative(process.cwd(),absolute).replaceAll('\\','/');
 assert(!p.startsWith('../')&&!path.isAbsolute(p));if(Object.hasOwn(bindings,p))return;
 bindings[p]=digest(fs.readFileSync(p));
 if(/\.[cm]?[jt]s$/.test(p)){
  const parsed=ts.createSourceFile(p,fs.readFileSync(p,'utf8'),ts.ScriptTarget.Latest,true);
  for(const statement of parsed.statements){
   if(!ts.isImportDeclaration(statement)&&!ts.isExportDeclaration(statement))continue;
   const spec=statement.moduleSpecifier;
   if(spec&&ts.isStringLiteral(spec)&&/^\..*\.[cm]?[jt]s$/.test(spec.text))bind(path.resolve(path.dirname(absolute),spec.text));
  }
 }
}
const tree=dir=>{for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())tree(p);else bind(p);}};
tree('src');tree('public/assets/art');
for(const p of [...inputs,...registry.inputs,...files,...sourceFiles,fixtureFile,'docs/rules/manifest.json','docs/rules/mechanism-rules-v'+ruleGate().activeVersion+'.md','tools/continue221-230/formal-pointer/browser.mjs','tools/continue221-230/formal-pointer/index.html','tools/continue221-230/formal-pointer/run.mjs','tools/remake191-200/common.mjs'])bind(p);
const output=path.resolve(OUTPUT,`pointer-${Date.now()}-${viewport.width}x${viewport.height}-${process.pid}`);fs.mkdirSync(output,{recursive:true});
const report={candidateOnly,formalDataValidated:!candidateOnly,ruleVersion:VERSION,status:'running',scope:fullBatch?'complete-ten-level-formal-registry-batch':'explicit-formal-registry-subset',requestedIds,fullBatchValidated:false,viewport,bindings,sourceBindings,preflight,rows:[],errors:[],formalRegistry:'FORMAL_221_230_LEVELS',productionBoundary:200,testCampaignScaffold:true,productionCampaignValidated:false,naturalClock:true,clockFrozen:false,playerSaveTouched:false,humanBlindTested:false,releaseApproved:false};
// A byte-verified private snapshot prevents parallel data batches from mixing
// revisions within an input run. It is test input, not a release freeze.
const snapshotRoot=path.join(output,'source-snapshot');
for(const [p,h]of Object.entries(bindings)){const bytes=fs.readFileSync(p);assert.equal(digest(bytes),h,`Source changed during snapshot: ${p}`);const dst=path.join(snapshotRoot,p);fs.mkdirSync(path.dirname(dst),{recursive:true});fs.writeFileSync(dst,bytes);}
report.sourceSnapshot=snapshotRoot;
const server=await createServer({root:snapshotRoot,configFile:false,optimizeDeps:{noDiscovery:true,entries:[]},server:{host:'127.0.0.1',port:0,hmr:false,watch:null},logLevel:'error'});
await server.listen();const origin=`http://127.0.0.1:${server.httpServer.address().port}`;
const browser=await chromium.launch({headless:true});let page;
// Spatial comparison ignores the running deadline value only; the full timed
// observer below independently replays every tick and checks bomb values.
const spatial=s=>{const x=JSON.parse(JSON.stringify(Object.fromEntries(['blocks','gates','flipDoors','coloredGrids','shutters','generators','queuedBlocks','cleared','complete','failed','timeFreezeSeconds'].map(k=>[k,s[k]]))));for(const b of [...x.blocks,...x.queuedBlocks])if(b.timedBombSeconds!==undefined)b.timedBombSeconds='active';return x;};
try{
 for(const {file,data}of candidates){
  const {level,drags}=data,id=level.id;
  page=await browser.newPage({viewport});
  page.on('pageerror',e=>report.errors.push({id,message:e.message}));
  await page.addInitScript(()=>{window.__STORAGE_VIOLATIONS__=[];for(const m of ['getItem','setItem','removeItem','clear'])Storage.prototype[m]=function(){window.__STORAGE_VIOLATIONS__.push(m);throw Error('Persistent storage forbidden');};for(const m of ['open','deleteDatabase'])indexedDB[m]=function(){window.__STORAGE_VIOLATIONS__.push(m);throw Error('Persistent database forbidden');};});
  await page.goto(`${origin}/tools/continue221-230/formal-pointer/index.html`,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__COLOR_ESCAPE__?.artReady&&window.__COLOR_ESCAPE__?.storageBaselineReady,undefined,{timeout:60000});
  const entry=await page.evaluate(({id,observe})=>{const e=window.__REMAKE_FORMAL__.load(id);const initial=(0,eval)('('+observe+')')();window.__COLOR_ESCAPE__.model.freezeTime=()=>{throw Error('No time booster in verification');};return {...e,initial};},{id,observe:observeFormalModelTiming.toString()});
  assert.deepEqual(entry.level,level);assert(entry.formalObjectIdentity&&entry.registryObjectIdentity&&entry.formalRegistryObjectIdentity);assert.equal(entry.candidateOverlay,false);assert.equal(entry.productionBoundary,200);assert(entry.productionTargetExcludedBeforeScaffold&&entry.testCampaignScaffold);assert.equal(entry.productionCampaignObjectIdentity,false);
  await page.evaluate(()=>{
   const game=window.__COLOR_ESCAPE__,original=game.drawFormalWholeBlockAt.bind(game);
   window.__NATIVE_DRAW_AUDIT__={calls:0,rotated:0,canvasRotationCalls:0,shapes:[]};
   game.drawFormalWholeBlockAt=function(image,match,...args){
    const a=window.__NATIVE_DRAW_AUDIT__;a.calls++;if(match.quarterTurns!==0)a.rotated++;
    if(!a.shapes.includes(match.shapeId))a.shapes.push(match.shapeId);
    const rotate=game.ctx.rotate;
    game.ctx.rotate=function(angle){if(angle!==0)a.canvasRotationCalls++;return rotate.call(this,angle);};
    try{return original(image,match,...args);}finally{game.ctx.rotate=rotate;}
   };
  });
  const state=()=>page.evaluate(()=>window.__COLOR_ESCAPE__.getDebugState());
  const stable=()=>page.waitForFunction(()=>{const g=window.__COLOR_ESCAPE__,d=g?.getDebugState();return d?.puzzle?.started&&!g.revisedArtLoading&&d.art.formalGameplay.requestedBlockSignature==null&&d.art.formalGameplay.missingWholeBlockIds.length===0&&!g.hasInitialRevisedRegionPresentation()&&!g.hasActiveMechanicMotion()&&!d.exitAnimations.length&&!d.revisedMechanismAnimations.length&&!d.generatorSpawnAnimations.length;},undefined,{timeout:20000});
  await stable();const initial=await state();
  assert.deepEqual(initial.starTargets,api.levelStarTargets(level));
  assert.deepEqual(initial.art.formalGameplay.missingWholeBlockIds,[]);
  const row={id,candidate:file,levelSha256:digest(level),routeSha256:digest(drags),formalObjectIdentity:entry.formalObjectIdentity,registryObjectIdentity:entry.registryObjectIdentity,formalRegistryObjectIdentity:entry.formalRegistryObjectIdentity,candidateOverlay:false,formalDataValidated:true,formalStarTargetsValidated:true,productionBoundary:entry.productionBoundary,productionCampaignObjectIdentity:entry.productionCampaignObjectIdentity,testCampaignScaffold:entry.testCampaignScaffold,scaffold:entry.scaffold,status:'running',steps:[],opening:initial.puzzle};report.rows.push(row);
  await page.screenshot({path:path.join(output,`lv${id}-opening.png`)});
  const probeBefore=(await state()).puzzle.remainingSeconds;await page.waitForTimeout(180);const probeAfter=(await state()).puzzle.remainingSeconds;assert(probeAfter<probeBefore);row.naturalClockProbe={before:probeBefore,after:probeAfter};
  for(const [index,drag]of drags.entries()){
   await stable();const s=await state(),before=s.puzzle,b=before.blocks.find(b=>b.id===drag.blockId);assert(b&&!before.failed,`Lv${id} step ${index+1} block/time`);
   const rect=await page.locator('canvas').boundingBox(),[gx,gy]=b.shape[0],t=s.viewportTransform;
   // Each supplied route point is already one adjacent board step. One real
   // pointer event per unit avoids two redundant interpolants and keeps the
   // game clock, animation waits and original time limits fully natural.
   const move=async(x,y)=>page.mouse.move(rect.x+t.offsetX+(s.board.innerX+x*s.board.cell)*t.scale,rect.y+t.offsetY+(s.board.innerY+y*s.board.cell)*t.scale,{steps:1});
   await move(b.x+gx+.5,b.y+gy+.5);await page.mouse.down();
   for(const [x,y]of drag.path)await move(x+gx+.5,y+gy+.5);
   if(drag.exitSide){const [x,y]=drag.path.at(-1)??[b.x,b.y],[dx,dy]={left:[-.8,0],right:[.8,0],top:[0,-.8],bottom:[0,.8]}[drag.exitSide];await move(x+gx+.5+dx,y+gy+.5+dy);}
   await page.mouse.up();await stable();const after=(await state()).puzzle;
   const expected=bombSpatialApi(api).replayRevisedRoute(level,drags.slice(0,index+1));assert(expected.valid,expected.error);
   assert.deepEqual(spatial(after),spatial(JSON.parse(expected.finalStateKey)),`Lv${id} actual Pointer step ${index+1}`);
   assert.equal(after.moves,before.moves+1);assert(after.remainingSeconds<=before.remainingSeconds);
   row.steps.push({step:index+1,blockId:drag.blockId,clears:after.cleared-before.cleared,moves:after.moves,remainingSeconds:after.remainingSeconds});
   if(after.shutters.some(c=>c.revealed&&!before.shutters.find(b=>b.id===c.id)?.revealed))await page.screenshot({path:path.join(output,`lv${id}-reveal-${index+1}.png`)});
  }
  const final=(await state()).puzzle;assert(final.complete&&!final.failed&&final.remainingSeconds>0);
  const timing=await page.evaluate(()=>window.__BATCH_TIMING__.read());
  row.naturalTimingReplay=replayObservedModelTiming(level,timing,api);
  fs.writeFileSync(path.join(output,`lv${id}-observed-timing.json`),JSON.stringify(timing));
  assert.deepEqual(await page.evaluate(()=>window.__STORAGE_VIOLATIONS__),[]);
  row.nativeDrawAudit=await page.evaluate(()=>window.__NATIVE_DRAW_AUDIT__);
  assert(row.nativeDrawAudit.calls>0);assert.equal(row.nativeDrawAudit.rotated,0);assert.equal(row.nativeDrawAudit.canvasRotationCalls,0);
  row.final=final;row.nonClearingDrags=row.steps.filter(s=>s.clears===0).length;row.storage=await page.evaluate(()=>window.__REMAKE_FORMAL__.storage());
  row.settlement=(await state()).settlement;
  assert.equal(row.settlement.status,'committed');assert.equal(row.storage.save.bestMoves[String(id)],final.moves);assert.equal(row.storage.save.bestStars[String(id)],row.settlement.earnedStars);
  if(requiredStars!==null){assert.equal(row.settlement.earnedStars,requiredStars,'Actual settlement stars');assert.equal(row.settlement.starConditions.moveTarget,initial.starTargets.moveTarget);assert.equal(row.settlement.starConditions.timeTargetSeconds,initial.starTargets.timeTargetSeconds);}
  row.requiredStars=requiredStars;row.status='PASS';
  await page.screenshot({path:path.join(output,`lv${id}-complete.png`)});
  console.log(JSON.stringify({id,status:row.status,drags:final.moves,remainingSeconds:final.remainingSeconds,nonClearingDrags:row.nonClearingDrags}));
  await page.close();page=null;
 }
 assert.deepEqual(report.errors,[]);
 report.drift=Object.entries(bindings).filter(([p,h])=>digest(fs.readFileSync(path.join(snapshotRoot,p)))!==h);assert.deepEqual(report.drift,[]);
 report.sourceEvidenceDrift=Object.entries(sourceBindings).filter(([p,h])=>digest(fs.readFileSync(p))!==h);assert.deepEqual(report.sourceEvidenceDrift,[]);
 report.currentWorkspaceDrift=Object.entries(bindings).filter(([p,h])=>digest(fs.readFileSync(p))!==h).map(([p,priorSha256])=>({path:p,priorSha256,currentSha256:digest(fs.readFileSync(p))}));
 report.acceptedConcurrentData=report.currentWorkspaceDrift.map(r=>{
  const captured=fs.readFileSync(path.join(snapshotRoot,r.path),'utf8');
  if(r.path==='src/core/formal211to220Data.ts')return {...inspectDisjoint211to220Data(r.path,captured),
   reason:'Only strictly checked literal additions to the unrelated 211–220 registry are accepted. The tested 221–230 objects, shared runtime, artwork and rules remain byte-identical.'};
  assert.fail('Formal target/runtime/art/rule/evidence drift: '+r.path);
 });
 const currentFiles=[];
 const listTree=dir=>{for(const item of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,item.name).replaceAll('\\','/');if(item.isDirectory())listTree(file);else currentFiles.push(file);}};
 listTree('src');listTree('public/assets/art');
 report.currentWorkspaceFileSetDrift=currentFiles.filter(file=>!Object.hasOwn(bindings,file));
 assert.deepEqual(report.currentWorkspaceFileSetDrift,[],'New runtime/art files appeared during validation');
 const fresh=await loadRegistry();
 for(const {data}of candidates)assert.deepEqual(fresh.api.getFormal221to230LevelStrict(data.level.id),data.level,'Current formal registry object changed during input run');
 report.finalProductionBoundary=fresh.api.LEVELS.length;
 ruleGate();
 report.status='PASS';report.fullBatchValidated=fullBatch;
}catch(error){report.status='FAIL';report.error=String(error.stack??error);if(page){report.lastState=await page.evaluate(()=>window.__COLOR_ESCAPE__?.getDebugState()).catch(()=>null);await page.screenshot({path:path.join(output,'failure.png')}).catch(()=>{});}process.exitCode=1;}
finally{await browser.close();await server.close();fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2));}
console.log(JSON.stringify({output,status:report.status,error:report.error}));
