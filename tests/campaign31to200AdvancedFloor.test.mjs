import test from 'node:test';
import assert from 'node:assert/strict';
import {campaignCadence,sourceGaps,sourceMechanisms,UNLOCKS} from '../tools/campaign31-200-plan-v145.mjs';
import {loadAdvancedFloorApi,projectAdvancedFloor,checkAdvancedFloor,ADVANCED_ABSTRACTION} from '../tools/campaign31-200-advanced-floor-v145.mjs';
const api=await loadAdvancedFloorApi();
const fixture=(extra={})=>({id:150,name:'isolated projection fixture',mechanismRules:'revised-2026-09-23-v1.4',difficulty:'easy',width:3,height:3,timeSeconds:60,reward:0,
 gates:[{id:'red-gate',color:'red',side:'left',offset:0,size:1}],blocks:[{id:'red',color:'red',x:1,y:1,shape:[[0,0]]}],...extra});
const options={floor:1,maxStates:5000,maxDragStates:1000,maxTransitions:100000,maxMilliseconds:3000,api};

test('cadence preserves the committed first eleven slots and consumes baseline monotonically',()=>{
 const p=campaignCadence();assert.equal(p.rows.length,170);
 assert.deepEqual(p.rows.slice(0,11).map(r=>r.difficulty),['easy','normal','normal','hard','easy','easy','normal','hard','easy','normal','super']);
 const consumed=p.rows.filter(r=>r.consumesBaseline);assert.deepEqual(consumed.map(r=>r.baselineSlot),Array.from({length:consumed.length},(_,i)=>31+i));
 assert.equal(p.nextUnconsumedBaselineSlot,31+consumed.length);assert.equal(p.rows.at(-1).id,200);
});
test('every new mechanism inserts teaching and has low-pressure practice without deleting the pending challenge',()=>{
 const p=campaignCadence();for(const id of Object.keys(UNLOCKS).map(Number)){
  const r=p.rows.find(r=>r.id===id);assert.equal(r.role,'first-teaching');assert.equal(r.difficulty,'easy');assert.equal(r.consumesBaseline,false);
  if(id<200)assert(['easy','normal'].includes(p.rows.find(r=>r.id===id+1).difficulty));
 }
 assert.deepEqual(p.pendingLowPressurePractice,{id:200,mechanism:'grid'});
});
test('source unknowns stay unknown and source key inventory does not move to the teaching level',()=>{
 assert(sourceGaps({composition:{opening_piece_count:null,opening_shape_histogram:null,opening_color_count:null}}).length===3);
 assert.equal(sourceMechanisms({mechanisms:{keys_locks:{key_count:2,lock_count:2}}}).keys,true);
 assert.equal(sourceMechanisms({mechanisms:{}}).keys,false);
});
test('projection preserves bodies, shell layers, ice and metadata while erasing only the deadline',()=>{
 const level=fixture({blocks:[{id:'red',color:'red',x:1,y:1,shape:[[0,0]],layers:['red','blue'],frozen:3,timedBombSeconds:8}],gates:[{id:'red-gate',color:'red',side:'left',offset:0,size:1},{id:'blue-gate',color:'blue',side:'right',offset:0,size:1}]});
 const before=JSON.stringify(level),p=projectAdvancedFloor(level,api);
 assert.equal(JSON.stringify(level),before);assert.equal(p.retainedBodyCount,1);assert.deepEqual(p.removedBombs,[{id:'red',seconds:8}]);
 const expected=structuredClone(level.blocks);delete expected[0].timedBombSeconds;assert.deepEqual(p.level.blocks,expected);
 assert.equal(p.level.timeSeconds,level.timeSeconds);assert.equal(p.timeValidated,false);
});
test('both delayed door states map to identical always-open exits with frozen values retained',()=>{
 const first=fixture({gates:[],flipDoors:[{id:'flip',color:'red',side:'left',offset:0,size:1,frozen:2,initiallyOpen:false}]});
 const second=structuredClone(first);second.flipDoors[0].initiallyOpen=true;
 const a=projectAdvancedFloor(first,api),b=projectAdvancedFloor(second,api);
 assert.deepEqual(a.level,b.level);assert.equal(a.level.gates[0].frozen,2);assert.deepEqual(a.level.flipDoors,[]);
 assert.notEqual(a.sourceLevelSha256,b.sourceLevelSha256);assert.equal(a.projectedLevelSha256,b.projectedLevelSha256);
});
test('a GUI exit permitted before an earlier animation completes remains permitted in the projection',()=>{
 const level=fixture({blocks:[{id:'r1',color:'red',x:0,y:0,shape:[[0,0]]},{id:'r2',color:'red',x:0,y:1,shape:[[0,0]]}],gates:[],flipDoors:[{id:'flip',color:'red',side:'left',offset:0,size:2,initiallyOpen:true}]});
 const real=new api.PuzzleModel(level,{deferExitCompletion:true}),relaxed=new api.PuzzleModel(projectAdvancedFloor(level,api).level);
 for(const id of ['r1','r2'])for(const model of [real,relaxed]){model.beginAction();assert(model.tryExit(id,'left').ok);assert(model.commitAction());}
 assert.equal(real.snapshot().pendingExitAnimations.length,2);assert(real.snapshot().complete&&relaxed.snapshot().complete);
 // Completing out of order is allowed. These source-only events are stutters.
 for(const id of [...real.snapshot().pendingExitAnimations].reverse())assert(real.completeExitAnimation(id));
 assert.equal(relaxed.snapshot().cleared,real.snapshot().cleared);
});
test('fixed generator inventory/spawn and zero-cost deterministic dispatch are preserved',async()=>{
 const level=fixture({gates:[{id:'r',color:'red',side:'right',offset:1,size:1},{id:'b',color:'blue',side:'left',offset:1,size:1},{id:'g',color:'green',side:'bottom',offset:1,size:1}],
  blocks:[{id:'red',color:'red',x:1,y:0,shape:[[0,0]]},{id:'blue',color:'blue',x:1,y:0,shape:[[0,0]]},{id:'green',color:'green',x:1,y:0,shape:[[0,0]]}],
  generators:[{id:'machine',side:'top',offset:1,spawn:[1,0],queueBlockIds:['blue','green']}]});
 const p=projectAdvancedFloor(level,api);assert.deepEqual(p.level.generators,level.generators);assert.deepEqual(p.retainedQueueIds,['blue','green']);
 const result=await checkAdvancedFloor(level,options);assert.equal(result.status,'relaxed-shortcut');assert.equal(result.relaxedNonClearingDrags,0);assert.equal(result.solvabilityValidated,false);
});
test('lift occupancy, keys/axes/star/grid payload is not deleted by the projection',()=>{
 const level=fixture({width:5,height:5,blocks:[{id:'red',color:'red',x:0,y:0,shape:[[0,0]],keyId:'k',movementAxis:'horizontal',star:true},{id:'hidden',color:'blue',x:1,y:0,shape:[[0,0]],shutterId:'lift',lockedBy:'k',lockCount:1}],
  gates:[{id:'r',color:'red',side:'left',offset:0,size:1,star:true},{id:'b',color:'blue',side:'top',offset:1,size:1}],
  shutters:[{id:'lift',x:0,y:0,width:2,height:1,count:1,skin:'lift'}],coloredGrids:[{id:'red-grid',color:'red',cells:[[0,0]]}]});
 const p=projectAdvancedFloor(level,api);for(const key of ['blocks','shutters','coloredGrids','gates'])assert.deepEqual(p.level[key],level[key]);
});
test('one parking is proved only as a lower bound, and two exposes the relaxed one-parking route',async()=>{
 const level=fixture({height:2,blocks:[{id:'red',color:'red',x:1,y:0,shape:[[0,0],[1,0]],timedBombSeconds:1},{id:'blue',color:'blue',x:0,y:0,shape:[[0,0]]}],gates:[{id:'r',color:'red',side:'left',offset:0,size:1},{id:'b',color:'blue',side:'top',offset:1,size:1}]});
 const a=await checkAdvancedFloor(level,options),b=await checkAdvancedFloor(level,{...options,floor:2});
 assert.equal(a.status,'threshold-proven');assert.equal(a.abstraction,ADVANCED_ABSTRACTION);assert.equal(a.solvabilityValidated,false);assert.equal(a.timeValidated,false);
 assert.equal(b.status,'relaxed-shortcut');assert.equal(b.relaxedNonClearingDrags,1);
});
test('incomplete exploration is unknown and cannot certify a floor',async()=>{
 const r=await checkAdvancedFloor(fixture(),{...options,maxTransitions:1});assert.equal(r.status,'unknown');assert.equal(r.thresholdProven,false);
});
test('legacy timed/staging/rotation and unqualified profile remain refused',async()=>{
 const variants=[fixture({mechanismRules:'revised-2026-09-21-v1.2'}),fixture({blocks:[{id:'red',color:'red',x:1,y:1,shape:[[0,0]],rotationBadge:true}]}),fixture({generators:[{id:'bad',side:'top',offset:1,spawn:[1,0],queueBlockIds:[],trigger:'time'}]})];
 for(const level of variants){const r=await checkAdvancedFloor(level,options);assert.equal(r.status,'unsupported');assert.equal(r.thresholdProven,false);}
});
