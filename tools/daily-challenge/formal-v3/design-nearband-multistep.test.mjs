import test from 'node:test';
import assert from 'node:assert/strict';
import {isFailedCompleteUnderband,rootAllowed,proximityLayersPass} from './design-nearband-multistep.mjs';
const fixture=()=>({accepted:false,attempt:{id:'failed-physical-input'},level:{},drags:[],proof:{cost:15},
 replay:{valid:true,complete:true,nonClearingDrags:15},independentReplay:{valid:true,complete:true,failed:false,nonClearingDrags:15}});
test('reference requires actual failed, both complete replays and matching underband cost',()=>{
 assert.ok(isFailedCompleteUnderband(fixture()));
 for(const modify of [b=>b.accepted=true,b=>b.attempt=null,b=>b.proof.cost=16,b=>b.proof.cost=11,b=>b.replay.complete=false,
  b=>b.independentReplay.failed=true,b=>b.independentReplay.nonClearingDrags=14,b=>delete b.drags]){
  const b=fixture();modify(b);assert.ok(!isFailedCompleteUnderband(b));}
});
test('any successful descendant or another batch reservation excludes the original family',()=>{
 const guards={acceptedRoots:new Set(['root-accepted']),reservedRoots:new Set(['root-reserved'])};
 assert.equal(rootAllowed('root-accepted',guards),false);assert.equal(rootAllowed('root-reserved',guards),false);
 assert.equal(rootAllowed('root-only-failures',guards),true);
});
test('root and failed descendant each independently meet proximity gates',()=>{
 const pass=()=>({source:{maximum:.2,limit:.55},selected:{pass:true},successful:{pass:true},visualRejected:{pass:true},old450:{pass:true}});
 const root=pass(),reference=pass();assert.equal(proximityLayersPass(root,reference),true);
 root.successful.pass=false;assert.equal(proximityLayersPass(root,reference),false);
 root.successful.pass=true;reference.visualRejected.pass=false;assert.equal(proximityLayersPass(root,reference),false);
});
