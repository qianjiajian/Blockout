import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {verifyRulesLock} from '../verify-rules-lock.mjs';import {witness} from '../lv11-remake-20260927/design-witness.mjs';
import {checkSymmetryFloor} from '../remake21to30-symmetry-floor-v139.mjs';import {loadPreviewCore,digest} from '../revised-preview-validation-v160.mjs';
const lock=verifyRulesLock();assert(lock.ok);assert.equal(lock.activeVersion,'1.85.0');
const source=process.argv[2]??'deliverables/lv17-remake-20260927/design-probe-1790495719582.json',color=process.argv[3]??'red';
const base=JSON.parse(fs.readFileSync(source)).level,root=`deliverables/lv17-remake-20260927/design-one-gate-${Date.now()}`;fs.mkdirSync(root,{recursive:true});
const moving=base.gates.find(g=>g.color===color),other=base.gates.filter(g=>g!==moving),same=base.blocks.filter(b=>(b.layers??[b.color]).includes(color)),options=[];
const overlap=(a,b)=>a.side===b.side&&a.offset<b.offset+b.size&&b.offset<a.offset+a.size;
for(const side of ['bottom','left','right','top']){const h=['top','bottom'].includes(side),size=Math.max(...same.map(b=>1+Math.max(...b.shape.map(p=>p[h?0:1]))));
 for(let offset=0;offset+size<=(h?6:8);offset++){const g={...moving,side,offset,size};if(!other.some(o=>overlap(g,o))&&JSON.stringify(g)!==JSON.stringify(moving))options.push(g);}}
const{api}=await loadPreviewCore(),rows=[];let selected;
for(const[index,gate]of options.entries()){
 const level=structuredClone(base);level.gates=level.gates.map(g=>g.color===color?gate:g);
 const result=witness(level,{maxCost:15,maxStates:240000,maxMilliseconds:1200,weight:30}),drags=result.drags??[],replay=drags.length?api.replayRevisedRoute(level,drags):null;
 const nc=drags.filter(d=>!d.exitSide),multi=nc.filter(d=>level.blocks.find(b=>b.id===d.blockId).shape.length>1).length,kinds={multiCell:multi,singleCell:nc.length-multi};
 const data={source,level,levelSha256:digest(level),result,drags,replay,kinds};
 if(replay?.valid&&replay.complete&&result.cost>=11&&multi>0)data.floor=checkSymmetryFloor(level,{floor:11,maxStates:700000,maxMilliseconds:15000});
 const file=path.join(root,`attempt-${index}.json`);fs.writeFileSync(file,JSON.stringify(data,null,2));rows.push({file,gate,status:result.status,cost:result.cost,bestClears:result.bestClears,kinds,floor:data.floor?.status});console.log(JSON.stringify(rows.at(-1)));
 if(data.floor?.thresholdProven){selected=file;break;}
}
fs.writeFileSync(path.join(root,'report.json'),JSON.stringify({rows,selected},null,2));console.log(JSON.stringify({root,selected}));
