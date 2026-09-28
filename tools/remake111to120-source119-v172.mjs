import fs from 'node:fs';
import assert from 'node:assert/strict';
import {digest} from './revised-preview-validation-v160.mjs';
import {check119Source} from '../deliverables/remake111-120-v146-20260924/redesign119-20260927/source119-check.mjs';

export function checkSource119(level,api){
 const checked=check119Source(level,api);
 const sourceFile=checked.sourceContract;
 const source=JSON.parse(fs.readFileSync(sourceFile,'utf8'));
 const sourceBodies=Object.values(source.sourceInventory).flat();
 const sourceIds=new Set(sourceBodies.map(b=>b.id));
 const queued=new Set(level.generators.flatMap(g=>g.queueBlockIds));
 const sum=(bodies,shapeOf)=>bodies.reduce((n,b)=>n+shapeOf(b).length,0);
 const nonQueued=level.blocks.filter(b=>!queued.has(b.id));
 const candidateSourceCells=sum(nonQueued.filter(b=>sourceIds.has(b.id)),b=>b.shape);
 const candidateFillCells=sum(nonQueued.filter(b=>!sourceIds.has(b.id)),b=>b.shape);
 const sourceNonQueuedCells=sum(sourceBodies.filter(b=>!queued.has(b.id)),b=>b.sourceFootprint??b.shape);
 assert.equal(sourceNonQueuedCells,65,'Source area is a fact, not the authored fill allocation');
 assert.equal(candidateSourceCells+candidateFillCells,94,'Actual candidate source and fill areas cover the board');
 const candidateCoverage={sourceNonQueuedCells,candidateSourceCells,candidateFillCells,
  sourceShapeAreaDifference:candidateSourceCells-sourceNonQueuedCells,
  totalNonQueuedCells:candidateSourceCells+candidateFillCells,
  queuedCells:sum(level.blocks.filter(b=>queued.has(b.id)),b=>b.shape),
  historicalCoveragePlan:checked.coverageAdaptation,
  historicalPlanIsNotCandidateArea:true};
 const evidence=[sourceFile,
  'tools/remake111to120-source119-v172.mjs',
  'deliverables/remake111-120-v146-20260924/agent119-120/enriched119-1790271526551.json',
  'deliverables/remake111-120-v146-20260924/redesign119-20260927/source119-check.mjs'];
 return {...checked,passed:checked.status==='PASS',sourceFile,candidateCoverage,
  sourceBindings:{...checked.sourceFrameBindings,...Object.fromEntries(evidence.map(p=>[p,digest(fs.readFileSync(p))]))}};
}
