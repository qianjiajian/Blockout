import fs from'node:fs';import{api,audit,rng,recolor,tile,searchSpatial,save,digest,shapes}from'./common.mjs';import{floor143}from'./prefix-floor143.mjs';
const original=JSON.parse(fs.readFileSync('deliverables/remake31-200-v145-20260924/batches/lv141-150/source143/candidate143-1790252569020.json')),R=rng(Number(process.env.SEED??143600)),rows=[];let best=-1;
for(let attempt=0;attempt<Number(process.env.ATTEMPTS??100);attempt++){
 const level=structuredClone(original.level),seed=R.state(),q=new Set(level.generators[0].queueBlockIds),op=level.blocks.filter(b=>!b.shutterId&&!q.has(b.id)),shell=op.find(b=>b.layers),others=R.shuffle(op.filter(b=>b!==shell));let shapeIndex=0;const placed=[];
 for(let y=0;y<6;y++){let ids=y===0?[9,8]:y===5?[9,8,1,1]:[9,8,8];ids=R.shuffle(ids);let x=y===0?1:0;for(const shapeId of ids){const b=y===4&&x===0?shell:others.shift();b.shape=shapes[shapeId];b.x=x;b.y=y;x+=Math.max(...b.shape.map(p=>p[0]))+1;placed.push(b);}}
 const first=placed.find(b=>b===shell),yellow=placed.find(b=>b.y===1&&b.x+Math.max(...b.shape.map(p=>p[0]))===6);
 if(!recolor(placed,['green','yellow','red','pink','blue','cyan'],{seed,pins:{[first.id]:'green',[yellow.id]:'yellow'}})){R.random();continue;}
 const hidden=level.blocks.filter(b=>b.shutterId);for(const b of hidden){if(b.shape.length===3&&b.shape.every(p=>p[0]===0))b.shape=shapes[9];if(b.shape.length===3&&b.shape.some(p=>p[1]===1)&&b.shape.some(p=>p[0]===1))b.color=b.id==='s143-h9'?'cyan':'yellow';}
 const hd=tile(hidden,level.playable.filter(([,y])=>y>=6),{seed,maxNodes:15000});if(!hd){R.random();continue;}
 const queue=level.blocks.filter(b=>q.has(b.id));for(const b of queue){b.shape=shapes[9];b.x=2;b.y=9;}level.generators[0].spawn=[2,9];
 level.blocks=[...placed,...hd,...queue];level.gates=[{id:'s143-green',color:'green',side:'left',offset:4,size:1},{id:'s143-yellow',color:'yellow',side:'right',offset:1,size:2},{id:'s143-red',color:'red',side:'left',offset:1,size:1,frozen:4},{id:'s143-blue',color:'blue',side:'left',offset:2,size:1,frozen:13},{id:'s143-pink',color:'pink',side:'left',offset:5,size:1,frozen:6},{id:'s143-cyan',color:'cyan',side:'right',offset:4,size:2,frozen:11}];
 let check,search,replay,error,proof;try{check=audit(level);if(check.passed){search=searchSpatial(level,api,{floor:21,maxMilliseconds:1800,maxStates:35000,maxTransitions:600000,diagnosticTrace:true,orderSeed:attempt});if(search.status==='witness')replay=api.replayRevisedRoute(level,search.drags);if(replay?.complete&&replay.nonClearingDrags>=16)proof=floor143(level,{maxMilliseconds:3000,maxStates:300000});}}catch(e){error=e.message;}
 const row={attempt,seed,status:search?.status??'static-rejected',clears:search?.maxClearsSeen,U:replay?.nonClearingDrags,complete:replay?.complete,error,floor:proof?.status,shortcut:proof?.relaxedNonClearingDrags};rows.push(row);console.log(JSON.stringify(row));
 if((search?.maxClearsSeen??-1)>best||replay?.complete&&replay.nonClearingDrags>=16){best=Math.max(best,search?.maxClearsSeen??-1);row.candidate=save('candidate143-rows',{activeRuleVersion:'1.73.0',level,levelSha256:digest(level),iteration:{attempt,seed,budget:{maxMilliseconds:1800,maxStates:35000,maxTransitions:600000}},audit:check,search,replay,proof,drags:search?.drags??[],formalAdopted:false});console.log(row.candidate);if(proof?.thresholdProven)break;}
 R.random();
}
console.log(save('attempts143-rows',rows));
