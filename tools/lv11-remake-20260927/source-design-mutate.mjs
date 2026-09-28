import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {runStaticNative} from './design-native.mjs';
import {checkSymmetryFloor} from '../remake21to30-symmetry-floor-v139.mjs';
import {digest} from '../revised-preview-validation-v160.mjs';
import {verifyRulesLock} from '../verify-rules-lock.mjs';
const lock=verifyRulesLock();assert(lock.ok);assert.equal(lock.activeVersion,'1.79.0');
const root='deliverables/lv11-remake-20260927',out=path.join(root,'source-design-mutate-'+Date.now());fs.mkdirSync(out,{recursive:true});
const seeds=[root+'/source-design-search-1790489362727/best-8.json',root+'/design-local-1790489356265/attempt-164.json',root+'/design-structured-1790489247344/route-37.json'];
const population=seeds.map(f=>({level:JSON.parse(fs.readFileSync(f)).level,origin:f,cost:0}));
let state=Number(process.argv[2]??271114);const random=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296),pick=a=>a[Math.floor(random()*a.length)];
const seen=new Set(),rows=[];let best=0,valid=0;
function validColors(level){const map=new Map();for(const b of level.blocks)for(const[dx,dy]of b.shape){const p=[b.x+dx,b.y+dy],key=p.join(',');if(map.has(key))return false;map.set(key,b);}for(const[k,b]of map){const[x,y]=k.split(',').map(Number);for(const q of [[x+1,y],[x,y+1]]){const c=map.get(q.join(','));if(c&&c!==b&&c.color===b.color)return false;}}return true;}
function mutate(base){const level=structuredClone(base);const bars=level.blocks.filter(b=>b.shape.length===3);
 if(random()<.45){for(let k=0;k<1+Math.floor(random()*3);k++){const a=pick(bars),b=pick(bars),p=[a.x,a.y];a.x=b.x;a.y=b.y;b.x=p[0];b.y=p[1];}}
 if(!validColors(level))return;
 const set=new Set(level.playable.map(p=>p.join(','))),gates=level.gates;
 const count=1+Math.floor(random()*3);for(let j=0;j<count;j++){
  const g=pick(gates),opts=[];for(const side of ['left','right','top','bottom']){
   if(g.size!==3&&(side==='top'||side==='bottom'))continue;
   const length=side==='top'||side==='bottom'?level.width:level.height;
   for(let offset=0;offset+g.size<=length;offset++){
    const mouth=Array.from({length:g.size},(_,i)=>side==='left'?[0,offset+i]:side==='right'?[level.width-1,offset+i]:side==='top'?[offset+i,0]:[offset+i,level.height-1]);
    if(mouth.every(p=>set.has(p.join(',')))&&!gates.some(h=>h!==g&&h.side===side&&offset<h.offset+h.size&&h.offset<offset+g.size))opts.push({side,offset});
   }
  }if(opts.length)Object.assign(g,pick(opts));
 }
 return level;
}
for(let i=0;i<Number(process.argv[3]??2000);i++){
 const parent=pick(population),level=mutate(parent.level);if(!level)continue;const sha=digest(level);if(seen.has(sha))continue;seen.add(sha);valid++;
 const native=runStaticNative(level,{artifactRoot:out,maxMilliseconds:400,maxStates:300000,floor:21});
 const cost=native.relaxedNonClearingDrags??null,row={i,cost,status:native.status,states:native.discoveredStates,ms:native.milliseconds,sha};rows.push(row);
 if(cost!==null||native.status==='unknown')fs.writeFileSync(path.join(out,'attempt-'+i+'.json'),JSON.stringify({level,native,parent:parent.origin},null,2),{flag:'wx'});
 if(cost!==null){
  if(cost>=9&&population.length<150)population.push({level,origin:path.join(out,'attempt-'+i+'.json'),cost});
  if(cost>best){best=cost;console.log(JSON.stringify({out,best,...row}));}
  if(cost>=16){
   const result=checkSymmetryFloor(level,{floor:21,maxStates:500000,maxMilliseconds:20000}),drags=result.relaxedRoute??[],nc=drags.filter(d=>!d.exitSide),multi=nc.filter(d=>level.blocks.find(b=>b.id===d.blockId).shape.length>1).length;
   const target=path.join(out,'route-'+i+'.json');fs.writeFileSync(target,JSON.stringify({level,native,result,drags,multi,single:nc.length-multi},null,2),{flag:'wx'});console.log(JSON.stringify({target,cost:result.relaxedNonClearingDrags,multi,single:nc.length-multi}));if(drags.length&&multi>nc.length-multi)break;
  }
 }
 if(valid%20===0){fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({out,rows,best,valid,population:population.length,screeningOnly:true},null,2));console.log(JSON.stringify({i,valid,best,population:population.length}));}
}
fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({out,rows,best,valid,population:population.length,screeningOnly:true},null,2));console.log(JSON.stringify({out,best,valid}));
