import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';

// Metadata only. This deliberately does not import a constructor, runtime,
// attempt ledger, model, or solver, and cannot execute this future proposal.
const V4='deliverables/daily-formal-v4-20261008';
const output=`${V4}/design/low-band-two-advanced-plan-01`;
assert(!fs.existsSync(output),'Never overwrite an earlier plan');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex'),bindings={};
function read(descriptor){
 assert(descriptor?.path&&/^[a-f0-9]{64}$/.test(descriptor.sha256??''));
 const bytes=fs.readFileSync(descriptor.path);assert.equal(sha(bytes),descriptor.sha256,descriptor.path);
 bindings[descriptor.path]=descriptor.sha256;return JSON.parse(bytes);
}
function descriptor(path){const value={path,sha256:sha(fs.readFileSync(path))};bindings[path]=value.sha256;return value;}
const selection={path:`${V4}/selection/gate-aware-basic-147-01/index.json`,sha256:'049a2cea87672b4fbf54afdb06ae01d8b3c964af85a0e9447c23b5ec3e1f39dd'};
const capacityReport={path:`${V4}/design/low-band-two-adaptation-readonly-01/report.json`,sha256:'abf994d396503c23571c2921e7fee861d4657bca5d955db1666f12c3347fe877'};
const independentAudit={path:`${V4}/proof/low-band-prefix-actual-independent-02/report.json`,sha256:'77260857025930f25c8fcc3023d095cc92196fd58593725eb3f5a9911e8fc080'};
const selected=read(selection),capacity=read(capacityReport);read(independentAudit);
assert.equal(selected.files.length,147);assert.equal(capacity.newConstructions,0);assert.equal(capacity.newSearches,0);
for(const file of selected.files)descriptor(file);
const manifest=read(descriptor('docs/rules/manifest.json'));assert.equal(manifest.activeVersion,'1.156.0');
const active=manifest.versions.find(v=>v.version===manifest.activeVersion);
assert.equal(sha(fs.readFileSync(active.document)),active.sha256);bindings[active.document]=active.sha256;
const rows=capacity.rows.map((row,index)=>{
 const mechanism=index===0?'generator':'key-lock',baseline=row.priorByProposedMechanism[mechanism];
 const base=read(row.base);assert(base.accepted&&!base.qualificationOnly&&base.L===21&&base.U===28&&base.difficulty===2);
 assert.equal(base.levelSha256,levelSha256(base.level));assert.equal(base.routeSha256,routeSha256(base.drags));
 const prefix=`deliverables/daily-formal-v3-20261008/proof/attempts/${base.attempt.id}`;
 const publicRequest=descriptor(`${prefix}.request.json`),publicResult=descriptor(`${prefix}.result.json`);
 const request=read(publicRequest),result=read(publicResult);assert.deepEqual(request,base.attempt);
 assert(result.accepted);assert.equal(result.status,base.status);assert.equal(result.levelSha256,base.levelSha256);
 assert.deepEqual(result.lower,base.lowerBound.result);assert.equal(base.route.search,null);assert.equal(result.upper,null);
 const sidecar=descriptor(base.evidenceFile),originalPlan=base.planEvidence;
 read(sidecar);read(originalPlan);read(base.plan.constructionEvidence);read(base.preflightAudit);read(base.visualReview);
 const prior=read({path:baseline.prior.sourceReport,sha256:baseline.prior.sourceReportSha256});
 assert.equal(levelSha256(prior.level),baseline.prior.levelSha256);
 assert(!selected.files.some(p=>p.endsWith('/'+baseline.slot.formalId+'.json')),'Proposed slot already filled');
 let construction;
 if(mechanism==='generator'){
  assert.equal(row.generator.compatibleKnownRouteOwners.length,1);
  const owner=row.generator.compatibleKnownRouteOwners[0];assert.equal(owner.id,'v3-100-7949656-b16');
  construction={strategy:'existing-reviewed-composeCapacity-known-witness',
   implementation:'tools/daily-challenge/formal-v3/capacity-compose.mjs',
   primaryCountsDeclaredBeforeConstruction:[3,2,1],maxAttemptsPerCount:3,
   knownRouteCompatibleOwnerCount:1,knownRouteOwner:owner,
   intendedRealization:{generatorInstances:1,queuePerGenerator:4,queueShape:'native unrotated SQ2 copied from the actual owner',
    queueInitialOuterColoursAlternate:true,auxiliaryInstancesAtLeast:2,
    auxiliarySelection:'frozen deterministic addCapacitySupport chooses actual late first-exit/first-action counters from the constructed full FIFO route',
    applicableD2MinimumCounter:5,minimumDistinctReleaseEvents:2},
   comparison:{oldGeneratorInstances:1,oldQueuePerGenerator:2,oldTotalMechanismInstances:1,
    newGeneratorMinimum:1,newQueuePerGenerator:4,newTotalMechanismInstancesAtLeast:3},
   restrictions:['Mount and late owner exit are necessary conditions only; full FIFO U has not been constructed.',
    'All four cargo bodies must actually spawn and clear while at least two original bodies remain.',
    'Auxiliary counters are not fixed from the old plain trace because inserted cargo changes actual clear counts.',
    'Shared construction budget covers every primary-count attempt and full mechanism world. No reset per count.',
    'Any terminal construction or final-proof failure forbids trying this base under key/axis/another stage.']};
 }else{
  assert(row.key.knownRouteCompatible);assert.deepEqual(row.key.proposedLocks.map(x=>x.count),[5,6]);
  construction={strategy:'new-reviewed-fixed-d2-six-key-two-lock-known-route-once',
   requiredNewHelper:true,existingD1HelperMustRemainFrozen:true,configurationsAttemptedMaximum:1,
   keys:row.key.proposedKeys,locks:row.key.proposedLocks.map(x=>({id:x.id,count:x.count,firstAction:x.firstAction,clearsBeforeFirst:x.clearsBeforeFirst})),
   actualPlainKeyReleaseDrags:row.key.distinctReleaseDrags,
   comparison:{oldLockInstances:1,oldLockCounts:[1],oldKeyBodies:1,newLockInstances:2,newLockCounts:[5,6],newKeyBodies:6},
   engineeringChoiceNotUniformUserQuota:true,routeRepairAllowed:false,fullBoardUpperSearchAllowed:false,
   requirements:['Exactly the same 44-drag path must pass canonical and independent replay on the actual keyed object.',
    'Actual key events must release the 5 and 6 locks at distinct events before their first action.',
    'Names, IDs, route and lower evidence of the accepted base are immutable; the new mechanism object owns its own evidence.',
    'Fresh original final L>=21 and complete U<=30 are required; plain L21 is not relabelled as new proof.']};
 }
 return{index,base:row.base,slot:baseline.slot,sourceLevelId:base.sourceLevelId,sourceLevelSha256:base.plan.sourceLevelSha256,
  baseLevelSha256:base.levelSha256,baseRouteSha256:base.routeSha256,baseL:base.L,baseU:base.U,totalDrags:base.drags.length,
  originalMathematicalEvidence:{publicRequest,publicResult,sidecar,plan:originalPlan,constructionEvidence:base.plan.constructionEvidence,
   independentAudit,upperAccounting:base.upperAccounting,lowerRegisteredStates:base.lowerBound.result.discoveredStates,
   noBaseSearchRepeated:true},
  priorBaseline:baseline.prior,construction,nearestSelectedPlain:row.nearestCurrentSelected,
  designStatus:'plain base preflight and visual review bound; final mechanism object not yet built',
  finalObjectProof:{requiredFloor:21,completeUpperLimit:30,providedCompleteRouteRequired:true,
   firstFinalMechanismProofOnly:true,lowerBudget:{maxStates:9999,maxTransitions:10000000,maxMicroStates:3000000,maxMilliseconds:30000},
   terminalGuardAllowance:1,actualFullBoardUpperBoundMaximum:10000,
   mechanismBaseReceipt:'pass original accepted descriptor only when final shape+colour identity is unchanged; added queue uses ordinary first input'},
  stageSwitchAfterFailureAllowed:false,publicClaims:0,newConstructions:0,newSearches:0,formalReady:false};
});
const plan={schemaVersion:4,version:'low-band-two-advanced-readonly-proposal-v1',status:'FIXED_TWO_SLOT_PROPOSAL_AWAITING_NARROW_ENTRY_QUALIFICATION',
 executable:false,selection,selectedCount:147,maximumNewBaseAdaptations:2,rows,capacityReport,independentAudit,
 mutualPlainFootprintSimilarity:capacity.mutualFootprintSimilarity,
 entryWorkRequired:{acceptedLowBandAdapter:'Proof agent: verify original low-band public request/result/sidecar/plan and exact U/L without rewriting the base or another plain search.',
  latestSelectionContext:'Narrow exact147 context must verify both prefix-basic admissions and the seven constraint admissions in addition to previous capacity receipts; never pretend they are capacity sidecars.',
  mechanismEntry:'New isolated two-row advanced entry reuses shared construction/public identity ledgers and guarded final proof; no edits to accepted frozen capacity/D1constraint helpers.',
  keyD2Constructor:'New isolated fixed two locks5/6 plus six keys constructor and actual-event strength audit, private fixtures before real construction.',
  finalGates:'Normal source/q0/full inventory, latest real mechanism, exact old baseline enhancement, actual U, both-way whole/full similarity, visual ancestry and source/old450 checks before the first final proof.'},
 oneBaseOnePredeterminedStage:true,failedBaseFallbackAllowed:false,oldPlainMathematicsImmutable:true,
 staticOnlyPlan:true,newMechanismWorlds:0,newSearches:0,newClaims:0,selectionModified:false,formalReady:false,
 policyRuleVersion:manifest.activeVersion,policyRuleSha256:active.sha256,
 plannedMathematicalEnvironment:capacity.executionEnvironment,currentRuntimeValidationClaimed:false,
 acceptanceWarning:'This is a design proposal, not a new accepted mechanism object or an execution authorization token.',bindings};
const self='tools/daily-challenge/formal-v4/prepare-low-band-two-advanced-plan.mjs';bindings[self]=sha(fs.readFileSync(self));
for(const file of ['tools/daily-challenge/formal-v3/capacity-compose.mjs','tools/daily-challenge/formal-v3/capacity-primary-adapter.mjs',
 'tools/daily-challenge/formal-v3/capacity-intensity-policy.mjs','tools/daily-challenge/formal-v4/route-constraint-construction.mjs'])descriptor(file);
fs.mkdirSync(output);const file=`${output}/plan.json`;fs.writeFileSync(file,JSON.stringify(plan,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({path:file,sha256:sha(fs.readFileSync(file)),rows:rows.map(r=>({base:r.base.path,slot:r.slot.formalId})),newConstructions:0,newSearches:0,newClaims:0}));
