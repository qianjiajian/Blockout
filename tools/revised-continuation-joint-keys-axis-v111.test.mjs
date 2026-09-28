import test from'node:test';import assert from'node:assert/strict';import fs from'node:fs';
import{digest,loadPreviewCore}from'./revised-preview-validation-v160.mjs';
import{formalLevelFromBaseline,formalCandidateForValidation}from'./revised-continuation-joint-keys-axis-v111.mjs';
import{checkCandidate}from'./revised-design-policy-joint-keys-axis-v111.mjs';
const old='tools/revised-continuation-joint-keys-v111.mjs',next='tools/revised-continuation-joint-keys-axis-v111.mjs',text=p=>fs.readFileSync(p,'utf8').replaceAll('\r\n','\n').trimEnd();
test('new wrapper is mechanically identical except SELF POLICY and exact prior emitter entry',()=>{
 assert.equal(digest(fs.readFileSync(old)),'e47cf5b142e48cf82fa66a6d954094ff1db2d0191b5db97678d1be58f9d80aab');
 let expected=text(old).replace("const SELF = 'tools/revised-continuation-joint-keys-v111.mjs';","const SELF = 'tools/revised-continuation-joint-keys-axis-v111.mjs';").replace("const POLICY = 'tools/revised-design-policy-joint-keys-v111.mjs';","const POLICY = 'tools/revised-design-policy-joint-keys-axis-v111.mjs';");
 expected=expected.replace("  const coloredGridWrapper='tools/revised-continuation-colored-grids-v111.mjs';","  const coloredGridWrapper='tools/revised-continuation-colored-grids-v111.mjs';\n  const jointKeysWrapper='tools/revised-continuation-joint-keys-v111.mjs';").replace('wrapper.path===SELF||wrapper.path===coloredGridWrapper||','wrapper.path===SELF||wrapper.path===jointKeysWrapper||wrapper.path===coloredGridWrapper||').replace('  if(wrapper.path===coloredGridWrapper)',"  if(wrapper.path===jointKeysWrapper)assert.equal(wrapper.sha256,'e47cf5b142e48cf82fa66a6d954094ff1db2d0191b5db97678d1be58f9d80aab');\n  if(wrapper.path===coloredGridWrapper)");
 assert.equal(text(next),expected);
});
test('new source adapter validates only new99 candidate, preserves original deadline/targets and completes',async()=>{
 const archivePath='.codex-temp/remaining98-v111/adoption-57/adoption.json',archiveBytes=fs.readFileSync(archivePath);assert.equal(digest(archiveBytes),'b429e28e0f5d9439717b2c414bd81253cd454a4e05253ae198a164bd5887802e');const archive=JSON.parse(archiveBytes);
 const candidatePath='.codex-temp/remaining98-v111/next99/candidate-99.json',sourcePath='.codex-temp/remaining98-v111/next99/source-review-99.json';
 const{api}=await loadPreviewCore(),checked=await checkCandidate({path:candidatePath,sha256:'4a9c9b6386d9da7ea4941eba54ba873210cbd251ca5a9a768a99cfaba2f3dd8c',levelId:99,sourceReview:{path:sourcePath,sha256:'a19b61057a839b5a6c3057e13d7cb662c244d78e2e50a391a4361567aeb6956c'}},api);
 assert(checked.checked.rulesPassed&&checked.checked.replay.complete&&checked.checked.art.passed);const row=archive.baseline.levels[98],formal=formalLevelFromBaseline(checked.raw,row);
 assert.equal(formal.timeSeconds,row.metadata.timeSeconds);assert.equal(formal.parMoves,row.starTargets.moveTarget);assert.equal(formal.reward,row.metadata.reward);
 const proof=formalCandidateForValidation(checked.raw,formal);assert.deepEqual(proof.drags,checked.raw.drags);assert(api.replayRevisedRoute(formal,proof.drags).complete);
 assert(!checked.checked.pointerReplayValidated&&!checked.checked.lowerBoundCertified&&!checked.checked.releaseApproved);
});
