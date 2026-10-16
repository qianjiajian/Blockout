import {digest,absoluteCells} from './diversity-layout-factory.mjs';
import {reconstructReverseBlueprint} from './design-reverse-blueprint.mjs';
import {inverseInsertionAudit,inverseParkingAudit,auditCompleteReverseWitness} from './reverse-route-audit.mjs';

/** A single graph contains both inventory insertion and parking edges. The
 * caller owns one raw-world budget across blueprint reconstruction and this
 * graph. Edge generation must charge portal worlds before held-coordinate BFS
 * and every proposed committed world before returning or rejecting an edge.
 * This constructor makes no lower-bound or optimality claim.
 */
export function runReverseInterleavedGraph({initialLevel,initialOperations,inventory,
  worldKey,charge,insertionOptions,parkingOptions,goal,maxParkingDrags=180,stats={},queuePolicy='minimum-parking',layoutScore=()=>0}){
 if(!Number.isSafeInteger(maxParkingDrags)||maxParkingDrags<0||maxParkingDrags>256)throw Error('Invalid finite interleaved parking horizon');
 if(!['minimum-parking','fill-first-diverse'].includes(queuePolicy)||typeof layoutScore!=='function')throw Error('Invalid predeclared construction queue policy');
 const score=level=>{const n=layoutScore(level);if(!Number.isFinite(n))throw Error('Finite construction layout score required');return n;};
 const stock=new Map(inventory.map(b=>[b.id,b]));
 if(stock.size!==inventory.length)throw Error('Duplicate full inventory identity');
 function missing(level){
  const present=new Set();for(const body of level.blocks){
   const original=stock.get(body.id);if(!original||present.has(body.id))throw Error('Unknown or duplicate inserted inventory');
   const semantic=b=>JSON.stringify(Object.fromEntries(Object.entries(b).filter(([k])=>!['x','y'].includes(k)).sort(([a],[b])=>a.localeCompare(b))));
   if(semantic(body)!==semantic(original))throw Error('Insertion or parking changed inventory semantics');
   present.add(body.id);
  }
  return inventory.filter(b=>!present.has(b.id));
 }
 const heap=[],best=new Map(),closed=new Set();let serial=0;
 const less=(a,b)=>queuePolicy==='fill-first-diverse'?
  a.missing<b.missing||(a.missing===b.missing&&(a.layoutScore<b.layoutScore||(a.layoutScore===b.layoutScore&&(a.parking<b.parking||(a.parking===b.parking&&a.serial<b.serial))))):
  a.parking<b.parking||(a.parking===b.parking&&(a.missing<b.missing||(a.missing===b.missing&&a.serial<b.serial)));
 const push=n=>{heap.push(n);for(let i=heap.length-1;i;){const p=(i-1)>>1;if(!less(heap[i],heap[p]))break;[heap[i],heap[p]]=[heap[p],heap[i]];i=p;}};
 const pop=()=>{const first=heap[0],last=heap.pop();if(heap.length){heap[0]=last;for(let i=0;;){let child=i*2+1;if(child>=heap.length)break;if(child+1<heap.length&&less(heap[child+1],heap[child]))child++;if(!less(heap[child],heap[i]))break;[heap[i],heap[child]]=[heap[child],heap[i]];i=child;}}return first;};
 const start={level:initialLevel,parent:null,operation:null,parking:0,missing:missing(initialLevel).length,layoutScore:score(initialLevel),serial:serial++};
 start.key=charge(start.level);best.set(start.key,0);push(start);
 const operations=node=>{const out=[];for(let n=node;n.operation;n=n.parent)out.push(n.operation);return[...initialOperations,...out.reverse()];};
 Object.assign(stats,{interleavedGraph:true,constructionQueuePolicy:queuePolicy,interleavedPoppedWorlds:0,interleavedInsertedBodyParkingEdges:0,interleavedGoalWorlds:0,interleavedFrontierPeak:1});
 const originalPresent=new Set(initialLevel.blocks.map(b=>b.id));
 while(heap.length){
  const node=pop();if(closed.has(node.key)||best.get(node.key)!==node.parking)continue;
  charge(node.level,true);closed.add(node.key);stats.interleavedPoppedWorlds++;
  stats.maximumVacancyDepth=Math.max(stats.maximumVacancyDepth??0,node.parking);
  const todo=missing(node.level);
  if(!todo.length){stats.interleavedGoalWorlds++;const complete=goal(node.level,operations(node));if(complete)return complete;continue;}
  const enqueue=choice=>{
   if(!choice?.level||!['insertion','parking'].includes(choice.operation?.kind))throw Error('Invalid reverse graph edge');
   const nextMissing=missing(choice.level),insert=choice.operation.kind==='insertion';
   if(nextMissing.length!==todo.length-(insert?1:0))throw Error('Reverse graph edge lost or duplicated inventory');
   const k=charge(choice.level),parking=node.parking+(insert?0:1);
   if(!insert&&!originalPresent.has(choice.operation.blockId))stats.interleavedInsertedBodyParkingEdges++;
   if(parking>maxParkingDrags){stats.vacancyDepthLimitHits=(stats.vacancyDepthLimitHits??0)+1;return;}
   if(closed.has(k)||(best.has(k)&&best.get(k)<=parking))return;
   best.set(k,parking);push({level:choice.level,key:k,parent:node,operation:choice.operation,parking,missing:nextMissing.length,layoutScore:score(choice.level),serial:serial++});
   stats.interleavedFrontierPeak=Math.max(stats.interleavedFrontierPeak,heap.length);
  };
  // Each state can insert any absent identity, then park any present identity.
  // An inserted body is therefore immediately eligible at its next node.
  for(const body of todo)for(const choice of insertionOptions(node.level,body,node))enqueue(choice);
  if(node.parking<maxParkingDrags)for(const choice of parkingOptions(node.level,node))enqueue(choice);
  else stats.vacancyDepthLimitHits=(stats.vacancyDepthLimitHits??0)+1;
 }
 return null;
}

/** Qualification only: feed exactly the supplied successful inverse prefix to
 * the same scheduler. No alternative actions are generated and no difficulty
 * search is run on the reference (including a previously failed stock).
 */
export function auditKnownInterleavedBlueprint(runtime,packet,{prefixClearCount=2,maximumPrefixArea=6,maxStates=10000,allowLargePrefix=false,queuePolicy='minimum-parking'}={}){
 if(!Number.isSafeInteger(maxStates)||maxStates<1||maxStates>10000)throw Error('Invalid qualification raw cap');
 const raw=new Set(),expanded=new Set(),portalRecords=[],stats={};let micro=0,transitions=0;
 const key=l=>digest(l.blocks.map(b=>({...b})).sort((a,b)=>a.id.localeCompare(b.id)));
 const charge=(l,expand=false)=>{const k=key(l);if(!raw.has(k)){if(raw.size===maxStates)throw Error('qualification-max-raw-worlds');raw.add(k);}if(expand)expanded.add(k);return k;};
 charge(packet.level);
 const blueprint=reconstructReverseBlueprint(runtime,packet,{prefixClearCount,maximumPrefixArea,allowLargePrefix,charge,micro:()=>micro++,transition:()=>transitions++});
 const plan=blueprint.withheldReferenceInverseOperations;
 const depth=node=>{let n=0;while(node.parent){n++;node=node.parent;}return n;};
 const edge=(current,op)=>{
  if(op.kind==='insertion'){
   const portal={...current,blocks:[...current.blocks,structuredClone(op.body)]};
   charge(portal,true);portalRecords.push({id:op.body.id,raw:raw.size,microBefore:micro,portalWorldSha256:key(portal)});
  }
  micro+=op.reversePath.length;transitions+=op.reversePath.length;
  const audit=op.kind==='insertion'?inverseInsertionAudit(runtime,current,op.body,op.reversePath,op.exitSide):inverseParkingAudit(runtime,current,op.blockId,op.reversePath);
  if(!audit.valid)throw Error('Known interleaved inverse edge rejected: '+audit.error);
  charge(audit.reverseAfterLevel);return{level:audit.reverseAfterLevel,operation:{...op,forwardDrag:audit.forwardDrag}};
 };
 const solved=runReverseInterleavedGraph({initialLevel:blueprint.level,initialOperations:blueprint.reverseOperations,inventory:packet.level.blocks,
  worldKey:key,charge,stats,maxParkingDrags:256,queuePolicy,
  insertionOptions:(current,body,node)=>{const op=plan[depth(node)];return op?.kind==='insertion'&&op.body.id===body.id?[edge(current,op)]:[];},
  parkingOptions:(current,node)=>{const op=plan[depth(node)];return op?.kind==='parking'?[edge(current,op)]:[];},
  goal:(level,ops)=>{
   if(key(level)!==key(packet.level))throw Error('Known reference inventory or poses not restored');
   for(let i=0;i<level.blocks.length;i++)for(let j=i+1;j<level.blocks.length;j++)if(level.blocks[i].color===level.blocks[j].color&&absoluteCells(level.blocks[i]).some(([x,y])=>absoluteCells(level.blocks[j]).some(([a,b])=>Math.abs(x-a)+Math.abs(y-b)===1)))throw Error('Adjacent same-colour reference');
   const audit=auditCompleteReverseWitness(runtime,level,ops.map(x=>x.forwardDrag).reverse());if(!audit.valid)throw Error(audit.error);
   return{level,operations:ops,audit};
  }});
 if(!solved)throw Error('Known interleaved route was not expressible');
 return{valid:true,newConstructionSearch:false,lowerSearch:false,searchPerformed:false,originalWorldRestored:true,
  originalInventoryIds:packet.level.blocks.map(b=>b.id).sort(),restoredInventoryIds:solved.level.blocks.map(b=>b.id).sort(),
  completeActualDoubleReplay:true,U:solved.audit.U,referenceU:packet.U,
  initialPrefixClearCount:blueprint.initialPrefixClearCount,initialVacancyArea:blueprint.initialVacancyArea,
  rawDiscoveredStates:raw.size,rawExpandedStates:expanded.size,microDiscoveredStates:micro,attemptedTransitions:transitions,
  rawWorldSha256s:[...raw],portalRecords,interleavedOperations:plan,stats};
}
