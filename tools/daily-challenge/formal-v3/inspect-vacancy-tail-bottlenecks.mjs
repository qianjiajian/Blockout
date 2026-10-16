// Read-only coordinate diagnostics on the two SAVED second-clear worlds.
// No original/tail board search, no removal sequence, no route qualification.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {boardCells} from './diversity-layout-factory.mjs';
const read=p=>JSON.parse(fs.readFileSync(p)),hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const rows=[];
for(const name of ['candidate-0000','candidate-0001']){
 const file=`deliverables/daily-formal-v3-20261008/design/independent-vacancy-plain-tail-01/${name}.json`,packet=read(file);
 const level=packet.upperConstruction.tailLevel,search=packet.upperConstruction.tailSearch,geometry=read(packet.geometryOnlySource.path);
 assert.equal(hash(packet.geometryOnlySource.path),packet.geometryOnlySource.sha256);
 const legal=new Set(boardCells(level).map(p=>p.join(','))),bodies=[];let micros=0,transitions=0;
 const fits=(b,p,g)=>{const w=1+Math.max(...b.shape.map(q=>q[0])),h=1+Math.max(...b.shape.map(q=>q[1])),horizontal=['top','bottom'].includes(g.side),o=horizontal?p[0]:p[1],span=horizontal?w:h;
  return o>=g.offset&&o+span<=g.offset+g.size&&(g.side==='top'?p[1]===0:g.side==='bottom'?p[1]+h===level.height:g.side==='left'?p[0]===0:p[0]+w===level.width);};
 for(const b of level.blocks){
  const occupied=new Set(level.blocks.filter(x=>x.id!==b.id).flatMap(x=>x.shape.map(([dx,dy])=>`${x.x+dx},${x.y+dy}`))),points=[[b.x,b.y]],seen=new Set([`${b.x},${b.y}`]);micros++;
  for(let cursor=0;cursor<points.length;cursor++)for(const [dx,dy]of [[0,-1],[1,0],[0,1],[-1,0]]){
   transitions++;assert(transitions<=100000);const p=[points[cursor][0]+dx,points[cursor][1]+dy],key=p.join(',');
   if(seen.has(key)||!b.shape.every(([sx,sy])=>legal.has(`${p[0]+sx},${p[1]+sy}`)&&!occupied.has(`${p[0]+sx},${p[1]+sy}`)))continue;
   seen.add(key);points.push(p);micros++;assert(micros<=10000);
  }
  const i=geometry.built.blocks.slice(1).findIndex(x=>x.id===b.id),hits=level.gates.filter(g=>points.some(p=>fits(b,p,g)));
  const permitted=geometry.result.apertures.flatMap((g,j)=>{
   const early=geometry.result.earliest[i][j];return (early===null||early>=32)&&points.some(p=>fits(b,p,g))?[{...g,openingGeometryEarliest:early}]:[];
  });
  bodies.push({id:b.id,color:b.color,at:[b.x,b.y],shape:b.shape,heldReachablePoseCount:points.length,reachablePoses:points,
   assignedGates:level.gates.filter(g=>g.color===b.color),matchingGateHits:hits.filter(g=>g.color===b.color),existingOtherColourGateHits:hits.filter(g=>g.color!==b.color),
   earliestQualifiedPossibleApertures:permitted});
 }
 rows.push({file,fileSha256:hash(file),input:packet.input,tailLevelSha256:packet.upperConstruction.tailLevelSha256,
  savedWorld:'Actual fixed prefix immediately after second clear, NOT the unsaved final solver frontier',
  savedRemainingBodies:level.blocks.length,vacantCells:legal.size-level.blocks.reduce((n,b)=>n+b.shape.length,0),
  lastKnownClear:packet.upperConstruction.prefixAudits.at(-1).drag,
  solverStop:{raw:search.rawFullBoardStates,expanded:search.rawExploredStates,closureRemovalsAcrossAllBranches:search.closureRemovals,
   certifiedFloorDiagnosticOnly:search.certifiedFloor,elapsedMilliseconds:search.elapsedMilliseconds,termination:search.termination,
   lastFrontierRemainingBodies:search.closureRemovals===0?level.blocks.length:null,
   lastFrontierUnknownReason:search.closureRemovals===0?null:'No per-frontier snapshot was recorded; aggregate removal count is not a route.'},
  coordinateDiagnostics:{micros,transitions,fullBoardBranchSearches:0,matchingExitBodies:bodies.filter(b=>b.matchingGateHits.length).map(b=>b.id),
   otherColourExitBodies:bodies.filter(b=>b.existingOtherColourGateHits.length).map(b=>b.id),
   earlyQualifiedApertureBodies:bodies.filter(b=>b.earliestQualifiedPossibleApertures.length).map(b=>b.id)},bodies,
  accepted:false,L:null,U:null});
}
const file='deliverables/daily-formal-v3-20261008/proof/vacancy-tail-bottlenecks-v1.json';
fs.writeFileSync(file,JSON.stringify({status:'READONLY_SAVED_WORLD_DIAGNOSTIC',rows,originalOrTailSolverCalls:0,fullBoardBranchSearches:0,
 publicLedgerWrites:0,formalReady:false},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({file,sha256:hash(file),rows:rows.map(({input,savedRemainingBodies,vacantCells,solverStop,coordinateDiagnostics})=>({input,savedRemainingBodies,vacantCells,solverStop,coordinateDiagnostics}))}));
