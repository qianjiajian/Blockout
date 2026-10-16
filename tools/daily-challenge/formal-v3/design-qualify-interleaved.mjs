import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {loadBoundedRuntime} from './bounded-proof.mjs';
import {auditKnownInterleavedBlueprint} from './design-reverse-interleaved.mjs';
const root='deliverables/daily-formal-v3-20261008/design',out=`${root}/reverse-interleaved-qualification-01.json`;
if(fs.existsSync(out))throw Error('Preserve qualification evidence');
const runtime=await loadBoundedRuntime(),records=[];
const hash=path=>createHash('sha256').update(fs.readFileSync(path)).digest('hex');
for(const[source,file,count]of [[54,'nearband14-third/candidate-0073.json',2],[100,'hard-region-03/candidate-0040.json',3],[80,'unused-shared-01/candidate-0004.json',2]]){
 const path=`${root}/${file}`,packet=JSON.parse(fs.readFileSync(path));
 records.push({path,fileSha256:hash(path),sourceLevelId:source,...auditKnownInterleavedBlueprint(runtime,packet,{prefixClearCount:count})});
}
const tools=['design-qualify-interleaved.mjs','design-reverse-interleaved.mjs','design-reverse-interleaved.test.mjs','design-reverse-construction-factory.mjs','design-reverse-blueprint.mjs','reverse-route-audit.mjs'].map(x=>`tools/daily-challenge/formal-v3/${x}`);
fs.writeFileSync(out,JSON.stringify({status:'KNOWN_INTERLEAVED_INVERSE_QUALIFICATION_PASS',proofToolchainSha256:runtime.toolchainSha256,newSearches:0,oldInputsModified:false,
 toolBindings:tools.map(path=>({path,sha256:hash(path)})),records},null,2)+'\n');console.log(JSON.stringify({out,qualified:records.length,records:records.map(x=>({source:x.sourceLevelId,U:x.U,raw:x.rawDiscoveredStates,parkedInserted:x.stats.interleavedInsertedBodyParkingEdges}))}));
