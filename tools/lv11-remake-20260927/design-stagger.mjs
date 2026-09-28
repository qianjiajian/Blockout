import fs from 'node:fs';import path from 'node:path';import {runStaticNative} from './design-native.mjs';import {witness} from './design-witness.mjs';
const root='deliverables/lv11-remake-20260927/design-stagger-'+Date.now();fs.mkdirSync(root,{recursive:true});
let seed=Number(process.argv[2]??27301);const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;},pick=a=>a[Math.floor(rnd()*a.length)];const shuffle=a=>{a=[...a];for(let i=a.length-1;i;i--){let j=Math.floor(rnd()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const base=JSON.parse(fs.readFileSync('deliverables/lv11-remake-20260927/design-structured-1790489247344/route-37.json')).level,iceCatalog=base.blocks.filter(b=>b.frozen).map(({x,y,...b})=>b);
function make(i){const level=structuredClone(base),iceOrder=shuffle(iceCatalog),positions=[[0,0],[3,1],[3,2],...[3,4,5,6].map(y=>[pick([1,2,3]),y])];
 const bars=positions.map(([x,y],j)=>({...iceOrder[j],x,y}));
 const plain=shuffle(base.blocks.filter(b=>!b.frozen&&b.shape.length===3));[1,2,7].forEach((y,j)=>bars.push({...plain[j],x:0,y}));
 const own=new Map(bars.flatMap(b=>b.shape.map(([dx,dy])=>[(b.x+dx)+','+(b.y+dy),b])));for(const[cell,b]of own){const[x,y]=cell.split(',').map(Number);for(const p of [[x+1,y],[x,y+1]]){const c=own.get(p.join(','));if(c&&c.id!==b.id&&c.color===b.color)return;}}
 const spaces=level.playable.filter(p=>!own.has(p.join(','))),singles=[],counts={cyan:6,purple:6};
 function fill(i){if(i===spaces.length)return true;const[x,y]=spaces[i];for(const color of shuffle(['cyan','purple'])){if(!counts[color])continue;if([[x-1,y],[x+1,y],[x,y-1],[x,y+1]].some(p=>own.get(p.join(','))?.color===color))continue;const b={id:'lv11-single-'+i,x,y,shape:[[0,0]],color};own.set(x+','+y,b);counts[color]--;singles[i]=b;if(fill(i+1))return true;counts[color]++;own.delete(x+','+y);}return false;}
 if(!fill(0))return;level.blocks=[...bars,...singles];
 const gates=[{id:'lv11-gate-green',color:'green',side:pick(['top','bottom']),offset:0,size:3}];
 for(const[color,frozen]of [['cyan',0],['pink',6],['purple',7],['red',13]]){const opts=[];for(const side of ['left','right'])for(let offset=0;offset<8;offset++){if(side==='right'&&![1,2,3,4,5,6].includes(offset)||gates.some(g=>g.side===side&&g.offset===offset))continue;if(color==='cyan'&&own.get((side==='left'?0:5)+','+offset)?.color!==color)continue;opts.push({side,offset,size:1});}if(!opts.length)return;gates.push({...pick(opts),id:'lv11-gate-'+color,color,...(frozen?{frozen}:{})});}
 level.gates=gates;return level;
}
const report=[];let valid=0,solved=0,best=-1;
for(let i=0;i<Number(process.argv[3]??1500);i++){
 const level=make(i);if(!level)continue;valid++;
 const result=witness(level,{maxCost:20,maxStates:50000,maxMilliseconds:800,weight:30}),file=path.join(root,'attempt-'+i+'.json');
 let floor=null;if(result.drags){solved++;if(result.cost>best){best=result.cost;console.log(JSON.stringify({i,valid,solved,best,file}));}if(result.cost>=16)floor=runStaticNative(level,{artifactRoot:path.join(root,'native-runs'),maxMilliseconds:2000,maxStates:1000000,floor:16});}
 const nc=(result.drags??[]).filter(d=>!d.exitSide),multi=nc.filter(d=>level.blocks.find(b=>b.id===d.blockId).shape.length===3).length;fs.writeFileSync(file,JSON.stringify({level,result,drags:result.drags??[],floor,multi,single:nc.length-multi},null,2));report.push({i,seed,status:result.status,cost:result.cost??null,bestClears:result.bestClears??22,floor:floor?.status??null,multi,single:nc.length-multi});
 if(floor?.thresholdProven){console.log('CANDIDATE '+file);break;}
 if(valid%20===0){console.log(JSON.stringify({i,valid,solved,best}));fs.writeFileSync(path.join(root,'report.json'),JSON.stringify({valid,solved,best,report}));}
}
fs.writeFileSync(path.join(root,'report.json'),JSON.stringify({valid,solved,best,report},null,2));console.log(JSON.stringify({root,valid,solved,best}));
