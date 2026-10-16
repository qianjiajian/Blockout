import assert from 'node:assert/strict';
import {levelSha256,routeSha256,auditStaticCandidate,independentReplay} from '../formal-v2/contract.mjs';
import {intensify as adaptPrimary,createCapacityConstructionBudget} from './capacity-primary-adapter.mjs';
import {capacityTargets,addCapacitySupport} from './capacity-intensity-policy.mjs';

/** Alternate declared adapter for new physical inputs, before their single
 * final-object proof. Existing failed inputs must never call this to retry. */
export async function composeCapacity(runtime,base,slot,priorLevel,{maxAttemptsPerCount=3,worldBudget}={}){
  const targets=capacityTargets(slot.newestMechanism,slot.difficulty);
  assert(priorLevel,'Exact old slot object is required');
  assert(Number.isSafeInteger(maxAttemptsPerCount)&&maxAttemptsPerCount>=1&&maxAttemptsPerCount<=3);
  const previous=runtime.priorDailySlots.get(slot.formalId);
  assert(previous&&previous.levelSha256===levelSha256(priorLevel),'Old baseline mismatch');
  const original=levelSha256(base.level),originalRoute=routeSha256(base.drags),failures=[],constructionBudget=createCapacityConstructionBudget(worldBudget);
  for(let primaryInstances=slot.difficulty+1;primaryInstances>=1;primaryInstances--){
    const primary=await adaptPrimary(base.level,base.drags,slot.newestMechanism,{runtime,difficulty:slot.difficulty,
      targets:{instances:primaryInstances},maxAttempts:maxAttemptsPerCount,constructionBudget,
      sourceLevelId:base.sourceLevelId,formalId:slot.formalId,idPrefix:slot.formalId});
    if(!primary.ok){failures.push({primaryInstances,stage:'primary-known-route',failedAttempts:primary.failedAttempts});
      if(primary.budgetExhausted)return{ok:false,targets,failures,status:'CAPACITY_CONSTRUCTION_BUDGET_EXHAUSTED',budgetExhausted:true,
        constructionAccounting:constructionBudget.report(),formalReady:false};continue;}
    try{
      const combined=addCapacitySupport(runtime,primary.level,primary.drags,slot.newestMechanism,slot.difficulty,previous.inventory,{constructionBudget});
      if(!combined.ok){failures.push({primaryInstances,stage:'combined-intensity',issues:combined.audit.issues});continue;}
      const candidate={...slot,sourceLevelId:base.sourceLevelId,level:combined.level,drags:combined.drags};
      const staticAudit=await auditStaticCandidate(runtime,candidate);
      assert(staticAudit.passed,staticAudit.issues.join(';'));
      const independent=independentReplay(runtime,candidate.level,candidate.drags);
      assert(independent.valid&&independent.complete&&!independent.failed,'Independent actual full replay rejected');
      assert.equal(levelSha256(base.level),original);assert.equal(routeSha256(base.drags),originalRoute);
      return{ok:true,...candidate,levelSha256:levelSha256(candidate.level),routeSha256:routeSha256(candidate.drags),
        targets,audit:combined.audit,staticAudit,independentReplay:independent,primaryInstances,
        knownWitnessPrimaryAdaptation:primary,addedSupport:combined.changes,failures,
        provenance:{inputLevelSha256:original,inputRouteSha256:originalRoute,
          outputLevelSha256:levelSha256(candidate.level),outputRouteSha256:routeSha256(candidate.drags),
          taskBoundary:'finite-construction-before-separate-first-final-object-proof',budgetDeclaredBeforeAdaptation:true,
          maximumPrimaryCounts:slot.difficulty+1,maxAttemptsPerCount,searchPerformed:constructionBudget.counts.expanded>0,
          fullBoardSolverInvocations:0,constructionAccounting:constructionBudget.report(),
          note:'Finite known-witness adaptations before any final bounded proof; not a failed-input retry.'},
        formalReady:false};
    }catch(e){failures.push({primaryInstances,stage:'combined-actual-object',error:e.message});
      if(e.capacityBudgetExhausted)return{ok:false,targets,failures,status:'CAPACITY_CONSTRUCTION_BUDGET_EXHAUSTED',budgetExhausted:true,
        constructionAccounting:constructionBudget.report(),formalReady:false};}
  }
  return{ok:false,targets,failures,status:'CAPACITY_ADAPTATION_EXHAUSTED',constructionAccounting:constructionBudget.report(),formalReady:false};
}
