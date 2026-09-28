import fs from 'node:fs';
import {loadApi,auditSpatial,digest} from './remake101to110-v146.mjs';
import {verifySource} from './verify-source107to110-v147.mjs';
import {loadSpatialApi,searchSpatial} from '../deliverables/remake101-110-v146-20260924/pipeline/spatial-star-domain.mjs';
const {api}=await loadApi(),full=await loadSpatialApi(),base=JSON.parse(fs.readFileSync(process.argv[2])),started=Date.now(),budget=Number(process.argv[3]??300000);
let seed=Number(process.env.SEED??14711030),trials=0;const rnd=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296),pick=a=>a[Math.floor(rnd()*a.length)];
const save=(prefix,d)=>{const p=`deliverables/remake101-110-v146-20260924/root110/${prefix}-${Date.now()}.json`;fs.mkdirSync('deliverables/remake101-110-v146-20260924/root110',{recursive:true});fs.writeFileSync(p,JSON.stringify(d,null,2)+'\n',{flag:'wx'});return p;};
while(Date.now()-started<budget){
 const level=structuredClone(base.level);trials++;
 for(const g of level.gates){if(rnd()<.55){const old=g.size;g.size=pick([1,2,3]);if(g.size>old)g.size=old;g.offset+=Math.floor(rnd()*(old-g.size+1));if(g.portals){g.portals[0].size=g.size;g.portals[0].origin[g.side==='top'||g.side==='bottom'?0:1]=g.offset;}}}
 try{auditSpatial(level,api);verifySource(level,api);}catch{continue;}
 const result=searchSpatial(level,full,{floor:11,maxMilliseconds:2000,maxStates:100000,maxTransitions:3000000,weight:1000,orderSeed:trials%20});
 if(result.status!=='witness')continue;const replay=api.replayRevisedRoute(level,result.drags);if(!replay.valid||!replay.complete||replay.nonClearingDrags<5||replay.nonClearingDrags>10)continue;
 const proof=searchSpatial(level,full,{floor:5,prove:true,maxMilliseconds:45000,maxStates:1500000,maxTransitions:30000000,symmetry:true});
 const file=save(proof.thresholdProven?'candidate110':'unverified110',{level,drags:result.drags,replay,proof,sourceLevelSha256:digest(base.level),activeRuleVersion:'1.47.0'});console.log(JSON.stringify({trials,file,U:replay.nonClearingDrags,proof:proof.status,states:proof.exploredStates}));if(proof.thresholdProven)break;
}
console.log(JSON.stringify({trials,elapsed:Date.now()-started}));
