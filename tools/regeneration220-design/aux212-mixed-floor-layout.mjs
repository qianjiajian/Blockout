import fs from 'node:fs';
import {loadSpatialApi} from '../continuation211-optional-lift-domain.mjs';
import {loadApi,replay} from '../remake191-200/replay.mjs';
import {loadContinuationRuntime,sha256} from '../continuation211-runtime.mjs';
import {nativeWitness64} from '../regeneration212-design/native-witness212-guided.mjs';
import {prefixPayload,runPrefix} from '../regeneration212-design/native-prefix212.mjs';
import {auditOpeningCoverage} from '../revised-opening-coverage.mjs';
import {auditHiddenCoverage} from '../revised-hidden-coverage.mjs';
import {adjacency} from '../regeneration212-design/design212.mjs';
const out='deliverables/continue211-220-20260930/design220-new/aux212-mixed-floor-layout';fs.mkdirSync(out,{recursive:true});
const api={...await loadSpatialApi(),...(await loadApi()).api},core=await loadContinuationRuntime(),history=[];
const parent='deliverables/continue211-220-20260930/design220-new/aux212-mixed-extra-blue/candidate-1.json',base=JSON.parse(fs.readFileSync(parent));
const layouts=[[[2,6],[3,6]],[[2,6],[3,7]],[[2,7],[3,7]],[[2,8],[3,8]],[[5,3],[3,4]],[[1,4],[3,4]],[[0,5],[6,5]],[[3,6],[3,7]]];
for(let variant=0;variant<layouts.length;variant++){
 const file=out+'/candidate-'+variant+'.json';if(fs.existsSync(file))throw Error('Already attempted');
 const level=structuredClone(base.level);level.coloredGrids[0].cells=layouts[variant];
 level.mechanismAdaptation.change+=' Actual new spatial blue-floor placement '+JSON.stringify(layouts[variant])+', retaining both source blue-floor cells while restricting different cold-block travel/parking footprints. Prior failed level is not re-searched.';
 const audit={opening:auditOpeningCoverage(new api.PuzzleModel(level).snapshot()),hidden:auditHiddenCoverage(level),adjacency:[undefined,'l212-cover10','l212-cover1'].flatMap(id=>adjacency(level.blocks.filter(b=>b.shutterId===id))),mechanism:core.auditRevisedMechanismContract(level)};
 const packet={level,parent,variant,levelSha256:sha256(level),audit,formalAccepted:false};
 if(audit.opening.passed&&audit.hidden.passed&&!audit.adjacency.length&&!audit.mechanism.length){try{
  const plan=structuredClone(level);plan.blocks.forEach(b=>delete b.timedBombSeconds);packet.projection=plan;
  packet.upper=nativeWitness64(plan,api,{floor:16,maxMilliseconds:3000,maxStates:350000});
  if(packet.upper.drags){packet.drags=packet.upper.drags;packet.replay=replay(level,packet.drags,api,{timed:true,complete:true,requirePointerCompatible:true});
   if(packet.replay.nonClearingDrags>=11&&packet.replay.nonClearingDrags<=15){level.preservedMoveTarget=packet.replay.effectiveDrags;plan.preservedMoveTarget=packet.replay.effectiveDrags;packet.levelSha256=sha256(level);packet.replay=replay(level,packet.drags,api,{timed:true,complete:true,requirePointerCompatible:true});
    const costs={};for(let i=1;i<=packet.drags.length;i++){const r=replay(level,packet.drags.slice(0,i),api,{timed:true,requirePointerCompatible:true});if(r.clearEvents>=11&&costs[11]===undefined)costs[11]=r.nonClearingDrags;if(r.clearEvents>=16&&costs[16]===undefined)costs[16]=r.nonClearingDrags;}
    packet.prefixRouteCosts=costs;const goal=costs[11]>=11?11:16;packet.lower=runPrefix(prefixPayload(plan,api,{goalClears:goal,floor:11,maxMilliseconds:6000,maxStates:2000000,mergeCold:true}).p);packet.lowerScope='Mandatory prefix '+goal+' real clears; only gates frozen throughout prefix may share color-free identical pose domains.';
   }
  }
 }catch(e){packet.error=e.stack;}}
 fs.writeFileSync(file,JSON.stringify(packet,null,2),{flag:'wx'});const row={variant,N:level.blocks.length,U:packet.replay?.nonClearingDrags,max:packet.upper?.maxClearsSeen,costs:packet.prefixRouteCosts,L:packet.lower?.status,frontier:packet.lower?.frontierCost,shortcut:packet.lower?.relaxedNonClearingDrags,error:packet.error};history.push(row);console.log(JSON.stringify(row));if(packet.lower?.thresholdProven)break;
}
fs.writeFileSync(out+'/history.json',JSON.stringify(history,null,2),{flag:'wx'});
