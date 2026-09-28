// Counterexample search only. A budget stop never proves a difficulty floor.
import fs from 'node:fs';
import {compileLevel,clearCount} from './remake21to30-mask-floor.mjs';
import {engine} from '../deliverables/remake31-40-v146-20260924/agent31-34/fast-floor.mjs';
import {residualKeyer} from '../deliverables/remake31-40-v146-20260924/agent31-34/residual-floor.mjs';
import {digest} from './revised-preview-validation-v160.mjs';
const [file]=process.argv.slice(2),data=JSON.parse(fs.readFileSync(file)),c=compileLevel(data.level),e=engine(c),total=c.blocks.reduce((n,b)=>n+b.layers.length,0);
for(const weight of [0.5,1,2,4]){
 const keyOf=residualKeyer(c),heap=[],nodes=[],best=new Map(),start=Date.now(),deadline=start+45000;let expanded=0,found=null;
 const push=(s,cost,parent,action)=>{const k=keyOf(s),prior=best.get(k);if(prior!==undefined&&prior<=cost)return;best.set(k,cost);const id=nodes.length,score=cost+weight*(total-clearCount(c,s));nodes.push({s,k,cost,parent,action,score});let i=heap.length;heap.push(id);while(i){const p=(i-1)>>1;if(nodes[heap[p]].score<=score)break;heap[i]=heap[p];i=p;}heap[i]=id;};
 const pop=()=>{const id=heap[0],last=heap.pop();if(heap.length){let i=0;while(i*2+1<heap.length){let j=i*2+1;if(j+1<heap.length&&nodes[heap[j+1]].score<nodes[heap[j]].score)j++;if(nodes[last].score<=nodes[heap[j]].score)break;heap[i]=heap[j];i=j;}heap[i]=last;}return id;};
 push(e.normalize(c.initial),0,-1,null);
 while(heap.length&&best.size<700000&&Date.now()<deadline){const id=pop(),n=nodes[id];if(best.get(n.k)!==n.cost)continue;expanded++;if(n.s.every(v=>v===255)){found=id;break;}
  e.each(n.s,(i,v,edge)=>{const cost=n.cost+edge;if(cost>=16)return;const s=n.s.slice();s[i]=v;push(e.normalize(s),cost,id,{i,v,edge});if(best.size>=700000||Date.now()>=deadline)return false;});
 }
 const actions=[];if(found!==null){let p=found;while(nodes[p].parent!==-1){actions.push(nodes[p].action);p=nodes[p].parent;}actions.reverse();let s=e.normalize(c.initial),cost=0;for(const a of actions){let matched=false;e.each(s,(i,v,edge)=>{if(i===a.i&&v===a.v&&edge===a.edge){matched=true;return false;}});if(!matched)throw Error('Counterexample edge missing');s=s.slice();s[a.i]=a.v;s=e.normalize(s);cost+=a.edge;}if(!s.every(v=>v===255)||cost>=16)throw Error('Incomplete counterexample');}
 const result={input:file,levelSha256:digest(data.level),status:found===null?'unknown':'relaxed-shortcut',thresholdProven:false,relaxedNonClearingDrags:found===null?null:nodes[found].cost,weight,expanded,states:best.size,elapsedMilliseconds:Date.now()-start,actions};
 const out=`deliverables/remake31-40-v146-20260924/root-proof/shortcut34-${Date.now()}.json`;fs.writeFileSync(out,JSON.stringify(result,null,2));console.log(JSON.stringify({...result,actions:undefined,out}));if(found!==null)break;
}
