import fs from 'node:fs';
import {loadRuntime,levelSha256} from './contract.mjs';
const runtime=await loadRuntime(),OUT='deliverables/daily-formal-v2-20261007/design-lab';
const rows=[];
for(const id of [42,195,197,180,170,33,9]){
 const source=runtime.LEVELS.find(l=>l.id===id);
 if(source.generators?.length||source.shutters?.length)throw new Error('Do not flatten hidden inventories into overlap');
 const level={id,name:`主线${id}凹板隔离基底`,difficulty:source.difficulty,reward:0,timeSeconds:source.timeSeconds,parMoves:source.parMoves,mechanismRules:'revised-2026-09-27-v1.5',width:source.width,height:source.height,playable:structuredClone(source.playable),blocked:structuredClone(source.blocked),
  blocks:source.blocks.map(b=>({id:b.id,x:b.x,y:b.y,shape:structuredClone(b.shape),color:b.color})),
  gates:source.gates.map(g=>({id:g.id,color:g.color,side:g.side,offset:g.offset,size:g.size,...(g.portals?{portals:structuredClone(g.portals)}:{})}))};
 runtime.validateLevel(level);
 const path=`${OUT}/source-board-${id}-seed.json`;
 if(fs.existsSync(path))throw new Error('Seed already exists: '+path);
 const removed=runtime.mechanismsUsedByDailyLevel(source).filter(m=>!runtime.mechanismsUsedByDailyLevel(level).includes(m));
 fs.writeFileSync(path,JSON.stringify({status:'UNVERIFIED_DESIGN_SEED',accepted:false,sourceLevelId:id,level,sourceLevelSha256:levelSha256(source),provenance:{sourceLevelId:id,removedMechanisms:removed,sourceBoardRetained:true,sourceBlockPartitionsRetained:true,notIndependentCandidate:true}},null,2)+'\n');rows.push({path,id,removed});
}
console.log(JSON.stringify(rows));
