import fs from 'node:fs';
import {api,audit,rng,tile,recolor,searchSpatial,save,digest,shapes,baseline} from './common.mjs';
const original=JSON.parse(fs.readFileSync('deliverables/remake31-200-v145-20260924/batches/lv141-150/source143/candidate143-1790252569020.json'));
const R=rng(Number(process.env.SEED??143173)),rows=[];let op,best=-1,bestU=Infinity,witnesses=0;
for(let attempt=0;attempt<Number(process.env.ATTEMPTS??100);attempt++){
 const seed=R.state(),level=structuredClone(original.level);level.shutters[0].y=7;level.shutters[0].height=3;const hidden=level.blocks.filter(b=>b.shutterId);for(const b of hidden)b.shape=shapes[b.shape.length===3&&b.shape.some(p=>p[0]===1)&&b.shape.some(p=>p[1]===1)?4:1];const packedHidden=tile(hidden,level.playable.filter(([,y])=>y>=7),{seed,maxNodes:10000});if(!packedHidden){R.random();continue;}level.blocks=level.blocks.filter(b=>!b.shutterId).concat(packedHidden);
 if(!op){const specs=level.blocks.filter(b=>!b.shutterId&&!level.generators[0].queueBlockIds.includes(b.id));const trio=R.shuffle(specs.map((_,i)=>i)).slice(0,11);for(let i=0;i<specs.length;i++)specs[i].shape=shapes[R.shuffle(trio.includes(i)?[3,9]:[2,8])[0]];op=tile(specs,level.playable.filter(([,y])=>y<7),{seed,maxNodes:20000});}
 if(!op){rows.push({attempt,seed,status:'packing-failed'});R.random();continue;}
 const bs=structuredClone(op),first=R.shuffle(bs.filter(b=>b.x===0&&b.y>0&&b.y<7&&b.shape.every(p=>p[1]===0)&&b.layers))[0]??R.shuffle(bs.filter(b=>b.x===0&&b.y>0&&b.y<7&&b.shape.every(p=>p[1]===0)))[0];
 if(!first){op=null;R.random();continue;}
 const second=R.shuffle(bs.filter(b=>b!==first&&b.x+Math.max(...b.shape.map(p=>p[0]))===6&&b.y>=1&&b.y+Math.max(...b.shape.map(p=>p[1]))<=3))[0];
 if(!second){op=null;R.random();continue;}
 if(!recolor(bs,['green','yellow','red','pink','blue','cyan'],{seed,pins:{[first.id]:'green',[second.id]:'yellow'},filter:(b,c)=>!['green','pink'].includes(c)||b.shape.every(p=>p[1]===0)})){R.random();continue;}
 const g=level.gates.find(g=>g.color==='green'),pink=level.gates.find(g=>g.color==='pink'),blue=level.gates.find(g=>g.color==='blue');g.offset=first.y;
 // Three distinct left mouths stay disjoint: blue reserves1..3; green/pink4/5.
 if(first.y<4){op=null;R.random();continue;}pink.offset=first.y===4?5:4;blue.offset=1;
 const q=new Set(level.generators[0].queueBlockIds);level.blocks=[...bs,...level.blocks.filter(b=>b.shutterId||q.has(b.id))];
 let check,search,replay,error;try{check=audit(level);if(check.passed){search=searchSpatial(level,api,{floor:21,maxMilliseconds:2500,maxStates:35000,maxTransitions:600000,diagnosticTrace:true,orderSeed:attempt});if(search.status==='witness')replay=api.replayRevisedRoute(level,search.drags);}}catch(e){error=e.message;}
 const row={attempt,seed,status:search?.status??'static-rejected',stop:search?.termination,clears:search?.maxClearsSeen,U:replay?.nonClearingDrags,valid:replay?.valid,complete:replay?.complete,error};rows.push(row);console.log(JSON.stringify(row));
 if((search?.maxClearsSeen??-1)>best||replay?.complete){best=Math.max(best,search?.maxClearsSeen??-1);if(replay?.complete){witnesses++;bestU=Math.min(bestU,replay.nonClearingDrags);}row.candidate=save('candidate143-wide',{activeRuleVersion:'1.73.0',level,levelSha256:digest(level),source:original.sourceFile,baseAdaptation:original.adaptation,iteration:{seed,attempt,budget:{maxMilliseconds:2500,maxStates:35000,maxTransitions:600000},changes:'All 18 opening source IDs retained; 7 dominoes and11 triomino bars exactly fill47cells; hidden17 source IDs re-tile21cells preserving2 nativeL3 and ice9, queue3cell footprints under curtain. Source shell1, hidden ice9, curtain19 and FIFO redV3/yellowV3 retained. New native color/shape design underv1.73.'},audit:check,search,replay,drags:search?.drags??[],formalAdopted:false});console.log(row.candidate);}
 R.random();if(attempt%3===2)op=null;
}
console.log(save('attempts143-wide',{rows,witnesses,bestU}));

