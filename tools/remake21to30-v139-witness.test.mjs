import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {build} from 'esbuild';
import {loadApi} from './remake21to30-v139.mjs';
import {compileLevel,forEachGesture,stateFromSnapshot,stateKey} from './remake21to30-mask-floor.mjs';

test('every preserved v1.39 witness action belongs to the qualified lower-bound superset graph',async()=>{
  const fixture=JSON.parse(fs.readFileSync('tests/fixtures/mechanism-practice-remake-v139.json'));
  const {api}=await loadApi();assert.equal(fixture.ruleVersion,'1.39.0');assert.equal(fixture.rows.length,10);
  const compiled=await build({stdin:{resolveDir:process.cwd(),contents:"export {LEVELS_BEFORE_LAYOUT_ORIGINALITY_REMAKE as levels} from './src/core/levels.ts';"},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'});
  const {levels}=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
  let checked=0;
  for(const row of fixture.rows){
    assert.deepEqual(levels[row.id-1],row.level);
    if(![21,22,23,28].includes(row.id))assert.deepEqual(api.LEVELS[row.id-1],row.level);
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
