import fs from'node:fs';import{api,audit,searchSpatial,project,save,digest,OUT}from'./common.mjs';import{keyFloor}from'./floor-keys32.mjs';
const file=process.argv[2]??OUT+'/prefix-candidate192-1790525188768.json',d=JSON.parse(fs.readFileSync(file)),rows=[],log=OUT+'/binding-mutations192-'+Date.now()+'.jsonl',seen=new Set(),fields=['keyId','lockedBy','lockCount','frozen'];
const blocks=d.level.blocks.filter(b=>!b.shutterId&&!['o16','o3'].includes(b.id));
for(let i=0;i<blocks.length;i++)for(let j=i+1;j<blocks.length;j++){
 const a=blocks[i],b=blocks[j],bundle=x=>Object.fromEntries(fields.filter(k=>x[k]!==undefined).map(k=>[k,x[k]]));if(JSON.stringify(bundle(a))===JSON.stringify(bundle(b)))continue;
 const l=structuredClone(d.level),aa=l.blocks.find(x=>x.id===a.id),bb=l.blocks.find(x=>x.id===b.id),av=bundle(aa),bv=bundle(bb);for(const k of fields){delete aa[k];delete bb[k];}Object.assign(aa,bv);Object.assign(bb,av);
 const hash=digest(l);if(seen.has(hash))continue;seen.add(hash);let spatial,witness,replay,proof,error,prefixCost=0;
 try{spatial=audit(l);witness=searchSpatial(project(l),api,{floor:21,maxMilliseconds:900,maxStates:50000,maxTransitions:400000,normalize:true,symmetry:true,orderSeed:rows.length});if(witness.status==='witness'){replay=api.replayRevisedRoute(l,witness.drags);let n=0;for(const drag of witness.drags){if(drag.exitSide)n++;else prefixCost++;if(n===6)break;}if(replay.valid&&replay.complete&&prefixCost>=16)proof=keyFloor(l,{floor:16,goalClears:6,maxMilliseconds:6000,maxStates:800000});}}catch(e){error=e.message;}
 const row={swap:[a.id,b.id],hash,status:witness?.status,U:replay?.nonClearingDrags,prefixCost,maxClears:witness?.maxClearsSeen,proof:proof?.status,shortcut:proof?.relaxedNonClearingDrags,error};rows.push(row);fs.appendFileSync(log,JSON.stringify(row)+'\n');if(replay?.complete||rows.length%20===0)console.log(JSON.stringify(row));
 if(replay?.valid&&replay.complete&&prefixCost>=15){const target=save('binding-candidate192',{...d,level:l,levelSha256:hash,drags:witness.drags,witness,replay,proof,spatial,prefixCost,mutation:{mechanismBundleSwap:[a.id,b.id],original:d.levelSha256}});console.log(target);if(proof?.thresholdProven){console.log('READY '+target);console.log(save('binding-summary192',rows));process.exit(0);}}
}
console.log(save('binding-summary192',rows));
