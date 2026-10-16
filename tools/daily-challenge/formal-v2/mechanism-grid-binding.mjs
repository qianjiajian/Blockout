import fs from 'node:fs';import assert from 'node:assert/strict';import {loadRuntime,levelSha256} from './contract.mjs';
const rt=await loadRuntime();const base=JSON.parse(fs.readFileSync('deliverables/daily-formal-v2-20261007/design-lab/nearby-b0-candidate-1.json'));base.level.id=198;const level=structuredClone(base.level);level.coloredGrids=[{id:'grid-pink-198',color:'pink',cells:[[2,2]]}];
const plain=new rt.PuzzleModel(base.level),actual=new rt.PuzzleModel(level);plain.startCountdown();actual.startCountdown();let proof=null;
outer:for(let di=0;di<base.drags.length;di++){
 for(const b of plain.snapshot().blocks.filter(b=>b.color!=='pink')){
  if(plain.possibleExitSides(b).length)continue;
  const nodes=[{a:plain.clone(),b:actual.clone(),path:[]}],seen=new Set([`${b.x},${b.y}`]);
  for(let ni=0;ni<nodes.length;ni++){const n=nodes[ni],bb=n.a.getBlock(b.id);for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const x=bb.x+dx,y=bb.y+dy,key=`${x},${y}`;if(seen.has(key))continue;const a=n.a.clone(),q=n.b.clone();a.beginAction();q.beginAction();if(!a.moveBlockStep(b.id,x,y))continue;const ok=q.moveBlockStep(b.id,x,y);const path=[...n.path,[x,y]];if(!ok){proof={mechanism:'colored-grid',levelSha256:levelSha256(level),beforeDrag:di+1,blockId:b.id,color:b.color,grid:level.coloredGrids[0],startingSnapshotSha256:levelSha256(actual.snapshot()),heldPath:path,plainAllows:true,constrainedRejectsFinalStep:true,priorStepsLegalInBoth:true,earlierAutomaticExit:false};break outer;}seen.add(key);if(a.possibleExitSides(a.getBlock(b.id)).length===0)nodes.push({a,b:q,path});}}
 }
 const d=base.drags[di];for(const m of [plain,actual]){m.beginAction();for(const p of d.path)assert(m.moveBlockStep(d.blockId,...p));if(d.exitSide)assert(m.tryExit(d.blockId,d.exitSide).ok);assert(m.commitAction());}
}
fs.writeFileSync('deliverables/daily-formal-v2-20261007/mechanism-lab/grid-binding-proof.json',JSON.stringify({proof,found:Boolean(proof)},null,2)+'\n');console.log(proof);
