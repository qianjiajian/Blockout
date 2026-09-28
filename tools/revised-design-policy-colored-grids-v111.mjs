import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import * as prior from './revised-design-policy-joint-stars-v111.mjs';
import * as families from './revised-design-policy-families-v111.mjs';
import * as gridSource from './revised-design-review-colored-grids-v111.mjs';
import {auditPlainGridSource,singleLayerIceThresholdProof,verifyPlainGridDesign} from './revised-colored-grid-conflicts-v111.mjs';
import {digest} from './revised-preview-validation-v160.mjs';
import {checkCarrierRelations,checkHistoricalCandidateInputs} from './revised-continuation-batch.mjs';
import {verifyRulesLock} from './verify-rules-lock.mjs';
export const RULE_VERSION=prior.RULE_VERSION;
export const measurePolicyFacts=prior.measurePolicyFacts;
const isGrid=f=>f?.mechanisms?.coloredGrid?.cellCount>0;
const read=(p,h,root=process.cwd())=>{assert.match(h,/^[a-f0-9]{64}$/i);const b=fs.readFileSync(path.resolve(root,p));assert.equal(digest(b),h.toLowerCase(),`Evidence drift ${p}`);return JSON.parse(b);};
export async function loadReviewedDesignSource(p,h,root=process.cwd()){
 const r=read(p,h,root);return isGrid(r.sourceNormalizedFacts)?gridSource.loadReviewedDesignSource(p,h,root):prior.loadReviewedDesignSource(p,h,root);
}
export function deriveDesignPolicy(sourceFacts,designFacts,levelId){
 if(!isGrid(sourceFacts))return prior.deriveDesignPolicy(sourceFacts,designFacts,levelId);
 const proof=singleLayerIceThresholdProof(sourceFacts),effective=structuredClone(sourceFacts),differences=[];
 function change(field,value,rule){const keys=field.split('.');let dst=effective;for(const k of keys.slice(0,-1))dst=dst[k];const k=keys.at(-1);if(JSON.stringify(dst[k])!==JSON.stringify(value)){differences.push({field,sourceValue:structuredClone(dst[k]),designValue:structuredClone(value),rule});dst[k]=structuredClone(value);}}
 change('mechanisms.shells.count',0,'v1.11-colored-grid-forbids-shells-preserve-bodies');
 change('mechanisms.numericIce.postMeltShellCount',0,'v1.11-colored-grid-remove-shell-only-preserve-ice');
 if(proof.minimumTotalDecrement>0)change('mechanisms.exits.frozenValues',proof.designValues,'v1.11-single-layer-unique-mouth-ranked-clear-event-cap');
 assert.deepEqual(designFacts.mechanisms.coloredGrid,sourceFacts.mechanisms.coloredGrid,'Colored groups and cell total unchanged');
 // Existing family comparison covers every other known field. Grid quantities
 // are independently checked above and physical colored-cell behavior below;
 // the private zero projection does not change source or accepted design data.
 const comparisonSource=structuredClone(effective),comparisonDesign=structuredClone(designFacts);
 comparisonSource.mechanisms.coloredGrid={cellCount:0,regionCount:0};comparisonDesign.mechanisms.coloredGrid={cellCount:0,regionCount:0};
 const rest=families.deriveDesignPolicy(comparisonSource,comparisonDesign,levelId);
 assert.deepEqual(rest.differences,[],'Narrow grid adapter cannot authorize unrelated redesign');
 return{ruleVersion:RULE_VERSION,sourceFactsSha256:digest(sourceFacts),effectiveFacts:effective,differences,
  thresholdProof:proof,exactMatch:false,approvedDifferenceCount:differences.length};
}
export function verifyReviewedDesign(raw,source,api){
 if(!isGrid(source.facts))return prior.verifyReviewedDesign(raw,source,api);
 assert.equal(raw.ruleVersion,RULE_VERSION);assert.equal(raw.level?.id,source.levelId);
 auditPlainGridSource(source.plainGridSource);assert.deepEqual(source.facts,source.plainGridSource.sourceNormalizedFacts);
 const facts=measurePolicyFacts(raw.level,api),policy=deriveDesignPolicy(source.facts,facts,source.levelId);
 assert.deepEqual(raw.designPolicy,{ruleVersion:RULE_VERSION,differences:policy.differences},'Explicit exact source-to-grid design delta required');
 const effective=structuredClone(source);effective.facts=policy.effectiveFacts;
 effective.sourceContract.mechanisms.shellBlocks=0;
 effective.sourceFacts.numericIce.items=effective.sourceFacts.numericIce.items.map(i=>({...i,post_melt_shell:false}));
 const indices=new Map(policy.thresholdProof.rows.map(r=>[r.sourceIndex,r.designValue]));let iceIndex=0;
 effective.sourceContract.mechanisms.exits=effective.sourceContract.mechanisms.exits.map(g=>g.frozen>0?{...g,frozen:indices.get(iceIndex++)}:g);
 const checked=gridSource.verifyReviewedDesign(raw,effective,api),coloredGridAudit=verifyPlainGridDesign(raw.level,source.plainGridSource,api);
 assert(checked.replay.complete&&checked.replay.valid,'Threshold bounds are not a substitute for full replay');
 return{...checked,ruleVersion:RULE_VERSION,sourceAligned:true,exactMatch:false,rulesPassed:true,
  sourceNormalizedFacts:source.facts,sourceContract:source.sourceContract,effectiveDesignContract:effective.sourceContract,
  policy,approvedDifferences:policy.differences,coloredGridAudit,
  alignmentMeaning:'Source facts retained; mandated shell removal and proven minimal ice-threshold repairs explicitly recorded',
  pointerReplayValidated:false,timeValidated:false,lowerBoundCertified:false,releaseApproved:false};
}
export async function checkCandidate(item,api){
 const lock=verifyRulesLock();assert(lock.ok&&lock.activeVersion===RULE_VERSION);
 const review=read(item.sourceReview.path,item.sourceReview.sha256);assert(!review.testFixtureOnly);
 if(!isGrid(review.sourceNormalizedFacts))return prior.checkCandidate(item,api);
 const raw=read(item.path,item.sha256);assert.equal(raw.level?.id,item.levelId);
 const historical=checkHistoricalCandidateInputs(raw.bindings),loaded=await loadReviewedDesignSource(item.sourceReview.path,item.sourceReview.sha256);
 const checked=verifyReviewedDesign(raw,loaded.source,api);checkCarrierRelations(raw.level,review);
 const inputBindings={...historical.current,[item.path]:item.sha256.toLowerCase()};
 for(const[p,b]of Object.entries(loaded.bindings)){const h=(typeof b==='string'?b:b.sha256).toLowerCase();if(inputBindings[p])assert.equal(inputBindings[p],h);inputBindings[p]=h;}
 return{raw,loaded,checked,inputBindings,historicalNonSourceDrift:historical.historicalNonSourceDrift,
  adapter:{loadReviewedDesignSource,verifyReviewedDesign}};
}
