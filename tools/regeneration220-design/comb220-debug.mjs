import fs from 'node:fs';
import {loadSpatialApi} from '../remake201to210-v123-floor.mjs';
import {loadContinuationRuntime,sha256} from '../continuation211-runtime.mjs';
import {searchTraffic} from './search-traffic.mjs';
import {proveMemo} from './prove-memo.mjs';
import {auditOpeningCoverage} from '../revised-opening-coverage.mjs';
import {auditHiddenCoverage} from '../revised-hidden-coverage.mjs';
const out='deliverables/continue211-220-20260930/design220-new',api=await loadSpatialApi(),core=await loadContinuationRuntime(),history=[];
const H2=[[0,0],[1,0]],V2=[[0,0],[0,1]],Q2=[[0,0],[1,0],[0,1],[1,1]],L3=[[0,0],[0,1],[1,1]],colors=['red','blue','purple','green','orange'];
const sourceMask=Array.from({length:72},(_,i)=>[i%8,Math.floor(i/8)]).filter(([x,y])=>y!==4||x===3||x===4);
const source={referenceId:'211-220.mp4@972s,1040s',sha256:'31330add8288a9b5611c27c12e85e9efb6c4001cdd6b685d2e61471d145b520d',levelId:220,width:8,height:9,fullBlockCount:28,openingBlockCount:19,originalMask:sourceMask,mechanisms:{generatorQueueLengths:[],keyGroups:[],axisHorizontalBlocks:0,axisVerticalBlocks:0,starBlocks:0,flipDoorInitialOpen:[],coloredGridCellCounts:[],bombSeconds:[],shutterClearCounts:[9],shutterHiddenBatchCounts:[9],liftCount:0,liftHiddenBatchCounts:[],numericIceValues:[],shellBlocks:1,exits:[{kind:'ordinary',width:3,frozen:9,star:false},{kind:'ordinary',width:2,frozen:9,star:false},{kind:'ordinary',width:3,frozen:9,star:false},{kind:'ordinary',width:3,frozen:0,star:false},{kind:'ordinary',width:2,frozen:0,star:false}]}};
function footprint(b){return b.shape.map(([x,y])=>[b.x+x,b.y+y]);}
function touch(a,b){return footprint(a).some(([x,y])=>footprint(b).some(([u,v])=>Math.abs(x-u)+Math.abs(y-v)===1));}
function make(seed){let state=seed;const rnd=n=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state%n;};const blocks=[];
 const put=(x,y,shape,more={})=>blocks.push({id:'l220-comb-'+blocks.length,x,y,shape,color:'red',...more});
 put(3,4,H2);for(const x of[0,2,4,6])put(x,5,H2);put(3,6,H2);for(const y of[7,8])for(const x of[0,2,4,6])if(x!==0)put(x,y,H2);put(0,7,L3);put(1,7,[[0,0]]);
 const outside=blocks.slice(),anchor=outside.find(b=>b.x===4&&b.y===8),ordered=outside.filter(b=>b!==anchor).map(b=>({b,r:rnd(10000)})).sort((a,b)=>a.r-b.r).map(o=>o.b),normals=new Set([anchor.id,...ordered.slice(0,8).map(b=>b.id)]);
 for(const[x,y]of[[0,0],[2,0],[4,0],[6,0],[0,2],[3,2],[5,2]])put(x,y,Q2,{shutterId:'l220-cover',...(x===6&&y===0?{color:'red',layers:['orange','red']}:{})});put(2,2,V2,{shutterId:'l220-cover'});put(7,2,V2,{shutterId:'l220-cover'});
 const shell=blocks.find(b=>b.layers),assigned=[shell,anchor];anchor.color='green';const order=blocks.filter(b=>b!==shell&&b!==anchor).sort((a,b)=>blocks.filter(c=>touch(c,b)).length-blocks.filter(c=>touch(c,a)).length);let tries=0;
 function paint(i){if(tries++>30000)return false;if(i===order.length)return true;const b=order[i],choices=(b.shutterId?colors:normals.has(b.id)?['green','orange']:['red','blue','purple']).map(c=>({c,r:rnd(10000)})).sort((a,b)=>a.r-b.r).map(o=>o.c);for(const color of choices){if(assigned.some(a=>(a.layers?.[0]??a.color)===color&&touch(a,b)))continue;b.color=color;assigned.push(b);if(paint(i+1))return true;assigned.pop();}return false;}
 if(!paint(0))return;
 return{id:220,name:'双颈错序·220',difficulty:'super',mechanismRules:'revised-2026-09-27-v1.5',width:8,height:9,blocked:[4,6].flatMap(y=>[0,1,2,5,6,7].map(x=>[x,y])),timeSeconds:210,reward:200,parMoves:8,preservedMoveTarget:68,designTargets:{formulaVersion:'blockout-d1',calibratedDifficulty:3,minimumRepositionOverhead:21},shutters:[{id:'l220-cover',x:0,y:0,width:8,height:4,count:9}],gates:[{id:'blue',color:'blue',side:'top',offset:0,size:3,frozen:9},{id:'purple',color:'purple',side:'top',offset:3,size:2,frozen:9},{id:'red',color:'red',side:'top',offset:5,size:3,frozen:9},{id:'orange',color:'orange',side:'bottom',offset:0,size:3},{id:'green',color:'green',side:'bottom',offset:4,size:2}],blocks,mechanismAdaptation:{userAuthorized:'211–220上下界未达后允许换色换形及必要普通块拆合，重生成后直接接入正式数据；不得降难度或补来源外机关',change:'220 source972/1040秒的8×9单颈66格改原创左右对称双颈60格；19个开局普通体换形/合并为14体（12H2+1原向L3+1S），9个隐藏体仍满32格，保1个橙壳红芯Q2、1帘9、三冰门各9及两普通门。全28→23体及占格变化明确为本游戏空间适配，非精确复制。'}};
}
for(let i=0;i<1;i++){
 const n=Number(process.argv[2]??800)+i,level=make(n);if(!level){console.log(n,'coloring');continue;}const audit=core.auditRevisedCandidate(level,{...source,seed:'comb220-'+n}),hard=audit.issues.filter(i=>!['wrong-rule-profile','full-count-mismatch','opening-count-mismatch'].includes(i.code));if(hard.length){console.log(n,'static',hard);continue;}
 const opening=auditOpeningCoverage(new api.PuzzleModel(level).snapshot()),hidden=auditHiddenCoverage(level);if(!opening.passed||!hidden.passed||!level.blocks.every(b=>core.matchFormalBlockShape(b.shape,'native-only'))){console.log(n,'coverage',JSON.stringify({opening,hidden,art:level.blocks.filter(b=>!core.matchFormalBlockShape(b.shape,'native-only')).map(b=>b.id)}));continue;}
 const result=searchTraffic(level,api,{floor:50,maxMilliseconds:3000,maxStates:50000,orderSeed:i%23,progressWeight:.2}),replay=result.drags?core.replayRevisedRoute(level,result.drags):null;let proof;
 if(replay?.valid&&replay.complete&&replay.nonClearingDrags>=21&&replay.nonClearingDrags<=30){level.preservedMoveTarget=result.drags.length;proof=proveMemo(level,api,{floor:21,maxMilliseconds:6000,maxStates:120000,normalizeMonotone:true});}
 const row={n,fingerprint:sha256(level),status:result.status,U:replay?.nonClearingDrags,maxClears:result.maxClearsSeen,lower:proof?.status};console.log(row);history.push(row);
 const record={level,source:{...source,seed:'comb220-'+n},audit,opening,hidden,result,replay,proof};fs.writeFileSync(out+'/comb-'+n+'.json',JSON.stringify(record,null,2));fs.writeFileSync(out+'/comb-history-'+(process.argv[2]??800)+'.json',JSON.stringify(history,null,2));if(proof?.thresholdProven){fs.writeFileSync(out+'/qualified220.json',JSON.stringify(record,null,2));break;}
}
