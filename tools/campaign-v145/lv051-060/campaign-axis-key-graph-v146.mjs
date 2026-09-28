// Exact spatial extension of the mask96 optional-contact relaxation.
// Axes restrict both unit edges and exits. Locks count matching KEY BODIES
// removed, never shell peels. Hidden bodies retain the same key-group state.
// No generators, lifts, deadlines, flip doors, grids or legacy geometry.
import assert from 'node:assert/strict';
import {compileLevel as compileBase,forEachGesture as eachBase,clearCount,stateFromSnapshot,stateKey} from '../../remake21to30-mask-floor.mjs';
export {clearCount,stateFromSnapshot,stateKey};

export function compileLevel(level){
  const projection=structuredClone(level);
  for(const b of projection.blocks){
    assert(b.movementAxis===undefined||['horizontal','vertical'].includes(b.movementAxis),'Invalid axis');
    for(const k of ['keyId','lockedBy'])if(b[k]!==undefined)assert(typeof b[k]==='string'&&b[k].trim()===b[k]&&b[k].length,'Invalid key group');
    if(b.lockCount!==undefined)assert(b.lockedBy&&Number.isSafeInteger(b.lockCount)&&b.lockCount>0,'Invalid lock count');
    assert(!b.keyId||b.keyId!==b.lockedBy,'Self-locked key');
    delete b.movementAxis;delete b.keyId;delete b.lockedBy;delete b.lockCount;
  }
  const c=compileBase(projection),keyIds=new Set(level.blocks.flatMap(b=>b.keyId?[b.keyId]:[]));
  c.blocks.forEach((b,i)=>{
    const source=level.blocks[i];
    for(const k of ['movementAxis','keyId','lockedBy','lockCount'])if(source[k]!==undefined)b[k]=source[k];
    assert(!b.lockedBy||keyIds.has(b.lockedBy),'Missing key group');
    for(let p=0;p<b.poses.length;p++){
      const pose=b.poses[p];if(!pose)continue;
      if(b.movementAxis==='horizontal')pose.neighbors=pose.neighbors.filter(q=>Math.floor(q/c.W)===Math.floor(p/c.W));
      if(b.movementAxis==='vertical')pose.neighbors=pose.neighbors.filter(q=>q%c.W===p%c.W);
      pose.exits=pose.exits.map(g=>!g||!b.movementAxis?g:
        (b.movementAxis==='horizontal'?['left','right']:['top','bottom']).includes(g.side)?g:null);
    }
  });
  return c;
}

export function forEachGesture(c,state,visit){
  const removed=new Map();
  c.blocks.forEach((b,i)=>{if(b.keyId&&state[i]===255)removed.set(b.keyId,(removed.get(b.keyId)??0)+1);});
  return eachBase(c,state,(i,v,cost,get)=>{
    const b=c.blocks[i];
    if(b.lockedBy&&(removed.get(b.lockedBy)??0)<(b.lockCount??1))return;
    return visit(i,v,cost,get);
  });
}
