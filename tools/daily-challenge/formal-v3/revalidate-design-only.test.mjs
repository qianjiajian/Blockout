import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {assertDesignOnlyInputs,assertReviewedSnapshot} from './revalidate-design-only.mjs';
import {createHash} from 'node:crypto';
import {levelSha256} from '../formal-v2/contract.mjs';
const index=JSON.parse(fs.readFileSync('deliverables/daily-formal-v3-20261008/selection/multistep01-selected/index.json'));
const previous=JSON.parse(fs.readFileSync(index.files[0]));
const runtime={toolchainSha256:previous.toolchainSha256,toolchainBindings:previous.toolchainBindings,
 designBindings:{...previous.design.designBindings,'tools/daily-challenge/formal-v3/diversity.mjs':'a'.repeat(64)}};
runtime.designToolchainSha256=levelSha256(runtime.designBindings);
test('permits only the design comparison update on an unchanged proven object',()=>assert.equal(assertDesignOnlyInputs(previous,runtime).length,1));
test('rejects failed objects, changed levels and changed witnesses',()=>{
 for(const change of [p=>p.accepted=false,p=>p.level.blocks[0].x++,p=>p.drags.pop()]){
  const p=structuredClone(previous);change(p);assert.throws(()=>assertDesignOnlyInputs(p,runtime));}
});
test('rejects proof changes and unrelated design or intensity changes',()=>{
 assert.throws(()=>assertDesignOnlyInputs(previous,{...runtime,toolchainSha256:'b'.repeat(64)}));
 const r=structuredClone(runtime);r.designBindings['tools/daily-challenge/formal-v3/mechanism-intensity.mjs']='c'.repeat(64);
 r.designToolchainSha256=levelSha256(r.designBindings);assert.throws(()=>assertDesignOnlyInputs(previous,r));
});

test('binds the reviewed index, membership and complete old mathematical bytes',()=>{
 const input='deliverables/daily-formal-v3-20261008/selection/multistep01-selected/index.json';
 const bytes=fs.readFileSync(input),snapshot=JSON.parse(fs.readFileSync('deliverables/daily-formal-v3-20261008/proof/diversity-symmetric-audit-134-v1/report.json'));
 const digest=b=>createHash('sha256').update(b).digest('hex');
 const entries=index.files.map(path=>{const b=fs.readFileSync(path);return{path,sha256:digest(b),receipt:JSON.parse(b)};});
 assert.doesNotThrow(()=>assertReviewedSnapshot(input,bytes,entries,snapshot));
 for(const mutation of [p=>p.lowerBound.result.exploredStates--,p=>p.route.valid=false]){
  const changed=structuredClone(entries);mutation(changed[0].receipt);
  changed[0].sha256=digest(JSON.stringify(changed[0].receipt));
  assert.throws(()=>assertReviewedSnapshot(input,bytes,changed,snapshot));
 }
 assert.throws(()=>assertReviewedSnapshot(input,bytes,entries.slice(1),snapshot));
 assert.throws(()=>assertReviewedSnapshot(input,bytes,[...entries,entries[0]],snapshot));
 assert.throws(()=>assertReviewedSnapshot(input,Buffer.from(JSON.stringify({...index,files:index.files.slice(1)})),entries,snapshot));
});
