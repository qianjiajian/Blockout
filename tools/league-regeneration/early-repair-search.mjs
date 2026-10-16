import { build } from 'esbuild';
import { loadSpatialApi, searchSpatial } from '../continuation211-colored-witness.mjs';
import { loadContinuationRuntime } from '../continuation211-runtime.mjs';
const bundle=await build({stdin:{resolveDir:process.cwd(),loader:'ts',contents:`export { LEVELS } from './src/core/levels.ts';`},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'});
const {LEVELS}=await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`); const spatial=await loadSpatialApi(),runtime=await loadContinuationRuntime();
const clone=x=>structuredClone(x), cells=b=>b.shape.map(([dx,dy])=>[b.x+dx,b.y+dy]), key=p=>p.join(',');
const rand=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
function strip(level,index){const l=clone(level);if(index<6)for(const g of l.gates??[])delete g.frozen;for(const b of l.blocks??[]){if(index<10)delete b.frozen;delete b.layers;delete b.keyId;delete b.lockedBy;delete b.lockCount;delete b.shutterId}delete l.shutters;l.mechanismRules='revised-2026-09-27-v1.5';l.id=600000+index;l.name=`early-repair-${index}`;l.timeSeconds=180;l.reward=0;return l}
function q0(l){const legal=new Set((l.playable??[]).map(key)),occ=new Map();for(const b of l.blocks)for(const p of cells(b)){const a=occ.get(key(p))??[];a.push(b.id);occ.set(key(p),a)}const adj=[];for(let i=0;i<l.blocks.length;i++)for(let j=i+1;j<l.blocks.length;j++){const a=l.blocks[i],b=l.blocks[j];if(a.color!==b.color)continue;if(cells(a).some(p=>cells(b).some(z=>Math.abs(p[0]-z[0])+Math.abs(p[1]-z[1])===1)))adj.push([a.id,b.id])}return{missing:[...legal].filter(k=>!occ.has(k)),overlap:[...occ.values()].filter(a=>a.length!==1),adj}}
function recolor(l, colors){
  const A=new Map(l.blocks.map(b=>[b.id,new Set()]));
  for(let i=0;i<l.blocks.length;i++)for(let j=i+1;j<l.blocks.length;j++){const a=l.blocks[i],b=l.blocks[j];if(cells(a).some(p=>cells(b).some(z=>Math.abs(p[0]-z[0])+Math.abs(p[1]-z[1])===1))){A.get(a.id).add(b.id);A.get(b.id).add(a.id)}}
  const C=new Map();
  const solve=()=>{if(C.size===l.blocks.length)return true;let choice=null,best=-1;for(const b of l.blocks)if(!C.has(b.id)){const sat=new Set([...A.get(b.id)].map(id=>C.get(id)).filter(Boolean)).size;if(sat>best||sat===best&&(choice==null||A.get(b.id).size>A.get(choice.id).size)){choice=b;best=sat}}const used=new Set([...A.get(choice.id)].map(id=>C.get(id)).filter(Boolean));for(const c of colors){if(used.has(c))continue;C.set(choice.id,c);if(solve())return true;C.delete(choice.id)}return false};
  if(!solve())return false;for(const b of l.blocks)b.color=C.get(b.id);return true
}
function mutate(base,index,attempt){const l=strip(base,index),r=rand(index*1000+attempt);const colors=[...new Set(l.gates.map(g=>g.color))];
  // Assign gates evenly across the four sides; this keeps every candidate valid.
  const sides=['top','right','bottom','left']; const order=l.gates.map((_,i)=>sides[i%4]).sort(()=>r()-.5);
  const taken=new Map(); l.gates.forEach((g,i)=>{g.side=order[i]; const span=g.side==='top'||g.side==='bottom'?l.width:l.height; const possible=[]; for(let off=0;off<=span-g.size;off++) possible.push(off); const arr=taken.get(g.side)??[]; const free=possible.filter(off=>!arr.some(x=>off<x+g.size&&x<off+g.size)); if(!free.length)return null; g.offset=free[Math.floor(r()*free.length)]; arr.push(g.offset); taken.set(g.side,arr);});

  // Shuffle positions only among identical silhouettes, preserving every covered cell.
  const groups=new Map(); for(const b of l.blocks){const k=JSON.stringify(b.shape);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(b)}
  for(const g of groups.values()) if(g.length>1){const poses=g.map(b=>[b.x,b.y]).sort(()=>r()-.5);g.forEach((b,i)=>{[b.x,b.y]=poses[i]})}
  // Force a real color mutation after geometry changes; graph recolor enforces Q0.
  if(!recolor(l,colors)) return null; return l;
}
const indexes=[1,2,4,5,13,18];
for(const index of indexes){const source=198,target=index===13||index===18?[21,30]:[16,20];const base=LEVELS[source-1];let rows=[];for(let a=0;a<24;a++){const l=mutate(base,index,a);if(!l){console.log(JSON.stringify({index,attempt:a,reason:'mutate-null'}));continue;}const q=q0(l);if(q.missing.length||q.overlap.length||q.adj.length)continue;let route;try{route=searchSpatial(l,spatial,{floor:target[1]+1,maxStates:350000,maxTransitions:1800000,maxMilliseconds:2000,normalize:true,orderSeed:index*100+a})}catch(e){rows.push({attempt:a,status:'error',error:String(e.message)});continue}const r={attempt:a,status:route.status,cost:route.cost??null,termination:route.termination??null,reason:route.reason??null,U:route.cost??null,states:route.exploredStates??null,transitions:route.attemptedTransitions??null};if(route.status==='witness'){const rep=runtime.replayRevisedRoute(l,route.drags);r.replay={valid:rep.valid,complete:rep.complete,U:rep.nonClearingDrags};if(rep.valid&&rep.complete&&rep.nonClearingDrags>=target[0]&&rep.nonClearingDrags<=target[1]){const p=searchSpatial(l,spatial,{floor:target[0],prove:true,maxStates:650000,maxTransitions:3500000,maxMilliseconds:10000,normalize:false,orderSeed:index*100+a});r.proof={status:p.status,thresholdProven:p.thresholdProven,termination:p.termination,sourceLevelSha256:p.sourceLevelSha256};if(p.thresholdProven){r.accepted=true;r.level=l;r.drags=route.drags;r.replayFull=rep;rows.push(r);console.log(JSON.stringify({index,ACCEPTED:a,U:rep.nonClearingDrags,L:p.status}));break}}}rows.push(r);console.log(JSON.stringify({index,...r}));}
console.log(JSON.stringify({index,rows:rows.map(r=>({attempt:r.attempt,status:r.status,cost:r.cost,termination:r.termination,U:r.replay?.U,accepted:r.accepted,proof:r.proof?.status}))}));}
