import fs from 'node:fs';import path from 'node:path';
import {runStaticNative} from './design-native.mjs';
import {checkSymmetryFloor} from '../remake21to30-symmetry-floor-v139.mjs';
const root='deliverables/lv11-remake-20260927/design-structured-'+Date.now();fs.mkdirSync(root,{recursive:true});
let seed=Number(process.argv[2]??27170);const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};const pick=a=>a[Math.floor(rnd()*a.length)];
const shuffle=a=>{a=[...a];for(let i=a.length-1;i;i--){let j=Math.floor(rnd()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const H3=[[0,0],[1,0],[2,0]],S=[[0,0]],ice=[['cyan',17],['purple',17],['green',17],['purple',16],['red',15],['pink',14],['purple',13]];
function make(i){
 const mode=Number(process.argv[4]??i%2),H=mode===0?8:9,W=6,rows=mode===0?[3,6,6,6,6,6,6,3]:[3,3,6,6,6,6,6,3,3];
 const playable=rows.flatMap((n,y)=>Array.from({length:n},(_,x)=>[x,y])),cells=new Set(playable.map(p=>p.join(',')));
 const icePos=mode===0?[[0,0],...Array.from({length:6},(_,j)=>[3,j+1])]:[[0,0],...Array.from({length:5},(_,j)=>[3,j+2]),[0,8]];
 const plainYs=process.argv[5]==='split'?shuffle([1,2,3,4,5,6,7]).slice(0,3).sort((a,b)=>a-b):[1,2,7];const colors=shuffle(['pink','green','green']);const blocks=plainYs.map((y,j)=>({id:'lv11-plain-'+j,x:0,y,shape:H3,color:colors[j]}));
 const parity=Math.floor(rnd()*2);
 for(let y=1;y<=7;y++)if(!plainYs.includes(y))for(let x=0;x<3;x++)blocks.push({id:'lv11-single-'+x+'-'+y,x,y,shape:S,color:(x+y+parity)%2?'purple':'cyan'});
 const order=shuffle(ice);if(process.argv[5]==='split'&&order[0][1]!==17)return;icePos.forEach(([x,y],j)=>blocks.push({id:'lv11-ice-'+ice.indexOf(order[j]),x,y,shape:H3,color:order[j][0],frozen:order[j][1]}));
 if(blocks.filter(b=>b.shape.length===1&&b.color==='cyan').length!==6)return;
 const own=new Map(blocks.flatMap(b=>b.shape.map(([dx,dy])=>[(b.x+dx)+','+(b.y+dy),b])));
 for(const [cell,b]of own){const[x,y]=cell.split(',').map(Number);for(const p of [[x+1,y],[x,y+1]]){const other=own.get(p.join(','));if(other&&other.id!==b.id&&other.color===b.color)return;}}
 const gateGreen=process.argv[5]==='split'?{side:'top',offset:0,size:3}:pick([{side:'top',offset:0,size:3},{side:'bottom',offset:0,size:3}]);
 const gates=[{...gateGreen,id:'lv11-gate-green',color:'green'}];
 for(const[color,frozen]of [['cyan',0],['pink',6],['purple',7],['red',13]]){
  const opts=[];for(const side of ['left','right'])for(let offset=0;offset<H;offset++){if(!cells.has((side==='left'?0:W-1)+','+offset)||gates.some(g=>g.side===side&&g.offset<=offset&&offset<g.offset+g.size))continue;if(color==='cyan'&&(side==='right'||process.argv[5]==='split'&&own.get('0,'+offset)?.color!=='cyan'))continue;if(color==='pink'&&side==='right'&&rnd()<.9)continue;opts.push({side,offset,size:1});}
  if(!opts.length)return;gates.push({...pick(opts),id:'lv11-gate-'+color,color,...(frozen?{frozen}:{})});
 }
 return{id:11,name:'冻域排序',difficulty:'hard',timeSeconds:120,reward:40,parMoves:36,preservedMoveTarget:36,width:W,height:H,playable,blocked:[],seams:[],mechanismRules:'revised-2026-09-23-v1.4',blocks,gates};
}
let best=-1,valid=0,solved=0;const rows=[];
for(let i=0;i<Number(process.argv[3]??600);i++){
 const level=make(i);if(!level)continue;valid++;
 const result=runStaticNative(level,{artifactRoot:path.join(root,'native-runs'),maxMilliseconds:600,maxStates:500000,floor:41});
 const cost=result.relaxedNonClearingDrags??null;rows.push({i,seed,status:result.status,cost,states:result.discoveredStates});
 const target=path.join(root,'attempt-'+i+'.json');fs.writeFileSync(target,JSON.stringify({level,native:result},null,2));
 if(cost!==null){solved++;if(cost>best){best=cost;console.log(JSON.stringify({i,valid,solved,best,target}));}
  if(cost>=16&&cost<=20||solved===1){
   const route=checkSymmetryFloor(level,{floor:41,maxStates:600000,maxMilliseconds:15000}),drags=route.relaxedRoute??[],nc=drags.filter(d=>!d.exitSide),multi=nc.filter(d=>level.blocks.find(b=>b.id===d.blockId).shape.length>1).length;
   const file=path.join(root,'route-'+i+'.json');fs.writeFileSync(file,JSON.stringify({level,drags,result:route,multi,single:nc.length-multi},null,2));console.log(JSON.stringify({file,status:route.status,cost:route.relaxedNonClearingDrags,multi,single:nc.length-multi}));
   if(route.relaxedRoute&&cost>=16&&cost<=20)break;
  }
 }
 if(valid%20===0){console.log(JSON.stringify({i,valid,solved,best}));fs.writeFileSync(path.join(root,'report.json'),JSON.stringify({rows,best,valid,solved}));}
}
fs.writeFileSync(path.join(root,'report.json'),JSON.stringify({rows,best,valid,solved},null,2));console.log(JSON.stringify({root,best,valid,solved}));
