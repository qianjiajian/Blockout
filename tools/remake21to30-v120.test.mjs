import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {BASELINE,loadApi,assertBaseline,auditCandidate,checkCandidate,floorFor} from './remake21to30-v120.mjs';
import {checkFreezeBarrierFloor} from './remake21to30-freeze-bound.mjs';
const baseline=JSON.parse(fs.readFileSync(BASELINE,'utf8'));
const {api}=await loadApi();
const original=id=>structuredClone(baseline.levels[id-1].level);

test('saved original campaign is intact and contains the specified difficulty schedule',()=>{
  assertBaseline(baseline);assert.deepEqual(Array.from({length:10},(_,i)=>floorFor(i+21)),[10,10,15,10,15,10,10,15,10,20]);
});
test('all ten original boards pass new static/profile/metadata adapter without pretending new designs',()=>{
  for(let id=21;id<=30;id++)assert(auditCandidate(original(id),baseline,api).passed);
});
test('cannot silently change a board mask, time, reward, stars or profile',()=>{
  const variants=[l=>l.playable.pop(),l=>l.timeSeconds++,l=>l.reward++,l=>l.parMoves+=100,l=>l.mechanismRules='revised-2026-09-21-v1.2'];
  for(const change of variants){const l=original(21);change(l);assert.throws(()=>auditCandidate(l,baseline,api));}
});
test('cannot introduce post-30 axes or substitute fake curtains',()=>{
  const l=original(21);l.blocks[0].movementAxis='vertical';assert.throws(()=>auditCandidate(l,baseline,api));
  const k=original(21);k.shutters[0].skin='staging';assert.throws(()=>auditCandidate(k,baseline,api));
});
test('mere complete-route claims or supplied proof booleans are not accepted',()=>{
  assert.throws(()=>checkCandidate({seed:'test',design:{primaryMechanism:'curtain'},level:original(21),drags:[],lowerBoundCertified:true},baseline,api));
});
test('structural bound fails closed for locked mechanics or invalid threshold',()=>{
  const l=original(21);l.blocks[0].movementAxis='vertical';assert.equal(checkFreezeBarrierFloor(l,api).thresholdProven,false);
  assert.equal(checkFreezeBarrierFloor(original(21),api,{floor:0}).status,'unsupported');
});

function barrierFixture(){return {
  mechanismRules:'revised-2026-09-23-v1.4',id:21,name:'Structural proof fixture',difficulty:'normal',timeSeconds:60,reward:0,width:3,height:3,
  gates:[{id:'gate-r',color:'red',side:'bottom',offset:0,size:2},{id:'gate-b',color:'blue',side:'left',offset:1,size:1,frozen:1},{id:'gate-g',color:'green',side:'right',offset:1,size:1,frozen:1}],
  blocks:[{id:'carrier',color:'red',x:0,y:0,shape:[[0,0],[1,0]]},{id:'a',color:'blue',x:0,y:2,shape:[[0,0]]},{id:'b',color:'green',x:1,y:2,shape:[[0,0]]}],
};}
test('independent two-block bound is tight against a fresh complete continuous-input witness',()=>{
  const level=barrierFixture(),proof=checkFreezeBarrierFloor(level,api,{floor:2});
  assert.equal(proof.lowerBound,2);assert(proof.thresholdProven);
  const drags=[
    {blockId:'a',path:[[0,1],[1,1],[2,1],[2,0]]},
    {blockId:'b',path:[[2,2]]},
    {blockId:'carrier',path:[[0,1],[0,2]],exitSide:'bottom'},
    {blockId:'a',path:[[2,1],[1,1],[0,1]],exitSide:'left'},
    {blockId:'b',path:[[2,1]],exitSide:'right'},
  ];
  const replay=api.replayRevisedRoute(level,drags);assert(replay.valid&&replay.complete,JSON.stringify(replay));assert.equal(replay.nonClearingDrags,2);
});
test('alternative exit poses take an intersection, not a union',()=>{
  const level=barrierFixture();level.gates[0].size=3;
  const proof=checkFreezeBarrierFloor(level,api,{floor:2});
  assert.equal(proof.lowerBound,1);assert.equal(proof.thresholdProven,false);
  assert.equal(proof.best.events[0].poses.length,2);
});
test('hidden early events and peelable survivors cannot be ignored to inflate a bound',()=>{
  const hidden=barrierFixture();hidden.shutters=[{id:'cover',x:2,y:1,width:1,height:1,count:1}];
  hidden.blocks.push({id:'extra-early',color:'red',x:2,y:1,shape:[[0,0]],shutterId:'cover'});
  assert.equal(checkFreezeBarrierFloor(hidden,api,{floor:2}).thresholdProven,false);
  const shell=barrierFixture();shell.blocks[1].layers=['blue','red'];
  assert.equal(checkFreezeBarrierFloor(shell,api,{floor:2}).thresholdProven,false);
  const unlocked=barrierFixture();unlocked.gates[1].frozen=0;
  assert.equal(checkFreezeBarrierFloor(unlocked,api,{floor:2}).thresholdProven,false);
});
