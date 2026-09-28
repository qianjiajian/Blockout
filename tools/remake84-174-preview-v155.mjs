import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadApi,ruleGate,checkWitness} from './remake84-88-90-v152.mjs';
import {BASELINE} from './campaign31-200-baseline-v145.mjs';
import {digest} from './revised-preview-validation-v160.mjs';
import {checkSource84} from '../deliverables/remake81-90-v146-20260924/agent81-84/source-contract84-v2.mjs';
import {verifyDecisions,verifyEarlyIceChoices,observeMechanismProcess} from './review-remake71to80-decisions-v146.mjs';
import {verifyKeyProcess} from './remake81to90-key-review-v146.mjs';
import {replaySpatialTrace} from '../deliverables/remake71-80-v146-20260924/floor-review/replay-spatial-trace-v2.mjs';
export {loadApi,ruleGate,BASELINE};
export const VERSION='1.55.0',OUTPUT='deliverables/remake84-88-90-v152-20260925/84/review174-20260925';
export function checkCandidate(data,_baseline,api){
 assert.equal(process.env.CANDIDATE_ONLY,'1','84 remains a candidate until a fresh L21 passes');
 const lock=ruleGate();assert.equal(data.level.id,84);assert.equal(digest(data.level),'275425153f62d1304ad30c0be6040e5b67f8803b27f64583e14d986e9cae8001');
 const witness=checkWitness(data,api),source=checkSource84(data.level,api),decisions=verifyDecisions(data,api),ice=verifyEarlyIceChoices(data,api),keys=verifyKeyProcess(data,api),mechanisms=observeMechanismProcess(data.level,data.drags,api),domainReplay=replaySpatialTrace(data.level,data.drags,api);
 assert.equal(witness.upperBound,28);assert.equal(domainReplay.cost,28);assert.equal(decisions.cases.length,3);assert(ice.length);assert.equal(keys.events.length,3);assert.equal(keys.counterfactuals.length,1);assert.equal(mechanisms.peels.length,12);assert.equal(mechanisms.transitions.flatMap(e=>e.thawedGates).length,5);assert.equal(mechanisms.transitions.flatMap(e=>e.revealedShutters).length,4);
 const c=data.axisMechanismReview.contrast,mainPrefix=data.drags.slice(0,c.beforeStep-1),prefix=c.prefix;
 assert.deepEqual(prefix,[...mainPrefix,...(c.extraLegalNonClearingActions??[])]);
 const main=api.replayRevisedRoute(data.level,mainPrefix),branch=api.replayRevisedRoute(data.level,prefix);assert(main.valid&&branch.valid);assert.equal(main.clearEvents,branch.clearEvents);

 const original=api.replayRevisedRoute(data.level,prefix);assert(original.valid);
 const relaxed=structuredClone(data.level),axis=relaxed.blocks.find(b=>b.id===c.blockId);assert.equal(axis.movementAxis,'vertical');delete axis.movementAxis;
 const changed=api.replayRevisedRoute(relaxed,prefix);assert(changed.valid);const same=JSON.parse(changed.finalStateKey);same.blocks.find(b=>b.id===c.blockId).movementAxis='vertical';assert.deepEqual(same,JSON.parse(original.finalStateKey));
 assert(!api.replayRevisedRoute(data.level,[...prefix,c.blockedCrossAxisAction]).valid);assert(api.replayRevisedRoute(relaxed,[...prefix,c.blockedCrossAxisAction]).valid);
 source.bindings={...source.frameBindings,[source.sourceFile]:source.sourceSha256,[source.adaptationFile]:source.adaptationSha256};
 return {...witness,source,decisions,ice,keys,mechanisms,domainReplay,axis:{localCausalityVerified:true,globalOrderProven:false},activeRuleVersion:lock.activeVersion,lowerBound:null,lowerBoundValidated:false,pointerValidated:false,adoptionReady:false};
}
