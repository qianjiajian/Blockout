import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {loadSpatialApi,searchSpatial} from '../remake201to210-v123-floor.mjs';
import {loadContinuationRuntime,sha256,modelBinding} from '../continuation211-runtime.mjs';
import {proveWithLifts} from './prove-after-lift.mjs';
const out='deliverables/continue211-220-20260930/design220-new',api=await loadSpatialApi(),core=await loadContinuationRuntime(),cases=[];
for(let mode=0;mode<8;mode++){
 const level={id:92400+mode,name:'post-lift-normalization',mechanismRules:'revised-2026-09-27-v1.5',difficulty:'easy',width:3,height:3,timeSeconds:90,reward:0,gates:[{id:'gate-r',color:'red',side:'top',offset:0,size:3,...(mode&1?{frozen:2}:{})},{id:'gate-b',color:'blue',side:'right',offset:0,size:3}],shutters:[{id:'lift',x:0,y:2,width:2,height:1,count:0,skin:'lift'},{id:'ordinary',x:0,y:0,width:2,height:1,count:2}],blocks:[{id:'a',x:0,y:2,shape:[[0,0]],color:'red'},{id:'b',x:1,y:2,shape:[[0,0]],color:'red'},{id:'lh',x:0,y:2,shape:[[0,0],[1,0]],color:'red',shutterId:'lift',...(mode&2?{layers:['blue','red']}:{})},{id:'oh',x:0,y:0,shape:[[0,0],[1,0]],color:'blue',shutterId:'ordinary',...(mode&4?{frozen:1}:{})}]};
 for(let floor=1;floor<=3;floor++){const full=searchSpatial(level,api,{floor,prove:true,maxMilliseconds:4000,maxStates:100000}),normalized=proveWithLifts(level,api,{floor,maxMilliseconds:4000,maxStates:100000,normalizeMonotone:true});assert(['threshold-proven','relaxed-shortcut'].includes(full.status));assert.equal(full.status,normalized.status);assert.equal(full.cost,normalized.cost);cases.push({mode,floor,status:'PASS',exact:full.status,cost:full.cost});}
}
const qualification={status:'PASS',cases,method:'All optional-exit transitions retained until every lift is actually revealed. Then the already qualified monotone ordinary-cover final-body normalization applies: no future lift can spawn any body, hidden reveal counts and frozen aging remain in full state, ordinary solid covers obey subset-occupancy monotonicity. Shell peeling is never normalized.',dependencies:[out+'/normalizer-qualification.json',out+'/lift-symmetry-qualification.json'],codeSha256:Object.fromEntries(['tools/regeneration220-design/prove-after-lift.mjs','tools/regeneration220-design/qualify-after-lift.mjs','tools/remake201to210-v123-floor.mjs'].map(p=>[p,createHash('sha256').update(fs.readFileSync(p)).digest('hex')]))};
fs.writeFileSync(out+'/after-lift-qualification.json',JSON.stringify(qualification,null,2));
const file='deliverables/continue211-220-20260930/design212-new/source213/scored-candidate213-7.json',data=JSON.parse(fs.readFileSync(file));
const proof=proveWithLifts(data.level,api,{floor:11,maxMilliseconds:6000,maxStates:150000,normalizeMonotone:true});
const report={inputFile:file,levelSha256:sha256(data.level),modelBinding:modelBinding(),qualification:out+'/after-lift-qualification.json',qualificationSha256:sha256(qualification),proof,shortcutReplay:proof.drags?core.replayRevisedRoute(data.level,proof.drags):null};
fs.writeFileSync(out+'/after-lift-bound-213-7.json',JSON.stringify(report,null,2));console.log({status:proof.status,cost:proof.cost,states:proof.exploredStates,elapsed:proof.elapsedMilliseconds,shortcutReplay:report.shortcutReplay});
