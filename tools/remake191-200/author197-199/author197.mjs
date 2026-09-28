import fs from 'node:fs';
import {api,base,shapes,tile,recolorBag,rng,save,audit,searchSpatial,project,digest,lower} from './common.mjs';
const R=rng(Number(process.env.SEED??197108)),rows=[],max=Number(process.env.ATTEMPTS??160),start=Date.now();let best=0;
for(let n=0;n<max;n++){
 const seed=R.state(),l=base(197),old=structuredClone(l.blocks);
 for(const [i,b]of l.blocks.entries()){b.id='r108-197-b'+i;const native=api.matchFormalBlockShape(b.shape,'native-only');if(!native||(!b.star&&!b.movementAxis&&R.random()<.18)){const opts=Object.values(shapes).filter(s=>s.length===b.shape.length&&(!b.star||s.length===(Math.max(...s.map(p=>p[0]))+1)*(Math.max(...s.map(p=>p[1]))+1)));b.shape=R.shuffle(opts)[0];}}
 const fixed=l.blocks.find(b=>b.id==='r108-197-b1');fixed.shape=shapes[2];
 const placed=tile(l.blocks,l.playable,{seed,maxNodes:15000,preferLarge:false,pins:{'r108-197-b1':[0,6],'r108-197-b12':[2,7]}});if(!placed){rows.push({n,seed,status:'packing-fail'});continue;}l.blocks=placed;
 const axis=l.blocks.find(b=>b.movementAxis);if(axis.x>2)continue;
 if(!recolorBag(l.blocks.filter(b=>!b.star),{seed:R.state(),pins:{[axis.id]:'purple',[fixed.id]:'red'}}))continue;R.random();
 if(n%3===1){for(const g of l.gates.filter(g=>['left','right'].includes(g.side)))if(R.random()<.35)g.side=g.side==='left'?'right':'left';}
 // Resolve side mutations without changing known counts or gate roles.
 if(l.gates.some((g,i)=>l.gates.slice(0,i).some(a=>g.side===a.side&&g.offset<a.offset+a.size&&a.offset<g.offset+g.size)))continue;
 let check,s,rep,proof,error;
 try{check=audit(l);s=searchSpatial(project(l),api,{floor:16,maxMilliseconds:900,maxStates:20000,maxTransitions:250000,normalize:true,symmetry:true,diagnosticTrace:true,orderSeed:n%20});if(s.status==='witness'){rep=api.replayRevisedRoute(l,s.drags);if(rep.complete&&rep.nonClearingDrags>=11)proof=lower(l,{floor:11,maxMilliseconds:2000,maxStates:250000});}}catch(e){error=e.message;}
 const row={n,seed,sha:digest(l),status:s?.status??'static-reject',U:rep?.nonClearingDrags,clears:s?.maxClearsSeen,L:proof?.status,error};rows.push(row);
 if(s?.maxClearsSeen>best||rep?.complete){best=Math.max(best,s?.maxClearsSeen??0);row.file=save(rep?.complete?'candidate197':'partial197',{ruleVersion:'1.108.0',level:l,levelSha256:digest(l),audit:check,search:s,replay:rep,proof,drags:s.drags??[],iteration:{n,seed},budget:{searchMs:900,proofMs:2000},sourceFile:'.codex-temp/remaining147-v110/late/source-review-197.json',sourceAdaptation:'Pristine twenty-body/one vertical axis/five stars/seven frozen gates1,4,6,8,12,15,16 retained. Native equal-area retiling and color reassignment underv108; old adapted52-cell geometry preserved.'});console.log(JSON.stringify(row));}
 if(rep?.complete&&rep.nonClearingDrags<=15&&proof?.thresholdProven)break;
}
console.log(save('attempts197',{elapsedMs:Date.now()-start,rows}));
