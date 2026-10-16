import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {assertNative120SearchAccounting,assertNative120UpperAccounting} from './audit-native-batch-actual-independent.mjs';

const output=process.argv[2];assert(output,'Fresh evidence directory required');
const sha=b=>createHash('sha256').update(b).digest('hex');
const file='deliverables/daily-formal-v4-20261008/proof/native120-counter-independent-v2-01/author-rerun/report.json';
const bytes=await fs.readFile(file),source=JSON.parse(bytes);
const original=source.evidence.find(e=>e.result?.accepted&&e.result?.upperConstruction?.tailSearch)?.result;assert(original);
const prefix=original.upperConstruction.drags.slice(0,original.upperConstruction.prefixAudits.length);
assertNative120SearchAccounting(original.upperConstruction.tailSearch);assertNative120UpperAccounting(original,prefix);
const evidence=[];
for(const [name,mutate,check]of [
 ['witness cannot be recorded after its native tail deadline',q=>q.upperConstruction.tailSearch.elapsedMilliseconds=q.upperConstruction.tailSearch.budget.maxMilliseconds+1,q=>assertNative120SearchAccounting(q.upperConstruction.tailSearch)],
 ['contained tail wall time cannot exceed encompassing upper wall time',q=>q.upperConstruction.tailSearch.elapsedMilliseconds=q.upperConstruction.elapsedMilliseconds+1,q=>assertNative120UpperAccounting(q,prefix)],
 ['prefix action charge is reconstructed from actual provided paths, not borrowed by the tail',q=>{assert.equal(q.upperConstruction.prefixTransitions,1);q.upperConstruction.prefixTransitions=0;q.upperConstruction.tailSearch.budget.maxTransitions++;},q=>assertNative120UpperAccounting(q,prefix)]
]){
 const q=structuredClone(original);mutate(q);let rejected=false,error=null;try{check(q);}catch(e){rejected=true;error=e.message;}
 evidence.push({name,passed:rejected,error,changedFields:{upperElapsed:q.upperConstruction.elapsedMilliseconds,tailElapsed:q.upperConstruction.tailSearch.elapsedMilliseconds,
  tailBudget:q.upperConstruction.tailSearch.budget,prefixTransitions:q.upperConstruction.prefixTransitions},privateRecordedMetadataOnly:true});
}
const toolBindings={};for(const name of ['audit-native-batch-actual-independent.mjs','native-batch-actual-auditor-negative.mjs']){
 const p='tools/daily-challenge/formal-v4/'+name;toolBindings[p]=sha(await fs.readFile(p));}
const publicCount=(await fs.readdir('deliverables/daily-formal-v3-20261008/proof/attempts')).filter(x=>x.endsWith('.request.json')).length;
const report={status:evidence.every(e=>e.passed)?'NATIVE_BATCH_ACTUAL_AUDITOR_NEGATIVES_PASS':'NATIVE_BATCH_ACTUAL_AUDITOR_NEGATIVES_FAIL',qualificationOnly:true,
 evidence,sourcePrivateEvidence:{path:file,sha256:sha(bytes)},toolBindings,newSearches:0,newConstructions:0,publicClaimsStarted:0,publicRequestCount:publicCount,formalReady:false};
await fs.mkdir(output,{recursive:false});await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,passed:evidence.filter(e=>e.passed).length,total:evidence.length,sha256:sha(await fs.readFile(path.join(output,'report.json')))}));
if(evidence.some(e=>!e.passed))process.exitCode=1;
