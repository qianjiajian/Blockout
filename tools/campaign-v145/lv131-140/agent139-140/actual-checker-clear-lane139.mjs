import fs from'node:fs';import assert from'node:assert/strict';
import {loadApi} from '../../../native-block-repair-v143.mjs';import {loadSpatialApi,searchSpatial} from './witness-domain.mjs';import {measureRoute} from '../../../remake21to30-quality.mjs';
import {findActualBodyPlacement,findActualBodyClear,executeActualGesture} from './repair-ordinary-fifo-prefix139.mjs';
import {createSourceReview139} from './source-review-current139.mjs';
import {canonicalActualPrefix} from './canonical-actual-prefix139.mjs';
Error.stackTraceLimit=0;const{api}=await loadApi(),spatial=await loadSpatialApi();
const source='deliverables/remake131-140-v146-20260924/agent139-140/cut-wall-witness-solve139-1790486652953.json',d=JSON.parse(fs.readFileSync(source)),level=d.level;
const prefix=d.repaired.selected.drags,remaining=d.prefix.drags.slice(d.repaired.selected.completedProjected),attempts=[];let complete=null;
for(const destinations of [[[7,2],[7,3]],[[6,2],[6,3]],[[7,3],[7,4]],[[6,3],[6,4]]]){
 let model=new api.PuzzleModel(level);model.startCountdown();const drags=[...prefix];for(const drag of prefix){model=executeActualGesture(model,drag);assert(model);}
 let success=true;for(const drag of remaining){const override=drag.blockId==='n139-opening-9'?destinations[0]:drag.blockId==='n139-opening-12'?destinations[1]:drag.blockId==='n139-opening-6'?[6,4]:null;
   let found;if(drag.exitSide)found=findActualBodyClear(model,drag.blockId,{maxMilliseconds:500,maxStates:3000});
   else found=findActualBodyPlacement(model,drag.blockId,override??drag.path.at(-1),{maxMilliseconds:500,maxStates:3000});
   if(!found?.model){success=false;break;}model=found.model;drags.push(found.drag);
 }
 const replay=api.replayRevisedRoute(level,drags);assert(replay.valid);attempts.push({destinations,success,drags,replay});if(success){complete=attempts.at(-1);break;}
}
console.log(JSON.stringify({stage:'actual-prefix',success:Boolean(complete),attempts:attempts.map(a=>({destinations:a.destinations,success:a.success,count:a.drags.length,clears:a.replay.clearEvents,cost:a.replay.nonClearingDrags}))}));
const rawPrefixFile='deliverables/remake131-140-v146-20260924/agent139-140/actual-checker-lane-prefix139-'+Date.now()+'.json';fs.writeFileSync(rawPrefixFile,JSON.stringify({level,sourceCandidate:d.sourceCandidate,attempts,complete},null,2)+'\n',{flag:'wx'});
const canonical=complete?canonicalActualPrefix(level,complete.drags,spatial):null;
const search=canonical?searchSpatial(level,spatial,{floor:16,maxMilliseconds:8000,maxStates:150000,initialDrags:canonical.drags,diagnosticTrace:true}):null;
const replay=search?.status==='witness'?api.replayRevisedRoute(level,search.drags):null,measurement=replay?.complete?measureRoute(level,search.drags,api):null;
const author=JSON.parse(fs.readFileSync(d.sourceCandidate));const file='deliverables/remake131-140-v146-20260924/agent139-140/actual-checker-lane-tail139-'+Date.now()+'.json';
fs.writeFileSync(file,JSON.stringify({level,sourceCandidate:d.sourceCandidate,sourcePrefix:source,rawPrefixFile,sourceReview:createSourceReview139(level,api),lowerBoundCuts:author.lowerBoundCuts??author.cuts,attempts,completePrefix:complete,canonical,search,drags:search?.drags??[],replay,measurement,L:null,thresholdProven:false,formalAdopted:false},null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({file,search:search?.status,complete:replay?.complete,U:replay?.nonClearingDrags,measurement}));
