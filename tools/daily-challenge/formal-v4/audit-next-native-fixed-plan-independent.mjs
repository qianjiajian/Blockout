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
import {assertNextNativeRecipePlan} from './next-native-plan-contract.mjs';
import {NEXT_NATIVE_PROPOSAL,NEXT_NATIVE_PROPOSAL_REVIEW} from './prepare-next-native-three-plan.mjs';
import {designFingerprints} from '../formal-v3/bounded-proof.mjs';
import {PUBLIC_ATTEMPT_LEDGER} from './bounded-qualify.mjs';

// A read-only audit: only supplied, already-complete reference routes are
// replayed. Never calls a constructor, colour CSP, solver or ledger writer.
const own='tools/daily-challenge/formal-v4/audit-next-native-fixed-plan-independent.mjs';
const driver='tools/daily-challenge/formal-v4/construct-next-native-recipes.mjs';
const V4='deliverables/daily-formal-v4-20261008';
const planDescriptor={path:process.argv[2],sha256:process.argv[3]};assert(planDescriptor.path&&/^[a-f0-9]{64}$/.test(planDescriptor.sha256));
const output=process.argv[4]??`${V4}/proof/next-native-fixed-plan-independent-01/report.json`;
const sha=b=>createHash('sha256').update(b).digest('hex');
const fileBindings={},errors=[],results=[],sourceRoutes=new Map(),digests=new Map();
let selectedCandidates=0,inventorySummaryResult=null,publicRequestsBefore=null,publicRequestsAfter=null;
const requestNames=async()=> (await fs.readdir(PUBLIC_ATTEMPT_LEDGER)).filter(n=>n.endsWith('.request.json')).sort();
const originalRequestNames=await requestNames();publicRequestsBefore=originalRequestNames.length;
const walk=async dir=>{const result=[];for(const e of await fs.readdir(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory()&&!e.isSymbolicLink())result.push(...await walk(p));else if(e.isFile()&&p.endsWith('.json'))result.push(p);}return result;};
const sorted=ps=>ps.map(p=>[...p]).sort((a,b)=>a[1]-b[1]||a[0]-b[0]);
const read=async(d)=>{const p=typeof d==='string'?d:d.path,b=await fs.readFile(p),h=sha(b);if(typeof d!=='string')assert.equal(h,d.sha256,p);if(fileBindings[p])assert.equal(fileBindings[p],h);fileBindings[p]=h;digests.set(path.resolve(p),h);return JSON.parse(b);};
const bind=async(p,h)=>{const b=await fs.readFile(p),actual=sha(b);if(h)assert.equal(actual,h,p);if(fileBindings[p])assert.equal(fileBindings[p],actual);fileBindings[p]=actual;digests.set(path.resolve(p),actual);return b;};
const bindMany=async(entries,{fresh=false}={})=>{const seen=new Map();for(const [p,h]of entries){const k=path.resolve(p);if(seen.has(k))assert.equal(seen.get(k),h);seen.set(k,h);if(fileBindings[p])assert.equal(fileBindings[p],h);fileBindings[p]=h;}const todo=[...seen];for(let i=0;i<todo.length;i+=48)await Promise.all(todo.slice(i,i+48).map(async([p,h])=>{if(!fresh&&digests.has(p)){assert.equal(digests.get(p),h);return;}assert.equal(sha(await fs.readFile(p)),h,p);digests.set(p,h);}));};
const clean=q=>JSON.parse(JSON.stringify(q));
try{
 const plan=await read(planDescriptor),rt=await loadV4Runtime();
 assertNextNativeRecipePlan(plan);assert.equal(plan.scope,300);
 const proposal=await read(NEXT_NATIVE_PROPOSAL),proposalReview=await read(NEXT_NATIVE_PROPOSAL_REVIEW);
 assert.deepEqual(plan.proposal,NEXT_NATIVE_PROPOSAL);assert.deepEqual(plan.proposalReview,NEXT_NATIVE_PROPOSAL_REVIEW);
 assert.equal(proposalReview.status,'INDEPENDENT_NEXT_NATIVE_PROPOSAL_READONLY_REVIEW_PASS');assert.deepEqual(proposalReview.errors,[]);
 assert.deepEqual(plan.approvedRecipes,proposal.recommendedRecipes);await bindMany(Object.entries(proposal.bindings));await bindMany(Object.entries(proposalReview.fileBindings));
 assert.deepEqual(prefixExecutionEnvironment(rt,plan.executionEnvironment.descriptor),plan.executionEnvironment);
 await bindMany(Object.entries(plan.bindings));
 await bind(own);await bind(driver,plan.bindings[driver]);
 const selected=await read(plan.selectedIndex);assert.equal(selected.files.length,150);selectedCandidates=selected.files.length;
 const priorSelected=await read(proposal.selectedIndex);assert.equal(priorSelected.files.length,147);assert.deepEqual(selected.files.slice(0,147),priorSelected.files);
 for(const d of proposal.selected)await read(d);
 const advancedCompletion=await read(plan.advancedCompletion);assert.equal(advancedCompletion.status,'FINITE_TWO_LOW_BAND_ADVANCED_PLAN_FINISHED');assert.equal(advancedCompletion.accepted,2);assert.equal(plan.advancedOutcomes.length,2);
 for(const d of plan.advancedOutcomes){const q=await read(d);assert(q.accepted&&q.catalogEligible&&!q.qualificationOnly);assert(selected.files.includes(d.path));assert.deepEqual(await read(q.entryResultFile),q);assert(advancedCompletion.outcomes.some(r=>r.file===d.path&&r.sha256===d.sha256&&r.accepted));}
 const native=(await Promise.all(plan.selected.map(d=>read(d)))).find(q=>q.formalId==='daily-basic-combined-d3-10');assert(native&&native.accepted&&native.admissionVersion==='native-basic-readonly-admission-v1');
 await read(native.sourceDraft);assert.equal(native.inputSelection.path,selected.inputSelection.path);
 assert.deepEqual(native.mergeContext,selected.mergeContext);const merge=await read(native.mergeContext);assert.equal(merge.combinedCandidates,150);assert.equal(merge.newSearches,0);assert.equal(merge.newLedgerClaims,0);
 await bindMany(Object.entries(native.admissionBindings));
 assert.deepEqual(plan.selected.map(d=>d.path),selected.files);
 for(const d of plan.selected){const q=await read(d);assert.equal(levelSha256(q.level),d.levelSha256);assert(q.accepted);}
 assert.equal(plan.maximumFinalColourInputsIncludingRejected,3);
 assert.equal(plan.maximumStocksEnteringColourCspIncludingFailed,3);
 assert.equal(plan.maximumStaticPartitionAttempts,2000);
 assert.deepEqual(plan.maximumPerSource,{'18':1,'198':1,'118':1});
 assert(Number.isSafeInteger(plan.sequence.baseSeed));assert.equal(plan.sequence.step,7919);assert.equal(plan.sequence.sourceFactor,101);assert.deepEqual(plan.sequence.bodyCountDeltas,[1,-1,2,0,3,-2]);
 assert.equal(plan.previousMacro64ActualInputs,51);assert.equal(plan.maximumAfterThisBatch,54);assert.equal(plan.combinedMaximumInputs,64);
 assert.equal(plan.futureUpperBudget.maxStates,10000);assert.equal(plan.futureLowerBudget.maxStates,9999);
 assert.equal(plan.futureUpperBudget.maxTransitions,10000000);assert.equal(plan.futureUpperBudget.maxMicroStates,3000000);assert.equal(plan.futureUpperBudget.maxMilliseconds,30000);
 const inventory=await read(plan.ledgerInventory);assert.equal(inventory.status,'READ_ONLY_REFRESHED_SHARED_LEDGER_BYTE_SNAPSHOT');assert.equal(inventory.newWrites,0);
 let ledgerFiles=0;for(const r of inventory.roots){assert.equal(r.fileCount,r.files.length);const actual=(await walk(r.directory)).map(p=>path.resolve(p)).sort();assert.deepEqual(actual,r.files.map(d=>path.resolve(d.path)).sort(),'Complete current ledger file set');await bindMany(r.files.map(d=>[d.path,d.sha256]));ledgerFiles+=r.files.length;}
 inventorySummaryResult={descriptor:plan.ledgerInventory,directories:inventory.roots.length,files:ledgerFiles,allActualBytesVerified:true};
 const names=await requestNames();assert.equal(plan.publicStocks.length,names.length);assert.equal(new Set(plan.publicStocks.map(s=>s.id)).size,names.length);
 for(const d of plan.publicStocks){const q=await read(d);for(const k of ['id','shapeSha256','colorSha256'])assert.equal(q[k],d[k]);assert.equal(d.retryIdentitySha256,levelSha256({shapeSha256:q.shapeSha256,colorSha256:q.colorSha256}));}
 for(const d of plan.previousLateStocks){const q=await read(d);assert.deepEqual(d.level,q.level??q.placeholderWorld);assert.equal(d.shapeSha256,designFingerprints(d.level).shapeSha256);}
 for(const d of plan.failedParents){const q=await read({path:d.file,sha256:d.sha256}),req=await read({path:d.requestFile,sha256:d.requestSha256}),res=await read({path:d.resultFile,sha256:d.resultSha256});
  assert.equal(q.sourceLevelId,d.source);assert.equal(q.accepted,false);assert.equal(res.accepted,false);assert.equal(req.id,d.id);assert.deepEqual(q.attempt,req);assert.deepEqual(designFingerprints(q.level),d.fingerprints);
  for(const file of [PUBLIC_ATTEMPT_LEDGER+'/'+req.id+'.blocked.json',PUBLIC_ATTEMPT_LEDGER+'/identities/'+req.retryIdentitySha256+'.blocked.json']){const sealed=await read(file);assert.equal(sealed.attemptId,req.id);assert.equal(sealed.status,res.status);}
  const declared=proposal.history.sealedParents.find(x=>x.source===d.source);assert.equal(declared.id,d.id);
 }
 assert.equal(plan.blueprints.length,3);assert.equal(plan.futureStrategy.tailStrategy,'native');assert.equal(plan.futureStrategy.originalLowerFloor,31);
 assert.equal(plan.futureStrategy.maximumTailCalls,1);assert.equal(plan.futureStrategy.maximumOriginalLowerCalls,1);assert.equal(plan.futureStrategy.fullUpperSearchAfterTailFailure,false);
 const qual=await read(plan.nativeQualification);assert.equal(qual.status,'INDEPENDENT_NATIVE_PREFIX_TAIL_V4_PASS');assert.deepEqual(qual.errors,[]);for(const[p,h]of Object.entries(qual.toolBindings))await bind(p,h);
 const expected=[[18,40,25,38,2],[198,43,46,39,4],[118,33,24,32,1]];
 for(const [i,b]of plan.blueprints.entries()){
  const [sourceId,cut,area,parking,clears]=expected[i];
  const recommended=proposal.blueprints.find(q=>q.recipeId===b.recipeId);assert(recommended&&proposal.recommendedRecipes.includes(b.recipeId));
  for(const key of ['recipeId','reference','sourceLevelId','referenceLevelSha256','referenceRouteSha256','level','region','changedBodies','fixedBlocks','prefixDrags','prefixSha256','prefixFacts'])assert.deepEqual(b[key],recommended[key]);
  assert.equal(b.sourceLevelId,sourceId);assert.equal(b.maximumStocks,1);assert.equal(b.targetDifficulty,3);
  assert.equal(plan.maximumStocksEnteringColourCspIncludingFailed,3);
  const q=await read(b.reference);assert(q.accepted);assert.deepEqual(q.level,b.level);
  assert.equal(levelSha256(q.level),b.referenceLevelSha256);assert.equal(routeSha256(q.drags),b.referenceRouteSha256);
  rt.assertPlainProofDomain(q.level);rt.validateLevel(q.level);
  const source=rt.LEVELS.find(l=>l.id===sourceId);assert(source);
  assert.equal(boardBaselineSha256(source),boardBaselineSha256(q.level));
  assert.equal(boardCells(q.level).length,({198:70,18:40,118:56})[sourceId]);
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
   nativeOriginalOrientation:true,solidRectangleOnly:true,maximumNewStocks:1,completeNewRouteNotYetAvailable:true,newLClaimed:false});
 }
 // The only driver path invokes the existing fixed-domain constructor. All
 // successful or failed paint returns increment its recipe and total quota.
 const source=(await bind(driver)).toString('utf8');
 for(const fragment of ['index<plan.maximumStaticPartitionAttempts&&inputs.length<plan.maximumStocksEnteringColourCspIncludingFailed','if(built.paint){perRecipe.set','if(!built.ok)','forbiddenShapes.add(built.stockFingerprints.shapeSha256)','claimLatePrefixPlan(planDescriptor,outputDirectory)','finally{await finishLatePrefixPlan'])assert(source.includes(fragment),fragment);
 await bindMany(Object.entries(fileBindings),{fresh:true});
 const nowRequests=await requestNames();assert.deepEqual(nowRequests,originalRequestNames);publicRequestsAfter=nowRequests.length;
}catch(error){errors.push(error.stack??error.message);}
const report={status:errors.length?'INDEPENDENT_NEXT_NATIVE_FIXED_RECIPE_PLAN_FAIL':'INDEPENDENT_NEXT_NATIVE_FIXED_RECIPE_PLAN_PASS',plan:planDescriptor,recipeCount:results.length,
 errors,results,scope:300,selectedCandidates,previousMacroInputs:51,maximumAdditionalInputs:3,maximumCumulativeInputs:54,combinedQuota:64,inventory:inventorySummaryResult,publicRequestsBefore,publicRequestsAfter,
 newSearches:0,newConstructions:0,publicLedgerWrites:0,currentRuntimeValidationClaimed:false,formalReady:false,
 limitations:['Reference routes and three fixed untouched regions only; new colours, gates, layouts and complete U/L remain unmade.',
  'Every future stock still needs source/selected/prior/old450 and mutual similarity gates, first public claim, shared-budget U, then independent original L31.',
  'Prefix parking counts are known-route observations, never lower bounds.'],fileBindings,createdAt:new Date().toISOString()};
await fs.mkdir(path.dirname(output),{recursive:true});await fs.writeFile(output,JSON.stringify(clean(report),null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({status:report.status,file:output,sha256:sha(await fs.readFile(output)),recipeCount:results.length,fileBindings:Object.keys(fileBindings).length,errors}));
process.exitCode=errors.length?1:0;
