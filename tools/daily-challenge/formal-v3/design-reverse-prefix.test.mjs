import test from 'node:test';
import assert from 'node:assert/strict';
import {loadBoundedRuntime} from './bounded-proof.mjs';
import {digest} from './diversity-layout-factory.mjs';
import {reconstructReverseBlueprint} from './design-reverse-blueprint.mjs';
import {inverseInsertionAudit,inverseParkingAudit,auditCompleteReverseWitness} from './reverse-route-audit.mjs';
const runtime=await loadBoundedRuntime();
function fixture(){return{level:{id:998003,name:'cut after second clear with an intervening hold',width:3,height:2,timeSeconds:180,difficulty:'super',reward:0,
 mechanismRules:'revised-2026-09-27-v1.5',blocks:[{id:'r',color:'red',x:0,y:0,shape:[[0,0],[1,0]]},{id:'b',color:'blue',x:2,y:0,shape:[[0,0],[0,1]]},
 {id:'g',color:'green',x:0,y:1,shape:[[0,0],[1,0]]}],gates:[{id:'gr',color:'red',side:'left',offset:0,size:1},
 {id:'gb',color:'blue',side:'top',offset:2,size:1},{id:'gg',color:'green',side:'right',offset:0,size:1}]},
 drags:[{blockId:'r',path:[],exitSide:'left'},{blockId:'g',path:[[0,0]]},{blockId:'b',path:[],exitSide:'top'},{blockId:'g',path:[[1,0]],exitSide:'right'}]};}
const bodyKey=l=>digest(l.blocks.map(b=>({id:b.id,x:b.x,y:b.y,shape:b.shape,color:b.color})).sort((a,b)=>a.id.localeCompare(b.id)));
test('second-clear cut with intervening parking withholds exactly removed bodies and the true four-cell vacancy',()=>{
 const p=fixture(),before=digest(p),b=reconstructReverseBlueprint(runtime,p,{prefixClearCount:2,maximumPrefixArea:6});
 assert.equal(b.initialPrefixClearCount,2);assert.equal(b.prefixDragCount,3);assert.equal(b.withheldOriginalParkingCount,1);
 assert.equal(b.initialVacancyArea,4);assert.deepEqual(b.finalBodies.map(x=>x.id),['r','b']);
 assert.equal(b.level.blocks.length,1);assert.equal(b.level.blocks[0].id,'g');assert.equal(b.level.blocks[0].y,0);
 assert.deepEqual(b.temporaryInitialVacancy.sort(),[[0,1],[1,1],[2,0],[2,1]].sort());
 let current=b.level;const ops=[...b.reverseOperations];
 for(const op of b.withheldReferenceInverseOperations){const audit=op.kind==='insertion'?inverseInsertionAudit(runtime,current,op.body,op.reversePath,op.exitSide):inverseParkingAudit(runtime,current,op.blockId,op.reversePath);
  assert(audit.valid,audit.error);current=audit.reverseAfterLevel;ops.push({forwardDrag:audit.forwardDrag});}
 assert.equal(bodyKey(current),bodyKey(p.level));const replay=auditCompleteReverseWitness(runtime,current,ops.map(x=>x.forwardDrag).reverse());
 assert(replay.valid,replay.error);assert.equal(replay.U,1);assert.equal(replay.canonical.clearEvents,3);assert.equal(digest(p),before);
});
test('new inserted portal world is charged before any held coordinate of that new body',()=>{
 const p=fixture(),raw=new Set();let micro=0;
 assert.throws(()=>reconstructReverseBlueprint(runtime,p,{prefixClearCount:2,maximumPrefixArea:6,micro:()=>micro++,charge:l=>{
  const k=bodyKey(l);if(!raw.has(k)&&raw.size>=1)throw Error('raw-stop-before-second-world');raw.add(k);
 }}),/raw-stop/);assert.equal(raw.size,1);assert.equal(micro,0);
});
test('a prefix cannot duplicate its parked body or accept a partly restored inventory',()=>{
 const p=fixture(),b=reconstructReverseBlueprint(runtime,p,{prefixClearCount:2,maximumPrefixArea:6});
 const op=b.withheldReferenceInverseOperations.find(x=>x.kind==='insertion'),one=inverseInsertionAudit(runtime,b.level,op.body,op.reversePath,op.exitSide);
 assert(one.valid);assert.equal(auditCompleteReverseWitness(runtime,one.reverseAfterLevel,[one.forwardDrag,...b.reverseOperations.map(x=>x.forwardDrag).reverse()]).valid,false);
 assert.throws(()=>reconstructReverseBlueprint(runtime,p,{prefixClearCount:2,maximumPrefixArea:3}),/count\/area/);
 for(const prefixClearCount of [0,4,NaN,Infinity])assert.throws(()=>reconstructReverseBlueprint(runtime,p,{prefixClearCount}));
 for(const maximumPrefixArea of [0,9,NaN,Infinity])assert.throws(()=>reconstructReverseBlueprint(runtime,p,{maximumPrefixArea}));
});
