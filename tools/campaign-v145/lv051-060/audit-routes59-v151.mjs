import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadApi} from '../../native-block-repair-v143.mjs';
import {verifyRulesLock} from '../../verify-rules-lock.mjs';
import {search} from '../../../.codex-temp/remake31-40-v141/agent31-34/search-monotone.mjs';
const lock=verifyRulesLock();assert(lock.ok&&lock.activeVersion==='1.51.0');
const {api}=await loadApi();
const out=[];
for(const file of process.argv.slice(2)){
 const d=JSON.parse(fs.readFileSync(file));
 const result=search(d.level,{floor:16,maxStates:Number(process.env.SEARCH_STATES??800000),maxMilliseconds:Number(process.env.SEARCH_MS??10000),weight:1000});
 const replay=result.drags?api.replayRevisedRoute(d.level,result.drags):null;
 out.push({file,status:result.status,cost:result.cost,states:result.states,maxClears:result.maxClears,termination:result.termination,routeValid:!!(replay?.valid&&replay?.complete),nonClearingDrags:replay?.nonClearingDrags??null});
 console.log(JSON.stringify(out.at(-1)));
}
const report=`deliverables/remake31-200-v145-20260924/batches/lv051-060/agent58-59/route-audit59-${Date.now()}.json`;fs.writeFileSync(report,JSON.stringify({ruleVersion:lock.activeVersion,checkedAt:new Date().toISOString(),floor:16,results:out},null,2)+'\n');console.log(JSON.stringify({report,results:out}));
