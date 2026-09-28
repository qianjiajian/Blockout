import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {loadApi} from '../../../tools/remake21to30-v120.mjs';
import {compileLevel,forEachGesture,stateFromSnapshot,stateKey} from '../../../deliverables/remake31-200-v145-20260924/batches/lv061-070/author61-64/axis-mask-floor.mjs';
import {checkSymmetryFloor,equivalentBlockGroups} from '../../../deliverables/remake31-200-v145-20260924/batches/lv061-070/author61-64/axis-symmetry-floor.mjs';
const {api}=await loadApi();
const candidate=JSON.parse(fs.readFileSync('deliverables/remake31-200-v145-20260924/batches/lv061-070/author61-64/draft61-146061-397-1790248178917.json'));
const fixture=(axis,side)=>({id:61,name:'axis-domain',difficulty:'easy',reward:0,timeSeconds:100,mechanismRules:'revised-2026-09-23-v1.4',width:4,height:4,gates:[{id:'r',color:'red',side,offset:0,size:4}],blocks:[{id:'b',color:'red',x:1,y:1,shape:[[0,0],[1,0]],movementAxis:axis}]});
test('horizontal and vertical poses, steps and gate direction match actual model',()=>{
 for(const axis of ['horizontal','vertical'])for(const side of ['top','right','bottom','left']){
  const l=fixture(axis,side),c=compileLevel(l),b=c.blocks[0];
  for(let p=0;p<b.poses.length;p++)if(b.poses[p]){
   const q=structuredClone(l);q.blocks[0].x=p%c.W;q.blocks[0].y=Math.floor(p/c.W);const m=new api.PuzzleModel(q);
   for(const[dx,dy]of[[0,-1],[1,0],[0,1],[-1,0]]){const x=q.blocks[0].x+dx,y=q.blocks[0].y+dy,clone=m.clone();clone.beginAction();assert.equal(clone.moveBlockStep('b',x,y),b.poses[p].neighbors.includes(y*c.W+x)&&x>=0&&x<c.W);}
   assert.equal(m.clone().tryExit('b',side).ok,Boolean(b.poses[p].exits[0]));
  }
 }
});
test('axis belongs to identity quotient signature',()=>{
 const l=fixture('horizontal','right');l.blocks.push({...l.blocks[0],id:'c',y:2,movementAxis:'vertical'});assert.deepEqual(equivalentBlockGroups(compileLevel(l)),[]);
});
test('unsupported keys, lifts, generators, bombs remain fail-closed',()=>{
 for(const mutate of[l=>l.blocks[0].keyId='k',l=>l.blocks[0].lockedBy='k',l=>l.blocks[0].timedBombSeconds=10,l=>l.generators=[{}],l=>l.shutters=[{id:'lift',x:0,y:0,width:1,height:1,count:1,skin:'lift'}]]){const l=fixture('horizontal','right');mutate(l);assert.equal(checkSymmetryFloor(l,{floor:1,maxStates:20,maxMilliseconds:100}).status,'unsupported');}
});
test('every optional action along fresh Lv61 route equals independent full model',()=>{
 const {level,drags}=candidate,c=compileLevel(level),m=new api.PuzzleModel(level);m.startCountdown();let checked=0;
 for(const d of drags){const state=stateFromSnapshot(c,m.snapshot());
  forEachGesture(c,state,(i,value,cost,get)=>{const a=get(),n=m.clone(),before=n.snapshot();n.beginAction();for(const p of a.path)assert(n.moveBlockStep(a.blockId,...p));if(a.exitSide)assert(n.tryExit(a.blockId,a.exitSide).ok);assert(n.commitAction());const next=state.slice();next[i]=value;assert.equal(stateKey(next),stateKey(stateFromSnapshot(c,n.snapshot())));assert.equal(n.snapshot().cleared===before.cleared?1:0,cost);checked++;});
  m.beginAction();for(const p of d.path)assert(m.moveBlockStep(d.blockId,...p));if(d.exitSide)assert(m.tryExit(d.blockId,d.exitSide).ok);assert(m.commitAction());
 }
 assert(m.snapshot().complete);assert(checked>100);
});
test('fresh candidate proves five with full four axis restrictions and timeout is not PASS',()=>{
 assert.equal(candidate.level.blocks.filter(b=>b.movementAxis).length,4);const r=checkSymmetryFloor(candidate.level,{floor:5,maxStates:300000,maxMilliseconds:20000});assert(r.thresholdProven,JSON.stringify(r));const limited=checkSymmetryFloor(candidate.level,{floor:50,maxStates:1,maxMilliseconds:1000});assert(!limited.thresholdProven);
});
