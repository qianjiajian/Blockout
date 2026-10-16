import {assertPlainProofDomain} from '../formal-v2/proof-plain.mjs';
import {canonicalExit} from '../formal-v2/proof-scheduled-route.mjs';
import {independentReplay,levelSha256} from '../formal-v2/contract.mjs';

export const REVERSE_ROUTE_AUDIT_VERSION='plain-reverse-gesture-qualification-1';
const bodiesKey=blocks=>levelSha256(blocks.map(b=>({id:b.id,x:b.x,y:b.y,shape:b.shape,color:b.color,layers:b.layers??[b.color]})).sort((a,b)=>a.id.localeCompare(b.id)));
const copy=structuredClone;
const requireThat=(condition,message)=>{if(!condition)throw Error(message);};
const checkPoint=p=>Array.isArray(p)&&p.length===2&&p.every(Number.isSafeInteger);

/** Replaying a supplied gesture is not a search. The caller's construction
 * budget must already include each distinct world it generated or inspected.
 * Partial worlds are allowed here; final complete witnesses have a separate
 * filled-opening/full-inventory check below. */
export function auditPlainForwardDrag(runtime,level,drag,{expectedBodies}={}){
  const result={valid:false,searchPerformed:false,lowerBoundClaimed:false,naturalTimeValidated:false};
  try{
    assertPlainProofDomain(level);runtime.validateLevel(level);
    requireThat(drag&&Object.keys(drag).every(k=>['blockId','path','exitSide'].includes(k))&&Array.isArray(drag.path),'Invalid drag');
    const model=new runtime.PuzzleModel(copy(level));model.startCountdown();
    requireThat(model.getBlock(drag.blockId),'Missing selected body');
    const before=model.snapshot();model.beginAction();
    let automatic=canonicalExit(runtime,model,drag.blockId);
    requireThat(!automatic||drag.path.length===0,'Pointer-down exit prevents any parking/path');
    for(const [index,point] of drag.path.entries()){
      const held=model.getBlock(drag.blockId),previous=[held.x,held.y];
      requireThat(checkPoint(point)&&Math.abs(point[0]-held.x)+Math.abs(point[1]-held.y)===1,'Path must contain every unit step');
      requireThat(model.moveBlockStep(drag.blockId,...point),'Actual model rejected held step');
      automatic=canonicalExit(runtime,model,drag.blockId,previous);
      requireThat(!automatic||index===drag.path.length-1,'First-contact exit precedes end of held path');
    }
    requireThat(automatic===drag.exitSide,'Canonical exit differs from declared clear/parking');
    if(drag.exitSide)requireThat(model.tryExit(drag.blockId,drag.exitSide).ok,'Actual model rejected exit');
    requireThat(model.commitAction(),'No effective gesture');
    const after=model.snapshot(),clears=after.cleared-before.cleared;
    requireThat(after.moves===before.moves+1&&clears===Number(!!drag.exitSide),'One held gesture must have one commit and its exact clear cost');
    if(expectedBodies)requireThat(bodiesKey(after.blocks)===bodiesKey(expectedBodies),'Inverse failed to restore all original body identities/shapes/colours/positions');
    return{...result,valid:true,clearEvents:clears,nonClearingDrags:Number(clears===0),effectiveDrags:1,
      beforeBodiesSha256:bodiesKey(before.blocks),afterBodiesSha256:bodiesKey(after.blocks),remainingBodies:after.blocks.length,
      complete:after.complete,drag:copy(drag)};
  }catch(error){return{...result,error:error.message};}
}

export function inverseUnitPath(start,reversePath){
  requireThat(checkPoint(start)&&Array.isArray(reversePath)&&reversePath.every(checkPoint),'Invalid inverse path coordinates');
  const points=[start,...reversePath];
  for(let i=1;i<points.length;i++)requireThat(Math.abs(points[i][0]-points[i-1][0])+Math.abs(points[i][1]-points[i-1][1])===1,'Reverse construction omitted unit steps');
  return points.reverse().slice(1);
}

export function inverseParkingAudit(runtime,beforeLevel,blockId,reversePath){
  try{
    const body=beforeLevel.blocks.find(b=>b.id===blockId);requireThat(body,'Unknown reverse moving body');
    requireThat(reversePath.length>0,'Reverse parking must move');
    const path=inverseUnitPath([body.x,body.y],reversePath),end=reversePath.at(-1),after=copy(beforeLevel);
    Object.assign(after.blocks.find(b=>b.id===blockId),{x:end[0],y:end[1]});
    const drag={blockId,path},audit=auditPlainForwardDrag(runtime,after,drag,{expectedBodies:beforeLevel.blocks});
    return{...audit,reverseAfterLevel:after,forwardDrag:drag};
  }catch(error){return{valid:false,searchPerformed:false,error:error.message};}
}

export function inverseInsertionAudit(runtime,beforeLevel,insertedAtPortal,reversePath,exitSide){
  try{
    requireThat(!beforeLevel.blocks.some(b=>b.id===insertedAtPortal.id),'Insertion reused a live body ID');
    const path=inverseUnitPath([insertedAtPortal.x,insertedAtPortal.y],reversePath),end=reversePath.at(-1)??[insertedAtPortal.x,insertedAtPortal.y];
    const after={...copy(beforeLevel),blocks:[...copy(beforeLevel.blocks),{...copy(insertedAtPortal),x:end[0],y:end[1]}]};
    const drag={blockId:insertedAtPortal.id,path,exitSide},audit=auditPlainForwardDrag(runtime,after,drag,{expectedBodies:beforeLevel.blocks});
    return{...audit,reverseAfterLevel:after,forwardDrag:drag};
  }catch(error){return{valid:false,searchPerformed:false,error:error.message};}
}

/** Checks a supplied final witness. No generator/solver, no inferred L, no
 * resuming an earlier failed design. A filled last insertion alone does not
 * prove that all previous inventory has a valid route to completion. */
export function auditCompleteReverseWitness(runtime,level,drags){
  const out={valid:false,searchPerformed:false,lowerBoundClaimed:false,naturalTimeValidated:false};
  try{
    assertPlainProofDomain(level);runtime.validateLevel(level);
    const blocked=new Set((level.blocked??[]).map(p=>p.join(','))),playable=new Set((level.playable??Array.from({length:level.width*level.height},(_,i)=>[i%level.width,Math.floor(i/level.width)])).filter(p=>!blocked.has(p.join(','))).map(p=>p.join(',')));
    const occupied=new Set();
    for(const b of level.blocks)for(const [dx,dy] of b.shape){const cell=[b.x+dx,b.y+dy].join(',');requireThat(playable.has(cell)&&!occupied.has(cell),'Opening overlap or outside cell');occupied.add(cell);}
    requireThat(occupied.size===playable.size,'Final reverse insertion did not fill the actual board');
    const canonical=runtime.replayRevisedRoute(level,drags),independent=independentReplay(runtime,level,drags);
    requireThat(canonical.valid&&canonical.complete&&independent.valid&&independent.complete&&!independent.failed,'Final original route failed one of the independent replays');
    requireThat(canonical.nonClearingDrags===independent.nonClearingDrags&&canonical.effectiveDrags===independent.effectiveDrags&&canonical.clearEvents===level.blocks.length&&independent.clearEvents===level.blocks.length,'Route did not clear the exact full original inventory');
    return{...out,valid:true,canonical,independent,L:null,U:independent.nonClearingDrags,levelSha256:levelSha256(level)};
  }catch(error){return{...out,error:error.message};}
}
