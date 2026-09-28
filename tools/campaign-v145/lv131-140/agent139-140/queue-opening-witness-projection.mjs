import assert from 'node:assert/strict';
import {digest} from '../../../revised-preview-validation-v160.mjs';
import {validateQueueObligationPrefix} from '../root-native/stationary-queue-obligations.mjs';
/** Search aid ONLY. Ordinary FIFO may clear before this goal, so this projection
 * is not the qualified queue-prefix lower-bound reduction. A returned route
 * becomes evidence only after full actual FIFO replay. */
export function projectQueueOpeningWitness(level,api,goalClears){
 const contract=validateQueueObligationPrefix(level,api);
 assert.equal(goalClears,contract.targets.length,'Search all opening ordinary bodies');
 const queued=new Set(contract.queueIds),projected=structuredClone(level);
 delete projected.generators;
 projected.blocks=projected.blocks.filter(b=>!queued.has(b.id));
 for(const b of projected.blocks)delete b.generatorId;
 api.validateLevel(projected);
 return {level:projected,sourceLevelSha256:digest(level),projectedLevelSha256:digest(projected),removedQueueIds:[...queued],goalClears,fullOrdinaryCount:contract.goalClears,witnessOnly:true,thresholdProven:false};
}
