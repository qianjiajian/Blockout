import fs from'node:fs';
import {make128,getApi,pack,color,rngFor,audit,save}from'./author.mjs';
import{digest}from'../../../revised-preview-validation-v160.mjs';
import{searchSpatial}from'../../../remake111to120-spatial-floor-v147.mjs';
import{checkSymmetryFloor}from'../../../remake21to30-symmetry-floor-v139.mjs';
import{verifyRulesLock}from'../../../verify-rules-lock.mjs';
const lock=verifyRulesLock();if(!lock.ok)throw Error(lock.errors.join('\n'));const api=await getApi(),base=api.LEVELS.find(x=>x.id===128),start=Number(process.argv[2]??1),count=Number(process.argv[3]??150),attempts=[];const area=Array.from({length:21},(_,p)=>[p%7,Math.floor(p/7)]),V3=[[0,0],[0,1],[0,2]];
// Source seven hidden carriers: H3,V3,V3,SQ2,L3,L3,H2 (21cells).
// The two source L shapes need nonzero art turns; replace them by native H3.
const shapesModule=await import('./author.mjs');shapesModule.shapes.V3=V3;
for(let n=start;n<start+count;n++){
 const seed=12810000+n,l=make128(base,seed),rng=rngFor(seed+17);if(!l)continue;
 const hidden=pack(area,['H3','H3','H3','V3','V3','SQ','H2'],rng,'r172-128-hidden');if(!hidden)continue;color(hidden,['red','green','purple','yellow','blue','cyan'],rng);hidden.forEach(b=>b.shutterId=l.shutters[0].id);l.blocks=[...l.blocks.filter(b=>!b.shutterId),...hidden];
 const a=audit(l,api);if(!a.passed){attempts.push({seed,status:'static-rejected',issues:a.issues});continue;}
 const search=searchSpatial(l,api,{floor:16,maxStates:100000,maxMilliseconds:1500,normalize:true,orderSeed:n});const replay=search.drags?api.replayRevisedRoute(l,search.drags):null;let proof=null;
 if(replay?.valid&&replay.complete&&replay.nonClearingDrags>=11)proof=checkSymmetryFloor(l,{floor:11,maxStates:700000,maxMilliseconds:15000});
 attempts.push({seed,levelSha256:digest(l),status:search.status,cost:search.cost,replay:replay?{valid:replay.valid,complete:replay.complete,nonClearingDrags:replay.nonClearingDrags}:null,proof:proof?{status:proof.status,thresholdProven:proof.thresholdProven,relaxedNonClearingDrags:proof.relaxedNonClearingDrags}:null});
 if(replay?.valid&&replay.complete){const d={ruleVersion:lock.activeVersion,seed,level:l,levelSha256:digest(l),drags:search.drags,replay,search,audit:a,proof,sourceReviewPending:true,lowerBoundCertified:proof?.thresholdProven??false,pointerValidated:false,naturalClockValidated:false,formalAdopted:false};save(`candidate128-hidden7-seed${seed}.json`,d);console.log(JSON.stringify({seed,cost:replay.nonClearingDrags,proof:proof?.status}));if(proof?.thresholdProven){save('target128-hidden7.json',d);break;}}
 if(n%10===0)console.log(JSON.stringify({n,status:search.status}));save(`attempts128-hidden7-${start}.json`,{attempts});
}save(`attempts128-hidden7-${start}.json`,{attempts});
