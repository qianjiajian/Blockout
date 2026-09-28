import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import * as prior from './revised-design-policy-colored-grids-v111.mjs';
import * as families from './revised-design-policy-families-v111.mjs';
import * as jointSource from './revised-design-review-joint-keys-axis-v111.mjs';
import {projectJointCurtainFacts,verifyJointRevealReplay} from './revised-joint-curtain-cohorts-v111.mjs';
import {auditJointKeyAxisSource as auditJointCurtainSource,verifyJointKeyAxisCarriers as verifyJointKeyCarriers} from './revised-joint-keys-axis-v111.mjs';
import {digest} from './revised-preview-validation-v160.mjs';
import {checkCarrierRelations,checkHistoricalCandidateInputs} from './revised-continuation-batch.mjs';
import {verifyRulesLock} from './verify-rules-lock.mjs';

export const RULE_VERSION=prior.RULE_VERSION;
export const measurePolicyFacts=prior.measurePolicyFacts;
const isJoint=f=>Array.isArray(f?.mechanisms?.covers?.jointCohorts)&&f.mechanisms.keysLocks.keyCount>0;
function read(p,h,root=process.cwd()){assert.match(h,/^[a-f0-9]{64}$/i);const b=fs.readFileSync(path.resolve(root,p));assert.equal(digest(b),h.toLowerCase(),`Evidence drift ${p}`);return JSON.parse(b);}

export async function loadReviewedDesignSource(p,h,root=process.cwd()){
 const review=read(p,h,root);
 return isJoint(review.sourceNormalizedFacts)?jointSource.loadReviewedDesignSource(p,h,root):prior.loadReviewedDesignSource(p,h,root);
}

/** Count/whole-body identity is conserved at each observed simultaneous reveal.
 * The source cannot assign a cross-frame body to exactly one visual strip; our
 * spatial rule instead requires disjoint real regions containing whole bodies.
 * This is a labelled design partition, NOT newly discovered source batch sizes. */
export function deriveDesignPolicy(sourceFacts,designFacts,levelId){
 if(!isJoint(sourceFacts))return prior.deriveDesignPolicy(sourceFacts,designFacts,levelId);
 const projection=projectJointCurtainFacts(sourceFacts,designFacts);
 const base=families.deriveDesignPolicy(projection.effectiveFacts,designFacts,levelId);
 const partition={field:'mechanisms.covers.individualPartition',sourceValue:null,
  designValue:projection.assignments.filter(g=>!g.sourceIndividualCountsDefined),
  rule:'v1.11-whole-footprint-per-real-curtain-preserving-joint-reveal'};
 return{...base,sourceFactsSha256:digest(sourceFacts),differences:[...base.differences,partition],
  exactMatch:false,approvedDifferenceCount:base.differences.length+1,
  sourceIndividualPartitionDefined:false,designCurtainAssignments:projection.assignments};
}

export function verifyReviewedDesign(raw,source,api){
 if(!isJoint(source.facts))return prior.verifyReviewedDesign(raw,source,api);
 assert.equal(raw.ruleVersion,RULE_VERSION);assert.equal(raw.level?.id,source.levelId);
 auditJointCurtainSource(source.jointCurtainSource);
 assert.deepEqual(source.facts,source.jointCurtainSource.sourceNormalizedFacts,'Source facts must remain original');
 const measured=measurePolicyFacts(raw.level,api),projection=projectJointCurtainFacts(source.facts,measured);
 const policy=deriveDesignPolicy(source.facts,measured,source.levelId);
 assert.deepEqual(raw.designPolicy,{ruleVersion:RULE_VERSION,differences:policy.differences},'Explicit exact joint design delta required');
 const effective=structuredClone(source);effective.facts=projection.effectiveFacts;
 effective.sourceContract.mechanisms.shutterHiddenBatchCounts=[...measured.mechanisms.covers.hiddenBatchCounts];
 effective.sourceContract.mechanisms.shutterClearCounts=[...measured.mechanisms.covers.values];
 const otherPolicy=families.deriveDesignPolicy(effective.facts,measured,source.levelId);
 const checked=families.verifyReviewedDesign({...raw,designPolicy:{ruleVersion:RULE_VERSION,differences:otherPolicy.differences}},effective,api);
 const replay=verifyJointRevealReplay(raw.level,checked.drags,source,api);
 const keyCarrierAudit=verifyJointKeyCarriers(raw.level,source.jointCurtainSource);
 return{...checked,ruleVersion:RULE_VERSION,sourceAligned:true,exactMatch:false,rulesPassed:true,
  sourceNormalizedFacts:source.facts,sourceContract:source.sourceContract,effectiveDesignContract:checked.effectiveDesignContract,
  policy,approvedDifferences:policy.differences,jointRevealReplay:replay,keyCarrierAudit,
  sourceRevealGroups:source.jointCurtainSource.sourceRevealGroups,designCurtainAssignments:projection.assignments,
  sourceIndividualPartitionDefined:false,alignmentMeaning:'Independent source joint cohorts conserved; whole-body design partition is not source fact',
  pointerReplayValidated:false,formalTimeValidated:false,timeValidated:false,lowerBoundCertified:false,releaseApproved:false};
}

export async function checkCandidate(item,api){
 const lock=verifyRulesLock();assert(lock.ok&&lock.activeVersion===RULE_VERSION);
 const review=read(item.sourceReview.path,item.sourceReview.sha256);assert(!review.testFixtureOnly);
 if(!isJoint(review.sourceNormalizedFacts))return prior.checkCandidate(item,api);
 const raw=read(item.path,item.sha256);assert.equal(raw.level?.id,item.levelId);
 const historical=checkHistoricalCandidateInputs(raw.bindings),loaded=await loadReviewedDesignSource(item.sourceReview.path,item.sourceReview.sha256);
 const checked=verifyReviewedDesign(raw,loaded.source,api);checkCarrierRelations(raw.level,review);
 const inputBindings={...historical.current,[item.path]:item.sha256.toLowerCase()};
 for(const[p,b]of Object.entries(loaded.bindings)){const h=(typeof b==='string'?b:b.sha256).toLowerCase();if(inputBindings[p])assert.equal(inputBindings[p],h);inputBindings[p]=h;}
 return{raw,loaded,checked,inputBindings,historicalNonSourceDrift:historical.historicalNonSourceDrift,
  adapter:{loadReviewedDesignSource,verifyReviewedDesign}};
}
