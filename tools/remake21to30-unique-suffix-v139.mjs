import {compileLevel} from './remake21to30-mask-floor.mjs';
import {checkSymmetryFloor} from './remake21to30-symmetry-floor-v139.mjs';

/**
 * Exact unique cut state, not deletion of active obstacles to invent a bound.
 * Qualification: one countdown cover, its trigger equals ALL opening clear
 * events (including shells). Hidden bodies cannot be manipulated before reveal.
 * Therefore revealing it requires every opening body and shell to be gone.
 * No other spatial automatic mechanic is allowed by compileLevel. The reveal
 * state is unique regardless of the opening order/parking. Hidden positions,
 * layers and initial ice are unchanged; gates have received exactly N clears.
 * Every complete solution crosses that state. Ignoring the nonnegative prefix
 * cost makes a suffix lower bound a valid whole-level lower bound.
 */
export function uniqueCurtainSuffix(level){
  const compiled=compileLevel(level);
  if(compiled.covers.length!==1)throw Error('Requires exactly one qualified countdown cover');
  const cover=compiled.covers[0],opening=compiled.blocks.filter(b=>!b.cover);
  const clearEvents=opening.reduce((n,b)=>n+b.layers.length,0);
  if(!opening.length||cover.count!==clearEvents)throw Error('Reveal is not the all-opening-cleared cut');
  const suffix=structuredClone(level);
  suffix.blocks=suffix.blocks.filter(b=>b.shutterId===cover.id).map(b=>{delete b.shutterId;return b;});
  suffix.shutters=[];
  for(const gate of suffix.gates){
    if(gate.frozen>clearEvents)gate.frozen-=clearEvents;else delete gate.frozen;
  }
  compileLevel(suffix);
  return {level:suffix,clearsBeforeReveal:clearEvents,curtainId:cover.id};
}
export function uniqueCurtainPhases(level){
  const cut=uniqueCurtainSuffix(level),cover=level.shutters[0],prefix=structuredClone(level);
  prefix.blocks=prefix.blocks.filter(b=>!b.shutterId);prefix.shutters=[];
  const cargoColors=new Set(prefix.blocks.flatMap(b=>b.layers??[b.color]));
  prefix.gates=prefix.gates.filter(g=>cargoColors.has(g.color));
  // A closed curtain is precisely a fixed forbidden footprint until the cut.
  // Unused-color mouths cannot be used by any prefix body; no other ID-sensitive
  // effects are allowed. compileLevel deliberately rejects a retained mouth
  // intersecting that footprint rather than narrowing it unsoundly.
  prefix.blocked=[...(prefix.blocked??[]),...Array.from({length:cover.width*cover.height},(_,i)=>[cover.x+i%cover.width,cover.y+Math.floor(i/cover.width)])];
  compileLevel(prefix);
  return {...cut,prefix};
}
export function checkUniqueCurtainSumFloor(level,options={}){
  let phases;
  try{phases=uniqueCurtainPhases(level);}catch(error){return {status:'unsupported',thresholdProven:false,reason:error.message};}
  const floor=options.floor??15,p=checkSymmetryFloor(phases.prefix,{...options,floor});
  const base={abstraction:'unique-curtain-exact-prefix-plus-suffix-v139',floor,
    curtainId:phases.curtainId,clearsBeforeReveal:phases.clearsBeforeReveal,
    solvabilityValidated:false,timeValidated:false,pointerReplayValidated:false};
  if(p.thresholdProven)return {...base,status:'threshold-proven',thresholdProven:true,prefixProof:p,exploredStates:p.exploredStates};
  if(p.status!=='relaxed-shortcut')return {...base,status:'unknown',thresholdProven:false,prefixProof:p};
  // 0-1 shortest-path search's first completion is the exact relaxed prefix
  // optimum; it is NOT the length of an arbitrary proposed witness.
  const prefixMinimum=p.relaxedNonClearingDrags,s=checkSymmetryFloor(phases.level,{...options,floor:floor-prefixMinimum});
  return {...base,status:s.thresholdProven?'threshold-proven':s.status==='relaxed-shortcut'?'phases-below-threshold':'unknown',
    thresholdProven:s.thresholdProven,prefixMinimum,prefixProof:p,suffixProof:s,
    exploredStates:p.exploredStates+s.exploredStates,discoveredStates:p.discoveredStates+s.discoveredStates};
}
export function checkUniqueCurtainSuffixFloor(level,options={}){
  let cut;
  try{cut=uniqueCurtainSuffix(level);}catch(error){return {status:'unsupported',thresholdProven:false,reason:error.message};}
  const proof=checkSymmetryFloor(cut.level,options);
  // A suffix shortcut does NOT prove a whole-level shortcut without a prefix.
  const {relaxedRoute,relaxedNonClearingDrags,...rest}=proof;
  return {...rest,abstraction:'unique-all-opening-cleared-curtain-cut-v139',suffixAbstraction:proof.abstraction,
    curtainId:cut.curtainId,clearsBeforeReveal:cut.clearsBeforeReveal,
    prefixCostIgnored:true,suffixRelaxedNonClearingDrags:relaxedNonClearingDrags,
    ...(relaxedRoute?{status:'suffix-below-threshold',suffixRelaxedRoute:relaxedRoute}:{}),
    solvabilityValidated:false,timeValidated:false,pointerReplayValidated:false};
}
