import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {loadBoundedRuntime} from './bounded-proof.mjs';
import {absoluteCells,random,inventorySummary} from './diversity-layout-factory.mjs';
import {levelSha256} from '../formal-v2/contract.mjs';
import {compareLayouts} from './diversity.mjs';

const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const shuffle=(xs,r)=>xs.map(x=>({x,k:r()})).sort((a,b)=>a.k-b.k).map(x=>x.x);
const fits=(b,g)=>1+Math.max(...b.shape.map(p=>p[['top','bottom'].includes(g.side)?0:1]))<=g.size;
const overlaps=(a,b)=>a.side===b.side&&a.offset<b.offset+b.size&&b.offset<a.offset+a.size;
export function colourDelayedVacancy(geometry,source,runtime,{floor=31,seed=1,maxLayouts=200,maxColourNodes=10000}={}){
 assert(floor>=16&&floor<=31&&maxLayouts<=200&&maxColourNodes<=10000);
 const {built,result}=geometry;
 if(!built.ok||result.maxReached<floor||result.termination==='construction-state-budget')return{ok:false,reason:'geometry-has-no-complete-required-depth'};
 const bodies=built.blocks.slice(1),first=built.blocks[0],r=random(seed),apertures=result.apertures;
 const openingGates=apertures.filter(g=>{
  const w=1+Math.max(...first.shape.map(p=>p[0])),h=1+Math.max(...first.shape.map(p=>p[1])),horizontal=['top','bottom'].includes(g.side),start=horizontal?first.x:first.y;
  return g.size===(horizontal?w:h)&&g.offset===start&&(g.side==='top'?first.y===0:g.side==='bottom'?first.y+h===source.height:g.side==='left'?first.x===0:first.x+w===source.width);
 });
 // The pose graph charges a parking drag for reaching the rim. Actual play
 // can clear during that same held gesture, costing zero non-clearing drags.
 // A first matching pose at depth d therefore gives only d-1 before clear.
 const late=[];result.earliest.forEach((xs,i)=>xs.forEach((v,g)=>{if(v>=floor+1&&fits(bodies[i],apertures[g]))late.push({i,g,depth:v});}));
 if(!late.length)return{ok:false,reason:'no-delayed-geometric-exit'};
 const adjacency=bodies.map((a,i)=>bodies.flatMap((b,j)=>j!==i&&absoluteCells(a).some(([x,y])=>absoluteCells(b).some(([u,v])=>Math.abs(x-u)+Math.abs(y-v)===1))?[j]:[]));
 const native=bodies.map(b=>{const m=runtime.matchFormalBlockShape(b.shape,'native-only');return Object.keys(runtime.GAME_ART.gameplay.formalBlocks).filter(c=>runtime.GAME_ART.gameplay.formalBlocks[c].solid?.[m?.shapeId]);});
 let totalNodes=0,layouts=0;
 for(;layouts<maxLayouts;layouts++){
  const target=late[Math.floor(r()*late.length)],opening=openingGates[Math.floor(r()*openingGates.length)];
  if(overlaps(opening,apertures[target.g]))continue;
  const gateIndices=[target.g];
  for(const g of shuffle(apertures.map((_,i)=>i),r))if(gateIndices.length<7&&!overlaps(opening,apertures[g])&&!gateIndices.some(j=>overlaps(apertures[g],apertures[j])))gateIndices.push(g);
  if(gateIndices.length<7)continue;
  const colors=shuffle(Object.keys(runtime.GAME_ART.gameplay.formalBlocks),r).slice(0,8),openingColor=colors[0],gateColors=colors.slice(1);
  const domains=bodies.map((b,i)=>gateIndices.flatMap((g,j)=>fits(b,apertures[g])&&(result.earliest[i][g]===null||result.earliest[i][g]>=floor+1)&&native[i].includes(gateColors[j])?[j]:[]));
  if(domains.some(d=>!d.length)||!domains[target.i].includes(0))continue;
  const assigned=Array(bodies.length).fill(-1);assigned[target.i]=0;
  let nodes=0;
  const dfs=n=>{
   if(nodes>=maxColourNodes)return false;nodes++;totalNodes++;
   if(n===bodies.length)return new Set(assigned).size===7;
   let idx=-1,choices=null;
   for(let i=0;i<bodies.length;i++)if(assigned[i]<0){const d=domains[i].filter(c=>!adjacency[i].some(j=>assigned[j]===c));if(!d.length)return false;if(!choices||d.length<choices.length){choices=d;idx=i;}}
   choices=shuffle(choices,r).sort((a,b)=>Number(assigned.includes(a))-Number(assigned.includes(b)));
   for(const c of choices){assigned[idx]=c;if(dfs(n+1))return true;assigned[idx]=-1;}return false;
  };
  if(!dfs(1))continue;
  const level={id:source.id,name:`单开口延迟消除构造 ${source.id}`,difficulty:'super',reward:0,width:source.width,height:source.height,
   ...(source.playable?{playable:structuredClone(source.playable)}:{}),...(source.blocked?{blocked:structuredClone(source.blocked)}:{}),timeSeconds:source.timeSeconds,parMoves:source.parMoves,
   mechanismRules:'revised-2026-09-27-v1.5',blocks:[{...first,color:openingColor},...bodies.map((b,i)=>({...b,color:gateColors[assigned[i]]}))],
   gates:[{...opening,color:openingColor,id:'opening-gate'},...gateIndices.map((g,j)=>({...apertures[g],color:gateColors[j],id:`delayed-gate-${j}`}))]};
  try{runtime.validateLevel(level);}catch{continue;}
  if(inventorySummary(level,runtime).nonNativeOrMissingArtIds.length)continue;
  const audit=runtime.auditRevisedCandidate(level,undefined);if(audit.issues.some(i=>i.category!=='source'&&i.code!=='wrong-rule-profile'))continue;
  return{ok:true,level,geometryTarget:target,assigned,gateIndices,layouts:layouts+1,totalNodes,floor,
   scope:'Colour and aperture constraints use only the bounded colourless single-opening parking graph. No complete clearing route or lower certificate is asserted.'};
 }
 return{ok:false,reason:'no-adjacency-compatible-delayed-colouring',layouts,totalNodes};
}
async function main(){
 const[input,label]=process.argv.slice(2);assert(input&&/^[a-z0-9-]+$/.test(label??''));
 const dir=`deliverables/daily-formal-v3-20261008/design/${label}`;assert(!fs.existsSync(dir));fs.mkdirSync(dir);
 const read=p=>JSON.parse(fs.readFileSync(p)),geometry=read(input),runtime=await loadBoundedRuntime(),source=runtime.LEVELS.find(l=>l.id===geometry.sourceLevelId);
 const made=colourDelayedVacancy(geometry,source,runtime,{seed:7189291});
 const packet={...made,accepted:false,formalReady:false,proofSearches:0,sourceLevelId:source.id,sourceLevelSha256:levelSha256(source),
  sourceGeometry:{path:input,sha256:hash(input)},provenance:{strategy:'whole-board-delayed-vacancy-colouring',sourceBoardExactlyRetained:true,geometryConstructionNotDifficultyProof:true}};
 if(made.ok){packet.levelSha256=levelSha256(made.level);const index='deliverables/daily-formal-v3-20261008/selection/nearband21-selected/index.json';
  const selected=read(index).files.map(read);packet.nearestSelected=Math.max(...selected.map(p=>compareLayouts(made.level,p.level).footprintSimilarity));packet.sourceSimilarity=compareLayouts(made.level,source).footprintSimilarity;
 }
 fs.writeFileSync(`${dir}/construction.json`,JSON.stringify(packet,null,2)+'\n');
 console.log(JSON.stringify({ok:made.ok,reason:made.reason,layouts:made.layouts,nodes:made.totalNodes,nearest:packet.nearestSelected,source:packet.sourceSimilarity,accepted:false}));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await main();
