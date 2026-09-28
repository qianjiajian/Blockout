import fs from 'node:fs';
import {api,write,attempt,rng,shapes,audit,digest} from './common.mjs';
import {proveOpening156} from './opening-floor156.mjs';
const old=JSON.parse(fs.readFileSync('deliverables/remake151-160-20260927/agent154-156/candidate-156-99.json'));
const first=Number(process.argv[2]??4100),count=Number(process.argv[3]??60),rows=[];
for(let seed=first;seed<first+count;seed++){
 const l=structuredClone(old.level),R=rng(seed),q=new Set(l.generators.flatMap(g=>g.queueBlockIds)),colors=R.shuffle(['yellow','red','green','cyan','orange']);
 for(const b of l.blocks)if(q.has(b.id)&&Math.min(...b.shape.map(p=>p[0]))>0)b.shape=shapes[6];
 l.flipDoors.forEach((g,i)=>{g.color=g.id=colors[i];g.initiallyOpen=g.color!=='yellow';g.size=seed%3===0?2:g.size;});
 // New non-yellow palette permutation preserves all yellow parity and adjacency.
 const alt=R.shuffle(['red','green','cyan','orange']),map=Object.fromEntries(['red','green','cyan','orange'].map((c,i)=>[c,alt[i]]));
 for(const b of l.blocks)if(!q.has(b.id)&&!['r102-156-o2'].includes(b.id)&&b.color!=='yellow')b.color=map[b.color];
 for(const b of l.blocks)if(q.has(b.id)&&b.id.endsWith('-2'))b.color=R.shuffle(['red','green','cyan','orange'])[0];
 const a=audit(l),row={seed,level:l,levelSha256:digest(l),audit:a,qualification:'SCREEN_ONLY_NO_ADOPTION'};
 if(a.passed){row.floor=proveOpening156(l);if(row.floor.native.proof.thresholdProven){row.candidate=attempt(l,seed,{...old.source,adaptation:'Source four opening shapes/colors retained; 8SQ2+S ordinary blocks fill42 preserved geometry. All16FIFO bodies kept with8M11/29; topL3 changed to nativeT4 to touch middle mouth without shiftedx. Authored gate positions and non-source filler colors varied; truephaseyellowclosed/allothersopen.'});}}
 rows.push(row);console.log(JSON.stringify({seed,audit:a.passed,lower:row.floor?.native.proof.status,relaxedU:row.floor?.native.proof.relaxedNonClearingDrags,candidate:row.candidate}));
 if(row.candidate?.status==='witness'&&row.candidate.U>=5&&row.candidate.U<=10){console.log(write('square156-ready-'+seed,row));break;}
}
console.log(write('square156-'+first+'-'+Date.now(),rows));
