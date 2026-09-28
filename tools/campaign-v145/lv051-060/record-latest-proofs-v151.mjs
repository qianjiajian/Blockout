import fs from 'node:fs';
import {digest} from '../../revised-preview-validation-v160.mjs';
import {verifyRulesLock} from '../../verify-rules-lock.mjs';
const root='deliverables/remake31-200-v145-20260924/batches/lv051-060';
const lock=verifyRulesLock();if(!lock.ok||lock.activeVersion!=='1.51.0')throw new Error('v1.51 lock required');
const summaryFile=`${root}/summary.json`,summary=JSON.parse(fs.readFileSync(summaryFile));
const latest={52:'agent51-54/continued-proof52-1790309863146-7.json',54:'root54/continued-proof54-1790308468388-6.json',59:'agent58-59/continued-proof59-1790309711573-2.json'};
for(const [idText,rel] of Object.entries(latest)){const id=Number(idText),file=`${root}/${rel}`,p=JSON.parse(fs.readFileSync(file)),row=summary.rows.find(r=>r.id===id);if(!row||p.result?.status==='threshold-proven'||p.proof?.status==='threshold-proven')throw new Error(`unexpected proof state for ${id}`);const result=p.result??p.proof;row.ruleVersion=lock.activeVersion;row.latestProof=file;row.proofProgress={elapsedMilliseconds:p.totalSearchMs??p.proof?.elapsedMilliseconds,discoveredStates:result.discoveredStates,exploredStates:result.exploredStates,pending:result.pending??result.pendingQueueRecords,termination:result.termination,checkpoint:p.checkpoint??p.checkpointFile??null,continuationActive:false};row.floor='UNKNOWN';row.L=null;row.status='IN_PROGRESS';row.missing=[`Fresh L${row.target.min} remains UNKNOWN after ${(row.proofProgress.elapsedMilliseconds/1000).toFixed(3)} search seconds / ${row.proofProgress.discoveredStates} discovered states; checkpoint saved.`];}
summary.updatedAt=new Date().toISOString();summary.ruleVersion=lock.activeVersion;summary.rulesLock='PASS';summary.formalAdopted=false;summary.finalProductionPointerValidated=false;summary.published=false;
fs.writeFileSync(summaryFile,JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify({file:summaryFile,updatedLevels:Object.keys(latest).map(Number)}));
