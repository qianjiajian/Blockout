import fs from 'node:fs';
import {loadSpatialApi,searchSpatial} from './fifo-witness214.mjs';
import {fifoPayload,runNativeFifo} from './native-fifo214-dominance.mjs';
import {digest} from '../revised-preview-validation-v160.mjs';
const OUT='deliverables/continue211-220-20260930/design-new',api=await loadSpatialApi(),history=[];
const colors=['purple','green','orange','blue'];
function swapPortals(l,a,b){const ga=l.gates.find(g=>g.color===a),gb=l.gates.find(g=>g.color===b),old={side:ga.side,offset:ga.offset,portals:ga.portals};ga.side=gb.side;ga.offset=gb.offset;if(gb.portals)ga.portals=structuredClone(gb.portals);else delete ga.portals;gb.side=old.side;gb.offset=old.offset;if(old.portals)gb.portals=old.portals;else delete gb.portals;}
for(let n=0;n<12;n++){
 const old=JSON.parse(fs.readFileSync(`${OUT}/candidate214-hidden50b-${32+n}.json`)),level=structuredClone(old.level);
 if(n%3!==2)swapPortals(level,'purple','green');
 if(n%3!==0)swapPortals(level,'orange','blue');
 level.mechanismAdaptation.change+=' 此独立新图对调紫绿及/或橙蓝普通门位置，保门色与跨度，改变跨舱搬运通路；不是全局形色重标。';
 const p=structuredClone(level);p.mechanismRules='revised-2026-09-23-v1.4';
 const result=searchSpatial(p,api,{floor:21,maxMilliseconds:5000,maxStates:80000,normalize:true,diagnosticTrace:true,orderSeed:n});
 const replay=result.drags?api.replayRevisedRoute(level,result.drags):null,entry={n,status:result.status,U:result.cost,maxClears:result.maxClearsSeen};
 if(replay?.valid&&replay.complete){level.preservedMoveTarget=result.drags.length;if(result.cost>=16)entry.lower=runNativeFifo(fifoPayload(level,api,{floor:16,maxMilliseconds:5000,maxStates:1200000}).p);}
 history.push({...entry,levelSha256:digest(level)});fs.writeFileSync(`${OUT}/probe214-cross50-${n}.json`,JSON.stringify({level,levelSha256:digest(level),result,replay,lower:entry.lower},null,2));
 console.log(JSON.stringify(entry));fs.writeFileSync(`${OUT}/history214-cross50.json`,JSON.stringify(history,null,2));if(entry.lower?.thresholdProven)break;
}
