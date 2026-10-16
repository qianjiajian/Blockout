import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {test,after} from 'node:test';
import {assertAdvancedBatchEnvelope} from './audit-low-band-advanced-batch-actual-independent.mjs';
const evidence=[];
function fixture(count=3){
 const fixed={path:'private/fixed-plan.json',sha256:'1'.repeat(64)},reviewDescriptor={path:'private/review.json',sha256:'2'.repeat(64)};
 const selection={path:'private/selected.json',sha256:'3'.repeat(64)},seed={files:Array.from({length:153},(_,i)=>`private/selected-${i}.json`)};
 const rows=Array.from({length:count},(_,i)=>({sourceLevelId:50+i,slot:{formalId:`private-slot-${i}`},band:i%2?{lower:21,upper:30}:{lower:16,upper:20}}));
 const proposal={inputSelection:selection,inputSelectionCount:seed.files.length,rows,maximumBaseAdaptations:count};
 const plan={status:'FIXED_FIRST_LOW_BAND_ADVANCED_BATCH_ADAPTATIONS',inputPlan:fixed,selection,rows,qualificationReview:reviewDescriptor};
 const outcomes=rows.map((r,i)=>({file:`private/result-${i}.json`,sha256:String(i+4).repeat(64),formalId:r.slot.formalId,sourceLevelId:r.sourceLevelId,
  accepted:i!==1,L:i!==1?r.band.lower:null,U:i!==1?r.band.upper:null,finalProofStarted:i!==1,constructionAttemptStarted:true,terminalBlocked:i===1}));
 const accepted=outcomes.filter(r=>r.accepted),completion={status:'FINITE_LOW_BAND_ADVANCED_BATCH_FINISHED',inputPlan:fixed,qualificationReview:reviewDescriptor,
  outcomes,accepted:accepted.length,combinedCandidates:seed.files.length+accepted.length};
 const index={status:'PARTIAL_LOW_BAND_ADVANCED_CANDIDATES_AWAITING_INDEPENDENT_REVIEW',inputPlan:fixed,files:[...seed.files,...accepted.map(r=>r.file)],candidateCount:completion.combinedCandidates};
 const review={status:'INDEPENDENT_LOW_BAND_ADVANCED_BATCH_PLAN_PASS',errors:[],newSearches:0,newLedgerClaims:0,plan:fixed};
 return{plan,completion,index,proposal,seed,review};
}
const check=(name,fn)=>test(name,()=>{try{fn();evidence.push({name,passed:true});}catch(e){evidence.push({name,passed:false,error:e.message});throw e;}});
check('dynamic metadata supports three mixed-band rows and one honest rejected row without old147/two-row limits',()=>{
 const q=fixture();assert.deepEqual(assertAdvancedBatchEnvelope(q),{planned:3,accepted:2,originalSelectedCount:153});
});
check('omitting original selection, duplicating result or silently changing the batch quota rejects',()=>{
 for(const mutation of [q=>q.index.files.shift(),q=>{q.completion.outcomes[1].file=q.completion.outcomes[0].file;},q=>q.proposal.maximumBaseAdaptations++,
  q=>q.completion.outcomes.pop(),q=>q.review.errors.push('not-qualified')]){const q=fixture();mutation(q);assert.throws(()=>assertAdvancedBatchEnvelope(q));}
});
check('an accepted result requires its own fresh proof and must retain the declared original difficulty interval',()=>{
 for(const mutation of [q=>q.completion.outcomes[0].finalProofStarted=false,q=>q.completion.outcomes[0].terminalBlocked=true,
  q=>q.completion.outcomes[0].L=21,q=>q.completion.outcomes[0].U=21]){const q=fixture();mutation(q);assert.throws(()=>assertAdvancedBatchEnvelope(q));}
});
after(async()=>{
 const out=process.env.ADVANCED_BATCH_ACTUAL_METADATA_OUT;if(!out)return;await fs.mkdir(out,{recursive:false});
 const fileBindings={};for(const p of ['tools/daily-challenge/formal-v4/audit-low-band-advanced-batch-actual-independent.mjs',
  'tools/daily-challenge/formal-v4/audit-low-band-advanced-batch-actual.test.mjs'])fileBindings[p]=createHash('sha256').update(await fs.readFile(p)).digest('hex');
 await fs.writeFile(out+'/report.json',JSON.stringify({status:evidence.length===3&&evidence.every(e=>e.passed)?'ADVANCED_BATCH_ACTUAL_METADATA_PRIVATE_PASS':'FAIL',
  evidence,fileBindings,newActualResultAudits:0,newSearches:0,newConstructions:0,newLedgerClaims:0,metadataOnly:true,formalReady:false},null,2)+'\n',{flag:'wx'});
});
