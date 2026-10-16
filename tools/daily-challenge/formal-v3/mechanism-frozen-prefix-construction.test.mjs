import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {loadBoundedRuntime} from './bounded-proof.mjs';
import {residualIceLevel,auditIceInverse,readReferenceCut,planReplacementStock,constructFrozenPrefix,assertFrozenPrefixDomain} from './mechanism-frozen-prefix-construction.mjs';
const runtime=await loadBoundedRuntime();
const full={id:200,name:'qualification',width:2,height:2,timeSeconds:100,reward:0,parMoves:10,mechanismRules:'revised-2026-09-27-v1.5',
 blocks:[{id:'b',x:0,y:0,shape:[[0,0]],color:'blue'},{id:'r',x:1,y:0,shape:[[0,0]],color:'red'}],
 gates:[{id:'blue',color:'blue',side:'top',offset:0,size:1},{id:'red',color:'red',side:'bottom',offset:1,size:1,frozen:1}]};

test('residual counts use all missing bodies and never negative ice',()=>{
 assert.equal(residualIceLevel(full,2).gates[1].frozen,1);
 assert.equal(residualIceLevel({...full,blocks:[full.blocks[1]]},2).gates[1].frozen,undefined);
 assert.equal(residualIceLevel({...full,blocks:[]},2).gates[1].frozen,undefined);
 assert.throws(()=>residualIceLevel(full,1));
});
test('one inverse ordinary insertion pays exactly one gate event',()=>{
 const before={...full,blocks:[full.blocks[1]]},a=auditIceInverse(runtime,before,{kind:'insertion',body:full.blocks[0],reversePath:[],exitSide:'top'},2);
 assert(a.valid,a.error);assert.equal(a.missingBefore,0);assert.equal(a.missingAfter,1);
});
test('frozen gate allows a real waiting parking whose unfrozen counterpart auto-exits',()=>{
 const op={kind:'parking',blockId:'r',reversePath:[[1,1]]};assert(auditIceInverse(runtime,full,op,2).valid);
 const plain=structuredClone(full);delete plain.gates[1].frozen;assert.equal(auditIceInverse(runtime,plain,op,2).valid,false);
});
test('inverse clearing through unpaid frozen gate is rejected',()=>{
 const before={...full,blocks:[full.blocks[0]]},red={...full.blocks[1],x:1,y:1};
 assert.equal(auditIceInverse(runtime,before,{kind:'insertion',body:red,reversePath:[],exitSide:'bottom'},2).valid,false);
});
test('whole-region stock changes actual shapes/colours and preserves a real seven-event suffix boundary',()=>{
 const b=JSON.parse(fs.readFileSync('deliverables/daily-formal-v3-20261008/design/nearband-multistep-01/candidate-0025.json'));
 const cut=readReferenceCut(runtime,b),plan=planReplacementStock(runtime,b.level,cut);
 assert(plan.ok);assert.equal(plan.newBodies.length,7);assert.equal(plan.provenance.replacementArea,21);
 assert.notEqual(plan.provenance.oldShapeInventorySha256,plan.provenance.newShapeInventorySha256);
 assert.notEqual(plan.provenance.oldColorInventorySha256,plan.provenance.newColorInventorySha256);
 const suffix=runtime.replayRevisedRoute(residualIceLevel(plan.initialPartial,plan.level.blocks.length),plan.suffix);assert(suffix.valid&&suffix.complete);
});
test('small raw cap stops before any inverse branch is generated',()=>{
 const plan={ok:true,level:full,initialPartial:{...full,blocks:[full.blocks[1]]},suffix:[]};
 const r=constructFrozenPrefix(runtime,plan,{maxStates:1});assert.equal(r.ok,false);assert.equal(r.reason,'construction-raw-limit');assert.equal(r.construction.rawFullBoardStates,1);assert.equal(r.construction.actualInverseAudits,0);
});

test('non-finite, zero and enlarged budget inputs fail before constructing',()=>{
 const plan={ok:true,level:full,initialPartial:{...full,blocks:[full.blocks[1]]},suffix:[]};
 for(const key of['maxStates','maxTransitions','maxMicroStates','maxMilliseconds'])for(const value of[NaN,Infinity,0,-1,1.5])assert.throws(()=>constructFrozenPrefix(runtime,plan,{[key]:value}));
 assert.throws(()=>constructFrozenPrefix(runtime,plan,{maxStates:10001}));
 assert.throws(()=>constructFrozenPrefix(runtime,plan,{maxMilliseconds:30001}));
});
test('counter mapping rejects shells, body ice and mechanisms with extra or hidden clear events',()=>{
 const mutations=[l=>l.blocks[0].layers=['blue','red'],l=>l.blocks[0].frozen=1,l=>l.blocks[0].keyId='k',l=>l.blocks[0].shutterId='cover',
  l=>l.generators=[{id:'g',queueBlockIds:['b']}],l=>l.flipDoors=[{id:'f',color:'blue',side:'top',offset:0,size:1}],l=>l.pulseRescue={enabled:true}];
 for(const edit of mutations){const l=structuredClone(full);edit(l);assert.throws(()=>assertFrozenPrefixDomain(l));assert.throws(()=>residualIceLevel(l,2));}
 assert.throws(()=>residualIceLevel(full,NaN));assert.throws(()=>residualIceLevel(full,Infinity));
});
