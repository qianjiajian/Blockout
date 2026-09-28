import fs from'node:fs';import{api,audit,rng,recolor,tile,searchSpatial,digest,shapes}from'../common.mjs';import{floor145,project,save}from'./floor145.mjs';
import {shortenRoute}from'../../../../remake21to30-route-shortcuts.mjs';
const original=JSON.parse(fs.readFileSync('deliverables/remake31-200-v145-20260924/batches/lv141-150/source141-145/candidate145-reviewed-v4.json')),R=rng(Number(process.env.SEED??145800)),rows=[];let best=-1;
for(let attempt=0;attempt<Number(process.env.ATTEMPTS??100);attempt++){
 const level=structuredClone(original.level),seed=R.state(),op=level.blocks.filter(b=>!b.shutterId),hidden=level.blocks.filter(b=>b.shutterId),bodies=R.shuffle(op),ids=R.shuffle(attempt%3===0?[9,9,9,9,9,9,7,7,7,7,8,8,1,1]:attempt%3===1?[9,9,9,9,9,9,9,9,9,9,3,3,8,8]:[7,7,7,7,7,7,8,8,8,8,8,8,8,8]);
 for(let i=0;i<bodies.length;i++)bodies[i].shape=shapes[ids[i]];
 const placed=tile(bodies,level.playable.filter(([,y])=>y<6),{seed,maxNodes:18000,preferLarge:false});if(!placed){rows.push({attempt,seed,status:'packing-rejected'});R.random();continue;}
 const bombs=placed.filter(b=>b.timedBombSeconds),palette=['pink','yellow','red','blue','green'];for(const b of placed)if(b.layers)b.layers[1]=R.shuffle(palette.filter(c=>c!=='pink'))[0];
 const pins=Object.fromEntries(bombs.map(b=>[b.id,'pink']));for(const b of bombs)b.layers[0]='pink';
 const side=R.random()<.5?'left':'right',boundary=placed.filter(b=>!b.layers&&b.shape.every(p=>p[1]===0)&&(side==='left'?b.x===0:b.x+Math.max(...b.shape.map(p=>p[0]))===6));
 const first=R.shuffle(boundary)[0];if(!first){rows.push({attempt,seed,status:'no-first'});continue;}pins[first.id]='pink';
 if(!recolor(placed,palette,{seed,pins})){rows.push({attempt,seed,status:'color-rejected'});R.random();continue;}
 // Real hidden stock stays intact while its colors are changed to shorten the late phase.
 if(attempt%4!==3)for(const b of hidden){b.color=b.layers?'blue':b.color;if(b.layers)b.layers=['blue','green'];}
 level.blocks=[...placed,...hidden];const other=side==='left'?'right':'left';
 level.gates=[{id:'r146-145-pink',color:'pink',side,offset:Math.max(1,Math.min(3,first.y-1)),size:3},{id:'r146-145-yellow',color:'yellow',side:other,offset:1,size:2,frozen:3},{id:'r146-145-red',color:'red',side:'top',offset:2,size:3,frozen:7},{id:'r146-145-blue',color:'blue',side:other,offset:4,size:3,frozen:11},{id:'r146-145-green',color:'green',side:'bottom',offset:2,size:3,frozen:19}];
 let check,search,replay,error,proof,drags;try{check=audit(level);if(check.passed){search=searchSpatial(project(level),api,{floor:19,maxMilliseconds:1800,maxStates:30000,maxTransitions:400000,diagnosticTrace:true,orderSeed:attempt,weight:1000});if(search.status==='witness'){drags=shortenRoute(project(level),search.drags,api).drags;replay=api.replayRevisedRoute(level,drags);}if(replay?.complete&&replay.nonClearingDrags>=11&&replay.nonClearingDrags<=15)proof=floor145(level);}}catch(e){error=e.message;}
 const row={attempt,seed,status:search?.status??'static-rejected',clears:search?.maxClearsSeen,U:replay?.nonClearingDrags,complete:replay?.complete,error,floor:proof?.status,shortcut:proof?.relaxedNonClearingDrags};rows.push(row);console.log(JSON.stringify(row));
 if((search?.maxClearsSeen??-1)>best||replay?.complete&&replay.nonClearingDrags>=11&&replay.nonClearingDrags<=15){best=Math.max(best,search?.maxClearsSeen??-1);row.candidate=save('candidate145',{activeRuleVersion:'1.73.0',level,levelSha256:digest(level),iteration:{attempt,seed,budget:{maxMilliseconds:1800,maxStates:30000,maxTransitions:400000}},audit:check,search,replay,proof,drags:drags??[],formalAdopted:false});console.log(row.candidate);if(proof?.thresholdProven)break;}
 R.random();
}
console.log(save('attempts145',rows));
