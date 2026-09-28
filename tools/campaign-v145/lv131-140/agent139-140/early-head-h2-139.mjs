import fs from 'node:fs';import assert from 'node:assert/strict';import{verifyRulesLock}from'../../../verify-rules-lock.mjs';
assert(verifyRulesLock().ok);
for(const source of ['deliverables/remake131-140-v146-20260924/agent131-134/twin-early139-1790482749224.json','deliverables/remake131-140-v146-20260924/agent131-134/twin-early139-1790482754728.json']){
 const d=JSON.parse(fs.readFileSync(source)),level=structuredClone(d.level);level.blocks.find(b=>b.id==='n139-queue-0').shape=[[0,0],[1,0]];
 const file='deliverables/remake131-140-v146-20260924/agent139-140/early-head-h2-139-'+Date.now()+'.json';fs.writeFileSync(file,JSON.stringify({level,targetId:d.targetId,targetIds:d.targetIds,sourceCandidate:source,change:'Source FIFO0 SQ2 remains a source fact; author adapts it to q0 purple H2. Full4 FIFO and3 M11 retained; opening geometry is the new early-H2 replacement layout.',verification:'pending fresh checks and route',formalAdopted:false},null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({file,source}));
}
