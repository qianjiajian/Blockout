// Full keys/locks on the qualified mask96 graph. No key is projected away.
import assert from 'node:assert/strict';
import {compileLevel as compileBase,forEachGesture as eachBase,clearCount,stateKey,stateFromSnapshot} from './remake21to30-mask-floor.mjs';
export {clearCount,stateKey,stateFromSnapshot};
export function compileLevel(level){
 assert(Number.isInteger(level.id)&&level.id>=81&&level.id<=90);
 const projected=structuredClone(level);
 for(const b of level.blocks){
  if(b.keyId!==undefined)assert(typeof b.keyId==='string'&&b.keyId.length);
  if(b.lockedBy!==undefined){assert(typeof b.lockedBy==='string'&&b.lockedBy.length);assert(b.lockCount===undefined||Number.isSafeInteger(b.lockCount)&&b.lockCount>0);assert(level.blocks.some(x=>x.keyId===b.lockedBy));}
  else assert(b.lockCount===undefined);
 }
 for(const b of projected.blocks)for(const k of ['keyId','lockedBy','lockCount'])delete b[k];
 const c=compileBase(projected);
 for(const [i,b]of c.blocks.entries()){
  const original=level.blocks[i];b.keyId=original.keyId;b.lockedBy=original.lockedBy;b.lockCount=original.lockedBy?original.lockCount??1:0;
  b.keyIndices=original.lockedBy?level.blocks.flatMap((a,j)=>a.keyId===original.lockedBy?[j]:[]):[];
 }
 return c;
}
export const lockRemaining=(c,s,i)=>Math.max(0,c.blocks[i].lockCount-c.blocks[i].keyIndices.reduce((n,j)=>n+Number(s[j]===255),0));
export function forEachGesture(c,s,visit){
 // Occupancy and every frozen/reveal/layer calculation are unchanged. A locked
 // body remains an obstacle but none of its movement/exit edges is enabled.
 return eachBase(c,s,(i,v,cost,get)=>lockRemaining(c,s,i)>0?undefined:visit(i,v,cost,get));
}
export function verifyKeyMaskRoute(level,drags,api){
 const c=compileLevel(level),m=new api.PuzzleModel(structuredClone(level));m.startCountdown();let units=0,cost=0;
 for(const [step,d]of drags.entries()){
  const before=m.snapshot(),state=stateFromSnapshot(c,before),i=c.blocks.findIndex(b=>b.id===d.blockId);m.beginAction();
  for(const p of d.path){assert(m.moveBlockStep(d.blockId,...p));units++;}
  if(d.exitSide)assert(m.tryExit(d.blockId,d.exitSide).ok);assert(m.commitAction());
  const after=m.snapshot(),next=stateFromSnapshot(c,after),edge=Number(after.cleared===before.cleared);let represented=false;
  forEachGesture(c,state,(j,v,w)=>{if(j===i&&v===next[i]&&w===edge){const s=state.slice();s[j]=v;if(s.every((v,k)=>v===next[k])){represented=true;return false;}}});assert(represented,`Missing key-constrained gesture ${step+1}`);
  assert.equal(clearCount(c,next),after.cleared);for(const [j,b]of c.blocks.entries()){const real=after.blocks.find(x=>x.id===b.id);if(real)assert.equal(real.lockCount??0,lockRemaining(c,next,j));}
  cost+=edge;
 }
 assert(m.snapshot().complete);return{passed:true,drags:drags.length,unitSteps:units,nonClearingDrags:cost,allKeysRetained:true};
}
