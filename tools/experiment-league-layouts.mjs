import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {loadSpatialApi,searchSpatial} from './continuation211-colored-witness.mjs';
import {staticDelayedLiftFloor} from './regeneration211-design/native-static-lift214.mjs';
import {loadContinuationRuntime} from './continuation211-runtime.mjs';
const source=JSON.parse(await readFile('deliverables/league-step4-20261001/test-level-proof.json','utf8'));
const api=await loadSpatialApi(),core=await loadContinuationRuntime();
await mkdir('deliverables/league-full-20261001/experiments',{recursive:true});
for(let n=0;n<8;n++){
 const level=structuredClone(source.level),top=level.blocks.filter(b=>b.id.startsWith('wide-top'));
 const a=top[n],b=top[(n+3)%8];[a.x,b.x]=[b.x,a.x];[a.y,b.y]=[b.y,a.y];
 const t=Date.now();
 const lower=staticDelayedLiftFloor(level,api,{floor:16,maxMilliseconds:3000,maxStates:1000000});
 const witness=lower.thresholdProven?searchSpatial(level,api,{floor:21,maxMilliseconds:5000,maxStates:400000,normalize:true}):null;
 const replay=witness?.drags?core.replayRevisedRoute(level,witness.drags):null;
 const record={n,level,lower,witness,replay};await writeFile(`deliverables/league-full-20261001/experiments/swap${n}.json`,JSON.stringify(record,null,2));
 console.log(JSON.stringify({n,lower:lower.status,witness:witness?.status,U:replay?.nonClearingDrags,ms:Date.now()-t}));
}
