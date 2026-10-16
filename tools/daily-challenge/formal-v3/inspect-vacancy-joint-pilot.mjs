import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {levelSha256} from '../formal-v2/contract.mjs';
import {designFingerprints} from './bounded-proof.mjs';

// Read saved receipts only. Never invokes a geometry, colour, lower or upper search.
const root='deliverables/daily-formal-v3-20261008';
const input=process.argv[2]??`${root}/design/vacancy-joint-pilot-01/report.json`;
const output=process.argv[3]??`${root}/proof/vacancy-joint-pilot-independent-v1.json`;
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const bind=p=>({path:p,sha256:sha(p)});
const bindings=[];
function bound(b){assert.equal(sha(b.path),b.sha256,`Evidence byte mismatch: ${b.path}`);bindings.push(b);return read(b.path);}
const report=read(input),plan=bound(report.plan),parent=bound(plan.parentFailed),family=bound(plan.wholeBoardFamily);
assert.equal(report.proofSearches,0);assert.equal(report.accepted,0);assert.equal(report.records.length,0);
assert.equal(report.geometryCalls,1);assert.equal(report.jointTailSearches,1);
assert.equal(plan.maximumNewGeometryStocks,8);assert.equal(plan.maximumJointTailSearches,1);
assert.equal(plan.productionFloor,31);assert.equal(plan.familyMaximumAccepted,1);
assert.equal(levelSha256(parent.level),levelSha256(family.level));
assert.equal(parent.accepted,false);assert.equal(parent.attempt.id,plan.parentAttemptId);
const priorBlock=bound(plan.publicFailureBlock);assert.equal(priorBlock.attemptId,parent.attempt.id);
const priorRequestPath=`${root}/proof/attempts/${parent.attempt.id}.request.json`,priorRequest=read(priorRequestPath);
assert.equal(priorRequest.levelSha256,levelSha256(parent.level));assert.equal(priorRequest.id,parent.attempt.id);
bindings.push(bind(priorRequestPath));
const qualification=bound(plan.constructorQualification);
assert.equal(qualification.status,'INDEPENDENT_CONSTRUCTOR_QUALIFICATION_COMPLETE');
assert.equal(qualification.evidence.length,9);assert(qualification.evidence.every(t=>t.passed));
assert.equal(qualification.proofToolchainSha256,'45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804');
for(const tool of plan.tools){assert.equal(sha(tool.path),tool.sha256);assert.equal(sha(tool.snapshot),tool.snapshotSha256);assert.equal(tool.sha256,tool.snapshotSha256);bindings.push(tool);}
const rows=[];
for(const row of report.rows){
 const request=bound(row.request),geometry=bound(row.geometry),construction=bound(row.construction);
 assert.equal(request.stock,row.stock);assert.equal(request.parentAttemptId,parent.attempt.id);
 assert.deepEqual(request.inputPlan,report.plan);assert.deepEqual(request.budget,plan.sharedBudget);
 assert.equal(request.oneFixedDomain,true);
 const planned=plan.inputs.find(i=>i.index===row.index);assert(planned);
 assert.equal(planned.fingerprint.stockSha256,row.stock);assert.equal(planned.staticGeometry.pass,true);
 assert.equal(designFingerprints(planned.level).shapeSha256,request.newShapeInventorySha256);
 assert.notEqual(request.newShapeInventorySha256,parent.attempt.shapeSha256);
 assert.deepEqual(geometry.built.blocks,planned.level.blocks.map(({id,x,y,shape})=>({id,x,y,shape})));
 assert.equal(geometry.result.rawGeometricStates,row.rawGeometry);
 assert.equal(geometry.result.queue.length,row.rawGeometry);
 assert.equal(construction.fixedDomainSha256,levelSha256(construction.fixedDomain));
 assert.equal(construction.fixedDomainSha256,row.fixedDomainSha256);
 assert.equal(construction.fixedTarget.depth,32);assert.equal(construction.prefix.chain.minimumNonClearingBeforeSecondClear,31);
 assert.equal(construction.status,'CONSTRUCTION_UNKNOWN');assert.equal(construction.reason,'fixed-domain-zero-parking-tail-exhausted');
 assert.equal(construction.U,null);assert.equal(construction.level,null);assert.equal(construction.tail.completeAssignments,0);
 assert.equal(construction.proofSearches,0);assert.equal(construction.accepted,false);
 const a=construction.accounting;assert.deepEqual(row.accounting,a);
 assert.equal(a.kinds.priorGeometry,geometry.result.rawGeometricStates);
 assert.equal(Object.values(a.kinds).reduce((n,v)=>n+v,0),a.rawFullBoardStates);
 assert.equal(a.rawFullBoardStates,599);assert.equal(a.rawExploredStates,564);
 assert(a.rawFullBoardStates<=10000&&a.rawExploredStates<=a.rawFullBoardStates);
 assert(a.microDiscoveredStates<=a.budget.maxMicroStates&&a.microExpandedStates<=a.microDiscoveredStates);
 assert(a.attemptedTransitions<=a.budget.maxTransitions&&a.elapsedMilliseconds<a.budget.maxMilliseconds);
 const resultPath=row.request.path.replace('.request.json','.result.json'),blockPath=row.request.path.replace('.request.json','.blocked.json');
 const result=read(resultPath),block=read(blockPath);bindings.push(bind(resultPath),bind(blockPath));
 assert.deepEqual(Object.fromEntries(Object.keys(row).map(k=>[k,result[k]])),row);
 assert.equal(result.routeFound,false);assert.equal(result.proofSearches,0);
 assert.equal(block.stock,row.stock);assert.equal(block.continuedSearchForbidden,true);
 assert.deepEqual(block.result,bind(resultPath));
 rows.push({stock:row.stock,status:row.status,request:row.request,result:bind(resultPath),blocked:bind(blockPath),
  geometry:row.geometry,construction:row.construction,rawGeometry:row.rawGeometry,rawConstruction:a.rawFullBoardStates,
  explored:a.rawExploredStates,tailBranches:a.kinds['tail-colour-and-clear-branch'],completeAssignments:construction.tail.completeAssignments,
  prefixDrags:construction.prefix.drags.length,target:construction.fixedTarget,
  soleImmediatelyEligibleBody:construction.secondClearEarlyEligible.map(x=>x.bodyId),
  failureDiagnosticScope:'Only saved aggregate and fixed-domain data inspected; no branch trace was retained, so the exact terminal conflicts are not independently reconstructed.'});
}
const result={status:'READONLY_CONSTRUCTION_FAILURE_AUDIT_COMPLETE',input:bind(input),rows,bindings,
 constructorQualification:plan.constructorQualification,accepted:0,formalReady:false,
 searchInvocations:0,publicLedgerWrites:0,productionChanged:false,
 resolvedPreRunFindings:['Parent 0074 now maps to original failure candidate-0000/e235; no 0059 mix-up.',
 'Every claimed stock completes through finally into immutable result and blocked evidence on failure. Unexpected exceptions stop the batch.',
 'Gate-overlap negative now reaches the intended static gate domain check in independent qualification v4.'],
 firstOriginalLower:'Not reached: no complete actual object/route exists. A future new-stock success still requires first public-ledger claim, shape AND actual colour change, current design gates, provided-route fresh L31, and no retry after failure.',
 scope:'Constructor small-fixture qualification and saved failed-pilot bookkeeping only; not a new difficulty proof, actual completed production witness, Pointer verification, or formal slot.'};
fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,sha256:sha(output),status:result.status,rows:rows.length,raw:rows[0].rawConstruction,proofSearches:0}));
