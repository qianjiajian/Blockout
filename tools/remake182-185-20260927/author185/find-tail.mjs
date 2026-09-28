import fs from'node:fs';import{loadApi,replay}from'../replay.mjs';import{ruleGate,digest,auditSpatial,writeNew}from'../common.mjs';import{seededRng}from'../../../deliverables/remake21-30-v139-20260924/agent28-30/packing.mjs';import{search}from'./search.mjs';
ruleGate();const{api}=await loadApi(),base=JSON.parse(fs.readFileSync(process.argv[2])),rng=seededRng(107185991),logs=[];
for(let attempt=0;attempt<80;attempt++){
 const l=structuredClone(base.level),hidden=l.blocks.filter(b=>b.shutterId),multi=hidden.find(b=>b.shape.length>1),singles=rng.shuffle(hidden.filter(b=>b!==multi));multi.color='purple';singles.forEach((b,i)=>b.color=i<8?'purple':i<12?'orange':'blue');
 const spatial=auditSpatial(l,api),tail=search(l,{maxCost:0,maxMilliseconds:200,maxStates:25000,suffix:true});logs.push({attempt,sha:digest(l),tail:{...tail,drags:undefined}});if(tail.status!=='witness')continue;
 // Verify the unique suffix in authoritative model after actual fourteen clears.
 // The parent owns the full prefix and will concatenate + replay, so no fake
 // model deletion is treated as a complete source route here.
 const file='deliverables/remake182-185-20260927/author185/zero-tail-'+Date.now()+'.json';writeNew(file,{level:l,levelSha256:digest(l),spatial,tail,tailSha256:digest(tail.drags),logs,scope:'Witness from unique post-C14 state; full concatenated route still required.',sourcePhaseStatus:'orange/blue initial phase proposed false pending explicit approval',formalAdopted:false});console.log(JSON.stringify({file,attempt,tail:{...tail,drags:undefined}}));process.exit(0);
}
writeNew('deliverables/remake182-185-20260927/author185/zero-tail-failed-'+Date.now()+'.json',logs);console.log('no zero tail');
