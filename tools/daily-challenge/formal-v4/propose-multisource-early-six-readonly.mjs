import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {loadV4Runtime} from './runtime.mjs';
import {currentMainlineSourceBinding} from './prefix-execution-environment.mjs';
import {verifyRulesLock} from '../../verify-rules-lock.mjs';
import {levelSha256,routeSha256,independentReplay} from '../formal-v2/contract.mjs';
import {boardBaselineSha256} from '../formal-v2/geometry.mjs';
import {canonicalExit} from '../formal-v2/proof-scheduled-route.mjs';
import {auditV4StaticCandidate} from './static-contract.mjs';
import {compareLayouts} from '../formal-v3/diversity.mjs';

// Existing routes and existing footprints only. This does not instantiate an
// iced level, retile any region, run a CSP/solver, or open an attempt ledger.
const V4='deliverables/daily-formal-v4-20261008';
const SELF='tools/daily-challenge/formal-v4/propose-multisource-early-six-readonly.mjs';
const OUT=process.argv[2]??`${V4}/design/multisource-early-six-proposal-01/proposal.json`;
assert(!fs.existsSync(OUT),'Immutable report already exists');
const sha=b=>createHash('sha256').update(b).digest('hex'),bindings={};
function bind(p,h){const actual=sha(fs.readFileSync(p));if(h)assert.equal(actual,h);if(bindings[p])assert.equal(bindings[p],actual);bindings[p]=actual;return{path:p,sha256:actual};}
function read(p,h){bind(p,h);return JSON.parse(fs.readFileSync(p));}
const cells=b=>b.shape.map(([x,y])=>[b.x+x,b.y+y]);
const sorted=ps=>ps.toSorted((a,b)=>a[1]-b[1]||a[0]-b[0]);
const key=p=>p.join(',');
function connected(ps){const all=new Set(ps.map(key)),seen=new Set(),queue=[ps[0]];for(const p of queue){if(seen.has(key(p)))continue;seen.add(key(p));for(const [x,y]of[[1,0],[-1,0],[0,1],[0,-1]]){const q=[p[0]+x,p[1]+y];if(all.has(key(q))&&!seen.has(key(q)))queue.push(q);}}return seen.size===ps.length;}
const briefPath=`${V4}/design/multi-source-early-ice-readonly-brief-02.json`,brief=read(briefPath);
const evidencePath=`${V4}/design/multi-source-early-ice-readonly-01.json`,evidence=read(evidencePath,'c44402197c936fce32f1dbc22f63865a7816e85151c67c8bdbb11eaa432e3f02');
assert.equal(brief.executable,false);assert.equal(evidence.executable,false);
const selectionPath=`${V4}/selection/completed-basic-and-advanced-153-01/index.json`,selection=read(selectionPath,'a12babe4ad50dc649eb3a409cd6d39cbd5b6c536df33bc4446d348b458488135');
const quickPath=`${V4}/proof/completed153-quick-independent-01.json`,quick=read(quickPath,'90d8a0d028e9d49b57108327baf27d27b03421e36a344573618cfcb320133e14');
assert.equal(quick.status,'INDEPENDENT_153_MERGE_QUICK_CHECK_PASS');assert.equal(selection.files.length,153);
const selected=selection.files.map(p=>({path:p,...read(p,quick.inputBindings[p]??selection.fileBindings[p])}));
const runtime=await loadV4Runtime(),snapshotPath=path.resolve('snapshot-environment.json'),snapshot=read(snapshotPath);
assert.equal(path.resolve(snapshot.workspace),process.cwd());assert.equal(snapshot.frozenMath,runtime.toolchainSha256);
const historicalManifestPath=path.resolve('docs/rules/manifest.json'),historicalManifest=read(historicalManifestPath);
const currentManifestPath=path.join(snapshot.sourceWorkspace,'docs/rules/manifest.json'),currentManifest=read(currentManifestPath);
assert.equal(historicalManifest.activeVersion,'1.156.0');assert.equal(currentManifest.activeVersion,'1.159.0');
assert.deepEqual(currentManifest.versions.slice(0,159),historicalManifest.versions);
for(const root of [process.cwd(),snapshot.sourceWorkspace]){const lock=verifyRulesLock({readText:p=>fs.readFileSync(path.resolve(root,p),'utf8')});assert(lock.ok);for(const r of lock.verified)bind(path.resolve(root,r.document));}
const historicalUi=path.resolve('src/game/ColorEscapeGame.ts');bind(historicalUi,snapshot.historicalUI.sha256);
const environment={status:'READ_ONLY_EXISTING_REFERENCE_REPLAY_NOT_FUTURE_EXECUTION_QUALIFICATION',descriptor:bind(snapshotPath),sourceWorkspace:snapshot.sourceWorkspace,executionWorkspace:process.cwd(),
 historicalManifest:bind(historicalManifestPath),currentManifest:bind(currentManifestPath),historicalDesignPolicy:'1.156.0',currentActivePolicy:'1.159.0',mathematicalContract:'1.154.0',mathematicalToolchainSha256:runtime.toolchainSha256,
 futureExecutionEnvironmentQualified:false,currentRuntimeValidationClaimed:false,currentUIValidated:false,
 limitation:'Root changed from158 to159 during readonly proposal preparation. Frozen158 execution guards remain unchanged and must reject. Only pre-existing supplied reference routes are replayed here; future execution requires a separately qualified current-policy bridge.'};
Object.assign(bindings,runtime.toolchainBindings);bind(SELF);
const specs=[
 {source:154,cut:27,ice:4,ids:[2,3,6,7,15,17,18,19,20,21],label:'south-and-east',reason:'Preserves the original four-clear chain; all new region bodies remain immobile until the fourth green exit.'},
 {source:154,cut:24,ice:2,ids:[1,2,3,4,6,7,15,17,18,19,20,21],label:'expanded-south-and-sides',reason:'Adds two whole left-rim V3 footprints. Ice2 thaws at drag21; the larger replacement also changes the bodies used by the later fourth clear.'},
 {source:109,cut:20,ice:4,ids:[2,3,4,5,7,8,9,11,12,13],label:'north-and-west',reason:'The fourth clear is the six-cell yellow body; all new north/west bodies wait for this event.'},
 {source:109,cut:23,ice:4,ids:[2,3,5,7,8,9,11,12,13],label:'north-and-upper-west',reason:'Keeps original bottom-left V3 outside the replacement so three additional known clears can occur before the tail; ice still releases at the fourth clear.'},
 {source:86,cut:19,ice:4,ids:[0,1,2,3,4,5,6],label:'upper-cap',reason:'Four clears open six cells before the first action in the new upper region; the fourth event is the yellow H3.'},
 {source:86,cut:18,ice:2,ids:[0,1,2,3,4,5,6,12],label:'upper-cap-plus-yellow-row',reason:'Replaces the original yellow H3 as part of a 14-cell region. It cannot require the old fourth clear because that body is replaced; ice2 instead releases at drag13.'},
];
const sources=[],recipes=[];
for(const source of [154,109,86]){
 const prior=evidence.rows.find(r=>r.sourceLevelId===source);assert(prior);
 const q=read(prior.reference.path,prior.reference.sha256);assert(q.accepted);assert.equal(levelSha256(q.level),q.levelSha256);assert.equal(routeSha256(q.drags),prior.fullRouteSha256);
 assert.equal(q.L,prior.referenceL);assert.equal(q.U,prior.referenceU);runtime.assertPlainProofDomain(q.level);
 const sourceBinding=await currentMainlineSourceBinding(runtime,environment,source);Object.assign(bindings,sourceBinding.bindings);
 assert.equal(boardBaselineSha256(q.level),boardBaselineSha256(runtime.LEVELS.find(x=>x.id===source)));
 const canonical=runtime.replayRevisedRoute(q.level,q.drags),independent=independentReplay(runtime,q.level,q.drags);
 for(const r of [canonical,independent]){assert(r.valid&&r.complete&&!r.failed);assert.equal(r.nonClearingDrags,q.U);assert.equal(r.clearEvents,q.level.blocks.length);}
 const stat=await auditV4StaticCandidate(runtime,{formalId:'daily-basic-combined-d3-01',stageKey:'basic-combined',difficulty:3,slot:1,newestMechanism:null,sourceLevelId:source,level:q.level});
 assert(stat.passed,JSON.stringify(stat.issues));Object.assign(bindings,stat.policyBindings);for(const [p,h]of Object.entries(stat.assetBindings))bind(`public/${p}`,h);
 const originalRequest=read(prior.referencePublicRequest.path,prior.referencePublicRequest.sha256),originalResult=read(prior.referencePublicResult.path,prior.referencePublicResult.sha256);
 assert.deepEqual(originalRequest,q.attempt);assert.equal(originalResult.accepted,true);assert.equal(originalResult.levelSha256,q.levelSha256);
 const failed=prior.currentFailedBranch,request=read(failed.request.path,failed.request.sha256),result=read(failed.result.path,failed.result.sha256);
 assert.equal(request.id,failed.id);assert.equal(result.accepted,false);assert.equal(read(failed.blocked.path,failed.blocked.sha256).attemptId,failed.id);assert.equal(read(failed.identityBlocked.path,failed.identityBlocked.sha256).attemptId,failed.id);
 if(failed.receipt){const receipt=read(failed.receipt.path,failed.receipt.sha256);assert.equal(receipt.sourceLevelId,source);assert.equal(receipt.accepted,false);assert.deepEqual(receipt.attempt,request);}
 const nearest=selected.map(s=>({formalId:s.formalId,path:s.path,sourceLevelId:s.sourceLevelId,...compareLayouts(q.level,s.level)})).sort((a,b)=>b.footprintSimilarity-a.footprintSimilarity).slice(0,5);
 sources.push({sourceLevelId:source,reference:prior.reference,referenceLevelSha256:q.levelSha256,referenceRouteSha256:prior.fullRouteSha256,
  originalL:q.L,originalU:q.U,drags:q.drags.length,board:prior.board,normalSourceBinding:sourceBinding,
  originalReferenceCanonical:canonical,originalReferenceIndependent:independent,originalReferenceStatic:{passed:stat.passed,artRequirements:stat.artRequirements,assetBindings:stat.assetBindings},
  acceptedOriginalPublicRequest:prior.referencePublicRequest,acceptedOriginalPublicResult:prior.referencePublicResult,
  currentKnownFailedBranch:failed,failedBranchFreshness:'Exact sealed branch rechecked; live descendant/history refresh still required at future prepare.',nearestCurrent153References:nearest,
  visualRisk:source===109?'Original shell-D1 relative exists. New region must still pass whole-pool comparison and actual Canvas review.':'Known retained-skeleton family exists; a numeric near pass alone does not resolve visual family duplication.'});
 for(const spec of specs.filter(x=>x.source===source)){
  const ids=spec.ids.map(n=>q.level.blocks.find(b=>b.id.endsWith(`-b${n}`))?.id);assert(ids.every(Boolean));const set=new Set(ids),region=q.level.blocks.filter(b=>set.has(b.id)),points=sorted(region.flatMap(cells));
  assert(connected(points));assert(points.length/prior.board.area>=.35);assert.equal(new Set(points.map(key)).size,points.length);
  const prefix=q.drags.slice(0,spec.cut);assert(prefix.every(d=>!set.has(d.blockId)));
  const cp=runtime.replayRevisedRoute(q.level,prefix),ip=independentReplay(runtime,q.level,prefix);assert(cp.valid&&!cp.complete&&ip.valid&&!ip.complete&&!ip.failed);
  const model=new runtime.PuzzleModel(structuredClone(q.level));model.startCountdown();let parking=0,unitSteps=0;const clearEvents=[];
  for(const [i,d]of prefix.entries()){
   const before=model.snapshot();model.beginAction();let auto=canonicalExit(runtime,model,d.blockId);assert(!auto||!d.path.length);
   for(const [j,p]of d.path.entries()){const b=model.getBlock(d.blockId),from=[b.x,b.y];assert.equal(Math.abs(p[0]-b.x)+Math.abs(p[1]-b.y),1);assert(model.moveBlockStep(d.blockId,...p));unitSteps++;auto=canonicalExit(runtime,model,d.blockId,from);assert(!auto||j===d.path.length-1);}
   assert.equal(auto,d.exitSide);let exit;if(auto){exit=model.tryExit(d.blockId,auto);assert(exit.ok);}assert(model.commitAction());const after=model.snapshot();assert.equal(after.cleared-before.cleared,Number(!!auto));
   if(auto){const b=q.level.blocks.find(x=>x.id===d.blockId);clearEvents.push({drag:i+1,blockId:d.blockId,color:b.color,gateId:exit.gateId,side:auto,area:b.shape.length,clearsToDate:clearEvents.length+1,parkingBefore:parking});}else parking++;
  }
  assert.equal(cp.nonClearingDrags,parking);assert.equal(ip.nonClearingDrags,parking);assert.equal(cp.clearEvents,clearEvents.length);assert.equal(ip.clearEvents,clearEvents.length);assert(clearEvents.length>=spec.ice);
  for(const b of region){const a=model.getBlock(b.id);assert(a);assert.equal(a.x,b.x);assert.equal(a.y,b.y);}
  const thaw=clearEvents[spec.ice-1],firstAction=q.drags.findIndex(d=>set.has(d.blockId))+1;assert(firstAction>spec.cut);
  recipes.push({recipeId:`early-${source}-${spec.label}`,sourceLevelId:source,reference:prior.reference,referenceLevelSha256:q.levelSha256,referenceRouteSha256:prior.fullRouteSha256,
   targetDifficulty:3,targetOriginalIceFloor:31,newL:null,newU:null,maximumColourCspInputs:1,maximumStaticPartitionAttempts:300,
   region:{bodyIds:ids,cells:points,area:points.length,normalBoardArea:prior.board.area,fraction:points.length/prior.board.area,connected:true,wholeBodies:true,originalBodyCount:region.length},
   bodyCountDesign:{target:region.length,actualNewBodies:null,feasibilityNotConstructed:true},
   prefixDrags:prefix,prefixSha256:routeSha256(prefix),prefixFacts:{drags:spec.cut,parking,clears:clearEvents.length,unitSteps,clearEvents,firstOriginalRegionAction:firstAction,remainingBodies:model.snapshot().blocks.length,freeCells:clearEvents.reduce((n,e)=>n+e.area,0)},
   referencePrefixReplays:{canonical:cp,independent:ip},allReferenceGatesToPreserve:q.level.gates,
   iceDesign:{appliesTo:'Every genuinely new body in the replacement region only',initialCount:spec.ice,plannedInstances:region.length,actualInstances:null,knownReferenceThawEvent:thaw,
    knownReferenceParkingWhileFrozen:thaw.parkingBefore,originalRegionUntouched:true,allThawedByCutUnderKnownClearSequence:true,
    noIcedLevelCreated:true,actualIcedPrefixReplayStillRequired:true},designReason:spec.reason,
   fixedOutsideBodyIds:q.level.blocks.filter(b=>!set.has(b.id)).map(b=>b.id),retainedOriginalAreaFraction:1-points.length/prior.board.area,
   failedParent:failed,prefixIsNotLowerBound:true,oldSuffixIsNotNewU:true,newCandidate:false,accepted:false,catalogEligible:false});
 }
}
const sameSourceRegionDifferences=[];for(const source of [154,109,86]){const[a,b]=recipes.filter(r=>r.sourceLevelId===source),sa=new Set(a.region.cells.map(key)),sb=new Set(b.region.cells.map(key));const delta=[...sa].filter(k=>!sb.has(k)).length+[...sb].filter(k=>!sa.has(k)).length;assert(delta>0);sameSourceRegionDifferences.push({sourceLevelId:source,a:a.recipeId,b:b.recipeId,symmetricDifferenceCells:delta,notOnlyColourChange:true});}
const report={status:'READ_ONLY_MULTISOURCE_EARLY_SIX_PROPOSAL',version:'readonly-154-109-86-two-regions-v1',executable:false,
 inputBrief:bind(briefPath),inputRouteEvidence:bind(evidencePath),selection:bind(selectionPath),selectionQuickReview:bind(quickPath),environment,
 sources,recipes,sameSourceRegionDifferences,
 quotaProposal:{newSeparateExperiment:true,extendsOldMacroQuota:false,sourceCount:3,recipes:6,maximumCspInputsIncludingFailures:6,maximumStaticPartitionAttemptsPerRecipe:300,maximumStaticPartitionAttemptsTotal:1800},
 futureRequiredGates:[
  'All reference gates remain byte-for-byte and in original order; all outside bodies remain unchanged. Normal source mask is immutable.',
  'Each region must be actually repartitioned with native q0 shapes and recoloured. New shape inventory, cell-colour map and shared-ID colour must differ from its exact failed parent and preceding same-source formed stocks. No global ban on unrelated shape inventories.',
  'Each formed placeholder and complete CSP assignment, including rejected ones, and final iced assignment is charged before creation. Failed CSP spends its recipe quota. Future plan and one construction lock fix the experiment, never reopen by label.',
  'Fresh selected/pending/successful/history filtering is required on the actual new graph. Compare both directions/eight transforms: conservative candidate-v-selected/reference/batch .65, source .55, old450 .75; final stage same-group .65/global .75 and gate-geometry maximum2 also remain. No actual new graph has passed those tests here.',
  'Before execution bind current selection and all seven construction ledgers, public paired physical identities, every placeholder/CSP failure and latest sealed failed branch. Existing blocked inputs cannot be retried by adding ice, changing method or wrapper.',
  'First verify original iced prefix in both models; all surviving ice must reach zero and the full cut state must equal the corresponding plain state. Then one fixed tail U task, original iced dual complete replay, and one independent original iced floor31 lower with searchUpper null. Never reinterpret old reference L or prefix parking as L31.',
  'Future current-policy version of the early-ice bridge wrapper requires its own narrow qualification: the requested158 policy has advanced to159 during this readonly task, so no158 execution is authorized by this report. Per new stock U budget C+2*(prefixDrags+1)+tailRegistered+guard<=10000 and independent original L registered+guard<=10000; actions/microstates/deadline remain finite and shared through each task, with late replay failures terminal.',
  'Actual Canvas and visual-family review is required even when numerical similarity passes. Sources154 and86 have visibly related selected families. No stage/strength/slot or final300 acceptance is claimed.'
 ],futureSearchBudgets:{maximumActualFullWorldStatesPerTask:10000,reservedGuard:1,maxTransitions:10000000,maxMicroStates:3000000,maxMilliseconds:30000,upperStrategy:'one plain tail after verified original iced bridge',lowerStrategy:'guarded original ice floor31 searchUpper:null',newSolverDomain:false},
 newConstructions:0,newColourCspCalls:0,newSearches:0,newLedgerClaims:0,newPhysicalCandidates:0,newLowerBounds:0,
 existingFullRouteReplays:6,existingPrefixReplays:12,existingUnitPrefixInspections:6,fileBindings:bindings};
for(const[p,h]of Object.entries(bindings))assert.equal(sha(fs.readFileSync(p)),h,'Read input drifted');
fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({path:OUT,sha256:sha(fs.readFileSync(OUT)),status:report.status,recipes:recipes.map(r=>({id:r.recipeId,area:r.region.area,ratio:r.region.fraction,prefix:r.prefixFacts.drags,parking:r.prefixFacts.parking,clears:r.prefixFacts.clears,plannedIce:r.iceDesign.plannedInstances,count:r.iceDesign.initialCount,thaw:r.iceDesign.knownReferenceThawEvent.drag})),newSearches:0,newLedgerClaims:0}));
