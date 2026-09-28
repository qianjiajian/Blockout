import {compile,each,clearCount} from '../../lv061-070/automatic-generator-floor.mjs';
// Discovery adapter: old domain's ID allowlist is mapped to70 only for compiling
// equivalent mechanics. No lower-bound claim is made. Original ID138 is replayed
// against the current authoritative model before this can become a witness.
export function fastGeneratorWitness(level,api,{maxMilliseconds=5000,maxStates=40000,orderSeed=0}={}){
 let c;try{c=compile({...level,id:70},api);}catch(e){return{status:'unsupported',reason:e.message};}
 const end=Date.now()+maxMilliseconds,key=s=>String.fromCharCode(...s),nodes=[{s:c.initial,parent:-1,cost:0,clears:clearCount(c,c.initial)}],open=[0],seen=new Set([key(c.initial)]);let explored=0;
 const score=i=>nodes[i].clears*100-nodes[i].cost;
 const push=i=>{open.push(i);for(let p=open.length-1;p>0;){const q=(p-1)>>1;if(score(open[q])>=score(open[p]))break;[open[p],open[q]]=[open[q],open[p]];p=q;}};
 const pop=()=>{const a=open[0],last=open.pop();if(open.length){open[0]=last;for(let p=0;p*2+1<open.length;){let q=p*2+1;if(q+1<open.length&&score(open[q+1])>score(open[q]))q++;if(score(open[p])>=score(open[q]))break;[open[p],open[q]]=[open[q],open[p]];p=q;}}return a;};
 while(open.length&&Date.now()<end&&seen.size<maxStates){const p=pop(),n=nodes[p];explored++;if(n.clears===c.total){const drags=[];let i=p;while(nodes[i].parent>=0){drags.push(nodes[i].drag);i=nodes[i].parent;}return{status:'witness',drags:drags.reverse(),cost:n.cost,explored};}
  each(c,n.s,(s,cost,get)=>{if(Date.now()>=end||seen.size>=maxStates)return false;const k=key(s);if(seen.has(k))return;seen.add(k);nodes.push({s,parent:p,drag:get(),cost:n.cost+cost,clears:clearCount(c,s)});push(nodes.length-1);},{orderSeed,optionalExit:false});}
 return{status:'unknown',termination:!open.length?'search-exhausted':Date.now()>=end?'deadline':'max-states',explored,discovered:seen.size};
}
