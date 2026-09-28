import test from 'node:test';
import assert from 'node:assert/strict';
import {auditStrictMechanismAlignment as audit,ordinaryExitReconfiguration as policy} from './strict-mechanism-alignment-v190.mjs';
function facts(){return {width:5,height:7,opening:35,full:35,mechanisms:{
  exits:{ordinaryCount:24,frozenCount:0,frozenValues:[],starCount:0,starFrozenCount:0,starFrozenValues:[],flipCount:0},
  generators:{count:0,queueLengths:[]},covers:{count:0,values:[],hiddenBatchCounts:[]},numericIce:{count:0,values:[],postMeltShellCount:0},
  shells:{count:0},axisBlocks:{count:35,axes:[...Array(18).fill('vertical'),...Array(17).fill('horizontal')]},
  keysLocks:{keyCount:0,lockCount:0,lockValues:[]},starBlocks:{count:0},flipDoors:{count:0,initialStates:[]},
  coloredGrid:{cellCount:0,regionCount:0},bombs:{count:0,values:[]},elevators:{count:0,hiddenBatchCounts:[]},irregularBlocks:{openingCount:0,fullCount:0}}};}
function pair(){const s=facts(),d=structuredClone(s);d.mechanisms.exits.ordinaryCount=5;return [s,d];}
const compare=(s,d)=>audit({levelId:60,facts:s},d);
test('Lv60 24 to five is disclosed as an approved count exception, not exact equality',()=>{
  const [s,d]=pair(),before=JSON.stringify([s,d]),r=compare(s,d);
  assert(r.sourceAligned);assert(!r.exactMatch);assert.equal(r.approvedExceptions.length,1);
  assert.equal(r.approvedExceptions[0].sourceValue,24);assert.equal(r.approvedExceptions[0].designValue,5);
  assert.equal(JSON.stringify([s,d]),before);assert(!r.gameplayValidated);assert(!r.releaseApproved);
});
test('ice counts and multiset stay unchanged, ordinary capacity shrinks accordingly',()=>{
  const [s,d]=pair();for(const f of [s,d])Object.assign(f.mechanisms.exits,{frozenCount:3,frozenValues:[5,9,14]});
  assert(compare(s,d).sourceAligned);d.mechanisms.exits.frozenValues=[14,5,9];assert(compare(s,d).sourceAligned);
});
for(const [name,mutate] of [
  ['remove ice',d=>{d.mechanisms.exits.frozenCount=2;d.mechanisms.exits.frozenValues=[5,9];}],
  ['change ice initial',d=>{d.mechanisms.exits.frozenValues=[5,9,13];}],
  ['remove star',d=>{d.mechanisms.exits.starCount=0;}],
  ['convert ice to star',d=>{d.mechanisms.exits.frozenCount=2;d.mechanisms.exits.frozenValues=[5,9];d.mechanisms.exits.starFrozenCount=1;d.mechanisms.exits.starFrozenValues=[14];}],
  ['erase axis',d=>{d.mechanisms.axisBlocks.count=0;d.mechanisms.axisBlocks.axes=[];}],
  ['extra shell',d=>{d.mechanisms.shells.count=1;}],
  ['invent M11',d=>{d.mechanisms.irregularBlocks.fullCount=1;}],
])test(name+' cannot use ordinary authorization',()=>{const[s,d]=pair();for(const f of [s,d])Object.assign(f.mechanisms.exits,{frozenCount:3,frozenValues:[5,9,14],starCount:1});mutate(d);assert(!compare(s,d).sourceAligned);});
for(const n of [0,9,24,25,-1,1.5,null])test(`illegal ordinary count ${n} rejected`,()=>{const[s,d]=pair();d.mechanisms.exits.ordinaryCount=n;assert(!compare(s,d).sourceAligned);});
test('no quota conflict is not a license to reduce exits for easier solving',()=>{const[s,d]=pair();s.mechanisms.exits.ordinaryCount=6;assert(!compare(s,d).sourceAligned);});
test('nine frozen ports remain a conflict, even after deleting every plain exit',()=>{const[s,d]=pair();for(const f of [s,d])Object.assign(f.mechanisms.exits,{frozenCount:9,frozenValues:[1,2,3,4,5,6,7,8,9]});d.mechanisms.exits.ordinaryCount=0;assert(!compare(s,d).sourceAligned);assert(!policy(s,d,39).allowed);});
test('eight frozen ports leave no ordinary mechanism slot',()=>{const[s,d]=pair();for(const f of [s,d])Object.assign(f.mechanisms.exits,{frozenCount:8,frozenValues:[1,2,3,4,5,6,7,8]});d.mechanisms.exits.ordinaryCount=1;assert(!compare(s,d).sourceAligned);});
test('source unknown stays unknown even when ordinary count exception is valid',()=>{const[s,d]=pair();s.mechanisms.bombs.count=null;const r=compare(s,d);assert(r.ordinaryExitPolicy.allowed);assert(r.unresolved.length);assert(!r.sourceAligned);});
test('unknown ice value never treated as zero/unchanged',()=>{const[s,d]=pair();for(const f of [s,d])Object.assign(f.mechanisms.exits,{frozenCount:1,frozenValues:[null]});assert(!compare(s,d).sourceAligned);assert(!policy(s,d,60).allowed);});
test('overlapping ice+flip annotation explicitly requires reviewed physical inventory',()=>{const[s,d]=pair();s.mechanisms.exits.overlappingAttributes=true;assert(!compare(s,d).sourceAligned);assert(!policy(s,d,60).allowed);});
test('M11 ratio conflict is not covered by exit permission',()=>{const[s,d]=pair();for(const f of [s,d])f.mechanisms.irregularBlocks={openingCount:12,fullCount:12};assert(!compare(s,d).sourceAligned);});
test('flip count and state cannot change',()=>{const[s,d]=pair();for(const f of [s,d]){f.mechanisms.exits.flipCount=1;f.mechanisms.flipDoors={count:1,initialStates:['closed']};}assert(compare(s,d).sourceAligned);d.mechanisms.flipDoors.initialStates=['open'];assert(!compare(s,d).sourceAligned);assert(!policy(s,d,60).allowed);});
test('pure policy scope excludes 1–20 and 201–300',()=>{const[s,d]=pair();for(const id of [1,20,201,300])assert(!policy(s,d,id).allowed);});
