import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import { loadSpatialApi, compileSpatial, each, normalizeClears, cleared, key as stateKey } from '../continuation211-colored-witness.mjs';
import { loadContinuationRuntime } from '../continuation211-runtime.mjs';
import { verifyRulesLock } from '../verify-rules-lock.mjs';
if (!verifyRulesLock().ok) throw new Error('rules lock failed');
const outDir='deliverables/league-regeneration-20261004/formal'; fs.mkdirSync(outDir,{recursive:true});
const bundle=await build({stdin:{contents:"export {LEVELS} from './src/core/levels.ts'",resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,platform:'node',format:'esm'});
const source=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const spatialApi=await loadSpatialApi(), runtime=await loadContinuationRuntime();
const sha=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const targets=i=>((i-1)%5===2?[21,30]:[16,20]);
const rand=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
function sanitize(level,index){
  level.mechanismRules='revised-2026-09-27-v1.5'; level.timeSeconds=180; level.reward=0;
  for(const k of ['generators','elevators','conveyors','flipDoors','seams','coloredGrids']) delete level[k];
  if(index<6) for(const g of level.gates) delete g.frozen;
  if(index<10) for(const b of level.blocks) delete b.frozen;
  if(index<15) for(const b of level.blocks) delete b.layers;
  if(index<20){delete level.shutters;for(const b of level.blocks) delete b.shutterId;}
  for(const b of level.blocks){ if(index<50) delete b.movementAxis; if(index<60){delete b.keyId;delete b.lockedBy;delete b.lockCount;} delete b.star; }
  return level;
}
function mutate(base,index,seed){const r=rand(seed),level=sanitize(structuredClone(base),index);level.id=910000+index;level.name=`荣耀联赛${index}·正式候选`;level.difficulty=targets(index)[0]>=21?'super':'hard';
  // Keep portal sides stable; mutate offsets and gate colors only within finite variants.
  for(const g of level.gates){if(r()<.85){const span=g.side==='top'||g.side==='bottom'?level.width:level.height;g.offset=Math.floor(r()*Math.max(1,span-g.size));}if(r()<.08){const other=level.gates[Math.floor(r()*level.gates.length)];if(other&&other!==g)[g.color,other.color]=[other.color,g.color];}}
  // Preserve coverage while moving equal-shape bodies in the same cover group.
  const same=new Map();for(const b of level.blocks){const k=JSON.stringify(b.shape)+'|'+(b.shutterId??'');if(!same.has(k))same.set(k,[]);same.get(k).push(b);}for(const g of same.values())if(g.length>1&&r()<.8){const a=g[Math.floor(r()*g.length)],b=g[Math.floor(r()*g.length)];if(a!==b)[a.x,b.x,a.y,b.y]=[b.x,a.x,b.y,a.y];}
  // Genuine shape mutation: exchange equal-area different shapes and their positions.
  const byArea=new Map();for(const b of level.blocks){const k=`${b.shape.length}|${b.shutterId??''}`;if(!byArea.has(k))byArea.set(k,[]);byArea.get(k).push(b);}for(const g of byArea.values()){const a=g.find(x=>g.some(y=>y!==x&&JSON.stringify(x.shape)!==JSON.stringify(y.shape)));if(!a||r()>.55)continue;const b=g.find(x=>x!==a&&JSON.stringify(x.shape)!==JSON.stringify(a.shape));if(b){[a.shape,b.shape]=[b.shape,a.shape];[a.x,b.x]=[b.x,a.x];[a.y,b.y]=[b.y,a.y];}}
  if(level.blocks.length>1&&r()<.65){const a=Math.floor(r()*level.blocks.length),b=Math.floor(r()*level.blocks.length);if(a!==b)[level.blocks[a].color,level.blocks[b].color]=[level.blocks[b].color,level.blocks[a].color];}
  return level;
}
function searchWeighted(level,{maxMilliseconds=1600,maxCost=36,penalty=6,orderSeed=0}={}){
  let c;try{c=compileSpatial(level,spatialApi);}catch(error){return{status:'unsupported',reason:error.message};}
  const started=Date.now(),normalize=s=>{const drags=[];for(;;){let next;each(c,s,(z,cost,get)=>{if(cost===0){next=z;drags.push(get());return false;}},{optionalExit:false,orderSeed});if(!next)return{s,drags};s=next;}};
  const n=normalize(c.initial),nodes=[{s:n.s,drags:n.drags,parent:-1,cost:0,g:0,clears:cleared(c,n.s)}],seen=new Map([[stateKey(n.s),0]]),open=[0];let best=0;
  const score=i=>nodes[i].clears*1000-nodes[i].g;function push(i){open.push(i);for(let a=open.length-1;a;){const p=(a-1)>>1;if(score(open[p])>=score(open[a]))break;[open[p],open[a]]=[open[a],open[p]];a=p;}}function pop(){const first=open[0],last=open.pop();if(open.length){open[0]=last;let a=0;while(a*2+1<open.length){let z=a*2+1;if(z+1<open.length&&score(open[z+1])>score(open[z]))z++;if(score(open[a])>=score(open[z]))break;[open[a],open[z]]=[open[z],open[a]];a=z;}}return first;}
  const route=i=>{const out=[];while(i>=0){out.push(nodes[i].drags);i=nodes[i].parent;}return out.reverse().flat()};
  while(open.length&&Date.now()-started<maxMilliseconds&&seen.size<220000){const i=pop(),cur=nodes[i];if(seen.get(stateKey(cur.s))<cur.g)continue;if(cur.clears>nodes[best].clears)best=i;if(cur.clears===c.totalClears)return{status:'witness',cost:cur.cost,g:cur.g,states:seen.size,drags:route(i)};each(c,cur.s,(raw,k,get)=>{if(cur.cost+k>maxCost)return;const drag=get(),body=level.blocks.find(b=>b.id===drag.blockId),g=cur.g+k*(body.shape.length===1?penalty:1),norm=normalize(raw),sk=stateKey(norm.s);if((seen.get(sk)??Infinity)<=g)return;seen.set(sk,g);nodes.push({s:norm.s,drags:[drag,...norm.drags],parent:i,cost:cur.cost+k,g,clears:cleared(c,norm.s)});push(nodes.length-1);},{optionalExit:false,orderSeed});}
  return{status:'unknown',states:seen.size,maxClearsSeen:nodes[best].clears,elapsed:Date.now()-started};
}
const indices=[6,8,10,11,13,14,15,16,17,18,19], rows=[], accepted=[];
for(const index of indices){const base=source.LEVELS[index-1];let got=false;for(let attempt=0;attempt<72&&!got;attempt++){const level=attempt===0?sanitize(structuredClone(base),index):mutate(base,index,index*10000+attempt);level.id=910000+index;level.name=`荣耀联赛${index}·正式候选`;level.difficulty=targets(index)[0]>=21?'super':'hard';const fp=sha({playable:level.playable,gates:level.gates,blocks:level.blocks,shutters:level.shutters??[]});const row={index,attempt,fingerprint:fp,levelSha256:sha(level),status:'rejected'};try{const target=targets(index),route=searchWeighted(level,{maxMilliseconds:1800,maxCost:40,penalty:8,orderSeed:attempt});row.route={status:route.status,cost:route.cost??null,states:route.states??null,maxClearsSeen:route.maxClearsSeen??null,reason:route.reason??null};if(route.status!=='witness'||!route.drags){row.reason=`route-${route.status}`;rows.push(row);continue;}const replay=runtime.replayRevisedRoute(level,route.drags);row.replay={valid:replay.valid,complete:replay.complete,nonClearingDrags:replay.nonClearingDrags,effectiveDrags:replay.effectiveDrags};if(!replay.valid||!replay.complete||replay.nonClearingDrags<target[0]||replay.nonClearingDrags>target[1]){row.reason='upper-out-of-band';rows.push(row);continue;}const proof=searchWeighted(level,{maxMilliseconds:1,maxCost:0}); // no-op marker; lower bound uses complete graph below
      const { searchSpatial } = await import('../continuation211-colored-witness.mjs');
      const lower=searchSpatial(level,spatialApi,{floor:target[0],prove:true,normalize:false,maxStates:600000,maxTransitions:3500000,maxMilliseconds:9000,orderSeed:attempt});row.lowerProof={status:lower.status,thresholdProven:lower.thresholdProven===true,termination:lower.termination??null,exploredStates:lower.exploredStates??null};if(!lower.thresholdProven){row.reason=`lower-${lower.status}`;rows.push(row);continue;}
      const exits=route.drags.filter(d=>d.exitSide),late=exits.filter((d,i)=>i>=exits.length/2);const normal=late.filter(d=>{const b=level.blocks.find(x=>x.id===d.blockId);const w=Math.max(...b.shape.map(p=>p[0]))-Math.min(...b.shape.map(p=>p[0]))+1,h=Math.max(...b.shape.map(p=>p[1]))-Math.min(...b.shape.map(p=>p[1]))+1;return w*h===b.shape.length;});if(!normal.length){row.reason='no-late-rectangular-special';rows.push(row);continue;}row.specials=[...new Set(normal.map(d=>d.blockId))].slice(0,3);row.specialEvidence=row.specials.map(id=>{const step=route.drags.findIndex(d=>d.blockId===id&&d.exitSide),order=exits.findIndex(d=>d.blockId===id)+1,b=level.blocks.find(x=>x.id===id),w=Math.max(...b.shape.map(p=>p[0]))-Math.min(...b.shape.map(p=>p[0]))+1,h=Math.max(...b.shape.map(p=>p[1]))-Math.min(...b.shape.map(p=>p[1]))+1;return{blockId:id,completeClearVerified:true,routeStep:step+1,clearEvents:exits.length,lateClear:order>exits.length/2,rectangular:w*h===b.shape.length,score:10};});row.specialScore=10;row.status='FORMAL_CANDIDATE';row.level=level;row.drags=route.drags;row.proof=lower;accepted.push(row);rows.push(row);got=true;console.log(JSON.stringify({accepted:index,attempt,U:replay.nonClearingDrags,L:target[0]}));}catch(error){row.reason=`error:${error.message}`;rows.push(row);}}
if(!got)rows.push({index,status:'finite-budget-exhausted',attempts:72});}
const report={status:accepted.length?'PARTIAL_FORMAL_CANDIDATES':'FORMAL_BLOCKED',range:[6,19],accepted,rows,finiteBudget:{attemptsPerLevel:72,routeMilliseconds:1800,proofMilliseconds:9000,mutation:'gate offset/color + same-shape placement + equal-area different-shape swaps',noInfiniteRetry:true}};
fs.writeFileSync(`${outDir}/early-targeted-${Date.now()}.json`,JSON.stringify(report,null,2)+'\n');fs.writeFileSync(`${outDir}/early-targeted-latest.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,accepted:accepted.map(x=>x.index),output:`${outDir}/early-targeted-latest.json`}));
