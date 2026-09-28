import fs from 'node:fs';
import { loadApi } from './native-block-repair-v143.mjs';
import { checkFullGeneratorFloor } from './remake41to50-full-generator-floor-v146.mjs';
import { checkImmediateGeneratorFloor } from './remake41to50-immediate-generator-floor-v146.mjs';
const {api}=await loadApi();
for (const f of ['candidate41-one-shutter-cover8-v157.json','candidate41-one-shutter-cover14-v157.json']) {
 const d=JSON.parse(fs.readFileSync('deliverables/remake41-v157-20260925/'+f));
 const full=checkFullGeneratorFloor(d.level,api,{floor:11,maxStates:500000,maxMilliseconds:30000,maxTransitions:1000000});
 const imm=checkImmediateGeneratorFloor(d.level,api,{floor:11,maxStates:300000,maxMilliseconds:20000,maxTransitions:800000});
 d.diagnostics={full,imm}; fs.writeFileSync('deliverables/remake41-v157-20260925/'+f,JSON.stringify(d,null,2)+'\n');
 console.log(JSON.stringify({f,fullStatus:full.status,fullCost:full.relaxedNonClearingDrags,immStatus:imm.status,immCost:imm.relaxedNonClearingDrags}));
}
