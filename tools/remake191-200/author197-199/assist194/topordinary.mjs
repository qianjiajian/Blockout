import fs from 'node:fs';
import{api,recolor,rng,project,searchSpatial,auditSpatial,digest,lower,save,ruleGate}from'./common.mjs';
import{replay}from'../../replay.mjs';
ruleGate();const initial=JSON.parse(fs.readFileSync(process.argv[2])),R=rng(Number(process.env.SEED??19410830)),log=[];let best=0;
for(let n=0;n<Number(process.env.ATTEMPTS??180);n++){
 const seed=R.state(),l=structuredClone(initial.level),yellow=l.gates.find(g=>g.color==='yellow'),orange=l.gates.find(g=>g.color==='orange');Object.assign(yellow,{side:'top',offset:4,size:3});Object.assign(orange,{side:'bottom',offset:4,size:3});
 let ok=true;
 for(const owner of [null,'c5','c7a','c7b']){
  const bs=l.blocks.filter(b=>owner?b.shutterId===owner:!b.shutterId&&b.id!=='q-orange');
  const pins=!owner?Object.fromEntries(bs.filter(b=>b.y===0).map(b=>[b.id,b.x<4?'blue':'yellow'])):{};
  const palette=!owner?['blue','yellow','green','pink']:owner==='c7a'?['green','pink','red']:['green','pink'];
  if(!recolor(bs,palette,{seed:R.state(),pins})){ok=false;break;}R.random();
 }
 if(!ok)continue;
 let audit,proof,s,rep,error;try{audit=auditSpatial(l,api);proof=lower(l,{maxMilliseconds:800,maxStates:180000});s=searchSpatial(project(l),api,{floor:16,maxMilliseconds:1300,maxStates:22000,maxTransitions:250000,normalize:true,orderSeed:n%31,diagnosticTrace:true});if(s.status==='witness')rep=replay(l,s.drags,api,{complete:true,requirePointerCompatible:true});}catch(e){error=e.message;}
 const row={n,seed,hash:digest(l),status:s?.status??'static-fail',clears:s?.maxClearsSeen,U:rep?.nonClearingDrags,proof:proof?.status,prefixU:proof?.relaxedNonClearingDrags,error};log.push(row);
 if(rep||(proof?.thresholdProven&&s?.maxClearsSeen>=10)||(s?.maxClearsSeen??0)>best){best=Math.max(best,s?.maxClearsSeen??0);row.file=save('topordinary194',{...initial,level:l,levelSha256:digest(l),spatial:audit,proof,search:s,replay:rep,drags:s?.drags??[],iteration:{n,seed},budgets:{proofMs:800,searchMs:1300}});console.log(JSON.stringify(row));if(rep&&proof.thresholdProven)break;}
}
console.log(save('topordinary-attempts194',log));
