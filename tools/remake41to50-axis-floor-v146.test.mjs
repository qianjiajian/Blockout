import test from 'node:test';
import assert from 'node:assert/strict';
import {loadApi} from './remake41to50-v146.mjs';
import {projectAxisFloor,checkAxisFloor,verifyAxisRouteProjection} from './remake41to50-axis-floor-v146.mjs';
const {api}=await loadApi();
const fixture=()=>({id:50,name:'axis projection fixture',difficulty:'easy',timeSeconds:100,reward:20,mechanismRules:'revised-2026-09-23-v1.4',width:3,height:3,
 blocks:[{id:'r',color:'red',x:0,y:0,shape:[[0,0],[1,0]],movementAxis:'horizontal'},{id:'b',color:'blue',x:2,y:1,shape:[[0,0],[0,1]],movementAxis:'vertical'},{id:'g',color:'green',x:0,y:2,shape:[[0,0]]}],
 gates:[{id:'r-gate',color:'red',side:'right',offset:0,size:1},{id:'b-gate',color:'blue',side:'top',offset:2,size:1},{id:'g-gate',color:'green',side:'left',offset:2,size:1}]});
const canonical=model=>{const s=model.snapshot();delete s.moves;for(const b of [...s.blocks,...s.queuedBlocks])delete b.movementAxis;return JSON.stringify(s);};
test('every reachable unit move and exit retains state and cost after axis deletion',t=>{
 const l=fixture(),projection=projectAxisFloor(l,api),s=new api.PuzzleModel(l),p=new api.PuzzleModel(projection.level);s.startCountdown();p.startCountdown();
 const pending=[[s,p]],seen=new Set([canonical(s)]);let edges=0;
 for(let at=0;at<pending.length;at++){
  assert(pending.length<4000);const [before,abstract]=pending[at];assert.equal(canonical(before),canonical(abstract));
  for(const b of before.snapshot().blocks)for(const action of [...[[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy])=>m=>m.moveBlockStep(b.id,b.x+dx,b.y+dy)),...['top','bottom','left','right'].map(side=>m=>m.tryExit(b.id,side).ok)]){
   const next=before.clone();next.beginAction();if(!action(next))continue;assert(next.commitAction());
   const mapped=abstract.clone();mapped.beginAction();assert(action(mapped),'Every legal source transition is admitted');assert(mapped.commitAction());
   assert.equal(canonical(next),canonical(mapped));edges++;
   const key=canonical(next);if(!seen.has(key)){seen.add(key);pending.push([next,mapped]);}
  }
 }
 assert(edges>50);t.diagnostic(`${seen.size} source states and ${edges} legal move/exit transitions`);
});
test('projection changes only direction fields and leaves source immutable',()=>{
 const l=fixture(),original=structuredClone(l),p=projectAxisFloor(l,api);assert.deepEqual(l,original);
 for(const b of original.blocks)delete b.movementAxis;assert.deepEqual(p.level,original);
 assert.equal(p.solvabilityValidated,false);assert.equal(p.pointerValidated,false);
});
test('full witness maps with equal clears and non-clearing cost; partial witness rejected',()=>{
 const l=fixture(),drags=[{blockId:'b',path:[[2,0]],exitSide:'top'},{blockId:'r',path:[[1,0]],exitSide:'right'},{blockId:'g',path:[],exitSide:'left'}];
 assert(verifyAxisRouteProjection(l,drags,api).valid);
 assert.throws(()=>verifyAxisRouteProjection(l,drags.slice(0,-1),api));
 assert.equal(checkAxisFloor(l,api,{floor:1,maxStates:1000,maxMilliseconds:3000}).thresholdProven,false,'Zero-reposition level cannot pass 1');
});
test('later mechanics, wrong scope, and absent axes fail closed',()=>{
 for(const mutate of [l=>l.id=49,l=>l.blocks.forEach(b=>delete b.movementAxis),l=>l.blocks[0].keyId='key',l=>l.blocks[0].timedBombSeconds=10]){
  const l=fixture();mutate(l);assert.equal(checkAxisFloor(l,api,{floor:5}).thresholdProven,false);
 }
});
