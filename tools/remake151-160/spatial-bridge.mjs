import assert from 'node:assert/strict';
import fs from 'node:fs';
import {digest} from '../revised-preview-validation-v160.mjs';
const V15='revised-2026-09-27-v1.5',V14='revised-2026-09-23-v1.4';
export const binding=()=>Object.fromEntries(['src/core/mechanismRules.ts','src/core/PuzzleModel.ts','tools/remake151-160/spatial-bridge.mjs'].map(p=>[p,digest(fs.readFileSync(p))]));
/** v1.5 changes only frozen FLIP eligibility. With zero flip doors, both profiles
 * use the identical revised movement, countdown, reveal, queue, and exit code.
 * This ephemeral copy is for historical restricted spatial compilers only;
 * every witness is independently replayed on the original v1.5 candidate.
 */
export function noFlipSpatialBridge(level,api){
 assert.equal(level.mechanismRules,V15);assert(!level.flipDoors?.length,'Bridge requires zero flip doors');assert(!level.blocks.some(b=>b.timedBombSeconds!==undefined),'No timed witness projection');api.validateLevel(level);
 const copy=structuredClone(level);copy.mechanismRules=V14;api.validateLevel(copy);
 const clean=s=>{const {mechanismRules,...state}=s;return state;};
 assert.deepEqual(clean(new api.PuzzleModel(level).snapshot()),clean(new api.PuzzleModel(copy).snapshot()),'Initial exact semantic bridge except profile identity');
 return copy;
}
/** Lower-bound relaxation for arbitrary deferred animation interleavings.
 * Erase timers and door open/closed/pending states, retain frozen counts, full
 * inventory/layers, axes, keys, stars, geometry, covers and FIFO. Every source
 * successful step/clear remains a legal optional-contact step/clear. Extra
 * exits never force removals. v1.5 thaw eligibility affects only erased bits.
 */
export function openDoorFloorProjection(level,api){
 assert.equal(level.mechanismRules,V15);api.validateLevel(level);
 assert(!(level.generators??[]).some(g=>g.trigger==='time'||g.intervalSeconds!==undefined||g.initialDelaySeconds!==undefined));assert(!level.elevators?.length&&!level.conveyors?.length);assert(!(level.shutters??[]).some(s=>s.skin&&!['shutter','lift'].includes(s.skin)));assert(!level.blocks.some(b=>b.rotationBadge));
 const copy=structuredClone(level),removedBombs=[],convertedDoors=[];
 for(const b of copy.blocks)if(b.timedBombSeconds!==undefined){removedBombs.push({id:b.id,seconds:b.timedBombSeconds});delete b.timedBombSeconds;}
 for(const d of copy.flipDoors??[]){const {initiallyOpen,...g}=d;copy.gates.push(g);convertedDoors.push({id:d.id,initiallyOpen});}copy.flipDoors=[];
 const spatial=noFlipSpatialBridge(copy,api);
 return {level:spatial,sourceLevelSha256:digest(level),projectedLevelSha256:digest(spatial),convertedDoors,removedBombs,bindings:binding(),abstraction:'v102-retained-inventory-thaw-preserving-always-open-optional-contact',solvabilityValidated:false,pointerValidated:false};
}
