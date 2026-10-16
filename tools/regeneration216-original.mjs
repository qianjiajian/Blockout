import fs from 'node:fs';import assert from 'node:assert/strict';
import {loadSpatialApi,searchSpatial} from './continuation211-colored-witness.mjs';
import {loadContinuationRuntime,sha256} from './continuation211-runtime.mjs';
import {proveSymmetric} from './continuation211-colored-proof.mjs';
const OUT='deliverables/continue211-220-20260930/design216-new',base=JSON.parse(fs.readFileSync(OUT+'/mutation-1.json'));
assert.equal(JSON.parse(fs.readFileSync(OUT+'/colored-qualification.json')).status,'PASS');
const api=await loadSpatialApi(),core=await loadContinuationRuntime(),history=[];let n=0;
for(const left of ['yellow','orange'])for(const right of ['orange','yellow'])for(const change of [null,['h6','purple'],['h5','red'],['h0','green'],['h2','green'],['h11','purple'],['h9','pink'],['h7','red'],['h10','red'],['h1','green']]){
 const level=structuredClone(base.level);level.playable.push([2,6],[5,6]);level.playable.sort((a,b)=>a[1]-b[1]||a[0]-b[0]);
 level.blocks.push({id:'l216-new-neck-left',color:left,x:2,y:6,shape:[[0,0]]},{id:'l216-new-neck-right',color:right,x:5,y:6,shape:[[0,0]]});
 if(change)level.blocks.find(b=>b.id==='l216-'+change[0]).color=change[1];
 if(level.blocks.some((b,i)=>level.blocks.slice(i+1).some(a=>a.color===b.color&&a.shape.some(([x,y])=>b.shape.some(([dx,dy])=>Math.abs(a.x+x-b.x-dx)+Math.abs(a.y+y-b.y-dy)===1)))))continue;
 n++;level.mechanismAdaptation.change+=' 棋盘原创改为64格：保8×10、8×4卷帘及6紫格，源颈底新增对称两侧格(2,6)/(5,6)，普通块真实填满新格；不与来源mask等价。';
 const upper=searchSpatial(level,api,{floor:16,normalize:true,maxMilliseconds:2500,maxStates:40000,maxTransitions:1000000,orderSeed:n}),replay=upper.drags?core.replayRevisedRoute(level,upper.drags):null;
 const row={n,left,right,change,sha256:sha256(level),status:upper.status,U:replay?.nonClearingDrags,complete:replay?.complete};console.log(row);history.push(row);
 const data={level,levelSha256:sha256(level),drags:upper.drags??[],upper,replay};
 if(replay?.valid&&replay.complete&&replay.nonClearingDrags>=11&&replay.nonClearingDrags<=15){
  level.preservedMoveTarget=replay.effectiveDrags;data.levelSha256=sha256(level);data.replay=core.replayRevisedRoute(level,data.drags);
  data.lower=proveSymmetric(level,api,{floor:11,maxMilliseconds:7000,maxStates:150000,normalizeMonotone:true});data.qualificationFile=OUT+'/colored-qualification.json';console.log({n,lower:data.lower.status,states:data.lower.exploredStates});
 }
 fs.writeFileSync(`${OUT}/original-${n}.json`,JSON.stringify(data,null,2));
 if(data.lower?.thresholdProven){console.log('QUALIFIED BOUNDS',n);break;}
}
fs.writeFileSync(OUT+'/original-history.json',JSON.stringify(history,null,2));
