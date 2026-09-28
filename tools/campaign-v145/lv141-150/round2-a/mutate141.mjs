import fs from 'node:fs';
import {api,audit,rng,searchSpatial,save,digest} from './common.mjs';
const original=JSON.parse(fs.readFileSync(process.env.BASE??'deliverables/remake31-200-v145-20260924/batches/lv141-150/round2-a/candidate141-1790476584130.json')),R=rng(Number(process.env.SEED??141200)),rows=[];
for(let attempt=0;attempt<Number(process.env.ATTEMPTS??30);attempt++){
 const level=structuredClone(original.level),seed=R.state();
 const fixed=process.env.SIMPLE?Object.fromEntries(level.blocks.filter(b=>b.shutterId==='s141-curtain8').map(b=>[b.id,'orange'])):{'s141-h1':'orange','s141-h6':'cyan','s141-h8':'green','s141-h10':'yellow'};
 for(const[id,color]of Object.entries(fixed)){const b=level.blocks.find(b=>b.id===id);b.color=color;if(b.layers)b.layers[0]=color;}
 if(attempt)for(const b of level.blocks.filter(b=>b.shutterId==='s141-curtain8'&&!fixed[b.id])){const palette=b.layers?['red','blue','yellow','green']:['red','blue','yellow','green','orange','purple','cyan','pink'];const color=R.shuffle(palette.filter(c=>c!==b.layers?.[1]))[0];b.color=color;if(b.layers)b.layers[0]=color;}
 const check=audit(level);if(!check.passed){rows.push({attempt,seed,status:'static-rejected'});R.random();continue;}
 const search=searchSpatial(level,api,{floor:11,maxMilliseconds:4000,maxStates:50000,maxTransitions:800000,diagnosticTrace:true,orderSeed:attempt}),replay=search.status==='witness'?api.replayRevisedRoute(level,search.drags):null;
 const row={attempt,seed,status:search.status,clears:search.maxClearsSeen,U:replay?.nonClearingDrags,complete:replay?.complete,partialCost:search.partialCost};rows.push(row);console.log(JSON.stringify(row));
 if(replay?.complete||attempt===0) {row.candidate=save('candidate141-hidden',{activeRuleVersion:'1.73.0',level,levelSha256:digest(level),sourceFile:original.source,iteration:{seed,attempt,budget:{maxMilliseconds:4000,maxStates:50000,maxTransitions:800000},changes:'Known hidden colors varied under v1.73 while preserving original identities/shapes/key groups/three shells/one curtain8 and real32cell lift.'},audit:check,search,replay,drags:search.drags??[],formalAdopted:false});console.log(row.candidate);}
 R.random();
}
console.log(save('attempts141-hidden',rows));
