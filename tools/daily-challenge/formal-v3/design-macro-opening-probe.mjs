import assert from 'node:assert/strict';
import {levelSha256} from '../formal-v2/contract.mjs';
import {assertPlainProofDomain} from '../formal-v2/proof-plain.mjs';
import {canonicalExit} from '../formal-v2/proof-scheduled-route.mjs';
import {auditPlainForwardDrag} from './reverse-route-audit.mjs';
import {absoluteCells,boardCells} from './diversity-layout-factory.mjs';

/** Fixed-depth constructive check, never a full puzzle search. Choose the
 * lexicographically first actual pointer-down clear. Inspect each remaining
 * body in ID order and unit direction U/R/D/L; stop at the first real parking.
 * Do not try another first clear or expand any parking successor. */
export function probeInitialClearThenParking(runtime,level,{maxFullWorlds=10000}={}){
 assert(Number.isSafeInteger(maxFullWorlds)&&maxFullWorlds>=1&&maxFullWorlds<=10000);
 const inputHash=levelSha256(level),worlds=new Set(),inspected=[],counts={staticUnitCandidates:0,microUnitSteps:0};
 const reserveBeforeFormation=()=>{if(worlds.size>=maxFullWorlds)throw Error('opening-probe-raw-limit');};
 const charge=l=>{const h=levelSha256(l);if(!worlds.has(h)){if(worlds.size>=maxFullWorlds)throw Error('opening-probe-raw-limit');worlds.add(h);}return h;};
 const finish=x=>({...x,searchPerformed:false,fullGameSearchPerformed:false,fixedDepth:2,fullWorlds:worlds.size,worldSha256s:[...worlds],inspected,counts,inputLevelSha256:inputHash,L:null,U:null});
 try{
  assertPlainProofDomain(level);runtime.validateLevel(level);charge(level);
  const model=new runtime.PuzzleModel(structuredClone(level));model.startCountdown();
  let first;
  for(const b of [...level.blocks].sort((a,b)=>a.id.localeCompare(b.id))){const side=canonicalExit(runtime,model,b.id);if(side){first={blockId:b.id,path:[],exitSide:side};break;}}
  if(!first)return finish({valid:false,reason:'no-actual-initial-clear'});
  reserveBeforeFormation();const afterClear={...structuredClone(level),blocks:level.blocks.filter(b=>b.id!==first.blockId).map(b=>structuredClone(b))};charge(afterClear);
  const clearAudit=auditPlainForwardDrag(runtime,level,first,{expectedBodies:afterClear.blocks});assert(clearAudit.valid,clearAudit.error);
  const legal=new Set(boardCells(level).map(p=>p.join(',')));
  for(const b of [...afterClear.blocks].sort((a,b)=>a.id.localeCompare(b.id)))for(const [dx,dy]of [[0,-1],[1,0],[0,1],[-1,0]]){
   counts.staticUnitCandidates++;const occupied=new Set(afterClear.blocks.filter(o=>o.id!==b.id).flatMap(absoluteCells).map(p=>p.join(',')));
   if(!absoluteCells(b).every(([x,y])=>legal.has([x+dx,y+dy].join(','))&&!occupied.has([x+dx,y+dy].join(','))))continue;
   reserveBeforeFormation();const afterParking=structuredClone(afterClear),moved=afterParking.blocks.find(o=>o.id===b.id);moved.x+=dx;moved.y+=dy;const h=charge(afterParking);
   const drag={blockId:b.id,path:[[moved.x,moved.y]]};counts.microUnitSteps++;
   const parkingAudit=auditPlainForwardDrag(runtime,afterClear,drag,{expectedBodies:afterParking.blocks});inspected.push({drag,worldSha256:h,valid:parkingAudit.valid,error:parkingAudit.error});
   if(parkingAudit.valid){assert.equal(parkingAudit.nonClearingDrags,1);assert.equal(parkingAudit.clearEvents,0);assert.equal(levelSha256(level),inputHash);
    return finish({valid:true,drags:[first,drag],clearAudit,parkingAudit,afterClearLevel:afterClear,afterParkingLevel:afterParking,complete:false,remainingInventory:afterParking.blocks.length});}
  }
  return finish({valid:false,reason:'fixed-first-clear-has-no-actual-unit-parking',firstClear:first,clearAudit});
 }catch(e){assert.equal(levelSha256(level),inputHash);return finish({valid:false,reason:e.message});}
}
