import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {loadBoundedRuntime} from './bounded-proof.mjs';
import {levelSha256} from '../formal-v2/contract.mjs';
import {inverseUnitPath,inverseParkingAudit,inverseInsertionAudit,auditPlainForwardDrag,auditCompleteReverseWitness,REVERSE_ROUTE_AUDIT_VERSION} from './reverse-route-audit.mjs';
const runtime=await loadBoundedRuntime(),evidence=[];
const fixture=()=>({id:997620,name:'independent new reverse operation qualification',width:3,height:3,timeSeconds:180,difficulty:'super',reward:0,
  mechanismRules:'revised-2026-09-27-v1.5',blocks:[{id:'r',color:'red',x:0,y:1,shape:[[0,0]]},{id:'b',color:'blue',x:2,y:2,shape:[[0,0]]}],
  gates:[{id:'red-out',color:'red',side:'top',offset:2,size:1},{id:'blue-out',color:'blue',side:'bottom',offset:2,size:1}]});

test('reverse paths include original anchor and retain every turn in one hold',()=>{
  assert.deepEqual(inverseUnitPath([0,1],[[0,2],[1,2]]),[[0,2],[0,1]]);
  assert.throws(()=>inverseUnitPath([0,1],[[2,1]]),/unit steps/);
  const level=fixture(),before=levelSha256(level),audit=inverseParkingAudit(runtime,level,'r',[[0,2],[1,2]]);
  assert(audit.valid,JSON.stringify(audit));assert.equal(audit.effectiveDrags,1);assert.equal(audit.nonClearingDrags,1);
  assert.equal(audit.clearEvents,0);assert.equal(audit.searchPerformed,false);assert.equal(audit.lowerBoundClaimed,false);
  assert.equal(levelSha256(level),before);evidence.push({name:'turned-held-inverse',audit});
});

test('inverse parking rejects an intermediate first-contact exit even if its endpoint is interior',()=>{
  const level=fixture();level.gates[0].offset=1;
  const audit=inverseParkingAudit(runtime,level,'r',[[1,1],[1,0],[2,0]]);
  assert.equal(audit.valid,false);assert.match(audit.error,/First-contact/);evidence.push({name:'early-contact-negative',audit});
});

test('a reverse endpoint already on its exit cannot start a forward parking hold',()=>{
  const level=fixture();level.gates[0].offset=1;
  const audit=inverseParkingAudit(runtime,level,'r',[[1,1],[1,0]]);
  assert.equal(audit.valid,false);assert.match(audit.error,/Pointer-down exit/);evidence.push({name:'pointerdown-negative',audit});
});

test('inverse multi-cell insertion needs one gate covering the whole cross-section',()=>{
  const base=fixture();base.blocks=[];base.gates=[{id:'red-out',color:'red',side:'left',offset:1,size:2}];
  const body={id:'sq',color:'red',x:0,y:1,shape:[[0,0],[1,0],[0,1],[1,1]]},before=levelSha256(base);
  const audit=inverseInsertionAudit(runtime,base,body,[[1,1]],'left');
  assert(audit.valid,JSON.stringify(audit));assert.equal(audit.nonClearingDrags,0);assert.equal(audit.clearEvents,1);assert.equal(audit.remainingBodies,0);
  assert.equal(levelSha256(base),before);assert.equal(body.x,0);
  const narrow=structuredClone(base);narrow.gates[0].size=1;
  const denied=inverseInsertionAudit(runtime,narrow,body,[[1,1]],'left');assert.equal(denied.valid,false);
  evidence.push({name:'multi-cell-aperture',audit,denied});
});

test('reverse insertion cannot replace a body, overlap cargo or silently omit another original body',()=>{
  const level=fixture();
  const duplicate=inverseInsertionAudit(runtime,level,level.blocks[0],[],'top');assert.equal(duplicate.valid,false);assert.match(duplicate.error,/reused/);
  const collision=inverseInsertionAudit(runtime,level,{id:'new',color:'red',x:2,y:0,shape:[[0,0]]},[[2,1],[2,2]],'top');assert.equal(collision.valid,false);
  const omitted=auditPlainForwardDrag(runtime,level,{blockId:'r',path:[[0,2]]},{expectedBodies:[{...level.blocks[0],y:2}]});
  assert.equal(omitted.valid,false);assert.match(omitted.error,/all original body/);
  evidence.push({name:'inventory-negative',duplicate,collision,omitted});
});

function filledFixture(){
  const level={...fixture(),width:2,height:2,blocks:['red','blue','green','yellow'].map((color,i)=>({id:color,color,x:i%2,y:Math.floor(i/2),shape:[[0,0]]})),
    gates:['red','blue','green','yellow'].map((color,i)=>({id:`g-${color}`,color,side:i<2?'top':'bottom',offset:i%2,size:1}))};
  const drags=level.blocks.map((b,i)=>({blockId:b.id,path:[],exitSide:i<2?'top':'bottom'}));return{level,drags};
}

test('the final inverse insertion fills the board and a full witness clears every original body',()=>{
  const {level,drags}=filledFixture(),before=levelSha256(level),audit=auditCompleteReverseWitness(runtime,level,drags);
  assert(audit.valid,JSON.stringify(audit));assert.equal(audit.U,0);assert.equal(audit.L,null);assert.equal(audit.canonical.clearEvents,4);assert.equal(audit.independent.remainingBodies,0);
  assert.equal(levelSha256(level),before);evidence.push({name:'filled-complete-positive',audit});
});

test('an otherwise valid complete route cannot excuse a hole after the last insertion',()=>{
  const {level,drags}=filledFixture();level.blocks.pop();drags.pop();
  const audit=auditCompleteReverseWitness(runtime,level,drags);assert.equal(audit.valid,false);assert.match(audit.error,/did not fill/);
  evidence.push({name:'last-insertion-hole-negative',audit});
});

test('full opening with one unplayed original body cannot be recorded as a complete route',()=>{
  const {level,drags}=filledFixture(),audit=auditCompleteReverseWitness(runtime,level,drags.slice(0,-1));
  assert.equal(audit.valid,false);assert.match(audit.error,/independent replays/);evidence.push({name:'incomplete-route-negative',audit});
});

test('inverse qualification rejects mechanisms whose reversibility is not established',()=>{
  for(const mutate of [l=>l.blocks[0].frozen=1,l=>l.blocks[0].layers=['red','blue'],l=>l.blocks[0].timedBombSeconds=10,l=>l.shutters=[{}],l=>l.generators=[{}]]){
    const level=fixture();mutate(level);assert.equal(inverseParkingAudit(runtime,level,'r',[[0,2]]).valid,false);
  }
});

test.after(async()=>{
  if(!process.env.REVERSE_QUALIFICATION_OUT)return;
  await fs.mkdir(process.env.REVERSE_QUALIFICATION_OUT,{recursive:false});
  await fs.writeFile(`${process.env.REVERSE_QUALIFICATION_OUT}/route-qualification.json`,JSON.stringify({schemaVersion:1,version:REVERSE_ROUTE_AUDIT_VERSION,
    tests:9,status:'NEW_TINY_PLAIN_REVERSE_GESTURES_QUALIFIED',toolchainSha256:runtime.toolchainSha256,evidence,
    actualCandidateSearches:0,proofFrozenUnchanged:true,reverseConstructionIsNotLowerProof:true,naturalTimeValidated:false,formalReady:false},null,2)+'\n',{flag:'wx'});
});
