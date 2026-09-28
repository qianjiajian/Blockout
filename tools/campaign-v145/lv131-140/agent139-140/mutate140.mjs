import fs from 'node:fs';import assert from 'node:assert/strict';
import{loadApi}from '../../../native-block-repair-v143.mjs';import{verifyRulesLock}from '../../../verify-rules-lock.mjs';import{digest}from '../../../revised-preview-validation-v160.mjs';import{loadSpatialApi,searchSpatial}from '../../../../deliverables/remake101-110-v146-20260924/pipeline/spatial-star-domain.mjs';
const ROOT='deliverables/remake131-140-v146-20260924/agent139-140',lock=verifyRulesLock();assert(lock.ok);const{api}=await loadApi(),spatial=await loadSpatialApi();
const input=JSON.parse(fs.readFileSync(`${ROOT}/retry140-1790470753681.json`));
const adjacent=(a,b)=>a.shutterId===b.shutterId&&a.shape.some(([dx,dy])=>b.shape.some(([ex,ey])=>Math.abs(a.x+dx-b.x-ex)+Math.abs(a.y+dy-b.y-ey)===1));
let rng=Number(process.env.SEED??1729140);const random=()=>{rng=(Math.imul(rng,1664525)+1013904223)>>>0;return rng/4294967296;};const colors=['red','blue','green','yellow','purple','orange','pink','cyan'],bs=input.level.blocks,mutables=bs.map((b,i)=>!b.movementAxis?i:-1).filter(i=>i>=0);const seen=new Set(),results=[];
const save=(name,d)=>{const f=`${ROOT}/${name}-${Date.now()}.json`;fs.writeFileSync(f,JSON.stringify(d,null,2)+'\n',{flag:'wx'});return f;};
let searches=0;
for(let n=0;n<Number(process.env.ATTEMPTS??1000)&&searches<Number(process.env.SEARCHES??70);n++){
 const d=structuredClone(input),changed=[];for(let j=0;j<1+n%3;j++){const i=mutables[Math.floor(random()*mutables.length)],b=d.level.blocks[i],old=b.color,next=colors[Math.floor(random()*colors.length)];if(old===next)continue;const stage=b.layers&&random()<0.3?1:0;if(stage===1){b.layers[1]=next;if(b.layers[0]===next)b.layers[1]=old;}else{b.color=next;if(b.layers)b.layers[0]=next;}changed.push({id:b.id,stage,from:old,to:next});}
 if(!changed.length)continue;const level=d.level,hash=digest(level);if(seen.has(hash))continue;seen.add(hash);
 if(level.blocks.some((a,i)=>level.blocks.some((b,j)=>i!==j&&a.color===b.color&&adjacent(a,b)))||!api.auditCandidateBlockArt(level).passed||level.blocks.some(b=>b.layers&&b.layers[0]===b.layers[1]))continue;
 searches++;const search=searchSpatial(level,spatial,{floor:21,maxMilliseconds:2000,maxStates:150000,symmetry:true,diagnosticTrace:true});const replay=search.status==='witness'?api.replayRevisedRoute(level,search.drags):null;
 const row={n,searches,status:search.status,cost:search.cost,clears:search.maxClearsSeen,changed};results.push(row);
 if(replay?.complete&&replay.nonClearingDrags>=16){const shortcut=searchSpatial(level,spatial,{floor:16,maxMilliseconds:1500,maxStates:150000,symmetry:true});let proof=null;if(shortcut.status!=='witness')proof=searchSpatial(level,spatial,{floor:16,prove:true,maxMilliseconds:30000,maxStates:300000,symmetry:true});
 const file=save('mutation140',{...d,activeRuleVersion:lock.activeVersion,seed:`mutate-${n}`,changed,search,drags:search.drags,replay,shortcut,proof,status:proof?.thresholdProven?'FLOOR_AND_ROUTE_REQUIRE_ROOT_REVIEW':'ROUTE_IN_BAND_FLOOR_UNCERTIFIED'});console.log(JSON.stringify({file,...row,shortcut:shortcut.status,proof:proof?.status}));if(proof?.thresholdProven)break;
 }else if(replay?.complete){console.log(JSON.stringify({n,status:search.status,cost:search.cost}));}
}
console.log(JSON.stringify({file:save('mutation140-attempts',{activeRuleVersion:lock.activeVersion,results}),searches}));
