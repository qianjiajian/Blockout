import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
export const LATE_PREFIX_CONSTRUCTION_LEDGER='deliverables/daily-formal-v4-20261008/design/late-prefix-construction-ledger';
const sha=b=>createHash('sha256').update(b).digest('hex');
export async function claimLatePrefixPlan(descriptor,outputDirectory,{qualificationOnly=false,ledgerDirectory=LATE_PREFIX_CONSTRUCTION_LEDGER}={}){
 assert(descriptor?.path&&/^[a-f0-9]{64}$/.test(descriptor.sha256??''),'Predeclared plan path and SHA required');
 assert.equal(sha(await fs.readFile(descriptor.path)),descriptor.sha256,'Plan bytes changed before one-time claim');
 const directory=path.resolve(ledgerDirectory),production=path.resolve(LATE_PREFIX_CONSTRUCTION_LEDGER);
 if(!qualificationOnly)assert.equal(directory,production,'Production construction plans share one ledger');
 else assert(directory.toLowerCase()!==production.toLowerCase()&&!directory.toLowerCase().startsWith(production.toLowerCase()+path.sep),'Private qualification ledger required');
 await fs.mkdir(directory,{recursive:true});
 const claim={plan:descriptor,outputDirectory:path.resolve(outputDirectory),qualificationOnly,catalogEligible:false,formalReady:false,
  claimedAt:new Date().toISOString(),failedPlanContinuationAllowed:false};
 const claimFile=path.join(directory,`${descriptor.sha256}.claim.json`);
 await fs.writeFile(claimFile,JSON.stringify(claim,null,2)+'\n',{flag:'wx'});
 return{...claim,claimFile,resultFile:path.join(directory,`${descriptor.sha256}.result.json`)};
}
export async function finishLatePrefixPlan(claim,result){
 await fs.writeFile(claim.resultFile,JSON.stringify({...result,plan:claim.plan,outputDirectory:claim.outputDirectory,
  qualificationOnly:claim.qualificationOnly,catalogEligible:false,formalReady:false,finishedAt:new Date().toISOString()},null,2)+'\n',{flag:'wx'});
}
