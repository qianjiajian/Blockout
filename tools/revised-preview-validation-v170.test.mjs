import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {BASELINE,loadStrict21to30Catalog,loadPreviewCore,verifyStrict21to30Candidate} from './revised-preview-validation-v170.mjs';
// These tests isolate the inherited v1.7 source/shape contract, not v1.8
// exit-length acceptance. The new verifier tests reject the old long gates.
const {activeVersion}=JSON.parse(await readFile('docs/rules/manifest.json','utf8'));
const catalog=await loadStrict21to30Catalog(process.cwd(),{ruleVersion:activeVersion}),{api}=await loadPreviewCore();
const baseline=JSON.parse(await readFile(BASELINE,'utf8'));
const old=id=>structuredClone(baseline.rows.find(r=>r.levelId===id));
const source=id=>catalog.levels.find(s=>s.levelId===id);
const verify=r=>verifyStrict21to30Candidate(r,source(r.level.id),api);
test('independent reviewed source is ten levels with four full rectangles',()=>{
  assert.deepEqual(catalog.levels.map(r=>r.levelId),[21,22,23,24,25,26,27,28,29,30]);
  assert.deepEqual(catalog.levels.filter(r=>r.board.kind==='normal').map(r=>r.levelId),[21,22,28,29]);
  assert.equal(source(23).board.cells.length,46);
  assert.equal(source(26).facts.mechanisms.exits.ordinaryCount,8);
  assert(catalog.bindings['docs/level-generation/reviews/mechanism-inventory-lv021-024.json']);
});
test('M11 opening/full quantities independently extracted from reviewed shape inventory',()=>{
  assert.deepEqual(catalog.levels.map(s=>Object.values(s.facts.mechanisms.irregularBlocks)),[[0,0],[0,0],[2,4],[0,0],[0,0],[0,2],[0,0],[0,4],[2,8],[1,3]]);
});
for(const id of [25,27])test(`unchanged Lv${id} still requires and passes fresh route/art/layout proof`,()=>{
  const r=verify(old(id));assert(r.sourceAligned&&r.outlineAligned&&r.replay.complete&&r.art.passed&&r.coverage.passed);
  assert.equal(r.previewComplete,false);assert.equal(r.pointerReplayValidated,false);assert.equal(r.releaseApproved,false);
});
for(const id of [21,22,23,24,26,28,29,30])test(`old v1.6 Lv${id} is not relabelled strict with prior full route`,()=>{
  assert.throws(()=>verify(old(id)),/Strict mechanisms|Strict outline/);
});
test('unverified route cannot yield a preview',()=>{
  const r=old(25);r.drags=[];assert.throws(()=>verify(r),/Full route missing/);
  r.drags=old(25).drags.slice(0,1);assert.throws(()=>verify(r),/Fresh complete replay/);
});
test('fixed irregular outline cannot grow even when source type is irregular',()=>{
  const r=old(27);r.level.playable.push([0,0]);assert.throws(()=>verify(r),/Strict outline/);
});
test('known source mechanism removal and extra mechanism both rejected',()=>{
  const r=old(25);r.level.gates.find(g=>g.frozen>0).frozen=0;assert.throws(()=>verify(r));
  const s=old(27);s.level.blocks[0].frozen=1;assert.throws(()=>verify(s));
});
test('wrong source identity rejected before gameplay',()=>{
  assert.throws(()=>verifyStrict21to30Candidate(old(25),source(27),api),/Only21–30/);
});
for(const [id,p] of [[22,'.codex-temp/strict-alignment-v170/lv021-024/candidate-22.json'],[24,'.codex-temp/strict-alignment-v170/lv024-alternate/candidate-24.json']])
  test(`Lv${id} uniform ice values use evidenced aggregate shell overlap, not absent item flags`,async()=>{
    assert(source(id).sourceFacts.numericIce.items.every(i=>i.post_melt_shell===undefined));
    const raw=JSON.parse(await readFile(p,'utf8')),r=verify(raw);
    assert(r.replay.complete&&r.sourceAligned);
    assert.equal(r.proposedFacts.mechanisms.numericIce.postMeltShellCount,id===22?0:3);
  });
