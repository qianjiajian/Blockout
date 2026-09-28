import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {digest} from './revised-preview-validation-v160.mjs';

export const ADVANCED_ABSTRACTION='v145-full-inventory-optional-exit-no-deadlines-permanently-open-flip-doors';
let apiPromise;
export function loadAdvancedFloorApi(){
 return apiPromise??=build({stdin:{resolveDir:process.cwd(),contents:`
  export {PuzzleModel,validateLevel} from './src/core/PuzzleModel.ts';
  export {checkRevisedRepositionFloor} from './src/core/revisedRepositionFloor.ts';
 `},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'}).then(r=>import('data:text/javascript;base64,'+Buffer.from(r.outputFiles[0].text).toString('base64')));
}

/** Cost-nonincreasing lower-bound projection, never a playable candidate.
 * Keep every real body/layer/ice/key/axis/star/cover/lift/queue/spawn and all
 * actual geometry. Only erase bomb deadlines and make each flip exit an
 * ordinary always-open exit of identical colour/portal/star/frozen state.
 *
 * For ANY successful GUI trace, erase time and pending door-animation events.
 * Bomb deadlines only reject traces, so removing them never removes a move.
 * Both open and closed door states project to an open exit; a legal exit in
 * either source state remains possible. Contact is optional in the bound
 * graph, so extra open exits cannot force premature removal. Frozen counts
 * still decrease at the same body/peel events. A delayed completion changes
 * no retained state. Thus every legal interleaving has the same unit moves,
 * clears and full inventory in the projected model, at no higher cost.
 *
 * Fixed queues/lifts remain deterministic after each unit move; they are NOT
 * deleted while counters are retained. No early reveal, changed key, merged
 * block, gate resizing or timer/flip mutation is written to production data.
 * Deferred source models may have extra animation occupancy restrictions;
 * their removal only adds moves. An actual solution/time/Pointer witness must
 * be independently verified on the completely unmodified source level.
 */
export function projectAdvancedFloor(level,api){
 assert.equal(level?.mechanismRules,'revised-2026-09-23-v1.4','Only current spatial semantics qualified');
 assert(api?.validateLevel&&api?.PuzzleModel,'Authoritative API required');
 api.validateLevel(level);
 assert(!(level.generators??[]).some(g=>g.trigger==='time'||g.intervalSeconds!==undefined||g.initialDelaySeconds!==undefined),'No clock-driven dispatch');
 assert(!level.elevators?.length&&!level.conveyors?.length,'No legacy autonomous geometry');
 assert(!(level.shutters??[]).some(s=>s.skin&&!['shutter','lift'].includes(s.skin)),'No legacy nonspatial staging');
 assert(!level.blocks.some(b=>b.rotationBadge),'No unqualified rotation metadata');
 const projected=structuredClone(level),removedBombs=[],convertedDoors=[];
 for(const block of projected.blocks)if(block.timedBombSeconds!==undefined){removedBombs.push({id:block.id,seconds:block.timedBombSeconds});delete block.timedBombSeconds;}
 for(const door of projected.flipDoors??[]){const {initiallyOpen,...gate}=door;convertedDoors.push({id:door.id,initiallyOpen});projected.gates.push(gate);}
 projected.flipDoors=[];
 api.validateLevel(projected);
 assert.equal(projected.blocks.length,level.blocks.length);
 assert.deepEqual(projected.generators,level.generators);
 assert.deepEqual(projected.shutters,level.shutters);
 return {level:projected,abstraction:ADVANCED_ABSTRACTION,sourceLevelSha256:digest(level),projectedLevelSha256:digest(projected),removedBombs,convertedDoors,
  retainedBodyCount:level.blocks.length,retainedQueueIds:(level.generators??[]).flatMap(g=>g.queueBlockIds),
  simulation:'Every successful source GUI trace, including arbitrary delayed flip completions, maps after erasing deadlines and door state; optional contact prevents new exits becoming mandatory.',
  solvabilityValidated:false,timeValidated:false,pointerReplayValidated:false,releaseApproved:false};
}
export async function checkAdvancedFloor(level,options={}){
 const api=options.api??await loadAdvancedFloorApi();let projection;
 try{projection=projectAdvancedFloor(level,api);}catch(error){return {status:'unsupported',thresholdProven:false,reason:error.message,abstraction:ADVANCED_ABSTRACTION,solvabilityValidated:false,timeValidated:false,pointerReplayValidated:false,releaseApproved:false};}
 const {api:_api,...budget}=options,result=api.checkRevisedRepositionFloor(projection.level,budget);
 return {...result,underlyingAbstraction:result.abstraction,abstraction:ADVANCED_ABSTRACTION,sourceLevelSha256:projection.sourceLevelSha256,
  projectedLevelSha256:projection.projectedLevelSha256,projection:{...projection,level:undefined},
  solvabilityValidated:false,timeValidated:false,pointerReplayValidated:false,releaseApproved:false};
}
