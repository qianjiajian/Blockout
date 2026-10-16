import {createHash} from 'node:crypto';
import {auditHiddenCoverage} from '../../revised-hidden-coverage.mjs';
import {projectStaticConstraints} from './constraint-projection.mjs';

export const SHUTTER_MATERIALIZATION_METHOD='full-physical-shutter-early-materialization-v1';
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().filter(k=>v[k]!==undefined).map(k=>[k,canonical(v[k])])):v;
const hash=v=>createHash('sha256').update(JSON.stringify(canonical(v))).digest('hex');

/** LOWER ONLY. Each physical, positive-count, disjoint rectangular cover has
 * exactly one batch whose rigid-body cells tile the entire cover. Materialize
 * all those bodies at their authored positions before the first operation.
 * While following any original solution, leave them stationary until their
 * original reveal. Until then their occupied union equals the physical cover;
 * afterwards the paired bodies have identical positions. A reveal maps to no
 * action, a move/removal to the same gesture and same cost. Erasing ice/locks/
 * axes/grids/door constraints only adds actions. Thus every original solution
 * maps to a projected solution of no greater cost. Extra early moves/removals
 * are intentionally permitted. No body or inventory is dropped.
 *
 * Covers with holes, overlapping cohorts, lifts, moving scenery, queues,
 * shells, special metadata and unknown semantics are not in this domain.
 */
export function projectFullPhysicalShutters(level,runtime) {
  if(!runtime?.validateLevel)throw new Error('Shutter materialization requires authoritative validation');
  runtime.validateLevel(level);
  const fail=reason=>{throw new Error(`Shutter materialization unsupported: ${reason}`);};
  if(!level.shutters?.length)fail('no physical shutter');
  for(const field of ['generators','elevators','conveyors','seams'])if(level[field]?.length)fail(`dynamic inventory/topology ${field}`);
  for(const cover of level.shutters){
    if(Object.keys(cover).some(k=>!['id','x','y','width','height','count','skin'].includes(k)))fail('unknown/cohort shutter field');
    if(![undefined,'shutter'].includes(cover.skin)||!Number.isSafeInteger(cover.count)||cover.count<=0)fail('requires positive-count physical cover');
  }
  const coverage=auditHiddenCoverage(level);if(!coverage.passed)fail(`hidden batch is not independently full: ${coverage.issues.map(x=>x.code).join(',')}`);
  const occupied=new Map();
  for(const block of level.blocks)for(const [dx,dy]of block.shape){
    const k=`${block.x+dx},${block.y+dy}`;
    if(occupied.has(k))fail(`initial cohorts/opening bodies overlap at ${k}`);
    occupied.set(k,block.id);
  }
  const regions=new Set();
  for(const cover of level.shutters)for(let y=cover.y;y<cover.y+cover.height;y++)for(let x=cover.x;x<cover.x+cover.width;x++){
    const k=`${x},${y}`;if(regions.has(k))fail(`physical covers overlap at ${k}`);regions.add(k);
  }
  const before=hash(level),intermediate=structuredClone(level),materialized=[];
  intermediate.blocks=intermediate.blocks.map(block=>{
    if(block.shutterId!==undefined){materialized.push(block.id);delete block.shutterId;}
    return block;
  });
  delete intermediate.shutters;
  const erased=projectStaticConstraints(intermediate);
  runtime.validateLevel(erased.projectedLevel);
  if(hash(level)!==before)throw new Error('Shutter materialization mutated input');
  return{method:SHUTTER_MATERIALIZATION_METHOD,sourceLevelSha256:before,projectedLevelSha256:erased.projectedLevelSha256,
    projectedLevel:erased.projectedLevel,materializedBodyIds:materialized,coverage,
    erasedShutters:level.shutters.map(x=>({id:x.id,count:x.count,x:x.x,y:x.y,width:x.width,height:x.height})),
    erasedConstraints:erased.erased,preservesAllBodies:true,upperBoundTransfer:false};
}
