import assert from 'node:assert/strict';
import {digest} from '../../revised-preview-validation-v160.mjs';
import {auditHiddenCoverage} from '../../revised-hidden-coverage.mjs';
import {compile,search} from '../../../deliverables/remake31-200-v145-20260924/batches/lv061-070/author65-67/lift-search.mjs';

/** Qualified lower-bound graph, preserving every body, shell, ice counter and
 * ordered curtain/lift batch. Per-state bytes contain body pose/layer/visibility,
 * every body's remaining ice, and each batch's reveal bit. Ordinary curtain and
 * gate counts are initial counts minus the derived total clear/peel count.
 * Every unit translation settles all real spatial reveals in array order until
 * stable, including reveals during a held drag. Every clear first decreases ice
 * of already visible other bodies, then settles: newly revealed ice keeps its
 * initial value. A BFS over full intra-gesture states enumerates every held path,
 * including turns and alternate reveal sequences at a repeated anchor.
 * Every real gesture is therefore a graph gesture of the same 0/1 reposition
 * cost. Optional gate contact adds choices and cannot increase the optimum.
 * There is no forced-clear normalization: early removals can reveal lift cargo.
 * Dijkstra exhausts only costs strictly below the requested threshold. Budget
 * termination is UNKNOWN; this graph never supplies time/GUI certification.
 */
export function qualifyLift(level,api){
 api.validateLevel(level);assert([65,66,67,68,69].includes(level.id));
 assert.equal(level.mechanismRules,'revised-2026-09-23-v1.4');
 assert(level.shutters?.some(s=>s.skin==='lift'));
 for(const k of ['blocked','seams','generators','flipDoors','coloredGrids','elevators','conveyors'])assert(!level[k]?.length,`Unsupported ${k}`);
 for(const b of level.blocks)for(const k of ['movementAxis','keyId','lockedBy','lockCount','timedBombSeconds','star','rotationBadge'])assert(b[k]===undefined||b[k]===false,`Unsupported ${k}`);
 assert(level.blocks.length<=64);assert(auditHiddenCoverage(level).passed);
 assert(level.shutters.every(s=>s.triggerBlockIds===undefined&&(!s.skin||['shutter','lift'].includes(s.skin))));
 const ids=[...level.blocks,...level.gates,...level.shutters].map(x=>x.id);assert.equal(new Set(ids).size,ids.length);
 const c=compile(level),initial=new api.PuzzleModel(level).snapshot();assert.equal(stateOf(c,initial).join(','),c.initial.join(','),'Initial settle must equal authoritative model');return c;
}
export function stateOf(c,snapshot){
 const s=new Uint16Array(c.N*2+c.covers.length);
 for(let i=0;i<c.N;i++){const def=c.blocks[i],b=snapshot.blocks.find(b=>b.id===def.id);s[i]=!b?511:b.shutterId&&!snapshot.shutters.find(q=>q.id===b.shutterId)?.revealed?510:(b.y*c.W+b.x)|((def.layers.length-b.layers.length)<<7);s[c.N+i]=b?.frozen??0;}
 for(const co of c.covers)s[2*c.N+co.j]=snapshot.shutters.find(s=>s.id===co.id).revealed?1:0;return s;
}
export function checkLiftFloor(level,api,options={}){
 const floor=options.floor??11,maxStates=options.maxStates??500000,maxMilliseconds=options.maxMilliseconds??45000;
 const base={thresholdProven:false,abstraction:'qualified-full-inventory-lift-optional-exit-v147',sourceLevelSha256:digest(level),solvabilityValidated:false,timeValidated:false,pointerValidated:false};
 if(![floor,maxStates,maxMilliseconds].every(n=>Number.isSafeInteger(n)&&n>0))return {...base,status:'invalid',reason:'Positive integer budgets required'};
 try{qualifyLift(level,api);}catch(e){return {...base,status:'unsupported',reason:e.message};}
 return {...base,...search(level,{floor,maxStates,maxMilliseconds,prove:true})};
}
