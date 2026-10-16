import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {loadBoundedRuntime} from './bounded-proof.mjs';
import {verifyWithReservedGuard} from './reserved-guard-budget.mjs';
import {assertIceProofDomain} from './bounded-ice-proof.mjs';
import {assertPlainProofDomain} from '../formal-v2/proof-plain.mjs';
import {boardCells,absoluteCells,bodyFootprint,digest,random} from './diversity-layout-factory.mjs';
import {runReverseInterleavedGraph} from './design-reverse-interleaved.mjs';
import {createReverseConstructionLedger} from './design-reverse-construction-ledger.mjs';
import {inspectHardRegionStatic} from './design-hard-region-pool.mjs';
import {compareLayouts} from './diversity.mjs';
import {levelSha256,independentReplay} from '../formal-v2/contract.mjs';
import {canonicalExit} from '../formal-v2/proof-scheduled-route.mjs';
import {applyNativeDrag,replayDecorated} from '../formal-v2/mechanism-decorate.mjs';
import {analyzeFrozenParking} from './mechanism-axial-ice-pilot.mjs';
import {intensityTargets,auditMechanismParticipation} from './mechanism-intensity.mjs';

export const VERSION='new-stock-known-suffix-ice-inverse-v1.1';
const ROOT='deliverables/daily-formal-v3-20261008',DIRS=[[0,-1],[1,0],[0,1],[-1,0]];
const read=p=>JSON.parse(fs.readFileSync(p,'utf8')),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex'),bind=p=>({path:p,fileSha256:sha(p)});
const key=p=>p.join(','),copy=structuredClone;
const dims=b=>[1+Math.max(...b.shape.map(p=>p[0])),1+Math.max(...b.shape.map(p=>p[1]))];
const adjacent=(a,b)=>absoluteCells(a).some(p=>absoluteCells(b).some(q=>Math.abs(p[0]-q[0])+Math.abs(p[1]-q[1])===1));
const atGate=(b,g,l)=>{const[w,h]=dims(b),top=['top','bottom'].includes(g.side),offset=top?b.x:b.y,span=top?w:h;return offset>=g.offset&&offset+span<=g.offset+g.size&&(g.side==='top'?b.y===0:g.side==='bottom'?b.y+h===l.height:g.side==='left'?b.x===0:b.x+w===l.width);};
const bodyKey=bs=>digest(bs.map(b=>({id:b.id,x:b.x,y:b.y,shape:b.shape,color:b.layers?.[0]??b.color})).sort((a,b)=>a.id.localeCompare(b.id)));

export function assertFrozenPrefixDomain(level){
 assertIceProofDomain(level);
 if(level.blocks.some(b=>b.frozen!==undefined))throw Error('Prefix constructor supports gate ice only, not frozen bodies');
 return true;
}
export function residualIceLevel(level,totalBodies){
 assertFrozenPrefixDomain(level);
 if(!Number.isSafeInteger(totalBodies)||totalBodies<1)throw Error('Finite positive whole-inventory count required');
 const missing=totalBodies-level.blocks.length;
 if(!Number.isSafeInteger(missing)||missing<0)throw Error('Invalid whole-inventory missing count');
 return{...copy(level),gates:level.gates.map(g=>{const out={...g},value=Math.max(0,(g.frozen??0)-missing);if(value)out.frozen=value;else delete out.frozen;return out;})};
}

/** A known one-gesture audit, not a search. Counts include every real body,
 * so a forward insertion inverse reduces missing by exactly one. */
export function auditIceInverse(runtime,before,op,totalBodies){
 try{
  const body=op.kind==='insertion'?op.body:before.blocks.find(b=>b.id===op.blockId);if(!body)throw Error('Missing inverse body');
  const start=[body.x,body.y],end=op.reversePath.at(-1)??start;
  const after={...copy(before),blocks:op.kind==='insertion'?[...copy(before.blocks),{...copy(body),x:end[0],y:end[1]}]:before.blocks.map(b=>b.id===body.id?{...copy(b),x:end[0],y:end[1]}:copy(b))};
  const forwardPath=op.reversePath.length?[start,...op.reversePath.slice(0,-1)].reverse():[];
  const drag={blockId:body.id,path:forwardPath,...(op.kind==='insertion'?{exitSide:op.exitSide}:{})};
  const model=new runtime.PuzzleModel(residualIceLevel(after,totalBodies));model.startCountdown();applyNativeDrag(model,drag);const final=model.snapshot();
  if(bodyKey(final.blocks)!==bodyKey(before.blocks))throw Error('Inverse did not restore exact inventory and poses');
  const expected=residualIceLevel(before,totalBodies);
  if(final.gates.some(g=>(g.frozen??0)!==(expected.gates.find(x=>x.id===g.id)?.frozen??0)))throw Error('Inverse did not restore every gate residual');
  return{valid:true,level:after,forwardDrag:drag,missingBefore:totalBodies-after.blocks.length,missingAfter:totalBodies-before.blocks.length};
 }catch(error){return{valid:false,error:error.message};}
}

export function readReferenceCut(runtime,packet,prefixClears=7){
 assertPlainProofDomain(packet.level,runtime);
 if(!Number.isSafeInteger(prefixClears)||prefixClears<1||prefixClears>=packet.level.blocks.length)throw Error('A proper finite reference prefix is required');
 const canonical=runtime.replayRevisedRoute(packet.level,packet.drags),independent=independentReplay(runtime,packet.level,packet.drags);
 if(!canonical.valid||!canonical.complete||!independent.valid||!independent.complete||canonical.nonClearingDrags<16||canonical.nonClearingDrags>30)throw Error('Reference must have an actual complete U16..30 route');
 const model=new runtime.PuzzleModel(packet.level);model.startCountdown();let cutIndex=0;
 for(const[i,d]of packet.drags.entries()){applyNativeDrag(model,d);if(model.snapshot().cleared===prefixClears){cutIndex=i+1;break;}}
 if(!cutIndex)throw Error('Seven-event reference cut absent');
 const s=model.snapshot(),poses=new Map(s.blocks.map(b=>[b.id,b]));
 const remaining=packet.level.blocks.filter(b=>poses.has(b.id)).map(b=>({...copy(b),x:poses.get(b.id).x,y:poses.get(b.id).y}));
 const occupied=new Set(remaining.flatMap(absoluteCells).map(key)),vacancy=boardCells(packet.level).filter(p=>!occupied.has(key(p)));
 return{level:{...copy(packet.level),blocks:remaining},suffix:copy(packet.drags.slice(cutIndex)),cutIndex,prefixClears,vacancy,
  removedBodies:packet.level.blocks.filter(b=>!poses.has(b.id)),referenceReplay:{canonical,independent},readonlyKnownRouteReplay:true};
}

/** Exact cover and native colour assignment of the entire replacement region.
 * No body movement or alternate board route is explored in this static phase. */
export function planReplacementStock(runtime,reference,cut,{seed=200071,bodyCount=7}={}){
 assertPlainProofDomain(reference,runtime);assertPlainProofDomain(cut.level,runtime);
 if(!Number.isSafeInteger(seed)||!Number.isSafeInteger(bodyCount)||bodyCount!==7)throw Error('This design fixes exactly seven new ordinary bodies');
 const r=random(seed),base=copy(cut.level),first=new Map();let cleared=bodyCount;
 for(const d of cut.suffix)if(d.exitSide){const b=base.blocks.find(b=>b.id===d.blockId);if(!first.has(b.color))first.set(b.color,cleared);cleared++;}
 const late=[...first].sort((a,b)=>b[1]-a[1]).slice(0,4).sort((a,b)=>a[1]-b[1]);
 if(late.length!==4)throw Error('Four actual remaining exit colours required');
 for(const[i,[color,event]]of late.entries()){const g=base.gates.find(g=>g.color===color);g.frozen=7+i;if(event<g.frozen)throw Error('Known suffix cannot pay frozen exit');}
 const ordinary=base.gates.filter(g=>!g.frozen),cells=cut.vacancy,allowed=new Set(cells.map(key)),fixed=base.blocks;
 const forbidden=new Set(reference.blocks.map(bodyFootprint)),shapes=[];
 for(let h=1;h<=4;h++)for(let w=1;w<=4;w++)if(w*h<=6){const shape=Array.from({length:w*h},(_,i)=>[i%w,Math.floor(i/w)]),a=runtime.matchFormalBlockShape(shape,'native-only');if(a?.quarterTurns===0)shapes.push({shape,shapeId:a.shapeId});}
 const placements=cells.map(()=>[]);
 for(const {shape,shapeId}of shapes)for(let y=0;y<base.height;y++)for(let x=0;x<base.width;x++){
  const b={x,y,shape},points=absoluteCells(b);if(points.some(p=>!allowed.has(key(p)))||forbidden.has(bodyFootprint(b)))continue;
  const colors=ordinary.filter(g=>dims(b)[['top','bottom'].includes(g.side)?0:1]<=g.size&&runtime.GAME_ART.gameplay.formalBlocks[g.color]?.solid?.[shapeId]
   &&!fixed.some(f=>f.color===g.color&&adjacent(b,f))).map(g=>g.color);
  if(!colors.length)continue;const ids=points.map(p=>cells.findIndex(q=>key(q)===key(p))),placement={...b,ids,colors,rank:r()};for(const id of ids)placements[id].push(placement);
 }
 const taken=new Set(),chosen=[];let nodes=0;const wanted=new Set(ordinary.map(g=>g.color));
 const visit=()=>{
  if(nodes>=10000)return false;nodes++;const remaining=cells.length-taken.size,left=bodyCount-chosen.length;
  if(!remaining)return !left&&[...wanted].every(c=>chosen.some(b=>b.color===c));
  if(left<=0||remaining<left||remaining>left*6)return false;
  let choices=null;
  for(let i=0;i<cells.length;i++)if(!taken.has(i)){const possibilities=placements[i].filter(p=>!p.ids.some(j=>taken.has(j)));if(!possibilities.length)return false;if(!choices||possibilities.length<choices.length)choices=possibilities;}
  for(const p of choices.sort((a,b)=>Math.abs(a.shape.length-cells.length/bodyCount)-Math.abs(b.shape.length-cells.length/bodyCount)||a.rank-b.rank)){
   const colors=[...p.colors].sort((a,b)=>Number(chosen.some(x=>x.color===a))-Number(chosen.some(x=>x.color===b)));
   for(const color of colors){if(chosen.some(b=>b.color===color&&adjacent(b,p)))continue;
    p.ids.forEach(i=>taken.add(i));chosen.push({id:`ice-prefix-${seed}-new-${chosen.length}`,x:p.x,y:p.y,shape:p.shape,color});if(visit())return true;chosen.pop();p.ids.forEach(i=>taken.delete(i));}
  }return false;
 };
 if(!visit())return{ok:false,reason:'replacement-whole-region-native-cover-not-found',nodes,regionArea:cells.length};
 const level={...copy(base),blocks:[...copy(fixed),...copy(chosen)]};
 const oldShapes=digest(reference.blocks.map(b=>digest(b.shape)).sort()),newShapes=digest(level.blocks.map(b=>digest(b.shape)).sort());
 const oldColors=digest(reference.blocks.map(b=>b.color).sort()),newColors=digest(level.blocks.map(b=>b.color).sort());
 if(oldShapes===newShapes||oldColors===newColors)return{ok:false,reason:'shape-and-colour-stock-both-must-change',nodes};
 return{ok:true,level,initialPartial:{...copy(base),blocks:copy(fixed)},newBodies:copy(chosen),suffix:copy(cut.suffix),staticConstructionNodes:nodes,
  provenance:{referenceOpeningSha256:levelSha256(reference),replacementArea:cells.length,boardArea:boardCells(reference).length,replacementAreaRatio:cells.length/boardCells(reference).length,
   allOldReferenceFootprintsForbiddenInNewRegion:true,newShapeInventorySha256:newShapes,oldShapeInventorySha256:oldShapes,newColorInventorySha256:newColors,oldColorInventorySha256:oldColors,
   sevenNewOrdinaryEventBodies:chosen.map(b=>({id:b.id,color:b.color,shape:b.shape})),fourGatePlan:late.map(([color,firstSuffixClear],i)=>({color,initialCounter:7+i,firstSuffixClear})),
   retainedSuffixValidatedBeforeConstruction:true,knownReferenceCut:cut.cutIndex,readonlyReferenceProofNotReused:true}};
}

export function constructFrozenPrefix(runtime,plan,{maxStates=10000,maxTransitions=10000000,maxMicroStates=3000000,maxMilliseconds=30000,finalAdmissible=()=>true}={}){
 if(!plan.ok||typeof finalAdmissible!=='function')throw Error('One valid stock and bounded constructor required');
 for(const[value,limit]of[[maxStates,10000],[maxTransitions,10000000],[maxMicroStates,3000000],[maxMilliseconds,30000]])if(!Number.isSafeInteger(value)||value<1||value>limit)throw Error('Finite positive construction budget within hard limits required');
 assertFrozenPrefixDomain(plan.level);assertFrozenPrefixDomain(plan.initialPartial);
 const total=plan.level.blocks.length,raw=new Set(),expanded=new Set(),started=Date.now(),stats={microDiscoveredStates:0,attemptedTransitions:0,fullBoardExpansionVisits:0,actualInverseAudits:0,actualInverseRejected:0,fullClosures:0};
 const rawKey=l=>digest({gates:l.gates,missing:total-l.blocks.length,blocks:l.blocks.map(b=>({...b})).sort((a,b)=>a.id.localeCompare(b.id))});
 const guard=()=>{if(Date.now()-started>=maxMilliseconds)throw Error('construction-deadline');};
 const micro=()=>{guard();if(stats.microDiscoveredStates>=maxMicroStates)throw Error('construction-micro-limit');stats.microDiscoveredStates++;};
 const transition=()=>{guard();if(stats.attemptedTransitions>=maxTransitions)throw Error('construction-action-limit');stats.attemptedTransitions++;};
 const charge=(l,expand=false)=>{guard();const k=rawKey(l);if(!raw.has(k)){if(raw.size>=maxStates)throw Error('construction-raw-limit');raw.add(k);}if(expand){expanded.add(k);stats.fullBoardExpansionVisits++;}return k;};
 // Stop before forming an uncharged proposed whole-world object at the cap.
 // Rejecting even a would-be duplicate at this boundary is conservative.
 const guardProposal=()=>{guard();if(raw.size>=maxStates)throw Error('construction-raw-limit');};
 const allowed=new Set(boardCells(plan.level).map(key)),target=new Map(plan.level.blocks.map(b=>[b.id,b]));
 const valid=(l,b,p)=>{const occ=new Set(l.blocks.filter(x=>x.id!==b.id).flatMap(absoluteCells).map(key));return b.shape.every(([dx,dy])=>allowed.has(key([p[0]+dx,p[1]+dy]))&&!occ.has(key([p[0]+dx,p[1]+dy])));};
 const reach=(l,b,start)=>{
  const gate=residualIceLevel(l,total).gates.find(g=>g.color===b.color),queue=[start],parents=new Map([[key(start),null]]);micro();
  for(let i=0;i<queue.length;i++)for(const[dx,dy]of DIRS){transition();const p=[queue[i][0]+dx,queue[i][1]+dy];if(parents.has(key(p))||!valid(l,b,p)||!gate.frozen&&atGate({...b,x:p[0],y:p[1]},gate,l))continue;micro();parents.set(key(p),queue[i]);queue.push(p);}
  const pathTo=p=>{const list=[];while(parents.get(key(p))){list.push(p);p=parents.get(key(p));}return list.reverse();};return{positions:queue,pathTo};
 };
 const penalty=l=>l.blocks.reduce((n,b,i)=>n+l.blocks.slice(i+1).filter(c=>b.color===c.color&&adjacent(b,c)).length,0);
 const rank=(b,p)=>Math.abs(p[0]-target.get(b.id).x)+Math.abs(p[1]-target.get(b.id).y);
 const result=(status,extra={})=>({ok:false,status,version:VERSION,construction:{rawDiscoveredStates:raw.size,rawFullBoardStates:raw.size,rawExpandedStates:expanded.size,rawExploredStates:expanded.size,
  rawWorldSha256s:[...raw],expandedWorldSha256s:[...expanded],...stats,elapsedMilliseconds:Date.now()-started,budget:{maxStates,maxTransitions,maxMicroStates,maxMilliseconds},
  scope:'One shared pre-increment raw budget for all insertion/parking proposals and portal worlds. Residual gate ice equals max(0,F-(totalBodies-currentBodies)); held xy exploration has no world side effects.',fullBoardDifficultySearchInvocations:0},...extra});
 let firstRejectedComplete=null;
 try{
  charge(plan.initialPartial);charge(plan.level);
  const insertionOptions=(l,b)=>{
   const missingBefore=total-l.blocks.length-1,g=l.gates.find(g=>g.color===b.color);if((g.frozen??0)>missingBefore)return[];
   const out=[];for(let y=0;y<l.height;y++)for(let x=0;x<l.width;x++)if(atGate({...b,x,y},g,l)&&valid(l,b,[x,y])){
    guardProposal();const portal={...b,x,y},portalLevel={...l,blocks:[...l.blocks,portal]};charge(portalLevel,true);
    const walk=reach(portalLevel,portal,[x,y]);
    for(const p of walk.positions.sort((a,c)=>rank(b,a)-rank(b,c)).slice(0,10)){
     guardProposal();const next={...l,blocks:[...l.blocks,{...b,x:p[0],y:p[1]}]};charge(next);
     const op={kind:'insertion',body:portal,reversePath:walk.pathTo(p),exitSide:g.side};stats.actualInverseAudits++;
     const audit=auditIceInverse(runtime,l,op,total);if(!audit.valid){stats.actualInverseRejected++;continue;}out.push({level:next,operation:{...op,forwardDrag:audit.forwardDrag}});
    }
   }return out.sort((a,b)=>penalty(a.level)-penalty(b.level));
  };
  const parkingOptions=l=>{
   const out=[];for(const b of l.blocks){const g=residualIceLevel(l,total).gates.find(g=>g.color===b.color);if(!g.frozen&&atGate(b,g,l))continue;
    const start=[b.x,b.y],walk=reach(l,b,start);
    for(const p of walk.positions.slice(1).sort((a,c)=>rank(b,a)-rank(b,c)).slice(0,6)){
     guardProposal();const next={...l,blocks:l.blocks.map(x=>x.id===b.id?{...x,x:p[0],y:p[1]}:x)};charge(next);
     const op={kind:'parking',blockId:b.id,reversePath:walk.pathTo(p)};stats.actualInverseAudits++;
     const audit=auditIceInverse(runtime,l,op,total);if(!audit.valid){stats.actualInverseRejected++;continue;}out.push({level:next,operation:{...op,forwardDrag:audit.forwardDrag}});
    }
   }return out;
  };
  const solved=runReverseInterleavedGraph({initialLevel:plan.initialPartial,initialOperations:[],inventory:plan.level.blocks,worldKey:rawKey,charge,stats,
   queuePolicy:'fill-first-diverse',maxParkingDrags:128,layoutScore:l=>penalty(l)*10+l.blocks.reduce((n,b)=>n+rank(b,[b.x,b.y]),0)*.01,
   insertionOptions,parkingOptions,goal:(level,ops)=>{
    stats.fullClosures++;if(penalty(level)||!finalAdmissible(level))return null;
    const drags=[...ops.map(x=>x.forwardDrag).reverse(),...plan.suffix],canonical=runtime.replayRevisedRoute(level,drags),independent=independentReplay(runtime,level,drags);
    if(!canonical.valid||!canonical.complete||!independent.valid||!independent.complete||canonical.nonClearingDrags!==independent.nonClearingDrags)throw Error('Full constructed ice witness rejected');
    const evidence={level:copy(level),drags:copy(drags),replay:canonical,independentReplay:independent,U:canonical.nonClearingDrags,operations:ops};
    if(!firstRejectedComplete)firstRejectedComplete=evidence;
    return evidence;
   }});
  if(!solved)return result('FINITE_CONSTRUCTION_EXHAUSTED',{firstRejectedComplete});
  return result('COMPLETE_ORIGINAL_ICE_WITNESS',{ok:true,...solved,formalReady:false,lowerBoundClaimed:false});
 }catch(error){return result('FINITE_CONSTRUCTION_STOPPED',{reason:error.message,firstRejectedComplete});}
}

export async function runOneDesign({directory=`${ROOT}/mechanisms/frozen-prefix-construction-01`,referencePath=`${ROOT}/design/nearband-multistep-01/candidate-0025.json`,selectionFile=`${ROOT}/selection/nearband21-selected/index.json`}={}){
 if(fs.existsSync(directory))throw Error('Preserve existing one-stock experiment');const runtime=await loadBoundedRuntime();if(runtime.toolchainSha256!=='45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804')throw Error('Frozen proof changed');
 const reference=read(referencePath),source=runtime.LEVELS.find(l=>l.id===reference.sourceLevelId),cut=readReferenceCut(runtime,reference),plan=planReplacementStock(runtime,reference.level,cut);
 fs.mkdirSync(directory,{recursive:true});const write=(name,q)=>fs.writeFileSync(`${directory}/${name}`,JSON.stringify(q,null,2)+'\n',{flag:'wx'});
 const bindings=['mechanism-frozen-prefix-construction.mjs','design-reverse-interleaved.mjs','design-reverse-construction-ledger.mjs','bounded-proof.mjs','bounded-ice-proof.mjs','reserved-guard-budget.mjs','diversity.mjs','mechanism-intensity.mjs'].map(n=>{const p=`tools/daily-challenge/formal-v3/${n}`,snapshot=`${directory}/${n}.snapshot`;fs.copyFileSync(p,snapshot,fs.constants.COPYFILE_EXCL);return{...bind(p),snapshot};});
 write('plan.json',{version:VERSION,reference:bind(referencePath),selection:bind(selectionFile),sourceLevelId:source.id,cut,plan,bindings,proofToolchainSha256:runtime.toolchainSha256,maximumConstructionStocks:1,maximumConstructionStates:10000,formalReady:false});
 if(!plan.ok)return{directory,status:'STATIC_PLAN_FAILED',reason:plan.reason};
 // The unchanged suffix is first checked with all four actual residual counters.
 const suffixCanonical=runtime.replayRevisedRoute(residualIceLevel(plan.initialPartial,plan.level.blocks.length),plan.suffix);
 const suffixIndependent=independentReplay(runtime,residualIceLevel(plan.initialPartial,plan.level.blocks.length),plan.suffix);
 if(!suffixCanonical.valid||!suffixCanonical.complete||!suffixIndependent.valid||!suffixIndependent.complete)throw Error('Prescribed suffix rejected by residual-ice replay');
 write('known-suffix.json',{canonical:suffixCanonical,independent:suffixIndependent,fullBoardSearchInvocations:0});
 const selection=read(selectionFile).files.map(p=>({path:p,level:read(p).level})),successes=[];
 const scan=d=>{for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=`${d}/${e.name}`;if(e.isDirectory())scan(p);else if(/^candidate-.*\.json$/.test(e.name)){let b;try{b=read(p);}catch{continue;}if(b.accepted&&b.level)successes.push({path:p,level:b.level});}}};scan(`${ROOT}/design`);
 const old=read('deliverables/daily-formal-v2-20261007/final-qualified/index.json').entries.map(e=>({path:e.path,level:read(e.path).level}));
 const nearest=(l,rows,limit)=>{let maximum=0,path=null;for(const row of rows){const v=compareLayouts(l,row.level).footprintSimilarity;if(v>maximum){maximum=v;path=row.path;}}return{pass:maximum<=limit,maximum,path,limit};};
 const comparisons=l=>({reference:nearest(l,[{path:referencePath,level:reference.level}],.65),selected:nearest(l,selection,.65),successful:nearest(l,successes,.65),old450:nearest(l,old,.75),source:nearest(l,[{path:`mainline:${source.id}`,level:source}],.55)});
 const ledger=await createReverseConstructionLedger(`${ROOT}/design/reverse-construction-attempts`),budget={maxStates:10000,maxTransitions:10000000,maxMicroStates:3000000,maxMilliseconds:30000};
 const claim=await ledger.claim(plan.level,{sourceLevelId:source.id,seed:200071,budget});write('construction-claim.json',claim);
 const built=constructFrozenPrefix(runtime,plan,{...budget,finalAdmissible:l=>inspectHardRegionStatic(l,source,runtime).valid&&Object.values(comparisons(l)).every(x=>x.pass)});write('construction.json',built);await ledger.finish(claim,built);
 let proof=null,packet=null;if(built.ok){
  const replay=replayDecorated(runtime,built.level,built.drags),targets=intensityTargets('frozen-exit',3),participation=auditMechanismParticipation(built.level,built.drags,replay,'frozen-exit',targets),earlyParking=analyzeFrozenParking(runtime,built.level,built.drags);
  packet={accepted:false,formalReady:false,sourceLevelId:source.id,mechanismFirst:true,stageKey:'mechanisms-frozen-exit-6',difficulty:3,level:built.level,levelSha256:levelSha256(built.level),drags:built.drags,U:built.U,L:null,
   targets,intensityTargets:targets,provenance:{...plan.provenance,referencePath,newConstructionStock:true,constructionClaim:claim.path},construction:built.construction,
   replay:built.replay,independentReplay:built.independentReplay,actualReplay:replay,participation,earlyParking,comparisons:comparisons(built.level),staticAudit:inspectHardRegionStatic(built.level,source,runtime),inputBindings:bindings};
  // A known U below 31 already disproves D3. Do not spend another search to
  // rename it as a qualified D3 or pad its route. Lower-only has its own cap.
  if(built.U>=31&&participation.pass){proof=await verifyWithReservedGuard(runtime,packet,{lowerBudget:{maxStates:9999,maxTransitions:9999999,maxMicroStates:2999999,maxMilliseconds:30000}});packet.proof=proof;packet.accepted=proof.accepted;packet.L=proof.L;}
  else packet.status='COMPLETE_WITNESS_BELOW_D3_OR_MECHANISM_REJECTED_NO_LOWER_SEARCH';
  write('candidate.json',packet);
 }
 const summary={status:built.ok?'ONE_STOCK_COMPLETE_WITNESS':'ONE_STOCK_CONSTRUCTION_UNKNOWN',accepted:packet?.accepted??false,formalReady:false,sourceLevelId:source.id,U:built.U??null,L:packet?.L??null,
  construction:built.construction,constructorReason:built.reason??null,reference:bind(referencePath),constructionClaim:claim.path,knownSuffixVerified:true,
  fullRouteVerified:built.ok,mechanismParticipation:packet?.participation??null,earlyParking:packet?.earlyParking??null,proofSearches:Number(!!proof),
  lowerGuardReserve:proof?{apiMaxStates:9999,conservativeBoundaryCandidateAllowance:1,totalAtMost:10000}:null,
  productionUnchanged:true,proofIntensityUnchanged:true,artifacts:['plan.json','known-suffix.json','construction-claim.json','construction.json',...(packet?['candidate.json']:[])].map(n=>bind(`${directory}/${n}`))};write('report.json',summary);return{directory,status:summary.status,U:summary.U,L:summary.L,accepted:summary.accepted,raw:built.construction.rawFullBoardStates};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)console.log(JSON.stringify(await runOneDesign()));
