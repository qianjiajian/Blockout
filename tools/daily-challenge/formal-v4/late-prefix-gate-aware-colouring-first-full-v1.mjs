import assert from 'node:assert/strict';
import {random,absoluteCells,boardCells} from '../formal-v3/diversity-layout-factory.mjs';

export const GATE_AWARE_COLOUR_VERSION='late-prefix-gate-aware-colouring-first-full-v1';
const key=p=>p.join(',');
const shuffle=(xs,r)=>xs.map(x=>({x,n:r()})).sort((a,b)=>a.n-b.n).map(x=>x.x);
const apertureKey=g=>`${g.side}:${g.offset}:${g.size}`;
const overlaps=(a,b)=>a.side===b.side&&a.offset<b.offset+b.size&&b.offset<a.offset+a.size;
export function gateAwareExitPose(b,g,l){
 const w=1+Math.max(...b.shape.map(p=>p[0])),h=1+Math.max(...b.shape.map(p=>p[1]));
 const horizontal=g.side==='top'||g.side==='bottom',start=horizontal?b.x:b.y,span=horizontal?w:h;
 return start>=g.offset&&start+span<=g.offset+g.size&&(g.side==='top'?b.y===0:g.side==='bottom'?b.y+h===l.height:g.side==='left'?b.x===0:b.x+w===l.width);
}
function rimApertures(l){
 const playable=new Set(boardCells(l).map(key)),out=[];
 for(const side of ['top','right','bottom','left'])for(let size=1;size<=3;size++){
  const n=side==='top'||side==='bottom'?l.width:l.height;
  for(let offset=0;offset+size<=n;offset++)if(Array.from({length:size},(_,i)=>side==='top'?[offset+i,0]:side==='bottom'?[offset+i,l.height-1]:side==='left'?[0,offset+i]:[l.width-1,offset+i]).every(p=>playable.has(key(p))))out.push({side,offset,size});
 }return out;
}
// Only the coordinates of one body vary. All other bodies are absent, so
// this necessary domain calculation is micro work, never a puzzle search.
function reachableApertures(l,b,rim,m){
 const allowed=new Set(boardCells(l).map(key)),seen=new Set(),queue=[],support=new Set();
 m.micro();queue.push([b.x,b.y]);seen.add(key(queue[0]));
 for(let i=0;i<queue.length;i++){
  const [x,y]=queue[i];for(const g of rim)if(gateAwareExitPose({...b,x,y},g,l))support.add(apertureKey(g));
  for(const [dx,dy]of [[0,-1],[1,0],[0,1],[-1,0]]){
   m.microTransition();const p=[x+dx,y+dy],k=key(p);
   if(!seen.has(k)&&b.shape.every(([sx,sy])=>allowed.has(key([p[0]+sx,p[1]+sy])))){
    m.micro();seen.add(k);queue.push(p);
   }
  }
 }return support;
}
function internal(l,rt,m,o,diagnostic){
 const {seed=1,paletteSize=8,mappedPrefix,fixedBodyColours={},forbiddenBodyColours={}}=o;
 assert(Number.isSafeInteger(seed));assert(Number.isSafeInteger(paletteSize)&&paletteSize>=1&&paletteSize<=8);
 assert(mappedPrefix?.ok,'Mapped fixed prefix required');
 assert(l.blocks.length&&new Set(l.blocks.map(b=>b.id)).size===l.blocks.length);
 // This branch intentionally supports the solid, visible, single-layer
 // stock made by the independent late-region exact-cover factory only.
 rt.assertPlainProofDomain(l);
 for(const b of l.blocks){const w=1+Math.max(...b.shape.map(p=>p[0])),h=1+Math.max(...b.shape.map(p=>p[1]));
  assert(b.shape.length===w*h&&new Set(b.shape.map(key)).size===w*h&&b.shape.every(([x,y])=>x>=0&&y>=0),'Only normalized solid rectangles');}
 const forced=l.blocks.map(b=>{const f=fixedBodyColours[b.id],p=mappedPrefix.openingColours?.[b.id];assert(!f||!p||f===p,'Conflicting forced prefix colours');return f??p??null;});
 // A complete forced gate/colour assignment is a whole-world candidate
 // even when adjacency, artwork, or a later domain check rejects it.
 if(forced.every(Boolean)&&(mappedPrefix.preservedGates??[]).length===paletteSize){
  m.world();diagnostic.firstFullWorld={blocks:l.blocks.map((b,i)=>({...b,color:forced[i]})),gates:structuredClone(mappedPrefix.preservedGates)};
 }
 const r=random(seed),required=[...new Set(forced.filter(Boolean))],allColours=Object.keys(rt.GAME_ART.gameplay.formalBlocks);
 if(required.length>paletteSize||required.some(c=>!allColours.includes(c)))return{ok:false,reason:'fixed-colour-outside-palette'};
 const colours=[...required,...shuffle(allColours.filter(c=>!required.includes(c)),r)].slice(0,paletteSize),rim=shuffle(rimApertures(l),r);
 const cells=l.blocks.map(absoluteCells),adjacent=l.blocks.map((_,i)=>l.blocks.flatMap((_,j)=>i!==j&&cells[i].some(([x,y])=>cells[j].some(([xx,yy])=>Math.abs(x-xx)+Math.abs(y-yy)===1))?[j]:[]));
 if(forced.some((c,i)=>c&&!colours.includes(c)))return{ok:false,reason:'fixed-colour-outside-palette'};
 if(forced.some((c,i)=>c&&adjacent[i].some(j=>forced[j]===c)))return{ok:false,reason:'forced-opening-colours-adjacent'};
 const reach=l.blocks.map(b=>reachableApertures(l,b,rim,m));
 const support=l.blocks.map((b,i)=>{
  const match=rt.matchFormalBlockShape(b.shape,'native-only');
  return new Map(colours.map(c=>[c,new Set(rim.filter(g=>
   match&&match.quarterTurns===0&&rt.GAME_ART.gameplay.formalBlocks[c]?.solid?.[match.shapeId]&&reach[i].has(apertureKey(g))
   &&(!forced[i]||forced[i]===c)&&!(forbiddenBodyColours[b.id]??[]).includes(c)
   &&!(mappedPrefix.parkingPoses?.[b.id]??[]).some(([x,y])=>gateAwareExitPose({...b,x,y},g,l))
   &&(forced[i]||!gateAwareExitPose(b,g,l))
   &&!adjacent[i].some(j=>forced[j]===c)).map(apertureKey))]));
 });
 const fixedGates=structuredClone(mappedPrefix.preservedGates??[]),chosen=new Map();
 for(const g of fixedGates){
  if(!colours.includes(g.color)||chosen.has(g.color)||!rim.some(a=>apertureKey(a)===apertureKey(g)))return{ok:false,reason:'mapped-initial-portal-not-exposed-or-unique'};
  if([...chosen.values()].some(a=>overlaps(a,g)))return{ok:false,reason:'mapped-initial-portals-overlap'};
  chosen.set(g.color,g);
 }
 const gateDomains=new Map(colours.map(c=>{
  const matching=forced.flatMap((f,i)=>f===c?[i]:[]);
  const domain=rim.filter(g=>matching.every(i=>support[i].get(c).has(apertureKey(g)))&&support.some(s=>s.get(c).has(apertureKey(g))));
  return[c,domain];
 }));
 diagnostic.fixedColourGateDomains=colours.filter(c=>forced.includes(c)).map(c=>({color:c,blockIds:l.blocks.filter((_,i)=>forced[i]===c).map(b=>b.id),apertures:gateDomains.get(c)}));
 for(const [c,g]of chosen)if(!gateDomains.get(c).some(a=>apertureKey(a)===apertureKey(g)))return{ok:false,reason:'preserved-gate-does-not-support-all-fixed-bodies'};
 if([...gateDomains.values()].some(d=>!d.length))return{ok:false,reason:'fixed-colour-gate-intersection-empty'};
 const assigned=[...forced];let solution=null;
 const available=c=>chosen.has(c)?[chosen.get(c)]:gateDomains.get(c).filter(g=>![...chosen.values()].some(a=>overlaps(a,g)));
 const possibleColours=i=>colours.filter(c=>!adjacent[i].some(j=>assigned[j]===c)&&available(c).some(g=>support[i].get(c).has(apertureKey(g))));
 const bodyDfs=()=>{
  m.node();
  if(assigned.every(Boolean)){
   // Reservation precedes every complete assignment (including rejected
   // minimum-colour branches), not just the final accepted LevelSpec.
   if(new Set(assigned).size<Math.min(6,paletteSize))return false;
   const opening=l.blocks.some((b,i)=>mappedPrefix.openingColours?.[b.id]===assigned[i]&&gateAwareExitPose(b,chosen.get(assigned[i]),l));
   if(!opening)return false;
   // Preserve the exact first-full bytes, including a caller's fixed gate order.
   solution=structuredClone(diagnostic.firstFullWorld);assert(solution);return true;
  }
  let index=-1,choices=[],score=Infinity;
  for(let i=0;i<assigned.length;i++)if(!assigned[i]){
   const d=possibleColours(i);if(!d.length)return false;
   const s=d.length-adjacent[i].length*.01;if(s<score){index=i;choices=d;score=s;}
  }
  const used=new Set(assigned.filter(Boolean));
  for(const c of shuffle(choices,r).sort((a,b)=>Number(used.has(a))-Number(used.has(b)))){
   m.transition();const completes=assigned.filter(Boolean).length+1===assigned.length;
   if(completes)m.world();
   assigned[index]=c;
   if(completes){assert.equal(chosen.size,colours.length);assert.equal(diagnostic.firstFullWorld,null);
    diagnostic.firstFullWorld={gates:colours.map(c=>structuredClone(chosen.get(c))),blocks:l.blocks.map((b,i)=>({...b,color:assigned[i]}))};}
   if(bodyDfs())return true;
   if(diagnostic.firstFullWorld)throw Error('first-full-postcheck-rejected');
   assigned[index]=null;
  }return false;
 };
 const gateDfs=()=>{
  m.node();
  const emptyBodies=l.blocks.flatMap((b,i)=>!possibleColours(i).length?[b.id]:[]);
  if(emptyBodies.length){diagnostic.lastUnsupportedBodyIds=emptyBodies;return false;}
  if(chosen.size===colours.length){
   diagnostic.completeGateAssignments++;
   return bodyDfs();
  }
  let colour=null,choices=[],least=Infinity;
  for(const c of colours)if(!chosen.has(c)){
   const d=available(c);if(!d.length)return false;
   if(d.length<least){colour=c;choices=d;least=d.length;}
  }
  for(const g of choices){m.transition();
   const completes=chosen.size+1===colours.length&&assigned.every(Boolean);
   if(completes)m.world();
   chosen.set(colour,{id:`late-aware-${colour}`,color:colour,...g});
   if(completes){assert.equal(diagnostic.firstFullWorld,null);
    diagnostic.firstFullWorld={gates:colours.map(c=>structuredClone(chosen.get(c))),blocks:l.blocks.map((b,i)=>({...b,color:assigned[i]}))};}
   if(gateDfs())return true;
   if(diagnostic.firstFullWorld)throw Error('first-full-postcheck-rejected');
   chosen.delete(colour);
  }return false;
 };
 const ok=gateDfs();
 return{ok,reason:ok?null:'joint-gate-body-domain-exhausted',...solution,
  preservedInitialGateIds:fixedGates.map(g=>g.id),mappedParkingDomainConstraints:Object.keys(mappedPrefix.parkingPoses??{}).length,
  initialExitCount:ok?solution.blocks.filter(b=>gateAwareExitPose(b,solution.gates.find(g=>g.color===b.color),l)).length:null};
}

/** A sole finite static gate/body CSP. No complete-board gameplay search or
 * retry is performed. All gate branches and body-colour branches share the
 * same counters; empty-board coordinate visits are separately bounded. */
export function colourLatePrefixGateAware(level,runtime,options={}){
 const limits={maxNodes:3000,maxTransitions:6000,maxMicroStates:100000,maxMicroTransitions:400000,maxMilliseconds:2000,maxCompleteWorldReservations:1};
 for(const [name,cap]of Object.entries(limits)){const v=options[name]??cap;assert(Number.isSafeInteger(v)&&v>0&&v<=cap,`Invalid finite ${name}`);limits[name]=v;}
 const start=Date.now(),m={nodes:0,transitions:0,microStates:0,microTransitions:0,completeWorldReservations:0,
  guard(){if(Date.now()-start>=limits.maxMilliseconds)throw Error('colour-static-deadline');},
  node(){this.guard();if(this.nodes>=limits.maxNodes)throw Error('colour-static-csp-nodes');this.nodes++;},
  transition(){this.guard();if(this.transitions>=limits.maxTransitions)throw Error('colour-static-csp-transitions');this.transitions++;},
  micro(){this.guard();if(this.microStates>=limits.maxMicroStates)throw Error('colour-static-micro-limit');this.microStates++;},
  microTransition(){this.guard();if(this.microTransitions>=limits.maxMicroTransitions)throw Error('colour-static-micro-transitions');this.microTransitions++;},
  world(){this.guard();if(this.completeWorldReservations>=limits.maxCompleteWorldReservations)throw Error('colour-static-complete-world-limit');this.completeWorldReservations++;}};
 const diagnostic={version:GATE_AWARE_COLOUR_VERSION,completeGateAssignments:0,fixedColourGateDomains:[],lastUnsupportedBodyIds:[],firstFullWorld:null};
 let result;try{result=internal(level,runtime,m,options,diagnostic);}catch(error){result={ok:false,reason:error.message};}
 assert.equal(m.completeWorldReservations,diagnostic.firstFullWorld?1:0,'Each reserved complete assignment is retained');
 if(result.ok)assert.deepEqual({blocks:result.blocks,gates:result.gates},diagnostic.firstFullWorld);
 return{...result,version:GATE_AWARE_COLOUR_VERSION,diagnostic,firstFullWorld:diagnostic.firstFullWorld,firstFullIsTerminal:true,completeColourAssignments:m.completeWorldReservations,
  accounting:{version:'late-region-static-colouring-v1',nodes:m.nodes,transitions:m.transitions+m.microTransitions,cspTransitions:m.transitions,
   microTransitions:m.microTransitions,microStates:m.microStates,completeWorldReservations:m.completeWorldReservations,elapsedMilliseconds:Date.now()-start,
   searchPerformed:false,completeAssignmentsAreChargedEvenOnFailure:true,gateAndBodyCspShareBudget:true,gameBoardBranchSearches:0},formalReady:false};
}
