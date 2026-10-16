import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {loadLeagueProofRuntime,levelSha256} from './proof-contract.mjs';
import {inspectLeagueReceipt} from './catalog-progress.mjs';
import {revalidateLeagueRendering,inspectRenderRevalidation,hasTimeSchedule,RENDER_ONLY_INPUT} from './proof-render-revalidation.mjs';

const runtime=await loadLeagueProofRuntime(),selection=JSON.parse(await fs.readFile('deliverables/league-v2-20261008/selection/final-100/selection.json','utf8'));
const selected=selection.selections.find(s=>s.index===1),previousBytes=await fs.readFile(selected.proofFile),previous=JSON.parse(previousBytes),sha=b=>createHash('sha256').update(b).digest('hex');
const parent=path.resolve('deliverables/league-v2-20261008/proof/tests');
async function temp(t){await fs.mkdir(parent,{recursive:true});const dir=await fs.mkdtemp(path.join(parent,'render-revalidation-'));t.after(async()=>{const rel=path.relative(parent,dir);assert(rel&&!rel.startsWith('..')&&!path.isAbsolute(rel));await fs.rm(dir,{recursive:true,force:true});});return dir;}

test('fresh current models/static/art/score pass while preserving the exact original lower and request',async t=>{
 const dir=await temp(t),outputFile=path.join(dir,'revalidated.json');
 const r=await revalidateLeagueRendering({previousReceipt:selected.proofFile,previousReceiptSha256:sha(previousBytes),outputFile,runtime});
 assert.equal(r.accepted,true,r.reasons.join(';'));assert.equal(r.formalReady,false);assert.equal(r.renderRevalidation.searchInvocations,0);assert.equal(r.renderRevalidation.newSearchStates,0);
 assert.deepEqual(r.lowerBound,previous.lowerBound);assert.deepEqual(r.attempt,previous.attempt);assert.deepEqual(r.drags,previous.drags);assert.equal(r.routeSha256,previous.routeSha256);
 assert.deepEqual(inspectRenderRevalidation(r,previous),[]);assert.deepEqual(inspectLeagueReceipt(r,runtime.LEVELS.find(l=>l.id===r.sourceLevelId),r.index),[]);
 assert.equal(sha(await fs.readFile(selected.proofFile)),sha(previousBytes));
 for(const mutate of [v=>v.lowerBound.result.rawFullBoardStates++,v=>v.renderRevalidation.newSearchStates=1,v=>v.timeSchedule={secondsPerDrag:1},v=>v.toolchainBindings['tools/league-v2/proof-bounded.mjs']='0'.repeat(64),v=>delete v.renderRevalidation.freshChecks.independentRoute]){
  const altered=structuredClone(r);mutate(altered);assert(inspectRenderRevalidation(altered,previous).length>0);
 }
});
test('one changed physics/solver binding or timed route rejects before any new evidence is written',async t=>{
 const dir=await temp(t);
 for(const [name,mutate,expected]of [
  ['physics',p=>p.toolchainBindings['src/core/PuzzleModel.ts']='0'.repeat(64),/Non-render input changed/],
  ['solver',p=>p.toolchainBindings['tools/league-v2/proof-bounded.mjs']='0'.repeat(64),/Non-render input changed/],
  ['timed',p=>p.timeSchedule={secondsPerDrag:0.05,secondsPerUnitStep:0.01,secondsPerExitAnimation:0.3},/untimed receipts/],
  ['unknown',p=>{p.accepted=false;p.status='UNKNOWN_LOWER';},/internally invalid/],
 ]){
  const p=structuredClone(previous);mutate(p);p.toolchainSha256=levelSha256(p.toolchainBindings);
  const file=path.join(dir,name+'.input.json'),bytes=Buffer.from(JSON.stringify(p));await fs.writeFile(file,bytes);
  const outputFile=path.join(dir,name+'.result.json');
  await assert.rejects(()=>revalidateLeagueRendering({previousReceipt:file,previousReceiptSha256:sha(bytes),outputFile,runtime}),expected);
  await assert.rejects(()=>fs.access(outputFile));
 }
});
test('explicit prior file SHA and actual UI drift are both required; timing detection includes nested routes',async t=>{
 const dir=await temp(t);
 await assert.rejects(()=>revalidateLeagueRendering({previousReceipt:selected.proofFile,previousReceiptSha256:'0'.repeat(64),outputFile:path.join(dir,'bad.json'),runtime}),/Original proof file SHA mismatch/);
 const p=structuredClone(previous);p.toolchainBindings[RENDER_ONLY_INPUT]=runtime.toolchainBindings[RENDER_ONLY_INPUT];p.toolchainSha256=levelSha256(p.toolchainBindings);
 const file=path.join(dir,'already-current.json'),bytes=Buffer.from(JSON.stringify(p));await fs.writeFile(file,bytes);
 await assert.rejects(()=>revalidateLeagueRendering({previousReceipt:file,previousReceiptSha256:sha(bytes),outputFile:path.join(dir,'duplicate.json'),runtime}),/No render drift/);
 assert.equal(hasTimeSchedule({route:{timeSchedule:{secondsPerDrag:1}}}),true);assert.equal(hasTimeSchedule({timeSchedule:null}),false);
});
