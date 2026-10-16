import {createHash} from 'node:crypto';
import {boardBaselineSha256,independentPartitionSha256} from '../formal-v2/geometry.mjs';

// Engineering acceptance policy, not a claim that the user chose these numbers.
// It addresses the observed 80–95% retained-footprint siblings and 3-seed pool.
export const DIVERSITY_POLICY=Object.freeze({version:'daily-diversity-v3.2',
 comparison:'maximum-of-both-directions-with-eight-orientations',
 sameGroupMaximumFootprintSimilarity:0.65,globalMaximumFootprintSimilarity:0.75,
 minimumBoardOutlinesPerGroup:3,minimumSourceLevelsPerGroup:4,
 maximumSameGateGeometryPerGroup:2,minimumBoardOutlinesIn450:30,minimumSourceLevelsIn450:40});
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const sortPoints=p=>p.sort((a,b)=>a[1]-b[1]||a[0]-b[0]);
const pointKey=p=>p.join(',');
const rect=(w,h)=>Array.from({length:w*h},(_,i)=>[i%w,Math.floor(i/w)]);
const shapePoints=b=>b.shape.map(([x,y])=>[b.x+x,b.y+y]);

function transformFor(width,height,index){
 return point=>{let[x,y]=point,w=width,h=height;if(index>=4)x=w-1-x;
  for(let n=0;n<index%4;n++){[x,y]=[h-1-y,x];[w,h]=[h,w];}return[x,y];};
}
function placedFootprints(blocks,transform){
 const result=new Map();for(const b of blocks){const cells=sortPoints(shapePoints(b).map(transform));result.set(JSON.stringify(cells),cells);}
 return result;
}
function edgesForGate(level,gate){
 const portals=gate.portals?.length?gate.portals:[gate];
 return portals.flatMap(p=>Array.from({length:p.size??gate.size},(_,i)=>{
  const t=(p.offset??gate.offset)+i;
  switch(p.side??gate.side){
   case'top':return[[t,0],[t,-1]];case'bottom':return[[t,level.height-1],[t,level.height]];
   case'left':return[[0,t],[-1,t]];case'right':return[[level.width-1,t],[level.width,t]];
   default:throw Error('Unknown gate side');
  }
 }));
}
function gateSet(level,transform){
 return new Set([...(level.gates??[]),...(level.flipDoors??[])].map(g=>JSON.stringify(edgesForGate(level,g)
  .map(edge=>sortPoints(edge.map(transform))).map(x=>JSON.stringify(x)).sort())));
}
function cellUnion(m){return new Set([...m.values()].flatMap(points=>points.map(pointKey)));}
function footprintSimilarity(a,b){
 const shared=new Set();let sharedBodies=0;
 for(const[k,cells]of a)if(b.has(k)){sharedBodies++;for(const p of cells)shared.add(pointKey(p));}
 const total=Math.max(cellUnion(a).size,cellUnion(b).size);
 return{ratio:total?shared.size/total:1,sharedBodies,sharedCells:shared.size,comparedCells:total};
}
const setOverlap=(a,b)=>Math.max(a.size,b.size)?[...a].filter(k=>b.has(k)).length/Math.max(a.size,b.size):1;
const cache=new WeakMap();
export function describeLayout(level){
 if(cache.has(level))return cache.get(level);
 const queued=new Set((level.generators??[]).flatMap(g=>g.queueBlockIds));
 const full=level.blocks.filter(b=>!queued.has(b.id));
 const opening=full.filter(b=>!b.shutterId);
 const variants=Array.from({length:8},(_,index)=>{const project=transformFor(level.width,level.height,index);
  return{opening:placedFootprints(opening,project),full:placedFootprints(full,project),gates:gateSet(level,project)};});
 const gateGeometryKey=variants.map(v=>JSON.stringify([...v.gates].sort())).sort()[0];
 const description={variants,gateGeometrySha256:hash(gateGeometryKey),boardOutlineSha256:boardBaselineSha256(level),
  exactPartitionSha256:independentPartitionSha256(level),openingBodies:opening.length,fullBodies:full.length,
  playableCells:(level.playable??rect(level.width,level.height)).length-(level.blocked??[]).length};
 cache.set(level,description);return description;
}
function compareOneDirection(levelA,levelB){
 const a=describeLayout(levelA).variants[0],b=describeLayout(levelB);
 let strongest=null;
 for(const[index,v]of b.variants.entries()){
  const opening=footprintSimilarity(a.opening,v.opening),full=footprintSimilarity(a.full,v.full);
  const score=Math.max(opening.ratio,full.ratio);
  const row={footprintSimilarity:score,opening,full,gateGeometrySimilarity:setOverlap(a.gates,v.gates),comparisonTransform:index};
  if(!strongest||score>strongest.footprintSimilarity||score===strongest.footprintSimilarity&&row.gateGeometrySimilarity>strongest.gateGeometrySimilarity)strongest=row;
 }
 return strongest;
}
/** Comparison only; transformations are never used for drawing or level data.
 * Different board dimensions anchor their reflected coordinates differently.
 * Both directions are necessary so admission cannot depend on insertion order. */
export function compareLayouts(levelA,levelB){
 const forward=compareOneDirection(levelA,levelB),reverse=compareOneDirection(levelB,levelA);
 const useReverse=reverse.footprintSimilarity>forward.footprintSimilarity
  ||reverse.footprintSimilarity===forward.footprintSimilarity&&reverse.gateGeometrySimilarity>forward.gateGeometrySimilarity;
 return{...(useReverse?reverse:forward),comparisonDirection:useReverse?'a-transformed-to-b':'b-transformed-to-a'};
}
const id=r=>r.formalId??r.id;
const group=r=>`${r.stageKey}:d${r.difficulty}`;
export function auditDiversity(records,{expectFull=false,policy=DIVERSITY_POLICY}={}){
 const reasons=[],pairs=[],nearest=new Map(),descriptions=new Map();
 const ids=new Set();for(const r of records){if(!id(r)||ids.has(id(r)))reasons.push({kind:'duplicate-or-missing-id',id:id(r)});ids.add(id(r));
  descriptions.set(id(r),describeLayout(r.level));}
 const exact=new Map();for(const r of records){const key=descriptions.get(id(r)).exactPartitionSha256;const members=exact.get(key)??[];members.push(id(r));exact.set(key,members);}
 for(const members of exact.values())if(members.length>1)reasons.push({kind:'exact-partition-duplicate',ids:members});
 for(let i=0;i<records.length;i++)for(let j=i+1;j<records.length;j++){
  const a=records[i],b=records[j],sameGroup=group(a)===group(b),comparison=compareLayouts(a.level,b.level);
  const maximum=sameGroup?policy.sameGroupMaximumFootprintSimilarity:policy.globalMaximumFootprintSimilarity;
  const row={a:id(a),b:id(b),sameGroup,maximum,...comparison};
  for(const[current,other]of[[a,b],[b,a]]){const previous=nearest.get(id(current));if(!previous||comparison.footprintSimilarity>previous.footprintSimilarity)nearest.set(id(current),{other:id(other),...comparison});}
  if(comparison.footprintSimilarity>maximum+1e-12)pairs.push(row);
 }
 if(pairs.length)reasons.push({kind:'near-layouts',count:pairs.length});
 const groups=[];for(const key of new Set(records.map(group))){const set=records.filter(r=>group(r)===key);
  const boards=new Set(set.map(r=>descriptions.get(id(r)).boardOutlineSha256)),sources=new Set(set.map(r=>r.sourceLevelId)),gates=new Map();
  for(const r of set){const g=descriptions.get(id(r)).gateGeometrySha256;gates.set(g,[...(gates.get(g)??[]),id(r)]);}
  const row={key,count:set.length,boardOutlines:boards.size,sourceLevels:sources.size,gateGeometryConfigurations:gates.size};groups.push(row);
  if(expectFull||set.length>=10){if(set.length!==10)reasons.push({kind:'group-size',...row});
   if(boards.size<policy.minimumBoardOutlinesPerGroup)reasons.push({kind:'too-few-group-outlines',...row});
   if(sources.size<policy.minimumSourceLevelsPerGroup)reasons.push({kind:'too-few-group-sources',...row});}
  for(const members of gates.values())if(members.length>policy.maximumSameGateGeometryPerGroup)reasons.push({kind:'repeated-gate-geometry',key,ids:members});
 }
 const boardOutlines=new Set([...descriptions.values()].map(d=>d.boardOutlineSha256)).size;
 const sourceLevels=new Set(records.map(r=>r.sourceLevelId)).size;
 if(expectFull){if(records.length!==450||groups.length!==45)reasons.push({kind:'incomplete-450',count:records.length,groups:groups.length});
  if(boardOutlines<policy.minimumBoardOutlinesIn450)reasons.push({kind:'too-few-global-outlines',boardOutlines});
  if(sourceLevels<policy.minimumSourceLevelsIn450)reasons.push({kind:'too-few-global-sources',sourceLevels});}
 return{schemaVersion:3,policy,status:reasons.length?'DIVERSITY_REJECTED':expectFull?'DIVERSITY_450_VERIFIED':'PARTIAL_DIVERSITY_VERIFIED',
  formalReady:false,count:records.length,sourceLevels,boardOutlines,reasons,nearPairs:pairs,groups,nearest:Object.fromEntries(nearest)};
}
