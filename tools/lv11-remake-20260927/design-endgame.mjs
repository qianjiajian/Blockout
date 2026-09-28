import fs from 'node:fs';import path from 'node:path';import {witness} from './design-witness.mjs';import {runStaticNative} from './design-native.mjs';
const root='deliverables/lv11-remake-20260927/design-endgame-'+Date.now();fs.mkdirSync(root,{recursive:true});
let seed=Number(process.argv[2]??27480);const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;},pick=a=>a[Math.floor(rnd()*a.length)];
const shuffle=a=>{a=[...a];for(let i=a.length-1;i;i--){let j=Math.floor(rnd()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const seeds=['deliverables/lv11-remake-20260927/design-structured-1790489247344/route-37.json','deliverables/lv11-remake-20260927/design-structured-1790489811659/route-7681.json','deliverables/lv11-remake-20260927/design-witness-1790489560966/witness-59.json'].map(p=>JSON.parse(fs.readFileSync(p)).level);
const conflict=(g,h)=>g.side===h.side&&g.offset<h.offset+h.size&&h.offset<g.offset+g.size;
let valid=0,solved=0,best=-1;const report=[];
for(let i=0;i<Number(process.argv[3]??600);i++){
 const level=structuredClone(seeds[i%seeds.length]),ice=level.blocks.filter(b=>b.frozen),top=ice.find(b=>b.x===0&&b.y===0),b=pick(ice.filter(b=>b.frozen===17));[b.x,b.y,top.x,top.y]=[top.x,top.y,b.x,b.y];
 const own=new Map(level.blocks.flatMap(b=>b.shape.map(([dx,dy])=>[(b.x+dx)+','+(b.y+dy),b])));let bad=false;for(const[cell,b]of own){const[x,y]=cell.split(',').map(Number);for(const p of[[x+1,y],[x,y+1]]){const c=own.get(p.join(','));if(c&&c.id!==b.id&&c.color===b.color)bad=true;}}if(bad)continue;
 const gates=[];let invalid=false;
 for(const[color,frozen]of [['cyan',0],['green',0],['pink',6],['purple',7],['red',13]]){
  const opts=[];for(const side of['left','right'])for(let offset=0;offset<8;offset++){const size=color==='green'?pick([1,3]):1;if(offset+size>8||side==='right'&&(offset<1||offset+size>7))continue;const g={side,offset,size};if(gates.some(h=>conflict(g,h)))continue;if(color==='cyan'&&(side==='right'||own.get('0,'+offset)?.color!=='cyan'))continue;opts.push(g);}
  if(color==='pink'||color==='red'||color==='purple')for(const side of['top','bottom']){const g={side,offset:0,size:3};if(!gates.some(h=>conflict(g,h)))opts.push(g);}
  if(color==='pink'&&i%2===0){const chosen=opts.find(g=>g.side==='top');if(chosen)gates.push({...chosen,id:'lv11-gate-'+color,color,frozen});else{invalid=true;break;}}
  else if(opts.length)gates.push({...pick(opts),id:'lv11-gate-'+color,color,...(frozen?{frozen}:{})});else{invalid=true;break;}
 }
 if(invalid)continue;level.gates=gates;valid++;
 const result=witness(level,{maxCost:20,maxStates:100000,maxMilliseconds:1000,weight:20});
 let floor=null;if(result.drags){solved++;if(result.cost>best){best=result.cost;console.log(JSON.stringify({i,valid,solved,best}));}if(result.cost>=16)floor=runStaticNative(level,{artifactRoot:path.join(root,'native-runs'),maxMilliseconds:3000,maxStates:2000000,floor:16});}
 const nc=(result.drags??[]).filter(d=>!d.exitSide),multi=nc.filter(d=>level.blocks.find(b=>b.id===d.blockId).shape.length===3).length,file=path.join(root,'attempt-'+i+'.json');fs.writeFileSync(file,JSON.stringify({level,result,drags:result.drags??[],floor,multi,single:nc.length-multi},null,2));report.push({i,seed,status:result.status,cost:result.cost??null,bestClears:result.bestClears??22,floor:floor?.status??null,floorCost:floor?.relaxedNonClearingDrags??null,multi,single:nc.length-multi});
 if(floor?.thresholdProven){console.log('CANDIDATE '+file);break;}
 if(valid%25===0){console.log(JSON.stringify({i,valid,solved,best}));fs.writeFileSync(path.join(root,'report.json'),JSON.stringify({valid,solved,best,report}));}
}
fs.writeFileSync(path.join(root,'report.json'),JSON.stringify({valid,solved,best,report},null,2));console.log(JSON.stringify({root,valid,solved,best}));
