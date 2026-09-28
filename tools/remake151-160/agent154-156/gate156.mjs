import fs from 'node:fs';
import {write,attempt} from './common.mjs';
import {proveOpening156} from './opening-floor156.mjs';
const original=JSON.parse(fs.readFileSync('deliverables/remake151-160-20260927/agent154-156/candidate-156-3209.json'));
const permutations=a=>a.length?a.flatMap((v,i)=>permutations(a.filter((_,j)=>j!==i)).map(p=>[v,...p])):[[]];
let seed=4000;const rows=[];
for(const main of permutations(['yellow','red','green']))for(const side of permutations(['cyan','orange'])){
 const level=structuredClone(original.level),colors=[...main,...side];level.flipDoors.forEach((g,i)=>{g.id=g.color=colors[i];g.initiallyOpen=g.color!=='yellow';});
 const row={seed:seed++,level,projection:proveOpening156(level)};if(row.projection.native.proof.thresholdProven)row.candidate=attempt(level,row.seed,{...original.source,change:'Three size3 and two size2 flip exits permuted, each color retains original opening phase.'});
 console.log(JSON.stringify({seed:row.seed,proof:row.projection.native.proof,candidate:row.candidate}));rows.push(row);
}
console.log(write('gate156-'+Date.now(),rows));
