import test from 'node:test';
import assert from 'node:assert/strict';
import {auditStrictMechanismAlignment as audit,ordinaryExitReconfiguration as policy} from './strict-mechanism-alignment-v190.mjs';

function facts(){return{width:5,height:7,opening:35,full:35,mechanisms:{
 exits:{ordinaryCount:12,frozenCount:3,frozenValues:[2,10,13],starCount:0,starFrozenCount:0,starFrozenValues:[],flipCount:0},
 generators:{count:0,queueLengths:[]},covers:{count:0,values:[],hiddenBatchCounts:[]},numericIce:{count:0,values:[],postMeltShellCount:0},
 shells:{count:0},axisBlocks:{count:0,axes:[]},keysLocks:{keyCount:0,lockCount:0,lockValues:[]},starBlocks:{count:0},
 flipDoors:{count:0,initialStates:[]},coloredGrid:{cellCount:0,regionCount:0},bombs:{count:0,values:[]},
 elevators:{count:0,hiddenBatchCounts:[]},irregularBlocks:{openingCount:0,fullCount:0}}};}
function pair(){const s=facts(),d=structuredClone(s);d.mechanisms.exits.ordinaryCount=4;return[s,d];}
const check=(s,d,id=60)=>audit({levelId:id,facts:s},{levelId:id,facts:d});

test('independent facts remain byte-equivalent and exception not equality or gameplay proof',()=>{
 const[s,d]=pair(),before=JSON.stringify([s,d]),r=check(s,d);
 assert(r.sourceAligned);assert(!r.exactMatch);assert(!r.gameplayValidated);assert(!r.boardAligned);assert(!r.releaseApproved);
 assert.equal(JSON.stringify([s,d]),before);assert.equal(r.approvedExceptions[0].sourceValue,12);
 assert.equal(r.approvedExceptions[0].designValue,4);
});
test('star doors do not create a nonstar capacity conflict when nonstar total is eight',()=>{
 const[s,d]=pair();s.mechanisms.exits.ordinaryCount=5;
 for(const f of[s,d]){f.mechanisms.exits.starCount=8;f.mechanisms.starBlocks.count=8;}
 assert(!policy(s,d,60).allowed);assert(!check(s,d).sourceAligned);
});
test('ordinary reduction still reserves all seven frozen and one flipped physical slots',()=>{
 const[s,d]=pair();for(const f of[s,d]){Object.assign(f.mechanisms.exits,{frozenCount:7,frozenValues:[1,2,3,4,5,6,7],flipCount:1});f.mechanisms.flipDoors={count:1,initialStates:['closed']};}
 d.mechanisms.exits.ordinaryCount=1;assert(!policy(s,d,60).allowed);assert(!check(s,d).sourceAligned);
});
for(const kind of['source','design'])test(`${kind} overlapping ice/flip annotation cannot become disjoint by ordinary reduction`,()=>{
 const[s,d]=pair();(kind==='source'?s:d).mechanisms.exits.overlappingAttributes=true;
 assert(!check(s,d).sourceAligned);
});
test('an overlap flag blocks even the inherited Lv26 exception',()=>{
 const[s,d]=pair();s.mechanisms.exits.ordinaryCount=8;
 for(const f of[s,d])f.mechanisms.exits.frozenValues=[5,9,14];
 s.mechanisms.exits.overlappingAttributes=true;assert(!check(s,d,26).sourceAligned);
});
test('Lv26 identity alone cannot grant ordinary reduction without its special facts or a real capacity conflict',()=>{
 const[s,d]=pair();s.mechanisms.exits.ordinaryCount=5;
 assert(!policy(s,d,26).allowed);assert(!check(s,d,26).sourceAligned);
});
test('source with zero ordinary doors cannot invent the ordinary mechanism',()=>{
 const[s,d]=pair();s.mechanisms.exits.ordinaryCount=0;d.mechanisms.exits.ordinaryCount=1;
 assert(!policy(s,d,60).allowed);assert(!check(s,d).sourceAligned);
});
test('ice duplicate counts use a multiset, not a set',()=>{
 const[s,d]=pair();s.mechanisms.exits.frozenValues=[2,2,13];d.mechanisms.exits.frozenValues=[2,13,13];
 assert(!policy(s,d,60).allowed);assert(!check(s,d).sourceAligned);
});
test('frozen and star-frozen bags cannot be exchanged while combined bag is unchanged',()=>{
 const[s,d]=pair();for(const f of[s,d]){Object.assign(f.mechanisms.exits,{frozenCount:2,frozenValues:[2,10],starCount:1,starFrozenCount:1,starFrozenValues:[13]});f.mechanisms.starBlocks.count=1;}
 d.mechanisms.exits.frozenValues=[2,13];d.mechanisms.exits.starFrozenValues=[10];
 assert(!policy(s,d,60).allowed);assert(!check(s,d).sourceAligned);
});
test('the star-frozen subset inconsistency remains blocked after an otherwise valid plain reduction',()=>{
 const[s,d]=pair();for(const f of[s,d])Object.assign(f.mechanisms.exits,{starCount:0,starFrozenCount:1,starFrozenValues:[9]});
 assert(!check(s,d).sourceAligned);assert(check(s,d).blockedIssues.some(i=>i.code.includes('star-frozen-subset')));
});
test('flip states preserve multiplicity, not just the set of state labels',()=>{
 const[s,d]=pair();for(const f of[s,d]){f.mechanisms.exits.flipCount=3;f.mechanisms.flipDoors={count:3,initialStates:['open','open','closed']};}
 d.mechanisms.exits.ordinaryCount=1;d.mechanisms.flipDoors.initialStates=['open','closed','closed'];
 assert(!policy(s,d,60).allowed);assert(!check(s,d).sourceAligned);
});
for(const [name,mutate,field] of[
 ['numeric ice',s=>s.mechanisms.numericIce.values=null,'mechanisms.numericIce.values'],
 ['shell count',s=>s.mechanisms.shells.count=null,'mechanisms.shells.count'],
 ['generator lengths',s=>s.mechanisms.generators.queueLengths=null,'mechanisms.generators.queueLengths'],
 ['key count',s=>s.mechanisms.keysLocks.keyCount=null,'mechanisms.keysLocks.keyCount'],
 ['bomb values',s=>s.mechanisms.bombs.values=null,'mechanisms.bombs.values'],
 ['elevator batches',s=>s.mechanisms.elevators.hiddenBatchCounts=null,'mechanisms.elevators.hiddenBatchCounts'],
 ['M11',s=>s.mechanisms.irregularBlocks.fullCount=null,'mechanisms.irregularBlocks.fullCount'],
])test(`ordinary exception never removes unrelated ${name} source unknown`,()=>{
 const[s,d]=pair();mutate(s);const r=check(s,d);assert(r.ordinaryExitPolicy.allowed);assert(!r.sourceAligned);
 assert(r.unresolved.some(i=>i.side==='source'&&i.field===field));
});
test('unknown future mechanism family remains unresolved',()=>{
 const[s,d]=pair();s.mechanisms.unreviewedMechanism={count:1};const r=check(s,d);
 assert(r.ordinaryExitPolicy.allowed);assert(!r.sourceAligned);assert(r.unresolved.some(i=>i.field==='mechanisms.unreviewedMechanism'));
});
test('cover initial values remain paired with their respective hidden batch sizes',()=>{
 const[s,d]=pair();for(const f of[s,d])f.mechanisms.covers={count:2,values:[5,9],hiddenBatchCounts:[3,7]};
 d.mechanisms.covers.hiddenBatchCounts=[7,3];assert(!check(s,d).sourceAligned);
});
test('elevator inner layer ordering is not forgiven by an ordinary exception',()=>{
 const[s,d]=pair();for(const f of[s,d])f.mechanisms.elevators={count:1,hiddenBatchCounts:[[3,7]]};
 d.mechanisms.elevators.hiddenBatchCounts=[[7,3]];assert(!check(s,d).sourceAligned);
});
test('key-group and lock association differences stay blocked despite equal global totals',()=>{
 const[s,d]=pair();for(const f of[s,d])f.mechanisms.keysLocks={keyCount:3,lockCount:2,lockValues:[1,2],groups:[{keyCount:1,lockValues:[1]},{keyCount:2,lockValues:[2]}]};
 d.mechanisms.keysLocks.groups=[{keyCount:1,lockValues:[2]},{keyCount:2,lockValues:[1]}];assert(!check(s,d).sourceAligned);
});
test('grid/shell forbidden co-occurrence remains blocked even when source and design match',()=>{
 const[s,d]=pair();for(const f of[s,d]){f.mechanisms.coloredGrid={cellCount:1,regionCount:1};f.mechanisms.shells.count=1;}
 assert(!check(s,d).sourceAligned);
});
test('ice-shell overlap cannot exceed ice or shell totals after ordinary exception',()=>{
 const[s,d]=pair();for(const f of[s,d]){f.mechanisms.numericIce={count:1,values:[2],postMeltShellCount:2};f.mechanisms.shells.count=2;}
 assert(!check(s,d).sourceAligned);
});
test('9 star doors exceed the separate eight-color star capacity and cannot be waived',()=>{
 const[s,d]=pair();for(const f of[s,d]){f.mechanisms.exits.starCount=9;f.mechanisms.starBlocks.count=9;}
 assert(!check(s,d).sourceAligned);
});
test('sparse frozen initial-value arrays are unknown, not matching complete inventories',()=>{
 const[s,d]=pair();for(const f of[s,d]){f.mechanisms.exits.frozenCount=1;f.mechanisms.exits.frozenValues=new Array(1);}
 assert(!policy(s,d,60).allowed);assert(!check(s,d).sourceAligned);
});
test('sparse unknowns in unrelated mechanism values are never waived',()=>{
 const[s,d]=pair();for(const f of[s,d])f.mechanisms.bombs={count:1,values:new Array(1)};
 assert(!check(s,d).sourceAligned);
});
