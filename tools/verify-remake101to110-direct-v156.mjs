// Only the two exact maps accepted by the user in immutable v1.56.
// This verifies adoption gates, never certifies the original L16 difficulty.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {loadApi,BASELINE,ROOT,ruleGate,baseline,auditSpatial,digest,save} from './remake101to110-v146.mjs';
import {verifySource101to104} from './verify-source101to104-v147.mjs';
import {verifySource as verifySource107to110} from './verify-source107to110-v147.mjs';
import {verifyMechanisms} from './verify-remake101to110-v147.mjs';
import {verifyDecisions} from './review-remake101to110-decisions-v147.mjs';
import {measureRoute} from './remake21to30-quality.mjs';
import {loadSpatialApi,compileSpatial,replayDomain} from '../deliverables/remake101-110-v146-20260924/pipeline/spatial-star-domain.mjs';
import {collectBindings} from './remake91to100-bindings.mjs';

export const ACCEPTED=Object.freeze({
 102:{levelSha256:'fc882d6b835fae8660c80892fa9e6a4731adb6218d1f8aced4a7e10e829e93cc',upperBound:15},
 109:{levelSha256:'06cf62ddca3b3c5e4e21998030d322ed0d31889ad909485639c9712419fa070c',upperBound:13}
});
export async function verifyCandidate(data,api,b=baseline()){
 const lock=ruleGate();assert(['1.56.0','1.57.0'].includes(lock.activeVersion));
 const {level,drags}=data,accepted=ACCEPTED[level.id];assert(accepted,'Only102/109 have this direct-adoption authorization');
 assert.equal(digest(level),accepted.levelSha256,'A different map cannot use this authorization');
 const spatial=auditSpatial(level,api,b);assert(spatial.passed);
 const source=level.id===102?verifySource101to104(level):verifySource107to110(level,api);assert(source.passed);
 const replay=api.replayRevisedRoute(level,drags);assert(replay.valid&&replay.complete,replay.error);assert.equal(replay.nonClearingDrags,accepted.upperBound);
 const decisions=verifyDecisions(data,api),mechanisms=verifyMechanisms(data,api),measurement=measureRoute(level,drags,api);
 if(level.gates.some(g=>g.frozen)||level.blocks.some(b=>b.frozen))assert(decisions.earlyIceChoices.length,'Need actual ice constraint');
 const full=await loadSpatialApi(),fullDomainReplay=replayDomain(compileSpatial(level,full),drags,full);assert(fullDomainReplay.complete);
 return{id:level.id,status:'PASS',scope:'NON_DIFFICULTY_GATES_WITH_USER_AUTHORIZATION',activeVersion:lock.activeVersion,
  levelSha256:digest(level),routeSha256:digest(drags),spatial,source,replay,fullDomainReplay,measurement,decisions,mechanisms,
  acceptanceMode:'USER_ACCEPTED_BELOW_ORIGINAL_BAND',acceptedByUser:true,authorizationDocument:'docs/mechanism-rules-v1.56.0.md',
  originalDifficultyBandValidated:false,originalLowerBound:16,originalLowerBoundStatus:'NOT_MET',
  floor:{status:'USER_ACCEPTED_BELOW_ORIGINAL_BAND',floor:16,thresholdProven:false,searchExecuted:false},
  lowerBoundValidated:false,certifiedLowerBound:null,completeRouteUpperBound:accepted.upperBound,
  pointerValidated:false,formalAdopted:false,humanBlindTested:false,releaseApproved:false};
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
 const files=process.argv.slice(2);assert(files.length);const {api,inputs}=await loadApi(),b=baseline();
 const bindings=collectBindings([...inputs,...files,BASELINE,'docs/rules/manifest.json','docs/mechanism-rules-v1.56.0.md','docs/mechanism-rules-v'+ruleGate().activeVersion+'.md','tools/verify-remake101to110-direct-v156.mjs']);
 const rows=[];for(const file of files)rows.push({file,...await verifyCandidate(JSON.parse(fs.readFileSync(file)),api,b)});
 for(const [file,h] of Object.entries(bindings))assert.equal(digest(fs.readFileSync(file)),h,'Input changed during direct verification: '+file);
 const out=save(ROOT+'/direct-validation-v156-'+Date.now()+'.json',{status:'PASS',scope:'USER_AUTHORIZED_ADOPTION_GATES',activeVersion:ruleGate().activeVersion,bindings,rows});
 console.log(JSON.stringify({out,rows:rows.map(r=>({id:r.id,U:r.completeRouteUpperBound,acceptanceMode:r.acceptanceMode,originalL16:'NOT_MET'}))}));
}
