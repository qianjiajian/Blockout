import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {loadApi,ruleGate,BASELINE,TARGETS,assertBaseline,auditCandidate,checkCandidate,sourceCatalog} from './remake31to40-v141.mjs';
import {minimumQueueColorEdits,verifySourceCatalog,auditSourceAlignment} from './remake31to40-source-v141.mjs';
import {digest} from './revised-preview-validation-v160.mjs';
const {api}=await loadApi(),baseline=JSON.parse(fs.readFileSync(BASELINE));
const read=id=>JSON.parse(fs.readFileSync(id===31?'deliverables/remake31-40-v141-20260924/agent31-34/final31-1790229621121.json':`deliverables/remake31-40-v141-20260924/agent35-37/final${id}.json`));
test('new scope and cadence use current bands without changing historical thresholds',()=>{
 assert.equal(ruleGate().activeVersion,'1.41.0');assertBaseline(baseline);
 assert.deepEqual(Object.values(TARGETS).map(t=>[t.difficulty,t.min,t.max]),[
  ['easy',5,10],['normal',11,15],['normal',11,15],['hard',16,20],['easy',5,10],['easy',5,10],['normal',11,15],['hard',16,20],['easy',5,10],['normal',11,15]]);
});
test('reviewed source corrections are separate from the raw truth and hash-bound',()=>{
 const c=sourceCatalog();assert.equal(c.records[34].stages.find(s=>s.id==='cover-2').count,6);
 assert.equal(c.records[36].stages.find(s=>s.id==='generator-left-upper').items[0].shape,'SQ2');
 assert.equal(c.records[37].stages.find(s=>s.id==='generator-top').items.at(-1).shape,'SQ3');
 assert.equal(c.records[39].stages.find(s=>s.id==='cover-3').count,5);
 const bad=structuredClone(c);bad.records[39].gates[0].frozen=1;bad.sourceHash=digest(bad.records);
 assert.throws(()=>verifySourceCatalog(bad),/derive from bound reviews/);
});
test('known carriers, counters, colours, stage ownership and ordinary mouths cannot silently change',()=>{
 for(const mutate of [d=>d.level.blocks.find(b=>b.frozen).frozen++,d=>d.level.gates.find(g=>g.frozen).frozen++,d=>d.level.gates.pop(),d=>d.level.blocks[0].color='pink',d=>delete d.sourceAdaptation.blockMapping]){
  const d=read(31);mutate(d);assert.throws(()=>auditCandidate(d,baseline,api));
 }
});
test('geometry, metadata and baseline scope fail closed',()=>{
 for(const mutate of [d=>d.level.width++,d=>d.level.reward++,d=>d.level.timeSeconds++,d=>d.level.difficulty='hard',d=>d.level.name+='x']){
  const d=read(31);mutate(d);assert.throws(()=>auditCandidate(d,baseline,api));
 }
 const bad=structuredClone(baseline);bad.scope=[31];assert.throws(()=>assertBaseline(bad));
});
test('all real machine queues are bound by inventory and ordered source colour/shape',()=>{
 assert(auditCandidate(read(36),baseline,api).passed);
 for(const mutate of [d=>d.level.generators.pop(),d=>d.level.generators[0].queueBlockIds.pop(),d=>d.level.blocks.find(b=>b.id===d.level.generators[0].queueBlockIds[0]).color='blue']){
  const d=read(36);mutate(d);assert.throws(()=>auditCandidate(d,baseline,api));
 }
});
test('adjacent colour conflict adapts the minimum number only, including runs',()=>{
 assert.equal(minimumQueueColorEdits(['red','red'],['red','blue','yellow']),1);
 assert.equal(minimumQueueColorEdits(['red','red','red','red'],['red','blue','yellow']),2);
 assert.equal(minimumQueueColorEdits(['red','blue','red'],['red','blue','yellow']),0);
});
test('adapted stages cannot merge distinct known ordinary source bodies through repeated bindings',()=>{
 const d=read(36),c=sourceCatalog(),items=c.records[36].stages.find(s=>s.kind==='opening').items;
 const pair=items.flatMap((a,i)=>items.slice(i+1).filter(b=>a.color===b.color&&a.shape===b.shape).map(b=>[a,b]))[0];
 assert(pair);d.sourceAdaptation.blockMapping[pair[1].id]=[...d.sourceAdaptation.blockMapping[pair[0].id]];
 assert.throws(()=>auditSourceAlignment(d.level,c,d.sourceAdaptation),/disjoint bindings/);
});
test('candidate flags cannot substitute for fresh full replay and lower bound',()=>{
 const d=read(31),r=checkCandidate(d,baseline,api);assert.equal(r.lowerBound,5);assert.equal(r.upperBound,9);assert.equal(r.pointerValidated,false);
 const bad=structuredClone(d);bad.drags=bad.drags.slice(0,-1);bad.proof={thresholdProven:true};assert.throws(()=>checkCandidate(bad,baseline,api));
 const unknown=structuredClone(d);unknown.proof={thresholdProven:true};assert.throws(()=>checkCandidate(unknown,baseline,api,{maxStates:1,maxMilliseconds:1000}));
});
