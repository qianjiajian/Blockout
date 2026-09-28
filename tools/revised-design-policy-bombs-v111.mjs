import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import * as families from './revised-design-policy-families-v111.mjs';
import * as bombs from './revised-design-review-bombs-v110.mjs';
import * as base from './revised-design-review-expanded-v190.mjs';
import * as starsAndLifts from './revised-design-review-stars-v110.mjs';
import {digest} from './revised-preview-validation-v160.mjs';
import {checkCarrierRelations,checkHistoricalCandidateInputs} from './revised-continuation-batch.mjs';
import {verifyRulesLock} from './verify-rules-lock.mjs';

export const RULE_VERSION = families.RULE_VERSION;
export const measurePolicyFacts = families.measurePolicyFacts;
const sorted = values => [...values].sort((a,b) => a-b);

function read(file, expectedSha, root=process.cwd()) {
  assert.match(expectedSha,/^[a-f0-9]{64}$/i,'Independent input hash required');
  const bytes=fs.readFileSync(path.resolve(root,file));
  assert.equal(digest(bytes),expectedSha.toLowerCase(),`Evidence drift ${file}`);
  return JSON.parse(bytes);
}

// Choose from independent source facts, never from a possibly omitted candidate
// bomb field. Unknown / malformed zero inventory must not fall through to families.
function hasBombs(facts) {
  const b=facts?.mechanisms?.bombs;
  assert(Number.isSafeInteger(b?.count)&&b.count>=0,'Known source bomb count required');
  assert(Array.isArray(b.values)&&b.values.length===b.count&&
    Array.from(b.values).every(n=>Number.isFinite(n)&&n>0),'Known positive source bomb initial seconds required');
  return b.count>0;
}

function assertSupportedBombFacts(facts) {
  assert(hasBombs(facts),'Positive bomb source required');
  const m=facts.mechanisms;
  for(const [name,value] of [['star blocks',m.starBlocks?.count],['star exits',m.exits?.starCount],
    ['star ice exits',m.exits?.starFrozenCount],['lifts',m.elevators?.count],
    ['colored-grid cells',m.coloredGrid?.cellCount],['colored-grid regions',m.coloredGrid?.regionCount]]) {
    assert.equal(value,0,`Bombs with positive or unknown ${name} need a reviewed joint adapter`);
  }
  assert(!m.exits.overlappingAttributes,'Bombs with overlapping exit attributes need a reviewed joint adapter');
  assert(!(m.keysLocks?.groups??[]).some(g=>g.frozenKeyValues?.length||g.frozenLockValues?.length),
    'Bombs with mixed keyed ice need a reviewed joint adapter');
}

function assertLoadedBombMetadata(source) {
  const items=source.sourceFacts?.bombs?.items,expected=source.facts.mechanisms.bombs;
  assert(Array.isArray(items)&&items.length===expected.count,'Every bomb needs observed carrier metadata');
  assert.equal(new Set(items.map(i=>i?.sourceId)).size,items.length,'Unique source bomb identities required');
  for(const item of items) {
    assert(typeof item?.sourceId==='string'&&item.sourceId&&typeof item.shell==='boolean','Known bomb shell association required');
    assert(Number.isFinite(item.seconds)&&item.seconds>0&&Number.isSafeInteger(item.frozen)&&item.frozen>=0,
      'Known bomb initial seconds and ice association required');
    assert(item.axis===null||item.axis==='horizontal'||item.axis==='vertical','Known bomb axis association required');
    assert(item.keyGroup===null&&item.lockGroup===null&&item.star===false,
      'Key/lock/star bomb intersections need their own reviewed joint adapter');
    assert(item.reason&&Array.isArray(item.evidencePaths)&&item.evidencePaths.length,'Bomb carrier evidence required');
  }
  assert.deepEqual(sorted(items.map(i=>i.seconds)),sorted(expected.values),'Bomb metadata/facts mismatch');
  assert.deepEqual(sorted(source.sourceContract.mechanisms.bombSeconds),sorted(expected.values),'Bomb contract/facts mismatch');
}

/** Same minimal-difference policy as the frozen family adapter, with explicit
 * fail-closed boundaries for mixed positive-bomb families not yet reviewed. */
export function deriveDesignPolicy(sourceFacts,designFacts,levelId) {
  if(hasBombs(sourceFacts))assertSupportedBombFacts(sourceFacts);
  return families.deriveDesignPolicy(sourceFacts,designFacts,levelId);
}

/** Source observations, frame hashes, all 15 families and carrier metadata are
 * validated by the original loader. No original fact, observation or binding is
 * normalized to the candidate's values. Synthetic fixtures remain non-evidence. */
export async function loadReviewedDesignSource(reviewPath,expectedSha,root=process.cwd()) {
  const review=read(reviewPath,expectedSha,root),facts=review.sourceNormalizedFacts;
  if(hasBombs(facts)) {
    assertSupportedBombFacts(facts);
    return bombs.loadReviewedDesignSource(reviewPath,expectedSha,root);
  }
  const m=facts.mechanisms;
  const loader=m.starBlocks?.count>0||m.exits?.starCount>0||m.elevators?.count>0?starsAndLifts:base;
  return loader.loadReviewedDesignSource(reviewPath,expectedSha,root);
}

/** Complete positive-time model witness only. Browser Pointer timing, original
 * formal deadlines, human feasibility, stars and lower bounds remain separate. */
export function verifyReviewedDesign(raw,source,api) {
  if(!hasBombs(source.facts))return families.verifyReviewedDesign(raw,source,api);
  assertSupportedBombFacts(source.facts);
  assertLoadedBombMetadata(source);
  assert.equal(raw.ruleVersion,RULE_VERSION,'New candidate must identify v1.11');
  assert.equal(raw.level?.id,source.levelId,'Source level identity');
  const facts=measurePolicyFacts(raw.level,api);
  const policy=deriveDesignPolicy(source.facts,facts,source.levelId);
  assert.deepEqual(raw.designPolicy,{ruleVersion:RULE_VERSION,differences:policy.differences},
    'Candidate must explicitly declare the independently recomputed exact delta');

  // A labelled derived target only: the original source and full bomb tuples are
  // retained. The policy permits no timer, carrier, body, ice-block or shell edit.
  const effectiveSource=structuredClone(source);
  effectiveSource.facts=policy.effectiveFacts;
  if(policy.differences.some(d=>d.field.startsWith('mechanisms.exits.'))) {
    let ordinary=0,iceIndex=0;
    const wanted=policy.effectiveFacts.mechanisms.exits;
    effectiveSource.sourceContract.mechanisms.exits=effectiveSource.sourceContract.mechanisms.exits.filter(g=>{
      if(g.kind==='ordinary'&&!g.star&&!g.frozen)return ordinary++<wanted.ordinaryCount;
      if(g.kind==='ordinary'&&!g.star&&g.frozen>0)return policy.retainedFrozenSourceIndices.includes(iceIndex++);
      return true;
    });
  }
  const checked=bombs.verifyReviewedDesign(raw,effectiveSource,api);
  assert(checked.timedModelValidated&&checked.replay.modelTimeValidated&&checked.replay.valid&&
    checked.replay.complete&&checked.replay.activeElapsedSeconds>0,'Fresh positive-time complete bomb model required');
  return {...checked,ruleVersion:RULE_VERSION,rulesPassed:true,sourceAligned:true,exactMatch:policy.exactMatch,
    sourceNormalizedFacts:source.facts,sourceContract:source.sourceContract,
    effectiveDesignContract:effectiveSource.sourceContract,policy,approvedDifferences:policy.differences,
    alignmentMeaning:'Our hard rules + unchanged source fields + explicitly approved differences; not necessarily exact competitor parity',
    pointerReplayValidated:false,formalTimeValidated:false,timeValidated:false,timeAndStarsCalibrated:false,
    lowerBoundCertified:false,releaseApproved:false};
}

/** Same item/result contract and historical-input drift semantics as families.
 * This new facade does not migrate or modify any archive, formal batch or UI. */
export async function checkCandidate(item,api) {
  const lock=verifyRulesLock();
  assert(lock.ok&&lock.activeVersion===RULE_VERSION,'Active v1.11 rule lock required');
  const review=read(item.sourceReview.path,item.sourceReview.sha256);
  assert(!review.testFixtureOnly,'Synthetic fixture is not source evidence');
  if(!hasBombs(review.sourceNormalizedFacts))return families.checkCandidate(item,api);
  const raw=read(item.path,item.sha256);
  assert.equal(raw.level?.id,item.levelId);
  const historical=checkHistoricalCandidateInputs(raw.bindings);
  const loaded=await loadReviewedDesignSource(item.sourceReview.path,item.sourceReview.sha256);
  const checked=verifyReviewedDesign(raw,loaded.source,api);
  checkCarrierRelations(raw.level,review);
  const inputBindings={...historical.current,[item.path]:item.sha256.toLowerCase()};
  for(const [file,binding] of Object.entries(loaded.bindings)) {
    const hash=(typeof binding==='string'?binding:binding.sha256).toLowerCase();
    if(inputBindings[file])assert.equal(inputBindings[file],hash,'Conflicting evidence binding');
    inputBindings[file]=hash;
  }
  return {raw,loaded,checked,inputBindings,historicalNonSourceDrift:historical.historicalNonSourceDrift,
    adapter:{loadReviewedDesignSource,verifyReviewedDesign}};
}
