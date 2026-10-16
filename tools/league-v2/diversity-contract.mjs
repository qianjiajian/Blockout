import {createHash} from 'node:crypto';

// Implementation thresholds, not numbers specified by the user. An unchanged
// whole-piece area above 70% is too close to the rejected minor-edit batches.
// Compare all eight board orientations; IDs, palettes and queues add no novelty.
export const DIVERSITY_POLICY=Object.freeze({version:'league-diversity-v2.1',maxSharedWholePieceArea:0.70,maxPerSource:10,maxPerBoardMask:20,minSources:10,minBoardMasks:8});
const sha=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const sort=a=>[...a].sort((x,y)=>JSON.stringify(x).localeCompare(JSON.stringify(y)));
const queueIds=l=>new Set((l.generators??[]).flatMap(g=>g.queueBlockIds??[]));
const mask=l=>(l.playable??Array.from({length:l.width*l.height},(_,i)=>[i%l.width,Math.floor(i/l.width)])).filter(p=>!(l.blocked??[]).some(q=>p[0]===q[0]&&p[1]===q[1]));
const transform=(x,y,w,h,k)=>[
 [x,y],[w-1-x,y],[x,h-1-y],[w-1-x,h-1-y],
 [y,x],[h-1-y,x],[y,w-1-x],[h-1-y,w-1-x],
][k];
export function partitionViews(level,{opening=false}={}){
 const queues=queueIds(level),blocks=level.blocks.filter(b=>!queues.has(b.id)&&(!opening||!b.shutterId));
 return Array.from({length:8},(_,k)=>{
  const cells=p=>sort(p.map(([x,y])=>transform(x,y,level.width,level.height,k)));
  const footprints=[...new Map(blocks.map(b=>{const p=cells(b.shape.map(([x,y])=>[b.x+x,b.y+y]));return[JSON.stringify(p),p.length];})).entries()].sort(([a],[b])=>a.localeCompare(b));
  return{width:k<4?level.width:level.height,height:k<4?level.height:level.width,mask:cells(mask(level)),footprints};
 });
}
export const partitionKey=(level,options)=>partitionViews(level,options).map(v=>sha(v)).sort()[0];
export const boardMaskKey=level=>partitionViews(level).map(v=>sha([v.width,v.height,v.mask])).sort()[0];
export function sharedWholePieceArea(a,b,{opening=false}={}){
 const av=partitionViews(a,{opening})[0],aMap=new Map(av.footprints),aArea=[...aMap.values()].reduce((x,y)=>x+y,0);
 let best={ratio:0,sharedCells:0,denominator:0,sharedBlocks:0,orientation:0};
 for(const [orientation,bv]of partitionViews(b,{opening}).entries()){
  const bMap=new Map(bv.footprints),bArea=[...bMap.values()].reduce((x,y)=>x+y,0);let sharedCells=0,sharedBlocks=0;
  for(const[k,n]of aMap)if(bMap.has(k)){sharedCells+=n;sharedBlocks++;}
  const denominator=Math.max(aArea,bArea),ratio=denominator?sharedCells/denominator:0;
  if(ratio>best.ratio)best={ratio,sharedCells,denominator,sharedBlocks,orientation};
 }
 return best;
}
export function compareLayout(a,b,policy=DIVERSITY_POLICY){
 const full=sharedWholePieceArea(a,b),opening=sharedWholePieceArea(a,b,{opening:true}),exact=partitionKey(a)===partitionKey(b);
 return{full,opening,exact,accepted:!exact&&full.ratio<=policy.maxSharedWholePieceArea&&opening.ratio<=policy.maxSharedWholePieceArea};
}
export function candidateDiversity(candidate,accepted,policy=DIVERSITY_POLICY){
 const source=candidate.sourceLevelId,board=boardMaskKey(candidate.level),reasons=[];
 if(!Number.isSafeInteger(source))reasons.push('missing-source');
 if(accepted.filter(r=>r.sourceLevelId===source).length>=policy.maxPerSource)reasons.push('source-quota');
 if(accepted.filter(r=>boardMaskKey(r.level)===board).length>=policy.maxPerBoardMask)reasons.push('board-mask-quota');
 const comparisons=accepted.map(r=>({index:r.index,...compareLayout(candidate.level,r.level,policy)}));
 for(const row of comparisons)if(!row.accepted)reasons.push(`near-layout:${row.index}`);
 return{accepted:reasons.length===0,reasons,comparisons,partitionKey:partitionKey(candidate.level),boardMaskKey:board};
}
export function auditCatalogDiversity(rows,{expected=100,policy=DIVERSITY_POLICY}={}){
 const failures=[],accepted=[];
 for(const r of rows){const check=candidateDiversity(r,accepted,policy);if(!check.accepted)failures.push({index:r.index,reasons:check.reasons});accepted.push(r);}
 const sourceCount=new Set(rows.map(r=>r.sourceLevelId)).size,boardMaskCount=new Set(rows.map(r=>boardMaskKey(r.level))).size;
 if(rows.length===expected&&sourceCount<policy.minSources)failures.push({reason:'insufficient-source-variety',sourceCount});
 if(rows.length===expected&&boardMaskCount<policy.minBoardMasks)failures.push({reason:'insufficient-board-variety',boardMaskCount});
 return{status:failures.length?'DESIGN_REJECTED':rows.length===expected?'DESIGN_NUMERIC_GATES_PASS':'PARTIAL_NOT_FORMAL',count:rows.length,expected,sourceCount,boardMaskCount,failures,policy,visualReviewStillRequired:true};
}
