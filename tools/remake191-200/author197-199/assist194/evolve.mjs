import fs from 'node:fs';
import{api,rng,adjacent,project,searchSpatial,auditSpatial,digest,lower,save,ruleGate}from'./common.mjs';
import{replay}from'../../replay.mjs';
ruleGate();const initial=JSON.parse(fs.readFileSync(process.argv[2])),R=rng(Number(process.env.SEED??19410820)),log=[],pool=[{level:initial.level,U:initial.replay.nonClearingDrags,prefix:initial.proof.relaxedNonClearingDrags??0}];let best=pool[0].prefix;
for(let n=0;n<Number(process.env.ATTEMPTS??200);n++){
 const seed=R.state(),parent=R.shuffle(pool)[0],l=structuredClone(parent.level);
 for(let j=0;j<1+Math.floor(R.random()*2);j++){
  const bs=l.blocks.filter(b=>b.id!=='q-orange'&&b.shutterId!=='c10');
  if(R.random()<.55){const a=R.shuffle(bs)[0],b=R.shuffle(bs.filter(b=>b!==a&&b.shutterId===a.shutterId&&JSON.stringify(b.shape)===JSON.stringify(a.shape)))[0];if(b){[a.x,b.x]=[b.x,a.x];[a.y,b.y]=[b.y,a.y];}}
  else if(R.random()<.85){const a=R.shuffle(bs)[0];a.color=R.shuffle(['blue','yellow','green','pink','red'])[0];}
  else{const a=R.shuffle(l.gates.filter(g=>['green','yellow','pink','red'].includes(g.color)))[0],b=R.shuffle(l.gates.filter(g=>g!==a&&['green','yellow','pink','red'].includes(g.color)))[0];for(const k of ['side','offset'])[a[k],b[k]]=[b[k],a[k]];}
 }
 let audit,proof,s,rep,error;try{audit=auditSpatial(l,api);proof=lower(l,{maxMilliseconds:900,maxStates:200000});s=searchSpatial(project(l),api,{floor:16,maxMilliseconds:1500,maxStates:24000,maxTransitions:280000,normalize:true,orderSeed:n%31,diagnosticTrace:true});if(s.status==='witness')rep=replay(l,s.drags,api,{complete:true,requirePointerCompatible:true});}catch(e){error=e.message;}
 const row={n,seed,hash:digest(l),status:s?.status??'static-fail',clears:s?.maxClearsSeen,U:rep?.nonClearingDrags,proof:proof?.status,prefixU:proof?.relaxedNonClearingDrags,error};log.push(row);
 if(rep?.complete){const prefix=proof.thresholdProven?11:proof.relaxedNonClearingDrags??0;pool.push({level:l,U:rep.nonClearingDrags,prefix});pool.sort((a,b)=>b.prefix-a.prefix||b.U-a.U);if(pool.length>12)pool.pop();if(prefix>=best){best=prefix;row.file=save('evolved194',{...initial,level:l,levelSha256:digest(l),spatial:audit,proof,search:s,replay:rep,drags:s.drags,iteration:{n,seed,parentPrefix:parent.prefix},budgets:{proofMs:900,searchMs:1500}});console.log(JSON.stringify(row));}if(proof.thresholdProven)break;}
}
console.log(save('evolution194',log));
