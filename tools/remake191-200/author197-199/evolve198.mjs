import fs from 'node:fs';import {api,rng,save,audit,searchSpatial,project,digest,lower,adjacent} from './common.mjs';
const R=rng(Number(process.env.SEED??1981083)),file=process.argv[2]??'deliverables/remake191-200-20260927/author197-199/candidate198-1790523482441-27136.json',initial=JSON.parse(fs.readFileSync(file)),pool=[{level:initial.level,U:initial.replay.nonClearingDrags}],rows=[];let best=11;
for(let n=0;n<Number(process.env.ATTEMPTS??250);n++){
 const seed=R.state(),parent=R.shuffle(pool)[0],l=structuredClone(parent.level);
 for(let j=0;j<1+Math.floor(R.random()*3);j++){
  if(R.random()<.7){const a=R.shuffle(l.blocks)[0],bs=l.blocks.filter(b=>b!==a&&JSON.stringify(a.shape)===JSON.stringify(b.shape)),b=R.shuffle(bs)[0];if(!b)continue;[a.x,b.x]=[b.x,a.x];[a.y,b.y]=[b.y,a.y];}
  else if(R.random()<.7){const a=R.shuffle(l.blocks)[0],b=R.shuffle(l.blocks.filter(b=>b!==a))[0];[a.color,b.color]=[b.color,a.color];for(const q of [a,b])if(q.layers)q.layers[0]=q.color;}
  else {const a=R.shuffle(l.gates)[0],b=R.shuffle(l.gates.filter(g=>g!==a&&g.size===a.size))[0];if(b){for(const k of ['side','offset'])[a[k],b[k]]=[b[k],a[k]];}}
 }
 if(l.blocks.some((a,i)=>a.layers?.[0]===a.layers?.[1]&&a.layers||l.blocks.slice(0,i).some(b=>a.color===b.color&&adjacent(a,b))))continue;
 let check,s,rep,proof,error;try{check=audit(l);s=searchSpatial(project(l),api,{floor:36,maxMilliseconds:950,maxStates:22000,maxTransitions:280000,normalize:true,symmetry:true,diagnosticTrace:true,orderSeed:n%30});if(s.status==='witness'){rep=api.replayRevisedRoute(l,s.drags);if(rep.complete&&rep.nonClearingDrags>=21&&rep.nonClearingDrags<=30)proof=lower(l,{floor:21,maxMilliseconds:1500,maxStates:300000});}}catch(e){error=e.message;}
 const row={n,seed,sha:digest(l),status:s?.status,U:rep?.nonClearingDrags,clears:s?.maxClearsSeen,L:proof?.status,error};rows.push(row);
 if(rep?.complete){pool.push({level:l,U:rep.nonClearingDrags});pool.sort((a,b)=>b.U-a.U);if(pool.length>12)pool.pop();if(rep.nonClearingDrags>=best){best=rep.nonClearingDrags;row.file=save('evolved198',{ruleVersion:'1.108.0',level:l,levelSha256:digest(l),audit:check,search:s,replay:rep,proof,drags:s.drags,iteration:{n,seed,parentU:parent.U},budget:{searchMs:950,proofMs:1500},sourceFile:initial.sourceFile,sourceAdaptation:initial.sourceAdaptation});console.log(JSON.stringify(row));}}
 if(rep?.complete&&rep.nonClearingDrags<=30&&proof?.thresholdProven)break;
}
console.log(save('evolution198',rows));
