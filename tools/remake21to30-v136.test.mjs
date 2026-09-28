import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {VERSION,TARGETS,NORMAL_PRACTICE_IDS,BASELINE,assertBaseline,ruleGate,auditTeachingWindow,auditInstanceProgression,CURTAIN_PLAN} from './remake21to30-v136.mjs';

test('current batch keeps cadence with new four-band inclusive limits',()=>{
  assert.equal(VERSION,'1.36.0');
  const expected=[[3,5],[6,10],[6,10],[11,15],[3,5],[6,10],[11,15],[3,5],[6,10],[16,25]];
  assert.deepEqual(Object.keys(TARGETS).map(Number),[21,22,23,24,25,26,27,28,29,30]);
  assert.deepEqual(Object.values(TARGETS).map(t=>[t.min,t.max]),expected);
  assert(Object.isFrozen(TARGETS));for(const t of Object.values(TARGETS))assert(Object.isFrozen(t));
});
test('only the first two normals after curtain unlock carry the common teaching policy',()=>{
  assert.deepEqual(NORMAL_PRACTICE_IDS,[22,23]);assert(Object.isFrozen(NORMAL_PRACTICE_IDS));
  for(const id of [21,24,25,26,27,28,29,30]){
    assert.equal(auditTeachingWindow({id,difficulty:TARGETS[id].difficulty},{}),null);
  }
});
const old={blocks:Array.from({length:8},()=>({color:'red'}))};
const example=id=>({id,difficulty:'normal',blocks:Array.from({length:6},()=>({color:'red'})),shutters:[{id:'a'},{id:'b'}]});
test('practice review measures whole-level bodies and clearing load, without claiming spatial or human validation',()=>{
  for(const id of NORMAL_PRACTICE_IDS){
    const r=auditTeachingWindow(example(id),old);
    assert.equal(r.bodies,6);assert.equal(r.oldBodies,8);assert.equal(r.clearLoad,6);assert.equal(r.shutters,2);
    assert.equal(r.humanBlindTested,false);
  }
});
test('practice window rejects easy relabeling, single high-count curtain, hidden body inflation, and shell workload inflation',()=>{
  const easy=example(22);easy.difficulty='easy';assert.throws(()=>auditTeachingWindow(easy,old),/normal/);
  const single=example(22);single.shutters=[{id:'a',count:99}];assert.throws(()=>auditTeachingWindow(single,old),/multiple/);
  const hidden=example(23);hidden.blocks=old.blocks.map(b=>({...b,shutterId:'a'}));assert.throws(()=>auditTeachingWindow(hidden,old),/bodies/);
  const shells=example(23);shells.blocks.forEach(b=>b.layers=['red','blue']);assert.throws(()=>auditTeachingWindow(shells,old),/clearing work/);
});
test('new batch baseline is immutable historical input, not a reused old-version certificate',()=>{
  const b=JSON.parse(fs.readFileSync(BASELINE));assertBaseline(b);
  const wrong=structuredClone(b);wrong.ruleVersion='1.33.0';assert.throws(()=>assertBaseline(wrong));
  const drift=structuredClone(b);drift.levels[20].level.timeSeconds++;assert.throws(()=>assertBaseline(drift));
  const active=JSON.parse(fs.readFileSync('docs/rules/manifest.json')).activeVersion;
  if(active===VERSION)assert.equal(ruleGate().activeVersion,VERSION);else assert.throws(()=>ruleGate());
});


test('current batch lowers super count to 2–4, selects three effective curtains and rejects the abandoned five',()=>{
  assert.equal(CURTAIN_PLAN[30],3);
  for(const count of [0,1,5])assert.throws(()=>auditInstanceProgression({id:30,difficulty:'super',shutters:Array(count).fill({count:8})}),/2–4/);
  assert.equal(auditInstanceProgression({id:30,difficulty:'super',shutters:[{count:8},{count:10},{count:12}]}).actual,3);
  assert.equal(CURTAIN_PLAN[24],2);assert.equal(CURTAIN_PLAN[27],3);assert.equal(CURTAIN_PLAN[28],1);
});
