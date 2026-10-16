import fs from 'node:fs';
import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { loadSpatialApi, searchSpatial } from '../continuation211-colored-witness.mjs';
const src=JSON.parse(fs.readFileSync('deliverables/league-regeneration-20261004/mid-experiments/level63-variant7-rejected.json','utf8'));
const base=src.level; const OUT='deliverables/league-regeneration-20261004/formal/mid-63-finite-retry.json';
const sha=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const bundle=await build({stdin:{resolveDir:process.cwd(),contents:`export {searchRevisedLevel,replayRevisedRoute} from './src/core/revisedLevelSearch.ts'; export {validateLevel} from './src/core/PuzzleModel.ts';`},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'});
const core=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const spatial=await loadSpatialApi();
const playable=new Set(base.playable.map(([x,y])=>`${x},${y}`));
const occInitial=level=>{const set=new Set();for(const b of level.blocks)for(const [dx,dy] of b.shape){const p=`${b.x+dx},${b.y+dy}`;if(set.has(p))return null;set.add(p);}return set;};
const shapeVariants=shape=>{const maxX=Math.max(...shape.map(([x])=>x)),maxY=Math.max(...shape.map(([,y])=>y));return [shape.map(([x,y])=>[maxX-x,y]),shape.map(([x,y])=>[x,maxY-y]),shape.map(([x,y])=>[maxX-x,maxY-y])];};
function mutate(attempt){const l=structuredClone(base); l.name=`荣耀联赛63·有限形色变体${attempt}`; l.id=900063; l.difficulty='super'; l.mechanismRules='revised-2026-09-27-v1.5'; l.timeSeconds=180;l.reward=0;
  // Deterministic non-global color reassignment. Gates stay fixed so this genuinely changes block-to-exit matching.
  const ids=l.blocks.map(b=>b.id); const picks=[[0,1],[2,3],[4,5],[6,8],[9,11],[12,14],[15,16],[1,17]][attempt];
  if(picks){const[a,b]=picks;[l.blocks[a].color,l.blocks[b].color]=[l.blocks[b].color,l.blocks[a].color];}
  // Deterministic safe shape reflection. Keep it only if every cell stays playable and initial occupancy remains disjoint.
  const idx=[0,2,4,6,8,10,12,14][attempt]; const b=l.blocks[idx]; if(b){for(const s of shapeVariants(b.shape)){const cells=s.map(([dx,dy])=>`${b.x+dx},${b.y+dy}`);if(cells.every(p=>playable.has(p))){const old=b.shape;b.shape=s; if(occInitial(l)){break;} b.shape=old;}}}
  return l;
}
const rows=[];let accepted=null;
for(let attempt=0;attempt<8;attempt++){
 const level=mutate(attempt);const row={attempt,fingerprint:sha(level),status:'BLOCKED',budget:{route:{maxStates:120000,maxDragStates:2048,maxTransitions:2500000,maxMilliseconds:3500},lower:{maxStates:700000,maxTransitions:5000000,maxMilliseconds:12000}},failureReasons:[]};
 try{core.validateLevel(level);row.validation='PASS';}catch(e){row.validation='FAIL';row.failureReasons.push('validate:'+e.message);rows.push(row);continue;}
 const route=core.searchRevisedLevel(level,row.budget.route);row.route={status:route.status,termination:route.termination,witnessFound:route.witnessFound,exploredStates:route.exploredStates,discoveredStates:route.discoveredStates,attemptedTransitions:route.attemptedTransitions,nonClearingDrags:route.replay?.nonClearingDrags??null,complete:route.replay?.complete??false,valid:route.replay?.valid??false};
 if(!route.witnessFound||!route.replay?.valid||!route.replay.complete){row.failureReasons.push('authoritative-route-missing-or-invalid');rows.push(row);continue;}
 if(route.replay.nonClearingDrags<21||route.replay.nonClearingDrags>30){row.failureReasons.push('upper-U21-30-out-of-band');rows.push(row);continue;}
 const lower=searchSpatial(level,spatial,{floor:21,prove:true,normalize:false,maxStates:row.budget.lower.maxStates,maxTransitions:row.budget.lower.maxTransitions,maxMilliseconds:row.budget.lower.maxMilliseconds,orderSeed:attempt});row.lower={status:lower.status,termination:lower.termination,thresholdProven:lower.thresholdProven,exploredStates:lower.exploredStates,attemptedTransitions:lower.attemptedTransitions};
 if(!lower.thresholdProven){row.failureReasons.push('fresh-lower-L21-not-proven');rows.push(row);continue;}
 const exits=route.drags.filter(d=>d.exitSide);const half=exits.length/2;const specials=[];for(let i=0;i<exits.length;i++){if(i+1<=half)continue;const id=exits[i].blockId;if(specials.includes(id))continue;const b=level.blocks.find(x=>x.id===id);const w=Math.max(...b.shape.map(p=>p[0]))-Math.min(...b.shape.map(p=>p[0]))+1;const h=Math.max(...b.shape.map(p=>p[1]))-Math.min(...b.shape.map(p=>p[1]))+1;if(w*h===b.shape.length){specials.push(id);if(specials.length===3)break;}}
 if(!specials.length){row.failureReasons.push('no-late-filled-rectangle-special');rows.push(row);continue;}
 row.status='FORMAL_CANDIDATE_READY';row.level=level;row.drags=route.drags;row.specials=specials;row.specialShapePolicy='filled-axis-aligned-rectangle-only';row.specialEvidence=specials.map(id=>{const step=route.drags.findIndex(d=>d.blockId===id&&d.exitSide)+1;return{blockId:id,routeStep:step,clearEvents:exits.length,completeClearVerified:true,lateClear:step>half,score:10,specialShape:'filled-axis-aligned-rectangle'};});row.formalEligibility=true;accepted=row;rows.push(row);break;
}
const report={status:accepted?'PARTIAL_FORMAL_CANDIDATE':'FORMAL_BLOCKED',index:63,levelId:900063,accepted:accepted?{fingerprint:accepted.fingerprint,specials:accepted.specials,level:accepted.level,drags:accepted.drags,specialEvidence:accepted.specialEvidence,lower:accepted.lower,route:accepted.route}:null,attemptBudget:8,finite:true,noInfiniteRetry:true,mutationPolicy:'bounded non-global color swaps plus safe in-bounds shape reflection',rows};fs.writeFileSync(OUT,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,attempts:rows.length,accepted:!!accepted,output:OUT,summary:rows.map(r=>({attempt:r.attempt,status:r.status,reason:r.failureReasons,route:r.route?.termination,U:r.route?.nonClearingDrags,L:r.lower?.thresholdProven}))},null,2));
