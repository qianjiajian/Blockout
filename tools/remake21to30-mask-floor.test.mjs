import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {loadApi} from './remake21to30-v120.mjs';
import {compileLevel,forEachGesture,stateFromSnapshot,stateKey,checkFastFloor} from './remake21to30-mask-floor.mjs';
import {compileLevel as oldCompile,forEachGesture as oldGestures,checkFastFloor as oldFloor} from './level21-reposition-floor.mjs';
const {api}=await loadApi();
const folder='deliverables/remake21-30-v120-20260923/batch-1790163911564';
const read=id=>JSON.parse(fs.readFileSync(`${folder}/lv${id}.json`));
const fixture=()=>({id:21,name:'mask-test',difficulty:'normal',reward:0,timeSeconds:100,mechanismRules:'revised-2026-09-23-v1.4',width:3,height:3,
  gates:[{id:'gate-r',color:'red',side:'bottom',offset:0,size:2},{id:'gate-b',color:'blue',side:'left',offset:1,size:1,frozen:1},{id:'gate-g',color:'green',side:'right',offset:1,size:1,frozen:1}],
  blocks:[{id:'carrier',color:'red',x:0,y:0,shape:[[0,0],[1,0]]},{id:'a',color:'blue',x:0,y:2,shape:[[0,0]]},{id:'b',color:'green',x:1,y:2,shape:[[0,0]]}]});
test('two-block bound and relaxed shortcut agree with the historical graph',()=>{
  for(const floor of [1,2,3]){
    const opts={floor,maxStates:10000,maxMilliseconds:10000},a=checkFastFloor(fixture(),opts),b=oldFloor(fixture(),opts);
    assert.equal(a.status,b.status);assert.equal(a.thresholdProven,b.thresholdProven);
    assert.equal(a.status,floor<=2?'threshold-proven':'relaxed-shortcut');
    assert.equal(a.relaxedNonClearingDrags,b.relaxedNonClearingDrags);
  }
});
test('budget exhaustion and unsupported semantics are not proofs',()=>{
  assert.equal(checkFastFloor(fixture(),{floor:3,maxStates:1,maxMilliseconds:1000}).thresholdProven,false);
  for(const mutate of [l=>l.seams=[{}],l=>l.blocks[0].movementAxis='horizontal',l=>l.gates[0].portals=[{}],l=>l.width=50]){
    const l=fixture();mutate(l);assert.equal(checkFastFloor(l).status,'unsupported');
  }
});
test('playable holes and blocked cells exclude complete rigid footprints',()=>{
  const l=fixture();l.playable=Array.from({length:9},(_,i)=>[i%3,Math.floor(i/3)]).filter(p=>p.join()!=[1,1].join());
  const c=compileLevel(l);assert.equal(c.blocks[0].poses[3],null);assert.equal(c.blocks[0].poses[4],null);
  assert(c.blocks[0].poses[0]);assert(!c.blocks[0].poses[0].neighbors.includes(3));
  delete l.playable;l.blocked=[[1,1]];assert.equal(compileLevel(l).blocks[0].poses[3],null);
  l.blocks[0].y=1;assert.throws(()=>compileLevel(l));
  const gateHole=fixture();gateHole.blocked=[[2,1]];assert.throws(()=>compileLevel(gateHole),/outer rails/);
});
test('bit64 does not alias bit0, and shell poses above63 keep their stage',()=>{
  const l={...fixture(),width:8,height:10,gates:[{id:'gate-r',color:'red',side:'left',offset:8,size:1},{id:'gate-b',color:'blue',side:'right',offset:8,size:1}],
    blocks:[{id:'a',color:'red',layers:['red','blue'],x:1,y:8,shape:[[0,0]]},{id:'b',color:'blue',x:0,y:0,shape:[[0,0]]}]};
  const c=compileLevel(l);assert.deepEqual(c.blocks[0].poses[64].mask,[0,0,1]);assert.deepEqual(c.blocks[1].poses[0].mask,[1,0,0]);
  const options=[];forEachGesture(c,c.initial,(i,v,cost,get)=>{options.push({i,v,cost,drag:get()});});
  assert(options.some(x=>x.i===0&&x.v===(64|128)&&x.cost===0));
  assert(options.some(x=>x.i===0&&x.v===64&&x.cost===1));
  const m=new api.PuzzleModel(l);m.beginAction();assert(m.moveBlockStep('a',0,8));assert(m.tryExit('a','left').ok);assert(m.commitAction());
  assert.equal(stateFromSnapshot(c,m.snapshot())[0],192);
});
test('all444 published witness actions are contained by the extended graph',()=>{
  let checked=0;
  for(let id=21;id<=30;id++){
    const data=read(id),c=compileLevel(data.level),m=new api.PuzzleModel(data.level);m.startCountdown();
    assert.equal(stateKey(c.initial),stateKey(stateFromSnapshot(c,m.snapshot())));
    for(const drag of data.drags){
      const before=m.snapshot(),state=stateFromSnapshot(c,before),index=c.blocks.findIndex(b=>b.id===drag.blockId);
      m.beginAction();for(const p of drag.path)assert(m.moveBlockStep(drag.blockId,...p));
      if(drag.exitSide)assert(m.tryExit(drag.blockId,drag.exitSide).ok);assert(m.commitAction());
      const after=m.snapshot(),expected=stateFromSnapshot(c,after),cost=after.cleared===before.cleared?1:0;
      let present=false;forEachGesture(c,state,(i,v,edge)=>{if(i===index&&v===expected[index]&&cost===edge)present=true;});
      assert(present,`Lv${id} ${drag.blockId} input must be present in superset`);
      const next=state.slice();next[index]=expected[index];assert.deepEqual(next,expected);checked++;
    }
    assert(m.snapshot().complete);
  }
  assert.equal(checked,444);
});
test('rectangle initial gesture sets preserve the historical semantics',()=>{
  const data=read(28),a=compileLevel(data.level),b=oldCompile(data.level);
  const events=(c,f)=>{const result=[];f(c,c.initial,(i,v,cost,get)=>{result.push(JSON.stringify({i,cost,drag:get()}));});return result.sort();};
  assert.deepEqual(events(a,forEachGesture),events(b,oldGestures));
});
