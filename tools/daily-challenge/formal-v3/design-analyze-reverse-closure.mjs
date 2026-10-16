import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {boardCells,absoluteCells} from './diversity-layout-factory.mjs';
const root='deliverables/daily-formal-v3-20261008/design',output=`${root}/reverse-blueprint-diagnostics-01.json`;
if(fs.existsSync(output))throw Error('Preserve prior analysis');
const rows=[];
for(const batch of ['reverse-blueprint-02','reverse-blueprint-joint-03']){
 const report=JSON.parse(fs.readFileSync(`${root}/${batch}/report.json`));
 for(const r of report.rows){
  const bytes=fs.readFileSync(r.constructionPath),p=JSON.parse(bytes),s=p.construction,l=p.lastPartialLevel??p.level;
  const all=new Set(boardCells(l).map(x=>x.join(','))),occupied=new Set(l.blocks.flatMap(absoluteCells).map(x=>x.join(','))),vacant=[...all].filter(x=>!occupied.has(x));
  const remaining=new Set(vacant),components=[];
  while(remaining.size){const todo=[remaining.values().next().value];remaining.delete(todo[0]);const part=[];
   for(let i=0;i<todo.length;i++){const q=todo[i],a=q.split(',').map(Number);part.push(a);for(const[dx,dy]of [[0,1],[1,0],[0,-1],[-1,0]]){const k=[a[0]+dx,a[1]+dy].join(',');if(remaining.delete(k))todo.push(k);}}
   components.push(part);
  }
  const exact=s.insertionCandidates+s.parkingCandidates+s.blueprintInverseGestures-s.localActualAudits;
  rows.push({batch,sourceLevelId:r.sourceLevelId,constructionPath:r.constructionPath,fileSha256:createHash('sha256').update(bytes).digest('hex'),status:p.status,
   reason:p.reason??null,raw:s.rawDiscoveredStates,expanded:s.rawExpandedStates,blueprintRawOperations:s.blueprintInverseGestures,
   initialHoleArea:s.blueprintInitialVacancyArea,maximumFilled:s.maximumFilledCells,boardArea:all.size,
   insertionCandidates:s.insertionCandidates,parkingCandidates:s.parkingCandidates,actualAudits:s.localActualAudits,
   inferredFinalAdjacencyRejectedInsertions:{value:exact,exact:p.status!=='REVERSE_CONSTRUCTION_STOPPED',derivation:'Every insertion or parking counts one candidate; blueprint and non-rejected insertions each count an actual audit. Full insertions alone skip audit for same-colour adjacency. A budget exception can add one outstanding candidate.'},
   lastRecordedConsideredWorld:{isOnlyOneSampleNotExhaustiveGraph:true,bodyCount:l.blocks.length,vacantCells:vacant.map(x=>x.split(',').map(Number)),vacantComponents:components},
   accepted:r.accepted??false,L:r.L??null,U:r.U??null});
 }
}
const failures=rows.filter(x=>!x.accepted),report={status:'READ_ONLY_REVERSE_CONSTRUCTION_DIAGNOSIS',newCandidateSearches:0,oldEvidenceChanged:false,rows,
 summary:{constructed:rows.filter(x=>x.status==='REVERSE_COMPLETE_WITNESS_NO_LOWER').length,mathematicallyAccepted:rows.filter(x=>x.accepted).length,
  constructionFailures:rows.filter(x=>x.status!=='REVERSE_COMPLETE_WITNESS_NO_LOWER').length,
  zeroInsertionCandidates:failures.filter(x=>x.insertionCandidates===0).map(x=>x.sourceLevelId),
  nonzeroInsertionButNeverAccepted:failures.filter(x=>x.insertionCandidates>0).map(x=>x.sourceLevelId)},
 observedImplementationConstraints:['The temporary vacancy is exactly the reference initial clear prefix (mostly 2–3 cells), and its stock may only be reinserted through the corresponding real colour gate.',
  'A complete inserted opening also needs zero same-colour adjacency and at most 65% shared reference footprint. Both constraints are independent from existence of a reverse parking path.',
  'The old pilots waited for at least 12 new parking gestures before attempting final insertion. This minimum is a strategy setting, not a rule or difficulty lower bound.',
  'DFS uses a finite 180-gesture depth and a conservative dead-state cache; EXHAUSTED means no result in this construction strategy, not that the underlying puzzle or all rearrangements are impossible.'],
 targetedChangesForFutureNewStockOnly:['Attempt a final legal insertion from the first visited state; let actual footprint divergence decide novelty instead of imposing an artificial minimum gesture length.',
  'Prefer a newly successful D3 stock with a different physical shape/colour inventory and a known small initial vacancy, then use its first joint floor31/upper128 search for a short exact witness.',
  'Do not reopen any failed stock after changing the constructor. Gate reachability, final footprint closure and same-colour adjacency must be diagnosed separately rather than increasing the raw budget.']};
fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report.summary));console.log(JSON.stringify(rows.map(x=>({s:x.sourceLevelId,batch:x.batch,raw:x.raw,insertions:x.insertionCandidates,adj:x.inferredFinalAdjacencyRejectedInsertions.value,maxfill:x.maximumFilled,area:x.boardArea,status:x.status}))));
