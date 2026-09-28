import fs from 'node:fs';
import assert from 'node:assert/strict';
import {api,write,digest} from './common.mjs';
import {proofNative} from './native-proof.mjs';
export function openingProjection156(level,drags){
 assert.equal(level.id,156);assert.equal(level.mechanismRules,'revised-2026-09-27-v1.5');
 for(const k of ['shutters','coloredGrids','elevators','conveyors','seams'])assert(!level[k]?.length,'Unsupported '+k);
 for(const b of level.blocks){assert(Object.keys(b).every(k=>['id','x','y','shape','color','frozen','movementAxis'].includes(k)),'Unsupported body '+b.id);assert(!b.movementAxis,'No axis in this qualified opening projection');}
 for(const g of level.generators??[]){assert(g.trigger==='move'&&!g.intervalSeconds&&!g.initialDelaySeconds,'Only fixed automatic spatial generator');}
 const q=new Set(level.generators.flatMap(g=>g.queueBlockIds)),copy=structuredClone(level),removedBodies=copy.blocks.filter(b=>q.has(b.id));
 copy.blocks=copy.blocks.filter(b=>!q.has(b.id));for(const b of copy.blocks)delete b.frozen;
 copy.generators=[];copy.gates.push(...copy.flipDoors.map(({initiallyOpen,...g})=>g));copy.flipDoors=[];
 for(const g of copy.gates){assert(Object.keys(g).every(k=>['id','color','side','offset','size','frozen'].includes(k)),'Unsupported door');delete g.frozen;}
 api.validateLevel(copy);
 const mapped=drags?.filter(d=>!q.has(d.blockId)),mapping=drags?api.replayRevisedRoute(copy,mapped):null;
 if(mapping){const original=api.replayRevisedRoute(level,drags);assert(original.valid&&original.complete);assert(mapping.valid&&mapping.complete);assert(mapping.nonClearingDrags<=original.nonClearingDrags);}
 return {level:copy,sourceLevelSha256:digest(level),projectedLevelSha256:digest(copy),removedBodies,removedGenerators:level.generators,thawAllBodiesAndGates:true,permanentlyOpenAllDoors:true,mappedDrags:mapped,mapping,
 soundness:'Projection erases every queued body and machine, every frozen constraint and every flip phase. It refuses shells, keys, stars, hidden layers, colored grids, timers, conveyors, seams and axes. Retained opening bodies keep shape, color, position and full board/exit geometry. Delete queue gestures from any source completion: each retained unit move and departure stays legal because removed queue bodies only remove occupancy; all counting and phase dependencies were erased. Opening-body non-clearing cost is unchanged, queued non-clearing cost disappears; thus projected optimal cost cannot exceed original cost. Candidate supplied full route additionally replayed unit by unit on the actual projection model. It is not a full-inventory exact search.'};
}
export function proveOpening156(level,drags){const projection=openingProjection156(level,drags);return {projection,native:proofNative(projection.level,5)};}
if(process.argv[1]?.endsWith('opening-floor156.mjs')){const d=JSON.parse(fs.readFileSync(process.argv[2])),r=proveOpening156(d.level,d.drags);console.log(write('opening-floor156-'+(d.seed??'final')+'-'+Date.now(),r));console.log(JSON.stringify(r.native.proof));}
