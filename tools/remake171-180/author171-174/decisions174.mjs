import fs from 'node:fs';
import assert from 'node:assert/strict';
import {api,spatial,digest,save,OUT,noTime,compile,search,ruleGate} from './common.mjs';
ruleGate();
const input=OUT+'/reviewed174-1790525683515.json', d=JSON.parse(fs.readFileSync(input)),cases=[],used=new Set();
const perform=(m,drag)=>{m.beginAction();for(const p of drag.path)if(!m.moveBlockStep(drag.blockId,...p))return false;if(drag.exitSide&&!m.tryExit(drag.blockId,drag.exitSide).ok)return false;return m.commitAction();};
const m=new api.PuzzleModel(d.level);m.startCountdown();const mechanisms=[];
for(let i=0;i<d.drags.length;i++){
 const next=d.drags[i];
 if(cases.length<3)for(const b of m.snapshot().blocks){if(b.id===next.blockId||b.shape.length<2||!m.isBlockActive(m.getBlock(b.id))||used.has(b.id))continue;
  for(const [dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const wrong=m.clone(),path=[];wrong.beginAction();for(let n=1;n<=4;n++){
   const p=[b.x+dx*n,b.y+dy*n];if(!wrong.moveBlockStep(b.id,...p))break;path.push(p);if(wrong.possibleExitSides(wrong.getBlock(b.id)).length)break;
   const parked=m.clone();if(!perform(parked,{blockId:b.id,path:[...path]}))continue;const blocked=parked.clone();if(perform(blocked,next))continue;
   const recover={blockId:b.id,path:[...path.slice(0,-1).reverse(),[b.x,b.y]]};assert(perform(parked,recover));for(const drag of d.drags.slice(i))assert(perform(parked,drag));assert(parked.snapshot().complete);
   cases.push({prefixDrags:i,wrongPark:{blockId:b.id,shape:b.shape,from:[b.x,b.y],path:[...path]},blockedNextDrag:next,recoveryDrag:recover,completionRoute:d.drags.slice(i),recoveredComplete:true,addedNonClearingDrags:2});used.add(b.id);break;
  }if(used.has(b.id)||cases.length>=3)break;
 }if(cases.length>=3)break;}
 const before=m.snapshot();assert(perform(m,next));const after=m.snapshot();if(JSON.stringify(before.shutters)!==JSON.stringify(after.shutters)||after.blocks.some(b=>b.timedBombSeconds!==undefined))mechanisms.push({step:i+1,cleared:after.cleared,shutters:after.shutters,bombs:after.blocks.filter(b=>b.timedBombSeconds!==undefined).map(b=>({id:b.id,seconds:b.timedBombSeconds,active:m.isBlockActive(m.getBlock(b.id))}))});
}
assert.equal(cases.length,3);assert(m.snapshot().complete);
console.log(save('decisions174',{input,inputSha256:digest(fs.readFileSync(input)),cases,mechanisms}));
