import fs from 'node:fs';
import {readBaseline,loadApi,auditSpatial,digest,PROFILE,writeNew} from '../common.mjs';
import {replay} from '../replay.mjs';
import {loadApi as loadReplay} from '../replay.mjs';
import {seededRng,rect} from '../../../deliverables/remake21-30-v139-20260924/agent28-30/packing.mjs';
import {compile,search} from './domain.mjs';
const OUT='deliverables/remake191-200-20260927/root200',save=(name,data)=>{const p=`${OUT}/${name}-${Date.now()}.json`;writeNew(p,data);return p;};
const base=readBaseline().levels[199].level,{api}=await loadReplay(),rng=seededRng(Number(process.env.SEED??200108)),log=[];
function make(){const l=structuredClone(base);l.mechanismRules=PROFILE;l.difficulty='easy';l.blocks=[];
 const heights=rng.shuffle([2,2,1,1,1,1]),colors=rng.shuffle(['green','blue','yellow','orange','pink','purple']);let y=0;const redSide=Math.floor(rng.rand()*2);
 for(let row=0;row<6;row++){for(let side=0;side<2;side++)l.blocks.push({id:`r108-200-b${row*2+side}`,color:side===(row+redSide)%2?'red':colors[row],x:side*3,y,shape:rect(3,heights[row])});y+=heights[row];}
 const reds=l.blocks.filter(b=>b.color==='red');for(const b of rng.shuffle(reds).slice(0,2))b.frozen=3;
 const gridreds=reds.filter(b=>b.shape.length===6);l.coloredGrids=[{id:'r108-200-red-grid',color:'red',cells:gridreds.flatMap(b=>b.shape.map(([x,y])=>[x+b.x,y+b.y]))}];
 const ports=rng.shuffle([['top',0,3],['top',3,3],['bottom',0,3],['bottom',3,3],['left',1,3],['left',4,3],['right',1,3],['right',4,3]]).slice(0,7);
 const gates=[['red',0],['green',3],['blue',5],['yellow',6],['orange',9],['pink',10],['purple',11]];
 l.gates=gates.map(([color,frozen],i)=>({id:`r108-200-g${i}`,color,side:ports[i][0],offset:ports[i][1],size:ports[i][2],...(frozen?{frozen}:{})}));return l;
}
const start=Date.now(),budget=Number(process.argv[2]??180000);let best=0;
while(Date.now()-start<budget){const seed=rng.state(),level=make();let c;try{c=compile(level);}catch(e){log.push({seed,invalid:e.message});continue;}
 const r=search(c,{floor:11,maxStates:18000,maxMilliseconds:150,pointer:true});const row={seed,sha:digest(level),status:r.status,U:r.cost,clears:r.maxClears,ms:r.ms};log.push(row);
 if((r.maxClears??c.totalClears)>best){best=r.maxClears??c.totalClears;console.log(JSON.stringify({trials:log.length,best}));save('partial200',{level,result:r});}
 if(r.status!=='witness'||r.cost<5)continue;
 let rr,spatial;try{rr=replay(level,r.drags,api,{complete:true,requirePointerCompatible:true});spatial=auditSpatial(level,api);}catch(e){row.rejected=e.message;continue;}
 const proof=search(c,{floor:5,maxStates:200000,maxMilliseconds:6000,prove:true});row.L=proof.status;
 const file=save(proof.thresholdProven?'candidate200':'unverified200',{ruleVersion:'1.108.0',level,levelSha256:digest(level),drags:r.drags,replay:rr,spatial,proof,seed,search:r});console.log(JSON.stringify({file,U:r.cost,L:proof.status}));if(proof.thresholdProven)break;
}
console.log(JSON.stringify({trials:log.length,best,attempts:save('attempts200',{budget,elapsed:Date.now()-start,log})}));
