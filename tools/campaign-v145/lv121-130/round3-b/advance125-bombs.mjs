import fs from 'node:fs';
import {api,save} from './common.mjs';
import {digest} from '../../../revised-preview-validation-v160.mjs';
import {loadApi,auditDraft,mechanismInventory} from '../../../remake121to130-v172.mjs';
import {projection,replayBomb} from '../../../remake121to130-bomb-replay-v172.mjs';
import {checkSymmetryFloor} from '../../../remake21to30-symmetry-floor-v139.mjs';
const input=process.argv[2],old=JSON.parse(fs.readFileSync(input)),level=structuredClone(old.level);
for(const b of level.blocks)delete b.timedBombSeconds;
const moves=[
 {source:{phase:'hidden-left',shape:'V3',color:'cyan',seconds:15,initialObserved:false},target:'r3-125-0',routeStep:1},
 {source:{phase:'hidden-right',shape:'V3',color:'blue',seconds:15,initialObserved:false},target:'r3-125-20',routeStep:6},
 {source:{phase:'opening',shape:'S',color:'red',seconds:25,initialObserved:true},target:'r3-125-12',routeStep:8},
 {source:{phase:'opening',shape:'S',color:'green',seconds:25,initialObserved:true},target:'r3-125-1',routeStep:12},
].map(x=>{let b=level.blocks.find(b=>b.id===x.target);b.timedBombSeconds=x.source.seconds;return{...x,design:{phase:'opening',color:b.color,shape:b.shape,x:b.x,y:b.y,timedBombSeconds:b.timedBombSeconds}};});
const sourceReview=structuredClone(old.sourceReview);
sourceReview.adaptations.push('Under inherited v1.3 within-level introduction timing permission and v1.71 color/shape iteration, move both source hidden bombs into the opening. Source reveal timing is not represented as preserved. Both covers still reveal fully tiled genuine blocks; four bombs retain [15,15,25,25], five shells and all gate/counter quantities are unchanged. Source15s remains an authored inference from first-visible14, not a directly observed initial value.');
sourceReview.bombRelocation=moves;
sourceReview.expectedInventory=mechanismInventory(level);
const p=projection(level),drags=old.drags,replay=api.replayRevisedRoute(p,drags),timed=replayBomb(level,drags,api,true);
const proof=checkSymmetryFloor(p,{floor:11,maxStates:3000000,maxMilliseconds:60000});
const data={level,drags,sourceReview,levelSha256:digest(level),routeSha256:digest(drags),priorCandidate:input,projection:{kind:'deadline-erasure-only',levelSha256:digest(p),explanation:'Erases only bomb clocks, retaining every block, layer, gate and reveal counter. Every timed completion has the same spatial route and nonclearing cost.'},replay,timed,proof,formalAdopted:false,pointerValidated:false,naturalClockValidated:false};
data.audit=auditDraft(data,(await loadApi()).api);
console.log(JSON.stringify({file:save('reviewed125-advanced-bombs',data),hash:data.levelSha256,audit:data.audit.passed,replay:{valid:replay.valid,complete:replay.complete},timed,proof:{status:proof.status,thresholdProven:proof.thresholdProven,states:proof.discoveredStates}}));
