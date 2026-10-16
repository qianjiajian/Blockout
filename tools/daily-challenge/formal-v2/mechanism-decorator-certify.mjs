import fs from 'node:fs';
import { loadRuntime, verifyCandidate } from './contract.mjs';
import { decorate } from './mechanism-decorate.mjs';
const ROOT='deliverables/daily-formal-v2-20261007';
const OUT=`${ROOT}/mechanism-lab/decorator-certified-v1`;
fs.mkdirSync(OUT,{recursive:true});
const runtime=await loadRuntime(),rows=[];
const mechanisms=['frozen-exit','numeric-ice','axis-block','key-lock','star','colored-grid','flip-door','bomb','multilayer-shell','shutter','layered-lift','generator'];
const bases=[['stage1-d1-10-seed.json',1],['stage1-d2-10-seed.json',2],['nearby-b0-candidate-1.json',3]];
const lowerBudget={maxStates:150000,maxTransitions:1000000,maxMilliseconds:15000};
for(const [file,difficulty]of bases){
 const base=JSON.parse(fs.readFileSync(`${ROOT}/design-lab/${file}`)),level=structuredClone(base.level);
 level.id=base.sourceLevelId??level.id;if(level.id===880198)level.id=198;
 for(const mechanism of mechanisms){
  const decorated=await decorate(level,base.drags,mechanism,{runtime,difficulty,sourceLevelId:level.id,maxAttempts:24,idPrefix:`cert-d${difficulty}-${mechanism}`});
  const certified=decorated.ok?await verifyCandidate(runtime,decorated,{lowerBudget}):null;
  const evidencePath=`${OUT}/d${difficulty}-${mechanism}.json`;
  fs.writeFileSync(evidencePath,JSON.stringify({fixtureOnly:true,notCountedAsUniqueFormalSlot:true,decorated,certified},null,2)+'\n');
  const row={difficulty,mechanism,decorated:decorated.ok,status:certified?.status??'NO_COMPATIBLE_DECORATION',L:certified?.L,U:certified?.U,drags:certified?.drags.length,reasons:certified?.reasons??decorated.attempts,evidencePath};
  rows.push(row);fs.writeFileSync(`${OUT}/summary.json`,JSON.stringify({toolchainSha256:runtime.toolchainSha256,lowerBudget,fixtureOnly:true,rows},null,2)+'\n');
  console.log(JSON.stringify({difficulty,mechanism,status:row.status,L:row.L,U:row.U}));
 }
}
