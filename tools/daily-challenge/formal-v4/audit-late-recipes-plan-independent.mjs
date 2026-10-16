import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {loadV4Runtime} from './runtime.mjs';
import {prefixExecutionEnvironment} from './prefix-execution-environment.mjs';
import {levelSha256,routeSha256,independentReplay} from '../formal-v2/contract.mjs';
import {replayDecorated} from '../formal-v2/mechanism-decorate.mjs';
import {boardBaselineSha256} from '../formal-v2/geometry.mjs';
import {boardCells,absoluteCells,inventorySummary} from '../formal-v3/diversity-layout-factory.mjs';
import {mappedLatePrefix} from './late-region-gate-aware-factory.mjs';

// A read-only audit: only supplied, already-complete reference routes are
// replayed. Never calls a constructor, colour CSP, solver or ledger writer.
const own='tools/daily-challenge/formal-v4/audit-late-recipes-plan-independent.mjs';
const driver='tools/daily-challenge/formal-v4/construct-late-prefix-recipes.mjs';
const V4='deliverables/daily-formal-v4-20261008';
const planDescriptor={path:`${V4}/design/fixed-late-recipes-eight-plan-02/plan.json`,sha256:'bc3252f284a66523ecfeab4e4b8e67da58bee27d75fedd3dde5d74c584565ebb'};
const output=process.argv[2]??`${V4}/proof/late-recipes-plan-independent-01/report.json`;
const sha=b=>createHash('sha256').update(b).digest('hex');
const fileBindings={},errors=[],results=[],sourceRoutes=new Map();
const sorted=ps=>ps.map(p=>[...p]).sort((a,b)=>a[1]-b[1]||a[0]-b[0]);
const read=async(d)=>{const p=typeof d==='string'?d:d.path,b=await fs.readFile(p),h=sha(b);if(typeof d!=='string')assert.equal(h,d.sha256,p);fileBindings[p]=h;return JSON.parse(b);};
const bind=async(p,h)=>{const b=await fs.readFile(p),actual=sha(b);if(h)assert.equal(actual,h,p);fileBindings[p]=actual;return b;};
const clean=q=>JSON.parse(JSON.stringify(q));
try{
 const plan=await read(planDescriptor),rt=await loadV4Runtime();
 assert.equal(plan.version,'late-prefix-recipe-eight-v1');assert.equal(plan.scope,300);
 assert.deepEqual(prefixExecutionEnvironment(rt,plan.executionEnvironment.descriptor),plan.executionEnvironment);
 for(const [p,h]of Object.entries(plan.bindings))await bind(p,h);
 await bind(own);await bind(driver,plan.bindings[driver]);
 const selected=await read(plan.selectedIndex);assert.equal(selected.files.length,147);
 assert.deepEqual(plan.selected.map(d=>d.path),selected.files);
 for(const d of plan.selected){const q=await read(d);assert.equal(levelSha256(q.level),d.levelSha256);assert(q.accepted);}
 assert.equal(plan.maximumFinalColourInputsIncludingRejected,8);
 assert.equal(plan.maximumStocksEnteringColourCspIncludingFailed,8);
 assert.equal(plan.maximumStaticPartitionAttempts,2000);
 assert.deepEqual(plan.maximumPerSource,{'118':2,'198':6});
 assert.deepEqual(plan.sequence,{baseSeed:813019001,step:7919,sourceFactor:101,bodyCountDeltas:[1,-1,2,0,3,-2]});
 assert.equal(plan.previousMacro64ActualInputs,25);assert.equal(plan.maximumAfterThisBatch,33);assert.equal(plan.combinedMaximumInputs,64);
 assert.equal(plan.futureUpperBudget.maxStates,10000);assert.equal(plan.futureLowerBudget.maxStates,9999);
 assert.equal(plan.futureUpperBudget.maxTransitions,10000000);assert.equal(plan.futureUpperBudget.maxMicroStates,3000000);assert.equal(plan.futureUpperBudget.maxMilliseconds,30000);
 const previousPlan=await read(plan.inheritedHistoryPlan);assert.equal(previousPlan.previousMacro64ActualInputs,21);
 const priorConstruction=await read(`${V4}/design/late-prefix-gate-aware8-construct-01/index.json`);
 assert.equal(priorConstruction.plan.sha256,plan.inheritedHistoryPlan.sha256);assert.equal(priorConstruction.stocksEnteringColourCspIncludingFailed,4);
 assert.equal(21+priorConstruction.stocksEnteringColourCspIncludingFailed,25);
 assert.equal(plan.blueprints.length,4);
 const expected=[[198,65,26,51,14],[198,63,31,50,13],[198,57,38,47,10],[118,34,21,33,1]];
 for(const [i,b]of plan.blueprints.entries()){
  const [sourceId,cut,area,parking,clears]=expected[i];
  assert.equal(b.sourceLevelId,sourceId);assert.equal(b.maximumStocks,2);assert.equal(b.maxStocks,2);
  assert.equal(b.maximumColourCspCallsPerStock,1);assert.equal(b.noReplacementAfterColourCspFailure,true);
  const q=await read(b.reference);assert(q.accepted);assert.deepEqual(q.level,b.level);
  assert.equal(levelSha256(q.level),b.referenceLevelSha256);assert.equal(routeSha256(q.drags),b.referenceRouteSha256);
  rt.assertPlainProofDomain(q.level);rt.validateLevel(q.level);
  const source=rt.LEVELS.find(l=>l.id===sourceId);assert(source);
  assert.equal(boardBaselineSha256(source),boardBaselineSha256(q.level));
  assert.equal(boardCells(q.level).length,sourceId===198?70:56);
  const allCells=boardCells(q.level).map(p=>p.join(',')),occupied=q.level.blocks.flatMap(absoluteCells).map(p=>p.join(','));
  assert.equal(new Set(occupied).size,occupied.length);assert.deepEqual([...occupied].sort(),[...allCells].sort());
  const inventory=inventorySummary(q.level,rt);assert.equal(inventory.nonNativeOrMissingArtIds.length,0);
  for(const body of q.level.blocks){
   const xs=body.shape.map(p=>p[0]),ys=body.shape.map(p=>p[1]);assert.equal(Math.min(...xs),0);assert.equal(Math.min(...ys),0);
   assert.equal(new Set(body.shape.map(p=>p.join(','))).size,(Math.max(...xs)+1)*(Math.max(...ys)+1));
   const match=rt.matchFormalBlockShape(body.shape,'native-only');assert.equal(match.quarterTurns,0);
   const asset=rt.GAME_ART.gameplay.formalBlocks[body.color].solid[match.shapeId];assert.equal(typeof asset,'string');
   const bytes=await bind(path.join('public',asset));assert(bytes.length>0);
  }
  let replay=sourceRoutes.get(b.reference.path);
  if(!replay){const canonical=replayDecorated(rt,q.level,q.drags),independent=independentReplay(rt,q.level,q.drags);
   assert(canonical.valid&&canonical.complete&&!canonical.failed&&independent.valid&&independent.complete&&!independent.failed);
   assert.equal(canonical.nonClearingDrags,independent.nonClearingDrags);assert.equal(canonical.clearEvents,q.level.blocks.length);
   replay={canonical,independent};sourceRoutes.set(b.reference.path,replay);}
  const ids=new Set(b.region.bodyIds);assert.equal(ids.size,b.region.bodyIds.length);
  assert.deepEqual(b.changedBodies,q.level.blocks.filter(x=>ids.has(x.id)));assert.deepEqual(b.fixedBlocks,q.level.blocks.filter(x=>!ids.has(x.id)));
  const cells=sorted(b.changedBodies.flatMap(absoluteCells));assert.deepEqual(cells,sorted(b.region.cells));assert.equal(cells.length,area);
  const remaining=new Set(cells.map(p=>p.join(','))),queue=[cells[0]],seen=new Set([cells[0].join(',')]);
  for(const [x,y]of queue)for(const p of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]])if(remaining.has(p.join(','))&&!seen.has(p.join(','))){seen.add(p.join(','));queue.push(p);}
  assert.equal(seen.size,area);assert.equal(b.region.fraction,area/allCells.length);assert(b.region.fraction>.35);
  assert.deepEqual(b.prefixDrags,q.drags.slice(0,cut));assert.equal(routeSha256(b.prefixDrags),b.prefixSha256);
  assert(b.prefixDrags.every(d=>!ids.has(d.blockId)));assert.equal(q.drags.findIndex(d=>ids.has(d.blockId)),cut);
  assert.equal(b.prefixFacts.parking,parking);assert.equal(b.prefixFacts.clears,clears);assert.equal(b.prefixFacts.drags,cut);
  assert.equal(replay.canonical.trace.slice(0,cut).filter(t=>t.nonClearing).length,parking);
  assert.equal(replay.canonical.trace.slice(0,cut).reduce((n,t)=>n+t.clearDelta,0),clears);
  // Direct same-route, unit-by-unit check records the actual physical gate.
  // Region bodies are untouched at every supplied pose, not only at the cut.
  const model=new rt.PuzzleModel(q.level);model.startCountdown();const exits=[];
  for(const [di,d]of b.prefixDrags.entries()){
   model.beginAction();let side=model.possibleExitSides(model.getBlock(d.blockId));assert(side.length<=1);assert(!side.length||d.path.length===0);
   for(const [pi,p]of d.path.entries()){
    assert(model.moveBlockStep(d.blockId,...p));side=model.possibleExitSides(model.getBlock(d.blockId));assert(side.length<=1);
    assert(!side.length||pi===d.path.length-1,'earlier first-contact exit');
    for(const old of b.changedBodies){const now=model.getBlock(old.id);assert(now);assert.equal(now.x,old.x);assert.equal(now.y,old.y);assert.deepEqual(now.shape,old.shape);}
   }
   assert.deepEqual(side,d.exitSide?[d.exitSide]:[]);
   if(d.exitSide){const before=model.getBlock(d.blockId),departure=model.tryExit(d.blockId,d.exitSide);assert(departure.ok);
    const gate=q.level.gates.find(g=>g.id===departure.gateId);assert(gate);assert.equal(gate.color,before.layers[0]);assert.equal(gate.side,d.exitSide);
    exits.push({drag:di+1,blockId:d.blockId,gateId:gate.id,side:gate.side,offset:gate.offset,size:gate.size,departureCells:absoluteCells(before)});}
   assert(model.commitAction());
  }
  const snap=model.snapshot();assert(!snap.failed);assert.equal(snap.blocks.length,b.prefixFacts.remainingBodies);
  for(const old of b.changedBodies){const now=snap.blocks.find(x=>x.id===old.id);assert(now);assert.equal(now.x,old.x);assert.equal(now.y,old.y);assert.deepEqual(now.shape,old.shape);assert.equal(now.layers[0],old.color);}
  const mapped=mappedLatePrefix(b);assert.deepEqual([...new Set(exits.map(x=>x.gateId))].sort(),mapped.preservedGates.map(g=>g.id).sort());
  for(const d of b.prefixDrags.filter(d=>!d.exitSide)){assert(mapped.parkingPoses[d.blockId]);assert(!ids.has(d.blockId));}
  results.push({recipeId:b.recipeId,reference:b.reference,sourceLevelId:sourceId,width:q.level.width,height:q.level.height,normalMaskCells:allCells.length,
   fullReference:{drags:q.drags.length,U:replay.canonical.nonClearingDrags,allBodiesCleared:replay.canonical.clearEvents,canonical:true,independent:true},
   region:{area,fraction:area/allCells.length,bodyIds:[...ids],cells,connected:true},prefix:{...b.prefixFacts,sha256:b.prefixSha256,actualGateExits:exits,cutStateSha256:levelSha256(snap),untouchedEveryStep:true},
   nativeOriginalOrientation:true,solidRectangleOnly:true,maximumNewStocks:2,completeNewRouteNotYetAvailable:true,newLClaimed:false});
 }
 // The only driver path invokes the existing fixed-domain constructor. All
 // successful or failed paint returns increment its recipe and total quota.
 const source=(await bind(driver)).toString('utf8');
 for(const fragment of ['index<plan.maximumStaticPartitionAttempts&&inputs.length<8','if(built.paint){perRecipe.set','if(!built.ok)','forbiddenShapes.add(built.stockFingerprints.shapeSha256)','claimLatePrefixPlan(planDescriptor,outputDirectory)','finally{await finishLatePrefixPlan'])assert(source.includes(fragment),fragment);
 for(const [p,h]of Object.entries(fileBindings))assert.equal(sha(await fs.readFile(p)),h,`Input changed during audit: ${p}`);
}catch(error){errors.push(error.stack??error.message);}
const report={status:errors.length?'INDEPENDENT_LATE_RECIPE_PLAN_FAIL':'INDEPENDENT_LATE_RECIPE_PLAN_PASS',plan:planDescriptor,recipeCount:results.length,
 errors,results,scope:300,selectedCandidates:147,previousMacroInputs:25,maximumAdditionalInputs:8,maximumCumulativeInputs:33,combinedQuota:64,
 newSearches:0,newConstructions:0,publicLedgerWrites:0,currentRuntimeValidationClaimed:false,formalReady:false,
 limitations:['Reference routes and four fixed untouched regions only; new colours, gates, layouts and complete U/L remain unmade.',
  'Every future stock still needs source/selected/prior/old450 and mutual similarity gates, first public claim, shared-budget U, then independent original L31.',
  'Prefix parking counts are known-route observations, never lower bounds.'],fileBindings,createdAt:new Date().toISOString()};
await fs.mkdir(path.dirname(output),{recursive:true});await fs.writeFile(output,JSON.stringify(clean(report),null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({status:report.status,file:output,sha256:sha(await fs.readFile(output)),recipeCount:results.length,fileBindings:Object.keys(fileBindings).length,errors}));
process.exitCode=errors.length?1:0;
