import test from 'node:test';
import assert from 'node:assert/strict';
import {levelSha256} from '../formal-v2/contract.mjs';
import {designFingerprints} from '../formal-v3/bounded-proof.mjs';
import {physicalPartition,physicalRetry} from './early-frozen-construction-contract.mjs';
import {EXACT_LOW20_FAILED_NEAR_VERSION,assertExactLow20FailedChain,assertExactLow20FailedPublicSidecar,isExactFailedNearAlias} from './exact-low20-failed-near-reader.mjs';
const clone=structuredClone;
function chain(){const level={id:999801,width:2,height:1,blocks:[{id:'a',x:0,y:0,color:'red',shape:[[0,0]]},{id:'b',x:1,y:0,color:'blue',shape:[[0,0]]}],gates:[]};
 const f=designFingerprints(level),levelHash=levelSha256(level),request={...f,id:f.designSha256,levelSha256:levelHash,retryIdentitySha256:physicalRetry(f)};
 const receipt={version:'low-band-fixed-prefix-one-capped-tail-original-lower-task-v1',accepted:false,qualificationOnly:false,catalogEligible:false,formalReady:false,status:'UNKNOWN_CONSTRUCTED_UPPER_TERMINAL',L:null,U:null,lowerBound:null,route:null,mathematicalEvidenceValidated:false,level,levelSha256:levelHash,sourceLevelId:999801,attempt:request};
 const auditRow={accepted:false,failureSealed:true,levelSha256:levelHash,sourceLevelId:999801,attemptId:request.id,L:null,U:null};
 const result={accepted:false,status:receipt.status,levelSha256:levelHash};const blocked={attemptId:request.id,status:receipt.status};return{auditRow,receipt,request,result,blocked,identityBlocked:clone(blocked)};}
test('exact terminal chain accepts both audited FAIL schemas, refuses PASS/pending/tampering',()=>{
 const x=chain();assertExactLow20FailedChain(x);const below=clone(x);below.receipt.status=below.result.status=below.blocked.status=below.identityBlocked.status='KNOWN_UPPER_BELOW_PREDECLARED_FLOOR';below.receipt.plan={floor:16};below.receipt.route={search:null};below.receipt.U=below.auditRow.U=14;below.result.upper=null;assertExactLow20FailedChain(below);
 for(const mutate of [x=>x.receipt.accepted=true,x=>x.result.accepted=true,x=>x.auditRow.failureSealed=false,x=>x.receipt.status='PENDING',x=>x.identityBlocked.attemptId='0'.repeat(64),x=>x.request.colorSha256='0'.repeat(64),x=>x.receipt.level.blocks[0].color='green',x=>x.result.lower={status:'PASS'}]){const q=clone(chain());mutate(q);assert.throws(()=>assertExactLow20FailedChain(q));}
});
test('near allowance requires exact origin bytes and full coloured level, never partition alone',()=>{
 const {receipt}=chain(),p='private-only/failure.json',h='1'.repeat(64);const allowance={version:EXACT_LOW20_FAILED_NEAR_VERSION,exactIdentityExclusionUnchanged:true,aliases:[{path:p,sha256:h,levelSha256:receipt.levelSha256,partitionSha256:physicalPartition(receipt.level)}]};
 const row={path:p,sha256:h,level:receipt.level};assert.equal(isExactFailedNearAlias(row,allowance),true);
 for(const alter of [r=>r.path='private-only/unrelated.json',r=>r.sha256='2'.repeat(64),r=>r.level.blocks[0].color='green',r=>r.levelSha256='3'.repeat(64),r=>r.accepted=true,r=>r.reserve=true,r=>r.visualRetired=true,r=>r.status='EXPLORATORY_VERIFIED',r=>r.mathematicalEvidenceValidated=true]){const q=clone(row);alter(q);assert.equal(isExactFailedNearAlias(q,allowance),false);}
 assert.equal(isExactFailedNearAlias({level:receipt.level,partitionSha256:physicalPartition(receipt.level)},allowance),false);
});
test('construction alias does not widen allowance to sibling file or successful same-geometry origin',()=>{
 const {receipt}=chain(),parent='private-only/construction-0001.json',h='1'.repeat(64),alias={path:parent,sha256:h,levelSha256:receipt.levelSha256,partitionSha256:physicalPartition(receipt.level)};
 const allowance={version:EXACT_LOW20_FAILED_NEAR_VERSION,exactIdentityExclusionUnchanged:true,aliases:[alias]};
 assert(isExactFailedNearAlias({origin:{path:parent,sha256:h},level:receipt.level},allowance));
 assert(!isExactFailedNearAlias({origin:{path:'private-only/construction-0002.json',sha256:h},level:receipt.level},allowance));
 assert(!isExactFailedNearAlias({origin:{path:parent,sha256:h},level:receipt.level,catalogEligible:true},allowance));
 assert(!isExactFailedNearAlias({origin:{path:parent,sha256:h},level:receipt.level},{...allowance,exactIdentityExclusionUnchanged:false}));
});
test('public sidecar alias requires the exact audited original packet and bound origin',()=>{
 const {receipt}=chain();const p=`deliverables/daily-formal-v3-20261008/proof/attempts/${receipt.attempt.id}.v4-low-band-prefix-tail-result.json`,d={path:p,sha256:'4'.repeat(64)};
 receipt.evidenceFile=p;const sidecar=clone(receipt);receipt.input={path:'private-only/input.json',sha256:'5'.repeat(64)};receipt.batchPlan={path:'private-only/plan.json',sha256:'6'.repeat(64)};
 assertExactLow20FailedPublicSidecar(receipt,sidecar,d);
 for(const mutate of [s=>s.accepted=true,s=>s.level.blocks[0].color='green',s=>s.attempt.id='0'.repeat(64),s=>s.status='PENDING',s=>s.U=12,s=>s.undeclaredField=true,s=>delete s.route]){const s=clone(sidecar);mutate(s);assert.throws(()=>assertExactLow20FailedPublicSidecar(receipt,s,d));}
 assert.throws(()=>assertExactLow20FailedPublicSidecar(receipt,sidecar,{...d,path:p.replace(receipt.attempt.id,'0'.repeat(64))}));
 const allowance={version:EXACT_LOW20_FAILED_NEAR_VERSION,exactIdentityExclusionUnchanged:true,aliases:[{...d,levelSha256:receipt.levelSha256}]};
 assert(isExactFailedNearAlias({...d,level:sidecar.level},allowance));
 assert(!isExactFailedNearAlias({...d,sha256:'7'.repeat(64),level:sidecar.level},allowance));
 assert(!isExactFailedNearAlias({...d,level:sidecar.level,reserve:true},allowance));
});
