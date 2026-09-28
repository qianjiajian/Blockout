import fs from 'node:fs';import{api,rng,project,searchSpatial,auditSpatial,digest,save,ruleGate}from'./common.mjs';import{payload,native}from'./fifo-floor.mjs';import{replay}from'../../replay.mjs';
ruleGate();const initial=JSON.parse(fs.readFileSync(process.argv[2])),R=rng(Number(process.env.SEED??19410831)),log=[],seen=new Set();
for(let n=0;n<Number(process.env.ATTEMPTS??70);n++){
 const seed=R.state(),l=structuredClone(initial.level),bs=l.blocks.filter(b=>b.shutterId==='c10');
 for(let j=0;j<1+Math.floor(R.random()*3);j++){const b=R.shuffle(bs)[0],color=R.shuffle(['blue','yellow','green','pink','red','orange','cyan'])[0];if(b.layers&&R.random()<.3){if(color!==b.color)b.layers[1]=color;}else{b.color=color;if(b.layers)b.layers[0]=color;}}
 const hash=digest(l);if(seen.has(hash))continue;seen.add(hash);
 let audit,s,rep,proof,error;try{audit=auditSpatial(l,api);s=searchSpatial(project(l),api,{floor:16,maxMilliseconds:1400,maxStates:22000,maxTransitions:260000,normalize:true,orderSeed:n%31,diagnosticTrace:true});if(s.status==='witness'){rep=replay(l,s.drags,api,{complete:true,requirePointerCompatible:true});if(rep.nonClearingDrags>=11)proof=native(payload(l,{floor:11,maxMilliseconds:3500,maxStates:220000}).p);}}catch(e){error=e.message;}
 const row={n,seed,hash,status:s?.status??'static-fail',clears:s?.maxClearsSeen,U:rep?.nonClearingDrags,proof:proof?.status,shortcut:proof?.relaxedNonClearingDrags,error};log.push(row);
 if(rep){row.file=save('tail194',{...initial,level:l,levelSha256:hash,spatial:audit,proof,search:s,replay:rep,drags:s.drags,iteration:{n,seed},budgets:{proofMs:3500,searchMs:1400},proofModel:'Full31 bodies optional FIFO birth, 33 events. Certification pending independent qualification.'});console.log(JSON.stringify(row));if(proof?.thresholdProven)break;}
}
console.log(save('tails194',log));
