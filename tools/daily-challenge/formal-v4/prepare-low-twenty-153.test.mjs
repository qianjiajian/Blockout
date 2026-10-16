import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import test,{after} from 'node:test';
import {build} from 'esbuild';
import {LOW_TWENTY_153_INPUTS as D,readLowTwenty153Admission,assertLowTwenty153Envelope,appendReviewed153ToPreparedLowTwenty} from './prepare-low-twenty-153.mjs';
import {sha,PUBLIC_LEDGER,checkBindings} from './low-twenty-io.mjs';

const out=process.env.LOW_TWENTY_153_TEST_OUT;assert(out,'Fresh private output directory required');
assert(!await fs.access(out).then(()=>true,()=>false));await fs.mkdir(out,{recursive:true});
const results=[],bindings={};
const old={
 'low-twenty-contract.mjs':'2d7aee5e7c598822a61c893af0379f822a34373162231ee7fa6199908931bc13',
 'low-twenty-io.mjs':'5c3bf6b06841316808d839a6bb2dc0bd79b7feaec00fa0f6d6ea7da3d2aff066',
 'low-twenty-region-factory.mjs':'ceb842830bc1424e5e661c2d69ad8773fcb1bd40f9399c1c4b9a7737943faed0',
 'prepare-low-twenty.mjs':'fe6c8da0bb26074ee9447d19f5c7ebda7290d56823558ac3a6eed7412b7a6854',
 'construct-low-twenty.mjs':'97ffaf265b77fdca0c78773ca9df34a74ff553e92ef536f155c512e1bc0d01a3',
 'run-low-twenty.mjs':'a03e654560404a1f48ed13c1844b8192a9af708e4b5b944c4e969b3fe6c98761',
 'low-twenty.test.mjs':'0e27be656ed91dfdd491b98fd4f6df6dfcf35512613817f7db38d12329898f2a'};
// Exact original seven-file pin, including author tests, not requalified here.
const oldBefore={};for(const [name,h]of Object.entries(old)){const p='tools/daily-challenge/formal-v4/'+name;assert.equal(sha(await fs.readFile(p)),h);oldBefore[p]=h;}
const before=(await fs.readdir(PUBLIC_LEDGER)).filter(n=>n.endsWith('.request.json')).sort();
let bundle;
function check(name,fn){test(name,async()=>{try{await fn();results.push({name,passed:true});}catch(e){results.push({name,passed:false,error:e.message});throw e;}});}
check('Real 153 exact selection, one iced original math and two current Pointer/six images bind without preparation',async()=>{
 bundle=await readLowTwenty153Admission(D.selection,D.review);Object.assign(bindings,bundle.bindings);assert.equal(bundle.records.length,153);assert.equal(bundle.records.at(-1).U,46);
});
check('Missing, reordered or duplicated original 152 member rejects',()=>{
 for(const mode of ['missing','reordered','duplicate']){const q=structuredClone(bundle);if(mode==='missing')q.index.files.splice(2,1);else if(mode==='reordered')[q.index.files[0],q.index.files[1]]=[q.index.files[1],q.index.files[0]];else q.index.files[1]=q.index.files[0];assert.throws(()=>assertLowTwenty153Envelope(q));}
});
check('Iced append cannot use accepted flag with changed graph, route, lower or upper',()=>{
 for(const mutate of [q=>q.candidate.level.blocks[0].color='forged-colour',q=>q.candidate.drags.pop(),q=>q.candidate.L=32,q=>q.actual.result.U=45]){const q=structuredClone(bundle);mutate(q);assert.throws(()=>assertLowTwenty153Envelope(q));}
});
check('Future selection, unrelated review, swapped actual and fake PASS schema reject before reads',async()=>{
 await assert.rejects(readLowTwenty153Admission({...D.selection,sha256:'0'.repeat(64)},D.review));
 await assert.rejects(readLowTwenty153Admission(D.selection,D.priorAudit));
 for(const mutate of [q=>q.index.independentActualAudit=D.priorAudit,q=>q.review.status='ANY_ACCEPTED',q=>q.review.original152ExactPrefixAndBytes=false]){const q=structuredClone(bundle);mutate(q);assert.throws(()=>assertLowTwenty153Envelope(q));}
});
check('Pointer or visual evidence cannot be replaced by generic flags',()=>{
 for(const mutate of [q=>q.pointer.runs.pop(),q=>q.pointer.naturalClock=false,q=>q.visual.rootActuallyOpenedEveryImage=false,q=>q.visual.images[1]=q.visual.images[0],q=>q.visual.receipt=D.prior]){const q=structuredClone(bundle);mutate(q);assert.throws(()=>assertLowTwenty153Envelope(q));}
});
check('Original 152 independent hashes and source receipt remain exact',()=>{
 for(const mutate of [q=>q.index.fileBindings[q.prior.files[0]]='f'.repeat(64),q=>q.review.appended[0].sourceLevelId=198,q=>q.merge.receiptsModified=true]){const q=structuredClone(bundle);mutate(q);assert.throws(()=>assertLowTwenty153Envelope(q));}
});
check('Pure metadata upgrade changes selection only and cannot accept a shortened ancestor plan',()=>{
 const plan={selectedIndex:D.prior,selectionReview:D.priorAudit,selectedCount:152,selected:bundle.prior.files.map(p=>({path:p,sha256:bundle.index.fileBindings[p]})),
  bindings:{},sentinel:{maximumInputs:20,floor:{1:16,2:21},ceilings:{1:20,2:30},maximumStates:10000,experimentId:'unchanged'}};
 const before=structuredClone(plan),upgraded=appendReviewed153ToPreparedLowTwenty(plan,bundle);assert.deepEqual(plan,before);assert.deepEqual(upgraded.sentinel,plan.sentinel);
 assert.deepEqual(upgraded.selected.slice(0,152),plan.selected);assert.equal(upgraded.selectedCount,153);assert.equal(upgraded.selected.at(-1).sha256,D.candidate.sha256);
 assert.equal(upgraded.selectionAdapter.newMathematicalVerification,false);assert.equal(upgraded.selectionAdapter.currentUIExecuted,false);
 const bad=structuredClone(plan);bad.selected.pop();assert.throws(()=>appendReviewed153ToPreparedLowTwenty(bad,bundle));
});
check('Frozen original seven tools remain byte-identical',async()=>{await checkBindings(oldBefore);});
after(async()=>{
 const self='tools/daily-challenge/formal-v4/prepare-low-twenty-153.test.mjs';
 const compiled=await build({entryPoints:[self],bundle:true,packages:'external',write:false,outdir:'unused',metafile:true,platform:'node',format:'esm',logLevel:'silent'});
 for(const p of Object.keys(compiled.metafile.inputs))bindings[p.replaceAll('\\','/')]=sha(await fs.readFile(p));Object.assign(bindings,oldBefore);await checkBindings(bindings);
 const afterRequests=(await fs.readdir(PUBLIC_LEDGER)).filter(n=>n.endsWith('.request.json')).sort();
 const report={status:results.length===8&&results.every(r=>r.passed)?'LOW_TWENTY_153_ADAPTER_PRIVATE_PASS':'FAIL',selection:D.selection,selectionReview:D.review,results,passed:results.filter(r=>r.passed).length,
  errors:results.filter(r=>!r.passed),fileBindings:bindings,originalSevenFileBindings:oldBefore,realSelectionReadOnlyVerified:!!bundle,
  publicRequestCountBefore:before.length,publicRequestCountAfter:afterRequests.length,concurrentPublicRequests:afterRequests.filter(p=>!before.includes(p)),
  newPreparations:0,newConstructions:0,newSearches:0,newWitnessReplays:0,newLedgerClaims:0,currentUIExecuted:false,formalReady:false};
 await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
});
