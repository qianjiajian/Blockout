import assert from 'node:assert/strict';
const sorted=a=>[...a].sort((x,y)=>x-y);
const positive=n=>Number.isSafeInteger(n)&&n>0;
const colorSet=new Set(['red','orange','yellow','green','cyan','blue','purple','pink']);

/** Necessary (not sufficient) ranked ice thresholds after mandatory shell
 * removal. Each remaining distinct non-star mouth needs at least one body.
 * Before the i-th of K ice mouths can clear, at least K-i bodies remain.
 * With N single-layer bodies total, its count must be <= N-(K-i).
 * Taking min(original,cap) is the componentwise greatest feasible threshold
 * vector, hence the smallest total decrement without deleting any mouth.
 * This is NOT a solution or a lower bound on necessary repositioning. */
export function singleLayerIceThresholdProof(facts){
 const m=facts.mechanisms,e=m.exits,N=facts.full,K=e.frozenCount;
 assert(positive(N)&&positive(K)&&positive(e.ordinaryCount),'Finite bodies and both plain/ice mouth families required');
 assert.equal(facts.opening,N,'This proof adapter only accepts all bodies in the opening');
 assert.equal(e.starCount,0);assert.equal(e.starFrozenCount,0);assert.equal(e.flipCount,0);
 assert(e.ordinaryCount+K<=8&&N>=e.ordinaryCount+K,'All distinct mouths need real single-layer bodies');
 for(const k of ['generators','covers','elevators','bombs','starBlocks','axisBlocks'])assert.equal(m[k].count,0,`Unsupported proof source ${k}`);
 assert.equal(m.keysLocks.keyCount,0);assert.equal(m.keysLocks.lockCount,0);
 assert(positive(m.coloredGrid.cellCount)&&positive(m.shells.count),'Only proven grid/shell removal conflict enables threshold repair');
 assert.equal(e.frozenValues.length,K);assert(e.frozenValues.every(positive));
 const ranked=e.frozenValues.map((value,index)=>({value,index})).sort((a,b)=>a.value-b.value||a.index-b.index);
 const rows=ranked.map((g,i)=>({sourceIndex:g.index,sourceValue:g.value,remainingDistinctIceColors:K-i,
  maximumPriorClearEvents:N-(K-i),designValue:Math.min(g.value,N-(K-i))}));
 assert(rows.every(r=>positive(r.designValue)));
 return{kind:'single-layer-unique-nonstar-ice-rank-necessary-bound',bodyCount:N,iceMouthCount:K,
  originalClearEventCapacity:N+m.shells.count,designClearEventCapacity:N,rows,
  sourceValues:sorted(e.frozenValues),designValues:rows.map(r=>r.designValue),
  minimumTotalDecrement:rows.reduce((n,r)=>n+r.sourceValue-r.designValue,0),
  requiresEveryMouthCarrier:true,requiresDistinctNonstarColors:true,
  solvabilityProven:false,necessityRepositioningCertified:false};
}

export function auditPlainGridSource(review){
 for(const k of ['unresolved','unsupported','blockingIssues','evidenceGaps']){const v=review[k];assert(v==null||v===false||(Array.isArray(v)?v.length===0:typeof v==='object'&&Object.keys(v).length===0),`Unresolved source ${k}`);}
 const f=review.sourceNormalizedFacts,m=f.mechanisms,board=review.sourceBoard;
 assert(board.kind==='normal'&&board.width===f.width&&board.height===f.height,'Reviewed complete normal rectangle');
 const floor=new Set(board.cells.map(p=>p.join(',')));assert.equal(floor.size,f.width*f.height);assert.equal(board.cells.length,floor.size);
 for(const p of board.cells)assert(p.length===2&&p.every(Number.isSafeInteger)&&p[0]>=0&&p[0]<f.width&&p[1]>=0&&p[1]<f.height);
 assert(!board.hasSeams&&!board.seams?.length&&!board.internalWallCells?.length);
 const proof=singleLayerIceThresholdProof(f),bodies=review.sourceCohorts.opening;
 assert.deepEqual(Object.keys(review.sourceCohorts),['opening']);assert.equal(bodies.length,f.full);
 assert.equal(m.irregularBlocks.openingCount,0);assert.equal(m.irregularBlocks.fullCount,0);
 const occupied=new Set(),allowed=new Set(['shape','x','y','color','innerColor','frozen']);
 for(const b of bodies){
  assert(Object.keys(b).every(k=>allowed.has(k)),'Unknown source carrier attribute');
  assert(Number.isSafeInteger(b.x)&&Number.isSafeInteger(b.y)&&colorSet.has(b.color));
  assert(b.shape?.length&&b.shape.every(p=>p.length===2&&p.every(Number.isSafeInteger)));
  const xs=b.shape.map(p=>p[0]),ys=b.shape.map(p=>p[1]);assert.equal(b.shape.length,(Math.max(...xs)-Math.min(...xs)+1)*(Math.max(...ys)-Math.min(...ys)+1),'Only complete rectangle source bodies in this adapter');
  for(const[x,y]of b.shape){const k=[b.x+x,b.y+y].join(',');assert(floor.has(k)&&!occupied.has(k),'Source body duplicated or out of board');occupied.add(k);}
  if(Object.hasOwn(b,'innerColor'))assert(colorSet.has(b.innerColor)&&b.innerColor!==b.color);
  if(Object.hasOwn(b,'frozen'))assert(positive(b.frozen));
 }
 assert.equal(bodies.filter(b=>b.innerColor).length,m.shells.count,'Complete source shell carriers');
 const ice=bodies.filter(b=>b.frozen);assert.equal(ice.length,m.numericIce.count);assert.deepEqual(sorted(ice.map(b=>b.frozen)),sorted(m.numericIce.values));
 assert.equal(ice.filter(b=>b.innerColor).length,m.numericIce.postMeltShellCount,'Source ice/shell associations');
 const itemBag=a=>a.map(x=>`${x.value}:${x.post_melt_shell}`).sort();
 assert.deepEqual(itemBag(review.sourceFacts.numericIce.items),itemBag(ice.map(b=>({value:b.frozen,post_melt_shell:!!b.innerColor}))));
 const grids=review.sourceGrids,seen=new Set();assert.equal(grids.length,m.coloredGrid.regionCount);
 for(const g of grids){assert(g.id&&colorSet.has(g.color)&&g.cells.length&&g.reason&&g.evidencePaths.length);for(const p of g.evidencePaths)assert(review.bindings[p],'Bound independent grid observations');for(const p of g.cells){assert(p.length===2&&p.every(Number.isSafeInteger));const k=p.join(',');assert(floor.has(k)&&!seen.has(k),'Distinct playable source colored cells');seen.add(k);}}
 assert.equal(new Set(grids.map(g=>g.id)).size,grids.length);assert.equal(seen.size,m.coloredGrid.cellCount);
 const gates=review.sourceExits;assert.equal(gates.length,m.exits.ordinaryCount+m.exits.frozenCount);assert.equal(new Set(gates.map(g=>g.id)).size,gates.length);
 for(const g of gates){assert(g.id&&g.kind==='ordinary'&&!g.star&&g.initiallyOpen===undefined&&colorSet.has(g.color),'Explicit nonstar ordinary/ice source mouth');assert(['top','bottom','left','right'].includes(g.side));assert(Number.isSafeInteger(g.offset)&&g.offset>=0&&positive(g.size)&&g.offset+g.size<=(['top','bottom'].includes(g.side)?f.width:f.height));assert(g.frozen===undefined||g.frozen===0||positive(g.frozen));}
 assert.equal(gates.filter(g=>!g.frozen).length,m.exits.ordinaryCount);assert.deepEqual(sorted(gates.filter(g=>g.frozen).map(g=>g.frozen)),sorted(m.exits.frozenValues));
 return{proof,bodies,grids,gates};
}

export function verifyPlainGridDesign(level,review,api){
 const source=auditPlainGridSource(review),grids=level.coloredGrids??[],bag=a=>a.map(g=>`${g.color}:${g.cells.length}`).sort();
 assert.deepEqual(bag(grids),bag(source.grids),'Preserve each colored cell group color and quantity');
 assert(level.blocks.every(b=>(b.layers?.length??1)===1),'Entire colored-grid level must be single layer');
 assert(!level.flipDoors?.length&&level.gates.every(g=>!g.star),'Ice rank proof does not apply to star or flip pairings');
 assert.equal(new Set(level.gates.map(g=>g.color)).size,level.gates.length,'Rank proof requires unique nonstar colors');
 assert(level.gates.every(g=>level.blocks.some(b=>(b.layers?.[0]??b.color)===g.color)),'Every retained physical mouth requires its own real body color');
 const opening=new api.PuzzleModel(level).snapshot();
 for(const g of grids)for(const p of g.cells){
  const carrier=opening.blocks.find(b=>b.shape.some(([x,y])=>b.x+x===p[0]&&b.y+y===p[1]));
  assert(carrier&&(carrier.layers?.[0]??carrier.color)===g.color,'Every initial colored cell must be filled by its matching-color footprint');
 }
 assert.deepEqual(sorted(level.gates.filter(g=>g.frozen>0).map(g=>g.frozen)),source.proof.designValues,'Only mathematically necessary minimum threshold changes');
 return{passed:true,sourceGridFactsUnchanged:true,thresholdProof:source.proof};
}
