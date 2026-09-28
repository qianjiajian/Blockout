import fs from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';
import {loadApi,BASELINE,IDS,assertBaseline,auditCandidate,checkCandidate,ruleGate} from './native-block-repair-v143.mjs';
import {digest} from './revised-preview-validation-v160.mjs';
const {api}=await loadApi(),baseline=JSON.parse(fs.readFileSync(BASELINE));
const source=JSON.parse(fs.readFileSync('deliverables/native-block-repair-v143-20260924/root23-1790241782789/candidate.json'));
const fresh=()=>structuredClone(source);
test('a self-consistently rehashed baseline cannot authorize changes to Lv5',()=>{
 const b=structuredClone(baseline);b.levels[4].level.name='UNAUTHORIZED';b.levels[4].sha256=digest(b.levels[4].level);
 b.campaignSha256=digest(b.levels.map(r=>r.level));b.other195Sha256=digest(b.levels.filter(r=>!IDS.includes(r.level.id)).map(r=>r.level));
 assert.throws(()=>assertBaseline(b),/fixed by v1.43/);
});
test('current lock, exact target area, native art and fresh lower/upper bound pass',()=>{
 ruleGate();const r=checkCandidate(fresh(),baseline,api);assert.equal(r.lowerBound,11);assert.equal(r.upperBound,15);assert.equal(r.measurement.singleCellDrags,0);
});
test('Lv5 is explicitly protected, not an implicit migration',()=>{const d=fresh();d.level=structuredClone(baseline.levels[4].level);assert.throws(()=>auditCandidate(d,baseline,api),/excluded/);});
for(const [name,mutate]of [
 ['other body',d=>{d.level.blocks[0].color='red';}],
 ['gate',d=>{d.level.gates[0].size++;}],
 ['hidden counter',d=>{d.level.shutters[0].count--;}],
 ['evaluation',d=>{d.level.timeSeconds++;}],
 ['replacement gap',d=>{d.level.blocks.find(b=>b.id==='v143-23-17-bar').shape.pop();}],
 ['replacement overlap',d=>{d.level.blocks.find(b=>b.id==='v143-23-17-single').x=2;}],
 ['wrong hidden stage',d=>{d.level.blocks.find(b=>b.id==='v143-23-17-single').shutterId='cover-1';}],
 ['new mechanism',d=>{d.level.blocks.find(b=>b.id==='v143-23-17-single').frozen=2;}],
 ['missing source mapping',d=>{d.replacements[0].sourceIds=[];}],
 ['missing destination mapping',d=>{d.replacements[0].blockIds.pop();}],
])test(`rejects ${name}`,()=>{const d=fresh();mutate(d);assert.throws(()=>auditCandidate(d,baseline,api));});
test('old rotated body and route cannot be relabelled as native repair',()=>{
 const d=fresh();d.level=structuredClone(baseline.levels[22].level);d.replacements=[{sourceIds:['r139-23-17'],blockIds:['r139-23-17'],reason:'No actual replacement, negative test'}];
 assert.throws(()=>auditCandidate(d,baseline,api),/unrotated/);
});
test('a complete route and concrete decision evidence remain mandatory',()=>{
 const d=fresh();d.drags.pop();assert.throws(()=>checkCandidate(d,baseline,api));
 const e=fresh();e.decisionCases=[];assert.throws(()=>checkCandidate(e,baseline,api),/decision/);
});
