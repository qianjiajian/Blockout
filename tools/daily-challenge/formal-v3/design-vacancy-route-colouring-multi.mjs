import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {boardCells,absoluteCells,random,inventorySummary} from './diversity-layout-factory.mjs';
import {levelSha256,independentReplay} from '../formal-v2/contract.mjs';
import {targetGeometryChain,layerCoverage} from './design-vacancy-retile-candidates.mjs';

export const VERSION='shared-vacancy-multitarget-variable-palette-joint-tail-v1';
const key=p=>p.join(','),clone=structuredClone;
const dims=b=>[1+Math.max(...b.shape.map(p=>p[0])),1+Math.max(...b.shape.map(p=>p[1]))];
const sameSideOverlap=(a,b)=>a.side===b.side&&a.offset<b.offset+b.size&&b.offset<a.offset+a.size;
const widthFits=(b,g)=>dims(b)[['top','bottom'].includes(g.side)?0:1]<=g.size;
const shuffle=(xs,r)=>xs.map(x=>({x,k:r()})).sort((a,b)=>a.k-b.k).map(x=>x.x);
const BAR_KEYS=new Set([[[0,0],[1,0]],[[0,0],[0,1]],[[0,0],[1,0],[2,0]],[[0,0],[0,1],[0,2]]].map(s=>JSON.stringify(s)));
const PUBLIC_ROOT=fileURLToPath(new URL('../../../public/',import.meta.url));

function bindActualArt(runtime,level){
 const assetBindings={},requirements=[];
 for(const b of level.blocks){
  const match=runtime.matchFormalBlockShape(b.shape,'native-only');assert(match&&match.quarterTurns===0,`non-native-art:${b.id}`);
  const asset=runtime.GAME_ART.gameplay.formalBlocks[b.color]?.solid?.[match.shapeId];assert(typeof asset==='string'&&asset.length>0,`missing-art-path:${b.id}`);
  const full=path.resolve(PUBLIC_ROOT,asset.replace(/^[/\\]+/,'')),relative=path.relative(PUBLIC_ROOT,full);
  assert(!relative.startsWith('..')&&!path.isAbsolute(relative),'art-path-outside-public');
  if(!assetBindings[asset]){const bytes=fs.readFileSync(full);assert(bytes.length>0,`empty-art-file:${asset}`);assetBindings[asset]=createHash('sha256').update(bytes).digest('hex');}
  requirements.push({blockId:b.id,color:b.color,shapeId:match.shapeId,quarterTurns:match.quarterTurns,path:asset,sha256:assetBindings[asset]});
 }
 return{assetBindings,requirements};
}
export function atGate(source,b,p,g){const[w,h]=dims(b),horizontal=['top','bottom'].includes(g.side),at=p[horizontal?0:1],span=horizontal?w:h;
 return at>=g.offset&&at+span<=g.offset+g.size&&(g.side==='top'?p[1]===0:g.side==='bottom'?p[1]+h===source.height:g.side==='left'?p[0]===0:p[0]+w===source.width);}

export function constructionMeter(budget={},prior={}){
 const limits={maxStates:10000,maxMicroStates:3000000,maxTransitions:10000000,maxMilliseconds:30000},values={...limits,...budget};
 for(const[k,v]of Object.entries(values))assert(k in limits&&Number.isSafeInteger(v)&&v>0&&v<=limits[k],`Invalid finite construction ${k}`);
 const initial={rawFullBoardStates:0,rawExploredStates:0,microDiscoveredStates:0,microExpandedStates:0,attemptedTransitions:0,elapsedMilliseconds:0,...prior};
 for(const[k,v]of Object.entries(initial))assert(Number.isSafeInteger(v)&&v>=0,`Invalid prior accounting ${k}`);
 assert(initial.rawFullBoardStates<=values.maxStates&&initial.rawExploredStates<=initial.rawFullBoardStates);
 assert(initial.microDiscoveredStates<=values.maxMicroStates&&initial.microExpandedStates<=initial.microDiscoveredStates);
 assert(initial.attemptedTransitions<=values.maxTransitions&&initial.elapsedMilliseconds<values.maxMilliseconds);
 const started=Date.now()-initial.elapsedMilliseconds,counts={...initial,kinds:{priorGeometry:initial.rawFullBoardStates}};delete counts.elapsedMilliseconds;
 const time=()=>assert(Date.now()-started<values.maxMilliseconds,'construction-deadline');
 return{budget:values,counts,time,
  world(kind){time();assert(counts.rawFullBoardStates<values.maxStates,'construction-board-budget');counts.rawFullBoardStates++;counts.kinds[kind]=(counts.kinds[kind]??0)+1;},
  expand(){time();assert(counts.rawExploredStates<counts.rawFullBoardStates,'invalid-expansion-accounting');counts.rawExploredStates++;},
  micro(){time();assert(counts.microDiscoveredStates<values.maxMicroStates,'construction-micro-budget');counts.microDiscoveredStates++;},
  microExpand(){time();counts.microExpandedStates++;},
  action(){time();assert(counts.attemptedTransitions<values.maxTransitions,'construction-action-budget');counts.attemptedTransitions++;},
  report(){return{...clone(counts),elapsedMilliseconds:Date.now()-started,budget:values,
   accounting:'Every proposed complete committed geometry/partial-colour world, including duplicates, is pre-charged; complete colour assignments also charged. Fixed-other-body held coordinates are micro states.',
   exactDistinctWorldCountClaimed:false,conservativeFullBoardStateUpperBound:counts.rawFullBoardStates};}};
}

/** One fixed-other-body coordinate BFS, with reconstructed unit-step paths. */
function heldPaths(source,b,others,meter,{to=null}={}){
 const legal=new Set(boardCells(source).map(key)),blocked=new Set(others.flatMap(absoluteCells).map(key)),start=[b.x,b.y],points=[start],parents=new Map([[key(start),null]]);meter.micro();
 for(let cursor=0;cursor<points.length;cursor++){
  if(to&&parents.has(key(to)))break;meter.microExpand();
  for(const[dX,dY]of [[0,-1],[1,0],[0,1],[-1,0]]){meter.action();const p=[points[cursor][0]+dX,points[cursor][1]+dY],k=key(p);
   if(parents.has(k)||!b.shape.every(([x,y])=>legal.has(key([p[0]+x,p[1]+y]))&&!blocked.has(key([p[0]+x,p[1]+y]))))continue;
   meter.micro();parents.set(k,points[cursor]);points.push(p);
  }
 }
 const pathTo=p=>{assert(parents.has(key(p)));const path=[];for(let at=p;parents.get(key(at))!==null;at=parents.get(key(at)))path.push(at);return path.reverse();};
 return{points,pathTo};
}

function assertBarStock(source,geometry,floor){
 const stock=geometry.built.blocks;assert(geometry.built.ok&&stock[0]?.id==='opening'&&stock[0].shape.length===2);
 assert(stock.every(b=>Object.keys(b).every(k=>['id','x','y','shape'].includes(k))),'Geometry stock must have no hidden, ice, layers, queue or unknown fields');
 assert(stock.every(b=>BAR_KEYS.has(JSON.stringify([...b.shape].sort((a,b)=>a[1]-b[1]||a[0]-b[0])))),'Only native visible H/V2/3 stock');
 assert.deepEqual(stock.flatMap(absoluteCells).map(key).sort(),boardCells(source).map(key).sort(),'Full normal source mask required');
 assert(layerCoverage(geometry.result,floor).complete&&geometry.result.termination!=='construction-state-budget','Complete early geometry domain required');
}

/** Validate parent ordering before any unbounded parent-chain traversal. */
function assertGeometryStructure(source,geometry){
 const result=geometry.result,stock=geometry.built.blocks;
 assert.equal(geometry.sourceBoard.width,source.width);assert.equal(geometry.sourceBoard.height,source.height);
 assert.deepEqual(geometry.sourceBoard.cells.map(key).sort(),boardCells(source).map(key).sort(),'Geometry/source mask mismatch');
 assert(Array.isArray(result.queue)&&result.queue.length>0&&result.queue.length<=10000);
 assert.equal(result.rawGeometricStates,result.queue.length);
 assert(Number.isSafeInteger(result.expanded)&&result.expanded>=0&&result.expanded<=result.rawGeometricStates);
 assert.equal(result.queue[0].parent,-1);assert.equal(result.queue[0].depth,0);
 assert.deepEqual(result.queue[0].positions,stock.slice(1).map(b=>[b.x,b.y]));
 for(const[i,node]of result.queue.entries()){
  assert(Number.isSafeInteger(node.depth)&&node.depth>=0);
  assert(Array.isArray(node.positions)&&node.positions.length===stock.length-1&&node.positions.every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isSafeInteger)));
  if(i){assert(Number.isSafeInteger(node.parent)&&node.parent>=0&&node.parent<i,'Invalid/cyclic geometry parent');assert.equal(node.depth,result.queue[node.parent].depth+1);}
 }
 assert(result.earliest.length===stock.length-1&&result.earliest.every(ds=>ds.length===result.apertures.length&&ds.every(d=>d===null||Number.isSafeInteger(d)&&d>=0)));
 for(const g of result.apertures)assert(['top','right','bottom','left'].includes(g.side)&&Number.isSafeInteger(g.offset)&&g.offset>=0&&Number.isSafeInteger(g.size)&&g.size>=1&&g.size<=3);
}

/** Recover exactly one selected colourless prefix; no alternate parent/path. */
function fixedPrefix(source,geometry,target,meter){
 const chain=targetGeometryChain(geometry,target),first=geometry.built.blocks[0],g=geometry.result.apertures[target.g];
 const openingGate=geometry.result.apertures.find(a=>a.size===dims(first)[['top','bottom'].includes(a.side)?0:1]&&atGate(source,first,[first.x,first.y],a));assert(openingGate);
 meter.world('prefix-full-opening');meter.world('prefix-opening-cleared');
 const current=clone(geometry.built.blocks.slice(1));
 const drags=[{blockId:'opening',path:[],exitSide:openingGate.side}];
 for(const move of chain.moves){const b=current.find(x=>x.id===move.blockId);assert.deepEqual(move.from,[b.x,b.y]);
  const micro=heldPaths(source,b,current.filter(x=>x!==b),meter,{to:move.to}),path=micro.pathTo(move.to);assert(path.length);
  meter.world('prefix-park');Object.assign(b,{x:move.to[0],y:move.to[1]});drags.push({blockId:b.id,path});
 }
 assert.equal(drags.at(-1).blockId,chain.targetBodyId,'First target pose must be reached by its selected body');
 drags.at(-1).exitSide=g.side;const targetBody=current.find(b=>b.id===chain.targetBodyId);
 // Mandatory exit can happen before the selected endpoint. Truncate only
 // this fixed held path at its first actual geometric matching contact.
 const last=drags.at(-1),firstHit=last.path.findIndex(p=>atGate(source,targetBody,p,g));assert(firstHit>=0);last.path=last.path.slice(0,firstHit+1);
 meter.world('prefix-target-cleared');
 return{chain,target,openingGate,drags,tailBodies:current.filter(b=>b.id!==chain.targetBodyId),targetBodyId:chain.targetBodyId};
}

function adjacencyOf(bodies){return bodies.map((b,i)=>bodies.flatMap((c,j)=>j!==i&&absoluteCells(b).some(([x,y])=>absoluteCells(c).some(([u,v])=>Math.abs(x-u)+Math.abs(y-v)===1))?[j]:[]));}
function forwardDomains(domains,adjacency,assigned,remaining,requiredColors){
 const available=domains.map((d,i)=>d.filter(c=>!adjacency[i].some(j=>assigned[j]===c)));
 if([...remaining].some(i=>!available[i].length))return null;
 const used=new Set(assigned.filter(x=>x>=0)),missing=requiredColors.filter(c=>!used.has(c));
 if(missing.length>remaining.size||missing.some(c=>![...remaining].some(i=>available[i].includes(c))))return null;
 return available;
}

/** DFS jointly selects a block's colour and its zero-parking removal.
 * Assigned colours remain after removal, preserving OPENING adjacency rules.
 * Every branch and completed assignment shares the caller's one meter. */
export function constructZeroParkingTail(source,{bodies,tailBodies,gates,domains,assigned,adjacency,requiredColors},meter){
 assert(bodies.length===domains.length&&assigned.length===bodies.length&&adjacency.length===bodies.length);
 meter.world('tail-initial');
 const positions=new Map(tailBodies.map(b=>[b.id,b])),idToIndex=new Map(bodies.map((b,i)=>[b.id,i])),initialRemaining=new Set(tailBodies.map(b=>idToIndex.get(b.id))),cache=new Map();
 const exits=(i,remaining)=>{
  const cacheKey=`${[...remaining].sort((a,b)=>a-b).join(',')}:${i}`;if(cache.has(cacheKey))return cache.get(cacheKey);
  const body=positions.get(bodies[i].id),others=[...remaining].filter(j=>j!==i).map(j=>positions.get(bodies[j].id)),micro=heldPaths(source,body,others,meter),hits=[];
  for(const c of domains[i]){const gate=gates[c],pose=micro.points.find(p=>atGate(source,body,p,gate));if(pose)hits.push({color:c,drag:{blockId:body.id,path:micro.pathTo(pose),exitSide:gate.side}});}
  cache.set(cacheKey,hits);return hits;
 };
 let terminals=0;
 function dfs(remaining,colours,drags){
  meter.expand();
  const available=forwardDomains(domains,adjacency,colours,remaining,requiredColors);if(!available)return null;
  if(!remaining.size){meter.world('complete-colour-assignment');terminals++;return{assigned:colours,drags};}
  const choices=[];for(const i of remaining)for(const option of exits(i,remaining))if(available[i].includes(option.color))choices.push({i,...option,domainSize:available[i].length});
  choices.sort((a,b)=>a.domainSize-b.domainSize||a.drag.path.length-b.drag.path.length||a.i-b.i||a.color-b.color);
  for(const choice of choices){
   meter.world('tail-colour-and-clear-branch'); // BEFORE forming successor world.
   const nextColours=[...colours];nextColours[choice.i]=choice.color;const nextRemaining=new Set(remaining);nextRemaining.delete(choice.i);
   const found=dfs(nextRemaining,nextColours,[...drags,choice.drag]);if(found)return found;
  }
  return null;
 }
 const solution=dfs(initialRemaining,[...assigned],[]);return{solution,completeAssignments:terminals,cachedHeldSearches:cache.size};
}

/** At most three declared different targets and 4-8 colour domains, sharing
 * one meter including the prior geometry. Each target/palette fixes at most
 * one static gate domain before the tail DFS. No proof or public claim. */
export function constructVacancyRouteColouringMulti(runtime,source,geometry,{seed=1,budget={},qualification=null,paletteSizes=[4,5,6,7,8],maxTargets=3}={}){
 const floor=qualification?.floor??31;
 assert(Number.isSafeInteger(seed)&&seed>=0,'Finite integer construction seed required');
 assert(Number.isSafeInteger(maxTargets)&&maxTargets>=1&&maxTargets<=3,'At most three different late targets');
 assert(Array.isArray(paletteSizes)&&paletteSizes.length>=1&&paletteSizes.length<=5&&new Set(paletteSizes).size===paletteSizes.length&&paletteSizes.every(n=>Number.isSafeInteger(n)&&n>=4&&n<=8),'Production palettes must have 4-8 different colours');
 if(qualification)assert(qualification.fixtureOnly===true&&Number.isSafeInteger(floor)&&floor>=1&&floor<=31&&(!qualification.palette||Array.isArray(qualification.palette)&&qualification.palette.length>=4&&qualification.palette.length<=8),'Explicit fixture-only qualification settings required');
 assertGeometryStructure(source,geometry);
 assert(Number.isSafeInteger(geometry.result.attempted)&&geometry.result.attempted%4===0);
 const prior={rawFullBoardStates:geometry.result.rawGeometricStates,rawExploredStates:geometry.result.expanded,
  microDiscoveredStates:geometry.result.attempted/4,microExpandedStates:geometry.result.attempted/4,attemptedTransitions:geometry.result.attempted,
  elapsedMilliseconds:Math.ceil(geometry.elapsedMilliseconds??0)};
 if(!qualification)assert(Number.isFinite(geometry.elapsedMilliseconds)&&geometry.elapsedMilliseconds>=0,'Production geometry wall-time must be bound');
 const meter=constructionMeter(budget,prior),report={version:VERSION,accepted:false,formalReady:false,proofSearches:0,status:'PENDING',level:null,drags:null,U:null,
  qualificationOnly:!!qualification,productionFloor:31,constructionFloor:floor,priorGeometryAccounting:prior,
  declaration:{maxTargets,paletteSizes,maximumStaticGateLayoutsPerPalette:200,oneSharedMeter:true},targets:[]};
 try{
  assertBarStock(source,geometry,floor);const all=geometry.built.blocks,bodies=all.slice(1),apertures=geometry.result.apertures,late=[];
  geometry.result.earliest.forEach((ds,i)=>ds.forEach((d,g)=>{if(d>=floor+1&&widthFits(bodies[i],apertures[g]))late.push({i,g,depth:d});}));
  late.sort((a,b)=>a.depth-b.depth||a.i-b.i||a.g-b.g);assert(late.length,'no-late-target');
  const selected=[],bodySeen=new Set();
  for(const target of late)if(!bodySeen.has(target.i)){selected.push(target);bodySeen.add(target.i);if(selected.length===maxTargets)break;}
  if(selected.length<maxTargets)for(const target of late)if(!selected.some(t=>t.i===target.i&&t.g===target.g)){selected.push(target);if(selected.length===maxTargets)break;}
  report.selectedTargets=clone(selected);
  const palette=qualification?.palette??shuffle(Object.keys(runtime.GAME_ART.gameplay.formalBlocks),random(seed));
  assert.equal(new Set(palette).size,palette.length);assert(palette.every(c=>runtime.GAME_ART.gameplay.formalBlocks[c]));
  const adjacent=adjacencyOf(bodies);
  for(const[targetIndex,target]of selected.entries()){
  const targetReport={target,accountingBefore:meter.report(),palettes:[]};report.targets.push(targetReport);
  const prefix=fixedPrefix(source,geometry,target,meter);targetReport.prefix=prefix;
  const earlyApertures=[];
  for(const b of prefix.tailBodies){const i=bodies.findIndex(x=>x.id===b.id),micro=heldPaths(source,b,prefix.tailBodies.filter(x=>x!==b),meter);
   const gates=apertures.flatMap((g,j)=>{const earliest=geometry.result.earliest[i][j];return(earliest===null||earliest>=floor+1)&&!sameSideOverlap(g,apertures[target.g])&&!sameSideOverlap(g,prefix.openingGate)&&micro.points.some(p=>atGate(source,b,p,g))?[j]:[];});
   if(gates.length)earlyApertures.push({bodyId:b.id,index:i,gateIndices:gates});
  }
  targetReport.secondClearEarlyEligible=earlyApertures;
  if(sameSideOverlap(prefix.openingGate,apertures[target.g])){targetReport.reason='opening-target-gates-overlap';targetReport.accountingAfter=meter.report();continue;}
  if(!earlyApertures.length){targetReport.reason='no-disjoint-early-qualified-third-clear';targetReport.accountingAfter=meter.report();continue;}
  const sizes=qualification?.palette?[qualification.palette.length]:paletteSizes;
  for(const[paletteIndex,paletteSize]of sizes.entries()){
  const selectedPalette=palette.slice(0,paletteSize);assert.equal(selectedPalette.length,paletteSize);
  const branch={paletteSize,palette:selectedPalette,accountingBefore:meter.report()};targetReport.palettes.push(branch);
  const r=random(seed+targetIndex*713531+paletteIndex*190871);
  const gateCount=paletteSize-1,requiredColors=Array.from({length:gateCount},(_,i)=>i);
  const native=bodies.map(b=>{const m=runtime.matchFormalBlockShape(b.shape,'native-only');assert(m&&m.quarterTurns===0);return selectedPalette.slice(1).map(c=>!!runtime.GAME_ART.gameplay.formalBlocks[c]?.solid?.[m.shapeId]);});
  let fixed=null,gateLayouts=0;
  // This is finite STATIC aperture/domain setup, not a complete colour CSP.
  // The first feasible setup is frozen before the one tail branch search.
  for(;gateLayouts<200&&!fixed;gateLayouts++){
   meter.time();const forced=earlyApertures[gateLayouts%earlyApertures.length],third=forced.gateIndices[Math.floor(r()*forced.gateIndices.length)],indices=[target.g];
   if(third===target.g||sameSideOverlap(prefix.openingGate,apertures[third])||sameSideOverlap(apertures[target.g],apertures[third])||sameSideOverlap(prefix.openingGate,apertures[target.g]))continue;
   indices.push(third);
   for(const j of shuffle(apertures.map((_,i)=>i),r))if(indices.length<gateCount&&!sameSideOverlap(prefix.openingGate,apertures[j])&&!indices.some(k=>sameSideOverlap(apertures[k],apertures[j])))indices.push(j);
   if(indices.length<gateCount)continue;
   const domains=bodies.map((b,i)=>indices.flatMap((g,c)=>(geometry.result.earliest[i][g]===null||geometry.result.earliest[i][g]>=floor+1)&&widthFits(b,apertures[g])&&native[i][c]?[c]:[])),assigned=Array(bodies.length).fill(-1);assigned[target.i]=0;
   const remaining=new Set(bodies.flatMap((_,i)=>i===target.i?[]:[i]));if(domains.some(d=>!d.length)||!domains[target.i].includes(0)||!forwardDomains(domains,adjacent,assigned,remaining,requiredColors))continue;
   meter.world('fixed-gate-colour-domain');
   fixed={gateIndices:indices,domains,assigned,adjacency:adjacent,requiredColors,palette:selectedPalette,gates:indices.map((g,c)=>({...apertures[g],id:`delayed-gate-${c}`,color:selectedPalette[c+1]}))};
  }
  branch.staticGateLayouts=gateLayouts;
  if(!fixed){branch.reason='no-fixed-static-gate-domain';branch.accountingAfter=meter.report();continue;}
  branch.fixedDomain=clone(fixed);branch.fixedDomainSha256=levelSha256(fixed);
  const tail=constructZeroParkingTail(source,{bodies,tailBodies:prefix.tailBodies,...fixed},meter);branch.tail={completeAssignments:tail.completeAssignments,cachedHeldSearches:tail.cachedHeldSearches};
  if(!tail.solution){branch.reason='fixed-domain-zero-parking-tail-exhausted';branch.accountingAfter=meter.report();continue;}
  // Charge formation of the final opening with all its concrete colours.
  meter.world('actual-complete-coloured-opening');
  const level={id:source.id,name:`联合清除着色 ${source.id}`,width:source.width,height:source.height,
   ...(source.playable?{playable:clone(source.playable)}:{}),...(source.blocked?{blocked:clone(source.blocked)}:{}),
   difficulty:'super',reward:0,timeSeconds:source.timeSeconds,parMoves:source.parMoves,mechanismRules:'revised-2026-09-27-v1.5',
   blocks:[{...clone(all[0]),color:selectedPalette[0]},...bodies.map((b,i)=>({...clone(b),color:selectedPalette[tail.solution.assigned[i]+1]}))],
   gates:[{...prefix.openingGate,id:'opening-gate',color:selectedPalette[0]},...fixed.gates]};
  const drags=[...prefix.drags,...tail.solution.drags];branch.level=level;branch.levelSha256=levelSha256(level);branch.drags=drags;
  runtime.validateLevel(level);assert.equal(inventorySummary(level,runtime).nonNativeOrMissingArtIds.length,0);
  branch.actualArt=bindActualArt(runtime,level);
  assert.equal(runtime.auditRevisedCandidate(level,undefined).issues.filter(i=>i.category!=='source'&&i.code!=='wrong-rule-profile').length,0);
  branch.replay=runtime.replayRevisedRoute(level,drags);branch.independentReplay=independentReplay(runtime,level,drags,{});
  const a=branch.replay,b=branch.independentReplay;assert(a.valid&&a.complete&&!a.failed&&b.valid&&b.complete&&!b.failed&&a.nonClearingDrags===b.nonClearingDrags,'complete-actual-double-replay-failed');
  assert.equal(a.clearEvents,level.blocks.length);branch.U=a.nonClearingDrags;branch.status='COMPLETE_U';branch.accountingAfter=meter.report();targetReport.accountingAfter=meter.report();
  Object.assign(report,{level,drags,levelSha256:levelSha256(level),actualArt:branch.actualArt,replay:a,independentReplay:b,U:a.nonClearingDrags,
   successfulTargetIndex:targetIndex,successfulPaletteSize:paletteSize,status:qualification?'QUALIFICATION_COMPLETE_U_ONLY':'COMPLETE_U_CONSTRUCTED_LOWER_PENDING'});
  report.accounting=meter.report();return report;
  }
  targetReport.reason='all-declared-palette-domains-failed';targetReport.accountingAfter=meter.report();
  }
  report.status='CONSTRUCTION_UNKNOWN';report.reason='all-declared-targets-and-palette-domains-failed';
 }catch(error){report.status='CONSTRUCTION_UNKNOWN';report.reason=error.message;}
 report.accounting=meter.report();return report;
}
