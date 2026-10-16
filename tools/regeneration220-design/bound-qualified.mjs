import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadSpatialApi} from '../remake201to210-v123-floor.mjs';
import {loadContinuationRuntime,sha256,modelBinding} from '../continuation211-runtime.mjs';
import {proveSymmetric} from './prove-symmetric.mjs';
const out='deliverables/continue211-220-20260930/design220-new';
const qualification=JSON.parse(fs.readFileSync(out+'/normalizer-qualification.json'));
assert.equal(qualification.status,'PASS');
const api=await loadSpatialApi(),core=await loadContinuationRuntime();
for(const [id,file,floor] of [[215,'deliverables/continue211-220-20260930/design-new/qualified215.json',5],[220,out+'/candidate-proof-365.json',21]]){
 const data=JSON.parse(fs.readFileSync(file)),level=data.level,projection=data.projection??level;
 const proof=proveSymmetric(projection,api,{floor,maxMilliseconds:6000,maxStates:150000,normalizeMonotone:true});
 const report={status:proof.thresholdProven?'LOWER_BOUND_PROVEN':proof.status.toUpperCase(),inputFile:file,levelSha256:sha256(level),projectionSha256:sha256(projection),projectionRelation:data.projectionRelation??'identity',modelBinding:modelBinding(),qualificationFile:out+'/normalizer-qualification.json',qualificationSha256:sha256(qualification),proof,shortcutReplay:proof.drags?core.replayRevisedRoute(level,proof.drags):null,pointerValidated:false,timeValidated:false,releaseApproved:false};
 fs.writeFileSync(out+'/monotone-bound-'+id+'.json',JSON.stringify(report,null,2));
 console.log({id,status:proof.status,cost:proof.cost,states:proof.exploredStates,elapsed:proof.elapsedMilliseconds,levelSha256:report.levelSha256,projectionSha256:report.projectionSha256,shortcutReplay:report.shortcutReplay?{valid:report.shortcutReplay.valid,complete:report.shortcutReplay.complete,nonClearingDrags:report.shortcutReplay.nonClearingDrags}:null});
}
