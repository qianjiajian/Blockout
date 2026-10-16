import fs from 'node:fs';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {assertLowBandPlanSchema,assertLowBandCandidateIdentity,assertLowBandPrefixFacts} from './audit-low-band-prefix-static-independent.mjs';

// Metadata-only qualification; no loader, constructor, solver, or ledger call.
const plan=JSON.parse(fs.readFileSync('deliverables/daily-formal-v4-20261008/design/low-band-sixteen-plan-01/plan.json'));
const prefix=bp=>({drags:bp.prefixDrags.length,nonClearingDrags:bp.prefixFacts.parking,clearEvents:bp.prefixFacts.clears});
const item=bp=>({recipeId:bp.recipeId,targetDifficulty:bp.targetDifficulty,sourceLevelId:bp.sourceLevelId});

test('fixed 11-source plan permits at most 6 D1 and 10 D2 CSP inputs',()=>{
 assert(assertLowBandPlanSchema(plan));
 assert.equal(plan.blueprints.reduce((s,b)=>s+b.maximumStocks,0),16);
 for(const [key,value]of [['maximumAfterThisBatch',50],['previousMacro64ActualInputs',25],['maximumFinalColourInputsIncludingRejected',17]]){
  const q=structuredClone(plan);q[key]=value;assert.throws(()=>assertLowBandPlanSchema(q));
 }
});
test('D1 prefix parking 14/15 remains valid without pretending it proves L16',()=>{
 for(const source of [155,130,23]){
  const bp=plan.blueprints.find(b=>b.sourceLevelId===source),r=assertLowBandPrefixFacts(bp,prefix(bp));
  assert(r.providedPrefixParking<r.floor);assert.equal(r.remainingTailParkingCeiling,20-r.providedPrefixParking);
  assert.equal(r.prefixIsNotLowerBound,true);assert.equal(r.mathematicalBandValidated,false);
 }
});
test('D2 full ceiling stays 30 and low prefix does not cause automatic downgrade',()=>{
 for(const bp of plan.blueprints.filter(b=>b.targetDifficulty===2)){
  const r=assertLowBandPrefixFacts(bp,prefix(bp));assert.equal(r.floor,21);assert.equal(r.completeUpperCeiling,30);
  assert.equal(r.remainingTailParkingCeiling,30-bp.prefixFacts.parking);
 }
});
test('candidate, construction attempt, index item and blueprint identities all match',()=>{
 const bp=plan.blueprints[2];assert(assertLowBandCandidateIdentity(plan,bp,item(bp),item(bp),item(bp)));
 for(const position of [0,1,2])for(const [key,value]of [['recipeId','different'],['targetDifficulty',2],['sourceLevelId',198]]){
  const q=[item(bp),item(bp),item(bp)];q[position][key]=value;
  assert.throws(()=>assertLowBandCandidateIdentity(plan,bp,...q));
 }
});
test('static-slot identity and recipe caps cannot be borrowed from another band',()=>{
 for(const mutate of [p=>p.staticSlots[1].difficulty=2,p=>p.staticSlots[1].formalId='daily-basic-combined-d3-01',p=>p.blueprints[0].maximumStocks=2]){
  const q=structuredClone(plan);mutate(q);assert.throws(()=>assertLowBandPlanSchema(q));
 }
});
test('off-by-one tail allowance, fake prefix certificate and wrong actual counts reject',()=>{
 const bp=plan.blueprints[0];
 for(const mutate of [b=>b.prefixPlanExplanation.tailParkingCeiling++,b=>b.prefixPlanExplanation.prefixIsNotLowerBound=false,b=>b.prefixPlanExplanation.targetFloor=15]){
  const q=structuredClone(bp);mutate(q);assert.throws(()=>assertLowBandPrefixFacts(q,prefix(q)));
 }
 for(const key of ['drags','nonClearingDrags','clearEvents']){const q=prefix(bp);q[key]++;assert.throws(()=>assertLowBandPrefixFacts(bp,q));}
});
test('inclusive zero tail allowance is valid, prefix above band ceiling is not',()=>{
 const bp=structuredClone(plan.blueprints[0]);bp.prefixDrags=Array(20).fill({});
 bp.prefixFacts={drags:20,parking:20,clears:0};bp.prefixPlanExplanation.tailParkingCeiling=0;
 assert.equal(assertLowBandPrefixFacts(bp,prefix(bp)).remainingTailParkingCeiling,0);
 bp.prefixDrags.push({});bp.prefixFacts.drags++;bp.prefixFacts.parking++;bp.prefixPlanExplanation.tailParkingCeiling=-1;
 assert.throws(()=>assertLowBandPrefixFacts(bp,prefix(bp)));
});
