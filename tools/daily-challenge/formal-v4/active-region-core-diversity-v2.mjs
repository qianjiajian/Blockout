import assert from 'node:assert/strict';
import {levelSha256} from '../formal-v2/contract.mjs';
import {compileCanonicalHistoryPath} from './canonical-history-path-compiled.mjs';

export const CORE_HISTORY_LOADER_VERSION='canonical-bound-original-world-fields-v2';
// The same recognized original-world fields as plan-history-adapter-v6. A
// campaign's historical formedWorldFiles label does not itself prove a world.
export const CORE_HISTORY_WORLD_FIELDS=Object.freeze(['level','placeholderWorld','plain.level','built.level','built.placeholderWorld','built.plain.level','constructionTemplateLevel','templateLevel','constructionTemplatePacket.level','input.level','construction.level']);

export const CORE_DIVERSITY_VERSION='active-region-partition-eight-orbits-v1';
export const CORE_OVERLAP_LIMIT=.70; // Explicit engineering gate, not a user-fixed difficulty number.
export const SOURCE18_CORE={receipt:{path:'deliverables/daily-formal-v4-20261008/selection/axis-iced-source18-01/candidate.json',sha256:'bbe686b985107c38806ccc899eb750f0da0116962836bb633a17af16d2bca2d9'},region:{x:0,y:5,width:5,height:3}};

const sortPoints=ps=>ps.sort((a,b)=>a[1]-b[1]||a[0]-b[0]);
const fp=ps=>JSON.stringify(sortPoints(ps.map(p=>[...p])));
/** Extract footprint metadata from an already-formed, bound original object.
 * No new level, deleted-body world, model, reachability or mathematical claim. */
export function extractActiveCore(level,region){
 for(const k of['x','y','width','height'])assert(Number.isSafeInteger(region[k])&&region[k]>=(['width','height'].includes(k)?1:0));
 assert(region.x+region.width<=level.width&&region.y+region.height<=level.height);
 const inside=([x,y])=>x>=region.x&&y>=region.y&&x<region.x+region.width&&y<region.y+region.height,footprints=[],seen=new Set();
 for(const b of level.blocks){const cells=b.shape.map(([x,y])=>[b.x+x,b.y+y]),n=cells.filter(inside).length;assert(n===0||n===cells.length,'A core boundary cannot split a body');if(!n)continue;for(const[x,y]of cells){const k=x+','+y;assert(!seen.has(k));seen.add(k);}footprints.push(sortPoints(cells.map(([x,y])=>[x-region.x,y-region.y])));}
 assert.equal(seen.size,region.width*region.height,'The declared original core is fully covered');
 return{width:region.width,height:region.height,playableArea:seen.size,footprints};
}
function transform(core,orbit){
 const flip=orbit>=4,turn=orbit%4,point=([x,y])=>{if(flip)x=-x;for(let i=0;i<turn;i++)[x,y]=[-y,x];return[x,y];};
 const rows=core.footprints.map(ps=>ps.map(point)),all=rows.flat(),minX=Math.min(...all.map(p=>p[0])),minY=Math.min(...all.map(p=>p[1]));
 const footprints=rows.map(ps=>sortPoints(ps.map(([x,y])=>[x-minX,y-minY]))),points=footprints.flat();
 return{width:Math.max(...points.map(p=>p[0]))+1,height:Math.max(...points.map(p=>p[1]))+1,playableArea:core.playableArea,footprints};
}
export function activeCoreKey(core){
 const keys=Array.from({length:8},(_,i)=>{const c=transform(core,i);return JSON.stringify({width:c.width,height:c.height,footprints:c.footprints.map(fp).sort()});});
 return levelSha256(keys.sort()[0]);
}
/** Same whole-body footprint under any rigid orientation and translation.
 * The score counts shared cells only when an ENTIRE block footprint matches;
 * the smaller real core area is the denominator. ID/colour/ice are ignored. */
export function compareActiveCores(a,b){
 const targets=new Set(a.footprints.map(fp));let best={overlapCells:0,orbit:0,translation:[0,0]};const denominator=Math.min(a.playableArea,b.playableArea);
 assert(denominator>0);
 for(let orbit=0;orbit<8;orbit++){const c=transform(b,orbit),offsets=new Map();
  // A positive match must align at least one equal oriented whole footprint.
  for(const p of a.footprints)for(const q of c.footprints){if(p.length!==q.length)continue;const dx=p[0][0]-q[0][0],dy=p[0][1]-q[0][1];if(fp(q.map(([x,y])=>[x+dx,y+dy]))===fp(p))offsets.set(dx+','+dy,[dx,dy]);}
  for(const[dx,dy]of offsets.values()){let overlapCells=0;for(const p of c.footprints)if(targets.has(fp(p.map(([x,y])=>[x+dx,y+dy]))))overlapCells+=p.length;if(overlapCells>best.overlapCells)best={overlapCells,orbit,translation:[dx,dy]};}
 }
 assert(best.overlapCells<=denominator);return{...best,denominator,footprintOverlap:best.overlapCells/denominator,exactPartition:activeCoreKey(a)===activeCoreKey(b)};
}
export function createActiveCoreIndex(initial=[]){
 const rows=[],seen=new Set();const add=(core,evidence,origin)=>{const identity=levelSha256({core,evidence});if(!seen.has(identity)){seen.add(identity);rows.push({core,evidence,origin,key:activeCoreKey(core)});}};
 for(const row of initial)add(row.core,row.evidence,row.origin);
 return{
 check(level,region){const core=extractActiveCore(level,region),key=activeCoreKey(core),comparisons=rows.map(row=>({evidence:row.evidence,origin:row.origin,...compareActiveCores(core,row.core)}));assert(comparisons.every(c=>!c.exactPartition),'Repeated normalized active-core partition');assert(comparisons.every(c=>c.footprintOverlap<=CORE_OVERLAP_LIMIT+1e-12),'Active-core footprint overlap exceeds engineering .70');return{version:CORE_DIVERSITY_VERSION,coreKey:key,region:{x:region.x,y:region.y,width:region.width,height:region.height},engineeringThreshold:CORE_OVERLAP_LIMIT,userConfirmedNumber:false,comparisons,colourOrIdChangesCounted:false,perimeterChangesCounted:false,allOldHistoricalCoresInferred:false,newWorlds:0,newSearches:0};},
 add(level,region,evidence,origin='earlier-batch-full-including-rejected'){add(extractActiveCore(level,region),evidence,origin);},
 stats(){return{version:CORE_DIVERSITY_VERSION,coreRecords:rows.length,origins:rows.map(r=>r.origin),scope:'explicit-source18-core, recorded-active-region-construction-metadata, earlier-batch-full-worlds',allOldHistoricalCoresInferred:false};}
 };
}
/** Read only the original formed-world files explicitly indexed by closed
 * campaigns. Old layouts without activeRegion metadata are not guessed. */
export async function loadActiveCoreIndex(reader,history){
 const canonical=compileCanonicalHistoryPath(history.bundle.scope).canonical,files=new Map(),worlds=new Map(),seen=new Set();
 const descriptor=d=>assert(d&&typeof d.path==='string'&&/^[a-f0-9]{64}$/.test(d.sha256),'Exact historical descriptor required');
 const identity=d=>{descriptor(d);return canonical(d.path)+'|'+d.sha256;},at=(q,field)=>field.split('.').reduce((v,k)=>v?.[k],q);
 for(const f of history.bundle.files){descriptor(f);const p=canonical(f.path);assert(!files.has(p),'Duplicate canonical sealed file');files.set(p,f);}
 for(const w of history.fullWorlds){const id=identity(w.descriptor),rows=worlds.get(id)??[];rows.push(w);worlds.set(id,rows);}
 const source=await reader.bound(SOURCE18_CORE.receipt),initial=[{core:extractActiveCore(source.level,SOURCE18_CORE.region),evidence:SOURCE18_CORE.receipt,origin:'saved-source18-explicit-5x3-core'}];
 for(const campaign of history.closedCampaigns)for(const d of campaign.raw?.formedWorldFiles??[]){
  const id=identity(d),file=files.get(canonical(d.path));assert(file,'Closed campaign descriptor must belong to sealed file membership');assert.equal(file.sha256,d.sha256,'Closed campaign descriptor SHA differs from sealed file');
  if(seen.has(id))continue;seen.add(id);
  const raw=await reader.bound(d),rows=worlds.get(id)??[],formed=CORE_HISTORY_WORLD_FIELDS.filter(field=>at(raw,field)?.blocks);
  // Authenticate every actual known full-world projection, including legacy
  // non-active objects. Preserve multiple fields/pool entries from one file.
  for(const field of formed){const level=at(raw,field),matching=rows.filter(w=>w.field===field);assert(matching.length,'Original full-world field must belong to sealed history: '+field);for(const w of matching)assert.deepEqual(w.level,level,'Original full-world field differs from sealed history: '+field);}
  for(const w of rows){
   // Old selected/old450 pool rows can omit field. They may corroborate the
   // original root level, but cannot satisfy any explicit field requirement.
   if(w.field===undefined){assert(raw.level?.blocks,'Legacy fieldless pool requires original root level');assert.deepEqual(w.level,raw.level,'Legacy fieldless pool differs from original root level');continue;}
   assert(CORE_HISTORY_WORLD_FIELDS.includes(w.field),'Unknown sealed world field');assert(formed.includes(w.field),'Sealed full-world field missing in original bytes');assert.deepEqual(w.level,at(raw,w.field),'Sealed full-world projection differs from original bytes');
  }
  const c=raw.constructionAccounting;
  if(c?.version!=='joint-active-region-real-body-ice-first-full-v1')continue;
  assert(formed.includes('level'),'Active construction requires original level field');assert(raw.levelSha256===levelSha256(raw.level),'Active construction level hash mismatch');assert(c.domainDesignChoices?.activeRegion);
  initial.push({core:extractActiveCore(raw.level,c.domainDesignChoices.activeRegion),evidence:d,origin:'historical-explicit-active-region'});
 }
 return createActiveCoreIndex(initial);
}
