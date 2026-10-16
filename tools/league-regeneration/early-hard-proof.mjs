import fs from 'node:fs';
import { build } from 'esbuild';
import { createHash } from 'node:crypto';
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

const sha=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const candidates={1:10,2:14,4:11,5:23};
const rows=[];
for(const [ix,att] of Object.entries(candidates)){const index=Number(ix),target=[16,20],base=LEVELS[197],level=mutate(base,index,att);if(!level){rows.push({index,status:'BLOCKED',reason:'mutation-null'});continue}const q=q0(level);const row={index,attempt:att,sourceLevelId:198,target:{lower:16,upper:20},q0:q,status:'BLOCKED',levelSha256:sha(level)};if(q.missing.length||q.overlap.length||q.adj.length){row.reasons=['q0-failed'];rows.push(row);continue}const route=searchSpatial(level,spatial,{floor:21,maxStates:800000,maxTransitions:5000000,maxMilliseconds:8000,normalize:true,orderSeed:index*100+att});row.route={status:route.status,cost:route.cost??null,termination:route.termination??null,sourceLevelSha256:route.sourceLevelSha256??null};if(route.status!=='witness'){row.reasons=['route-'+route.status];rows.push(row);continue}const rep=runtime.replayRevisedRoute(level,route.drags);row.replay={valid:rep.valid,complete:rep.complete,nonClearingDrags:rep.nonClearingDrags};row.level=level;row.drags=route.drags;if(!rep.valid||!rep.complete||rep.nonClearingDrags<16||rep.nonClearingDrags>20){row.reasons=['route-out-of-band'];rows.push(row);continue}const proof=searchSpatial(level,spatial,{floor:16,prove:true,maxStates:2500000,maxTransitions:12000000,maxMilliseconds:20000,normalize:false,orderSeed:index*100+att});row.lowerBound={status:proof.status,thresholdProven:proof.thresholdProven===true,termination:proof.termination??null,sourceLevelSha256:proof.sourceLevelSha256??null,states:proof.exploredStates??null,transitions:proof.attemptedTransitions??null};if(proof.thresholdProven!==true){row.reasons=['lower-not-proven'];rows.push(row);continue}row.status='ROUTE_AND_LOWER_READY';row.level=level;row.drags=route.drags;rows.push(row);console.log(JSON.stringify({index,status:row.status,U:rep.nonClearingDrags,L:proof.status}));}
fs.mkdirSync('deliverables/league-regeneration-20261006/early-repair',{recursive:true});fs.writeFileSync('deliverables/league-regeneration-20261006/early-repair/hard-proof-candidates.json',JSON.stringify({status:rows.some(r=>r.status==='ROUTE_AND_LOWER_READY')?'PARTIAL_FORMAL_CANDIDATES':'FORMAL_BLOCKED',source:'source198 stripped finite selected proof retry',maxAttempts:4,rows},null,2)+'\n');
