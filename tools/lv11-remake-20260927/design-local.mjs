import fs from 'node:fs';import path from 'node:path';
import {runStaticNative} from './design-native.mjs';import {checkSymmetryFloor} from '../remake21to30-symmetry-floor-v139.mjs';
const input=process.argv[2]??'deliverables/lv11-remake-20260927/design-structured-1790489247344/route-37.json',base=JSON.parse(fs.readFileSync(input)).level;
const root='deliverables/lv11-remake-20260927/design-local-'+Date.now();fs.mkdirSync(root,{recursive:true});
let seed=Number(process.argv[3]??27201);const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;},pick=a=>a[Math.floor(rnd()*a.length)];
function adjacent(l){const own=new Map(l.blocks.flatMap(b=>b.shape.map(([dx,dy])=>[(b.x+dx)+','+(b.y+dy),b])));for(const[cell,b]of own){const[x,y]=cell.split(',').map(Number);for(const p of [[x+1,y],[x,y+1]]){const c=own.get(p.join(','));if(c&&c.id!==b.id&&c.color===b.color)return true;}}return false;}
let best=-1,valid=0,solved=0;const report=[];
for(let i=0;i<Number(process.argv[4]??500);i++){
 const level=structuredClone(base),ice=level.blocks.filter(b=>b.frozen);
 if(i%3!==0){const top=ice.find(b=>b.x===0&&b.y===0),other=ice.find(b=>b.color===['cyan','green'][i%2]);[top.x,top.y,other.x,other.y]=[other.x,other.y,top.x,top.y];}
 if(i%5===0){const a=pick(ice),b=pick(ice);[a.x,a.y,b.x,b.y]=[b.x,b.y,a.x,a.y];}
 if(adjacent(level))continue;
 const positions=[0,1,2,3,4,5,6,7],gates=[{id:'lv11-gate-green',color:'green',side:pick(['top','bottom']),offset:0,size:3}];
 for(const[color,frozen]of [['cyan',0],['pink',6],['purple',7],['red',13]]){let opts=positions.filter(y=>!gates.some(g=>g.side==='left'&&g.offset===y));if(color==='cyan')opts=opts.filter(y=>[3,4,5,6].includes(y));const y=pick(opts);gates.push({id:'lv11-gate-'+color,color,side:'left',offset:y,size:1,...(frozen?{frozen}:{})});}level.gates=gates;valid++;
 const result=runStaticNative(level,{artifactRoot:path.join(root,'native-runs'),maxMilliseconds:1000,maxStates:1000000,floor:41});const cost=result.relaxedNonClearingDrags??null;
 const target=path.join(root,'attempt-'+i+'.json');fs.writeFileSync(target,JSON.stringify({level,native:result}));report.push({i,seed,status:result.status,cost,states:result.discoveredStates});
 if(cost!==null){solved++;if(cost>best){best=cost;console.log(JSON.stringify({i,solved,best,target}));}
 if(cost>=16&&cost<=20){const result=checkSymmetryFloor(level,{floor:21,maxStates:1500000,maxMilliseconds:30000}),drags=result.relaxedRoute??[],nc=drags.filter(d=>!d.exitSide),multi=nc.filter(d=>level.blocks.find(b=>b.id===d.blockId).shape.length>1).length;const file=path.join(root,'route-'+i+'.json');fs.writeFileSync(file,JSON.stringify({level,result,drags,multi,single:nc.length-multi},null,2));console.log(JSON.stringify({file,cost:result.relaxedNonClearingDrags,multi,single:nc.length-multi,status:result.status}));if(drags.length)break;}}
 if(valid%25===0){fs.writeFileSync(path.join(root,'report.json'),JSON.stringify({valid,solved,best,report}));console.log(JSON.stringify({i,valid,solved,best}));}
}
fs.writeFileSync(path.join(root,'report.json'),JSON.stringify({valid,solved,best,report},null,2));console.log(JSON.stringify({root,valid,solved,best}));
