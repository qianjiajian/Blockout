import assert from 'node:assert/strict';
import {digest} from '../../../revised-preview-validation-v160.mjs';
import {checkSymmetryFloor} from '../../../remake21to30-symmetry-floor-v139.mjs';
import {projectPrepaidQueues} from '../agent136-138/prepaid-queue-floor.mjs';

/** Restricted stronger projection for four automatic machines physically
 * sealed by four stationary opening ice bodies of one common threshold F.
 * All bodies have one color stage; no covers, keys, axes, timers or powers.
 * Every FIRST queue footprint intersects a positive-frozen opening footprint.
 * Before F real opening clears, all these frozen bodies stay in place, hence
 * no first delivery and no later delivery can occur. Thus q=0 while p<F.
 * Once any queue clear q can occur, p>=F and every original ice is already0.
 * Remove all queues/machines, retain gate counts <=F (they have naturally
 * reached0 before any queue event), prepay other gates, and retain F on all
 * opening ice: at a mapped prefix the projected ice equals
 * real ice when p<F (q=0), and both are0 when p>=F. Removed queue gestures
 * stutter, retained gestures keep their 0/1 cost and poses; fewer obstacles
 * and earlier-open gates cannot remove a path in the optional-exit graph.
 * This proof does NOT apply to arbitrary queue/ice layouts. The checks below
 * are mandatory and bind the exact first footprints and all frozen bodies.
 */
export function projectFrozenBlockedQueues(level,api){
 const base=projectPrepaidQueues(level,api);assert.equal(level.id,132,'Only current Lv132 design');assert(level.width*level.height<=96);
 for(const k of ['shutters','blocked','seams'])assert(!level[k]?.length,'Unsupported '+k);
 assert.equal(level.generators.length,4,'Exactly four source machines');
 for(const b of level.blocks){assert(!b.layers,'No shells/stages');assert(!b.movementAxis,'No axes');assert(!b.shutterId,'No hidden bodies');}
 const queued=new Set(level.generators.flatMap(g=>g.queueBlockIds)),opening=level.blocks.filter(b=>!queued.has(b.id)),ice=opening.filter(b=>b.frozen>0);
 assert.equal(ice.length,4,'Exactly four opening ice bodies');const F=ice[0].frozen;assert(Number.isSafeInteger(F)&&F>0);assert(ice.every(b=>b.frozen===F),'Every opening ice must share one threshold');
 const cells=b=>new Set(b.shape.map(([x,y])=>`${b.x+x},${b.y+y}`)),iceCells=ice.map(b=>({id:b.id,cells:cells(b)}));
 const blockers=level.generators.map(g=>{assert(!g.trigger||g.trigger==='move');const first=level.blocks.find(b=>b.id===g.queueBlockIds[0]);assert(first);const footprint=first.shape.map(([x,y])=>[g.spawn[0]+x,g.spawn[1]+y]);const intersecting=iceCells.filter(b=>footprint.some(p=>b.cells.has(p.join(',')))).map(b=>b.id);assert(intersecting.length,'First footprint not sealed by frozen body: '+g.id);return{machine:g.id,firstBody:first.id,spawn:g.spawn,firstFootprint:footprint,blockingIceIds:intersecting};});
 const openingSnapshot=new api.PuzzleModel(level).snapshot();assert.equal(openingSnapshot.queuedBlocks.length,queued.size,'No delivery may occur during model initialization');assert(openingSnapshot.blocks.every(b=>!queued.has(b.id)),'No queued body active at initial settlement');
 for(const b of base.level.blocks){const source=opening.find(s=>s.id===b.id);if(source.frozen>0)b.frozen=source.frozen;}
 const retainedGateCounters=[];for(const g of base.level.gates){const source=level.gates.find(s=>s.id===g.id);if(source.frozen>0&&source.frozen<=F){g.frozen=source.frozen;retainedGateCounters.push({id:g.id,frozen:g.frozen});}}
 api.validateLevel(base.level);return{...base,projectedLevelSha256:digest(base.level),projection:'frozen-first-delivery-seal-retains-ice-and-gates-at-most-F-v172',proofPrecondition:{firstDeliveryRequiresAtLeastOpeningClears:F,retainedGateCounters,openingIce:ice.map(b=>({id:b.id,frozen:b.frozen,cells:[...cells(b)]})),blockers,initialQueuedBodies:queued.size,initialDeliveredBodies:0}};
}
export function checkFrozenBlockedQueueFloor(level,api,options={}){let projection;try{projection=projectFrozenBlockedQueues(level,api);}catch(e){return{status:'unsupported',thresholdProven:false,reason:e.message};}return{...checkSymmetryFloor(projection.level,options),projection,sourceLevelSha256:projection.sourceLevelSha256,backend:'symmetry96-v139',solvabilityValidated:false,pointerValidated:false,timeValidated:false,releaseApproved:false};}
export function checkFrozenBlockedProjectedRoute(level,drags,api){const projection=projectFrozenBlockedQueues(level,api),real=new api.PuzzleModel(level),relaxed=new api.PuzzleModel(projection.level),queue=new Set(projection.removedQueueIds);real.startCountdown();relaxed.startCountdown();let realCost=0,projectedCost=0,stutters=0,queueClears=0,openingClears=0;
 for(const d of drags){const a=real.snapshot().cleared,b=relaxed.snapshot().cleared;real.beginAction();if(!queue.has(d.blockId))relaxed.beginAction();else stutters++;for(const p of d.path){assert(real.moveBlockStep(d.blockId,...p));if(!queue.has(d.blockId))assert(relaxed.moveBlockStep(d.blockId,...p));}if(d.exitSide){assert(real.tryExit(d.blockId,d.exitSide).ok);if(!queue.has(d.blockId))assert(relaxed.tryExit(d.blockId,d.exitSide).ok);}assert(real.commitAction());const delta=real.snapshot().cleared-a;if(queue.has(d.blockId))queueClears+=delta;else{assert(relaxed.commitAction());openingClears+=delta;projectedCost+=Number(relaxed.snapshot().cleared===b);}realCost+=Number(delta===0);assert(openingClears>=projection.proofPrecondition.firstDeliveryRequiresAtLeastOpeningClears||queueClears===0);}
 assert(real.snapshot().complete&&relaxed.snapshot().complete);assert(projectedCost<=realCost);return{passed:true,realCost,projectedCost,stutters,openingClears,queueClears,sourceLevelSha256:digest(level),projectedLevelSha256:projection.projectedLevelSha256};}
