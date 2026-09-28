import fs from 'node:fs';
import {loadApi,ROOT,ruleGate,save,auditSpatial,digest} from './remake101to110-v146.mjs';
import {verifySource105} from './verify-source105-v147.mjs';
import {seededRng} from '../deliverables/remake21-30-v139-20260924/agent28-30/packing.mjs';
import {search} from '../.codex-temp/remake21-30-quality/agent25-27/graph.mjs';
import {checkSymmetryFloor} from './remake21to30-symmetry-floor-v139.mjs';
ruleGate();const {api}=await loadApi(),seed=Number(process.env.SEED??1471053),rng=seededRng(seed),pick=a=>a[Math.floor(rng.rand()*a.length)];
const inputs=process.argv.slice(2),pool=inputs.map(f=>({data:JSON.parse(fs.readFileSync(f)),file:f}));if(!pool.length)throw Error('Provide seed candidate paths');
const shape=b=>JSON.stringify(b.shape),seen=new Set(),stats={attempts:0,valid:0,solved:0,low:0,unknown:0,proven:0};
const start=Date.now(),until=start+Number(process.env.SECONDS??300)*1000;
while(Date.now()<until){
 stats.attempts++;const parent=pick(pool),data=structuredClone(parent.data),l=data.level;
 if(rng.rand()<.65){
  const groups=l.blocks.map(b=>l.blocks.filter(a=>a.shutterId===b.shutterId&&shape(a)===shape(b))).filter(a=>a.length>1),group=pick(groups),a=pick(group),b=pick(group.filter(b=>b!==a));[a.x,b.x]=[b.x,a.x];[a.y,b.y]=[b.y,a.y];
 }else{
  const g=pick(l.gates.filter(g=>g.color!=='blue')),bs=l.blocks.filter(b=>(b.layers??[b.color]).includes(g.color)),opts=[];
  for(const side of ['top','bottom','left','right']){const horizontal=['top','bottom'].includes(side),size=Math.max(...bs.map(b=>1+Math.max(...b.shape.map(p=>p[horizontal?0:1]))));if(size>3)continue;for(let offset=0;offset+size<=(horizontal?l.width:l.height);offset++)if(!l.gates.some(a=>a!==g&&a.side===side&&offset<a.offset+a.size&&a.offset<offset+size))opts.push({side,size,offset});}
  if(!opts.length)continue;Object.assign(g,pick(opts));
 }
 const hash=digest(l);if(seen.has(hash))continue;seen.add(hash);
 try{auditSpatial(l,api);verifySource105(data);}catch{continue;}stats.valid++;
 const route=search(l,{floor:31,maxStates:100000,maxMilliseconds:750,weight:1000,orderSeed:stats.attempts%17});if(route.status!=='witness'||route.cost<21)continue;
 const replay=api.replayRevisedRoute(l,route.drags);if(!replay.valid||!replay.complete)continue;stats.solved++;
 const proof=checkSymmetryFloor(l,{floor:21,maxStates:200000,maxMilliseconds:2500});
 if(proof.status==='relaxed-shortcut'&&proof.relaxedNonClearingDrags<18){stats.low++;continue;}
 Object.assign(data,{seed:`mutate/${seed}/${stats.attempts}`,parent:parent.file,drags:route.drags,replay,proof});
 const file=save(`${ROOT}/root105/mutation-${seed}-${stats.attempts}-${Date.now()}.json`,data);
 if(proof.thresholdProven)stats.proven++;if(proof.status==='unknown')stats.unknown++;
 console.log(JSON.stringify({file,U:replay.nonClearingDrags,proof:proof.status,shortcut:proof.relaxedNonClearingDrags,...stats}));
 pool.push({file,data});if(pool.length>16)pool.splice(2,1);if(proof.thresholdProven)break;
}
save(`${ROOT}/root105/mutation-run-${Date.now()}.json`,{seed,inputs,stats,elapsed:Date.now()-start});console.log(JSON.stringify(stats));
