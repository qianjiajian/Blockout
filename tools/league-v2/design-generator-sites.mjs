/** Read-only geometric routing prefilter for generator-ready plain bases.
 * Does not certify the decorated level or count as a new board search.
 * A candidate birth cell must be vacated late, remain unvisited afterwards,
 * and have two differently coloured reachable exits for alternating S1 FIFO.
 */
const key=p=>p.join(',');
const cells=b=>b.shape.map(([x,y])=>[b.x+x,b.y+y]);
const pointOnRim=(level,rim,index)=>rim.side==='top'?[rim.offset+index,0]:rim.side==='bottom'?[rim.offset+index,level.height-1]:rim.side==='left'?[0,rim.offset+index]:[level.width-1,rim.offset+index];
export function findLateGeneratorSites(level,drags,reservedRim,runtime){
  if(!runtime?.auditGeneratorMounts)return{status:'REQUIRES_REAL_CORE_MOUNT_AUDIT',sites:[]};
  const mountIssues=runtime.auditGeneratorMounts({...level,generators:(reservedRim??[]).map((s,i)=>({id:`reserved-${i}`,side:s.side,offset:s.offset+1,rimSpan:3,rimMount:'rim',queueBlockIds:[]}))});
  if(mountIssues.length)return{status:'INVALID_MOUNTS',sites:[],mountIssues};
  const state=new Map(level.blocks.map(b=>[b.id,structuredClone(b)])),states=[],firstAction=new Map(),removals=[];
  for(const [dragIndex,drag]of drags.entries()){
    const block=state.get(drag.blockId);if(!block)return{status:'INVALID_ROUTE',sites:[]};
    if(!firstAction.has(block.id))firstAction.set(block.id,{dragIndex,isExit:!!drag.exitSide});
    for(const [x,y]of drag.path){block.x=x;block.y=y;states.push({dragIndex,removals:removals.length,bodies:[...state.values()].map(x=>structuredClone(x))});}
    if(drag.exitSide){state.delete(block.id);removals.push(block.id);states.push({dragIndex,removals:removals.length,bodies:[...state.values()].map(x=>structuredClone(x))});}
  }
  if(state.size)return{status:'INCOMPLETE_ROUTE',sites:[]};
  const board=new Set((level.playable??Array.from({length:level.width*level.height},(_,i)=>[i%level.width,Math.floor(i/level.width)])).map(key));
  for(const p of level.blocked??[])board.delete(key(p));
  const sites=[];
  for(const rim of reservedRim??[])for(const at of [1]){
    const birth=pointOnRim(level,rim,at),birthKey=key(birth),owner=level.blocks.find(b=>cells(b).some(p=>key(p)===birthKey));
    if(!owner||!firstAction.get(owner.id)?.isExit)continue;
    const firstFree=states.findIndex(s=>!s.bodies.some(b=>cells(b).some(p=>key(p)===birthKey)));
    if(firstFree<0||states.slice(firstFree+1).some(s=>s.bodies.some(b=>cells(b).some(p=>key(p)===birthKey))))continue;
    const afterExit=states.find(s=>s.dragIndex===firstAction.get(owner.id).dragIndex&&!s.bodies.some(b=>b.id===owner.id));
    if(!afterExit||afterExit.removals<3||afterExit.removals>level.blocks.length-2)continue;
    const occupied=new Set(afterExit.bodies.flatMap(cells).map(key)),reachable=new Set([birthKey]),queue=[birth];
    for(const [x,y]of queue)for(const q of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]]){
      const k=key(q);if(board.has(k)&&!occupied.has(k)&&!reachable.has(k)){reachable.add(k);queue.push(q);}
    }
    const gateColors=level.gates.filter(g=>queue.some(([x,y])=>g.side==='top'?y===0&&x>=g.offset&&x<g.offset+g.size:g.side==='bottom'?y===level.height-1&&x>=g.offset&&x<g.offset+g.size:g.side==='left'?x===0&&y>=g.offset&&y<g.offset+g.size:x===level.width-1&&y>=g.offset&&y<g.offset+g.size)).map(g=>g.color);
    if(new Set(gateColors).size<2)continue;
    sites.push({rim,birth,ownerId:owner.id,birthAfterPriorRemovals:states[firstFree].removals,ownerRemovalOrdinal:afterExit.removals,
      remainingOriginalBodies:level.blocks.length-afterExit.removals,reachableQueueColours:[...new Set(gateColors)],heldSingleCellStates:reachable.size});
  }
  const distinctRims=new Set(sites.map(s=>JSON.stringify(s.rim))).size;
  let readyPair=null;
  for(let i=0;i<sites.length&&!readyPair;i++)for(let j=i+1;j<sites.length;j++)if(JSON.stringify(sites[i].rim)!==JSON.stringify(sites[j].rim)&&key(sites[i].birth)!==key(sites[j].birth)){
    readyPair=[sites[i],sites[j]];break;
  }
  return{status:readyPair?'TWO_RIMS_GEOMETRICALLY_READY':'NEEDS_MORE_SITES',sites,distinctRims,readyPair,
    limitation:'Plain geometric prefilter only; decorated generator runtime, all queue bodies and lower/upper proof still required.'};
}
