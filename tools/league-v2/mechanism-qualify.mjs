import fs from 'node:fs';
import path from 'node:path';
import {loadLeagueProofRuntime,verifyLeagueCandidate} from './proof-contract.mjs';
import {composeLeagueMechanisms} from './mechanism-compose.mjs';

const [file,indexText]=process.argv.slice(2),index=Number(indexText);
if(!file||!Number.isInteger(index))throw Error('usage: node mechanism-qualify.mjs plain-packet.json index');
const OUT='deliverables/league-v2-20261008/mechanisms/qualified';fs.mkdirSync(OUT,{recursive:true});
const out=path.join(OUT,`index-${String(index).padStart(3,'0')}-${Date.now()}.json`);
const mechanismFile=out.replace(/\.json$/,'.mechanism.json');
const input=JSON.parse(fs.readFileSync(file)),runtime=await loadLeagueProofRuntime();
const baseline=JSON.parse(fs.readFileSync('deliverables/league-v2-20261008/mechanisms/old-formal100-mechanisms.json'));
const mechanisms=await composeLeagueMechanisms(input,{index,sourceLevelId:input.sourceLevelId,runtime,previousInventory:baseline.rows[index-1].inventory});
let proof;
if(mechanisms.ok)proof=await verifyLeagueCandidate(runtime,mechanisms,{ledgerDirectory:'deliverables/league-v2-20261008/mechanisms/proof-attempts',lowerBudget:{maxStates:10000,maxTransitions:3000000,maxMicroStates:1000000,maxMilliseconds:10000},attemptKey:`league-${index}`,retryUnsearchedConfiguration:true});
fs.writeFileSync(mechanismFile,JSON.stringify({...mechanisms,basePath:file,mechanismReceipt:mechanismFile.replaceAll('\\','/')},null,2)+'\n',{flag:'wx'});
const report={schemaVersion:1,basePath:file,mechanismReceipt:mechanismFile.replaceAll('\\','/'),mechanisms,proof,status:proof?.accepted?'SAME_OBJECT_LU_SCORE_PENDING_DIVERSITY_POINTER':mechanisms.ok?'FINAL_PROOF_REJECTED':'MECHANISM_REJECTED',formalEligibility:false};
fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({out,status:report.status,reason:mechanisms.reason,proofStatus:proof?.status,issues:proof?.staticAudit?.issues,L:proof?.L,U:proof?.U,receipt:proof?.proofReceipt},null,2));
