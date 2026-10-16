/* Isolated late-season league candidate audit (65-100).
 * This intentionally never writes the formal league selector or campaign data.
 * A finite mutation budget and solver budget are part of every row so timeout
 * cannot silently turn into an accepted level.
 */
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {loadSpatialApi,searchSpatial} from '../continuation211-colored-witness.mjs';
import {loadContinuationRuntime,sha256} from '../continuation211-runtime.mjs';
import {staticDelayedLiftFloor} from '../regeneration211-design/native-static-lift214.mjs';
import {verifyRulesLock} from '../verify-rules-lock.mjs';
if(!verifyRulesLock().ok) throw new Error('rules lock failed');
const OUT='deliverables/league-regeneration-20261004/late-experiments';fs.mkdirSync(OUT,{recursive:true});
const bundle=await build({stdin:{resolveDir:process.cwd(),contents:"export {LEVELS} from './src/core/levels.ts'"},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'});
const {LEVELS}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const api=await loadSpatialApi(),core=await loadContinuationRuntime();
const cycle=i=>((i-1)%5===2?'super':'hard');
const digest=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
function q0Audit(level){const legal=new Set((level.playable??[]).map(p=>p.join(','))),occ=new Map(),adj=[];for(const b of level.blocks)for(const [dx,dy] of b.shape){const k=`${b.x+dx},${b.y+dy}`;(occ.get(k)??occ.set(k,[]).get(k)).push(b.id);}for(const [k,v] of occ)if(v.length!==1&&!level.blocks.some(b=>b.shutterId&&b.id===v[0])){}const missing=[...legal].filter(k=>!occ.has(k));for(const a of level.blocks)for(const b of level.blocks){if(a.id>=b.id||a.color!==b.color)continue;for(const [x,y] of a.shape)for(const [dx,dy] of b.shape)if(Math.abs(a.x+x-b.x-dx)+Math.abs(a.y+y-b.y-dy)===1)adj.push([a.id,b.id]);}return{playableCells:legal.size,coveredCells:occ.size,missingCells:missing.length,adjacentSameColor:adj.length};}
function unsupported(level){const reasons=[];if(level.generators?.length)reasons.push('generator');if(level.flipDoors?.length)reasons.push('flip-door');if(level.coloredGrids?.length)reasons.push('colored-grid');if(level.blocks.some(b=>b.keyId||b.lockedBy))reasons.push('key-lock');if(level.elevators?.length||level.conveyors?.length)reasons.push('autonomous-platform');return reasons;}
const rows=[];
for(let index=65;index<=100;index++){
 const source=LEVELS.find(l=>l.id===index);const attempts=[];let accepted=null;
 for(let mutationIndex=0;mutationIndex<3;mutationIndex++){
  const level=structuredClone(source);level.id=900000+index;level.name=`荣耀联赛·${index}`;level.difficulty=cycle(index);level.mechanismRules='revised-2026-09-27-v1.5';level.timeSeconds=180;level.reward=0;
  // Mutation 0 preserves the normal level's mechanism inventory. Mutations are
  // deliberately bounded: geometry is only permuted within identical shapes.
  if(mutationIndex>0){const groups=new Map();for(const b of level.blocks.filter(b=>!b.shutterId)){const k=JSON.stringify(b.shape);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(b);}for(const bs of groups.values()){const shift=mutationIndex%bs.length;const p=bs.map(b=>[b.x,b.y]);bs.forEach((b,i)=>{[b.x,b.y]=p[(i+shift)%p.length]});}}
  const fingerprint=digest({level,mutationIndex}), budget={lower:{floor:level.difficulty==='super'?21:16,maxMilliseconds:2500,maxStates:350000},upper:{floor:level.difficulty==='super'?31:21,maxMilliseconds:2500,maxStates:120000}};
  const row={index,mutationIndex,solverAttempt:1,fingerprint,budget,mechanisms:unsupported(level),q0:q0Audit(level),status:'BLOCKED',failureReasons:[]};
  if(row.mechanisms.length)row.failureReasons.push('solver-profile-unsupported:'+row.mechanisms.join(','));
  if(row.q0.missingCells||row.q0.adjacentSameColor)row.failureReasons.push('q0-not-full-or-adjacent-same-color');
  try{api.validateLevel(level);row.validation='structural-pass';if(!row.failureReasons.length){const lower=staticDelayedLiftFloor(level,api,budget.lower),upper=searchSpatial(level,api,budget.upper),replay=upper.drags?core.replayRevisedRoute(level,upper.drags):null;row.lower={status:lower.status,thresholdProven:lower.thresholdProven,exploredStates:lower.exploredStates,relaxedNonClearingDrags:lower.relaxedNonClearingDrags};row.upper={status:upper.status,exploredStates:upper.exploredStates,maxClearsSeen:upper.maxClearsSeen};row.replay=replay&&{valid:replay.valid,complete:replay.complete,nonClearingDrags:replay.nonClearingDrags};if(lower.thresholdProven&&replay?.valid&&replay.complete&&replay.nonClearingDrags<=(level.difficulty==='super'?30:20)){row.status='PASS_CANDIDATE';accepted={level,lower,upper,replay,sourceLevel:index,mutationIndex,fingerprint};}else row.failureReasons.push('fresh-lower-or-upper-threshold-not-proven');}}catch(e){row.failureReasons.push('exception:'+e.message.slice(0,180));}
  attempts.push(row);if(accepted)break;
 }
 if(accepted){fs.writeFileSync(`${OUT}/candidate-${index}.json`,JSON.stringify({status:'PASS_CANDIDATE',...accepted},null,2));}else fs.writeFileSync(`${OUT}/candidate-${index}.json`,JSON.stringify({status:'BLOCKED',attempts},null,2));
 rows.push(accepted?{index,status:'PASS_CANDIDATE',mutationIndex:accepted.mutationIndex,fingerprint:accepted.fingerprint}:{index,status:'BLOCKED',reasons:[...new Set(attempts.flatMap(a=>a.failureReasons))]});
 console.log(JSON.stringify(rows.at(-1)));
}
fs.writeFileSync(`${OUT}/late-summary.json`,JSON.stringify({status:rows.some(r=>r.status==='BLOCKED')?'INCOMPLETE':'PASS',range:[65,100],accepted:rows.filter(r=>r.status==='PASS_CANDIDATE').length,blocked:rows.filter(r=>r.status==='BLOCKED').length,rows},null,2));
