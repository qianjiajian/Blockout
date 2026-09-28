import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {loadApi} from './remake21to30-v136.mjs';
import {compileLevel,forEachGesture,stateFromSnapshot,stateKey} from './remake21to30-mask-floor.mjs';

test('every new formal witness action belongs to the qualified lower-bound superset graph',async()=>{
  const fixture=JSON.parse(fs.readFileSync('tests/fixtures/mechanism-practice-remake-v136.json'));
  const {api}=await loadApi();assert.equal(fixture.ruleVersion,'1.36.0');assert.equal(fixture.rows.length,10);
  let checked=0;
  for(const row of fixture.rows){
    assert.deepEqual(api.LEVELS[row.id-1],row.level);
    const c=compileLevel(row.level),m=new api.PuzzleModel(row.level);m.startCountdown();
    assert.equal(stateKey(c.initial),stateKey(stateFromSnapshot(c,m.snapshot())));
    for(const drag of row.drags){
      const before=m.snapshot(),state=stateFromSnapshot(c,before),index=c.blocks.findIndex(b=>b.id===drag.blockId);
      m.beginAction();for(const p of drag.path)assert(m.moveBlockStep(drag.blockId,...p));
      if(drag.exitSide)assert(m.tryExit(drag.blockId,drag.exitSide).ok);assert(m.commitAction());
      const after=m.snapshot(),expected=stateFromSnapshot(c,after),cost=after.cleared===before.cleared?1:0;
      let present=false;forEachGesture(c,state,(i,v,edge)=>{if(i===index&&v===expected[index]&&cost===edge)present=true;});
      assert(present,`Lv${row.id}: formal input absent from qualified superset`);
      const next=state.slice();next[index]=expected[index];assert.deepEqual(next,expected);checked++;
    }
    assert(m.snapshot().complete);
  }
  assert.equal(checked,fixture.rows.reduce((n,r)=>n+r.drags.length,0));
});
