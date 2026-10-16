import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';

// Zero-search selection admission. Original accepted receipts and production
// registries stay byte-for-byte unchanged. This is not final 300 acceptance.
const root='deliverables/daily-formal-v4-20261008',bindings={};
const hash=b=>createHash('sha256').update(b).digest('hex');
const read=async(path,expected)=>{const b=await fs.readFile(path),h=hash(b);if(expected)assert.equal(h,expected,path);bindings[path]=h;return JSON.parse(b);};
const desc=path=>({path,sha256:bindings[path]});
const originalPath=root+'/selection/completed-basic-and-advanced-150-01/index.json';
const inputPath=root+'/selection/low-band-thirtytwo-advanced-01/index.json';
const actualPath=root+'/proof/low-band-thirtytwo-advanced-actual-independent-02/report.json';
const pointerPath=root+'/proof/low-band-thirtytwo-current-pointer-01/report.json';
const visualPath=root+'/proof/low-band-thirtytwo-current-pointer-01/root-visual-review.json';
const original=await read(originalPath,'ecb22b82c7a31575421df66369e8f4d22796d85ffb88ceff4c34abdd0d03ebdc');
const input=await read(inputPath,'b51e9978d5bac6674163d9f293c934dbf833c502255fbd817b0273264f55431b');
const actual=await read(actualPath,'3a49c5e7a1d760700ad7708017ec17ec3e9da7510f11619a51879f7288ddf049');
const pointer=await read(pointerPath,'36eed7132c885e29cb0cbc1bafebe5f602493aa26bf2e9d93361bba82e8cb3a8');
const visual=await read(visualPath,'eb82a24507c5955a05b9a45d79da42d9bd6ccf9d48813017b41f07068c6445c7');
assert.equal(actual.status,'INDEPENDENT_LOW_BAND_ADVANCED_BATCH_ACTUAL_PASS');assert.deepEqual(actual.errors,[]);
assert.equal(actual.realAddedAccepted,2);assert.equal(actual.combinedCandidates,152);assert(actual.originalSelectedBytePreserved);
assert.equal(actual.newSearches,0);assert.equal(actual.newConstructions,0);assert.equal(actual.newLedgerClaims,0);
assert.equal(pointer.status,'SELECTED_CANDIDATES_CURRENT_POINTER_RUNS_PASS');assert.equal(pointer.passed,4);
assert.deepEqual(pointer.selection,desc(inputPath));assert.deepEqual(visual.pointerReport,desc(pointerPath));
assert.equal(visual.status,'ROOT_TEN_CURRENT_POINTER_IMAGES_REVIEWED');assert(visual.rootActuallyOpenedEveryImage);
assert.equal(visual.images.length,10);assert.equal(visual.formal300Acceptance,false);
assert.equal(input.files.length,152);assert.deepEqual(input.files.slice(0,150),original.files);
const records=[],bands={1:0,2:0,3:0},groups={};
for(const [i,p]of input.files.entries()){
 const expected=actual.fileBindings[p]??actual.fileBindings[(await import('node:path')).resolve(p)];assert(expected,'Independent exact receipt binding required');
 const q=await read(p,expected);assert(q.accepted&&!q.qualificationOnly&&!q.formalReady);
 assert.equal(levelSha256(q.level),q.levelSha256);assert.equal(routeSha256(q.drags),q.routeSha256);
 bands[q.difficulty]++;groups[q.stageKey]??={1:0,2:0,3:0};groups[q.stageKey][q.difficulty]++;
 if(i>=150){
  const audited=actual.results.find(r=>r.file===p);assert(audited?.accepted);assert.equal(audited.sha256,bindings[p]);
  const runs=pointer.results.filter(r=>r.formalId===q.formalId);assert.equal(runs.length,2);
  assert.deepEqual(runs.map(r=>[r.viewport.width,r.viewport.height]),[[320,568],[496,1078]]);
  for(const run of runs){const r=await read(run.report.path,run.report.sha256);
   assert.equal(r.status,'CANDIDATE_CURRENT_UI_POINTER_NATURAL_TIME_PASS');assert.deepEqual(r.receipt,desc(p));
   assert(r.pointerValidated&&r.timeValidated&&r.settlementValidated);assert.equal(r.U,q.U);assert.equal(r.totalDrags,q.drags.length);
   assert.deepEqual(r.errors,[]);assert.deepEqual(r.storageViolations,[]);assert.equal(r.formalRegistryIdentity,false);
  }
 }
 records.push(q);
}
assert.equal(new Set(records.map(r=>r.formalId)).size,152);assert.deepEqual(bands,{1:81,2:52,3:19});
for(const group of Object.values(groups))for(const n of Object.values(group))assert(n<=10);
for(const image of visual.images){assert.equal(hash(await fs.readFile(image.path)),image.sha256);bindings[image.path]=image.sha256;}
const own='tools/daily-challenge/formal-v4/admit-reviewed-low-two-152.mjs';bindings[own]=hash(await fs.readFile(own));
for(const[p,h]of Object.entries(bindings))assert.equal(hash(await fs.readFile(p)),h);
const out=root+'/selection/completed-basic-and-advanced-152-01';await fs.mkdir(out,{recursive:false});
const audit={status:'ROOT_REVIEWED_152_SELECTION_ADMISSION_PASS',prior:desc(originalPath),input:desc(inputPath),independentActual:desc(actualPath),
 currentCandidatePointer:desc(pointerPath),actualImageReview:desc(visualPath),original150FilesAndOrderPreserved:true,receiptsModified:false,
 candidateCount:152,missing:148,bands,groups,inputBindings:bindings,newSearches:0,newLedgerClaims:0,productionChanged:false,formalReady:false};
const a=out+'/merge-audit.json';await fs.writeFile(a,JSON.stringify(audit,null,2)+'\n',{flag:'wx'});
const index={schemaVersion:4,scope:300,status:'PARTIAL_CANDIDATES_AWAITING_FINAL_ACCEPTANCE',files:input.files,
 priorIndex:originalPath,inputSelection:desc(originalPath),acceptedBatchIndex:desc(inputPath),independentActualAudit:desc(actualPath),
 mergeAudit:{path:a,sha256:hash(await fs.readFile(a))},candidateCount:152,missing:148,bands,groups,
 candidatePointerValidatedForNewEntries:true,formal300Acceptance:false,formalReady:false,productionChanged:false};
const p=out+'/index.json';await fs.writeFile(p,JSON.stringify(index,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({index:p,sha256:hash(await fs.readFile(p)),audit:a,auditSha256:hash(await fs.readFile(a)),candidates:152,bands,formalReady:false}));
