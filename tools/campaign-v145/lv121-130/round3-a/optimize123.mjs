import fs from 'node:fs';
import assert from 'node:assert/strict';
import {verifyRulesLock} from '../../../verify-rules-lock.mjs';
import {digest} from '../../../revised-preview-validation-v160.mjs';
import {searchSpatial,loadSpatialApi} from '../../../../deliverables/remake101-110-v146-20260924/pipeline/spatial-star-domain.mjs';
import {save} from './author.mjs';
const lock=verifyRulesLock();assert(lock.ok,lock.errors.join('\n'));const api=await loadSpatialApi();
const input=process.argv[2],original=JSON.parse(fs.readFileSync(input,'utf8'));assert(original.proof.thresholdProven);
const began=Date.now(),attempts=[];let best=original.replay.nonClearingDrags;
for(let i=0;Date.now()-began<60000;i++){
 const weight=[1000,100,20,5][i%4],r=searchSpatial(original.level,api,{floor:Math.min(21,best),maxStates:100000,maxMilliseconds:2000,maxTransitions:2000000,weight,normalize:true,symmetry:true,orderSeed:Math.floor(i/4),diagnosticTrace:true});
 attempts.push({i,weight,status:r.status,cost:r.cost,clears:r.maxClearsSeen,elapsed:r.elapsedMilliseconds});
 if(r.status!=='witness')continue;const replay=api.replayRevisedRoute(original.level,r.drags);if(!replay.valid||!replay.complete)continue;best=replay.nonClearingDrags;
 const candidate={...original,optimizedFrom:{input,sha256:digest(fs.readFileSync(input)),originalU:original.replay.nonClearingDrags},drags:r.drags,replay,result:r,optimizationAttempts:attempts};const file=save('optimized123',candidate);console.log(JSON.stringify({file,U:best,proof:original.proof.status}));break;
}
console.log(JSON.stringify({file:save('optimize123-log',{ruleVersion:lock.activeVersion,input,attempts,best,elapsed:Date.now()-began})}));
