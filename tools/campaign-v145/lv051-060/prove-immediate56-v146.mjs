import fs from 'node:fs';
import {loadApi}from '../../remake21to30-v120.mjs';
import {digest}from '../../revised-preview-validation-v160.mjs';
import {checkImmediateGeneratorFloor,projectImmediateRoute}from './immediate-generator-floor56-v146.mjs';
const {api}=await loadApi();
for(const file of process.argv.slice(2)){const d=JSON.parse(fs.readFileSync(file)),proof=checkImmediateGeneratorFloor(d.level,api,{floor:16,maxStates:3000000,maxMilliseconds:Number(process.env.PROOF_MS??180000)}),projection=projectImmediateRoute(d.level,d.drags,api),out=`deliverables/remake31-200-v145-20260924/batches/lv051-060/agent55-57/immediate-proof56-${Date.now()}.json`;
 const report={sourceFile:file,sourceSha256:digest(fs.readFileSync(file)),levelSha256:digest(d.level),routeSha256:digest(d.drags),proof,projection,independentProofReviewPending:true,bindings:{tool:digest(fs.readFileSync('tools/campaign-v145/lv051-060/immediate-generator-floor56-v146.mjs')),tests:digest(fs.readFileSync('tests/campaign-v145/lv051-060/immediate-generator-floor56-v146.test.mjs'))}};
 fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({out,file,status:proof.status,states:proof.discoveredStates,lower:proof.floor,shortcut:proof.relaxedNonClearingDrags}));}
