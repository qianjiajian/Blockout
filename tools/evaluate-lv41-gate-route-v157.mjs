import fs from 'node:fs';
import {loadApi} from './native-block-repair-v143.mjs';
import {checkFullGeneratorFloor} from './remake41to50-full-generator-floor-v146.mjs';
import {digest} from './revised-preview-validation-v160.mjs';
const base=JSON.parse(fs.readFileSync('deliverables/remake41-v157-20260925/candidate41-normal-v157.json'));const {api}=await loadApi();
const options={top:Array.from({length:7},(_,i)=>i),bottom:Array.from({length:7},(_,i)=>i),left:Array.from({length:11},(_,i)=>i),right:Array.from({length:11},(_,i)=>i)};
let best={score:Infinity},tested=0;
for(const gate of base.level.gates){for(const offset of options[gate.side]){if(offset+gate.size>(gate.side==='top'||gate.side==='bottom'?7:11))continue;const level=structuredClone(base.level);level.gates.find(g=>g.id===gate.id).offset=offset;let replay;try{replay=api.replayRevisedRoute(level,base.drags);}catch{continue;}tested++;if(!replay.valid||!replay.complete||replay.nonClearingDrags<11||replay.nonClearingDrags>15)continue;const floor=checkFullGeneratorFloor(level,api,{floor:11,maxStates:500000,maxMilliseconds:5000,maxTransitions:5000000});const score=(floor.status==='threshold-proven'?0:floor.status==='unknown'?1:2)*100+replay.nonClearingDrags;console.log({gate:gate.color,offset,U:replay.nonClearingDrags,floor:floor.status,lower:floor.relaxedNonClearingDrags??null});if(score<best.score){best={score,level,replay,floor,gate:gate.color,offset};const out=`deliverables/remake41-v157-20260925/route-gate-${gate.color}-${offset}.json`;fs.writeFileSync(out,JSON.stringify({level,drags:base.drags,replay,floor,source:'candidate41-normal-v157.json',activeRuleVersion:'1.57.0',levelSha256:digest(level)},null,2)+'\n');}}
}
console.log({tested,best:{score:best.score,gate:best.gate,offset:best.offset,U:best.replay?.nonClearingDrags,floor:best.floor?.status,lower:best.floor?.relaxedNonClearingDrags}});
