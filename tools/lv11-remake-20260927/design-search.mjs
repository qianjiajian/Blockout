import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {compileLevel} from '../remake21to30-mask-floor.mjs';
import {equivalentBlockGroups,checkSymmetryFloor} from '../remake21to30-symmetry-floor-v139.mjs';
import {compileNative41,NATIVE_SOURCE} from '../remake41-optional-native-v146.mjs';
import {digest} from '../revised-preview-validation-v160.mjs';
const root='deliverables/lv11-remake-20260927',out=path.join(root,'design-search-'+Date.now());fs.mkdirSync(out,{recursive:true});
const binary=compileNative41(path.join(root,'design-native'));
let seed=Number(process.argv[2]??27110);const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;},pick=a=>a[Math.floor(random()*a.length)];
const shuffle=a=>{a=[...a];for(let i=a.length-1;i;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const H3=[[0,0],[1,0],[2,0]],S=[[0,0]],catalog=[['cyan',17],['purple',17],['green',17],['purple',16],['red',15],['pink',14],['purple',13],['pink',0],['green',0],['green',0]];
const masks=[{W:6,lens:[2,4,6,6,6,6,6,4,2]},{W:7,lens:[3,5,7,7,7,5,5,3]},{W:7,lens:[3,5,7,7,7,7,3,3]},{W:8,lens:[4,6,8,6,8,6,4]},{W:7,lens:[6,6,6,6,6,6,6],starts:[1,0,0,1,0,0,1]}];
function make(at){
 const mask=masks[process.argv[5]===undefined?Math.floor(at/100)%masks.length:Number(process.argv[5])],W=mask.W,H=mask.lens.length;
 const playable=mask.lens.flatMap((n,y)=>Array.from({length:n},(_,i)=>[(mask.starts?.[y]??Math.floor((W-n)/2))+i,y])),cells=new Set(playable.map(p=>p.join(',')));
 const rowOptions=mask.lens.map((n,y)=>{const min=mask.starts?.[y]??Math.floor((W-n)/2),res=[];for(let bits=0;bits<1<<n;bits++){const anchors=[];let good=true;for(let j=0;j<n;j++)if(bits>>j&1){if(j+3>n||anchors.some(x=>Math.abs(x-(min+j))<3)){good=false;break;}anchors.push(min+j);}if(good)res.push(anchors);}return res;});
 const tilings=[];let chosen;
 for(let tries=0;tries<500;tries++){chosen=rowOptions.map(a=>pick(a));if(chosen.reduce((n,a)=>n+a.length,0)===10)break;chosen=null;}
 if(!chosen)return;
 const anchors=chosen.flatMap((a,y)=>a.map(x=>[x,y]));
 let blocks;
 for(let attempt=0;attempt<300;attempt++){
  const order=shuffle(catalog),bars=anchors.map(([x,y],i)=>({id:'lv11-source-h3-'+catalog.indexOf(order[i]),x,y,color:order[i][0],shape:H3,...(order[i][1]?{frozen:order[i][1]}:{})}));
  const own=new Map(bars.flatMap(b=>b.shape.map(([dx,dy])=>[(b.x+dx)+','+(b.y+dy),b])));
  let bad=false;for(const [cell,b]of own){const[x,y]=cell.split(',').map(Number);for(const q of [[x+1,y],[x,y+1]]){const c=own.get(q.join(','));if(c&&c.id!==b.id&&c.color===b.color)bad=true;}}
  if(bad)continue;
  const spaces=playable.filter(p=>!own.has(p.join(','))),colors=new Array(spaces.length),counts={cyan:6,purple:6};
  function fill(i){if(i===spaces.length)return true;const[x,y]=spaces[i];for(const color of shuffle(['cyan','purple'])){if(!counts[color])continue;const conflict=[[x-1,y],[x+1,y],[x,y-1],[x,y+1]].some(p=>own.get(p.join(','))?.color===color);if(conflict)continue;const b={id:'lv11-source-s-'+i,x,y,color,shape:S};own.set(x+','+y,b);colors[i]=b;counts[color]--;if(fill(i+1))return true;counts[color]++;own.delete(x+','+y);}return false;}
  if(fill(0)){blocks=[...bars,...colors];break;}
 }
 if(!blocks)return;
 const gates=[];
 for(const [color,ice,size]of [['green',0,3],['cyan',0,1],['pink',6,1],['purple',7,1],['red',13,1]]){
  const mouths=[];
  for(const side of ['left','right'])for(let offset=0;offset<=H-size;offset++){
   const edge=side==='left'?0:W-1;
   if(Array.from({length:size},(_,i)=>[edge,offset+i]).every(p=>cells.has(p.join(',')))&&!gates.some(g=>g.side===side&&offset<g.offset+g.size&&g.offset<offset+size))mouths.push({side,offset,size});
  }
  if(size===3)for(const side of ['top','bottom'])for(let offset=0;offset<=W-size;offset++){const edge=side==='top'?0:H-1;if(Array.from({length:size},(_,i)=>[offset+i,edge]).every(p=>cells.has(p.join(','))))mouths.push({side,offset,size});}
  const filtered=mouths.filter(g=>{
   if(color==='green')return blocks.some(b=>!b.frozen&&b.color==='green'&&(g.side==='left'?b.x===0&&b.y>=g.offset&&b.y<g.offset+g.size:g.side==='right'?b.x+3===W&&b.y>=g.offset&&b.y<g.offset+g.size:g.side==='top'?b.y===0&&b.x>=g.offset&&b.x+3<=g.offset+g.size:b.y===H-1&&b.x>=g.offset&&b.x+3<=g.offset+g.size));
   if(color==='cyan'||color==='purple'){const x=g.side==='left'?0:W-1,y=g.offset;return blocks.some(b=>!b.frozen&&b.shape.some(([dx,dy])=>b.x+dx===x&&b.y+dy===y));}
   return true;
  });
  if(!filtered.length)return;gates.push({...pick(filtered),id:'lv11-gate-'+color,color,...(ice?{frozen:ice}:{})});
 }
 return {id:11,name:'冻域排序',difficulty:'hard',width:W,height:H,playable,blocked:[],seams:[],timeSeconds:120,reward:40,parMoves:36,preservedMoveTarget:36,mechanismRules:'revised-2026-09-23-v1.4',blocks,gates};
}
function native(level,ms=300,floor=21){
 const c=compileLevel(level),payload={width:c.W,height:c.H,initial:[...c.initial],blocks:c.blocks.map(b=>({ice:b.ice,revealAt:b.revealAt,spawn:b.initial,poses:b.poses.map(p=>p?{lo:p.mask[0],hi:p.mask[1],top:p.mask[2],exit:p.exits[0]?(p.exits[0].frozen??0):-1,neighbors:p.neighbors}:null)})),covers:[],generators:[],groups:equivalentBlockGroups(c),floor,maxStates:250000,maxMilliseconds:ms,normalize:true,symmetry:true,collect:false};
 const input=path.join(out,'current-input.json'),output=path.join(out,'current-output.json');fs.writeFileSync(input,JSON.stringify(payload));execFileSync(binary.exe,[path.resolve(input),path.resolve(output)],{windowsHide:true,stdio:'pipe',timeout:ms+10000});return JSON.parse(fs.readFileSync(output));
}
const report=[];let best=-1,valid=0,solved=0;
for(let i=0;i<Number(process.argv[3]??500);i++){
 const level=make(i);if(!level)continue;valid++;
 const r=native(level,Number(process.argv[4]??300)),row={iteration:i,seed,levelSha256:digest(level),status:r.status,cost:r.relaxedNonClearingDrags??null,states:r.discoveredStates,ms:r.milliseconds};report.push(row);
 fs.writeFileSync(path.join(out,'attempt-'+i+'.json'),JSON.stringify({level,native:r}));
 if(row.cost!==null)solved++;
 if(row.cost!==null&&row.cost>best){best=row.cost;fs.writeFileSync(path.join(out,'best-'+best+'.json'),JSON.stringify({level,native:r},null,2));console.log(JSON.stringify({best,...row,path:out}));}
 if(row.cost>=16&&row.cost<=20){
  const candidate=path.join(out,'candidate-'+i+'.json');fs.writeFileSync(candidate,JSON.stringify({level,native:r},null,2));
  const route=checkSymmetryFloor(level,{floor:21,maxStates:500000,maxMilliseconds:20000});
  const drags=route.relaxedRoute??[],nonclear=drags.filter(d=>!d.exitSide),multi=nonclear.filter(d=>level.blocks.find(b=>b.id===d.blockId).shape.length>1).length;
  const target=path.join(out,'route-'+i+'.json');fs.writeFileSync(target,JSON.stringify({level,result:route,drags,multi,single:nonclear.length-multi},null,2));
  console.log(JSON.stringify({candidate,target,status:route.status,cost:route.relaxedNonClearingDrags,multi,single:nonclear.length-multi}));if(drags.length)break;
 }
 if(i%25===0){fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({binary,sourceSha256:digest(fs.readFileSync(NATIVE_SOURCE)),report},null,2));console.log(JSON.stringify({iteration:i,valid,solved,best,status:r.status,cost:row.cost}));}
}
fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({binary,sourceSha256:digest(fs.readFileSync(NATIVE_SOURCE)),report},null,2));console.log(JSON.stringify({out,best,valid,solved}));
