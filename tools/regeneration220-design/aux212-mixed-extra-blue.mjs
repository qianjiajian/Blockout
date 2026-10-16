import fs from 'node:fs';
import {loadSpatialApi} from '../continuation211-optional-lift-domain.mjs';
import {loadApi,replay} from '../remake191-200/replay.mjs';
import {loadContinuationRuntime,sha256} from '../continuation211-runtime.mjs';
import {nativeWitness64} from '../regeneration212-design/native-witness212-guided.mjs';
import {prefixPayload,runPrefix} from '../regeneration212-design/native-prefix212.mjs';
import {liftPayload,runNativeLift} from '../continuation211-native-lift.mjs';
import {auditOpeningCoverage} from '../revised-opening-coverage.mjs';
import {auditHiddenCoverage} from '../revised-hidden-coverage.mjs';
import {adjacency} from '../regeneration212-design/design212.mjs';
const out='deliverables/continue211-220-20260930/design220-new/aux212-mixed-extra-blue';fs.mkdirSync(out,{recursive:true});const api={...await loadSpatialApi(),...(await loadApi()).api},core=await loadContinuationRuntime(),history=[];
const parent='deliverables/continue211-220-20260930/design220-new/aux212-mixed-hidden/parent20-hidden1.json',base=JSON.parse(fs.readFileSync(parent));
for(let variant=1;variant<4;variant++){
 const level=structuredClone(base.level),get=id=>level.blocks.find(b=>b.id===id),file=out+'/candidate-'+variant+'.json';if(fs.existsSync(file))throw Error('Already attempted');
 if(true){Object.assign(get('mixed-cold-3'),{shape:[[0,0]],color:'blue'});level.blocks.push({id:'split-left-yellow',x:1,y:5,color:'yellow',shape:[[0,0],[0,1]]});}
 if(variant===2){Object.assign(get('mixed-cold-0'),{shape:[[0,0]],color:'green'});level.blocks.push({id:'split-right-yellow',x:4,y:7,color:'yellow',shape:[[0,0],[0,1]]});}
 if(variant===3){get('mixed-cold-2').color='yellow';get('mixed-cold-1').color='green';}
 level.mechanismAdaptation.change+=' Actual newindependentblue1,4 carrier family: leftV3splitsblueS+yellowV2, externalblue10plussmallblue1 canunlockice11withouttrappedtopcohort. '+variant+': left/right greenV3 optionally splitgreenS+yellowV2, preserving full3cell footprints and explicit authored ordinarybodycount. Sourceknownmechanisms retained.';
 const audit={opening:auditOpeningCoverage(new api.PuzzleModel(level).snapshot()),hidden:auditHiddenCoverage(level),adjacency:[undefined,'l212-cover10','l212-cover1'].flatMap(id=>adjacency(level.blocks.filter(b=>b.shutterId===id))),mechanism:core.auditRevisedMechanismContract(level)};
 const packet={level,parent,variant,levelSha256:sha256(level),audit,formalAccepted:false};
 if(audit.opening.passed&&audit.hidden.passed&&!audit.adjacency.length&&!audit.mechanism.length){try{const plan=structuredClone(level);plan.blocks.forEach(b=>delete b.timedBombSeconds);packet.projection=plan;packet.upper=nativeWitness64(plan,api,{floor:16,maxMilliseconds:3000,maxStates:350000});if(packet.upper.drags){packet.drags=packet.upper.drags;packet.replay=replay(level,packet.drags,api,{timed:true,complete:true,requirePointerCompatible:true});if(packet.replay.nonClearingDrags>=11&&packet.replay.nonClearingDrags<=15){level.preservedMoveTarget=packet.replay.effectiveDrags;plan.preservedMoveTarget=packet.replay.effectiveDrags;packet.levelSha256=sha256(level);let prefix16;for(let i=1;i<=packet.drags.length;i++){const r=replay(level,packet.drags.slice(0,i),api,{timed:true,requirePointerCompatible:true});if(r.clearEvents>=16){prefix16=r.nonClearingDrags;break;}}packet.prefix16RouteCost=prefix16;if(prefix16>=11){packet.lower=runPrefix(prefixPayload(plan,api,{goalClears:16,floor:11,maxMilliseconds:6000,maxStates:2000000,mergeCold:true}).p);packet.lowerScope='Every complete route firstattains16 realclears; coldred/green quotient only beforegoal16.';}else{packet.lower=runNativeLift(liftPayload(plan,api,{floor:11,maxMilliseconds:6000,maxStates:2000000}).p);packet.lowerScope='Full inventory, only bomb deadline deleted.';}}}}catch(e){packet.error=e.stack;}}
 fs.writeFileSync(file,JSON.stringify(packet,null,2),{flag:'wx'});const row={variant,N:level.blocks.length,adj:audit.adjacency,U:packet.replay?.nonClearingDrags,max:packet.upper?.maxClearsSeen,L:packet.lower?.status,frontier:packet.lower?.frontierCost,shortcut:packet.lower?.relaxedNonClearingDrags,error:packet.error};history.push(row);console.log(JSON.stringify(row));if(packet.lower?.thresholdProven){fs.writeFileSync(out+'/history.json',JSON.stringify(history,null,2),{flag:'wx'});process.exit(0);}
}
fs.writeFileSync(out+'/history.json',JSON.stringify(history,null,2),{flag:'wx'});
