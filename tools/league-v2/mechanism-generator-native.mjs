import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {loadLeagueProofRuntime,verifyLeagueCandidate} from './proof-contract.mjs';
import {applyNativeDrag} from '../daily-challenge/formal-v2/mechanism-decorate.mjs';
import {auditLeagueMechanismStructure} from './mechanism-structure.mjs';
import {auditExistingLeagueMechanisms} from './mechanism-compose.mjs';
import {leagueMechanismPlan} from './mechanism-policy.mjs';

/** Builds real centre-mouth FIFO machines, then performs one native model
 * route search under the hard full-board limit. Failed boards are immutable
 * and need actual colour AND shape changes before a later solver attempt. */
const [file,indexText,mode]=process.argv.slice(2),index=Number(indexText);
if(!file||!Number.isInteger(index)||index<35)throw Error('usage: mechanism-generator-native.mjs plain.json index [solve]');
const input=JSON.parse(fs.readFileSync(file)),runtime=await loadLeagueProofRuntime(),level=structuredClone(input.level),plan=leagueMechanismPlan(index);
plan.primary='generator';plan.primaryTargets={instances:2,minimumCounter:null,queuePerGenerator:index%5===3?4:3,minimumLiftArea:null};
plan.capacityBasis='Two actual 3-rail rim devices; super increases FIFO queue and supporting counters rather than inventing a third incompatible mounting rail.';
const model=new runtime.PuzzleModel(input.level);model.startCountdown();const firstAction=new Map(),firstGate=new Map();
for(const d of input.drags){const before=model.snapshot();if(!firstAction.has(d.blockId))firstAction.set(d.blockId,before.cleared);if(d.exitSide){const color=model.getBlock(d.blockId).layers[0];if(!firstGate.has(color))firstGate.set(color,before.cleared);}applyNativeDrag(model,d);}
let rims=[...(input.provenance?.reservedGeneratorRim??[])];
for(const side of ['top','right','bottom','left']){const n=side==='top'||side==='bottom'?level.width:level.height;for(let offset=0;offset<=n-3;offset++)if(!level.gates.some(g=>g.side===side&&g.offset<offset+3&&offset<g.offset+g.size)&&!rims.some(r=>r.side===side&&r.offset===offset))rims.push({side,offset,size:3});}
const bounds=r=>r.side==='top'?{x:r.offset,y:-1,w:3,h:1.35}:r.side==='bottom'?{x:r.offset,y:level.height-.35,w:3,h:1.35}:r.side==='left'?{x:-1,y:r.offset,w:1.35,h:3}:{x:level.width-.35,y:r.offset,w:1.35,h:3};
const overlap=(a,b)=>Math.min(a.x+a.w,b.x+b.w)>Math.max(a.x,b.x)&&Math.min(a.y+a.h,b.y+b.h)>Math.max(a.y,b.y);
const picked=[];for(const r of rims){if(picked.some(q=>overlap(bounds(q),bounds(r))))continue;picked.push(r);if(picked.length===2)break;}assert.equal(picked.length,2,'two real unoccupied rim tray positions required');
const colors=[...new Set(level.gates.map(g=>g.color))];level.generators=[];
for(const [i,r]of picked.entries()){
 const offset=r.offset+1,spawn=r.side==='top'?[offset,0]:r.side==='bottom'?[offset,level.height-1]:r.side==='left'?[0,offset]:[level.width-1,offset];
 const owner=level.blocks.find(b=>b.shape.some(([x,y])=>b.x+x===spawn[0]&&b.y+y===spawn[1]));assert(owner,'centre spawn must be real initially covered board floor');
 const palette=[owner.color,colors.find(c=>c!==owner.color)],queue=[];
 for(let q=0;q<plan.primaryTargets.queuePerGenerator;q++){const id=`league-${index}-native-cargo-${i}-${q}`;level.blocks.push({id,x:spawn[0],y:spawn[1],shape:[[0,0]],color:palette[q%2]});queue.push(id);}
 level.generators.push({id:`league-${index}-native-generator-${i}`,side:r.side,offset,rimSpan:3,rimMount:'rim',spawn,queueBlockIds:queue});
}
for(const g of level.gates.filter(g=>(firstGate.get(g.color)??0)>=3).sort((a,b)=>firstGate.get(b.color)-firstGate.get(a.color)).slice(0,3))g.frozen=firstGate.get(g.color);
for(const b of level.blocks.filter(b=>(firstAction.get(b.id)??0)>=3).sort((a,b)=>firstAction.get(b.id)-firstAction.get(a.id)).slice(0,2))b.frozen=firstAction.get(b.id);
Object.assign(level,{id:900000+index,name:`荣耀联赛${index}·双机正式候选`,difficulty:index%5===3?'super':'hard',timeSeconds:180,reward:0});
const structure=await auditLeagueMechanismStructure(runtime,level,index),out=`deliverables/league-v2-20261008/mechanisms/generator-native/index-${index}-${Date.now()}.json`;
fs.mkdirSync(path.dirname(out),{recursive:true});let proof,mechanisms;
if(mode==='solve'&&structure.passed){
 proof=await verifyLeagueCandidate(runtime,{index,sourceLevelId:input.sourceLevelId,level,requiredMechanisms:['generator']},{ledgerDirectory:'deliverables/league-v2-20261008/mechanisms/proof-attempts',attemptKey:`league-${index}`,
  routeBudget:{maxStates:10000,maxTransitions:3000000,maxMicroStates:1000000,maxMilliseconds:10000},lowerBudget:{maxStates:10000,maxTransitions:3000000,maxMicroStates:1000000,maxMilliseconds:10000}});
 if(proof.accepted)mechanisms=await auditExistingLeagueMechanisms({index,sourceLevelId:input.sourceLevelId,level,drags:proof.drags,plan},{runtime});
}
fs.writeFileSync(out,JSON.stringify({basePath:file,index,level,plan,structure,proof,mechanisms,formalEligibility:false},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({out,structure:structure.passed,issues:structure.issues,proofStatus:proof?.status,U:proof?.U,L:proof?.L,mechanisms:mechanisms?.ok,routeSearch:proof?.route?.search&&{states:proof.route.search.discoveredStates,reason:proof.route.search.termination}},null,2));
