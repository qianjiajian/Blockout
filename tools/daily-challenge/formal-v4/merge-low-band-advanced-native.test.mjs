import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import test from 'node:test';
import {assertFixedAdvancedMergeBatch,assertNativeDraftUnchanged,NATIVE_MERGE_INPUTS} from './merge-low-band-advanced-native.mjs';
import {LOW_BAND_SEED147,LOW_BAND_TWO_PROPOSAL} from './low-band-advanced-context.mjs';
import {NATIVE_BASIC_DRAFT_INPUTS} from './prepare-native-basic-admission.mjs';

// Metadata fault controls only; no merge call, runtime, actual adaptation,
// solver, public ledger mutation, or selected-JSON write occurs in this file.
const read=async d=>JSON.parse(await fs.readFile(d.path));
const seed=await read(LOW_BAND_SEED147),proposal=await read(LOW_BAND_TWO_PROPOSAL);
const clone=q=>structuredClone(q),batch='deliverables/daily-formal-v4-20261008/selection/low-band-two-advanced-01/';
function fixture(flags){
 const receipts=proposal.rows.map((row,i)=>({...row.slot,sourceLevelId:row.sourceLevelId,baseReceipt:row.base,
  accepted:flags[i],catalogEligible:flags[i],qualificationOnly:false,formalReady:false,productionChanged:false,
  status:flags[i]?'CONTROL_ACCEPTED':'CONTROL_REJECTED',L:flags[i]?21:null,U:flags[i]?28:null}));
 const outcomes=receipts.map((q,i)=>({file:batch+String(i+1).padStart(2,'0')+'-'+q.formalId+'.json',
  sha256:String(i+1).repeat(64),formalId:q.formalId,status:q.status,accepted:q.accepted,L:q.L,U:q.U}));
 const accepted=outcomes.filter(r=>r.accepted).map(r=>r.file);
 return{seed:clone(seed),proposal:clone(proposal),receipts,
  completion:{status:'FINITE_TWO_LOW_BAND_ADVANCED_PLAN_FINISHED',inputPlan:clone(LOW_BAND_TWO_PROPOSAL),outcomes,
   accepted:accepted.length,combinedCandidates:147+accepted.length,formalReady:false},
  index:{scope:300,inputSelection:clone(LOW_BAND_SEED147),inputPlan:clone(LOW_BAND_TWO_PROPOSAL),priorIndex:LOW_BAND_SEED147.path,
   files:[...seed.files,...accepted],candidateCount:147+accepted.length,formalReady:false},
  audit:{status:'INDEPENDENT_LOW_BAND_TWO_ADVANCED_ACTUAL_PASS',errors:[],newSearches:0,
   completion:{path:batch+'completion.json',sha256:'a'.repeat(64)},index:{path:batch+'index.json',sha256:'b'.repeat(64)},
   results:outcomes.map(({file,sha256,accepted,L,U})=>({file,sha256,accepted,L,U}))}};
}

test('fixed two metadata supports zero, one or two accepts and preserves exact147 prefix',()=>{
 for(const flags of [[false,false],[true,false],[false,true],[true,true]]){
  const f=fixture(flags);assert.equal(assertFixedAdvancedMergeBatch(f).length,flags.filter(Boolean).length);
 }
});
test('omitted/reordered old receipts, failed append and unplanned third row are rejected',()=>{
 for(const mutate of [f=>f.index.files.shift(),f=>[f.index.files[0],f.index.files[1]]=[f.index.files[1],f.index.files[0]],
  f=>f.index.files.push(f.completion.outcomes[1].file),f=>f.receipts.push(clone(f.receipts[0])),
  f=>f.completion.outcomes[0].file=batch+'unplanned.json',f=>f.index.inputSelection.sha256='0'.repeat(64)]){
  const f=fixture([true,false]);mutate(f);assert.throws(()=>assertFixedAdvancedMergeBatch(f));
 }
});
test('independent status/SHA/L/U mismatches and preclaimed formal flags fail closed',()=>{
 for(const mutate of [f=>f.audit.status='PASS',f=>f.audit.results[0].sha256='0'.repeat(64),f=>f.audit.results[0].L=31,
  f=>f.audit.results[0].U=20,f=>f.audit.results[0].accepted=false,f=>f.audit.newSearches=1,
  f=>f.receipts[0].formalReady=true,f=>f.receipts[0].qualificationOnly=true,f=>f.receipts[1].catalogEligible=true,
  f=>f.audit.results[1]=clone(f.audit.results[0]),f=>f.completion.accepted=2]){
  const f=fixture([true,false]);mutate(f);assert.throws(()=>assertFixedAdvancedMergeBatch(f));
 }
});
test('real native draft remains false and original level/route/lower/external identity are immutable',async()=>{
 const draft=await read(NATIVE_MERGE_INPUTS.draft),math=await read(NATIVE_BASIC_DRAFT_INPUTS.math);
 assert.doesNotThrow(()=>assertNativeDraftUnchanged(draft,math));
 for(const mutate of [q=>q.accepted=true,q=>q.catalogEligible=true,q=>q.formalId='daily-basic-combined-d3-09',
  q=>q.level.blocks[0].x++,q=>q.drags.pop(),q=>q.lowerBound.result.floor=30,q=>q.U++,
  q=>q.mathematicalProof.sha256='0'.repeat(64),q=>q.inputSelection.sha256='0'.repeat(64),q=>q.pointerValidated=true]){
  const q=clone(draft);mutate(q);assert.throws(()=>assertNativeDraftUnchanged(q,math));
 }
});
