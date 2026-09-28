import fs from 'node:fs';
import assert from 'node:assert/strict';
import {api,save,hash,fileHash} from './common.mjs';
import {checkPlainQueueFloor,verifyPlainQueueRouteProjection} from './generator-plain127.mjs';
const input=process.argv[2],raw=JSON.parse(fs.readFileSync(input)),c=raw.candidate??raw,level=c.level;
const projection=verifyPlainQueueRouteProjection(level,c.search.drags,api);assert(projection.valid,projection.error);
const result=checkPlainQueueFloor(level,api,{floor:5,maxStates:3000000,maxMilliseconds:Number(process.argv[3]??60000)});
console.log(JSON.stringify({file:save('generator-floor127',{input,levelSha256:hash(level),projection,result,qualification:'Explicit Lv127 extension of full-inventory optional-spawn graph; all source inventory retained, fixed queues permit delaying but not deleting, reordering or changing cargo. Native current route constructively maps to relaxation. Runtime unchanged.',proofTools:['generator-floor127.mjs','generator-plain127.mjs','generator-domain127.mjs'].map(p=>({path:p,sha256:fileHash(`tools/campaign-v145/lv121-130/round3-b/${p}`)}))}),status:result.status,states:result.discoveredStates,cost:result.relaxedNonClearingDrags}));
