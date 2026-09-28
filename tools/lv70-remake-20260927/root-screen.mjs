import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadApi} from '../native-block-repair-v143.mjs';
import {verifyRulesLock} from '../verify-rules-lock.mjs';
import {checkAutomaticGeneratorFloor} from './validation-generator-domain.mjs';
const lock=verifyRulesLock();assert(lock.ok);assert(['1.91.0','1.92.0'].includes(lock.activeVersion));
const folder=process.argv[2],limit=Number(process.argv[3]??45),{api}=await loadApi();assert(folder);
const candidates=fs.readdirSync(folder).filter(n=>/^attempt-\d+\.json$/.test(n)).map(n=>({file:folder+'/'+n,data:JSON.parse(fs.readFileSync(folder+'/'+n))})).filter(x=>x.data.drags&&x.data.result.cost>=11&&x.data.result.cost<=15).sort((a,b)=>b.data.statistics.generatedMultiCellRepositions-a.data.statistics.generatedMultiCellRepositions);
const deadline=Date.now()+limit*1000,rows=[];let proven;
for(const{file,data}of candidates){if(Date.now()>deadline)break;const floor=checkAutomaticGeneratorFloor(data.level,api,{floor:11,maxStates:100000,maxMilliseconds:800});
 const shortcut=floor.drags?api.replayRevisedRoute(data.level,floor.drags):null;
 const row={file,U:data.result.cost,statistics:data.statistics,floor,shortcut};rows.push(row);console.log(JSON.stringify({file,status:floor.status,shortcut:floor.relaxedNonClearingDrags,modelValid:shortcut?.valid,ms:floor.ms}));if(floor.thresholdProven){proven=file;break;}}
const output=`deliverables/lv70-remake-20260927/root-screen-${Date.now()}.json`;
fs.writeFileSync(output,JSON.stringify({status:'BOUNDED_SCREEN_NOT_FINAL_CERTIFICATE',proven,rows},null,2),{flag:'wx'});console.log(JSON.stringify({output,checked:rows.length,proven}));
