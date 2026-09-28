import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadApi} from '../../../remake141to150-v173.mjs';
import {digest} from '../../../revised-preview-validation-v160.mjs';
import {auditHiddenCoverage} from '../../../revised-hidden-coverage.mjs';
import {check141Floor,project141} from '../round2-root/floor141.mjs';
import {check143Floor,project143} from '../round2-root/floor143.mjs';
import {check145Floor} from '../round2-root/floor145.mjs';
import {check147Floor} from '../round2-root/floor147.mjs';

// Independent read-only review. This script does not alter any candidate,
// production object, shared proof implementation, or previous certificate.
const OUT='deliverables/remake31-200-v145-20260924/batches/lv141-150/round2-b';
const {api}=await loadApi();
const reviewedFiles=[
 'tools/remake141to150-v173.mjs',
 ...[141,143,145,147].map(id=>`tools/campaign-v145/lv141-150/round2-root/floor${id}.mjs`),
 'tools/campaign-v145/lv131-140/agent139-140/axis128-masked-prefix-floor.mjs',
 'tools/campaign-v145/lv131-140/agent139-140/axis128-graph.mjs',
 'tools/remake111to120-spatial-floor-v147.mjs',
 'tools/remake121to130-bomb-replay-v172.mjs',
 'tools/revised-hidden-coverage.mjs',
 'src/core/PuzzleModel.ts',
];
const candidates={
 141:{level:api.LEVELS[140]},
 143:{level:api.LEVELS[142]},
 145:JSON.parse(fs.readFileSync('deliverables/remake31-200-v145-20260924/batches/lv141-150/round2-root/reviewed145-1790479254799.json')),
 147:JSON.parse(fs.readFileSync(`${OUT}/enriched147-final-1790478612861.json`)),
};
const checks={141:check141Floor,143:check143Floor,145:check145Floor,147:check147Floor};
const controls=[];
for(const id of [141,143,145,147]){
 const level=candidates[id].level;
 const inventory=auditHiddenCoverage(level);assert(inventory.passed);
 for(const options of [{maxStates:1,maxMilliseconds:1000},{maxStates:100000,maxMilliseconds:0}]){
  const r=checks[id](level,api,options);assert.equal(r.thresholdProven,false);assert(['unknown','unsupported'].includes(r.status));
  controls.push({id,options,result:r});
 }
}
function rejects(name,fn){let error;try{fn();}catch(e){error=e.message;}assert(error,name);controls.push({name,rejected:true,error});}
{
 const l=structuredClone(candidates[141].level);l.blocks.find(b=>b.lockedBy).lockCount=3;
 rejects('141 rejects substituted lock count',()=>project141(l,api));
}
{
 const l=structuredClone(candidates[141].level),lift=l.shutters.find(s=>s.skin==='lift');lift.x=-1;
 rejects('141 rejects lift outside covering curtain',()=>project141(l,api));
}
{
 const l=structuredClone(candidates[143].level);l.shutters[0].count=18;
 rejects('143 rejects early reveal',()=>project143(l,api));
}
{
 const l=structuredClone(candidates[143].level);l.generators[0].spawn=[0,0];
 rejects('143 rejects FIFO footprint outside real cover',()=>project143(l,api));
}
{
 const l=structuredClone(candidates[145].level);l.shutters[0].count=9;
 rejects('145 rejects wrong prefix boundary',()=>check145Floor(l,api,{maxStates:1}));
}
{
 const r=check147Floor(candidates[147].level,api,{floor:4,maxStates:1,maxMilliseconds:100});
 assert.equal(r.thresholdProven,false);assert.equal(r.status,'unsupported');controls.push({name:'147 rejects other floor',result:r});
}
const report={
 passed:true,scope:'read-only proof audit; not a replacement candidate certificate',createdAt:new Date().toISOString(),ruleVersion:'1.73.0',
 reviewedFiles:Object.fromEntries(reviewedFiles.map(p=>[p,digest(fs.readFileSync(p))])),
 candidates:Object.fromEntries(Object.entries(candidates).map(([id,d])=>[id,{levelSha256:digest(d.level)}])),
 controls,
 conclusions:[
  {id:141,verdict:'No current false-PASS defect found',reason:'The full gate checks hidden-member containment and filling. Curtain8 excludes the nested lift and three hidden keys. The one visible key cannot unlock lock4. Replacing that lock by ice8 preserves immobility before clear8; the prefix graph keeps the real curtain mask.'},
  {id:143,verdict:'No current false-PASS defect found',reason:'Both fixed FIFO footprints stay inside curtain19 before the stopping event. Deleting unreachable stock is used only for this prefix, not as a complete-level proof. The public entry additionally replays each prefix unit step through both true and projected models.'},
  {id:145,verdict:'No current false-PASS defect found',reason:'Only bomb deadlines are removed; physical bodies and shells remain. Every timed win is also a relaxed spatial win and must pass clear10 while the real curtain mask is retained. Timed complete input remains a separate requirement.'},
  {id:147,verdict:'No current false-PASS defect found',reason:'All46 labeled bodies and real lift reveal states remain; no identity quotient or forced-removal normalization is applied. Search includes every generated gesture of cost below5, handles cheaper revisits, and proves the threshold only on frontier exhaustion.'},
 ],
 costReview:'Clear/peel gestures cost0 and non-clearing spatial gestures cost1. Optional exits add choices. Any exit-sweep relaxation adds possible paths, so a lower bound from exhausting this supergraph remains conservative; full witness replay is checked in PuzzleModel.',
 nonBlockingHardening:[
  {file:'tools/remake141to150-v173.mjs',line:75,detail:'The native proof-qualification envelope verifies the supplied file hash and supplied bindings, but does not parse the report passed flag or require a complete known set of backend/dependency bindings. Current146/148 qualifications were independently rerun, so this is not a defect in the current certificates. A future reusable gate should reject arbitrary failed/unrelated qualification files and empty/incomplete bindings.'},
  {file:'tools/campaign-v145/lv141-150/round2-root/floor147.mjs',line:6,detail:'maxStates and maxMilliseconds are not validated as finite positive integers. Current entry supplies valid finite constants, so current execution is bounded. A reusable entry could reject NaN/Infinity rather than allowing disabled budget comparisons.'},
 ],
 sharedFilesModified:false,candidatesModified:false,oldEvidenceModified:false,
};
const file=`${OUT}/root-prefix-audit-${Date.now()}.json`;
fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({file,passed:true,controls:controls.length,blockingIssues:0,nonBlockingHardening:report.nonBlockingHardening.length}));
