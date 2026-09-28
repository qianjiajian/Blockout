import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {digest} from './revised-preview-validation-v160.mjs';
import {loadRemakeApi,formalFromOriginal,checkOriginalCandidate,assertRemakeBaseline,REMAKE_IDS} from './revised-original-remake-v112.mjs';

// Materialize a NEW final candidate, retaining every historical artifact. Only
// two known main-agent validation/metadata fixes are eligible for revalidation;
// any construction, geometry, runtime-model, artwork or rule drift still fails.
const [pathsFile,baselinePath,output]=process.argv.slice(2);
const read=p=>JSON.parse(fs.readFileSync(p,'utf8')),sha=p=>digest(fs.readFileSync(p));
const allowedUpdates=new Set(['tools/revised-original-remake-v112.mjs','src/core/revisedContinuationLevels.ts']);
const {api}=await loadRemakeApi(),baseline=read(baselinePath);
assertRemakeBaseline(baseline,api,{current:true});
const paths=read(pathsFile),candidates=paths.map(p=>({p,raw:read(p)})).sort((a,b)=>a.raw.level.id-b.raw.level.id);
assert.deepEqual(candidates.map(r=>r.raw.level.id),REMAKE_IDS);
fs.mkdirSync(output,{recursive:true});const rows=[];
for(const {p,raw} of candidates) {
  const originalGeometrySha256=digest(raw.level),originalRouteSha256=digest(raw.drags),updates=[];
  for(const [file,binding] of Object.entries(raw.bindings)) {
    const expected=typeof binding==='string'?binding:binding.sha256,actual=sha(file);
    if(actual===expected.toLowerCase())continue;
    assert(allowedUpdates.has(file),`Unapproved input drift ${file}`);
    updates.push({path:file,oldSha256:expected,newSha256:actual,reason:'Main-agent v1.12 verifier and scoped legacy tutorial fixes; new independent full validation follows'});
    raw.bindings[file]=actual;
  }
  raw.bindings[p]=sha(p);
  raw.bindings['tools/stage-original-remake-v112.mjs']=sha('tools/stage-original-remake-v112.mjs');
  raw.bindings['tools/revised-original-remake-v112.mjs']=sha('tools/revised-original-remake-v112.mjs');
  raw.finalStage={priorPath:p,priorSha256:sha(p),inputUpdates:updates,originalGeometrySha256,originalRouteSha256};
  const formal=formalFromOriginal(raw,baseline.levels[raw.level.id-1].level,api);
  const result=checkOriginalCandidate(raw,api,{level:formal});
  assert.equal(digest(raw.level),originalGeometrySha256);assert.equal(digest(raw.drags),originalRouteSha256);
  raw.finalStage.validation={passed:true,formalSha256:digest(formal),drags:result.timed.effectiveDrags,
    modelSeconds:result.timed.activeElapsedSeconds,pointerValidated:false,naturalClockValidated:false};
  const target=path.posix.join(output,`candidate-${raw.level.id}.json`);
  fs.writeFileSync(target,JSON.stringify(raw,null,2)+'\n',{flag:'wx'});
  rows.push({levelId:raw.level.id,path:target,sha256:sha(target),updates});
  console.log(`final staged Lv${raw.level.id}`);
}
fs.writeFileSync(path.join(output,'paths.json'),JSON.stringify(rows.map(r=>r.path),null,2)+'\n',{flag:'wx'});
fs.writeFileSync(path.join(output,'report.json'),JSON.stringify({ruleVersion:'1.12.0',rows},null,2)+'\n',{flag:'wx'});
