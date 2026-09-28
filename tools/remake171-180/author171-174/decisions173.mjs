import fs from 'node:fs';
import assert from 'node:assert/strict';
import {api,spatial,digest,save,OUT,noTime,compile,search,ruleGate} from './common.mjs';
ruleGate();
const input=OUT+'/reviewed173-1790524034255.json', d=JSON.parse(fs.readFileSync(input)),cases=[],used=new Set();
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
const previous=OUT+'/qualification-1790524020065.json', projected=noTime(d.level),p=search(compile(projected,spatial),{maxMilliseconds:6000,maxStates:200000,floor:5,prove:true});assert(p.thresholdProven);
const qualification={status:'PASS',candidateSha256:digest(d.level),runtimeProfile:d.level.mechanismRules,projectedLevel:projected,projectionSha256:digest(projected),removedFields:d.level.blocks.filter(b=>b.timedBombSeconds!==undefined).map(b=>({id:b.id,timedBombSeconds:b.timedBombSeconds})),projectionArgument:'Removing only timedBombSeconds prevents expiry without creating extra movement cost; every legal actual route remains legal in the projection with identical drag costs. Hidden active timing changes no geometry, counters, color, shape, shell or reachability. All39 bodies,6 frozen gates,cover18 and9 hidden bodies remain. The current graph rejects generators/flips/axes; this candidate has none. v1.5 to v1.4 projection is exact in this no-flip domain.',coreQualification:{file:previous,sha256:digest(fs.readFileSync(previous)),fixtureStates:589,fixtureEdges:9183,status:'PASS; current PuzzleModel edge equivalence in all finite fixture states'},sourceBindings:{search:digest(fs.readFileSync('tools/remake161-170/author168-170/search.mjs')),runtime:digest(fs.readFileSync('src/core/PuzzleModel.ts')),qualifier:digest(fs.readFileSync('tools/remake171-180/author171-174/qualify.mjs'))},freshProof:p};
console.log(save('decision-and-qualification173',{input,inputSha256:digest(fs.readFileSync(input)),cases,mechanisms,qualification}));

