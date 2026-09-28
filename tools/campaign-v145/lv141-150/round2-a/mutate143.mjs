import fs from'node:fs';import{api,audit,rng,searchSpatial,save,digest}from'./common.mjs';import{floor143}from'./prefix-floor143.mjs';
const original=JSON.parse(fs.readFileSync(process.env.BASE??'deliverables/remake31-200-v145-20260924/batches/lv141-150/round2-a/candidate143-bars-1790476519496.json')),R=rng(Number(process.env.SEED??143250)),rows=[];
for(let attempt=0;attempt<Number(process.env.ATTEMPTS??75);attempt++){
 const level=structuredClone(original.level),seed=R.state(),op=level.blocks.filter(b=>!b.shutterId&&!level.generators[0].queueBlockIds.includes(b.id)),b=R.shuffle(op)[0],color=R.shuffle(['red','blue','yellow','green','cyan','pink'].filter(c=>c!==b.color&&c!==b.layers?.[1]&&(!['green','pink'].includes(c)||b.shape.every(p=>p[1]===0))))[0];b.color=color;if(b.layers)b.layers[0]=color;
 let check;try{check=audit(level);}catch{R.random();continue;}if(!check.passed){R.random();continue;}
 const search=searchSpatial(level,api,{floor:21,maxMilliseconds:1800,maxStates:30000,maxTransitions:600000,diagnosticTrace:true,orderSeed:attempt}),replay=search.status==='witness'?api.replayRevisedRoute(level,search.drags):null;
 let proof=null;if(replay?.complete&&replay.nonClearingDrags>=16)proof=floor143(level,{maxMilliseconds:3000,maxStates:250000});
 const row={attempt,seed,change:{id:b.id,color},status:search.status,clears:search.maxClearsSeen,U:replay?.nonClearingDrags,complete:replay?.complete,floor:proof?.status,shortcut:proof?.relaxedNonClearingDrags,states:proof?.discoveredStates};rows.push(row);console.log(JSON.stringify(row));
 if(replay?.complete&&replay.nonClearingDrags>=16){row.candidate=save('candidate143-mutate',{activeRuleVersion:'1.73.0',level,levelSha256:digest(level),baseCandidate:process.env.BASE,iteration:{seed,attempt,change:row.change,budget:{maxMilliseconds:1800,maxStates:30000}},audit:check,search,replay,drags:search.drags,proof,formalAdopted:false});console.log(row.candidate);if(proof?.thresholdProven)break;}
 R.random();
}
console.log(save('attempts143-mutate',rows));
