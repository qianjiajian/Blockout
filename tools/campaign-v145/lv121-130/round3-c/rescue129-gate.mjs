import fs from'node:fs';
import{loadIsolatedApi}from'./isolated-api.mjs';
import{color,rngFor}from'./author.mjs';
import{search}from'../round3-root/search-generator129.mjs';
import{auditDraft,ruleGate}from'../../../remake121to130-v172.mjs';
import{digest}from'../../../revised-preview-validation-v160.mjs';
import{check129Floor}from'./check129.mjs';
const api=await loadIsolatedApi(),lock=ruleGate(),OUT='deliverables/campaign121-130-v146-20260924/round3-c';
const base=JSON.parse(fs.readFileSync(`${OUT}/partial129-v2-1790472046616.json`));
const save=(n,d)=>{const p=`${OUT}/${n}-${Date.now()}.json`;fs.writeFileSync(p,JSON.stringify(d,null,2)+'\n',{flag:'wx'});return p;};
const attempts=[];
for(let n=100;n<400;n++){
 const l=structuredClone(base.level),rng=rngFor(172329000+n);
 l.gates.find(g=>g.color==='purple').color='green';l.gates.find(g=>g.color==='green'&&g.side==='left').color='purple';
 const queued=new Set(l.generators.flatMap(g=>g.queueBlockIds));
 for(const group of [l.blocks.filter(b=>!b.shutterId&&!queued.has(b.id)),l.blocks.filter(b=>b.shutterId===l.shutters[1].id)]){
  for(const b of group)if(!b.layers&&!b.frozen)delete b.color;
  if(!color(group,['blue','cyan','pink','red','yellow','purple'],rng,{blue:6,cyan:6,pink:1,red:2,yellow:2,purple:1}))throw Error('color');
 }
 // Author lower queue colours for access before green's late portal opens.
 const g=l.generators[1];g.queueBlockIds.forEach((id,i)=>l.blocks.find(b=>b.id===id).color=['blue','cyan','blue','cyan','blue'][i]);
 let a;try{a=auditDraft({level:l},api);}catch(e){attempts.push({n,error:e.message.slice(0,160)});continue;}
 const r=search(l,{floor:16,maxStates:70000,maxMilliseconds:450,orderSeed:n%39});attempts.push({n,status:r.status,cost:r.cost,clears:r.maxClearsSeen,states:r.states});
 if(r.drags){const replay=api.replayRevisedRoute(l,r.drags);const p=save('candidate129-gate-rescue',{level:l,drags:r.drags,replay,result:r,audit:a,sourceFile:base.sourceFile,original:base,levelSha256:digest(l)});const proof=check129Floor(l,api,{floor:11,maxStates:100000,maxMilliseconds:2500});const proofFile=save('proof129-gate-rescue-plain',{candidateFile:p,proof});console.log(JSON.stringify({p,U:replay.nonClearingDrags,proofFile,status:proof.status,L:proof.relaxedNonClearingDrags}));if(replay.valid&&replay.complete&&proof.thresholdProven)break;}
 if(n%5===0)console.log(JSON.stringify(attempts.at(-1)));
}
console.log(save('attempts129-gate-rescue',{ruleVersion:lock.activeVersion,attempts}));
