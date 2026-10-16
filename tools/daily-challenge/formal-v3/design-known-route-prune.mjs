import {digest} from './diversity-layout-factory.mjs';
import {auditCompleteReverseWitness} from './reverse-route-audit.mjs';

const worldKey=blocks=>digest(blocks.map(b=>({id:b.id,shape:b.shape,color:b.color,layers:b.layers??[b.color],x:b.x,y:b.y})).sort((a,b)=>a.id.localeCompare(b.id)));
function apply(blocks,drag){
 const next=structuredClone(blocks),b=next.find(x=>x.id===drag.blockId);if(!b)throw Error('Missing body in supplied witness');
 const end=drag.path.at(-1);if(end)Object.assign(b,{x:end[0],y:end[1]});
 return drag.exitSide?next.filter(x=>x.id!==drag.blockId):next;
}

/** Deterministic edits of one supplied, already valid plain route. No branch
 * expansion, candidate move generation, solver call or difficulty inference. */
export function pruneKnownPlainWitness(runtime,level,inputDrags){
 const before=auditCompleteReverseWitness(runtime,level,inputDrags);if(!before.valid)throw Error(before.error);
 let blocks=structuredClone(level.blocks);const kept=[],keys=[worldKey(blocks)],seen=new Map([[keys[0],0]]);let removedCycleDrags=0;
 for(const drag of inputDrags){
  blocks=apply(blocks,drag);const k=worldKey(blocks);
  if(seen.has(k)){
   const at=seen.get(k);removedCycleDrags+=kept.length-at+1;
   for(const old of keys.slice(at+1))seen.delete(old);keys.length=at+1;kept.length=at;
  }else{kept.push(structuredClone(drag));keys.push(k);seen.set(k,kept.length);}
 }
 const merged=[];blocks=structuredClone(level.blocks);let mergedHolds=0,removedReturnHolds=0;
 for(const drag of kept){
  const body=blocks.find(b=>b.id===drag.blockId),previous=merged.at(-1);
  if(previous&&previous.drag.blockId===drag.blockId&&!previous.drag.exitSide){
   previous.drag.path.push(...structuredClone(drag.path));if(drag.exitSide)previous.drag.exitSide=drag.exitSide;mergedHolds++;
  }else merged.push({start:[body.x,body.y],drag:structuredClone(drag)});
  blocks=apply(blocks,drag);const last=merged.at(-1),end=last.drag.path.at(-1)??last.start;
  if(!last.drag.exitSide&&end[0]===last.start[0]&&end[1]===last.start[1]){merged.pop();removedReturnHolds++;}
 }
 const drags=merged.map(x=>x.drag),after=auditCompleteReverseWitness(runtime,level,drags);if(!after.valid)throw Error('Deterministic prune failed actual replay: '+after.error);
 if(after.U>before.U)throw Error('Pruning increased non-clearing cost');
 return{drags,U:after.U,replay:after.canonical,independentReplay:after.independent,
  status:'KNOWN_WITNESS_DETERMINISTIC_PRUNING_ONLY',lowerSearches:0,upperSearches:0,searchPerformed:false,
  before:{U:before.U,totalDrags:inputDrags.length,routeSha256:digest(inputDrags)},after:{U:after.U,totalDrags:drags.length,routeSha256:digest(drags)},
  removedCycleDrags,mergedHolds,removedReturnHolds,worldEquality:'complete labelled body worlds; counters/move history excluded only in the plain static domain',formalReady:false};
}
