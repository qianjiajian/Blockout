import {assertPlainProofDomain} from '../formal-v2/proof-plain.mjs';
import {auditPlainForwardDrag} from './reverse-route-audit.mjs';
import {absoluteCells,digest} from './diversity-layout-factory.mjs';
export const LATE_ROUTE_REGION_VERSION='plain-connected-late-first-action-v1';
const key=p=>p.join(','),sortCells=bs=>bs.flatMap(absoluteCells).map(key).sort();
export function routeFirstUse(level,drags){
 if(!Array.isArray(drags)||!drags.length||drags.length>10000)throw Error('Finite complete reference route required');
 const ids=new Set(level.blocks.map(b=>b.id)),first={};let nonclear=0,clears=0;
 for(const[index,d]of drags.entries()){
  if(!ids.has(d.blockId)||!Array.isArray(d.path))throw Error('Invalid reference route identity');
  first[d.blockId]??={dragIndex:index,nonclearBefore:nonclear,clearsBefore:clears};
  if(d.exitSide)clears++;else nonclear++;
 }
 if(Object.keys(first).length!==ids.size||clears!==ids.size)throw Error('Reference route must contain full stock');
 return{first,nonclear,clears,totalDrags:drags.length};
}
export function lateRegionMetadata(level,changedIds,usage){
 if(!Array.isArray(changedIds)||new Set(changedIds).size!==changedIds.length||changedIds.length<2)throw Error('Distinct changed bodies required');
 const bodies=changedIds.map(id=>level.blocks.find(b=>b.id===id));if(bodies.some(b=>!b))throw Error('Unknown changed body');
 const cells=new Set(sortCells(bodies)),todo=[cells.values().next().value],seen=new Set(todo);
 for(let i=0;i<todo.length;i++){const[x,y]=todo[i].split(',').map(Number);for(const p of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]]){const k=key(p);if(cells.has(k)&&!seen.has(k)){seen.add(k);todo.push(k);}}}
 const firstActions=changedIds.map(id=>({id,...usage.first[id]})),prefixLength=Math.min(...firstActions.map(x=>x.dragIndex));
 const earliest=firstActions.find(x=>x.dragIndex===prefixLength);
 return{changedIds:[...changedIds],connected:seen.size===cells.size,regionArea:cells.size,prefixLength,
  preservedPrefixNonclear:earliest.nonclearBefore,preservedPrefixClears:earliest.clearsBefore,
  preservedKnownNonclearFraction:earliest.nonclearBefore/Math.max(1,usage.nonclear),firstActions};
}
/** One deterministic supplied prefix, no new action enumeration or solver.
 * Exact union equality plus unchanged outside bodies preserves occupancy
 * until the first changed body is selected; canonical actual replay still
 * checks every held step and earliest exit. The partial route is never U.
 */
export function checkLateMutationPrefix(runtime,original,candidate,changedIds,drags,{maxRawWorlds=10000}={}){
 if(!Number.isSafeInteger(maxRawWorlds)||maxRawWorlds<1||maxRawWorlds>10000)throw Error('Invalid finite prefix verification cap');
 const raw=new Set(),record={valid:false,searchPerformed:false,completeUpperWitness:false,lowerBoundClaimed:false,
  rawWorldsInspected:0,microCoordinatesInspected:0,actionAudits:[],version:LATE_ROUTE_REGION_VERSION};
 const charge=l=>{const k=digest(l.blocks);if(!raw.has(k)){if(raw.size>=maxRawWorlds)throw Error('prefix-verification-raw-cap');raw.add(k);record.rawWorldsInspected=raw.size;}};
 try{
  assertPlainProofDomain(original);assertPlainProofDomain(candidate);runtime.validateLevel(candidate);
  const meta=lateRegionMetadata(original,changedIds,routeFirstUse(original,drags));Object.assign(record,meta);
  if(!meta.connected)throw Error('Mutation region is not connected');
  const selected=new Set(changedIds),withoutBodies=l=>{const b=structuredClone(l);delete b.blocks;return b;};
  if(digest(withoutBodies(original))!==digest(withoutBodies(candidate)))throw Error('Late mutation changed non-body data');
  if(digest(sortCells(original.blocks.filter(b=>selected.has(b.id))))!==digest(sortCells(candidate.blocks.filter(b=>selected.has(b.id)))))throw Error('Mutation changed occupied union');
  const oldById=new Map(original.blocks.map(b=>[b.id,b]));
  if(candidate.blocks.length!==original.blocks.length||new Set(candidate.blocks.map(b=>b.id)).size!==oldById.size)throw Error('Mutation changed stock IDs');
  for(const body of candidate.blocks)if(!oldById.has(body.id)||!selected.has(body.id)&&digest(body)!==digest(oldById.get(body.id)))throw Error('Mutation changed an outside body');
  let current=structuredClone(candidate);charge(current);
  for(let i=0;i<meta.prefixLength;i++){
   const drag=drags[i];if(selected.has(drag.blockId))throw Error('Changed body appears inside preserved prefix');
   const body=current.blocks.find(b=>b.id===drag.blockId);if(!body)throw Error('Prefix reused cleared body');
   const end=drag.path.at(-1)??[body.x,body.y],next={...current,blocks:drag.exitSide?current.blocks.filter(b=>b.id!==body.id):current.blocks.map(b=>b.id===body.id?{...b,x:end[0],y:end[1]}:b)};
   charge(next);record.microCoordinatesInspected+=drag.path.length;
   const audit=auditPlainForwardDrag(runtime,current,drag,{expectedBodies:next.blocks});record.actionAudits.push({index:i,...audit});
   if(!audit.valid)throw Error(`Supplied prefix failed at drag ${i}: ${audit.error}`);current=next;
  }
  return{...record,valid:true,prefixEndBodiesSha256:digest(current.blocks),inputLevelSha256:digest(candidate),rawWorldSha256s:[...raw]};
 }catch(error){return{...record,error:error.message,rawWorldSha256s:[...raw]};}
}
