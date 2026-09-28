import {compileLevel,forEachGesture,clearCount,stateKey} from '../../../remake21to30-mask-floor.mjs';
import {normalizeMonotoneClears,equivalentBlockGroups,canonicalStateKey} from '../../../remake21to30-symmetry-floor-v139.mjs';
// Candidate discovery only. Optional exits cannot certify Pointer input; every result requires authoritative replay.
export function fastWitness(level,{maxMilliseconds=3000,maxStates=50000}={}){
 let c;try{c=compileLevel(level);}catch(e){return{status:'unsupported',reason:e.message};}
 const end=Date.now()+maxMilliseconds,groups=equivalentBlockGroups(c),initial=normalizeMonotoneClears(c,c.initial),key=s=>canonicalStateKey(s,groups);
 const nodes=[{state:initial.state,parent:-1,drags:initial.drags,cost:0}],seen=new Set([key(initial.state)]),open=[0];let explored=0;
 while(open.length&&Date.now()<end&&seen.size<maxStates){
  open.sort((a,b)=>clearCount(c,nodes[b].state)-clearCount(c,nodes[a].state)||nodes[a].cost-nodes[b].cost);const p=open.shift(),node=nodes[p];explored++;
  if(clearCount(c,node.state)===c.totalClears){const seg=[];let n=p;while(n>=0){seg.push(nodes[n].drags);n=nodes[n].parent;}return{status:'witness',drags:seg.reverse().flat(),cost:node.cost,explored};}
  forEachGesture(c,node.state,(i,v,cost,get)=>{if(Date.now()>=end||seen.size>=maxStates)return false;const s=node.state.slice();s[i]=v;const norm=normalizeMonotoneClears(c,s),k=key(norm.state);if(seen.has(k))return;seen.add(k);nodes.push({state:norm.state,parent:p,drags:[get(),...norm.drags],cost:node.cost+cost});open.push(nodes.length-1);});
 }
 return{status:'unknown',termination:!open.length?'search-exhausted':Date.now()>=end?'deadline':'max-states',explored,discovered:seen.size};
}
