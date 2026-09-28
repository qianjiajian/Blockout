/**
 * v1.39 search acceleration only: exact quotient of the qualified optional-exit
 * graph under permutations of mechanically indistinguishable block identities.
 *
 * A group has identical normalized footprint, layer colors, ice and reveal
 * phase/owner. Consequently every pose mask, neighbor, exit, clear contribution
 * and enabled test agrees. Swapping its position/stage bytes preserves occupied
 * cells and all counters; every edge has a swapped edge of identical cost.
 * Goal membership also agrees. Hence the quotient preserves the relaxed optimum,
 * rather than pruning by a heuristic or by a proposed solution ordering.
 *
 * Only visited KEYS are canonicalized. Nodes retain real labeled states and
 * parents, so returned shortcut witnesses never teleport or rename actual blocks.
 * The previous search/qualifier remains immutable, with UNKNOWN budget behavior.
 */
import {compileLevel,forEachGesture,clearCount,stateKey} from '../../../remake21to30-mask-floor.mjs';

export function equivalentBlockGroups(c){
  const groups=new Map();
  for(const [i,b]of c.blocks.entries()){
    const signature=JSON.stringify({shape:[...b.shape].sort((a,b)=>a[0]-b[0]||a[1]-b[1]),
      layers:b.layers,ice:b.ice,revealAt:b.revealAt,owner:b.cover?.id??null});
    if(!groups.has(signature))groups.set(signature,[]);
    groups.get(signature).push(i);
  }
  return [...groups.values()].filter(group=>group.length>1);
}
export function canonicalStateKey(state,groups){
  if(!groups.length)return stateKey(state);
  const normalized=state.slice();
  for(const group of groups){
    const values=group.map(i=>state[i]).sort((a,b)=>a-b);
    for(let j=0;j<group.length;j++)normalized[group[j]]=values[j];
  }
  return stateKey(normalized);
}
/**
 * Once ALL covers have revealed, a reachable final-body removal can be done
 * immediately at zero reposition cost: it only vacates cells and decreases
 * remaining gate/ice counters. In the optional-exit graph there is no forced
 * contact penalty and no future spawn, so it cannot invalidate another path.
 * Given any solution, remove this body first and omit its later actions; every
 * other action stays legal and cost cannot increase. Conversely the recorded
 * zero-cost prefix followed by any suffix is an original-graph solution.
 * Do NOT force shell peels (they relocate occupancy), or any pre-reveal clear.
 */
export function normalizeMonotoneSuffix(c,input){
  if(c.covers.some(cover=>clearCount(c,input)<cover.count))return {state:input,drags:[]};
  return normalizeMonotoneClears(c,input);
}
/**
 * The same exchange argument also covers unrevealed COUNTDOWN curtains in the
 * compiler's restricted domain. Every hidden footprint is contained in its
 * closed cover. A reveal therefore replaces a forbidden whole-region mask with
 * a SUBSET of that mask, never with a new obstacle outside it. After pre-clearing
 * a removable body, replay any old solution while omitting that body's actions:
 * clears are always >= the old count, gates/ice no stricter, and newly revealed
 * bodies can stay still until the old reveal. Paths formerly outside the closed
 * region remain free; after both reveals their footprints agree. At the omitted
 * old body-clear event the one-event lead disappears, never becomes negative.
 * Hidden ice depends on clearCount - fixed revealAt, so it is never older in the
 * harder direction. No lifts, generators, flip gates, keys or timed events are
 * admitted. Crucially, this does not apply to shell peels that relocate a body.
 */
export function normalizeMonotoneClears(c,input){
  let state=input;const drags=[];
  for(;;){
    let selected;
    forEachGesture(c,state,(i,v,cost,get)=>{
      if(cost===0&&v===255){selected={i,v,drag:get()};return false;}
    });
    if(!selected)return {state,drags};
    state=state.slice();state[selected.i]=selected.v;drags.push(selected.drag);
  }
}
export function checkPrefixFloor(level,options={}){
  const floor=options.floor??15,maxStates=options.maxStates??200000,maxMilliseconds=options.maxMilliseconds??30000;
  const result={status:'unknown',thresholdProven:false,floor,exploredStates:0,discoveredStates:0,attemptedTransitions:0,
    abstraction:'remake-mask96-countdown-optional-exit-identity-quotient-monotone-clears-v139',
    solvabilityValidated:false,timeValidated:false,pointerReplayValidated:false};
  if(![floor,maxStates,maxMilliseconds].every(n=>Number.isSafeInteger(n)&&n>0))return {...result,status:'invalid',reason:'Invalid positive integer budget'};
  if(!Number.isSafeInteger(options.targetClears)||options.targetClears<=0)return {...result,status:'invalid',reason:'Positive targetClears required'};
  result.targetClears=options.targetClears;
  let c;
  try{c=compileLevel(level);}catch(error){return {...result,status:'unsupported',reason:error.message};}
  if(options.targetClears>c.totalClears)return {...result,status:'invalid',reason:'Target exceeds full inventory'};
  const groups=equivalentBlockGroups(c),keyOf=state=>canonicalStateKey(state,groups);
  const normalize=options.monotoneSuffix===false?state=>({state,drags:[]}):state=>normalizeMonotoneClears(c,state);
  result.symmetryGroups=groups.map(indices=>indices.map(i=>c.blocks[i].id));
  result.monotoneSuffix=options.monotoneSuffix!==false;
  result.monotoneCountdownClears=options.monotoneSuffix!==false;
  const deadline=Date.now()+maxMilliseconds,initial=normalize(c.initial),initialKey=keyOf(initial.state),distances=new Map([[initialKey,0]]);
  const nodes=[{state:initial.state,key:initialKey,cost:0,parent:-1,drags:initial.drags,next:-1}];
  let front=0,back=0,stopped=null;
  const routeTo=index=>{const segments=[];while(index!==-1){segments.push(nodes[index].drags);index=nodes[index].parent;}return segments.reverse().flat();};
  while(front!==-1){
    if(Date.now()>=deadline){stopped='deadline';break;}
    const parent=front,node=nodes[parent];front=node.next;if(front===-1)back=-1;
    if(distances.get(node.key)!==node.cost)continue;
    result.exploredStates++;
    if(clearCount(c,node.state)>=options.targetClears)return {...result,discoveredStates:distances.size,status:'relaxed-shortcut',
      relaxedNonClearingDrags:node.cost,relaxedRoute:routeTo(parent),termination:'relaxed-completion'};
    forEachGesture(c,node.state,(index,value,edgeCost,getDrag)=>{
      result.attemptedTransitions++;
      const cost=node.cost+edgeCost;if(cost>=floor)return;
      const moved=node.state.slice();moved[index]=value;
      const forced=normalize(moved),state=forced.state;
      const key=keyOf(state),prior=distances.get(key);
      if(prior!==undefined&&prior<=cost)return;
      if(prior===undefined&&distances.size>=maxStates){stopped='max-states';return false;}
      if(Date.now()>=deadline){stopped='deadline';return false;}
      distances.set(key,cost);const id=nodes.length;
      nodes.push({state,key,cost,parent,drags:[getDrag(),...forced.drags],next:-1});
      if(edgeCost===0){nodes[id].next=front;front=id;if(back===-1)back=id;}
      else{if(back!==-1)nodes[back].next=id;else front=id;back=id;}
    });
    if(stopped)break;
  }
  result.discoveredStates=distances.size;
  return stopped?{...result,termination:stopped}:{...result,status:'threshold-proven',thresholdProven:true,termination:'below-threshold-exhausted'};
}

// Only the goal predicate differs from the frozen v139 graph. Reaching k clears
// relaxes full completion, so exhausting all cost<floor paths to k clears is
// sufficient for the same full-completion lower bound. Full route is separate.
