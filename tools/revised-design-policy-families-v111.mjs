import assert from 'node:assert/strict';
import fs from 'node:fs';
import {digest,measureDesignFacts} from './revised-preview-validation-v160.mjs';
import {auditStrictMechanismAlignment} from './strict-mechanism-alignment-v190.mjs';
import {countIrregularBlockShapes} from './strict-mechanism-alignment-v170.mjs';
import * as base from './revised-design-review-expanded-v190.mjs';
import * as starsAndLifts from './revised-design-review-stars-v110.mjs';
import {checkCarrierRelations,checkHistoricalCandidateInputs} from './revised-continuation-batch.mjs';
import {verifyRulesLock} from './verify-rules-lock.mjs';

export const RULE_VERSION='1.11.0';
const count=n=>Number.isSafeInteger(n)&&n>=0;
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const sourceConflictCodes=new Set(['source-irregular-ratio-conflict','design-irregular-ratio-conflict',
 'source-exit-capacity-conflict','design-exit-capacity-conflict','source-grid-shell-conflict','design-grid-shell-conflict']);
const read=(p,h)=>{const bytes=fs.readFileSync(p);assert.equal(digest(bytes),h.toLowerCase(),`Evidence drift ${p}`);return JSON.parse(bytes);};
// The existing positive-star/lift adapter checks independently observed physical
// lift regions, ordered cohorts, star/ice mouths and complete dynamic replay.
// Selection is based on source facts, never on fields a candidate may omit.
const sourceAdapter=facts=>facts.mechanisms.starBlocks.count>0||facts.mechanisms.exits.starCount>0||facts.mechanisms.elevators.count>0?starsAndLifts:base;
function subsetIndices(source,selected){
 const remaining=source.map((value,index)=>({value,index})),indices=[];
 for(const value of selected){const i=remaining.findIndex(item=>item.value===value);assert(i>=0,'Retained ice must preserve each source value and multiplicity');indices.push(remaining.splice(i,1)[0].index);}
 return indices;
}

/** Generate the exact permitted delta from independent source and measurements.
 * No free-text waiver or candidate-provided count is substituted for unknown source.
 * This initial adapter deliberately does not claim support for positive grids,
 * mixed star/flip ice or changed flip inventory; those require physical adapters.
 */
export function deriveDesignPolicy(sourceFacts,designFacts,levelId){
 assert(Number.isInteger(levelId)&&levelId>=21&&levelId<=200,'Lv21–200 only');
 const source=structuredClone(sourceFacts),design=structuredClone(designFacts);
 for(const k of ['width','height','opening','full']){assert(count(source[k])&&source[k]>0,`Unknown source ${k}`);assert.equal(design[k],source[k],`Unchanged source ${k}`);}
 assert(source.opening<=source.full,'Source opening cannot exceed full');
 for(const stage of ['opening','full'])assert(count(source.mechanisms?.irregularBlocks?.[`${stage}Count`])&&source.mechanisms.irregularBlocks[`${stage}Count`]<=source[stage],'Source irregular count cannot exceed body count');
 // Verify the original inventory before making an effective design target.
 // Only the three explicit conflicts are exempt here, never unknown/invalid data.
 const self=auditStrictMechanismAlignment({levelId,facts:source},source);
 assert.deepEqual(self.unresolved,[],'Unknown source is not a conflict exception');
 assert.deepEqual(self.blockedIssues.filter(i=>!sourceConflictCodes.has(i.code)),[],'Invalid independent source inventory');
 assert(!source.mechanisms.exits.overlappingAttributes,'Physical overlapping exits need a dedicated adapter');
 assert.equal(source.mechanisms.coloredGrid.cellCount,0,'Positive colored-grid source needs a reviewed v1.11 adapter');
 assert(source.mechanisms.exits.frozenValues.every(n=>n>0),'Source frozen exit values must be positive');
 const effective=structuredClone(source),differences=[];
 function change(field,value,rule){
  const keys=field.split('.');let target=effective;for(const key of keys.slice(0,-1))target=target[key];
  const key=keys.at(-1),before=target[key];if(same(before,value))return;
  differences.push({field,sourceValue:structuredClone(before),designValue:structuredClone(value),rule});target[key]=structuredClone(value);
 }
 for(const stage of ['opening','full']){
  const n=source.mechanisms.irregularBlocks[`${stage}Count`],maximum=Math.floor(source[stage]*3/10);
  if(n>maximum)change(`mechanisms.irregularBlocks.${stage}Count`,maximum,'v1.11-irregular-30-percent');
 }
 const a=source.mechanisms.exits,b=design.mechanisms?.exits;
 assert(b,'Measured exits required');
 const nonstar=a.ordinaryCount+a.frozenCount+a.flipCount;
 let retainedFrozenSourceIndices=a.frozenValues.map((_,i)=>i);
 if(levelId===26){
  // The already-approved exact three ice values cannot be weakened by the new rule.
  assert.deepEqual([...a.frozenValues].sort((x,y)=>x-y),[5,9,14]);
 }
 if(nonstar>8&&a.frozenCount+a.flipCount>=8){
  // Retain all flip doors and at least one plain exit when the source has it.
  // This is the maximum-cardinality solution after ordinary reduction is exhausted.
  const ordinary=a.ordinaryCount>0?1:0,frozen=8-a.flipCount-ordinary;
  assert(frozen>=Number(a.frozenCount>0)&&frozen<a.frozenCount,'Unsupported special-exit capacity conflict');
  assert.equal(b.ordinaryCount,ordinary,'Keep the minimum positive plain mechanism under special capacity pressure');
  assert.equal(b.frozenCount,frozen,'Retain the maximum number of special exits');
  assert.equal(b.flipCount,a.flipCount,'Flip inventory not granted a free reduction');
  assert(Array.isArray(b.frozenValues)&&b.frozenValues.length===frozen&&b.frozenValues.every(n=>count(n)&&n>0),'Measured retained ice inventory');
  retainedFrozenSourceIndices=subsetIndices(a.frozenValues,b.frozenValues);
  change('mechanisms.exits.ordinaryCount',ordinary,'v1.11-eight-color-exit-capacity');
  change('mechanisms.exits.frozenCount',frozen,'v1.11-eight-color-exit-capacity');
  change('mechanisms.exits.frozenValues',b.frozenValues,'v1.11-eight-color-exit-capacity');
 }
 // Existing v1.9 plain-only reduction is retained, never generalized to other fields.
 const alignment=auditStrictMechanismAlignment({levelId,facts:effective},design);
 for(const row of alignment.approvedExceptions){
  if(row.field==='mechanisms.exits.ordinaryCount')change(row.field,row.designValue,'v1.9-ordinary-only-capacity-reconfiguration');
 }
 const final=auditStrictMechanismAlignment({levelId,facts:effective},design);
 assert.deepEqual(final.unresolved,[],'Unknown candidate/source fields remain blocking');
 assert.deepEqual(final.blockedIssues,[],'Unapproved source difference or candidate hard-rule failure');
 return{ruleVersion:RULE_VERSION,sourceFactsSha256:digest(source),effectiveFacts:effective,differences,
  retainedFrozenSourceIndices,exactMatch:differences.length===0,approvedDifferenceCount:differences.length};
}

export function measurePolicyFacts(level,api){
 const model=new api.PuzzleModel(level);model.start();const opening=model.snapshot();
 const visible=opening.blocks.filter(b=>!b.shutterId||opening.shutters.find(s=>s.id===b.shutterId)?.revealed);
 const facts=measureDesignFacts(level,api);facts.opening=visible.length;
 facts.mechanisms.keysLocks.groups=api.measureRevisedMechanismInventory(level).keyGroups.map(g=>({keyCount:g.keyCount,lockValues:g.lockCounts}));
 facts.mechanisms.irregularBlocks={openingCount:countIrregularBlockShapes(visible),fullCount:countIrregularBlockShapes(level.blocks)};
 return facts;
}

export function verifyReviewedDesign(raw,source,api){
 assert.equal(raw.ruleVersion,RULE_VERSION,'New candidate must identify v1.11');
 assert.equal(raw.level?.id,source.levelId);
 const facts=measurePolicyFacts(raw.level,api);
 if(source.facts.mechanisms.keysLocks.groups)facts.mechanisms.keysLocks.groups=api.measureRevisedMechanismInventory(raw.level).keyGroups.map(g=>({keyCount:g.keyCount,lockValues:g.lockCounts}));
 const policy=deriveDesignPolicy(source.facts,facts,source.levelId);
 assert.deepEqual(raw.designPolicy,{ruleVersion:RULE_VERSION,differences:policy.differences},'Candidate must explicitly declare the independently recomputed exact delta');
 const effectiveSource=structuredClone(source);effectiveSource.facts=policy.effectiveFacts;
 const mechanisms=effectiveSource.sourceContract.mechanisms;
 if(policy.differences.some(d=>d.field.startsWith('mechanisms.exits.'))){
  let ordinary=0,iceIndex=0;const wanted=policy.effectiveFacts.mechanisms.exits;
  mechanisms.exits=mechanisms.exits.filter(g=>{
   if(g.kind==='ordinary'&&!g.star&&!g.frozen)return ordinary++<wanted.ordinaryCount;
   if(g.kind==='ordinary'&&!g.star&&g.frozen>0)return policy.retainedFrozenSourceIndices.includes(iceIndex++);
   return true;
  });
 }
 // Reuse all spatial/coverage/art/ice-carrier/complete-replay checks against the
 // explicitly authorized target, without relabelling the source as the target.
 const checked=sourceAdapter(source.facts).verifyReviewedDesign(raw,effectiveSource,api);
 return{...checked,ruleVersion:RULE_VERSION,rulesPassed:true,sourceAligned:true,exactMatch:policy.exactMatch,
  sourceNormalizedFacts:source.facts,sourceContract:source.sourceContract,
  effectiveDesignContract:effectiveSource.sourceContract,policy,approvedDifferences:policy.differences,
  alignmentMeaning:'Our hard rules + unchanged source fields + explicitly approved differences; not necessarily exact competitor parity'};
}

export async function checkCandidate(item,api){
 const lock=verifyRulesLock();assert(lock.ok&&lock.activeVersion===RULE_VERSION,'Active v1.11 rule lock required');
 const raw=read(item.path,item.sha256);assert.equal(raw.level.id,item.levelId);
 const review=read(item.sourceReview.path,item.sourceReview.sha256);assert(!review.testFixtureOnly,'Synthetic fixture is not source evidence');
 const historical=checkHistoricalCandidateInputs(raw.bindings);
 const loader=sourceAdapter(review.sourceNormalizedFacts);
 const loaded=await loader.loadReviewedDesignSource(item.sourceReview.path,item.sourceReview.sha256);
 const checked=verifyReviewedDesign(raw,loaded.source,api);checkCarrierRelations(raw.level,review);
 const inputBindings={...historical.current,[item.path]:item.sha256.toLowerCase()};
 for(const[p,b]of Object.entries(loaded.bindings)){
  const hash=(typeof b==='string'?b:b.sha256).toLowerCase();if(inputBindings[p])assert.equal(inputBindings[p],hash,'Conflicting evidence binding');inputBindings[p]=hash;
 }
 return{raw,loaded,checked,inputBindings,historicalNonSourceDrift:historical.historicalNonSourceDrift,
  adapter:{loadReviewedDesignSource:loader.loadReviewedDesignSource,verifyReviewedDesign}};
}
