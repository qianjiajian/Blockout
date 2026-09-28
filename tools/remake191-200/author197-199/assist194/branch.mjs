import fs from 'node:fs';
import{api,rng,project,searchSpatial,auditSpatial,digest,lower,save,ruleGate}from'./common.mjs';
import{replay}from'../../replay.mjs';
ruleGate();const initial=JSON.parse(fs.readFileSync(process.argv[2])),R=rng(Number(process.env.SEED??19410823)),log=[],seen=new Set();let best=0;
for(let n=0;n<Number(process.env.ATTEMPTS??160);n++){
 const seed=R.state(),l=structuredClone(initial.level),a=l.blocks.filter(b=>b.shutterId==='c5');a[0].color=R.shuffle(['red','blue','orange','cyan','purple','green','pink'])[0];a[1].color=R.shuffle(['red','blue','orange','cyan','purple','green','pink'].filter(x=>x!==a[0].color))[0];
 const mode=n%5;
 if(mode===1){l.gates.find(g=>g.color==='pink').side='right';l.gates.find(g=>g.color==='red').side='left';}
 if(mode===2){for(const c of ['green','yellow'])l.gates.find(g=>g.color===c).offset=c==='green'?4:1;}
 if(mode===3){l.gates.find(g=>g.color==='pink').offset=9;}
 if(mode===4){l.gates.find(g=>g.color==='pink').side='right';l.gates.find(g=>g.color==='pink').offset=9;l.gates.find(g=>g.color==='red').side='left';}
 if(n>40){const b=R.shuffle(l.blocks.filter(b=>b.shutterId==='c7a'||b.shutterId==='c7b'))[0];b.color=R.shuffle(['red','blue','orange','green','pink','yellow'])[0];}
 const hash=digest(l);if(seen.has(hash))continue;seen.add(hash);
 let audit,proof,s,rep,error;try{audit=auditSpatial(l,api);proof=lower(l,{maxMilliseconds:1000,maxStates:220000});s=searchSpatial(project(l),api,{floor:16,maxMilliseconds:1500,maxStates:24000,maxTransitions:280000,normalize:true,orderSeed:n%31,diagnosticTrace:true});if(s.status==='witness')rep=replay(l,s.drags,api,{complete:true,requirePointerCompatible:true});}catch(e){error=e.message;}
 const row={n,seed,hash,status:s?.status??'static-fail',clears:s?.maxClearsSeen,U:rep?.nonClearingDrags,proof:proof?.status,prefixU:proof?.relaxedNonClearingDrags,error};log.push(row);
 if(rep||(proof?.thresholdProven&&s?.maxClearsSeen>=10)){const score=proof.thresholdProven?11:proof.relaxedNonClearingDrags??0;if(score>=best){best=score;row.file=save('branched194',{...initial,level:l,levelSha256:digest(l),spatial:audit,proof,search:s,replay:rep,drags:s.drags??[],iteration:{n,seed},budgets:{proofMs:1000,searchMs:1500}});console.log(JSON.stringify(row));}if(rep&&proof.thresholdProven)break;}
}
console.log(save('branches194',log));
