import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadApi} from '../../../native-block-repair-v143.mjs';
import {verifyRulesLock} from '../../../verify-rules-lock.mjs';
import {digest} from '../../../revised-preview-validation-v160.mjs';
import {auditOpeningCoverage} from '../../../revised-opening-coverage.mjs';
import {auditHiddenCoverage} from '../../../revised-hidden-coverage.mjs';
import {auditGateSpanLimits} from '../../../revised-gate-span-limits.mjs';
import {loadSpatialApi,searchSpatial} from '../../../../deliverables/remake101-110-v146-20260924/pipeline/spatial-star-domain.mjs';
const ROOT='deliverables/remake131-140-v146-20260924/agent139-140';
const lock=verifyRulesLock();assert(lock.ok,lock.errors.join('\n'));
const {api}=await loadApi(),spatial=await loadSpatialApi();
const input=JSON.parse(fs.readFileSync(`${ROOT}/candidate140-1790470324376.json`));
const results=[];let rng=Number(process.env.SEED??147140);const random=()=>{rng=(Math.imul(rng,1664525)+1013904223)>>>0;return rng/4294967296;};const shuffled=a=>a.map(x=>({x,k:random()})).sort((a,b)=>a.k-b.k).map(x=>x.x);
const adjacent=(a,b)=>!a.shutterId===!b.shutterId&&a.shutterId===b.shutterId&&a.shape.some(([dx,dy])=>b.shape.some(([ex,ey])=>Math.abs(a.x+dx-b.x-ex)+Math.abs(a.y+dy-b.y-ey)===1));
function color(level){const bs=level.blocks,neighbors=bs.map(a=>bs.map((b,j)=>adjacent(a,b)?j:-1).filter(j=>j>=0)),assigned=new Set();
 for(let i=0;i<bs.length;i++)if(bs[i].movementAxis)assigned.add(i);
 function go(){if(assigned.size===bs.length)return true;const i=shuffled(bs.map((_,i)=>i).filter(i=>!assigned.has(i))).sort((a,b)=>neighbors[b].filter(i=>assigned.has(i)).length-neighbors[a].filter(i=>assigned.has(i)).length)[0],b=bs[i],palette=['purple','green','orange','pink',...(b.shape.every(([x])=>x===0)?['blue','cyan','yellow']:[]),'red'].filter(c=>c!=='red'||Math.max(...b.shape.map(([x])=>x))<3).filter(c=>api.auditCandidateBlockArt({blocks:[{...b,color:c,layers:undefined}]}).passed);
  for(const c of shuffled(palette)){if(b.id==='n140-ordinary-3'&&!['orange','pink','red'].includes(c))continue;if(neighbors[i].some(j=>assigned.has(j)&&bs[j].color===c))continue;b.color=c;assigned.add(i);if(go())return true;assigned.delete(i);}return false;
 }if(!go())return false;for(const b of bs)if(b.layers){b.layers[0]=b.color;const p=['purple','green','orange','pink'].filter(c=>c!==b.color);b.layers[1]=p[Math.floor(random()*p.length)];}return true;
}
const save=(name,obj)=>{const p=`${ROOT}/${name}-${Date.now()}.json`;fs.writeFileSync(p,JSON.stringify(obj,null,2)+'\n',{flag:'wx'});return p;};
let best=-1;
for(let attempt=0;attempt<Number(process.env.ATTEMPTS??100);attempt++){
 const level=structuredClone(input.level),seed=rng;if(!color(level)){results.push({attempt,status:'coloring-impossible'});continue;}
 const audit={opening:auditOpeningCoverage(new api.PuzzleModel(level).snapshot()),hidden:auditHiddenCoverage(level),art:api.auditCandidateBlockArt(level),spans:auditGateSpanLimits(level),adjacency:{passed:!level.blocks.some(a=>level.blocks.some(b=>a.id!==b.id&&a.color===b.color&&adjacent(a,b)))}};assert(Object.values(audit).every(x=>x.passed));
 const search=searchSpatial(level,spatial,{floor:21,maxMilliseconds:Number(process.env.SEARCH_MS??1500),maxStates:120000,maxTransitions:3000000,symmetry:true,diagnosticTrace:true});
 const replay=search.status==='witness'?api.replayRevisedRoute(level,search.drags):null;
 const row={attempt,seed,status:search.status,cost:search.cost,clears:search.maxClearsSeen,termination:search.termination};results.push(row);
 if(search.maxClearsSeen>best||replay?.complete){best=Math.max(best,search.maxClearsSeen);const file=save('retry140',{...input,level,seed,source:{...input.source,adaptations:['Current56-cell board preserved; cover8 fits a fully occupied5x3 region with5 hidden bodies. Opening expands13 source identities to41cells; hidden5fill15cells.','Three shell carriers adapted to q0 rectangular assets; three M11 identities retained across one opening and two hidden plain pieces; four vertical axes and ice2/3/4 retained.','Each variant uses a fresh proper adjacency coloring; source colors/shapes differ under v1.72 authorization.']},audit,search,drags:search.drags??[],replay,activeRuleVersion:lock.activeVersion,status:replay?.complete?'COMPLETE_ROUTE_FLOOR_UNCERTIFIED':'DRAFT_UNSOLVED'});console.log(JSON.stringify({file,...row,replay}));}
 if(replay?.complete&&replay.nonClearingDrags>=16){const proof=searchSpatial(level,spatial,{floor:16,prove:true,maxStates:250000,maxMilliseconds:30000,symmetry:true});console.log(JSON.stringify({proof:save('floor140',{levelSha256:digest(level),proof}),status:proof.status}));if(proof.thresholdProven)break;}
}
console.log(JSON.stringify({file:save('retry140-attempts',{activeRuleVersion:lock.activeVersion,results}),results:results.length}));
