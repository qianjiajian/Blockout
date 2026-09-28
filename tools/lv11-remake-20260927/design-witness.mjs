import fs from 'node:fs';import path from 'node:path';
import {compileLevel,forEachGesture,clearCount} from '../remake21to30-mask-floor.mjs';
import {equivalentBlockGroups,canonicalStateKey,normalizeMonotoneClears} from '../remake21to30-symmetry-floor-v139.mjs';
export function witness(level,{maxCost=20,maxStates=120000,maxMilliseconds=3000,weight=30}={}){
 const c=compileLevel(level),groups=equivalentBlockGroups(c),k=s=>canonicalStateKey(s,groups),t=Date.now(),initial=normalizeMonotoneClears(c,c.initial),nodes=[{s:initial.state,cost:0,parent:-1,drags:initial.drags}],seen=new Map([[k(initial.state),0]]),heap=[];
 function push(i){const n=nodes[i];const e={i,p:(c.totalClears-clearCount(c,n.s))*weight+n.cost};heap.push(e);let at=heap.length-1;while(at){const p=(at-1)>>1;if(heap[p].p<=e.p)break;heap[at]=heap[p];at=p;}heap[at]=e;}
 function pop(){const first=heap[0],e=heap.pop();if(heap.length){let at=0;while(at*2+1<heap.length){let ch=at*2+1;if(ch+1<heap.length&&heap[ch+1].p<heap[ch].p)ch++;if(heap[ch].p>=e.p)break;heap[at]=heap[ch];at=ch;}heap[at]=e;}return first.i;}
 push(0);let explored=0,transitions=0,bestClears=clearCount(c,initial.state),stop;
 while(heap.length){if(Date.now()-t>=maxMilliseconds){stop='deadline';break;}const idx=pop(),n=nodes[idx];if(seen.get(k(n.s))!==n.cost)continue;explored++;const cleared=clearCount(c,n.s);bestClears=Math.max(bestClears,cleared);if(cleared===c.totalClears){const seg=[];let at=idx;while(at>=0){seg.push(nodes[at].drags);at=nodes[at].parent;}return{status:'witness',cost:n.cost,drags:seg.reverse().flat(),explored,discovered:seen.size,transitions,milliseconds:Date.now()-t};}
 forEachGesture(c,n.s,(bi,value,edge,get)=>{transitions++;const cost=n.cost+edge;if(cost>maxCost)return;const raw=n.s.slice();raw[bi]=value;const rawKey=k(raw);if(seen.has(rawKey)&&seen.get(rawKey)<=cost)return;const norm=normalizeMonotoneClears(c,raw),key=k(norm.state);if(seen.has(key)&&seen.get(key)<=cost)return;if(seen.size>=maxStates||Date.now()-t>=maxMilliseconds){stop=seen.size>=maxStates?'max-states':'deadline';return false;}seen.set(key,cost);nodes.push({s:norm.state,cost,parent:idx,drags:[get(),...norm.drags]});push(nodes.length-1);});if(stop)break;
 }
 return{status:'unknown',termination:stop??'restricted-cost-exhausted',bestClears,explored,discovered:seen.size,transitions,milliseconds:Date.now()-t};
}
if(process.argv[1]?.endsWith('design-witness.mjs')){
 const root='deliverables/lv11-remake-20260927/design-witness-'+Date.now();fs.mkdirSync(root,{recursive:true});
 const inputs=process.argv.slice(2),list=[];
 for(const input of inputs){const stat=fs.statSync(input);if(stat.isDirectory()){for(const name of fs.readdirSync(input))if(/^attempt-.*\.json$/.test(name)){const f=path.join(input,name),raw=JSON.parse(fs.readFileSync(f));if(raw.native?.status==='unknown')list.push({file:f,raw});}}else list.push({file:input,raw:JSON.parse(fs.readFileSync(input))});}
 list.sort((a,b)=>(b.raw.native?.discoveredStates??0)-(a.raw.native?.discoveredStates??0));
 let best=0;for(const[fileIndex,{file,raw}]of list.entries()){
  const result=witness(raw.level),drags=result.drags??[],nc=drags.filter(d=>!d.exitSide),multi=nc.filter(d=>raw.level.blocks.find(b=>b.id===d.blockId).shape.length>1).length;
  const target=path.join(root,'witness-'+fileIndex+'.json');fs.writeFileSync(target,JSON.stringify({source:file,level:raw.level,result,drags,multi,single:nc.length-multi},null,2));
  console.log(JSON.stringify({target,status:result.status,cost:result.cost,multi,single:nc.length-multi,bestClears:result.bestClears}));if(result.drags&&result.cost>=16)break;
  if(fileIndex>=60)break;
 }
 console.log(JSON.stringify({root,total:list.length}));
}
