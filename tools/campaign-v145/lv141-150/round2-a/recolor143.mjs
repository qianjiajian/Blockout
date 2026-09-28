import fs from 'node:fs';
import {api,audit,rng,recolor,searchSpatial,save,digest} from './common.mjs';
const original=JSON.parse(fs.readFileSync(process.env.BASE??'deliverables/remake31-200-v145-20260924/batches/lv141-150/source143/candidate143-1790252569020.json'));
const R=rng(Number(process.env.SEED??143001)),rows=[];let best=-1;
for(let attempt=0;attempt<Number(process.env.ATTEMPTS??30);attempt++){
 const level=structuredClone(original.level),seed=R.state();
 level.gates.find(g=>g.color==='cyan').size=3;level.gates.find(g=>g.color==='cyan').offset=4;
 if(attempt){const opening=level.blocks.filter(b=>!b.shutterId&&!level.generators[0].queueBlockIds.includes(b.id));if(!recolor(opening,['green','yellow','red','pink','blue','cyan'],{seed,pins:{'s143-o3':'green','s143-o6':'yellow'},filter:(b,c)=>(b.shape.length!==9||['red','blue','yellow'].includes(c))&&(!['green','pink'].includes(c)||b.shape.every(p=>p[1]===0))})){R.random();continue;}}
 const check=audit(level);if(!check.passed){rows.push({attempt,seed,status:'static-rejected',audit:check});R.random();continue;}
 const search=searchSpatial(level,api,{floor:21,maxMilliseconds:3000,maxStates:50000,maxTransitions:800000,diagnosticTrace:true,orderSeed:attempt});
 const replay=search.status==='witness'?api.replayRevisedRoute(level,search.drags):null;
 const row={attempt,seed,status:search.status,stop:search.termination,clears:search.maxClearsSeen,cost:search.cost,replayValid:replay?.valid,replayComplete:replay?.complete};rows.push(row);console.log(JSON.stringify(row));
 if((search.maxClearsSeen??-1)>best||replay?.complete){best=Math.max(best,search.maxClearsSeen??-1);row.candidate=save('candidate143',{activeRuleVersion:'1.73.0',level,levelSha256:digest(level),source:original.sourceFile,adaptation:original.adaptation,iteration:{seed,attempt,budget:{maxMilliseconds:2500,maxStates:30000,maxTransitions:500000},changes:'Known opening colors altered under v1.73; source identities, shell, hidden ice9, curtain19 and both FIFO members retained.'},audit:check,search,replay,drags:search.drags??[],formalAdopted:false});console.log(row.candidate);}
 R.random();
}
console.log(save('attempts143',rows));
