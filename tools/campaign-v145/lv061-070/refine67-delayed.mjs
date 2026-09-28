import fs from 'node:fs';
import {loadApi} from '../../native-block-repair-v143.mjs';
import {digest} from '../../revised-preview-validation-v160.mjs';
import {checkDelayedLiftFloor67} from './delayed-lift-floor67.mjs';
import {probeDelayed67} from './delayed-probe67.mjs';
import {searchLiftWitness} from './lift-witness-search.mjs';
import {seededRng} from '../../../deliverables/remake21-30-v139-20260924/agent28-30/packing.mjs';
const root='deliverables/remake31-200-v145-20260924/batches/lv061-070/author65-67',baseFile=process.argv[2]??root+'/draft67-97-1790253305735.json',base=JSON.parse(fs.readFileSync(baseFile)),{api}=await loadApi(),seed=Number(process.env.SEED??1476701),rng=seededRng(seed),pick=a=>a[Math.floor(rng.rand()*a.length)],start=Date.now(),deadline=start+Number(process.env.SECONDS??120)*1000,seen=new Set(),counts={},bump=k=>counts[k]=(counts[k]??0)+1;
const source=fs.readFileSync(import.meta.filename),snapshot=`${root}/refiner67-${Date.now()}.mjs.txt`;fs.writeFileSync(snapshot,source);
for(let attempt=0;Date.now()<deadline;attempt++){
 const level=structuredClone(base.level),changes=[];
 for(let a=0,n=pick([1,1,1,2]);a<n;a++){
  const g=pick(level.gates),slots=[];for(const side of ['left','right','top','bottom'])for(const size of [2,3])for(let offset=0;offset+size<=(['left','right'].includes(side)?level.height:level.width);offset++){
   const p=Array.from({length:size},(_,i)=>side==='left'?[0,offset+i]:side==='right'?[level.width-1,offset+i]:side==='top'?[offset+i,0]:[offset+i,level.height-1]);if(!p.every(p=>level.playable.some(q=>q[0]===p[0]&&q[1]===p[1])))continue;
   if(level.gates.some(h=>h.id!==g.id&&h.side===side&&offset<h.offset+h.size&&h.offset<offset+size))continue;if(level.blocks.filter(b=>b.color===g.color).some(b=>1+Math.max(...b.shape.map(p=>['left','right'].includes(side)?p[1]:p[0]))>size))continue;slots.push({side,size,offset});
  }if(!slots.length)continue;const patch=pick(slots);Object.assign(g,patch);changes.push({color:g.color,...patch});
 }
 const sha=digest(level);if(seen.has(sha))continue;seen.add(sha);try{api.validateLevel(level);}catch{bump('invalid');continue;}
 const probe=probeDelayed67(level,api,{floor:11,maxMilliseconds:100,maxStates:10000});if(probe.status==='relaxed-witness'){bump('relaxed-shortcut');continue;}
 const search=searchLiftWitness(level,{floor:16,fastEdges:true,maxMilliseconds:1000,maxStates:100000,orderSeed:attempt%level.blocks.length});if(search.status!=='witness'){bump('no-witness');continue;}
 const replay=api.replayRevisedRoute(level,search.drags);if(!replay.valid||!replay.complete)throw Error('Invalid complete witness');
 const proof=checkDelayedLiftFloor67(level,api,{floor:11,maxMilliseconds:2000,maxStates:120000}),out=`${root}/draft67-refine-${attempt}-${Date.now()}.json`;fs.writeFileSync(out,JSON.stringify({ruleVersion:'1.47.0',level,drags:search.drags,replay,search,delayedProof:proof,formalAdopted:false,sourceStatus:'review-required',reproduction:{baseFile,baseFileSha256:digest(fs.readFileSync(baseFile)),seed,attempt,changes,snapshot,toolSha256:digest(source)}},null,2));console.log(JSON.stringify({out,U:search.cost,proof:proof.status,states:proof.states,frontier:proof.frontierCost,changes}));bump(proof.status);if(proof.thresholdProven)break;
}
console.log(JSON.stringify({seed,counts,unique:seen.size,ms:Date.now()-start}));
