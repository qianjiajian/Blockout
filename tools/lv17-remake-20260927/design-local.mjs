import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {verifyRulesLock} from '../verify-rules-lock.mjs';
import {witness} from '../lv11-remake-20260927/design-witness.mjs';
import {checkSymmetryFloor} from '../remake21to30-symmetry-floor-v139.mjs';
import {loadPreviewCore,digest} from '../revised-preview-validation-v160.mjs';
const lock=verifyRulesLock();assert(lock.ok);assert.equal(lock.activeVersion,'1.85.0');
const input=process.argv[2]??'deliverables/lv17-remake-20260927/design-search-1790495480834/attempt-11.json';
const base=JSON.parse(fs.readFileSync(input)).level,limit=Number(process.argv[3]??60),budget=Number(process.argv[4]??600);
let seed=Number(process.argv[5]??178511);const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;},pick=a=>a[Math.floor(rnd()*a.length)];
const root=`deliverables/lv17-remake-20260927/design-local-${Date.now()}`;fs.mkdirSync(root,{recursive:true});
const gateOptions=Object.fromEntries(base.gates.map(g=>{const same=base.blocks.filter(b=>(b.layers??[b.color]).includes(g.color)),list=[];
 for(const side of ['top','bottom','left','right']){const h=['top','bottom'].includes(side),size=Math.max(...same.map(b=>1+Math.max(...b.shape.map(p=>p[h?0:1]))));
  for(let offset=0;offset+size<=(h?6:8);offset++)list.push({side,offset,size});}return[g.color,list];}));
const overlap=(a,b)=>a.side===b.side&&a.offset<b.offset+b.size&&b.offset<a.offset+a.size;
function make(i){
 const level=structuredClone(base),chosen=[level.gates.find(g=>g.color==='yellow')];
 for(const color of ['red','blue','pink','green']){
  const old=level.gates.find(g=>g.color===color);let opts=gateOptions[color].filter(g=>!chosen.some(o=>overlap(g,o)));
  // The first family targets accessible red16 mouths; not a proof pruning.
  if(color==='red'&&i<30)opts=opts.filter(g=>['left','right'].includes(g.side)&&g.offset>=3);
  if(color==='blue'&&i<15)opts=opts.filter(g=>g.side==='right'&&g.offset>=3);
  if(!opts.length)return null;chosen.push({...old,...pick(opts)});
 }level.gates=chosen;return level;
}
const{api}=await loadPreviewCore(),rows=[];let selected,best=null;
for(let i=0;i<limit;i++){
 const beforeSeed=seed,level=make(i);if(!level){i--;continue;}
 const result=witness(level,{maxCost:15,maxStates:160000,maxMilliseconds:budget,weight:15}),drags=result.drags??[],replay=drags.length?api.replayRevisedRoute(level,drags):null;
 const nc=drags.filter(d=>!d.exitSide),multi=nc.filter(d=>level.blocks.find(b=>b.id===d.blockId).shape.length>1).length,kinds={multiCell:multi,singleCell:nc.length-multi};
 const data={source:input,seedBefore:beforeSeed,seedAfter:seed,level,levelSha256:digest(level),result,drags,replay,kinds};
 if(replay?.valid&&replay.complete){assert.equal(replay.clearEvents,31);if(!best||result.cost>best.cost)best={i,cost:result.cost,kinds};if(result.cost>=11&&multi>0)data.floor=checkSymmetryFloor(level,{floor:11,maxStates:450000,maxMilliseconds:6000});}
 const file=path.join(root,`attempt-${i}.json`);fs.writeFileSync(file,JSON.stringify(data,null,2));rows.push({i,file,status:result.status,cost:result.cost,bestClears:result.bestClears,kinds,floor:data.floor?.status});
 if(data.floor?.thresholdProven){selected=file;break;}
 if(i%10===9){fs.writeFileSync(path.join(root,'report.json'),JSON.stringify({rows,best},null,2));console.log(JSON.stringify({i,best,bestClears:Math.max(...rows.map(r=>r.bestClears??0))}));}
}
fs.writeFileSync(path.join(root,'report.json'),JSON.stringify({source:input,rows,best,selected},null,2));console.log(JSON.stringify({root,best,selected}));
