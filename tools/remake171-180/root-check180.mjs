import fs from 'node:fs';
import assert from 'node:assert/strict';
import {ROOT,digest,writeNew,ruleGate,auditSpatial} from './common.mjs';
import {loadApi,replay} from './replay.mjs';
import {replayTiming} from './observed-timing.mjs';
import {checkAxisFloor} from '../remake131to140-axis-floor-v172.mjs';
const file=ROOT+'/author178-180/native180-1790523293350.json';
const d=JSON.parse(fs.readFileSync(file)),l=d.level,{api,inputs}=await loadApi();
ruleGate();const spatial=auditSpatial(l,api),route=replay(l,d.drags,api,{complete:true,requirePointerCompatible:true});
assert.equal(l.id,180);assert.equal(l.blocks.length,23);assert.equal(l.flipDoors?.length??0,0);assert.equal(l.shutters?.length??0,0);assert.equal(l.generators?.length??0,0);
assert.deepEqual(l.gates.filter(g=>g.frozen).map(g=>[g.color,g.frozen]).sort(),[['red',2],['purple',4],['blue',6],['green',7],['cyan',7],['pink',7],['yellow',7]].sort());
const p=structuredClone(l);p.mechanismRules='revised-2026-09-23-v1.4';
const lower=checkAxisFloor(p,api,{floor:11,maxStates:150000,maxMilliseconds:12000});assert(lower.thresholdProven,JSON.stringify(lower));assert(route.nonClearingDrags<=15);
const pointer=[];
for(const dir of ['pointer-1790523528289-496x1078-61056','pointer-1790523529609-320x568-57932']){
 const reportFile=ROOT+'/'+dir+'/report.json',r=JSON.parse(fs.readFileSync(reportFile));assert.equal(r.status,'PASS');assert(r.candidateOnly);assert.deepEqual(r.currentWorkspaceDrift,[]);const row=r.rows[0];assert.equal(row.id,180);assert.equal(row.levelSha256,digest(l));assert.equal(row.routeSha256,digest(d.drags));
 const log=ROOT+'/'+dir+'/lv180-observed-timing.json';const timing=replayTiming(l,JSON.parse(fs.readFileSync(log)),api);assert(row.final.complete&&!row.final.failed);pointer.push({reportFile,sha256:digest(fs.readFileSync(reportFile)),log,timing});
}
const out=ROOT+'/root-check180-'+Date.now()+'.json';writeNew(out,{ruleVersion:ruleGate().activeVersion,file,levelSha256:digest(l),routeSha256:digest(d.drags),spatial,route,lower,projection:'No flips, timers or v1.5-dependent actions. v1.5-to-v1.4 independent JS spatial calculation has identical movement/ice/door semantics; current full model and every Pointer tick replayed separately.',pointer,remaining:'author detailed shape/color mapping, fresh domain qualification and 3 decision recoveries before formal ready',status:'SPATIAL_ROUTE_FLOOR_AND_CANDIDATE_POINTER_PASS_NOT_ADOPTED',bindings:Object.fromEntries(inputs.map(f=>[f,digest(fs.readFileSync(f))]))});console.log(JSON.stringify({out,L:11,U:route.nonClearingDrags,drags:d.drags.length,lower}));
