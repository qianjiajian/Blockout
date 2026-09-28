/**
 * Full-inventory, optional-spawn relaxation for runtime v1.4, Lv41–50.
 * All bodies/layers and ice/countdown values stay; no fake counter floor.
 *
 * A machine may emit its next fixed cargo at ZERO cost whenever its complete
 * footprint is free. Emission can be delayed, never reordered or discarded.
 * A real held gesture maps to one optional-exit gesture ignoring arrivals,
 * followed by the same arrivals: each new cargo is stationary for the rest of
 * the real held gesture, so all final footprints are free/disjoint. Clear and
 * reveal counters are unchanged. Initial state is the real settled opening.
 * Hence every real solution has a relaxed path of no larger reposition cost.
 * Optional spawning is only a proof/search abstraction, not a runtime change.
 */
import assert from 'node:assert/strict';
import {compileLevel as compileBase} from './remake21to30-mask-floor.mjs';
import {projectGeneratorOpening} from './remake41to50-generator-floor-v146.mjs';
import {canonicalStateKey,equivalentBlockGroups} from './remake21to30-symmetry-floor-v139.mjs';
import {digest} from './revised-preview-validation-v160.mjs';
const QUEUED=254,REMOVED=255;
export function generatorClearCount(c,state){
 let n=0;for(let i=0;i<state.length;i++)if(state[i]!==QUEUED)n+=state[i]===REMOVED?c.blocks[i].layers.length:state[i]>>7;return n;
}
export function generatorStateFromSnapshot(c,snapshot){
 const queued=new Set(snapshot.queuedBlocks.map(b=>b.id));
 return Uint8Array.from(c.blocks.map(b=>{
  const a=snapshot.blocks.find(x=>x.id===b.id);
  return a?(a.y*c.W+a.x)|((b.layers.length-a.layers.length)<<7):queued.has(b.id)?QUEUED:REMOVED;
 }));
}
export function compileGeneratorLevel(level,api){
 // Reuses the old fail-closed full-generator domain and real validation, but
 // NOT its deletion projection: this graph retains every future body.
 projectGeneratorOpening(level,api);
 const queued=new Set(level.generators.flatMap(g=>g.queueBlockIds));
 const c=compileBase({...structuredClone(level),generators:[],blocks:level.blocks.filter(b=>!queued.has(b.id))});
 for(const b of level.blocks.filter(b=>queued.has(b.id))){
  assert(!b.shutterId&&!b.frozen,'Queued cargo cannot have hidden owner/ice');
  const owner=level.generators.find(g=>g.queueBlockIds.includes(b.id));
  const cargo={...b,x:owner.spawn[0],y:owner.spawn[1]};
  const compiled=compileBase({...structuredClone(level),generators:[],shutters:[],blocks:[cargo]});
  c.blocks.push(compiled.blocks[0]);
 }
 assert(c.blocks.length<=64,'At most 64 real bodies');
 c.generators=level.generators.map(g=>({...g,indices:g.queueBlockIds.map(id=>c.blocks.findIndex(b=>b.id===id))}));
 assert(c.generators.every(g=>g.indices.every(i=>i>=0)));
 c.totalClears=c.blocks.reduce((n,b)=>n+b.layers.length,0);
 c.initial=generatorStateFromSnapshot(c,new api.PuzzleModel(structuredClone(level)).snapshot());
 // Nonqueued identical bodies can be permuted. Queue identity/order cannot.
 c.groups=equivalentBlockGroups(c).map(group=>group.filter(i=>!queued.has(c.blocks[i].id))).filter(g=>g.length>1);
 return c;
}
export function forEachOptionalSpawn(c,state,visit){
 const cleared=generatorClearCount(c,state),occupied=[0,0,0];
 for(const s of c.covers)if(cleared<s.count)for(let k=0;k<3;k++)occupied[k]|=s.mask[k];
 for(let i=0;i<c.blocks.length;i++)if(state[i]!==QUEUED&&state[i]!==REMOVED&&cleared>=c.blocks[i].revealAt){
  const mask=c.blocks[i].poses[state[i]&127].mask;for(let k=0;k<3;k++)occupied[k]|=mask[k];
 }
 for(const g of c.generators){
  const i=g.indices.find(i=>state[i]===QUEUED);if(i===undefined)continue;
  const b=c.blocks[i],mask=b.poses[b.initial].mask;
  if(!mask.some((v,k)=>v&occupied[k])&&visit(i,b.initial,0,()=>({spawn:b.id,generatorId:g.id}))===false)return;
 }
}
export function forEachGeneratorGesture(c, state, visit) {
  const cleared = generatorClearCount(c, state), { blocks, covers, W } = c;
  let lo = 0, hi = 0, top = 0;
  for (const cover of covers) if (cleared < cover.count) { lo |= cover.mask[0]; hi |= cover.mask[1]; top |= cover.mask[2]; }
  for (let i = 0; i < blocks.length; i++) if (state[i] !== REMOVED && state[i] !== QUEUED && cleared >= blocks[i].revealAt) {
    const mask = blocks[i].poses[state[i] & 127].mask; lo |= mask[0]; hi |= mask[1]; top |= mask[2];
  }
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i], value = state[i];
    if (value === REMOVED || value === QUEUED || cleared < b.revealAt || b.ice > cleared - b.revealAt) continue;
    const start = value & 127, stage = value >> 7, mask = b.poses[start].mask;
    const occupiedLo = lo ^ mask[0], occupiedHi = hi ^ mask[1], occupiedTop = top ^ mask[2];
    const parents = new Int16Array(c.W * c.H).fill(-1), queue = [start]; parents[start] = start;
    const drag = (pose, exitSide) => {
      const path = [];
      while (pose !== start) { path.push([pose % W, Math.floor(pose / W)]); pose = parents[pose]; }
      return { blockId: b.id, path: path.reverse(), ...(exitSide ? { exitSide } : {}) };
    };
    for (let head = 0; head < queue.length; head++) {
      const p = queue[head], pose = b.poses[p], gate = pose.exits[stage];
      if (p !== start && visit(i, p | stage << 7, 1, () => drag(p)) === false) return;
      if (gate && cleared >= gate.frozen) {
        const nextValue = stage + 1 < b.layers.length ? p | (stage + 1) << 7 : REMOVED;
        if (visit(i, nextValue, 0, () => drag(p, gate.side)) === false) return;
      }
      for (const next of pose.neighbors) if (parents[next] === -1) {
        const m = b.poses[next].mask;
        if (!(m[0] & occupiedLo) && !(m[1] & occupiedHi) && !(m[2] & occupiedTop)) { parents[next] = p; queue.push(next); }
      }
    }
  }
}


/** Final-body clears may be normalized here only because future arrivals are
 * OPTIONAL. Removing an already-clearable body and delaying arrivals preserves
 * all other paths; cover reveals replace a region by a subset, counters improve.
 * Shell peels (which relocate retained occupancy) are never forced. */
export function normalizeGeneratorClears(c,input){
 let state=input,actions=[];
 for(;;){
  let next=null;
  forEachGeneratorGesture(c,state,(i,v,cost,get)=>{if(v===REMOVED&&cost===0){next={i,v,action:get()};return false;}});
  if(!next)return {state,actions};
  state=state.slice();state[next.i]=next.v;actions.push(next.action);
 }
}
export function checkFullGeneratorFloor(level,api,options={}){
 const floor=options.floor??5,maxStates=options.maxStates??1000000,maxMilliseconds=options.maxMilliseconds??60000;
 let result={status:'unknown',thresholdProven:false,floor,exploredStates:0,discoveredStates:0,attemptedTransitions:0,
  abstraction:'fixed-queue-optional-spawn-full-inventory-v1',sourceLevelSha256:digest(level),
  solvabilityValidated:false,timeValidated:false,pointerReplayValidated:false};
 if(![floor,maxStates,maxMilliseconds].every(n=>Number.isSafeInteger(n)&&n>0))return {...result,status:'invalid'};
 let c;try{c=compileGeneratorLevel(level,api);}catch(e){return {...result,status:'unsupported',reason:e.message};}
 const normalize=options.normalize===false?s=>({state:s,actions:[]}):s=>normalizeGeneratorClears(c,s);
 const keyOf=s=>canonicalStateKey(s,c.groups),start=normalize(c.initial),key=keyOf(start.state);
 const nodes=[{...start,key,cost:0,parent:-1,next:-1}],distances=new Map([[key,0]]),deadline=Date.now()+maxMilliseconds;
 let front=0,back=0,stopped=null;
 const routeTo=i=>{const rows=[];while(i!==-1){rows.push(nodes[i].actions);i=nodes[i].parent;}return rows.reverse().flat();};
 while(front!==-1){
  if(Date.now()>=deadline){stopped='deadline';break;}
  const parent=front,node=nodes[parent];front=node.next;if(front===-1)back=-1;
  if(distances.get(node.key)!==node.cost)continue;result.exploredStates++;
  if(node.state.every(v=>v===REMOVED))return {...result,discoveredStates:distances.size,status:'relaxed-shortcut',
   relaxedNonClearingDrags:node.cost,relaxedActions:routeTo(parent)};
  const visit=(i,v,edge,get)=>{
   result.attemptedTransitions++;const cost=node.cost+edge;if(cost>=floor)return;
   const raw=node.state.slice();raw[i]=v;const next=normalize(raw),key=keyOf(next.state),prior=distances.get(key);
   if(prior!==undefined&&prior<=cost)return;
   if(prior===undefined&&distances.size>=maxStates){stopped='max-states';return false;}
   if(Date.now()>=deadline){stopped='deadline';return false;}
   distances.set(key,cost);const index=nodes.length;
   nodes.push({...next,key,cost,parent,actions:[get(),...next.actions],next:-1});
   if(edge===0){nodes[index].next=front;front=index;if(back===-1)back=index;}
   else{if(back!==-1)nodes[back].next=index;else front=index;back=index;}
  };
  forEachGeneratorGesture(c,node.state,visit);
  if(!stopped)forEachOptionalSpawn(c,node.state,visit);
  if(stopped)break;
 }
 result.discoveredStates=distances.size;
 return stopped?{...result,termination:stopped}:{...result,status:'threshold-proven',thresholdProven:true,termination:'below-threshold-exhausted'};
}
export function verifyFullGeneratorRouteProjection(level,drags,api){
 try{
  const replay=api.replayRevisedRoute(level,drags);assert(replay.valid&&replay.complete);
  const c=compileGeneratorLevel(level,api),model=new api.PuzzleModel(structuredClone(level));model.startCountdown();
  assert.deepEqual(generatorStateFromSnapshot(c,model.snapshot()),c.initial);
  const steps=[];let projectedNonClearingDrags=0;
  for(const [step,d]of drags.entries()){
   const before=model.snapshot(),start=generatorStateFromSnapshot(c,before),i=c.blocks.findIndex(b=>b.id===d.blockId);
   model.beginAction();for(const p of d.path)assert(model.moveBlockStep(d.blockId,...p));
   if(d.exitSide)assert(model.tryExit(d.blockId,d.exitSide).ok);assert(model.commitAction());
   const after=model.snapshot(),end=generatorStateFromSnapshot(c,after),realCost=after.cleared===before.cleared?1:0;
   let cost=start[i]===end[i]?0:Infinity;
   forEachGeneratorGesture(c,start,(j,v,edge)=>{if(j===i&&v===end[i])cost=Math.min(cost,edge);});
   assert(cost<=realCost,'Real gesture missing in optional-spawn graph');
   const projected=start.slice();projected[i]=end[i];
   const pending=new Set(c.blocks.map((_,j)=>j).filter(j=>start[j]===QUEUED&&end[j]!==QUEUED));
   const arrivals=[];
   while(pending.size){
    let found=null;forEachOptionalSpawn(c,projected,(j,v)=>{if(pending.has(j)&&end[j]===v){found={j,v};return false;}});
    assert(found,'Real arrivals not reproducible at final held pose');
    projected[found.j]=found.v;pending.delete(found.j);arrivals.push(c.blocks[found.j].id);
   }
   assert.deepEqual(projected,end);assert.equal(generatorClearCount(c,end),after.cleared);
   projectedNonClearingDrags+=cost;steps.push({step:step+1,blockId:d.blockId,realCost,projectedCost:cost,arrivals});
  }
  assert(generatorStateFromSnapshot(c,model.snapshot()).every(v=>v===REMOVED));
  return {valid:true,sourceLevelSha256:digest(level),routeSha256:digest(drags),steps,projectedNonClearingDrags,
   realNonClearingDrags:replay.nonClearingDrags,lowerBoundCertified:false};
 }catch(e){return {valid:false,error:e.message,lowerBoundCertified:false};}
}
