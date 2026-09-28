import assert from 'node:assert/strict';
import {digest} from './revised-preview-validation-v160.mjs';
import {checkSymmetryFloor} from './remake21to30-symmetry-floor-v139.mjs';
import {checkUniqueCurtainSumFloor} from './remake21to30-unique-suffix-v139.mjs';
import {checkFullGeneratorFloor,verifyFullGeneratorRouteProjection} from './remake41to50-full-generator-floor-v146.mjs';

// Lower-bound abstraction only. Erasing axis constraints admits both directions
// of movement and exit while keeping every body, layer, counter, queue and wall.
// Every legal original unit step/clear has identical retained-state effects in
// this graph; every held gesture maps with unchanged non-clearing cost. Optional
// exit contact in the downstream graph prevents extra exits forcing a clear.
// This cannot certify a route in the unmodified level: replay and Pointer remain
// independent requirements, and a shortcut/timeout is never threshold-proven.
export function projectAxisFloor(level,api){
 assert.equal(level.id,50,'Only this batch axis introduction is qualified');
 assert.equal(level.mechanismRules,'revised-2026-09-23-v1.4');
 api.validateLevel(level);
 assert(level.blocks.some(b=>b.movementAxis),'Actual axis mechanic required');
 assert(!level.blocks.some(b=>b.keyId||b.lockedBy||b.lockCount||b.star||b.timedBombSeconds),'Later block mechanisms are not qualified');
 assert(!level.flipDoors?.length&&!level.coloredGrids?.length&&!level.elevators?.length&&!level.conveyors?.length);
 assert(!(level.shutters??[]).some(s=>s.skin&&s.skin!=='shutter'));
 const projected=structuredClone(level),axes=[];
 for(const b of projected.blocks)if(b.movementAxis){assert(['horizontal','vertical'].includes(b.movementAxis));axes.push({id:b.id,axis:b.movementAxis});delete b.movementAxis;}
 api.validateLevel(projected);
 return {level:projected,sourceLevelSha256:digest(level),projectedLevelSha256:digest(projected),axes,abstraction:'axis-unrestricted-full-inventory-v1',costSimulation:'Erase only axis direction restrictions; keep every unit-step/clear effect and non-clearing gesture cost.',solvabilityValidated:false,pointerValidated:false};
}
export function checkAxisFloor(level,api,options={}){
 let projection;try{projection=projectAxisFloor(level,api);}catch(e){return {status:'unsupported',thresholdProven:false,reason:e.message};}
 const p=projection.level;
 let proof=p.generators?.length?checkFullGeneratorFloor(p,api,options):checkUniqueCurtainSumFloor(p,options);
 if(proof.status==='unsupported'&&!p.generators?.length)proof=checkSymmetryFloor(p,options);
 return {...proof,abstraction:projection.abstraction,underlyingAbstraction:proof.abstraction,sourceLevelSha256:projection.sourceLevelSha256,projectedLevelSha256:projection.projectedLevelSha256,projection:{...projection,level:undefined}};
}
export function verifyAxisRouteProjection(level,drags,api){
 const p=projectAxisFloor(level,api),source=api.replayRevisedRoute(level,drags),projected=api.replayRevisedRoute(p.level,drags);
 assert(source.valid&&source.complete,'Original full route required');assert(projected.valid&&projected.complete,'Original route must map to unrestricted model');
 assert.equal(projected.nonClearingDrags,source.nonClearingDrags);assert.equal(projected.clearEvents,source.clearEvents);
 const queue=level.generators?.length?verifyFullGeneratorRouteProjection(p.level,drags,api):null;
 if(queue)assert(queue.valid);
 return {valid:true,sourceLevelSha256:p.sourceLevelSha256,projectedLevelSha256:p.projectedLevelSha256,nonClearingDrags:source.nonClearingDrags,clearEvents:source.clearEvents,queue,solvabilityValidated:false};
}
