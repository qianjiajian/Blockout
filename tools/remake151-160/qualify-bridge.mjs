import fs from 'node:fs';
import assert from 'node:assert/strict';
import {api,save,ruleGate,digest,auditHiddenV15} from './common.mjs';
import {noFlipSpatialBridge,openDoorFloorProjection,binding} from './spatial-bridge.mjs';
Error.stackTraceLimit=0;process.on('uncaughtException',e=>{console.error(e.message);process.exitCode=1;});
ruleGate();const V15='revised-2026-09-27-v1.5',V14='revised-2026-09-23-v1.4';
const base={id:160,name:'bridge qualification',difficulty:'normal',mechanismRules:V15,width:3,height:3,timeSeconds:120,reward:0};
const S=[[0,0]],H=[[0,0],[1,0]],V=[[0,0],[0,1]];
const fixtures=[
 {...base,gates:[{id:'gate-r',color:'red',side:'bottom',offset:0,size:3},{id:'gate-b',color:'blue',side:'right',offset:0,size:3,frozen:1}],blocks:[{id:'a',x:0,y:0,shape:V,color:'red',movementAxis:'vertical'},{id:'b',x:1,y:0,shape:S,color:'blue'},{id:'c',x:2,y:2,shape:S,color:'blue',frozen:1,shutterId:'cover'}],shutters:[{id:'cover',x:2,y:2,width:1,height:1,count:1}]},
 {...base,gates:[{id:'gate-r',color:'red',side:'left',offset:0,size:3},{id:'gate-b',color:'blue',side:'right',offset:0,size:3,frozen:1}],blocks:[{id:'a',x:0,y:0,shape:H,color:'blue',layers:['blue','red'],movementAxis:'horizontal'},{id:'b',x:1,y:1,shape:S,color:'red'},{id:'c',x:1,y:2,shape:H,color:'blue',frozen:1}]},
 {...base,gates:[{id:'gate-r',color:'red',side:'left',offset:0,size:3},{id:'gate-b',color:'blue',side:'right',offset:0,size:3}],blocks:[{id:'a',x:0,y:0,shape:S,color:'red',keyId:'k'},{id:'b',x:1,y:1,shape:S,color:'blue',lockedBy:'k',lockCount:1},{id:'c',x:0,y:0,shape:S,color:'blue',frozen:1,shutterId:'lift'}],shutters:[{id:'lift',x:0,y:0,width:1,height:1,count:1,skin:'lift'}]},
 {...base,gates:[{id:'gate-r',color:'red',side:'left',offset:0,size:3},{id:'gate-b',color:'blue',side:'right',offset:0,size:3}],blocks:[{id:'a',x:0,y:0,shape:S,color:'red'},{id:'b',x:1,y:0,shape:S,color:'blue'},{id:'q',x:1,y:0,shape:S,color:'red'}],generators:[{id:'gen',side:'top',offset:1,spawn:[1,0],queueBlockIds:['q'],trigger:'move'}]},
];
const clean=s=>{const {mechanismRules,moves,...state}=s;return state;};
const state=m=>JSON.stringify(clean(m.snapshot()));const dirs=[[0,-1],[1,0],[0,1],[-1,0]],sides=['top','right','bottom','left'];
const reports=[];
for(const [fixture,l]of fixtures.entries()){
 const old=noFlipSpatialBridge(l,api),a=new api.PuzzleModel(l),b=new api.PuzzleModel(old);a.startCountdown();b.startCountdown();const nodes=[[a,b]],seen=new Set([state(a)]);let moves=0,exits=0;
 for(let i=0;i<nodes.length;i++){
  assert(nodes.length<15000,'Small domain exhaust cap');const [x,y]=nodes[i];assert.deepEqual(clean(x.snapshot()),clean(y.snapshot()));
  for(const block of x.snapshot().blocks){
   for(const d of dirs){const xx=x.clone(),yy=y.clone();xx.beginAction();yy.beginAction();const p=[block.x+d[0],block.y+d[1]],xr=xx.moveBlockStep(block.id,...p),yr=yy.moveBlockStep(block.id,...p);assert.equal(xr,yr);if(!xr)continue;assert.equal(xx.commitAction(),yy.commitAction());assert.deepEqual(clean(xx.snapshot()),clean(yy.snapshot()));moves++;const k=state(xx);if(!seen.has(k)){seen.add(k);nodes.push([xx,yy]);}}
   for(const side of sides){const xx=x.clone(),yy=y.clone();xx.beginAction();yy.beginAction();const xr=xx.tryExit(block.id,side),yr=yy.tryExit(block.id,side);assert.deepEqual(xr,yr);if(!xr.ok)continue;assert.equal(xx.commitAction(),yy.commitAction());assert.deepEqual(clean(xx.snapshot()),clean(yy.snapshot()));exits++;const k=state(xx);if(!seen.has(k)){seen.add(k);nodes.push([xx,yy]);}}
  }
 }
 reports.push({fixture,states:seen.size,successfulUnitMoves:moves,successfulExits:exits,allTransitionResultsAndStatesEqual:true});
}
const flip={...base,gates:[{id:'gate-r',color:'red',side:'left',offset:0,size:3}],flipDoors:[{id:'gate-b',color:'blue',side:'right',offset:0,size:3,frozen:1,initiallyOpen:false}],blocks:[{id:'a',x:0,y:0,shape:S,color:'red'},{id:'b',x:0,y:1,shape:S,color:'red'},{id:'c',x:2,y:0,shape:S,color:'blue'}]};
const projected=openDoorFloorProjection(flip,api);assert.equal(projected.level.gates.find(g=>g.id==='gate-b').frozen,1);assert.equal(projected.level.blocks.length,3);
const model=new api.PuzzleModel(flip,{deferExitCompletion:true}),relaxed=new api.PuzzleModel(projected.level);model.startCountdown();relaxed.startCountdown();
for(const id of ['a','b']){model.beginAction();relaxed.beginAction();assert(model.tryExit(id,'left').ok);assert(relaxed.tryExit(id,'left').ok);assert(model.commitAction());assert(relaxed.commitAction());}
const pending=model.snapshot().pendingExitAnimations;assert.equal(pending.length,2);
// Thawing event does not toggle; next event toggles even with delayed callbacks.
model.completeExitAnimation(pending[0]);assert.equal(model.snapshot().flipDoors[0].open,false);
model.completeExitAnimation(pending[1]);assert.equal(model.snapshot().flipDoors[0].open,true);
assert.equal(relaxed.snapshot().gates.find(g=>g.id==='gate-b').frozen,0);
model.beginAction();relaxed.beginAction();assert(model.tryExit('c','right').ok);assert(relaxed.tryExit('c','right').ok);
assert.throws(()=>noFlipSpatialBridge(flip,api));
const fill=fixtures[0],ok=auditHiddenV15(fill);assert(ok.passed);const gap=structuredClone(fill);gap.shutters[0].width=2;gap.shutters[0].x=1;assert(!auditHiddenV15(gap).passed);
const file=save('bridge-qualification',{passed:true,ruleVersion:'1.102.0',actualActive:ruleGate().activeVersion,reports,delayedFrozenFlipProjectionPreservesThawAndValidExit:true,hiddenStaticFullAndGapNegative:true,profileChangeOnlyAfterNoFlipAssertion:true,bindings:{...binding(),'tools/remake151-160/qualify-bridge.mjs':digest(fs.readFileSync(import.meta.filename)),'tools/revised-hidden-coverage.mjs':digest(fs.readFileSync('tools/revised-hidden-coverage.mjs'))},mathematicalScope:'All unit moves/exits on enumerated fixtures compare v1.5 vs v1.4 with no flip doors. General equivalence also follows from usesFrozenFlipDoorEligibility only changing empty flip collections. Lower projection retains freeze and all inventory and uses optional exits; a shortcut in relaxed graph is not automatically a real source counterexample.'});
console.log(JSON.stringify({file,passed:true,reports}));
