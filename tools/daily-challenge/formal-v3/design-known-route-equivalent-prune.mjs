import {digest} from './diversity-layout-factory.mjs';
import {auditCompleteReverseWitness} from './reverse-route-audit.mjs';
import {pruneKnownPlainWitness} from './design-known-route-prune.mjs';

const semantics=body=>{const{id,...rest}=body;void id;return{...rest,shape:body.shape.map(p=>[...p]).sort((a,b)=>a[1]-b[1]||a[0]-b[0])};};
const semanticKey=body=>digest(semantics(body));
const worldKey=blocks=>digest(blocks.map(semanticKey).sort());
function apply(blocks,drag){
 const next=structuredClone(blocks),b=next.find(x=>x.id===drag.blockId);if(!b)throw Error('Renamed witness body missing');
 const end=drag.path.at(-1);if(end)Object.assign(b,{x:end[0],y:end[1]});
 return drag.exitSide?next.filter(x=>x.id!==drag.blockId):next;
}

/** Plain static-domain automorphism only. The key retains ALL body fields
 * except identity, including absolute pose. No new action is enumerated: a
 * repeated supplied-trace world is removed and its existing suffix renamed. */
export function pruneEquivalentKnownPlainWitness(runtime,level,inputDrags){
 const original=auditCompleteReverseWitness(runtime,level,inputDrags);if(!original.valid)throw Error(original.error);
 const nameMap=new Map(level.blocks.map(b=>[b.id,b.id])),kept=[],worlds=[structuredClone(level.blocks)],keys=[worldKey(level.blocks)],seen=new Map([[keys[0],0]]),erasures=[];
 let blocks=structuredClone(level.blocks);
 for(const[index,input]of inputDrags.entries()){
  const drag={...structuredClone(input),blockId:nameMap.get(input.blockId)};blocks=apply(blocks,drag);const k=worldKey(blocks);
  if(seen.has(k)){
   const at=seen.get(k),target=worlds[at],bySemantic=new Map(target.map(b=>[semanticKey(b),b]));
   if(bySemantic.size!==target.length)throw Error('Equivalent-world mapping is not unique');
   const identityMap=blocks.map(b=>{const t=bySemantic.get(semanticKey(b));if(!t)throw Error('Incomplete semantic equivalence');return{from:b.id,to:t.id,semanticSha256:semanticKey(b),pose:[b.x,b.y]};});
   if(new Set(identityMap.map(x=>x.to)).size!==blocks.length)throw Error('Equivalent mapping is not bijective');
   const map=new Map(identityMap.map(x=>[x.from,x.to]));
   for(const[old,current]of nameMap)if(map.has(current))nameMap.set(old,map.get(current));
   erasures.push({suppliedTraceEnd:index,keptPrefixDrags:at,removedKeptDrags:kept.length-at+1,
    repeatedCompleteSemanticWorldSha256:k,identityMap,onlySuppliedActionsDeleted:true});
   for(const old of keys.slice(at+1))seen.delete(old);keys.length=at+1;kept.length=at;worlds.length=at+1;blocks=structuredClone(target);
  }else{kept.push(drag);worlds.push(structuredClone(blocks));keys.push(k);seen.set(k,kept.length);}
 }
 const quotientReplay=auditCompleteReverseWitness(runtime,level,kept);if(!quotientReplay.valid)throw Error('ID-spliced original route failed actual double replay: '+quotientReplay.error);
 const final=pruneKnownPlainWitness(runtime,level,kept);
 return{...final,status:'KNOWN_PLAIN_WITNESS_SEMANTIC_ID_BIJECTION_PRUNING_ONLY',levelSha256:digest(level),
  suppliedRouteSha256:digest(inputDrags),suppliedU:original.U,suppliedTotalDrags:inputDrags.length,
  semanticWorldEquality:'All original plain body fields except ID, including colour, shape, absolute pose and any metadata; board and gates unchanged.',
  semanticCycleDragsRemoved:inputDrags.length-kept.length,erasures,lowerSearches:0,upperSearches:0,searchPerformed:false,
  assertion:'Only existing known trace segments removed; suffix block IDs renamed by an exact complete-world bijection. No new moves or puzzle branches generated.',formalReady:false};
}
