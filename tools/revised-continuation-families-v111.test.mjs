import test,{after} from'node:test';
import assert from'node:assert/strict';
import fs from'node:fs';
import path from'node:path';
import{digest,loadPreviewCore}from'./revised-preview-validation-v160.mjs';
import{checkCandidate}from'./revised-design-policy-families-v111.mjs';
import{verifyContinuationBatchV111,prepareContinuationBatchV111,emitContinuationSource,DATA_PATH,LEGACY_ANCESTOR}from'./revised-continuation-families-v111.mjs';

const sha=p=>digest(fs.readFileSync(p)),ARCHIVE='.codex-temp/remaining98-v111/adoption-5/adoption.json';
const ARCHIVE_SHA='a5e0342ad234dbb6d34ff5fa863c8c59e182e7a316d7f58799c16afb07df1628';
assert.equal(sha(ARCHIVE),ARCHIVE_SHA);
const original=JSON.parse(fs.readFileSync(ARCHIVE));
const OLD_WRAPPER='tools/revised-continuation-batch-v111.mjs',OLD_SHA='3cfcf5893318f478e715fa5d6f39e352588826fbcdfb2e7c096db81b683bb00c';
const item72={levelId:72,path:'.codex-temp/remaining98-v111/middle/candidate-72-current-policy.json',sha256:'4461a052cb569bb028bb32f6bc820676026e0d6d370e46f21011d600c50b12cf',sourceReview:{path:'.codex-temp/remaining98-v111/middle/source-review-72.json',sha256:'233bfeb4066d9e4963a22abb5a6dda837254f1a573f93f3061363e20dc019424'}};
const guarded=[DATA_PATH,ARCHIVE,OLD_WRAPPER,LEGACY_ANCESTOR.path,item72.path,item72.sourceReview.path,
 'tools/revised-continuation-families-v111.test.mjs','tools/revised-continuation-families-v111.mjs',
 'tools/revised-design-policy-families-v111.mjs','tools/revised-design-review-stars-v110.mjs'];
const before=Object.fromEntries(guarded.map(p=>[p,sha(p)]));
const directory=fs.mkdtempSync(path.resolve('.codex-temp/remaining98-v111/families-tests-'));
let seq=0;const artifact=(kind,value)=>{const p=path.join(directory,`${String(seq++).padStart(2,'0')}-${kind}.json`);fs.writeFileSync(p,JSON.stringify(value,null,2)+'\n',{flag:'wx'});return p;};
const apiPromise=loadPreviewCore();let migrationPromise;
const migrate=()=>migrationPromise??=(async()=>{
 const batch=artifact('new-batch',{ruleVersion:'1.11.0',previousArchive:{path:ARCHIVE,sha256:ARCHIVE_SHA},rows:[item72]});
 const result=await prepareContinuationBatchV111(batch,path.join(directory,'prepared'));
 return{result,archive:JSON.parse(fs.readFileSync(result.archivePath))};
})();
after(()=>{
 assert.deepEqual(Object.fromEntries(guarded.map(p=>[p,sha(p)])),before,'Tests must not alter current production or immutable fixtures');
 console.log('families-compatibility-test-artifacts='+path.relative(process.cwd(),directory).replaceAll('\\','/'));
});

test('current applied schema2 archive is accepted with the exact released basic emitter',async()=>{
 assert.deepEqual(original.emission.wrapper,{path:OLD_WRAPPER,sha256:OLD_SHA});
 assert.equal(original.inheritedRows.length,63);assert.equal(original.rows.length,5);
 const result=await verifyContinuationBatchV111(ARCHIVE,ARCHIVE_SHA);
 assert.equal(result.status,'passed-model-not-ui');assert.equal(result.formalIds.length,87);
 assert.deepEqual(result.rows.map(r=>r.levelId),original.rows.map(r=>r.levelId));
 assert(result.rows.every(r=>r.formalReplay.valid&&r.formalReplay.complete));
 assert(!result.pointerValidated&&!result.naturalClockValidated&&!result.releaseApproved);
});

test('new-family emitter prepares a cumulative transition without applying or rewriting ancestors',async()=>{
 const{result,archive}=await migrate();
 assert.equal(archive.emission.wrapper.path,'tools/revised-continuation-families-v111.mjs');
 assert.equal(archive.emission.wrapper.sha256,sha(archive.emission.wrapper.path));
 assert.deepEqual(archive.previousArchive,{path:ARCHIVE,sha256:ARCHIVE_SHA});
 assert.deepEqual(archive.baseline,original.baseline);assert.deepEqual(archive.inheritedRows,original.inheritedRows);
 for(const row of original.rows)assert.deepEqual(archive.rows.find(r=>r.levelId===row.levelId),row);
 assert.equal(archive.rows.length,6);assert.equal(result.formalCount,88);
 const verification=await verifyContinuationBatchV111(result.archivePath,result.archiveSha256,{applied:false});
 assert.equal(verification.status,'passed-prepared-not-applied');
 assert.equal(verification.formalIds.length,87,'Prepared evidence must not claim production already changed');
 assert.equal(verification.rows.find(r=>r.levelId===72).formalReplay.complete,true);
 assert.deepEqual(archive.rows.find(r=>r.levelId===72).previous,original.baseline.levels[71]);
 await assert.rejects(verifyContinuationBatchV111(result.archivePath,result.archiveSha256),/applied\/before/);
});

test('wrapper compatibility is exact path-and-SHA, not any historical-looking filename',async()=>{
 for(const change of[
  a=>a.emission.wrapper.sha256='0'.repeat(64),
  a=>a.emission.wrapper.path='tools/revised-continuation-typed-emission.mjs',
  a=>a.emission.wrapper={path:'tools/revised-continuation-families-v111.mjs',sha256:OLD_SHA},
 ]){const a=structuredClone(original);change(a);const p=artifact('bad-wrapper',a);await assert.rejects(verifyContinuationBatchV111(p,sha(p)));}
});

test('archived source, candidate and route bindings cannot be substituted',async()=>{
 for(const change of[
  a=>a.rows[0].sourceReview.sha256='0'.repeat(64),
  a=>a.rows[0].sha256='0'.repeat(64),
  a=>a.rows[0].drags.pop(),
  a=>a.rows[0].approvedDifferences=[],
 ]){const a=structuredClone(original);change(a);const p=artifact('bad-evidence',a);await assert.rejects(verifyContinuationBatchV111(p,sha(p)));}
});

test('full200 baseline, original metadata, queue metadata and downstream flags remain guarded',async()=>{
 for(const change of[
  a=>a.baseline.levels[0].level.name='forged original20',
  a=>a.rows[0].previous.metadata.timeSeconds=300,
  a=>a.emission.metadata[0].generatorId='wrong-owner',
  a=>a.emission.runtimeObjectsDeepEqual=false,
  a=>a.naturalClockValidated=true,
 ]){const a=structuredClone(original);change(a);const p=artifact('bad-preservation',a);await assert.rejects(verifyContinuationBatchV111(p,sha(p)));}
});

test('fresh policy validation rejects changed geometry, missing route or source facts even under new hashes',async()=>{
 const{api}=await apiPromise,raw=JSON.parse(fs.readFileSync(item72.path));
 for(const change of[r=>r.level.blocks[0].color='cyan',r=>r.drags.pop(),r=>r.designPolicy.differences=[]]){
  const r=structuredClone(raw);change(r);const p=artifact('bad-candidate',r);
  await assert.rejects(checkCandidate({...item72,path:p,sha256:sha(p)},api));
 }
 const s=JSON.parse(fs.readFileSync(item72.sourceReview.path));s.sourceNormalizedFacts.mechanisms.numericIce.values=[16,10];
 const p=artifact('bad-source',s);
 await assert.rejects(checkCandidate({...item72,sourceReview:{path:p,sha256:sha(p)}},api));
});

test('typed emission keeps ownership narrow and all normal BlockSpec fields checked',async()=>{
 const{archive}=await migrate(),layouts={};
 for(const row of[...archive.inheritedRows,...archive.rows]){const raw=JSON.parse(fs.readFileSync(row.path));layouts[row.levelId]=Object.fromEntries(Object.entries(raw.level).filter(([k])=>['mechanismRules','width','height','playable','blocked','seams','gates','blocks','flipDoors','coloredGrids','bombFailurePolicy','shutters','generators','elevators','conveyors'].includes(k)));}
 const ok=emitContinuationSource(layouts);assert(ok.runtimeObjectsDeepEqual);assert.equal(ok.metadata.length,2);
 for(const change of[
  x=>x[138].blocks.find(b=>b.generatorId).generatorId='wrong-owner',
  x=>x[72].blocks[0].x='not-a-number',
  x=>x[72].blocks[0].unknownProperty=true,
 ]){const x=structuredClone(layouts);change(x);assert.throws(()=>emitContinuationSource(x));}
});
