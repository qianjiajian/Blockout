import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {validateFinalPointerEvidence} from './final-acceptance.mjs';

// Read immutable completed runs. No browser, clock simulation, solver or final
// acceptance writer is invoked by these aggregation tests.
const root='deliverables/daily-formal-v2-20261007',pointerRoot=`${root}/formal-pointer-all`;
const runtimeReport=JSON.parse(fs.readFileSync(`${root}/runtime-verified/report.json`,'utf8'));
const files=fs.readdirSync(pointerRoot,{withFileTypes:true}).filter(e=>e.isDirectory())
  .map(e=>path.join(pointerRoot,e.name,'report.json')).filter(f=>fs.existsSync(f));
const samples=files.map(file=>({file,report:JSON.parse(fs.readFileSync(file,'utf8'))}));
assert(samples.length>0,'Need an actual completed formal Pointer report');
const receipts=new Map();
function fixture(sample=samples[0]){
  const report=structuredClone(sample.report);
  if(!receipts.has(report.formalId))receipts.set(report.formalId,JSON.parse(fs.readFileSync(`${root}/runtime-verified/${report.formalId}.json`,'utf8')));
  return{report,receipt:structuredClone(receipts.get(report.formalId)),
    row:{formalId:report.formalId,viewport:`${report.viewport.width}x${report.viewport.height}`},runtimeReport:structuredClone(runtimeReport)};
}
const check=x=>validateFinalPointerEvidence(x.report,x.receipt,x.row,x.runtimeReport);

test(`all ${samples.length} completed real Pointer reports satisfy strengthened aggregation`,()=>{
  for(const sample of samples)assert.equal(check(fixture(sample)),true,sample.file);
});

test('rejects mismatched formal assignment identity, source, hashes and revision',()=>{
  for(const [field,value]of [['id','wrong-slot'],['sourceLevelId',0],['layoutSha256','0'.repeat(64)],
    ['routeSha256','0'.repeat(64)],['catalogRevision','stale']]){
    const x=fixture();x.report.assignment[field]=value;assert.throws(()=>check(x),/Formal assignment/);
  }
  const missing=fixture();delete missing.report.assignment;assert.throws(()=>check(missing),/Formal assignment/);
});

test('rejects mismatched runtime receipt and unbound original proof file',()=>{
  for(const mutate of [x=>{delete x.receipt.runtimeBinding;},x=>{x.receipt.runtimeBinding.catalogRevision='stale';},
    x=>{x.receipt.runtimeBinding.assignment.id='wrong';},x=>{x.receipt.runtimeBinding.bindings={};},
    x=>{delete x.report.files[x.report.assignment.proofReport];},x=>{delete x.report.files['src/core/formalDailyChallengeData.ts'];}]){
    const x=fixture();mutate(x);assert.throws(()=>check(x),/binding|assignment/);
  }
});

test('rejects corrupt per-drag identity, clear counts, commits and order despite unchanged top-level U',()=>{
  for(const patch of [{index:999},{blockId:'nonexistent'},{clearDelta:999},{clearDelta:-1},{moves:999}]){
    const x=fixture();Object.assign(x.report.actions[0],patch);assert.throws(()=>check(x),/action trace/);
  }
  const x=fixture();[x.report.actions[0],x.report.actions[1]]=[x.report.actions[1],x.report.actions[0]];
  assert.throws(()=>check(x),/action trace/);
});

test('recomputes nonclearing cost independently of top-level report counters',()=>{
  const x=fixture();x.report.U++;x.receipt.U++;assert.throws(()=>check(x),/Recomputed nonclearing/);
});

test('rejects absent, stationary, backwards and invalid natural clock probes',()=>{
  for(const mutate of [r=>{delete r.naturalClockProbe;},r=>{r.naturalClockProbe.afterClock=r.naturalClockProbe.beforeClock;},
    r=>{r.naturalClockProbe.afterClock=r.naturalClockProbe.beforeClock+1;},r=>{r.naturalClockProbe.afterClock=-1;},
    r=>{r.naturalClockProbe.beforeClock=NaN;}]){
    const x=fixture();mutate(x.report);assert.throws(()=>check(x),/Natural clock probe/);
  }
});

test('rejects per-drag clock rollback or expiry and malformed final clock/counters',()=>{
  for(const mutate of [r=>{r.actions[0].remainingSeconds=-1;},r=>{r.actions[0].remainingSeconds=r.naturalClockProbe.beforeClock+1;},
    r=>{r.actions[1].remainingSeconds=r.actions[0].remainingSeconds+1;},r=>{r.finalPuzzle.remainingSeconds=NaN;},
    r=>{r.finalPuzzle.remainingSeconds=r.actions.at(-1).remainingSeconds+1;},r=>{r.finalPuzzle.moves++;}]){
    const x=fixture();mutate(x.report);assert.throws(()=>check(x),/clock|Natural route/);
  }
});
