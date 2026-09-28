import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {digest} from './revised-preview-validation-v160.mjs';
import {LEGACY_ANCESTOR,LEGACY_CAMPAIGN_SHA,DATA_PATH,inspectLegacyAncestor,continuationApiV111,
  captureBaseline,assertBaselineUnchanged,formalLevelFromBaseline,emitContinuationSource,
  prepareContinuationBatchV111,verifyContinuationBatchV111} from './revised-continuation-batch-v111.mjs';

const sha=p=>digest(fs.readFileSync(p));
const productionBefore=sha(DATA_PATH),ancestorBefore=sha(LEGACY_ANCESTOR.path);
const ITEM={levelId:187,path:'.codex-temp/remaining98-v111/late/candidate-187-policy.json',
  sha256:'9caa4f9206fd442cc7b4ca487796c4093240399ba7f7196a859da8bc91e58b5e',
  sourceReview:{path:'.codex-temp/remaining98-v111/late/source-review-187.json',
    sha256:'0cc459863ce82b044bb7b2ebcec64116d3ca7861a4885aab5a0548ae44a28ba2'}};
const legacy=inspectLegacyAncestor();
const runtimePromise=continuationApiV111();
const raw=JSON.parse(fs.readFileSync(ITEM.path));
let preparedPromise;
async function preparedFixture(){
  if(!preparedPromise)preparedPromise=(async()=>{
    const root=path.resolve('.codex-temp/remaining98-v111');fs.mkdirSync(root,{recursive:true});
    const dir=fs.mkdtempSync(path.join(root,'continuation-tests-'));
    const batchPath=path.join(dir,'batch.json');
    fs.writeFileSync(batchPath,JSON.stringify({ruleVersion:'1.11.0',legacyAncestor:LEGACY_ANCESTOR,rows:[ITEM]},null,2)+'\n',{flag:'wx'});
    const result=await prepareContinuationBatchV111(batchPath,path.join(dir,'prepared'));
    return{dir,batchPath,result,archive:JSON.parse(fs.readFileSync(result.archivePath))};
  })();
  return preparedPromise;
}

test('pinned historical typed63 and all previous rows remain v1.10 evidence, not relabelled v1.11',()=>{
  assert.equal(ancestorBefore,LEGACY_ANCESTOR.sha256);
  assert.equal(legacy.archive.ruleVersion,'1.10.0');assert.equal(legacy.archive.rows.length,63);
  assert.equal(Object.keys(legacy.layouts).length,63);
  assert.match(legacy.evidenceStatus,/historical-v1.10/);
  assert.equal(sha(DATA_PATH),productionBefore);
});

test('complete 200-level baseline is pinned, including untouched82 and the original20',async()=>{
  const{runtime}=await runtimePromise,b=captureBaseline(runtime,legacy);
  assert.equal(b.formalIds.length,82);assert.equal(b.levels.length,200);
  assert.equal(digest(b.levels.map(l=>l.level)),LEGACY_CAMPAIGN_SHA);
  assertBaselineUnchanged(runtime,b,[]);
  assertBaselineUnchanged(runtime,b,[39,187]);
  for(const ids of [[1],[201],[37],[187,187]])assert.throws(()=>assertBaselineUnchanged(runtime,b,ids));
});

test('old fields, metadata, star targets and the full baseline cannot be forged independently',async()=>{
  const{runtime}=await runtimePromise,b=captureBaseline(runtime,legacy);
  for(const mutate of [
    x=>x.levels[0].level.reward++,
    x=>x.levels[186].metadata.timeSeconds=300,
    x=>x.levels[186].starTargets.moveTarget++,
    x=>x.levels[186].sha256='0'.repeat(64),
    x=>x.formalIds.push(187),
  ]){const changed=structuredClone(b);mutate(changed);assert.throws(()=>assertBaselineUnchanged(runtime,changed,[187]));}
  for(const id of [1,37,95]){
    const levels=structuredClone(runtime.LEVELS);levels[id-1].name+=' changed';
    assert.throws(()=>assertBaselineUnchanged({...runtime,LEVELS:levels},b,[187]),/Out-of-batch/);
  }
  const altered=structuredClone(b);altered.levels[186].level.reward++;
  altered.levels[186].sha256=digest(altered.levels[186].level);
  assert.throws(()=>assertBaselineUnchanged(runtime,altered,[187]),/pinned legacy campaign/);
});

test('formalization retains actual time/stars/reward, drops candidate preview metadata and retired geometry',async()=>{
  const{runtime}=await runtimePromise,b=captureBaseline(runtime,legacy),old=b.levels[186];
  const candidate=structuredClone(raw);candidate.level.timeSeconds=300;candidate.level.parMoves=1;
  candidate.level.reward=99999;candidate.level.hint='invalid-old-block';candidate.level.designTargets={minimumRepositionOverhead:999};
  const level=formalLevelFromBaseline(candidate,old);
  assert.equal(level.timeSeconds,old.metadata.timeSeconds);assert.equal(level.reward,old.metadata.reward);
  assert.equal(level.name,old.metadata.name);assert.equal(level.parMoves,old.starTargets.moveTarget);
  assert.deepEqual(runtime.levelStarTargets(level),old.starTargets);
  assert(!Object.hasOwn(level,'designTargets'));assert(!Object.hasOwn(level,'hint'));
  assert.deepEqual(level.blocks,raw.level.blocks);
});

test('v1.11 typed emitter retains every inherited value and validates actual BlockSpec fields',()=>{
  const layouts={...structuredClone(legacy.layouts),187:raw.level};
  // Runtime layout contains only gameplay fields. This is deliberately not a
  // production candidate; test the emitter rejecting unexpected level metadata.
  assert.throws(()=>emitContinuationSource(layouts),/typecheck/);
  const proper=structuredClone(legacy.layouts);proper[187]=Object.fromEntries(Object.entries(raw.level)
    .filter(([k])=>['mechanismRules','width','height','playable','blocked','seams','gates','blocks','flipDoors','coloredGrids','bombFailurePolicy','shutters','generators','elevators','conveyors'].includes(k)));
  const good=emitContinuationSource(proper);
  assert(good.runtimeObjectsDeepEqual);assert.equal(good.metadata.length,2);assert(good.source.includes('satisfies BlockSpec'));
  for(const change of [
    x=>x[138].blocks.find(b=>b.generatorId).generatorId='wrong',
    x=>x[138].generators[0].queueBlockIds.push('r138-q0'),
    x=>x[187].blocks[0].x='bad',
    x=>x[187].blocks[0].unknownProperty=true,
    x=>x[187].blocks[0].generatorId='r138-machine',
  ]){const x=structuredClone(proper);change(x);assert.throws(()=>emitContinuationSource(x));}
});

test('real reviewed Lv187 produces immutable schema2 artifacts and independently passes prepared replay',async()=>{
  assert.equal(sha(ITEM.path),ITEM.sha256);assert.equal(sha(ITEM.sourceReview.path),ITEM.sourceReview.sha256);
  const f=await preparedFixture(),a=f.archive;
  assert.equal(a.schemaVersion,2);assert.equal(a.ruleVersion,'1.11.0');
  assert.deepEqual(a.inheritedRows,legacy.archive.rows);assert.equal(a.inheritedRows.length,63);
  assert.deepEqual(a.rows.map(r=>r.levelId),[187]);assert.equal(a.rows[0].exactMatch,false);
  assert(a.rows[0].approvedDifferences.length);assert.deepEqual(a.rows[0].designPolicy,raw.designPolicy);
  assert.equal(a.expectedContinuationIds.length,64);
  const v=await verifyContinuationBatchV111(f.result.archivePath,f.result.archiveSha256,{applied:false});
  assert.equal(v.status,'passed-prepared-not-applied');assert.equal(v.rows[0].formalReplay.complete,true);
  assert.equal(v.inheritedEvidenceVersion,'1.10.0');assert.equal(v.pointerValidated,false);
  assert.equal(v.naturalClockValidated,false);assert.equal(v.lowerBoundCertified,false);
  assert.equal(sha(DATA_PATH),productionBefore);assert.equal(sha(LEGACY_ANCESTOR.path),ancestorBefore);
  await assert.rejects(verifyContinuationBatchV111(f.result.archivePath,f.result.archiveSha256),/applied\/before/);
  await assert.rejects(prepareContinuationBatchV111(f.batchPath,path.dirname(f.result.archivePath)),/Never overwrite/);
});

test('tampered evidence, inherited rows, baseline, deltas, routes and old metadata fail closed',async()=>{
  const f=await preparedFixture();
  await assert.rejects(verifyContinuationBatchV111(f.result.archivePath,'0'.repeat(64),{applied:false}),/Evidence drift/);
  let n=0;
  for(const change of [
    a=>a.inheritedRows[0].drags.push({forged:true}),
    a=>a.legacyAncestor.sha256='0'.repeat(64),
    a=>a.baseline.levels[0].level.name='forged',
    a=>a.rows[0].designPolicy.differences=[],
    a=>a.rows[0].approvedDifferences=[],
    a=>a.rows[0].drags=[],
    a=>a.rows[0].previous.metadata.timeSeconds=300,
    a=>a.expectedDataSha256='0'.repeat(64),
    a=>a.emission.metadata[0].generatorId='wrong',
    a=>a.patch.sha256='0'.repeat(64),
    a=>a.pointerValidated=true,
  ]){
    const a=structuredClone(f.archive);change(a);const p=path.join(f.dir,`tampered-${n++}.json`);
    fs.writeFileSync(p,JSON.stringify(a),{flag:'wx'});
    await assert.rejects(verifyContinuationBatchV111(p,sha(p),{applied:false}));
  }
  assert.equal(sha(DATA_PATH),productionBefore);
});

test('duplicate IDs, original formal replacements, v1.10 labels and unknown candidates cannot prepare',async()=>{
  const f=await preparedFixture();let n=0;
  for(const batch of [
    {ruleVersion:'1.10.0',rows:[ITEM]},
    {ruleVersion:'1.11.0',rows:[ITEM,ITEM]},
    {ruleVersion:'1.11.0',rows:[{...ITEM,levelId:37}]},
    {ruleVersion:'1.11.0',rows:[{...ITEM,sha256:'0'.repeat(64)}]},
    {ruleVersion:'1.11.0',rows:[{...ITEM,sourceReview:{...ITEM.sourceReview,sha256:'0'.repeat(64)}}]},
  ]){
    const p=path.join(f.dir,`invalid-batch-${n++}.json`);fs.writeFileSync(p,JSON.stringify(batch),{flag:'wx'});
    await assert.rejects(prepareContinuationBatchV111(p,path.join(f.dir,`invalid-output-${n}`)));
  }
  assert.equal(sha(DATA_PATH),productionBefore);assert.equal(sha(ITEM.path),ITEM.sha256);
});
