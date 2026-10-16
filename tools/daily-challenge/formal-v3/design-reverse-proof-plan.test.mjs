import test from 'node:test';
import assert from 'node:assert/strict';
import {proofPlanForKnownU,classifyKnownWitnessLower} from './design-reverse-proof-plan.mjs';
test('predeclared floor follows finite known U, including unbounded finite D3 witnesses',()=>{
 for(const[U,difficulty,floor]of [[16,1,16],[20,1,16],[21,2,21],[28,2,21],[30,2,21],[31,3,31],[135,3,31]])assert.deepEqual(proofPlanForKnownU(U),{eligible:true,difficulty,floor,knownU:U});
 assert.equal(proofPlanForKnownU(13).eligible,false);for(const U of [NaN,Infinity,-1,21.5])assert.throws(()=>proofPlanForKnownU(U));
});
test('partial UNKNOWN floor and out-of-band claimed cost cannot mint acceptance or switch search',()=>{
 const plan=proofPlanForKnownU(28);
 assert.equal(classifyKnownWitnessLower(plan,{status:'unknown',thresholdProven:false,certifiedFloor:21}),null);
 assert.equal(classifyKnownWitnessLower(plan,{status:'threshold-proven',thresholdProven:true,certifiedFloor:16}),null);
 assert.equal(classifyKnownWitnessLower(plan,{status:'relaxed-shortcut',cost:25,drags:[]}),null);
 assert.deepEqual(classifyKnownWitnessLower(plan,{status:'threshold-proven',thresholdProven:true,certifiedFloor:21}),{difficulty:2,L:21,U:28,requiresShortcutReplay:false});
});
test('a completed same-search shortcut can be retained only with its own replay requirement',()=>{
 const plan=proofPlanForKnownU(135);
 assert.deepEqual(classifyKnownWitnessLower(plan,{status:'relaxed-shortcut',cost:28,drags:[{}]}),{difficulty:2,L:28,U:28,requiresShortcutReplay:true});
 assert.deepEqual(classifyKnownWitnessLower(proofPlanForKnownU(28),{status:'relaxed-shortcut',cost:19,drags:[{}]}),{difficulty:1,L:19,U:19,requiresShortcutReplay:true});
 assert.equal(classifyKnownWitnessLower(plan,{status:'relaxed-shortcut',cost:15,drags:[]}),null);
});
