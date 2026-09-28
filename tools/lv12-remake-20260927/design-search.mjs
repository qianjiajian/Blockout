import fs from 'node:fs';
import path from 'node:path';
import {runStaticNative} from '../lv11-remake-20260927/design-native.mjs';
import {checkSymmetryFloor} from '../remake21to30-symmetry-floor-v139.mjs';
import {loadPreviewCore,digest} from '../revised-preview-validation-v160.mjs';

const runRoot=`deliverables/lv12-remake-20260927/design-search-${Date.now()}`;
fs.mkdirSync(runRoot,{recursive:true});
let seed=Number(process.argv[2]??12810);
const limit=Number(process.argv[3]??120),mode=process.argv[4]??'tower';
const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const pick=a=>a[Math.floor(rnd()*a.length)];
const shuffled=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const ledger=JSON.parse(fs.readFileSync('deliverables/lv12-remake-20260927/source-ledger.json','utf8'));
const inventory=ledger.blocks.map(b=>({sourceId:b.id,color:b.color,shape:b.shape,...(b.frozen?{frozen:b.frozen}:{})}));
const heights=mode==='tower'?[3,6,9,9,6,3]:[3,6,6,6,6,6,3];
const W=heights.length,H=Math.max(...heights);
const playable=heights.flatMap((height,x)=>Array.from({length:height},(_,j)=>[x,H-height+j]));
const cells=new Set(playable.map(p=>p.join(',')));
const slots=heights.flatMap((height,x)=>Array.from({length:height/3},(_,j)=>[x,H-height+j*3]));
const adjacent=slots.map(([x,y],i)=>slots.flatMap(([xx,yy],j)=>i!==j&&((x===xx&&Math.abs(y-yy)===3)||(Math.abs(x-xx)===1&&Math.abs(y-yy)<3))?[j]:[]));
const legalGates=[];
for(const side of ['top','bottom','left','right']){
  const size=['top','bottom'].includes(side)?1:3;
  for(let offset=0;offset+size<=(size===1?W:H);offset++){
    const mouth=Array.from({length:size},(_,i)=>side==='top'?[offset+i,0]:side==='bottom'?[offset+i,H-1]:side==='left'?[0,offset+i]:[W-1,offset+i]);
    if(mouth.every(p=>cells.has(p.join(','))))legalGates.push({side,offset,size});
  }
}
function makeLevel(){
  const colors=Array(slots.length),remaining={red:4,yellow:4,blue:3,green:1};
  const order=shuffled(slots.map((_,i)=>i)).sort((a,b)=>adjacent[b].length-adjacent[a].length);
  function assign(n){if(n===order.length)return true;const i=order[n];for(const color of shuffled(Object.keys(remaining))){
    if(!remaining[color]||adjacent[i].some(j=>colors[j]===color))continue;
    colors[i]=color;remaining[color]--;if(assign(n+1))return true;remaining[color]++;colors[i]=undefined;
  }return false;}
  if(!assign(0))return null;
  const pools=Object.fromEntries(Object.keys(remaining).map(color=>[color,shuffled(inventory.filter(b=>b.color===color))]));
  const blocks=slots.map(([x,y],i)=>{const source=pools[colors[i]].pop();return{id:'lv12-'+source.sourceId.replace('source12-',''),x,y,color:source.color,shape:source.shape,...(source.frozen?{frozen:source.frozen}:{})};});
  const touches=(b,g)=>g.side==='top'?b.y===0&&b.x===g.offset:g.side==='bottom'?b.y+3===H&&b.x===g.offset:g.side==='left'?b.x===0&&b.y===g.offset:b.x+1===W&&b.y===g.offset;
  const redOptions=legalGates.filter(g=>blocks.some(b=>b.color==='red'&&touches(b,g)));
  if(!redOptions.length)return null;
  const gates=[{...pick(redOptions),id:'lv12-gate-red',color:'red'}];
  for(const[color,frozen]of shuffled([['blue',3],['yellow',5],['green',5]])){
    const options=legalGates.filter(g=>!gates.some(other=>g.side===other.side&&g.offset<other.offset+other.size&&other.offset<g.offset+g.size));
    if(!options.length)return null;gates.push({...pick(options),id:'lv12-gate-'+color,color,frozen});
  }
  return{id:12,name:'窄道融霜',difficulty:'hard',timeSeconds:120,reward:45,parMoves:21,preservedMoveTarget:21,
    width:W,height:H,playable,blocked:[],seams:[],mechanismRules:'revised-2026-09-23-v1.4',blocks,gates};
}

const rows=[];let best=-1,solved=0,unknown=0,api;
for(let index=0;index<limit;index++){
  const seedBefore=seed,level=makeLevel();if(!level){index--;continue;}
  const native=runStaticNative(level,{artifactRoot:path.join(runRoot,'native-runs'),maxMilliseconds:400,maxStates:400000,floor:21});
  const cost=native.relaxedNonClearingDrags??null;
  const file=path.join(runRoot,`attempt-${index}.json`);
  fs.writeFileSync(file,JSON.stringify({seedBefore,seedAfter:seed,mode,level,levelSha256:digest(level),native},null,2));
  rows.push({index,file,cost,status:native.status,states:native.discoveredStates});
  if(cost!==null){
    solved++;
    if(cost>best){best=cost;console.log(JSON.stringify({index,best,solved,unknown,file}));
      fs.writeFileSync(path.join(runRoot,`best-${cost}.json`),JSON.stringify({level,source:file,native},null,2));
    }
    if(cost>=16&&cost<=20){
      const exact=checkSymmetryFloor(level,{floor:21,maxStates:1000000,maxMilliseconds:15000});
      const drags=exact.relaxedRoute??[];
      api??=(await loadPreviewCore()).api;
      const replay=drags.length?api.replayRevisedRoute(level,drags):null;
      const routeFile=path.join(runRoot,`route-${index}.json`);
      fs.writeFileSync(routeFile,JSON.stringify({level,source:file,drags,exact,replay},null,2));
      console.log(JSON.stringify({routeFile,cost:exact.relaxedNonClearingDrags,status:exact.status,replay}));
      if(replay?.valid&&replay?.complete&&replay.nonClearingDrags>=16&&replay.nonClearingDrags<=20){
        fs.writeFileSync(path.join(runRoot,'report.json'),JSON.stringify({mode,rows,best,solved,unknown,selected:routeFile},null,2));
        console.log(JSON.stringify({runRoot,status:'QUALIFIED_WITNESS_NEEDS_FRESH_FLOOR',selected:routeFile}));process.exit(0);
      }
    }
  }else if(native.status==='unknown')unknown++;
  if(index%20===19){fs.writeFileSync(path.join(runRoot,'report.json'),JSON.stringify({mode,rows,best,solved,unknown},null,2));console.log(JSON.stringify({index,best,solved,unknown}));}
}
fs.writeFileSync(path.join(runRoot,'report.json'),JSON.stringify({mode,rows,best,solved,unknown},null,2));
console.log(JSON.stringify({runRoot,best,solved,unknown,status:'BOUNDED_BATCH_COMPLETE'}));
