import assert from 'node:assert/strict';
import {levelSha256,routeSha256,independentReplay} from '../formal-v2/contract.mjs';
import {applyNativeDrag} from '../formal-v2/mechanism-decorate.mjs';

// A synthetic qualification fixture only. It is not a real source, daily
// candidate, difficulty certificate or construction-ledger input.
export function icedFlipPrivateFixture(){
 const blocks=[
  ['free-r','red',0,0,0],['free-b','blue',1,0,0],['free-g','green',2,0,0],['free-y','yellow',3,0,0],
  ['ice-g4','green',4,0,4],['ice-p2','purple',0,1,2],['ice-o2','orange',1,1,2],
  ['ice-r3','red',2,1,3],['ice-b3','blue',3,1,3],['ice-y4','yellow',4,1,4],
 ].map(([id,color,x,y,frozen])=>({id,color,x,y,shape:[[0,0]],...(frozen?{frozen}:{})}));
 const gates=[
  {id:'flip-r',color:'red',side:'top',offset:0,size:1},
  {id:'flip-b',color:'blue',side:'top',offset:1,size:1},
  {id:'flip-g',color:'green',side:'top',offset:2,size:1},
  {id:'flip-y',color:'yellow',side:'top',offset:3,size:1},
  {id:'ordinary-p',color:'purple',side:'bottom',offset:0,size:1},
  {id:'ordinary-o',color:'orange',side:'bottom',offset:1,size:1},
 ];
 const level={id:999987,name:'Private six-ice four-portal fixture',difficulty:'super',reward:0,timeSeconds:120,parMoves:10,
  mechanismRules:'revised-2026-09-27-v1.5',width:5,height:2,blocks,gates};
 const drags=[
  {blockId:'free-r',path:[],exitSide:'top'},
  {blockId:'free-b',path:[],exitSide:'top'},
  {blockId:'free-g',path:[],exitSide:'top'},
  {blockId:'free-y',path:[],exitSide:'top'},
  {blockId:'ice-p2',path:[],exitSide:'bottom'},
  {blockId:'ice-o2',path:[],exitSide:'bottom'},
  {blockId:'ice-r3',path:[[1,1],[0,1],[0,0]],exitSide:'top'},
  {blockId:'ice-b3',path:[[2,1],[1,1],[1,0]],exitSide:'top'},
  {blockId:'ice-g4',path:[[3,0],[2,0]],exitSide:'top'},
  {blockId:'ice-y4',path:[[3,1],[3,0]],exitSide:'top'},
 ];
 const configuration={doors:[{id:'flip-r',initiallyOpen:true},{id:'flip-b',initiallyOpen:false},
  {id:'flip-g',initiallyOpen:true},{id:'flip-y',initiallyOpen:false}]};
 const adaptedLevel={...structuredClone(level),gates:structuredClone(gates.slice(4)),
  flipDoors:configuration.doors.map(d=>({...structuredClone(gates.find(g=>g.id===d.id)),initiallyOpen:d.initiallyOpen}))};
 return{qualificationOnly:true,fixtureOnly:true,level,drags,base:{level,drags},adaptedLevel,configuration,
  expected:{U:0,effectiveDrags:10,clearEvents:10,initialIceInstances:6,initialCounts:[2,2,3,3,4,4],
   releasedAtClearCounts:[2,3,4],flipGateIds:configuration.doors.map(d=>d.id),flipExitDrags:{'flip-r':[1,7],'flip-b':[2,8],'flip-g':[3,9],'flip-y':[4,10]}},
  formalReady:false,mathematicalAcceptance:false};
}

/** Runs only the fixed gesture sequence on actual and independent models;
 * there is no path search, board search, ledger access or file write. */
export function auditIcedFlipPrivateFixture(runtime,fixture=icedFlipPrivateFixture()){
 const before=levelSha256(fixture),rows=[];
 for(const [kind,level]of [['base',fixture.level],['four-flip',fixture.adaptedLevel]]){
  runtime.validateLevel(level);const model=new runtime.PuzzleModel(level);model.startCountdown();
  const exits=[],releases=[],trace=[];let fullWorldReservations=1;
  for(const [i,drag]of fixture.drags.entries()){
   const initial=model.snapshot(),original=model.tryExit;
   model.tryExit=function(id,side){const state=this.snapshot(),result=original.call(this,id,side);
    if(result.ok){const flip=state.flipDoors.find(g=>g.id===result.gateId);exits.push({drag:i+1,id,gateId:result.gateId,side,flip:!!flip,openBefore:flip?.open??null,clearedBefore:state.cleared});}return result;};
   try{applyNativeDrag(model,drag);}finally{model.tryExit=original;}
   const final=model.snapshot();fullWorldReservations+=drag.path.length+2+2*Number(!!drag.exitSide);
   for(const b of initial.blocks)if(b.frozen>0&&final.blocks.some(q=>q.id===b.id&&q.frozen===0))releases.push({id:b.id,drag:i+1,cleared:final.cleared});
   trace.push({drag:i+1,cleared:final.cleared,stateSha256:levelSha256(final)});
  }
  const final=model.snapshot(),canonical=runtime.replayRevisedRoute(level,fixture.drags),independent=independentReplay(runtime,level,fixture.drags);
  assert(final.complete&&!final.failed&&final.blocks.length===0&&final.queuedBlocks.length===0);
  for(const r of [canonical,independent]){assert(r.valid&&r.complete&&!r.failed);assert.equal(r.nonClearingDrags,0);assert.equal(r.effectiveDrags,10);assert.equal(r.clearEvents,10);}
  assert.equal(independent.remainingBodies,0);assert.equal(independent.remainingQueued,0);
  assert.equal(releases.length,6);assert.deepEqual([...new Set(releases.map(r=>r.cleared))].sort(),[2,3,4]);
  if(kind==='four-flip')for(const id of fixture.expected.flipGateIds){const used=exits.filter(e=>e.gateId===id);assert.deepEqual(used.map(e=>e.drag),fixture.expected.flipExitDrags[id]);assert(used.every(e=>e.flip&&e.openBefore));}
  rows.push({kind,levelSha256:levelSha256(level),routeSha256:routeSha256(fixture.drags),exits,releases,trace,canonical,independent,
   replayAccounting:{fixedTraceWorldReservationUpperBound:fullWorldReservations,freshReplayCount:3,allThreeReplayWorldReservationUpperBound:3*fullWorldReservations},searchPerformed:false});
 }
 assert.equal(levelSha256(fixture),before,'Fixture inputs remain unchanged');
 return{passed:true,qualificationOnly:true,fixtureOnly:true,rows,newSearches:0,newLedgerClaims:0,formalReady:false,mathematicalAcceptance:false};
}
