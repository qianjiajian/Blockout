import fs from 'node:fs';import path from 'node:path';
import {runStaticNative} from '../lv11-remake-20260927/design-native.mjs';
import {checkSymmetryFloor} from '../remake21to30-symmetry-floor-v139.mjs';
import {loadPreviewCore,digest} from '../revised-preview-validation-v160.mjs';
const source=process.argv[2],base=JSON.parse(fs.readFileSync(source,'utf8')).level;
const root=`deliverables/lv12-remake-20260927/design-local-${Date.now()}`;fs.mkdirSync(root,{recursive:true});
const limit=Number(process.argv[3]??180),queue=[{level:base,description:'seed'}],seen=new Set(),rows=[];
let best=0,api;
const cells=new Set(base.playable.map(p=>p.join(','))),options=[];
for(const side of ['top','bottom','left','right']){const size=['top','bottom'].includes(side)?1:3;
 for(let offset=0;offset+size<=(size===1?base.width:base.height);offset++){
  const mouth=Array.from({length:size},(_,i)=>side==='top'?[offset+i,0]:side==='bottom'?[offset+i,base.height-1]:side==='left'?[0,offset+i]:[base.width-1,offset+i]);
  if(mouth.every(p=>cells.has(p.join(','))))options.push({side,offset,size});
 }}
function valid(level){const own=new Map(level.blocks.flatMap(b=>b.shape.map(([dx,dy])=>[(b.x+dx)+','+(b.y+dy),b])));
 for(const [cell,b]of own){const[x,y]=cell.split(',').map(Number);for(const p of [[x+1,y],[x,y+1]]){const o=own.get(p.join(','));if(o&&o.id!==b.id&&o.color===b.color)return false;}}
 for(let i=0;i<level.gates.length;i++)for(let j=0;j<i;j++){const a=level.gates[i],b=level.gates[j];if(a.side===b.side&&a.offset<b.offset+b.size&&b.offset<a.offset+a.size)return false;}
 const g=level.gates.find(g=>g.color==='red');return level.blocks.some(b=>b.color==='red'&&(g.side==='top'?b.y===0&&b.x===g.offset:g.side==='bottom'?b.y+3===level.height&&b.x===g.offset:g.side==='left'?b.x===0&&b.y===g.offset:b.x+1===level.width&&b.y===g.offset));
}
function add(level,description){const k=digest({blocks:level.blocks,gates:level.gates});if(seen.has(k)||!valid(level))return;seen.add(k);queue.push({level,description});}
function expand(level,tag){
 for(let i=0;i<level.gates.length;i++)for(const pose of options){const next=structuredClone(level);Object.assign(next.gates[i],pose);add(next,`${tag}:gate${i}=${JSON.stringify(pose)}`);}
 for(let i=0;i<level.blocks.length;i++)for(let j=0;j<i;j++){const next=structuredClone(level),a=next.blocks[i],b=next.blocks[j];[a.x,b.x]=[b.x,a.x];[a.y,b.y]=[b.y,a.y];add(next,`${tag}:swap${i},${j}`);}
}
expand(base,'seed');
for(let index=0;index<queue.length&&index<limit;index++){
 const {level,description}=queue[index];
 const native=runStaticNative(level,{artifactRoot:path.join(root,'native-runs'),maxMilliseconds:700,maxStates:600000,floor:21}),cost=native.relaxedNonClearingDrags??null;
 const file=path.join(root,`attempt-${index}.json`);fs.writeFileSync(file,JSON.stringify({source,description,level,native},null,2));rows.push({index,file,description,cost,status:native.status,states:native.discoveredStates});
 if(cost!==null&&cost>=best){if(cost>best)console.log(JSON.stringify({index,best:cost,file,queue:queue.length}));best=Math.max(cost,best);if(cost>=14)expand(level,`from${index}`);}
 if(cost!==null&&cost>=16&&cost<=20){
  const exact=checkSymmetryFloor(level,{floor:21,maxStates:2000000,maxMilliseconds:25000}),drags=exact.relaxedRoute??[];
  api??=(await loadPreviewCore()).api;const replay=drags.length?api.replayRevisedRoute(level,drags):null;
  const routeFile=path.join(root,`route-${index}.json`);fs.writeFileSync(routeFile,JSON.stringify({source:file,level,drags,exact,replay},null,2));console.log(JSON.stringify({routeFile,cost:exact.relaxedNonClearingDrags,status:exact.status,replay}));
  if(replay?.valid&&replay?.complete&&replay.nonClearingDrags>=16&&replay.nonClearingDrags<=20){fs.writeFileSync(path.join(root,'report.json'),JSON.stringify({rows,best,selected:routeFile},null,2));console.log(JSON.stringify({root,selected:routeFile}));process.exit(0);}
 }
 if(index%20===19){fs.writeFileSync(path.join(root,'report.json'),JSON.stringify({rows,best,queue:queue.length},null,2));console.log(JSON.stringify({index,best,queue:queue.length}));}
}
fs.writeFileSync(path.join(root,'report.json'),JSON.stringify({rows,best,queue:queue.length},null,2));console.log(JSON.stringify({root,best,status:'BOUNDED_BATCH_COMPLETE'}));
