import fs from 'node:fs';
import {attempt,write,rng} from './common.mjs';
const old=JSON.parse(fs.readFileSync('deliverables/remake151-160-20260927/agent154-156/candidate-156-4141.json'));
const first=Number(process.argv[2]??4200),count=Number(process.argv[3]??32),rows=[];
for(let seed=first;seed<first+count;seed++){
 const l=structuredClone(old.level),R=rng(seed),near=['green','orange','red','cyan'];
 for(let m=0;m<4;m++)for(let j of [0,2]){const b=l.blocks.find(b=>b.id===l.generators[m].queueBlockIds[j]);b.color=seed===first||R.random()<0.65?near[m]:R.shuffle(['red','green','cyan','orange'])[0];}
 const row=attempt(l,seed,{...old.source,queueColorAdaptation:'User1.102 authored non-yellow FIFO colors to make each actual machine exit in nearby lanes while preserving16 real bodies, four queues4, distinct adjacent colors and7/14-yellow parity.'});rows.push(row);console.log(JSON.stringify(row));
 if(row.status==='witness'&&row.U>=5&&row.U<=10){console.log(write('queue156-ready-'+seed,row));break;}
}
console.log(write('queue156-'+first+'-'+Date.now(),rows));
