import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadSpatialApi,searchSpatial} from '../remake201to210-v123-floor.mjs';
import {loadContinuationRuntime,sha256,modelBinding} from '../continuation211-runtime.mjs';
import {proveSymmetric} from './prove-symmetric.mjs';
const out='deliverables/continue211-220-20260930/design220-new';
const api=await loadSpatialApi(),core=await loadContinuationRuntime(),qualified=[];
for(let mode=0;mode<4;mode++){
 const level={id:92350+mode,name:'lift permutation qualification',mechanismRules:'revised-2026-09-27-v1.5',difficulty:'easy',width:3,height:3,timeSeconds:90,reward:0,gates:[{id:'gate-r',color:'red',side:'top',offset:0,size:3},{id:'gate-b',color:'blue',side:'right',offset:0,size:3,...(mode&1?{frozen:2}:{})}],shutters:[{id:'lift',x:0,y:2,width:2,height:1,count:0,skin:'lift'}],blocks:[{id:'a',x:0,y:2,shape:[[0,0]],color:'red'},{id:'b',x:1,y:2,shape:[[0,0]],color:'red'},{id:'hidden',x:0,y:2,shape:[[0,0],[1,0]],color:'red',shutterId:'lift',...(mode&2?{layers:['blue','red']}:{})}]};
 for(let floor=1;floor<=3;floor++){const full=searchSpatial(level,api,{floor,prove:true,maxMilliseconds:4000,maxStates:100000}),symmetric=proveSymmetric(level,api,{floor,maxMilliseconds:4000,maxStates:100000});assert(['threshold-proven','relaxed-shortcut'].includes(full.status));assert.equal(full.status,symmetric.status);assert.equal(full.cost,symmetric.cost);qualified.push({mode,floor,status:'PASS',exact:full.status,cost:full.cost});}
}
fs.writeFileSync(out+'/lift-symmetry-qualification.json',JSON.stringify({status:'PASS',cases:qualified,method:'Same non-pose/non-ID block rules imply identical physical behavior. Permuting pose/stage/removal preserves occupied union and every lift vacancy/reveal condition, including real reveal clear-count and later ice aging. Full inventory and optional-exit transitions retained; no clear normalization.'},null,2));
const file='deliverables/continue211-220-20260930/design212-new/source213/scored-candidate213-2.json',data=JSON.parse(fs.readFileSync(file));
const proof=proveSymmetric(data.level,api,{floor:11,maxMilliseconds:6000,maxStates:150000});
const report={inputFile:file,levelSha256:sha256(data.level),modelBinding:modelBinding(),qualification:out+'/lift-symmetry-qualification.json',proof,shortcutReplay:proof.drags?core.replayRevisedRoute(data.level,proof.drags):null};
fs.writeFileSync(out+'/symmetry-bound-213-2.json',JSON.stringify(report,null,2));console.log({status:proof.status,cost:proof.cost,states:proof.exploredStates,elapsed:proof.elapsedMilliseconds,shortcutReplay:report.shortcutReplay});
