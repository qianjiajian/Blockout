import assert from 'node:assert/strict';
import {digest} from '../../revised-preview-validation-v160.mjs';
import {checkSymmetryFloor} from '../../remake21to30-symmetry-floor-v139.mjs';

/** Lower-bound-only simulation, not a playable replacement.
 * Retain EVERY initially visible body, its original position, shape and all
 * shell colors. Erase hidden inventory, curtains/lifts, every numeric-ice
 * restriction and every gate-ice restriction. Keep board geometry and gates.
 * Only the qualified no-generator/no-key/no-axis/no-time/no-flip domain is used.
 *
 * Project any real successful trace by dropping gestures of hidden bodies and
 * all reveal events. For a retained body each unit step stays legal: retained
 * occupancy agrees and erased occupancy only frees cells; all ice restrictions
 * have been erased, so omitted hidden clear events cannot prevent thawing.
 * Keep the same explicit exit/peel at the same pose and color. Optional contact
 * in the floor graph avoids forcing newly available gate exits. A source
 * nonclearing gesture maps to at most one nonclearing gesture; hidden gestures
 * and return-to-origin gestures without retained effects may vanish. Every
 * retained body is removed in a real full solution, so the projection reaches
 * its full goal. Therefore optimum(projected) <= optimum(source).
 * This is intentionally weak and never claims a solution to the real level.
 */
export function projectOpening(level,api){
 api.validateLevel(level);assert.equal(level.mechanismRules,'revised-2026-09-23-v1.4');
 for(const k of ['generators','flipDoors','coloredGrids','elevators','conveyors'])assert(!level[k]?.length,`Unqualified ${k}`);
 for(const b of level.blocks)for(const k of ['keyId','lockedBy','lockCount','movementAxis','timedBombSeconds','star','rotationBadge'])assert(!b[k],`Unqualified ${k}`);
 assert((level.shutters??[]).every(s=>!s.triggerBlockIds&&(!s.skin||['shutter','lift'].includes(s.skin))));
 assert(level.gates.every(g=>!g.star&&!g.portals));
 const start=new api.PuzzleModel(level).snapshot(),visible=new Set(start.blocks.filter(b=>!b.shutterId||start.shutters.find(s=>s.id===b.shutterId)?.revealed).map(b=>b.id));
 const projected=structuredClone(level);projected.blocks=projected.blocks.filter(b=>visible.has(b.id)).map(b=>{delete b.shutterId;delete b.frozen;return b;});delete projected.shutters;
 projected.gates=projected.gates.map(g=>{delete g.frozen;return g;});api.validateLevel(projected);
 return {level:projected,sourceLevelSha256:digest(level),projectedLevelSha256:digest(projected),retainedIds:projected.blocks.map(b=>b.id),
  abstraction:'visible-body-projection-all-ice-erased-optional-exit-v147',costNonincreasing:true,solvabilityValidated:false,pointerReplayValidated:false};
}
export function verifyRouteProjection(level,drags,api){
 const p=projectOpening(level,api),ids=new Set(p.retainedIds),source=new api.PuzzleModel(structuredClone(level)),projection=new api.PuzzleModel(p.level);source.startCountdown();projection.startCountdown();
 let sourceCost=0,projectedCost=0,steps=0;const retainedRoute=[];
 const inventory=s=>s.blocks.filter(b=>ids.has(b.id)).map(b=>({id:b.id,x:b.x,y:b.y,layers:b.layers})).sort((a,b)=>a.id.localeCompare(b.id));
 const apply=(m,d)=>{const before=m.snapshot();m.beginAction();for(const [x,y]of d.path){assert(m.moveBlockStep(d.blockId,x,y));steps++;}if(d.exitSide)assert(m.tryExit(d.blockId,d.exitSide).ok);const committed=m.commitAction(),after=m.snapshot();return {committed,cost:committed&&after.cleared===before.cleared?1:0};};
 for(const d of drags){sourceCost+=apply(source,d).cost;if(ids.has(d.blockId)){const r=apply(projection,d);projectedCost+=r.cost;if(r.committed)retainedRoute.push(d);}assert.deepEqual(inventory(source.snapshot()),inventory(projection.snapshot()),'Every retained pose/layer must match after each source gesture');}
 assert(source.snapshot().complete&&projection.snapshot().complete);assert(projectedCost<=sourceCost);
 return {passed:true,sourceCost,projectedCost,checkedUnitSteps:steps,sourceDrags:drags.length,projectedDrags:retainedRoute.length,retainedRoute,sourceLevelSha256:p.sourceLevelSha256,projectedLevelSha256:p.projectedLevelSha256};
}
export function proveOpeningFloor(level,api,options){const p=projectOpening(level,api),proof=checkSymmetryFloor(p.level,options);return {...proof,projection:{...p,level:undefined},sourceLevelSha256:p.sourceLevelSha256,projectedLevelSha256:p.projectedLevelSha256};}
