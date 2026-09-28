import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadStrict21to30Catalog, loadPreviewCore, verifyStrict21to30Candidate } from './revised-preview-validation-v180.mjs';
import { loadStrict21to30Catalog as oldCatalog } from './revised-preview-validation-v170.mjs';
const catalog=await loadStrict21to30Catalog(),{api}=await loadPreviewCore();
const batch=JSON.parse(readFileSync('.codex-temp/strict-alignment-v180/batch-21-30.json','utf8'));
const oldBatch=JSON.parse(readFileSync('.codex-temp/strict-alignment-v170/batch-21-30.json','utf8'));
const source=id=>catalog.levels.find(s=>s.levelId===id);
const verify=raw=>verifyStrict21to30Candidate(raw,source(raw.level.id),api);
for (const [i,file] of batch.items.entries()) test(`Lv${i+21} resized exits retain source inventory, board, all blocks and full completion`,()=>{
  const raw=JSON.parse(readFileSync(file,'utf8')),old=JSON.parse(readFileSync(oldBatch.items[i],'utf8'));
  const r=verify(raw);
  assert.equal(r.ruleVersion,'1.8.0');assert(r.sourceAligned&&r.outlineAligned&&r.replay.valid&&r.replay.complete);
  assert(r.gateSpanAudit.passed&&r.gateSpanAudit.portals.every(p=>p.size<=3));
  assert.deepEqual(r.gateSpanAudit.wideExceptions,[]);
  for(const key of ['width','height','playable','blocks','shutters'])assert.deepEqual(raw.level[key],old.level[key],key);
  assert.deepEqual(raw.level.gates.map(({side,offset,size,...same})=>same),old.level.gates.map(({side,offset,size,...same})=>same));
  assert.equal(r.pointerReplayValidated,false);assert.equal(r.lowerBoundCertified,false);assert.equal(r.releaseApproved,false);
});
test('old renderer/catalog cannot pass under the new active rule by relabelling',async()=>{
  await assert.rejects(()=>oldCatalog(),/Active v1.7.0 rules lock required/);
});
test('9 old long-mouth candidates fail even with their previously valid complete routes',()=>{
  for(const file of oldBatch.items){const raw=JSON.parse(readFileSync(file,'utf8'));if(raw.level.id===26)continue;assert.throws(()=>verify(raw),/v1.8 exit width/);}
});
test('shortening the picture only, or splitting into duplicate same-color gates, cannot pass',()=>{
  const raw=JSON.parse(readFileSync(batch.items[0],'utf8'));
  raw.level.gates[0].size=9;raw.level.gates[0].visualSize=3;
  assert.throws(()=>verify(raw),/v1.8 exit width/);
  raw.level.gates[0].size=3;raw.level.gates.push({...raw.level.gates[0],id:'same-red',offset:6});
  assert.throws(()=>verify(raw));
});
test('a previously valid route is not enough after changing a short gate location',()=>{
  const raw=JSON.parse(readFileSync(batch.items[0],'utf8'));
  raw.level.gates.find(g=>g.color==='red').offset=6;
  assert.throws(()=>verify(raw),/Fresh complete replay|Spatial/);
});
