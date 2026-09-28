import fs from 'node:fs';
import {verifyRulesLock} from '../../verify-rules-lock.mjs';
const root='deliverables/remake31-200-v145-20260924/batches/lv051-060';
const latest={54:'root54/continued-proof54-1790313020137-8.json',59:'agent58-59/continued-proof59-1790314301294-4.json'};
const lock=verifyRulesLock();if(!lock.ok||lock.activeVersion!=='1.51.0')throw new Error('v1.51 lock required');
const file=`${root}/summary.json`,s=JSON.parse(fs.readFileSync(file));
for(const [idText,rel] of Object.entries(latest)){
 const id=Number(idText),p=JSON.parse(fs.readFileSync(`${root}/${rel}`)),r=p.result,row=s.rows.find(x=>x.id===id);
 if(!row||p.ruleVersion!==lock.activeVersion||r?.status!=='unknown'||r.thresholdProven===true)throw new Error(`invalid pending report ${id}`);
 if(p.candidateSha256!==row.candidateSha256)throw new Error(`candidate drift ${id}`);
 row.ruleVersion=lock.activeVersion;row.latestProof=`${root}/${rel}`;row.floor='UNKNOWN';row.L=null;row.status='IN_PROGRESS';row.proofProgress={elapsedMilliseconds:p.totalSearchMs,discoveredStates:r.discoveredStates,exploredStates:r.exploredStates,pending:r.pendingQueueRecords,termination:r.termination,lowestQueuedCost:r.lowestQueuedCost,checkpoint:p.checkpointFile??null,continuationActive:false};row.missing=[`Fresh L${row.target.min} remains UNKNOWN after ${(p.totalSearchMs/1000).toFixed(3)} search seconds / ${r.discoveredStates} discovered states; checkpoint saved.`];
}
s.updatedAt=new Date().toISOString();s.ruleVersion=lock.activeVersion;s.rulesLock='PASS';s.candidatePass=s.rows.filter(r=>r.status==='CANDIDATE_PASS').map(r=>r.id);s.candidatePassUserException=s.rows.filter(r=>r.status==='CANDIDATE_PASS_USER_EXCEPTION').map(r=>r.id);s.formalEligible=s.rows.filter(r=>['CANDIDATE_PASS','CANDIDATE_PASS_USER_EXCEPTION'].includes(r.status)).map(r=>r.id);s.allTenComplete=false;s.formalAdopted=false;s.finalProductionPointerValidated=false;s.published=false;
fs.writeFileSync(file,JSON.stringify(s,null,2)+'\n');console.log(JSON.stringify({file,updated:[54,59],candidatePass:s.candidatePass,formalEligible:s.formalEligible,latest}));
