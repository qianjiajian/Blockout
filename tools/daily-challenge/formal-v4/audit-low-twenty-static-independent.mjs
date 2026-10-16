import {assertLowBandBatchPlan,assertLowBandBatchIndex,LOW_BAND_BATCH_REVIEW_STATUS,LOW_BAND_BATCH_STATIC_REVIEW_STATUS,lowBandBranchKey,lowBandShapeBan} from './low-twenty-contract.mjs';
import {assertReviewedLowBandQualification,checkLedgerSnapshot,lowBandConstructionFiles} from './low-twenty-io.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {loadV4Runtime} from './runtime.mjs';
import {prefixExecutionEnvironment,currentMainlineSourceBinding} from './prefix-execution-environment.mjs';
import {auditV4StaticCandidate} from './static-contract.mjs';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';
import {applyNativeDrag} from '../formal-v2/mechanism-decorate.mjs';
import {designFingerprints} from '../formal-v3/bounded-proof.mjs';
import {compareLayouts,describeLayout} from '../formal-v3/diversity.mjs';
import {boardCells,bodyFootprint,absoluteCells} from '../formal-v3/diversity-layout-factory.mjs';
import {PUBLIC_ATTEMPT_LEDGER} from './bounded-qualify.mjs';

// Read-only: no construction, solver, attempt-claim, or ledger-migration API.
const SELF='tools/daily-challenge/formal-v4/audit-low-twenty-static-independent.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const points=ps=>JSON.stringify(ps.map(p=>[...p]).sort((a,b)=>a[1]-b[1]||a[0]-b[0]));
const partition=l=>levelSha256(l.blocks.map(bodyFootprint).sort());
const identity=f=>levelSha256({shapeSha256:f.shapeSha256,colorSha256:f.colorSha256});
const sharedChanges=(a,b)=>b.colorAssignments.filter(x=>a.colorAssignments.some(y=>x.id===y.id&&JSON.stringify(x.colors)!==JSON.stringify(y.colors))).map(x=>x.id);
const connected=cells=>{const all=new Set(cells.map(p=>p.join(','))),seen=new Set(),queue=[cells[0]];if(!cells.length)return false;
 for(const [x,y]of queue){const k=`${x},${y}`;if(seen.has(k))continue;seen.add(k);for(const p of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]])if(all.has(p.join(','))&&!seen.has(p.join(',')))queue.push(p);}
 return seen.size===all.size;};
function changed(a,b){assert.notEqual(a.shapeSha256,b.shapeSha256);assert.notEqual(a.colorSha256,b.colorSha256);
 const common=b.colorAssignments.filter(x=>a.colorAssignments.some(y=>x.id===y.id));
 if(common.length)assert(sharedChanges(a,b).length,'Shared-ID colour must actually change');
 else assert.notEqual(levelSha256(a.colorAssignments.map(x=>x.colors).sort()),levelSha256(b.colorAssignments.map(x=>x.colors).sort()));}
export function assertLowBandStaticPlan(plan){ return assertLowBandBatchPlan(plan); }
export function assertLowTwentyAllGateStock(blueprint,q){
 assert.deepEqual(q.level.gates,blueprint.level.gates,'Every original gate and its array order must remain unchanged');
 assert.equal(q.provenance.version,'low-twenty-all-gates-fixed-plain-region-v1');
 assert.equal(q.provenance.allReferenceGatesByteEquivalentIncludingArrayOrder,true);
 assert.equal(q.provenance.sourceMaskRetained,true);
 assert.equal(q.provenance.newShapeInventory,true);
 assert.equal(q.provenance.allExternalBodiesByteEquivalent,true);
 return true;
}

export function assertLowBandCandidateRecipe(bp,attempt,item,q){
 for(const x of [attempt,item,q]){assert.equal(x.recipeId,bp.recipeId);assert.equal(x.sourceLevelId,bp.sourceLevelId);}
 for(const x of [attempt,item,q]){assert.equal(x.targetDifficulty,bp.targetDifficulty);assert.equal(x.branchId,bp.branchId);}
 assert.equal(q.predeclaredUpperStrategy,'plain-joint-low-band');return true;
}
export function assertSolidNativeStock(level){
 for(const b of level.blocks){
  const w=Math.max(...b.shape.map(p=>p[0]))+1,h=Math.max(...b.shape.map(p=>p[1]))+1;
  assert.equal(new Set(b.shape.map(p=>p.join(','))).size,w*h,'Qualified native prefix stock is a solid original-orientation rectangle');
 }
 return true;
}
function auditPrefix(runtime,level,drags){
 const model=new runtime.PuzzleModel(structuredClone(level)),direct=new runtime.PuzzleModel(structuredClone(level),{deferExitCompletion:true});
 model.startCountdown();direct.startCountdown();const trace=[];let parking=0,clears=0;
 for(const[i,d]of drags.entries()){
  const before=model.snapshot();applyNativeDrag(model,d);const after=model.snapshot();
  const otherBefore=direct.snapshot();direct.beginAction();for(const p of d.path)assert(direct.moveBlockStep(d.blockId,...p));
  const departure=d.exitSide?direct.tryExit(d.blockId,d.exitSide):null;if(departure)assert(departure.ok);
  assert(direct.commitAction());if(departure?.exitAnimationId)assert(direct.completeExitAnimation(departure.exitAnimationId));
  const other=direct.snapshot(),delta=after.cleared-before.cleared;
  assert(!after.failed&&!other.failed);assert.equal(delta,other.cleared-otherBefore.cleared);assert.equal(after.moves,before.moves+1);assert.equal(other.moves,otherBefore.moves+1);
  assert.equal(other.pendingExitAnimations?.length??0,0);assert.equal(delta,d.exitSide?1:0);parking+=Number(delta===0);clears+=delta;
  const physical=s=>s.blocks.map(b=>({id:b.id,x:b.x,y:b.y,shape:b.shape,color:b.color})).sort((a,b)=>a.id.localeCompare(b.id));
  assert.deepEqual(physical(after),physical(other));trace.push({drag:i+1,blockId:d.blockId,clearDelta:delta,canonicalStateSha256:levelSha256(after),independentStateSha256:levelSha256(other)});
 }
 const final=model.snapshot();assert(!final.complete&&final.blocks.length>0);assert.equal(final.queuedBlocks.length,0);
 return{valid:true,providedPrefixOnly:true,fullUValidated:false,isLowerBound:false,drags:drags.length,nonClearingDrags:parking,clearEvents:clears,
  remainingBodies:final.blocks.length,complete:false,finalStateSha256:levelSha256(final),trace};
}

/** Metadata only. The production audit below still checks every physical world and prefix. */
export function assertLowBandBatchStaticEnvelope(index,plan,review){
 assertLowBandBatchIndex(index,plan);assertLowBandStaticPlan(plan);
 assert.equal(review.status,LOW_BAND_BATCH_REVIEW_STATUS);assert.deepEqual(review.plan,index.plan);assert.deepEqual(review.errors,[]);
 assert.equal(review.recipeCount,plan.blueprints.length);assert.equal(review.newSearches,0);assert.equal(review.newConstructions,0);
 assert(index.attempts.length<=plan.maximumStaticPartitionAttempts);
 return true;
}
export function assertLowBandBatchPrefixFacts(bp,prefix){
 assert.equal(prefix.valid,true);assert.equal(prefix.providedPrefixOnly,true);assert.equal(prefix.fullUValidated,false);assert.equal(prefix.isLowerBound,false);assert.equal(prefix.complete,false);
 assert.equal(prefix.nonClearingDrags,bp.prefixFacts.parking);assert.equal(prefix.clearEvents,bp.prefixFacts.clears);assert.equal(prefix.drags,bp.prefixFacts.drags);
 assert.equal(prefix.drags,prefix.nonClearingDrags+prefix.clearEvents);
 assert([1,2].includes(bp.targetDifficulty));assert(prefix.nonClearingDrags<(bp.targetDifficulty===1?20:30));
 // A legal supplied prefix is not the original-object L16/L21 certificate.
 return true;
}
export function assertLowBandBatchCspAccounting(index,plan,constructionRows){
 assert.equal(constructionRows.length,index.attempts.length);
 const counts=Object.fromEntries(plan.blueprints.map(bp=>[bp.recipeId,0]));
 for(const row of constructionRows){const attempt=index.attempts.find(a=>a.index===row.index);assert(attempt);
  assert.equal(row.recipeId,attempt.recipeId);assert.equal(row.source,attempt.sourceLevelId);assert.equal(row.enteredColourCsp,attempt.enteredColourCsp);
  const bp=plan.blueprints.find(b=>b.recipeId===row.recipeId);assert(bp);assert.equal(row.source,bp.sourceLevelId);
  if(row.enteredColourCsp)counts[row.recipeId]++;
 }
 for(const bp of plan.blueprints)assert(counts[bp.recipeId]<=bp.maximumStocks);
 assert.deepEqual(counts,Object.fromEntries(plan.blueprints.map(bp=>[bp.recipeId,index.perRecipeColourCspInputs[bp.recipeId]??0])));
 assert.equal(Object.values(counts).reduce((a,b)=>a+b,0),index.fixedColourInputs);
 assert.equal(index.totalActualInputsIncludingThis,plan.campaign.previousActualInputs+index.fixedColourInputs);
 return counts;
}

export async function auditLowBandBatchStatic(inputDirectory,outputFile){
 const fileBindings={},cache=new Map(),errors=[],rows=[],constructionRows=[];let index,plan,environment,report;
 const bytes=async(p,expected)=>{const b=await fs.readFile(p),h=hash(b);if(expected)assert.equal(h,expected,`SHA ${p}`);if(fileBindings[p])assert.equal(h,fileBindings[p]);fileBindings[p]=h;return b;};
 const read=async(p,expected)=>{const b=await bytes(p,expected);if(!cache.has(p))cache.set(p,JSON.parse(b));return cache.get(p);};
 const descriptor=async d=>{assert(d?.path&&/^[a-f0-9]{64}$/.test(d.sha256??''));return read(d.path,d.sha256);};
 const bindings=async m=>{for(const[p,h]of Object.entries(m))await bytes(p,h);};
 const exists=async p=>fs.stat(p).then(()=>true).catch(e=>{if(e.code==='ENOENT')return false;throw e;});
 try{
  const runtime=await loadV4Runtime();environment=prefixExecutionEnvironment(runtime);await bindings(runtime.toolchainBindings);await bindings(environment.bindings);
  const imported=await build({entryPoints:[SELF],bundle:true,packages:'external',metafile:true,write:false,platform:'node',format:'esm',logLevel:'silent'});
  for(const p of Object.keys(imported.metafile.inputs))await bytes(p);
  index=await read(`${inputDirectory}/index.json`);plan=await descriptor(index.plan);await bindings(plan.bindings);
  assert.deepEqual(index.executionEnvironment,plan.executionEnvironment);assert.deepEqual(environment,plan.executionEnvironment);
  const recipeReview=await descriptor(index.recipeReview);assertLowBandBatchStaticEnvelope(index,plan,recipeReview);
  await bindings(recipeReview.fileBindings);
  const lowBandQualification=await descriptor(plan.lowBandQualification);await assertReviewedLowBandQualification(lowBandQualification,fileBindings);
  const qualification=await descriptor(plan.constructorQualification);assert.equal(qualification.status,'INDEPENDENT_LOW_TWENTY_PRIVATE_PASS');
  assert.deepEqual(qualification.errors,[]);await bindings(qualification.fileBindings);
  for(const k of ['gameplaySearches','publicLedgerClaims','accepted'])assert.equal(index[k],0);assert.equal(index.formalReady,false);
  assert(index.attempts.length<=plan.maximumStaticPartitionAttempts&&index.candidates.length<=plan.maximumStocksEnteringColourCspIncludingFailed);assert.equal(index.eligibleInputs,index.candidates.length);
  assert.equal(new Set(index.attempts.map(a=>a.index)).size,index.attempts.length);assert.equal(new Set(index.candidates.map(a=>a.path)).size,index.candidates.length);
  const start=await read(`${inputDirectory}/execution-start.json`);assert.deepEqual(start.plan,index.plan);
  const claim=await read(start.executionClaim.claimFile),result=await read(start.executionClaim.resultFile);
  assert.deepEqual(claim.plan,index.plan);assert.equal(claim.outputDirectory,path.resolve(inputDirectory));assert.equal(claim.failedPlanContinuationAllowed,false);
  assert.equal(result.status,index.status);assert.equal(result.experimentId,plan.experimentId);assert.equal(result.closedCampaignsExtended,false);assert.equal(result.failureReason,null);assert.deepEqual(result.plan,index.plan);
  assert.equal(result.staticAttempts,index.attempts.length);assert.deepEqual(result.constructionFiles,index.attempts.map(x=>x.constructionEvidence));
  for(const k of ['gameplaySearches','publicLedgerClaims'])assert.equal(result[k],0);
  const campaign=await read(start.executionClaim.campaignFile);assert.equal(campaign.experimentId,plan.experimentId);assert.equal(campaign.closedCampaignsExtended,false);assert.deepEqual(campaign.plan,index.plan);assert.deepEqual(campaign.proposal,plan.proposal);assert.equal(campaign.restartAllowed,false);assert.equal(campaign.qualificationOnly,false);assert.equal(campaign.outputDirectory,path.resolve(inputDirectory));
  assert.deepEqual(lowBandConstructionFiles(index.plan,plan.proposal.sha256).map(p=>path.resolve(p)).sort(),[start.executionClaim.claimFile,start.executionClaim.resultFile,start.executionClaim.campaignFile].map(p=>path.resolve(p)).sort());
  const selectedIndex=await descriptor(plan.selectedIndex);assert.equal(selectedIndex.files.length,plan.selectedCount);
  assert.equal(selectedIndex.scope,300);assert(Number.isSafeInteger(plan.selectedCount)&&plan.selectedCount>=1&&plan.selectedCount<=300);
  assert.deepEqual(plan.selected.map(x=>x.path),selectedIndex.files);
  const selected=await Promise.all(plan.selected.map(descriptor)),old450=await Promise.all(plan.old450.map(descriptor));assert.equal(old450.length,450);
  const previousMacro=await Promise.all(plan.previousMacro.map(descriptor));
  for(const p of plan.previousLateStocks??[])await descriptor(p);
  const comparisonOnly=await Promise.all(plan.comparisonOnly.map(descriptor));
  const knownPrevious=[...previousMacro,...(plan.previousLateStocks??[]),...comparisonOnly];
  // All plan-bound comparison-only stocks remain excluded; their count is not a batch constant.
  for(const p of plan.failedParents){
   const q=await descriptor({path:p.file??p.path,sha256:p.sha256});const req=await read(`${PUBLIC_ATTEMPT_LEDGER}/${p.id}.request.json`),res=await read(`${PUBLIC_ATTEMPT_LEDGER}/${p.id}.result.json`);
   assert.deepEqual(req,q.attempt);assert.equal(req.levelSha256,levelSha256(q.level));assert.equal(res.accepted,false);
   await read(`${PUBLIC_ATTEMPT_LEDGER}/${p.id}.blocked.json`);await read(`${PUBLIC_ATTEMPT_LEDGER}/identities/${req.retryIdentitySha256}.blocked.json`);
   assert.deepEqual(designFingerprints(q.level),p.fingerprints);
  }
  const ledgerNames=(await fs.readdir(PUBLIC_ATTEMPT_LEDGER)).filter(n=>n.endsWith('.request.json')).sort(),requests=[];
  for(const n of ledgerNames)requests.push({file:`${PUBLIC_ATTEMPT_LEDGER}/${n}`,value:await read(`${PUBLIC_ATTEMPT_LEDGER}/${n}`)});
  const sourceBindings=new Map(),fullBySource=new Map(),builtByCandidate=new Map();let paints=0;
  const earlierBranchStocks=plan.previousLateStocks.flatMap(q=>plan.blueprints.filter(b=>b.sourceLevelId===q.sourceLevelId&&b.reference.path===q.reference?.path).map(b=>({key:lowBandBranchKey(b),fingerprints:q.fingerprints})));
  for(const a of index.attempts){
   const b=await descriptor(a.constructionEvidence);assert.equal(a.status,b.status);assert.equal(b.searchPerformed,false);assert.deepEqual(b.plan,index.plan);
   const blueprint=plan.blueprints.find(x=>x.recipeId===a.recipeId);assert(blueprint);assert.equal(blueprint.sourceLevelId,a.sourceLevelId);
   assert.equal(blueprint,plan.blueprints[a.index%plan.blueprints.length]);assert.deepEqual(b.recipeReview,index.recipeReview);
   assert.equal(a.seed,blueprint.seed+a.localAttempt*7919);assert.equal(a.branchId,blueprint.branchId);assert.equal(a.targetDifficulty,blueprint.targetDifficulty);
   assert.equal(b.options.seed,a.seed);assert.equal(b.options.colourSeed,a.seed);assert.equal(b.options.bodyCountDelta,a.bodyCountDelta);
   assert.equal(a.bodyCountDelta,blueprint.bodyCountDelta);
   assert(Number.isSafeInteger(a.index)&&a.index>=0&&a.index<plan.maximumStaticPartitionAttempts);assert.deepEqual(b.executionEnvironment,environment);
   assert.equal(a.enteredColourCsp,Boolean(b.paint),'Every failed or successful colour call consumes quota');
   if(b.placeholderWorld){assert.equal(designFingerprints(b.placeholderWorld).shapeSha256,b.stockFingerprints.shapeSha256);
    const count=b.constructionAccounting;assert.equal(count.version,'late-region-static-construction-v1');
    for(const k of ['completeWorldReservations','microStates','transitions','elapsedMilliseconds'])assert(Number.isSafeInteger(count[k])&&count[k]>=0);
    assert.equal(count.completeWorldReservations,1+(b.paint?.accounting.completeWorldReservations??0));
    assert(count.completeWorldReservations<=10000&&count.microStates<=3000000&&count.transitions<=10000000&&count.elapsedMilliseconds<=30000);
    if(b.paint)assert(!lowBandShapeBan(blueprint,plan.failedParents,earlierBranchStocks).has(b.stockFingerprints.shapeSha256),'Repeated same-branch shape reached colour CSP');
    earlierBranchStocks.push({key:lowBandBranchKey(blueprint),fingerprints:b.stockFingerprints});
   }
   if(b.paint){paints++;assert.equal(b.paint.completeColourAssignments,b.paint.accounting.completeWorldReservations);
    assert.equal(b.paint.version,'late-prefix-gate-aware-colouring-v1');
    const pc=b.paint.accounting;assert.equal(pc.completeAssignmentsAreChargedEvenOnFailure,true);assert.equal(pc.gameBoardBranchSearches,0);
    assert.equal(pc.gateAndBodyCspShareBudget,true);assert.equal(pc.searchPerformed,false);
    for(const [key,cap]of [['nodes',3000],['cspTransitions',6000],['microStates',100000],['microTransitions',400000],['completeWorldReservations',3000]])
     assert(Number.isSafeInteger(pc[key])&&pc[key]>=0&&pc[key]<=cap,`Invalid gate-aware finite ${key}`);
    assert.equal(pc.transitions,pc.cspTransitions+pc.microTransitions);
    assert.equal(b.constructionAccounting.transitions,b.partition.transitions+pc.transitions);
    assert.equal(b.constructionAccounting.microStates,pc.microStates);
   }
   const formed=b.plain?.level??(b.paint?.ok?b.level:null);
   if(formed){if(b.ok){assert(b.level&&b.paint?.ok);assert.equal(levelSha256(b.level),b.levelSha256);assert.equal(routeSha256(b.prefixDrags),b.prefixSha256);assertLowTwentyAllGateStock(blueprint,b);}
    const f=designFingerprints(formed),previous=fullBySource.get(lowBandBranchKey(blueprint))??[];
    // All full attempts are retained, even when the final eligibility filter rejects them.
    if(a.candidate){assert(b.ok);for(const prior of previous)changed(prior,f);changed(plan.failedParents.find(p=>lowBandBranchKey(p)===lowBandBranchKey(blueprint)).fingerprints,f);builtByCandidate.set(a.candidate.path,{attempt:a,built:b,previous,blueprint});}
    fullBySource.set(lowBandBranchKey(blueprint),[...previous,f]);
   }
   constructionRows.push({index:a.index,recipeId:a.recipeId,source:a.sourceLevelId,status:b.status,evidence:a.constructionEvidence,enteredColourCsp:Boolean(b.paint),
    constructionAccounting:b.constructionAccounting??null,completeColourAssignments:b.paint?.completeColourAssignments??null});
  }
  assert.equal(paints,index.fixedColourInputs);assert.equal(paints,index.stocksEnteringColourCspIncludingFailed);assert(paints<=plan.maximumStocksEnteringColourCspIncludingFailed);
  assert.equal(result.stocksEnteringColourCspIncludingFailed,paints);assert.equal(result.eligibleInputs,index.candidates.length);assert.equal(index.totalActualInputsIncludingThis,plan.campaign.previousActualInputs+paints);
  const recipeCounts=Object.fromEntries(plan.blueprints.map(bp=>[bp.recipeId,constructionRows.filter(c=>c.recipeId===bp.recipeId&&c.enteredColourCsp).length]));
  for(const bp of plan.blueprints)assert(recipeCounts[bp.recipeId]<=bp.maximumStocks);
  assert.deepEqual(Object.keys(index.perRecipeColourCspInputs).filter(k=>!Object.hasOwn(recipeCounts,k)),[]);
  assert.deepEqual(recipeCounts,Object.fromEntries(plan.blueprints.map(bp=>[bp.recipeId,index.perRecipeColourCspInputs[bp.recipeId]??0])));
  assertLowBandBatchCspAccounting(index,plan,constructionRows);
  assert.deepEqual((await fs.readdir(inputDirectory)).filter(n=>/^construction-.*\.json$/.test(n)).sort(),index.attempts.map(a=>path.basename(a.constructionEvidence.path)).sort());
  assert.deepEqual((await fs.readdir(inputDirectory)).filter(n=>/^candidate-.*\.json$/.test(n)).sort(),index.candidates.map(a=>path.basename(a.path)).sort());
  const eligible=[];
  for(const item of index.candidates){
   const q=await descriptor(item),pair=builtByCandidate.get(item.path);assert(pair);const {built:b}=pair;
   assert.equal(q.status,'STATIC_NEW_PREFIX_TAIL_INPUT_AWAITING_FIRST_PUBLIC_CLAIM');assert.equal(q.accepted,false);assert.equal(q.L,null);assert.equal(q.U,null);
   assert.equal(q.fullOriginalUValidated,false);assert.equal(q.gameplaySearches,0);assert.equal(q.mathematicalEvidenceValidated,false);assert.equal(q.formalReady,false);
   for(const k of ['level','levelSha256','prefixDrags','prefixSha256','constructionAccounting','partition','paint','stockFingerprints','provenance'])assert.deepEqual(q[k],b[k]);
   assert.deepEqual(q.constructionEvidence,pair.attempt.constructionEvidence);assert.deepEqual(q.fixedBatchPlan,index.plan);
   assert.equal(item.levelSha256,levelSha256(q.level));assert.equal(item.prefixSha256,routeSha256(q.prefixDrags));
   const bp=pair.blueprint;assertLowBandCandidateRecipe(bp,pair.attempt,item,q);assertLowTwentyAllGateStock(bp,q);const ref=await descriptor(bp.reference);assert(ref.accepted);assert.equal(bp.sourceLevelId,q.sourceLevelId);
   assert.equal(levelSha256(ref.level),bp.referenceLevelSha256);assert.equal(routeSha256(ref.drags),bp.referenceRouteSha256);
   assert.deepEqual(q.prefixDrags,bp.prefixDrags);assert.deepEqual(q.prefixDrags,ref.drags.slice(0,q.prefixDrags.length));
   assert.deepEqual(q.provenance.region,bp.region);assert.deepEqual(q.provenance.reference,bp.reference);
   assert.deepEqual(q.branchProvenance.previousNewFixedInputs,pair.previous);assert.deepEqual(q.branchProvenance.failedParent,plan.failedParents.find(p=>lowBandBranchKey(p)===lowBandBranchKey(q)));
   const regionIds=new Set(bp.region.bodyIds);assert.deepEqual(bp.fixedBlocks,ref.level.blocks.filter(x=>!regionIds.has(x.id)));
   assert(q.prefixDrags.every(d=>!regionIds.has(d.blockId)));const firstRegionDrag=ref.drags.findIndex(d=>regionIds.has(d.blockId));assert(firstRegionDrag>=q.prefixDrags.length,'Reviewed cut may precede the first region move but must not include it');
   const source=runtime.LEVELS.find(l=>l.id===q.sourceLevelId);assert(source);
   if(!sourceBindings.has(source.id)){const current=await currentMainlineSourceBinding(runtime,environment,source.id);await bindings(current.bindings);sourceBindings.set(source.id,current);}
   assert.equal(q.sourceLevelSha256,levelSha256(source));assert.equal(q.level.width,source.width);assert.equal(q.level.height,source.height);assert.equal(points(boardCells(q.level)),points(boardCells(source)));
   const region=bp.region,oldSet=new Set(ref.level.blocks.map(bodyFootprint)),newSet=new Set(q.level.blocks.map(bodyFootprint));
   const oldBodies=ref.level.blocks.filter(x=>!newSet.has(bodyFootprint(x))),newBodies=q.level.blocks.filter(x=>!oldSet.has(bodyFootprint(x)));
   assert.equal(points(oldBodies.flatMap(absoluteCells)),points(region.cells));assert.equal(points(newBodies.flatMap(absoluteCells)),points(region.cells));
   assert(connected(region.cells));assert.equal(oldBodies.length,region.originalBodyCount);
   assert.deepEqual(oldBodies.map(b=>b.id).sort(),[...region.bodyIds].sort());assert(region.cells.length/boardCells(q.level).length>=.35);
   assert.equal(points(q.level.blocks.flatMap(absoluteCells)),points(boardCells(q.level)));
   for(const fixed of bp.fixedBlocks)assert.deepEqual(q.level.blocks.find(x=>x.id===fixed.id),fixed);
   const f=designFingerprints(q.level);assert.deepEqual(q.stockFingerprints,f);changed(designFingerprints(ref.level),f);
   assert.equal(q.redesignOf,plan.failedParents.find(p=>lowBandBranchKey(p)===lowBandBranchKey(q)).id);
   const gateGeometrySha256=describeLayout(q.level).gateGeometrySha256;
   const basicCount=selected.filter(x=>x.stageKey==='basic-combined'&&x.difficulty===q.targetDifficulty&&describeLayout(x.level).gateGeometrySha256===gateGeometrySha256).length;
   assert.deepEqual(q.gateGeometry,{sha256:gateGeometrySha256,currentBasicBandCount:basicCount,maximumPerFinalGroup:2,
    basicEligibleBeforeOtherNewAdmissions:basicCount<2,finalAdmissionMustRecountActualSelected:true,notAnAssignedStage:true});
   // Unrelated historical inventories are not a global pure-shape ban; physical identities/partitions and near checks remain universal.
   for(const sealed of plan.failedParents)assert.notEqual(identity(f),identity(sealed.fingerprints));
   for(const old of knownPrevious)assert.notEqual(partition(q.level),partition(old.level));
   const retry=identity(f),paths=[`${PUBLIC_ATTEMPT_LEDGER}/identities/${retry}.json`,`${PUBLIC_ATTEMPT_LEDGER}/identities/${retry}.blocked.json`,`${PUBLIC_ATTEMPT_LEDGER}/${f.designSha256}.request.json`,`${PUBLIC_ATTEMPT_LEDGER}/${f.designSha256}.blocked.json`];
   for(const p of paths)assert(!await exists(p),`Already claimed: ${p}`);
   assert(!requests.some(r=>r.value.id===f.designSha256||r.value.shapeSha256===f.shapeSha256&&r.value.colorSha256===f.colorSha256));
   const nearest=pool=>Math.max(0,...pool.map(x=>compareLayouts(q.level,x.level).footprintSimilarity));
   const similarity={reference:compareLayouts(q.level,ref.level).footprintSimilarity,source:compareLayouts(q.level,source).footprintSimilarity,
    selected:nearest(selected),priorMacro:nearest(knownPrevious),old450:nearest(old450),newBatch:nearest(eligible)};
   assert.deepEqual(similarity,q.similarity);for(const[k,v]of Object.entries(similarity))assert(v<=(k==='source'?.55:k==='old450'?.75:.65)+1e-12,`Near ${k}`);
   const staticAudit=await auditV4StaticCandidate(runtime,{...plan.staticSlots[q.targetDifficulty],sourceLevelId:q.sourceLevelId,level:q.level});assert(staticAudit.passed,staticAudit.issues.join(';'));
   assert.deepEqual(staticAudit,q.inputStaticAudit);for(const[p,h]of Object.entries(staticAudit.assetBindings))await bytes(path.posix.join('public',p),h);
   runtime.assertPlainProofDomain(q.level);assertSolidNativeStock(q.level);const prefix=auditPrefix(runtime,q.level,q.prefixDrags);assertLowBandBatchPrefixFacts(bp,prefix);
   assert(q.constructionAccounting.completeWorldReservations+q.prefixDrags.length+2<10000);
   eligible.push(q);rows.push({candidate:item,recipeId:bp.recipeId,sourceLevelId:q.sourceLevelId,levelSha256:q.levelSha256,shapeSha256:f.shapeSha256,colorSha256:f.colorSha256,
    sharedIdsRecoloured:sharedChanges(designFingerprints(ref.level),f),changedArea:region.cells.length,totalArea:boardCells(q.level).length,
    changedOldBodies:oldBodies.length,changedNewBodies:newBodies.length,connectedRegion:true,sourceBinding:sourceBindings.get(source.id),
    similarity,staticAudit,prefix,gateGeometrySha256:describeLayout(q.level).gateGeometrySha256,
    gateGeometryAdmission:q.gateGeometry,
    publicIdentity:{retry,design:f.designSha256,unclaimed:true,historicalRequestCollisions:0},constructionAccounting:q.constructionAccounting});
  }
  await checkLedgerSnapshot(plan.ledgerSnapshot,{allowedNewFiles:lowBandConstructionFiles(index.plan,plan.proposal.sha256)});
  assert.deepEqual((await fs.readdir(PUBLIC_ATTEMPT_LEDGER)).filter(n=>n.endsWith('.request.json')).sort(),ledgerNames,'Public claims changed during audit');
  for(const[p,h]of Object.entries(fileBindings))assert.equal(hash(await fs.readFile(p)),h,`Input changed: ${p}`);
  report={status:LOW_BAND_BATCH_STATIC_REVIEW_STATUS,index:{path:`${inputDirectory}/index.json`,sha256:fileBindings[`${inputDirectory}/index.json`]},plan:index.plan,
   fileBindings,verifiedCandidates:rows.length,errors,environment,constructionRows,rows,staticPartitionAttempts:index.attempts.length,
   stocksEnteringColourCspIncludingFailed:paints,totalActualInputsIncludingThis:index.totalActualInputsIncludingThis,perRecipeColourCspInputs:recipeCounts,recipeReview:index.recipeReview,lowBandQualification:plan.lowBandQualification,predeclaredUpperStrategy:'plain-joint-low-band',selectedIndex:plan.selectedIndex,publicRequestCountRead:requests.length,
   publicClaimsStarted:0,newGameplaySearches:0,newConstructionCalls:0,providedPrefixReplays:rows.length*2,fullUValidated:false,
   L:null,U:null,formalReady:false,canvasRendered:false,currentRuntimeValidationClaimed:false,tool:{path:SELF,sha256:fileBindings[SELF]},
   limitations:'Static complete inventory and actual supplied prefix only. No complete U, difficulty L, Canvas/Pointer, natural-clock or final slot acceptance.'};
 }catch(error){errors.push(error.message);report={status:'INDEPENDENT_LOW_TWENTY_STATIC_FAIL',auditFailureStack:error.stack,index:index?{path:`${inputDirectory}/index.json`,sha256:fileBindings[`${inputDirectory}/index.json`]}:null,
  plan:index?.plan??null,fileBindings,verifiedCandidates:rows.length,errors,environment,constructionRows,rows,publicClaimsStarted:0,newGameplaySearches:0,newConstructionCalls:0,formalReady:false};}
 await fs.writeFile(outputFile,JSON.stringify(report,null,2)+'\n',{flag:'wx'});return report;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const[input,output]=process.argv.slice(2);assert(input&&output,'Usage: audit-low-band-batch-static-independent input-directory fresh-output-json');
 const result=await auditLowBandBatchStatic(input,output);console.log(JSON.stringify({status:result.status,verifiedCandidates:result.verifiedCandidates,errors:result.errors}));
 if(result.status!==LOW_BAND_BATCH_STATIC_REVIEW_STATUS)process.exitCode=1;
}
