import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';
import {incrementalPointerReceipt,incrementalPointerDifficultyPolicy} from './pointer-incremental-receipt-v198.mjs';
import {incrementalPointerReceipt as originalReceipt} from './pointer-incremental-receipt.mjs';

// Private metadata only. The fabricated trace exercises the harness gate; it
// certifies no puzzle and is never replayed, registered or written to a save.
function fixture(difficulty=1,L=13,U=23){
 const level={id:1,name:'Private receipt boundary fixture',width:1,height:1,
  blocks:[{id:'body',x:0,y:0,shape:[[0,0]],color:'red'}],
  gates:[{id:'gate',side:'top',offset:0,size:1,color:'red'}]};
 const drags=Array.from({length:U+1},(_,i)=>({blockId:'body',path:[[0,0]],...(i===U?{exitSide:'top'}:{})}));
 const replay={valid:true,complete:true,failed:false,effectiveDrags:drags.length,
  nonClearingDrags:U,remainingBodies:0,remainingQueued:0,
  trace:drags.map((d,i)=>({index:i,blockId:d.blockId,moves:i+1,clearDelta:i===U?1:0}))};
 return{schemaVersion:4,accepted:true,formalId:`daily-basic-combined-d${difficulty}-01`,
  stageKey:'basic-combined',difficulty,sourceLevelId:1,level,levelSha256:levelSha256(level),
  drags,routeSha256:routeSha256(drags),L,U,freshIndependentReplay:replay};
}

test('v198 receipt gate uses the bound shared policy, loader and immutable rule',async()=>{
 const p=incrementalPointerDifficultyPolicy;
 assert.equal(p.version,'1.198.0');
 for(const file of ['src/core/dailyChallengeDifficultyPolicy.ts',
  'tools/daily-challenge/formal-v4/difficulty-policy-v198.mjs','docs/rules/mechanism-rules-v1.198.0.md']){
  assert.equal(p.bindings[file],createHash('sha256').update(await fs.readFile(file)).digest('hex'));
 }
});

for(const[d,L,U]of [[1,13,23],[1,23,23],[2,18,33],[2,33,33],[3,28,40],[3,31,46]]){
 test(`accepts exact D${d} interval ${L}..${U} without changing receipt or trace`,()=>{
  const q=fixture(d,L,U),before=structuredClone(q),r=incrementalPointerReceipt(q);
  assert.equal(r.receipt,q);assert.equal(r.independentReplay,q.freshIndependentReplay);
  assert.equal(r.independentReplayField,'freshIndependentReplay');assert.deepEqual(q,before);
 });
}

test('legacy helper retains its original rejection of all three newly tolerated floors',()=>{
 for(const[d,L,U]of [[1,13,23],[2,18,33],[3,28,40]])assert.throws(()=>originalReceipt(fixture(d,L,U)));
 assert.doesNotThrow(()=>originalReceipt(fixture(1,16,20)));
});

test('rejects outside-band, unknown, nonfinite, noninteger and reversed intervals',()=>{
 for(const[d,L,U]of [[1,12,23],[1,13,24],[2,17,33],[2,18,34],[3,27,40],
  [3,28,Infinity],[3,NaN,40],[3,28,40.5],[3,28,Number.MAX_SAFE_INTEGER+1],
  [3,40,39],[3,null,40],[3,28,null],[3,'28',40],[0,28,40]]){
  const q=fixture(3,28,40);Object.assign(q,{difficulty:d,L,U});assert.throws(()=>incrementalPointerReceipt(q));
 }
});

test('retains schema, acceptance, identity, same-level and same-route gates',()=>{
 const changes=[q=>q.schemaVersion=3,q=>q.accepted=false,q=>q.qualificationOnly=true,
  q=>q.formalId='unknown',q=>q.stageKey=null,q=>q.sourceLevelId=0,q=>q.sourceLevelId=2,
  q=>q.level.name='changed',q=>q.levelSha256='0'.repeat(64),q=>q.drags.pop(),
  q=>q.routeSha256='0'.repeat(64),q=>q.freshIndependentReplay=undefined];
 for(const change of changes){const q=fixture();change(q);assert.throws(()=>incrementalPointerReceipt(q));}
});

test('retains every independent replay status, inventory and trace gate',()=>{
 const changes=[r=>r.valid=false,r=>r.complete=false,r=>r.failed=true,r=>r.failed=undefined,
  r=>r.effectiveDrags--,r=>r.nonClearingDrags--,r=>r.remainingBodies=1,r=>r.remainingQueued=1,
  r=>r.trace.pop(),r=>r.trace[0].index=1,r=>r.trace[0].blockId='different',
  r=>r.trace[0].moves=2,r=>r.trace[0].clearDelta=-1,r=>r.trace[0].clearDelta=.5,
  r=>r.trace[0].clearDelta=1];
 for(const change of changes){const q=fixture();change(q.freshIndependentReplay);assert.throws(()=>incrementalPointerReceipt(q));}
});

test('supports both historical witness fields and rejects disagreeing traces',()=>{
 const q=fixture();q.route={independentReplay:structuredClone(q.freshIndependentReplay)};
 assert.equal(incrementalPointerReceipt(q).independentReplayField,'route.independentReplay');
 q.route.independentReplay.trace.at(-1).clearDelta=2;
 assert.throws(()=>incrementalPointerReceipt(q),/Two saved independent traces must agree/);
 q.route.independentReplay.trace.at(-1).clearDelta=1;
 delete q.freshIndependentReplay;
 assert.equal(incrementalPointerReceipt(q).independentReplayField,'route.independentReplay');
});
