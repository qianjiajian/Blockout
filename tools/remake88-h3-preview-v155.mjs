import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadApi,ruleGate,checkWitness} from './remake84-88-90-v152.mjs';
import {BASELINE} from './campaign31-200-baseline-v145.mjs';
import {digest} from './revised-preview-validation-v160.mjs';
import {auditSource,build} from '../deliverables/remake84-88-90-v152-20260925/88/h3-review-20260925/author-h3-selected.mjs';
import {verifyDecisions,verifyEarlyIceChoices,observeMechanismProcess} from './review-remake71to80-decisions-v146.mjs';
export {loadApi,ruleGate,BASELINE};
export const VERSION='1.55.0',OUTPUT='deliverables/remake84-88-90-v152-20260925/88/h3-review-20260925';
export function checkCandidate(data,_baseline,api){
 assert.equal(process.env.CANDIDATE_ONLY,'1','88 preview must not certify/adopt an unknown lower bound');
 const lock=ruleGate();assert.equal(data.level.id,88);assert.equal(digest(data.level),'c4053e9fc740ab8d1d291909445f8c0291a0bf247419b64959518e0b57ff2e7d');
 assert.deepEqual(build(data.seed,api).level,data.level,'Fresh source author rebuild');
 const witness=checkWitness(data,api),source=auditSource(data,api),decisions=verifyDecisions(data,api),ice=verifyEarlyIceChoices(data,api),mechanisms=observeMechanismProcess(data.level,data.drags,api);
 if(data.iceBranch){const c=data.iceBranch,prefix=data.drags.slice(0,c.branchStartBeforeDrag-1);assert.deepEqual(c.prefix.slice(0,prefix.length),prefix);assert.equal(c.prefix.length-prefix.length,c.extraLegalRepositionDrags);assert.deepEqual(c.onlyRemovedFields,['frozen']);
  const prior=api.replayRevisedRoute(data.level,prefix),r=api.replayRevisedRoute(data.level,c.prefix);assert(prior.valid&&r.valid);const s=JSON.parse(r.finalStateKey),g=s.gates.find(g=>g.id===c.gateId);assert.equal(prior.clearEvents,r.clearEvents);assert.equal(g.frozen,c.remainingIce);assert(g.frozen>0);assert.equal(s.cleared,c.cleared);
  const relaxed=structuredClone(data.level);delete relaxed.gates.find(g=>g.id===c.gateId).frozen;const q=api.replayRevisedRoute(relaxed,c.prefix);assert(q.valid);const same=JSON.parse(q.finalStateKey);same.gates.find(g=>g.id===c.gateId).frozen=g.frozen;assert.deepEqual(same,s);
  assert(!api.replayRevisedRoute(data.level,[...c.prefix,c.blockedAction]).valid);const allowed=api.replayRevisedRoute(relaxed,[...c.prefix,c.blockedAction]);assert(allowed.valid&&allowed.clearEvents>r.clearEvents);ice.push({passed:true,kind:'isolated-gate-ice-side-branch',gateId:g.id,remainingIce:g.frozen,provesGlobalOrder:false});
 }
 assert.equal(witness.upperBound,19);assert.equal(decisions.cases?.length??data.decisionCases.length,3);assert(ice.length>0);assert.equal(mechanisms.peels.length,4);assert.equal(mechanisms.transitions.flatMap(e=>e.thawedGates).length,5);
 for(const g of data.level.generators)assert.deepEqual(mechanisms.generatorEvents.filter(e=>e.generatorId===g.id).flatMap(e=>e.spawned),g.queueBlockIds);
 const sourceFile='deliverables/remake81-90-v146-20260924/agent88-90/source88.json',sourceData=JSON.parse(fs.readFileSync(sourceFile));source.bindings={...sourceData.bindings,[sourceFile]:digest(fs.readFileSync(sourceFile))};source.sourceFile=sourceFile;
 return{...witness,source,decisions,ice,mechanisms,activeRuleVersion:lock.activeVersion,lowerBound:null,lowerBoundValidated:false,pointerValidated:false,adoptionReady:false};
}
