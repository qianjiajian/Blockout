import assert from 'node:assert/strict';
import {levelSha256} from '../formal-v2/contract.mjs';
import {canonicalExit} from '../formal-v2/proof-scheduled-route.mjs';
import {assertPlainProofDomain} from '../formal-v2/proof-plain.mjs';
import {auditPlainForwardDrag} from './reverse-route-audit.mjs';
import {boardCells,absoluteCells} from './diversity-layout-factory.mjs';
const clone=structuredClone,shape=s=>JSON.stringify([...s].sort((a,b)=>a[1]-b[1]||a[0]-b[0]));

/** Translate a supplied successful reference prefix, never invent a move or
 * search a successor. All geometric descriptor worlds are explicitly counted. */
export function mapReferenceMacroPrefix(reference,drags,target,{minimumParking=5,maxInitialClears=2}={}){
 assert(Number.isSafeInteger(minimumParking)&&minimumParking>=5&&minimumParking<=20);assert([1,2].includes(maxInitialClears));
 const stats={staticWholeWorlds:0,unitSteps:0};
 try{
  assertPlainProofDomain(reference);assertPlainProofDomain(target);
  let initial=0;while(drags[initial]?.exitSide)initial++;
  assert(initial>=1&&initial<=maxInitialClears,'initial-clear-count-outside-plan');
  let run=0;while(drags[initial+run]&&!drags[initial+run].exitSide)run++;
  assert(run>=minimumParking,'reference-initial-chain-too-short');
  const selected=drags.slice(0,initial+minimumParking),live=new Map(target.blocks.map(b=>[b.id,clone(b)])),allowed=new Set(boardCells(target).map(p=>p.join(','))),mapped=[],worlds=new Set(),parkingPoses={},preservedGates=[];
  const charge=()=>{const h=levelSha256([...live.values()].sort((a,b)=>a.id.localeCompare(b.id)));assert(!worlds.has(h),'mapped-prefix-repeats-a-world');worlds.add(h);stats.staticWholeWorlds=worlds.size;};charge();
  for(const [i,d]of selected.entries()){
   const old=reference.blocks.find(b=>b.id===d.blockId),start=target.blocks.find(b=>b.id===d.blockId),body=live.get(d.blockId);assert(old&&start&&body,'mapped-prefix-missing-body');assert.equal(shape(old.shape),shape(start.shape),'mapped-moving-body-was-retiled');
   const dx=start.x-old.x,dy=start.y-old.y,path=d.path.map(([x,y])=>[x+dx,y+dy]);
   if(!d.exitSide){parkingPoses[body.id]??=[];parkingPoses[body.id].push([body.x,body.y],...path);}
   for(const pos of path){assert.equal(Math.abs(pos[0]-body.x)+Math.abs(pos[1]-body.y),1,'mapped-unit-path');const occupied=new Set([...live.values()].filter(b=>b.id!==body.id).flatMap(absoluteCells).map(p=>p.join(',')));
    assert(body.shape.every(([x,y])=>allowed.has([pos[0]+x,pos[1]+y].join(','))&&!occupied.has([pos[0]+x,pos[1]+y].join(','))),'mapped-prefix-collision-or-mask');body.x=pos[0];body.y=pos[1];stats.unitSteps++;}
   if(d.exitSide){const g=reference.gates.find(g=>g.color===old.color&&g.side===d.exitSide);assert(g,'reference-ordinary-exit-not-found');const gate={...clone(g),offset:g.offset+(['top','bottom'].includes(g.side)?dx:dy)};
    const prior=preservedGates.find(x=>x.color===gate.color);assert(!prior||JSON.stringify(prior)===JSON.stringify(gate),'translated-clear-gate-conflict');if(!prior)preservedGates.push(gate);live.delete(body.id);}
   mapped.push({...clone(d),path});charge();
  }
  const parkingBodies=[...new Set(mapped.filter(d=>!d.exitSide).map(d=>d.blockId))];assert(parkingBodies.length>=3,'fewer-than-three-chain-bodies');
  return{ok:true,drags:mapped,initialClears:initial,consecutiveParking:minimumParking,referenceAvailableParking:run,parkingBodies,parkingPoses,preservedGates,
   openingColours:Object.fromEntries(selected.filter(d=>d.exitSide).map(d=>[d.blockId,reference.blocks.find(b=>b.id===d.blockId).color])),stats,searchPerformed:false,L:null,U:null};
 }catch(e){return{ok:false,reason:e.message,stats,searchPerformed:false,L:null,U:null};}
}

/** One fixed route only, no alternate first clear, path, order or successor.
 * No direct pointer-down exit before each parking is a heuristic, not proof
 * that all solutions need these gestures (single-held detours may differ). */
export function probeMappedMacroPrefix(runtime,level,mapped,{maxFullWorlds=10000}={}){
 assert(Number.isSafeInteger(maxFullWorlds)&&maxFullWorlds>=1&&maxFullWorlds<=10000);
 const hash=levelSha256(level),worlds=new Set(),audits=[],stats={microUnitSteps:0,canonicalDirectExitChecks:0};
 const charge=l=>{const h=levelSha256(l);if(!worlds.has(h)){assert(worlds.size<maxFullWorlds,'prefix-raw-limit');worlds.add(h);}return h;};
 const finish=x=>({...x,inputLevelSha256:hash,fullWorlds:worlds.size,worldSha256s:[...worlds],audits,stats,searchPerformed:false,fullGameSearchPerformed:false,L:null,U:null,complete:false});
 try{
  assertPlainProofDomain(level);runtime.validateLevel(level);assert(mapped.ok&&mapped.consecutiveParking>=5);let current=clone(level);charge(current);
  for(const [i,d]of mapped.drags.entries()){
   if(!d.exitSide){const model=new runtime.PuzzleModel(clone(current));model.startCountdown();for(const b of current.blocks){stats.canonicalDirectExitChecks++;assert(!canonicalExit(runtime,model,b.id),'direct-clear-available-before-chain-parking');}}
   assert(worlds.size<maxFullWorlds,'prefix-raw-limit');const next=clone(current),b=next.blocks.find(x=>x.id===d.blockId);assert(b);if(d.exitSide)next.blocks=next.blocks.filter(x=>x.id!==d.blockId);else{assert(d.path.length);[b.x,b.y]=d.path.at(-1);}
   charge(next);stats.microUnitSteps+=d.path.length;const audit=auditPlainForwardDrag(runtime,current,d,{expectedBodies:next.blocks});audits.push({index:i,...audit});assert(audit.valid,audit.error);current=next;
  }
  assert.equal(levelSha256(level),hash);return finish({valid:true,drags:clone(mapped.drags),initialClears:mapped.initialClears,consecutiveParking:mapped.consecutiveParking,parkingBodies:mapped.parkingBodies,afterPrefixLevel:current,remainingInventory:current.blocks.length});
 }catch(e){assert.equal(levelSha256(level),hash);return finish({valid:false,reason:e.message});}
}
