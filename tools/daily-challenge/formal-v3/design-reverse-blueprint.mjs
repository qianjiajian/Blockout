import {digest,absoluteCells,boardCells} from './diversity-layout-factory.mjs';
import {auditCompleteReverseWitness,inverseInsertionAudit,inverseParkingAudit,inverseUnitPath} from './reverse-route-audit.mjs';

export const REVERSE_BLUEPRINT_VERSION='successful-route-inverse-blueprint-v3-large-prefix';

/** A supplied successful witness is reversed exactly, with no search. The
 * caller charges every committed/portal world to its shared construction
 * budget. Prefix removals are withheld for the later, new vacancy walk. */
export function reconstructReverseBlueprint(runtime,packet,{charge=()=>{},micro=()=>{},transition=()=>{},maximumPrefixArea=8,prefixClearCount=null,allowLargePrefix=false}={}){
 if(!packet?.level||!Array.isArray(packet.drags))throw Error('Complete successful blueprint required');
 if(typeof allowLargePrefix!=='boolean')throw Error('Explicit large-prefix flag must be boolean');
 const maxArea=allowLargePrefix?Math.min(256,boardCells(packet.level).length):8;
 const maxClears=allowLargePrefix?packet.level.blocks.length-1:3;
 if(!Number.isSafeInteger(maximumPrefixArea)||maximumPrefixArea<1||maximumPrefixArea>maxArea)throw Error('Invalid finite prefix area');
 if(prefixClearCount!==null&&(!Number.isSafeInteger(prefixClearCount)||prefixClearCount<1||prefixClearCount>maxClears))throw Error('Invalid explicit prefix clear count');
 const qualification=auditCompleteReverseWitness(runtime,packet.level,packet.drags);
 if(!qualification.valid)throw Error('Blueprint witness invalid: '+qualification.error);
 const frames=[],original=structuredClone(packet.level);let forward=structuredClone(original);
 for(const drag of packet.drags){
  const body=forward.blocks.find(b=>b.id===drag.blockId);if(!body)throw Error('Blueprint body missing');
  const before=structuredClone(body),end=drag.path.at(-1)??[body.x,body.y];
  frames.push({body:before,drag:structuredClone(drag),end,reversePath:inverseUnitPath([body.x,body.y],drag.path)});
  if(drag.exitSide)forward.blocks=forward.blocks.filter(b=>b.id!==body.id);else Object.assign(body,{x:end[0],y:end[1]});
 }
 if(forward.blocks.length)throw Error('Blueprint left inventory');
 let prefix=0,area=0,clearCount=0;
 if(prefixClearCount!==null){
  for(const[index,frame]of frames.entries())if(frame.drag.exitSide){area+=frame.body.shape.length;clearCount++;
   if(clearCount===prefixClearCount){prefix=index+1;break;}}
  if(clearCount!==prefixClearCount||area>maximumPrefixArea)throw Error('Requested prefix clear count/area is not present in supplied witness');
 }else while(prefix<frames.length&&frames[prefix].drag.exitSide){
  if(area+frames[prefix].body.shape.length>maximumPrefixArea)break;
  area+=frames[prefix].body.shape.length;prefix++;clearCount++;
 }
 if(!prefix||prefix===frames.length)throw Error('Blueprint needs a proper clear prefix followed by a remaining route');
 const operations=[];let current={...structuredClone(original),blocks:[]};charge(current,true);
 for(let index=frames.length-1;index>=prefix;index--){
  const frame=frames[index];charge(current,true);
  const portal={...frame.body,x:frame.end[0],y:frame.end[1]};
  const proposed={...current,blocks:frame.drag.exitSide?[...current.blocks,{...frame.body}]:current.blocks.map(b=>b.id===frame.body.id?{...b,x:frame.body.x,y:frame.body.y}:b)};
  if(frame.drag.exitSide)charge({...current,blocks:[...current.blocks,portal]},true);
  for(const p of frame.reversePath){void p;micro();transition();}
  charge(proposed);
  const audit=frame.drag.exitSide?inverseInsertionAudit(runtime,current,portal,frame.reversePath,frame.drag.exitSide):inverseParkingAudit(runtime,current,frame.body.id,frame.reversePath);
  if(!audit.valid)throw Error('Blueprint inverse rejected at '+index+': '+audit.error);
  operations.push({kind:frame.drag.exitSide?'insertion':'parking',blueprintDragIndex:index,
   ...(frame.drag.exitSide?{body:portal,exitSide:frame.drag.exitSide}:{blockId:frame.body.id}),
   reversePath:frame.reversePath,forwardDrag:audit.forwardDrag});current=audit.reverseAfterLevel;
 }
 const occupied=new Set(current.blocks.flatMap(absoluteCells).map(p=>p.join(',')));
 const vacancy=boardCells(original).filter(p=>!occupied.has(p.join(',')));
 if(vacancy.length!==area)throw Error('Prefix inventory and actual cut-world vacancy area disagree');
 const withheldReferenceInverseOperations=frames.slice(0,prefix).map((frame,index)=>({kind:frame.drag.exitSide?'insertion':'parking',blueprintDragIndex:index,
  ...(frame.drag.exitSide?{body:{...frame.body,x:frame.end[0],y:frame.end[1]},exitSide:frame.drag.exitSide}:{blockId:frame.body.id}),reversePath:frame.reversePath,forwardDrag:frame.drag})).reverse();
 return{level:current,reverseOperations:operations,finalBodies:frames.slice(0,prefix).filter(f=>f.drag.exitSide).map(f=>f.body),
  initialPrefixClearCount:clearCount,prefixDragCount:prefix,withheldOriginalParkingCount:prefix-clearCount,withheldReferenceInverseOperations,allowLargePrefix,
  initialVacancyArea:area,referenceLevelSha256:digest(original),referenceRouteSha256:digest(packet.drags),
  referenceU:qualification.U,qualification,temporaryInitialVacancy:vacancy,
  searchPerformed:false,lowerBoundClaimed:false};
}
