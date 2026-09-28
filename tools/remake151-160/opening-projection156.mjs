import assert from 'node:assert/strict';
import {api,digest} from './common.mjs';
import {checkAxisFloor} from '../remake131to140-axis-floor-v172.mjs';
export function project156(level,drags){
 assert.equal(level.id,156);assert.equal(level.mechanismRules,'revised-2026-09-27-v1.5');
 for(const k of ['shutters','coloredGrids','elevators','conveyors','blocked','seams'])assert(!level[k]?.length,'Unsupported '+k);
 assert.equal(level.generators.length,4);const ids=level.generators.flatMap(g=>g.queueBlockIds);assert.equal(ids.length,16);assert.equal(new Set(ids).size,16);
 for(const g of level.generators){assert.equal(g.queueBlockIds.length,4);assert.equal(g.trigger,'move');assert(!g.intervalSeconds&&!g.initialDelaySeconds);}
 for(const b of level.blocks){assert(Object.keys(b).every(k=>['id','x','y','shape','color','frozen'].includes(k)),'Unsupported '+b.id);if(ids.includes(b.id))assert(!b.frozen);}
 for(const g of [...level.gates,...level.flipDoors])assert(Object.keys(g).every(k=>['id','color','side','offset','size','frozen','initiallyOpen'].includes(k)),'Unsupported gate');
 const projected=structuredClone(level);projected.blocks=projected.blocks.filter(b=>!ids.includes(b.id));for(const b of projected.blocks)delete b.frozen;
 projected.generators=[];projected.gates.push(...projected.flipDoors.map(({initiallyOpen,...g})=>g));projected.flipDoors=[];for(const g of projected.gates)delete g.frozen;
 const replay=api.replayRevisedRoute(level,drags);assert(replay.valid&&replay.complete);
 const mapped=drags.filter(d=>!ids.includes(d.blockId)),mapping=api.replayRevisedRoute(projected,mapped);assert(mapping.valid&&mapping.complete);assert(mapping.nonClearingDrags<=replay.nonClearingDrags);
 const proofLevel={...projected,mechanismRules:'revised-2026-09-23-v1.4'};
 const sourceSnap=new api.PuzzleModel(projected).snapshot(),proofSnap=new api.PuzzleModel(proofLevel).snapshot();delete sourceSnap.mechanismRules;delete proofSnap.mechanismRules;assert.deepEqual(sourceSnap,proofSnap);
 return{level:proofLevel,sourceLevelSha256:digest(level),projectedLevelSha256:digest(proofLevel),removedQueueBodyIds:ids,allIceAndFlipConstraintsErased:true,mappedDrags:mapped,mapping,
  justification:'All source opening bodies retain their footprints, colors, positions and portal geometry. Erase all queue bodies/machines, every ice constraint and flip phase; reject every other special body/region attribute. Removing queue gestures and occupancy cannot obstruct retained moves. All dependencies on missing clear events are erased, not left behind as fictitious counts. Optional contact admits each retained gesture at no larger non-clearing cost; an earlier forced clear would only remove occupancy in this restricted no-mechanism projection. Therefore its minimum is a lower bound for the full FIFO source. A full original witness is separately required and its opening-only subsequence is replayed by the current model.'};
}
export function prove156(level,drags){const projection=project156(level,drags),proof=checkAxisFloor(projection.level,api,{floor:5,maxMilliseconds:4000,maxStates:150000});return{projection,proof};}
