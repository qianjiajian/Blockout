import {levelSha256} from '../formal-v2/contract.mjs';
import {assertIceProofDomain} from './bounded-ice-proof.mjs';

export const ICE_PRESERVING_PROJECTION='static-single-layer-constraint-deadline-erasure-preserving-ice-v2';
export const ICE_PRESERVING_LOWER_METHOD='v3-ice-preserving-constraints';
const LEVEL_FIELDS=new Set(['id','name','difficulty','timeSeconds','reward','parMoves','preservedMoveTarget',
  'mechanismRules','width','height','playable','blocked','gates','blocks','flipDoors','coloredGrids','bombFailurePolicy',
  'designTargets','onboardingHint','strategyNudge','strategyFocus','featureIntro','mechanismAdaptation',
  'seams','shutters','generators','elevators','conveyors']);
const BLOCK_FIELDS=new Set(['id','x','y','shape','color','layers','frozen','movementAxis','keyId','lockedBy','lockCount','star','timedBombSeconds']);
const GATE_FIELDS=new Set(['id','side','offset','size','color','portals','frozen','star']);
const FLIP_FIELDS=new Set([...GATE_FIELDS,'initiallyOpen']);
const reject=why=>{throw Error(`Ice-preserving projection unsupported: ${why}`);};
const fields=(object,allowed,label)=>{for(const k of Object.keys(object))if(!allowed.has(k))reject(`unknown ${label} field ${k}`);};

export function assertIcePreservingDomain(level){
  if(!level||typeof level!=='object')reject('missing level');fields(level,LEVEL_FIELDS,'level');
  if(!['revised-2026-09-23-v1.4','revised-2026-09-27-v1.5'].includes(level.mechanismRules))reject('unqualified profile');
  for(const k of ['shutters','generators','elevators','conveyors','seams'])if(level[k]?.length)reject(`inventory or topology ${k}`);
  if(!Array.isArray(level.blocks)||!Array.isArray(level.gates))reject('missing actual bodies or exits');
  for(const b of level.blocks){
    fields(b,BLOCK_FIELDS,'block');
    if(b.layers&&(b.layers.length!==1||b.layers[0]!==b.color))reject('shell/colour stages');
  }
  for(const [kind,list]of [['gate',level.gates],['flip',level.flipDoors??[]]])for(const g of list){
    fields(g,kind==='flip'?FLIP_FIELDS:GATE_FIELDS,kind);
    for(const p of g.portals??[])fields(p,new Set(['side','origin','size']),'portal');
  }
  for(const g of level.coloredGrids??[])fields(g,new Set(['id','color','cells']),'grid');
  return true;
}

/** LOWER ONLY. All bodies are visible and single-layer, so each clear removes
 * exactly one body. Preserve every body, its initial colour/shape/pose and ice;
 * preserve every physical gate aperture, resolution order and ice. Remove only
 * axes, key restrictions, star predicates, coloured cells, flip phase and
 * bomb deadlines. Bomb arming can depend on ice/key activity, but time only
 * reduces the deadline or fails the run; it never changes any retained body,
 * gate, ice or clear event. A successful real prefix therefore still maps.
 *
 * Simulation invariant after an arbitrary real action prefix: surviving IDs,
 * positions, colours, shapes and block/gate ice equal those in the projection;
 * clear counts equal. A real held unit move remains legal after removing its
 * predicates. A real exit uses the same first matching aperture and removes
 * the same body. Both advance every surviving body's/gate's ice identically,
 * even if a real body is still key-locked. An animation completion changes
 * only erased flip phase, hence maps to no action. Clocks are failure-only in
 * this domain and can likewise be omitted. A complete real run clears every
 * projected body. One real hold with arbitrary turns maps to one projected
 * hold with cost 0 on clear, otherwise 1. Optional exits may ignore newly legal
 * early contacts. Therefore projected nonclear optimum <= real optimum.
 *
 * Keeping ice while erasing HIDDEN/LAYERED/QUEUED bodies would break the equal
 * event-count invariant; those domains and all unknown semantics fail closed.
 * This is never a justification for transferring a relaxed route as real U.
 */
function buildImage(level){
  assertIcePreservingDomain(level);
  const projected=structuredClone(level),erased=[];
  projected.blocks=level.blocks.map(b=>{
    const result=structuredClone(b);
    for(const field of ['movementAxis','keyId','lockedBy','lockCount','star','timedBombSeconds'])if(field in result){
      erased.push({owner:b.id,field,value:result[field]});delete result[field];
    }
    return result;
  });
  projected.gates=[...level.gates,...(level.flipDoors??[])].map(g=>{
    const result=structuredClone(g);
    for(const field of ['star','initiallyOpen'])if(field in result){erased.push({owner:g.id,field,value:result[field]});delete result[field];}
    return result;
  });
  for(const field of ['flipDoors','coloredGrids','bombFailurePolicy'])if(field in projected){erased.push({owner:'level',field});delete projected[field];}
  return {projected,erased};
}

/** Deterministic image for receipt-binding inspection only. This does not
 * validate source legality, run a solver, certify a lower bound or accept U. */
export function expectedIcePreservingLevel(level){return buildImage(level).projected;}

export function projectIcePreservingConstraints(level,runtime){
  assertIcePreservingDomain(level);
  if(!runtime?.validateLevel)throw Error('Ice projection requires authoritative source and target validation');
  runtime.validateLevel(level);
  const before=levelSha256(level),{projected,erased}=buildImage(level);
  runtime.validateLevel(projected);assertIceProofDomain(projected);
  if(levelSha256(level)!==before)throw Error('Ice projection mutated source');
  return {method:ICE_PRESERVING_PROJECTION,sourceLevelSha256:before,projectedLevelSha256:levelSha256(projected),projectedLevel:projected,
    erased,preservedIce:{blocks:level.blocks.map(b=>({id:b.id,frozen:b.frozen??0})),
      gates:[...level.gates,...(level.flipDoors??[])].map(g=>({id:g.id,frozen:g.frozen??0}))},
    retainsEveryBody:true,retainsEveryIceCounter:true,equalClearEventCount:true,preservesGateResolutionOrder:true,
    deadlineErasureLowerOnly:true,realDeadlineValidationRequiredForUpper:true,
    requiredExitGraph:'optional held paths and exits, including turns',upperBoundTransfer:false};
}
