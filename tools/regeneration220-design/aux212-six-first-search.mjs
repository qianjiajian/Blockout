import fs from 'node:fs';
import {loadSpatialApi} from '../continuation211-optional-lift-domain.mjs';
import {loadApi,replay} from '../remake191-200/replay.mjs';
import {sha256} from '../continuation211-runtime.mjs';
import {nativeWitness64} from '../regeneration212-design/native-witness212-guided.mjs';
import {liftPayload,runNativeLift} from '../continuation211-native-lift.mjs';
const dir='deliverables/continue211-220-20260930/design220-new/aux212-hidden-six/first-search-p20';fs.mkdirSync(dir,{recursive:true});const api={...await loadSpatialApi(),...(await loadApi()).api},original=JSON.parse(fs.readFileSync('deliverables/continue211-220-20260930/design220-new/aux212-mixed-packing-legal/candidate-20.json'));
for(let v=0;v<4;v++){
 const file='deliverables/continue211-220-20260930/design220-new/aux212-hidden-six/parent20-six'+v+'.json',old=JSON.parse(fs.readFileSync(file));if(old.upper||old.lower)throw Error('Priorsearchnotpermitted');const level=old.level,prefix=[];
 for(const d of original.upper.partialDrags){let accepted;const options=d.exitSide?Array.from({length:d.path.length+1},(_,n)=>({...d,path:d.path.slice(0,n)})):[d];for(const candidate of options){try{const r=replay(level,[...prefix,candidate],api,{timed:true,requirePointerCompatible:true});accepted={candidate,r};break;}catch{}}if(!accepted)break;prefix.push(accepted.candidate);if(accepted.r.clearEvents>=10)break;}
 const pr=replay(level,prefix,api,{timed:true,requirePointerCompatible:true}),plan=structuredClone(level);plan.blocks.forEach(b=>delete b.timedBombSeconds);const r={level,levelSha256:sha256(level),parent:file,priorValidationOnlyNoSearch:true,projection:plan,prefix,pre:pr.nonClearingDrags,preClears:pr.clearEvents,upper:nativeWitness64(plan,api,{prefixDrags:prefix,floor:16-pr.nonClearingDrags,maxMilliseconds:3000,maxStates:350000})};
 if(r.upper.drags){r.drags=r.upper.drags;r.replay=replay(level,r.drags,api,{timed:true,complete:true,requirePointerCompatible:true});if(r.replay.nonClearingDrags>=11&&r.replay.nonClearingDrags<=15){level.preservedMoveTarget=r.replay.effectiveDrags;plan.preservedMoveTarget=r.replay.effectiveDrags;r.levelSha256=sha256(level);r.lower=runNativeLift(liftPayload(plan,api,{floor:11,maxMilliseconds:6000,maxStates:2000000}).p);}}
 fs.writeFileSync(dir+'/variant-'+v+'.json',JSON.stringify(r,null,2),{flag:'wx'});console.log({v,pre:r.pre,preClears:r.preClears,U:r.replay?.nonClearingDrags,max:r.upper.maxClearsSeen,L:r.lower?.status,cost:r.lower?.frontierCost});if(r.lower?.thresholdProven)break;
}
