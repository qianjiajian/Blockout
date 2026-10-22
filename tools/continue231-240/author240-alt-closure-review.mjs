import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {compileSpatial} from '../continuation211-colored-witness.mjs';
import {ROOT,ruleGate,loadApi,digest,writeNew,audit} from './common.mjs';

// Independent certificate validation: a start-containing antichain family
// closed under every graph edge covers all finite paths, by induction. This
// verifier uses synchronous whole-graph fixed-point passes, not the qualified
// queue implementation. The separately checked closure is the certificate.
const subset=(a,b)=>(a&b)===a;
const reduce=values=>{
 const out=[];
 for(const m of values){if(out.some(v=>subset(v,m)))continue;for(let i=out.length-1;i>=0;i--)if(subset(m,out[i]))out.splice(i,1);out.push(m);}
 return out.sort((a,b)=>a-b);
};
const pop=m=>{let n=0;while(m){m&=m-1;n++;}return n;};
const sha=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
export function reviewClosure240(level,api){
 assert.equal(level.id,240);assert.equal(level.blocks.length,31);assert.equal(level.playable.length,50);
 assert(level.blocks.every(b=>Object.keys(b).every(k=>['id','shape','x','y','color'].includes(k))),'plain one-stage inventory only');
 for(const key of ['shutters','generators','flipDoors','colorCells','coloredCells','elevators'])assert(!level[key]?.length,`unsupported ${key}`);
 const ordinary=level.gates.filter(g=>!g.frozen);assert.equal(ordinary.length,1);assert.equal(ordinary[0].color,'purple');
 const targets=level.blocks.filter(b=>b.color===ordinary[0].color),obstacles=level.blocks.filter(b=>b.color!==ordinary[0].color);
 assert.equal(targets.length,4);assert.equal(obstacles.length,27);
 assert.deepEqual(level.gates.filter(g=>g.frozen).map(g=>g.frozen).sort((a,b)=>a-b),[4,6,9,12,14,18,20]);
 assert.equal(level.gates.find(g=>g.frozen===4).color,'blue');
 const c=compileSpatial(level,api),owner=new Map();
 obstacles.forEach((b,i)=>b.shape.forEach(([x,y])=>{const key=[b.x+x,b.y+y].join(',');assert(!owner.has(key));owner.set(key,i);}));
 const started=Date.now(),rows=[];let combined=[0],verifiedEdges=0;
 for(const target of targets){
  const b=c.blocks.find(b=>b.id===target.id);assert.equal(b.layers.length,1);assert.equal(b.ice,0);
  const masks=b.poses.map((pose,index)=>pose?b.shape.reduce((m,[dx,dy])=>{const i=owner.get([index%c.W+dx,Math.floor(index/c.W)+dy].join(','));return i===undefined?m:m|(1<<i);},0):null);
  let labels=b.poses.map(()=>[]);labels[b.initial]=[masks[b.initial]];let passes=0,created=1;
  for(;;){assert(Date.now()-started<10000,'certificate construction deadline');const old=labels,proposals=old.map(ms=>ms.slice());
   b.poses.forEach((pose,i)=>{if(pose)for(const j of pose.neighbors)for(const m of old[i])proposals[j].push(m|masks[j]);});
   labels=proposals.map(reduce);passes++;created=labels.reduce((n,ms)=>n+ms.length,0);assert(created<=100000,'certificate label limit');
   if(JSON.stringify(labels)===JSON.stringify(old))break;
  }
  // Independent checker does not trust fixed-point termination.
  assert(labels[b.initial].some(m=>subset(m,masks[b.initial])));
  b.poses.forEach((pose,i)=>{if(pose)for(const j of pose.neighbors)for(const m of labels[i]){assert(labels[j].some(v=>subset(v,m|masks[j])));verifiedEdges++;}});
  const goals=b.poses.flatMap((p,i)=>p?.exits[0].some(e=>e.gate.color==='purple')?[i]:[]),goalMasks=reduce(goals.flatMap(i=>labels[i]));assert(goalMasks.length);
  const previous=combined;combined=reduce(previous.flatMap(a=>goalMasks.map(b=>a|b)));
  for(const a of previous)for(const b of goalMasks)assert(combined.some(m=>subset(m,a|b)));
  rows.push({id:b.id,start:b.initial,goals,occupied:masks,neighbors:b.poses.map(p=>p?.neighbors??[]),labels,goalMasks,passes,storedLabels:created});
 }
 const L=Math.min(...combined.map(pop));
 return{status:'PASS_CLOSED_PATH_COVER',L,thresholdProven:L>=21,levelSha256:digest(level),rows,combined,verifiedEdges,elapsedMilliseconds:Date.now()-started,proof:'Each initial label is covered. Every static unit transition preserves coverage by a subset label at its successor. Therefore all actual ordinary-body paths are covered. Cartesian-product subset coverage combines all four ordinary trajectories. Before their fourth removal, every other gate remains closed; each initially occupied obstacle identity crossed by any trajectory must already have made a nonclearing drag. One identity counts at most once. Ignored moving occupancy, ordinary collisions and exit sweep only enlarge the domain.'};
}
if(process.argv[1]?.endsWith('author240-alt-closure-review.mjs')){
 ruleGate();const{api}=await loadApi(),file=process.argv[2];assert(file);const packet=JSON.parse(fs.readFileSync(file)),level=packet.level;
 const result=reviewClosure240(level,api),output=`${ROOT}/author240-alt/closure-review-${Date.now()}.json`;
 if(packet.L!==undefined)assert.equal(result.L,packet.L);
 writeNew(output,{...result,inputFile:file,inputRawSha256:sha(file),scriptRawSha256:sha(new URL(import.meta.url)),audit:audit(level,api)});
 console.log(JSON.stringify({output,status:result.status,L:result.L,verifiedEdges:result.verifiedEdges}));
}
