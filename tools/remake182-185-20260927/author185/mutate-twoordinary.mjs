import fs from 'node:fs';import {loadApi,replay}from'../replay.mjs';import{ruleGate,digest,auditSpatial,writeNew}from'../common.mjs';import{runPrefix}from'./prefix.mjs';import{search}from'./search.mjs';
ruleGate();const{api}=await loadApi(),base=JSON.parse(fs.readFileSync(process.argv[2])),logs=[],stamp=Date.now(),OUT='deliverables/remake182-185-20260927/author185';
for(const bi of base.level.blocks.map((b,i)=>!b.shutterId&&b.color!=='red'?i:-1).filter(i=>i>=0)){
 const l0=structuredClone(base.level),b=l0.blocks[bi];if(l0.blocks.filter(x=>!x.shutterId&&x.color===b.color).length<2)continue;b.color='pink';
 l0.flipDoors=l0.flipDoors.filter(g=>g.color!=='purple');const mint=l0.gates.find(g=>g.color==='pink');mint.id='adapt185-mint-purple';mint.color='purple';
 let flip=0;for(const h of l0.blocks.filter(x=>x.shutterId)){if(h.color==='pink')h.color='purple';else if(h.color==='purple')h.color=flip++%2?'orange':'blue';}
 const used=new Set([...l0.gates,...l0.flipDoors].flatMap(g=>Array.from({length:g.size},(_,i)=>g.side+':'+(g.offset+i))));
 for(const side of ['left','top','bottom']){const dim=side==='left'?1:0,size=1+Math.max(...b.shape.map(p=>p[dim])),limit=side==='left'?6:3;for(let offset=0;offset+size<=limit;offset++){
  if(Array.from({length:size},(_,i)=>side+':'+(offset+i)).some(k=>used.has(k)))continue;
  const l=structuredClone(l0);l.gates.push({id:'adapt185-pink',color:'pink',side,size,offset});let spatial;try{spatial=auditSpatial(l,api);}catch(e){logs.push({bi,side,offset,error:e.message});continue;}
  const p=structuredClone(l);p.gates.push(...p.flipDoors.map(({initiallyOpen,...g})=>g));p.flipDoors=[];const floor=runPrefix(p,api,{goalClears:14,floor:16,maxMilliseconds:700,maxStates:150000}),row={bi,side,offset,sha:digest(l),floor:{...floor}};
  if(floor.thresholdProven){const witness=search(l,{maxCost:20,maxMilliseconds:3000,maxStates:180000});let rr,error;if(witness.status==='witness')try{rr=replay(l,witness.drags,api,{complete:true,requirePointerCompatible:true});}catch(e){error=e.message;}
   row.witness={...witness,drags:undefined};row.replayError=error;const file=OUT+'/twoordinary-'+stamp+'-'+bi+'-'+side+'-'+offset+'.json';writeNew(file,{level:l,drags:witness.drags,levelSha256:digest(l),routeSha256:witness.drags?digest(witness.drags):null,spatial,floor,witness,replay:rr,error,sourcePhaseStatus:'Unknown orange/blue initial booleans, proposed false pending',formalAdopted:false,pointerValidated:false});console.log(JSON.stringify({file,floor:floor.status,witness:row.witness,replay:!!rr}));if(rr){logs.push(row);writeNew(OUT+'/mutation-log-'+stamp+'.json',logs);process.exit(0);}
  }logs.push(row);
 }}
}
writeNew(OUT+'/mutation-log-'+stamp+'.json',logs);console.log(JSON.stringify({attempts:logs.length,results:logs.map(r=>({bi:r.bi,side:r.side,offset:r.offset,status:r.floor?.status,min:r.floor?.relaxedNonClearingDrags,w:r.witness?.status}))}));
