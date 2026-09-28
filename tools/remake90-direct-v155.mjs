import assert from 'node:assert/strict';
import {loadApi,ruleGate,checkWitness} from './remake84-88-90-v152.mjs';
import {BASELINE} from './campaign31-200-baseline-v145.mjs';
import {digest} from './revised-preview-validation-v160.mjs';
import {checkSource90} from '../deliverables/remake84-88-90-v152-20260925/90/source-contract90.mjs';
import {verifyDecisions,verifyEarlyIceChoices,observeMechanismProcess} from './review-remake71to80-decisions-v146.mjs';
export {loadApi,ruleGate,BASELINE};
export const VERSION='1.55.0',OUTPUT='deliverables/remake84-88-90-v152-20260925/90';
export const SELECTED_LEVEL_SHA='2c4aeccf29ee3efdf8cdd94af6b7c0beaaf9e0d4c9d02d2744e77e75bc01dc4e';
export function checkCandidate(data,_baseline,api){
 const lock=ruleGate();assert.equal(lock.activeVersion,VERSION);assert.equal(data.level.id,90);
 assert.equal(digest(data.level),SELECTED_LEVEL_SHA,'Only the user-selected current candidate');
 const witness=checkWitness(data,api),source=checkSource90(data.level,api),decisions=verifyDecisions(data,api),ice=verifyEarlyIceChoices(data,api),mechanisms=observeMechanismProcess(data.level,data.drags,api);
 assert.equal(witness.upperBound,15);assert.equal(data.decisionCases.length,3);assert(ice.length>0);
 assert.equal(mechanisms.generatorEvents.reduce((n,e)=>n+e.spawned.length,0),18);
 for(const g of data.level.generators)assert.deepEqual(mechanisms.generatorEvents.filter(e=>e.generatorId===g.id).flatMap(e=>e.spawned),g.queueBlockIds,'Every fixed FIFO body in source order');
 source.bindings=source.sourceBindings;source.sourceFile=source.sourcePath;
 return{...witness,source,decisions,ice,mechanisms,activeRuleVersion:lock.activeVersion,adoptionBasis:'USER_DIRECT_WRITE_LOWER_BOUND_UNVERIFIED',lowerBound:null,lowerBoundValidated:false,difficultyCertified:false,pointerValidated:false,adoptionReady:false};
}
