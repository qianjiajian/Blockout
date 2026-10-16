import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {levelSha256,routeSha256,independentReplay} from '../formal-v2/contract.mjs';
import {designFingerprints} from '../formal-v3/bounded-proof.mjs';
import {compareLayouts} from '../formal-v3/diversity.mjs';
import {loadV4Runtime} from './runtime.mjs';

const sha=b=>createHash('sha256').update(b).digest('hex');
const root='deliverables/daily-formal-v3-20261008';
const previousIndex=`${root}/selection/macro-fixed64-03-selected/index.json`;
const selectedIndex='deliverables/daily-formal-v4-20261008/selection/merged-116-v1/index.json';
const runtime=await loadV4Runtime();
const previousBytes=await fs.readFile(previousIndex),selectedBytes=await fs.readFile(selectedIndex);
const previous=JSON.parse(previousBytes),index=JSON.parse(selectedBytes);
assert.equal(previous.files.length,150);assert.equal(index.files.length,116);
const selected=await Promise.all(index.files.map(async file=>JSON.parse(await fs.readFile(file))));
const retained=new Set(selected.map(r=>r.historicalProof.path));
const rows=[];
for(const file of previous.files.filter(file=>!retained.has(file))){
 const bytes=await fs.readFile(file),old=JSON.parse(bytes),baseBytes=await fs.readFile(old.baseInputFile),base=JSON.parse(baseBytes);
 assert.equal(sha(baseBytes),old.baseInputFileSha256);assert(base.accepted);
 assert.equal(levelSha256(base.level),old.baseLevelSha256);assert.equal(routeSha256(base.drags),old.baseRouteSha256);
 const replay=independentReplay(runtime,base.level,base.drags,{timeSchedule:base.timeSchedule});
 assert(replay.valid&&replay.complete&&!replay.failed);
 const fingerprints=designFingerprints(base.level),identity=levelSha256({shapeSha256:fingerprints.shapeSha256,colorSha256:fingerprints.colorSha256});
 const identityFile=`${root}/proof/attempts/identities/${identity}.json`;
 const identityBytes=await fs.readFile(identityFile),record=JSON.parse(identityBytes);
 const resultFile=`${root}/proof/attempts/${record.origin}.result.json`;
 const result=await fs.readFile(resultFile).then(JSON.parse).catch(()=>null);
 const blockedFile=`${root}/proof/attempts/identities/${identity}.blocked.json`;
 const blocked=await fs.readFile(blockedFile).then(JSON.parse).catch(e=>{if(e.code==='ENOENT')return null;throw e;});
 const nearest=selected.map(r=>({id:r.formalId,...compareLayouts(base.level,r.level)})).sort((a,b)=>b.footprintSimilarity-a.footprintSimilarity)[0];
 const reasons=[];
 if(blocked)reasons.push('historical-physical-identity-failed-do-not-retry');
 if(!result?.accepted)reasons.push('historical-base-identity-not-accepted');
 if(nearest.footprintSimilarity>.75)reasons.push('too-similar-to-selected-layout');
 rows.push({oldFormalId:old.formalId,difficulty:old.difficulty,sourceLevelId:old.sourceLevelId,
  originalReceipt:{path:file,sha256:sha(bytes)},base:{path:old.baseInputFile,sha256:sha(baseBytes),
   levelSha256:levelSha256(base.level),routeSha256:routeSha256(base.drags),U:replay.nonClearingDrags},
  identity,identityFile,resultFile,blockedFile:blocked?blockedFile:null,nearest,reasons,
  eligibleForMechanismConstructionReview:!reasons.length,formalReady:false});
}
const output='deliverables/daily-formal-v4-20261008/design/unselected-base-inventory';
await fs.mkdir(output,{recursive:false});
await fs.writeFile(`${output}/report.json`,JSON.stringify({status:'READ_ONLY_RETIRED_BASIC_BASE_REVIEW',
 policyRuleVersion:runtime.policyRuleVersion,mathToolchainSha256:runtime.toolchainSha256,
 inputs:[{path:previousIndex,sha256:sha(previousBytes)},{path:selectedIndex,sha256:sha(selectedBytes)}],
 count:rows.length,eligible:rows.filter(r=>r.eligibleForMechanismConstructionReview).length,
 byDifficulty:[1,2,3].map(d=>({difficulty:d,count:rows.filter(r=>r.eligibleForMechanismConstructionReview&&r.difficulty===d).length})),
 rows,newSearches:0,formalReady:false,productionChanged:false},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({count:rows.length,eligible:rows.filter(r=>r.eligibleForMechanismConstructionReview).length,output}));
