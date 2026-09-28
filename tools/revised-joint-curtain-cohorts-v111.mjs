import assert from 'node:assert/strict';
const int=n=>Number.isSafeInteger(n)&&n>0;
const sorted=xs=>[...xs].sort((a,b)=>a-b);
const boxCells=r=>Array.from({length:r.width*r.height},(_,i)=>[r.x+i%r.width,r.y+Math.floor(i/r.width)].join(','));
const foot=b=>b.shape.map(([x,y])=>[b.x+x,b.y+y].join(','));
const unique=xs=>new Set(xs).size===xs.length;

/** This source format means NOT INDIVIDUALLY DEFINED, never unknown => invented.
 * Each independent full footprint is counted once in a proven union of frames. */
export function auditJointCurtainSource(review){
 for(const key of ['unresolved','unsupported','blockingIssues','evidenceGaps']){const v=review[key];assert(v==null||v===false||(Array.isArray(v)?v.length===0:typeof v==='object'&&Object.keys(v).length===0),`Unresolved source ${key}`);}
 const f=review.sourceNormalizedFacts,c=f?.mechanisms?.covers,regions=review.sourceCoverRegions,groups=review.sourceRevealGroups;
 assert(c&&c.hiddenBatchCounts===null&&c.pairedBatches===null,'Joint source must not pretend separate batch counts');
 assert(Array.isArray(regions)&&regions.length===c.count&&regions.length>0,'All physical source curtains required');
 assert(Array.isArray(groups)&&groups.length&&groups.some(g=>g.coverIds.length>1),'At least one independently observed joint group required');
 assert(unique(regions.map(r=>r.id))&&unique(groups.map(g=>g.id))&&unique(groups.map(g=>g.clearCount)),'Unambiguous unique source groups');
 const playable=new Set(review.sourceBoard.cells.map(p=>p.join(','))),seenCells=new Set();
 const walls=review.sourceBoard.internalWallCells??[];assert(unique(walls.map(p=>p.join(','))));
 for(const p of walls)assert(p.length===2&&p.every(Number.isInteger)&&p[0]>=0&&p[0]<f.width&&p[1]>=0&&p[1]<f.height&&!playable.has(p.join(',')),'Explicit source internal wall must be a nonplayable interior cell');
 const sourceWallCells=new Set(walls.map(p=>p.join(',')));
 for(const r of regions){assert(r.id&&int(r.value)&&int(r.width)&&int(r.height)&&Number.isInteger(r.x)&&Number.isInteger(r.y),'Known curtain geometry/count');for(const k of boxCells(r)){assert(playable.has(k)||sourceWallCells.has(k),'Curtain outside source board');assert(!seenCells.has(k),'Source curtains overlap');seenCells.add(k);}}
 assert.deepEqual(sorted(regions.map(r=>r.value)),sorted(c.values),'Every source curtain count retained');
 const covered=[],cohorts=[],joint=[],allBodies=[...(review.sourceCohorts.opening??[])],occupied=new Set();
 assert.equal(allBodies.length,f.opening,'Independent opening ledger count');
 for(const g of groups){
  assert(g.id&&int(g.clearCount)&&int(g.hiddenCount)&&g.coverIds.length&&unique(g.coverIds),'Known group identity, count and quantity');
  assert(g.evidencePaths?.length&&g.evidencePaths.every(p=>review.bindings[p]),'Bound reveal group observations required');
  const selected=g.coverIds.map(id=>{const r=regions.find(x=>x.id===id);assert(r&&r.value===g.clearCount,'Joint members must share observed initial count');return r;});
  const bodies=review.sourceCohorts[g.cohortKey];assert(Array.isArray(bodies)&&bodies.length===g.hiddenCount,'Complete independent group body ledger');
  const union=new Set(selected.flatMap(boxCells));for(const b of bodies)assert(foot(b).every(k=>union.has(k)),'Whole source body must fit its reveal union');
  covered.push(...g.coverIds);cohorts.push(g.cohortKey);allBodies.push(...bodies);
  if(g.coverIds.length>1){
   assert(bodies.some(b=>!selected.some(r=>{const cells=new Set(boxCells(r));return foot(b).every(k=>cells.has(k));})),'Joint exception requires a real body crossing source partitions');
   const constraints=review.sourceRepresentationConstraints?.filter(x=>x.kind==='not-individually-defined'&&x.cohortKey===g.cohortKey);
   assert(constraints?.length===1,'Explicit representation limit required');
   assert.deepEqual([...constraints[0].coverIds].sort(),[...g.coverIds].sort());
   assert(constraints[0].reason&&constraints[0].evidencePaths?.length&&constraints[0].evidencePaths.every(p=>review.bindings[p]));joint.push(g);
  }
 }
 assert.equal(review.sourceRepresentationConstraints?.length,joint.length,'Unreviewed source representation limitation');
 assert(unique(covered)&&unique(cohorts));assert.deepEqual(covered.sort(),regions.map(r=>r.id).sort(),'All source curtains assigned exactly once');
 assert.deepEqual(Object.keys(review.sourceCohorts).sort(),['opening',...cohorts].sort(),'No omitted or extra cohort');
 assert.equal(allBodies.length,f.full,'Complete full body ledger');
 // Initial source stage locations are disjoint for this reviewed no-generator,
 // no-lift source format. Other combinations require their own richer ledger.
 assert.equal(f.mechanisms.generators.count,0);assert.equal(f.mechanisms.elevators.count,0);
 for(const b of allBodies){assert(Number.isInteger(b.x)&&Number.isInteger(b.y)&&b.shape?.length&&b.shape.every(p=>p.length===2&&p.every(Number.isInteger)));const cells=foot(b);assert(unique(cells));const connected=new Set([cells[0]]);for(let old=-1;old!==connected.size;){old=connected.size;for(const key of cells){const[x,y]=key.split(',').map(Number);if([[x-1,y],[x+1,y],[x,y-1],[x,y+1]].some(p=>connected.has(p.join(','))))connected.add(key);}}assert.equal(connected.size,cells.length,'Source body shape must be connected');for(const k of cells){assert(playable.has(k),'Source body outside playable board');assert(!occupied.has(k),'Independent source bodies duplicated/overlapping');occupied.add(k);}}
 const irregular=bs=>bs.filter(b=>b.shape.length!==(Math.max(...b.shape.map(p=>p[0]))-Math.min(...b.shape.map(p=>p[0]))+1)*(Math.max(...b.shape.map(p=>p[1]))-Math.min(...b.shape.map(p=>p[1]))+1)).length;
 assert.equal(irregular(review.sourceCohorts.opening),f.mechanisms.irregularBlocks.openingCount);assert.equal(irregular(allBodies),f.mechanisms.irregularBlocks.fullCount);
 // This explicit source-ledger format supports plain, axis and two-layer
 // bodies only. Do not accept another positive mechanism without its complete
 // carrier ledger, or let a missing carrier silently inherit an inventory sum.
 const colors=new Set(['red','orange','yellow','green','cyan','blue','purple','pink']);
 const bodyFields=new Set(['shape','x','y','color','innerColor','movementAxis','sourceCoverIds']);
 for(const b of allBodies){
  assert(Object.keys(b).every(k=>bodyFields.has(k)),'Unreviewed source body property');
  assert(colors.has(b.color),'Known source body color');
  if(Object.hasOwn(b,'innerColor'))assert(colors.has(b.innerColor)&&b.innerColor!==b.color,'Known distinct shell/core colors');
  if(Object.hasOwn(b,'movementAxis'))assert(['horizontal','vertical'].includes(b.movementAxis),'Known source axis');
 }
 const axes=allBodies.filter(b=>b.movementAxis).map(b=>b.movementAxis);
 assert.equal(axes.length,f.mechanisms.axisBlocks.count,'Source axis carrier count');
 assert.deepEqual([...axes].sort(),[...f.mechanisms.axisBlocks.axes].sort(),'Source axis carrier directions');
 assert.equal(allBodies.filter(b=>b.innerColor).length,f.mechanisms.shells.count,'Source shell carrier count');
 for(const key of ['numericIce','starBlocks','bombs'])assert.equal(f.mechanisms[key].count,0,`Joint ledger does not yet support ${key} carriers`);
 assert.equal(f.mechanisms.keysLocks.keyCount,0);assert.equal(f.mechanisms.keysLocks.lockCount,0);
 assert.equal(f.mechanisms.coloredGrid.regionCount,0);assert.equal(f.mechanisms.coloredGrid.cellCount,0);
 assert.deepEqual(c.jointCohorts,groups.map(g=>({value:g.clearCount,coverCount:g.coverIds.length,hidden:g.hiddenCount})),'Joint facts/physical source ledger mismatch');
 return{groups,allBodies,joint};
}

/** Construct a labelled DESIGN partition only after conserving each original
 * reveal group. Individual source counts remain null in every source report. */
export function projectJointCurtainFacts(sourceFacts,designFacts){
 const s=sourceFacts.mechanisms.covers,d=designFacts.mechanisms.covers;
 assert(s.hiddenBatchCounts===null&&s.pairedBatches===null&&Array.isArray(s.jointCohorts));
 assert.equal(d.count,s.count);assert(Array.isArray(d.values)&&Array.isArray(d.hiddenBatchCounts));
 assert.equal(d.values.length,d.count);assert.equal(d.hiddenBatchCounts.length,d.count);
 assert(d.values.every(int)&&d.hiddenBatchCounts.every(int),'Every actual curtain requires a positive count and own complete hidden bodies');
 assert.deepEqual(sorted(d.values),sorted(s.values));
 if(d.pairedBatches!==undefined){assert(Array.isArray(d.pairedBatches)&&d.pairedBatches.length===d.count,'Contradictory explicit design pairedBatches');const bag=xs=>xs.map(x=>`${x.value}/${x.hidden}`).sort();assert(d.pairedBatches.every(x=>int(x.value)&&int(x.hidden)));assert.deepEqual(bag(d.pairedBatches),bag(d.values.map((value,i)=>({value,hidden:d.hiddenBatchCounts[i]}))),'Contradictory explicit design pairedBatches');}
 assert(unique(s.jointCohorts.map(g=>g.value)),'Ambiguous same-count source groups not supported');
 assert(s.jointCohorts.every(g=>int(g.value)&&int(g.coverCount)&&int(g.hidden)));assert.equal(s.jointCohorts.reduce((n,g)=>n+g.coverCount,0),s.count,'Source cohort physical counts');assert.deepEqual(sorted(s.jointCohorts.flatMap(g=>Array(g.coverCount).fill(g.value))),sorted(s.values),'Source joint initial counts');
 const assignments=s.jointCohorts.map(g=>{
  const members=d.values.map((v,i)=>({value:v,hidden:d.hiddenBatchCounts[i],index:i})).filter(x=>x.value===g.value);
  assert.equal(members.length,g.coverCount,'All physical curtains retained');
  assert.equal(members.reduce((n,x)=>n+x.hidden,0),g.hidden,'Source joint cohort quantity changed');
  return{clearCount:g.value,sourcePhysicalCurtainCount:g.coverCount,sourceJointHiddenCount:g.hidden,
   sourceIndividualCountsDefined:g.coverCount===1,designHiddenBatchCounts:members.map(x=>x.hidden)};
 });
 const effective=structuredClone(sourceFacts);
 effective.mechanisms.covers={count:d.count,values:[...d.values],hiddenBatchCounts:[...d.hiddenBatchCounts],pairedBatches:d.values.map((value,i)=>({value,hidden:d.hiddenBatchCounts[i]}))};
 return{effectiveFacts:effective,assignments};
}

export function verifyJointRevealReplay(level,drags,source,api){
 const groups=source.jointCurtainSource.sourceRevealGroups;
 const model=new api.PuzzleModel(level);model.startCountdown();
 const actual=groups.map(g=>{const ids=(level.shutters??[]).filter(s=>(!s.skin||s.skin==='shutter')&&s.count===g.clearCount).map(s=>s.id);assert.equal(ids.length,g.coverIds.length,'Every physical joint curtain must exist');assert(unique(ids));assert.equal(level.blocks.filter(b=>ids.includes(b.shutterId)).length,g.hiddenCount,'Actual joint hidden count');return{value:g.clearCount,ids,hidden:g.hiddenCount};});
 assert.equal(actual.reduce((n,g)=>n+g.ids.length,0),(level.shutters??[]).length,'Extra unreviewed curtain');
 const check=()=>{for(const g of actual){const states=model.snapshot().shutters.filter(s=>g.ids.includes(s.id));assert.equal(states.length,g.ids.length);assert(states.every(s=>s.revealed===states[0].revealed),'A joint source cohort cannot be split across reveal events');}};
 check();for(const d of drags){model.beginAction();for(const xy of d.path)assert(model.moveBlockStep(d.blockId,...xy));if(d.exitSide)assert(model.tryExit(d.blockId,d.exitSide).ok);assert(model.commitAction());check();}
 assert(model.snapshot().complete,'Fresh joint cohort replay must finish');return{passed:true,groups:actual,complete:true};
}
