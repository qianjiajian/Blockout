import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {levelSha256,routeSha256,independentReplay} from '../formal-v2/contract.mjs';
import {boardBaselineSha256} from '../formal-v2/geometry.mjs';
import {canonicalExit} from '../formal-v2/proof-scheduled-route.mjs';
import {retileWholeBoard,absoluteCells,boardCells,bodyFootprint,inventorySummary} from '../formal-v3/diversity-layout-factory.mjs';
import {compareLayouts} from '../formal-v3/diversity.mjs';
import {designFingerprints,boundedBudget,createAttemptLedger} from '../formal-v3/bounded-proof.mjs';
import {assertIceProofDomain} from '../formal-v3/bounded-ice-proof.mjs';
import {guardedIceTask,reservedGuardBudget,guardAllowanceFor} from '../formal-v3/reserved-guard-budget.mjs';
import {inspectSearchAccounting} from '../formal-v3/catalog-contract.mjs';
import {quoteReverseForwardDrag} from './reverse-construction-reservations.mjs';
import {assertNativeBatchRecipe} from './native-batch-contract.mjs';
import {mappedLatePrefix} from './late-region-gate-aware-factory.mjs';
import {colourLatePrefixGateAware} from './late-prefix-gate-aware-colouring.mjs';
import {fixedGateColourRuntime} from './first-clear-plain-stock.mjs';
import {createEarlyStockMeter} from './early-six-task-factory.mjs';
import {assertV4Runtime} from './runtime.mjs';
import {prefixExecutionEnvironment,currentMainlineSourceBinding,observeExecutionPolicy} from './prefix-execution-environment-task.mjs';
import {assertConstraintLedgerNamespace} from './constraint-attempt-guard.mjs';
import {PUBLIC_ATTEMPT_LEDGER} from './bounded-qualify.mjs';
import {HISTORY_ROOTS} from './early-prefix-four-contract.mjs';
import {realPathWithSuffix} from './native-batch-io.mjs';

export const PARKING_ICE_VERSION='source29-parking-prefix-retile-preserved-gate-ice-original-joint-v1';
export const SELF='tools/daily-challenge/formal-v4/parking-ice-region-stock.mjs';
export const SOURCE29_REFERENCE=Object.freeze({path:'deliverables/daily-formal-v4-20261008/selection/merged-116-v2/daily-basic-combined-d3-03.json',sha256:'c868e91ad41544b254458274034449b1eb73b3bdbcf04f604c2791acbcd54b59'});
const LIMITS=Object.freeze({maxStates:10000,maxTransitions:10000000,maxMicroStates:3000000,maxDragStates:10000,maxMilliseconds:30000});
const sha=b=>createHash('sha256').update(b).digest('hex'),copy=structuredClone;
const points=ps=>JSON.stringify(ps.map(p=>[...p]).sort((a,b)=>a[1]-b[1]||a[0]-b[0]));
const integer=(n,min=0,max=Number.MAX_SAFE_INTEGER)=>assert(Number.isSafeInteger(n)&&n>=min&&n<=max);
const descriptor=d=>assert(d&&typeof d.path==='string'&&/^[a-f0-9]{64}$/.test(d.sha256??''));

/** A real gate-ice domain, never a plain mathematical projection. */
export function assertParkingGateIceDomain(level){
 assertIceProofDomain(level);assert(level.gates.some(g=>g.frozen>0),'At least one real frozen gate required');
 assert.equal(new Set(level.gates.map(g=>g.color)).size,level.gates.length);
 for(const b of level.blocks){assert.equal(b.frozen,undefined,'This source has gate ice only');
  const w=1+Math.max(...b.shape.map(p=>p[0])),h=1+Math.max(...b.shape.map(p=>p[1]));
  assert.equal(new Set(b.shape.map(p=>p.join(','))).size,w*h,'Retained and new bodies must be native rectangles');}
}

/** Necessary only: bodies of the sole frozen-gate colour cannot contribute
 * clears before that gate opens. This is not a reachability/lower proof. */
export function frozenGateInventoryCapacity(gates,blocks,totalBodies=blocks.length){
 integer(totalBodies,blocks.length);assert.equal(new Set(gates.map(g=>g.color)).size,gates.length);
 return gates.filter(g=>g.frozen>0).map(g=>{const colourBodies=blocks.filter(b=>b.color===g.color).length,maximumColourBodies=Math.max(0,totalBodies-g.frozen);
  return{id:g.id,color:g.color,initialIce:g.frozen,totalBodies,colourBodies,maximumColourBodies,
   passed:colourBodies===0||colourBodies<=maximumColourBodies,necessaryOnly:true};});
}

/** Coordinate/receipt metadata only; reference double replay belongs to prepare. */
export function makeParkingIceBlueprint(rt,reference,recipe,{qualificationOnly=false}={}){
 assert.equal(typeof qualificationOnly,'boolean');descriptor(recipe.reference);
 if(!qualificationOnly){assert.deepEqual(recipe.reference,SOURCE29_REFERENCE);assert.equal(recipe.sourceLevelId,29);assert.equal(recipe.cut,11);
  assert.equal(sha(readFileSync(recipe.reference.path)),recipe.reference.sha256,'Exact selected reference bytes');}
 assert.equal(reference.accepted,true);assert(reference.L>=31&&reference.U>=reference.L);assert.equal(recipe.referenceBand,3);
 assert.equal(recipe.finalTargetDifficulty,3);assert.equal(recipe.sourceLevelId,reference.sourceLevelId??reference.level.id);
 const level=reference.level,drags=reference.drags;assertParkingGateIceDomain(level);
 assert.equal(reference.levelSha256,levelSha256(level));assert.equal(recipe.referenceLevelSha256,reference.levelSha256);
 assert.equal(recipe.referenceRouteSha256,routeSha256(drags));assert.equal(drags.filter(d=>!d.exitSide).length,reference.U);
 integer(recipe.cut,1,drags.length);const prefixDrags=copy(drags.slice(0,recipe.cut));assert(!prefixDrags.at(-1).exitSide,'Declared cut must end in a parking drag');
 const changed=new Set(recipe.regionBodyIds);assert.equal(changed.size,recipe.regionBodyIds.length);
 const changedBodies=level.blocks.filter(b=>changed.has(b.id)),fixedBlocks=level.blocks.filter(b=>!changed.has(b.id));
 assert.equal(changedBodies.length,changed.size);const cells=changedBodies.flatMap(absoluteCells),board=boardCells(level);
 assert(changedBodies.length*2>=level.blocks.length&&cells.length*2>=board.length,'Replace at least half original bodies and playable area');
 const source=rt.LEVELS.find(l=>l.id===recipe.sourceLevelId);assert(source);assert.equal(boardBaselineSha256(level),boardBaselineSha256(source));
 assert.equal(points(level.blocks.flatMap(absoluteCells)),points(board));
 for(const b of level.blocks){const m=rt.matchFormalBlockShape(b.shape,'native-only');assert.equal(m?.quarterTurns,0);assert(rt.GAME_ART.gameplay.formalBlocks[b.color]?.solid?.[m.shapeId]);}
 integer(recipe.seed,1,2**32-1);integer(recipe.colourSeed,1,2**32-1);integer(recipe.bodyCountDelta,-2,3);
 assert.equal(recipe.maximumStocks,1);integer(recipe.maximumStaticPartitionAttempts,1,2000);assert(['balanced','bar-mix','axial-bars'].includes(recipe.shapeProfile));
 const count=changedBodies.length+recipe.bodyCountDelta;assert(count>0&&count<=cells.length&&count*6>=cells.length);
 assert(frozenGateInventoryCapacity(level.gates,fixedBlocks,fixedBlocks.length+count).every(x=>x.passed),'Retained colour inventory prevents declared body count from unlocking gate ice');
 const b={...copy(recipe),version:PARKING_ICE_VERSION,qualificationOnly,targetDifficulty:3,level:copy(level),changedBodies:copy(changedBodies),fixedBlocks:copy(fixedBlocks),
  allReferenceGates:copy(level.gates),normalBoardArea:board.length,region:{cells,bodyIds:[...changed],area:cells.length,fraction:cells.length/board.length,originalBodyCount:changed.size,connected:true},
  prefixDrags,prefixSha256:routeSha256(prefixDrags),prefixFacts:{drags:prefixDrags.length,parking:prefixDrags.filter(d=>!d.exitSide).length,clears:prefixDrags.filter(d=>d.exitSide).length},
  endsAtParking:true,prefixIsNotLowerBound:true,oldSuffixIsNotNewU:true,metadataOnly:true,completeReferenceDualReplayRequired:true,accepted:false};
 assertNativeBatchRecipe(b);if(!qualificationOnly)assert.deepEqual(b.prefixFacts,{drags:11,parking:10,clears:1});return b;
}

/** The old CSP calls a runtime domain callback, then uses only coordinates,
 * q0 art, adjacency and gate apertures. This explicit static-only adapter
 * accepts real gate ice without erasing any field. Treating frozen apertures
 * as already open is a conservative colour/parking restriction, not a U/L.
 */
export function staticGateIceColourRuntime(rt,gates){
 const colours=fixedGateColourRuntime(rt,gates);
 return Object.freeze({...colours,assertPlainProofDomain(level){assertParkingGateIceDomain(level);assert.deepEqual(level.gates,gates);},
  staticGateIceColourDomain:true,mathematicalPlainDomainClaimed:false});
}

/** Two real interpreters, including clone/model/start/final snapshots. The
 * reviewed per-drag envelope already overcounts fresh-model work per drag;
 * two additional units per exit cover deferred completion and its snapshot.
 * Frozen gate counters mutate inside that same world, without a new model. */
export function parkingIceReplayQuote(drags){
 assert(Array.isArray(drags)&&drags.length);let worlds=8,transitions=8,micro=2;
 for(const d of drags){const q=quoteReverseForwardDrag(d),extra=2*Number(!!d.exitSide);
  worlds+=2*(q.worlds+extra);transitions+=2*(q.transitions+extra);micro+=2*q.micro;}
 return{worlds,transitions,micro,exactCountClaimed:false,version:'dual-gate-ice-forward-envelope-v1'};
}
export const parkingPrefixReservations=drags=>parkingIceReplayQuote(drags).worlds;
export function auditParkingIcePrefix(rt,level,drags,{guard=()=>{}}={}){
 assertParkingGateIceDomain(level);const models=[new rt.PuzzleModel(copy(level)),new rt.PuzzleModel(copy(level),{deferExitCompletion:true})];
 models.forEach(m=>m.startCountdown());const trace=[];let clears=0;
 for(const [i,d]of drags.entries()){
  const snapshots=models.map((m,deferred)=>{guard();const before=m.snapshot();m.beginAction();let exit=canonicalExit(rt,m,d.blockId);
   assert(!exit||!d.path.length,'Pointer-down exit must end the drag');
   for(const [j,p]of d.path.entries()){guard();const b=m.getBlock(d.blockId),from=[b.x,b.y];assert.equal(Math.abs(p[0]-b.x)+Math.abs(p[1]-b.y),1);
    assert(m.moveBlockStep(d.blockId,...p));exit=canonicalExit(rt,m,d.blockId,from);assert(!exit||j===d.path.length-1,'First gate contact precedes prefix endpoint');}
   assert.equal(exit,d.exitSide,'Original automatic exit differs from declared parking/clear');const e=d.exitSide?m.tryExit(d.blockId,d.exitSide):null;if(e)assert(e.ok);
   assert(m.commitAction());if(deferred&&e?.exitAnimationId)assert(m.completeExitAnimation(e.exitAnimationId));const after=m.snapshot();
   assert(!after.failed);assert.equal(after.moves,before.moves+1);assert.equal(after.cleared-before.cleared,Number(!!d.exitSide));return after;});
  assert.deepEqual(JSON.parse(JSON.stringify(snapshots[0])),JSON.parse(JSON.stringify(snapshots[1])));clears+=Number(!!d.exitSide);
  for(const g of level.gates)assert.equal(snapshots[0].gates.find(x=>x.id===g.id).frozen,Math.max(0,(g.frozen??0)-clears));
  trace.push({drag:i+1,clears,stateSha256:levelSha256(snapshots[0])});
 }
 assert(!models[0].snapshot().complete);return{valid:true,providedPrefixOnly:true,fullUValidated:false,isLowerBound:false,trace,clearEvents:clears,nonClearingDrags:drags.length-clears};
}

/** One finite region retile / one colour CSP. No solver or public claim. */
export function constructParkingIceStock(rt,bp,{geometryFilter,forbiddenShapeHashes=[],meterLimits={}}={}){
 assert.equal(bp.version,PARKING_ICE_VERSION);assertNativeBatchRecipe(bp);assertParkingGateIceDomain(bp.level);
 if(!bp.qualificationOnly){assert.equal(bp.sourceLevelId,29);assert.deepEqual(bp.reference,SOURCE29_REFERENCE);const bytes=readFileSync(bp.reference.path);assert.equal(sha(bytes),bp.reference.sha256);
  const reference=JSON.parse(bytes);assert.deepEqual(bp.level,reference.level);assert.deepEqual(bp.prefixDrags,reference.drags.slice(0,11));
  assert(bp.changedBodies.length*2>=bp.level.blocks.length&&bp.region.area*2>=bp.normalBoardArea);assert.equal(typeof geometryFilter,'function','Live history/source/selected guard is mandatory');}
 const meter=createEarlyStockMeter(meterLimits),source=bp.level,{seed,colourSeed,bodyCountDelta,shapeProfile}=bp;
 const partition=retileWholeBoard({...source,playable:bp.region.cells,blocked:[],blocks:bp.changedBodies},rt,{seed,maxNodes:4000,maxTransitions:8000,
  bodyCount:bp.changedBodies.length+bodyCountDelta,irregular:false,minimumIrregular:0,shapeProfile,fixedBlocks:[],forbiddenFootprints:bp.changedBodies.map(bodyFootprint)});
 meter.partitionTransitions(partition.transitions??0);let paint=null,level=null,placeholderWorld=null,prefixWorlds=0,finalWorlds=0,prefixTransitions=0,prefixMicroStates=0;
 const accounting=()=>{const a=meter.snapshot();return{version:'parking-gate-ice-static-construction-v1',completeWorldReservations:a.completeWorldReservations,
  placeholderWorldReservations:a.placeholderWorldReservations,completedColourWorldReservations:a.completedColourWorldReservations,finalWorldReservations:finalWorlds,prefixCompleteWorldReservations:prefixWorlds,
  transitions:a.transitions,microStates:a.microStates+prefixMicroStates,elapsedMilliseconds:a.elapsedMilliseconds,prefixTransitions,prefixMicroStates};};
 const result=(status,extra={})=>({version:PARKING_ICE_VERSION,qualificationOnly:bp.qualificationOnly,ok:false,status,partition,paint,level,placeholderWorld,
  constructionAccounting:accounting(),enteredColourCsp:paint!==null,newSearches:0,accepted:false,L:null,U:null,...extra});
 if(!partition.ok)return result('STATIC_PARTITION_REJECTED');
 try{
  assert.equal(points(partition.blocks.flatMap(absoluteCells)),points(bp.region.cells));meter.reserveWorld('placeholderWorldReservations');
  const used=new Set(source.blocks.map(b=>b.id));let serial=0;const id=()=>{let x;do{x=`parking-ice-${seed}-${++serial}`;}while(used.has(x));used.add(x);return x;};
  level={...copy(source),blocks:[...copy(bp.fixedBlocks),...partition.blocks.map((b,i)=>({...b,id:bp.changedBodies[i]?.id??id(),color:'red'}))]};placeholderWorld=level;
  const old=designFingerprints(source),fingerprint=designFingerprints(level);
  assert.notEqual(fingerprint.shapeSha256,old.shapeSha256,'Real shape-inventory change required');assert(!forbiddenShapeHashes.includes(fingerprint.shapeSha256));
  const oldF=new Set(source.blocks.map(bodyFootprint)),newF=new Set(level.blocks.map(bodyFootprint));
  assert.equal(points(source.blocks.filter(b=>!newF.has(bodyFootprint(b))).flatMap(absoluteCells)),points(bp.region.cells));
  assert.equal(points(level.blocks.filter(b=>!oldF.has(bodyFootprint(b))).flatMap(absoluteCells)),points(bp.region.cells));
  assert(compareLayouts(level,source).footprintSimilarity<=.65);const geometryAudit=geometryFilter?.(level)??null;if(geometryAudit)assert(geometryAudit.passed);
  const fixedIceCapacity=frozenGateInventoryCapacity(source.gates,bp.fixedBlocks,level.blocks.length);assert(fixedIceCapacity.every(x=>x.passed),'Fixed colour inventory cannot unlock its sole frozen gate');
  const forbiddenBodyColours=Object.fromEntries(level.blocks.filter(b=>!bp.fixedBlocks.some(x=>x.id===b.id)).map(b=>[b.id,
   [...new Set([...fixedIceCapacity.filter(x=>x.colourBodies>=x.maximumColourBodies).map(x=>x.color),...(b.id===bp.changedBodies[0].id?[bp.changedBodies[0].color]:[])])]]));
  paint=colourLatePrefixGateAware(level,staticGateIceColourRuntime(rt,source.gates),{seed:colourSeed,...meter.paintLimits(),paletteSize:source.gates.length,
   mappedPrefix:{...mappedLatePrefix(bp),preservedGates:copy(source.gates)},fixedBodyColours:Object.fromEntries(bp.fixedBlocks.map(b=>[b.id,b.color])),
   forbiddenBodyColours});meter.importPaint(paint);meter.guard();
  if(!paint.ok)return result('STATIC_COLOUR_REJECTED');
  for(const g of source.gates)assert.deepEqual(paint.gates.find(x=>x.color===g.color),g);
  meter.reserveWorld('icedWorldReservations');finalWorlds++;level={...level,blocks:paint.blocks,gates:copy(source.gates)};assertParkingGateIceDomain(level);
  const gateIceCapacity=frozenGateInventoryCapacity(level.gates,level.blocks);assert(gateIceCapacity.every(x=>x.passed),'Complete colour assignment cannot unlock its sole frozen gate');
  for(const b of bp.fixedBlocks)assert.deepEqual(level.blocks.find(x=>x.id===b.id),b);
  assert.equal(points(level.blocks.flatMap(absoluteCells)),points(boardCells(source)));assert.equal(boardBaselineSha256(level),boardBaselineSha256(source));
  const final=designFingerprints(level);assert.notEqual(final.shapeSha256,old.shapeSha256);assert.notEqual(final.colorSha256,old.colorSha256);
  const inventory=inventorySummary(level,rt);assert.equal(inventory.nonNativeOrMissingArtIds.length,0);const assetBindings={};
  for(const b of level.blocks){const match=rt.matchFormalBlockShape(b.shape,'native-only');assert.equal(match?.quarterTurns,0);const file='public/'+rt.GAME_ART.gameplay.formalBlocks[b.color].solid[match.shapeId].replace(/^\//,'');assetBindings[file]=sha(readFileSync(file));}
  // The reusable meter's third reservation bucket is used for prefix images;
  // the public accounting above names those images explicitly, not new ice.
  const quote=parkingIceReplayQuote(bp.prefixDrags);assert(meter.snapshot().microStates+quote.micro<=(meterLimits.maxMicroStates??3000000),'Prefix micro budget');
  for(let i=0;i<quote.worlds;i++){meter.reserveWorld('icedWorldReservations');prefixWorlds++;}
  meter.partitionTransitions(quote.transitions);prefixTransitions=quote.transitions;prefixMicroStates=quote.micro;
  const prefixAudit=auditParkingIcePrefix(rt,level,bp.prefixDrags,{guard:meter.guard});
  return result('NEW_RETAINED_GATE_ICE_PARKING_PREFIX_STOCK',{ok:true,levelSha256:levelSha256(level),sourceLevelId:bp.sourceLevelId,prefixDrags:copy(bp.prefixDrags),prefixSha256:bp.prefixSha256,
   constructionAccounting:accounting(),prefixAudit,assetBindings,inventory,stockFingerprints:final,geometryAudit,gateIceCapacity,gateIcePreserved:true,originalGates:copy(source.gates),
   provenance:{reference:bp.reference,referenceLevelSha256:bp.referenceLevelSha256,region:bp.region,seed,colourSeed,bodyCountDelta,shapeProfile,
    allFixedBodiesExact:true,allOriginalGatesAndIceExact:true,staticCspOpenApertureRestrictionOnly:true,mathematicalPlainProjectionUsed:false},catalogEligible:false,formalReady:false});
 }catch(error){return result('STATIC_PARKING_ICE_REJECTED',{reason:error.message});}
}

export function makeParkingIceJointPlan(rt,candidate,{budget={},qualificationOnly=false}={}){
 assertV4Runtime(rt);assertParkingGateIceDomain(candidate.level);assert.equal(candidate.drags,undefined);descriptor(candidate.constructionEvidence);
 assert(frozenGateInventoryCapacity(candidate.level.gates,candidate.level.blocks).every(x=>x.passed));
 assert.equal(candidate.qualificationOnly,qualificationOnly);assert.equal(candidate.ok,true);assert.equal(candidate.prefixAudit?.valid,true);
 if(!qualificationOnly){assert.equal(candidate.sourceLevelId,29);assert.deepEqual(candidate.provenance.reference,SOURCE29_REFERENCE);
  const bytes=readFileSync(SOURCE29_REFERENCE.path);assert.equal(sha(bytes),SOURCE29_REFERENCE.sha256);const reference=JSON.parse(bytes);
  assert.deepEqual(candidate.level.gates,reference.level.gates);assert.deepEqual(candidate.prefixDrags,reference.drags.slice(0,11));
  const retained=new Set(candidate.prefixDrags.map(d=>d.blockId));for(const b of reference.level.blocks.filter(b=>retained.has(b.id)))assert.deepEqual(candidate.level.blocks.find(x=>x.id===b.id),b);
  assert.equal(boardBaselineSha256(candidate.level),boardBaselineSha256(reference.level));}
 const prior=candidate.constructionAccounting;assert.equal(prior.version,'parking-gate-ice-static-construction-v1');
 for(const k of ['completeWorldReservations','placeholderWorldReservations','completedColourWorldReservations','finalWorldReservations','prefixCompleteWorldReservations','transitions','microStates','elapsedMilliseconds','prefixTransitions','prefixMicroStates'])integer(prior[k]);
 assert.equal(prior.completeWorldReservations,prior.placeholderWorldReservations+prior.completedColourWorldReservations+prior.finalWorldReservations+prior.prefixCompleteWorldReservations);assert.equal(prior.finalWorldReservations,1);
 assert.equal(prior.placeholderWorldReservations,1);assert(prior.completedColourWorldReservations>=1);assert.equal(prior.prefixCompleteWorldReservations,parkingPrefixReservations(candidate.prefixDrags));
 const replayQuote=parkingIceReplayQuote(candidate.prefixDrags);assert.equal(prior.prefixTransitions,replayQuote.transitions);assert.equal(prior.prefixMicroStates,replayQuote.micro);
 assert(prior.transitions>=prior.prefixTransitions&&prior.microStates>=prior.prefixMicroStates);
 const inputCopyReservations=1,fullBudget=boundedBudget({...LIMITS,...budget}),jointBudget=reservedGuardBudget({...fullBudget,maxStates:fullBudget.maxStates-prior.completeWorldReservations-inputCopyReservations-1,
  maxTransitions:fullBudget.maxTransitions-prior.transitions-inputCopyReservations,maxMicroStates:fullBudget.maxMicroStates-prior.microStates,maxMilliseconds:fullBudget.maxMilliseconds-prior.elapsedMilliseconds});
 const environment=prefixExecutionEnvironment(rt,candidate.executionEnvironment);
 return{version:PARKING_ICE_VERSION,qualificationOnly,levelSha256:levelSha256(candidate.level),prefixSha256:routeSha256(candidate.prefixDrags),sourceLevelId:candidate.sourceLevelId,
  constructionEvidence:copy(candidate.constructionEvidence),constructionAccounting:copy(prior),inputCopyReservations,fullBudget,jointBudget,floor:31,searchUpper:128,
  strategy:'one-full-original-ice-joint-no-tail-no-forced-prefix',executionEnvironment:environment,maximumJointCalls:1,failedInputContinuationAllowed:false,
  originalMechanismsRetained:true,prefixIsNotLowerBound:true,formalReady:false};
}

/** Recorded raw proof and future replay reservation: no model/search call. */
export function parkingIceJointAccounting(plan,proof,{witness=null,elapsedMilliseconds=0,requireSuccess=false}={}){
 assert.deepEqual(inspectSearchAccounting(proof,'original-ice-joint'),[]);assert.deepEqual(proof.budget,plan.jointBudget);
 assert.equal(proof.sourceLevelSha256,plan.levelSha256);assert.equal(proof.floor,31);assert.deepEqual(proof.guardAllowance,guardAllowanceFor(proof));
 if(requireSuccess){assert.equal(proof.status,'threshold-proven');assert.equal(proof.thresholdProven,true);assert.equal(proof.termination,'below-threshold-exhausted');
  assert.equal(proof.routeTermination,'minimum-optional-route-found');integer(proof.cost,31);assert(proof.elapsedMilliseconds<=plan.jointBudget.maxMilliseconds);}
 const quote=witness?parkingIceReplayQuote(witness):{worlds:0,transitions:0,micro:0};integer(elapsedMilliseconds);
 const prior=plan.constructionAccounting,a={prior:prior.completeWorldReservations,inputCopy:plan.inputCopyReservations,raw:proof.rawFullBoardStates,terminalGuard:1,
  witnessReservations:quote,conservativeFullBoardStateUpperBound:prior.completeWorldReservations+plan.inputCopyReservations+proof.guardAllowance.conservativeFullBoardStateUpperBound+quote.worlds,
  transitions:prior.transitions+plan.inputCopyReservations+proof.attemptedTransitions+quote.transitions,
  microStates:prior.microStates+proof.microDiscoveredStates+quote.micro,elapsedMilliseconds,maximum:plan.fullBudget.maxStates,exactCountClaimed:false};
 assert(a.conservativeFullBoardStateUpperBound<=plan.fullBudget.maxStates,'Shared complete-world budget');
 assert(a.transitions<=plan.fullBudget.maxTransitions&&a.microStates<=plan.fullBudget.maxMicroStates,'Shared transition/micro budget');
 if(witness||requireSuccess)assert(elapsedMilliseconds<plan.fullBudget.maxMilliseconds,'Shared construction/joint/replay deadline');return a;
}

/** One original-object claim and unchanged guardedIceTask. No tail or fallback. */
export async function runParkingIceJoint(rt,candidate,{plan,redesignOf,qualificationOnly=false,ledgerDirectory=PUBLIC_ATTEMPT_LEDGER}={}){
 await assertConstraintLedgerNamespace(qualificationOnly,ledgerDirectory,ledgerDirectory);
 if(qualificationOnly){const dest=await realPathWithSuffix(ledgerDirectory);for(const root of HISTORY_ROOTS){const base=await realPathWithSuffix(root),relative=path.relative(base,dest);assert(relative==='..'||relative.startsWith('..'+path.sep)||path.isAbsolute(relative),'Private task ledger must be outside all seven production roots');}}
 if(!qualificationOnly)assert.equal(path.resolve(ledgerDirectory),path.resolve(PUBLIC_ATTEMPT_LEDGER));
 assert.deepEqual(plan,makeParkingIceJointPlan(rt,candidate,{budget:plan.fullBudget,qualificationOnly}));
 const bytes=await fs.readFile(plan.constructionEvidence.path);assert.equal(sha(bytes),plan.constructionEvidence.sha256);const original=JSON.parse(bytes);
 for(const key of ['level','prefixDrags','constructionAccounting','prefixAudit','qualificationOnly','provenance'])assert.deepEqual(original[key],candidate[key]);assert.equal(original.ok,true);
 const currentSourceBinding=await currentMainlineSourceBinding(rt,plan.executionEnvironment,candidate.sourceLevelId,{qualificationOnly});
 const compiled=await build({entryPoints:[SELF],bundle:true,packages:'external',write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'}),bindings={...rt.toolchainBindings,...plan.executionEnvironment.bindings,...currentSourceBinding.bindings};
 for(const file of Object.keys(compiled.metafile.inputs)){const p=file.replaceAll('\\','/'),digest=sha(await fs.readFile(p));if(bindings[p])assert.equal(bindings[p],digest);bindings[p]=digest;}
 for(const [p,h]of Object.entries(bindings))assert.equal(sha(await fs.readFile(p)),h);bindings[plan.constructionEvidence.path]=plan.constructionEvidence.sha256;
 const executionPolicyObservation=observeExecutionPolicy(plan.executionEnvironment),ledger=await createAttemptLedger(ledgerDirectory),attempt=await ledger.claim(candidate.level,{redesignOf,allowRevalidation:false});
 const report={schemaVersion:4,version:PARKING_ICE_VERSION,qualificationOnly,level:copy(candidate.level),levelSha256:plan.levelSha256,sourceLevelId:candidate.sourceLevelId,
  plan,attempt,executionPolicyObservation,currentSourceBinding,designBindings:bindings,accepted:false,L:null,U:null,status:'PARKING_ICE_JOINT_PENDING',proof:null,lowerBound:null,route:null,formalReady:false};
 let started;const wall=()=>plan.constructionAccounting.elapsedMilliseconds+(started===undefined?0:Date.now()-started);
 const wallGuard=()=>assert(wall()<plan.fullBudget.maxMilliseconds,'Shared construction/joint/replay deadline');
 try{
  const file=path.join(ledgerDirectory,attempt.id+'.v4-parking-ice-plan.json');await fs.writeFile(file,JSON.stringify({attempt,plan,bindings},null,2)+'\n',{flag:'wx'});
  report.planEvidence={path:file,sha256:sha(await fs.readFile(file))};
  started=Date.now();wallGuard();const proof=guardedIceTask(report.level,rt,{floor:31,searchUpper:128,...plan.jointBudget});report.proof=proof;
  report.lowerBound={method:'v3-native-static-ice-joint-search',inputLevelSha256:report.levelSha256,requiredFloor:31,result:proof};
  report.accounting=parkingIceJointAccounting(plan,proof,{elapsedMilliseconds:wall()});
  if(!['threshold-proven','relaxed-shortcut'].includes(proof.status)||!Number.isSafeInteger(proof.cost)||!Array.isArray(proof.drags)){report.status='UNKNOWN_ORIGINAL_ICE_JOINT_TERMINAL';return report;}
  report.accounting=parkingIceJointAccounting(plan,proof,{witness:proof.drags,elapsedMilliseconds:wall()}); // Debit before either replay.
  wallGuard();const canonical=rt.replayRevisedRoute(report.level,proof.drags);wallGuard();
  const independent=independentReplay(rt,report.level,proof.drags);wallGuard();report.route={search:proof,inputLevelSha256:report.levelSha256,
   routeSha256:routeSha256(proof.drags),canonicalReplay:canonical,independentReplay:independent};
  for(const r of [canonical,independent]){assert(r.valid&&r.complete&&!r.failed);assert.equal(r.clearEvents,report.level.blocks.length);assert.equal(r.nonClearingDrags,proof.cost);assert.equal(r.effectiveDrags,proof.drags.length);}
  assert.equal(independent.remainingBodies,0);assert.equal(independent.remainingQueued,0);report.drags=copy(proof.drags);report.routeSha256=routeSha256(proof.drags);report.U=proof.cost;
  if(!proof.thresholdProven||proof.cost<31){report.status='ORIGINAL_ICE_SHORTCUT_TERMINAL';return report;}
  report.accounting=parkingIceJointAccounting(plan,proof,{witness:proof.drags,elapsedMilliseconds:wall(),requireSuccess:true});
  report.L=31;report.accepted=true;report.status='EXPLORATORY_ORIGINAL_ICE_LU';report.mathematicalEvidenceValidated=true;return report;
 }catch(error){report.status='PARKING_ICE_REJECTED';report.reason=error.message;return report;}
 finally{
  if(report.accounting)report.accounting.elapsedMilliseconds=wall();
  if(levelSha256(report.level)!==plan.levelSha256){report.accepted=false;report.status='PARKING_ICE_INPUT_CHANGED';}
  for(const [p,h]of Object.entries(bindings))if(await fs.readFile(p).then(sha).catch(()=>null)!==h){report.accepted=false;report.status='PARKING_ICE_BINDING_CHANGED';report.reason=p;}
  if(!report.accepted)report.mathematicalEvidenceValidated=false;report.redesignRequired=!report.accepted;
  report.evidenceFile=path.join(ledgerDirectory,attempt.id+'.v4-parking-ice-result.json');await fs.writeFile(report.evidenceFile,JSON.stringify(report,null,2)+'\n',{flag:'wx'});await ledger.finish(attempt,report);
 }
}
