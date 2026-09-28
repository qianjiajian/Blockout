import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {TARGETS,BASELINE,assertBaseline,auditCandidate,loadApi,ruleGate} from './remake21to30-rhythm.mjs';
import {counterReference} from './remake21to30-counter-reference.mjs';
const baseline=JSON.parse(fs.readFileSync(BASELINE));
const {api}=await loadApi();
const level24=()=>{
  const l=structuredClone(baseline.levels[23].level);
  l.difficulty='hard';l.preservedMoveTarget=baseline.levels[23].starTargets.moveTarget;
  l.blocks.find(b=>b.frozen>0).frozen=6;
  return l;
};
test('v1.27 lock and immutable v1.25 task-start baseline are distinct',()=>{
  assert.equal(ruleGate().activeVersion,'1.27.0');assertBaseline(baseline);
  const bad=structuredClone(baseline);bad.levels[20].level.timeSeconds++;assert.throws(()=>assertBaseline(bad));
});
test('adopted rhythm has 3 easy / 4 normal / 2 hard / 1 super with both bounds',()=>{
  assert.deepEqual(Object.values(TARGETS).map(t=>t.difficulty),['easy','normal','normal','hard','easy','normal','hard','easy','normal','super']);
  for(const t of Object.values(TARGETS))assert.deepEqual([t.min,t.max],{easy:[5,9],normal:[10,14],hard:[15,19],super:[20,25]}[t.difficulty]);
});
test('new metadata can change only to the planned tier, preserving physical board and stars',()=>{
  const l=level24();assert(auditCandidate(l,baseline,api).passed);
  const wrong=structuredClone(l);wrong.difficulty='normal';assert.throws(()=>auditCandidate(wrong,baseline,api));
  const time=structuredClone(l);time.timeSeconds++;assert.throws(()=>auditCandidate(time,baseline,api));
  const board=structuredClone(l);board.playable.pop();assert.throws(()=>auditCandidate(board,baseline,api));
  const stars=structuredClone(l);stars.preservedMoveTarget++;assert.throws(()=>auditCandidate(stars,baseline,api));
  const intro=structuredClone(l);intro.featureIntro={kind:'generator',title:'Unauthorized'};
  assert.throws(()=>auditCandidate(intro,baseline,api),/peripheral field change/);
});
test('old partially filled curtains cannot pass the new authoring audit',()=>{
  const l=structuredClone(baseline.levels[20].level);l.difficulty='easy';l.preservedMoveTarget=baseline.levels[20].starTargets.moveTarget;
  l.shutters[0].count++;
  assert.throws(()=>auditCandidate(l,baseline,api),/hidden-region-not-filled/);
});
test('counter report separates independently loaded same-level source facts from design',()=>{
  const l=level24(),r=counterReference(l,baseline.levels[23].level,'数字冰提升到对应来源6；计数运行规则和原时限不变。');
  assert.deepEqual(r.sourceValues.iceBlocks,[6,6,6,6]);assert(r.designed.iceBlocks.some(b=>b.value===6));
  assert.equal(r.exactCompetitorParityClaimed,false);assert.equal(r.sourceFileSha256.length,64);
  assert.throws(()=>counterReference(l,baseline.levels[23].level,''));
});
