import assert from 'node:assert/strict';
import {digest} from '../revised-preview-validation-v160.mjs';
export {replaySpatial} from '../star-targets141-150/verification.mjs';
export const IDS=[78];
export const clean=v=>JSON.parse(JSON.stringify(v));
export const omitTarget=level=>{const l=clean(level);delete l.preservedMoveTarget;return l;};
export function validateData(before,route,levels,api){
 assert.equal(before.priorLevels.length,200);assert.equal(levels.length,200);
 assert.deepEqual(levels,before.priorLevels,'A solve-only task must preserve every formal LEVELS object');
 assert.equal(route.id,78);assert.deepEqual(route.level,levels[77]);assert.equal(digest(route.drags),route.routeSha256);
 assert.equal(digest(before.priorLevels),before.campaignSha256);
 const stars=api.levelStarTargets(levels[77]);assert.deepEqual(stars,{moveTarget:37,timeTargetSeconds:129});
 assert(route.drags.length>0);assert(route.drags.every(d=>d.blockId&&Array.isArray(d.path)));
 return{passed:true,all200Preserved:true,scoringPreserved:true,levelSha256:digest(levels[77]),routeSha256:route.routeSha256,routeDragCount:route.drags.length,stars,routeWithinMoveTarget:route.drags.length<=stars.moveTarget};
}
