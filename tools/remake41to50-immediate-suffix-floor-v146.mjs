/** Isolated empty-queue suffix optimization. Qualified on complete finite graphs; fresh per-level proof remains required.
 * If any QUEUED byte exists, no clearing/spawning normalization is applied.
 * With no queued cargo, all future occupancy changes are removal, peel, or
 * countdown reveal wholly inside a formerly forbidden region. The existing
 * full-body-only monotone exchange proof applies without altering counters.
 */
import assert from 'node:assert/strict';
import {compileGeneratorLevel,generatorClearCount,generatorStateFromSnapshot} from './remake41to50-full-generator-floor-v146.mjs';
import {canonicalStateKey,normalizeMonotoneClears} from './remake21to30-symmetry-floor-v139.mjs';
import {digest} from './revised-preview-validation-v160.mjs';
const Q=254,R=255,key=s=>String.fromCharCode(...s);
// Complete inventory and deterministic FIFO arrivals after EVERY unit step and
// clear. The only spatial relaxation is optional exit contact; no clearing or
// spawning normalization is sound here. Inner closure keys include all cargo.
export function immediateOccupancy(c,s,except=-1){
 const n=generatorClearCount(c,s),occ=[0,0,0];
 for(const cover of c.covers)if(n<cover.count)for(let k=0;k<3;k++)occ[k]|=cover.mask[k];
 for(let i=0;i<s.length;i++)if(i!==except&&s[i]!==Q&&s[i]!==R&&n>=c.blocks[i].revealAt){const m=c.blocks[i].poses[s[i]&127].mask;for(let k=0;k<3;k++)occ[k]|=m[k];}
 return occ;
}
export function settleImmediateGenerators(c,input){
 const s=input.slice(),occ=immediateOccupancy(c,s);let changed;
 do{changed=false;for(const g of c.generators){const i=g.indices.find(i=>s[i]===Q);if(i===undefined)continue;const b=c.blocks[i],m=b.poses[b.initial].mask;
  if(m.some((v,k)=>v&occ[k]))continue;s[i]=b.initial;for(let k=0;k<3;k++)occ[k]|=m[k];changed=true;
 }}while(changed);return s;
}
export function forEachImmediateGeneratorGesture(c,s,visit,guard=()=>{}){
 const cleared=generatorClearCount(c,s);
 for(let i=0;i<s.length;i++){
  const b=c.blocks[i],v=s[i];if(v===Q||v===R||cleared<b.revealAt+b.ice)continue;
  const stage=v>>7,nodes=[{state:s,parent:-1}],seen=new Set([key(s)]);
  const drag=(j,side)=>{const path=[];while(nodes[j].parent>=0){const p=nodes[j].state[i]&127;path.push([p%c.W,Math.floor(p/c.W)]);j=nodes[j].parent;}return {blockId:b.id,path:path.reverse(),...(side?{exitSide:side}:{})};};
  for(let j=0;j<nodes.length;j++){
   guard();const cur=nodes[j].state,p=cur[i]&127,pose=b.poses[p],gate=pose.exits[stage];
   if(j>0&&visit(cur,1,()=>drag(j))===false)return;
   if(gate&&cleared>=gate.frozen){const after=cur.slice();after[i]=stage+1<b.layers.length?p|((stage+1)<<7):R;
    if(visit(settleImmediateGenerators(c,after),0,()=>drag(j,gate.side))===false)return;}
   const occ=immediateOccupancy(c,cur,i);
   for(const to of pose.neighbors){if(b.poses[to].mask.some((v,k)=>v&occ[k]))continue;const moved=cur.slice();moved[i]=to|(stage<<7);const next=settleImmediateGenerators(c,moved),k=key(next);
    if(seen.has(k))continue;seen.add(k);nodes.push({state:next,parent:j});}
  }
 }
}
export function normalizeCompletedInventorySuffix(c,state,enabled=true){return !enabled||state.some(v=>v===Q)?{state,drags:[]}:normalizeMonotoneClears(c,state);}
export function checkImmediateGeneratorSuffixFloor(level,api,options={}){
 const floor=options.floor??5,maxStates=options.maxStates??1000000,maxMilliseconds=options.maxMilliseconds??60000;
 const result={status:'unknown',thresholdProven:false,floor,abstraction:'immediate-fifo-full-world-optional-exit-empty-queue-monotone-suffix-v1',sourceLevelSha256:digest(level),exploredStates:0,discoveredStates:0,attemptedTransitions:0,solvabilityValidated:false,pointerReplayValidated:false,timeValidated:false};
 if(![floor,maxStates,maxMilliseconds].every(n=>Number.isSafeInteger(n)&&n>0))return {...result,status:'invalid'};
 let c;try{c=compileGeneratorLevel(level,api);}catch(e){return {...result,status:'unsupported',reason:e.message};}
 const normalize=state=>normalizeCompletedInventorySuffix(c,state,options.normalize!==false);
 const keyOf=options.symmetry===false?key:s=>canonicalStateKey(s,c.groups),start=normalize(c.initial),initial=start.state,key0=keyOf(initial),nodes=[{state:initial,key:key0,cost:0,parent:-1,next:-1,drags:start.drags}],dist=new Map([[key0,0]]),deadline=Date.now()+maxMilliseconds;
 let front=0,back=0,stopped=null;const route=i=>{const a=[];while(nodes[i].parent>=0){a.push(nodes[i].drags);i=nodes[i].parent;}return [start.drags,...a.reverse()].flat();};
 const guard=()=>{if(Date.now()>=deadline)throw Error('deadline');};
 try{while(front!==-1){
  guard();const parent=front,n=nodes[parent];front=n.next;if(front===-1)back=-1;if(dist.get(n.key)!==n.cost)continue;result.exploredStates++;result.maxExpandedCost=Math.max(result.maxExpandedCost??0,n.cost);
  if(n.state.every(v=>v===R))return {...result,discoveredStates:dist.size,status:'relaxed-shortcut',relaxedNonClearingDrags:n.cost,relaxedRoute:route(parent)};
  forEachImmediateGeneratorGesture(c,n.state,(state,edge,get)=>{
   result.attemptedTransitions++;const cost=n.cost+edge;if(cost>=floor)return;const suffix=normalize(state);state=suffix.state;const k=keyOf(state),prior=dist.get(k);if(prior!==undefined&&prior<=cost)return;
   if(prior===undefined&&dist.size>=maxStates)throw Error('max-states');guard();dist.set(k,cost);const index=nodes.length;
   nodes.push({state,key:k,cost,parent,next:-1,drags:[get(),...suffix.drags]});
   if(edge===0){nodes[index].next=front;front=index;if(back===-1)back=index;}
   else{if(back===-1)front=index;else nodes[back].next=index;back=index;}
  },guard);
 }}catch(e){if(!['deadline','max-states'].includes(e.message))throw e;stopped=e.message;}
 return {...result,discoveredStates:dist.size,...(stopped?{termination:stopped}:{status:'threshold-proven',thresholdProven:true,termination:'below-threshold-exhausted'})};
}
export function verifyImmediateGeneratorRoute(level,drags,api){
 try{
  const replay=api.replayRevisedRoute(level,drags);assert(replay.valid&&replay.complete,'Full actual replay required');
  const c=compileGeneratorLevel(level,api),model=new api.PuzzleModel(structuredClone(level));model.startCountdown();let unitSteps=0;
  for(const d of drags){const before=model.snapshot(),s=generatorStateFromSnapshot(c,before),i=c.blocks.findIndex(b=>b.id===d.blockId);let predicted=s;
   model.beginAction();for(const [x,y]of d.path){assert(model.moveBlockStep(d.blockId,x,y));const next=predicted.slice();next[i]=(y*c.W+x)|(next[i]&128);predicted=settleImmediateGenerators(c,next);assert.deepEqual(predicted,generatorStateFromSnapshot(c,model.snapshot()),'Per-unit FIFO state');unitSteps++;}
   if(d.exitSide){assert(model.tryExit(d.blockId,d.exitSide).ok);const next=predicted.slice(),stage=next[i]>>7;next[i]=stage+1<c.blocks[i].layers.length?(next[i]&127)|((stage+1)<<7):R;predicted=settleImmediateGenerators(c,next);}
   assert(model.commitAction());const end=generatorStateFromSnapshot(c,model.snapshot());assert.deepEqual(predicted,end,'Clear/reveal FIFO state');const cost=before.cleared===model.snapshot().cleared?1:0;let found=false;
   forEachImmediateGeneratorGesture(c,s,(next,edge)=>{if(edge===cost&&key(next)===key(end)){found=true;return false;}});assert(found,'Complete held gesture missing');
  }
  return {valid:true,levelSha256:digest(level),routeSha256:digest(drags),unitSteps,drags:drags.length,nonClearingDrags:replay.nonClearingDrags,lowerBoundCertified:false};
 }catch(e){return {valid:false,error:e.message,lowerBoundCertified:false};}
}
