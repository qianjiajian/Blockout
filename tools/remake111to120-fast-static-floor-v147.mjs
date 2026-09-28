import assert from 'node:assert/strict';
import {compileStatic} from './remake111to120-static-floor-v147.mjs';
import {forEachGesture,clearCount,stateKey} from './remake21to30-mask-floor.mjs';
import {canonicalStateKey,normalizeMonotoneClears} from './remake21to30-symmetry-floor-v139.mjs';
// Lossless 3-word/byte encoding of the already-qualified static domain. A
// single portal per pose/stage is required; every star/axis edge is compiled
// by authoritative geometry before encoding. Reject keys and future inventory.
export function compileFastStatic(level,api){
 const c=compileStatic(level,api);assert(c.W*c.H<=96);
 for(const b of c.blocks)assert(!b.keyId&&!b.lockedBy&&!b.lockCount,'Keys need the full domain');
 return {...c,initial:Uint8Array.from(c.initial),blocks:c.blocks.map(b=>({...b,revealAt:0,poses:b.poses.map(p=>!p?null:{...p,mask:[p.mask[0]??0,p.mask[1]??0,p.mask[2]??0],exits:p.exits.map(list=>{assert(list.length<=1,'Multiple possible portals need the full domain');return list.length?{...list[0].gate,side:list[0].side,frozen:list[0].gate.frozen??0}:null;})})}))};
}
export function checkFastStaticFloor(level,api,options={}){
  const floor=options.floor??15,maxStates=options.maxStates??200000,maxMilliseconds=options.maxMilliseconds??30000;
  const result={status:'unknown',thresholdProven:false,floor,exploredStates:0,discoveredStates:0,attemptedTransitions:0,
    abstraction:'qualified-static-star-axis-mask96-v147',
    solvabilityValidated:false,timeValidated:false,pointerReplayValidated:false};
  if(![floor,maxStates,maxMilliseconds].every(n=>Number.isSafeInteger(n)&&n>0))return {...result,status:'invalid',reason:'Invalid positive integer budget'};
  let c;
  try{c=compileFastStatic(level,api);}catch(error){return {...result,status:'unsupported',reason:error.message};}
  const groups=c.groups,keyOf=state=>canonicalStateKey(state,groups);
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
    result.exploredStates++;result.maxExpandedCost=Math.max(result.maxExpandedCost??0,node.cost);
    if(clearCount(c,node.state)===c.totalClears)return {...result,discoveredStates:distances.size,status:'relaxed-shortcut',
      relaxedNonClearingDrags:node.cost,relaxedRoute:routeTo(parent),termination:'relaxed-completion'};
    forEachGesture(c,node.state,(index,value,edgeCost,getDrag)=>{
      result.attemptedTransitions++;
      const cost=node.cost+edgeCost;if(cost>=floor)return;
      const moved=node.state.slice();moved[index]=value;
      const rawPrior=distances.get(keyOf(moved));if(rawPrior!==undefined&&rawPrior<=cost)return;
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
