import fs from 'node:fs';import {loadSpatialApi,searchSpatial} from './remake201to210-v123-floor.mjs';import {loadContinuationRuntime,sha256} from './continuation211-runtime.mjs';import {liftPayload,runNativeLift} from './continuation211-native-lift.mjs';
const OUT='deliverables/continue211-220-20260930/design213-original',base=JSON.parse(fs.readFileSync(OUT+'/candidate-13.json')),api=await loadSpatialApi(),core=await loadContinuationRuntime();
const S={S:[[0,0]],V2:[[0,0],[0,1]],H2:[[0,0],[1,0]],V3:[[0,0],[0,1],[0,2]],H3:[[0,0],[1,0],[2,0]],Q:[[0,0],[1,0],[0,1],[1,1]]};
const ice=base.level.blocks.filter(b=>b.shutterId==='l213-upper'&&b.frozen),ordinary=[['red','Q'],['orange','Q'],['blue','Q'],['green','Q'],['pink','V3'],['cyan','H3'],['red','V3']].map(([color,shape],i)=>({id:'l213-upper-retile-'+i,color,shape:S[shape],shutterId:'l213-upper'}));
const raw=[...ice,...ordinary],region=Array.from({length:42},(_,i)=>[i%7,Math.floor(i/7)]);
function pack(seed){let budget=10000;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;},occupied=new Map(),left=new Set(raw.map((_,i)=>i)),result=[];
 const poses=raw.map(b=>region.flatMap(([x,y])=>{const cells=b.shape.map(([dx,dy])=>[x+dx,y+dy]);return cells.every(([x,y])=>x>=0&&x<7&&y>=0&&y<6)?[{...b,x,y,cells}]:[];}));
 const walk=()=>{if(!left.size)return true;if(--budget<0)return false;let options;
  for(const [x,y]of region){if(occupied.has(`${x},${y}`))continue;const opts=[];for(const i of left)for(const p of poses[i])if(p.cells.some(([a,b])=>a===x&&b===y)&&!p.cells.some(([a,b])=>occupied.has(`${a},${b}`)||[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>occupied.get(`${a+dx},${b+dy}`)===p.color)))opts.push([i,p]);if(!opts.length)return false;if(!options||opts.length<options.length)options=opts;if(options.length===1)break;}
  for(let i=options.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[options[i],options[j]]=[options[j],options[i]];}
  for(const [i,p]of options){left.delete(i);result.push(p);p.cells.forEach(([x,y])=>occupied.set(`${x},${y}`,p.color));if(walk())return true;p.cells.forEach(([x,y])=>occupied.delete(`${x},${y}`));result.pop();left.add(i);}return false;
 };return walk()?result.map(({cells,...b})=>b):null;
}
const history=[];
for(let n=0;n<32;n++){
 const upper=pack(213700+n);if(!upper){console.log(n,'no-packing');continue;}const level=structuredClone(base.level);level.blocks=level.blocks.filter(b=>b.shutterId!=='l213-upper').concat(upper);
 const crossing=level.blocks.filter(b=>b.shutterId==='l213-upper').some(b=>level.blocks.filter(a=>!a.shutterId).some(a=>(a.layers?.[0]??a.color)===b.color&&a.shape.some(([x,y])=>b.shape.some(([dx,dy])=>Math.abs(a.x+x-b.x-dx)+Math.abs(a.y+y-b.y-dy)===1))));if(crossing)continue;
 level.mechanismAdaptation.change+=' 新结构族：上帘普通填充合并成4块Q2+3条，7冰5/实际冰块形色保持，仅原向重排；真实42格满铺，减少普通碎块。';
 const found=searchSpatial(level,api,{floor:16,normalize:true,maxMilliseconds:2500,maxStates:60000,maxTransitions:1500000,orderSeed:n}),replay=found.drags?core.replayRevisedRoute(level,found.drags):null,data={level,drags:found.drags??[],upper:found,replay,sourceReview:base.sourceReview};
 if(replay?.complete&&replay.valid&&replay.nonClearingDrags>=11&&replay.nonClearingDrags<=15){level.preservedMoveTarget=replay.effectiveDrags;data.levelSha256=sha256(level);const {p}=liftPayload(level,api,{floor:11,maxMilliseconds:6000,maxStates:500000});data.experimentalLower=runNativeLift(p);}
 const row={n,status:found.status,U:replay?.nonClearingDrags,lower:data.experimentalLower?.status,states:data.experimentalLower?.exploredStates};history.push(row);console.log(row);fs.writeFileSync(`${OUT}/retile-${n}.json`,JSON.stringify(data,null,2));if(data.experimentalLower?.thresholdProven)break;
}
fs.writeFileSync(OUT+'/retile-history.json',JSON.stringify(history,null,2));
