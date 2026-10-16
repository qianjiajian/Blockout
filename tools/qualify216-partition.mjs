import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {loadSpatialApi,searchSpatial} from './continuation211-colored-witness.mjs';
import {coverPartitionLower,minimumToGoal} from './continuation211-partition-proof.mjs';
const api=await loadSpatialApi(),rows=[];
for(let mode=0;mode<16;mode++){
 const level={id:94216+mode,name:'partition-bound-qualification',mechanismRules:'revised-2026-09-27-v1.5',difficulty:'normal',width:3,height:3,timeSeconds:120,reward:0,gates:[{id:'gate-red',side:'top',offset:0,size:3,color:'red',...(mode&1?{frozen:2}:{})},{id:'gate-blue',side:'bottom',offset:0,size:3,color:'blue'}],shutters:[{id:'s',x:0,y:0,width:2,height:1,count:1+Number(!!(mode&2))}],blocks:[{id:'a',x:2,y:0,shape:[[0,0]],color:'blue'},{id:'b',x:0,y:2,shape:[[0,0]],color:'red'},{id:'c',x:1,y:2,shape:[[0,0]],color:'blue'},{id:'h1',x:0,y:0,shape:[[0,0]],color:'red',shutterId:'s',...(mode&4?{frozen:1}:{})},{id:'h2',x:1,y:0,shape:[[0,0]],color:'blue',shutterId:'s'}],...(mode&8?{coloredGrids:[{id:'floor',color:'blue',cells:[[1,1]]}]}:{})};
 const original=searchSpatial(level,api,{floor:8,prove:true,maxMilliseconds:5000,maxStates:100000,maxTransitions:1000000}),split=coverPartitionLower(level,api,{coverId:'s',maxMilliseconds:5000,maxCost:7});
 assert.equal(original.status,'relaxed-shortcut');assert.equal(split.prefix.status,'minimum-proven');assert.equal(split.hidden.status,'minimum-proven');assert(split.floor<=original.cost);rows.push({mode,originalMinimum:original.cost,prefix:split.prefix.minimum,hidden:split.hidden.minimum,floor:split.floor,status:'PASS'});
}
const OUT='deliverables/continue211-220-20260930/design216-new',p=JSON.parse(fs.readFileSync(OUT+'/original-10.json'));
const split=coverPartitionLower(p.level,api,{coverId:'cover',maxMilliseconds:6000,maxCost:5});
assert.equal(split.prefix.status,'minimum-proven');assert.equal(split.prefix.minimum,5);assert.equal(split.hidden.status,'threshold-proven');assert.equal(split.hidden.floor,6);assert.equal(split.floor,11);
const codeSha256=Object.fromEntries(['tools/continuation211-partition-proof.mjs','tools/continuation211-colored-witness.mjs','tools/continuation211-colored-proof.mjs','tools/qualify216-partition.mjs','src/core/PuzzleModel.ts','src/core/blockExitFrontier.ts'].map(f=>[f,createHash('sha256').update(fs.readFileSync(f)).digest('hex')]));
fs.writeFileSync(OUT+'/partition-qualification.json',JSON.stringify({status:'PASS',rows,codeSha256,theorem:split.theorem},null,2));
fs.writeFileSync(OUT+'/bound216-partition.json',JSON.stringify({status:'threshold-proven',floor:11,sourceLevelSha256:p.levelSha256,split,qualificationFile:OUT+'/partition-qualification.json',coloredQualificationFile:OUT+'/colored-qualification.json'},null,2));
console.log({status:'threshold-proven',floor:11,prefix:5,hidden:6,states:[split.prefix.exploredStates,split.hidden.exploredStates]});
