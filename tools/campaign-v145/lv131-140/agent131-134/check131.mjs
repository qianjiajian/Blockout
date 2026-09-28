import fs from 'node:fs';
import {verifyRulesLock} from '../../../verify-rules-lock.mjs';
import {digest} from '../../../revised-preview-validation-v160.mjs';
import {loadSpatialApi,searchSpatial} from '../../../../deliverables/remake101-110-v146-20260924/pipeline/spatial-star-domain.mjs';
const lock=verifyRulesLock();if(!lock.ok)throw Error(lock.errors.join('\n'));const file=process.argv[2],d=JSON.parse(fs.readFileSync(file)),api=await loadSpatialApi();
const replay=api.replayRevisedRoute(d.level,d.drags),proof=searchSpatial(d.level,api,{floor:5,maxStates:300000,maxMilliseconds:30000,prove:true,normalize:true,symmetry:true});
const out=`deliverables/remake131-140-v146-20260924/agent131-134/check131-${Date.now()}.json`;fs.writeFileSync(out,JSON.stringify({ruleVersion:lock.activeVersion,file,levelSha256:digest(d.level),replay,proof,pointerValidated:false,formalAdopted:false},null,2)+'\n');console.log(JSON.stringify({out,U:replay.nonClearingDrags,proof}));
