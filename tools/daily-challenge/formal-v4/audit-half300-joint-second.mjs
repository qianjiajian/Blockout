import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {levelSha256} from '../formal-v2/contract.mjs';
import {designFingerprints} from '../formal-v3/bounded-proof.mjs';
const dir='deliverables/daily-formal-v4-20261008/design/macro-prefix-half300-joint-02';
const ledger='deliverables/daily-formal-v3-20261008/proof/attempts';
const read=p=>JSON.parse(fs.readFileSync(p)),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex'),bind=p=>({path:p,sha256:sha(p)});
const plan=read(`${dir}/plan.json`),completion=read(`${dir}/completion.json`),rows=[];
assert.equal(completion.results.length,8);assert.equal(completion.provisionalCount,0);assert.equal(completion.formallyAdopted,0);assert.equal(completion.formalReady,false);
for(const key of ['pool','selection','visualAndStaticAudit'])assert.equal(sha(plan[key].path),plan[key].sha256);
assert.equal(plan.floor,31);assert.equal(plan.options.searchUpper,128);assert(plan.noSecondBandOrStrategySearch);
const allRequests=fs.readdirSync(ledger).filter(x=>x.endsWith('.request.json')).map(n=>({path:`${ledger}/${n}`,value:read(`${ledger}/${n}`)}));
const boundTools=Object.entries(plan.bindings).map(([path,sha256])=>{assert.equal(sha(path),sha256,`Historical tool still matches ${path}`);return{path,sha256};});
for(const [i,r]of completion.results.entries()){
 const q=read(r.file),input=read(r.input),reqPath=`${ledger}/${q.attempt.id}.request.json`,resultPath=`${ledger}/${q.attempt.id}.result.json`;
 const request=read(reqPath),result=read(resultPath),fingerprint=designFingerprints(q.level),search=q.route.search;
 assert.equal(sha(r.input),plan.inputs[i].sha256);assert.equal(plan.inputs[i].file,r.input);
 assert.equal(levelSha256(input.level),q.levelSha256);assert.equal(levelSha256(q.level),q.levelSha256);assert.deepEqual(input.level,q.level);
 assert.deepEqual(request,q.attempt);assert.equal(request.levelSha256,q.levelSha256);assert.equal(result.levelSha256,q.levelSha256);
 for(const k of ['shapeSha256','colorSha256','designSha256'])assert.equal(request[k],fingerprint[k]);
 const retry=levelSha256({shapeSha256:fingerprint.shapeSha256,colorSha256:fingerprint.colorSha256});assert.equal(request.retryIdentitySha256,retry);
 assert.equal(q.accepted,false);assert.equal(result.accepted,false);assert.equal(q.status,'UNKNOWN_UPPER');assert.equal(result.status,q.status);assert.equal(r.status,q.status);
 assert.equal(q.L,null);assert.equal(q.U,null);assert(!q.route.drags?.length);assert.equal(q.formalReady,false);
 assert.deepEqual(search,q.lowerBound.result);assert.deepEqual(result.lower,search);assert.deepEqual(result.upper,search);
 const identityPath=`${ledger}/identities/${retry}.json`,blockedPath=`${ledger}/${request.identityOrigin}.blocked.json`,identityBlockedPath=`${ledger}/identities/${retry}.blocked.json`;
 assert.equal(read(identityPath).origin,request.identityOrigin);assert(fs.existsSync(blockedPath)&&fs.existsSync(identityBlockedPath));
 assert.equal(read(blockedPath).attemptId,request.id);assert.equal(read(identityBlockedPath).attemptId,request.id);
 const identical=allRequests.filter(r=>r.value.shapeSha256===fingerprint.shapeSha256&&r.value.colorSha256===fingerprint.colorSha256);
 assert.equal(identical.length,1);assert.equal(identical[0].value.id,request.id);assert.equal(request.revalidates,undefined);
 const g=search.guardAllowance;assert.equal(search.budget.maxStates,9999);assert.equal(g.registeredSetBudget,9999);assert.equal(g.unregisteredTerminalWorldAllowance,1);
 assert.equal(search.rawFullBoardStates,g.registeredRawSetStates);assert.equal(search.rawExploredStates,g.registeredExpandedStates);
 assert.equal(g.conservativeFullBoardStateUpperBound,search.rawFullBoardStates+1);assert(g.conservativeFullBoardStateUpperBound<=10000);
 assert(search.rawFullBoardStates<=9999&&search.rawExploredStates<=9999);assert.equal(g.exactFullBoardVisitedCountClaimed,false);
 assert.equal(search.budget.maxTransitions,10000000);assert.equal(search.budget.maxMicroStates,3000000);assert.equal(search.budget.maxDragStates,10000);assert.equal(search.budget.maxMilliseconds,30000);
 assert(search.attemptedTransitions<=10000000&&search.microDiscoveredStates<=3000000&&search.microExploredStates<=3000000);
 assert(search.elapsedMilliseconds<=30000);assert.equal(search.floor,31);assert.equal(search.sourceLevelSha256,q.levelSha256);
 assert.equal(g.frozenProofToolchainSha256,'45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804');
 rows.push({index:i,input:bind(r.input),resultPacket:bind(r.file),levelSha256:q.levelSha256,attemptId:request.id,
  request:bind(reqPath),result:bind(resultPath),identity:bind(identityPath),blocked:bind(blockedPath),identityBlocked:bind(identityBlockedPath),
  firstAttemptOnly:true,sealedAgainstOriginalRetry:true,status:q.status,L:null,U:null,rawStates:search.rawFullBoardStates,expanded:search.rawExploredStates,
  conservativeWholeWorldUpperBound:g.conservativeFullBoardStateUpperBound,exactVisitedClaimed:false,termination:search.termination,routeTermination:search.routeTermination??null,
  partialCertifiedFloor:search.certifiedFloor,partialFloorDoesNotSupplyCompleteUOrCandidatePASS:true,
  transitions:search.attemptedTransitions,microStates:search.microDiscoveredStates,elapsedMilliseconds:search.elapsedMilliseconds,budget:search.budget});
}
const construction=read('deliverables/daily-formal-v4-20261008/design/macro-prefix-half300-02/report.json');
const paintRows=construction.attempts.filter(r=>r.colour);assert.equal(paintRows.length,8);assert(paintRows.every(r=>r.colour.ok&&r.colour.completeColourAssignments===1));
const audit={status:'INDEPENDENT_EIGHT_FAILURES_SEALED_AUDIT_PASS',accepted:false,formalReady:false,newSearches:0,newClaims:0,
 inputs:8,completeUpperWitnesses:0,successfulCandidates:0,combinedOriginal64FixedInputs:13,
 plan:bind(`${dir}/plan.json`),completion:bind(`${dir}/completion.json`),allRequestsRead:allRequests.length,rows,
 conclusions:{wholeWorldCapReached:rows.filter(r=>r.termination==='max-raw-board-states').length,upperWindowExhausted:rows.filter(r=>r.routeTermination==='search-upper-exhausted').length,
  reusedFailedInputs:0,source118SameProtectedChainNotRecommendedForFurtherBlindBatch:true},
 constructionClarification:{fixedPhysicalInputs:8,staticPartitionAttempts:222,colourCalls:8,reportedCompleteColourAssignments:8,
  allActualPaintCallsSuccessfulWithExactlyOneCompleteAssignment:true,
  genericHelperLimitation:'Some unexecuted failure branches omit completeColourAssignments. These eight calls did not take those branches; future runners must retain attempted complete assignment counts and must not infer zero on missing counters.',
  sourceSimilarityCheckedAfterConstruction:true,sourceMaximum:.14285714285714285,
  nextImplementationRecommendation:'Pre-screen source similarity before painting, and require explicit finite complete-assignment accounting on every colour outcome.'},
 proposalVsExecutedBudget:{proposalMaxDragStates:2000,actualPredeclaredJointMaxDragStates:10000,actualJointPlanWasSeparateBeforeFirstClaim:true,
  wholeBoardLimitUnchanged:10000,transitionCeilingUnchanged:10000000,microCeilingUnchanged:3000000},
 boundToolsStillMatch:boundTools,auditTool:bind('tools/daily-challenge/formal-v4/audit-half300-joint-second.mjs'),
 limitations:['No failed level was solved or continued during this audit.','Partial floor values do not replace missing complete U.','The finite upper window is an implementation budget, not a D3 difficulty upper limit.']};
fs.writeFileSync(`${dir}/completion-audit.json`,JSON.stringify(audit,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output:`${dir}/completion-audit.json`,sha256:sha(`${dir}/completion-audit.json`),conclusions:audit.conclusions,rows:rows.map(({index,termination,routeTermination,rawStates,microStates,transitions,partialCertifiedFloor})=>({index,termination,routeTermination,rawStates,microStates,transitions,partialCertifiedFloor}))}));
