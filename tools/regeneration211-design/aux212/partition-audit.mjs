import assert from 'node:assert/strict';
import {sha256} from '../../continuation211-runtime.mjs';
export function hiddenPartitionProjection(level,coverId){
 const co=level.shutters?.find(s=>s.id===coverId);assert(co&&co.skin!=='lift'&&co.count>0);
 assert(!level.generators?.length&&!level.flipDoors?.length&&!level.elevators?.length&&!level.conveyors?.length&&!level.seams?.length);
 assert(level.blocks.every(b=>!b.layers&&!b.keyId&&!b.lockedBy));
 const kept=level.blocks.filter(b=>b.shutterId===coverId);assert(kept.length);assert(kept.every(b=>!(b.frozen??0)));
 const cells=kept.flatMap(b=>b.shape.map(([x,y])=>[x+b.x,y+b.y]));assert(cells.every(([x,y])=>x>=co.x&&x<co.x+co.width&&y>=co.y&&y<co.y+co.height));assert.equal(new Set(cells.map(p=>p.join(','))).size,co.width*co.height);assert.equal(cells.length,co.width*co.height);
 const hidden=structuredClone(level);hidden.blocks=hidden.blocks.filter(b=>b.shutterId===coverId).map(b=>{delete b.shutterId;delete b.timedBombSeconds;return b;});hidden.shutters=[];hidden.gates.forEach(g=>delete g.frozen);
 return{level:hidden,sha256:sha256(hidden),sourceLevelSha256:sha256(level),prefixGoalClears:co.count,hiddenBodyIds:kept.map(b=>b.id)};
}
export const partitionTheorem='Split a complete full-level route immediately after the first gesture reaching the selected ordinary shutter count G. Until this gesture no selected hidden body is available. A single gesture acts on one body, and the external body clear that triggers G finishes that gesture; selected hidden bodies therefore still occupy their original poses after the split. The prefix pays at least its certified lower bound. Delete external-body suffix gestures. Retain every hidden-body gesture while removing external bodies and covers, removing bomb timers, opening all frozen gates, and retaining the original playable geometry and colored grids. Every retained movement/clear is admitted by the lower spatial abstraction, with no increase in its nonclearing drag cost. The independently certified hidden projection lower bound therefore applies to a disjoint set of suffix costs. The two certified lower bounds add. A relaxed shortcut is an upper witness, not automatically a minimum: the native last-cost closure can return before other states at the current cost have been processed. Only explicit thresholdProven reports are accepted here.';
export function auditPartitionCertificates({level,coverId,prefixBound,hiddenBound,hiddenProjection}){
 const expected=hiddenPartitionProjection(level,coverId);assert.equal(sha256(hiddenProjection),expected.sha256,'Projection must be exactly the reviewed projection');
 assert.equal(prefixBound.goalClears,expected.prefixGoalClears,'Split must be exactly reveal threshold');
 assert.equal(prefixBound.thresholdProven,true);assert.equal(hiddenBound.thresholdProven,true);
 assert(prefixBound.floor>0&&hiddenBound.floor>0);
 return{passed:true,sourceLevelSha256:expected.sourceLevelSha256,hiddenProjectionSha256:expected.sha256,prefixGoalClears:expected.prefixGoalClears,lowerBound:prefixBound.floor+hiddenBound.floor,theorem:partitionTheorem,scope:'Reports must additionally be bound to their exact native input and qualified tool hashes; this function does not replace those bindings.'};
}
