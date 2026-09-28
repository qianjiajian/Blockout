import assert from 'node:assert/strict';
import {digest} from './revised-preview-validation-v160.mjs';

const pointKey=([x,y])=>`${x},${y}`;
const cells=b=>b.shape.map(([dx,dy])=>[b.x+dx,b.y+dy]);
const none=a=>a===undefined||(Array.isArray(a)&&a.length===0);

/**
 * Independent structural lower bound, not a route-search result.
 * Partition colors at a frozen-gate threshold T. There are K layer-clear
 * events in the ENTIRE level belonging to gates below T. If 0<K<=T, then
 * before ANY such mandatory early event, at most K-1 clears can have occurred:
 * the first late-color event would itself require T prior early clears.
 * Consequently an opening body whose EVERY layer uses a late gate cannot
 * clear/peel before any early event. If it initially occupies every legal
 * exit pose of a chosen early body/layer event, it must have made a nonclear
 * drag. Deduplicate these mandatory body IDs across all early events.
 * Also retain the maximum, over events, of the minimum blocking-body count
 * over all legal exit poses. Solvability must be established separately.
 * Numeric ice and real countdown covers only restrict early access; they do
 * not create extra clear events. Whole-body shapes do not change on peeling.
 */
export function checkFreezeBarrierFloor(level,api,{floor=10}={}){
  const result={status:'unsupported',method:'freeze-barrier-full-exit-footprint-v1',levelSha256:digest(level),
    floor,lowerBound:0,thresholdProven:false,solvabilityValidated:false,pointerValidated:false};
  try{
    assert(Number.isSafeInteger(floor)&&floor>0);assert.equal(level.mechanismRules,'revised-2026-09-23-v1.4');
    assert(level.width*level.height<=256,'Finite proof domain at most 256 cells');
    api.validateLevel(level);
    for(const k of ['generators','flipDoors','coloredGrids','elevators','conveyors','seams'])assert(none(level[k]),`Unsupported ${k}`);
    for(const b of level.blocks){
      for(const k of ['movementAxis','keyId','lockedBy','lockCount','timedBombSeconds'])assert(b[k]===undefined,`Unsupported ${k}`);
      assert(!b.star&&!b.rotationBadge);assert((b.layers??[b.color]).length<=2);
    }
    assert((level.shutters??[]).every(s=>(s.skin===undefined||s.skin==='shutter')&&s.triggerBlockIds===undefined));
    assert(level.gates.every(g=>!g.star&&g.portals===undefined),'Only unique single ordinary/frozen gates');
    assert.equal(new Set(level.gates.map(g=>g.color)).size,level.gates.length);
    const snap=new api.PuzzleModel(structuredClone(level)).snapshot();
    assert(!snap.queuedBlocks.length);assert(snap.shutters.every(s=>!s.revealed),'No initialized reveal');
    const gates=new Map(snap.gates.map(g=>[g.color,g]));
    assert(snap.blocks.every(b=>b.layers.every(c=>gates.has(c))));
    const playable=new Set(snap.playable.map(pointKey));for(const p of snap.blocked)playable.delete(pointKey(p));
    const opening=snap.blocks.filter(b=>!b.shutterId);
    const partitions=[];
    for(const threshold of [...new Set(snap.gates.map(g=>g.frozen).filter(n=>n>0))]){
      const early=snap.blocks.flatMap(b=>b.layers.flatMap((c,stage)=>gates.get(c).frozen<threshold?[{b,stage,gate:gates.get(c)}]:[]));
      const K=early.length;if(K===0||K>threshold)continue;
      const survivors=opening.filter(b=>b.layers.every(c=>gates.get(c).frozen>=threshold));
      const events=[];
      for(const {b,stage,gate} of early){
        const xs=b.shape.map(p=>p[0]),ys=b.shape.map(p=>p[1]);
        const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
        const poses=[];
        for(let y=-minY;y<=snap.height-1-maxY;y++)for(let x=-minX;x<=snap.width-1-maxX;x++){
          const footprint=b.shape.map(([dx,dy])=>[x+dx,y+dy]);
          if(!footprint.every(p=>playable.has(pointKey(p))))continue;
          if(!api.matchingPortalForExitFrontier(snap,footprint,gate))continue;
          const occupied=new Set(footprint.map(pointKey));
          const blockers=survivors.filter(s=>s.id!==b.id&&cells(s).some(p=>occupied.has(pointKey(p)))).map(s=>s.id);
          poses.push({anchor:[x,y],footprint,blockers});
        }
        if(!poses.length)continue; // An impossible event is not evidence of difficulty.
        const mandatory=poses[0].blockers.filter(id=>poses.every(p=>p.blockers.includes(id)));
        events.push({blockId:b.id,stage,color:gate.color,gateId:gate.id,poses,mandatory,
          minimumBlockers:Math.min(...poses.map(p=>p.blockers.length))});
      }
      if(!events.length)continue;
      const mandatory=[...new Set(events.flatMap(e=>e.mandatory))].sort();
      const single=Math.max(...events.map(e=>e.minimumBlockers));
      partitions.push({threshold,entireLevelEarlyClearEvents:K,priorClearUpperBound:K-1,
        survivors:survivors.map(b=>b.id),events,mandatory,lowerBound:Math.max(single,mandatory.length),
        maximumSingleEventMinimum:single,mandatoryUnionCount:mandatory.length});
    }
    if(!partitions.length)return {...result,reason:'No qualified freeze barrier'};
    const best=partitions.reduce((a,b)=>b.lowerBound>a.lowerBound?b:a);
    return {...result,status:best.lowerBound>=floor?'threshold-proven':'unproven',lowerBound:best.lowerBound,
      thresholdProven:best.lowerBound>=floor,best,partitions};
  }catch(error){return {...result,reason:error.message};}
}
