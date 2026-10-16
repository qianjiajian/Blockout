import fs from 'node:fs';
import {loadSpatialApi} from '../remake201to210-v123-floor.mjs';
import {loadContinuationRuntime,sha256} from '../continuation211-runtime.mjs';
import {searchSymmetric} from './search-symmetric.mjs';
import {liftPayload,runNativeLift} from '../continuation211-native-lift.mjs';
import {auditOpeningCoverage} from '../revised-opening-coverage.mjs';
import {auditHiddenCoverage} from '../revised-hidden-coverage.mjs';
const out='deliverables/continue211-220-20260930/design220-new',api=await loadSpatialApi(),core=await loadContinuationRuntime(),history=[];
const prior=JSON.parse(fs.readFileSync(out+'/comb-970.json')),Q2=[[0,0],[1,0],[0,1],[1,1]],H2=[[0,0],[1,0]],V2=[[0,0],[0,1]],S=[[0,0]],palette=['red','blue','purple','green','orange'];
const blocked=[...[0,1,2,5,6,7].map(x=>[x,4]),[0,6],[7,6]],mask=Array.from({length:72},(_,i)=>[i%8,Math.floor(i/8)]).filter(([x,y])=>!blocked.some(([a,b])=>a===x&&b===y));
const cells=b=>b.shape.map(([x,y])=>[b.x+x,b.y+y]),touch=(a,b)=>cells(a).some(([x,y])=>cells(b).some(([u,v])=>Math.abs(x-u)+Math.abs(y-v)===1));
function make(seed){let rng=seed;const rnd=n=>{rng=(Math.imul(rng,1664525)+1013904223)>>>0;return rng%n;},outside=[];
 const put=(x,y,shape)=>outside.push({id:'l220-main-'+outside.length,x,y,shape,color:'red'});
 for(const y of[0,2])put(3,y,V2);for(let y=0;y<4;y++)for(const x of[4,6])put(x,y,H2);
 put(3,4,H2);for(const x of[0,2,4,6])put(x,5,H2);for(const x of[1,3,5])put(x,6,H2);for(const y of[7,8])for(const x of[0,2,4,6])put(x,y,H2);
 const shell={id:'l220-hidden-shell',x:1,y:1,shape:Q2,color:'red',layers:['orange','red'],shutterId:'l220-cover'},hidden=[shell];for(let y=0;y<4;y++)for(let x=0;x<3;x++)if(!cells(shell).some(([a,b])=>a===x&&b===y))hidden.push({id:'l220-hidden-'+hidden.length,x,y,shape:S,color:'red',shutterId:'l220-cover'});
 const anchors=outside.filter(b=>b.y===8&&[0,4].includes(b.x)),options=outside.filter(b=>b.y>=4&&!anchors.includes(b)).map(b=>({b,r:rnd(10000)})).sort((a,b)=>a.r-b.r).map(v=>v.b),normal=new Set([...anchors.map(b=>b.id),...options.slice(0,7).map(b=>b.id)]),blocks=[...outside,...hidden],assigned=[shell,...anchors];for(const b of anchors)b.color=b.x===0?'orange':'green';
 const rest=blocks.filter(b=>!assigned.includes(b)).sort((a,b)=>blocks.filter(c=>touch(b,c)).length-blocks.filter(c=>touch(a,c)).length);let paintBudget=30000;
 function paint(i){if(--paintBudget<0)return false;if(i===rest.length)return true;const b=rest[i],choices=(b.shutterId?palette:normal.has(b.id)?['green','orange']:['red','blue','purple']).map(c=>({c,r:rnd(10000)})).sort((a,b)=>a.r-b.r).map(o=>o.c);for(const color of choices){if(assigned.some(a=>(a.layers?.[0]??a.color)===color&&touch(a,b)))continue;b.color=color;assigned.push(b);if(paint(i+1))return true;assigned.pop();}return false;}
 if(!paint(0))return;
 return {...prior.level,name:'横纵汇流·220',blocked,playable:mask,blocks,shutters:[{id:'l220-cover',x:0,y:0,width:3,height:4,count:9}],preservedMoveTarget:68,mechanismAdaptation:{userAuthorized:'211–220上下界未达后换色换形和必要普通块拆合/布局重生成，同1帘9及9隐藏体可重设区域并分列source差异，合格后直接正式数据接入',change:'source220首稳定972秒为8×9/66格、顶帘8×4/32格及19可见+9隐藏体；本图8×9/64格左右对称原创轮廓，左上帘3×4/12格，内为1橙壳红芯Q2+8S，26可见体为原向H2/V2铺52格。28体改35体，1壳、1帘9、3冰9及2普通门均保留；帘区域/面积、普通体数量形色排布是用户授权的原创适配，不冒称精确复制。'}};
}
for(let i=0;i<Number(process.argv[3]??32);i++){
 const n=Number(process.argv[2]??1400)+i,level=make(n);if(!level){console.log(n,'construction');continue;}const source={...prior.source,seed:'domino220-'+n},audit=core.auditRevisedCandidate(level,source),hard=audit.issues.filter(i=>!['wrong-rule-profile','full-count-mismatch','opening-count-mismatch'].includes(i.code));if(hard.length){console.log(n,'static',hard);continue;}
 const opening=auditOpeningCoverage(new api.PuzzleModel(level).snapshot()),hidden=auditHiddenCoverage(level);if(!opening.passed||!hidden.passed||!level.blocks.every(b=>core.matchFormalBlockShape(b.shape,'native-only'))){console.log(n,'coverage');continue;}
 const result=searchSymmetric(level,api,{floor:55,maxMilliseconds:3000,maxStates:60000,orderSeed:i%28,progressWeight:.1+(i%4)*.1}),replay=result.drags?core.replayRevisedRoute(level,result.drags):null;
 let lower;if(replay?.valid&&replay.complete&&replay.nonClearingDrags>=21&&replay.nonClearingDrags<=30){level.preservedMoveTarget=result.drags.length;const {p}=liftPayload(level,api,{floor:21,maxMilliseconds:6000,maxStates:500000});lower=runNativeLift(p);}
 const row={n,fingerprint:sha256(level),status:result.status,U:replay?.nonClearingDrags,maxClears:result.maxClearsSeen,lower:lower?.status,Lcost:lower?.minimum};console.log(row);history.push(row);const record={level,source,audit,opening,hidden,result,replay,lowerBoundStatus:lower?.status??'NOT_RUN_NO_IN_BAND_UPPER',lower};fs.writeFileSync(out+'/domino-'+n+'.json',JSON.stringify(record,null,2));if(lower?.status==='threshold-proven'){fs.writeFileSync(out+'/qualified220.json',JSON.stringify(record,null,2));break;}fs.writeFileSync(out+'/domino-history-'+(process.argv[2]??1400)+'.json',JSON.stringify(history,null,2));
}
