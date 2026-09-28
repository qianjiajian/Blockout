import test,{after}from'node:test';
import assert from'node:assert/strict';
import fs from'node:fs';
import path from'node:path';
import{digest,loadPreviewCore}from'./revised-preview-validation-v160.mjs';
import{formalCandidateForValidation,verifyContinuationBatchV111,DATA_PATH}from'./revised-continuation-joint-keys-v111.mjs';
import{replayTimedRoute}from'./revised-timed-route-v110.mjs';
const archivePath='.codex-temp/remaining98-v111/adoption-50/adoption.json';
const archiveSha='a804eb57cec0f3d312fff0918d504e7b31d18f9e906eb94f477e14388913ac9d';
const raw=JSON.parse(fs.readFileSync('.codex-temp/remaining147-v110/core-111-140/bomb120/candidate-120.json'));
const{api}=await loadPreviewCore();
const guards=[DATA_PATH,archivePath,'tools/revised-continuation-joint-stars-v111.mjs','tools/playtest-revised-formal-timed-joint-stars-v111.mjs','tools/revised-continuation-colored-grids-v111.mjs','tools/playtest-revised-formal-timed-colored-grids-v111.mjs','tools/revised-continuation-joint-keys-v111.mjs','tools/playtest-revised-formal-timed-joint-keys-v111.mjs','tools/revised-continuation-bombs-v111.mjs','tools/revised-continuation-families-v111.mjs','tools/revised-design-policy-families-v111.mjs','tools/revised-design-policy-bombs-v111.mjs','tools/revised-joint-key-cohorts-v111.mjs','tools/revised-design-review-joint-keys-v111.mjs','tools/revised-design-policy-joint-keys-v111.mjs','tools/revised-joint-key-cohorts-v111.test.mjs'];
const hashes=()=>Object.fromEntries(guards.map(p=>[p,digest(fs.readFileSync(p))]));const before=hashes();
const scratch=fs.mkdtempSync(path.resolve('.codex-temp/remaining98-v111/joint-key-adoption-tests-'));
after(()=>assert.deepEqual(hashes(),before,'No production or historical evidence writes'));
const text=p=>fs.readFileSync(p,'utf8').replaceAll('\r\n','\n').trimEnd()+'\n';
test('new formal Pointer driver is mechanically identical apart from tool and output names',()=>{
 const parent=text('tools/playtest-revised-formal-timed-colored-grids-v111.mjs');
 assert.equal(text('tools/playtest-revised-formal-timed-joint-keys-v111.mjs'),parent.replaceAll('colored-grids-v111','joint-keys-v111'));
});
test('new continuation changes only SELF, policy path and one exact historical emitter allowlist entry',()=>{
 const parent=text('tools/revised-continuation-colored-grids-v111.mjs');
 assert.equal(digest(fs.readFileSync('tools/revised-continuation-colored-grids-v111.mjs')),'0052ea338c48745f8fd84da2b1501de0627bc36a5e258d001988a7fd174f6a6e');
 let expected=parent.replaceAll('revised-continuation-colored-grids-v111.mjs','revised-continuation-joint-keys-v111.mjs').replaceAll('revised-design-policy-colored-grids-v111.mjs','revised-design-policy-joint-keys-v111.mjs');
 expected=expected.replace("  const jointStarWrapper='tools/revised-continuation-joint-stars-v111.mjs';\n","  const jointStarWrapper='tools/revised-continuation-joint-stars-v111.mjs';\n  const coloredGridWrapper='tools/revised-continuation-colored-grids-v111.mjs';\n")
 .replace('wrapper.path===SELF||wrapper.path===jointStarWrapper||','wrapper.path===SELF||wrapper.path===coloredGridWrapper||wrapper.path===jointStarWrapper||')
 .replace("  if(wrapper.path===jointStarWrapper)assert.equal(wrapper.sha256,'f09c018982b734c20e5c070bd146ce36ce57c1224bab88982c9d93c84a851973');","  if(wrapper.path===coloredGridWrapper)assert.equal(wrapper.sha256,'0052ea338c48745f8fd84da2b1501de0627bc36a5e258d001988a7fd174f6a6e');\n  if(wrapper.path===jointStarWrapper)assert.equal(wrapper.sha256,'f09c018982b734c20e5c070bd146ce36ce57c1224bab88982c9d93c84a851973');");
 assert.equal(text('tools/revised-continuation-joint-keys-v111.mjs'),expected);
});
test('exact pinned colored-grid emitter ancestry is independently accepted without rewriting it',async()=>{
 const verified=await verifyContinuationBatchV111(archivePath,archiveSha);
 assert.equal(verified.formalIds.length,132);assert.equal(verified.rows.length,50);
 assert(verified.rows.every(r=>r.formalReplay.complete));assert(!verified.pointerValidated&&!verified.naturalClockValidated);
});
test('formal bomb proof preserves events and rebinds only unchanged gameplay to original metadata',()=>{
 const formal={...structuredClone(raw.level),name:'Formal test metadata',timeSeconds:135};
 const proof=formalCandidateForValidation(raw,formal),oldEvents=structuredClone(raw.timedRoute.events);
 assert.equal(proof.timedRoute.levelSha256,digest(formal));assert.deepEqual(proof.timedRoute.events,oldEvents);
 assert.notEqual(proof.timedRoute.levelSha256,raw.timedRoute.levelSha256);
 const replay=replayTimedRoute(formal,proof.timedRoute,api,{expectedDrags:raw.drags});assert(replay.valid&&replay.complete&&replay.activeElapsedSeconds>0);
});
test('formal original deadline is enforced rather than replaying candidate 300 seconds',()=>{
 const formal={...structuredClone(raw.level),timeSeconds:.001},proof=formalCandidateForValidation(raw,formal);
 const replay=replayTimedRoute(formal,proof.timedRoute,api,{expectedDrags:raw.drags});assert(!replay.valid||!replay.complete);
});
test('a timer or gameplay change cannot hide behind metadata rehashing',()=>{
 for(const mutate of[l=>l.blocks.find(b=>b.timedBombSeconds).timedBombSeconds++,l=>l.blocks[0].x++,l=>l.gates[0].size++]){
  const formal=structuredClone(raw.level);mutate(formal);assert.throws(()=>formalCandidateForValidation(raw,formal));
 }
});
test('archived timed schedule, SHA, drags and original identity are all pinned',()=>{
 const row={drags:raw.drags,timedRoute:raw.timedRoute,timedRouteSha256:digest(raw.timedRoute)};
 for(const mutate of[r=>delete r.timedRoute,r=>r.timedRoute.events[0].dtSeconds+=1,r=>r.timedRouteSha256='0'.repeat(64),r=>r.drags.pop(),r=>r.timedRoute.levelSha256='0'.repeat(64)]){
  const changed=structuredClone(row);mutate(changed);assert.throws(()=>formalCandidateForValidation(raw,raw.level,changed));
 }
});
test('untimed historical rows remain exactly delegated',()=>{
 const a=JSON.parse(fs.readFileSync('.codex-temp/remaining98-v111/main/candidate-89-final.json')),formal={...a.level,timeSeconds:150};
 assert.deepEqual(formalCandidateForValidation(a,formal),{...a,level:formal});
});
test('invented historical emitter SHA is rejected',async()=>{
 const a=JSON.parse(fs.readFileSync(archivePath));a.emission.wrapper.sha256='0'.repeat(64);
 const p=path.join(scratch,'bad-emitter.json');fs.writeFileSync(p,JSON.stringify(a),{flag:'wx'});
 await assert.rejects(verifyContinuationBatchV111(p,digest(fs.readFileSync(p))),/AssertionError/);
});
