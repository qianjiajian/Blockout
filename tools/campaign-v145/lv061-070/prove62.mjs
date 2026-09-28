import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadApi,ruleGate,OUTPUT,writeNew,auditStructure} from './remake61to70-v146.mjs';
import {checkFullGeneratorFloor,verifyFullGeneratorRouteProjection} from './remake61to70-full-generator-floor-v146.mjs';
import {digest} from '../../revised-preview-validation-v160.mjs';
import {loadAdvancedFloorApi} from '../../campaign31-200-advanced-floor-v145.mjs';
import {checkAutomaticGeneratorFloor} from './automatic-generator-floor.mjs';
const rule=ruleGate(),{api}=await loadApi();
for(const file of process.argv.slice(2)){
 const data=JSON.parse(fs.readFileSync(file));assert.equal(data.level.id,62);auditStructure(data,api);
 const replay=api.replayRevisedRoute(data.level,data.drags);assert(replay.valid&&replay.complete);
 const projection=verifyFullGeneratorRouteProjection(data.level,data.drags,api);assert(projection.valid);
 const proof=process.env.FAST_AUTO==='1'?checkAutomaticGeneratorFloor(data.level,api,{floor:11,maxStates:500000,maxMilliseconds:60000}):process.env.ACTUAL_SPAWN==='1'?(await loadAdvancedFloorApi()).checkRevisedRepositionFloor(data.level,{floor:11,maxStates:50000,maxDragStates:10000,maxTransitions:20000000,maxMilliseconds:90000}):checkFullGeneratorFloor(data.level,api,{floor:11,maxStates:1500000,maxMilliseconds:90000});
 const out=`${OUTPUT}/checks/root-full-generator-62-${Date.now()}.json`;writeNew(out,{ruleVersion:rule.activeVersion,candidate:file,candidateSha256:digest(fs.readFileSync(file)),levelSha256:digest(data.level),routeSha256:digest(data.drags),proof,projection,replay,formalAdopted:false});
 console.log(JSON.stringify({out,file,status:proof.status,states:proof.exploredStates,termination:proof.termination,shortcut:proof.relaxedNonClearingDrags}));
}
