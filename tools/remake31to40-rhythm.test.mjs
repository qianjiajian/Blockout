import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {TARGETS,BASELINE,assertBaseline,auditCandidate,loadApi,ruleGate} from './remake31to40-rhythm.mjs';
import {counterReference} from './remake31to40-counter-reference.mjs';
const baseline=JSON.parse(fs.readFileSync(BASELINE));
const {api}=await loadApi();
const modified31=()=>{
  const l=structuredClone(baseline.levels[30].level);
  l.difficulty='easy';l.preservedMoveTarget=baseline.levels[30].starTargets.moveTarget;
  l.blocks.find(b=>b.frozen>0).frozen++;
  return l;
};
test('v1.28 current lock and task-start snapshot are independently bound',()=>{
  assert.equal(ruleGate().activeVersion,'1.28.0');assertBaseline(baseline);
  assert.deepEqual(baseline.scope,Array.from({length:10},(_,i)=>31+i));
  const changed=structuredClone(baseline);changed.levels[30].level.timeSeconds++;assert.throws(()=>assertBaseline(changed));
});
test('35 insertion shifts the existing simple slot to 36 and the former super beyond this batch',()=>{
  assert.deepEqual(Object.values(TARGETS).map(t=>t.difficulty),['easy','normal','normal','hard','easy','easy','normal','hard','easy','normal']);
  assert.equal(TARGETS[41],undefined);
  for(const t of Object.values(TARGETS))assert.deepEqual([t.min,t.max],{easy:[5,9],normal:[10,14],hard:[15,19],super:[20,25]}[t.difficulty]);
});
test('physical board and peripheral fields, including real star goals and unlock metadata, are preserved',()=>{
  const l=modified31();assert(auditCandidate(l,baseline,api).passed);
  for(const mutate of [x=>x.timeSeconds++,x=>x.playable.pop(),x=>x.preservedMoveTarget++,x=>x.name+='changed',
    x=>x.reward++,x=>x.difficulty='normal',x=>x.featureIntro={kind:'generator',title:'Unauthorized'}]){
    const bad=structuredClone(l);mutate(bad);assert.throws(()=>auditCandidate(bad,baseline,api));
  }
});
test('mere label changes and pre-unlock generators are rejected',()=>{
  const l=structuredClone(baseline.levels[30].level);l.difficulty='easy';l.preservedMoveTarget=baseline.levels[30].starTargets.moveTarget;
  assert.throws(()=>auditCandidate(l,baseline,api),/only relabel/);
  const early=modified31();early.generators=structuredClone(baseline.levels[34].level.generators);
  assert.throws(()=>auditCandidate(early,baseline,api));
});
test('historical Lv34 partially filled hidden regions cannot be approved',()=>{
  const l=structuredClone(baseline.levels[33].level);l.difficulty='hard';l.preservedMoveTarget=baseline.levels[33].starTargets.moveTarget;
  l.shutters[0].count++;
  assert.throws(()=>auditCandidate(l,baseline,api),/hidden-region-not-filled/);
});
test('generator inventory source is independent of new authored queue counts',()=>{
  const l=structuredClone(baseline.levels[34].level);
  const r=counterReference(l,l,'教学布局队列根据真实空间负荷适配，来源两机各8只作为参考。');
  assert.deepEqual(r.sourceValues.generators.queue_lengths,[8,8]);
  assert.deepEqual(r.designed.generators.map(g=>g.queueLength),[3]);
  assert.equal(r.exactCompetitorParityClaimed,false);assert.equal(r.sourceFileSha256.length,64);
  assert.throws(()=>counterReference(l,l,''));
});
