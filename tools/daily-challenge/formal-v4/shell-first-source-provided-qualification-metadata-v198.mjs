import assert from 'node:assert/strict';
import {levelSha256,mechanismsUsedByDailyCandidate} from '../formal-v2/contract.mjs';
import {assertSealedShellProvidedRouteV198,assertShellProvidedSearchPlanV198,accountShellProvidedSearchReceiptV198} from './shell-provided-search-budget-v198.mjs';
import {assertShellSavedProjectionV198} from './shell-provided-qualification-metadata-v198.mjs';

// Read only existing first-source receipts. No synthetic parent, model,
// projection construction, replay, search, ledger claim or registration.
const TOOLCHAIN='45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804';
const isHash=h=>typeof h==='string'&&/^[a-f0-9]{64}$/.test(h);

export function assertShellFirstSourceNullParentV198(q){
  assert(Object.hasOwn(q.attemptPlan,'redesignOf'),'Original plan must explicitly record a null parent');
  assert(Object.hasOwn(q.attempt,'redesignOf'),'Original ledger request must explicitly record a null parent');
  assert.equal(q.attemptPlan.redesignOf,null,'Retry plans are outside the first-source qualifier');
  assert.equal(q.attempt.redesignOf,null,'A real or fabricated failed parent is forbidden');
  assert.equal(q.attemptPlan.mechanismBaseReceipt,null);
  assert.equal(q.attemptPlan.acceptedBaseMechanismAdaptationRequested,false);
  assert.equal(q.attemptPlan.sameExactObjectRevalidationAllowed,false);
  assert(!q.attempt.revalidates&&!q.attempt.lockFile);
  assert(!q.acceptedBaseAdaptation&&!q.failedMechanismParent,'No accepted-base or failed-mechanism exception');
  return true;
}

export function assertNewShellFirstSourceProvidedReceiptV198(q){
  assert.equal(q.schemaVersion,4);assert.equal(q.contractVersion,'daily-300-frozen-math-first-attempt-tolerance-v198');assert.equal(q.difficultyPolicyVersion,'1.198.0');
  assert.equal(q.accepted,true);assert.equal(q.formalReady,false);assert.equal(q.qualificationOnly,false);assert.equal(q.catalogEligible,true);assert.equal(q.redesignRequired,false);
  assert.equal(q.status,'FROZEN_MATH_V198_VERIFIED_AWAITING_DESIGN_AND_POINTER');assert.deepEqual(q.reasons,[]);assert(!Object.hasOwn(q,'timeSchedule')&&!Object.hasOwn(q,'timeScheduleSha256'));
  assert.equal(q.stageKey,'mechanisms-multilayer-shell-15');assert.equal(q.newestMechanism,'multilayer-shell');assert([1,2,3].includes(q.difficulty));assert(Number.isSafeInteger(q.slot)&&q.slot>=1&&q.slot<=10);
  assert.equal(q.formalId,`daily-mechanisms-multilayer-shell-15-d${q.difficulty}-${String(q.slot).padStart(2,'0')}`);assert(Number.isSafeInteger(q.sourceLevelId)&&q.sourceLevelId>=1&&q.sourceLevelId<=200);
  assert.equal(q.level.id,q.sourceLevelId);assert.equal(levelSha256(q.level),q.levelSha256);assertSealedShellProvidedRouteV198(q);
  const used=mechanismsUsedByDailyCandidate(q.level);assert(used.includes('multilayer-shell'));assert(used.every(k=>['color-exit','multilayer-shell','irregular-block','irregular-board'].includes(k)),'This qualifier is limited to ordinary gates and opening shell inventory');
  assert.equal(q.toolchainSha256,TOOLCHAIN);assert.equal(levelSha256(q.toolchainBindings),TOOLCHAIN);assert.equal(Object.keys(q.toolchainBindings).length,36);assert.equal(q.policyToolchainSha256,levelSha256(q.policyBindings));
  assert(isHash(q.attempt?.id)&&isHash(q.attempt.retryIdentitySha256));assert.equal(q.attempt.identityOrigin,q.attempt.id);assertShellFirstSourceNullParentV198(q);
  assert.equal(q.attemptPlanSha256,levelSha256(q.attemptPlan));assert.equal(q.attemptPlan.inputLevelSha256,q.levelSha256);assert.deepEqual(q.attemptPlan.band,q.band);
  assertShellProvidedSearchPlanV198(q.attemptPlan,null,q.routeSha256);
  const accounting=accountShellProvidedSearchReceiptV198(q,{entered:true,returned:true,failedParentId:null,providedRouteSha256:q.routeSha256});
  assert.equal(accounting.totalSearchCalls,1);assert.equal(accounting.upper.calls,0);assert.equal(accounting.lower.calls,1);assert.deepEqual(accounting.replayCalls,{canonical:1,independent:1});
  return{accounting,projection:assertShellSavedProjectionV198(q),failedParent:null,sourceHistoryRequiresIndependentExecutionEvidence:true};
}
