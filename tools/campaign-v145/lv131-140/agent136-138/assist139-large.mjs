import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadApi,geometry} from '../../../native-block-repair-v143.mjs';
import {verifyRulesLock} from '../../../verify-rules-lock.mjs';
import {auditOpeningCoverage} from '../../../revised-opening-coverage.mjs';
import {auditHiddenCoverage} from '../../../revised-hidden-coverage.mjs';
import {auditGateSpanLimits} from '../../../revised-gate-span-limits.mjs';
import {auditGeneratorQueueColors} from '../../../revised-generator-queue-colors.mjs';
import {loadSpatialApi,searchSpatial} from '../agent139-140/witness-prefix-upper.mjs';
const ROOT='deliverables/remake131-140-v146-20260924/agent136-138';
const lock=verifyRulesLock();assert(lock.ok);const{api}=await loadApi(),spatial=await loadSpatialApi();
const source='deliverables/remake131-140-v146-20260924/agent139-140/merge-native139-1790475354560.json',prior=JSON.parse(fs.readFileSync(source)),base=prior.level;
const shapes=Object.fromEntries(api.FORMAL_BLOCK_SHAPES.map(s=>[s.shapeId,s.cells]));
let rng=Number(process.env.SEED??13963001);const random=()=>{rng=(Math.imul(rng,1664525)+1013904223)>>>0;return rng/4294967296;},shuffle=a=>a.map(x=>({x,k:random()})).sort((a,b)=>a.k-b.k).map(x=>x.x),key=p=>p.join(',');
const colors=['purple','blue','yellow','red','cyan','orange','pink','green'];
const openCells=base.playable.filter(([x,y])=>y<6),legal=new Set(openCells.map(key));
function tile(bs){let visits=0;const placed=[],used=new Set(),occ=new Set();const root={...bs[3],x:0,y:0};placed.push(root);used.add(3);for(const p of root.shape)occ.add(key(p));function go(){if(++visits>12000)return false;const p=openCells.find(p=>!occ.has(key(p)));if(!p)return used.size===bs.length;const seen=new Set();for(const i of shuffle(bs.map((_,i)=>i).filter(i=>!used.has(i)))){const b=bs[i],sig=JSON.stringify([b.shape,b.movementAxis]);if(seen.has(sig))continue;seen.add(sig);for(const[dx,dy]of shuffle(b.shape)){const x=p[0]-dx,y=p[1]-dy,cc=b.shape.map(([sx,sy])=>[x+sx,y+sy]);if(b.movementAxis&&(y<4||y>5))continue;if(cc.some(p=>!legal.has(key(p))||occ.has(key(p))))continue;cc.forEach(p=>occ.add(key(p)));used.add(i);placed.push({...b,x,y});if(go())return true;placed.pop();used.delete(i);cc.forEach(p=>occ.delete(key(p)));}}return false;}return go()?placed:null;}
const adjacent=(a,b)=>a.shutterId===b.shutterId&&a.shape.some(([dx,dy])=>b.shape.some(([sx,sy])=>Math.abs(a.x+dx-b.x-sx)+Math.abs(a.y+dy-b.y-sy)===1));
function recolor(bs){const adj=bs.map(a=>bs.map((b,j)=>a.id!==b.id&&adjacent(a,b)?j:-1).filter(j=>j>=0));for(let tryN=0;tryN<100;tryN++){const order=shuffle(bs.map((_,i)=>i).filter(i=>!bs[i].movementAxis)),purple=new Set([bs.findIndex(b=>b.id==='a139-opening-3')]);for(const i of order.sort((a,b)=>adj[a].length-adj[b].length+random()*4-2))if(!adj[i].some(j=>purple.has(j)))purple.add(i);if(purple.size<10||![...purple].some(i=>bs[i].x===0&&bs[i].y+Math.max(...bs[i].shape.map(p=>p[1]))<3))continue;const set=new Set(purple);for(const i of purple)bs[i].color='purple';const go=()=>{if(set.size===bs.length)return true;const i=bs.map((_,i)=>i).filter(i=>!set.has(i)).sort((a,b)=>adj[b].filter(j=>set.has(j)).length-adj[a].filter(j=>set.has(j)).length)[0],b=bs[i];const pal=b.movementAxis?['blue']:shuffle(['blue','yellow','red']);for(const color of pal){if(adj[i].some(j=>set.has(j)&&bs[j].color===color))continue;b.color=color;set.add(i);if(go())return true;set.delete(i);}return false;};if(go())return true;}return false;}
const queuedIds=new Set(base.generators.flatMap(g=>g.queueBlockIds));
const hidden=base.blocks.filter(b=>b.shutterId),queue=structuredClone(base.blocks.filter(b=>queuedIds.has(b.id)));queue.forEach((b,i)=>{b.color=['purple','blue','purple','blue'][i];b.shape=shapes[i?4:8];});
assert(api.auditCandidateBlockArt({blocks:queue}).passed,'queue art');
const save=(tag,d)=>{const f=`${ROOT}/${tag}-${Date.now()}.json`;fs.writeFileSync(f,JSON.stringify(d,null,2)+'\n',{flag:'wx'});return f;};
let op=null,searches=0,bestClears=-1;const rows=[],start=Date.now();
for(let attempt=0;attempt<3000&&Date.now()-start<90000;attempt++){
 const seed=rng;
 if(!op){const inv=[9,4,4,7,8,8,8,2,...Array(8).fill(1),7,7,7,7,9,9];const bs=inv.map((s,i)=>({id:`a139-opening-${i}`,shape:shapes[s],color:'red',...(i===0?{movementAxis:'horizontal'}:{})}));assert.equal(bs.reduce((n,b)=>n+b.shape.length,0),51);op=tile(bs);}
 if(!op)continue;const opening=structuredClone(op);if(!recolor(opening)){op=null;continue;}
 const level={...structuredClone(base),generators:base.generators.map(g=>({...g,spawn:[1,0]})),blocks:[...opening,...structuredClone(hidden),...structuredClone(queue)]};
 let audit,search,replay,error;try{api.validateLevel(level);audit={opening:auditOpeningCoverage(new api.PuzzleModel(level).snapshot()),hidden:auditHiddenCoverage(level),art:api.auditCandidateBlockArt(level),span:auditGateSpanLimits(level),queue:auditGeneratorQueueColors(level)};assert(Object.values(audit).every(x=>x.passed));assert.deepEqual(geometry(level),geometry(base));searches++;search=searchSpatial(level,spatial,{maxMilliseconds:1600,maxStates:45000,maxTransitions:800000,diagnosticTrace:true,floor:16,goalClears:12});if(search.status==='witness'){const prefix=search;search=searchSpatial(level,spatial,{maxMilliseconds:2400,maxStates:60000,maxTransitions:1200000,diagnosticTrace:true,floor:16,initialDrags:prefix.drags});search.prefixResult={cost:prefix.cost,drags:prefix.drags.length};}if(search.status==='witness')replay=api.replayRevisedRoute(level,search.drags);}catch(e){error=e.message;}
 const row={attempt,seed,status:search?.status,error,U:replay?.nonClearingDrags,clears:search?.maxClearsSeen,prefix:search?.prefixResult};rows.push(row);console.log(JSON.stringify(row));
 if(replay?.complete||bestClears<0||(search?.maxClearsSeen??-1)>bestClears){bestClears=Math.max(bestClears,search?.maxClearsSeen??-1);console.log(JSON.stringify({file:save('assist139-large',{level,audit,search,drags:search?.drags??[],replay,activeRuleVersion:lock.activeVersion,sourceCandidate:source,seed,sourceAdaptation:{knownSourceOpeningBodies:16,authoredOpeningBodies:22,sourceOpeningArea:27,authoredSourceOpeningArea:29,addedOrdinary:6,addedOrdinaryArea:22,queueSourceColors:['blue','cyan','blue','green'],queueAuthoredColors:queue.map(b=>b.color),queueCountRetained:true,queueIrregularKindsAdaptedToNativeL3:true,source16Targets:opening.filter(b=>Number(b.id.split('-').at(-1))<16).map(b=>b.id),changes:'v172 source ordinary singleton/shape enlargement and6large plain capacity fills; queue color changes enable2purple early clears. Must use prepaidN4 projection, never old queue-freeK12.'},formalAdopted:false,status:replay?.complete?'COMPLETE_ROUTE_LOWER_BOUND_UNCERTIFIED':'DRAFT_UNSOLVED'}),...row}));}
 if(searches%3===0)op=null;if(searches>=Number(process.env.SEARCHES??25))break;
}
console.log(JSON.stringify({file:save('assist139-large-attempts',{rows,searches,elapsed:Date.now()-start}),searches}));
