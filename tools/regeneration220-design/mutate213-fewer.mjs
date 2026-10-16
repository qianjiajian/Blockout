import fs from 'node:fs';
import {loadSpatialApi,searchSpatial} from '../remake201to210-v123-floor.mjs';
import {loadContinuationRuntime,sha256} from '../continuation211-runtime.mjs';
import {proveWithLifts} from './prove-after-lift.mjs';
import {auditOpeningCoverage} from '../revised-opening-coverage.mjs';
import {auditHiddenCoverage} from '../revised-hidden-coverage.mjs';
const out='deliverables/continue211-220-20260930/design220-new',base=JSON.parse(fs.readFileSync('deliverables/continue211-220-20260930/design212-new/source213/scored-candidate213-7.json'));
const api=await loadSpatialApi(),core=await loadContinuationRuntime(),history=[],seen=new Set(),V3=[[0,0],[0,1],[0,2]];
function adjacency(blocks){const map=new Map();for(const b of blocks)for(const[x,y]of b.shape)map.set([b.x+x,b.y+y].join(','),b);const pairs=[];for(const[k,b]of map){const[x,y]=k.split(',').map(Number);for(const[dx,dy]of[[1,0],[0,1]]){const a=map.get([x+dx,y+dy].join(','));if(a&&a.id!==b.id&&(a.layers?.[0]??a.color)===(b.layers?.[0]??b.color))pairs.push([a,b]);}}return pairs;}
for(let n=0;n<8;n++){
 const level=structuredClone(base.level),changes=[];
 const trunk=['red','orange','pink','green'][n%4],column=['green','red'][n>>2];
 for(const[group,x,y,color]of[[['lower-fill-0','lower-fill-1','lower-fill-3'],3,6,trunk],[['orange-split-0','orange-split-1','orange-split-2'],4,9,column]]){level.blocks=level.blocks.filter(b=>!group.some(id=>b.id==='l213-'+id));const id='l213-merged-'+x+'-'+y;level.blocks.push({id,x,y,color,shape:V3});changes.push({from:group,to:id,shape:'native V3',color});}
 for(let tries=0;tries<30;tries++){const pair=adjacency(level.blocks.filter(b=>!b.shutterId))[0];if(!pair)break;const b=pair.find(b=>b.shape.length===1);if(!b)break;const old=b.color;let fixed=false;for(const color of['blue','red','yellow','green','pink','cyan']){if(color===old)continue;b.color=color;if(!adjacency(level.blocks.filter(b=>!b.shutterId)).some(p=>p.some(a=>a.id===b.id))){changes.push({id:b.id,from:old,to:color});fixed=true;break;}}if(!fixed){b.color=old;break;}}
 const adj=[...adjacency(level.blocks.filter(b=>!b.shutterId)),...adjacency(level.blocks.filter(b=>b.shutterId==='l213-upper')),...adjacency(level.blocks.filter(b=>b.shutterId==='l213-lift'))];if(adj.length){console.log(n,'adjacency rejected');continue;}
 const fingerprint=sha256(level);if(seen.has(fingerprint))continue;seen.add(fingerprint);
 let audit;try{audit={opening:auditOpeningCoverage(new api.PuzzleModel(level).snapshot()),hidden:auditHiddenCoverage(level),native:level.blocks.every(b=>core.matchFormalBlockShape(b.shape,'native-only')),mechanism:core.auditRevisedMechanismContract(level)};}catch(error){console.log(n,error.message);continue;}
 if(!audit.opening.passed||!audit.hidden.passed||!audit.native||audit.mechanism.length){console.log(n,'static rejected');continue;}
 const result=searchSpatial(level,api,{normalize:true,maxMilliseconds:4000,maxStates:80000,maxTransitions:1000000,orderSeed:n}),replay=result.drags?core.replayRevisedRoute(level,result.drags):null;
 let proof;if(replay?.valid&&replay.complete&&replay.nonClearingDrags>=11&&replay.nonClearingDrags<=15){level.preservedMoveTarget=result.drags.length;proof=proveWithLifts(level,api,{floor:11,maxMilliseconds:6000,maxStates:150000,normalizeMonotone:true});}
 const row={n,levelSha256:sha256(level),status:result.status,U:replay?.nonClearingDrags,lower:proof?.status,lowerShortcut:proof?.cost};history.push(row);console.log(row);
 fs.writeFileSync(out+'/reduced213-'+n+'.json',JSON.stringify({level,changes,audit,result,replay,proof,source:base.sourceReview},null,2));fs.writeFileSync(out+'/reduced213-history.json',JSON.stringify(history,null,2));
 if(proof?.thresholdProven){fs.writeFileSync(out+'/qualified213.json',JSON.stringify({level,changes,audit,result,replay,proof,source:base.sourceReview},null,2));break;}
}
