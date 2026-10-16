import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {assertV4Runtime} from './runtime.mjs';
import {independentReplay,levelSha256,routeSha256} from '../formal-v2/contract.mjs';

export const IRREGULAR_GATE_AWARE_VERSION='private-irregular-gate-aware-v2';
const copy=structuredClone, key=p=>p.join(','), apertureKey=g=>`${g.side}:${g.offset}:${g.size}`;
const sides=['top','right','bottom','left'];
const absolute=b=>b.shape.map(([x,y])=>[b.x+x,b.y+y]);
const overlaps=(a,b)=>a.side===b.side&&a.offset<b.offset+b.size&&b.offset<a.offset+a.size;
const sha=b=>createHash('sha256').update(b).digest('hex');
const point=p=>Array.isArray(p)&&p.length===2&&p.every(Number.isSafeInteger);
function cells(level){
 const blocked=new Set((level.blocked??[]).map(key));
 return(level.playable??Array.from({length:level.width*level.height},(_,i)=>[i%level.width,Math.floor(i/level.width)]))
  .filter(p=>!blocked.has(key(p)));
}
function rng(seed){let x=seed>>>0;return()=>{x=(Math.imul(1664525,x)+1013904223)>>>0;return x/4294967296;};}
const shuffled=(xs,r)=>xs.map(x=>({x,n:r()})).sort((a,b)=>a.n-b.n).map(x=>x.x);

/** Necessary EMPTY-board exit geometry only. Uses the frozen authoritative
 * frontier and complete passing span, never a bounding-box approximation.
 * Other bodies may block the departure sweep. This is NOT an actual exit/U. */
export function irregularExitGeometry(runtime,level,body,gate){
 const ps=absolute(body);
 return runtime.exitFrontierFacesBoundary(level,ps,gate.side)
  &&Boolean(runtime.resolveMatchingGatePortal(level,ps,gate.side,[gate],[]));
}

function domain(level,runtime,{requireFilled=true}={}){
 runtime.assertPlainProofDomain(level);
 assert(Number.isSafeInteger(level.width)&&level.width>0&&level.width<=32);
 assert(Number.isSafeInteger(level.height)&&level.height>0&&level.height<=32);
 assert(level.blocks.length>0&&level.blocks.length<=100,'Finite body inventory required');
 assert(new Set(level.blocks.map(b=>b.id)).size===level.blocks.length,'Duplicate body id');
 const allowed=new Set(cells(level).map(key)),occupied=new Set();
 for(const b of level.blocks){
  assert(point([b.x,b.y])&&b.shape.length>0&&b.shape.length<=16&&b.shape.every(point));
  assert(new Set(b.shape.map(key)).size===b.shape.length,'Duplicate shape cell');
  assert(Math.min(...b.shape.map(p=>p[0]))===0&&Math.min(...b.shape.map(p=>p[1]))===0,'Normalized q0 shape required');
  const match=runtime.matchFormalBlockShape(b.shape,'native-only');
  assert(match?.quarterTurns===0,'Unregistered or rotated shape');
  for(const p of absolute(b)){assert(allowed.has(key(p))&&!occupied.has(key(p)),'Overlap or outside actual mask');occupied.add(key(p));}
 }
 if(requireFilled)assert.equal(occupied.size,allowed.size,'Opening must cover every playable cell');
 for(const g of level.gates){
  assert(Object.keys(g).every(k=>['id','color','side','offset','size','frozen'].includes(k)),'Only single ordinary rim portals');
  assert(sides.includes(g.side)&&Number.isSafeInteger(g.offset)&&Number.isSafeInteger(g.size));
 }
 runtime.validateLevel(level);
}

/** Exact q0 whole sprite and real file binding; never fall back to rotation or
 * another colour. A missing colour is an empty CSP domain, not a new asset. */
export function irregularAssetBinding(runtime,shape,color){
 const match=runtime.matchFormalBlockShape(shape,'native-only');
 if(!match||match.quarterTurns!==0)return null;
 const url=runtime.GAME_ART.gameplay.formalBlocks[color]?.solid?.[match.shapeId];
 if(typeof url!=='string'||!url.length)return null;
 const root=path.resolve('public'),file=path.resolve(root,url.replace(/^\/+/,''));
 if(!file.startsWith(root+path.sep))return null;
 try{const bytes=fs.readFileSync(file);if(bytes.length<24||!bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return null;
  return{shapeId:match.shapeId,color,quarterTurns:0,path:path.relative(process.cwd(),file).replaceAll('\\','/'),sha256:sha(bytes),bytes:bytes.length};
 }catch{return null;}
}

function makeMeter(options){
 const caps={maxNodes:3000,maxTransitions:10000,maxMicroStates:100000,maxMicroTransitions:1000000,maxMilliseconds:30000,maxCompleteWorldReservations:10000};
 const limits={};for(const [k,cap]of Object.entries(caps)){const v=options[k]??cap;assert(Number.isSafeInteger(v)&&v>0&&v<=cap,`Invalid finite ${k}`);limits[k]=v;}
 const prior=options.priorCompleteWorldReservations??0;
 assert(Number.isSafeInteger(prior)&&prior>=0&&prior<=limits.maxCompleteWorldReservations,'Invalid prior complete-world accounting');
 const start=Date.now(),m={nodes:0,cspTransitions:0,microStates:0,microTransitions:0,completeWorldReservations:prior,completeAssignments:0,prefixWorldReservations:0,
  guard(){if(Date.now()-start>=limits.maxMilliseconds)throw Error('irregular-csp-deadline');},
  charge(field,limit){this.guard();if(this[field]>=limits[limit])throw Error(`irregular-${limit}`);this[field]++;},
  node(){this.charge('nodes','maxNodes');},transition(){this.charge('cspTransitions','maxTransitions');},
  micro(){this.charge('microStates','maxMicroStates');},microTransition(){this.charge('microTransitions','maxMicroTransitions');},
  world(kind,count=1){this.guard();assert(Number.isSafeInteger(count)&&count>0);
   if(count>limits.maxCompleteWorldReservations-this.completeWorldReservations)throw Error('irregular-maxCompleteWorldReservations');
   this.completeWorldReservations+=count;this[kind]+=count;},
  result(){return{limits,priorCompleteWorldReservations:prior,callerMustIncludeInputStockInPrior:true,...Object.fromEntries(['nodes','cspTransitions','microStates','microTransitions','completeWorldReservations','completeAssignments','prefixWorldReservations'].map(k=>[k,this[k]])),
   elapsedMilliseconds:Date.now()-start,fullWorldGuardBeforeFormation:true,gateAndBodyCspShareBudget:true,
   prefixWorldBoundMeaning:'two provided-route replays: initial + every unit move + commit + clear + completion; conservative reservations, not unique solver states',
   emptyBoardCoordinateWorkIsMicro:true,gameplayBranchSearches:0};}};
 return m;
}

function checkedDrags(level,drags){
 assert(Array.isArray(drags)&&drags.length>0&&drags.length<=1000,'Nonempty finite fixed prefix required');
 const live=new Map(level.blocks.map(b=>[b.id,[b.x,b.y]]));let steps=0,clears=0;
 for(const d of drags){
  assert(d&&Object.keys(d).every(k=>['blockId','path','exitSide'].includes(k))&&live.has(d.blockId)&&Array.isArray(d.path));
  assert(d.exitSide===undefined||sides.includes(d.exitSide));let previous=live.get(d.blockId);
  for(const p of d.path){assert(point(p)&&Math.abs(p[0]-previous[0])+Math.abs(p[1]-previous[1])===1,'Every held unit step required');previous=p;steps++;assert(steps<=10000,'Prefix unit-step cap');}
  live.set(d.blockId,previous);if(d.exitSide){live.delete(d.blockId);clears++;}
 }
 return{steps,clears,parking:drags.length-clears,remaining:live.size,
  worldReservation:2*(1+steps+drags.length+2*clears)};
}

/** Two fresh supplied-route replays; no route search and no inferred lower
 * bound. The canonical path detects mandatory first contact; the deferred
 * independent path separately checks original full inventory and clear cost.
 * reserve() is called BEFORE either model is formed. */
export function auditIrregularFixedPrefix(runtime,level,drags,{reserve=()=>{},requireFilled=true,checkDeadline=()=>{}}={}){
 domain(level,runtime,{requireFilled});const facts=checkedDrags(level,drags);
 reserve(facts.worldReservation);
 checkDeadline();const canonical=runtime.replayRevisedRoute(level,drags);checkDeadline();
 const independent=independentReplay(runtime,level,drags);checkDeadline();
 const valid=canonical.valid&&independent.valid&&!independent.failed
  &&canonical.clearEvents===facts.clears&&independent.clearEvents===facts.clears
  &&canonical.nonClearingDrags===facts.parking&&independent.nonClearingDrags===facts.parking
  &&canonical.effectiveDrags===drags.length&&independent.effectiveDrags===drags.length
  &&independent.remainingBodies===facts.remaining&&canonical.complete===independent.complete;
 return{valid,facts,canonical,independent,levelSha256:levelSha256(level),routeSha256:routeSha256(drags),
  L:null,U:null,prefixIsNotLowerBound:true,searchPerformed:false,pointerValidated:false,naturalTimeValidated:false};
}

function apertures(level){
 const allowed=new Set(cells(level).map(key)),out=[];
 for(const side of sides)for(let size=1;size<=3;size++)for(let offset=0;offset+size<=(side==='top'||side==='bottom'?level.width:level.height);offset++){
  const edge=Array.from({length:size},(_,i)=>side==='top'?[offset+i,0]:side==='bottom'?[offset+i,level.height-1]:side==='left'?[0,offset+i]:[level.width-1,offset+i]);
  if(edge.every(p=>allowed.has(key(p))))out.push({side,offset,size});
 }return out;
}
function reachable(level,b,rim,runtime,m){
 const allowed=new Set(cells(level).map(key)),seen=new Set(),queue=[],support=new Set();
 m.micro();queue.push([b.x,b.y]);seen.add(key(queue[0]));
 for(const [x,y]of queue){
  for(const g of rim){m.microTransition();if(irregularExitGeometry(runtime,level,{...b,x,y},g))support.add(apertureKey(g));}
  for(const [dx,dy]of [[0,-1],[1,0],[0,1],[-1,0]]){
   m.microTransition();const p=[x+dx,y+dy],k=key(p);
   if(!seen.has(k)&&b.shape.every(([sx,sy])=>allowed.has(key([p[0]+sx,p[1]+sy])))){m.micro();seen.add(k);queue.push(p);}
  }
 }return support;
}

function internal(level,rt,o,m,diagnostic){
 assertV4Runtime(rt);
 assert.equal(o.scope,'private-fixture','Production construction is deliberately not enabled');
 assert(Number.isSafeInteger(level.id)&&level.id>=900000,'Private fixture id required');
 const {seed=1,paletteSize=8,mappedPrefix,fixedBodyColours={},forbiddenBodyColours={}}=o;
 assert(Number.isSafeInteger(seed)&&Number.isSafeInteger(paletteSize)&&paletteSize>0&&paletteSize<=8);
 assert(mappedPrefix?.ok);const drags=mappedPrefix.drags;checkedDrags(level,drags);
 const forced=level.blocks.map(b=>{const a=fixedBodyColours[b.id],z=mappedPrefix.openingColours?.[b.id];assert(!a||!z||a===z,'Conflicting forced colour');return a??z??null;});
 // Even adjacency/missing-art/invalid-domain failure of a fully forced world
 // is charged, and before those early returns. No reset between branches.
 if(forced.every(Boolean)&&(mappedPrefix.preservedGates??[]).length===paletteSize)m.world('completeAssignments');
 domain(level,rt);
 const ids=new Set(level.blocks.map(b=>b.id));for(const id of [...Object.keys(fixedBodyColours),...Object.keys(mappedPrefix.openingColours??{})])assert(ids.has(id),'Unknown forced body');
 for(const d of drags)assert(forced[level.blocks.findIndex(b=>b.id===d.blockId)],'Every prefix body must retain its known colour');
 const random=rng(seed),required=[...new Set(forced.filter(Boolean))],all=Object.keys(rt.GAME_ART.gameplay.formalBlocks);
 if(required.length>paletteSize||required.some(c=>!all.includes(c)))return{ok:false,reason:'fixed-colour-outside-palette'};
 const colours=[...required,...shuffled(all.filter(c=>!required.includes(c)),random)].slice(0,paletteSize),rim=shuffled(apertures(level),random);
 assert.equal(colours.length,paletteSize,'Palette exceeds actual artwork colours');
 const bodyCells=level.blocks.map(absolute),adj=level.blocks.map((_,i)=>level.blocks.flatMap((_,j)=>i!==j&&bodyCells[i].some(([x,y])=>bodyCells[j].some(([xx,yy])=>Math.abs(x-xx)+Math.abs(y-yy)===1))?[j]:[]));
 if(forced.some((c,i)=>c&&adj[i].some(j=>forced[j]===c)))return{ok:false,reason:'forced-adjacent-colour'};
 const assets=level.blocks.map(b=>new Map(colours.map(c=>[c,irregularAssetBinding(rt,b.shape,c)])));
 diagnostic.missingAssetPairs=level.blocks.flatMap((b,i)=>colours.filter(c=>!assets[i].get(c)).map(color=>({blockId:b.id,color})));
 const reach=level.blocks.map(b=>reachable(level,b,rim,rt,m));
 const support=level.blocks.map((b,i)=>new Map(colours.map(c=>[c,new Set(rim.filter(g=>assets[i].get(c)&&reach[i].has(apertureKey(g))
  &&(!forced[i]||forced[i]===c)&&!(forbiddenBodyColours[b.id]??[]).includes(c)
  &&!(mappedPrefix.parkingPoses?.[b.id]??[]).some(([x,y])=>irregularExitGeometry(rt,level,{...b,x,y},g))
  &&(forced[i]||!irregularExitGeometry(rt,level,b,g))&&!adj[i].some(j=>forced[j]===c)).map(apertureKey))])));
 const gateDomains=new Map(colours.map(c=>[c,rim.filter(g=>forced.flatMap((f,i)=>f===c?[i]:[]).every(i=>support[i].get(c).has(apertureKey(g)))
  &&support.some(s=>s.get(c).has(apertureKey(g))))]));
 diagnostic.fixedColourGateDomains=colours.filter(c=>forced.includes(c)).map(color=>({color,bodyIds:level.blocks.filter((_,i)=>forced[i]===color).map(b=>b.id),apertures:gateDomains.get(color)}));
 const chosen=new Map();for(const g of mappedPrefix.preservedGates??[]){
  assert(Object.keys(g).every(k=>['id','color','side','offset','size','frozen'].includes(k))&&(!g.frozen),'Ordinary gate fields only');
  if(!colours.includes(g.color)||chosen.has(g.color)||!rim.some(a=>apertureKey(a)===apertureKey(g)))return{ok:false,reason:'invalid-preserved-gate'};
  if([...chosen.values()].some(a=>overlaps(a,g)))return{ok:false,reason:'preserved-gates-overlap'};
  if(!gateDomains.get(g.color).some(a=>apertureKey(a)===apertureKey(g)))return{ok:false,reason:'preserved-gate-lacks-all-body-support'};
  chosen.set(g.color,copy(g));
 }
 if([...gateDomains.values()].some(d=>!d.length))return{ok:false,reason:'fixed-colour-gate-intersection-empty'};
 const assigned=[...forced];let solution=null;
 const available=c=>chosen.has(c)?[chosen.get(c)]:gateDomains.get(c).filter(g=>![...chosen.values()].some(a=>overlaps(a,g)));
 const possible=i=>colours.filter(c=>!adj[i].some(j=>assigned[j]===c)&&available(c).some(g=>support[i].get(c).has(apertureKey(g))));
 const bodyDfs=()=>{
  m.node();if(assigned.every(Boolean)){
   if(new Set(assigned).size!==paletteSize)return false;
   // The complete gate/colour assignment was precharged at the final set.
   const candidate={...copy(level),blocks:level.blocks.map((b,i)=>({...copy(b),color:assigned[i],...(b.layers?{layers:[assigned[i]]}:{})})),gates:colours.map(c=>copy(chosen.get(c)))};
   const prefix=auditIrregularFixedPrefix(rt,candidate,drags,{reserve:n=>m.world('prefixWorldReservations',n),checkDeadline:()=>m.guard()});m.guard();
   diagnostic.prefixAttempts++;if(!prefix.valid){diagnostic.lastPrefixFailure=prefix;return false;}
   solution={level:candidate,blocks:candidate.blocks,gates:candidate.gates,prefix,
    assetBindings:Object.fromEntries(level.blocks.map((b,i)=>[b.id,assets[i].get(assigned[i])]))};return true;
  }
  let index=-1,choices=[],score=Infinity;
  for(let i=0;i<assigned.length;i++)if(!assigned[i]){const d=possible(i);if(!d.length)return false;const n=d.length-adj[i].length*.01;if(n<score){score=n;index=i;choices=d;}}
  for(const c of shuffled(choices,random)){m.transition();if(assigned.filter(Boolean).length+1===assigned.length)m.world('completeAssignments');
   assigned[index]=c;if(bodyDfs())return true;assigned[index]=null;
  }return false;
 };
 const gateDfs=()=>{
  m.node();if(level.blocks.some((_,i)=>!possible(i).length))return false;
  if(chosen.size===colours.length){diagnostic.completeGateAssignments++;return bodyDfs();}
  let color=null,choices=[],least=Infinity;for(const c of colours)if(!chosen.has(c)){const d=available(c);if(!d.length)return false;if(d.length<least){color=c;choices=d;least=d.length;}}
  for(const g of choices){m.transition();if(chosen.size+1===colours.length&&assigned.every(Boolean))m.world('completeAssignments');
   chosen.set(color,{id:`private-irregular-${color}`,color,...g});if(gateDfs())return true;chosen.delete(color);
  }return false;
 };
 const ok=gateDfs();return{ok,reason:ok?null:'finite-joint-domain-exhausted',...solution};
}

/** Private static prototype. Same-colour fixed bodies intersect one actual
 * q0-compatible portal domain. All complete assignments AND both speculative
 * fixed-prefix world paths are reserved in one <=10000 meter before formation.
 * Static parking exclusion uses empty-board geometry conservatively; it may
 * reject a pose whose real sweep is blocked. UNKNOWN/rejection is not deadlock.
 * No factory, public ledger, gameplay search, native wrapper or L call exists. */
export function colourIrregularLatePrefix(level,runtime,options={}){
 const m=makeMeter(options),diagnostic={completeGateAssignments:0,prefixAttempts:0,fixedColourGateDomains:[],missingAssetPairs:[]};
 let result;try{result=internal(level,runtime,options,m,diagnostic);m.guard();}catch(e){result={ok:false,reason:e.message};}
 return{...result,version:IRREGULAR_GATE_AWARE_VERSION,diagnostic,accounting:m.result(),L:null,U:null,
  productionExecutable:false,accepted:false,formalReady:false,privatePrototype:true,newGameplaySearches:0,publicClaimsStarted:0,
  limitation:'Early prefix is not L31; a future new physical candidate needs its own original-level lower proof, full U and admission.'};
}
